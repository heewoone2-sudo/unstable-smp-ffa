import * as THREE from 'three';

function createVoxelTileTexture(
  baseHex: string,
  accentHex: string,
  groutHex: string,
  anisotropy: number,
  seed: number,
  gridDivs = 4
): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  const cell = size / gridDivs;
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  for (let gx = 0; gx < gridDivs; gx++) {
    for (let gy = 0; gy < gridDivs; gy++) {
      const n = rand();
      ctx.fillStyle = n > 0.55 ? accentHex : baseHex;
      ctx.globalAlpha = 0.28 + n * 0.25;
      ctx.fillRect(gx * cell + 2, gy * cell + 2, cell - 4, cell - 4);
    }
  }
  ctx.globalAlpha = 1;

  // Fine brick/tile mortar lines
  ctx.strokeStyle = groutHex;
  ctx.lineWidth = 2;
  for (let i = 0; i <= gridDivs; i++) {
    const p = i * cell;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  // Pixelated stone speckles
  for (let i = 0; i < 64; i++) {
    ctx.fillStyle = rand() > 0.5 ? accentHex : groutHex;
    ctx.globalAlpha = 0.2;
    const px = Math.floor(rand() * 32) * 4;
    const py = Math.floor(rand() * 32) * 4;
    ctx.fillRect(px, py, 4, 4);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.anisotropy = anisotropy;
  return tex;
}

function createStoneBumpTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  let s = 9913;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const v = Math.floor(105 + rand() * 55);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x * 4, y * 4, 4, 4);
    }
  }
  ctx.strokeStyle = '#404040';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    const p = i * 32;
    ctx.strokeRect(0, p, size, 1);
    ctx.strokeRect(p, 0, 1, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createShadowDiscTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.25)');
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
  textures: THREE.Texture[];
}

export function createArenaMaterials(renderer: THREE.WebGLRenderer): ArenaMaterialSet {
  const anisotropy = renderer.capabilities.getMaxAnisotropy();

  const bumpMap = createStoneBumpTexture(anisotropy);
  const groundTex = createVoxelTileTexture('#272b38', '#333a4c', '#181b24', anisotropy, 101, 4);
  groundTex.repeat.set(64, 64);

  const deepslateTex = createVoxelTileTexture('#2e3340', '#3f4659', '#191d26', anisotropy, 202, 2);
  const obsidianTex = createVoxelTileTexture('#1f1630', '#352152', '#100a1a', anisotropy, 303, 2);
  const goldTex = createVoxelTileTexture('#b88928', '#e5b949', '#6e4f12', anisotropy, 404, 2);
  const amethystTex = createVoxelTileTexture('#6d28d9', '#a78bfa', '#3b0764', anisotropy, 505, 2);
  const stoneTex = createVoxelTileTexture('#4d5565', '#647085', '#2c313d', anisotropy, 606, 2);
  const turfTex = createVoxelTileTexture('#2c5243', '#3b6e58', '#1c382c', anisotropy, 707, 4);
  const playerBlockTex = createVoxelTileTexture('#9a6b3b', '#c28b52', '#5c3c1e', anisotropy, 808, 2);

  const shadowTex = createShadowDiscTexture();

  const ground = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: groundTex,
    bumpMap,
    bumpScale: 0.04,
    roughness: 0.84,
    metalness: 0.08,
  });

  const deepslate = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: deepslateTex,
    bumpMap,
    bumpScale: 0.05,
    roughness: 0.78,
    metalness: 0.14,
  });

  const obsidian = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: obsidianTex,
    bumpMap,
    bumpScale: 0.04,
    roughness: 0.42,
    metalness: 0.35,
  });

  const gold = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: goldTex,
    roughness: 0.25,
    metalness: 0.82,
  });

  const amethyst = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: amethystTex,
    emissive: new THREE.Color('#4c1d95'),
    emissiveIntensity: 0.42,
    roughness: 0.24,
    metalness: 0.22,
  });

  const stone = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: stoneTex,
    bumpMap,
    bumpScale: 0.04,
    roughness: 0.82,
    metalness: 0.08,
  });

  const turf = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: turfTex,
    roughness: 0.9,
    metalness: 0.02,
  });

  const player_block = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: playerBlockTex,
    bumpMap,
    bumpScale: 0.05,
    roughness: 0.75,
    metalness: 0.06,
  });

  const cliff = new THREE.MeshStandardMaterial({
    color: 0x222634,
    roughness: 0.92,
    metalness: 0.05,
  });

  const shadowDisc = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
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
    ],
  };
}
