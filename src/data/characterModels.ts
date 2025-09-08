// Note: keep this module environment-agnostic so it can be imported
// from both server and client components.

// Map character names or IDs to GLB model URLs (glTF binary)
// Replace these with your own hosted models as they become available.
// For demo, we default to a small expressive robot from modelviewer samples.

export type CharacterLike = { id: string; name?: string };

const DEFAULT_MODEL =
  'https://modelviewer.dev/shared-assets/models/RobotExpressive.glb';

// Optional: add explicit per-character mappings here.
const byId: Record<string, string> = {};
const byName: Record<string, string> = {
  // example: 'Blaze': 'https://your-cdn/blaze.glb',
};

export function getModelUrl(c: CharacterLike | null | undefined): string {
  if (!c) return DEFAULT_MODEL;
  if (byId[c.id]) return byId[c.id];
  const name = (c.name || '').trim();
  if (name && byName[name]) return byName[name];
  return DEFAULT_MODEL;
}
