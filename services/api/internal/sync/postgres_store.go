package sync

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

type PostgresStore struct{ pool *pgxpool.Pool }

func NewPostgresStore(pool *pgxpool.Pool) *PostgresStore { return &PostgresStore{pool: pool} }

func (s *PostgresStore) ApplyMutation(
	ctx context.Context,
	userID, deviceID string,
	mutation Mutation,
) (MutationResult, error) {
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable})
	if err != nil {
		return MutationResult{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var existingResultBytes []byte
	err = tx.QueryRow(ctx,
		`SELECT result FROM sync_mutations WHERE owner_id = $1 AND mutation_id = $2`,
		userID, mutation.MutationID,
	).Scan(&existingResultBytes)
	if err == nil {
		var result MutationResult
		if err := json.Unmarshal(existingResultBytes, &result); err != nil {
			return MutationResult{}, fmt.Errorf("decode stored mutation result: %w", err)
		}
		if err := tx.Commit(ctx); err != nil {
			return MutationResult{}, err
		}
		return result, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return MutationResult{}, err
	}

	data := make(map[string]interface{})
	fieldVersions := make(map[string]int64)
	var version int64
	var deletedAt *time.Time
	var dataBytes, fieldVersionBytes []byte
	err = tx.QueryRow(ctx,
		`SELECT data, field_versions, version, deleted_at
		 FROM sync_records
		 WHERE owner_id = $1 AND entity_type = $2 AND entity_id = $3
		 FOR UPDATE`,
		userID, mutation.EntityType, mutation.EntityID,
	).Scan(&dataBytes, &fieldVersionBytes, &version, &deletedAt)
	recordExists := err == nil
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return MutationResult{}, err
	}
	if recordExists {
		if err := json.Unmarshal(dataBytes, &data); err != nil {
			return MutationResult{}, fmt.Errorf("decode record data: %w", err)
		}
		if err := json.Unmarshal(fieldVersionBytes, &fieldVersions); err != nil {
			return MutationResult{}, fmt.Errorf("decode field versions: %w", err)
		}
	}

	conflictingFields := make([]string, 0)
	if deletedAt != nil && mutation.Operation == "upsert" {
		conflictingFields = append(conflictingFields, "deleted_at")
	}
	if mutation.Operation == "upsert" {
		for field := range mutation.Fields {
			if fieldVersions[field] > mutation.BaseVersion {
				conflictingFields = append(conflictingFields, field)
			}
		}
	}
	if !recordExists && mutation.BaseVersion > 0 {
		conflictingFields = append(conflictingFields, "record_missing")
	}

	if len(conflictingFields) > 0 {
		conflict, _ := json.Marshal(map[string]interface{}{
			"current_version": version,
			"fields":          conflictingFields,
			"current_data":    data,
		})
		result := MutationResult{
			MutationID: mutation.MutationID,
			Status:     "conflict",
			Revision:   version,
			Conflict:   conflict,
		}
		if err := storeMutationResult(ctx, tx, userID, deviceID, mutation, result); err != nil {
			return MutationResult{}, err
		}
		if err := tx.Commit(ctx); err != nil {
			return MutationResult{}, err
		}
		return result, nil
	}

	var revision int64
	if err := tx.QueryRow(ctx, `SELECT nextval('sync_revision_seq')`).Scan(&revision); err != nil {
		return MutationResult{}, err
	}
	operation := mutation.Operation
	if operation == "delete" {
		deleted := time.Now().UTC()
		deletedAt = &deleted
	} else {
		deletedAt = nil
		for field, value := range mutation.Fields {
			data[field] = value
			fieldVersions[field] = revision
		}
	}

	dataBytes, err = json.Marshal(data)
	if err != nil {
		return MutationResult{}, err
	}
	fieldVersionBytes, err = json.Marshal(fieldVersions)
	if err != nil {
		return MutationResult{}, err
	}
	_, err = tx.Exec(ctx,
		`INSERT INTO sync_records
		   (owner_id, entity_type, entity_id, data, field_versions, version, deleted_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, now())
		 ON CONFLICT (owner_id, entity_type, entity_id) DO UPDATE SET
		   data = EXCLUDED.data,
		   field_versions = EXCLUDED.field_versions,
		   version = EXCLUDED.version,
		   deleted_at = EXCLUDED.deleted_at,
		   updated_at = now()`,
		userID, mutation.EntityType, mutation.EntityID, dataBytes, fieldVersionBytes, revision, deletedAt,
	)
	if err != nil {
		return MutationResult{}, err
	}
	_, err = tx.Exec(ctx,
		`INSERT INTO sync_changes
		   (owner_id, revision, entity_type, entity_id, operation, version, data, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
		userID, revision, mutation.EntityType, mutation.EntityID, operation, revision, dataBytes,
	)
	if err != nil {
		return MutationResult{}, err
	}

	result := MutationResult{MutationID: mutation.MutationID, Status: "applied", Revision: revision}
	if err := storeMutationResult(ctx, tx, userID, deviceID, mutation, result); err != nil {
		return MutationResult{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return MutationResult{}, err
	}
	return result, nil
}

func storeMutationResult(
	ctx context.Context,
	tx pgx.Tx,
	userID, deviceID string,
	mutation Mutation,
	result MutationResult,
) error {
	resultBytes, err := json.Marshal(result)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx,
		`INSERT INTO sync_mutations
		   (owner_id, mutation_id, device_id, entity_type, entity_id, operation, result, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
		userID, mutation.MutationID, deviceID, mutation.EntityType, mutation.EntityID,
		mutation.Operation, resultBytes,
	)
	return err
}

func (s *PostgresStore) PullChanges(
	ctx context.Context,
	userID string,
	after int64,
	limit int,
) ([]Change, bool, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT revision, entity_type, entity_id, operation, version, data
		 FROM sync_changes
		 WHERE owner_id = $1 AND revision > $2
		 ORDER BY revision ASC
		 LIMIT $3`,
		userID, after, limit+1,
	)
	if err != nil {
		return nil, false, err
	}
	defer rows.Close()

	changes := make([]Change, 0, limit)
	for rows.Next() {
		var change Change
		var dataBytes []byte
		if err := rows.Scan(
			&change.Revision,
			&change.EntityType,
			&change.EntityID,
			&change.Operation,
			&change.Version,
			&dataBytes,
		); err != nil {
			return nil, false, err
		}
		if change.Operation != "delete" {
			if err := json.Unmarshal(dataBytes, &change.Data); err != nil {
				return nil, false, err
			}
		}
		changes = append(changes, change)
	}
	if err := rows.Err(); err != nil {
		return nil, false, err
	}
	hasMore := len(changes) > limit
	if hasMore {
		changes = changes[:limit]
	}
	return changes, hasMore, nil
}
