import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import NeuralField from "./NeuralField";
import DataStream from "./DataStream";
import Core from "./Core";
import Effects from "./Effects";
import { isLowPower, pointer, prefersReducedMotion, scroll, tickPointer, tickScroll } from "../lib/scroll";

/**
 * Camera journey, keyed to page scroll (0..1):
 *   0.00  outside the mind, looking in
 *   0.20  through the nodes
 *   0.35  into the corridor
 *   0.75  corridor opens
 *   1.00  arrive at the core
 */
const PATH = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-2.2, 0.1, 9.5),
    new THREE.Vector3(-0.6, 0.2, 4.5),
    new THREE.Vector3(0, 0, -2),
    new THREE.Vector3(-1.2, 0.6, -9),
    new THREE.Vector3(1.4, -0.4, -16),
    new THREE.Vector3(-0.8, 0.5, -23),
    new THREE.Vector3(0, 0, -29.5),
  ],
  false,
  "catmullrom",
  0.4,
);
const CORE_POS = new THREE.Vector3(0, 0, -36);
// looking slightly right of the mind keeps it clear of the hero type on the left
const MIND_LOOK = new THREE.Vector3(1.6, 0.1, 0);

function CameraRig() {
  const { camera } = useThree();
  const look = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const ahead = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    tickScroll(dt);
    tickPointer(dt);
    const p = scroll.smooth;
    PATH.getPointAt(p, tmp);
    // pointer parallax, stronger at the start where the mind is the subject
    const par = 0.6 * (1 - p * 0.6);
    tmp.x += pointer.sx * par;
    tmp.y += pointer.sy * par * 0.6;
    camera.position.copy(tmp);

    // look ahead along the path; at the end, lock onto the core
    PATH.getPointAt(Math.min(1, p + 0.06), ahead);
    const lockCore = THREE.MathUtils.smoothstep(p, 0.8, 1);
    look.copy(ahead).lerp(CORE_POS, lockCore);
    // early on, the subject is the mind itself at the origin
    const lookMind = 1 - THREE.MathUtils.smoothstep(p, 0.0, 0.3);
    look.lerp(MIND_LOOK, lookMind * 0.9);
    camera.lookAt(look);
    // subtle roll with lateral pointer
    camera.rotation.z = -pointer.sx * 0.02;
  });
  return null;
}

/** Four beacons along the corridor, one per project. */
function Beacons() {
  const positions: [number, number, number][] = [
    [-3.2, 1.4, -10],
    [3.4, -1.1, -14.5],
    [-3.0, -1.3, -19],
    [3.1, 1.3, -23.5],
  ];
  return (
    <group>
      {positions.map((p, i) => (
        <Beacon key={i} position={p} seed={i} />
      ))}
    </group>
  );
}
function Beacon({ position, seed }: { position: [number, number, number]; seed: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime + seed * 1.7;
    ref.current.position.y = position[1] + Math.sin(t * 0.8) * 0.25;
    const s = 1 + Math.sin(t * 2.1) * 0.12;
    ref.current.scale.setScalar(s);
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.16, 24, 24]} />
      <meshBasicMaterial color={seed % 2 ? "#c4b5fd" : "#8fb0ff"} />
    </mesh>
  );
}

export default function Scene() {
  const low = isLowPower;
  return (
    <div className="scene" aria-hidden="true">
      <Canvas
        dpr={low ? [1, 1.25] : [1, 2]}
        camera={{ fov: 55, near: 0.1, far: 120, position: [-2.2, 0.1, 9.5] }}
        gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}
        frameloop={prefersReducedMotion ? "demand" : "always"}
        onCreated={({ gl }) => {
          gl.setClearColor("#050507", 1);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
        }}
      >
        <color attach="background" args={["#050507"]} />
        <fog attach="fog" args={["#050507", 18, 60]} />
        <Suspense fallback={null}>
          <CameraRig />
          <NeuralField count={low ? 1200 : 2000} />
          <DataStream count={low ? 2200 : 5200} />
          <Beacons />
          <Core position={[CORE_POS.x, CORE_POS.y, CORE_POS.z]} />
          <Effects />
        </Suspense>
      </Canvas>
    </div>
  );
}
