import { getDailyQuote } from "@/lib/quote";

export const revalidate = 3600;

export async function GET() {
  const quote = await getDailyQuote();
  return Response.json(quote);
}
