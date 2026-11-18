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

export function paintSkyDomeCanvas(
  canvas: HTMLCanvasElement,
  skyTop = '#3b82f6',
  skyMid = '#7dd3fc',
  skyHorizon = '#e0f2fe',
  skyBottom = '#cbd5e1'
): void {
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0.0, skyTop);
  grad.addColorStop(0.28, skyMid);
  grad.addColorStop(0.5, skyHorizon);
  grad.addColorStop(0.58, '#f8fafc');
  grad.addColorStop(1.0, skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function createSkyDomeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 512;
  paintSkyDomeCanvas(canvas);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

/**
 * Corrugated steel shipping container ribs + structural frame + subtle cargo stencil.
 */
function createCorrugatedContainerTexture(
  baseHex: string,
  ribLightHex: string,
  ribDarkHex: string,
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

  // Vertical corrugated steel ribs
  const ribs = 16;
  const ribW = size / ribs;
  for (let i = 0; i < ribs; i++) {
    const x = i * ribW;
    const g = ctx.createLinearGradient(x, 0, x + ribW, 0);
    g.addColorStop(0, ribDarkHex);
    g.addColorStop(0.32, ribLightHex);
    g.addColorStop(0.6, baseHex);
    g.addColorStop(1, ribDarkHex);
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = g;
    ctx.fillRect(x, 20, ribW, size - 40);
  }
  ctx.globalAlpha = 1;

  // Heavy top/bottom/side frame rails & corner castings
  ctx.strokeStyle = ribDarkHex;
  ctx.lineWidth = 22;
  ctx.strokeRect(11, 11, size - 22, size - 22);

  ctx.strokeStyle = ribLightHex;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, size - 48, size - 48);

  // Subtle weathered industrial scuffs
  for (let i = 0; i < 180; i++) {
    ctx.fillStyle = rand() > 0.5 ? ribLightHex : ribDarkHex;
    ctx.globalAlpha = 0.05 + rand() * 0.08;
    ctx.fillRect(rand() * size, rand() * size, 4 + rand() * 18, 2 + rand() * 4);
  }
  ctx.globalAlpha = 1;

  // Crisp industrial stencil block in upper-right corner
  ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
  ctx.fillRect(size - 134, 48, 86, 22);
  ctx.fillRect(size - 110, 78, 62, 10);

  return finalizePbrTexture(canvas, anisotropy, true);
}

/**
 * Concrete / asphalt dockyard surface with subtle aggregate and lane markings.
 */
function createAsphaltTexture(anisotropy: number, seed: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = createMulberry32(seed);

  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 3200; i++) {
    const shade = rand() > 0.5 ? '#94a3b8' : '#475569';
    ctx.fillStyle = shade;
    ctx.globalAlpha = 0.12 + rand() * 0.16;
    ctx.fillRect(rand() * size, rand() * size, 2 + rand() * 3, 2 + rand() * 3);
  }
  ctx.globalAlpha = 0.38;
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, size - 4, size - 4);
  ctx.globalAlpha = 1;

  return finalizePbrTexture(canvas, anisotropy, true);
}

/**
 * Braced wooden shipping crate texture.
 */
function createCrateTexture(anisotropy: number, seed: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = createMulberry32(seed);

  ctx.fillStyle = '#b9854c';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 8; i++) {
    const y = (i * size) / 8;
    ctx.fillStyle = i % 2 === 0 ? '#c49056' : '#ad7a43';
    ctx.fillRect(0, y, size, size / 8 - 2);
    ctx.fillStyle = '#7c5328';
    ctx.fillRect(0, y + size / 8 - 2, size, 2);
  }

  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = rand() > 0.5 ? '#d4a36a' : '#734b22';
    ctx.globalAlpha = 0.14;
    ctx.fillRect(rand() * size, rand() * size, 16 + rand() * 24, 2);
  }
  ctx.globalAlpha = 1;

  // Outer timber frame & diagonal brace
  ctx.strokeStyle = '#734b22';
  ctx.lineWidth = 20;
  ctx.strokeRect(10, 10, size - 20, size - 20);
  ctx.beginPath();
  ctx.moveTo(18, 18);
  ctx.lineTo(size - 18, size - 18);
  ctx.lineWidth = 14;
  ctx.stroke();

  return finalizePbrTexture(canvas, anisotropy, true);
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

