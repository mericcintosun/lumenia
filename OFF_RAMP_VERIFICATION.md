# Lumenia — Off-Ramp Verification Plan

> **The #1 risk, made executable.** Every persona + research round flagged the same gate: can a recipient in Turkey turn Stellar-USDC into spendable TRY? This document is the concrete, step-by-step plan to answer it — split into what **[ME]** (the dev/agent) can verify on testnet now, and what **[YOU]** (the founder) must confirm with a real account + Turkish KYC.

Last updated: 2026-06-17 · Network: testnet for [ME] steps, mainnet/real for [YOU] steps.

---

## 0. Headline finding (off-ramp is NOT broken)

Research upgraded the picture from "no path" to "three concrete paths, one of them testnet-testable today":

- **CCTP V2 is LIVE on Stellar — mainnet (~May 19 2026) AND testnet** — Soroban contracts, public attestation (Iris) API with **no API key**, official quickstart. The "move Stellar-USDC to a chain Turkish exchanges accept" leg can be **built and tested on testnet now, with zero money/KYC.**
- **Two direct Stellar-USDC exits need NO bridge:** **KAST Card** (funds from USDC on Stellar, added TRY spend Jan 2026, available to TR residents) and **Binance Global** (accepts USDC deposits on Stellar) → Binance TR → TRY IBAN via FAST.
- The hard limit is **regulatory, not technical:** MASAK caps (~$3k/day, $50k/mo) + a 72h first-withdrawal hold on the crypto leg. Plan UX around these.

So the question is no longer "is there a path?" but "**which path do we make the v1 default, and does it actually clear for a real TR recipient?**"

---

## 1. Ranked end-to-end paths (Stellar-USDC → spendable TRY)

| # | Path | Bridge needed? | Needs | KYC | Best for |
|---|---|---|---|---|---|
| **1** | **KAST Card** — Stellar-USDC → KAST → spend TRY at POS / ATM | **No (direct)** | KAST app + card | Turkish ID + selfie | The "spend it" UX — no bank, no exchange |
| **2** | **Binance Global** (deposit Stellar-USDC + MEMO) → **Binance TR** → sell USDC/TRY → IBAN (FAST) | No (direct) | Binance global + Binance TR | Full Turkish KYC + bank in own name | The "cash to bank" UX |
| **3** | **CCTP bridge** Stellar→Tron/ETH → BTCTurk/Paribu/Bitlo → sell → IBAN | **Yes (CCTP)** | self-custody + CCTP + TR exchange | Turkish KYC on exchange | Fallback if 1 & 2 degrade; the testnet-provable leg |
| 4 | OKX/Kraken global (Stellar-USDC) → withdraw TRC-20 → TR exchange → TRY | No at entry, extra hops | global + TR exchange | Turkish KYC | redundancy |
| 5 | Binance P2P TRY (sell to peers) | network-dependent | Binance acct | Binance KYC | last resort (bank-freeze risk) |

**Recommendation:** validate **Path 1 (KAST)** and **Path 2 (Binance)** as the two real-world v1 options; build **Path 3 (CCTP)** on testnet now as the provable, partner-independent fallback.

---

## 2. Phase 0 — [ME] testnet-verifiable NOW (no money, no KYC)

**Goal:** prove the CCTP bridge leg — Stellar-USDC can be moved off Stellar to a chain Turkish exchanges accept — entirely on testnet. This de-risks Path 3 and proves the technical heart of the off-ramp.

**Spike #4 — CCTP V2 bridge (Stellar Testnet → EVM testnet), spec:**
1. Get testnet CCTP USDC on Stellar (the CCTP USDC SAC `CBIELTK6…DAMA`, issuance `GBBD47IF…FLA5`), fund a Stellar keypair (friendbot for XLM fees).
2. `approve()` the TokenMessengerMinter (`CDNG7HXA…RTHP`) to spend USDC (SAC allowance).
3. `deposit_for_burn` on TokenMessengerMinter: amount (7 decimals), destination domain (e.g. Ethereum Sepolia = 0), recipient bytes32, `maxFee`, `minFinalityThreshold` (2000 = Standard, free).
4. Poll the **public sandbox attestation API** `https://iris-api-sandbox.circle.com/v2/messages/27?transactionHash={hash}` until `status: "complete"`.
5. `receiveMessage()` on the destination MessageTransmitter (viem on Sepolia) → assert native USDC minted.
6. **Assert:** burn tx success on Stellar testnet + attestation `complete` + mint success on the destination testnet.

**Tooling:** `@stellar/stellar-sdk` (Soroban side) + `viem` (EVM side). No Circle account/API key. Stellar domain ID = **27**. Gotcha: inbound TO a Stellar G-address must route via `CctpForwarder` (`CA66Q2WF…4VSZ`); 7 decimals on Stellar vs 6 on EVM.

