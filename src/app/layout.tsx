import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FocusArena — Deep work is a sport",
    template: "%s · FocusArena",
  },
  description:
    "The gamified Pomodoro arena for you and your crew. Timed focus sprints, XP levels, streaks, badges, squads and a live leaderboard. 100% free.",
};

export const viewport: Viewport = {
  themeColor: "#06060d",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
