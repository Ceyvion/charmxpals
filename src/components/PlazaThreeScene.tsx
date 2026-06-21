"use client";

import { useEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';

import type { PlayerState } from '@/lib/mmo/messages';
import { loreBySlug } from '@/data/characterLore';

type Vec2 = { x: number; y: number };

export type PlazaThreeScenePlayer = PlayerState & {
  renderPos: Vec2;
  targetPos: Vec2;
  lastUpdate: number;
  activeEmote?: { code: string; until: number };
};

export type PlazaThreeSceneProps = {
  players: PlazaThreeScenePlayer[];
  youId: string | null;
  axesRef: MutableRefObject<Vec2>;
};

type PlayerObject = {
  group: THREE.Group;
  ring: THREE.Mesh;
  body: THREE.Mesh;
  cone: THREE.Mesh;
  label: THREE.Sprite;
  emote: THREE.Sprite;
  labelKey: string;
  emoteKey: string | null;
  labelTexture?: THREE.CanvasTexture;
  emoteTexture?: THREE.CanvasTexture;
};

const EMOTE_GLYPHS: Record<string, string> = {
  wave: '\u{1F44B}',
  cheer: '\u2728',
  dance: '\u{1F483}',
  fire: '\u{1F525}',
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

function charColor(characterId: string | undefined | null): string {
  if (!characterId) return '#7FE6FF';
  return loreBySlug[characterId]?.color ?? '#7FE6FF';
}

function charName(characterId: string | undefined | null): string | null {
  if (!characterId) return null;
  return loreBySlug[characterId]?.name ?? null;
}

function makeLabelTexture(text: string, accent: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = 256;
  const height = 64;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(7, 8, 18, 0.76)';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(8, 10, width - 16, height - 20, 12);
  ctx.fill();
  ctx.stroke();
  ctx.font = '700 23px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f8fbff';
  ctx.fillText(text.slice(0, 18), width / 2, height / 2 + 1, width - 34);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function makeEmoteTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = 128;
  canvas.width = size * dpr;
  canvas.height = size * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(7, 8, 18, 0.55)';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '64px "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size / 2, size / 2 + 3);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function makePanelTexture(title: string, subtitle: string, accent: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = 512;
  const height = 256;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'rgba(10, 20, 38, 0.95)');
  gradient.addColorStop(1, 'rgba(4, 7, 18, 0.95)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(24, 22, width - 48, height - 44, 28);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 18;
  ctx.font = '900 52px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, width / 2, 104, width - 84);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(248, 251, 255, 0.8)';
  ctx.font = '800 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(subtitle, width / 2, 158, width - 88);

  for (let i = 0; i < 8; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? '#ff8ec9' : '#7fe6ff';
    ctx.fillRect(52 + i * 52, 198, 26, 8);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function disposePlayerObject(object: PlayerObject) {
  object.group.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
      const material = child.material;
      if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose());
      } else {
        material.dispose();
      }
    }
  });
  object.labelTexture?.dispose();
  object.emoteTexture?.dispose();
}

