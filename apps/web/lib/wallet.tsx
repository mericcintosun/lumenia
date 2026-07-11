"use client";

/**
 * WalletProvider — the one React context the app shell hangs off (FRONTEND_PLAN §0:
 * no Zustand, one context; everything else is server/Horizon state). It exposes the
 * local account (address + custody phase) read from the keystore; the seed itself
 * never enters the context (that stays behind lib/signer.ts + lib/keystore.ts).
 * The unlocked-signer session lands in Stage 5 (send), where signing is needed.
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getRecordMeta, type Phase } from "./keystore";

export interface WalletAccount {
  address: string;
  phase: Phase;
}

interface WalletState {
  status: "loading" | "ready";
  account: WalletAccount | null;
  refresh: () => Promise<void>;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [account, setAccount] = useState<WalletAccount | null>(null);

  const refresh = useCallback(async () => {
    try {
      const meta = await getRecordMeta();
      setAccount(meta ? { address: meta.pubkey, phase: meta.phase } : null);
    } catch {
      setAccount(null);
    } finally {
      setStatus("ready");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return <WalletContext.Provider value={{ status, account, refresh }}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
