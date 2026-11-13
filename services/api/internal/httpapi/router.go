package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/jonxsong/orbit/services/api/internal/ai"
	"github.com/jonxsong/orbit/services/api/internal/auth"
	"github.com/jonxsong/orbit/services/api/internal/logging"
	"github.com/jonxsong/orbit/services/api/internal/recommendations"
	orbitsync "github.com/jonxsong/orbit/services/api/internal/sync"
)

type Dependencies struct {
	Logger      *logging.Logger
	Pool        *pgxpool.Pool
	Auth        auth.Middleware
	Sync        *orbitsync.Service
	AI          *ai.Client
	Environment string
}

func NewRouter(deps Dependencies) http.Handler {
	router := chi.NewRouter()
	router.Use(middleware.RequestID)
	router.Use(middleware.RealIP)
	router.Use(middleware.Recoverer)
	router.Use(middleware.Timeout(20 * time.Second))
	router.Use(requestLogger(deps.Logger))

	router.Get("/health/live", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "live"})
	})
	router.Get("/health/ready", func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		if err := deps.Pool.Ping(ctx); err != nil {
			writeError(w, http.StatusServiceUnavailable, "not_ready", "Database is unavailable.")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
	})

	router.Route("/v1", func(v1 chi.Router) {
		v1.Use(deps.Auth.RequireUser)
		v1.Post("/sync/push", handleSyncPush(deps.Sync))
		v1.Get("/sync/pull", handleSyncPull(deps.Sync))
		v1.Post("/recommendations/evaluate", handleEvaluateRecommendations())
		v1.Post("/recommendations/ai", handleAIRecommendation(deps.AI))
	})

	return router
}

func handleSyncPush(service *orbitsync.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, _ := auth.UserID(r.Context())
		var request orbitsync.PushRequest
		if err := decodeJSON(w, r, &request); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
			return
		}
		response, err := service.Push(r.Context(), userID, request)
		if err != nil {
			writeError(w, http.StatusUnprocessableEntity, "invalid_sync_batch", err.Error())
			return
		}
		writeJSON(w, http.StatusOK, response)
	}
}

func handleSyncPull(service *orbitsync.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, _ := auth.UserID(r.Context())
		after, err := strconv.ParseInt(r.URL.Query().Get("after"), 10, 64)
		if err != nil && r.URL.Query().Get("after") != "" {
			writeError(w, http.StatusBadRequest, "invalid_cursor", "after must be an integer cursor")
			return
		}
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		response, err := service.Pull(r.Context(), userID, after, limit)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "sync_pull_failed", "Changes could not be loaded.")
			return
		}
		writeJSON(w, http.StatusOK, response)
	}
}

func handleEvaluateRecommendations() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var snapshot recommendations.Snapshot
		if err := decodeJSON(w, r, &snapshot); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"recommendations": recommendations.Evaluate(snapshot, time.Now()),
		})
	}
}

func handleAIRecommendation(client *ai.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !client.Available() {
			writeError(w, http.StatusServiceUnavailable, "ai_unavailable", "AI recommendations are not configured.")
			return
		}
		var snapshot recommendations.Snapshot
		if err := decodeJSON(w, r, &snapshot); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
			return
		}
		recommendation, err := client.Recommend(r.Context(), snapshot)
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, "ai_unavailable", "AI recommendations are temporarily unavailable.")
			return
		}
		writeJSON(w, http.StatusOK, recommendation)
	}
}

func decodeJSON(w http.ResponseWriter, r *http.Request, destination interface{}) error {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(destination); err != nil {
		return errors.New("request body must be valid JSON with known fields")
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, value interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]interface{}{
		"error": map[string]string{"code": code, "message": message},
	})
}

func requestLogger(logger *logging.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			next.ServeHTTP(w, r)
			logger.Event("info", "http_request", map[string]interface{}{
				"request_id":  middleware.GetReqID(r.Context()),
				"method":      r.Method,
				"path":        r.URL.Path,
				"duration_ms": time.Since(start).Milliseconds(),
			})
		})
	}
}
