import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scroll } from "../lib/scroll";

/**
 * The corridor: thousands of light motes in a long cylinder along -z that
 * stream past the camera. Their speed follows scroll velocity, so a flick
 * of the wheel turns into a warp.
 */

const VERT = /* glsl */ `
uniform float uTime;
uniform float uFlow;
uniform float uPixelRatio;
uniform float uLen;
attribute float aSeed;
varying float vSeed;
varying float vDepth;
void main() {
  vSeed = aSeed;
  vec3 p = position;
  // drift along the corridor; wrap within [-uLen, 0]
  float z = mod(p.z + uFlow * (0.6 + aSeed * 1.4), uLen) - uLen;
  p.z = z;
  // slight spiral
  float ang = uTime * 0.05 * (aSeed - 0.5);
  float c = cos(ang), s = sin(ang);
  p.xy = mat2(c, -s, s, c) * p.xy;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vDepth = -mv.z;
  gl_PointSize = (1.4 + aSeed * 2.2) * uPixelRatio * (40.0 / max(1.0, -mv.z));
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uStretch;
varying float vSeed;
varying float vDepth;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  // elongate vertically when warping
  c.y /= (1.0 + uStretch * 3.0);
  float d = length(c);
  float a = smoothstep(0.5, 0.0, d);
  float fade = smoothstep(0.5, 6.0, vDepth) * smoothstep(60.0, 20.0, vDepth);
  vec3 col = mix(uColorA, uColorB, vSeed);
  gl_FragColor = vec4(col * a * fade, a * fade * 0.9);
}
`;

export default function DataStream({ count = 5000, length = 48, radius = 7 }: { count?: number; length?: number; radius?: number }) {
  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // hollow-ish cylinder so the centre stays clear for the content
      const r = radius * (0.35 + Math.pow(Math.random(), 0.6) * 0.65);
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(a) * r;
      pos[i * 3 + 2] = -Math.random() * length;
      seed[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    return g;
  }, [count, length, radius]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFlow: { value: 0 },
      uStretch: { value: 0 },
      uLen: { value: length },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uColorA: { value: new THREE.Color("#7aa2ff") },
      uColorB: { value: new THREE.Color("#e9d5ff") },
    }),
    [length],
  );

  const flow = useRef(0);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    // base drift + scroll-velocity warp (both directions feel like motion)
    const warp = Math.min(6, Math.abs(scroll.velocity) * 90);
    flow.current += dt * (0.9 + warp * 3.5);
    uniforms.uTime.value = t;
    uniforms.uFlow.value = flow.current;
    uniforms.uStretch.value += (Math.min(1, warp / 4) - uniforms.uStretch.value) * Math.min(1, dt * 6);
  });

  return (
    <points geometry={geo} position={[0, 0, 0]}>
      <shaderMaterial
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
