CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SEQUENCE IF NOT EXISTS sync_revision_seq AS bigint START WITH 1;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oidc_subject text NOT NULL UNIQUE,
  display_name text NOT NULL DEFAULT '',
  locale text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deletion_requested_at timestamptz
);

CREATE TABLE devices (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  platform text NOT NULL CHECK (platform = 'ios'),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX devices_user_idx ON devices(user_id);

CREATE TABLE goals (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'personal',
  target_date date,
  priority smallint NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  version bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX goals_user_status_idx ON goals(user_id, status) WHERE deleted_at IS NULL;

CREATE TABLE milestones (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES milestones(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  weight integer NOT NULL DEFAULT 1 CHECK (weight > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  version bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX milestones_goal_idx ON milestones(user_id, goal_id) WHERE deleted_at IS NULL;

CREATE TABLE tasks (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id uuid REFERENCES goals(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  notes text NOT NULL DEFAULT '',
  due_date date,
  scheduled_time time,
  priority smallint NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  estimated_minutes integer CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
  completed_at timestamptz,
  version bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX tasks_user_due_idx ON tasks(user_id, due_date, status) WHERE deleted_at IS NULL;

CREATE TABLE habits (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id uuid REFERENCES goals(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  schedule text NOT NULL CHECK (schedule IN ('daily', 'weekly', 'custom')),
  schedule_json jsonb NOT NULL DEFAULT '{}',
  target_per_week integer NOT NULL DEFAULT 7 CHECK (target_per_week BETWEEN 1 AND 7),
  timezone text NOT NULL,
  version bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX habits_user_idx ON habits(user_id) WHERE deleted_at IS NULL;

CREATE TABLE habit_completions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  occurrence_key text NOT NULL,
  completed_at timestamptz NOT NULL,
  version bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(user_id, habit_id, occurrence_key)
);

CREATE TABLE reflections (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_key text NOT NULL,
  body text NOT NULL DEFAULT '',
  accomplishments text NOT NULL DEFAULT '',
  obstacles text NOT NULL DEFAULT '',
  ai_sharing_enabled boolean NOT NULL DEFAULT false,
  version bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(user_id, period_key)
);

CREATE TABLE relationships (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_type text NOT NULL,
  from_id uuid NOT NULL,
  to_type text NOT NULL,
  to_id uuid NOT NULL,
  relationship_type text NOT NULL CHECK (relationship_type IN ('supports', 'depends_on', 'blocks')),
  version bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(user_id, from_type, from_id, to_type, to_id, relationship_type),
  CHECK (from_id <> to_id)
);
CREATE INDEX relationships_from_idx ON relationships(user_id, from_type, from_id) WHERE deleted_at IS NULL;
CREATE INDEX relationships_to_idx ON relationships(user_id, to_type, to_id) WHERE deleted_at IS NULL;

CREATE TABLE recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  source text NOT NULL CHECK (source IN ('deterministic', 'ai')),
  title text NOT NULL,
  explanation text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '[]',
  proposed_action jsonb NOT NULL,
  confidence numeric(4,3),
  limitations jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dismissed', 'applied')),
  version bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX recommendations_user_status_idx ON recommendations(user_id, status) WHERE deleted_at IS NULL;

-- The replication record stores field-version metadata needed for safe disjoint-field merges.
CREATE TABLE sync_records (
  owner_id text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  field_versions jsonb NOT NULL DEFAULT '{}',
  version bigint NOT NULL,
  deleted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id, entity_type, entity_id)
);

CREATE TABLE sync_mutations (
  owner_id text NOT NULL,
  mutation_id uuid NOT NULL,
  device_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('upsert', 'delete')),
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id, mutation_id)
);
CREATE INDEX sync_mutations_device_idx ON sync_mutations(owner_id, device_id, created_at);

CREATE TABLE sync_changes (
  owner_id text NOT NULL,
  revision bigint NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('upsert', 'delete')),
  version bigint NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id, revision)
);
CREATE INDEX sync_changes_owner_revision_idx ON sync_changes(owner_id, revision);

CREATE TABLE deletion_tombstones (
  owner_id text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  revision bigint NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id, entity_type, entity_id)
);

CREATE TABLE audit_events (
  id bigserial PRIMARY KEY,
  owner_id text,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_owner_created_idx ON audit_events(owner_id, created_at DESC);

