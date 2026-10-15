# FocusArena focus features

## Feature behavior

### Distraction analytics

- The **I Got Distracted** control is available only during a focus-mode Pomodoro run. Sources are phone, social interruption, random thought, environmental noise, and other; an optional note is limited to 240 characters.
- The server obtains the account from the authenticated session. Run ownership and active status are checked server-side. Client event IDs are unique per account, so retrying a submission does not count it twice. A failed request leaves the form input in place for retry.
- Distraction events attach to a server-created `focus_session_runs` record. When the run completes, that record points to exactly one `focus_sessions` row. Reset, skip, partial banking, abandoned, or incomplete rounds do not become duel-eligible quality-scored sessions.
- Analytics count events only from completed, tracked runs. Distractions/hour divides those events by the real credited focus minutes; an empty or zero-minute dataset returns zero. Hour-of-day and daily trend use **UTC**, explicitly labeled in the UI. The 30-day series includes zero-event days.

### Focus-quality score and leaderboard

- Formula v1: `clamp(round(100 - 12.5 × logged distractions), 0, 100)`. It uses event counts, **not** distraction duration. The integer result and `focus_quality_version = 1` are saved once, at completion; historical scores are not silently recalculated.
- A completed tracked Pomodoro receives the score from the server's persisted distraction-event count. A `(run_key)` uniqueness constraint and the completion transaction prevent retries from creating another session or extra score. The server also verifies the run's stored planned duration and serializes completion per account. If server-timed runs overlap (for example, across devices), the earliest-started one may qualify; a later overlapping run is rejected, so overlapping time cannot be counted twice.
- The existing XP/time/streak ranking is unchanged. A separate quality board orders average recorded quality, and lists only accounts with at least five scored rounds. It is explicitly labeled self-reported: logged distractions are not proof of genuine attention and unreported distractions cannot be detected.

### Duel Mode

- A challenge invitation expires after **72 hours**. The seven-day window starts when the invited opponent accepts; its start/deadline and fixed rules are saved on the server.
- Rules are fixed for both players: 10 qualifying rounds, at least 25 minutes each, any task/free focus, most rounds wins, then total qualifying minutes, then a draw. Optional stakes are informal text and never affect scoring; no payment feature exists.
- Progress is derived from persisted sessions that have an active-run record, server-timed planned duration, matching participant, a start inside the duel window, and completion no later than the deadline. One run maps to one session; partial, abandoned, incomplete, overlapping (only the earliest overlapping run can qualify), invalid-duration, and out-of-window runs do not qualify. Progress refreshes on the detail page every 30 seconds; the countdown is a local display of the server deadline.
- Only participants can access a duel detail record. Invitation acceptance/decline and cancellation use conditional database updates so a stale or repeated request cannot change the outcome twice. The unique open-pair index prevents a second pending/active challenge between the same accounts.

### Deep Work Journal

- One private row per authenticated user and local calendar day is enforced by a database unique index. A reflection is **completed only when all three trimmed prompts are non-empty** and the server writes `completed_at`; opening the page or saving a partial draft never completes the day.
- Drafts are saved to the database and also backed up in browser local storage under an account-and-day-specific key. Browser drafts restore after reload and are removed after a successful server save. Save/complete feedback and a `beforeunload` warning reduce accidental loss.
- The IANA time zone supplied with the entry is validated server-side; the date is compared with the current date *in that zone*. Focus minutes for a selected journal date are matched against the session start instant converted to the entry's saved time zone. Calendar/history search and optional from/to filters are scoped to the authenticated account and use parameterized Drizzle queries. Results are paginated.
- Streaks, repeated priorities, and blocker counts are computed from stored entries. Session time and quality are shown as a descriptive association only, never as proof of causation or as a fabricated AI insight.

## Database migration

The additive migrations are `migrations/0001_focusarena_features.sql` and `migrations/0002_commitment_energy_verification_perks.sql`. Migration 0002 adds private commitments, energy and proof-check fields, a transactional cosmetic inventory, public-consent and equipped-cosmetic fields, and a separate spendable XP balance. The XP balance is backfilled once from historical XP; future earned XP increments both balances, while purchases debit only the spendable balance. Progress levels, badges, and the existing leaderboard score therefore do not decrease after a purchase.

Apply migrations against the intended database after confirming `DATABASE_URL` points to that database. If migration 0001 has not already been applied, run it first; then run 0002 from PowerShell:

```powershell
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f .\migrations\0002_commitment_energy_verification_perks.sql
```

Migration 0002 was applied to the PostgreSQL database configured in the local `.env` and verified for the expected tables and columns during this task. The database URL was not printed. No other production/shared database was assumed. No new paid service, third-party API, external asset, or environment variable is required.

## Verification scope and limitations

Automated unit coverage is in `tests/feature-metrics.test.mjs` for score bounds, zero-duration analytics, duel winner/ties, streak rules, local-day/time-zone boundaries, commitment denominators, energy sample thresholds, and verification status. Commitment text and energy answers are private. Fulfillment is self-reported; unresolved, abandoned, and cancelled rounds are excluded from the fulfillment denominator. Public accountability is off by default and, if opted into, exposes only a 24-hour indicator after a self-reported broken commitment. An attention check is optional, schedules at most one server-timed prompt in a tracked focus round of at least 15 minutes, and requires an active online client to poll; a missed response is not proof of cheating or uninterrupted inattention. These product signals are aids, not clinical or fraud-detection measurements.
