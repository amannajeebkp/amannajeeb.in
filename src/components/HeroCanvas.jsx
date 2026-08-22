import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Icosahedron, Points, PointMaterial } from "@react-three/drei";
import { useRef } from "react";
import { useEffect, useState } from "react";

function ParticleField() {
  const ref = useRef();
  const [positions] = useState(() => {
    const arr = new Float32Array(2500 * 3);
    for (let i = 0; i < 2500; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 18;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 12;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return arr;
  });

  useFrame((state, delta) => {
    ref.current.rotation.y += delta * 0.02;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial transparent color="#d6ff3f" size={0.02} sizeAttenuation depthWrite={false} opacity={0.5} />
    </Points>
  );
}

function Core() {
  const mesh = useRef();
  useFrame((state, delta) => {
    mesh.current.rotation.x += delta * 0.15;
    mesh.current.rotation.y += delta * 0.1;
  });
  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
      <Icosahedron ref={mesh} args={[2.2, 0]}>
        <meshStandardMaterial wireframe color="#d6ff3f" transparent opacity={0.18} />
      </Icosahedron>
    </Float>
  );
}

export default function HeroCanvas() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <div className="hero-canvas" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 8], fov: 55 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.5} />
        <ParticleField />
        <Core />
      </Canvas>
    </div>
  );
}
