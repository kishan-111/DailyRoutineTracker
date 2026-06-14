package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"

	"github.com/kishan-111/DailyRoutineTracker/backend/internal/middleware"
	"github.com/kishan-111/DailyRoutineTracker/backend/internal/models"
	"github.com/kishan-111/DailyRoutineTracker/backend/internal/service"
)

// FeedbackResponse is the JSON returned to the frontend.
type FeedbackResponse struct {
	Motivation  string `json:"motivation"`
	Improvement string `json:"improvement"`
}

// FeedbackHandler generates LLM feedback for a given routine log.
type FeedbackHandler struct {
	routines    *service.RoutineService
	agentScript string // absolute path to ai_agent/agent.py
}

// NewFeedbackHandler creates a FeedbackHandler.
// agentDir is the directory that contains agent.py (e.g. "../ai_agent").
func NewFeedbackHandler(routines *service.RoutineService, agentDir string) *FeedbackHandler {
	abs, _ := filepath.Abs(agentDir)
	script := filepath.Join(abs, "agent.py")
	return &FeedbackHandler{routines: routines, agentScript: script}
}

// GenerateFeedback handles GET /api/feedback?date=YYYY-MM-DD
func (h *FeedbackHandler) GenerateFeedback(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized"})
		return
	}

	date := r.URL.Query().Get("date")
	if date == "" {
		writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "date query param is required"})
		return
	}

	// Fetch the routine log for the requested date.
	log, err := h.routines.GetToday(r.Context(), user.ID, date)
	if err != nil {
		writeJSON(w, http.StatusNotFound, models.ErrorResponse{Error: "no routine found for this date"})
		return
	}

	// Serialise tasks to JSON so we can pass them to the Python agent via stdin.
	tasksJSON, err := json.Marshal(log.Tasks)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to serialise tasks"})
		return
	}

	feedback, err := h.runAgent(r.Context(), tasksJSON, date, log.DayOfWeek)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: fmt.Sprintf("agent error: %v", err)})
		return
	}

	writeJSON(w, http.StatusOK, feedback)
}

// runAgent calls the Python script and parses its JSON output.
func (h *FeedbackHandler) runAgent(ctx context.Context, tasksJSON []byte, date string, dayOfWeek int) (*FeedbackResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	// Write tasks to a temp file so the agent can read them.
	tmp, err := os.CreateTemp("", "routine-tasks-*.json")
	if err != nil {
		return nil, fmt.Errorf("create temp file: %w", err)
	}
	defer os.Remove(tmp.Name())

	if _, err := tmp.Write(tasksJSON); err != nil {
		return nil, fmt.Errorf("write temp file: %w", err)
	}
	tmp.Close()

	// Choose interpreter: prefer the venv inside ai_agent/.
	python := h.findPython()

	cmd := exec.CommandContext(ctx, python,
		h.agentScript,
		"--tasks-json", tmp.Name(),
		"--date", date,
		"--day-of-week", fmt.Sprintf("%d", dayOfWeek),
		"--output-json", // tells agent.py to write JSON to stdout
	)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("python agent exited: %w\nstderr: %s", err, stderr.String())
	}

	var resp FeedbackResponse
	if err := json.Unmarshal(stdout.Bytes(), &resp); err != nil {
		return nil, fmt.Errorf("parse agent output: %w\nraw: %s", err, stdout.String())
	}
	return &resp, nil
}

// findPython returns the best available Python interpreter.
func (h *FeedbackHandler) findPython() string {
	agentDir := filepath.Dir(h.agentScript)

	// Check for a virtual-env created inside ai_agent/
	var venvBin string
	if runtime.GOOS == "windows" {
		venvBin = filepath.Join(agentDir, ".venv", "Scripts", "python.exe")
	} else {
		venvBin = filepath.Join(agentDir, ".venv", "bin", "python")
	}
	if _, err := os.Stat(venvBin); err == nil {
		return venvBin
	}

	// Fall back to system python3 / python
	for _, name := range []string{"python3", "python"} {
		if path, err := exec.LookPath(name); err == nil {
			return path
		}
	}
	return "python3"
}
