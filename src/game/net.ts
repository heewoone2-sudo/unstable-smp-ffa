import type { CharacterId, ChatEntry, MapId, MultiplayerHudState, RoomMode, RoomPeerInfo } from './types';

export interface NetEventHandlers {
  onRoomChange: (
    state: MultiplayerHudState,
    placedBlocks?: Array<{ id: string; x: number; y: number; z: number; kind: string; ownerId: string }>
  ) => void;
  onMatchStart: (
    roomKind: 'global' | 'link_duel' | 'private',
    selectedMap?: MapId,
    mapStartedAt?: number,
    targetKills?: number
  ) => void;
  onMapChanged?: (mapId: MapId, mapStartedAt: number) => void;
  onLinkMatchOver: (msg: { winnerId: string; winnerName: string; loserId: string; loserName: string }) => void;
  onChat: (msg: ChatEntry) => void;
  onPeerState: (msg: {
    id: string;
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    vx: number;
    vy: number;
    vz: number;
    activeSlot: string;
    isBlocking: boolean;
    isGliding: boolean;
    isStealthed: boolean;
    swingSeq: number;
  }) => void;
  onPeerVitals: (msg: { id: string; hp: number; maxHp: number; absorption: number }) => void;
  onCombatDamaged: (msg: {
    attackerId: string;
    attackerName: string;
    targetId: string;
    damage: number;
    hp: number;
    maxHp: number;
    absorption: number;
    isCrit: boolean;
    isSmash: boolean;
    kbX: number;
    kbY: number;
    kbZ: number;
    ignite: boolean;
  }) => void;
  onCombatKo: (msg: {
    killerId: string;
    killerName: string;
    victimId: string;
    victimName: string;
    killerKills: number;
  }) => void;
  onPeerRespawn: (msg: { id: string; hp: number; maxHp: number }) => void;
  onWorldEvent: (msg: Record<string, unknown>) => void;
}

const CUSTOM_WS_STORAGE_KEY = 'unstable_custom_ws_url';

export function resolveWebSocketUrl(): string {
  try {
    const saved = window.localStorage.getItem(CUSTOM_WS_STORAGE_KEY)?.trim();
    if (saved) {
      if (saved.startsWith('ws://') || saved.startsWith('wss://')) return saved;
      if (saved.startsWith('http://')) return `${saved.replace('http://', 'ws://').replace(/\/$/, '')}/ws`;
      if (saved.startsWith('https://')) return `${saved.replace('https://', 'wss://').replace(/\/$/, '')}/ws`;
    }
  } catch {
    // ignore storage errors
  }

  const envUrl = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_WS_URL?.trim();
  if (envUrl) return envUrl;

  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}

export function saveCustomServerUrl(raw: string): string {
  const cleaned = raw.trim();
  try {
    if (!cleaned) {
      window.localStorage.removeItem(CUSTOM_WS_STORAGE_KEY);
    } else {
      window.localStorage.setItem(CUSTOM_WS_STORAGE_KEY, cleaned);
    }
  } catch {
    // ignore storage errors
  }
  return resolveWebSocketUrl();
}

