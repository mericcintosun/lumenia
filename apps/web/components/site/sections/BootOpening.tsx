/**
 * BootOpening — the landing's first frame. The page opens as one flat field of the colour the
 * wordmark's "i" is drawn in, then that field drains into the "i" itself, igniting its lumen spark
 * and handing off to the greeting.
 *
 * The colour is var(--pw-accent) — NOT a hardcoded hex. That token is already the exact fill the
 * Lumenia letters carry (#6E5FCE in logo-wordmark-t.svg / #B7ACE8 in logo-wordmark-dark.svg), and
 * landing.css already flips it per data-theme, so the field is theme-correct for free.
 *
 * There is no JavaScript here, on purpose — the markup is two elements and landing.css does the
 * rest (`.op-boot` / `.op-boot-spark`, and the `--i-x` / `--i-y` point).
 *
 * It began as a client component that measured the wordmark's rect and drove the drain from an
 * effect. That was more precise than it needed to be and cost more than it was worth: nothing could
 * start until React hydrated, so a throttled phone held a flat purple screen for ~4.9 s — and the
 * LCP said so. The drain's target is not actually dynamic: the wordmark is a fixed-height,
 * width-auto SVG over a meet-fit viewBox, so the tittle's position is arithmetic, and CSS can do
 * arithmetic. See the derivation above `--i-x` in landing.css; e2e/boot.spec.ts asserts the CSS
 * point still matches the wordmark's real rendered rect, so the constant cannot rot silently.
 *
 * Consequences worth having: the opening starts at first paint, survives broken or disabled JS
 * (no <noscript> escape needed — there is no script to escape), and ships zero bytes of JS.
 */
export function BootOpening() {
  return (
    <>
      <div className="op-boot" aria-hidden="true" />
      <span className="op-boot-spark" aria-hidden="true" />
    </>
  );
}