**Caveat:** the destination mint needs a funded EVM testnet key + testnet gas (Sepolia faucet), and Standard transfers take ~13–19 min (finality-gated). This is a real cross-chain spike, not instant.

> Status: NOT YET BUILT. This is the recommended next code task on the off-ramp track. Everything needed is public (contracts, API, quickstart `developers.circle.com/cctp/quickstarts/transfer-usdc-stellar-arc`).

---

## 3. Phase 1 — [YOU] real-world confirmation (one afternoon, small real amounts)

These CANNOT be testnet'd — they need a real account, real (small) USDC, and Turkish KYC. Use the **smallest** amounts; you're confirming the rails clear, not moving size.

**A. KAST Card (Path 1):**
- [ ] Sign up in the KAST app with a Turkish ID; complete KYC (Sumsub/Jumio). Confirm a TR resident is accepted.
- [ ] On the deposit screen, confirm USDC shows **"Stellar"** as a supported deposit network (this is the make-or-break — verify before sending).
- [ ] Send a small real Stellar-USDC amount (keep ~1 XLM for fees) → confirm it credits the KAST balance.
- [ ] Spend a small amount at a Turkish POS or online in **TRY**; note FX (~0.5–1.75%) and any ATM TRY withdrawal fee ($3 + 2%).
- **Success:** Stellar-USDC funded the card and spent as TRY without a bridge.

**B. Binance Global → Binance TR (Path 2):**
- [ ] Confirm Binance Global's deposit screen lists **USDC on the Stellar network** (with MEMO) and it's currently enabled (users report intermittent issues — verify live).
- [ ] Deposit a small real Stellar-USDC amount → internal transfer to Binance TR → sell USDC/TRY.
- [ ] Withdraw TRY to a Turkish IBAN (FAST). Time the **72h first-withdrawal hold** and note the $3k/day cap.
- **Success:** Stellar-USDC reached a Turkish bank account as TRY (minus the documented holds).

**C. (Optional) Bridge exchange (Path 3 real leg):**
- [ ] Once Spike #4 proves CCTP on testnet, do one small mainnet CCTP bridge Stellar→Tron, deposit TRC-20 USDC to BTCTurk/Paribu, sell to TRY, withdraw. Confirm the exchange accepts the bridged USDC.

---

## 4. Phase 2 — decision

Pick the **v1 default off-ramp** based on Phase 1 results, by this priority:
1. If **KAST** clears (direct Stellar funding + TR + TRY spend) → make it the default "spend" path; it's the cleanest recipient UX (no bank, no exchange).
2. Else if **Binance** clears → default "cash to bank" path.
3. **CCTP (Path 3)** is the partner-independent fallback regardless — keep it built so we're never hostage to one exchange/card's policy.

Record the choice in [stack.md](stack.md) R1 and [PROGRESS.md](PROGRESS.md) §6, and only then resume feature build (apps/web claim page can show the chosen cash-out option).

---

## 5. Risks & caveats

- **Geo/policy volatility:** card + exchange Stellar-network support and TR eligibility change often and are enforced at signup by ID/IP. Always verify in-app before relying on a path.
- **MASAK:** ~$3k/day, $50k/mo on the crypto leg + 72h first-withdrawal / 48h subsequent holds. "Instantly spendable" is false on first cash-out; design the UX to set this expectation (KAST card spending sidesteps the bank-withdrawal hold).
- **Mainnet CCTP addresses:** pull the live mainnet C-strings from `developers.circle.com/cctp/references/stellar-contracts` before any mainnet deploy.
- **Coverage gap:** US-based research under-indexes Turkish-language docs; treat Phase 1 as the source of truth over any web claim.

---

## 6. Sources
- CCTP on Stellar: https://stellar.org/blog/foundation-news/circle-cctp-is-live-on-stellar · https://developers.circle.com/cctp/quickstarts/transfer-usdc-stellar-arc · https://developers.circle.com/cctp/references/stellar · https://github.com/circlefin/stellar-cctp · https://developers.circle.com/cctp/concepts/supported-chains-and-domains
- Cards: https://www.cryptocardhub.com/card/kast-card · https://www.cryptocardhub.com/cards/turkey
- Off-ramp / MASAK: https://www.binance.com/en/support/announcement/binance-completes-the-integration-of-usd-coin-usdc-on-stellar-network-opens-deposits-and-withdrawals-a5d9a47c65d0453e8740ffc8e455a8e7 · https://www.ainvest.com/news/turkey-imposes-3-000-daily-limit-stablecoin-transfers-curb-fraud-2506/
