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
    scene.background = new THREE.Color('#080914');
    scene.fog = new THREE.Fog('#080914', 12, 26);

    const camera = new THREE.OrthographicCamera(-10, 10, 7.5, -7.5, 0.1, 80);
    camera.position.set(8, 8.5, 8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor('#080914', 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight('#ffffff', 0.95));
    const keyLight = new THREE.DirectionalLight('#ffffff', 1.15);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const cyanLight = new THREE.PointLight('#7fe6ff', 1.7, 16);
    cyanLight.position.set(-6, 3, -5);
    scene.add(cyanLight);
    const pinkLight = new THREE.PointLight('#ff8ec9', 1.25, 14);
    pinkLight.position.set(6, 3, 4);
    scene.add(pinkLight);

    const floorGeometry = new THREE.PlaneGeometry(24, 15);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: '#090b16', roughness: 0.94, metalness: 0.1 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(24, 24, '#23315d', '#131a35');
    grid.position.y = 0.012;
    scene.add(grid);

    const glowRingMaterial = new THREE.MeshBasicMaterial({ color: '#ffd60a', transparent: true, opacity: 0.06, side: THREE.DoubleSide });
    const glowRing = new THREE.Mesh(new THREE.RingGeometry(1.2, 4.8, 96), glowRingMaterial);
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = 0.018;
    scene.add(glowRing);

    const edgeRingMaterial = new THREE.MeshBasicMaterial({ color: '#7fe6ff', transparent: true, opacity: 0.18, side: THREE.DoubleSide });
    const edgeRing = new THREE.Mesh(new THREE.RingGeometry(4.8, 5.0, 96), edgeRingMaterial);
    edgeRing.rotation.x = -Math.PI / 2;
    edgeRing.position.y = 0.02;
    scene.add(edgeRing);

    const shard = new THREE.Group();
    shard.position.set(0, 0.42, 0);
    const shardMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.46, 0),
      new THREE.MeshStandardMaterial({ color: '#ffd60a', emissive: '#8f5d00', emissiveIntensity: 1.1, roughness: 0.35, metalness: 0.4 }),
    );
    shardMesh.castShadow = true;
    shard.add(shardMesh);
    shard.add(new THREE.PointLight('#ffd60a', 1.4, 6));
    scene.add(shard);

    const railGeometries: THREE.BoxGeometry[] = [];
    const railMaterials: THREE.MeshBasicMaterial[] = [];
    for (const x of [-8, -4, 4, 8]) {
      const geometry = new THREE.BoxGeometry(0.06, 0.04, 1.4);
      const material = new THREE.MeshBasicMaterial({ color: '#ff8ec9', transparent: true, opacity: 0.28 });
      railGeometries.push(geometry);
      railMaterials.push(material);
      const rail = new THREE.Mesh(geometry, material);
      rail.position.set(x, 0.04, -6.7);
      scene.add(rail);
    }
    for (const z of [-5, 0, 5]) {
      const geometry = new THREE.BoxGeometry(1.2, 0.04, 0.06);
      const material = new THREE.MeshBasicMaterial({ color: '#7fe6ff', transparent: true, opacity: 0.2 });
      railGeometries.push(geometry);
      railMaterials.push(material);
      const rail = new THREE.Mesh(geometry, material);
      rail.position.set(-11.2, 0.04, z);
      scene.add(rail);
    }

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
      shard.position.y = 0.42 + Math.sin(t * 1.8) * 0.05;
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
      floorGeometry.dispose();
      floorMaterial.dispose();
      glowRing.geometry.dispose();
      glowRingMaterial.dispose();
      edgeRing.geometry.dispose();
      edgeRingMaterial.dispose();
      shardMesh.geometry.dispose();
      (shardMesh.material as THREE.Material).dispose();
      railGeometries.forEach((geometry) => geometry.dispose());
      railMaterials.forEach((material) => material.dispose());
      shadowGeometry.dispose();
      ringGeometry.dispose();
      bodyGeometry.dispose();
      coneGeometry.dispose();
    };
  }, [axesRef]);

  return <div ref={mountRef} className="h-full w-full" />;
}
