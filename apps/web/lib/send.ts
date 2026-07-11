/**
 * Client-side onward-send — the second turn of the loop (Stage 5). A recipient who
 * claimed holds a sponsored 0-XLM account with USDC; to send onward they create a
 * dual-predicate Claimable Balance. Since they hold 0 XLM, the sponsor sponsors the
 * reserve (begin/end sandwich) and fee-bumps — proven by Spike #5.
 *
 * The client builds + signs the send inner tx (create + end, sender-sourced; the
 * begin op is sponsor-sourced and gets the sponsor's signature server-side), POSTs
 * it to /send-link, and builds the claim link from the returned balanceId + a fresh
 * bearer key. No seed leaves the Signer.
 */
import {
  Asset,
  BASE_FEE,
  Claimant,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import type { Signer } from "./signer";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const NETWORK = Networks.TESTNET;
const RECLAIM_AFTER_SECONDS = (7 * 24 * 60 * 60).toString(); // money comes back after 7 days

export interface SendResult {
  link: string;
  balanceId: string;
  hash: string;
}

async function postJson(url: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${new URL(url).pathname} → ${res.status}: ${text}`);
  return JSON.parse(text) as Record<string, unknown>;
}

export async function createSendLink(opts: {
  sponsorUrl: string;
  signer: Signer;
  /** amount of USDC to send (the sender's own balance) */
  amount: string;
  /** the sender's display name — shown as "<from> sent you money" on the claim page */
  from: string;
  /** origin to build the claim link against (e.g. window.location.origin) */
  webOrigin: string;
}): Promise<SendResult> {
  const base = opts.sponsorUrl.replace(/\/$/, "");
  const health = (await (await fetch(`${base}/health`)).json()) as {
    sponsorPublicKey: string;
    usdcIssuer: string;
    usdcCode: string;
  };
  const USDC = new Asset(health.usdcCode, health.usdcIssuer);
  const sender = opts.signer.publicKey();
  const bearer = Keypair.random();

  const server = new Horizon.Server(HORIZON_URL);
  const acc = await server.loadAccount(sender);
  const claimants = [
    new Claimant(bearer.publicKey(), Claimant.predicateUnconditional()),
    new Claimant(sender, Claimant.predicateNot(Claimant.predicateBeforeRelativeTime(RECLAIM_AFTER_SECONDS))),
  ];
  const inner = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK })
    .addOperation(Operation.beginSponsoringFutureReserves({ sponsoredId: sender, source: health.sponsorPublicKey }))
    .addOperation(Operation.createClaimableBalance({ asset: USDC, amount: opts.amount, claimants, source: sender }))
    .addOperation(Operation.endSponsoringFutureReserves({ source: sender }))
    .setTimeout(180)
    .build();
  await opts.signer.sign(inner); // sender signs create + end

  const res = (await postJson(`${base}/send-link`, {
    xdr: inner.toXDR(),
    senderPublicKey: sender,
  })) as { hash: string; balanceId: string };

  const id = res.balanceId.slice(-8);
  const query = `a=${encodeURIComponent(opts.amount)}&s=${encodeURIComponent(opts.from)}&b=${res.balanceId}&i=${health.usdcIssuer}`;
  const link = `${opts.webOrigin.replace(/\/$/, "")}/c/${id}?${query}#${bearer.secret()}`;
  return { link, balanceId: res.balanceId, hash: res.hash };
}
