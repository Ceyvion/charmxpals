'use client';

import { useEffect, useId, useState } from 'react';

function getBg(el: HTMLElement | null) {
  if (!el) return null;
  const s = getComputedStyle(el);
  return s.backgroundColor || s.background;
}

export default function StyleDebug() {
  const [bg, setBg] = useState<string | null>(null);
  const [twOk, setTwOk] = useState<boolean | null>(null);
  const [info, setInfo] = useState<any>(null);
  const refId = useId();

  useEffect(() => {
    const el = document.getElementById(refId) as HTMLElement | null;
    const color = getBg(el);
    setBg(color);
    setTwOk(Boolean(color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent'));
  }, [refId]);

  useEffect(() => {
    fetch('/api/style/status').then((r) => r.json()).then(setInfo).catch(() => setInfo({ ok: false }));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Tailwind Debug</h1>
        <div className="rounded-xl border p-4 bg-white">
          <div className="mb-2">Probe element should be red if Tailwind works:</div>
          <div id={refId} className="w-16 h-8 bg-red-500 rounded" />
          <div className="mt-2 text-sm text-gray-700">Computed background: <span className="font-mono">{String(bg)}</span></div>
          <div className="mt-1 text-sm">Tailwind Applied: <span className="font-semibold">{twOk === null ? 'checking…' : twOk ? 'yes' : 'no'}</span></div>
        </div>
        <div className="rounded-xl border p-4 bg-white">
          <div className="font-semibold mb-2">Build Info</div>
          <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify(info, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
