"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Radio, RefreshCw } from "lucide-react";

/**
 * Keeps a server-rendered page fresh without a manual reload.
 * Pauses while the tab is hidden so we never waste requests.
 */
export function LiveRefresh({
  intervalMs = 15000,
  label = "Live",
}: {
  intervalMs?: number;
  label?: string;
}) {
  const router = useRouter();
  const [live, setLive] = useState(true);
  const [pulse, setPulse] = useState(false);
  const [secs, setSecs] = useState(Math.round(intervalMs / 1000));

  useEffect(() => {
    if (!live) return;
    let left = Math.round(intervalMs / 1000);
    setSecs(left);
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      left -= 1;
      if (left <= 0) {
        router.refresh();
        setPulse(true);
        setTimeout(() => setPulse(false), 900);
        left = Math.round(intervalMs / 1000);
      }
      setSecs(left);
    }, 1000);
    return () => clearInterval(id);
  }, [live, intervalMs, router]);

  return (
    <button
      type="button"
      onClick={() => setLive((v) => !v)}
      title={live ? "Live updates on — click to pause" : "Live updates paused — click to resume"}
      className={`chip !py-1 transition-all ${
        live
          ? "!border-mint-400/40 !bg-mint-400/10 !text-mint-400"
          : "!text-[#6d6a8f] hover:!text-white"
      } ${pulse ? "scale-105" : ""}`}
    >
      {live ? (
        <Radio size={11} className="animate-pulse" />
      ) : (
        <RefreshCw size={11} />
      )}
      <span className="font-bold">{label}</span>
      {live && <span className="tnum text-[0.6rem] opacity-70">{secs}s</span>}
    </button>
  );
}
