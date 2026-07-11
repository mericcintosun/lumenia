"use client";

/**
 * Browser key-lifecycle spike harness (client). Exercises the WHOLE lifecycle the
 * account pages will sit on: generate keypair → friendbot-fund → Argon2id encrypt →
 * IndexedDB persist → read-back + Argon2id decrypt → sign a REAL testnet op → submit.
 * Reports encrypt/decrypt derive time + memory so the params can be tuned on a cheap
 * Android in the WhatsApp webview (the risk: too slow, or OOM). Dev-only (C1-gated).
 */
import { useEffect, useRef, useState } from "react";
import { Buffer } from "buffer";
import {
  BASE_FEE,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { DEFAULT_ARGON, type ArgonParams } from "../../../lib/argon";
import { savePhase2, unlockPhase2, savePhase1, unlockPhase1, clearKeystore } from "../../../lib/keystore";
import { localSignerFromSeed } from "../../../lib/signer";

const HORIZON = "https://horizon-testnet.stellar.org";
const explorer = (h: string) => `https://stellar.expert/explorer/testnet/tx/${h}`;

interface Result {
  pubkey: string;
  encryptMs: number;
  decryptMs: number;
  memMiB: number;
  jsHeapMiB: number | null;
  txHash: string;
}

function jsHeapMiB(): number | null {
  const perf = performance as unknown as { memory?: { usedJSHeapSize: number } };
  return perf.memory ? Math.round(perf.memory.usedJSHeapSize / (1024 * 1024)) : null;
}

async function signRealOp(seed: Uint8Array, pubkey: string): Promise<string> {
  const server = new Horizon.Server(HORIZON);
  const account = await server.loadAccount(pubkey);
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.manageData({ name: "lumenia-spike", value: String(account.sequence).slice(-6) }))
    .setTimeout(120)
    .build();
  const signer = localSignerFromSeed(seed);
  await signer.sign(tx);
  const res = await server.submitTransaction(tx);
  return res.hash;
}

