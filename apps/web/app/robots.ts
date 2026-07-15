import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lumenia-chi.vercel.app";

/**
 * robots.txt (Next native). Until now there was none, so /robots.txt 404'd into the not-found page.
 *
 * The important line is `/c/` — a claim URL is a BEARER link. The secret itself rides in the
 * `#fragment` and never leaves the browser, so a crawler could not spend one, but the URL still
 * names an amount, a sender and a balance id, and those are a stranger's money. They have no
 * business in an index. Disallowing here keeps the claim route's own HTML untouched (it is grant
 * evidence and frozen) while still keeping it out of search.
 *
 * /spike and /dev are 404 in production already; listing them is belt-and-braces.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/c/", "/claimed", "/home", "/send", "/sent/", "/unlock", "/brand-kit", "/dev", "/spike"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
