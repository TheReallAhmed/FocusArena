-- FocusArena: commitment, energy, optional proof checks, and cosmetic XP perks.
-- Additive only: preserves existing sessions, XP balances, and user data.
BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS xp_balance integer,
  ADD COLUMN IF NOT EXISTS equipped_title varchar(40),
  ADD COLUMN IF NOT EXISTS equipped_frame varchar(40),
  ADD COLUMN IF NOT EXISTS public_accountability boolean NOT NULL DEFAULT false;

UPDATE users SET xp_balance = GREATEST(xp, 0) WHERE xp_balance IS NULL;
ALTER TABLE users ALTER COLUMN xp_balance SET DEFAULT 0;
ALTER TABLE users ALTER COLUMN xp_balance SET NOT NULL;

ALTER TABLE focus_sessions
  ADD COLUMN IF NOT EXISTS energy_rating integer,
  ADD COLUMN IF NOT EXISTS verification_status varchar(24);

ALTER TABLE focus_session_runs
  ADD COLUMN IF NOT EXISTS energy_rating integer,
  ADD COLUMN IF NOT EXISTS verification_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE focus_session_runs DROP CONSTRAINT IF EXISTS focus_runs_status_chk;
ALTER TABLE focus_session_runs ADD CONSTRAINT focus_runs_status_chk
  CHECK (status IN ('active', 'completed', 'abandoned', 'cancelled'));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_xp_balance_nonnegative_chk') THEN
    ALTER TABLE users ADD CONSTRAINT users_xp_balance_nonnegative_chk CHECK (xp_balance >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'focus_sessions_energy_range_chk') THEN
    ALTER TABLE focus_sessions ADD CONSTRAINT focus_sessions_energy_range_chk
      CHECK (energy_rating IS NULL OR energy_rating BETWEEN 1 AND 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'focus_sessions_verification_status_chk') THEN
    ALTER TABLE focus_sessions ADD CONSTRAINT focus_sessions_verification_status_chk
      CHECK (verification_status IS NULL OR verification_status IN ('verified', 'partially_verified', 'unverified', 'not_enabled', 'unavailable'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'focus_runs_energy_range_chk') THEN
    ALTER TABLE focus_session_runs ADD CONSTRAINT focus_runs_energy_range_chk
      CHECK (energy_rating IS NULL OR energy_rating BETWEEN 1 AND 5);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS session_commitments (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  run_key varchar(36) NOT NULL UNIQUE REFERENCES focus_session_runs(run_key) ON DELETE CASCADE,
  intended_outcome varchar(240) NOT NULL,
  consequence varchar(240),
  status varchar(16) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'unresolved', 'fulfilled', 'broken', 'abandoned', 'cancelled')),
  resolved_at timestamptz,
  accountability_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS session_commitments_user_status_idx
  ON session_commitments (user_id, status, created_at);

CREATE TABLE IF NOT EXISTS proof_challenges (
  run_key varchar(36) PRIMARY KEY REFERENCES focus_session_runs(run_key) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  status varchar(12) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'asked', 'answered', 'missed')),
  responded_at timestamptz
);
CREATE INDEX IF NOT EXISTS proof_challenges_user_status_idx
  ON proof_challenges (user_id, status);

CREATE TABLE IF NOT EXISTS user_perks (
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_key varchar(40) NOT NULL,
  category varchar(12) NOT NULL CHECK (category IN ('title', 'frame')),
  xp_cost integer NOT NULL CHECK (xp_cost > 0),
  purchased_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, reward_key)
);
CREATE INDEX IF NOT EXISTS user_perks_user_purchased_idx
  ON user_perks (user_id, purchased_at);

COMMIT;
