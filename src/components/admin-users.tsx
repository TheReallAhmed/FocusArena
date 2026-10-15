"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldOff, Trash2, LoaderCircle, Flame } from "lucide-react";
import { setUserRoleAction, deleteUserAction } from "@/server/actions";
import { Avatar, AdminChip, LevelChip } from "@/components/widgets";
import { levelFromXp } from "@/lib/xp";
import { fmtMinutes } from "@/lib/dates";
import { useLocale } from "@/components/locale-provider";

type Row = {
  id: number;
  username: string;
  displayName: string;
  role: string;
  avatarHue: number;
  avatarUrl: string | null;
  xp: number;
  streak: number;
  createdAt: Date;
  sessions: number;
  badges: number;
};

export function AdminUsersTable({ users, meId }: { users: Row[]; meId: number }) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [pending, start] = useTransition();

  const toggleRole = (id: number, role: string) => {
    start(async () => {
      await setUserRoleAction(id, role === "admin" ? "member" : "admin");
      router.refresh();
    });
  };

  const removeUser = (id: number, name: string) => {
    if (!window.confirm(t("admin.deleteConfirm", { name }))) return;
    start(async () => {
      await deleteUserAction(id);
      router.refresh();
    });
  };

  return (
    <div className="divide-y divide-line">
      {users.map((u) => (
        <div key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
          <Avatar name={u.displayName} hue={u.avatarHue} size={36} />
          <div className="min-w-0 flex-1 basis-40">
            <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-white">
              <Link href={`/u/${u.username}`} className="truncate hover:text-brand-300">
                {u.displayName}
              </Link>
              {u.role === "admin" && <AdminChip small locale={locale} />}
              {u.id === meId && <span className="text-[0.65rem] text-brand-300">{t("common.you")}</span>}
            </p>
            <p className="text-[0.65rem] text-[#6d6a8f]">
              @{u.username} · {t("common.joined")} {new Date(u.createdAt).toLocaleDateString(locale === "ar" ? "ar" : "en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
            </p>
          </div>
          <div className="hidden items-center gap-1.5 md:flex">
            <LevelChip level={levelFromXp(u.xp)} small locale={locale} />
            {u.streak > 0 && (
              <span className="chip !px-1.5 !py-0 !text-[0.62rem] !font-bold text-gold-400">
                <Flame size={10} /> {u.streak}
              </span>
            )}
          </div>
          <span className="tnum hidden w-20 text-right text-xs text-[#8f8cb0] lg:block">
            {fmtMinutes(u.xp, locale)}
          </span>
          <span className="tnum hidden w-16 text-right text-xs text-[#8f8cb0] sm:block">
            {u.sessions} {t("common.sessionsShort")}
          </span>
          <span className="tnum hidden w-14 text-right text-xs text-[#8f8cb0] sm:block">
            {u.badges} 🏅
          </span>
          <div className="flex items-center gap-2">
            {pending ? (
              <LoaderCircle size={15} className="animate-spin text-[#6d6a8f]" />
            ) : u.id !== meId && (
              <>
                <button
                  onClick={() => toggleRole(u.id, u.role)}
                  className={`btn btn-ghost !px-3 !py-1.5 !text-[0.68rem] ${
                    u.role === "admin" ? "hover:!text-rose-300" : "hover:!text-gold-400"
                  }`}
                  title={t(u.role === "admin" ? "admin.removeAdmin" : "admin.makeAdmin")}
                >
                  {u.role === "admin" ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                  {t(u.role === "admin" ? "admin.demote" : "admin.makeAdmin")}
                </button>
                <button
                  onClick={() => removeUser(u.id, u.displayName)}
                  className="btn btn-ghost !rounded-lg !p-1.5 hover:!text-rose-400"
                  title={t("admin.deleteUser")}
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
