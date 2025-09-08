'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { getModelUrl } from '@/data/characterModels';

const CharacterViewer3D = dynamic(() => import('@/components/CharacterViewer3D'), { ssr: false });

export default function ThreePreviewPage() {
  const defaultUrl = useMemo(() => 'https://raw.githubusercontent.com/8thwall/web/master/examples/aframe/animation-mixer/mixamo-animated-lowpoly.glb', []);
  const [url, setUrl] = useState(defaultUrl);
  const [animNames, setAnimNames] = useState<string[]>([]);
  const [anim, setAnim] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [enableZoom, setEnableZoom] = useState(true);
  const [env, setEnv] = useState<'city' | 'sunset' | 'dawn' | 'night' | 'forest' | 'apartment' | 'warehouse' | 'park' | 'studio'>('city');
  const [envUrl, setEnvUrl] = useState<string>('');
  const [useHdrUrl, setUseHdrUrl] = useState<boolean>(false);
  const [stageUrl, setStageUrl] = useState<string>('');
  const [stageScale, setStageScale] = useState<number>(1);
  const [tintHair, setTintHair] = useState<boolean>(true);
  const [hairColor, setHairColor] = useState<string>('#d90429');

  const curatedHDRIs: { label: string; url: string }[] = [
    { label: 'Studio Small 03', url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_03_1k.hdr' },
    { label: 'Dikhololo Night', url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/dikhololo_night_1k.hdr' },
    { label: 'Venice Sunset', url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/venice_sunset_1k.hdr' },
    { label: 'Forest Slope', url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/forest_slope_1k.hdr' },
    { label: 'Empty Warehouse', url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/empty_warehouse_01_1k.hdr' },
  ];
  const curatedStages: { label: string; url: string; scale?: number }[] = [
    { label: 'Sponza (Khronos)', url: 'https://github.com/KhronosGroup/glTF-Sample-Models/raw/master/2.0/Sponza/glTF-Binary/Sponza.glb', scale: 0.01 },
  ];

  const handleAnimations = useCallback((names: string[]) => {
    setAnimNames(names);
    if (!anim && names && names.length) setAnim(names[0]);
  }, [anim]);

  return (
    <div className="min-h-screen py-12 px-4 bg-grid-overlay">
      <div className="cp-container">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">3D Preview</h1>
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">Back home</Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          <div className="lg:col-span-3">
        <div className="cp-panel p-4">
              <CharacterViewer3D
                modelUrl={url}
                height={520}
                autoRotate={autoRotate}
                enableZoom={enableZoom}
                env={env}
                envUrl={useHdrUrl && envUrl ? envUrl : undefined}
                animation={anim}
                onAnimations={handleAnimations}
                stageUrl={stageUrl || undefined}
                stageScale={stageScale}
                tintHairColor={tintHair ? hairColor : undefined}
              />
            </div>
          </div>
          <div className="lg:col-span-1">
        <div className="cp-panel p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model URL (.glb/.gltf)</label>
                <input
                  type="url"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://.../model.glb"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Animation</label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={anim || ''}
                  onChange={(e) => setAnim(e.target.value || null)}
                >
                  {animNames.length === 0 && <option value="">(none)</option>}
                  {animNames.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Use HDRI URL</span>
                  <button
                    onClick={() => setUseHdrUrl((v) => !v)}
                  className={`px-3 py-1 text-xs rounded-full ${useHdrUrl ? 'bg-white text-gray-900' : 'bg-white/10 text-white'}`}
                  >{useHdrUrl ? 'On' : 'Off'}</button>
                </div>
                {!useHdrUrl && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Env Preset</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      value={env}
                      onChange={(e) => setEnv(e.target.value as any)}
                    >
                      {['city','sunset','dawn','night','forest','apartment','warehouse','park','studio'].map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                )}
                {useHdrUrl && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Env HDRI URL (.hdr)</label>
                    <input
                      type="url"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      value={envUrl}
                      onChange={(e) => setEnvUrl(e.target.value)}
                      placeholder="https://.../studio_small_03_1k.hdr"
                    />
                    <select
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      onChange={(e) => setEnvUrl(e.target.value)}
                    >
                      <option value="">(choose curated)</option>
                      {curatedHDRIs.map((h) => (
                        <option key={h.url} value={h.url}>{h.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Auto-rotate</span>
                <button
                  onClick={() => setAutoRotate((v) => !v)}
                  className={`px-3 py-1 text-xs rounded-full ${autoRotate ? 'bg-white text-gray-900' : 'bg-white/10 text-white'}`}
                >{autoRotate ? 'On' : 'Off'}</button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Zoom</span>
                <button
                  onClick={() => setEnableZoom((v) => !v)}
                  className={`px-3 py-1 text-xs rounded-full ${enableZoom ? 'bg-white text-gray-900' : 'bg-white/10 text-white'}`}
                >{enableZoom ? 'Enabled' : 'Disabled'}</button>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Stage (GLB)</label>
                <input
                  type="url"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={stageUrl}
                  onChange={(e) => setStageUrl(e.target.value)}
                  placeholder="https://.../stage.glb"
                />
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  onChange={(e) => {
                    const found = curatedStages.find((s) => s.url === e.target.value);
                    setStageUrl(e.target.value);
                    if (found?.scale) setStageScale(found.scale);
                  }}
                >
                  <option value="">(choose curated)</option>
                  {curatedStages.map((s) => (
                    <option key={s.url} value={s.url}>{s.label}</option>
                  ))}
                </select>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stage Scale</label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={stageScale}
                  onChange={(e) => setStageScale(parseFloat(e.target.value) || 1)}
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Tint Hair</span>
                  <button
                    onClick={() => setTintHair((v) => !v)}
                  className={`px-3 py-1 text-xs rounded-full ${tintHair ? 'bg-white text-gray-900' : 'bg-white/10 text-white'}`}
                  >{tintHair ? 'On' : 'Off'}</button>
                </div>
                {tintHair && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hair Color</label>
                    <input type="color" value={hairColor} onChange={(e) => setHairColor(e.target.value)} />
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">Tip: Try a Ready Player Me .glb or a Mixamo-exported glTF.</p>
            </div>
          </div>
        </div>

        <p className="mt-2 text-sm text-gray-600">This page lazy-loads 3D code in the browser.</p>
      </div>
    </div>
  );
}