function createCyberPanelTexture(anisotropy: number, seed: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = createMulberry32(seed);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, size - 12, size - 12);

  // Subtle circuit lines & neon cyan border
  ctx.strokeStyle = '#06b6d4';
  ctx.globalAlpha = 0.72;
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, size - 28, size - 28);

  ctx.strokeStyle = '#22d3ee';
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const y = 38 + i * 36;
    ctx.beginPath();
    ctx.moveTo(22, y);
    ctx.lineTo(size - 22, y);
    ctx.stroke();
  }
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = rand() > 0.5 ? '#22d3ee' : '#818cf8';
    ctx.globalAlpha = 0.12 + rand() * 0.16;
    ctx.fillRect(24 + rand() * (size - 64), 24 + rand() * (size - 48), 8 + rand() * 14, 3);
  }
  ctx.globalAlpha = 1;
  return finalizePbrTexture(canvas, anisotropy, true);
}

function createReactorCoreTexture(anisotropy: number, seed: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = createMulberry32(seed);

  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, size, size);

  // Industrial hazard chevron band & glowing plasma core strips
  for (let i = 0; i < 4; i++) {
    const y = 32 + i * 54;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(16, y, size - 32, 24);
    ctx.fillStyle = i % 2 === 0 ? '#f59e0b' : '#38bdf8';
    ctx.globalAlpha = 0.85;
    ctx.fillRect(24, y + 7, size - 48, 10);
    ctx.globalAlpha = 1;
  }
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = rand() > 0.5 ? '#94a3b8' : '#1e293b';
    ctx.globalAlpha = 0.15;
    ctx.fillRect(rand() * size, rand() * size, 6 + rand() * 12, 2);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, size - 8, size - 8);
  return finalizePbrTexture(canvas, anisotropy, true);
}

