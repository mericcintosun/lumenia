/**
 * FaqItem — a native <details> disclosure (server-safe, works without JS). The FAQ
 * is the conversion engine (§6): the skeptic who reaches "what if Lumenia disappears?"
 * and thinks "huh, they actually thought about that" is the one who converts.
 */
export function FaqItem({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-line py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
        {q}
        <span className="shrink-0 text-xl text-ink-soft transition-transform duration-200 group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="mt-2 text-ink-soft">{children}</div>
    </details>
  );
}