export default function SpikeHarness() {
  const [params, setParams] = useState<ArgonParams>(DEFAULT_ARGON);
  const [password, setPassword] = useState("spike-password");
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [running, setRunning] = useState(false);
  const [ua, setUa] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => setUa(navigator.userAgent), []);
  useEffect(() => {
    logRef.current?.scrollTo(0, logRef.current.scrollHeight);
  }, [log]);

  const say = (m: string) => setLog((l) => [...l, m]);

  async function runFullSpike() {
    setRunning(true);
    setResult(null);
    setLog([]);
    try {
      say(`params: ${params.memMiB} MiB · time ${params.time} · lanes ${params.parallelism}`);
      const kp = Keypair.random();
      const pubkey = kp.publicKey();
      let seed: Uint8Array | null = new Uint8Array(kp.rawSecretKey());
      say(`① keypair ${pubkey.slice(0, 8)}…${pubkey.slice(-6)}`);

      say("② friendbot funding…");
      const fb = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(pubkey)}`);
      if (!fb.ok) throw new Error(`friendbot ${fb.status} (rate-limited? that's network, retry)`);

      say("③ Argon2id encrypt + IndexedDB persist…");
      const { deriveMs: encryptMs } = await savePhase2(pubkey, seed, password, params);
      seed.fill(0); // wipe in-memory seed → the unlock MUST read from IndexedDB
      seed = null;
      say(`   encrypt derive ${Math.round(encryptMs)} ms`);

      say("④ read IndexedDB + Argon2id decrypt…");
      const un = await unlockPhase2(password);
      say(`   decrypt derive ${Math.round(un.deriveMs)} ms`);

      say("⑤ sign a REAL testnet op + submit…");
      const txHash = await signRealOp(un.seed, pubkey);
      un.seed.fill(0);
      say(`   tx ${txHash.slice(0, 12)}…`);

      setResult({
        pubkey,
        encryptMs: Math.round(encryptMs),
        decryptMs: Math.round(un.deriveMs),
        memMiB: params.memMiB,
        jsHeapMiB: jsHeapMiB(),
        txHash,
      });
      say("✅ PASS — full lifecycle on-chain");
    } catch (e) {
      say(`❌ ${(e as Error).message}`);
    } finally {
      setRunning(false);
    }
  }

  async function testPhase1() {
    setRunning(true);
    try {
      const kp = Keypair.random();
      const seed = new Uint8Array(kp.rawSecretKey());
      await savePhase1(kp.publicKey(), seed);
      seed.fill(0);
      const back = await unlockPhase1();
      const ok = Keypair.fromRawEd25519Seed(Buffer.from(back)).publicKey() === kp.publicKey();
      back.fill(0);
      say(ok ? "✅ Phase-1 (device key) round-trip OK" : "❌ Phase-1 mismatch");
    } catch (e) {
      say(`❌ phase-1: ${(e as Error).message}`);
    } finally {
      setRunning(false);
    }
  }

  const num = (v: string, min: number) => Math.max(min, Number.parseInt(v || "0", 10) || min);

  return (
    <main className="min-h-dvh bg-paper px-5 py-8 text-ink">
      <div className="mx-auto flex max-w-md flex-col gap-5">
        <header>
          <h1 className="text-xl font-bold">Key-lifecycle spike</h1>
          <p className="text-sm text-ink-soft">
            Argon2id → IndexedDB → decrypt → sign a real testnet op. Measure derive time + OOM on this device.
          </p>
        </header>

        <div className="grid grid-cols-3 gap-2">
          <label className="text-sm">
            Mem (MiB)
            <input
              type="number"
              inputMode="numeric"
              value={params.memMiB}
              onChange={(e) => setParams((p) => ({ ...p, memMiB: num(e.target.value, 8) }))}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-2"
            />
          </label>
          <label className="text-sm">
            Time
            <input
              type="number"
              inputMode="numeric"
              value={params.time}
              onChange={(e) => setParams((p) => ({ ...p, time: num(e.target.value, 1) }))}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-2"
            />
          </label>
          <label className="text-sm">
            Lanes
            <input
              type="number"
              inputMode="numeric"
              value={params.parallelism}
              onChange={(e) => setParams((p) => ({ ...p, parallelism: num(e.target.value, 1) }))}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-2"
            />
          </label>
        </div>
        <label className="text-sm">
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2"
          />
        </label>

        <button
          onClick={runFullSpike}
          disabled={running}
          className="h-14 w-full rounded-full bg-money text-base font-semibold text-primary-foreground disabled:opacity-60"
        >
          {running ? "Running…" : "Run full spike"}
        </button>
        <div className="flex gap-2">
          <button
            onClick={testPhase1}
            disabled={running}
            className="h-11 flex-1 rounded-full border border-line text-sm disabled:opacity-60"
          >
            Phase-1 test
          </button>
          <button
            onClick={() => clearKeystore().then(() => say("cleared keystore"))}
            disabled={running}
            className="h-11 flex-1 rounded-full border border-line text-sm disabled:opacity-60"
          >
            Clear keystore
          </button>
        </div>

        {result && (
          <div className="rounded-[20px] border border-line bg-surface p-4 text-sm">
            <p className="font-semibold text-money">✅ PASS</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
              <dt className="text-ink-soft">encrypt derive</dt>
              <dd className="text-right font-semibold tabular-nums">{result.encryptMs} ms</dd>
              <dt className="text-ink-soft">decrypt derive</dt>
              <dd className="text-right font-semibold tabular-nums">{result.decryptMs} ms</dd>
              <dt className="text-ink-soft">Argon mem</dt>
              <dd className="text-right tabular-nums">{result.memMiB} MiB</dd>
              <dt className="text-ink-soft">JS heap</dt>
              <dd className="text-right tabular-nums">{result.jsHeapMiB ?? "n/a"} MiB</dd>
            </dl>
            <a
              href={explorer(result.txHash)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block break-all text-xs text-ink-soft underline"
            >
              tx {result.txHash}
            </a>
          </div>
        )}

        <div
          ref={logRef}
          className="h-56 overflow-auto rounded-[20px] border border-line bg-surface p-3 font-mono text-xs leading-relaxed"
        >
          {log.length === 0 ? (
            <span className="text-ink-soft">log…</span>
          ) : (
            log.map((l, i) => <div key={i}>{l}</div>)
          )}
        </div>

        <p className="break-all text-[11px] text-ink-soft">{ua}</p>
      </div>
    </main>
  );
}
