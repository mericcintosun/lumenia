import type { MetadataRoute } from "next";
import { GUIDES } from "../lib/learn";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lumenia-chi.vercel.app";

/**
 * sitemap.xml (Next native) — the public surface only.
 *
 * Deliberately excludes everything robots.ts disallows: the claim route (bearer links), the (app)
 * group (someone's own money), and the internal /brand-kit, /dev and /spike routes. The guides are
 * enumerated from GUIDES, the same source /learn/[slug] builds its static params from, so a new
 * guide cannot ship without appearing here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly"): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`,
    changeFrequency,
    priority,
  });

  return [
    page("/", 1, "weekly"),
    page("/how-it-works", 0.9, "monthly"),
    page("/demo", 0.8, "monthly"),
    page("/learn", 0.7, "monthly"),
    ...GUIDES.map((g) => page(`/learn/${g.slug}`, 0.6, "monthly")),
    page("/about", 0.6, "monthly"),
    page("/developers", 0.6, "monthly"),
    page("/roadmap", 0.5, "monthly"),
    page("/tools", 0.5, "monthly"),
    page("/tools/verify", 0.4, "monthly"),
    page("/tools/link-check", 0.4, "monthly"),
    page("/tools/usd-try", 0.4, "monthly"),
    page("/tools/cost", 0.4, "monthly"),
    page("/cash-out", 0.4, "monthly"),
    page("/waitlist", 0.4, "monthly"),
    page("/brand", 0.3, "monthly"),
    page("/privacy", 0.3, "monthly"),
    page("/terms", 0.3, "monthly"),
  ];
}
