import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FocusArena — Deep work is a sport",
    short_name: "FocusArena",
    description:
      "The gamified Pomodoro arena. Timed focus sprints, XP levels, streaks, badges, squads, group rooms and a live leaderboard.",
    start_url: "/",
    display: "standalone",
    background_color: "#06060d",
    theme_color: "#7c6cff",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
