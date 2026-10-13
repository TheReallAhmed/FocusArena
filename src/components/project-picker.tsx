"use client";

import { useState } from "react";
import { FolderGit2, Check, X } from "lucide-react";
import { useTimer } from "@/components/timer-provider";

/**
 * Lightweight project tagger — type a name or pick a recent one.
 * Every banked session stores the tag so you can answer
 * "where did my week actually go?".
 */
export function ProjectPicker({ recent, accent = "#7c6cff" }: { recent: string[]; accent?: string }) {
  const { project, setProject } = useTimer();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project ?? "");

  const save = () => {
    setProject(draft.trim() || null);
    setEditing(false);
  };

  return (
    <div className="glass-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <FolderGit2 size={15} style={{ color: accent }} /> Project tag
        </h2>
        {project && (
          <button onClick={() => setProject(null)} className="text-[#6d6a8f] transition hover:text-rose-300" title="Clear">
            <X size={14} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex gap-2">
          <input
            autoFocus
            className="input !py-2 text-sm"
            placeholder="e.g. focusarena-api"
            value={draft}
            maxLength={40}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <button onClick={save} className="btn btn-primary shrink-0 !px-3 !py-2">
            <Check size={15} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setDraft(project ?? ""); setEditing(true); }}
          className="flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm transition"
          style={{
            borderColor: project ? `${accent}55` : "rgba(255,255,255,0.08)",
            background: project ? `${accent}14` : "rgba(255,255,255,0.02)",
            color: project ? "#fff" : "#8f8cb0",
          }}
        >
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: project ? accent : "#4a4866" }} />
          <span className="min-w-0 flex-1 truncate font-mono">{project ?? "no project — click to tag"}</span>
        </button>
      )}

      {recent.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {recent.slice(0, 6).map((r) => (
            <button
              key={r}
              onClick={() => setProject(r === project ? null : r)}
              className={`chip !px-2 !py-0.5 font-mono !text-[0.65rem] transition ${
                r === project ? "!border-brand-500/50 !bg-brand-500/15 !text-white" : "hover:!text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}
      <p className="mt-3 text-[0.65rem] leading-relaxed text-[#5c5a78]">
        Tagged minutes show up in your project breakdown, the export file and the personal API.
      </p>
    </div>
  );
}
