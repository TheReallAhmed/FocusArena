import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { ProfileEditor } from "@/components/profile-editor";

export const metadata: Metadata = { title: "Edit profile" };
export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-5">
      <div>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-brand-300">
          <Sparkles size={13} /> Profile Studio
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Make it <span className="text-gradient">yours</span>
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[#8f8cb0]">
          Add a face, a story and the places people can find your work. Your profile is your identity across the arena.
        </p>
      </div>
      <ProfileEditor user={user} />
    </div>
  );
}
