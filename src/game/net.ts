import type { CharacterId, MultiplayerHudState, RoomPeerInfo } from './types';

export interface NetEventHandlers {
  onRoomChange: (
    state: MultiplayerHudState,
    placedBlocks?: Array<{ id: string; x: number; y: number; z: number; kind: string; ownerId: string }>
  ) => void;
  onMatchStart: (roomKind: 'global' | 'link_duel' | 'private') => void;
  onLinkMatchOver: (msg: { winnerId: string; winnerName: string; loserId: string; loserName: string }) => void;
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

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private handlers: NetEventHandlers;
  private state: MultiplayerHudState = {
    status: 'idle',
    roomKind: 'global',
    roomCode: null,
    selfId: null,
    isHost: false,
    playerName: 'Player',
    includeBots: true,
    linkQueueing: false,
    peers: [],
    error: null,
  };
  private pendingActions: Array<Record<string, unknown>> = [];
  private disposed = false;

  constructor(handlers: NetEventHandlers) {
    this.handlers = handlers;
  }

  public getState(): MultiplayerHudState {
    return { ...this.state, peers: [...this.state.peers] };
  }

  private ensureSocket(): void {
    if (this.disposed) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws`;
    this.state.status = 'connecting';
    this.state.error = null;
    this.handlers.onRoomChange(this.getState());

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      if (this.disposed) {
        ws.close();
        return;
      }
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
        this.state.isHost = String(msg.hostId || '') === this.state.selfId;
        this.state.includeBots = Boolean(msg.includeBots);
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
        this.handlers.onRoomChange(this.getState());
        this.handlers.onMatchStart(rk);
        return;
      }

      if (type === 'link_match_over') {
        this.handlers.onLinkMatchOver(
          msg as unknown as Parameters<NetEventHandlers['onLinkMatchOver']>[0]
        );
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
      if (this.disposed) return;
      this.state.error = '온라인 서버 연결에 실패했습니다.';
      this.state.linkQueueing = false;
      this.handlers.onRoomChange(this.getState());
    };

    ws.onclose = () => {
      if (this.disposed) return;
      this.state.linkQueueing = false;
      if (this.state.roomCode) {
        this.state.status = 'idle';
        this.state.roomCode = null;
        this.state.peers = [];
        this.state.isHost = false;
        this.handlers.onRoomChange(this.getState());
      }
    };
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

  public joinGlobal(name: string, characterId: CharacterId): void {
    this.state.playerName = name.trim() || 'Fighter';
    this.send({ type: 'join_global', name: this.state.playerName, characterId });
  }

  public createLinkDuel(name: string, characterId: CharacterId): void {
    this.state.playerName = name.trim() || 'Challenger';
    this.send({ type: 'create_link_duel', name: this.state.playerName, characterId });
  }

  public joinLinkDuel(code: string, name: string, characterId: CharacterId): void {
    this.state.playerName = name.trim() || 'Opponent';
    this.send({ type: 'join_link_duel', code: code.trim().toUpperCase(), name: this.state.playerName, characterId });
  }

  public queueLinkDuel(name: string, characterId: CharacterId): void {
    this.state.playerName = name.trim() || 'Challenger';
    this.send({ type: 'queue_link_duel', name: this.state.playerName, characterId });
  }

  public cancelLinkQueue(): void {
    this.state.linkQueueing = false;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'cancel_link_queue' }));
    }
    this.handlers.onRoomChange(this.getState());
  }

  public createRoom(name: string, characterId: CharacterId, includeBots: boolean): void {
    this.state.playerName = name.trim() || 'Player';
    this.send({ type: 'create_room', name: this.state.playerName, characterId, includeBots });
  }

  public joinRoom(code: string, name: string, characterId: CharacterId): void {
    this.state.playerName = name.trim() || 'Friend';
    this.send({ type: 'join_room', code: code.trim().toUpperCase(), name: this.state.playerName, characterId });
  }

  public updateLobby(updates: { name?: string; characterId?: CharacterId; includeBots?: boolean }): void {
    if (updates.name !== undefined) {
      this.state.playerName = updates.name.trim() || 'Player';
    }
    if (!this.state.roomCode) {
      this.handlers.onRoomChange(this.getState());
      return;
    }
    this.send({ type: 'update_lobby', ...updates });
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
    this.ws?.close();
    this.ws = null;
  }
}
