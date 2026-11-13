package logging

import (
	"encoding/json"
	"io"
	"log"
	"os"
	"sync"
	"time"
)

type Logger struct {
	mu  sync.Mutex
	out io.Writer
}

func New() *Logger {
	return &Logger{out: os.Stdout}
}

func (l *Logger) Event(level, message string, fields map[string]interface{}) {
	entry := map[string]interface{}{
		"timestamp": time.Now().UTC().Format(time.RFC3339Nano),
		"level":     level,
		"message":   message,
	}
	for key, value := range fields {
		if key == "authorization" || key == "reflection" || key == "prompt" {
			entry[key] = "[REDACTED]"
			continue
		}
		entry[key] = value
	}
	encoded, err := json.Marshal(entry)
	if err != nil {
		log.Printf("failed to encode log entry: %v", err)
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	_, _ = l.out.Write(append(encoded, '\n'))
}
