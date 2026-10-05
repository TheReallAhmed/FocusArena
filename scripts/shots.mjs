/** Captures full screenshots of every key page into public/shots/. */
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "fs";

const BASE = "http://localhost:3100";
const OUT = "public/shots";
mkdirSync(OUT, { recursive: true });

const demo = JSON.parse(readFileSync("scripts/.demo-cache.json", "utf8"));

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
});
await ctx.addCookies([
  { name: "fa_session", value: demo.token, url: BASE, httpOnly: true },
]);

const shoot = async (name, path, opts = {}) => {
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + path, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(opts.wait ?? 1400);
    if (opts.act) await opts.act(page);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: Boolean(opts.full) });
    console.log("shot:", name);
  } catch (e) {
    console.error("FAILED:", name, String(e).slice(0, 200));
  } finally {
    await page.close();
  }
};

// Landing page — logged-out context so CTA buttons show, scroll to fire reveals
{
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load", timeout: 30000 });
  for (let y = 0; y < 8; y++) { await page.mouse.wheel(0, 900); await page.waitForTimeout(320); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/01-landing.png`, fullPage: true });
  console.log("shot: landing");
  await page.close();
}

await shoot("02-dashboard", "/dashboard");
await shoot("03-focus", "/focus", { wait: 1500, act: async (p) => {
  try {
    await p.getByRole("button", { name: "Start", exact: true }).click();
    await p.waitForTimeout(1800);
  } catch { /* button text fallback */ }
} });
await shoot("04-rooms", "/rooms");
await shoot("05-room-lobby", `/rooms/${demo.lobbyCode}`, { wait: 3200 });
await shoot("06-tasks", "/tasks");
await shoot("07-calendar", "/calendar");
await shoot("08-leaderboard", "/leaderboard");
await shoot("09-squad", `/squads/${demo.squadId}`);
await shoot("10-admin", "/admin");
await shoot("11-profile", "/u/ahmad");
await shoot("12-profile-studio", "/settings/profile");

await browser.close();
console.log("ALL SHOTS DONE");
