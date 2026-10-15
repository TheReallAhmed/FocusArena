"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, Coins, Crown, Frame, LoaderCircle, ShoppingBag, Sparkles } from "lucide-react";
import { PERK_CATALOG } from "@/lib/perks";
import { equipPerkAction, purchasePerkAction } from "@/server/actions";

export function PerksStore({ xpBalance, ownedKeys, equippedTitle, equippedFrame }: {
  xpBalance: number;
  ownedKeys: string[];
  equippedTitle: string | null;
  equippedFrame: string | null;
}) {
  const router = useRouter();
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const owned = new Set(ownedKeys);

  const buy = (key: string) => {
    setBusyKey(key);
    startTransition(async () => {
      try {
        const result = await purchasePerkAction(key);
        setMessage("error" in result ? result.error ?? "Purchase could not be completed." : result.alreadyOwned ? "You already own this cosmetic." : "Purchase complete. XP was deducted from your spendable balance.");
        setConfirmKey(null);
        router.refresh();
      } catch { setMessage("Could not reach the server. No purchase confirmation was received."); }
      finally { setBusyKey(null); }
    });
  };

  const equip = (key: string) => {
    setBusyKey(key);
    startTransition(async () => {
      try {
        const result = await equipPerkAction(key);
        setMessage("error" in result ? result.error ?? "Could not equip this cosmetic." : "Cosmetic equipped on your profile.");
        router.refresh();
      } catch { setMessage("Could not reach the server. The cosmetic was not equipped."); }
      finally { setBusyKey(null); }
    });
  };

  return (
    <section className="glass-card p-6" aria-labelledby="perks-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-300"><ShoppingBag size={14} /> Progression</p>
          <h2 id="perks-title" className="mt-1 text-lg font-bold text-white">XP Perks Store</h2>
          <p className="mt-1 text-xs text-[#8f8cb0]">Spend XP on cosmetic titles and frames. Purchases never reduce earned levels or badges.</p>
        </div>
        <span className="chip !border-gold-400/35 !bg-gold-400/10 !text-gold-300"><Coins size={13} /> {xpBalance.toLocaleString()} XP available</span>
      </div>

      {message && <p role="status" className="mt-4 rounded-xl border border-brand-500/25 bg-brand-500/8 px-3 py-2 text-sm text-[#c7c4de]">{message}</p>}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PERK_CATALOG.map((perk) => {
          const hasIt = owned.has(perk.key);
          const equipped = perk.category === "title" ? equippedTitle === perk.key : equippedFrame === perk.key;
          return (
            <article key={perk.key} className="rounded-2xl border border-line bg-white/[0.025] p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/12 text-brand-300">{perk.category === "title" ? <Crown size={17} /> : <Frame size={17} />}</span>
                <span className="chip !px-2 !py-1 !text-[0.62rem]">{perk.category === "title" ? "Title" : "Frame"}</span>
              </div>
              <h3 className="mt-3 text-sm font-bold text-white">{perk.name}</h3>
              <p className="mt-1 min-h-9 text-xs leading-relaxed text-[#6d6a8f]">{perk.description}</p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="tnum flex items-center gap-1 text-xs font-bold text-gold-300"><Sparkles size={12} /> {perk.price.toLocaleString()} XP</span>
                {equipped ? <span className="chip !border-mint-400/30 !bg-mint-400/10 !text-mint-300"><Check size={12} /> Equipped</span>
                  : hasIt ? <button type="button" disabled={busy} onClick={() => equip(perk.key)} className="btn btn-ghost !px-3 !py-1.5 !text-xs">{busy && busyKey === perk.key ? <LoaderCircle size={13} className="animate-spin" /> : "Equip"}</button>
                  : confirmKey === perk.key ? <span className="flex items-center gap-1"><button type="button" disabled={busy} onClick={() => buy(perk.key)} className="btn btn-primary !px-2.5 !py-1.5 !text-[0.68rem]">{busy && busyKey === perk.key ? <LoaderCircle size={13} className="animate-spin" /> : "Confirm"}</button><button type="button" disabled={busy} onClick={() => setConfirmKey(null)} className="btn btn-ghost !px-2 !py-1.5 !text-[0.68rem]">Cancel</button></span>
                  : <button type="button" disabled={busy || xpBalance < perk.price} onClick={() => { setMessage(null); setConfirmKey(perk.key); }} className="btn btn-ghost !px-3 !py-1.5 !text-xs">{xpBalance >= perk.price ? "Buy" : "Not enough XP"}</button>}
              </div>
              {confirmKey === perk.key && <p className="mt-3 text-[0.68rem] text-gold-300">Confirm spending {perk.price} XP? This purchase is one-time.</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
