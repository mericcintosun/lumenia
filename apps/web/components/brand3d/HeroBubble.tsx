/**
 * HeroBubble — the Lumenia hero 3D object rendered with react-three-fiber: a matte
 * cream-lavender ceramic chat bubble (Meshy form, brand.md §11.1) with a canvas-drawn
 * accent checkmark Decal. The baked Meshy PBR texture is DISCARDED (it garbled text —
 * brand.md §8); the surface is a three.js material override, so it is fully
 * brand-controlled and only 688 KB (the untextured preview mesh).
 *
 * Transparent canvas → drops onto the hero's Periwinkle glow. Gentle idle float,
 * honouring prefers-reduced-motion. Meant to be lazy-loaded (next/dynamic, ssr:false).
 */
"use client";

import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, ContactShadows, Decal } from "@react-three/drei";
import type { Group } from "three";

const MODEL_URL = "/models/hero-preview.glb";
const ACCENT = "#6E5FCE";
// The Meshy slab's big (tailed) face is +Y; stand it up to face the camera.
const OBJ_ROT: [number, number, number] = [Math.PI / 2, 0, 0];
const DECAL_POS: [number, number, number] = [0, 0.45, -0.12];
const DECAL_ROT: [number, number, number] = [-Math.PI / 2, 0, 0];
const DECAL_SCALE = 0.95;

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function useCheckTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, 256, 256);
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 34;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(66, 134);
    ctx.lineTo(112, 180);
    ctx.lineTo(192, 84);
    ctx.stroke();
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  }, []);
}

function Bubble() {
  const { scene } = useGLTF(MODEL_URL);
  const geometry = useMemo(() => {
    let g: THREE.BufferGeometry | undefined;
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !g) g = m.geometry;
    });
    return g;
  }, [scene]);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#EBE5F0"),
        roughness: 0.92,
        metalness: 0.0,
      }),
    [],
  );
  const check = useCheckTexture();
  const ref = useRef<Group>(null);

  useFrame((state) => {
    if (!ref.current || REDUCED) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = Math.sin(t * 0.9) * 0.06;
    ref.current.rotation.z = Math.sin(t * 0.6) * 0.04;
  });

  if (!geometry) return null;
  return (
    <group ref={ref}>
      <group rotation={OBJ_ROT}>
        <mesh geometry={geometry} material={material} castShadow receiveShadow>
          <Decal position={DECAL_POS} rotation={DECAL_ROT} scale={DECAL_SCALE}>
            <meshStandardMaterial
              map={check}
              transparent
              polygonOffset
              polygonOffsetFactor={-10}
              roughness={0.85}
              metalness={0}
              toneMapped={false}
            />
          </Decal>
        </mesh>
      </group>
    </group>
  );
}

export default function HeroBubble() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [1.0, 0.35, 2.9], fov: 34 }}
      style={{ width: "100%", height: "100%" }}
    >
      <hemisphereLight args={["#ffffff", "#d8cfe6", 1.15]} />
      <directionalLight
        position={[4, 6, 6]}
        intensity={2.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-6, 2, -2]} intensity={0.6} color="#c9bff0" />
      <Suspense fallback={null}>
        <Bubble />
        <ContactShadows position={[0, -1.15, 0]} opacity={0.22} scale={7} blur={3} far={3.5} />
      </Suspense>
    </Canvas>
  );
}

if (typeof window !== "undefined") {
  useGLTF.preload(MODEL_URL);
}
