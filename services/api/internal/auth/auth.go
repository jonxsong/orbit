package auth

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/coreos/go-oidc/v3/oidc"
)

type contextKey string

const userContextKey contextKey = "orbit-user"

type TokenVerifier interface {
	Verify(ctx context.Context, rawToken string) (string, error)
}

type OIDCVerifier struct {
	verifier *oidc.IDTokenVerifier
}

func NewOIDCVerifier(ctx context.Context, issuer, audience string) (*OIDCVerifier, error) {
	provider, err := oidc.NewProvider(ctx, issuer)
	if err != nil {
		return nil, err
	}
	return &OIDCVerifier{verifier: provider.Verifier(&oidc.Config{ClientID: audience})}, nil
}

func (v *OIDCVerifier) Verify(ctx context.Context, rawToken string) (string, error) {
	token, err := v.verifier.Verify(ctx, rawToken)
	if err != nil {
		return "", err
	}
	if token.Subject == "" {
		return "", errors.New("token subject is empty")
	}
	return token.Subject, nil
}

type Middleware struct {
	Verifier  TokenVerifier
	DevUserID string
}

func (m Middleware) RequireUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if m.DevUserID != "" && r.Header.Get("Authorization") == "" {
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userContextKey, m.DevUserID)))
			return
		}

		header := r.Header.Get("Authorization")
		if !strings.HasPrefix(header, "Bearer ") || m.Verifier == nil {
			writeUnauthorized(w)
			return
		}
		userID, err := m.Verifier.Verify(r.Context(), strings.TrimPrefix(header, "Bearer "))
		if err != nil {
			writeUnauthorized(w)
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userContextKey, userID)))
	})
}

func UserID(ctx context.Context) (string, bool) {
	value, ok := ctx.Value(userContextKey).(string)
	return value, ok && value != ""
}

func writeUnauthorized(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_, _ = w.Write([]byte(`{"error":{"code":"unauthorized","message":"Authentication is required."}}`))
}
