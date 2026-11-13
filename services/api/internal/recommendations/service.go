package recommendations

import "time"

type TaskSnapshot struct {
	ID               string `json:"id"`
	Title            string `json:"title"`
	DueDate          string `json:"due_date,omitempty"`
	EstimatedMinutes int    `json:"estimated_minutes,omitempty"`
	Completed        bool   `json:"completed"`
}

type Snapshot struct {
	ActiveGoalCount int            `json:"active_goal_count"`
	Tasks           []TaskSnapshot `json:"tasks"`
	MissedHabits    int            `json:"missed_habits"`
	BlockedCount    int            `json:"blocked_milestone_count"`
}

type Recommendation struct {
	Type           string                 `json:"type"`
	Title          string                 `json:"title"`
	Explanation    string                 `json:"explanation"`
	Evidence       []string               `json:"evidence"`
	ProposedAction map[string]interface{} `json:"proposed_action"`
	Confidence     float64                `json:"confidence"`
	Limitations    []string               `json:"limitations"`
	Status         string                 `json:"status"`
	Source         string                 `json:"source"`
}

func Evaluate(snapshot Snapshot, today time.Time) []Recommendation {
	var overdue []TaskSnapshot
	totalMinutes := 0
	todayKey := today.Format("2006-01-02")
	for _, task := range snapshot.Tasks {
		if task.Completed {
			continue
		}
		totalMinutes += task.EstimatedMinutes
		if task.DueDate != "" && task.DueDate < todayKey {
			overdue = append(overdue, task)
		}
	}

	recommendations := make([]Recommendation, 0, 3)
	if len(overdue) >= 2 {
		recommendations = append(recommendations, Recommendation{
			Type:        "reschedule_overdue_tasks",
			Title:       "Make the plan lighter",
			Explanation: "Several tasks have moved past their planned day. Rescheduling one creates a more honest plan.",
			Evidence:    []string{"At least two open tasks are overdue."},
			ProposedAction: map[string]interface{}{
				"action":   "open_reschedule_review",
				"task_ids": taskIDs(overdue),
			},
			Confidence:  1,
			Limitations: []string{"Orbit does not know which commitment is most flexible."},
			Status:      "pending",
			Source:      "deterministic",
		})
	}
	if totalMinutes > 360 {
		recommendations = append(recommendations, Recommendation{
			Type:           "reduce_daily_load",
			Title:          "Protect some breathing room",
			Explanation:    "The open plan contains more than six hours of estimated work.",
			Evidence:       []string{"Open task estimates exceed 360 minutes."},
			ProposedAction: map[string]interface{}{"action": "review_daily_capacity"},
			Confidence:     0.9,
			Limitations:    []string{"Estimates may be missing or inaccurate."},
			Status:         "pending",
			Source:         "deterministic",
		})
	}
	if snapshot.BlockedCount > 0 {
		recommendations = append(recommendations, Recommendation{
			Type:           "review_blocked_milestones",
			Title:          "Clear a dependency first",
			Explanation:    "A milestone is waiting on incomplete work.",
			Evidence:       []string{"One or more milestones have incomplete dependencies."},
			ProposedAction: map[string]interface{}{"action": "open_blocked_milestones"},
			Confidence:     1,
			Limitations:    []string{},
			Status:         "pending",
			Source:         "deterministic",
		})
	}
	return recommendations
}

func taskIDs(tasks []TaskSnapshot) []string {
	ids := make([]string, 0, len(tasks))
	for _, task := range tasks {
		ids = append(ids, task.ID)
	}
	return ids
}
