/**
 * POST /events — ONE structured-log beacon for the claim→first-send funnel
 * (FRONTEND_PLAN §4.3). Not Mixpanel/PostHog/dashboards — just allowlisted event
 * names written to stdout (Vercel logs). No PII: the client sends only an event
 * name + a HASHED, truncated claim id (see apps/web/lib/events.ts, owner caveat C2).
 */
const ALLOWED_EVENTS = new Set<string>([
  "claim_opened",
  "claim_succeeded",
  "claim_failed",
  "send_started",
  "send_link_created",
]);

export interface EventInput {
  event?: string;
  cid?: string;
}

/** Validate + log. Throws on an unknown event (caller may still 200 the beacon). */
export function handleEvent(input: EventInput): { ok: true } {
  if (!input.event || !ALLOWED_EVENTS.has(input.event)) {
    throw new Error("unknown event");
  }
  const cid = typeof input.cid === "string" ? input.cid.slice(0, 32) : null;
  console.log(`[event] ${JSON.stringify({ event: input.event, cid })}`);
  return { ok: true };
}
