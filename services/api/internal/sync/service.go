package sync

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
)

var allowedEntityTypes = map[string]bool{
	"goal": true, "milestone": true, "task": true, "habit": true,
	"habit_completion": true, "reflection": true, "relationship": true,
	"recommendation": true,
}

type Service struct{ store Store }

func NewService(store Store) *Service { return &Service{store: store} }

func (s *Service) Push(ctx context.Context, userID string, request PushRequest) (PushResponse, error) {
	if request.SchemaVersion != SchemaVersion {
		return PushResponse{}, fmt.Errorf("unsupported schema version %d", request.SchemaVersion)
	}
	if _, err := uuid.Parse(request.DeviceID); err != nil {
		return PushResponse{}, errors.New("device_id must be a UUID")
	}
	if len(request.Mutations) == 0 || len(request.Mutations) > 100 {
		return PushResponse{}, errors.New("mutations must contain between 1 and 100 items")
	}

	response := PushResponse{Results: make([]MutationResult, 0, len(request.Mutations))}
	for _, mutation := range request.Mutations {
		if err := validateMutation(mutation); err != nil {
			return PushResponse{}, err
		}
		result, err := s.store.ApplyMutation(ctx, userID, request.DeviceID, mutation)
		if err != nil {
			return PushResponse{}, err
		}
		response.Results = append(response.Results, result)
	}
	return response, nil
}

func (s *Service) Pull(ctx context.Context, userID string, after int64, limit int) (PullResponse, error) {
	if after < 0 {
		return PullResponse{}, errors.New("cursor cannot be negative")
	}
	if limit <= 0 || limit > 500 {
		limit = 500
	}
	changes, hasMore, err := s.store.PullChanges(ctx, userID, after, limit)
	if err != nil {
		return PullResponse{}, err
	}
	next := after
	if len(changes) > 0 {
		next = changes[len(changes)-1].Revision
	}
	return PullResponse{Changes: changes, NextCursor: next, HasMore: hasMore}, nil
}

func validateMutation(mutation Mutation) error {
	if _, err := uuid.Parse(mutation.MutationID); err != nil {
		return errors.New("mutation_id must be a UUID")
	}
	if _, err := uuid.Parse(mutation.EntityID); err != nil {
		return errors.New("entity_id must be a UUID")
	}
	if !allowedEntityTypes[mutation.EntityType] {
		return fmt.Errorf("unsupported entity_type %q", mutation.EntityType)
	}
	if mutation.Operation != "upsert" && mutation.Operation != "delete" {
		return errors.New("operation must be upsert or delete")
	}
	if mutation.BaseVersion < 0 {
		return errors.New("base_version cannot be negative")
	}
	if mutation.Operation == "upsert" && len(mutation.Fields) == 0 {
		return errors.New("upsert mutation requires fields")
	}
	return nil
}
