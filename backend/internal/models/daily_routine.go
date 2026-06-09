package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	RoutineStatusInProgress = "in_progress"
	RoutineStatusSaved      = "saved"
)

type RoutineTask struct {
	ID    string `bson:"id" json:"id"`
	Start string `bson:"start" json:"start"`
	End   string `bson:"end" json:"end"`
	Label string `bson:"label" json:"label"`
	Done  bool   `bson:"done" json:"done"`
}

type DailyRoutineLog struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"user_id" json:"user_id"`
	Date      string             `bson:"date" json:"date"`
	DayOfWeek int                `bson:"day_of_week" json:"day_of_week"`
	Tasks     []RoutineTask      `bson:"tasks" json:"tasks"`
	Status    string             `bson:"status" json:"status"`
	SavedAt   *time.Time         `bson:"saved_at,omitempty" json:"saved_at,omitempty"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
}

type SyncTodayRequest struct {
	Date      string        `json:"date"`
	DayOfWeek int           `json:"day_of_week"`
	Tasks     []RoutineTask `json:"tasks"`
}

type ToggleTaskRequest struct {
	Date   string `json:"date"`
	TaskID string `json:"task_id"`
	Done   bool   `json:"done"`
}
