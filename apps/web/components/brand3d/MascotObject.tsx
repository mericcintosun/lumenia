/**
 * MascotObject — the Lumenia "messenger" mascot rendered with react-three-fiber:
 * the Meshy image→3D character (cream body, brown eyes, holding a lavender envelope),
 * with two in-engine fixes — smooth normals across UV seams (kills low-poly shading
 * facets) and a recolored base texture whose envelope is pulled to the brand accent
 * (#6E5FCE periwinkle). Transparent canvas, gentle idle float (reduced-motion aware).
 * Lazy-load with next/dynamic (ssr:false). Reused by /brand-kit/brand and the hero.
 */
"use client";

import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useTexture, Bounds, ContactShadows } from "@react-three/drei";
import type { Group } from "three";

const MODEL_URL = "/models/mascot.glb";
const TEX_URL = "/models/mascot-tex.png";

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function smoothNormalsAcrossSeams(geo: THREE.BufferGeometry) {
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  const acc = new Map<string, [number, number, number]>();
  const key = (i: number) =>
    `${Math.round(pos.getX(i) * 1000)},${Math.round(pos.getY(i) * 1000)},${Math.round(pos.getZ(i) * 1000)}`;
  for (let i = 0; i < pos.count; i++) {
    const k = key(i);
    let n = acc.get(k);
    if (!n) { n = [0, 0, 0]; acc.set(k, n); }
    n[0] += norm.getX(i); n[1] += norm.getY(i); n[2] += norm.getZ(i);
  }
  for (const n of acc.values()) {
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    n[0] /= l; n[1] /= l; n[2] /= l;
  }
  for (let i = 0; i < pos.count; i++) {
    const n = acc.get(key(i))!;
    norm.setXYZ(i, n[0], n[1], n[2]);
  }
  norm.needsUpdate = true;
}

function Mascot({ animate }: { animate: boolean }) {
  const { scene } = useGLTF(MODEL_URL);
  const tinted = useTexture(TEX_URL);
  const ref = useRef<Group>(null);

  const object = useMemo(() => {
    tinted.flipY = false;
    tinted.colorSpace = THREE.SRGBColorSpace;
    tinted.needsUpdate = true;
    const s = scene.clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        smoothNormalsAcrossSeams(m.geometry);
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat) { mat.map = tinted; mat.needsUpdate = true; }
      }
    });
    return s;
  }, [scene, tinted]);

  useFrame((state) => {
    if (!ref.current || REDUCED || !animate) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = Math.sin(t * 0.9) * 0.05;
    ref.current.rotation.z = Math.sin(t * 0.6) * 0.03;
  });

  return (
    <group ref={ref}>
      <primitive object={object} />
    </group>
  );
}

export default function MascotObject({ animate = true }: { animate?: boolean }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      frameloop={animate ? "always" : "demand"}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      camera={{ position: [0.7, 0.15, 3.2], fov: 32 }}
      style={{ width: "100%", height: "100%" }}
    >
      <hemisphereLight args={["#ffffff", "#d8cfe6", 1.1]} />
      <directionalLight
        position={[4, 6, 6]}
        intensity={2.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-6, 2, -2]} intensity={0.55} color="#c9bff0" />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={1.15}>
          <Mascot animate={animate} />
        </Bounds>
        <ContactShadows position={[0, -1.15, 0]} opacity={0.24} scale={7} blur={3} far={3.5} />
      </Suspense>
    </Canvas>
  );
}

if (typeof window !== "undefined") {
  useGLTF.preload(MODEL_URL);
}
