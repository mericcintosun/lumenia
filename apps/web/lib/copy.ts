/**
 * User-facing copy — English (repo language policy: everything English; a Turkish
 * locale returns as an i18n pass when the TR corridor launches).
 * Vocabulary law (FRONTEND_PLAN §8): product UI shows only money + people —
 * NEVER wallet / crypto / USDC / Stellar / blockchain / gas / on-chain. Approved:
 * money, send, receive, claim, link, held in dollars, "we cover the network cost",
 * "public record" / "publicly verifiable", reclaim / "comes back to you after 7 days".
 */
export const copy = {
  appName: "Lumenia",
  landing: {
    headline: "Send money, hold dollars.",
    sub: "Send dollars to the people you love with a link — they receive it in one tap. No app, no setup.",
    cta: "How does it work?",
  },
  claim: {
    youReceived: (name: string) => `${name} sent you money`,
    amountNote: "It's yours to keep.",
    safetyLine: "No app, no sign-up — just tap.",
    claimCta: "Claim my money",
    claiming: "Moving your money to you…",
    slow: "Almost there — your money is safe.",
    doneLabel: "Your money",
    doneSub: "It's in your account.",
    receipt: "See the public record",
    error: (name: string) => `We couldn't finish — your money from ${name} is still safe. Try again.`,
    retry: "Try again",
    holdHint: "Your dollars stay right here — spend them whenever you like.",
    // post-claim next action (the north-star hand-off)
    ctaSend: "Send money to someone",
    ctaRequest: "Ask someone to pay you",
    soon: "soon",
  },
  lock: {
    title: "Lock this money to you",
    body: "Add a password so only you can spend it. You can do this anytime.",
    cta: "Lock it",
    skip: "Maybe later",
  },
  /**
   * Delegated cash-out placeholder (Instawards SOW note): conversion to local
   * currency is handled by a licensed provider, never by Lumenia. UI placeholder
   * only. Lives on /home + /cash-out now — NOT on the claim success screen.
   */
  cashOut: {
    title: "Use your money",
    spendCard: "Spend with a card",
    toTry: "Convert to Turkish lira",
    soon: "Coming soon",
    delegatedNote: "Conversion is handled by a licensed provider — coming soon.",
  },
  errors: {
    notFound: "This link is invalid or has expired.",
    generic: "Something went wrong. Please try again.",
  },
} as const;
