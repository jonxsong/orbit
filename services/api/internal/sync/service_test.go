package sync

import (
	"context"
	"testing"
)

type memoryStore struct {
	results map[string]MutationResult
	calls   int
}

func (m *memoryStore) ApplyMutation(_ context.Context, _, _ string, mutation Mutation) (MutationResult, error) {
	if result, ok := m.results[mutation.MutationID]; ok {
		return result, nil
	}
	m.calls++
	result := MutationResult{MutationID: mutation.MutationID, Status: "applied", Revision: int64(m.calls)}
	m.results[mutation.MutationID] = result
	return result, nil
}

func (*memoryStore) PullChanges(context.Context, string, int64, int) ([]Change, bool, error) {
	return nil, false, nil
}

func TestPushDuplicateMutationReturnsOriginalResult(t *testing.T) {
	store := &memoryStore{results: make(map[string]MutationResult)}
	service := NewService(store)
	mutation := Mutation{
		MutationID: "2d644b4e-21c7-4c7d-ae89-54bedf2b2025",
		EntityType: "task",
		EntityID:   "14c18533-0cec-49d8-af55-8ca4ad8f73c7",
		Operation:  "upsert",
		Fields:     map[string]interface{}{"title": "Plan the week"},
	}
	request := PushRequest{
		DeviceID:      "8f617c93-6418-488b-9990-e43f380b0e42",
		SchemaVersion: SchemaVersion,
		Mutations:     []Mutation{mutation},
	}
	first, err := service.Push(context.Background(), "user", request)
	if err != nil {
		t.Fatal(err)
	}
	second, err := service.Push(context.Background(), "user", request)
	if err != nil {
		t.Fatal(err)
	}
	if first.Results[0].Revision != second.Results[0].Revision || store.calls != 1 {
		t.Fatalf("duplicate mutation was reapplied: calls=%d", store.calls)
	}
}
