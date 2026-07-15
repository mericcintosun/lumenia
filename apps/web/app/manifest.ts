import type { MetadataRoute } from "next";
import { copy } from "../lib/copy";

/**
 * PWA manifest (Next native). The icons are the Lumenia mark: the "i"'s field (#6E5FCE = --pw-accent,
 * the exact fill the wordmark letters carry) lit by the wordmark SVG's own `lumen` gradient.
 * Colours track the landing's Periwinkle paper — the manifest is a separate file, so this does not
 * touch the claim route's HTML.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: copy.appName,
    short_name: copy.appName,
    description: copy.landing.sub,
    start_url: "/",
    display: "standalone",
    background_color: "#F5F3EF",
    theme_color: "#F5F3EF",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
