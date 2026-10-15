/** Offline quote selection: no external service, API key, or network dependency. */

export type Quote = { text: string; author: string };
export type QuoteLocale = "en" | "ar";

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

const FALLBACK_AR: Quote[] = [
  { text: "التركيز هو فن معرفة ما ينبغي تجاهله.", author: "James Clear" },
  { text: "ليست المشكلة أن أعمارنا قصيرة، بل إننا نهدر الكثير منها.", author: "Seneca" },
  { text: "المحارب الناجح إنسان عادي يملك تركيزًا كأشعة الليزر.", author: "Bruce Lee" },
  { text: "اجمع أفكارك كلها على العمل الذي بين يديك؛ فأشعة الشمس لا تحرق حتى تُجمع في بؤرة.", author: "Alexander Graham Bell" },
  { text: "لن تبلغ وجهتك إذا توقفت لترمي الحجارة على كل كلب ينبح.", author: "Winston Churchill" },
  { text: "حيث يتجه التركيز، تتدفق الطاقة.", author: "Tony Robbins" },
  { text: "المشكلة نقص الاتجاه لا نقص الوقت؛ فلدى الجميع أربع وعشرون ساعة.", author: "Zig Ziglar" },
  { text: "أنجز المهام الصعبة أولًا، وستتكفل السهلة بنفسها.", author: "Dale Carnegie" },
  { text: "البساطة هي قمة الإتقان.", author: "Leonardo da Vinci" },
  { text: "ما يمكن قياسه يمكن إدارته.", author: "Peter Drucker" },
];

export async function getDailyQuote(locale: QuoteLocale = "en"): Promise<Quote> {
  const index = Math.floor(Math.random() * FALLBACK.length);
  return (locale === "ar" ? FALLBACK_AR[index] : FALLBACK[index]) ?? FALLBACK[0];
}
