package service

import (
	"context"
	"errors"

	"github.com/kishan-111/DailyRoutineTracker/backend/internal/models"
	"github.com/kishan-111/DailyRoutineTracker/backend/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

var (
	ErrRoutineLocked   = errors.New("routine is already saved and cannot be changed")
	ErrInvalidTask     = errors.New("task not found")
	ErrInvalidDate     = errors.New("invalid date")
	ErrInvalidSchedule = errors.New("schedule cannot be empty")
)

type RoutineService struct {
	routines *repository.RoutineRepository
}

func NewRoutineService(routines *repository.RoutineRepository) *RoutineService {
	return &RoutineService{routines: routines}
}

func (s *RoutineService) SyncToday(ctx context.Context, userID primitive.ObjectID, req models.SyncTodayRequest) (*models.DailyRoutineLog, error) {
	if req.Date == "" {
		return nil, ErrInvalidDate
	}
	if len(req.Tasks) == 0 {
		return nil, ErrInvalidSchedule
	}

	if _, err := s.routines.FinalizeBeforeDate(ctx, userID, req.Date); err != nil {
		return nil, err
	}

	return s.routines.UpsertToday(ctx, userID, req.Date, req.DayOfWeek, req.Tasks)
}

func (s *RoutineService) ToggleTask(ctx context.Context, userID primitive.ObjectID, req models.ToggleTaskRequest) (*models.DailyRoutineLog, error) {
	if req.Date == "" || req.TaskID == "" {
		return nil, ErrInvalidTask
	}

	log, err := s.routines.SetTaskDone(ctx, userID, req.Date, req.TaskID, req.Done)
	if err != nil {
		if errors.Is(err, repository.ErrRoutineNotFound) {
			return nil, ErrInvalidTask
		}
		if err.Error() == "cannot modify a saved routine" {
			return nil, ErrRoutineLocked
		}
		return nil, err
	}
	return log, nil
}

func (s *RoutineService) GetToday(ctx context.Context, userID primitive.ObjectID, date string) (*models.DailyRoutineLog, error) {
	if date == "" {
		return nil, ErrInvalidDate
	}

	if _, err := s.routines.FinalizeBeforeDate(ctx, userID, date); err != nil {
		return nil, err
	}

	return s.routines.FindByUserAndDate(ctx, userID, date)
}

func (s *RoutineService) GetLastSaved(ctx context.Context, userID primitive.ObjectID, beforeDate string) (*models.DailyRoutineLog, error) {
	if beforeDate == "" {
		return nil, ErrInvalidDate
	}
	return s.routines.FindLastSaved(ctx, userID, beforeDate)
}
