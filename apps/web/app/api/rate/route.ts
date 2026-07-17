import { NextResponse } from "next/server";
import { indicativeRate } from "../../../lib/rate";

/**
 * GET /api/rate — server-side proxy for the indicative USD→TRY reference rate
 * (ECB, via api.frankfurter.dev — no key, updates each ECB business day).
 *
 * The proxy exists so the BROWSER only ever talks to our own origin: /home is a
 * money surface, and it should not open a third-party connection (with the
 * user's IP) just to decorate the balance with an indicative ₺ line. Server-side,
 * Next's fetch cache + the route's revalidate keep the upstream call to at most
 * once an hour. On any failure the labeled fallback constant is returned with
 * live:false so the UI keeps the honest "indicative" wording.
 */
export const revalidate = 3600;

export async function GET(): Promise<NextResponse> {
  try {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=TRY", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { rates?: { TRY?: number } };
    const rate = data.rates?.TRY;
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) throw new Error("bad rate");
    return NextResponse.json({ rate, live: true });
  } catch {
    return NextResponse.json({ rate: indicativeRate(), live: false });
  }
}
