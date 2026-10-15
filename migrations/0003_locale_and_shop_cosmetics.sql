-- FocusArena: account locale and expanded profile cosmetics.
-- Additive and safe to re-run; existing purchases, XP, and profile data are preserved.
BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS locale varchar(5) NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS equipped_logo varchar(40),
  ADD COLUMN IF NOT EXISTS equipped_color varchar(40),
  ADD COLUMN IF NOT EXISTS equipped_icon varchar(40);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_locale_chk;
ALTER TABLE users ADD CONSTRAINT users_locale_chk CHECK (locale IN ('en', 'ar'));

ALTER TABLE user_perks DROP CONSTRAINT IF EXISTS user_perks_category_check;
ALTER TABLE user_perks DROP CONSTRAINT IF EXISTS user_perks_category_chk;
ALTER TABLE user_perks ADD CONSTRAINT user_perks_category_chk
  CHECK (category IN ('title', 'frame', 'logo', 'color', 'icon'));

COMMIT;
