import * as THREE from 'three';

function createMulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function finalizePbrTexture(canvas: HTMLCanvasElement, anisotropy: number, isColor = true): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Rich, organic painterly meadow grass without blocky pixel-grid seams.
 */
function createOrganicGrassTexture(
  baseHex: string,
  sunHex: string,
  deepHex: string,
  anisotropy: number,
  seed: number
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = createMulberry32(seed);

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  // Soft undulating soil & sunlit meadow mottling (wrapping cleanly across edges)
  for (let i = 0; i < 65; i++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const r = 28 + rand() * 58;
    const isLight = rand() > 0.45;
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        const g = ctx.createRadialGradient(cx + ox, cy + oy, 2, cx + ox, cy + oy, r);
        g.addColorStop(0, isLight ? 'rgba(134, 212, 89, 0.14)' : 'rgba(38, 92, 34, 0.14)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Fine organic grass blade strokes
  for (let i = 0; i < 2400; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = 5 + rand() * 9;
    const lean = (rand() - 0.5) * 4;
    ctx.strokeStyle = rand() > 0.48 ? sunHex : deepHex;
    ctx.globalAlpha = 0.16 + rand() * 0.22;
    ctx.lineWidth = 1.1 + rand() * 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + lean, y - len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  return finalizePbrTexture(canvas, anisotropy, true);
}

/**
 * Smooth carved stone / slate / basalt masonry with mineral variation and soft beveled joints.
 */
function createCarvedStoneTexture(
  baseHex: string,
  highlightHex: string,
  shadowHex: string,
  anisotropy: number,
  seed: number,
  courses = 4,
  softJoints = true
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = createMulberry32(seed);

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  const rowH = size / courses;
  const colW = size / 2;

  for (let r = 0; r < courses; r++) {
    const offset = (r % 2) * (colW * 0.5);
    for (let c = -1; c <= 2; c++) {
      const x = c * colW + offset;
      const y = r * rowH;
      const tone = rand();
      ctx.fillStyle = tone > 0.5 ? highlightHex : shadowHex;
      ctx.globalAlpha = 0.08 + rand() * 0.1;
      ctx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);

      if (softJoints) {
        ctx.strokeStyle = shadowHex;
        ctx.globalAlpha = 0.32;
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 1.5, y + 1.5, colW - 3, rowH - 3);

        ctx.strokeStyle = highlightHex;
        ctx.globalAlpha = 0.18;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 4);
        ctx.lineTo(x + colW - 4, y + 4);
        ctx.stroke();
      }
    }
  }

  // Mineral flecks & soft stone grain
  for (let i = 0; i < 1600; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const rad = 0.7 + rand() * 2.2;
    ctx.fillStyle = rand() > 0.5 ? highlightHex : shadowHex;
    ctx.globalAlpha = 0.07 + rand() * 0.12;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  return finalizePbrTexture(canvas, anisotropy, true);
}

/**
 * Brushed metal finish (Gold / Trim / Crystalline accents).
 */
function createBrushedMetalTexture(
  baseHex: string,
  highlightHex: string,
  shadowHex: string,
  anisotropy: number,
  seed: number
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = createMulberry32(seed);

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, baseHex);
  grad.addColorStop(0.5, highlightHex);
  grad.addColorStop(1, baseHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 420; i++) {
    const y = rand() * size;
    ctx.strokeStyle = rand() > 0.5 ? highlightHex : shadowHex;
    ctx.globalAlpha = 0.06 + rand() * 0.09;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y + (rand() - 0.5) * 4);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = highlightHex;
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, size - 8, size - 8);
  ctx.globalAlpha = 1;

  return finalizePbrTexture(canvas, anisotropy, true);
}

/**
 * Natural timber plank texture for placed combat blocks.
 */
function createWoodPlankTexture(anisotropy: number, seed: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = createMulberry32(seed);

  ctx.fillStyle = '#9c6b3b';
  ctx.fillRect(0, 0, size, size);

  const rows = 4;
  const rowH = size / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    ctx.fillStyle = r % 2 === 0 ? '#a87645' : '#916236';
    ctx.fillRect(0, y + 1, size, rowH - 2);

    // Wood grain lines
    for (let g = 0; g < 18; g++) {
      const gy = y + 3 + rand() * (rowH - 6);
      ctx.strokeStyle = rand() > 0.5 ? '#c4925e' : '#6f4822';
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(size * 0.3, gy + (rand() - 0.5) * 5, size * 0.7, gy + (rand() - 0.5) * 5, size, gy);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = '#5c3a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  return finalizePbrTexture(canvas, anisotropy, true);
}

function createMicroBumpTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = createMulberry32(9913);

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 2400; i++) {
    const v = Math.floor(104 + rand() * 48);
    ctx.fillStyle = `rgba(${v},${v},${v},0.35)`;
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, 1 + rand() * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  return finalizePbrTexture(canvas, anisotropy, false);
}

