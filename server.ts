import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const DIST_INDEX = path.join(__dirname, 'dist', 'index.html');
const IS_PROD =
  process.env.NODE_ENV === 'production' ||
  (Boolean(process.env.RENDER) && fs.existsSync(DIST_INDEX)) ||
  (!process.env.DISABLE_HMR && fs.existsSync(DIST_INDEX));

type CharacterId =
  | 'wemmbu'
  | 'flamefrags'
  | 'parrotx2'
  | 'spokeishere'
  | 'manepear'
  | 'clownpierce'
  | 'princezam'
  | 'jumperwho'
  | 'minutetech'
  | 'kestrel'
  | 'vexor';

type MapId =
  | 'container_yard'
  | 'emerald_citadel'
  | 'sky_dock'
  | 'nether_foundry'
  | 'cyber_nexus'
  | 'frost_bastion'
  | 'ancient_temple'
  | 'orbital_reactor'
  | 'volcanic_caldera'
  | 'bamboo_sanctuary'
  | 'neon_downtown'
  | 'sunken_atlantis'
  | 'clockwork_tower'
  | 'desert_mirage'
  | 'crystal_cavern'
  | 'cherry_pagoda'
  | 'obsidian_keep'
  | 'solar_observatory'
  | 'toxic_refinery'
  | 'aether_spire';
const MAP_ORDER: MapId[] = [
  'container_yard',
  'emerald_citadel',
  'sky_dock',
  'nether_foundry',
  'cyber_nexus',
  'frost_bastion',
  'ancient_temple',
  'orbital_reactor',
  'volcanic_caldera',
  'bamboo_sanctuary',
  'neon_downtown',
  'sunken_atlantis',
  'clockwork_tower',
  'desert_mirage',
  'crystal_cavern',
  'cherry_pagoda',
  'obsidian_keep',
  'solar_observatory',
  'toxic_refinery',
  'aether_spire',
];
const MAP_ROTATION_MS = 900_000;

function seededPrngServer(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getRotationWindowServer(nowMs = Date.now()): {
  windowIndex: number;
  activeMaps: [MapId, MapId, MapId, MapId];
  endsAtMs: number;
} {
  const safeNow = Math.max(0, nowMs);
  const windowIndex = Math.floor(safeNow / MAP_ROTATION_MS);
  const endsAtMs = (windowIndex + 1) * MAP_ROTATION_MS;
  const pool = [...MAP_ORDER];
  const rand = seededPrngServer(windowIndex * 2654435761 + 1013904223);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return {
    windowIndex,
    activeMaps: [pool[0], pool[1], pool[2], pool[3]],
    endsAtMs,
  };
}

const CHARACTER_HP: Record<CharacterId, number> = {
  wemmbu: 112,
  flamefrags: 122,
  parrotx2: 112,
  spokeishere: 112,
  manepear: 140,
  clownpierce: 110,
  princezam: 116,
  jumperwho: 108,
  minutetech: 116,
  kestrel: 112,
  vexor: 115,
};

interface PlacedBlockRecord {
  id: string;
  x: number;
  y: number;
  z: number;
  kind: 'player_block' | 'obsidian';
  ownerId: string;
}

interface RoomPeer {
  id: string;
  ws: WebSocket;
  name: string;
  characterId: CharacterId;
  team: 'red' | 'blue' | 'ffa';
  kills: number;
  deaths: number;
  hp: number;
  maxHp: number;
  absorption: number;
  alive: boolean;
  activeSlot?: string;
  votedMap?: MapId;
  respawnTimer: NodeJS.Timeout | null;
}

interface CustomBotSlotRecord {
  id: string;
  name: string;
  characterId: CharacterId;
  team: 'red' | 'blue' | 'ffa';
}

interface RoomState {
  code: string;
  kind: 'global' | 'link_duel' | 'private';
  roomMode: 'ffa' | 'team';
  hostId: string;
  status: 'lobby' | 'playing';
  includeBots: boolean;
  customBots?: CustomBotSlotRecord[];
  botDifficulty?: 'easy' | 'medium' | 'hard';
  partyMode?: 'classic' | 'knockout' | 'boss_raid' | 'random_arsenal' | 'one_shot';
  targetKills: number;
  selectedMap: MapId;
  mapVotes: Map<string, MapId>;
  mapStartedAt: number;
  peers: Map<string, RoomPeer>;
  placedBlocks: PlacedBlockRecord[];
  seenEvents: Set<string>;
}

interface QueueEntry {
  clientId: string;
  ws: WebSocket;
  name: string;
  characterId: CharacterId;
}

const rooms = new Map<string, RoomState>();
const linkQueue: QueueEntry[] = [];

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    if (!code.startsWith('GLOBAL') && !rooms.has(code)) return code;
  }
  return String(Math.floor(1000 + Math.random() * 8999));
}

