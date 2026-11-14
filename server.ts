import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

type CharacterId =
  | 'wemmbu'
  | 'flamefrags'
  | 'parrotx2'
  | 'spokeishere'
  | 'manepear'
  | 'clownpierce'
  | 'princezam'
  | 'jumperwho'
  | 'minutetech';

const CHARACTER_HP: Record<CharacterId, number> = {
  wemmbu: 110,
  flamefrags: 115,
  parrotx2: 105,
  spokeishere: 100,
  manepear: 135,
  clownpierce: 112,
  princezam: 118,
  jumperwho: 102,
  minutetech: 115,
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
  kills: number;
  deaths: number;
  hp: number;
  maxHp: number;
  absorption: number;
  alive: boolean;
  respawnTimer: NodeJS.Timeout | null;
}

interface RoomState {
  code: string;
  kind: 'global' | 'link_duel' | 'private';
  hostId: string;
  status: 'lobby' | 'playing';
  includeBots: boolean;
  targetKills: number;
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
    if (code !== 'GLOBAL' && !rooms.has(code)) return code;
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

function serializeRoom(room: RoomState) {
  return {
    type: 'room_state',
    code: room.code,
    roomKind: room.kind,
    hostId: room.hostId,
    status: room.status,
    includeBots: room.includeBots,
    placedBlocks: room.placedBlocks,
    peers: Array.from(room.peers.values()).map((p) => ({
      id: p.id,
      name: p.name,
      characterId: p.characterId,
      kills: p.kills,
      deaths: p.deaths,
      hp: p.hp,
      maxHp: p.maxHp,
      isHost: p.id === room.hostId,
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

function ensureGlobalRoom(hostId: string): RoomState {
  const existing = rooms.get('GLOBAL');
  if (existing) return existing;
  const created: RoomState = {
    code: 'GLOBAL',
    kind: 'global',
    hostId,
    status: 'playing',
    includeBots: true,
    targetKills: 999,
    peers: new Map(),
    placedBlocks: [],
    seenEvents: new Set(),
  };
  rooms.set('GLOBAL', created);
  return created;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      rooms: rooms.size,
      globalPlayers: rooms.get('GLOBAL')?.peers.size ?? 0,
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

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

      if (type === 'join_global') {
        removeFromQueue(clientId);
        removePeerFromRoom(clientId, currentRoomCode);
        const room = ensureGlobalRoom(clientId);
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
          kills: 0,
          deaths: 0,
          hp: maxHp,
          maxHp,
          absorption: 0,
          alive: true,
          respawnTimer: null,
        });
        currentRoomCode = 'GLOBAL';
        broadcastRoom(room, serializeRoom(room));
        sendJson(ws, { type: 'match_started', code: 'GLOBAL', roomKind: 'global' });
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
          hostId: clientId,
          status: 'lobby',
          includeBots: false,
          targetKills: 3,
          peers: new Map(),
          placedBlocks: [],
          seenEvents: new Set(),
        };
        room.peers.set(clientId, {
          id: clientId,
          ws,
          name,
          characterId: charId,
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
        broadcastRoom(room, serializeRoom(room));
        broadcastRoom(room, { type: 'match_started', code: room.code, roomKind: 'link_duel' });
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
            hostId: partner.clientId,
            status: 'playing',
            includeBots: false,
            targetKills: 3,
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
          broadcastRoom(room, { type: 'match_started', code, roomKind: 'link_duel' });
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
        const room: RoomState = {
          code,
          kind: 'private',
          hostId: clientId,
          status: 'lobby',
          includeBots: Boolean(msg.includeBots),
          targetKills: 15,
          peers: new Map(),
          placedBlocks: [],
          seenEvents: new Set(),
        };
        room.peers.set(clientId, {
          id: clientId,
          ws,
          name,
          characterId: charId,
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
        room.peers.set(clientId, {
          id: clientId,
          ws,
          name,
          characterId: charId,
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
          sendJson(ws, { type: 'match_started', code: room.code, roomKind: room.kind });
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
        if (typeof msg.includeBots === 'boolean' && room.hostId === clientId) {
          room.includeBots = msg.includeBots;
        }
        broadcastRoom(room, serializeRoom(room));
        return;
      }

      if (type === 'start_match') {
        if (room.hostId !== clientId) return;
        room.status = 'playing';
        room.placedBlocks = [];
        room.seenEvents.clear();
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
        broadcastRoom(room, { type: 'match_started', code: room.code, roomKind: room.kind });
        return;
      }

      if (type === 'player_state') {
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
        const rawDmg = Math.max(1, Math.min(75, Math.round(Number(msg.damage || 10))));
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
            victimId: targetId,
            victimName: target.name,
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
