import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { isLowPower, scroll } from "../lib/scroll";

/**
 * Bloom (the glow everything is designed around) + one combined "lens" pass:
 * chromatic aberration that grows with scroll speed, vignette and fine grain.
 */
const LensShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uAberration: { value: 0 },
    uVignette: { value: 0.55 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uAberration;
    uniform float uVignette;
    varying vec2 vUv;
    float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      vec2 dir = c * (0.004 + uAberration * 0.02) * (1.0 + r2 * 2.0);
      float rr = texture2D(tDiffuse, vUv + dir).r;
      float gg = texture2D(tDiffuse, vUv).g;
      float bb = texture2D(tDiffuse, vUv - dir).b;
      vec3 col = vec3(rr, gg, bb);
      float vig = 1.0 - smoothstep(0.25, 1.1, r2 * 2.2) * uVignette;
      col *= vig;
      float g = (rand(vUv * vec2(1920.0, 1080.0) + fract(uTime)) - 0.5) * 0.06;
      col += g;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export default function Effects() {
  const { gl, scene, camera, size } = useThree();

  const { composer, bloom, lens } = useMemo(() => {
    const composer = new EffectComposer(gl);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), isLowPower ? 0.7 : 0.95, 0.45, 0.42);
    composer.addPass(bloom);
    const lens = new ShaderPass(LensShader);
    composer.addPass(lens);
    composer.addPass(new OutputPass());
    return { composer, bloom, lens };
  }, [gl, scene, camera, size.width, size.height]);

  useEffect(() => {
    const ratio = isLowPower ? Math.min(window.devicePixelRatio, 1.25) : Math.min(window.devicePixelRatio, 2);
    composer.setPixelRatio(ratio);
    composer.setSize(size.width, size.height);
    bloom.resolution.set(size.width, size.height);
    return () => composer.dispose();
  }, [composer, bloom, size.width, size.height]);

  useFrame((state) => {
    lens.uniforms.uTime.value = state.clock.elapsedTime;
    const target = Math.min(1, Math.abs(scroll.velocity) * 40);
    lens.uniforms.uAberration.value += (target - lens.uniforms.uAberration.value) * 0.08;
    composer.render();
  }, 1);

  return null;
}
