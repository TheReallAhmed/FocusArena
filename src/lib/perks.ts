export type PerkCategory = "title" | "frame" | "logo" | "color" | "icon";

export type PerkDefinition = {
  key: string;
  name: string;
  category: PerkCategory;
  price: number;
  description: string;
  color?: string;
  symbol?: string;
};

/** Authoritative catalog shared by UI and server-side purchase validation. */
export const PERK_CATALOG: readonly PerkDefinition[] = [
  { key: "focus-beast", name: "Focus Beast", category: "title", price: 250, description: "For the ones who tame the task list.", symbol: "flame" },
  { key: "deep-work-master", name: "Deep Work Master", category: "title", price: 500, description: "A mark of patient, sustained work.", symbol: "brain" },
  { key: "arena-veteran", name: "Arena Veteran", category: "title", price: 750, description: "You have earned your place in the arena.", symbol: "medal" },
  { key: "night-owl", name: "Night Owl", category: "title", price: 900, description: "Quiet hours. Legendary output.", symbol: "moon" },
  { key: "task-alchemist", name: "Task Alchemist", category: "title", price: 1100, description: "Turning plans into finished work.", symbol: "sparkles" },
  { key: "flow-state", name: "Flow State", category: "title", price: 1350, description: "A rare calm in a noisy world.", symbol: "waves" },
  { key: "zero-noise", name: "Zero Noise", category: "title", price: 1650, description: "Distractions do not stand a chance.", symbol: "shield" },
  { key: "legendary-focus", name: "Legendary Focus", category: "title", price: 2200, description: "The arena knows your name.", symbol: "crown" },

  { key: "aurora-frame", name: "Aurora Frame", category: "frame", price: 300, description: "A cool-toned glow around your avatar.", color: "#a78bfa", symbol: "sparkles" },
  { key: "neon-frame", name: "Neon Frame", category: "frame", price: 500, description: "Electric cyan. Impossible to miss.", color: "#4ce3ff", symbol: "zap" },
  { key: "gold-frame", name: "Gold Frame", category: "frame", price: 750, description: "A warm, tournament-ready finish.", color: "#fbbf24", symbol: "crown" },
  { key: "rose-frame", name: "Rose Frame", category: "frame", price: 850, description: "A vivid rose-gold edge.", color: "#fb7185", symbol: "heart" },
  { key: "emerald-frame", name: "Emerald Frame", category: "frame", price: 1000, description: "A luminous green prestige ring.", color: "#34d399", symbol: "leaf" },
  { key: "ice-frame", name: "Ice Frame", category: "frame", price: 1250, description: "Glacial blue with a frosted glow.", color: "#7dd3fc", symbol: "snowflake" },

  { key: "comet-logo", name: "Comet Trail", category: "logo", price: 350, description: "A bright mark for momentum makers.", color: "#67e8f9", symbol: "comet" },
  { key: "phoenix-logo", name: "Phoenix Crest", category: "logo", price: 650, description: "Rise again. Return stronger.", color: "#fb7185", symbol: "flame" },
  { key: "orbit-logo", name: "Orbit Emblem", category: "logo", price: 700, description: "Keep every thought in its orbit.", color: "#a78bfa", symbol: "orbit" },
  { key: "titan-logo", name: "Titan Crest", category: "logo", price: 950, description: "A bold crest for heavyweight focus.", color: "#fbbf24", symbol: "shield" },
  { key: "lotus-logo", name: "Quiet Lotus", category: "logo", price: 1050, description: "Stillness is a competitive edge.", color: "#f0abfc", symbol: "flower" },
  { key: "nova-logo", name: "Nova Sigil", category: "logo", price: 1300, description: "A small star with big energy.", color: "#818cf8", symbol: "star" },
  { key: "wolf-logo", name: "Lone Wolf", category: "logo", price: 1700, description: "Independent, relentless, focused.", color: "#c4b5fd", symbol: "wolf" },
  { key: "eclipse-logo", name: "Eclipse Mark", category: "logo", price: 2100, description: "A rare shadow-and-light insignia.", color: "#f472b6", symbol: "eclipse" },

  { key: "ruby-name", name: "Ruby Signal", category: "color", price: 250, description: "A vivid red accent for your name.", color: "#fb7185" },
  { key: "amber-name", name: "Solar Amber", category: "color", price: 300, description: "Warm gold, bright presence.", color: "#fbbf24" },
  { key: "mint-name", name: "Mint Circuit", category: "color", price: 350, description: "Fresh mint with a subtle glow.", color: "#4ade9e" },
  { key: "ocean-name", name: "Ocean Pulse", category: "color", price: 400, description: "Deep cyan for cool-headed players.", color: "#4ce3ff" },
  { key: "violet-name", name: "Violet Beam", category: "color", price: 450, description: "A bright arena-violet signature.", color: "#b3aaff" },
  { key: "rose-name", name: "Rose Quartz", category: "color", price: 550, description: "Soft pink, strong focus.", color: "#f0abfc" },
  { key: "ice-name", name: "Glacier", category: "color", price: 700, description: "A clean, icy blue highlight.", color: "#7dd3fc" },
  { key: "prism-name", name: "Prism Shift", category: "color", price: 1250, description: "A premium iridescent gradient.", color: "#c4b5fd" },

  { key: "crown-icon", name: "Crown Icon", category: "icon", price: 300, description: "Wear your focus like a crown.", color: "#fbbf24", symbol: "crown" },
  { key: "bolt-icon", name: "Lightning Icon", category: "icon", price: 300, description: "Fast starts. Clean finishes.", color: "#facc15", symbol: "zap" },
  { key: "flame-icon", name: "Flame Icon", category: "icon", price: 350, description: "Keep your daily streak burning.", color: "#fb7185", symbol: "flame" },
  { key: "star-icon", name: "Star Icon", category: "icon", price: 400, description: "A little shine beside your name.", color: "#fde047", symbol: "star" },
  { key: "gem-icon", name: "Gem Icon", category: "icon", price: 550, description: "A rare detail for a refined profile.", color: "#67e8f9", symbol: "gem" },
  { key: "moon-icon", name: "Moon Icon", category: "icon", price: 650, description: "For the quiet-hour specialists.", color: "#c4b5fd", symbol: "moon" },
  { key: "leaf-icon", name: "Leaf Icon", category: "icon", price: 750, description: "Grow steadily, one sprint at a time.", color: "#4ade9e", symbol: "leaf" },
  { key: "shield-icon", name: "Shield Icon", category: "icon", price: 1000, description: "Protect your focus zone.", color: "#60a5fa", symbol: "shield" },
] as const;

export function perkByKey(key: string) {
  return PERK_CATALOG.find((perk) => perk.key === key);
}

export function perkColor(key: string | null | undefined) {
  if (!key) return undefined;
  return perkByKey(key)?.color;
}
