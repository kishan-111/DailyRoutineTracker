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

type AuthHandler struct {
	auth *service.AuthService
}

func NewAuthHandler(auth *service.AuthService) *AuthHandler {
	return &AuthHandler{auth: auth}
}

type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid request body"})
		return
	}

	resp, err := h.auth.Register(r.Context(), req.Email, req.Password, req.Name)
	if err != nil {
		status, message := mapAuthError(err)
		writeJSON(w, status, models.ErrorResponse{Error: message})
		return
	}

	writeJSON(w, http.StatusCreated, resp)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid request body"})
		return
	}

	resp, err := h.auth.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		status, message := mapAuthError(err)
		writeJSON(w, status, models.ErrorResponse{Error: message})
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized"})
		return
	}

	writeJSON(w, http.StatusOK, user)
}

func mapAuthError(err error) (int, string) {
	switch {
	case errors.Is(err, repository.ErrEmailTaken):
		return http.StatusConflict, "email already registered"
	case errors.Is(err, service.ErrInvalidCredentials):
		return http.StatusUnauthorized, "invalid email or password"
	case errors.Is(err, service.ErrInvalidEmail):
		return http.StatusBadRequest, "invalid email address"
	case errors.Is(err, service.ErrWeakPassword):
		return http.StatusBadRequest, "password must be at least 8 characters"
	default:
		return http.StatusInternalServerError, "something went wrong"
	}
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