function sendJson(ws: WebSocket, payload: Record<string, unknown>): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastRoom(room: RoomState, payload: Record<string, unknown>, excludeId?: string): void {
  const raw = JSON.stringify(payload);
  for (const peer of room.peers.values()) {
    if (excludeId && peer.id === excludeId) continue;
    if (peer.ws.readyState === WebSocket.OPEN) {
      peer.ws.send(raw);
    }
  }
}

function sanitizeCustomBots(raw: unknown): CustomBotSlotRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomBotSlotRecord[] = [];
  for (const item of raw.slice(0, 8)) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const charId = CHARACTER_HP[obj.characterId as CharacterId] ? (obj.characterId as CharacterId) : 'wemmbu';
    const team = obj.team === 'red' || obj.team === 'blue' || obj.team === 'ffa' ? obj.team : 'ffa';
    const id = String(obj.id || `bot-${out.length}`).slice(0, 32);
    const name = String(obj.name || `Bot ${out.length + 1}`).trim().slice(0, 16) || `Bot ${out.length + 1}`;
    out.push({ id, name, characterId: charId, team });
  }
  return out;
}

function computeVoteCounts(room: RoomState): Record<MapId, number> {
  const counts = Object.fromEntries(MAP_ORDER.map((m) => [m, 0])) as Record<MapId, number>;
  for (const [peerId, m] of room.mapVotes.entries()) {
    if (room.peers.has(peerId) && m in counts) {
      counts[m] += 1;
    }
  }
  return counts;
}

function resolveWinningMap(room: RoomState): MapId {
  const counts = computeVoteCounts(room);
  let total = 0;
  for (const m of MAP_ORDER) total += counts[m];
  if (total === 0) return room.selectedMap;
  let winner = room.selectedMap;
  let best = counts[room.selectedMap] ?? -1;
  for (const m of MAP_ORDER) {
    if (counts[m] > best) {
      best = counts[m];
      winner = m;
    }
  }
  return winner;
}

function serializeRoom(room: RoomState) {
  const rot = getRotationWindowServer(Date.now());
  return {
    type: 'room_state',
    code: room.code,
    roomKind: room.kind,
    roomMode: room.roomMode || 'ffa',
    hostId: room.hostId,
    status: room.status,
    includeBots: room.includeBots,
    customBots: room.customBots || [],
    botDifficulty: room.botDifficulty || 'medium',
    partyMode: room.partyMode || 'classic',
    selectedMap: room.selectedMap,
    mapVotes: computeVoteCounts(room),
    activeRotationMaps: rot.activeMaps,
    rotationEndsAt: rot.endsAtMs,
    targetKills: room.targetKills,
    mapStartedAt: room.mapStartedAt,
    placedBlocks: room.placedBlocks,
    peers: Array.from(room.peers.values()).map((p) => ({
      id: p.id,
      name: p.name,
      characterId: p.characterId,
      team: p.team || 'ffa',
      kills: p.kills,
      deaths: p.deaths,
      hp: p.hp,
      maxHp: p.maxHp,
      isHost: p.id === room.hostId,
      votedMap: room.mapVotes.get(p.id),
    })),
  };
}

function removeFromQueue(clientId: string): void {
  const idx = linkQueue.findIndex((q) => q.clientId === clientId);
  if (idx !== -1) linkQueue.splice(idx, 1);
}

function removePeerFromRoom(peerId: string, roomCode: string | null): void {
  if (!roomCode) return;
  const room = rooms.get(roomCode);
  if (!room) return;
  const peer = room.peers.get(peerId);
  if (peer?.respawnTimer) {
    clearTimeout(peer.respawnTimer);
  }
  room.peers.delete(peerId);
  room.mapVotes.delete(peerId);
  if (room.peers.size === 0) {
    rooms.delete(roomCode);
    return;
  }
  if (room.hostId === peerId) {
    const first = room.peers.values().next().value;
    if (first) room.hostId = first.id;
  }
  broadcastRoom(room, serializeRoom(room));
}

