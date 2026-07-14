/**
 * HowItWorks — section 4, a pinned scroll story (ported from /brand-kit/story). Three story
 * videos crossfade on the right while a progress rail + step copy advance on the left. No "01/02"
 * numeral rails (brand.md §8) — just titles and the filling rail. Scroll ranges stay in [0,1].
 */
"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { clamp } from "./utils";

const HIW = [
  { vid: "/brand-kit-assets/video/story-1.mp4", poster: "/brand-kit-assets/story-1-share.webp", t: "You send a link.", b: "Choose an amount and share it in a chat, like anything else. That’s the whole transfer." },
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

export function HowItWorks() {
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
