import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MAP_DEFINITIONS, getArenaBlocksForMap, getJumpPadsForMap } from '../game/maps';
import type { ArenaBlockKind, MapId } from '../game/types';

interface MapPreview3DProps {
  mapId: MapId;
  className?: string;
}

interface BlockVisualSpec {
  color: number;
  roughness: number;
  metalness: number;
  emissive?: number;
  emissiveIntensity?: number;
}

const BLOCK_VISUAL_SPECS: Record<ArenaBlockKind, BlockVisualSpec> = {
  deepslate: { color: 0x475569, roughness: 0.72, metalness: 0.14 },
  obsidian: { color: 0x2a1f3d, roughness: 0.36, metalness: 0.32 },
  gold: { color: 0xeab308, roughness: 0.24, metalness: 0.82, emissive: 0x713f12, emissiveIntensity: 0.12 },
  amethyst: { color: 0x8b5cf6, roughness: 0.2, metalness: 0.28, emissive: 0x5b21b6, emissiveIntensity: 0.35 },
  stone: { color: 0x858e9e, roughness: 0.78, metalness: 0.06 },
  turf: { color: 0x56a844, roughness: 0.88, metalness: 0.02 },
  player_block: { color: 0xc28e5c, roughness: 0.68, metalness: 0.04 },
  container_red: { color: 0xdc2626, roughness: 0.45, metalness: 0.52 },
  container_blue: { color: 0x2563eb, roughness: 0.45, metalness: 0.52 },
  container_amber: { color: 0xd97706, roughness: 0.46, metalness: 0.5 },
  container_teal: { color: 0x0d9488, roughness: 0.45, metalness: 0.52 },
  asphalt: { color: 0x3f4652, roughness: 0.85, metalness: 0.08 },
  wood_crate: { color: 0xb47b44, roughness: 0.74, metalness: 0.05 },
  basalt: { color: 0x38343d, roughness: 0.76, metalness: 0.14 },
  crimson_brick: { color: 0x991b1b, roughness: 0.62, metalness: 0.18 },
  cyber_panel: { color: 0x0e7490, roughness: 0.32, metalness: 0.55, emissive: 0x06b6d4, emissiveIntensity: 0.28 },
  ice_brick: { color: 0xbae6fd, roughness: 0.18, metalness: 0.12, emissive: 0x0284c7, emissiveIntensity: 0.15 },
  sandstone: { color: 0xd9a05b, roughness: 0.82, metalness: 0.04 },
  reactor_core: { color: 0x1d4ed8, roughness: 0.34, metalness: 0.68, emissive: 0x38bdf8, emissiveIntensity: 0.32 },
};

function detectSoftwareRenderer(renderer: THREE.WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      const str = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
      if (/swiftshader|software|llvmpipe|mesa/i.test(str)) return true;
    }
    const vendor = String(gl.getParameter(gl.RENDERER) || '');
    return /swiftshader|software|llvmpipe|mesa/i.test(vendor);
  } catch {
    return false;
  }
}

