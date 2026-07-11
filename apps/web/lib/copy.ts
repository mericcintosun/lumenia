/**
 * User-facing copy — English (repo language policy: everything in English;
 * a Turkish locale returns as an i18n pass when the TR corridor launches).
 * Positioning rule: the user only ever sees money ($ / ₺) and people.
 * NEVER expose "wallet / crypto / USDC / Stellar / blockchain / gas".
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
    amountNote: "It's your money. Tap to claim it.",
    claimCta: "Claim my money",
    claiming: "Getting your money ready…",
    done: "The money is in your account 🎉",
    holdHint: "Your dollars stay right here — no melting away. Spend them whenever you like.",
    spend: "Spend with a card",
    fromSender: "From",
  },
  /**
   * Delegated cash-out placeholder (Instawards SOW §4.1 note + W4): conversion to
   * local currency is handled by a licensed provider, never by Lumenia. These are
   * UI placeholders only — no live conversion in this sprint.
   */
  cashOut: {
    title: "Use your money",
    spendCard: "Spend with a card",
    toTry: "Convert to Turkish lira",
    soon: "Coming soon",
    delegatedNote: "Conversion is handled by a licensed provider — coming very soon.",
  },
  errors: {
    notFound: "This link is invalid or has expired.",
    generic: "Something went wrong. Please try again.",
  },
} as const;
