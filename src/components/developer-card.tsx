"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Terminal, KeyRound, Copy, Check, RefreshCw, Trash2, Download,
  FileJson, FileSpreadsheet, LoaderCircle, Eye, EyeOff,
} from "lucide-react";
import { rotateApiKeyAction, revokeApiKeyAction } from "@/server/actions";

/** Developer corner: personal API key + data export. */
export function DeveloperCard({ apiKey }: { apiKey: string | null }) {
  const router = useRouter();
  const [key, setKey] = useState(apiKey);
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const copy = async (text: string, tag: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      setTimeout(() => setCopied(null), 1600);
    } catch { /* clipboard blocked */ }
  };

  const rotate = () => start(async () => {
    const res = await rotateApiKeyAction();
    setKey(res.key);
    setReveal(true);
    router.refresh();
  });

  const revoke = () => start(async () => {
    await revokeApiKeyAction();
    setKey(null);
    router.refresh();
  });

  const masked = key ? `${key.slice(0, 7)}${"•".repeat(18)}${key.slice(-4)}` : "";
  const curl = key
    ? `curl "${typeof window !== "undefined" ? window.location.origin : ""}/api/v1/me?key=${key}"`
    : "";

  return (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <Terminal size={16} className="text-neon-400" /> Developer corner
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[#8f8cb0]">
            Your focus data belongs to you — pull it into a status bar, a CLI script,
            a README badge or your own dashboard.
          </p>
        </div>
      </div>

      {/* API key */}
      <div className="mt-5 rounded-2xl border border-line bg-white/[0.02] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#8f8cb0]">
            <KeyRound size={13} /> Personal API key
          </span>
          <div className="flex items-center gap-2">
            {key && (
              <button onClick={() => setReveal((v) => !v)} className="btn btn-ghost !px-2.5 !py-1.5 !text-[0.68rem]">
                {reveal ? <EyeOff size={12} /> : <Eye size={12} />}
                {reveal ? "Hide" : "Reveal"}
              </button>
            )}
            <button onClick={rotate} disabled={pending} className="btn btn-ghost !px-2.5 !py-1.5 !text-[0.68rem]">
              {pending ? <LoaderCircle size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              {key ? "Rotate" : "Generate"}
            </button>
            {key && (
              <button onClick={revoke} disabled={pending} className="btn btn-ghost !px-2.5 !py-1.5 !text-[0.68rem] hover:!text-rose-300">
                <Trash2 size={12} /> Revoke
              </button>
            )}
          </div>
        </div>

        {key ? (
          <>
            <button
              onClick={() => copy(key, "key")}
              className="mt-3 flex w-full items-center gap-2 rounded-xl border border-line bg-ink-950/60 px-3 py-2.5 text-left font-mono text-xs text-neon-300 transition hover:border-neon-400/40"
              title="Click to copy"
            >
              <span className="min-w-0 flex-1 truncate">{reveal ? key : masked}</span>
              {copied === "key" ? <Check size={13} className="text-mint-400" /> : <Copy size={13} className="text-[#6d6a8f]" />}
            </button>
            <button
              onClick={() => copy(curl, "curl")}
              className="mt-2 flex w-full items-center gap-2 rounded-xl border border-line bg-ink-950/60 px-3 py-2.5 text-left font-mono text-[0.68rem] text-[#8f8cb0] transition hover:border-white/20"
              title="Copy the curl command"
            >
              <span className="min-w-0 flex-1 truncate">{reveal ? curl : "curl \"…/api/v1/me?key=•••\""}</span>
              {copied === "curl" ? <Check size={13} className="text-mint-400" /> : <Copy size={13} className="text-[#6d6a8f]" />}
            </button>
          </>
        ) : (
          <p className="mt-3 text-xs text-[#6d6a8f]">
            No key yet. Generate one to call <code className="font-mono text-neon-300">/api/v1/me</code> from anywhere.
          </p>
        )}
      </div>

      {/* Export */}
      <div className="mt-4 rounded-2xl border border-line bg-white/[0.02] p-4">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#8f8cb0]">
          <Download size={13} /> Export your focus log
        </span>
        <p className="mt-1.5 text-[0.7rem] text-[#6d6a8f]">
          Every session with its project tag, task and timestamp. Perfect for invoices, timesheets or your own charts.
        </p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          <a href="/api/export?format=csv" className="btn btn-ghost !px-3.5 !py-2 !text-xs">
            <FileSpreadsheet size={13} /> Download CSV
          </a>
          <a href="/api/export?format=json" className="btn btn-ghost !px-3.5 !py-2 !text-xs">
            <FileJson size={13} /> Download JSON
          </a>
        </div>
      </div>

      <p className="mt-4 flex items-center gap-2 text-[0.65rem] text-[#5c5a78]">
        <kbd className="rounded border border-line bg-white/[0.05] px-1.5 py-0.5 font-bold">⌘K</kbd>
        opens the command palette — jump anywhere or control the timer from the keyboard.
      </p>
    </div>
  );
}
