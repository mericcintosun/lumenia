/**
 * AvatarsStatic — the 5-avatar showcase rendered STATIC (no idle loop, frameloop
 * "demand") for the brand book plate, so the long document doesn't run many always-on
 * WebGL canvases at once. The live, animated version lives at /brand-kit/avatars.
 */
"use client";

import dynamic from "next/dynamic";

const AvatarShowcase = dynamic(() => import("./AvatarShowcase"), { ssr: false });

export default function AvatarsStatic() {
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(20px,3vw,40px) clamp(20px,4vw,44px)" }}>
      <p
        style={{
          fontFamily: '"Switzer",ui-sans-serif,system-ui,sans-serif',
          fontSize: 14,
          color: "#67626E",
          margin: "0 0 20px",
          maxWidth: "72ch",
          lineHeight: 1.6,
        }}
      >
        The messenger + 4 pose variations (wave · tap · celebrate · thumbs-up), each a Meshy image→3D
        model. Static here; the live, idle-animated version is at <b>/brand-kit/avatars</b>.
      </p>
      <AvatarShowcase animate={false} />
    </div>
  );
}
