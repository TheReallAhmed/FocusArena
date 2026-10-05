/**
 * Demo data seeder — creates a believable arena full of players, sessions,
 * badges, tasks, squads and rooms so screenshots / previews look alive.
 * Idempotent: demo usernames are wiped and recreated on every run.
 */
import "dotenv/config";
import pg from "pg";
import bcrypt from "bcryptjs";
import { writeFileSync } from "fs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const pad = (n) => String(n).padStart(2, "0");
const dayKey = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const daysAgo = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d; };
const hourOn = (n, h, m = 0) => { const d = daysAgo(n); d.setUTCHours(h, m, 0, 0); return d; };

const DEMO = [
  {
    username: "ahmad", name: "Ahmad", hue: 258, role: "admin",
    avatar: "/images/demo-ahmad.jpg", location: "Amman, Jordan",
    bio: "Software engineering student building useful things, chasing deep work, and helping the crew win one focused round at a time.",
    linkedin: "https://www.linkedin.com/in/ahmad-focus/",
    github: "https://github.com/ahmad-focus",
    website: "https://ahmad.dev/",
  },
  { username: "layla", name: "Layla", hue: 320, role: "member", location: "Dubai, UAE", bio: "Medical student. Night owl. Making consistency louder than motivation." },
  { username: "omar", name: "Omar", hue: 200, role: "member", location: "Cairo, Egypt", bio: "Computer science, coffee, and one more Pomodoro." },
  { username: "sara", name: "Sara", hue: 140, role: "member", location: "Beirut, Lebanon", bio: "Design student turning focused hours into better work." },
  { username: "khalil", name: "Khalil", hue: 30, role: "member", location: "Riyadh, KSA", bio: "Learning in public and stacking small wins." },
];

/** minute counts per day, back from today. null = rest day. */
const PATTERNS = {
  ahmad: [175, 150, 200, 125, 175, 250, 150, 100, 175, 200, 300, 150, 125, 75, 150, 200, 100, 175, 50, 125],
  layla: [150, 125, 175, 100, 150, 200, 125, 175, null, 100, 150, 75, null, 125],
  omar: [100, 75, 125, null, 50, 100, 25, null, 75],
  sara: [75, 50, 100, 25, null, 75, 50],
  khalil: [50, null, 75, null, 25, 50],
};

const HOUR_PREFS = { ahmad: [6, 9, 14, 21], layla: [17, 18, 20, 22], omar: [22, 23, 1, 13], sara: [7, 8, 10, 16], khalil: [12, 15, 19, 20] };

const BADGES_FOR = {
  ahmad: ["first-blood", "grinder", "marathon", "streak-3", "streak-7", "streak-14", "early-bird", "night-owl", "weekend-warrior", "big-day", "double-down", "sharpshooter", "taskmaster", "squad-up", "founder", "together", "hive-mind"],
  layla: ["first-blood", "grinder", "marathon", "streak-3", "streak-7", "weekend-warrior", "sharpshooter", "squad-up", "together", "hive-mind"],
  omar: ["first-blood", "streak-3", "night-owl", "weekend-warrior", "squad-up", "together"],
  sara: ["first-blood", "streak-3", "early-bird", "squad-up"],
  khalil: ["first-blood", "squad-up"],
};

