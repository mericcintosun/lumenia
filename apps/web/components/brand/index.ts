/** Core-six brand components (+ TestnetBanner) — built on shadcn primitives. They use the Tailwind
 *  brand utilities (bg-money, text-ink, …), so they render Periwinkle inside the (app) group's
 *  `.app-pw` token scope (components/site/app-theme.css) and warm-paper on the frozen claim route —
 *  the same component, no rewrite. Several per-file doc comments still describe the retired
 *  warm-paper palette; the components are intentionally unchanged (that is the whole `.app-pw`
 *  trick), only the rendered colours differ by scope. */
export { AmountDisplay } from "./AmountDisplay";
export { PersonChip } from "./PersonChip";
export { MoneyCard } from "./MoneyCard";
export { PrimaryButton } from "./PrimaryButton";
export { MoneyMovingAnimation } from "./MoneyMovingAnimation";
export { StatusPill } from "./StatusPill";
export { TestnetBanner } from "./TestnetBanner";
