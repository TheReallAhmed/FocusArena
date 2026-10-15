export type PerkCategory = "title" | "frame";

/** One authoritative catalog; server actions re-check the key and price here. */
export const PERK_CATALOG = [
  { key: "focus-beast", name: "Focus Beast", category: "title", price: 350, description: "A title for the arena regulars." },
  { key: "deep-work-master", name: "Deep Work Master", category: "title", price: 700, description: "A mark of patient, sustained work." },
  { key: "arena-veteran", name: "Arena Veteran", category: "title", price: 1100, description: "A profile title earned with XP." },
  { key: "aurora-frame", name: "Aurora Frame", category: "frame", price: 300, description: "A cool-toned accent around your avatar." },
  { key: "neon-frame", name: "Neon Frame", category: "frame", price: 650, description: "A bright arena-style profile border." },
  { key: "gold-frame", name: "Gold Frame", category: "frame", price: 1000, description: "A warm decorative profile border." },
] as const satisfies readonly { key: string; name: string; category: PerkCategory; price: number; description: string }[];

export function perkByKey(key: string) {
  return PERK_CATALOG.find((perk) => perk.key === key);
}