export function getCustomServerUrl(): string {
  try {
    return window.localStorage.getItem(CUSTOM_WS_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private handlers: NetEventHandlers;
  private state: MultiplayerHudState = {
    status: 'idle',
    roomKind: 'global',
    roomMode: 'ffa',
    roomCode: null,
    selfId: null,
    isHost: false,
    playerName: 'Player',
    includeBots: true,
    linkQueueing: false,
    selectedMap: 'container_yard',
    mapVotes: {
      container_yard: 0,
      emerald_citadel: 0,
      sky_dock: 0,
      nether_foundry: 0,
    },
    targetKills: 15,
    peers: [],
    error: null,
  };
  private pendingActions: Array<Record<string, unknown>> = [];
  private disposed = false;
  private retryCount = 0;
  private retryTimer: number | null = null;
  private connectTimeout: number | null = null;
  private pingTimer: number | null = null;
  private openedOnce = false;

  constructor(handlers: NetEventHandlers) {
    this.handlers = handlers;
  }

  public getState(): MultiplayerHudState {
    return { ...this.state, peers: [...this.state.peers] };
  }

  public resetConnection(): void {
    this.clearTimers();
    this.retryCount = 0;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.state.error = null;
    this.state.status = 'idle';
    this.handlers.onRoomChange(this.getState());
  }

  private clearTimers(): void {
    if (this.retryTimer !== null) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.connectTimeout !== null) {
      window.clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
    if (this.pingTimer !== null) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private ensureSocket(): void {
    if (this.disposed) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const url = resolveWebSocketUrl();
    this.state.status = 'connecting';
    this.state.error = null;
    this.openedOnce = false;
    this.handlers.onRoomChange(this.getState());

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      this.handleFatalConnectError('잘못된 웹소켓 서버 주소입니다.');
      return;
    }
    this.ws = ws;

    if (this.connectTimeout !== null) {
      window.clearTimeout(this.connectTimeout);
    }
    this.connectTimeout = window.setTimeout(() => {
      if (this.ws === ws && ws.readyState === WebSocket.CONNECTING) {
        try {
          ws.close();
        } catch {
          // ignore
        }
      }
    }, 12000);

    ws.onopen = () => {
      if (this.disposed) {
        ws.close();
        return;
      }
      if (this.connectTimeout !== null) {
        window.clearTimeout(this.connectTimeout);
        this.connectTimeout = null;
      }
      this.openedOnce = true;
      this.retryCount = 0;
      this.state.error = null;

      if (this.pingTimer !== null) window.clearInterval(this.pingTimer);
      this.pingTimer = window.setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 20000);

      while (this.pendingActions.length > 0) {
        const msg = this.pendingActions.shift()!;
        ws.send(JSON.stringify(msg));
      }
    };

    ws.onmessage = (ev) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(ev.data)) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = String(msg.type || '');
      if (type === 'pong') return;

      if (type === 'welcome') {
        this.state.selfId = String(msg.clientId || '');
        this.handlers.onRoomChange(this.getState());
        return;
      }

      if (type === 'room_error') {
        this.state.error = String(msg.message || '연결 오류');
        this.state.linkQueueing = false;
        if (!this.state.roomCode) {
          this.state.status = 'idle';
        }
        this.handlers.onRoomChange(this.getState());
        return;
      }

      if (type === 'link_queued') {
        this.state.linkQueueing = true;
        this.state.error = null;
        this.handlers.onRoomChange(this.getState());
        return;
      }

      if (type === 'link_queue_cancelled') {
        this.state.linkQueueing = false;
        this.handlers.onRoomChange(this.getState());
        return;
      }

      if (type === 'room_state') {
        const peers = (Array.isArray(msg.peers) ? msg.peers : []) as RoomPeerInfo[];
        const rk = msg.roomKind === 'global' || msg.roomKind === 'link_duel' ? msg.roomKind : 'private';
        this.state.roomCode = String(msg.code || '');
        this.state.roomKind = rk;
        this.state.roomMode = msg.roomMode === 'team' ? 'team' : 'ffa';
        this.state.isHost = String(msg.hostId || '') === this.state.selfId;
        this.state.includeBots = Boolean(msg.includeBots);
        this.state.selectedMap = (typeof msg.selectedMap === 'string' ? msg.selectedMap : 'container_yard') as MapId;
        if (msg.mapVotes && typeof msg.mapVotes === 'object') {
          const mv = msg.mapVotes as Record<string, number>;
          this.state.mapVotes = {
            container_yard: Number(mv.container_yard || 0),
            emerald_citadel: Number(mv.emerald_citadel || 0),
            sky_dock: Number(mv.sky_dock || 0),
            nether_foundry: Number(mv.nether_foundry || 0),
          };
        }
        this.state.targetKills = typeof msg.targetKills === 'number' ? msg.targetKills : 15;
        this.state.mapStartedAt = typeof msg.mapStartedAt === 'number' ? msg.mapStartedAt : undefined;
        this.state.status = msg.status === 'playing' ? 'playing' : 'lobby';
        this.state.linkQueueing = false;
        this.state.peers = peers;
        this.state.error = null;
        const blocks = Array.isArray(msg.placedBlocks)
          ? (msg.placedBlocks as Array<{ id: string; x: number; y: number; z: number; kind: string; ownerId: string }>)
          : undefined;
        this.handlers.onRoomChange(this.getState(), blocks);
        return;
      }

      if (type === 'match_started') {
        const rk = msg.roomKind === 'global' || msg.roomKind === 'link_duel' ? msg.roomKind : 'private';
        this.state.roomKind = rk;
        this.state.status = 'playing';
        this.state.linkQueueing = false;
        if (typeof msg.selectedMap === 'string') {
          this.state.selectedMap = msg.selectedMap as MapId;
        }
        if (typeof msg.mapStartedAt === 'number') {
          this.state.mapStartedAt = msg.mapStartedAt;
        }
        if (typeof msg.targetKills === 'number') {
          this.state.targetKills = msg.targetKills;
        }
        this.handlers.onRoomChange(this.getState());
        this.handlers.onMatchStart(
          rk,
          msg.selectedMap as MapId | undefined,
          typeof msg.mapStartedAt === 'number' ? msg.mapStartedAt : undefined,
          typeof msg.targetKills === 'number' ? msg.targetKills : undefined
        );
        return;
      }

      if (type === 'map_changed') {
        const mapId = (typeof msg.mapId === 'string' ? msg.mapId : 'container_yard') as MapId;
        const mapStartedAt = typeof msg.mapStartedAt === 'number' ? msg.mapStartedAt : Date.now();
        this.state.selectedMap = mapId;
        this.state.mapStartedAt = mapStartedAt;
        this.handlers.onRoomChange(this.getState());
        this.handlers.onMapChanged?.(mapId, mapStartedAt);
        return;
      }

      if (type === 'link_match_over') {
        this.handlers.onLinkMatchOver(
          msg as unknown as Parameters<NetEventHandlers['onLinkMatchOver']>[0]
        );
        return;
      }

      if (type === 'chat_message') {
        this.handlers.onChat?.({
          id: String(msg.id || Math.random()),
          senderId: String(msg.senderId || ''),
          senderName: String(msg.senderName || 'Player'),
          text: String(msg.text || ''),
          team: msg.team === 'red' || msg.team === 'blue' ? msg.team : 'ffa',
        });
        return;
      }

      if (type === 'peer_state') {
        this.handlers.onPeerState(msg as unknown as Parameters<NetEventHandlers['onPeerState']>[0]);
        return;
      }

      if (type === 'peer_vitals') {
        this.handlers.onPeerVitals(msg as unknown as Parameters<NetEventHandlers['onPeerVitals']>[0]);
        return;
      }

      if (type === 'combat_damaged') {
        this.handlers.onCombatDamaged(msg as unknown as Parameters<NetEventHandlers['onCombatDamaged']>[0]);
        return;
      }

      if (type === 'combat_ko') {
        this.handlers.onCombatKo(msg as unknown as Parameters<NetEventHandlers['onCombatKo']>[0]);
        return;
      }

      if (type === 'peer_respawn') {
        this.handlers.onPeerRespawn(msg as unknown as Parameters<NetEventHandlers['onPeerRespawn']>[0]);
        return;
      }

      if (type === 'world_event') {
        this.handlers.onWorldEvent(msg);
      }
    };

    ws.onerror = () => {
      // Let onclose handle retry vs fatal error cleanly
    };

    ws.onclose = () => {
      if (this.disposed) return;
      if (this.ws === ws) {
        this.ws = null;
      }
      if (this.connectTimeout !== null) {
        window.clearTimeout(this.connectTimeout);
        this.connectTimeout = null;
      }
      if (this.pingTimer !== null) {
        window.clearInterval(this.pingTimer);
        this.pingTimer = null;
      }

      if (!this.openedOnce && this.pendingActions.length > 0 && this.retryCount < 2) {
        this.retryCount += 1;
        this.retryTimer = window.setTimeout(() => {
          this.retryTimer = null;
          this.ensureSocket();
        }, 700 * this.retryCount);
        return;
      }

      this.state.linkQueueing = false;
      if (!this.openedOnce) {
        this.handleFatalConnectError(
          '온라인 서버 연결에 실패했습니다. Render Static Site(dist 정적 배포)가 아닌 Web Service(npm start)로 배포되었는지 확인하거나 아래에 서버 주소를 입력하세요.'
        );
        return;
      }

      if (this.state.roomCode) {
        this.state.status = 'idle';
        this.state.roomCode = null;
        this.state.peers = [];
        this.state.isHost = false;
        this.state.error = '서버와의 연결이 끊어졌습니다. 다시 입장해 주세요.';
        this.handlers.onRoomChange(this.getState());
      }
    };
  }

  private handleFatalConnectError(message: string): void {
    this.pendingActions = [];
    this.retryCount = 0;
    this.state.status = 'idle';
    this.state.linkQueueing = false;
    this.state.error = message;
    this.handlers.onRoomChange(this.getState());
  }

  public send(payload: Record<string, unknown>): void {
    if (this.disposed) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      this.pendingActions.push(payload);
      this.ensureSocket();
    }
  }

  public sendChat(text: string): void {
    const clean = text.trim().slice(0, 160);
    if (!clean) return;
    this.send({ type: 'chat_message', text: clean });
  }

  public joinGlobal(name: string, characterId: CharacterId): void {
    this.state.playerName = name.trim() || 'Fighter';
    this.retryCount = 0;
    this.send({ type: 'join_global', name: this.state.playerName, characterId });
  }

  public createLinkDuel(name: string, characterId: CharacterId): void {
    this.state.playerName = name.trim() || 'Challenger';
    this.retryCount = 0;
    this.send({ type: 'create_link_duel', name: this.state.playerName, characterId });
  }

  public joinLinkDuel(code: string, name: string, characterId: CharacterId): void {
    this.state.playerName = name.trim() || 'Opponent';
    this.retryCount = 0;
    this.send({ type: 'join_link_duel', code: code.trim().toUpperCase(), name: this.state.playerName, characterId });
  }

  public queueLinkDuel(name: string, characterId: CharacterId): void {
    this.state.playerName = name.trim() || 'Challenger';
    this.retryCount = 0;
    this.send({ type: 'queue_link_duel', name: this.state.playerName, characterId });
  }

  public cancelLinkQueue(): void {
    this.state.linkQueueing = false;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'cancel_link_queue' }));
    }
    this.handlers.onRoomChange(this.getState());
  }

  public createRoom(name: string, characterId: CharacterId, includeBots: boolean, roomMode: 'ffa' | 'team', team: 'red' | 'blue' | 'ffa'): void {
    this.state.playerName = name.trim() || 'Player';
    this.retryCount = 0;
    this.send({ type: 'create_room', name: this.state.playerName, characterId, includeBots, roomMode, team });
  }

  public joinRoom(code: string, name: string, characterId: CharacterId, team: 'red' | 'blue' | 'ffa'): void {
    this.state.playerName = name.trim() || 'Friend';
    this.retryCount = 0;
    this.send({ type: 'join_room', code: code.trim().toUpperCase(), name: this.state.playerName, characterId, team });
  }

  public updateLobby(updates: {
    name?: string;
    characterId?: CharacterId;
    includeBots?: boolean;
    team?: 'red' | 'blue' | 'ffa';
    roomMode?: RoomMode;
    targetKills?: number;
    selectedMap?: MapId;
  }): void {
    if (updates.name !== undefined) {
      this.state.playerName = updates.name.trim() || 'Player';
    }
    if (!this.state.roomCode) {
      this.handlers.onRoomChange(this.getState());
      return;
    }
    this.send({ type: 'update_lobby', ...updates });
  }

  public voteMap(mapId: MapId): void {
    if (!this.state.roomCode) return;
    this.send({ type: 'vote_map', mapId });
  }

  public startMatch(): void {
    if (!this.state.roomCode) return;
    this.send({ type: 'start_match' });
  }

  public leaveRoom(): void {
    this.state.linkQueueing = false;
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.state.roomCode) {
      this.ws.send(JSON.stringify({ type: 'leave_room' }));
    }
    this.state.status = 'idle';
    this.state.roomCode = null;
    this.state.isHost = false;
    this.state.peers = [];
    this.state.error = null;
    this.handlers.onRoomChange(this.getState());
  }

  public dispose(): void {
    this.disposed = true;
    this.clearTimers();
    this.ws?.close();
    this.ws = null;
  }
}
