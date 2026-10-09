import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { pointer, scroll } from "../lib/scroll";

/**
 * The "mind": thousands of nodes on a breathing sphere, wired to their
 * nearest neighbours. Nodes pulse with travelling signals; the whole thing
 * slowly turns and leans toward the pointer. The camera flies straight
 * through it on the first scroll.
 */

const POINT_VERT = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aSeed;
varying float vSeed;
varying float vPulse;
void main() {
  vSeed = aSeed;
  vec3 p = position;
  // breathing + per-node jitter
  float breathe = 1.0 + 0.035 * sin(uTime * 0.6 + aSeed * 6.2831);
  p *= breathe;
  p += 0.04 * vec3(sin(uTime * 1.3 + aSeed * 17.0), cos(uTime * 1.1 + aSeed * 23.0), sin(uTime * 0.9 + aSeed * 29.0));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  // signal: a wave sweeping around the sphere
  float wave = sin(uTime * 1.4 - atan(position.y, position.x) * 2.0 + position.z * 1.2);
  vPulse = smoothstep(0.75, 1.0, wave);
  float size = (1.1 + vPulse * 2.2 + step(0.985, aSeed) * 1.8) * uPixelRatio;
  gl_PointSize = size * (30.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const POINT_FRAG = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
varying float vSeed;
varying float vPulse;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float core = smoothstep(0.5, 0.08, d);
  float halo = smoothstep(0.5, 0.0, d) * 0.18;
  vec3 col = mix(uColorA, uColorB, vSeed) * 0.75 + vPulse * 0.6;
  float a = (core + halo) * 0.85;
  gl_FragColor = vec4(col * a, a);
}
`;

const LINE_VERT = /* glsl */ `
uniform float uTime;
attribute float aPhase;
varying float vPhase;
varying float vT;
void main() {
  vPhase = aPhase;
  vT = uTime;
  float breathe = 1.0 + 0.035 * sin(uTime * 0.6 + aPhase * 6.2831);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position * breathe, 1.0);
}
`;

const LINE_FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vPhase;
varying float vT;
void main() {
  float signal = smoothstep(0.6, 1.0, sin(vT * 2.0 + vPhase * 12.566));
  float a = 0.05 + signal * 0.3;
  gl_FragColor = vec4(uColor * (0.5 + signal * 0.8), a);
}
`;

function fibonacciSphere(n: number, radius: number) {
  const pts = new Float32Array(n * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    // tiny radial noise so it reads as organic, not a globe
    const rr = radius * (0.92 + Math.random() * 0.16);
    pts[i * 3] = Math.cos(th) * r * rr;
    pts[i * 3 + 1] = y * rr;
    pts[i * 3 + 2] = Math.sin(th) * r * rr;
  }
  return pts;
}

export default function NeuralField({ count = 2400, radius = 3 }: { count?: number; radius?: number }) {
  const group = useRef<THREE.Group>(null);
  const pointsMat = useRef<THREE.ShaderMaterial>(null);
  const linesMat = useRef<THREE.ShaderMaterial>(null);

  const { pointsGeo, linesGeo } = useMemo(() => {
    const pos = fibonacciSphere(count, radius);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) seeds[i] = Math.random();
    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    pointsGeo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

    // connect each node to ~2 neighbours within a small distance (sampled, not O(n²) for all)
    const linePos: number[] = [];
    const linePhase: number[] = [];
    const maxD = radius * 0.22;
    const stride = 7;
    for (let i = 0; i < count; i += 1) {
      let links = 0;
      for (let k = 1; k < 60 && links < 2; k++) {
        const j = (i + k * stride) % count;
        const dx = pos[i * 3] - pos[j * 3], dy = pos[i * 3 + 1] - pos[j * 3 + 1], dz = pos[i * 3 + 2] - pos[j * 3 + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < maxD) {
          linePos.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]);
          const ph = Math.random();
          linePhase.push(ph, ph);
          links++;
        }
      }
    }
    const linesGeo = new THREE.BufferGeometry();
    linesGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
    linesGeo.setAttribute("aPhase", new THREE.Float32BufferAttribute(linePhase, 1));
    return { pointsGeo, linesGeo };
  }, [count, radius]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uColorA: { value: new THREE.Color("#4d7cff") },
      uColorB: { value: new THREE.Color("#b388ff") },
    }),
    [],
  );
  const lineUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uColor: { value: new THREE.Color("#6f8dff") } }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    uniforms.uTime.value = t;
    lineUniforms.uTime.value = t;
    if (group.current) {
      group.current.rotation.y = t * 0.06 + pointer.sx * 0.25;
      group.current.rotation.x = Math.sin(t * 0.15) * 0.08 - pointer.sy * 0.18;
      // opens up as the camera dives in, so you fly between the nodes
      const dive = THREE.MathUtils.smoothstep(scroll.smooth, 0.04, 0.22);
      const s = 1 + dive * 1.6;
      group.current.scale.setScalar(s);
    }
  });

  return (
    <group ref={group}>
      <points geometry={pointsGeo}>
        <shaderMaterial
          ref={pointsMat}
          vertexShader={POINT_VERT}
          fragmentShader={POINT_FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <lineSegments geometry={linesGeo}>
        <shaderMaterial
          ref={linesMat}
          vertexShader={LINE_VERT}
          fragmentShader={LINE_FRAG}
          uniforms={lineUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
}
