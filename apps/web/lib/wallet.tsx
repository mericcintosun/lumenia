"use client";

/**
 * WalletProvider — the one React context the app shell hangs off (FRONTEND_PLAN §0:
 * no Zustand, one context; everything else is server/Horizon state). It exposes the
 * local account (address + custody phase) read from the keystore, and — for signing
 * (send) — an in-memory session seed set after unlock. The seed lives ONLY in memory
 * here + behind lib/signer.ts; it is never persisted in the clear and never logged.
 * v2 swaps the concrete signer without touching this shape.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getHome, listAccounts, unlockPhase1, type Phase } from "./keystore";
import { localSignerFromSeed, type Signer } from "./signer";

export interface WalletAccount {
  address: string;
  phase: Phase;
}

interface WalletState {
  status: "loading" | "ready";
  /** The ONE persistent home account — the address the app sends from + shows as identity. */
  account: WalletAccount | null;
  /**
   * Every stored account (home + any not-yet-swept throwaways). /home uses this to
   * consolidate incoming money into home and to sum ONE total balance. The user never
   * sees "account 1 / account 2" — this is plumbing, not UI.
   */
  accounts: WalletAccount[];
  /** true once a Phase-2 account has been unlocked this session (a signer is available). */
  unlocked: boolean;
  refresh: () => Promise<void>;
  /** hold the decrypted seed for the session (called by /unlock after a Phase-2 decrypt). */
  setSessionSeed: (seed: Uint8Array) => void;
  /**
   * A ready-to-use signer for the local account. Phase 1 unwraps the device key
   * inline; Phase 2 uses the session seed (throws if not yet unlocked — the caller
   * routes to /unlock). The seed never leaves this module.
   */
  getSigner: () => Promise<Signer>;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [unlocked, setUnlocked] = useState(false);
  const sessionSeed = useRef<Uint8Array | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [home, all] = await Promise.all([getHome(), listAccounts()]);
      setAccount(home ? { address: home.pubkey, phase: home.phase } : null);
      setAccounts(all.map((a) => ({ address: a.pubkey, phase: a.phase })));
    } catch {
      setAccount(null);
      setAccounts([]);
    } finally {
      setStatus("ready");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setSessionSeed = useCallback((seed: Uint8Array) => {
    sessionSeed.current = seed;
    setUnlocked(true);
  }, []);

  const getSigner = useCallback(async (): Promise<Signer> => {
    if (!account) throw new Error("no local account");
    let signer: Signer;
    if (account.phase === 1) {
      // Unlock the HOME account specifically (defaults to home, pinned for clarity).
      const seed = await unlockPhase1(account.address);
      signer = localSignerFromSeed(seed);
      seed.fill(0);
    } else {
      if (!sessionSeed.current) throw new Error("locked");
      signer = localSignerFromSeed(sessionSeed.current);
    }
    // The unlocked seed MUST derive the account we think we are signing for. If it
    // doesn't (a corrupted keystore, a swapped record), fail loud rather than sign a
    // transaction for the wrong account.
    if (signer.publicKey() !== account.address) {
      throw new Error("unlocked key does not match this account");
    }
    return signer;
  }, [account]);

  return (
    <WalletContext.Provider value={{ status, account, accounts, unlocked, refresh, setSessionSeed, getSigner }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
