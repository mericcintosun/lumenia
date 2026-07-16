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
  /** Request money — the ask side (REQUEST_MONEY.md §10). Approved words only. */
  request: {
    title: "Ask for money",
    sub: "Make a link that asks someone to pay you. Share it in any chat.",
    amountLabel: "How much do you need?",
    nameLabel: "Your name",
    namePlaceholder: "So they know it's you",
    cta: "Create my request link",
    // Honest notes about what happens after — different per asker (§5.1).
    noteWithAccount: "When they pay, the money lands here for you to collect.",
    noteWithoutAccount:
      "When they pay, they'll send a money link back in the same chat — tap it and the money is yours.",
    readyTitle: "Your request is ready",
    shareCta: "Share on WhatsApp",
    recentTitle: "Your recent asks",
    waText: (name: string, amount: string, link: string) =>
      `Hi, it's ${name} — could you send me ${amount}? You can pay it here: ${link}`,
  },
  /** The payer's side of a request — /r/[id]. */
  pay: {
    asksFor: (name: string) => `${name} is asking for`,
    // No speed claims — the flow is at least two taps (honesty law, same class
    // as "target ~30s" vs "is 30s").
    sub: "Pay it with the money you have here.",
    payCta: (name: string) => `Pay ${name}`,
    noMoneyTitle: "You don't have money here yet",
    noMoneyBody: "Money here arrives as a link. When someone sends you one, you can come back and pay this.",
    // The WhatsApp webview has its own separate storage — a payer whose money
    // lives in their real browser must not be told they have none (webview law).
    browserHint: "Received money here before? This chat window can't see it — open this page in your usual browser.",
    copyPageLink: "Copy this page's link",
    tryDemo: "Try it out first",
    invalid: "This request link is incomplete. Ask them to send it again.",
    // Double payment is possible by design (no server state) — say so once, honestly.
    doublePayNote: (name: string) => `If someone else may have paid this already, check with ${name} first.`,
    // Self-pay: her own request opened on her own device.
    ownRequestTitle: "This is your own request",
    ownRequestBody: "Share the link with the person you're asking — when they pay, the money shows up on your home screen.",
    directNote: (name: string, tail: string) => `Goes straight to ${name}'s account (ending ${tail}).`,
    paidDirectTitle: "Paid — it's on its way",
    paidDirectBody: (name: string) =>
      `${name} will find it waiting the next time they open Lumenia. If it isn't collected, it comes back to you after 7 days.`,
    sendBackTitle: (name: string) => `Now send this link back to ${name}`,
    sendBackWaText: (link: string) => `Here's the money you asked for 💸 Tap to receive it: ${link}`,
  },
  /** /home — money waiting to be collected (a paid request, or any direct transfer). */
  waiting: {
    title: "Money waiting for you",
    collect: "Add to my money",
    collecting: "Adding it…",
    row: (amount: string) => `${amount} is waiting for you`,
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
    // For failed sends/pays: technical reasons (Horizon extras, status codes) must
    // never reach a money surface (vocabulary law). Honest: a rejected inner tx
    // means nothing moved.
    moneySafe: "We couldn't finish — your money hasn't moved. Try again.",
  },
} as const;