function createThemeFloorTexture(
  pattern: 'runway' | 'sand' | 'ice' | 'cyber' | 'obsidian' | 'marble' | 'brass' | 'geode',
  anisotropy: number,
  seed: number
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = createMulberry32(seed);

  if (pattern === 'runway') {
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, size, 12);
    ctx.fillRect(0, size - 12, size, 12);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(size * 0.46, 16, size * 0.08, 86);
    ctx.fillRect(size * 0.46, 146, size * 0.08, 86);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(18, 0, 6, size);
    ctx.fillRect(size - 24, 0, 6, size);
  } else if (pattern === 'sand') {
    ctx.fillStyle = '#e2c48c';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 14) {
      ctx.strokeStyle = y % 28 === 0 ? 'rgba(180, 125, 58, 0.24)' : 'rgba(255, 244, 214, 0.28)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.3, y + 6, size * 0.7, y - 6, size, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(161, 110, 48, 0.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, size - 8, size - 8);
  } else if (pattern === 'ice') {
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 28; i++) {
      ctx.strokeStyle = i % 2 === 0 ? '#f0f9ff' : '#38bdf8';
      ctx.globalAlpha = 0.36;
      ctx.lineWidth = 1.5 + rand() * 2;
      ctx.beginPath();
      const sx = rand() * size;
      const sy = rand() * size;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (rand() - 0.5) * 90, sy + (rand() - 0.5) * 90);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (pattern === 'cyber') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#06b6d4';
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, size - 4, size - 4);
    ctx.strokeRect(36, 36, size - 72, size - 72);
    ctx.beginPath();
    ctx.moveTo(0, size * 0.5);
    ctx.lineTo(36, size * 0.5);
    ctx.moveTo(size - 36, size * 0.5);
    ctx.lineTo(size, size * 0.5);
    ctx.moveTo(size * 0.5, 0);
    ctx.lineTo(size * 0.5, 36);
    ctx.moveTo(size * 0.5, size - 36);
    ctx.lineTo(size * 0.5, size);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (pattern === 'obsidian') {
    ctx.fillStyle = '#1f192b';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#6d28d9';
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, size * 0.5 - 10, size * 0.5 - 10);
    ctx.strokeRect(size * 0.5 + 4, size * 0.5 + 4, size * 0.5 - 10, size * 0.5 - 10);
    ctx.fillStyle = '#4c1d95';
    for (let i = 0; i < 60; i++) {
      ctx.fillRect(rand() * size, rand() * size, 4, 4);
    }
    ctx.globalAlpha = 1;
  } else if (pattern === 'marble') {
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, size * 0.5 - 4, size * 0.5 - 4);
    ctx.strokeRect(size * 0.5 + 2, 2, size * 0.5 - 4, size * 0.5 - 4);
    ctx.strokeRect(2, size * 0.5 + 2, size * 0.5 - 4, size * 0.5 - 4);
    ctx.strokeRect(size * 0.5 + 2, size * 0.5 + 2, size * 0.5 - 4, size * 0.5 - 4);
    for (let i = 0; i < 16; i++) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      const x = rand() * size;
      const y = rand() * size;
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 24, y - 16, x + 52, y + 18);
      ctx.stroke();
    }
  } else if (pattern === 'brass') {
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#f59e0b';
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.5, size * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.5, size * 0.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    // geode
    ctx.fillStyle = '#2e2942';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 48; i++) {
      ctx.fillStyle = i % 3 === 0 ? '#a855f7' : '#6366f1';
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.arc(rand() * size, rand() * size, 3 + rand() * 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  for (let i = 0; i < 420; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
    ctx.fillRect(rand() * size, rand() * size, 2, 2);
  }

  return finalizePbrTexture(canvas, anisotropy, true);
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
  container_red: THREE.MeshStandardMaterial;
  container_blue: THREE.MeshStandardMaterial;
  container_amber: THREE.MeshStandardMaterial;
  container_teal: THREE.MeshStandardMaterial;
  asphalt: THREE.MeshStandardMaterial;
  wood_crate: THREE.MeshStandardMaterial;
  basalt: THREE.MeshStandardMaterial;
  crimson_brick: THREE.MeshStandardMaterial;
  cyber_panel: THREE.MeshStandardMaterial;
  ice_brick: THREE.MeshStandardMaterial;
  sandstone: THREE.MeshStandardMaterial;
  reactor_core: THREE.MeshStandardMaterial;
  cliff: THREE.MeshStandardMaterial;
  shadowDisc: THREE.MeshBasicMaterial;
  skyDomeTex: THREE.CanvasTexture;
  lavaTex: THREE.CanvasTexture;
  grassGroundTex: THREE.CanvasTexture;
  asphaltGroundTex: THREE.CanvasTexture;
  runwayGroundTex: THREE.CanvasTexture;
  sandGroundTex: THREE.CanvasTexture;
  iceGroundTex: THREE.CanvasTexture;
  cyberGroundTex: THREE.CanvasTexture;
  obsidianGroundTex: THREE.CanvasTexture;
  marbleGroundTex: THREE.CanvasTexture;
  brassGroundTex: THREE.CanvasTexture;
  geodeGroundTex: THREE.CanvasTexture;
  textures: THREE.Texture[];
}

export function createArenaMaterials(renderer: THREE.WebGLRenderer): ArenaMaterialSet {
  const anisotropy = renderer.capabilities.getMaxAnisotropy();

  const bumpMap = createMicroBumpTexture(anisotropy);
  const grassGroundTex = createOrganicGrassTexture('#4e993b', '#76c957', '#357128', anisotropy, 101);
  grassGroundTex.repeat.set(34, 34);

  const asphaltGroundTex = createAsphaltTexture(anisotropy, 909);
  asphaltGroundTex.repeat.set(36, 36);

  const runwayGroundTex = createThemeFloorTexture('runway', anisotropy, 1201);
  runwayGroundTex.repeat.set(16, 16);
  const sandGroundTex = createThemeFloorTexture('sand', anisotropy, 1202);
  sandGroundTex.repeat.set(22, 22);
  const iceGroundTex = createThemeFloorTexture('ice', anisotropy, 1203);
  iceGroundTex.repeat.set(20, 20);
  const cyberGroundTex = createThemeFloorTexture('cyber', anisotropy, 1204);
  cyberGroundTex.repeat.set(24, 24);
  const obsidianGroundTex = createThemeFloorTexture('obsidian', anisotropy, 1205);
  obsidianGroundTex.repeat.set(24, 24);
  const marbleGroundTex = createThemeFloorTexture('marble', anisotropy, 1206);
  marbleGroundTex.repeat.set(24, 24);
  const brassGroundTex = createThemeFloorTexture('brass', anisotropy, 1207);
  brassGroundTex.repeat.set(18, 18);
  const geodeGroundTex = createThemeFloorTexture('geode', anisotropy, 1208);
  geodeGroundTex.repeat.set(22, 22);

  const turfTex = createOrganicGrassTexture('#56a844', '#7ed361', '#3b7c2d', anisotropy, 707);
  turfTex.repeat.set(2, 2);

  const deepslateTex = createCarvedStoneTexture('#475569', '#64748b', '#273244', anisotropy, 202, 4);
  const obsidianTex = createCarvedStoneTexture('#2a1f3d', '#4c386e', '#140f1f', anisotropy, 303, 3);
  const goldTex = createBrushedMetalTexture('#d49b2a', '#fde073', '#8a5f12', anisotropy, 404);
  const amethystTex = createBrushedMetalTexture('#7c3aed', '#c4b5fd', '#4c1d95', anisotropy, 505);
  const stoneTex = createCarvedStoneTexture('#858e9e', '#a4aec0', '#5b6373', anisotropy, 606, 4);
  const playerBlockTex = createWoodPlankTexture(anisotropy, 808);

  const containerRedTex = createCorrugatedContainerTexture('#dc2626', '#f87171', '#991b1b', anisotropy, 1101);
  const containerBlueTex = createCorrugatedContainerTexture('#2563eb', '#60a5fa', '#1e40af', anisotropy, 1102);
  const containerAmberTex = createCorrugatedContainerTexture('#d97706', '#fbbf24', '#92400e', anisotropy, 1103);
  const containerTealTex = createCorrugatedContainerTexture('#0d9488', '#2dd4bf', '#115e59', anisotropy, 1104);
  const asphaltTex = createAsphaltTexture(anisotropy, 1105);
  const woodCrateTex = createCrateTexture(anisotropy, 1106);
  const basaltTex = createCarvedStoneTexture('#38343d', '#57534e', '#1c1917', anisotropy, 1107, 4);
  const crimsonBrickTex = createCarvedStoneTexture('#7f1d1d', '#b91c1c', '#450a0a', anisotropy, 1108, 4);
  const cyberPanelTex = createCyberPanelTexture(anisotropy, 1109);
  const iceBrickTex = createCarvedStoneTexture('#7dd3fc', '#e0f2fe', '#0284c7', anisotropy, 1110, 4);
  const sandstoneTex = createCarvedStoneTexture('#d9a05b', '#f5cb86', '#9a682e', anisotropy, 1111, 4);
  const reactorCoreTex = createReactorCoreTexture(anisotropy, 1112);

  const shadowTex = createShadowDiscTexture();
  const skyDomeTex = createSkyDomeTexture();
  const lavaTex = createLavaSurfaceTexture(anisotropy);

  const ground = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: asphaltGroundTex,
    bumpMap,
    bumpScale: 0.035,
    roughness: 0.88,
    metalness: 0.06,
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

  const container_red = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: containerRedTex,
    bumpMap,
    bumpScale: 0.05,
    roughness: 0.45,
    metalness: 0.55,
  });
  const container_blue = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: containerBlueTex,
    bumpMap,
    bumpScale: 0.05,
    roughness: 0.45,
    metalness: 0.55,
  });
  const container_amber = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: containerAmberTex,
    bumpMap,
    bumpScale: 0.05,
    roughness: 0.46,
    metalness: 0.52,
  });
  const container_teal = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: containerTealTex,
    bumpMap,
    bumpScale: 0.05,
    roughness: 0.45,
    metalness: 0.55,
  });
  const asphalt = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: asphaltTex,
    bumpMap,
    bumpScale: 0.04,
    roughness: 0.85,
    metalness: 0.08,
  });
  const wood_crate = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: woodCrateTex,
    bumpMap,
    bumpScale: 0.045,
    roughness: 0.74,
    metalness: 0.04,
  });
  const basalt = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: basaltTex,
    bumpMap,
    bumpScale: 0.06,
    roughness: 0.76,
    metalness: 0.14,
  });
  const crimson_brick = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: crimsonBrickTex,
    bumpMap,
    bumpScale: 0.055,
    roughness: 0.62,
    metalness: 0.18,
  });
  const cyber_panel = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: cyberPanelTex,
    bumpMap,
    bumpScale: 0.04,
    roughness: 0.34,
    metalness: 0.52,
    emissive: new THREE.Color('#083344'),
    emissiveIntensity: 0.25,
  });
  const ice_brick = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: iceBrickTex,
    bumpMap,
    bumpScale: 0.04,
    roughness: 0.18,
    metalness: 0.08,
    clearcoat: 0.88,
    clearcoatRoughness: 0.1,
  });
  const sandstone = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: sandstoneTex,
    bumpMap,
    bumpScale: 0.06,
    roughness: 0.82,
    metalness: 0.04,
  });
  const reactor_core = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: reactorCoreTex,
    bumpMap,
    bumpScale: 0.045,
    roughness: 0.36,
    metalness: 0.68,
    emissive: new THREE.Color('#1e3a8a'),
    emissiveIntensity: 0.22,
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
    container_red,
    container_blue,
    container_amber,
    container_teal,
    asphalt,
    wood_crate,
    basalt,
    crimson_brick,
    cyber_panel,
    ice_brick,
    sandstone,
    reactor_core,
    cliff,
    shadowDisc,
    skyDomeTex,
    lavaTex,
    grassGroundTex,
    asphaltGroundTex,
    runwayGroundTex,
    sandGroundTex,
    iceGroundTex,
    cyberGroundTex,
    obsidianGroundTex,
    marbleGroundTex,
    brassGroundTex,
    geodeGroundTex,
    textures: [
      bumpMap,
      grassGroundTex,
      asphaltGroundTex,
      runwayGroundTex,
      sandGroundTex,
      iceGroundTex,
      cyberGroundTex,
      obsidianGroundTex,
      marbleGroundTex,
      brassGroundTex,
      geodeGroundTex,
      deepslateTex,
      obsidianTex,
      goldTex,
      amethystTex,
      stoneTex,
      turfTex,
      playerBlockTex,
      containerRedTex,
      containerBlueTex,
      containerAmberTex,
      containerTealTex,
      asphaltTex,
      woodCrateTex,
      basaltTex,
      crimsonBrickTex,
      cyberPanelTex,
      iceBrickTex,
      sandstoneTex,
      reactorCoreTex,
      shadowTex,
      skyDomeTex,
      lavaTex,
    ],
  };
}
