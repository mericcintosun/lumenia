/** Tailwind v4 is a PostCSS plugin (CSS-first; no tailwind.config.js).
 *  Turbopack (Next 16 default) processes this natively — no --webpack needed. */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
