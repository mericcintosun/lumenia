/**
 * /spike/keys — browser key-lifecycle SPIKE harness (FRONTEND_PLAN build-order §9
 * step 3, the riskiest item). Owner caveat C1: HARD-GATED behind an env flag —
 * 404 unless NEXT_PUBLIC_ENABLE_SPIKE=1 — linked from nowhere, and this whole
 * app/spike/ tree is DELETED as an explicit step once the spike is measured.
 *
 * It never ships enabled to prod: the flag is unset there, so this route 404s.
 */
import { notFound } from "next/navigation";
import SpikeHarness from "./SpikeHarness";

export default function SpikeKeysPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_SPIKE !== "1") notFound();
  return <SpikeHarness />;
}
