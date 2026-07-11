/**
 * User-facing copy — Turkish locale (the product's market is Turkey).
 * Positioning rule: the user only ever sees money ($ / ₺) and people.
 * NEVER expose "wallet / crypto / USDC / Stellar / blockchain / gas".
 * (Code, comments and identifiers stay English; only these string VALUES are tr.)
 */
export const tr = {
  appName: "Lumenia",
  landing: {
    headline: "Para gönder, dolar tut.",
    sub: "Sevdiklerine linkle dolar gönder — onlar tek dokunuşla alır. Uygulama yok, kurulum yok.",
    cta: "Nasıl çalışır?",
  },
  claim: {
    youReceived: (name: string) => `${name} sana para gönderdi`,
    amountNote: "Senin paran. Almak için dokun.",
    claimCta: "Paramı al",
    claiming: "Paran hazırlanıyor…",
    done: "Paran hesabında 🎉",
    holdHint: "Doların burada durur, eridiği için endişelenme. İstediğinde harcarsın.",
    spend: "Kartla harca",
    fromSender: "Gönderen",
  },
  /**
   * Delegated cash-out placeholder (Instawards SOW §4.1 note + W4): conversion to
   * local currency is handled by a licensed provider, never by Lumenia. These are
   * UI placeholders only — no live conversion in this sprint.
   */
  cashOut: {
    title: "Paranı kullan",
    spendCard: "Kartla harca",
    toTry: "Türk lirasına çevir",
    soon: "Yakında",
    delegatedNote: "Dönüşüm, lisanslı bir sağlayıcı üzerinden yapılır — çok yakında.",
  },
  errors: {
    notFound: "Bu link geçersiz ya da süresi dolmuş.",
    generic: "Bir şeyler ters gitti. Tekrar dene.",
  },
} as const;
