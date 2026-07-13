/**
 * /brand-kit/story — the scroll-story wired to real scroll animation: Lenis smooth
 * scroll + Motion useScroll/useTransform. A pinned viewport crossfades the 4 Meshy
 * story frames (share → travel → tap → received) with a subtle ken-burns scale, while
 * a step rail brightens the active step. ISOLATED workspace route — never touches the
 * live landing or the frozen claim route. Honours prefers-reduced-motion (via Lenis +
 * Motion static fallback). Meant to port into /how-it-works later.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import SmoothScroll from "../../../components/brand/SmoothScroll";

// Scroll progress ranges must stay in [0,1] — Motion drives scroll-linked transforms
// via a WAAPI ScrollTimeline whose keyframe offsets reject values outside [0,1].
const cl = (v: number) => Math.max(0, Math.min(1, v));

const STEPS = [
  { img: "/brand-kit-assets/story-1-share.webp", vid: "/brand-kit-assets/video/story-1.mp4", n: "01", t: "You send a link.", b: "Choose an amount and share it in a chat, like anything else. That’s the whole transfer." },
  { img: "/brand-kit-assets/story-2-travel.webp", vid: "/brand-kit-assets/video/story-2.mp4", n: "02", t: "It’s on its way.", b: "The money moves into escrow on a public ledger — held safely, never by us." },
  { img: "/brand-kit-assets/story-3-tap.webp", vid: "/brand-kit-assets/video/story-3.mp4", n: "03", t: "They tap it.", b: "Your recipient sees the money the moment they tap — before creating anything." },
  { img: "/brand-kit-assets/story-4-received.webp", vid: "/brand-kit-assets/video/story-4.mp4", n: "04", t: "It’s theirs.", b: "They claim it with their face or a password. Receiving is free. Done." },
];

function Frame({ i, vid, poster, p }: { i: number; vid: string; poster: string; p: MotionValue<number> }) {
  const c = (i + 0.5) / STEPS.length;
  const w = 0.5 / STEPS.length; // half-band
  const opacity = useTransform(
    p,
    [cl(c - w - 0.02), cl(c - w + 0.03), cl(c + w - 0.03), cl(c + w + 0.02)],
    [0, 1, 1, 0],
  );
  const scale = useTransform(p, [cl(c - w - 0.05), cl(c + w + 0.05)], [1.08, 0.98]);
  const y = useTransform(p, [cl(c - w - 0.05), cl(c + w + 0.05)], ["3%", "-3%"]);
  return (
    <motion.video
      className="fr-img"
      style={{ opacity, scale, y }}
      poster={poster}
      autoPlay
      loop
      muted
      playsInline
      aria-hidden="true"
    >
      <source src={vid.replace(/\.mp4$/, ".webm")} type="video/webm" />
      <source src={vid} type="video/mp4" />
    </motion.video>
  );
}

function Step({ i, step, p }: { i: number; step: (typeof STEPS)[number]; p: MotionValue<number> }) {
  const c = (i + 0.5) / STEPS.length;
  const opacity = useTransform(p, [cl(c - 0.16), c, cl(c + 0.16)], [0.28, 1, 0.28]);
  const barScale = useTransform(p, [cl(c - 0.14), c, cl(c + 0.14)], [0.15, 1, 0.15]);
  return (
    <motion.div className="st-row" style={{ opacity }}>
      <div className="st-bar">
        <motion.div className="st-bar-fill" style={{ scaleY: barScale }} />
      </div>
      <div>
        <span className="st-n">{step.n}</span>
        <h3 className="st-t">{step.t}</h3>
        <p className="st-b">{step.b}</p>
      </div>
    </motion.div>
  );
}

function Story() {
  // Mount-safe reduced-motion check (avoids an SSR/client hydration mismatch): server
  // and first client render are identical (animated); a reduced-motion client swaps to
  // the static version after mount.
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(m.matches);
    const h = () => setReduce(m.matches);
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, []);
  return reduce ? <StaticStory /> : <AnimatedStory />;
}

function StaticStory() {
  return (
    <section className="story-static">
      <p className="eyebrow"><span className="dot" />How it works</p>
      {STEPS.map((s) => (
        <div key={s.n} className="ss-step">
          <div className="ss-frame">
            <video poster={s.img} autoPlay loop muted playsInline className="ss-img">
              <source src={s.vid.replace(/\.mp4$/, ".webm")} type="video/webm" />
              <source src={s.vid} type="video/mp4" />
            </video>
          </div>
          <div>
            <span className="st-n">{s.n}</span>
            <h3 className="st-t">{s.t}</h3>
            <p className="st-b">{s.b}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

function AnimatedStory() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const railFill = useTransform(scrollYProgress, [0.06, 0.94], ["0%", "100%"]);

  return (
    <section className="story" ref={ref}>
      <div className="story-sticky">
        <div className="story-copy">
          <p className="eyebrow"><span className="dot" />How it works</p>
          <div className="st-list">
            <div className="rail"><motion.div className="rail-fill" style={{ height: railFill }} /></div>
            <div className="st-rows">
              {STEPS.map((s, i) => (
                <Step key={s.n} i={i} step={s} p={scrollYProgress} />
              ))}
            </div>
          </div>
        </div>
        <div className="story-frames">
          <div className="fr-wrap">
            {STEPS.map((s, i) => (
              <Frame key={s.n} i={i} vid={s.vid} poster={s.img} p={scrollYProgress} />
            ))}
            <div className="fr-glow" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ScrollStoryPage() {
  return (
    <SmoothScroll>
      <div className="sc">
        <style>{CSS}</style>

        <header className="sc-intro">
          <h1 className="sc-h">Money home,<br /><span className="accent">in a link.</span></h1>
          <p className="sc-sub">Scroll to see it happen.</p>
          <span className="sc-cue" aria-hidden="true">↓</span>
        </header>

        <Story />

        <footer className="sc-outro">
          <h2 className="sc-h2">That’s the whole thing.</h2>
          <p className="sc-sub">No wallet. No seed phrase. No app. Just a link.</p>
        </footer>
      </div>
    </SmoothScroll>
  );
}

const CSS = `
.sc{--paper:#F5F3EF;--surface:#FBFAF8;--ink:#1E1B22;--muted:#67626E;--line:#E5DFE8;--accent:#6E5FCE;--accent-soft:#E8E3F7;
  background:var(--paper);color:var(--ink);font-family:"Switzer",ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.sc :where(h1,h2,h3,p){margin:0}

.sc-intro{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px;gap:14px;
  background:radial-gradient(60% 50% at 50% 42%, color-mix(in srgb,var(--accent) 13%,transparent), transparent 72%),var(--paper)}
.sc-h{font-family:"Sentient",Georgia,serif;font-weight:600;font-size:clamp(44px,8vw,104px);line-height:1;letter-spacing:-.025em}
.accent{color:var(--accent)}
.sc-sub{color:var(--muted);font-size:clamp(15px,1.8vw,19px)}
.sc-cue{margin-top:22px;font-size:26px;color:var(--accent);animation:bob 1.6s ease-in-out infinite}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(8px)}}

.story{height:460vh;position:relative}
.story-sticky{position:sticky;top:0;height:100vh;display:grid;grid-template-columns:0.92fr 1.08fr;gap:clamp(24px,4vw,64px);
  align-items:center;max-width:1240px;margin:0 auto;padding:0 clamp(20px,4vw,48px)}
@media (max-width:860px){.story-sticky{grid-template-columns:1fr;grid-template-rows:auto 1fr;gap:20px;padding-top:40px;padding-bottom:40px}}

.eyebrow{display:inline-flex;align-items:center;gap:9px;font-size:12.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin-bottom:26px}
.dot{width:7px;height:7px;border-radius:50%;background:var(--accent)}
.st-list{display:grid;grid-template-columns:auto 1fr;gap:22px}
.rail{width:3px;background:var(--line);border-radius:3px;position:relative;overflow:hidden}
.rail-fill{position:absolute;top:0;left:0;width:100%;background:var(--accent);border-radius:3px}
.st-rows{display:flex;flex-direction:column;gap:clamp(20px,3.4vh,40px)}
.st-row{display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:start}
.st-bar{width:2px;background:var(--line);border-radius:2px;align-self:stretch;min-height:44px;position:relative;overflow:hidden}
.st-bar-fill{position:absolute;inset:0;background:var(--accent);transform-origin:top;border-radius:2px}
.st-n{font-family:"Sentient",Georgia,serif;font-weight:600;font-size:13px;color:var(--accent)}
.st-t{font-family:"Sentient",Georgia,serif;font-weight:600;font-size:clamp(20px,2.4vw,30px);letter-spacing:-.015em;margin-top:2px}
.st-b{color:var(--muted);font-size:clamp(14px,1.5vw,16px);line-height:1.55;margin-top:6px;max-width:40ch}

.story-frames{position:relative;height:min(74vh,620px)}
.fr-wrap{position:absolute;inset:0;border-radius:22px;overflow:hidden;border:1px solid var(--line);background:var(--surface);
  box-shadow:0 40px 80px -40px color-mix(in srgb,var(--accent) 50%,transparent)}
.fr-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;will-change:opacity,transform}
.fr-glow{position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(60% 55% at 50% 45%, transparent 55%, color-mix(in srgb,var(--accent) 8%,transparent))}

.story-static{max-width:900px;margin:0 auto;padding:clamp(40px,7vw,90px) clamp(20px,4vw,44px);display:flex;flex-direction:column;gap:clamp(32px,6vw,72px)}
.ss-step{display:grid;grid-template-columns:1.2fr 1fr;gap:clamp(20px,4vw,44px);align-items:center}
@media (max-width:760px){.ss-step{grid-template-columns:1fr}}
.ss-frame{border-radius:18px;overflow:hidden;border:1px solid var(--line);aspect-ratio:16/9;background:var(--surface)}
.ss-img{width:100%;height:100%;object-fit:cover;display:block}

.sc-outro{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:14px;padding:40px;
  background:radial-gradient(55% 45% at 50% 50%, color-mix(in srgb,var(--accent) 10%,transparent), transparent 72%),var(--paper)}
.sc-h2{font-family:"Sentient",Georgia,serif;font-weight:600;font-size:clamp(32px,5vw,60px);letter-spacing:-.02em}
`;
