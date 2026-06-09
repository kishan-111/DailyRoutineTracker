package repository

import (
	"context"
	"errors"
	"time"

	"github.com/kishan-111/DailyRoutineTracker/backend/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var ErrRoutineNotFound = errors.New("routine log not found")

type RoutineRepository struct {
	collection *mongo.Collection
}

func NewRoutineRepository(db *mongo.Database) *RoutineRepository {
	return &RoutineRepository{collection: db.Collection("daily_routines")}
}

func (r *RoutineRepository) FindByUserAndDate(ctx context.Context, userID primitive.ObjectID, date string) (*models.DailyRoutineLog, error) {
	var log models.DailyRoutineLog
	err := r.collection.FindOne(ctx, bson.M{
		"user_id": userID,
		"date":    date,
	}).Decode(&log)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrRoutineNotFound
		}
		return nil, err
	}
	return &log, nil
}

func (r *RoutineRepository) UpsertToday(
	ctx context.Context,
	userID primitive.ObjectID,
	date string,
	dayOfWeek int,
	tasks []models.RoutineTask,
) (*models.DailyRoutineLog, error) {
	existing, err := r.FindByUserAndDate(ctx, userID, date)
	now := time.Now().UTC()

	if errors.Is(err, ErrRoutineNotFound) {
		log := models.DailyRoutineLog{
			ID:        primitive.NewObjectID(),
			UserID:    userID,
			Date:      date,
			DayOfWeek: dayOfWeek,
			Tasks:     tasks,
			Status:    models.RoutineStatusInProgress,
			CreatedAt: now,
			UpdatedAt: now,
		}
		_, err = r.collection.InsertOne(ctx, log)
		if err != nil {
			return nil, err
		}
		return &log, nil
	}
	if err != nil {
		return nil, err
	}

	if existing.Status == models.RoutineStatusSaved {
		return existing, nil
	}

	merged := mergeTasks(existing.Tasks, tasks)
	_, err = r.collection.UpdateOne(ctx, bson.M{
		"user_id": userID,
		"date":    date,
	}, bson.M{
		"$set": bson.M{
			"day_of_week": dayOfWeek,
			"tasks":       merged,
			"updated_at":  now,
		},
	})
	if err != nil {
		return nil, err
	}

	return r.FindByUserAndDate(ctx, userID, date)
}

func (r *RoutineRepository) SetTaskDone(
	ctx context.Context,
	userID primitive.ObjectID,
	date, taskID string,
	done bool,
) (*models.DailyRoutineLog, error) {
	log, err := r.FindByUserAndDate(ctx, userID, date)
	if err != nil {
		return nil, err
	}

	if log.Status == models.RoutineStatusSaved {
		return nil, errors.New("cannot modify a saved routine")
	}

	found := false
	for i := range log.Tasks {
		if log.Tasks[i].ID == taskID {
			log.Tasks[i].Done = done
			found = true
			break
		}
	}
	if !found {
		return nil, ErrRoutineNotFound
	}

	now := time.Now().UTC()
	_, err = r.collection.UpdateOne(ctx, bson.M{
		"user_id": userID,
		"date":    date,
	}, bson.M{
		"$set": bson.M{
			"tasks":      log.Tasks,
			"updated_at": now,
		},
	})
	if err != nil {
		return nil, err
	}

	return r.FindByUserAndDate(ctx, userID, date)
}

func (r *RoutineRepository) FinalizeBeforeDate(ctx context.Context, userID primitive.ObjectID, today string) (int64, error) {
	now := time.Now().UTC()
	result, err := r.collection.UpdateMany(ctx, bson.M{
		"user_id": userID,
		"date":    bson.M{"$lt": today},
		"status":  models.RoutineStatusInProgress,
	}, bson.M{
		"$set": bson.M{
			"status":     models.RoutineStatusSaved,
			"saved_at":   now,
			"updated_at": now,
		},
	})
	if err != nil {
		return 0, err
	}
	return result.ModifiedCount, nil
}

func (r *RoutineRepository) FindLastSaved(ctx context.Context, userID primitive.ObjectID, beforeDate string) (*models.DailyRoutineLog, error) {
	var log models.DailyRoutineLog
	err := r.collection.FindOne(ctx, bson.M{
		"user_id": userID,
		"status":  models.RoutineStatusSaved,
		"date":    bson.M{"$lt": beforeDate},
	}, options.FindOne().SetSort(bson.D{{Key: "date", Value: -1}})).Decode(&log)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrRoutineNotFound
		}
		return nil, err
	}
	return &log, nil
}

func mergeTasks(existing, incoming []models.RoutineTask) []models.RoutineTask {
	doneByID := make(map[string]bool, len(existing))
	for _, task := range existing {
		doneByID[task.ID] = task.Done
	}

	merged := make([]models.RoutineTask, 0, len(incoming))
	for _, task := range incoming {
		if done, ok := doneByID[task.ID]; ok {
			task.Done = done
		}
		merged = append(merged, task)
	}
	return merged
}
