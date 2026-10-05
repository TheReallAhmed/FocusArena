/** Free quote API (zenquotes.io — no key needed) with local fallbacks. */

export type Quote = { text: string; author: string };

const FALLBACK: Quote[] = [
  { text: "Focus is the art of knowing what to ignore.", author: "James Clear" },
  { text: "It is not that we have a short time to live, but that we waste a great deal of it.", author: "Seneca" },
  { text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee" },
  { text: "Concentrate all your thoughts upon the work in hand. The sun's rays do not burn until brought to a focus.", author: "Alexander Graham Bell" },
  { text: "You will never reach your destination if you stop and throw stones at every dog that barks.", author: "Winston Churchill" },
  { text: "Where focus goes, energy flows.", author: "Tony Robbins" },
  { text: "Lack of direction, not lack of time, is the problem. We all have twenty-four hour days.", author: "Zig Ziglar" },
  { text: "Do the hard jobs first. The easy jobs will take care of themselves.", author: "Dale Carnegie" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "What gets measured gets managed.", author: "Peter Drucker" },
];

function fallbackQuote(): Quote {
  const day = Math.floor(Date.now() / 86400000);
  return FALLBACK[day % FALLBACK.length];
}

export async function getDailyQuote(): Promise<Quote> {
  try {
    const res = await fetch("https://zenquotes.io/api/random", {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return fallbackQuote();
    const data = (await res.json()) as Array<{ q?: string; a?: string }>;
    const q = data?.[0];
    if (q?.q && q?.a) return { text: q.q, author: q.a };
    return fallbackQuote();
  } catch {
    return fallbackQuote();
  }
}
