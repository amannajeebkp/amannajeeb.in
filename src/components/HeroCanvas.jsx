import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const COUNT = 6500;

function buildTargets() {
  const home = new Float32Array(COUNT * 3);
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  let i = 0;

  const put = (x, y, z) => {
    if (i >= COUNT) return;
    home[i * 3] = x;
    home[i * 3 + 1] = y;
    home[i * 3 + 2] = z;
    i++;
  };

  const n = (w, fn) => {
    const c = Math.floor(w * COUNT);
    for (let k = 0; k < c; k++) fn();
  };

  n(0.12, () => {
    const a = Math.random() * Math.PI * 2;
    const r = 0.26 * Math.sqrt(Math.random());
    put(Math.cos(a) * r, 1.44 + Math.sin(a) * r * 1.12, gauss() * 0.14);
  });

  n(0.33, () => {
    const y = 0.2 + Math.random() * 0.84;
    const halfW = THREE.MathUtils.lerp(0.19, 0.29, (y - 0.2) / 0.84);
    put((Math.random() - 0.5) * 2 * halfW, y, gauss() * 0.1);
  });

  const limb = (ax, ay, bx, by, rad, weight) =>
    n(weight, () => {
      const t = Math.random();
      const a = Math.random() * Math.PI * 2;
      const r = rad * Math.sqrt(Math.random());
      put(
        THREE.MathUtils.lerp(ax, bx, t) + Math.cos(a) * r,
        THREE.MathUtils.lerp(ay, by, t) + Math.sin(a) * r,
        gauss() * 0.08
      );
    });

  limb(-0.3, 0.96, -0.52, 0.18, 0.075, 0.11);
  limb(0.3, 0.96, 0.52, 0.18, 0.075, 0.11);
  limb(-0.15, 0.22, -0.19, -1.46, 0.095, 0.135);
  limb(0.15, 0.22, 0.19, -1.46, 0.095, 0.135);

  n(0.05, () => {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random());
    put(Math.cos(a) * 0.55 * r, -1.52 + Math.sin(a) * 0.1 * r, gauss() * 0.06);
  });

  while (i < COUNT) put((Math.random() - 0.5) * 0.1, 1.7 + Math.random() * 0.1, 0);

  return home;
}

function ParticleFigure() {
  const group = useRef();
  const geoRef = useRef();
  const { camera, size } = useThree();

  const { home, pos, vel } = useMemo(() => {
    const home = buildTargets();
    const pos = new Float32Array(COUNT * 3);
    const vel = new Float32Array(COUNT * 3);
    for (let j = 0; j < COUNT * 3; j++) {
      pos[j] = (Math.random() - 0.5) * 16;
      vel[j] = 0;
    }
    return { home, pos, vel };
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const d = Math.min(delta, 0.05);

    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const halfW = halfH * (size.width / size.height);
    const mx = state.pointer.x * halfW;
    const my = state.pointer.y * halfH;
    const desktop = size.width / size.height > 1.05;

    if (group.current) {
      const tx = desktop ? Math.max(halfW * 0.5, 1.6) : 0;
      const ts = desktop ? 1 : 0.62;
      group.current.position.x += (tx - group.current.position.x) * 0.06;
      group.current.position.y += ((desktop ? 0.1 : -1.15) - group.current.position.y) * 0.06;
      group.current.scale.x += (ts - group.current.scale.x) * 0.06;
      group.current.scale.y = group.current.scale.z = group.current.scale.x;
    }

    const swayX = Math.sin(t * 0.7) * 0.035;
    const bobY = Math.sin(t * 1.25) * 0.025;

    for (let k = 0; k < COUNT; k++) {
      const ix = k * 3;
      const hx = home[ix] + swayX;
      const hy = home[ix + 1] + bobY;
      const hz = home[ix + 2];

      let dx = pos[ix] - mx;
      let dy = pos[ix + 1] - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1.0 && dist > 0.0001) {
        const f = ((1.0 - dist) / 1.0) * 0.09;
        dx /= dist;
        dy /= dist;
        vel[ix] += dx * f;
        vel[ix + 1] += dy * f;
        vel[ix + 2] += (Math.random() - 0.5) * f;
      }

      vel[ix] += (hx - pos[ix]) * 0.016;
      vel[ix + 1] += (hy - pos[ix + 1]) * 0.016;
      vel[ix + 2] += (hz - pos[ix + 2]) * 0.016;

      vel[ix] *= 0.9;
      vel[ix + 1] *= 0.9;
      vel[ix + 2] *= 0.9;

      pos[ix] += vel[ix];
      pos[ix + 1] += vel[ix + 1];
      pos[ix + 2] += vel[ix + 2];
    }

    if (geoRef.current) {
      geoRef.current.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group ref={group}>
      <points ref={geoRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[pos, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.024}
          color="#d6ff3f"
          transparent
          opacity={0.75}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

function Dust({ count = 1200 }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 12;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
    }
    return arr;
  }, [count]);

  useFrame((state, delta) => {
    ref.current.rotation.y += delta * 0.015;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial transparent color="#ffffff" size={0.015} sizeAttenuation depthWrite={false} opacity={0.28} />
    </Points>
  );
}

export default function HeroCanvas() {
  return (
    <div className="hero-canvas" aria-hidden="true">
      <Canvas camera={{ position: [0, 0.15, 8], fov: 50 }} dpr={[1, 1.75]}>
        <ambientLight intensity={0.4} />
        <Dust />
        <ParticleFigure />
      </Canvas>
    </div>
  );
}