const client = await pool.connect();
try {
  await client.query("BEGIN");

  // wipe previous demo data (cascades sessions, tasks, badges, memberships, sessions)
  await client.query(`DELETE FROM users WHERE username = ANY($1)`, [DEMO.map((d) => d.username)]);

  const hash = await bcrypt.hash("demo1234", 10);
  const userIds = {};

  for (const d of DEMO) {
    const pattern = PATTERNS[d.username];
    let xp = 0, streak = 0;
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] !== null) { xp += pattern[i]; if (i === streak) streak++; }
    }
    // streak = consecutive non-null days starting at day 0 (today)
    streak = 0;
    for (let i = 0; i < pattern.length; i++) { if (pattern[i] === null) break; streak++; }

    const { rows } = await client.query(
      `INSERT INTO users (
         username, display_name, password_hash, role, avatar_hue, avatar_url,
         bio, location, linkedin_url, github_url, website_url, xp, streak, last_focus_day
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [
        d.username, d.name, hash, d.role, d.hue, d.avatar ?? null,
        d.bio ?? null, d.location ?? null, d.linkedin ?? null, d.github ?? null, d.website ?? null,
        xp, streak, pattern[0] !== null ? dayKey(daysAgo(0)) : null,
      ]
    );
    userIds[d.username] = rows[0].id;
  }

  // rooms (created early so group sessions can reference one)
  const { rows: doneRoom } = await client.query(
    `INSERT INTO rooms (code, name, host_id, status, current_round, total_rounds, focus_minutes, break_minutes, phase_started_at, created_at)
     VALUES ('BIOG24','Bio midterm grind',$1,'done',4,4,25,5,NULL,$2) RETURNING id`,
    [userIds.ahmad, daysAgo(3)]
  );
  const { rows: lobbyRoom } = await client.query(
    `INSERT INTO rooms (code, name, host_id, status, current_round, total_rounds, focus_minutes, break_minutes, phase_started_at, created_at)
     VALUES ('NITE77','Study Night — Chem Finals',$1,'lobby',0,4,25,5,NULL,$2) RETURNING id`,
    [userIds.ahmad, hourOn(0, 1)]
  );
  const roomIds = { done: doneRoom[0].id, lobby: lobbyRoom[0].id };
  for (const u of DEMO) {
    for (const rid of Object.values(roomIds)) {
      await client.query(
        `INSERT INTO room_members (room_id, user_id, joined_at, last_seen_at) VALUES ($1,$2,$3,$4)`,
        [rid, userIds[u.username], daysAgo(1), new Date()]
      );
    }
  }

  // focus sessions
  for (const d of DEMO) {
    const pattern = PATTERNS[d.username];
    for (let i = 0; i < pattern.length; i++) {
      let mins = pattern[i];
      if (mins === null) continue;
      let chunk = 0;
      const key = dayKey(daysAgo(i));
      while (mins > 0) {
        const block = mins >= 50 && chunk % 3 === 1 ? 50 : 25;
        const take = Math.min(block, mins);
        const hours = HOUR_PREFS[d.username];
        const when = hourOn(i, hours[(chunk + i) % hours.length], (chunk * 17) % 60);
        const isGroupBlock = i === 2 && chunk === 0; // one historic group round
        await client.query(
          `INSERT INTO focus_sessions (user_id, room_id, minutes, day, started_at) VALUES ($1,$2,$3,$4,$5)`,
          [userIds[d.username], isGroupBlock ? roomIds.done : null, take, key, when]
        );
        mins -= take;
        chunk++;
      }
    }
  }

  // ahmad's tasks: 11 done + 4 active
  const doneTasks = [
    "Chapter 3 practice problems", "Email Dr. Sami about the lab", "Plan the weekly squad session",
    "Discrete math — set proofs", "Finish the reading log", "Physics worksheet 6", "Clean the study desk",
    "Watch lecture 12 recording", "Vocabulary deck — 40 cards", "Fix bike brakes", "Call grandma",
  ];
  const activeTasks = [
    ["Review Chem chapter 4", "high"], ["Finish English essay outline", "normal"],
    ["Uni portal — submit lab report", "high"], ["Gym — legs day", "low"],
  ];
  for (const [i, t] of doneTasks.entries()) {
    await client.query(
      `INSERT INTO tasks (user_id, title, priority, done, focus_minutes, created_at, completed_at)
       VALUES ($1,$2,'normal',true,$3,$4,$5)`,
      [userIds.ahmad, t, [75, 50, 25][i % 3], daysAgo(10 - (i % 8)), daysAgo(9 - (i % 8))]
    );
  }
  for (const [t, p] of activeTasks) {
    await client.query(
      `INSERT INTO tasks (user_id, title, priority, done, focus_minutes, created_at) VALUES ($1,$2,$3,false,$4,$5)`,
      [userIds.ahmad, t, p, p === "high" ? 50 : 25, hourOn(0, 8)]
    );
  }

  // badges
  for (const d of DEMO) {
    for (const key of BADGES_FOR[d.username]) {
      await client.query(
        `INSERT INTO user_badges (user_id, badge_key, earned_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [userIds[d.username], key, daysAgo(Math.floor(Math.random() * 12) + 1)]
      );
    }
  }

  // squads
  const { rows: sq1 } = await client.query(
    `INSERT INTO squads (name, code, created_by) VALUES ('The Night Shift','NSHIFT',$1) RETURNING id`,
    [userIds.ahmad]
  );
  const { rows: sq2 } = await client.query(
    `INSERT INTO squads (name, code, created_by) VALUES ('Med Grind Crew','MEDC24',$1) RETURNING id`,
    [userIds.layla]
  );
  for (const u of DEMO) {
    await client.query(`INSERT INTO squad_members (squad_id, user_id) VALUES ($1,$2)`, [sq1[0].id, userIds[u.username]]);
  }
  await client.query(`INSERT INTO squad_members (squad_id, user_id) VALUES ($1,$2)`, [sq2[0].id, userIds.layla]);
  await client.query(`INSERT INTO squad_members (squad_id, user_id) VALUES ($1,$2)`, [sq2[0].id, userIds.ahmad]);
  await client.query(`INSERT INTO squad_members (squad_id, user_id) VALUES ($1,$2)`, [sq2[0].id, userIds.omar]);

  // a login token for ahmad (for screenshots & easy preview)
  const token = "demo_admin_session_token_01";
  await client.query(`DELETE FROM auth_sessions WHERE token = $1`, [token]);
  await client.query(
    `INSERT INTO auth_sessions (token, user_id, expires_at) VALUES ($1,$2,$3)`,
    [token, userIds.ahmad, new Date(Date.now() + 30 * 86400000)]
  );

  await client.query("COMMIT");
  writeFileSync("scripts/.demo-cache.json", JSON.stringify({ squadId: sq1[0].id, lobbyCode: "NITE77", token, ahmadId: userIds.ahmad }));
  console.log("SEEDED OK", JSON.stringify({ squadId: sq1[0].id, ahmadId: userIds.ahmad }));
} catch (e) {
  await client.query("ROLLBACK");
  console.error("SEED FAILED", e);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
