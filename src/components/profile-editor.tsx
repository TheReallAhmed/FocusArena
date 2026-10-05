"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle, BriefcaseBusiness, Camera, CheckCircle2, Code2, Globe2, ImagePlus,
  LoaderCircle, MapPin, Save, Trash2, UserRound,
} from "lucide-react";
import { updateProfileAction, type ProfileState } from "@/server/actions";
import { Avatar } from "@/components/widgets";
import type { User } from "@/db/schema";

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const AVATAR_SIZE = 320;

async function compressAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose a JPG, PNG or WebP image.");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("The original image must be under 10 MB.");

  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = Math.floor((bitmap.width - side) / 2);
  const sy = Math.floor((bitmap.height - side) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not process the photo.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();
  return canvas.toDataURL("image/webp", 0.78);
}

function Field({
  label,
  icon: Icon,
  hint,
  children,
}: {
  label: string;
  icon: typeof UserRound;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8f8cb0]">
        <Icon size={13} /> {label}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-[0.68rem] text-[#5c5a78]">{hint}</span>}
    </label>
  );
}

export function ProfileEditor({ user }: { user: User }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfileAction, {});
  const [avatar, setAvatar] = useState<string | null>(user.avatarUrl);
  const [avatarMode, setAvatarMode] = useState<"keep" | "replace" | "remove">("keep");
  const [imageError, setImageError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [bio, setBio] = useState(user.bio ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  const chooseFile = async (file: File | undefined) => {
    if (!file) return;
    setImageError(null);
    setProcessing(true);
    try {
      const data = await compressAvatar(file);
      setAvatar(data);
      setAvatarMode("replace");
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Could not process this image.");
    } finally {
      setProcessing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeAvatar = () => {
    setAvatar(null);
    setAvatarMode("remove");
    setImageError(null);
  };

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
      <input type="hidden" name="avatarMode" value={avatarMode} />
      <input type="hidden" name="avatarData" value={avatarMode === "replace" ? avatar ?? "" : ""} />

      {/* Photo card */}
      <div className="glass-card relative overflow-hidden p-6">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-60 w-60 rounded-full blur-3xl"
          style={{ background: `hsl(${user.avatarHue} 85% 55% / 0.2)` }}
        />
        <div className="relative flex flex-col items-center text-center">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-brand-300">Profile picture</p>
          <div className="relative mt-6">
            <Avatar name={user.displayName} hue={user.avatarHue} imageUrl={avatar} size={150} ring />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={processing}
              className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink-900 bg-brand-500 text-white shadow-lg transition hover:scale-105 hover:bg-brand-400"
              title="Choose photo"
            >
              {processing ? <LoaderCircle size={17} className="animate-spin" /> : <Camera size={17} />}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void chooseFile(e.target.files?.[0])}
          />

          <h2 className="mt-5 text-lg font-bold text-white">{user.displayName}</h2>
          <p className="text-xs text-[#6d6a8f]">@{user.username}</p>

          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={processing} className="btn btn-primary !px-4 !py-2 text-xs">
              <ImagePlus size={14} /> {avatar ? "Change photo" : "Upload photo"}
            </button>
            {avatar && (
              <button type="button" onClick={removeAvatar} className="btn btn-ghost !px-4 !py-2 text-xs hover:!text-rose-300">
                <Trash2 size={14} /> Remove
              </button>
            )}
          </div>
          <p className="mt-4 max-w-xs text-[0.68rem] leading-relaxed text-[#6d6a8f]">
            JPG, PNG or WebP up to 10 MB. We automatically center-crop and compress it to a fast 320×320 WebP.
          </p>
          {imageError && (
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-left text-xs text-rose-300">
              <AlertCircle size={13} className="mt-0.5 shrink-0" /> {imageError}
            </p>
          )}
        </div>
      </div>

      {/* Fields card */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">Public identity</h2>
            <p className="mt-1 text-xs text-[#8f8cb0]">Everything here appears on your public FocusArena profile.</p>
          </div>
          <Link href={`/u/${user.username}`} className="btn btn-ghost !px-3.5 !py-2 text-xs">
            View profile
          </Link>
        </div>

        <div className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name" icon={UserRound}>
              <input name="displayName" className="input" defaultValue={user.displayName} required minLength={2} maxLength={40} />
            </Field>
            <Field label="Location" icon={MapPin} hint="City, country or “Remote” — optional">
              <input name="location" className="input" defaultValue={user.location ?? ""} placeholder="Amman, Jordan" maxLength={80} />
            </Field>
          </div>

          <Field label="About you" icon={UserRound} hint={`${bio.length}/280 characters`}>
            <textarea
              name="bio"
              className="input min-h-28 resize-y leading-relaxed"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 280))}
              placeholder="What are you building, studying or chasing?"
              maxLength={280}
            />
          </Field>

          <div className="border-t border-line pt-5">
            <h3 className="text-sm font-bold text-white">Links</h3>
            <p className="mt-1 text-xs text-[#6d6a8f]">Build your identity beyond the leaderboard.</p>
            <div className="mt-4 space-y-4">
              <Field label="LinkedIn" icon={BriefcaseBusiness}>
                <input name="linkedInUrl" className="input" defaultValue={user.linkedInUrl ?? ""} placeholder="linkedin.com/in/your-name" inputMode="url" />
              </Field>
              <Field label="GitHub" icon={Code2}>
                <input name="githubUrl" className="input" defaultValue={user.githubUrl ?? ""} placeholder="github.com/your-handle" inputMode="url" />
              </Field>
              <Field label="Website / portfolio" icon={Globe2}>
                <input name="websiteUrl" className="input" defaultValue={user.websiteUrl ?? ""} placeholder="yourname.dev" inputMode="url" />
              </Field>
            </div>
          </div>
        </div>

        {(state.error || state.success) && (
          <div className={`mt-5 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
            state.error
              ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
              : "border-mint-400/30 bg-mint-400/10 text-mint-400"
          }`}>
            {state.error ? <AlertCircle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
            {state.error ?? state.success}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <p className="text-[0.68rem] text-[#5c5a78]">Username @{user.username} is permanent to keep profile links stable.</p>
          <button type="submit" disabled={pending || processing} className="btn btn-primary !px-6 !py-3">
            {pending ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
            {pending ? "Saving profile..." : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}
