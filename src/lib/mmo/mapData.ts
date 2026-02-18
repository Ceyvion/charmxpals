// Rift Arena — Per-map collision geometry, zones, spawn points, and theme palettes.
// Shared by both server (movement enforcement) and client (prediction + rendering).

export type Vec2 = { x: number; y: number };
export type Rect = { x1: number; y1: number; x2: number; y2: number };
export type Circle = { cx: number; cy: number; r: number };

export type MapZone = {
  id: string;
  type: 'health' | 'speed' | 'power';
  rect?: Rect;
  circle?: Circle;
};

export type MapTheme = {
  primary: string;
  secondary: string;
  pulse: string;
  ambient: string;
  gridTint: [number, number, number]; // RGB 0-255
};

export type MapCollisionData = {
  walkableRects: Rect[];
  walkableCircles: Circle[];
  spawnPoints: Vec2[];
  healthPickups: Array<{ id: string; pos: Vec2; r: number }>;
  speedZones: Rect[];
  powerZone: Circle;
  theme: MapTheme;
};

export type ArenaMapId = 'neon-grid' | 'crystal-rift' | 'voltage-foundry';

// ---------------------------------------------------------------------------
// Collision helpers
// ---------------------------------------------------------------------------

function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2;
}

function inCircle(c: Circle, x: number, y: number): boolean {
  const dx = x - c.cx;
  const dy = y - c.cy;
  return dx * dx + dy * dy <= c.r * c.r;
}

export function isWalkable(map: MapCollisionData, x: number, y: number): boolean {
  for (const r of map.walkableRects) {
    if (inRect(r, x, y)) return true;
  }
  for (const c of map.walkableCircles) {
    if (inCircle(c, x, y)) return true;
  }
  return false;
}

