/**
 * ScrubHero — the Apple-style scroll-scrub hero (section 1 of the §12 narrative). A 536-frame
 * WebP image sequence is drawn to <canvas> as you scroll (zero decode jank; 60fps
 * motion-interpolated) while the subtraction beats ("No wallet. / No seed phrase. / No app. /
 * Just a link.") fade over it. The frame preload waits for a sign the visitor is actually here
 * (see the note above the preload effect). Reduced-motion falls back to the looping reel video.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { clamp } from "./utils";

const N = 536; // frame count (f_001..f_536) — reel motion-interpolated to 60fps
export const SCRUB_VH = 560; // pinned section height; scrollable = SCRUB_VH - 100
const framePath = (i: number) => `/brand-kit-assets/opening-frames/f_${String(i).padStart(3, "0")}.webp`;

// Headline beats — the "subtraction". {a,b,c,d} = progress ramp: 0→1 over [a,b], hold [b,c], 1→0 over [c,d].
const BEATS = [
  { text: "No wallet.", a: 0.05, b: 0.11, c: 0.18, d: 0.24 },
  { text: "No seed phrase.", a: 0.25, b: 0.31, c: 0.38, d: 0.44 },
  { text: "No app.", a: 0.45, b: 0.51, c: 0.57, d: 0.63 },
  { text: "Just a link.", a: 0.66, b: 0.73, c: 0.80, d: 0.86 },
];

function beatOpacity(p: number, b: (typeof BEATS)[number]) {
  if (p < b.a || p > b.d) return 0;
  if (p < b.b) return (p - b.a) / (b.b - b.a);
  if (p > b.c) return 1 - (p - b.c) / (b.d - b.c);
  return 1;
}

export function ScrubHero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const beatRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const [pct, setPct] = useState(0);
  const [ready, setReady] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Preload + decode all frames — deferred until the visitor shows they are actually here.
  //
  // This is 536 frames / ~10.5 MB: real money on a phone. It used to start on requestIdleCallback
  // (timeout 2500), which fires DURING load — 536 requests would flood the connection and everything
  // else queued behind them. It cost the wordmark, a 7.5 KB SVG, an LCP of 24.3 s.
  //
  // So the trigger is now intent, not a timer: the first pointer move, wheel, touch, key or scroll.
  // Anyone who reaches the scrub has crossed a full viewport of greeting first, so the head start is
  // still there — and someone who lands, reads, and leaves never pays for frames they never saw.
  // (A side effect worth naming: automated audits neither move nor scroll, so they no longer measure
  // a 10 MB download the visitor would not have paid for at that moment either.)
  useEffect(() => {
    if (reduce) return;
    let cancelled = false;
    let started = false;
    const imgs: HTMLImageElement[] = new Array(N);
    let done = 0;
    const bump = () => {
      done += 1;
      if (!cancelled) setPct(Math.round((done / N) * 100));
      if (done === N && !cancelled) setReady(true);
    };
    const INTENT = ["pointermove", "wheel", "touchstart", "keydown", "scroll"] as const;
    const startLoad = () => {
      if (started || cancelled) return;
      started = true;
      INTENT.forEach((e) => window.removeEventListener(e, startLoad));
      for (let i = 0; i < N; i++) {
        const img = new Image();
        img.decoding = "async";
        // Low priority: the reel must always yield to the wordmark, the mascot and the CSS.
        img.fetchPriority = "low";
        img.src = framePath(i + 1);
        const finish = () => {
          if (typeof img.decode === "function") img.decode().then(bump, bump);
          else bump();
        };
        if (img.complete) finish();
        else {
          img.onload = finish;
          img.onerror = bump;
        }
        imgs[i] = img;
      }
      framesRef.current = imgs;
    };
    INTENT.forEach((e) => window.addEventListener(e, startLoad, { passive: true, once: true }));
    return () => {
      cancelled = true;
      INTENT.forEach((e) => window.removeEventListener(e, startLoad));
    };
  }, [reduce]);

  // scrub loop
  useEffect(() => {
    if (reduce || !ready) return;
    const canvas = canvasRef.current!;
    const section = sectionRef.current!;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    let raf = 0;
    let lastIdx = -1;
    let cssW = 0;
    let cssH = 0;

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssW = canvas.clientWidth;
      cssH = canvas.clientHeight;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lastIdx = -1;
    };

    const draw = (idx: number) => {
      const img = framesRef.current[idx];
      if (!img || !img.width) return;
      const ir = img.width / img.height;
      const cr = cssW / cssH;
      let dw: number, dh: number, dx: number, dy: number;
      if (cr > ir) {
        dw = cssW;
        dh = cssW / ir;
        dx = 0;
        dy = (cssH - dh) / 2;
      } else {
        dh = cssH;
        dw = cssH * ir;
        dx = (cssW - dw) / 2;
        dy = 0;
      }
      ctx.drawImage(img, dx, dy, dw, dh);
    };

    const tick = () => {
      const vh = window.innerHeight;
      const total = section.offsetHeight - vh;
      const top = section.getBoundingClientRect().top;
      const p = clamp(total > 0 ? -top / total : 0);
      const idx = Math.round(p * (N - 1));
      if (idx !== lastIdx) {
        draw(idx);
        lastIdx = idx;
      }
      let maxBeat = 0;
      for (let k = 0; k < BEATS.length; k++) {
        const o = beatOpacity(p, BEATS[k]);
        const el = beatRefs.current[k];
        if (el) {
          el.style.opacity = String(o);
          el.style.transform = `translateY(${(1 - o) * 14}px)`;
        }
        if (o > maxBeat) maxBeat = o;
      }
      if (scrimRef.current) scrimRef.current.style.opacity = String(maxBeat * 0.42);
      if (cueRef.current) cueRef.current.style.opacity = String(clamp(1 - p / 0.04));
      raf = requestAnimationFrame(tick);
    };

    size();
    draw(0);
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", size);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
    };
  }, [ready, reduce]);

  if (reduce) {
    return (
      <section className="op-reduce">
        <video poster="/brand-kit-assets/bg-hero.webp" autoPlay loop muted playsInline preload="none" className="op-reduce-v">
          <source src="/brand-kit-assets/video/bg-hero-bloom.webm" type="video/webm" />
          <source src="/brand-kit-assets/video/bg-hero-bloom.mp4" type="video/mp4" />
        </video>
        <div className="op-reduce-copy">
          <h1>No wallet. No seed phrase. No app.</h1>
          <p>Just a link.</p>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="op-scrub" style={{ height: `${SCRUB_VH}vh` }}>
      <div className="op-sticky">
        <canvas ref={canvasRef} className="op-canvas" />
        <div className="op-overlays" aria-hidden="true">
          <div ref={scrimRef} className="op-scrim" style={{ opacity: 0 }} />
          {BEATS.map((b, i) => (
            <h2
              key={b.text}
              ref={(el) => {
                beatRefs.current[i] = el;
              }}
              className="op-beat"
              style={{ opacity: 0 }}
            >
              {b.text}
            </h2>
          ))}
        </div>
        <div ref={cueRef} className="op-cue">
          Scroll <span className="op-cue-arrow">↓</span>
        </div>
        {!ready && (
          <div className="op-loader">
            <div className="op-loader-bar">
              <div className="op-loader-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="op-loader-t">{pct}%</span>
          </div>
        )}
      </div>
    </section>
  );
}
