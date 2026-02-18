'use client';

import { Component, useRef, useMemo, useEffect, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree, extend, type Object3DNode, type MaterialNode } from '@react-three/fiber';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import * as THREE from 'three';

/* ── R3F JSX registration ── */

extend({ MeshLineGeometry, MeshLineMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    meshLineGeometry: Object3DNode<MeshLineGeometry, typeof MeshLineGeometry>;
    meshLineMaterial: MaterialNode<MeshLineMaterial, typeof MeshLineMaterial>;
  }
}

/* ── Reduced-motion hook ── */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }

    mq.addListener(handler);
    return () => mq.removeListener(handler);
  }, []);

  return reduced;
}

/* ── Curve generation ── */

function generateFiberCurves(
  count: number,
  bounds: { x: number; y: number; z: number },
): THREE.Vector3[][] {
  const curves: THREE.Vector3[][] = [];
  for (let i = 0; i < count; i++) {
    const controlPoints: THREE.Vector3[] = [];
    const numPoints = 5 + Math.floor(Math.random() * 4);
    let x = (Math.random() - 0.5) * bounds.x * 2;
    let y = -bounds.y + Math.random() * bounds.y * 0.3;
    let z = (Math.random() - 0.5) * bounds.z;

    for (let j = 0; j < numPoints; j++) {
      controlPoints.push(new THREE.Vector3(x, y, z));
      x += (Math.random() - 0.5) * bounds.x * 0.5;
      y += (bounds.y * 2) / numPoints + (Math.random() - 0.5) * 0.3;
      z += (Math.random() - 0.5) * bounds.z * 0.3;
    }
    curves.push(controlPoints);
  }
  return curves;
}

/* ── Single fiber strand ── */

type FiberStrandProps = {
  curve: THREE.Vector3[];
  color: string;
  reducedMotion: boolean;
  width?: number;
  speed?: number;
  dashArray?: number;
  dashRatio?: number;
  baseOpacity?: number;
  pulseSpeed?: number;
  phaseOffset?: number;
};

function FiberStrand({
  curve,
  color,
  reducedMotion,
  width = 0.08,
  speed = 0.003,
  dashArray = 0.5,
  dashRatio = 0.4,
  baseOpacity = 0.6,
  pulseSpeed = 0.8,
  phaseOffset = 0,
}: FiberStrandProps) {
  const materialRef = useRef<MeshLineMaterial>(null!);
  const { size } = useThree();

  const points = useMemo(() => {
    const spline = new THREE.CatmullRomCurve3(curve);
    return spline.getPoints(80).flatMap((p) => [p.x, p.y, p.z]);
  }, [curve]);

  const resolution = useMemo(
    () => new THREE.Vector2(Math.max(1, size.width), Math.max(1, size.height)),
    [size.width, size.height],
  );

  useEffect(() => {
    if (!materialRef.current || !reducedMotion) return;
    materialRef.current.dashOffset = 0;
    materialRef.current.opacity = baseOpacity;
  }, [reducedMotion, baseOpacity]);

  useFrame(({ clock }) => {
    if (!materialRef.current || reducedMotion) return;
    const nextOffset = materialRef.current.dashOffset - speed;
    materialRef.current.dashOffset = nextOffset <= -1 ? nextOffset + 1 : nextOffset;
    const pulse = 0.8 + 0.2 * Math.sin(clock.elapsedTime * pulseSpeed + phaseOffset);
    materialRef.current.opacity = baseOpacity * pulse;
  });

  return (
    <mesh>
      <meshLineGeometry points={points} />
      <meshLineMaterial
        ref={materialRef}
        lineWidth={width}
        color={new THREE.Color(color)}
        transparent
        opacity={baseOpacity}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        dashArray={dashArray}
        dashOffset={0}
        dashRatio={dashRatio}
        resolution={resolution}
      />
    </mesh>
  );
}

/* ── Three-layer glowing fiber ── */

function GlowingFiber({
  curve,
  color,
  reducedMotion,
}: {
  curve: THREE.Vector3[];
  color: string;
  reducedMotion: boolean;
}) {
  const baseSpeed = useMemo(() => 0.002 + Math.random() * 0.002, []);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);

  return (
    <group>
      {/* Outer glow — wide, soft */}
      <FiberStrand
        curve={curve}
        color={color}
        reducedMotion={reducedMotion}
        width={0.22}
        baseOpacity={0.1}
        speed={baseSpeed}
        dashArray={0.6}
        dashRatio={0.35}
        pulseSpeed={0.6}
        phaseOffset={phase}
      />
      {/* Mid layer */}
      <FiberStrand
        curve={curve}
        color={color}
        reducedMotion={reducedMotion}
        width={0.1}
        baseOpacity={0.28}
        speed={baseSpeed}
        dashArray={0.6}
        dashRatio={0.35}
        pulseSpeed={0.6}
        phaseOffset={phase}
      />
      {/* Core — bright white center */}
      <FiberStrand
        curve={curve}
        color="#ffffff"
        reducedMotion={reducedMotion}
        width={0.035}
        baseOpacity={0.6}
        speed={baseSpeed}
        dashArray={0.6}
        dashRatio={0.35}
        pulseSpeed={0.6}
        phaseOffset={phase}
      />
    </group>
  );
}

/* ── Scene ── */

function FiberScene({
  accentColor,
  fiberCount,
  reducedMotion,
}: {
  accentColor: string;
  fiberCount: number;
  reducedMotion: boolean;
}) {
  const curves = useMemo(
    () => generateFiberCurves(fiberCount, { x: 4, y: 5, z: 2 }),
    [fiberCount],
  );

  return (
    <>
      <ambientLight intensity={0.02} />
      {curves.map((curve, i) => (
        <GlowingFiber
          key={i}
          curve={curve}
          color={accentColor}
          reducedMotion={reducedMotion}
        />
      ))}
    </>
  );
}

/* ── Exported wrapper ── */

type FiberOpticBackgroundProps = {
  accentColor: string;
  fiberCount?: number;
};

type FiberCanvasBoundaryProps = {
  children: ReactNode;
};

type FiberCanvasBoundaryState = {
  hasError: boolean;
};

class FiberCanvasBoundary extends Component<FiberCanvasBoundaryProps, FiberCanvasBoundaryState> {
  state: FiberCanvasBoundaryState = { hasError: false };

  static getDerivedStateFromError(): FiberCanvasBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default function FiberOpticBackground({
  accentColor,
  fiberCount = 10,
}: FiberOpticBackgroundProps) {
  const reducedMotion = usePrefersReducedMotion();
  const webglAvailable = useMemo(() => {
    if (typeof window === 'undefined' || !window.WebGLRenderingContext) return false;
    try {
      const canvas = document.createElement('canvas');
      return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
      return false;
    }
  }, []);

  if (!webglAvailable) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
      style={{ zIndex: 1 }}
    >
      <FiberCanvasBoundary>
        <Canvas
          camera={{ position: [0, 0, 6], fov: 50 }}
          frameloop={reducedMotion ? 'demand' : 'always'}
          dpr={[1, 1.5]}
          gl={{
            antialias: false,
            alpha: true,
            powerPreference: 'low-power',
          }}
          style={{ background: 'transparent' }}
        >
          <FiberScene
            accentColor={accentColor}
            fiberCount={fiberCount}
            reducedMotion={reducedMotion}
          />
        </Canvas>
      </FiberCanvasBoundary>
    </div>
  );
}
