package sync

import (
	"context"
	"encoding/json"
)

const SchemaVersion = 1

type Mutation struct {
	MutationID  string                 `json:"mutation_id"`
	EntityType  string                 `json:"entity_type"`
	EntityID    string                 `json:"entity_id"`
	Operation   string                 `json:"operation"`
	BaseVersion int64                  `json:"base_version"`
	Fields      map[string]interface{} `json:"fields"`
}

type PushRequest struct {
	DeviceID      string     `json:"device_id"`
	SchemaVersion int        `json:"schema_version"`
	Mutations     []Mutation `json:"mutations"`
}

type MutationResult struct {
	MutationID string          `json:"mutation_id"`
	Status     string          `json:"status"`
	Revision   int64           `json:"revision,omitempty"`
	Conflict   json.RawMessage `json:"conflict,omitempty"`
}

type PushResponse struct {
	Results []MutationResult `json:"results"`
}

type Change struct {
	Revision   int64                  `json:"revision"`
	EntityType string                 `json:"entity_type"`
	EntityID   string                 `json:"entity_id"`
	Operation  string                 `json:"operation"`
	Version    int64                  `json:"version"`
	Data       map[string]interface{} `json:"data,omitempty"`
}

type PullResponse struct {
	Changes    []Change `json:"changes"`
	NextCursor int64    `json:"next_cursor"`
	HasMore    bool     `json:"has_more"`
}

type Store interface {
	ApplyMutation(ctx context.Context, userID, deviceID string, mutation Mutation) (MutationResult, error)
	PullChanges(ctx context.Context, userID string, after int64, limit int) ([]Change, bool, error)
}
