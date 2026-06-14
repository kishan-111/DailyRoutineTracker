package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/kishan-111/DailyRoutineTracker/backend/internal/config"
	"github.com/kishan-111/DailyRoutineTracker/backend/internal/database"
	"github.com/kishan-111/DailyRoutineTracker/backend/internal/handlers"
	"github.com/kishan-111/DailyRoutineTracker/backend/internal/middleware"
	"github.com/kishan-111/DailyRoutineTracker/backend/internal/repository"
	"github.com/kishan-111/DailyRoutineTracker/backend/internal/service"
)

func main() {
	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx, cfg.MongoURI, cfg.MongoDatabase)
	if err != nil {
		log.Fatalf("mongodb connection failed: %v", err)
	}
	defer database.Disconnect(context.Background(), db)

	userRepo := repository.NewUserRepository(db)
	routineRepo := repository.NewRoutineRepository(db)
	authService := service.NewAuthService(userRepo, cfg.JWTSecret)
	routineService := service.NewRoutineService(routineRepo)
	authHandler := handlers.NewAuthHandler(authService)
	routineHandler := handlers.NewRoutineHandler(routineService)
	feedbackHandler := handlers.NewFeedbackHandler(routineService, "../../ai_agent")

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", healthHandler)
	mux.HandleFunc("POST /api/auth/register", authHandler.Register)
	mux.HandleFunc("POST /api/auth/login", authHandler.Login)
	mux.Handle("GET /api/auth/me", middleware.Auth(authService)(http.HandlerFunc(authHandler.Me)))
	mux.Handle("PUT /api/routine/today", middleware.Auth(authService)(http.HandlerFunc(routineHandler.SyncToday)))
	mux.Handle("PATCH /api/routine/today/tasks", middleware.Auth(authService)(http.HandlerFunc(routineHandler.ToggleTask)))
	mux.Handle("GET /api/routine/today", middleware.Auth(authService)(http.HandlerFunc(routineHandler.GetToday)))
	mux.Handle("GET /api/routine/last", middleware.Auth(authService)(http.HandlerFunc(routineHandler.GetLastSaved)))
	mux.Handle("GET /api/feedback", middleware.Auth(authService)(http.HandlerFunc(feedbackHandler.GenerateFeedback)))

	handler := withCORS(cfg.CORSOrigin, mux)

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      handler,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("server listening on http://localhost:%s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown error: %v", err)
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

func withCORS(origin string, next http.Handler) http.Handler {
	allowedOrigins := parseOrigins(origin)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestOrigin := r.Header.Get("Origin")
		if requestOrigin != "" && originAllowed(requestOrigin, allowedOrigins) {
			w.Header().Set("Access-Control-Allow-Origin", requestOrigin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, OPTIONS")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func parseOrigins(origin string) []string {
	parts := strings.Split(origin, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	return origins
}

func originAllowed(requestOrigin string, allowedOrigins []string) bool {
	for _, allowed := range allowedOrigins {
		if allowed == "*" || allowed == requestOrigin {
			return true
		}
	}
	return false
}
