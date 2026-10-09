import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scroll } from "../lib/scroll";

/**
 * The destination: a sphere of folded light with a fresnel rim, ringed by
 * two tilted orbits. It only wakes up as you arrive (last 25% of scroll).
 */

const VERT = /* glsl */ `
uniform float uTime;
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
void main() {
  vP = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vV = normalize(cameraPosition - w.xyz);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform float uAwake;
uniform vec3 uColorA;
uniform vec3 uColorB;
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;

float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float noise(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x), mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float v=0.0; float a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p=p*2.1+vec3(1.7); a*=0.5;} return v; }

void main() {
  float fres = pow(1.0 - max(dot(vN, vV), 0.0), 2.4);
  float n = fbm(vP * 1.6 + vec3(0.0, uTime * 0.25, uTime * 0.12));
  float folds = smoothstep(0.42, 0.62, n);
  vec3 body = mix(uColorA * 0.25, uColorB, folds) * (0.3 + uAwake * 0.9);
  vec3 rim = mix(uColorA, vec3(1.0), 0.5) * fres * (0.8 + uAwake * 1.6);
  vec3 col = body + rim;
  gl_FragColor = vec4(col, 1.0);
}
`;

export default function Core({ position = [0, 0, -36] as [number, number, number] }) {
  const mesh = useRef<THREE.Mesh>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAwake: { value: 0 },
      uColorA: { value: new THREE.Color("#4d7cff") },
      uColorB: { value: new THREE.Color("#b388ff") },
    }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    uniforms.uTime.value = t;
    const awake = THREE.MathUtils.smoothstep(scroll.smooth, 0.74, 0.96);
    uniforms.uAwake.value += (awake - uniforms.uAwake.value) * 0.05;
    if (mesh.current) {
      mesh.current.rotation.y = t * 0.12;
      mesh.current.scale.setScalar(1 + Math.sin(t * 1.3) * 0.02 * uniforms.uAwake.value);
    }
    if (ringA.current) ringA.current.rotation.z = t * 0.25;
    if (ringB.current) ringB.current.rotation.z = -t * 0.18;
  });

  return (
    <group position={position}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1.6, 48]} />
        <shaderMaterial vertexShader={VERT} fragmentShader={FRAG} uniforms={uniforms} />
      </mesh>
      <mesh ref={ringA} rotation={[Math.PI / 2.3, 0.3, 0]}>
        <torusGeometry args={[2.6, 0.012, 8, 160]} />
        <meshBasicMaterial color="#9ab4ff" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ringB} rotation={[Math.PI / 1.7, -0.5, 0]}>
        <torusGeometry args={[3.3, 0.008, 8, 160]} />
        <meshBasicMaterial color="#c4b5fd" transparent opacity={0.55} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}
