package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/jonxsong/orbit/services/api/internal/recommendations"
)

type Client struct {
	apiKey  string
	model   string
	baseURL string
	http    *http.Client
}

func NewClient(apiKey, model, baseURL string) *Client {
	return &Client{
		apiKey:  apiKey,
		model:   model,
		baseURL: strings.TrimRight(baseURL, "/"),
		http:    &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *Client) Available() bool { return c.apiKey != "" }

func (c *Client) Recommend(
	ctx context.Context,
	snapshot recommendations.Snapshot,
) (recommendations.Recommendation, error) {
	if !c.Available() {
		return recommendations.Recommendation{}, errors.New("AI service is not configured")
	}
	snapshotJSON, err := json.Marshal(snapshot)
	if err != nil {
		return recommendations.Recommendation{}, err
	}

	payload := map[string]interface{}{
		"model":             c.model,
		"instructions":      "You are Orbit's planning assistant. Use only the supplied structured snapshot. Be calm, specific, non-punitive, and never claim to have changed user data. Return one optional proposal. Do not include journal content or infer sensitive traits.",
		"input":             string(snapshotJSON),
		"max_output_tokens": 700,
		"text": map[string]interface{}{
			"format": map[string]interface{}{
				"type":   "json_schema",
				"name":   "orbit_recommendation",
				"strict": true,
				"schema": recommendationSchema(),
			},
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return recommendations.Recommendation{}, err
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/responses", bytes.NewReader(body))
	if err != nil {
		return recommendations.Recommendation{}, err
	}
	request.Header.Set("Authorization", "Bearer "+c.apiKey)
	request.Header.Set("Content-Type", "application/json")
	response, err := c.http.Do(request)
	if err != nil {
		return recommendations.Recommendation{}, err
	}
	defer response.Body.Close()
	limited := io.LimitReader(response.Body, 1<<20)
	responseBody, err := io.ReadAll(limited)
	if err != nil {
		return recommendations.Recommendation{}, err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return recommendations.Recommendation{}, fmt.Errorf("OpenAI request failed with status %d", response.StatusCode)
	}

	var envelope struct {
		Output []struct {
			Type    string `json:"type"`
			Content []struct {
				Type string `json:"type"`
				Text string `json:"text"`
			} `json:"content"`
		} `json:"output"`
	}
	if err := json.Unmarshal(responseBody, &envelope); err != nil {
		return recommendations.Recommendation{}, err
	}
	var outputText string
	for _, output := range envelope.Output {
		for _, content := range output.Content {
			if content.Type == "output_text" {
				outputText = content.Text
				break
			}
		}
	}
	if outputText == "" {
		return recommendations.Recommendation{}, errors.New("OpenAI response contained no structured output")
	}
	var recommendation recommendations.Recommendation
	if err := json.Unmarshal([]byte(outputText), &recommendation); err != nil {
		return recommendations.Recommendation{}, fmt.Errorf("validate structured recommendation: %w", err)
	}
	if recommendation.Type == "" || recommendation.Title == "" || recommendation.Explanation == "" {
		return recommendations.Recommendation{}, errors.New("structured recommendation is missing required fields")
	}
	recommendation.Status = "pending"
	recommendation.Source = "ai"
	return recommendation, nil
}

func recommendationSchema() map[string]interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"required": []string{
			"type", "title", "explanation", "evidence", "proposed_action", "confidence", "limitations",
		},
		"properties": map[string]interface{}{
			"type":        map[string]interface{}{"type": "string"},
			"title":       map[string]interface{}{"type": "string", "maxLength": 100},
			"explanation": map[string]interface{}{"type": "string", "maxLength": 500},
			"evidence": map[string]interface{}{
				"type": "array", "maxItems": 5,
				"items": map[string]interface{}{"type": "string", "maxLength": 180},
			},
			"proposed_action": map[string]interface{}{
				"type":                 "object",
				"additionalProperties": false,
				"required":             []string{"action", "record_ids"},
				"properties": map[string]interface{}{
					"action": map[string]interface{}{"type": "string"},
					"record_ids": map[string]interface{}{
						"type": "array", "items": map[string]interface{}{"type": "string"},
					},
				},
			},
			"confidence":  map[string]interface{}{"type": "number", "minimum": 0, "maximum": 1},
			"limitations": map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}, "maxItems": 5},
		},
	}
}
