package recommendations

import (
	"testing"
	"time"
)

func TestEvaluateOverdueTasks(t *testing.T) {
	snapshot := Snapshot{Tasks: []TaskSnapshot{
		{ID: "one", DueDate: "2025-01-01"},
		{ID: "two", DueDate: "2025-01-02"},
	}}
	results := Evaluate(snapshot, time.Date(2025, 1, 10, 12, 0, 0, 0, time.UTC))
	if len(results) != 1 || results[0].Type != "reschedule_overdue_tasks" {
		t.Fatalf("unexpected recommendations: %#v", results)
	}
	if results[0].Status != "pending" {
		t.Fatal("recommendation must require approval")
	}
}
