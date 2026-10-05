"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, LoaderCircle } from "lucide-react";
import { loginAction, registerAction, type FormState } from "@/server/actions";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  return (
    <div>
      <div className="lg:hidden">
        <Link href="/" className="mb-10 inline-flex text-lg font-bold text-white">
          Focus<span className="text-gradient">Arena</span>
        </Link>
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-white">
        {mode === "login" ? "Back in the arena" : "Claim your handle"}
      </h1>
      <p className="mt-2 text-sm text-[#8f8cb0]">
        {mode === "login"
          ? "Pick up your streak where you left it."
          : "Twenty seconds. No email. Straight to the board."}
      </p>

      <form action={formAction} className="mt-8 space-y-4">
        <div>
          <label htmlFor="username" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[#8f8cb0]">
            Username
          </label>
          <input
            id="username"
            name="username"
            className="input font-mono"
            placeholder={mode === "login" ? "your_handle" : "e.g. faisal_x"}
            autoComplete="username"
            required
            minLength={3}
            maxLength={20}
          />
        </div>

        {mode === "register" && (
          <div>
            <label htmlFor="displayName" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[#8f8cb0]">
              Display name
            </label>
            <input
              id="displayName"
              name="displayName"
              className="input"
              placeholder="What friends call you"
              autoComplete="nickname"
              required
              minLength={2}
              maxLength={40}
            />
          </div>
        )}

        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[#8f8cb0]">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            placeholder="••••••••"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={6}
          />
        </div>

        {state.error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {state.error}
          </div>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary w-full !py-3 !text-[0.95rem]">
          {pending ? (
            <>
              <LoaderCircle size={17} className="animate-spin" />
              {mode === "login" ? "Checking..." : "Creating..."}
            </>
          ) : (
            <>
              {mode === "login" ? "Log in" : "Create account"}
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#8f8cb0]">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href="/register" className="font-semibold text-brand-300 hover:text-brand-200">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have one?{" "}
            <Link href="/login" className="font-semibold text-brand-300 hover:text-brand-200">
              Log in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
