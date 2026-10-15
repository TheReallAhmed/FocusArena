"use client";

import { AlertTriangle, RotateCw } from "lucide-react";

export default function DistractionAnalyticsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section role="alert" className="glass-card mx-auto max-w-xl p-6 text-center">
      <AlertTriangle size={24} className="mx-auto text-rose-300" />
      <h1 className="mt-3 text-lg font-bold text-white">Analytics could not be loaded</h1>
      <p className="mt-1 text-sm text-[#8f8cb0]">Your saved sessions are unchanged. Retry in a moment.</p>
      <button type="button" onClick={reset} className="btn btn-ghost mt-4"><RotateCw size={14} /> Try again</button>
    </section>
  );
}
