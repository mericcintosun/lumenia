/**
 * Landing (/) — the LOCKED Periwinkle landing. Its opening IS the Apple-style scroll-scrub hero:
 * a mascot greeting (sticky) that the reel-scrub scrolls up over (the "overlay reveal"), the
 * subtraction beats ("No wallet. / No seed phrase. / No app. / Just a link.") fading over the
 * 60fps frame sequence, resolving into the headline "Money home, in a link." + the demo CTA.
 * The reel is an image sequence drawn to <canvas> (zero decode jank); reduced-motion falls back
 * to the looping video. Section 1 of the §12 narrative — the rest of the site follows below.
 * Sticky greeting z0, everything after in .op-over z1 (overlay-reveal, our locked transition).
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, useScroll, useTransform, type MotionValue } from "motion/react";
import SmoothScroll from "../../components/brand/SmoothScroll";

const N = 536; // frame count (f_001..f_536) — reel motion-interpolated to 60fps
const SCRUB_VH = 560; // pinned section height; scrollable = SCRUB_VH - 100
const framePath = (i: number) => `/brand-kit-assets/opening-frames/f_${String(i).padStart(3, "0")}.webp`;

// Headline beats — the "subtraction". {a,b,c,d} = progress ramp: 0→1 over [a,b], hold [b,c], 1→0 over [c,d].
const BEATS = [
  { text: "No wallet.", a: 0.05, b: 0.11, c: 0.18, d: 0.24 },
  { text: "No seed phrase.", a: 0.25, b: 0.31, c: 0.38, d: 0.44 },
  { text: "No app.", a: 0.45, b: 0.51, c: 0.57, d: 0.63 },
  { text: "Just a link.", a: 0.66, b: 0.73, c: 0.80, d: 0.86 },
];

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
function beatOpacity(p: number, b: (typeof BEATS)[number]) {
  if (p < b.a || p > b.d) return 0;
  if (p < b.b) return (p - b.a) / (b.b - b.a);
  if (p > b.c) return 1 - (p - b.c) / (b.d - b.c);
  return 1;
}

function ScrubHero() {
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

  // preload + decode all frames
  useEffect(() => {
    if (reduce) return;
    let cancelled = false;
    const imgs: HTMLImageElement[] = new Array(N);
    let done = 0;
    const bump = () => {
      done += 1;
      if (!cancelled) setPct(Math.round((done / N) * 100));
      if (done === N && !cancelled) setReady(true);
    };
    for (let i = 0; i < N; i++) {
      const img = new Image();
      img.decoding = "async";
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
    return () => {
      cancelled = true;
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
        <video poster="/brand-kit-assets/story-2-travel.webp" autoPlay loop muted playsInline className="op-reduce-v">
          <source src="/brand-kit-assets/video/lumenia-story-reel.webm" type="video/webm" />
          <source src="/brand-kit-assets/video/lumenia-story-reel.mp4" type="video/mp4" />
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

function Greeting() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLDivElement>(null);

  // Ambient "lumen" particle field + mouse-parallax depth.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const PN = 46;
    const parts = Array.from({ length: PN }, (_, i) => ({
      x: Math.random(), y: Math.random(), r: rnd(0.8, 2.8), sp: rnd(4, 15),
      sway: rnd(0, Math.PI * 2), swAmp: rnd(4, 15), a: rnd(0.05, 0.4),
      tw: rnd(0, Math.PI * 2), twSp: rnd(0.4, 1.3), star: i % 6 === 0,
    }));
    let w = 0, h = 0, raf = 0, last = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onLeave = () => { tx = 0; ty = 0; };
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const dot = (px: number, py: number, r: number, alpha: number, star: boolean) => {
      const g = ctx.createRadialGradient(px, py, 0, px, py, r * 4);
      g.addColorStop(0, `rgba(110,95,206,${alpha})`);
      g.addColorStop(1, "rgba(110,95,206,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(px, py, r * 4, 0, Math.PI * 2); ctx.fill();
      if (star) {
        ctx.strokeStyle = `rgba(123,108,222,${alpha * 0.85})`;
        ctx.lineWidth = 0.9;
        const L = r * 4.6;
        ctx.beginPath();
        ctx.moveTo(px - L, py); ctx.lineTo(px + L, py);
        ctx.moveTo(px, py - L); ctx.lineTo(px, py + L);
        ctx.stroke();
      }
    };
    const parallax = () => {
      cx += (tx - cx) * 0.07; cy += (ty - cy) * 0.07;
      canvas.style.transform = `translate(${cx * -8}px, ${cy * -8}px)`;
      if (bgRef.current) bgRef.current.style.transform = `translate(${cx * -16}px, ${cy * -16}px)`;
      if (bubbleRef.current) bubbleRef.current.style.transform = `translate(${cx * 7}px, ${cy * 7}px)`;
      if (mascotRef.current) mascotRef.current.style.transform = `translate(${cx * 16}px, ${cy * 16}px)`;
    };
    const frame = (t: number) => {
      if (!last) last = t;
      const dt = Math.min((t - last) / 1000, 0.05); last = t;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.y -= (p.sp / h) * dt;
        if (p.y < -0.03) { p.y = 1.03; p.x = Math.random(); }
        const px = p.x * w + Math.sin(p.sway + t / 1400) * p.swAmp;
        const alpha = Math.max(0, p.a * (0.55 + 0.45 * Math.sin(p.tw + (t / 1000) * p.twSp)));
        dot(px, p.y * h, p.r, alpha, p.star);
      }
      parallax();
      raf = requestAnimationFrame(frame);
    };
    size();
    window.addEventListener("resize", size);
    if (reduce) {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) dot(p.x * w, p.y * h, p.r, p.a * 0.7, p.star);
    } else {
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerout", onLeave);
      raf = requestAnimationFrame(frame);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onLeave);
    };
  }, []);

  return (
    <section className="op-greet">
      <canvas ref={canvasRef} className="op-particles" aria-hidden="true" />
      <div ref={bgRef} className="op-bg-layer" aria-hidden="true">
        <span className="op-bigspark" />
        <div className="op-glow-back" />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="op-brandlogo" src="/brand-kit-assets/logo-wordmark-t.svg" alt="Lumenia" />
      <div className="op-greet-stage">
        <div ref={bubbleRef} className="op-px-bubble">
          <div className="op-bubble">
            <div className="op-bubble-top">
              <span className="op-bubble-spark" aria-hidden="true" />
              <span className="op-bubble-name">Lumenia</span>
              <span className="op-bubble-time">now</span>
            </div>
            <p className="op-bubble-text">Hey — I&rsquo;ve got a message for you.</p>
            <span className="op-bubble-tail" />
          </div>
        </div>
        <div ref={mascotRef} className="op-px-mascot">
          <div className="op-mascot-wrap">
            <span className="op-mascot-halo" aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="op-mascot" src="/brand-kit-assets/mascot-messenger-cut.webp" alt="The Lumenia messenger, holding an envelope" />
            <span className="op-envglow" aria-hidden="true" />
            <span className="op-groundpool" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
}

// Section 2 — the four fears (brand.md §2), named then killed. The worry is struck through
// on scroll (the subtraction motif), then the calm answer resolves. Narrative, not a grid.
const FEARS = [
  {
    worry: "“I don’t even have a wallet — how would I receive it?”",
    lead: "You don’t need one.",
    rest: "Tap the link and the money is already there — no wallet, not now, not ever.",
  },
  {
    worry: "“What if I lose the twelve words?”",
    lead: "There are no twelve words.",
    rest: "You claim with your face or a password you choose. Nothing to write down, nothing to lose.",
  },
  {
    worry: "“I tap a link and money appears? That isn’t real.”",
    lead: "It’s real.",
    rest: "The money waits on a public ledger the moment the link is made — tapping it just hands it to you.",
  },
  {
    worry: "“What if it gets lost — is it safe?”",
    lead: "It sits in escrow only you can open",
    rest: "— or the sender, after seven days. Every transfer is publicly checkable, and we never hold it.",
  },
];

function FearBeat({ worry, lead, rest, i }: { worry: string; lead: string; rest: string; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.55 });
  return (
    <div ref={ref} className={`fear ${i % 2 ? "fear-r" : "fear-l"}${inView ? " in" : ""}`}>
      <p className="fear-worry">{worry}</p>
      <p className="fear-answer">
        <strong>{lead}</strong> {rest}
      </p>
    </div>
  );
}

function Fears() {
  return (
    <section className="fears">
      <div className="fears-inner">
        <div className="fears-head">
          <motion.p
            className="fears-eyebrow"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.8 }}
          >
            <span className="fears-dot" />
            The part that scares people
          </motion.p>
          <motion.h2
            className="fears-title"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
          >
            Four walls. We take them down.
          </motion.h2>
        </div>
        <div className="fears-list">
          {FEARS.map((f, i) => (
            <FearBeat key={f.worry} {...f} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

// Section 3 — "the moment": the 3D world gives way to a real human beat (brand.md §12.3).
// A treated photograph (hands + a lavender-lit phone in warm light) with the copy over a
// periwinkle scrim — human relief, the payoff after the wall is gone.
function Moment() {
  return (
    <section className="moment">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="moment-img"
        src="/brand-kit-assets/moment-hands.webp"
        alt="Two people at a sunlit table; one holds a phone glowing softly as money arrives"
      />
      <div className="moment-scrim" aria-hidden="true" />
      <motion.div
        className="moment-copy"
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <p className="moment-eyebrow">The moment</p>
        <h2 className="moment-h">It&rsquo;s already theirs.</h2>
        <p className="moment-p">
          No form to fill. No account to make. No wait. Someone you love taps the link — and the
          money is simply there, in their hands.
        </p>
      </motion.div>
    </section>
  );
}

// Section 4 — "how it works": a pinned scroll story. Four story videos crossfade on the right
// while a progress rail + step copy advance on the left (ported from /brand-kit/story). No "01/02"
// numeral rails (brand.md §8) — just titles and the filling rail. Scroll ranges stay in [0,1].
const HIW = [
  { vid: "/brand-kit-assets/video/story-1.mp4", poster: "/brand-kit-assets/story-1-share.webp", t: "You send a link.", b: "Choose an amount and share it in a chat, like anything else. That’s the whole transfer." },
  { vid: "/brand-kit-assets/video/story-2.mp4", poster: "/brand-kit-assets/story-2-travel.webp", t: "It’s on its way.", b: "The money moves into escrow on a public ledger — held safely, never by us." },
  { vid: "/brand-kit-assets/video/story-3.mp4", poster: "/brand-kit-assets/story-3-tap.webp", t: "They tap it.", b: "Your recipient sees the money the moment they tap — before creating anything." },
  { vid: "/brand-kit-assets/video/story-4.mp4", poster: "/brand-kit-assets/story-4-received.webp", t: "It’s theirs.", b: "They claim it with their face or a password. Receiving is free. Done." },
];

function HiwFrame({ i, step, p }: { i: number; step: (typeof HIW)[number]; p: MotionValue<number> }) {
  const c = (i + 0.5) / HIW.length;
  const w = 0.5 / HIW.length;
  const opacity = useTransform(p, [clamp(c - w - 0.02), clamp(c - w + 0.03), clamp(c + w - 0.03), clamp(c + w + 0.02)], [0, 1, 1, 0]);
  const scale = useTransform(p, [clamp(c - w - 0.05), clamp(c + w + 0.05)], [1.08, 0.98]);
  const y = useTransform(p, [clamp(c - w - 0.05), clamp(c + w + 0.05)], ["3%", "-3%"]);
  return (
    <motion.video className="hiw-fr" style={{ opacity, scale, y }} poster={step.poster} autoPlay loop muted playsInline aria-hidden="true">
      <source src={step.vid.replace(/\.mp4$/, ".webm")} type="video/webm" />
      <source src={step.vid} type="video/mp4" />
    </motion.video>
  );
}

function HiwStep({ i, step, p }: { i: number; step: (typeof HIW)[number]; p: MotionValue<number> }) {
  const c = (i + 0.5) / HIW.length;
  const opacity = useTransform(p, [clamp(c - 0.16), c, clamp(c + 0.16)], [0.3, 1, 0.3]);
  return (
    <motion.div className="hiw-strow" style={{ opacity }}>
      <h3 className="hiw-stt">{step.t}</h3>
      <p className="hiw-stb">{step.b}</p>
    </motion.div>
  );
}

function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const railFill = useTransform(scrollYProgress, [0.06, 0.94], ["0%", "100%"]);
  return (
    <section className="hiw" ref={ref}>
      <div className="hiw-sticky">
        <div className="hiw-copy">
          <p className="hiw-eyebrow"><span className="hiw-dot" />How it works</p>
          <h2 className="hiw-title">A transfer, start to finish.</h2>
          <div className="hiw-list">
            <div className="hiw-rail"><motion.div className="hiw-rail-fill" style={{ height: railFill }} /></div>
            <div className="hiw-rows">
              {HIW.map((s, i) => (
                <HiwStep key={s.t} i={i} step={s} p={scrollYProgress} />
              ))}
            </div>
          </div>
          <Link href="/how-it-works" className="hiw-more">See a real transfer, verified →</Link>
        </div>
        <div className="hiw-frames">
          <div className="hiw-frwrap">
            {HIW.map((s, i) => (
              <HiwFrame key={s.t} i={i} step={s} p={scrollYProgress} />
            ))}
            <div className="hiw-frglow" />
          </div>
        </div>
      </div>
    </section>
  );
}

// Section 5 — proof + Stellar (brand.md §12.4/§4.4). The ONE strip where the chain is named
// with pride, on the Stellar-dark palette (navy + Stellar yellow + lavender). A real, tappable
// on-chain receipt (real testnet tx from /how-it-works) + the SCF trust seal. No mock data (§8).
const PROOF_TX = "b9ef1844c6ca2df732648b965a2f991ba0197643057b2c9e2a60ab52c3e23746";
const PROOF_URL = `https://stellar.expert/explorer/testnet/tx/${PROOF_TX}`;
const PROOF_SHORT = "b9ef1844…c3e23746";

function Proof() {
  return (
    <section className="proof">
      <div className="proof-inner">
        <motion.div
          className="proof-copy"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <p className="proof-eyebrow">Proof, not promises</p>
          <h2 className="proof-h">Don’t take our word for it.</h2>
          <p className="proof-p">
            Every transfer is written to <strong>Stellar</strong> — a public ledger no single
            company controls. We can’t hide it, freeze it, or quietly change it. Open any transfer
            and check it yourself.
          </p>
          <span className="proof-seal">
            <span className="proof-seal-star" aria-hidden="true" />
            Backed by the Stellar Community Fund
          </span>
        </motion.div>

        <motion.a
          className="proof-receipt"
          href={PROOF_URL}
          target="_blank"
          rel="noreferrer"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.12, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <div className="proof-rc-top">
            <span className="proof-rc-label">Public receipt</span>
            <span className="proof-rc-net">Stellar · test network</span>
          </div>
          <p className="proof-rc-what">
            20 USDC landed in a brand-new account holding 0 XLM — claimed walletless, no gas paid by
            the recipient.
          </p>
          <div className="proof-rc-hash">
            <span className="proof-rc-k">tx</span>
            <span className="proof-rc-v">{PROOF_SHORT}</span>
          </div>
          <span className="proof-rc-cta">
            Verify on Stellar <span className="proof-rc-arrow">→</span>
          </span>
        </motion.a>
      </div>
    </section>
  );
}

// Section 6 — trust + FAQ. The comms-approved §6 copy, re-skinned to Periwinkle. Trust is a
// narrative essay (not a card grid, brand.md §8); the FAQ is a native <details> accordion.
const TRUST_POINTS = [
  { lead: "Not with us.", body: "The moment you send, your money moves into escrow on a public ledger — a shared record no single company controls, where every transfer can be independently verified. Lumenia never holds your money, so we can’t lend it, invest it, or lose it. Our system only does two jobs: it sets up your recipient’s account, and it pays the network’s operating costs so your recipient doesn’t have to." },
  { lead: "Only two people can move it.", body: "Your recipient can claim it. And if they don’t within 7 days, you can take it back. Nobody else — including us." },
  { lead: "Every claim is checkable.", body: "Each transfer produces a public record. We don’t ask you to believe this page; you can verify it." },
  { lead: "What we are not.", body: "Lumenia is not a bank and doesn’t want to be one. We don’t take deposits, we don’t pay interest, and your money is not sitting in an account with our name on it. We move money from you to someone you love, and then we get out of the way." },
];

const FAQ = [
  { q: "What if I lose the link, or send it to the wrong chat?", a: "Treat a money link like cash in an envelope: whoever holds it can claim it, so share it in a private message with the person it’s for. If it goes wrong — wrong chat, lost phone — don’t panic: if nobody has claimed it, the money automatically becomes reclaimable by you after 7 days. Once someone claims it, though, it’s claimed — exactly like handing over cash." },
  { q: "Is this a bank?", a: "No — and that’s deliberate. Banks hold your money; we never do. When you send with Lumenia, the money sits in escrow on a public ledger until your recipient claims it. That means no deposit insurance, because there’s no deposit — and no bank, because there’s nothing we’re holding. We’re a way to move money, not a place to bank it." },
  { q: "What does it cost?", a: "During the pilot: nothing. Receiving will always be free — your recipient never pays to accept money, and we cover the small network cost behind the scenes. When we introduce a sending fee, it will be a single number shown to you before you confirm, never deducted from what your recipient gets." },
  { q: "What does my recipient actually need?", a: "A phone with a browser. That’s the whole list. No app, no account beforehand, no ID upload to see the money. They tap the link, see the amount, and claim it with their face or a password they choose." },
  { q: "The money is “held in dollars” — what does that mean?", a: "It means the amount doesn’t wobble with crypto markets or shrink in a volatile currency while it waits. Your recipient can hold it as dollars and send it onward whenever they like. It is not a savings product: it earns nothing, and we’d be suspicious of anyone who told you otherwise." },
  { q: "Can my recipient turn it into lira in their bank account?", a: "Not inside Lumenia yet — we’re honest about that. Cash-out will be handled through licensed local partners, and we’ll ship it when it’s genuinely reliable, not before. Today, recipients can hold dollars and send money onward to others." },
  { q: "What happens if Lumenia disappears tomorrow?", a: "Your money doesn’t, because we never had it. It lives on a public ledger under your recipient’s control (or yours, for unclaimed links). This is the single most important design decision we made, and it’s the reason this FAQ answer can exist." },
  { q: "Is this real, or a demo?", a: "Both, honestly. The technology is live and every claim in this page’s proof is backed by real, publicly verifiable transfers — currently on a test network with test money. We’d rather show you a working pilot and say so plainly than launch quietly with your rent money." },
];

function Trust() {
  return (
    <section className="trust">
      <div className="trust-inner">
        <motion.div
          className="trust-essay"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <p className="trust-eyebrow"><span className="trust-dot" />The honest answer</p>
          <h2 className="trust-h">Where is my money, exactly?</h2>
          <p className="trust-intro">Fair question. Here’s the honest answer:</p>
          <div className="trust-points">
            {TRUST_POINTS.map((p) => (
              <p key={p.lead} className="trust-point">
                <strong>{p.lead}</strong> {p.body}
              </p>
            ))}
          </div>
        </motion.div>

        <div className="faq">
          <h2 className="faq-h">Questions</h2>
          <div className="faq-list">
            {FAQ.map((f) => (
              <details key={f.q} className="faq-item">
                <summary className="faq-q">
                  {f.q}
                  <span className="faq-mark" aria-hidden="true" />
                </summary>
                <p className="faq-a">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Section 7 — close CTA band (over the bg-cta living video) + the Periwinkle footer.
function CloseCTA() {
  return (
    <section className="close">
      <video className="close-bg" autoPlay loop muted playsInline aria-hidden="true">
        <source src="/brand-kit-assets/video/bg-cta.webm" type="video/webm" />
        <source src="/brand-kit-assets/video/bg-cta.mp4" type="video/mp4" />
      </video>
      <div className="close-scrim" aria-hidden="true" />
      <motion.div
        className="close-copy"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <h2 className="close-h">See it for yourself.</h2>
        <p className="close-p">
          The demo mints a real money link — no wallet, no signup, no gas. Or join the waitlist and
          we’ll tell you the moment it’s live for real.
        </p>
        <div className="close-cta">
          <Link href="/demo" className="op-btn op-btn-primary">Try the live demo</Link>
          <Link href="/waitlist" className="op-btn op-btn-ghost">Join the waitlist</Link>
        </div>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="foot">
      <div className="foot-inner">
        <div className="foot-brand">
          <span className="foot-logo">Lumenia</span>
          <p className="foot-tag">Money home, without the ordeal.</p>
        </div>
        <nav className="foot-nav">
          <div className="foot-col">
            <span className="foot-ct">Product</span>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/demo">Live demo</Link>
            <Link href="/waitlist">Waitlist</Link>
          </div>
          <div className="foot-col">
            <span className="foot-ct">Company</span>
            <Link href="/about">About</Link>
            <Link href="/roadmap">Roadmap</Link>
            <Link href="/developers">Developers</Link>
          </div>
          <div className="foot-col">
            <span className="foot-ct">Legal</span>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </nav>
      </div>
      <div className="foot-bottom">
        <span>Your money is never ours. That’s the point.</span>
        <span className="foot-seal">
          <span className="foot-seal-star" aria-hidden="true" />
          Backed by the Stellar Community Fund
        </span>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <SmoothScroll>
      <div className="op">
        <style>{CSS}</style>
        <Greeting />
        <div className="op-over">
          <ScrubHero />
          {/* Hero resolution — the subtraction settles into the promise + the real demo */}
          <section className="op-after">
            <p className="op-after-eyebrow">Nothing to set up.</p>
            <h1 className="op-after-h">Money home, in a link.</h1>
            <p className="op-after-p">
              Send money by link. They tap it and it&rsquo;s theirs — no wallet, no seed phrase, no app.
              Held in dollars until they need it.
            </p>
            <div className="op-after-cta">
              <Link href="/demo" className="op-btn op-btn-primary">Try the live demo</Link>
              <Link href="/how-it-works" className="op-btn op-btn-ghost">See how it works →</Link>
            </div>
          </section>
          <Fears />
          <Moment />
          <HowItWorks />
          <Proof />
          <Trust />
          <CloseCTA />
          <Footer />
        </div>
      </div>
    </SmoothScroll>
  );
}