export function createSkyDomeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#4f97e8');
  grad.addColorStop(0.28, '#7abbf2');
  grad.addColorStop(0.49, '#cce9fc');
  grad.addColorStop(0.55, '#eef7ff');
  grad.addColorStop(1.0, '#cfe3c8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

export function createLavaSurfaceTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = createMulberry32(7731);

  const bg = ctx.createRadialGradient(128, 128, 16, 128, 128, 128);
  bg.addColorStop(0, '#fde047');
  bg.addColorStop(0.45, '#f97316');
  bg.addColorStop(1, '#c2410c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Molten crust patches & glowing cracks
  for (let i = 0; i < 42; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 8 + rand() * 20;
    ctx.fillStyle = rand() > 0.35 ? 'rgba(154, 52, 18, 0.55)' : 'rgba(254, 240, 138, 0.55)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return finalizePbrTexture(canvas, anisotropy, true);
}

export function createShadowDiscTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.18)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface ArenaMaterialSet {
  ground: THREE.MeshStandardMaterial;
  deepslate: THREE.MeshStandardMaterial;
  obsidian: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  amethyst: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  turf: THREE.MeshStandardMaterial;
  player_block: THREE.MeshStandardMaterial;
  cliff: THREE.MeshStandardMaterial;
  shadowDisc: THREE.MeshBasicMaterial;
  skyDomeTex: THREE.CanvasTexture;
  lavaTex: THREE.CanvasTexture;
  textures: THREE.Texture[];
}

export function createArenaMaterials(renderer: THREE.WebGLRenderer): ArenaMaterialSet {
  const anisotropy = renderer.capabilities.getMaxAnisotropy();

  const bumpMap = createMicroBumpTexture(anisotropy);
  const groundTex = createOrganicGrassTexture('#4e993b', '#76c957', '#357128', anisotropy, 101);
  groundTex.repeat.set(34, 34);

  const turfTex = createOrganicGrassTexture('#56a844', '#7ed361', '#3b7c2d', anisotropy, 707);
  turfTex.repeat.set(2, 2);

  const deepslateTex = createCarvedStoneTexture('#475569', '#64748b', '#273244', anisotropy, 202, 4);
  const obsidianTex = createCarvedStoneTexture('#2a1f3d', '#4c386e', '#140f1f', anisotropy, 303, 3);
  const goldTex = createBrushedMetalTexture('#d49b2a', '#fde073', '#8a5f12', anisotropy, 404);
  const amethystTex = createBrushedMetalTexture('#7c3aed', '#c4b5fd', '#4c1d95', anisotropy, 505);
  const stoneTex = createCarvedStoneTexture('#858e9e', '#a4aec0', '#5b6373', anisotropy, 606, 4);
  const playerBlockTex = createWoodPlankTexture(anisotropy, 808);

  const shadowTex = createShadowDiscTexture();
  const skyDomeTex = createSkyDomeTexture();
  const lavaTex = createLavaSurfaceTexture(anisotropy);

  const ground = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: groundTex,
    bumpMap,
    bumpScale: 0.04,
    roughness: 0.9,
    metalness: 0.02,
  });

  const deepslate = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: deepslateTex,
    bumpMap,
    bumpScale: 0.06,
    roughness: 0.72,
    metalness: 0.1,
  });

  const obsidian = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: obsidianTex,
    bumpMap,
    bumpScale: 0.05,
    roughness: 0.36,
    metalness: 0.32,
  });

  const gold = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: goldTex,
    roughness: 0.22,
    metalness: 0.85,
  });

  const amethyst = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: amethystTex,
    emissive: new THREE.Color('#5b21b6'),
    emissiveIntensity: 0.35,
    roughness: 0.16,
    metalness: 0.25,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
  });

  const stone = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: stoneTex,
    bumpMap,
    bumpScale: 0.055,
    roughness: 0.78,
    metalness: 0.05,
  });

  const turf = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: turfTex,
    bumpMap,
    bumpScale: 0.035,
    roughness: 0.88,
    metalness: 0.02,
  });

  const player_block = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: playerBlockTex,
    bumpMap,
    bumpScale: 0.045,
    roughness: 0.68,
    metalness: 0.04,
  });

  const cliff = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.04,
  });

  const shadowDisc = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.42,
  });

  return {
    ground,
    deepslate,
    obsidian,
    gold,
    amethyst,
    stone,
    turf,
    player_block,
    cliff,
    shadowDisc,
    skyDomeTex,
    lavaTex,
    textures: [
      bumpMap,
      groundTex,
      deepslateTex,
      obsidianTex,
      goldTex,
      amethystTex,
      stoneTex,
      turfTex,
      playerBlockTex,
      shadowTex,
      skyDomeTex,
      lavaTex,
    ],
  };
}
