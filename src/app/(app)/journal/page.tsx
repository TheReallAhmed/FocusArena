import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Circle, Clock3, Flame, Search, Sparkles } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { fmtMinutes } from "@/lib/dates";
import { isValidTimeZone, localDayInTimeZone } from "@/lib/time-zones";
import { JournalEditor, JournalTimezoneSync } from "@/components/journal-controls";
import { getJournalPageData } from "@/server/journal";
import { normalizeLocale, t } from "@/lib/i18n";

export const metadata: Metadata = { title: "Deep Work Journal" };
export const dynamic = "force-dynamic";

function validDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function localToday(timeZone: string) {
  return localDayInTimeZone(new Date(), timeZone);
}
function validTimeZone(value: string | undefined): value is string {
  return typeof value === "string" && isValidTimeZone(value);
}
function monthShift(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ date?: string; month?: string; tz?: string; q?: string; page?: string; from?: string; to?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const locale = normalizeLocale(user.locale);
  const text = (key: string) => t(locale, key);
  const params = await searchParams;
  const timeZone = validTimeZone(params.tz) ? params.tz : "UTC";
  const today = localToday(timeZone);
  const localDay = validDate(params.date) && params.date <= today ? params.date : today;
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) && Number(params.month.slice(5)) >= 1 && Number(params.month.slice(5)) <= 12 ? params.month : localDay.slice(0, 7);
  const fromDay = validDate(params.from) ? params.from : "";
  const toDay = validDate(params.to) ? params.to : "";
  const data = await getJournalPageData({ localDay, month, timeZone, search: params.q ?? "", page: Number(params.page ?? 1), fromDay, toDay });
  const [year, monthNumber] = month.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const mondayOffset = (monthStart.getUTCDay() + 6) % 7;
  const monthLabel = monthStart.toLocaleString(locale === "ar" ? "ar" : "en", { month: "long", year: "numeric", timeZone: "UTC" });
  const previousMonth = monthShift(month, -1);
  const nextMonth = monthShift(month, 1);
  const monthEntries = new Map(data.monthEntries.map((entry) => [entry.localDay, entry]));
  const makeHref = (date: string, monthValue = month, page = 1) => {
    const query = new URLSearchParams({ date, month: monthValue, tz: timeZone });
    if (data.query) query.set("q", data.query);
    if (data.fromDay) query.set("from", data.fromDay);
    if (data.toDay) query.set("to", data.toDay);
    if (page > 1) query.set("page", String(page));
    return `/journal?${query.toString()}`;
  };

  return (
    <div className="space-y-5">
      <JournalTimezoneSync timeZone={timeZone} />
      <header><p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-300">{locale === "ar" ? "تأمل وتطوّر" : "Reflect & improve"}</p><h1 className="mt-1.5 flex items-center gap-3 text-2xl font-bold tracking-tight text-white sm:text-3xl"><BookOpen className="text-brand-300" /> {text("journal.title")}</h1><p className="mt-1.5 text-sm text-[#8f8cb0]">{text("journal.subtitle")}</p></header>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: text("journal.completed"), value: String(data.totalEntries), icon: CheckCircle2 },
          { label: text("journal.currentStreak"), value: `${data.streak.current} ${text(data.streak.current === 1 ? "common.day" : "common.days")}`, icon: Flame },
          { label: text("journal.longestStreak"), value: `${data.streak.longest} ${text(data.streak.longest === 1 ? "common.day" : "common.days")}`, icon: Sparkles },
        ].map((item) => <div key={item.label} className="glass-card p-4"><div className="flex items-center justify-between text-[#8f8cb0]"><span className="text-xs">{item.label}</span><item.icon size={15} className="text-brand-300" /></div><p className="tnum mt-2 text-2xl font-bold text-white">{item.value}</p></div>)}
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="glass-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2"><Link href={makeHref(`${previousMonth}-01`, previousMonth, 1)} aria-label="Previous month" className="btn btn-ghost !rounded-full !p-2"><ArrowLeft size={15} /></Link><h2 className="text-sm font-bold text-white">{monthLabel}</h2>{nextMonth <= today.slice(0, 7) ? <Link href={makeHref(`${nextMonth}-01`, nextMonth, 1)} aria-label="Next month" className="btn btn-ghost !rounded-full !p-2"><ArrowRight size={15} /></Link> : <span className="btn btn-ghost pointer-events-none !rounded-full !p-2 opacity-30"><ArrowRight size={15} /></span>}</div>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[0.62rem] font-semibold uppercase text-[#6d6a8f]">{(locale === "ar" ? ["اثن", "ثلا", "أرب", "خمي", "جمع", "سبت", "أحد"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]).map((day) => <span key={day} className="py-1">{day}</span>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1">{Array.from({ length: mondayOffset }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: daysInMonth }, (_, index) => {
            const date = `${month}-${String(index + 1).padStart(2, "0")}`;
            const entry = monthEntries.get(date);
            const selected = date === localDay;
            const future = date > today;
            return future ? <span key={date} className="relative flex aspect-square items-center justify-center rounded-xl text-xs text-[#48465f]">{index + 1}</span> : <Link key={date} href={makeHref(date)} title={entry?.completedAt ? (locale === "ar" ? "تأمل مكتمل" : "Completed reflection") : entry ? (locale === "ar" ? "مسودة محفوظة" : "Draft saved") : (locale === "ar" ? "لا توجد تدوينة" : "No entry")} className={`relative flex aspect-square items-center justify-center rounded-xl border text-xs transition ${selected ? "border-brand-400/60 bg-brand-500/20 font-bold text-white" : "border-transparent text-[#c7c4de] hover:border-line hover:bg-white/[0.04]"}`}>
              {index + 1}{entry?.completedAt ? <CheckCircle2 size={9} className="absolute bottom-1 text-mint-400" /> : entry ? <Circle size={7} className="absolute bottom-1 text-gold-400" /> : null}
            </Link>;
          })}</div>
          <div className="mt-3 flex flex-wrap gap-3 text-[0.65rem] text-[#6d6a8f]"><span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-mint-400" /> {text("journal.completedState")}</span><span className="flex items-center gap-1"><Circle size={9} className="text-gold-400" /> {text("journal.draft")}</span><span className="ms-auto">{timeZone}</span></div>
          <div className="mt-4 rounded-xl border border-line bg-white/[0.02] p-3"><p className="text-xs font-semibold text-white">{text("journal.focusActivity")} {localDay}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-[#8f8cb0]"><Clock3 size={12} className="text-brand-300" />{fmtMinutes(data.dayFocusMinutes, locale)} · {data.dayFocusSessions} {locale === "ar" ? "جلسة مسجلة" : "recorded sessions"}</p>{data.dayAverageQuality !== null && <p className="mt-1 text-[0.68rem] text-[#6d6a8f]">{data.dayAverageQuality}% {locale === "ar" ? "متوسط جودة التركيز المسجلة (تقدير ذاتي)" : "average logged focus quality (self-reported proxy)"}</p>}</div>
        </section>

        <JournalEditor userId={user.id} localDay={localDay} timeZone={timeZone} initial={{ wentWell: data.selected?.wentWell ?? "", blockers: data.selected?.blockers ?? "", tomorrowPriority: data.selected?.tomorrowPriority ?? "" }} />
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-5"><h2 className="text-sm font-bold text-white">{text("journal.blockers")}</h2><p className="mt-1 text-xs text-[#6d6a8f]">{locale === "ar" ? "تكرار العوائق في يومياتك الخاصة — ملخص للأنماط وليس تشخيصًا." : "Repeated entries from your private journal. This is a pattern summary, not a diagnosis."}</p>{data.blockers.length === 0 ? <p className="mt-4 text-sm text-[#6d6a8f]">{locale === "ar" ? "لا توجد عوائق متكررة بعد." : "No recurring blocker text yet."}</p> : <ul className="mt-4 space-y-3">{data.blockers.map((item, index) => <li key={`${item.text}-${index}`} className="flex items-start justify-between gap-3 border-b border-line/70 pb-2 last:border-0"><span className="line-clamp-2 text-xs text-[#c7c4de]">{item.text}</span><span className="chip shrink-0 !text-[0.62rem]">{item.total}×</span></li>)}</ul>}</div>
        <div className="glass-card p-5"><h2 className="text-sm font-bold text-white">{text("journal.priorities")}</h2><p className="mt-1 text-xs text-[#6d6a8f]">{locale === "ar" ? "الأولويات التي كتبتها أكثر من غيرها، من إدخالاتك المحفوظة." : "Priorities you have written most often. All values come from your saved entries."}</p>{data.priorities.length === 0 ? <p className="mt-4 text-sm text-[#6d6a8f]">{locale === "ar" ? "لا توجد أولويات محفوظة بعد." : "No saved priorities yet."}</p> : <ul className="mt-4 space-y-3">{data.priorities.map((item, index) => <li key={`${item.text}-${index}`} className="flex items-start justify-between gap-3 border-b border-line/70 pb-2 last:border-0"><span className="line-clamp-2 text-xs text-[#c7c4de]">{item.text}</span><span className="chip shrink-0 !text-[0.62rem]">{item.total}×</span></li>)}</ul>}</div>

        <div className="glass-card overflow-hidden">
          <div className="border-b border-line p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-white">{text("journal.history")}</h2><p className="mt-1 text-xs text-[#6d6a8f]">{data.historyMatches} · {data.totalEntries} {locale === "ar" ? "إجمالي الإدخالات المكتملة" : "completed overall"} · {locale === "ar" ? "صفحة" : "page"} {data.currentPage} {locale === "ar" ? "من" : "of"} {data.totalPages}</p></div><form action="/journal" method="get" className="grid w-full gap-2 sm:w-auto sm:grid-cols-[1.4fr_1fr_1fr_auto]"><input type="hidden" name="tz" value={timeZone} /><input type="hidden" name="date" value={localDay} /><input type="hidden" name="month" value={month} /><input name="q" defaultValue={data.query} className="input min-w-0 !py-2 text-xs" placeholder={text("journal.search")} /><input name="from" type="date" defaultValue={data.fromDay} aria-label={locale === "ar" ? "من تاريخ" : "From date"} className="input !py-2 text-xs" /><input name="to" type="date" defaultValue={data.toDay} aria-label={locale === "ar" ? "إلى تاريخ" : "To date"} className="input !py-2 text-xs" /><button className="btn btn-ghost !px-3 !py-2" aria-label={text("common.search")}><Search size={14} /></button></form></div></div>
          {data.invalidRange && <p role="alert" className="border-b border-line px-5 py-3 text-xs text-rose-300">{locale === "ar" ? "يجب أن يكون تاريخ البداية قبل تاريخ النهاية أو مساويًا له." : "The start date must be on or before the end date."}</p>}
          {data.history.length === 0 ? <p className="p-5 text-sm text-[#8f8cb0]">{text("journal.noEntries")}</p> : data.history.map((entry) => <Link key={entry.id} href={makeHref(entry.localDay)} className="block border-b border-line/70 px-5 py-3.5 last:border-0 hover:bg-white/[0.025]"><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-white">{entry.localDay}</p><span className={`text-[0.62rem] ${entry.completedAt ? "text-mint-400" : "text-gold-400"}`}>{entry.completedAt ? text("journal.completedState") : text("journal.draft")}</span></div><p className="mt-1 line-clamp-1 text-xs text-[#8f8cb0]">{entry.wentWell || entry.blockers || entry.tomorrowPriority || (locale === "ar" ? "إدخال فارغ" : "Empty entry")}</p></Link>)}
          <div className="flex items-center justify-between border-t border-line p-4 text-xs"><Link aria-disabled={data.currentPage <= 1} href={makeHref(localDay, month, Math.max(1, data.currentPage - 1))} className={data.currentPage <= 1 ? "pointer-events-none text-[#4a4866]" : "text-brand-300 hover:text-white"}>{text("journal.previous")}</Link><Link aria-disabled={data.currentPage >= data.totalPages} href={makeHref(localDay, month, Math.min(data.totalPages, data.currentPage + 1))} className={data.currentPage >= data.totalPages ? "pointer-events-none text-[#4a4866]" : "text-brand-300 hover:text-white"}>{text("journal.next")}</Link></div>
        </div>
      </section>
      <p className="text-center text-[0.68rem] text-[#6d6a8f]">{locale === "ar" ? "إدخالاتك خاصة بحسابك. يُقارن وقت التركيز بحسب اليوم المحلي المحفوظ؛ وهذا وصف للبيانات وليس دليلًا على أن التأمل سبب تحسن الأداء." : "Your entries are private to your account. Focus time is correlated by the entry’s saved local calendar day; this is descriptive only, not proof that a reflection caused a change in performance."}</p>
    </div>
  );
}
