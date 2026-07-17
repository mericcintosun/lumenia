/**
 * Per-claim OG card as a ROUTE HANDLER (Note A fix). The special
 * `opengraph-image` file convention only receives `params`, never the query — but
 * our claim links carry the display data (amount, sender) in the QUERY string, so
 * the old file-convention card mis-served every non-default link. A route handler
 * reads `searchParams` and renders the real amount/sender, value-first, on Periwinkle paper.
 *
 * satori has no system fonts, so we embed one weight (Plus Jakarta Sans Bold —
 * covers Turkish sender names). Referenced from the page's generateMetadata with
 * the same query, made absolute by metadataBase (root layout).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { formatUsd } from "@/lib/money";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

// The embedded font is read from apps/web/assets (a bracket-free path, kept in the
// OG function bundle via next.config `outputFileTracingIncludes`).
// fetch(new URL(...import.meta.url)) does NOT work here — the .ttf isn't emitted
// beside the compiled route module.
const FONT_PATH = join(process.cwd(), "assets", "PlusJakartaSans-Bold.ttf");

export async function GET(request: Request): Promise<Response> {
  const sp = new URL(request.url).searchParams;
  const amount = sp.get("a");
  const sender = (sp.get("s") ?? "Someone").slice(0, 40);
  const usd = amount ? formatUsd(amount) : "$—";

  const font = await readFile(FONT_PATH);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F5F3EF",
          fontFamily: "Jakarta",
          padding: 80,
        }}
      >
        <div style={{ display: "flex", fontSize: 46, color: "#67626E" }}>{sender} sent you money</div>
        <div style={{ display: "flex", fontSize: 168, color: "#6E5FCE", marginTop: 6, letterSpacing: -4 }}>
          {usd}
        </div>
        <div style={{ display: "flex", fontSize: 32, color: "#6E5FCE", marginTop: 40 }}>
          Tap to claim · Lumenia
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Jakarta", data: font, weight: 700, style: "normal" }] },
  );
}
