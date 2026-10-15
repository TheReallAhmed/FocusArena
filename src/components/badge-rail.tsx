import Link from "next/link";
import { Medal } from "lucide-react";
import { BadgeIcon } from "@/components/widgets";
import { BADGES, TIER_META, sortByRarity, type BadgeDef } from "@/lib/xp";
import { localizeBadge, localizeTier } from "@/lib/badge-i18n";
import type { Locale } from "@/lib/i18n";

/** Icon + NAME pill — the readable badge chip used across the app. */
export function BadgeChip({
  badge,
  size = 20,
  showTier = false,
  locale = "en",
}: {
  badge: BadgeDef;
  size?: number;
  showTier?: boolean;
  locale?: Locale;
}) {
  const localized = localizeBadge(badge, locale);
  const tier = TIER_META[badge.tier];
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5"
      style={{
        borderColor: tier.ring,
        background: `linear-gradient(100deg, hsl(${badge.hue} 85% 60% / 0.16), rgba(255,255,255,0.03))`,
        boxShadow: `0 0 14px -6px ${tier.glow}`,
      }}
      title={`${localized.name} — ${localized.desc} (${localizeTier(badge.tier, locale)})`}
    >
      <BadgeIcon badge={badge} size={size} />
      <span className="flex min-w-0 flex-col leading-none">
        <span className="truncate text-[0.68rem] font-bold text-white">{localized.name}</span>
        {showTier && (
            <span className="mt-0.5 text-[0.55rem] font-bold uppercase tracking-wider" style={{ color: tier.text }}>
            {localizeTier(badge.tier, locale)}
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * Row of earned badges WITH their names — rarest first.
 * Falls back to a muted counter when the player has none yet.
 */
export function BadgeRail({
  keys,
  total,
  max = 3,
  size = 20,
  href,
  showTier = false,
  locale = "en",
}: {
  keys: string[];
  total: number;
  max?: number;
  size?: number;
  href?: string;
  showTier?: boolean;
  locale?: Locale;
}) {
  const defs = sortByRarity(keys).slice(0, max);
  const extra = total - defs.length;

  const body = (
    <span className="flex flex-wrap items-center gap-1.5">
      {defs.length === 0 ? (
        <span className="chip !px-2 !py-0.5 !text-[0.6rem] !text-[#5c5a78]">
          <Medal size={9} /> {locale === "ar" ? "لا توجد شارات بعد" : "No badges yet"}
        </span>
      ) : (
        <>
          {defs.map((b) => (
            <BadgeChip key={b.key} badge={b} size={size} showTier={showTier} locale={locale} />
          ))}
          {extra > 0 && (
            <span
              className="rounded-full border border-line bg-white/[0.04] px-2 py-1 text-[0.62rem] font-bold text-[#a5a2c8]"
              title={locale === "ar" ? `تم فتح ${total} من أصل ${BADGES.length} شارة` : `${total} of ${BADGES.length} badges unlocked`}
            >
              {locale === "ar" ? `+${extra} أخرى` : `+${extra} more`}
            </span>
          )}
        </>
      )}
    </span>
  );

  if (!href) return body;
  return (
    <Link href={href} className="transition hover:opacity-90">
      {body}
    </Link>
  );
}
