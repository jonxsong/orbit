package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jonxsong/orbit/services/api/internal/ai"
	"github.com/jonxsong/orbit/services/api/internal/auth"
	"github.com/jonxsong/orbit/services/api/internal/config"
	"github.com/jonxsong/orbit/services/api/internal/database"
	"github.com/jonxsong/orbit/services/api/internal/httpapi"
	"github.com/jonxsong/orbit/services/api/internal/logging"
	orbitsync "github.com/jonxsong/orbit/services/api/internal/sync"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

func main() {
	logger := logging.New()
	cfg, err := config.Load()
	if err != nil {
		logger.Event("error", "configuration_failed", map[string]interface{}{"error": err.Error()})
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	pool, err := database.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Event("error", "database_connection_failed", map[string]interface{}{"error": err.Error()})
		os.Exit(1)
	}
	defer pool.Close()

	var verifier auth.TokenVerifier
	if cfg.OIDCIssuerURL != "" {
		oidcVerifier, err := auth.NewOIDCVerifier(ctx, cfg.OIDCIssuerURL, cfg.OIDCAudience)
		if err != nil {
			logger.Event("error", "oidc_initialization_failed", map[string]interface{}{"error": err.Error()})
			os.Exit(1)
		}
		verifier = oidcVerifier
	}

	syncService := orbitsync.NewService(orbitsync.NewPostgresStore(pool))
	aiClient := ai.NewClient(cfg.OpenAIAPIKey, cfg.OpenAIModel, cfg.OpenAIBaseURL)
	router := httpapi.NewRouter(httpapi.Dependencies{
		Logger:      logger,
		Pool:        pool,
		Auth:        auth.Middleware{Verifier: verifier, DevUserID: cfg.DevUserID},
		Sync:        syncService,
		AI:          aiClient,
		Environment: cfg.Environment,
	})

	server := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           otelhttp.NewHandler(router, "orbit-api"),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       20 * time.Second,
		WriteTimeout:      20 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}

	go func() {
		logger.Event("info", "api_started", map[string]interface{}{"address": cfg.HTTPAddr, "environment": cfg.Environment})
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Event("error", "api_failed", map[string]interface{}{"error": err.Error()})
			stop()
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Event("error", "api_shutdown_failed", map[string]interface{}{"error": err.Error()})
	}
	logger.Event("info", "api_stopped", nil)
}
