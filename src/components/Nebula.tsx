import { useEffect, useRef } from "react";
import { fxEnabled, hexToRgb, isLowPower, PALETTE, pointerX, pointerY } from "../lib/fx";

/**
 * The living background: a slow, domain-warped field of light rendered with a
 * hand-written WebGL fragment shader. Deep black with the site's glow colours,
 * a soft torch that follows the pointer, and an "ignite" reveal that blooms
 * outward from the centre when the intro hands over to the board.
 *
 * Perf: renders at a reduced resolution (0.5× DPR, 0.35× on low-power), pauses
 * when the tab is hidden, and draws a single still frame for reduced-motion.
 */

const VERT = `
attribute vec2 a;
void main(){ gl_Position = vec4(a, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_ignite;
uniform float u_intensity;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_c4;

vec2 hash(vec2 p){
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dot(hash(i), f), dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y);
}
float fbm(vec2 p){
  float v = 0.0; float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < OCTAVES; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}

void main(){
  float mn = min(u_res.x, u_res.y);
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / mn;
  float t = u_time * 0.045;

  // pointer in the same aspect-corrected space, softened
  vec2 m = u_mouse * 0.5 * vec2(u_res.x / mn, u_res.y / mn);

  // domain warp
  vec2 q = vec2(fbm(uv * 1.1 + t), fbm(uv * 1.1 + vec2(5.2, 1.3) - t * 0.7));
  vec2 r = vec2(fbm(uv * 1.1 + 2.0 * q + vec2(1.7, 9.2) + 0.15 * t + m * 0.08),
                fbm(uv * 1.1 + 2.0 * q + vec2(8.3, 2.8) + 0.126 * t));
  float f = fbm(uv * 1.1 + 2.5 * r);

  // violet/pink dominant, sky in the deep folds, yellow only where the field peaks
  vec3 col = mix(u_c3, u_c1, clamp(f * 1.8 + 0.55, 0.0, 1.0));
  col = mix(col, u_c2, clamp(length(q) * 1.3 - 0.25, 0.0, 1.0));
  float spark = pow(clamp(r.x + 0.15, 0.0, 1.0), 7.0);
  col = mix(col, u_c4, spark * 0.3);

  // mostly black: only the brighter folds carry light
  float lum = pow(smoothstep(0.05, 0.95, f + 0.22), 1.6);

  // thin bright filaments where the field folds — the aurora
  float ribbon = pow(clamp(1.0 - abs(f - 0.1) * 7.0, 0.0, 1.0), 5.0);

  // torch
  float d = length(uv - m);
  float torch = exp(-d * d * 7.0) * 0.5;

  vec3 outc = col * (lum * 0.42 + torch * (0.35 + lum * 0.8));
  outc += mix(u_c3, vec3(1.0), 0.35) * ribbon * (0.34 + torch * 0.4);
  outc += u_c4 * spark * ribbon * 0.5;

  // vignette keeps the edges truly black
  float vig = smoothstep(1.35, 0.25, length(uv));
  outc *= vig;

  // ignite: radial reveal from the centre, with a thin hot rim on the wavefront
  float R = u_ignite * 1.7;
  float edge = length(uv);
  float rev = smoothstep(R, R - 0.45, edge);
  float rim = smoothstep(R + 0.012, R, edge) * smoothstep(R - 0.06, R, edge) * (1.0 - u_ignite);
  outc = outc * rev + mix(u_c2, vec3(1.0), 0.12) * 0.95 * rim;

  // saturation push so it reads as light, not grey smoke
  float g = dot(outc, vec3(0.299, 0.587, 0.114));
  outc = mix(vec3(g), outc, 1.5);

  gl_FragColor = vec4(outc * u_intensity, 1.0);
}
`;

interface NebulaProps {
  /** false during the intro (soft centre glow), true once the board is shown. */
  ignited: boolean;
  /** 0..1 overall brightness. */
  intensity?: number;
}

export default function Nebula({ ignited, intensity = 1 }: NebulaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ignitedRef = useRef(ignited);
  const intensityRef = useRef(intensity);
  ignitedRef.current = ignited;
  intensityRef.current = intensity;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return;

    const octaves = isLowPower ? 3 : 5;
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("Nebula shader:", gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG.replace("OCTAVES", String(octaves)));
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = u("u_res"), uTime = u("u_time"), uMouse = u("u_mouse"), uIgnite = u("u_ignite"), uInt = u("u_intensity");
    gl.uniform3fv(u("u_c1"), hexToRgb(PALETTE.violet));
    gl.uniform3fv(u("u_c2"), hexToRgb(PALETTE.pink));
    gl.uniform3fv(u("u_c3"), hexToRgb(PALETTE.sky));
    gl.uniform3fv(u("u_c4"), hexToRgb(PALETTE.yellow));

    const scale = (isLowPower ? 0.35 : 0.5) * Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const w = Math.max(1, Math.floor(window.innerWidth * scale));
      const h = Math.max(1, Math.floor(window.innerHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, w, h);
    };
    resize();
    window.addEventListener("resize", resize);

    // smoothed pointer + ignite value
    let mx = 0, my = 0, ig = ignitedRef.current ? 1 : 0.22, curInt = 0;
    let raf = 0;
    let running = true;
    const start = performance.now();
    const frame = (now: number) => {
      if (!running) return;
      const tx = pointerX.get(), ty = pointerY.get();
      mx += (tx - mx) * 0.06;
      my += (ty - my) * 0.06;
      const target = ignitedRef.current ? 1 : 0.22;
      ig += (target - ig) * (target > ig ? 0.028 : 0.1);
      curInt += (intensityRef.current - curInt) * 0.05;
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform2f(uMouse, mx, my);
      gl.uniform1f(uIgnite, ig);
      gl.uniform1f(uInt, curInt);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (fxEnabled) raf = requestAnimationFrame(frame);
    };
    if (!fxEnabled) {
      // reduced motion: one calm still frame, fully revealed
      ig = 1;
      curInt = intensityRef.current;
      gl.uniform1f(uTime, 12);
      gl.uniform2f(uMouse, 0, 0);
      gl.uniform1f(uIgnite, 1);
      gl.uniform1f(uInt, curInt);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      raf = requestAnimationFrame(frame);
    }

    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (fxEnabled && !running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