function ensureGlobalRoom(hostId: string, mapId: MapId): RoomState {
  const code = `GLOBAL_${mapId}`;
  const existing = rooms.get(code);
  if (existing) return existing;
  const created: RoomState = {
    code,
    kind: 'global',
    roomMode: 'ffa',
    hostId,
    status: 'playing',
    includeBots: true,
    targetKills: 999,
    selectedMap: mapId,
    mapVotes: new Map(),
    mapStartedAt: Date.now(),
    peers: new Map(),
    placedBlocks: [],
    seenEvents: new Set(),
  };
  rooms.set(code, created);
  return created;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  });

  app.get('/api/health', (_req, res) => {
    let globalPlayers = 0;
    for (const r of rooms.values()) {
      if (r.kind === 'global') {
        globalPlayers += r.peers.size;
      }
    }
    const rot = getRotationWindowServer(Date.now());
    res.json({
      ok: true,
      rooms: rooms.size,
      globalPlayers,
      activeRotationMaps: rot.activeMaps,
      rotationEndsAt: rot.endsAtMs,
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  const heartbeatInterval = setInterval(() => {
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      }
    }
  }, 20000);

  let lastRotationWindow = getRotationWindowServer(Date.now()).windowIndex;
  const mapRotationInterval = setInterval(() => {
    const rot = getRotationWindowServer(Date.now());
    if (rot.windowIndex === lastRotationWindow) return;
    lastRotationWindow = rot.windowIndex;
    // Never interrupt ongoing matches mid-combat: only sync updated 4-map window metadata.
    const payload = JSON.stringify({
      type: 'rotation_sync',
      activeRotationMaps: rot.activeMaps,
      rotationEndsAt: rot.endsAtMs,
    });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }, 2000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
    clearInterval(mapRotationInterval);
  });

  let nextClientId = 1;

  wss.on('connection', (ws) => {
    const clientId = `p-${nextClientId++}-${Math.random().toString(36).slice(2, 6)}`;
    let currentRoomCode: string | null = null;

    sendJson(ws, { type: 'welcome', clientId });

    ws.on('message', (data) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(data)) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = String(msg.type || '');
      if (type === 'ping') {
        sendJson(ws, { type: 'pong' });
        return;
      }

      if (type === 'join_global') {
        removeFromQueue(clientId);
        removePeerFromRoom(clientId, currentRoomCode);
        const rot = getRotationWindowServer(Date.now());
        const reqMap = typeof msg.mapId === 'string' ? (msg.mapId as MapId) : rot.activeMaps[0];
        const chosenMap: MapId = rot.activeMaps.includes(reqMap) ? reqMap : rot.activeMaps[0];
        const room = ensureGlobalRoom(clientId, chosenMap);
        if (room.peers.size >= 32) {
          sendJson(ws, { type: 'room_error', message: '글로벌 월드 인원이 가득 찼습니다 (최대 32명).' });
          return;
        }
        const charId = (CHARACTER_HP[msg.characterId as CharacterId] ? msg.characterId : 'wemmbu') as CharacterId;
        const maxHp = CHARACTER_HP[charId];
        const name = String(msg.name || 'Fighter').trim().slice(0, 16) || 'Fighter';
        room.peers.set(clientId, {
          id: clientId,
          ws,
          name,
          characterId: charId,
          team: 'ffa',
          kills: 0,
          deaths: 0,
          hp: maxHp,
          maxHp,
          absorption: 0,
          alive: true,
          respawnTimer: null,
        });
        currentRoomCode = room.code;
        broadcastRoom(room, serializeRoom(room));
        sendJson(ws, {
          type: 'match_started',
          code: room.code,
          roomKind: 'global',
          selectedMap: room.selectedMap,
          mapStartedAt: room.mapStartedAt,
          activeRotationMaps: rot.activeMaps,
          rotationEndsAt: rot.endsAtMs,
          targetKills: room.targetKills,
        });
        return;
      }

      if (type === 'create_link_duel') {
        removeFromQueue(clientId);
        removePeerFromRoom(clientId, currentRoomCode);
        const code = generateRoomCode();
        const charId = (CHARACTER_HP[msg.characterId as CharacterId] ? msg.characterId : 'wemmbu') as CharacterId;
        const maxHp = CHARACTER_HP[charId];
        const name = String(msg.name || 'Challenger').trim().slice(0, 16) || 'Challenger';
        const room: RoomState = {
          code,
          kind: 'link_duel',
          roomMode: 'ffa',
          hostId: clientId,
          status: 'lobby',
          includeBots: false,
          targetKills: 3,
          selectedMap: 'container_yard',
          mapVotes: new Map(),
          mapStartedAt: Date.now(),
          peers: new Map(),
          placedBlocks: [],
          seenEvents: new Set(),
        };
        room.peers.set(clientId, {
          id: clientId,
          ws,
          name,
          characterId: charId,
          team: 'ffa',
          kills: 0,
          deaths: 0,
          hp: maxHp,
          maxHp,
          absorption: 0,
          alive: true,
          respawnTimer: null,
        });
        rooms.set(code, room);
        currentRoomCode = code;
        broadcastRoom(room, serializeRoom(room));
        return;
      }

      if (type === 'join_link_duel') {
        removeFromQueue(clientId);
        const requested = String(msg.code || '').trim().toUpperCase();
        const room = rooms.get(requested);
        if (!room || room.kind !== 'link_duel') {
          sendJson(ws, { type: 'room_error', message: `링크전 코드 '${requested}'를 찾을 수 없습니다.` });
          return;
        }
        if (room.peers.size >= 2) {
          sendJson(ws, { type: 'room_error', message: '해당 링크전은 이미 1v1 인원이 찼습니다.' });
          return;
        }
        removePeerFromRoom(clientId, currentRoomCode);
        const charId = (CHARACTER_HP[msg.characterId as CharacterId] ? msg.characterId : 'flamefrags') as CharacterId;
        const maxHp = CHARACTER_HP[charId];
        const name = String(msg.name || 'Opponent').trim().slice(0, 16) || 'Opponent';
        room.peers.set(clientId, {
          id: clientId,
          ws,
          name,
          characterId: charId,
          team: 'ffa',
          kills: 0,
          deaths: 0,
          hp: maxHp,
          maxHp,
          absorption: 0,
          alive: true,
          respawnTimer: null,
        });
        currentRoomCode = requested;
        room.status = 'playing';
        room.mapStartedAt = Date.now();
        broadcastRoom(room, serializeRoom(room));
        broadcastRoom(room, {
          type: 'match_started',
          code: room.code,
          roomKind: 'link_duel',
          selectedMap: room.selectedMap,
          mapStartedAt: room.mapStartedAt,
          targetKills: room.targetKills,
        });
        return;
      }

      if (type === 'queue_link_duel') {
        removeFromQueue(clientId);
        const charId = (CHARACTER_HP[msg.characterId as CharacterId] ? msg.characterId : 'wemmbu') as CharacterId;
        const name = String(msg.name || 'Challenger').trim().slice(0, 16) || 'Challenger';
        const partner = linkQueue.shift();
        if (partner && partner.ws.readyState === WebSocket.OPEN && partner.clientId !== clientId) {
          removePeerFromRoom(clientId, currentRoomCode);
          const code = generateRoomCode();
          const room: RoomState = {
            code,
            kind: 'link_duel',
            roomMode: 'ffa',
            hostId: partner.clientId,
            status: 'playing',
            includeBots: false,
            targetKills: 3,
            selectedMap: 'container_yard',
            mapVotes: new Map(),
            mapStartedAt: Date.now(),
            peers: new Map(),
            placedBlocks: [],
            seenEvents: new Set(),
          };
          const p1Hp = CHARACTER_HP[partner.characterId];
          const p2Hp = CHARACTER_HP[charId];
          room.peers.set(partner.clientId, {
            id: partner.clientId,
            ws: partner.ws,
            name: partner.name,
            characterId: partner.characterId,
            team: 'ffa',
            kills: 0,
            deaths: 0,
            hp: p1Hp,
            maxHp: p1Hp,
            absorption: 0,
            alive: true,
            respawnTimer: null,
          });
          room.peers.set(clientId, {
            id: clientId,
            ws,
            name,
            characterId: charId,
            team: 'ffa',
            kills: 0,
            deaths: 0,
            hp: p2Hp,
            maxHp: p2Hp,
            absorption: 0,
            alive: true,
            respawnTimer: null,
          });
          rooms.set(code, room);
          currentRoomCode = code;
          broadcastRoom(room, serializeRoom(room));
          broadcastRoom(room, {
            type: 'match_started',
            code,
            roomKind: 'link_duel',
            selectedMap: room.selectedMap,
            mapStartedAt: room.mapStartedAt,
            targetKills: room.targetKills,
          });
        } else {
          linkQueue.push({ clientId, ws, name, characterId: charId });
          sendJson(ws, { type: 'link_queued' });
        }
        return;
      }

      if (type === 'cancel_link_queue') {
        removeFromQueue(clientId);
        sendJson(ws, { type: 'link_queue_cancelled' });
        return;
      }

      if (type === 'create_room') {
        removeFromQueue(clientId);
        removePeerFromRoom(clientId, currentRoomCode);
        const code = generateRoomCode();
        const charId = (CHARACTER_HP[msg.characterId as CharacterId] ? msg.characterId : 'wemmbu') as CharacterId;
        const maxHp = CHARACTER_HP[charId];
        const name = String(msg.name || 'Player').trim().slice(0, 16) || 'Player';
        const roomMode = msg.roomMode === 'team' ? 'team' : 'ffa';
        const team = (msg.team === 'red' || msg.team === 'blue' || msg.team === 'ffa') ? msg.team : (roomMode === 'team' ? 'red' : 'ffa');
        const botDifficulty = msg.botDifficulty === 'easy' || msg.botDifficulty === 'hard' ? msg.botDifficulty : 'medium';
        const partyMode = ['classic', 'knockout', 'boss_raid', 'random_arsenal', 'one_shot'].includes(String(msg.partyMode))
          ? (msg.partyMode as 'classic' | 'knockout' | 'boss_raid' | 'random_arsenal' | 'one_shot')
          : 'classic';
        const room: RoomState = {
          code,
          kind: 'private',
          roomMode,
          hostId: clientId,
          status: 'lobby',
          includeBots: Boolean(msg.includeBots),
          customBots: sanitizeCustomBots(msg.customBots),
          botDifficulty,
          partyMode,
          targetKills: 15,
          selectedMap: 'container_yard',
          mapVotes: new Map(),
          mapStartedAt: Date.now(),
          peers: new Map(),
          placedBlocks: [],
          seenEvents: new Set(),
        };
        room.peers.set(clientId, {
          id: clientId,
          ws,
          name,
          characterId: charId,
          team,
          kills: 0,
          deaths: 0,
          hp: maxHp,
          maxHp,
          absorption: 0,
          alive: true,
          respawnTimer: null,
        });
        rooms.set(code, room);
        currentRoomCode = code;
        broadcastRoom(room, serializeRoom(room));
        return;
      }

      if (type === 'join_room') {
        removeFromQueue(clientId);
        const requested = String(msg.code || '').trim().toUpperCase();
        const room = rooms.get(requested);
        if (!room) {
          sendJson(ws, { type: 'room_error', message: `방 코드 '${requested}'를 찾을 수 없습니다.` });
          return;
        }
        const limit = room.kind === 'link_duel' ? 2 : 8;
        if (room.peers.size >= limit) {
          sendJson(ws, { type: 'room_error', message: `방 인원이 가득 찼습니다 (최대 ${limit}명).` });
          return;
        }
        removePeerFromRoom(clientId, currentRoomCode);
        const charId = (CHARACTER_HP[msg.characterId as CharacterId] ? msg.characterId : 'flamefrags') as CharacterId;
        const maxHp = CHARACTER_HP[charId];
        const name = String(msg.name || 'Friend').trim().slice(0, 16) || 'Friend';
        const team = (msg.team === 'red' || msg.team === 'blue' || msg.team === 'ffa') ? msg.team : (room.roomMode === 'team' ? 'blue' : 'ffa');
        room.peers.set(clientId, {
          id: clientId,
          ws,
          name,
          characterId: charId,
          team,
          kills: 0,
          deaths: 0,
          hp: maxHp,
          maxHp,
          absorption: 0,
          alive: true,
          respawnTimer: null,
        });
        currentRoomCode = requested;
        broadcastRoom(room, serializeRoom(room));
        if (room.status === 'playing') {
          sendJson(ws, {
            type: 'match_started',
            code: room.code,
            roomKind: room.kind,
            selectedMap: room.selectedMap,
            mapStartedAt: room.mapStartedAt,
            targetKills: room.targetKills,
            partyMode: room.partyMode || 'classic',
            botDifficulty: room.botDifficulty || 'medium',
            customBots: room.customBots || [],
          });
        }
        return;
      }

      if (type === 'leave_room') {
        removeFromQueue(clientId);
        removePeerFromRoom(clientId, currentRoomCode);
        currentRoomCode = null;
        return;
      }

      // Auto-resolve room if client was matched via queue_link_duel
      if (!currentRoomCode) {
        for (const r of rooms.values()) {
          if (r.peers.has(clientId)) {
            currentRoomCode = r.code;
            break;
          }
        }
      }
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (!room) return;
      const self = room.peers.get(clientId);
      if (!self) return;

      if (type === 'update_lobby') {
        if (typeof msg.characterId === 'string' && CHARACTER_HP[msg.characterId as CharacterId]) {
          self.characterId = msg.characterId as CharacterId;
          self.maxHp = CHARACTER_HP[self.characterId];
          self.hp = self.maxHp;
        }
        if (typeof msg.name === 'string') {
          self.name = msg.name.trim().slice(0, 16) || self.name;
        }
        if (msg.team === 'red' || msg.team === 'blue' || msg.team === 'ffa') {
          self.team = msg.team;
        }
        if (typeof msg.includeBots === 'boolean' && room.hostId === clientId) {
          room.includeBots = msg.includeBots;
        }
        if (Array.isArray(msg.customBots) && room.hostId === clientId) {
          room.customBots = sanitizeCustomBots(msg.customBots);
        }
        if ((msg.roomMode === 'ffa' || msg.roomMode === 'team') && room.hostId === clientId) {
          room.roomMode = msg.roomMode;
          if (room.roomMode === 'team') {
            let idx = 0;
            for (const p of room.peers.values()) {
              if (p.team === 'ffa') {
                p.team = idx % 2 === 0 ? 'red' : 'blue';
              }
              idx++;
            }
          }
        }
        if (typeof msg.targetKills === 'number' && room.hostId === clientId) {
          room.targetKills = Math.max(5, Math.min(50, Math.round(msg.targetKills)));
        }
        if (typeof msg.botDifficulty === 'string' && (msg.botDifficulty === 'easy' || msg.botDifficulty === 'medium' || msg.botDifficulty === 'hard') && room.hostId === clientId) {
          room.botDifficulty = msg.botDifficulty;
        }
        if (typeof msg.partyMode === 'string' && ['classic', 'knockout', 'boss_raid', 'random_arsenal', 'one_shot'].includes(msg.partyMode) && room.hostId === clientId) {
          room.partyMode = msg.partyMode as 'classic' | 'knockout' | 'boss_raid' | 'random_arsenal' | 'one_shot';
        }
        if (typeof msg.selectedMap === 'string' && MAP_ORDER.includes(msg.selectedMap as MapId) && room.hostId === clientId) {
          room.selectedMap = msg.selectedMap as MapId;
        }
        broadcastRoom(room, serializeRoom(room));
        return;
      }

      if (type === 'vote_map') {
        const voted = String(msg.mapId || '') as MapId;
        if (!MAP_ORDER.includes(voted)) return;
        room.mapVotes.set(clientId, voted);
        self.votedMap = voted;
        room.selectedMap = resolveWinningMap(room);
        broadcastRoom(room, serializeRoom(room));
        return;
      }

      if (type === 'start_match') {
        if (room.hostId !== clientId) return;
        room.status = 'playing';
        room.placedBlocks = [];
        room.seenEvents.clear();
        room.selectedMap = resolveWinningMap(room);
        room.mapStartedAt = Date.now();
        for (const p of room.peers.values()) {
          if (p.respawnTimer) {
            clearTimeout(p.respawnTimer);
            p.respawnTimer = null;
          }
          p.kills = 0;
          p.deaths = 0;
          p.maxHp = CHARACTER_HP[p.characterId];
          p.hp = p.maxHp;
          p.absorption = 0;
          p.alive = true;
        }
        broadcastRoom(room, serializeRoom(room));
        broadcastRoom(room, {
          type: 'match_started',
          code: room.code,
          roomKind: room.kind,
          selectedMap: room.selectedMap,
          mapStartedAt: room.mapStartedAt,
          targetKills: room.targetKills,
          partyMode: room.partyMode || 'classic',
          botDifficulty: room.botDifficulty || 'medium',
          customBots: room.customBots || [],
        });
        return;
      }

      if (type === 'exit_match') {
        if (self.respawnTimer) {
          clearTimeout(self.respawnTimer);
          self.respawnTimer = null;
        }
        self.alive = true;
        self.hp = self.maxHp;
        self.absorption = 0;
        self.kills = 0;
        self.deaths = 0;
        if (room.hostId === clientId || room.peers.size <= 1) {
          room.status = 'lobby';
          room.placedBlocks = [];
          broadcastRoom(room, serializeRoom(room));
        } else {
          sendJson(ws, serializeRoom(room));
        }
        return;
      }

      if (type === 'player_state') {
        self.activeSlot = String(msg.activeSlot || self.activeSlot || 'sword');
        broadcastRoom(
          room,
          {
            type: 'peer_state',
            id: clientId,
            x: Number(msg.x || 0),
            y: Number(msg.y || 0),
            z: Number(msg.z || 0),
            yaw: Number(msg.yaw || 0),
            pitch: Number(msg.pitch || 0),
            vx: Number(msg.vx || 0),
            vy: Number(msg.vy || 0),
            vz: Number(msg.vz || 0),
            activeSlot: String(msg.activeSlot || 'sword'),
            isBlocking: Boolean(msg.isBlocking),
            isGliding: Boolean(msg.isGliding),
            isStealthed: Boolean(msg.isStealthed),
            swingSeq: Number(msg.swingSeq || 0),
          },
          clientId
        );
        return;
      }

      if (type === 'chat_message') {
        const text = String(msg.text || '').trim().slice(0, 160);
        if (!text) return;
        const chatMsg = {
          id: `chat-${clientId}-${Date.now().toString(36)}`,
          senderId: clientId,
          senderName: self.name,
          team: self.team,
          text,
        };
        broadcastRoom(room, {
          type: 'chat_message',
          ...chatMsg,
        });
        return;
      }

      if (type === 'heal_sync') {
        const hp = Math.max(1, Math.min(self.maxHp, Math.round(Number(msg.hp || self.hp))));
        const absorption = Math.max(0, Math.min(30, Math.round(Number(msg.absorption || 0))));
        self.hp = hp;
        self.absorption = absorption;
        broadcastRoom(
          room,
          {
            type: 'peer_vitals',
            id: clientId,
            hp: self.hp,
            maxHp: self.maxHp,
            absorption: self.absorption,
          },
          clientId
        );
        return;
      }

      if (type === 'combat_hit') {
        const targetId = String(msg.targetId || '');
        const target = room.peers.get(targetId);
        if (!target || !target.alive) return;
        if (room.roomMode === 'team' && self.team !== 'ffa' && target.team !== 'ffa' && self.team === target.team) {
          return;
        }
        const rawDmg = Math.max(1, Math.min(350, Math.round(Number(msg.damage || 10))));
        const isCrit = Boolean(msg.isCrit);
        const isSmash = Boolean(msg.isSmash);
        const kbX = Number(msg.kbX || 0);
        const kbY = Number(msg.kbY || 0);
        const kbZ = Number(msg.kbZ || 0);
        const ignite = Boolean(msg.ignite);

        let remAbs = target.absorption;
        let hpDmg = rawDmg;
        if (remAbs > 0) {
          const used = Math.min(remAbs, rawDmg);
          remAbs -= used;
          hpDmg = rawDmg - used;
        }
        target.absorption = remAbs;
        target.hp = Math.max(0, target.hp - hpDmg);

        broadcastRoom(room, {
          type: 'combat_damaged',
          attackerId: clientId,
          attackerName: self.name,
          targetId,
          damage: rawDmg,
          hp: target.hp,
          maxHp: target.maxHp,
          absorption: target.absorption,
          isCrit,
          isSmash,
          kbX,
          kbY,
          kbZ,
          ignite,
        });

        if (target.hp <= 0) {
          target.alive = false;
          target.deaths += 1;
          self.kills += 1;
          broadcastRoom(room, {
            type: 'combat_ko',
            killerId: clientId,
            killerName: self.name,
            killerTeam: self.team || 'ffa',
            victimId: targetId,
            victimName: target.name,
            victimTeam: target.team || 'ffa',
            weaponId: String(msg.weaponId || self.activeSlot || 'sword'),
            killerKills: self.kills,
          });
          broadcastRoom(room, serializeRoom(room));

          if (room.kind === 'link_duel' && self.kills >= room.targetKills) {
            room.status = 'lobby';
            broadcastRoom(room, {
              type: 'link_match_over',
              winnerId: clientId,
              winnerName: self.name,
              loserId: targetId,
              loserName: target.name,
            });
            return;
          }

          if (room.kind === 'private') {
            const redKills = Array.from(room.peers.values())
              .filter((p) => p.team === 'red')
              .reduce((acc, p) => acc + p.kills, 0);
            const blueKills = Array.from(room.peers.values())
              .filter((p) => p.team === 'blue')
              .reduce((acc, p) => acc + p.kills, 0);

            if (room.roomMode === 'team') {
              if (redKills >= room.targetKills || blueKills >= room.targetKills) {
                room.status = 'lobby';
                const winningTeam = redKills >= room.targetKills ? 'red' : 'blue';
                broadcastRoom(room, {
                  type: 'link_match_over',
                  winnerId: clientId,
                  winnerName: `${winningTeam === 'red' ? '레드팀' : '블루팀'} 승리! (${winningTeam === 'red' ? redKills : blueKills}킬)`,
                  loserId: targetId,
                  loserName: '',
                });
                return;
              }
            } else {
              if (self.kills >= room.targetKills) {
                room.status = 'lobby';
                broadcastRoom(room, {
                  type: 'link_match_over',
                  winnerId: clientId,
                  winnerName: self.name,
                  loserId: targetId,
                  loserName: target.name,
                });
                return;
              }
            }
          }

          target.respawnTimer = setTimeout(() => {
            target.respawnTimer = null;
            if (!rooms.has(room.code)) return;
            target.alive = true;
            target.hp = target.maxHp;
            target.absorption = 0;
            broadcastRoom(room, {
              type: 'peer_respawn',
              id: targetId,
              hp: target.hp,
              maxHp: target.maxHp,
            });
          }, 2200);
        }
        return;
      }

      if (type === 'world_event') {
        const eventId = String(msg.eventId || '');
        if (!eventId || room.seenEvents.has(eventId)) return;
        room.seenEvents.add(eventId);
        if (room.seenEvents.size > 400) {
          const firstKey = room.seenEvents.values().next().value;
          if (firstKey) room.seenEvents.delete(firstKey);
        }

        const kind = String(msg.kind || '');
        if (kind === 'block_place') {
          const block: PlacedBlockRecord = {
            id: String(msg.blockId || eventId),
            x: Number(msg.x || 0),
            y: Number(msg.y || 0),
            z: Number(msg.z || 0),
            kind: msg.blockKind === 'obsidian' ? 'obsidian' : 'player_block',
            ownerId: clientId,
          };
          if (!room.placedBlocks.some((b) => b.id === block.id)) {
            room.placedBlocks.push(block);
            if (room.placedBlocks.length > 96) {
              room.placedBlocks.shift();
            }
          }
        } else if (kind === 'block_destroy') {
          const ids = Array.isArray(msg.blockIds) ? new Set(msg.blockIds.map(String)) : new Set<string>();
          room.placedBlocks = room.placedBlocks.filter((b) => !ids.has(b.id));
        }

        broadcastRoom(
          room,
          {
            ...msg,
            type: 'world_event',
            senderId: clientId,
            senderTeam: self.team || 'ffa',
          },
          clientId
        );
      }
    });

    ws.on('close', () => {
      removeFromQueue(clientId);
      removePeerFromRoom(clientId, currentRoomCode);
    });
  });

  if (IS_PROD) {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Unstable SMP FFA server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