export function clampToWalkable(
  map: MapCollisionData,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Vec2 {
  if (isWalkable(map, toX, toY)) return { x: toX, y: toY };
  // Wall-slide: try X only
  if (isWalkable(map, toX, fromY)) return { x: toX, y: fromY };
  // Wall-slide: try Y only
  if (isWalkable(map, fromX, toY)) return { x: fromX, y: toY };
  // Can't move
  return { x: fromX, y: fromY };
}

export function isInSpeedZone(map: MapCollisionData, x: number, y: number): boolean {
  for (const r of map.speedZones) {
    if (inRect(r, x, y)) return true;
  }
  return false;
}

export function isInPowerZone(map: MapCollisionData, x: number, y: number): boolean {
  return inCircle(map.powerZone, x, y);
}

// ---------------------------------------------------------------------------
// Neon Grid — Cyan/magenta circuit board with wide lanes and a central hub.
// The image shows horizontal and vertical glowing lanes with corner power nodes
// and a large circular hub at center.
// ---------------------------------------------------------------------------

const neonGrid: MapCollisionData = {
  walkableRects: [
    // Central horizontal highway
    { x1: -14, y1: -1.8, x2: 14, y2: 1.8 },
    // Central vertical highway
    { x1: -1.8, y1: -8, x2: 1.8, y2: 8 },
    // Top horizontal lane
    { x1: -14, y1: -7.5, x2: 14, y2: -5.2 },
    // Bottom horizontal lane
    { x1: -14, y1: 5.2, x2: 14, y2: 7.5 },
    // Left vertical lane
    { x1: -13.5, y1: -8, x2: -10.5, y2: 8 },
    // Right vertical lane
    { x1: 10.5, y1: -8, x2: 13.5, y2: 8 },
    // Left mid vertical connector
    { x1: -7, y1: -8, x2: -5, y2: 8 },
    // Right mid vertical connector
    { x1: 5, y1: -8, x2: 7, y2: 8 },
    // Top mid horizontal connector
    { x1: -14, y1: -4, x2: 14, y2: -2.8 },
    // Bottom mid horizontal connector
    { x1: -14, y1: 2.8, x2: 14, y2: 4 },
  ],
  walkableCircles: [
    // Central hub
    { cx: 0, cy: 0, r: 3.5 },
    // Corner nodes
    { cx: -12, cy: -6.3, r: 1.8 },
    { cx: 12, cy: -6.3, r: 1.8 },
    { cx: -12, cy: 6.3, r: 1.8 },
    { cx: 12, cy: 6.3, r: 1.8 },
  ],
  spawnPoints: [
    { x: -12, y: -6.3 }, { x: 12, y: -6.3 },
    { x: -12, y: 6.3 }, { x: 12, y: 6.3 },
    { x: -6, y: 0 }, { x: 6, y: 0 },
    { x: 0, y: -6.3 }, { x: 0, y: 6.3 },
  ],
  healthPickups: [
    { id: 'hp-1', pos: { x: -6, y: -3.4 }, r: 0.7 },
    { id: 'hp-2', pos: { x: 6, y: -3.4 }, r: 0.7 },
    { id: 'hp-3', pos: { x: -6, y: 3.4 }, r: 0.7 },
    { id: 'hp-4', pos: { x: 6, y: 3.4 }, r: 0.7 },
    { id: 'hp-5', pos: { x: -12, y: 0 }, r: 0.7 },
    { id: 'hp-6', pos: { x: 12, y: 0 }, r: 0.7 },
  ],
  speedZones: [
    // Horizontal speed lanes near top and bottom
    { x1: -9, y1: -6.8, x2: -2, y2: -5.8 },
    { x1: 2, y1: -6.8, x2: 9, y2: -5.8 },
    { x1: -9, y1: 5.8, x2: -2, y2: 6.8 },
    { x1: 2, y1: 5.8, x2: 9, y2: 6.8 },
  ],
  powerZone: { cx: 0, cy: 0, r: 2.5 },
  theme: {
    primary: '#7ad4ff',
    secondary: '#ff6ef7',
    pulse: '#00e5ff',
    ambient: '#4dc9f6',
    gridTint: [122, 212, 255],
  },
};

// ---------------------------------------------------------------------------
// Crystal Rift — Blue crystal walkways over dark water. Diamond-shaped paths
// with narrow bridges at the four cardinal directions and crystal cluster
// platforms at intersections.
// ---------------------------------------------------------------------------

const crystalRift: MapCollisionData = {
  walkableRects: [
    // North bridge
    { x1: -1.5, y1: -8, x2: 1.5, y2: -3 },
    // South bridge
    { x1: -1.5, y1: 3, x2: 1.5, y2: 8 },
    // East bridge
    { x1: 3, y1: -1.5, x2: 14, y2: 1.5 },
    // West bridge
    { x1: -14, y1: -1.5, x2: -3, y2: 1.5 },
    // Inner diamond — top-left to center (angled approximated as rects)
    { x1: -5, y1: -5, x2: -2, y2: -2 },
    { x1: -3.5, y1: -3.5, x2: -0.5, y2: -1.5 },
    // Inner diamond — top-right to center
    { x1: 2, y1: -5, x2: 5, y2: -2 },
    { x1: 0.5, y1: -3.5, x2: 3.5, y2: -1.5 },
    // Inner diamond — bottom-left to center
    { x1: -5, y1: 2, x2: -2, y2: 5 },
    { x1: -3.5, y1: 1.5, x2: -0.5, y2: 3.5 },
    // Inner diamond — bottom-right to center
    { x1: 2, y1: 2, x2: 5, y2: 5 },
    { x1: 0.5, y1: 1.5, x2: 3.5, y2: 3.5 },
    // Far east platform
    { x1: 9, y1: -3, x2: 13, y2: 3 },
    // Far west platform
    { x1: -13, y1: -3, x2: -9, y2: 3 },
    // Far north platform
    { x1: -3, y1: -8, x2: 3, y2: -5.5 },
    // Far south platform
    { x1: -3, y1: 5.5, x2: 3, y2: 8 },
    // Cross-connecting outer paths
    { x1: -9, y1: -5, x2: -5, y2: -3 },
    { x1: 5, y1: -5, x2: 9, y2: -3 },
    { x1: -9, y1: 3, x2: -5, y2: 5 },
    { x1: 5, y1: 3, x2: 9, y2: 5 },
  ],
  walkableCircles: [
    // Center nexus
    { cx: 0, cy: 0, r: 3 },
    // Crystal cluster platforms at diamond corners
    { cx: -4, cy: -4, r: 1.5 },
    { cx: 4, cy: -4, r: 1.5 },
    { cx: -4, cy: 4, r: 1.5 },
    { cx: 4, cy: 4, r: 1.5 },
  ],
  spawnPoints: [
    { x: 0, y: -7 }, { x: 0, y: 7 },
    { x: -11, y: 0 }, { x: 11, y: 0 },
    { x: -4, y: -4 }, { x: 4, y: -4 },
    { x: -4, y: 4 }, { x: 4, y: 4 },
  ],
  healthPickups: [
    { id: 'hp-1', pos: { x: -7, y: -4 }, r: 0.7 },
    { id: 'hp-2', pos: { x: 7, y: -4 }, r: 0.7 },
    { id: 'hp-3', pos: { x: -7, y: 4 }, r: 0.7 },
    { id: 'hp-4', pos: { x: 7, y: 4 }, r: 0.7 },
    { id: 'hp-5', pos: { x: 0, y: -6 }, r: 0.7 },
    { id: 'hp-6', pos: { x: 0, y: 6 }, r: 0.7 },
  ],
  speedZones: [
    // Cardinal bridges are speed lanes
    { x1: -1.2, y1: -7.5, x2: 1.2, y2: -4 },
    { x1: -1.2, y1: 4, x2: 1.2, y2: 7.5 },
    { x1: 4, y1: -1.2, x2: 12, y2: 1.2 },
  ],
  powerZone: { cx: 0, cy: 0, r: 2.2 },
  theme: {
    primary: '#5b8dee',
    secondary: '#a78bfa',
    pulse: '#93c5fd',
    ambient: '#6366f1',
    gridTint: [99, 102, 241],
  },
};

// ---------------------------------------------------------------------------
// Voltage Foundry — Lava catwalks with a central forge. Cross-shaped main
// walkways, diagonal paths to corners, corner foundry platforms.
// ---------------------------------------------------------------------------

const voltageFoundry: MapCollisionData = {
  walkableRects: [
    // Main horizontal cross arm
    { x1: -14, y1: -2, x2: 14, y2: 2 },
    // Main vertical cross arm
    { x1: -2, y1: -8, x2: 2, y2: 8 },
    // Diagonal NW catwalk (approximated as chain of rects)
    { x1: -10, y1: -7, x2: -7, y2: -5 },
    { x1: -8, y1: -6, x2: -5, y2: -4 },
    { x1: -6, y1: -5, x2: -3, y2: -3 },
    // Diagonal NE catwalk
    { x1: 7, y1: -7, x2: 10, y2: -5 },
    { x1: 5, y1: -6, x2: 8, y2: -4 },
    { x1: 3, y1: -5, x2: 6, y2: -3 },
    // Diagonal SW catwalk
    { x1: -10, y1: 5, x2: -7, y2: 7 },
    { x1: -8, y1: 4, x2: -5, y2: 6 },
    { x1: -6, y1: 3, x2: -3, y2: 5 },
    // Diagonal SE catwalk
    { x1: 7, y1: 5, x2: 10, y2: 7 },
    { x1: 5, y1: 4, x2: 8, y2: 6 },
    { x1: 3, y1: 3, x2: 6, y2: 5 },
    // Corner foundry platforms
    { x1: -13, y1: -8, x2: -9.5, y2: -5.5 },
    { x1: 9.5, y1: -8, x2: 13, y2: -5.5 },
    { x1: -13, y1: 5.5, x2: -9.5, y2: 8 },
    { x1: 9.5, y1: 5.5, x2: 13, y2: 8 },
  ],
  walkableCircles: [
    // Central forge
    { cx: 0, cy: 0, r: 3 },
    // Corner platform circles overlapping rects
    { cx: -11.2, cy: -6.7, r: 2 },
    { cx: 11.2, cy: -6.7, r: 2 },
    { cx: -11.2, cy: 6.7, r: 2 },
    { cx: 11.2, cy: 6.7, r: 2 },
  ],
  spawnPoints: [
    { x: -11.2, y: -6.7 }, { x: 11.2, y: -6.7 },
    { x: -11.2, y: 6.7 }, { x: 11.2, y: 6.7 },
    { x: -10, y: 0 }, { x: 10, y: 0 },
    { x: 0, y: -6 }, { x: 0, y: 6 },
  ],
  healthPickups: [
    { id: 'hp-1', pos: { x: -7, y: 0 }, r: 0.7 },
    { id: 'hp-2', pos: { x: 7, y: 0 }, r: 0.7 },
    { id: 'hp-3', pos: { x: 0, y: -5 }, r: 0.7 },
    { id: 'hp-4', pos: { x: 0, y: 5 }, r: 0.7 },
    { id: 'hp-5', pos: { x: -8, y: -5.5 }, r: 0.7 },
    { id: 'hp-6', pos: { x: 8, y: 5.5 }, r: 0.7 },
  ],
  speedZones: [
    // Horizontal cross arms (outer sections)
    { x1: -13, y1: -1.2, x2: -5, y2: 1.2 },
    { x1: 5, y1: -1.2, x2: 13, y2: 1.2 },
  ],
  powerZone: { cx: 0, cy: 0, r: 2.5 },
  theme: {
    primary: '#ff9f43',
    secondary: '#ff6b6b',
    pulse: '#fbbf24',
    ambient: '#f59e0b',
    gridTint: [255, 159, 67],
  },
};

// ---------------------------------------------------------------------------
// Exported map lookup
// ---------------------------------------------------------------------------

export const MAP_DATA: Record<ArenaMapId, MapCollisionData> = {
  'neon-grid': neonGrid,
  'crystal-rift': crystalRift,
  'voltage-foundry': voltageFoundry,
};
