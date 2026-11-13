package config

import (
	"errors"
	"os"
	"strconv"
	"time"
)

type Config struct {
	Environment     string
	HTTPAddr        string
	DatabaseURL     string
	OIDCIssuerURL   string
	OIDCAudience    string
	DevUserID       string
	OpenAIAPIKey    string
	OpenAIModel     string
	OpenAIBaseURL   string
	ShutdownTimeout time.Duration
}

func Load() (Config, error) {
	cfg := Config{
		Environment:     env("ORBIT_ENV", "development"),
		HTTPAddr:        env("HTTP_ADDR", ":8080"),
		DatabaseURL:     os.Getenv("DATABASE_URL"),
		OIDCIssuerURL:   os.Getenv("OIDC_ISSUER_URL"),
		OIDCAudience:    os.Getenv("OIDC_AUDIENCE"),
		DevUserID:       os.Getenv("ORBIT_DEV_USER_ID"),
		OpenAIAPIKey:    os.Getenv("OPENAI_API_KEY"),
		OpenAIModel:     env("OPENAI_MODEL", "gpt-5-mini"),
		OpenAIBaseURL:   env("OPENAI_BASE_URL", "https://api.openai.com/v1"),
		ShutdownTimeout: durationEnv("SHUTDOWN_TIMEOUT", 10*time.Second),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, errors.New("DATABASE_URL is required")
	}
	if cfg.Environment == "production" {
		if cfg.OIDCIssuerURL == "" || cfg.OIDCAudience == "" {
			return Config{}, errors.New("OIDC_ISSUER_URL and OIDC_AUDIENCE are required in production")
		}
		if cfg.DevUserID != "" {
			return Config{}, errors.New("ORBIT_DEV_USER_ID must not be set in production")
		}
	}
	return cfg, nil
}

func env(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

func durationEnv(name string, fallback time.Duration) time.Duration {
	raw := os.Getenv(name)
	if raw == "" {
		return fallback
	}
	seconds, err := strconv.Atoi(raw)
	if err != nil || seconds <= 0 {
		return fallback
	}
	return time.Duration(seconds) * time.Second
}