export function MapPreview3D({ mapId, className = '' }: MapPreview3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState(false);

  const engineRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    mapGroup: THREE.Group;
    hemiLight: THREE.HemisphereLight;
    sunLight: THREE.DirectionalLight;
    unitBoxGeo: THREE.BoxGeometry;
    padBaseGeo: THREE.CylinderGeometry;
    padRingGeo: THREE.TorusGeometry;
    groundGeo: THREE.CircleGeometry;
    ringInnerGeo: THREE.RingGeometry;
    ringOuterGeo: THREE.RingGeometry;
    rimGeo: THREE.TorusGeometry;
    kindMaterials: Map<ArenaBlockKind, THREE.MeshStandardMaterial>;
    transientMaterials: THREE.Material[];
    transientGeometries: THREE.BufferGeometry[];
    orbitRadius: number;
    orbitHeight: number;
    isSoftwareGl: boolean;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglError(true);
      return;
    }

    const isSoftwareGl = detectSoftwareRenderer(renderer);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSoftwareGl ? 1 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    const width = Math.max(160, container.clientWidth || 320);
    const height = Math.max(120, container.clientHeight || 170);
    const camera = new THREE.PerspectiveCamera(44, width / height, 0.5, 280);

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x475569, 0.9);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.38);
    sunLight.position.set(28, 46, 24);
    if (!isSoftwareGl) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(1024, 1024);
      sunLight.shadow.camera.left = -56;
      sunLight.shadow.camera.right = 56;
      sunLight.shadow.camera.top = 56;
      sunLight.shadow.camera.bottom = -56;
      sunLight.shadow.camera.near = 4;
      sunLight.shadow.camera.far = 140;
      sunLight.shadow.bias = -0.0005;
    }
    scene.add(sunLight);

    const mapGroup = new THREE.Group();
    scene.add(mapGroup);

    const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
    const padBaseGeo = new THREE.CylinderGeometry(1, 1.15, 0.3, 18);
    const padRingGeo = new THREE.TorusGeometry(0.72, 0.1, 8, 18);
    const groundGeo = new THREE.CircleGeometry(1, 64);
    const ringInnerGeo = new THREE.RingGeometry(13.7, 14.3, 48);
    const ringOuterGeo = new THREE.RingGeometry(31.4, 32.2, 64);
    const rimGeo = new THREE.TorusGeometry(1, 0.015, 8, 64);

    const kindMaterials = new Map<ArenaBlockKind, THREE.MeshStandardMaterial>();
    (Object.keys(BLOCK_VISUAL_SPECS) as ArenaBlockKind[]).forEach((kind) => {
      const spec = BLOCK_VISUAL_SPECS[kind];
      kindMaterials.set(
        kind,
        new THREE.MeshStandardMaterial({
          color: spec.color,
          roughness: spec.roughness,
          metalness: spec.metalness,
          emissive: spec.emissive ?? 0x000000,
          emissiveIntensity: spec.emissiveIntensity ?? 0,
        })
      );
    });

    engineRef.current = {
      renderer,
      scene,
      camera,
      mapGroup,
      hemiLight,
      sunLight,
      unitBoxGeo,
      padBaseGeo,
      padRingGeo,
      groundGeo,
      ringInnerGeo,
      ringOuterGeo,
      rimGeo,
      kindMaterials,
      transientMaterials: [],
      transientGeometries: [],
      orbitRadius: 42,
      orbitHeight: 26,
      isSoftwareGl,
    };

    const handleResize = () => {
      const state = engineRef.current;
      if (!state || !container) return;
      const w = Math.max(160, container.clientWidth);
      const h = Math.max(120, container.clientHeight);
      state.camera.aspect = w / h;
      state.camera.updateProjectionMatrix();
      state.renderer.setSize(w, h, false);
    };

    handleResize();
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    let rafId = 0;
    let timerId = 0;
    let disposed = false;
    let angle = 0.65;
    let lastTime = performance.now();
    const lookTarget = new THREE.Vector3(0, 1.8, 0);

    const renderFrame = (now: number) => {
      if (disposed) return;
      const state = engineRef.current;
      if (!state) return;

      const dt = Math.min(0.1, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      if (!document.hidden) {
        angle += dt * 0.28;
        state.camera.position.set(
          Math.cos(angle) * state.orbitRadius,
          state.orbitHeight + Math.sin(angle * 0.7) * 1.6,
          Math.sin(angle) * state.orbitRadius
        );
        state.camera.lookAt(lookTarget);
        state.renderer.render(state.scene, state.camera);
      }

      if (state.isSoftwareGl) {
        timerId = window.setTimeout(() => {
          if (!disposed) {
            rafId = window.requestAnimationFrame(renderFrame);
          }
        }, 55);
      } else {
        rafId = window.requestAnimationFrame(renderFrame);
      }
    };

    rafId = window.requestAnimationFrame(renderFrame);

    return () => {
      disposed = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      if (timerId) window.clearTimeout(timerId);
      ro.disconnect();

      const state = engineRef.current;
      if (state) {
        for (const m of state.transientMaterials) m.dispose();
        for (const g of state.transientGeometries) g.dispose();
        state.kindMaterials.forEach((m) => m.dispose());
        state.unitBoxGeo.dispose();
        state.padBaseGeo.dispose();
        state.padRingGeo.dispose();
        state.groundGeo.dispose();
        state.ringInnerGeo.dispose();
        state.ringOuterGeo.dispose();
        state.rimGeo.dispose();
        envTarget.dispose();
        state.renderer.dispose();
        if (state.renderer.domElement.parentNode === container) {
          container.removeChild(state.renderer.domElement);
        }
        engineRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const state = engineRef.current;
    if (!state) return;

    while (state.mapGroup.children.length > 0) {
      state.mapGroup.remove(state.mapGroup.children[0]);
    }
    for (const m of state.transientMaterials) m.dispose();
    for (const g of state.transientGeometries) g.dispose();
    state.transientMaterials = [];
    state.transientGeometries = [];

    const mapDef = MAP_DEFINITIONS[mapId] ?? MAP_DEFINITIONS.container_yard;
    state.scene.background = new THREE.Color(mapDef.fogColor);
    state.scene.fog = new THREE.FogExp2(mapDef.fogColor, 0.0042);
    state.hemiLight.color.setHex(mapDef.ambientSky);
    state.hemiLight.groundColor.setHex(mapDef.ambientGround);
    state.sunLight.color.setHex(mapDef.sunColor);

    const radius = mapDef.worldRadius;
    state.orbitRadius = radius * 0.94;
    state.orbitHeight = radius * 0.58;

    const groundMat = new THREE.MeshStandardMaterial({
      color: mapDef.groundColor,
      roughness: mapDef.groundStyle === 'grass' ? 0.9 : 0.84,
      metalness: mapDef.groundStyle === 'grass' ? 0.02 : 0.08,
    });
    state.transientMaterials.push(groundMat);

    const groundMesh = new THREE.Mesh(state.groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.scale.set(radius, radius, 1);
    groundMesh.receiveShadow = !state.isSoftwareGl;
    state.mapGroup.add(groundMesh);

    const ringMat = new THREE.MeshStandardMaterial({
      color: mapDef.ringPrimary,
      emissive: mapDef.ringEmissive,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.78,
      side: THREE.DoubleSide,
    });
    state.transientMaterials.push(ringMat);

    const innerRing = new THREE.Mesh(state.ringInnerGeo, ringMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.04;
    state.mapGroup.add(innerRing);

    const outerRing = new THREE.Mesh(state.ringOuterGeo, ringMat);
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 0.04;
    state.mapGroup.add(outerRing);

    const rimMesh = new THREE.Mesh(state.rimGeo, ringMat);
    rimMesh.rotation.x = -Math.PI / 2;
    rimMesh.scale.set(radius, radius, 1);
    rimMesh.position.y = 0.25;
    state.mapGroup.add(rimMesh);

    const blocks = getArenaBlocksForMap(mapId);
    for (const b of blocks) {
      const mat = state.kindMaterials.get(b.kind) ?? state.kindMaterials.get('stone')!;
      const mesh = new THREE.Mesh(state.unitBoxGeo, mat);
      mesh.scale.set(b.w, b.h, b.d);
      mesh.position.set(b.x, b.y + b.h * 0.5, b.z);
      mesh.castShadow = !state.isSoftwareGl;
      mesh.receiveShadow = !state.isSoftwareGl;
      state.mapGroup.add(mesh);
    }

    const padBaseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.8,
    });
    state.transientMaterials.push(padBaseMat);

    const jumpPads = getJumpPadsForMap(mapId);
    for (const pad of jumpPads) {
      const padColor = new THREE.Color(pad.color).getHex();
      const padGlowMat = new THREE.MeshStandardMaterial({
        color: padColor,
        emissive: padColor,
        emissiveIntensity: 1.1,
        roughness: 0.2,
      });
      state.transientMaterials.push(padGlowMat);

      const base = new THREE.Mesh(state.padBaseGeo, padBaseMat);
      base.scale.set(pad.radius, 1, pad.radius);
      base.position.set(pad.x, pad.y + 0.15, pad.z);
      state.mapGroup.add(base);

      const ring = new THREE.Mesh(state.padRingGeo, padGlowMat);
      ring.rotation.x = Math.PI / 2;
      ring.scale.set(pad.radius, pad.radius, 1);
      ring.position.set(pad.x, pad.y + 0.65, pad.z);
      state.mapGroup.add(ring);
    }

    state.renderer.render(state.scene, state.camera);
  }, [mapId]);

  if (webglError) {
    const fallbackDef = MAP_DEFINITIONS[mapId] ?? MAP_DEFINITIONS.container_yard;
    return (
      <div
        className={`relative rounded-xl border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 ${className}`}
        style={{
          background: `linear-gradient(160deg, ${fallbackDef.skyTop} 0%, ${fallbackDef.skyHorizon} 100%)`,
        }}
      >
        <span className="px-2.5 py-1 rounded-lg bg-white/85 text-slate-900">
          {fallbackDef.name}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="map-preview-3d"
      className={`relative overflow-hidden bg-slate-900 ${className}`}
    />
  );
}