export default function PlazaThreeScene({ players, youId, axesRef }: PlazaThreeSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const playersRef = useRef(players);
  const youIdRef = useRef(youId);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    youIdRef.current = youId;
  }, [youId]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog('#06101c', 13, 30);

    const camera = new THREE.OrthographicCamera(-10, 10, 7.5, -7.5, 0.1, 80);
    camera.position.set(8.8, 8.2, 8.8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor('#000000', 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight('#dcecff', 0.85));
    const keyLight = new THREE.DirectionalLight('#ffffff', 1.15);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const cyanLight = new THREE.PointLight('#23f3ff', 2.4, 20);
    cyanLight.position.set(-6, 3, -5);
    scene.add(cyanLight);
    const pinkLight = new THREE.PointLight('#ff8ec9', 1.25, 14);
    pinkLight.position.set(6, 3, 4);
    scene.add(pinkLight);

    const floorGeometry = new THREE.PlaneGeometry(24, 15);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: '#07101f', roughness: 0.88, metalness: 0.16 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(24, 30, '#183a68', '#0e213e');
    grid.position.y = 0.012;
    scene.add(grid);

    const platformGeometry = new THREE.BoxGeometry(15.6, 0.22, 10.2);
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: '#0a1b2c',
      emissive: '#062d3c',
      emissiveIntensity: 0.35,
      roughness: 0.62,
      metalness: 0.22,
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = 0.08;
    platform.receiveShadow = true;
    scene.add(platform);

    const decorGeometries: THREE.BufferGeometry[] = [];
    const decorMaterials: THREE.Material[] = [];
    const decorObjects: THREE.Object3D[] = [];
    const addDecorBox = (
      position: [number, number, number],
      size: [number, number, number],
      color: string,
      opacity = 1,
      emissive?: string,
    ) => {
      const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: emissive || '#000000',
        emissiveIntensity: emissive ? 0.45 : 0,
        roughness: 0.55,
        metalness: 0.35,
        transparent: opacity < 1,
        opacity,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(position[0], position[1], position[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      decorGeometries.push(geometry);
      decorMaterials.push(material);
      decorObjects.push(mesh);
      scene.add(mesh);
      return mesh;
    };

    const tileGeometry = new THREE.PlaneGeometry(14.85, 9.45, 1, 1);
    const tileMaterial = new THREE.MeshBasicMaterial({
      color: '#0b2440',
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    });
    const tile = new THREE.Mesh(tileGeometry, tileMaterial);
    tile.rotation.x = -Math.PI / 2;
    tile.position.y = 0.205;
    scene.add(tile);

    for (let x = -6.75; x <= 6.76; x += 1.5) {
      addDecorBox([x, 0.234, 0], [0.025, 0.018, 9.2], '#1c4164', 0.46, '#0b4a64');
    }
    for (let z = -4.05; z <= 4.06; z += 1.35) {
      addDecorBox([0, 0.238, z], [14.5, 0.016, 0.025], '#163a5d', 0.42, '#08344f');
    }

    const glowRingMaterial = new THREE.MeshBasicMaterial({ color: '#23f3ff', transparent: true, opacity: 0.1, side: THREE.DoubleSide });
    const glowRing = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.95, 128), glowRingMaterial);
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = 0.23;
    scene.add(glowRing);

    const edgeRingMaterial = new THREE.MeshBasicMaterial({ color: '#23f3ff', transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const edgeRing = new THREE.Mesh(new THREE.RingGeometry(1.95, 2.08, 128), edgeRingMaterial);
    edgeRing.rotation.x = -Math.PI / 2;
    edgeRing.position.y = 0.245;
    scene.add(edgeRing);

    const shard = new THREE.Group();
    shard.position.set(0, 1.38, 0);
    const shardMaterial = new THREE.MeshStandardMaterial({
      color: '#50f7ff',
      emissive: '#00c8ff',
      emissiveIntensity: 1.8,
      roughness: 0.12,
      metalness: 0.08,
      transparent: true,
      opacity: 0.9,
    });
    const shardMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.44, 2.7, 6),
      shardMaterial,
    );
    shardMesh.castShadow = true;
    shard.add(shardMesh);
    const shardTop = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.68, 6), shardMaterial);
    shardTop.position.y = 1.68;
    shardTop.castShadow = true;
    shard.add(shardTop);
    const shardBottom = new THREE.Mesh(new THREE.ConeGeometry(0.44, 0.62, 6), shardMaterial);
    shardBottom.position.y = -1.66;
    shardBottom.rotation.x = Math.PI;
    shardBottom.castShadow = true;
    shard.add(shardBottom);
    shard.add(new THREE.PointLight('#23f3ff', 3.2, 10));
    scene.add(shard);

    const coreBaseGeometry = new THREE.CylinderGeometry(1.25, 1.5, 0.34, 48);
    const coreBaseMaterial = new THREE.MeshStandardMaterial({
      color: '#071420',
      emissive: '#0bbdde',
      emissiveIntensity: 0.32,
      roughness: 0.5,
      metalness: 0.45,
    });
    const coreBase = new THREE.Mesh(coreBaseGeometry, coreBaseMaterial);
    coreBase.position.y = 0.32;
    coreBase.castShadow = true;
    coreBase.receiveShadow = true;
    scene.add(coreBase);
    addDecorBox([0, 0.47, -1.68], [2.35, 0.16, 0.2], '#0d314a', 1, '#0ddaff');
    addDecorBox([0, 0.47, 1.68], [2.35, 0.16, 0.2], '#0d314a', 1, '#0ddaff');
    addDecorBox([-1.68, 0.47, 0], [0.2, 0.16, 2.35], '#0d314a', 1, '#0ddaff');
    addDecorBox([1.68, 0.47, 0], [0.2, 0.16, 2.35], '#0d314a', 1, '#0ddaff');

    const signageTextures = [
      makePanelTexture('PRISMIX', 'LIVE MIX', '#ff4dcc'),
      makePanelTexture('SYNC', 'STRAT SHINE', '#23f3ff'),
    ];
    const signSprites: THREE.Sprite[] = [];
    const signPositions: Array<[number, number, number]> = [
      [-5.8, 1.25, -4.2],
      [5.85, 1.25, -4.15],
    ];
    signageTextures.forEach((texture, index) => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true }));
      sprite.position.set(...signPositions[index]);
      sprite.scale.set(3.4, 1.7, 1);
      sprite.renderOrder = 5;
      signSprites.push(sprite);
      scene.add(sprite);
    });
    addDecorBox([-5.8, 0.52, -4.36], [3.95, 0.38, 0.42], '#101a31', 1, '#14335c');
    addDecorBox([-7.95, 1.03, -4.36], [0.22, 1.45, 0.28], '#18243b', 1, '#ff4dcc');
    addDecorBox([-3.65, 1.03, -4.36], [0.22, 1.45, 0.28], '#18243b', 1, '#23f3ff');
    addDecorBox([5.85, 0.52, -4.36], [3.95, 0.38, 0.42], '#101a31', 1, '#14335c');
    addDecorBox([3.7, 1.03, -4.36], [0.22, 1.45, 0.28], '#18243b', 1, '#ff4dcc');
    addDecorBox([8, 1.03, -4.36], [0.22, 1.45, 0.28], '#18243b', 1, '#23f3ff');

    const railGeometries: THREE.BoxGeometry[] = [];
    const railMaterials: THREE.MeshBasicMaterial[] = [];
    const railMeshes: THREE.Mesh[] = [];
    const deckEdgeSpecs: Array<[number, number, number, number, number, number, string, number]> = [
      [0, 0.34, -5.16, 15.8, 0.08, 0.1, '#23f3ff', 0.72],
      [0, 0.34, 5.16, 15.8, 0.08, 0.1, '#23f3ff', 0.42],
      [-7.9, 0.34, 0, 0.1, 0.08, 10.4, '#23f3ff', 0.36],
      [7.9, 0.34, 0, 0.1, 0.08, 10.4, '#23f3ff', 0.48],
    ];
    for (const [x, y, z, width, boxHeight, depth, color, opacity] of deckEdgeSpecs) {
      const geometry = new THREE.BoxGeometry(width, boxHeight, depth);
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
      railGeometries.push(geometry);
      railMaterials.push(material);
      const rail = new THREE.Mesh(geometry, material);
      rail.position.set(x, y, z);
      railMeshes.push(rail);
      scene.add(rail);
    }
    for (const x of [-7.1, -4.5, 4.5, 7.1]) {
      const geometry = new THREE.BoxGeometry(1.4, 0.07, 0.08);
      const material = new THREE.MeshBasicMaterial({ color: '#23f3ff', transparent: true, opacity: 0.55 });
      railGeometries.push(geometry);
      railMaterials.push(material);
      const rail = new THREE.Mesh(geometry, material);
      rail.position.set(x, 0.52, -5.52);
      railMeshes.push(rail);
      scene.add(rail);
    }
    for (const z of [-4, -1.8, 0.5, 2.9, 4.7]) {
      const geometry = new THREE.BoxGeometry(0.08, 0.07, 1.4);
      const material = new THREE.MeshBasicMaterial({ color: '#ff8ec9', transparent: true, opacity: 0.32 });
      railGeometries.push(geometry);
      railMaterials.push(material);
      const rail = new THREE.Mesh(geometry, material);
      rail.position.set(-8.55, 0.52, z);
      railMeshes.push(rail);
      scene.add(rail);
    }

    for (const [x, z, w, d] of [
      [-6.8, 5.86, 1.9, 0.6],
      [-2.5, 5.93, 1.45, 0.52],
      [3.05, 5.9, 1.75, 0.55],
      [6.8, 5.82, 2.05, 0.62],
      [-9.2, 1.35, 0.55, 1.8],
      [9.22, 1.4, 0.55, 1.75],
      [-8.9, -3.15, 0.5, 1.35],
      [8.9, -3.3, 0.5, 1.35],
    ] as Array<[number, number, number, number]>) {
      addDecorBox([x, 0.36, z], [w, 0.46, d], '#0d182b', 1, '#0b4260');
      addDecorBox([x, 0.64, z], [w * 0.68, 0.09, 0.07], '#113e5a', 1, '#23f3ff');
    }

    const lampGeometry = new THREE.CylinderGeometry(0.07, 0.1, 0.9, 12);
    const lampMaterial = new THREE.MeshStandardMaterial({ color: '#13243c', roughness: 0.45, metalness: 0.5 });
    const lampCapGeometry = new THREE.SphereGeometry(0.13, 16, 10);
    const lampCapMaterial = new THREE.MeshStandardMaterial({ color: '#ff9d3d', emissive: '#ff7b1d', emissiveIntensity: 1.8 });
    const lampParts: THREE.Mesh[] = [];
    for (const [x, z] of [[-8.9, -5.8], [-2.9, -6.05], [2.9, -6.05], [8.9, -5.8], [-9.7, 4.7], [9.7, 4.7]] as Array<[number, number]>) {
      const post = new THREE.Mesh(lampGeometry, lampMaterial);
      post.position.set(x, 0.55, z);
      post.castShadow = true;
      scene.add(post);
      lampParts.push(post);
      const cap = new THREE.Mesh(lampCapGeometry, lampCapMaterial);
      cap.position.set(x, 1.08, z);
      scene.add(cap);
      lampParts.push(cap);
      const light = new THREE.PointLight('#ff8a2e', 0.7, 3);
      light.position.set(x, 1.1, z);
      scene.add(light);
    }

    const plantStemMaterial = new THREE.MeshStandardMaterial({ color: '#113f2b', roughness: 0.7 });
    const plantLeafMaterial = new THREE.MeshStandardMaterial({
      color: '#28d878',
      emissive: '#0b753d',
      emissiveIntensity: 0.35,
      roughness: 0.55,
    });
    const plantGeometries: THREE.BufferGeometry[] = [];
    const plantMaterials = [plantStemMaterial, plantLeafMaterial];
    for (const [x, z] of [[-9.25, -4.85], [-8.9, 4.2], [8.75, -4.9], [9.15, 4.2]] as Array<[number, number]>) {
      const stemGeometry = new THREE.CylinderGeometry(0.045, 0.06, 0.62, 8);
      const stem = new THREE.Mesh(stemGeometry, plantStemMaterial);
      stem.position.set(x, 0.56, z);
      plantGeometries.push(stemGeometry);
      decorObjects.push(stem);
      scene.add(stem);
      for (let i = 0; i < 3; i += 1) {
        const leafGeometry = new THREE.ConeGeometry(0.24 - i * 0.035, 0.36, 7);
        const leaf = new THREE.Mesh(leafGeometry, plantLeafMaterial);
        leaf.position.set(x, 0.74 + i * 0.18, z);
        leaf.rotation.y = i * 1.7;
        plantGeometries.push(leafGeometry);
        decorObjects.push(leaf);
        scene.add(leaf);
      }
    }

    const generatedStageBackedObjects: THREE.Object3D[] = [
      floor,
      grid,
      platform,
      tile,
      glowRing,
      edgeRing,
      shard,
      coreBase,
      ...signSprites,
      ...railMeshes,
      ...lampParts,
      ...decorObjects,
    ];
    generatedStageBackedObjects.forEach((object) => {
      object.visible = false;
    });

    const shadowGeometry = new THREE.CircleGeometry(0.46, 32);
    const ringGeometry = new THREE.RingGeometry(0.48, 0.62, 48);
    const bodyGeometry = new THREE.SphereGeometry(0.34, 36, 24);
    const coneGeometry = new THREE.ConeGeometry(0.08, 0.36, 18);
    const playerObjects = new Map<string, PlayerObject>();

    const createPlayerObject = (player: PlazaThreeScenePlayer, isYouPlayer: boolean): PlayerObject => {
      const color = charColor(player.characterId);
      const group = new THREE.Group();

      const shadow = new THREE.Mesh(
        shadowGeometry,
        new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.35 }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -0.14;
      group.add(shadow);

      const ring = new THREE.Mesh(
        ringGeometry,
        new THREE.MeshBasicMaterial({
          color: isYouPlayer ? '#ff8ec9' : color,
          transparent: true,
          opacity: isYouPlayer ? 0.85 : 0.38,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -0.1;
      group.add(ring);

      const body = new THREE.Mesh(
        bodyGeometry,
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.35,
          roughness: 0.38,
          metalness: 0.18,
        }),
      );
      body.position.y = 0.22;
      body.castShadow = true;
      group.add(body);

      const cone = new THREE.Mesh(
        coneGeometry,
        new THREE.MeshStandardMaterial({
          color: isYouPlayer ? '#ffffff' : color,
          emissive: color,
          emissiveIntensity: 0.2,
        }),
      );
      cone.position.set(0.34, 0.22, 0);
      cone.rotation.z = Math.PI / 2;
      group.add(cone);

      const labelKey = '';
      const labelMaterial = new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false });
      const label = new THREE.Sprite(labelMaterial);
      label.position.set(0, 0.92, 0);
      label.scale.set(1.85, 0.46, 1);
      label.renderOrder = 20;
      group.add(label);

      const emoteMaterial = new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false, opacity: 0 });
      const emote = new THREE.Sprite(emoteMaterial);
      emote.position.set(0, 1.28, 0);
      emote.scale.set(0.72, 0.72, 1);
      emote.renderOrder = 21;
      group.add(emote);

      scene.add(group);
      return { group, ring, body, cone, label, emote, labelKey, emoteKey: null };
    };

    const updateSize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      const aspect = width / height;
      const viewHeight = aspect < 1 ? 16.5 : 15;
      const viewWidth = viewHeight * aspect;
      camera.left = -viewWidth / 2;
      camera.right = viewWidth / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(mount);
    updateSize();

    let animationFrame = 0;
    let lastFrame = performance.now();

    const animate = (now: number) => {
      animationFrame = window.requestAnimationFrame(animate);
      const delta = Math.min(0.12, (now - lastFrame) / 1000);
      lastFrame = now;
      const t = now / 1000;

      shard.rotation.y = t * 0.45;
      shard.position.y = 1.38 + Math.sin(t * 1.8) * 0.06;
      glowRing.rotation.z += delta * 0.08;
      edgeRing.rotation.z -= delta * 0.05;

      const incoming = playersRef.current;
      const liveIds = new Set(incoming.map((player) => player.id));
      for (const [id, object] of playerObjects) {
        if (!liveIds.has(id)) {
          scene.remove(object.group);
          disposePlayerObject(object);
          playerObjects.delete(id);
        }
      }

      for (const player of incoming) {
        const isYouPlayer = player.id === youIdRef.current;
        let object = playerObjects.get(player.id);
        if (!object) {
          object = createPlayerObject(player, isYouPlayer);
          playerObjects.set(player.id, object);
        }

        if (!player.renderPos) player.renderPos = { ...player.pos };
        if (!player.targetPos) player.targetPos = { ...player.pos };

        if (isYouPlayer) {
          const speed = 3.2;
          player.renderPos.x = clamp(player.renderPos.x + axesRef.current.x * speed * delta, -10, 10);
          player.renderPos.y = clamp(player.renderPos.y + axesRef.current.y * speed * delta, -6, 6);
          player.renderPos.x = lerp(player.renderPos.x, player.pos.x, delta * 6);
          player.renderPos.y = lerp(player.renderPos.y, player.pos.y, delta * 6);
        } else {
          player.renderPos.x = lerp(player.renderPos.x, player.targetPos.x, delta * 8);
          player.renderPos.y = lerp(player.renderPos.y, player.targetPos.y, delta * 8);
        }

        object.group.position.set(player.renderPos.x, 0.2 + Math.sin(t * 3 + player.id.length) * 0.025, player.renderPos.y);
        object.group.rotation.y = -player.rot + Math.PI / 2;

        const color = charColor(player.characterId);
        const ringMaterial = object.ring.material as THREE.MeshBasicMaterial;
        ringMaterial.color.set(isYouPlayer ? '#ff8ec9' : color);
        ringMaterial.opacity = isYouPlayer ? 0.85 : 0.38;
        const pulse = isYouPlayer ? 1 + Math.sin(t * 4) * 0.08 : 1;
        object.ring.scale.setScalar(pulse);
        object.ring.rotation.z += delta * 0.7;

        const bodyMaterial = object.body.material as THREE.MeshStandardMaterial;
        bodyMaterial.color.set(color);
        bodyMaterial.emissive.set(color);
        const coneMaterial = object.cone.material as THREE.MeshStandardMaterial;
        coneMaterial.color.set(isYouPlayer ? '#ffffff' : color);
        coneMaterial.emissive.set(color);

        const labelName = isYouPlayer ? 'You' : (player.displayName || charName(player.characterId) || player.id.slice(0, 6));
        const nextLabelKey = `${labelName}:${isYouPlayer ? 'you' : color}`;
        if (object.labelKey !== nextLabelKey) {
          object.labelTexture?.dispose();
          object.labelTexture = makeLabelTexture(labelName, isYouPlayer ? '#ff8ec9' : color);
          (object.label.material as THREE.SpriteMaterial).map = object.labelTexture;
          (object.label.material as THREE.SpriteMaterial).needsUpdate = true;
          object.labelKey = nextLabelKey;
        }

        if (player.activeEmote && player.activeEmote.until < performance.now()) {
          delete player.activeEmote;
        }
        const nextEmote = player.activeEmote ? (EMOTE_GLYPHS[player.activeEmote.code] || player.activeEmote.code) : null;
        const emoteMaterial = object.emote.material as THREE.SpriteMaterial;
        if (nextEmote) {
          if (object.emoteKey !== nextEmote) {
            object.emoteTexture?.dispose();
            object.emoteTexture = makeEmoteTexture(nextEmote);
            emoteMaterial.map = object.emoteTexture;
            emoteMaterial.needsUpdate = true;
            object.emoteKey = nextEmote;
          }
          emoteMaterial.opacity = 1;
          object.emote.position.y = 1.28 + Math.sin(t * 5) * 0.08;
        } else {
          emoteMaterial.opacity = 0;
          object.emoteKey = null;
        }
      }

      renderer.render(scene, camera);
    };

    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      for (const object of playerObjects.values()) {
        scene.remove(object.group);
        disposePlayerObject(object);
      }
      playerObjects.clear();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      grid.geometry.dispose();
      if (Array.isArray(grid.material)) {
        grid.material.forEach((material) => material.dispose());
      } else {
        grid.material.dispose();
      }
      platformGeometry.dispose();
      platformMaterial.dispose();
      tileGeometry.dispose();
      tileMaterial.dispose();
      decorObjects.forEach((object) => {
        scene.remove(object);
      });
      decorGeometries.forEach((geometry) => geometry.dispose());
      decorMaterials.forEach((material) => material.dispose());
      floorGeometry.dispose();
      floorMaterial.dispose();
      glowRing.geometry.dispose();
      glowRingMaterial.dispose();
      edgeRing.geometry.dispose();
      edgeRingMaterial.dispose();
      shardMesh.geometry.dispose();
      shardTop.geometry.dispose();
      shardBottom.geometry.dispose();
      shardMaterial.dispose();
      coreBaseGeometry.dispose();
      coreBaseMaterial.dispose();
      signageTextures.forEach((texture) => texture.dispose());
      signSprites.forEach((sprite) => {
        if (Array.isArray(sprite.material)) {
          sprite.material.forEach((material) => material.dispose());
        } else {
          sprite.material.dispose();
        }
      });
      railGeometries.forEach((geometry) => geometry.dispose());
      railMaterials.forEach((material) => material.dispose());
      lampGeometry.dispose();
      lampMaterial.dispose();
      lampCapGeometry.dispose();
      lampCapMaterial.dispose();
      lampParts.forEach((part) => {
        scene.remove(part);
      });
      plantGeometries.forEach((geometry) => geometry.dispose());
      plantMaterials.forEach((material) => material.dispose());
      shadowGeometry.dispose();
      ringGeometry.dispose();
      bodyGeometry.dispose();
      coneGeometry.dispose();
    };
  }, [axesRef]);

  return <div ref={mountRef} className="h-full w-full" />;
}
