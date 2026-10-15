-- FocusArena: Distraction Trap, Duel Mode, and Deep Work Journal.
-- Additive only: preserves all existing rows and tables.
BEGIN;

ALTER TABLE focus_sessions
  ADD COLUMN IF NOT EXISTS run_key varchar(36),
  ADD COLUMN IF NOT EXISTS focus_quality integer,
  ADD COLUMN IF NOT EXISTS focus_quality_version integer,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS focus_sessions_run_key_idx
  ON focus_sessions (run_key);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'focus_sessions_quality_range_chk'
  ) THEN
    ALTER TABLE focus_sessions
      ADD CONSTRAINT focus_sessions_quality_range_chk
      CHECK (focus_quality IS NULL OR focus_quality BETWEEN 0 AND 100);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS focus_session_runs (
  run_key varchar(36) PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  focus_session_id integer REFERENCES focus_sessions(id) ON DELETE SET NULL,
  planned_minutes integer NOT NULL CHECK (planned_minutes BETWEEN 1 AND 120),
  status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
CREATE INDEX IF NOT EXISTS focus_runs_user_started_idx
  ON focus_session_runs (user_id, started_at);
CREATE UNIQUE INDEX IF NOT EXISTS focus_runs_session_idx
  ON focus_session_runs (focus_session_id);

CREATE TABLE IF NOT EXISTS distraction_events (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  run_key varchar(36) NOT NULL REFERENCES focus_session_runs(run_key) ON DELETE CASCADE,
  client_event_id varchar(36) NOT NULL,
  source varchar(24) NOT NULL CHECK (source IN ('phone', 'interruption', 'thought', 'noise', 'other')),
  note varchar(240),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS distractions_user_created_idx
  ON distraction_events (user_id, created_at);
CREATE INDEX IF NOT EXISTS distractions_run_idx
  ON distraction_events (run_key, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS distractions_user_client_event_idx
  ON distraction_events (user_id, client_event_id);

CREATE TABLE IF NOT EXISTS duels (
  id serial PRIMARY KEY,
  pair_key varchar(48) NOT NULL,
  challenger_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opponent_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status varchar(16) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'completed', 'declined', 'cancelled', 'expired')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  invitation_expires_at timestamptz NOT NULL,
  starts_at timestamptz,
  ends_at timestamptz,
  required_rounds integer NOT NULL DEFAULT 10 CHECK (required_rounds BETWEEN 1 AND 100),
  minimum_focus_minutes integer NOT NULL DEFAULT 25 CHECK (minimum_focus_minutes BETWEEN 1 AND 120),
  task_category varchar(20) NOT NULL DEFAULT 'any',
  stake varchar(160),
  winner_id integer REFERENCES users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  CHECK (challenger_id <> opponent_id)
);
CREATE INDEX IF NOT EXISTS duels_challenger_status_idx ON duels (challenger_id, status);
CREATE INDEX IF NOT EXISTS duels_opponent_status_idx ON duels (opponent_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS duels_open_pair_idx
  ON duels (pair_key) WHERE status IN ('pending', 'active');

CREATE TABLE IF NOT EXISTS deep_work_journal (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_day date NOT NULL,
  time_zone varchar(64) NOT NULL,
  went_well varchar(1200) NOT NULL DEFAULT '',
  blockers varchar(1200) NOT NULL DEFAULT '',
  tomorrow_priority varchar(600) NOT NULL DEFAULT '',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_day)
);
CREATE INDEX IF NOT EXISTS journal_user_updated_idx
  ON deep_work_journal (user_id, updated_at);

COMMIT;
