// @ts-nocheck
'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, ContactShadows, useAnimations, Center, Bounds, Html } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';
import { Group } from 'three';

type ModelProps = {
  url: string;
  scale?: number;
  animation?: string | null;
  onAnimations?: (names: string[]) => void;
  onLoaded?: () => void;
  tintHairColor?: string | null;
};

function Model({ url, scale = 1, animation = null, onAnimations, onLoaded, tintHairColor = null }: ModelProps) {
  const gl = useThree((s) => s.gl);
  const gltf = useLoader(
    GLTFLoader,
    url,
    useCallback((loader: GLTFLoader) => {
      // Draco mesh decompression
      const draco = new DRACOLoader();
      draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      loader.setDRACOLoader(draco);
      // KTX2 texture compression (BasisU)
      const ktx2 = new KTX2Loader();
      ktx2.setTranscoderPath('https://unpkg.com/three@0.165.0/examples/jsm/libs/basis/');
      ktx2.detectSupport(gl);
      loader.setKTX2Loader(ktx2);
    }, [gl])
  ) as unknown as { scene: Group; animations?: any[] };
  const { actions, names } = useAnimations((gltf as any).animations || [], (gltf as any).scene);

  // Optional: naive hair tint by material/node name match
  useEffect(() => {
    if (!tintHairColor) return;
    const root = (gltf as any).scene as Group;
    root.traverse((obj: any) => {
      if (!obj.isMesh) return;
      const mat = obj.material;
      const n = (obj.name || '').toLowerCase();
      const mn = (mat?.name || '').toLowerCase();
      if (n.includes('hair') || mn.includes('hair')) {
        if (mat && mat.color) {
          mat.color.set(tintHairColor);
          mat.needsUpdate = true;
        }
      }
    });
  }, [tintHairColor, gltf]);

  // Notify parent about available animations
  useEffect(() => {
    if (names && onAnimations) onAnimations(names);
  }, [names, onAnimations]);

  // Play selected (or first) animation
  useEffect(() => {
    if (!actions) return;
    // stop all
    Object.values(actions).forEach((a: any) => a?.stop?.());
    const toPlay = (animation && actions[animation]) || (Object.values(actions)[0] as any);
    toPlay?.reset?.().fadeIn?.(0.2)?.play?.();
  }, [actions, animation]);

  useEffect(() => {
    onLoaded?.();
  }, [onLoaded]);

  return (
    <Center>
      <primitive object={gltf.scene} scale={scale} />
    </Center>
  );
}

// Avoid preloading at module scope to prevent any accidental SSR network activity.

export default function CharacterViewer3D({
  modelUrl,
  height = 360,
  autoRotate = true,
  enableZoom = true,
  env = 'city',
  envUrl,
  animation = null,
  onAnimations,
  stageUrl,
  stageScale = 1,
  tintHairColor,
}: {
  modelUrl: string;
  height?: number;
  autoRotate?: boolean;
  enableZoom?: boolean;
  env?: 'city' | 'sunset' | 'dawn' | 'night' | 'forest' | 'apartment' | 'warehouse' | 'park' | 'studio';
  envUrl?: string;
  animation?: string | null;
  onAnimations?: (names: string[]) => void;
  stageUrl?: string | null;
  stageScale?: number;
  tintHairColor?: string | null;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-gray-100 bg-white" style={{ height }}>
      {!loaded && (
        <div className="absolute inset-0 grid place-items-center bg-white">
          <div className="flex items-center gap-3 text-gray-600 text-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-gray-400" />
            Loading 3D…
          </div>
        </div>
      )}
      <Canvas camera={{ position: [1.8, 1.2, 2.1], fov: 45 }} dpr={[1, 1.75]} shadows>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 3]} intensity={0.9} castShadow />
        <Suspense fallback={<Html center>Loading…</Html>}>
          <Bounds fit clip observe margin={1}>
            {stageUrl && (
              <Stage url={stageUrl} scale={stageScale} />
            )}
            <Model
              url={modelUrl}
              scale={1.2}
              animation={animation}
              onLoaded={() => setLoaded(true)}
              onAnimations={onAnimations}
              tintHairColor={tintHairColor || null}
            />
          </Bounds>
          <ContactShadows position={[0, -1.05, 0]} opacity={0.35} scale={8} blur={2.5} far={3} />
          {envUrl ? <Environment files={envUrl} background /> : <Environment preset={env} />}
        </Suspense>
        <OrbitControls enablePan={false} enableZoom={enableZoom} autoRotate={autoRotate} autoRotateSpeed={0.6} maxPolarAngle={Math.PI * 0.55} />
      </Canvas>
    </div>
  );
}

function Stage({ url, scale = 1 }: { url: string; scale?: number }) {
  const gl = useThree((s) => s.gl);
  const scene = useLoader(
    GLTFLoader,
    url,
    useCallback((loader: GLTFLoader) => {
      const draco = new DRACOLoader();
      draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      loader.setDRACOLoader(draco);
      const ktx2 = new KTX2Loader();
      ktx2.setTranscoderPath('https://unpkg.com/three@0.165.0/examples/jsm/libs/basis/');
      ktx2.detectSupport(gl);
      loader.setKTX2Loader(ktx2);
    }, [gl])
  ) as unknown as { scene: Group };
  return <primitive object={(scene as any).scene} scale={scale} />;
}
