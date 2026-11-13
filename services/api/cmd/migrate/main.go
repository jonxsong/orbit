package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"

	"github.com/jackc/pgx/v4/pgxpool"
)

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		fail("DATABASE_URL is required")
	}
	directory := "migrations"
	if len(os.Args) > 1 {
		directory = os.Args[1]
	}

	ctx := context.Background()
	pool, err := pgxpool.Connect(ctx, databaseURL)
	if err != nil {
		fail(err.Error())
	}
	defer pool.Close()
	if _, err := pool.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`); err != nil {
		fail(err.Error())
	}

	entries, err := os.ReadDir(directory)
	if err != nil {
		fail(err.Error())
	}
	files := make([]string, 0)
	for _, entry := range entries {
		if !entry.IsDir() && filepath.Ext(entry.Name()) == ".sql" {
			files = append(files, entry.Name())
		}
	}
	sort.Strings(files)
	for _, name := range files {
		var exists bool
		if err := pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE name = $1)`, name).Scan(&exists); err != nil {
			fail(err.Error())
		}
		if exists {
			continue
		}
		contents, err := os.ReadFile(filepath.Join(directory, name))
		if err != nil {
			fail(err.Error())
		}
		tx, err := pool.Begin(ctx)
		if err != nil {
			fail(err.Error())
		}
		if _, err := tx.Exec(ctx, string(contents)); err != nil {
			_ = tx.Rollback(ctx)
			fail(fmt.Sprintf("migration %s failed: %v", name, err))
		}
		if _, err := tx.Exec(ctx, `INSERT INTO schema_migrations(name) VALUES ($1)`, name); err != nil {
			_ = tx.Rollback(ctx)
			fail(err.Error())
		}
		if err := tx.Commit(ctx); err != nil {
			fail(err.Error())
		}
		fmt.Printf("applied %s\n", name)
	}
}

func fail(message string) {
	_, _ = fmt.Fprintln(os.Stderr, message)
	os.Exit(1)
}
