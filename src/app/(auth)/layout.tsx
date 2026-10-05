import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Flame, Quote } from "lucide-react";
import { Logo } from "@/components/brand";
import { getSessionUser } from "@/lib/auth";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="relative grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-ink-900 p-10 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 mask-fade-b" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-[420px] w-[420px] rounded-full bg-brand-600/25 blur-[130px]" />
        <div className="pointer-events-none absolute -top-24 right-0 h-[320px] w-[320px] rounded-full bg-neon-500/12 blur-[110px]" />
        <div className="pointer-events-none absolute inset-0 bg-noise opacity-[0.05]" />

        <Link href="/" className="relative"><Logo size={36} /></Link>

        <div className="relative space-y-8">
          <h2 className="max-w-md text-4xl font-bold leading-[1.08] tracking-tight text-white">
            Deep work
            <br />
            is a <span className="text-gradient">sport.</span>
          </h2>
          <div className="glass-card max-w-md p-5">
            <Quote size={16} className="text-brand-300" />
            <p className="mt-2.5 text-sm leading-relaxed text-[#c7c4de]">
              &ldquo;Concentrate all your thoughts upon the work in hand. The sun&rsquo;s rays do not
              burn until brought to a focus.&rdquo;
            </p>
            <p className="mt-2 text-xs font-medium text-[#6d6a8f]">— Alexander Graham Bell</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-[#8f8cb0]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-400/12 text-gold-400">
              <Flame size={17} />
            </span>
            <span>Join the crew. Sprint. Climb the board.</span>
          </div>
        </div>

        <p className="relative text-xs text-[#5c5a78]">Free forever · No email required · No ads</p>
      </div>

      {/* Form panel */}
      <div className="relative flex items-center justify-center px-5 py-14">
        <div className="pointer-events-none absolute inset-0 bg-noise opacity-[0.04] lg:hidden" />
        <div className="w-full max-w-md animate-fade-up">{children}</div>
      </div>
    </div>
  );
}
