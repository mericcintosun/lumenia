/**
 * ModelStage — tiny client wrapper so a Server Component (the /brand-kit/brand book)
 * can drop in the WebGL mascot without SSR. Static render (no idle float) to keep the
 * document page light.
 */
"use client";

import dynamic from "next/dynamic";

const MascotObject = dynamic(() => import("./MascotObject"), { ssr: false });

export default function ModelStage() {
  return <MascotObject animate={false} />;
}
