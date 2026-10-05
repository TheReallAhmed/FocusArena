"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, Copy, LogOut } from "lucide-react";
import { logoutAction } from "@/server/actions";

/* Scroll-reveal wrapper */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setTimeout(() => el.classList.add("reveal-visible"), delay);
            io.disconnect();
          }
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}

export function CopyButton({ text, label = "Copy code" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost !px-3.5 !py-2 text-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      {copied ? <Check size={14} className="text-mint-400" /> : <Copy size={14} />}
      {copied ? "Copied!" : label}
    </button>
  );
}

export function LogoutButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => logoutAction())}
      className="nav-link w-full text-left !text-[#8f8cb0] hover:!text-rose-300"
      title="Log out"
    >
      <LogOut size={17} />
      <span>{pending ? "Leaving..." : "Log out"}</span>
    </button>
  );
}

export function RefreshButton() {
  const router = useRouter();
  return (
    <button type="button" className="chip hover:text-white" onClick={() => router.refresh()}>
      Refresh
    </button>
  );
}