const CSS = `
.op{--paper:#F5F3EF;--surface:#FBFAF8;--ink:#1E1B22;--muted:#67626E;--line:#E5DFE8;--accent:#6E5FCE;--accent-hover:#5F50C2;--on-accent:#F6F4FD;
  background:#0e0c14;color:var(--ink);font-family:"Switzer",ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.op :where(h1,h2,p){margin:0}

.op-scrub{position:relative}
.op-sticky{position:sticky;top:0;height:100vh;overflow:hidden;background:#0e0c14}
.op-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}

.op-overlays{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}
.op-scrim{position:absolute;inset:0;background:radial-gradient(60% 55% at 50% 50%, rgba(10,8,18,.9), transparent 72%)}
.op-beat{position:absolute;color:#fff;font-family:"Sentient",Georgia,serif;font-weight:600;
  font-size:clamp(38px,8vw,104px);letter-spacing:-.03em;line-height:1;text-align:center;padding:0 24px;
  text-shadow:0 4px 40px rgba(0,0,0,.35);will-change:opacity,transform}

.op-cue{position:absolute;left:50%;bottom:40px;transform:translateX(-50%);color:#fff;opacity:.9;
  font-size:13px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;display:flex;align-items:center;gap:8px;
  text-shadow:0 2px 20px rgba(0,0,0,.4)}
.op-cue-arrow{display:inline-block;animation:opbob 1.6s ease-in-out infinite}
@keyframes opbob{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}

.op-loader{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;
  background:#0e0c14;color:#EDEAF3}
.op-loader-bar{width:min(240px,60vw);height:3px;border-radius:3px;background:rgba(255,255,255,.14);overflow:hidden}
.op-loader-fill{height:100%;background:#B7ACE8;border-radius:3px;transition:width .2s ease}
.op-loader-t{font-size:12px;letter-spacing:.1em;color:#8b85a0}

.op-after{position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:0;
  padding:80px 40px;background:var(--paper);
  background-image:radial-gradient(60% 50% at 50% 42%, color-mix(in srgb,var(--accent) 12%,transparent), transparent 72%)}
.op-after-eyebrow{font-size:12.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:18px}
.op-after-h{font-family:"Sentient",Georgia,serif;font-weight:600;font-size:clamp(40px,7vw,88px);line-height:1.02;letter-spacing:-.025em;color:var(--ink);text-wrap:balance}
.op-after-p{color:var(--muted);font-size:clamp(16px,1.9vw,20px);line-height:1.55;max-width:46ch;margin-top:20px}
.op-after-cta{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;margin-top:34px}
.op-btn{display:inline-flex;align-items:center;justify-content:center;font-family:"Switzer",ui-sans-serif,sans-serif;
  font-weight:600;font-size:16px;border-radius:14px;padding:14px 26px;text-decoration:none;transition:background .18s,color .18s,transform .18s}
.op-btn-primary{background:var(--accent);color:var(--on-accent);box-shadow:0 16px 32px -16px color-mix(in srgb,var(--accent) 70%,transparent)}
.op-btn-primary:hover{background:var(--accent-hover);transform:translateY(-1px)}
.op-btn-ghost{color:var(--ink);border:1px solid var(--line);background:var(--surface)}
.op-btn-ghost:hover{border-color:color-mix(in srgb,var(--accent) 40%,var(--line));color:var(--accent)}

/* Section 2 — four fears (overlay-reveals over the pinned hero resolution) */
.fears{position:relative;z-index:2;background:var(--paper);color:var(--ink);overflow:hidden;
  padding:clamp(96px,15vh,190px) clamp(20px,6vw,64px) clamp(120px,20vh,240px);
  background-image:radial-gradient(80% 45% at 50% 0%, color-mix(in srgb,var(--accent) 9%,transparent), transparent 60%)}
.fears-inner{max-width:960px;margin:0 auto}
.fears-head{text-align:center;margin-bottom:clamp(64px,11vh,130px)}
.fears-eyebrow{display:inline-flex;align-items:center;gap:9px;font-size:12.5px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:var(--accent)}
.fears-dot{width:7px;height:7px;border-radius:50%;background:var(--accent)}
.fears-title{margin-top:16px;font-family:"Sentient",Georgia,serif;font-weight:600;font-size:clamp(30px,5vw,60px);letter-spacing:-.02em;line-height:1.04;color:var(--ink);text-wrap:balance}
.fears-list{display:flex;flex-direction:column;gap:clamp(56px,10vh,120px)}
.fear{max-width:min(640px,92%)}
.fear-l{margin-right:auto;text-align:left}
.fear-r{margin-left:auto;text-align:right}
.fear-worry{font-family:"Sentient",Georgia,serif;font-weight:500;font-size:clamp(22px,3.3vw,38px);line-height:1.18;letter-spacing:-.015em;color:var(--ink);
  text-decoration-line:line-through;text-decoration-color:transparent;text-decoration-thickness:3px;
  transition:text-decoration-color .55s ease .05s, color .55s ease .05s}
.fear.in .fear-worry{text-decoration-color:var(--accent);color:color-mix(in srgb,var(--muted) 70%,transparent)}
.fear-answer{margin-top:20px;max-width:46ch;font-family:"Switzer",ui-sans-serif,sans-serif;font-size:clamp(17px,2vw,22px);line-height:1.5;color:var(--muted);
  opacity:0;transform:translateY(12px);transition:opacity .55s ease .38s, transform .55s ease .38s}
.fear-r .fear-answer{margin-left:auto}
.fear.in .fear-answer{opacity:1;transform:none}
.fear-answer strong{color:var(--ink);font-weight:600}
@media (prefers-reduced-motion:reduce){
  .fear-worry{text-decoration-color:var(--accent);color:color-mix(in srgb,var(--muted) 70%,transparent);transition:none}
  .fear-answer{opacity:1;transform:none;transition:none}
}

/* Section 3 — the moment (treated photograph, human relief) */
.moment{position:relative;z-index:1;min-height:100vh;display:flex;align-items:center;overflow:hidden;isolation:isolate;
  padding:clamp(60px,10vh,120px) clamp(24px,7vw,96px);background:#12100f}
.moment-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2;
  animation:momentzoom 20s ease-in-out infinite alternate}
@keyframes momentzoom{from{transform:scale(1.03)}to{transform:scale(1.11)}}
.moment-scrim{position:absolute;inset:0;z-index:-1;
  background:linear-gradient(103deg, rgba(16,13,22,.92) 0%, rgba(16,13,22,.6) 28%, rgba(16,13,22,.12) 54%, transparent 72%),
    radial-gradient(72% 92% at 15% 52%, color-mix(in srgb,var(--accent) 26%,transparent), transparent 64%)}
.moment-copy{position:relative;max-width:min(540px,92%)}
.moment-eyebrow{display:inline-flex;align-items:center;gap:9px;font-size:12.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#C7BEF0}
.moment-h{margin-top:16px;font-family:"Sentient",Georgia,serif;font-weight:600;font-size:clamp(38px,6.4vw,78px);line-height:1.0;letter-spacing:-.025em;color:#fff;text-wrap:balance}
.moment-p{margin-top:20px;font-family:"Switzer",ui-sans-serif,sans-serif;font-size:clamp(16px,2vw,21px);line-height:1.55;color:rgba(246,244,253,.84);max-width:40ch}
@media (prefers-reduced-motion:reduce){.moment-img{animation:none;transform:scale(1.03)}}

/* Section 4 — how it works (pinned scroll story) */
.hiw{position:relative;z-index:1;height:460vh;background:var(--paper);color:var(--ink)}
.hiw-sticky{position:sticky;top:0;height:100vh;display:grid;grid-template-columns:0.92fr 1.08fr;gap:clamp(24px,4vw,64px);align-items:center;max-width:1240px;margin:0 auto;padding:0 clamp(20px,4vw,48px)}
@media (max-width:860px){.hiw-sticky{grid-template-columns:1fr;grid-template-rows:auto 1fr;gap:24px;padding-top:48px;padding-bottom:48px}}
.hiw-eyebrow{display:inline-flex;align-items:center;gap:9px;font-size:12.5px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:var(--accent);margin-bottom:14px}
.hiw-dot{width:7px;height:7px;border-radius:50%;background:var(--accent)}
.hiw-title{font-family:"Sentient",Georgia,serif;font-weight:600;font-size:clamp(26px,3.4vw,44px);letter-spacing:-.02em;line-height:1.04;margin-bottom:30px;text-wrap:balance}
.hiw-list{display:grid;grid-template-columns:auto 1fr;gap:22px}
.hiw-rail{width:3px;background:var(--line);border-radius:3px;position:relative;overflow:hidden}
.hiw-rail-fill{position:absolute;top:0;left:0;width:100%;background:var(--accent);border-radius:3px}
.hiw-rows{display:flex;flex-direction:column;gap:clamp(20px,3.4vh,40px)}
.hiw-strow{will-change:opacity}
.hiw-stt{font-family:"Sentient",Georgia,serif;font-weight:600;font-size:clamp(20px,2.4vw,30px);letter-spacing:-.015em;line-height:1.1}
.hiw-stb{color:var(--muted);font-size:clamp(14px,1.5vw,16px);line-height:1.55;margin-top:6px;max-width:40ch}
.hiw-more{display:inline-block;margin-top:30px;font-weight:600;font-size:15px;color:var(--accent);text-decoration:none}
.hiw-more:hover{text-decoration:underline;text-underline-offset:3px}
.hiw-frames{position:relative;height:min(74vh,620px)}
.hiw-frwrap{position:absolute;inset:0;border-radius:22px;overflow:hidden;border:1px solid var(--line);background:var(--surface);box-shadow:0 40px 80px -40px color-mix(in srgb,var(--accent) 50%,transparent)}
.hiw-fr{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;will-change:opacity,transform}
.hiw-frglow{position:absolute;inset:0;pointer-events:none;background:radial-gradient(60% 55% at 50% 45%, transparent 55%, color-mix(in srgb,var(--accent) 8%,transparent))}

/* Section 5 — proof + Stellar (the one Stellar-dark strip, brand.md §4.4) */
.proof{position:relative;z-index:1;color:#F6F7F8;overflow:hidden;
  background:radial-gradient(120% 90% at 26% 0%, #0e3a61 0%, #06182b 46%, #04101d 100%);
  padding:clamp(96px,16vh,200px) clamp(24px,7vw,90px)}
.proof-inner{max-width:1120px;margin:0 auto;display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(40px,6vw,90px);align-items:center}
@media (max-width:860px){.proof-inner{grid-template-columns:1fr;gap:40px}}
.proof-eyebrow{font-size:12.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#B7ACE8}
.proof-h{margin-top:16px;font-family:"Sentient",Georgia,serif;font-weight:600;font-size:clamp(32px,5vw,58px);line-height:1.02;letter-spacing:-.025em;color:#fff;text-wrap:balance}
.proof-p{margin-top:20px;font-family:"Switzer",ui-sans-serif,sans-serif;font-size:clamp(16px,1.9vw,20px);line-height:1.6;color:rgba(246,247,248,.78);max-width:48ch}
.proof-p strong{color:#fff;font-weight:600}
.proof-seal{display:inline-flex;align-items:center;gap:9px;margin-top:28px;font-family:"Switzer",ui-sans-serif,sans-serif;font-size:13px;font-weight:600;color:#F6F7F8;
  background:rgba(183,172,232,.12);border:1px solid rgba(183,172,232,.28);border-radius:999px;padding:8px 15px}
.proof-seal-star{width:12px;height:12px;flex:none;background:#FDDA24;clip-path:polygon(50% 0%,58% 42%,100% 50%,58% 58%,50% 100%,42% 58%,0% 50%,42% 42%)}
.proof-receipt{display:block;text-decoration:none;color:inherit;border-radius:18px;padding:24px;
  background:linear-gradient(180deg, rgba(255,255,255,.065), rgba(255,255,255,.02));border:1px solid rgba(183,172,232,.24);
  box-shadow:0 40px 80px -40px rgba(0,0,0,.6);transition:transform .2s, border-color .2s}
.proof-receipt:hover{transform:translateY(-3px);border-color:rgba(183,172,232,.5)}
.proof-rc-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
.proof-rc-label{font-family:"Switzer",ui-sans-serif,sans-serif;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#B7ACE8}
.proof-rc-net{font-family:"Switzer",ui-sans-serif,sans-serif;font-size:12px;color:rgba(246,247,248,.5)}
.proof-rc-what{font-family:"Switzer",ui-sans-serif,sans-serif;font-size:clamp(16px,1.7vw,19px);line-height:1.45;color:#F6F7F8;font-weight:500}
.proof-rc-hash{display:flex;align-items:center;gap:10px;margin-top:18px;padding:12px 14px;border-radius:10px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.06)}
.proof-rc-k{font-family:ui-monospace,SFMono-Regular,monospace;font-size:11px;color:#FDDA24;text-transform:uppercase;letter-spacing:.06em}
.proof-rc-v{font-family:ui-monospace,SFMono-Regular,monospace;font-size:13.5px;color:rgba(246,247,248,.9)}
.proof-rc-cta{display:inline-flex;align-items:center;gap:8px;margin-top:20px;font-family:"Switzer",ui-sans-serif,sans-serif;font-weight:600;font-size:15px;color:#FDDA24}
.proof-rc-arrow{transition:transform .2s}
.proof-receipt:hover .proof-rc-arrow{transform:translateX(3px)}

/* Section 6 — trust + FAQ */
.trust{position:relative;z-index:1;background:var(--paper);color:var(--ink);padding:clamp(96px,15vh,200px) clamp(20px,6vw,64px)}
.trust-inner{max-width:760px;margin:0 auto}
.trust-eyebrow{display:inline-flex;align-items:center;gap:9px;font-size:12.5px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:var(--accent)}
.trust-dot{width:7px;height:7px;border-radius:50%;background:var(--accent)}
.trust-h{margin-top:16px;font-family:"Sentient",Georgia,serif;font-weight:600;font-size:clamp(30px,4.6vw,52px);line-height:1.03;letter-spacing:-.02em;text-wrap:balance}
.trust-intro{margin-top:16px;color:var(--muted);font-size:clamp(16px,1.9vw,20px)}
.trust-points{margin-top:32px;display:flex;flex-direction:column;gap:22px;border-left:2px solid var(--accent-soft);padding-left:clamp(20px,3vw,32px)}
.trust-point{font-family:"Switzer",ui-sans-serif,sans-serif;color:var(--muted);font-size:clamp(16px,1.8vw,19px);line-height:1.6}
.trust-point strong{color:var(--ink);font-weight:600}
.faq{margin-top:clamp(72px,11vh,120px)}
.faq-h{font-family:"Sentient",Georgia,serif;font-weight:600;font-size:clamp(24px,3vw,38px);letter-spacing:-.02em}
.faq-list{margin-top:14px}
.faq-item{border-bottom:1px solid var(--line)}
.faq-q{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:20px;
  padding:22px 0;font-family:"Switzer",ui-sans-serif,sans-serif;font-weight:600;font-size:clamp(16px,1.9vw,19px);color:var(--ink)}
.faq-q::-webkit-details-marker{display:none}
.faq-item[open] .faq-q{color:var(--accent)}
.faq-mark{position:relative;flex:none;width:16px;height:16px}
.faq-mark::before,.faq-mark::after{content:"";position:absolute;background:currentColor;border-radius:2px;transition:transform .25s ease, opacity .25s ease}
.faq-mark::before{left:0;top:7px;width:16px;height:2px}
.faq-mark::after{left:7px;top:0;width:2px;height:16px}
.faq-item[open] .faq-mark::after{transform:rotate(90deg);opacity:0}
.faq-a{margin:0 0 24px;font-family:"Switzer",ui-sans-serif,sans-serif;color:var(--muted);font-size:clamp(15px,1.7vw,17px);line-height:1.6;max-width:64ch}

/* Section 7 — close CTA + footer */
.close{position:relative;z-index:1;min-height:86vh;display:flex;align-items:center;justify-content:center;text-align:center;overflow:hidden;isolation:isolate;
  padding:clamp(80px,14vh,160px) clamp(24px,6vw,64px);background:var(--paper)}
.close-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}
.close-scrim{position:absolute;inset:0;z-index:-1;background:radial-gradient(75% 75% at 50% 50%, color-mix(in srgb,var(--paper) 58%,transparent), color-mix(in srgb,var(--paper) 90%,transparent))}
.close-copy{position:relative;max-width:640px}
.close-h{font-family:"Sentient",Georgia,serif;font-weight:600;font-size:clamp(34px,6vw,68px);line-height:1.02;letter-spacing:-.025em;color:var(--ink);text-wrap:balance}
.close-p{margin:20px auto 0;font-family:"Switzer",ui-sans-serif,sans-serif;font-size:clamp(16px,1.9vw,20px);line-height:1.55;color:var(--muted);max-width:48ch}
.close-cta{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;margin-top:34px}

.foot{position:relative;z-index:1;background:#15121c;color:#EDEAF3;padding:clamp(56px,8vh,90px) clamp(24px,6vw,64px) 40px}
.foot-inner{max-width:1120px;margin:0 auto;display:grid;grid-template-columns:1.2fr 2fr;gap:clamp(40px,6vw,80px)}
@media (max-width:760px){.foot-inner{grid-template-columns:1fr;gap:36px}}
.foot-logo{font-family:"Sentient",Georgia,serif;font-weight:600;font-size:24px;color:#B7ACE8;letter-spacing:-.01em}
.foot-tag{margin-top:14px;font-family:"Sentient",Georgia,serif;font-weight:500;font-size:clamp(18px,2.2vw,24px);color:#EDEAF3;max-width:20ch;line-height:1.18}
.foot-nav{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
@media (max-width:520px){.foot-nav{grid-template-columns:repeat(2,1fr)}}
.foot-col{display:flex;flex-direction:column;gap:12px}
.foot-ct{font-family:"Switzer",ui-sans-serif,sans-serif;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8A83A0;margin-bottom:4px}
.foot-col a{font-family:"Switzer",ui-sans-serif,sans-serif;color:rgba(237,234,243,.78);text-decoration:none;font-size:15px;transition:color .18s}
.foot-col a:hover{color:#B7ACE8}
.foot-bottom{max-width:1120px;margin:clamp(48px,7vh,72px) auto 0;padding-top:24px;border-top:1px solid #2C2536;
  display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between;font-family:"Switzer",ui-sans-serif,sans-serif;font-size:13px;color:#A59DB2}
.foot-seal{display:inline-flex;align-items:center;gap:8px;color:#EDEAF3}
.foot-seal-star{width:11px;height:11px;flex:none;background:#FDDA24;clip-path:polygon(50% 0%,58% 42%,100% 50%,58% 58%,50% 100%,42% 58%,0% 50%,42% 42%)}

.op-reduce{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0e0c14}
.op-reduce-v{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.85}
.op-reduce-copy{position:relative;text-align:center;color:#fff;padding:24px;text-shadow:0 4px 40px rgba(0,0,0,.4)}
.op-reduce-copy h1{font-family:"Sentient",Georgia,serif;font-weight:600;font-size:clamp(28px,5vw,56px);letter-spacing:-.02em;line-height:1.1}
.op-reduce-copy p{font-family:"Sentient",Georgia,serif;font-size:clamp(22px,3.5vw,40px);color:#B7ACE8;margin-top:10px}

/* greeting */
.op-greet{position:sticky;top:0;z-index:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:40px 24px 0;overflow:hidden;background:var(--paper)}
.op-over{position:relative;z-index:1}
.op-particles{position:absolute;inset:-30px;width:calc(100% + 60px);height:calc(100% + 60px);z-index:0;pointer-events:none;will-change:transform}
.op-bg-layer{position:absolute;inset:0;z-index:0;pointer-events:none;will-change:transform}
.op-bigspark{position:absolute;left:50%;top:52%;transform:translate(-50%,-50%);width:min(560px,64vw);aspect-ratio:1;
  background:var(--accent);opacity:.055;filter:blur(2px);
  clip-path:polygon(50% 0%,57% 43%,100% 50%,57% 57%,50% 100%,43% 57%,0% 50%,43% 43%)}
.op-glow-back{position:absolute;left:50%;top:54%;transform:translate(-50%,-50%);width:min(820px,90vw);height:min(820px,90vw);
  border-radius:50%;background:radial-gradient(circle, color-mix(in srgb,var(--accent) 18%,transparent), transparent 60%);
  filter:blur(6px);animation:opbreath 7.5s ease-in-out infinite}
.op-brandlogo{position:absolute;top:30px;left:50%;transform:translateX(-50%);height:30px;width:auto;display:block;z-index:2;
  animation:opfadein 1s ease .15s both}
.op-greet-stage{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;
  animation:opreveal .95s cubic-bezier(.2,.75,.2,1) both}
.op-px-bubble{display:flex;justify-content:center;margin-bottom:24px;will-change:transform}
.op-px-mascot{display:flex;justify-content:center;will-change:transform}
.op-bubble{position:relative;max-width:min(500px,86vw);min-width:min(340px,80vw);
  background:linear-gradient(152deg,#7f70e4 0%,#6E5FCE 52%,#5f50c2 100%);color:#F6F4FD;
  padding:16px 24px 20px;border-radius:24px;transform-origin:bottom center;
  box-shadow:0 26px 54px -22px rgba(110,95,206,.62), 0 2px 8px rgba(78,64,168,.25), inset 0 1px 0 rgba(255,255,255,.28);
  animation:opbubble 1.05s cubic-bezier(.2,.8,.25,1) .5s both}
.op-bubble-top{display:flex;align-items:center;gap:8px;margin-bottom:8px;
  font-family:"Switzer",ui-sans-serif,sans-serif;font-size:13px;font-weight:600}
.op-bubble-spark{width:14px;height:14px;flex:none;background:#EFEBFF;
  clip-path:polygon(50% 0%,58% 42%,100% 50%,58% 58%,50% 100%,42% 58%,0% 50%,42% 42%);
  filter:drop-shadow(0 0 4px rgba(255,255,255,.7))}
.op-bubble-name{color:#fff;letter-spacing:-.01em}
.op-bubble-time{margin-left:auto;font-weight:500;font-size:12px;color:rgba(246,244,253,.62)}
.op-bubble-text{margin:0;font-family:"Switzer",ui-sans-serif,sans-serif;font-weight:500;
  font-size:clamp(19px,2.5vw,29px);line-height:1.3;letter-spacing:-.01em;color:#fff;text-align:left}
.op-bubble-tail{position:absolute;bottom:-8px;left:50%;transform:translateX(-50%) rotate(45deg);width:20px;height:20px;
  background:#5f50c2;border-radius:0 0 6px 0}
.op-mascot-wrap{position:relative;display:flex;justify-content:center}
.op-mascot-halo{position:absolute;left:50%;top:47%;transform:translate(-50%,-50%);width:80%;height:84%;z-index:0;pointer-events:none;
  border-radius:50%;background:radial-gradient(circle, color-mix(in srgb,var(--accent) 24%,transparent), transparent 64%);
  filter:blur(20px);animation:opbreath 6s ease-in-out infinite}
.op-envglow{position:absolute;left:39%;top:70%;transform:translate(-50%,-50%);width:38%;aspect-ratio:1;z-index:2;pointer-events:none;
  border-radius:50%;background:radial-gradient(circle, color-mix(in srgb,var(--accent) 62%,white), transparent 66%);
  filter:blur(7px);animation:openv 2.6s ease-in-out infinite}
.op-groundpool{position:absolute;left:50%;bottom:4%;transform:translateX(-50%);width:58%;height:32px;z-index:0;pointer-events:none;
  border-radius:50%;background:radial-gradient(ellipse at center, color-mix(in srgb,var(--accent) 32%,transparent), transparent 70%);filter:blur(8px)}
.op-mascot{position:relative;z-index:1;width:clamp(230px,32vw,392px);height:auto;display:block;margin-top:-26px;
  filter:drop-shadow(0 22px 26px rgba(110,95,206,.18));animation:opfloat 4.6s ease-in-out infinite;
  -webkit-mask-image:linear-gradient(to bottom,#000 66%,transparent 83%);mask-image:linear-gradient(to bottom,#000 66%,transparent 83%)}
@keyframes opfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-13px)}}
@keyframes opbreath{0%,100%{opacity:.68;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.06)}}
@keyframes opreveal{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes opfadein{from{opacity:0}to{opacity:1}}
@keyframes opbubble{0%{opacity:0;transform:translateY(8px) scale(.78)}55%{opacity:1;transform:translateY(0) scale(1.05)}100%{transform:translateY(0) scale(1)}}
@keyframes openv{0%,100%{opacity:.28;transform:translate(-50%,-50%) scale(.9)}50%{opacity:.85;transform:translate(-50%,-50%) scale(1.12)}}
@media (prefers-reduced-motion:reduce){.op-mascot,.op-glow-back,.op-mascot-halo,.op-greet-stage,.op-brandlogo,.op-bubble,.op-envglow{animation:none}}
`;
