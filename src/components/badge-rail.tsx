import Link from "next/link";
import { Medal } from "lucide-react";
import { BadgeIcon } from "@/components/widgets";
import { badgeByKey, BADGES } from "@/lib/xp";

/** Compact row of earned badge icons — used on leaderboard rows and cards. */
export function BadgeRail({
  keys,
  total,
  max = 5,
  size = 22,
  href,
}: {
  keys: string[];
  total: number;
  max?: number;
  size?: number;
  href?: string;
}) {
  const defs = keys.map(badgeByKey).filter((b): b is NonNullable<typeof b> => Boolean(b)).slice(0, max);
  const extra = total - defs.length;

  const body = (
    <span className="flex items-center gap-1">
      {defs.length === 0 ? (
        <span className="chip !px-1.5 !py-0 !text-[0.6rem] !text-[#5c5a78]">
          <Medal size={9} /> 0/{BADGES.length}
        </span>
      ) : (
        <>
          {defs.map((b) => (
            <BadgeIcon key={b.key} badge={b} size={size} />
          ))}
          {extra > 0 && (
            <span
              className="flex items-center justify-center rounded-lg border border-line bg-white/[0.04] text-[0.6rem] font-bold text-[#a5a2c8]"
              style={{ width: size, height: size }}
              title={`${total} badges earned in total`}
            >
              +{extra}
            </span>
          )}
        </>
      )}
    </span>
  );

  if (!href) return body;
  return (
    <Link href={href} title={`${total} of ${BADGES.length} badges unlocked`}>
      {body}
    </Link>
  );
}
