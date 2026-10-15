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
  { key: "silence-architect", name: "Silence Architect", category: "title", price: 1850, description: "Build a fortress of uninterrupted work.", symbol: "moon" },
  { key: "momentum-engine", name: "Momentum Engine", category: "title", price: 2400, description: "Turn every small sprint into forward motion.", symbol: "zap" },
  { key: "midnight-oracle", name: "Midnight Oracle", category: "title", price: 2800, description: "Clarity found in the quietest hours.", symbol: "eclipse" },
  { key: "precision-ace", name: "Precision Ace", category: "title", price: 1600, description: "Every minute has a purpose.", symbol: "target" },
  { key: "calm-commander", name: "Calm Commander", category: "title", price: 2100, description: "Lead your focus without the noise.", symbol: "shield" },
  { key: "flow-architect", name: "Flow Architect", category: "title", price: 2500, description: "Design the conditions for deep flow.", symbol: "waves" },
  { key: "quest-closer", name: "Quest Closer", category: "title", price: 1250, description: "Plans become finished work in your hands.", symbol: "crown" },
  { key: "focus-ascendant", name: "Focus Ascendant", category: "title", price: 3200, description: "A rare mark earned above the ordinary.", symbol: "star" },

  { key: "aurora-frame", name: "Aurora Frame", category: "frame", price: 300, description: "A cool-toned glow around your avatar.", color: "#a78bfa", symbol: "sparkles" },
  { key: "neon-frame", name: "Neon Frame", category: "frame", price: 500, description: "Electric cyan. Impossible to miss.", color: "#4ce3ff", symbol: "zap" },
  { key: "gold-frame", name: "Gold Frame", category: "frame", price: 750, description: "A warm, tournament-ready finish.", color: "#fbbf24", symbol: "crown" },
  { key: "rose-frame", name: "Rose Frame", category: "frame", price: 850, description: "A vivid rose-gold edge.", color: "#fb7185", symbol: "heart" },
  { key: "emerald-frame", name: "Emerald Frame", category: "frame", price: 1000, description: "A luminous green prestige ring.", color: "#34d399", symbol: "leaf" },
  { key: "ice-frame", name: "Ice Frame", category: "frame", price: 1250, description: "Glacial blue with a frosted glow.", color: "#7dd3fc", symbol: "snowflake" },
  { key: "nebula-frame", name: "Nebula Frame", category: "frame", price: 1450, description: "A violet cloud of cosmic light.", color: "#8b5cf6", symbol: "orbit" },
  { key: "solar-flare-frame", name: "Solar Flare", category: "frame", price: 1800, description: "A blazing rim of solar energy.", color: "#fb923c", symbol: "flame" },
  { key: "cyber-grid-frame", name: "Cyber Grid", category: "frame", price: 1550, description: "Electric cyan with a digital edge.", color: "#22d3ee", symbol: "zap" },
  { key: "moonlit-frame", name: "Moonlit Frame", category: "frame", price: 1250, description: "Soft lunar light for a quiet profile.", color: "#c4b5fd", symbol: "moon" },
  { key: "emerald-circuit-frame", name: "Emerald Circuit", category: "frame", price: 1700, description: "A living green line of focus.", color: "#10b981", symbol: "orbit" },
  { key: "crimson-comet-frame", name: "Crimson Comet", category: "frame", price: 2000, description: "A fast red trail around your avatar.", color: "#f43f5e", symbol: "comet" },
  { key: "prismatic-frame", name: "Prismatic Halo", category: "frame", price: 2600, description: "A luminous color-shifting aura.", color: "#e879f9", symbol: "sparkles" },
  { key: "void-frame", name: "Void Halo", category: "frame", price: 2350, description: "A deep indigo glow from the arena’s edge.", color: "#6366f1", symbol: "eclipse" },
  { key: "frost-crown-frame", name: "Frost Crown", category: "frame", price: 2100, description: "A crisp arctic-blue prestige ring.", color: "#bae6fd", symbol: "snowflake" },
  { key: "royal-ember-frame", name: "Royal Ember", category: "frame", price: 2900, description: "Golden fire for a champion profile.", color: "#f59e0b", symbol: "crown" },

  { key: "comet-logo", name: "Comet Trail", category: "logo", price: 350, description: "A bright mark for momentum makers.", color: "#67e8f9", symbol: "comet" },
  { key: "phoenix-logo", name: "Phoenix Crest", category: "logo", price: 650, description: "Rise again. Return stronger.", color: "#fb7185", symbol: "flame" },
  { key: "orbit-logo", name: "Orbit Emblem", category: "logo", price: 700, description: "Keep every thought in its orbit.", color: "#a78bfa", symbol: "orbit" },
  { key: "titan-logo", name: "Titan Crest", category: "logo", price: 950, description: "A bold crest for heavyweight focus.", color: "#fbbf24", symbol: "shield" },
  { key: "lotus-logo", name: "Quiet Lotus", category: "logo", price: 1050, description: "Stillness is a competitive edge.", color: "#f0abfc", symbol: "flower" },
  { key: "nova-logo", name: "Nova Sigil", category: "logo", price: 1300, description: "A small star with big energy.", color: "#818cf8", symbol: "star" },
  { key: "wolf-logo", name: "Lone Wolf", category: "logo", price: 1700, description: "Independent, relentless, focused.", color: "#c4b5fd", symbol: "wolf" },
  { key: "eclipse-logo", name: "Eclipse Mark", category: "logo", price: 2100, description: "A rare shadow-and-light insignia.", color: "#f472b6", symbol: "eclipse" },
  { key: "dragon-sigil", name: "Dragon Sigil", category: "logo", price: 1500, description: "A fierce emblem forged for long campaigns.", color: "#ef4444", symbol: "flame" },
  { key: "lunar-compass", name: "Lunar Compass", category: "logo", price: 1200, description: "Find your direction when the world goes quiet.", color: "#c4b5fd", symbol: "orbit" },
  { key: "starforge-emblem", name: "Starforge Emblem", category: "logo", price: 1850, description: "A bright symbol of work made with intent.", color: "#facc15", symbol: "star" },
  { key: "abyssal-eye", name: "Abyssal Eye", category: "logo", price: 2300, description: "A mysterious mark from the deepest focus zone.", color: "#818cf8", symbol: "eclipse" },
  { key: "aurora-knot", name: "Aurora Knot", category: "logo", price: 1350, description: "A soft northern light woven into a sigil.", color: "#34d399", symbol: "flower" },
  { key: "storm-raven", name: "Storm Raven", category: "logo", price: 1950, description: "A swift mark for independent thinkers.", color: "#60a5fa", symbol: "comet" },
  { key: "sapphire-crest", name: "Sapphire Crest", category: "logo", price: 1650, description: "A polished badge of steady resolve.", color: "#3b82f6", symbol: "shield" },
  { key: "wildwood-mark", name: "Wildwood Mark", category: "logo", price: 1100, description: "Grow quietly; let the results speak.", color: "#4ade80", symbol: "leaf" },
  { key: "voidwalker-sigil", name: "Voidwalker Sigil", category: "logo", price: 2550, description: "A rare insignia for a solitary flow state.", color: "#a78bfa", symbol: "orbit" },
  { key: "golden-suncrest", name: "Golden Suncrest", category: "logo", price: 2200, description: "Carry a little sunrise into every sprint.", color: "#fbbf24", symbol: "star" },

  { key: "ruby-name", name: "Ruby Signal", category: "color", price: 250, description: "A vivid red accent for your name.", color: "#fb7185" },
  { key: "amber-name", name: "Solar Amber", category: "color", price: 300, description: "Warm gold, bright presence.", color: "#fbbf24" },
  { key: "mint-name", name: "Mint Circuit", category: "color", price: 350, description: "Fresh mint with a subtle glow.", color: "#4ade9e" },
  { key: "ocean-name", name: "Ocean Pulse", category: "color", price: 400, description: "Deep cyan for cool-headed players.", color: "#4ce3ff" },
  { key: "violet-name", name: "Violet Beam", category: "color", price: 450, description: "A bright arena-violet signature.", color: "#b3aaff" },
  { key: "rose-name", name: "Rose Quartz", category: "color", price: 550, description: "Soft pink, strong focus.", color: "#f0abfc" },
  { key: "ice-name", name: "Glacier", category: "color", price: 700, description: "A clean, icy blue highlight.", color: "#7dd3fc" },
  { key: "prism-name", name: "Prism Shift", category: "color", price: 1250, description: "A premium iridescent gradient.", color: "#c4b5fd" },
  { key: "plasma-name", name: "Plasma Bloom", category: "color", price: 900, description: "Bright magenta with an electric pulse.", color: "#e879f9" },
  { key: "crimson-name", name: "Crimson Drive", category: "color", price: 800, description: "A focused, high-energy red.", color: "#ef4444" },
  { key: "aurora-name", name: "Aurora Mint", category: "color", price: 950, description: "A fresh green glow with cool undertones.", color: "#34d399" },
  { key: "cyber-lime-name", name: "Cyber Lime", category: "color", price: 1100, description: "A vivid acid-green arena signal.", color: "#a3e635" },
  { key: "sapphire-name", name: "Sapphire Pulse", category: "color", price: 1050, description: "A brilliant blue for calm execution.", color: "#60a5fa" },
  { key: "cosmic-rose-name", name: "Cosmic Rose", category: "color", price: 1450, description: "A radiant pink signature from deep space.", color: "#f472b6" },

  { key: "crown-icon", name: "Crown Icon", category: "icon", price: 300, description: "Wear your focus like a crown.", color: "#fbbf24", symbol: "crown" },
  { key: "bolt-icon", name: "Lightning Icon", category: "icon", price: 300, description: "Fast starts. Clean finishes.", color: "#facc15", symbol: "zap" },
  { key: "flame-icon", name: "Flame Icon", category: "icon", price: 350, description: "Keep your daily streak burning.", color: "#fb7185", symbol: "flame" },
  { key: "star-icon", name: "Star Icon", category: "icon", price: 400, description: "A little shine beside your name.", color: "#fde047", symbol: "star" },
  { key: "gem-icon", name: "Gem Icon", category: "icon", price: 550, description: "A rare detail for a refined profile.", color: "#67e8f9", symbol: "gem" },
  { key: "moon-icon", name: "Moon Icon", category: "icon", price: 650, description: "For the quiet-hour specialists.", color: "#c4b5fd", symbol: "moon" },
  { key: "leaf-icon", name: "Leaf Icon", category: "icon", price: 750, description: "Grow steadily, one sprint at a time.", color: "#4ade9e", symbol: "leaf" },
  { key: "shield-icon", name: "Shield Icon", category: "icon", price: 1000, description: "Protect your focus zone.", color: "#60a5fa", symbol: "shield" },
  { key: "orbit-icon", name: "Orbit Icon", category: "icon", price: 800, description: "Keep your attention in its orbit.", color: "#a78bfa", symbol: "orbit" },
  { key: "brain-icon", name: "Brain Icon", category: "icon", price: 850, description: "A little mark for deep thinkers.", color: "#c084fc", symbol: "brain" },
  { key: "heart-icon", name: "Heart Icon", category: "icon", price: 700, description: "Bring care and intention to the work.", color: "#fb7185", symbol: "heart" },
  { key: "comet-icon", name: "Comet Icon", category: "icon", price: 950, description: "A small symbol of fast momentum.", color: "#67e8f9", symbol: "comet" },
  { key: "snowflake-icon", name: "Snowflake Icon", category: "icon", price: 900, description: "Stay cool and precise under pressure.", color: "#7dd3fc", symbol: "snowflake" },
  { key: "wave-icon", name: "Wave Icon", category: "icon", price: 750, description: "Ride the rhythm of a clean flow state.", color: "#2dd4bf", symbol: "waves" },
  { key: "atom-icon", name: "Atom Icon", category: "icon", price: 1150, description: "A tiny emblem for big ideas.", color: "#818cf8", symbol: "orbit" },
  { key: "leaf-icon-rare", name: "Verdant Icon", category: "icon", price: 1200, description: "A rare green signature for steady growth.", color: "#22c55e", symbol: "leaf" },
] as const;

export function perkByKey(key: string) {
  return PERK_CATALOG.find((perk) => perk.key === key);
}

export function perkColor(key: string | null | undefined) {
  if (!key) return undefined;
  return perkByKey(key)?.color;
}
