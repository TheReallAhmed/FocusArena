# FocusArena

Deep work is a sport. A gamified Pomodoro arena for you and your crew — timed focus sprints, XP levels, streaks, badges, private squads, task flow, a focus heatmap calendar, and live leaderboards. 100% free stack.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19**
- **PostgreSQL** + **Drizzle ORM**
- **Tailwind CSS v4** design system
- Cookie-session auth (bcrypt password hashing) — no paid auth service
- Free quotes API (zenquotes.io) with local fallback — no API key needed

## Local dev

```bash
npm install
npx drizzle-kit push   # create tables (needs DATABASE_URL in .env)
npm run dev
```

## Free production deploy (Vercel + Neon)

1. Push this repo to **GitHub**.
2. Create a free Postgres at **neon.tech** → New Project → copy the **pooled connection string** (`postgres://...neon.tech/...?sslmode=require`).
3. Import the repo in **vercel.com** → add env var `DATABASE_URL` = the Neon string → **Deploy**.
4. One time, from your machine:

```bash
DATABASE_URL="your-neon-string" npx drizzle-kit push
```

5. Share your `https://your-app.vercel.app` link with your friends. They register in 20 seconds — no email needed.

## Features

- Pomodoro engine (25/5/15, custom durations, sounds, auto-cycles, tab-title timer)
- XP (1 XP per focused minute), levels, 12 unlockable badges, day streaks
- Global leaderboard (weekly + all-time) with podium
- Squads with invite codes and private weekly boards
- To-do list linked to the timer, per-task deep-work minutes
- GitHub-style monthly focus heatmap
