package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/kishan-111/DailyRoutineTracker/backend/internal/middleware"
	"github.com/kishan-111/DailyRoutineTracker/backend/internal/models"
	"github.com/kishan-111/DailyRoutineTracker/backend/internal/repository"
	"github.com/kishan-111/DailyRoutineTracker/backend/internal/service"
)

type RoutineHandler struct {
	routines *service.RoutineService
}

func NewRoutineHandler(routines *service.RoutineService) *RoutineHandler {
	return &RoutineHandler{routines: routines}
}

func (h *RoutineHandler) SyncToday(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized"})
		return
	}

	var req models.SyncTodayRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid request body"})
		return
	}

	log, err := h.routines.SyncToday(r.Context(), user.ID, req)
	if err != nil {
		status, message := mapRoutineError(err)
		writeJSON(w, status, models.ErrorResponse{Error: message})
		return
	}

	writeJSON(w, http.StatusOK, log)
}

func (h *RoutineHandler) ToggleTask(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized"})
		return
	}

	var req models.ToggleTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid request body"})
		return
	}

	log, err := h.routines.ToggleTask(r.Context(), user.ID, req)
	if err != nil {
		status, message := mapRoutineError(err)
		writeJSON(w, status, models.ErrorResponse{Error: message})
		return
	}

	writeJSON(w, http.StatusOK, log)
}

func (h *RoutineHandler) GetToday(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized"})
		return
	}

	date := r.URL.Query().Get("date")
	log, err := h.routines.GetToday(r.Context(), user.ID, date)
	if err != nil {
		if errors.Is(err, repository.ErrRoutineNotFound) {
			writeJSON(w, http.StatusNotFound, models.ErrorResponse{Error: "no routine for this date"})
			return
		}
		status, message := mapRoutineError(err)
		writeJSON(w, status, models.ErrorResponse{Error: message})
		return
	}

	writeJSON(w, http.StatusOK, log)
}

func (h *RoutineHandler) GetLastSaved(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized"})
		return
	}

	date := r.URL.Query().Get("before")
	log, err := h.routines.GetLastSaved(r.Context(), user.ID, date)
	if err != nil {
		if errors.Is(err, repository.ErrRoutineNotFound) {
			writeJSON(w, http.StatusNotFound, models.ErrorResponse{Error: "no saved routine found"})
			return
		}
		status, message := mapRoutineError(err)
		writeJSON(w, status, models.ErrorResponse{Error: message})
		return
	}

	writeJSON(w, http.StatusOK, log)
}

func mapRoutineError(err error) (int, string) {
	switch {
	case errors.Is(err, service.ErrInvalidDate):
		return http.StatusBadRequest, "invalid date"
	case errors.Is(err, service.ErrInvalidSchedule):
		return http.StatusBadRequest, "schedule cannot be empty"
	case errors.Is(err, service.ErrInvalidTask):
		return http.StatusNotFound, "task not found"
	case errors.Is(err, service.ErrRoutineLocked):
		return http.StatusConflict, "routine is already saved"
	default:
		return http.StatusInternalServerError, "something went wrong"
	}
}
