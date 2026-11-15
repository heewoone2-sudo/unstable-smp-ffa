import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GameAudio } from './audio';
import { CHARACTER_LIST, CHARACTERS, DEFAULT_GAME_SETTINGS, GAME_MODES } from './characters';
import {
  applyCombatDamage,
  computeBlockPlacement,
  computeMaceDamage,
  computeSwordDamage,
  consumeSlotUse,
  getSupportHeightAt,
  isInsideCobweb,
  isInsideHazardPool,
  resolveHorizontalCollision,
  tickSlotRecharge,
} from './combatMath';
import {
  canDamageTarget,
  getArenaBlocksForMap,
  getNextMapId,
  MAP_DEFINITIONS,
  MAP_ROTATION_SECONDS,
} from './maps';
import {
  createArrowProjectileMesh,
  createCobwebMesh,
  createEnemyOverheadBar,
  createFighterModel,
  createFirstPersonRig,
  createHazardPoolMesh,
  createTntBlockMesh,
  type EnemyOverheadBar,
  type FighterRig,
  type FirstPersonRig,
} from './models';
import { MultiplayerClient } from './net';
import { createArenaMaterials, paintSkyDomeCanvas, type ArenaMaterialSet } from './textures';
import type {
  AiPolicy,
  ArenaBlock,
  CameraViewMode,
  CharacterId,
  CharacterProfile,
  ChatEntry,
  CobwebZone,
  GameModeId,
  GameScreenState,
  GameSettings,
  HazardPoolZone,
  HudSnapshot,
  MapId,
  MultiplayerHudState,
  PlayerTeam,
  ScoreboardEntry,
  SixTuple,
  WeaponSlotId,
} from './types';

const SETTINGS_STORAGE_KEY = 'skybox_clash_settings_v1';

const ARENA_RADIUS = 108;
const GRAVITY = -28;
const PLAYER_RADIUS = 0.52;
const PLAYER_HEIGHT = 1.85;
const MAX_PLACED_BLOCKS = 96;

// Pre-allocated scratch math objects (Zero-GC render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _aimDir = new THREE.Vector3();
const _camGoal = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scaleVec = new THREE.Vector3();
const _color = new THREE.Color();

interface Projectile {
  active: boolean;
  kind: 'wind_charge' | 'ender_pearl' | 'trident' | 'cobweb_orb' | 'arrow' | 'bolt';
  ownerId: string;
  ownerTeam: PlayerTeam;
  damage: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  mesh: THREE.Mesh;
  arrowGroup: THREE.Group;
}

interface TntFuseEntity {
  active: boolean;
  ownerId: string;
  ownerTeam: PlayerTeam;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  fuse: number;
  grounded: boolean;
  mesh: THREE.Group;
}

interface ActiveCobweb extends CobwebZone {
  active: boolean;
  life: number;
  ownerGrace: number;
  hp: number;
  breakProgress: number;
  mesh: THREE.Group;
}

interface ActiveHazardPool extends HazardPoolZone {
  active: boolean;
  life: number;
  ownerId: string;
  ownerGrace: number;
  mesh: THREE.Group;
}

interface PlacedBlockEntry {
  block: ArenaBlock;
  mesh: THREE.Mesh;
  life: number;
}

interface Particle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

interface Shockwave {
  active: boolean;
  life: number;
  maxLife: number;
  maxRadius: number;
  mesh: THREE.Mesh;
}

interface AiFighter {
  id: string;
  name: string;
  team: PlayerTeam;
  profile: CharacterProfile;
  policy: AiPolicy;
  rig: FighterRig;
  overhead: EnemyOverheadBar;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  hp: number;
  maxHp: number;
  absorption: number;
  kills: number;
  deaths: number;
  onGround: boolean;
  fallStartY: number;
  walkDist: number;
  swingTimer: number;
  hitFlashTimer: number;
  recoilTilt: number;
  burnTimer: number;
  burnTickTimer: number;
  attackCooldown: number;
  telegraphTimer: number;
  telegraphKind: 'melee' | 'smash' | null;
  strafeDir: number;
  strafeTimer: number;
  windCd: number;
  pearlCd: number;
  specialCd: number;
  healCd: number;
  stealthTimer: number;
  isBlocking: boolean;
  koTimer: number;
  alive: boolean;
  respawnTimer: number;
  isBoss?: boolean;
}

interface RemotePeerActor {
  id: string;
  name: string;
  team: PlayerTeam;
  characterId: CharacterId;
  rig: FighterRig;
  overhead: EnemyOverheadBar;
  pos: THREE.Vector3;
  targetPos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  targetYaw: number;
  hp: number;
  maxHp: number;
  kills: number;
  deaths: number;
  activeSlot: WeaponSlotId;
  isBlocking: boolean;
  isGliding: boolean;
  isStealthed: boolean;
  lastSwingSeq: number;
  swingTimer: number;
  hitFlashTimer: number;
  recoilTilt: number;
  walkDist: number;
  alive: boolean;
}

export class UnstableArenaEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private audio = new GameAudio();
  private materials: ArenaMaterialSet;
  private isSoftwareGl: boolean;
  private staticBlockCount = 0;
  private blocks: ArenaBlock[];
  private placedBlocks: PlacedBlockEntry[] = [];
  private envMeshes: THREE.Mesh[] = [];
  private mapGroup!: THREE.Group;
  private groundMesh!: THREE.Mesh;
  private outerTerrainMesh!: THREE.Mesh;
  private hemiLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;
  private currentMapId: MapId = 'container_yard';
  private currentArenaRadius = MAP_DEFINITIONS.container_yard.worldRadius;
  private offlineMapTimer = 0;
  private mapStartedAtMs = Date.now();
  private matchTargetKills = 15;
  private settings: GameSettings = { ...DEFAULT_GAME_SETTINGS };
  private fps = 60;
  private fpsFrames = 0;
  private fpsAccum = 0;
  private mobileSprintLocked = false;
  private mobileForwardInput = 0;
  private raycaster = new THREE.Raycaster();
  private net: MultiplayerClient;

  private onHudChange: (snapshot: HudSnapshot) => void;
  private onMatchEnd?: (res: { mode: GameModeId; won: boolean | null; kills: number; deaths: number }) => void;
  private hudThrottle = 0;
  private netStateThrottle = 0;
  private localSwingSeq = 0;
  private localEventCounter = 0;

  private frameId = 0;
  private lastTime = 0;
  private disposed = false;
  private screen: GameScreenState = 'title';
  private mode: GameModeId = 'online_world';
  private selectedCharId: CharacterId = 'wemmbu';

  // Player state
  private playerRig!: FighterRig;
  private fpRig!: FirstPersonRig;
  private slashMesh!: THREE.Mesh;
  private slashTimer = 0;
  private playerPos = new THREE.Vector3(0, 0, 10);
  private playerVel = new THREE.Vector3();
  private playerYaw = 0;
  private playerPitch = -0.14;
  private targetYaw = 0;
  private targetPitch = -0.14;
  private playerOnGround = true;
  private playerFallStartY = 0;
  private playerCoyote = 0;
  private playerJumpBuffer = 0;
  private attackBuffer = 0;
  private playerWalkDist = 0;
  private playerHp = 112;
  private playerMaxHp = 112;
  private playerAbsorption = 0;
  private playerStamina = 100;
  private activeSlot = 0;
  private slotCooldowns: SixTuple<number> = [0, 0, 0, 0, 0, 0];
  private slotCharges: SixTuple<number> = [1, 1, 1, 3, 1, 16];
  private slotMaxCharges: SixTuple<number> = [1, 1, 1, 3, 1, 16];
  private slotUseDelays: SixTuple<number> = [0, 0, 0, 0, 0, 0];
  private elytraCooldown = 0;
  private isGliding = false;
  private glideSpeed = 18;
  private fireworkBoostTimer = 0;
  private fireworkCooldown = 0;
  private elytraHealAccum = 0;
  private elytraHealSyncTimer = 0;
  private elytraHealParticleTimer = 0;
  private isBlocking = false;
  private stealthTimer = 0;
  private playerInCobweb = false;
  private cobwebBreakProgress = 0;
  private cobwebHoldSoundTimer = 0;
  private playerInLava = false;
  private wasInLava = false;
  private playerInWater = false;
  private playerBurnTimer = 0;
  private playerBurnTickTimer = 0;
  private mobileAttackHeld = false;
  private cameraMode: CameraViewMode = 'firstperson';
  private swingTimer = 0;
  private hitFlashTimer = 0;
  private squashY = 1;
  private localRespawnTimer = 0;

  // Camera state
  private camPos = new THREE.Vector3(1.2, 3.2, 16);
  private camLook = new THREE.Vector3(0, 1.5, 0);
  private shakeTrauma = 0;
  private hitstopTimer = 0;
  private fovCurrent = 78;
  private titleOrbitAngle = 0;

  // Match stats
  private kills = 0;
  private deaths = 0;
  private wave = 1;
  private comboStreak = 0;
  private maxSmashHeight = 0;
  private damageDealt = 0;
  private elapsedTime = 0;
  private outcome: 'victory' | 'defeat' | null = null;
  private defeatDelayTimer = 0;
  private calloutText = '';
  private calloutAccent = '#fbbf24';
  private calloutTimer = 0;
  private hitmarkerTimer = 0;
  private hitmarkerCrit = false;
  private lastHitText = '';
  private killFeed: Array<{ id: number; text: string; color: string }> = [];
  private chatMessages: ChatEntry[] = [];
  private nextFeedId = 1;

  // World dynamic pools
  private enemies: AiFighter[] = [];
  private remotePeers = new Map<string, RemotePeerActor>();
  private projectiles: Projectile[] = [];
  private tntFuses: TntFuseEntity[] = [];
  private cobwebs: ActiveCobweb[] = [];
  private cobwebCursor = 0;
  private hazardPools: ActiveHazardPool[] = [];
  private hazardCursor = 0;
  private particles: Particle[] = [];
  private particleMesh!: THREE.InstancedMesh;
  private particleCursor = 0;
  private shockwaves: Shockwave[] = [];
  private crystalMeshes: THREE.Mesh[] = [];

  // Input state
  private keys = new Set<string>();
  private mouseDownLeft = false;
  private mouseDownRight = false;
  private pointerLocked = false;
  private lastMouseX: number | null = null;
  private lastMouseY: number | null = null;
  private edgeTurnDir = 0;
  private edgePitchDir = 0;
  private lastWheelSwitchMs = 0;

  // Multiplayer HUD mirror
  private mpState: MultiplayerHudState = {
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

  constructor(container: HTMLElement, onHudChange: (snapshot: HudSnapshot) => void) {
    this.container = container;
    this.onHudChange = onHudChange;
    this.settings = this.loadSettings();
    this.cameraMode = this.settings.cameraMode;
    this.fovCurrent = this.settings.fov;
    this.audio.setMuted(this.settings.muted);
    this.audio.setMasterVolume(this.settings.masterVolume / 100);
    this.blocks = getArenaBlocksForMap(this.currentMapId);
    this.staticBlockCount = this.blocks.length;

    this.isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight
    );

    this.applyGraphicsQuality();
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const initMapDef = MAP_DEFINITIONS[this.currentMapId];
    this.scene.background = new THREE.Color(initMapDef.fogColor);
    this.scene.fog = new THREE.FogExp2(initMapDef.fogColor, 0.0020);

    const aspect =
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(this.settings.fov, aspect, 0.1, 480);
    this.scene.add(this.camera);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    this.materials = createArenaMaterials(this.renderer);
    this.setupLighting();
    this.buildArenaEnvironment();
    this.initPools();
    this.rebuildPlayerRig();
    this.initSlotChargesFromProfile();

    this.net = new MultiplayerClient({
      onRoomChange: (state, placed) => {
        this.mpState = state;
        this.matchTargetKills = state.targetKills || 15;
        if (state.mapStartedAt) {
          this.mapStartedAtMs = state.mapStartedAt;
        }
        if (state.selectedMap && state.selectedMap !== this.currentMapId && this.screen === 'title') {
          this.applyArenaMap(state.selectedMap, false);
        }
        if (placed) {
          this.syncPlacedBlocksFromServer(placed);
        }
        this.syncRemotePeers();
        this.emitHud(true);
      },
      onMatchStart: (roomKind, selectedMap, mapStartedAt, targetKills) => {
        this.mode =
          roomKind === 'global' ? 'online_world' : roomKind === 'link_duel' ? 'link_duel' : 'multiplayer';
        if (selectedMap) {
          this.currentMapId = selectedMap;
        }
        this.mapStartedAtMs = mapStartedAt ?? Date.now();
        if (targetKills) {
          this.matchTargetKills = targetKills;
        }
        this.startGameInternal();
      },
      onMapChanged: (mapId, mapStartedAt) => {
        this.mapStartedAtMs = mapStartedAt;
        this.applyArenaMap(mapId, true);
        this.emitHud(true);
      },
      onLinkMatchOver: (msg) => {
        const won = msg.winnerId === this.mpState.selfId;
        this.pushCallout(
          won ? `링크전 승리! (${msg.winnerName})` : `링크전 패배 (${msg.winnerName} 승)`,
          won ? '#fbbf24' : '#ef4444'
        );
        this.triggerEndGame(won ? 'victory' : 'defeat');
      },
      onChat: (msg) => {
        this.chatMessages = [...this.chatMessages, msg].slice(-40);
        this.emitHud(true);
      },
      onPeerState: (msg) => {
        const peer = this.remotePeers.get(msg.id);
        if (!peer) return;
        peer.targetPos.set(msg.x, msg.y, msg.z);
        peer.vel.set(msg.vx, msg.vy, msg.vz);
        peer.targetYaw = msg.yaw + Math.PI;
        if (peer.activeSlot !== msg.activeSlot) {
          peer.activeSlot = msg.activeSlot as WeaponSlotId;
          peer.rig.setActiveWeapon(peer.activeSlot);
        }
        peer.isBlocking = msg.isBlocking;
        peer.isGliding = msg.isGliding;
        peer.isStealthed = msg.isStealthed;
        peer.rig.setOpacity(msg.isStealthed ? 0.25 : 1);
        if (msg.swingSeq !== peer.lastSwingSeq) {
          peer.lastSwingSeq = msg.swingSeq;
          peer.swingTimer = 0.24;
        }
      },
      onPeerVitals: (msg) => {
        const peer = this.remotePeers.get(msg.id);
        if (!peer) return;
        peer.hp = msg.hp;
        peer.maxHp = msg.maxHp;
        peer.overhead.updateHp(peer.hp / peer.maxHp);
      },
      onCombatDamaged: (msg) => {
        if (msg.targetId === this.mpState.selfId) {
          this.playerHp = msg.hp;
          this.playerAbsorption = msg.absorption;
          this.playerVel.x += msg.kbX;
          this.playerVel.y = Math.max(this.playerVel.y, msg.kbY);
          this.playerVel.z += msg.kbZ;
          if (msg.ignite) {
            this.playerBurnTimer = 3.0;
            this.playerBurnTickTimer = 0.6;
          }
          this.hitFlashTimer = 0.12;
          this.playerRig.setHitFlash(true, 0xef4444);
          this.audio.playPlayerHurt();
          this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.36);
          this.emitHud(true);
        } else {
          const peer = this.remotePeers.get(msg.targetId);
          if (peer) {
            peer.hp = msg.hp;
            peer.maxHp = msg.maxHp;
            peer.overhead.updateHp(peer.hp / peer.maxHp);
            peer.hitFlashTimer = 0.12;
            peer.recoilTilt = msg.isCrit || msg.isSmash ? 0.55 : 0.32;
            peer.rig.setHitFlash(true);
            this.spawnParticles(peer.pos.x, peer.pos.y + 1.2, peer.pos.z, 12, 0xef4444, 6);
          }
        }
      },
      onCombatKo: (msg) => {
        this.addKillFeedStructured({
          killerName: msg.killerName,
          killerTeam: msg.killerTeam,
          victimName: msg.victimName,
          victimTeam: msg.victimTeam,
          weaponId: msg.weaponId,
          color: '#c084fc',
        });
        this.audio.playDeath(msg.victimId === this.mpState.selfId);
        if (msg.killerId === this.mpState.selfId) {
          this.kills = msg.killerKills;
          this.comboStreak += 1;
          this.pushCallout(`${msg.victimName} 처치!`, '#fbbf24');
        }
        if (msg.victimId === this.mpState.selfId) {
          this.deaths += 1;
          this.localRespawnTimer = 2.4;
          this.comboStreak = 0;
          this.pushCallout(`${msg.killerName}에게 처치됨 · 2.4초 후 부활`, '#ef4444');
        } else {
          const peer = this.remotePeers.get(msg.victimId);
          if (peer) {
            peer.alive = false;
            peer.rig.root.visible = false;
            this.spawnParticles(peer.pos.x, peer.pos.y + 1, peer.pos.z, 22, 0xc084fc, 8);
          }
        }
        this.emitHud(true);
      },
      onPeerRespawn: (msg) => {
        if (msg.id === this.mpState.selfId) {
          this.respawnLocalPlayerInMp();
        } else {
          const peer = this.remotePeers.get(msg.id);
          if (peer) {
            peer.alive = true;
            peer.hp = msg.hp;
            peer.maxHp = msg.maxHp;
            peer.overhead.updateHp(1);
            peer.rig.root.visible = true;
            peer.rig.setHitFlash(false);
          }
        }
        this.emitHud(true);
      },
      onWorldEvent: (msg) => {
        this.applyRemoteWorldEvent(msg);
      },
    });

    this.spawnEnemiesForMode();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.syncBodyState();
    this.emitHud(true);

    this.lastTime = performance.now();
    this.loop();
  }

  private setupLighting(): void {
    const mapDef = MAP_DEFINITIONS[this.currentMapId];
    const hemi = new THREE.HemisphereLight(mapDef.ambientSky, mapDef.ambientGround, 1.15);
    hemi.position.set(0, 50, 0);
    this.scene.add(hemi);
    this.hemiLight = hemi;

    const sun = new THREE.DirectionalLight(mapDef.sunColor, 2.2);
    sun.position.set(52, 82, 40);
    if (!this.isSoftwareGl) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.near = 5;
      sun.shadow.camera.far = 230;
      const d = 80;
      sun.shadow.camera.left = -d;
      sun.shadow.camera.right = d;
      sun.shadow.camera.top = d;
      sun.shadow.camera.bottom = -d;
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 0.02;
    }
    this.scene.add(sun);
    this.sunLight = sun;

    const rim = new THREE.DirectionalLight(0x93c5fd, 0.58);
    rim.position.set(-48, 30, -48);
    this.scene.add(rim);
  }

  private buildArenaEnvironment(): void {
    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(330, 32, 20),
      new THREE.MeshBasicMaterial({
        map: this.materials.skyDomeTex,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      })
    );
    this.scene.add(skyDome);

    this.outerTerrainMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(ARENA_RADIUS + 44, ARENA_RADIUS + 54, 4, 64),
      this.materials.ground
    );
    this.outerTerrainMesh.position.y = -2.04;
    this.outerTerrainMesh.receiveShadow = !this.isSoftwareGl;
    this.scene.add(this.outerTerrainMesh);

    const groundGeo = new THREE.CylinderGeometry(ARENA_RADIUS + 2.5, ARENA_RADIUS + 8, 4, 64);
    this.groundMesh = new THREE.Mesh(groundGeo, this.materials.ground);
    this.groundMesh.position.y = -2;
    this.groundMesh.receiveShadow = !this.isSoftwareGl;
    this.scene.add(this.groundMesh);

    this.mapGroup = new THREE.Group();
    this.scene.add(this.mapGroup);
    this.applyArenaMap(this.currentMapId, false);
  }

  private applyArenaMap(mapId: MapId, announce = true): void {
    this.currentMapId = mapId;
    const mapDef = MAP_DEFINITIONS[mapId];
    this.currentArenaRadius = mapDef.worldRadius;

    // Clear placed blocks & transient map group geometry
    this.clearPlacedBlocks();
    if (this.mapGroup) {
      while (this.mapGroup.children.length > 0) {
        const child = this.mapGroup.children.pop()!;
        this.mapGroup.remove(child);
        child.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
        });
      }
    }
    this.envMeshes = [];
    this.crystalMeshes = [];

    // Update sky dome, fog, lighting, and ground material
    const skyCanvas = this.materials.skyDomeTex.image as HTMLCanvasElement | undefined;
    if (skyCanvas && typeof skyCanvas.getContext === 'function') {
      paintSkyDomeCanvas(skyCanvas, mapDef.skyTop, mapDef.skyMid, mapDef.skyHorizon, mapDef.skyBottom);
      this.materials.skyDomeTex.needsUpdate = true;
    }
    this.scene.background = new THREE.Color(mapDef.fogColor);
    this.scene.fog = new THREE.FogExp2(mapDef.fogColor, 0.0020);
    if (this.hemiLight) {
      this.hemiLight.color.setHex(mapDef.ambientSky);
      this.hemiLight.groundColor.setHex(mapDef.ambientGround);
    }
    if (this.sunLight) {
      this.sunLight.color.setHex(mapDef.sunColor);
    }

    const groundMat = this.materials.ground;
    if (mapId === 'container_yard' || mapId === 'sky_dock') {
      groundMat.map = this.materials.asphaltGroundTex;
      groundMat.color.setHex(mapId === 'sky_dock' ? 0xcbd5e1 : 0xffffff);
    } else if (mapId === 'nether_foundry') {
      groundMat.map = this.materials.asphaltGroundTex;
      groundMat.color.setHex(0x64545c);
    } else {
      groundMat.map = this.materials.grassGroundTex;
      groundMat.color.setHex(0xffffff);
    }
    groundMat.needsUpdate = true;

    this.blocks = getArenaBlocksForMap(mapId);
    this.staticBlockCount = this.blocks.length;

    const ringGeo = new THREE.RingGeometry(13.85, 14.25, 64);
    const ringMat = new THREE.MeshPhysicalMaterial({
      color: mapId === 'container_yard' ? 0xf59e0b : mapId === 'nether_foundry' ? 0xef4444 : 0x38bdf8,
      emissive: mapId === 'nether_foundry' ? 0xb91c1c : 0xb45309,
      emissiveIntensity: 0.35,
      roughness: 0.22,
      metalness: 0.85,
      clearcoat: 0.8,
      side: THREE.DoubleSide,
    });
    const centerRing = new THREE.Mesh(ringGeo, ringMat);
    centerRing.rotation.x = -Math.PI / 2;
    centerRing.position.y = 0.025;
    this.mapGroup.add(centerRing);

    const outerRingGeo = new THREE.RingGeometry(53.6, 54.4, 96);
    const outerRingMat = new THREE.MeshPhysicalMaterial({
      color: mapId === 'container_yard' ? 0x2563eb : mapId === 'nether_foundry' ? 0xf97316 : 0xa855f7,
      emissive: mapId === 'container_yard' ? 0x1d4ed8 : 0x7e22ce,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.78,
      clearcoat: 0.7,
      side: THREE.DoubleSide,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 0.02;
    this.mapGroup.add(outerRing);

    // Sculpted beveled architectural blocks & caps
    for (const b of this.blocks) {
      const bevelR = Math.min(0.14, Math.min(b.w, b.h, b.d) * 0.14);
      const geo = new RoundedBoxGeometry(b.w, b.h, b.d, 2, bevelR);
      const mat = this.materials[b.kind] ?? this.materials.stone;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(b.x, b.y + b.h * 0.5, b.z);
      mesh.castShadow = !this.isSoftwareGl;
      mesh.receiveShadow = !this.isSoftwareGl;
      this.mapGroup.add(mesh);
      this.envMeshes.push(mesh);

      if (b.h >= 3.0 && b.y <= 0.1 && !b.kind.startsWith('container_')) {
        const cap = new THREE.Mesh(
          new RoundedBoxGeometry(b.w + 0.28, 0.32, b.d + 0.28, 2, 0.07),
          b.kind === 'obsidian' ? this.materials.gold : this.materials.deepslate
        );
        cap.position.set(b.x, b.y + b.h - 0.1, b.z);
        cap.castShadow = !this.isSoftwareGl;
        cap.receiveShadow = !this.isSoftwareGl;
        this.mapGroup.add(cap);
      }
    }

    // Map-specific crystals & orbital beacons
    const crystalCoords =
      mapId === 'container_yard'
        ? [
            new THREE.Vector3(-25, 11.4, 0),
            new THREE.Vector3(25, 11.4, 0),
            new THREE.Vector3(0, 7.6, -24),
            new THREE.Vector3(0, 7.6, 24),
          ]
        : mapId === 'sky_dock'
          ? [
              new THREE.Vector3(-24, 12.8, 0),
              new THREE.Vector3(24, 12.8, 0),
              new THREE.Vector3(0, 9.6, -28),
              new THREE.Vector3(0, 9.6, 28),
            ]
          : mapId === 'nether_foundry'
            ? [
                new THREE.Vector3(-24, 11.6, -22),
                new THREE.Vector3(24, 11.6, -22),
                new THREE.Vector3(-24, 11.6, 22),
                new THREE.Vector3(24, 11.6, 22),
              ]
            : [
                new THREE.Vector3(-18, 9.0, -16),
                new THREE.Vector3(18, 9.0, -16),
                new THREE.Vector3(-18, 8.0, 18),
                new THREE.Vector3(18, 8.0, 18),
                new THREE.Vector3(0, 15.0, -72),
                new THREE.Vector3(0, 14.5, 72),
              ];

    const crystalColor =
      mapId === 'container_yard' ? 0x38bdf8 : mapId === 'nether_foundry' ? 0xf97316 : 0xd8b4fe;
    const crystalEmissive =
      mapId === 'container_yard' ? 0x0284c7 : mapId === 'nether_foundry' ? 0xdc2626 : 0x9333ea;
    const crystalGeo = new THREE.IcosahedronGeometry(0.76, 1);
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: crystalColor,
      emissive: crystalEmissive,
      emissiveIntensity: 0.78,
      roughness: 0.08,
      metalness: 0.25,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
    });
    const crystalHaloGeo = new THREE.TorusGeometry(1.05, 0.045, 10, 28);
    for (const coord of crystalCoords) {
      const cMesh = new THREE.Mesh(crystalGeo, crystalMat);
      cMesh.position.copy(coord);
      const halo = new THREE.Mesh(crystalHaloGeo, ringMat);
      halo.rotation.x = Math.PI / 2;
      cMesh.add(halo);
      this.mapGroup.add(cMesh);
      this.crystalMeshes.push(cMesh);
    }

    const dummy = new THREE.Object3D();

    // Foothills or Industrial Yard Perimeter Structures
    if (mapId === 'emerald_citadel') {
      const hillGeo = new THREE.IcosahedronGeometry(1.0, 2);
      const hillCount = 68;
      const hills = new THREE.InstancedMesh(hillGeo, this.materials.cliff, hillCount);
      hills.receiveShadow = !this.isSoftwareGl;
      const hillPalette = [0x4c7c3e, 0x5c8b47, 0x3f6a34, 0x67795c];
      for (let i = 0; i < hillCount; i++) {
        const angle = (i / hillCount) * Math.PI * 2 + (i % 3) * 0.04;
        const dist = ARENA_RADIUS + 6.5 + (i % 4) * 5.2;
        const rx = 7.5 + (i % 3) * 3.2;
        const ry = 8.5 + ((i * 7) % 10) * 1.85;
        const rz = 6.5 + ((i + 1) % 3) * 2.8;
        dummy.position.set(Math.cos(angle) * dist, ry * 0.28 - 2.5, Math.sin(angle) * dist);
        dummy.rotation.set(0.12 * ((i % 3) - 1), angle + i * 0.4, 0.08 * ((i % 2) - 0.5));
        dummy.scale.set(rx, ry, rz);
        dummy.updateMatrix();
        hills.setMatrixAt(i, dummy.matrix);
        hills.setColorAt(i, _color.setHex(hillPalette[i % hillPalette.length]));
      }
      hills.instanceMatrix.needsUpdate = true;
      if (hills.instanceColor) hills.instanceColor.needsUpdate = true;
      hills.computeBoundingSphere();
      this.mapGroup.add(hills);

      const treeCount = 24;
      const trunkGeo = new THREE.CylinderGeometry(0.32, 0.52, 4.6, 12);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9, metalness: 0.02 });
      const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
      const canopyGeo = new THREE.SphereGeometry(2.6, 14, 10);
      const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.84, metalness: 0.02 });
      const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount * 2);
      const leafColors = [0x3b8c32, 0x4ba13f, 0x2f7529, 0x5cb349];
      for (let i = 0; i < treeCount; i++) {
        const a = (i / treeCount) * Math.PI * 2 + 0.11;
        const r = 82 + ((i * 19) % 24);
        const tx = Math.cos(a) * r;
        const tz = Math.sin(a) * r;
        const sc = 0.85 + ((i * 13) % 7) * 0.12;
        dummy.position.set(tx, 2.1 * sc, tz);
        dummy.rotation.set(0, a, 0);
        dummy.scale.set(sc, sc, sc);
        dummy.updateMatrix();
        trunks.setMatrixAt(i, dummy.matrix);

        dummy.position.set(tx, 5.1 * sc, tz);
        dummy.scale.set(1.05 * sc, 0.88 * sc, 1.05 * sc);
        dummy.updateMatrix();
        canopies.setMatrixAt(i * 2, dummy.matrix);
        canopies.setColorAt(i * 2, _color.setHex(leafColors[i % leafColors.length]));

        dummy.position.set(tx + Math.cos(a) * 0.9 * sc, 6.2 * sc, tz + Math.sin(a) * 0.9 * sc);
        dummy.scale.set(0.76 * sc, 0.72 * sc, 0.76 * sc);
        dummy.updateMatrix();
        canopies.setMatrixAt(i * 2 + 1, dummy.matrix);
        canopies.setColorAt(i * 2 + 1, _color.setHex(leafColors[(i + 1) % leafColors.length]));
      }
      trunks.instanceMatrix.needsUpdate = true;
      canopies.instanceMatrix.needsUpdate = true;
      if (canopies.instanceColor) canopies.instanceColor.needsUpdate = true;
      this.mapGroup.add(trunks, canopies);
    } else if (mapId === 'container_yard') {
      // Industrial Cargo Yard floodlight masts & caution bollards
      const mastGeo = new THREE.CylinderGeometry(0.28, 0.42, 16, 10);
      const lampGeo = new THREE.BoxGeometry(2.6, 0.6, 0.9);
      const lampMat = new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.9,
        roughness: 0.25,
      });
      for (const [mx, mz] of [
        [-42, -42],
        [42, -42],
        [-42, 42],
        [42, 42],
      ]) {
        const mast = new THREE.Mesh(mastGeo, this.materials.deepslate);
        mast.position.set(mx, 8, mz);
        const lamp = new THREE.Mesh(lampGeo, lampMat);
        lamp.position.set(mx, 16.2, mz);
        lamp.lookAt(0, 0, 0);
        this.mapGroup.add(mast, lamp);
      }
    }

    // Volumetric Clouds
    const puffGeo = new THREE.SphereGeometry(3.4, 12, 9);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: mapId === 'nether_foundry' ? 0xfdba74 : 0xffffff,
      roughness: 0.96,
      metalness: 0.0,
      transparent: true,
      opacity: mapId === 'nether_foundry' ? 0.45 : 0.88,
    });
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + (i % 3) * 0.14;
      const r = 46 + ((i * 29) % 88);
      const cloudGroup = new THREE.Group();
      const puffs = [
        { x: 0, y: 0.4, z: 0, sx: 1.4, sy: 0.7, sz: 1.0 },
        { x: -2.6, y: 0, z: 0.4, sx: 1.0, sy: 0.58, sz: 0.85 },
        { x: 2.7, y: 0.1, z: -0.3, sx: 1.05, sy: 0.6, sz: 0.85 },
      ];
      for (const pf of puffs) {
        const m = new THREE.Mesh(puffGeo, cloudMat);
        m.position.set(pf.x, pf.y, pf.z);
        m.scale.set(pf.sx, pf.sy, pf.sz);
        cloudGroup.add(m);
      }
      cloudGroup.position.set(Math.cos(angle) * r, 48 + (i % 4) * 4.5, Math.sin(angle) * r);
      cloudGroup.scale.setScalar(0.95 + (i % 3) * 0.25);
      cloudGroup.rotation.y = angle;
      this.mapGroup.add(cloudGroup);
    }

    // Snap player & AI safely onto new map surfaces if already in-match
    if (this.screen === 'playing') {
      const supY = getSupportHeightAt(this.playerPos.x, this.playerPos.z, 25, PLAYER_RADIUS, this.blocks);
      this.playerPos.y = Math.max(this.playerPos.y, supY);
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const eSup = getSupportHeightAt(e.pos.x, e.pos.z, 25, PLAYER_RADIUS, this.blocks);
        e.pos.y = Math.max(e.pos.y, eSup);
      }
    }

    if (announce) {
      this.pushCallout(`맵 변경 · ${mapDef.name} (${mapDef.englishName})`, mapDef.accentHex);
    }
  }

  private _unusedMapTailMarker = true;

  private initPools(): void {
    const slashGeo = new THREE.RingGeometry(1.1, 2.25, 28, 1, -Math.PI * 0.42, Math.PI * 0.84);
    const slashMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.slashMesh = new THREE.Mesh(slashGeo, slashMat);
    this.slashMesh.rotation.x = -Math.PI / 2;
    this.slashMesh.visible = false;
    this.scene.add(this.slashMesh);

    const maxParticles = 180;
    const pGeo = new THREE.IcosahedronGeometry(0.14, 1);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, maxParticles);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.frustumCulled = false;

    for (let i = 0; i < maxParticles; i++) {
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.5,
        size: 1,
        color: new THREE.Color(0xffffff),
      });
      _mat4.makeScale(0, 0, 0);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, _color.setHex(0xffffff));
    }
    this.scene.add(this.particleMesh);

    const ringGeo = new THREE.RingGeometry(0.7, 1.0, 32);
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      this.scene.add(mesh);
      this.shockwaves.push({ active: false, life: 0, maxLife: 0.4, maxRadius: 5, mesh });
    }

    const projGeo = new THREE.OctahedronGeometry(0.28, 1);
    for (let i = 0; i < 24; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.9,
        roughness: 0.2,
      });
      const mesh = new THREE.Mesh(projGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      const arrowGroup = createArrowProjectileMesh(0x38bdf8);
      arrowGroup.visible = false;
      this.scene.add(arrowGroup);
      this.projectiles.push({
        active: false,
        kind: 'wind_charge',
        ownerId: 'player',
        ownerTeam: 'ffa',
        damage: 0,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        mesh,
        arrowGroup,
      });
    }

    // 8 pooled TNT ticking blocks
    for (let i = 0; i < 8; i++) {
      const mesh = createTntBlockMesh();
      mesh.visible = false;
      this.scene.add(mesh);
      this.tntFuses.push({
        active: false,
        ownerId: 'player',
        ownerTeam: 'ffa',
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        fuse: 0,
        grounded: false,
        mesh,
      });
    }

    // 10 pooled 3D Voxel Cobwebs
    for (let i = 0; i < 10; i++) {
      const webMesh = createCobwebMesh();
      webMesh.visible = false;
      this.scene.add(webMesh);
      this.cobwebs.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        radius: 1.45,
        height: 2.2,
        life: 0,
        ownerGrace: 0,
        hp: 3,
        breakProgress: 0,
        mesh: webMesh,
      });
    }

    // 10 pooled Lava & Water pools
    for (let i = 0; i < 10; i++) {
      const kind = i % 2 === 0 ? 'lava' : 'water';
      const mesh = createHazardPoolMesh(kind, 2.1, this.materials.lavaTex);
      mesh.visible = false;
      this.scene.add(mesh);
      this.hazardPools.push({
        active: false,
        id: `pool-${i}`,
        kind,
        x: 0,
        y: 0,
        z: 0,
        radius: 2.1,
        life: 0,
        ownerId: 'player',
        ownerGrace: 0,
        mesh,
      });
    }
  }

  private getCurrentLoadout() {
    return CHARACTERS[this.selectedCharId].loadout;
  }

  private initSlotChargesFromProfile(): void {
    const loadout = this.getCurrentLoadout();
    for (let i = 0; i < 6; i++) {
      const maxC = loadout[i].maxCharges ?? 1;
      const startC = loadout[i].startCharges ?? maxC;
      this.slotMaxCharges[i] = maxC;
      this.slotCharges[i] = startC;
      this.slotCooldowns[i] = 0;
      this.slotUseDelays[i] = 0;
    }
  }

  private rebuildPlayerRig(): void {
    if (this.playerRig) {
      this.scene.remove(this.playerRig.root);
    }
    if (this.fpRig) {
      this.camera.remove(this.fpRig.root);
    }
    const profile = CHARACTERS[this.selectedCharId];
    this.playerRig = createFighterModel(profile, this.materials.shadowDisc, !this.isSoftwareGl);
    const activeItemId = profile.loadout[this.activeSlot]?.id ?? profile.loadout[0].id;
    this.playerRig.setActiveWeapon(activeItemId);
    this.playerRig.root.position.copy(this.playerPos);
    this.scene.add(this.playerRig.root);

    this.fpRig = createFirstPersonRig(profile);
    this.fpRig.setActiveWeapon(activeItemId);
    this.fpRig.root.visible = this.screen === 'playing' && this.cameraMode === 'firstperson';
    this.camera.add(this.fpRig.root);

    this.playerMaxHp = profile.maxHp;
    this.playerHp = profile.maxHp;
  }

  private loadSettings(): GameSettings {
    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_GAME_SETTINGS };
      const parsed = JSON.parse(raw) as Partial<GameSettings>;
      return {
        ...DEFAULT_GAME_SETTINGS,
        ...parsed,
        fov: Math.max(60, Math.min(100, Number(parsed.fov ?? DEFAULT_GAME_SETTINGS.fov))),
        sensitivity: Math.max(0.4, Math.min(2.5, Number(parsed.sensitivity ?? DEFAULT_GAME_SETTINGS.sensitivity))),
        masterVolume: Math.max(0, Math.min(100, Number(parsed.masterVolume ?? DEFAULT_GAME_SETTINGS.masterVolume))),
      };
    } catch {
      return { ...DEFAULT_GAME_SETTINGS };
    }
  }

  private saveSettings(): void {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // ignore storage quota errors
    }
  }

  public getSettings(): GameSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();
    if (partial.cameraMode !== undefined) {
      this.cameraMode = this.settings.cameraMode;
      this.syncCameraVisibility();
    }
    if (partial.fov !== undefined) {
      this.fovCurrent = this.settings.fov;
      this.camera.fov = this.settings.fov;
      this.camera.updateProjectionMatrix();
    }
    if (partial.muted !== undefined) {
      this.audio.setMuted(this.settings.muted);
    }
    if (partial.masterVolume !== undefined) {
      this.audio.setMasterVolume(this.settings.masterVolume / 100);
    }
    if (partial.graphicsQuality !== undefined) {
      this.applyGraphicsQuality();
    }
    this.emitHud(true);
  }

  public resetSettings(): void {
    this.updateSettings({ ...DEFAULT_GAME_SETTINGS });
  }

  private applyGraphicsQuality(): void {
    if (!this.renderer) return;
    const q = this.settings.graphicsQuality;
    const dpr = this.isSoftwareGl || q === 'low' ? 1 : q === 'medium' ? Math.min(window.devicePixelRatio || 1, 1.35) : Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && q !== 'low';
  }

  public getLocalPlayerTeam(): PlayerTeam {
    if (this.mode !== 'multiplayer' || this.mpState.roomMode !== 'team') return 'ffa';
    const selfPeer = this.mpState.peers.find((p) => p.id === this.mpState.selfId);
    if (selfPeer && (selfPeer.team === 'red' || selfPeer.team === 'blue')) return selfPeer.team;
    return 'red';
  }

  public voteMap(mapId: MapId): void {
    if (this.mpState.roomCode) {
      this.net.voteMap(mapId);
    } else {
      this.applyArenaMap(mapId, false);
      this.emitHud(true);
    }
  }

  public toggleMobileSprint(): void {
    this.mobileSprintLocked = !this.mobileSprintLocked;
    this.pushCallout(this.mobileSprintLocked ? '모바일 자동 질주 ON' : '모바일 질주 OFF', '#38bdf8');
    this.emitHud(true);
  }

  public mobileElytra(): void {
    if (this.screen !== 'playing') return;
    this.triggerElytraBoost();
  }

  public setCharacter(id: CharacterId): void {
    this.selectedCharId = id;
    this.activeSlot = 0;
    this.rebuildPlayerRig();
    this.initSlotChargesFromProfile();
    this.net.updateLobby({ characterId: id });
    this.emitHud(true);
  }

  private isNetworkedMode(): boolean {
    return (
      (this.mode === 'online_world' || this.mode === 'multiplayer' || this.mode === 'link_duel') &&
      Boolean(this.mpState.roomCode)
    );
  }

  public setOnMatchEnd(
    cb: (res: { mode: GameModeId; won: boolean | null; kills: number; deaths: number }) => void
  ): void {
    this.onMatchEnd = cb;
  }

  public setPlayerName(name: string): void {
    const clean = name.trim().slice(0, 16) || 'Player';
    this.mpState = { ...this.mpState, playerName: clean };
    this.net.updateLobby({ name: clean });
    this.emitHud(true);
  }

  public setMode(mode: GameModeId): void {
    this.mode = mode;
    this.emitHud(true);
  }

  public joinGlobalWorld(name: string): void {
    this.mode = 'online_world';
    this.net.joinGlobal(name || this.mpState.playerName, this.selectedCharId);
  }

  public createLinkDuelRoom(name: string): void {
    this.mode = 'link_duel';
    this.net.createLinkDuel(name || this.mpState.playerName, this.selectedCharId);
  }

  public joinLinkDuelRoom(code: string, name: string): void {
    this.mode = 'link_duel';
    this.net.joinLinkDuel(code, name || this.mpState.playerName, this.selectedCharId);
  }

  public queueLinkDuel(name: string): void {
    this.mode = 'link_duel';
    this.net.queueLinkDuel(name || this.mpState.playerName, this.selectedCharId);
  }

  public cancelLinkQueue(): void {
    this.net.cancelLinkQueue();
  }

  public sendChatMessage(text: string): void {
    const clean = text.trim().slice(0, 160);
    if (!clean) return;
    if (this.mpState.roomCode) {
      this.net.sendChat(clean);
    } else {
      this.chatMessages = [
        ...this.chatMessages,
        {
          id: `local-${Date.now()}-${Math.random()}`,
          senderId: 'local',
          senderName: this.mpState.playerName || 'Player',
          text: clean,
          team: this.getLocalPlayerTeam(),
        },
      ].slice(-40);
      this.emitHud(true);
    }
  }

  public resetNetworkConnection(): void {
    this.net.resetConnection();
  }

  public createMultiplayerRoom(name: string, includeBots: boolean, roomMode: 'ffa' | 'team', team: 'red' | 'blue' | 'ffa'): void {
    this.mode = 'multiplayer';
    this.net.createRoom(name, this.selectedCharId, includeBots, roomMode, team);
  }

  public joinMultiplayerRoom(code: string, name: string, team: 'red' | 'blue' | 'ffa'): void {
    this.mode = 'multiplayer';
    this.net.joinRoom(code, name, this.selectedCharId, team);
  }

  public updateMultiplayerLobby(updates: {
    name?: string;
    includeBots?: boolean;
    team?: 'red' | 'blue' | 'ffa';
    roomMode?: 'ffa' | 'team';
    targetKills?: number;
    selectedMap?: MapId;
  }): void {
    this.net.updateLobby(updates);
  }

  public startMultiplayerMatch(): void {
    this.net.startMatch();
  }

  public leaveMultiplayerRoom(): void {
    if (this.mode === 'online_world' && this.screen !== 'title' && (this.kills > 0 || this.deaths > 0)) {
      this.onMatchEnd?.({
        mode: 'online_world',
        won: null,
        kills: this.kills,
        deaths: this.deaths,
      });
    }
    this.net.leaveRoom();
    if (this.screen !== 'title') {
      this.returnToTitle();
    } else {
      this.emitHud(true);
    }
  }

  public selectSlot(index: number): void {
    const loadout = this.getCurrentLoadout();
    if (index < 0 || index >= loadout.length) return;
    this.activeSlot = index;
    const itemId = loadout[index].id;
    this.playerRig.setActiveWeapon(itemId);
    this.fpRig.setActiveWeapon(itemId);
    this.emitHud(true);
  }

  public toggleMute(): void {
    const nextMuted = !this.audio.isMuted();
    this.audio.setMuted(nextMuted);
    this.settings = { ...this.settings, muted: nextMuted };
    this.saveSettings();
    this.emitHud(true);
  }

  public cycleCameraMode(): void {
    const order: CameraViewMode[] = ['firstperson', 'shiftlock', 'free'];
    const idx = order.indexOf(this.cameraMode);
    this.cameraMode = order[(idx + 1) % order.length];
    this.settings = { ...this.settings, cameraMode: this.cameraMode };
    this.saveSettings();
    this.lastMouseX = null;
    this.lastMouseY = null;

    if (this.cameraMode === 'free' && this.pointerLocked) {
      document.exitPointerLock?.();
    }

    const label =
      this.cameraMode === 'shiftlock'
        ? '3인칭 오른쪽 시프트락'
        : this.cameraMode === 'firstperson'
          ? '1인칭 시점 (FOV 고정)'
          : '자유 3인칭 시점';
    const accent =
      this.cameraMode === 'shiftlock'
        ? '#38bdf8'
        : this.cameraMode === 'firstperson'
          ? '#fbbf24'
          : '#94a3b8';
    this.pushCallout(label, accent);
    this.syncCameraVisibility();
    this.emitHud(true);
  }

  private syncCameraVisibility(): void {
    const isFp = this.screen === 'playing' && this.cameraMode === 'firstperson';
    this.playerRig.root.visible = !isFp && this.localRespawnTimer <= 0;
    this.fpRig.root.visible = isFp && this.localRespawnTimer <= 0;
  }

  public startGame(): void {
    if (this.mode === 'online_world') {
      if (this.mpState.roomCode === 'GLOBAL' && this.screen !== 'title') {
        this.startGameInternal();
        return;
      }
      this.net.joinGlobal(this.mpState.playerName, this.selectedCharId);
      return;
    }

    if (this.mode === 'link_duel') {
      if (this.mpState.roomCode && this.mpState.roomKind === 'link_duel') {
        if (this.mpState.isHost) {
          this.net.startMatch();
        }
      } else {
        // Solo Ranked AI Challenger fallback when launching without a remote opponent
        this.startGameInternal();
      }
      return;
    }

    if (this.mode === 'multiplayer') {
      if (this.mpState.roomCode) {
        if (this.mpState.isHost) {
          this.net.startMatch();
        }
      } else {
        this.mpState = {
          ...this.mpState,
          error: '먼저 비공개 방을 만들거나 방 코드로 참가하세요.',
        };
        this.emitHud(true);
      }
      return;
    }
    this.startGameInternal();
  }

  private startGameInternal(): void {
    this.resetMatch();
    this.screen = 'playing';
    this.syncCameraVisibility();
    this.syncBodyState();
    this.requestCanvasPointerLock();
    this.emitHud(true);
  }

  public pauseGame(): void {
    if (this.screen !== 'playing') return;
    this.screen = 'paused';
    this.keys.clear();
    this.mouseDownLeft = false;
    this.mouseDownRight = false;
    this.edgeTurnDir = 0;
    this.edgePitchDir = 0;
    document.exitPointerLock?.();
    this.syncCameraVisibility();
    this.syncBodyState();
    this.emitHud(true);
  }

  public resumeGame(): void {
    if (this.screen !== 'paused') return;
    this.screen = 'playing';
    this.syncCameraVisibility();
    this.syncBodyState();
    this.requestCanvasPointerLock();
    this.emitHud(true);
  }

  public returnToTitle(): void {
    document.exitPointerLock?.();
    this.resetMatch();
    this.screen = 'title';
    this.syncCameraVisibility();
    this.syncBodyState();
    this.emitHud(true);
  }

  private clearPlacedBlocks(): void {
    for (const entry of this.placedBlocks) {
      this.scene.remove(entry.mesh);
      entry.mesh.geometry.dispose();
      const envIdx = this.envMeshes.indexOf(entry.mesh);
      if (envIdx >= 0) this.envMeshes.splice(envIdx, 1);
    }
    this.placedBlocks = [];
    this.blocks.length = this.staticBlockCount;
  }

  private resetMatch(): void {
    const profile = CHARACTERS[this.selectedCharId];
    const team = this.getLocalPlayerTeam();
    const spawnZ = this.mode === 'multiplayer' && this.mpState.roomMode === 'team' ? (team === 'blue' ? -18 : 18) : 10;
    const spawnYaw = this.mode === 'multiplayer' && this.mpState.roomMode === 'team' && team === 'blue' ? Math.PI : 0;

    this.applyArenaMap(this.currentMapId, false);
    this.offlineMapTimer = 0;

    this.playerPos.set(0, 0, spawnZ);
    this.playerVel.set(0, 0, 0);
    this.playerYaw = spawnYaw;
    this.playerPitch = -0.14;
    this.targetYaw = spawnYaw;
    this.targetPitch = -0.14;
    this.playerOnGround = true;
    this.playerFallStartY = 0;
    this.playerMaxHp = profile.maxHp;
    this.playerHp = profile.maxHp;
    this.playerAbsorption = 0;
    this.playerStamina = 100;
    this.activeSlot = 0;
    this.initSlotChargesFromProfile();
    this.elytraCooldown = 0;
    this.isGliding = false;
    this.glideSpeed = 18;
    this.fireworkBoostTimer = 0;
    this.fireworkCooldown = 0;
    this.elytraHealAccum = 0;
    this.elytraHealSyncTimer = 0;
    this.elytraHealParticleTimer = 0;
    this.isBlocking = false;
    this.stealthTimer = 0;
    this.playerInCobweb = false;
    this.cobwebBreakProgress = 0;
    this.cobwebHoldSoundTimer = 0;
    this.playerInLava = false;
    this.wasInLava = false;
    this.playerInWater = false;
    this.playerBurnTimer = 0;
    this.playerBurnTickTimer = 0;
    this.mobileAttackHeld = false;
    this.mobileSprintLocked = false;
    this.localRespawnTimer = 0;
    this.cameraMode = this.settings.cameraMode;
    this.fovCurrent = this.settings.fov;
    this.swingTimer = 0;
    this.slashTimer = 0;
    this.slashMesh.visible = false;
    this.hitFlashTimer = 0;
    this.squashY = 1;
    this.attackBuffer = 0;
    this.kills = 0;
    this.deaths = 0;
    this.wave = 1;
    this.comboStreak = 0;
    this.maxSmashHeight = 0;
    this.damageDealt = 0;
    this.elapsedTime = 0;
    this.outcome = null;
    this.defeatDelayTimer = 0;
    this.calloutText = '';
    this.calloutTimer = 0;
    this.hitmarkerTimer = 0;
    this.lastHitText = '';
    this.killFeed = [];

    this.clearPlacedBlocks();

    this.playerRig.setOpacity(1);
    this.playerRig.setActiveWeapon(profile.loadout[0].id);
    this.fpRig.setActiveWeapon(profile.loadout[0].id);
    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.root.rotation.set(0, this.playerYaw + Math.PI, 0);
    this.camPos.set(0, 1.58, spawnZ);
    this.camLook.set(0, 1.3, 0);

    for (const p of this.projectiles) {
      p.active = false;
      p.mesh.visible = false;
      p.arrowGroup.visible = false;
    }
    for (const t of this.tntFuses) {
      t.active = false;
      t.mesh.visible = false;
    }
    for (const w of this.cobwebs) {
      w.active = false;
      w.mesh.visible = false;
    }
    for (const h of this.hazardPools) {
      h.active = false;
      h.mesh.visible = false;
    }

    this.spawnEnemiesForMode();
    this.syncRemotePeers();
  }

  private clearEnemies(): void {
    for (const e of this.enemies) {
      this.scene.remove(e.rig.root);
    }
    this.enemies = [];
  }

  private policyForCharacter(prof: CharacterProfile, fallbackIdx: number): AiPolicy {
    if (prof.archetype === 'ranged_sniper' || prof.archetype === 'ranged_skirmisher') {
      return 'ranged_kite';
    }
    if (prof.archetype === 'mace_diver') return 'wind_diver';
    if (prof.archetype === 'trickster' || prof.archetype === 'assassin') return 'pearl_flanker';
    if (prof.archetype === 'heavy_tank' || prof.archetype === 'brawler') return 'bruiser_charger';
    const fallbacks: AiPolicy[] = ['sword_duelist', 'wind_diver', 'pearl_flanker', 'ranged_kite'];
    return fallbacks[fallbackIdx % fallbacks.length];
  }

  private spawnEnemiesForMode(): void {
    this.clearEnemies();
    if (this.mode === 'multiplayer' && !this.mpState.includeBots) {
      return;
    }

    const rivals = CHARACTER_LIST.filter((c) => c.id !== this.selectedCharId);

    if (this.mode === 'multiplayer' && this.mpState.includeBots) {
      if (this.mpState.roomMode === 'team') {
        const redCount = this.mpState.peers.filter((p) => p.team === 'red').length;
        const blueCount = this.mpState.peers.filter((p) => p.team === 'blue').length;
        const redNeed = Math.max(0, 3 - redCount);
        const blueNeed = Math.max(1, 3 - blueCount);
        let idx = 0;
        for (let i = 0; i < redNeed; i++) {
          const prof = rivals[idx % rivals.length];
          this.enemies.push(
            this.createEnemy(
              prof,
              this.policyForCharacter(prof, idx),
              new THREE.Vector3(-10 + i * 10, 0, 18),
              `mp-bot-r-${i}`,
              false,
              'red'
            )
          );
          idx++;
        }
        for (let i = 0; i < blueNeed; i++) {
          const prof = rivals[idx % rivals.length];
          this.enemies.push(
            this.createEnemy(
              prof,
              this.policyForCharacter(prof, idx),
              new THREE.Vector3(-10 + i * 10, 0, -18),
              `mp-bot-b-${i}`,
              false,
              'blue'
            )
          );
          idx++;
        }
      } else {
        for (let i = 0; i < 3; i++) {
          const prof = rivals[i % rivals.length];
          this.enemies.push(
            this.createEnemy(
              prof,
              this.policyForCharacter(prof, i),
              new THREE.Vector3(i === 0 ? -14 : i === 1 ? 14 : 0, 0, -16),
              `mp-bot-${i}`,
              false,
              'ffa'
            )
          );
        }
      }
      return;
    }

    if (this.mode === 'link_duel') {
      if (this.mpState.roomCode && this.mpState.roomKind === 'link_duel') {
        return;
      }
      const rival = rivals[0];
      this.enemies.push(
        this.createEnemy(rival, this.policyForCharacter(rival, 0), new THREE.Vector3(0, 0, -24), 'rival-1')
      );
      return;
    }

    const spawns =
      this.mode === 'online_world'
        ? [
            new THREE.Vector3(-42, 0, -48),
            new THREE.Vector3(42, 0, -48),
            new THREE.Vector3(0, 0, -64),
            new THREE.Vector3(64, 0, 0),
            new THREE.Vector3(-64, 0, 0),
            new THREE.Vector3(0, 0, 56),
          ]
        : [
            new THREE.Vector3(-20, 0, -18),
            new THREE.Vector3(20, 0, -18),
            new THREE.Vector3(-24, 0, 20),
            new THREE.Vector3(24, 0, 20),
            new THREE.Vector3(0, 0, -34),
            new THREE.Vector3(34, 0, 0),
          ];

    // Ensure at least one ranged character (Kestrel/Vexor) spawns in FFA/Open World
    const rangedChars = rivals.filter((c) => c.id === 'kestrel' || c.id === 'vexor');
    for (let i = 0; i < spawns.length; i++) {
      const prof = i === spawns.length - 1 && rangedChars.length > 0 ? rangedChars[0] : rivals[i % rivals.length];
      this.enemies.push(
        this.createEnemy(prof, this.policyForCharacter(prof, i), spawns[i], `world-${i}`, false, 'ffa')
      );
    }
  }

  private syncRemotePeers(): void {
    const activeIds = new Set<string>();
    for (const p of this.mpState.peers) {
      if (p.id === this.mpState.selfId) continue;
      activeIds.add(p.id);

      const barColor =
        this.mpState.roomMode === 'team'
          ? p.team === 'red'
            ? '#ef4444'
            : p.team === 'blue'
              ? '#3b82f6'
              : CHARACTERS[p.characterId]?.trimColor ?? '#94a3b8'
          : CHARACTERS[p.characterId]?.trimColor ?? '#94a3b8';

      const existing = this.remotePeers.get(p.id);
      if (!existing || existing.characterId !== p.characterId || existing.team !== p.team) {
        if (existing) {
          this.scene.remove(existing.rig.root);
        }
        const prof = CHARACTERS[p.characterId] ?? CHARACTERS.flamefrags;
        const rig = createFighterModel(prof, this.materials.shadowDisc, !this.isSoftwareGl);
        const overhead = createEnemyOverheadBar(p.name, barColor);
        rig.root.add(overhead.group);
        rig.root.position.set(0, 0, -12);
        this.scene.add(rig.root);
        this.remotePeers.set(p.id, {
          id: p.id,
          name: p.name,
          team: p.team || 'ffa',
          characterId: p.characterId,
          rig,
          overhead,
          pos: existing ? existing.pos.clone() : new THREE.Vector3(0, 0, -12),
          targetPos: existing ? existing.targetPos.clone() : new THREE.Vector3(0, 0, -12),
          vel: new THREE.Vector3(),
          yaw: 0,
          targetYaw: 0,
          hp: p.hp,
          maxHp: p.maxHp,
          kills: p.kills || 0,
          deaths: p.deaths || 0,
          activeSlot: prof.loadout[0].id,
          isBlocking: false,
          isGliding: false,
          isStealthed: false,
          lastSwingSeq: 0,
          swingTimer: 0,
          hitFlashTimer: 0,
          recoilTilt: 0,
          walkDist: 0,
          alive: p.hp > 0,
        });
      } else {
        existing.name = p.name;
        existing.hp = p.hp;
        existing.maxHp = p.maxHp;
        existing.kills = p.kills || 0;
        existing.deaths = p.deaths || 0;
        existing.overhead.updateHp(p.hp / p.maxHp);
      }
    }

    for (const [id, peer] of this.remotePeers.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(peer.rig.root);
        this.remotePeers.delete(id);
      }
    }
  }

  private syncPlacedBlocksFromServer(
    serverBlocks: Array<{ id: string; x: number; y: number; z: number; kind: string; ownerId: string }>
  ): void {
    const existingIds = new Set(this.placedBlocks.map((p) => p.block.id));
    for (const sb of serverBlocks) {
      if (!existingIds.has(sb.id)) {
        this.addPlacedBlockLocal(
          sb.id,
          sb.x,
          sb.y,
          sb.z,
          sb.kind === 'obsidian' ? 'obsidian' : 'player_block',
          sb.ownerId,
          false
        );
      }
    }
  }

  private createEnemy(
    profile: CharacterProfile,
    policy: AiPolicy,
    pos: THREE.Vector3,
    id: string,
    isBoss = false,
    team: PlayerTeam = 'ffa'
  ): AiFighter {
    const rig = createFighterModel(profile, this.materials.shadowDisc, !this.isSoftwareGl);
    if (isBoss) {
      rig.root.scale.setScalar(1.18);
    }
    rig.setActiveWeapon(profile.loadout[0].id);
    rig.root.position.copy(pos);
    const barColor = team === 'red' ? '#ef4444' : team === 'blue' ? '#3b82f6' : profile.trimColor;
    const overhead = createEnemyOverheadBar(profile.name, barColor);
    rig.root.add(overhead.group);
    this.scene.add(rig.root);

    return {
      id,
      name: profile.name,
      team,
      profile,
      policy,
      rig,
      overhead,
      pos: pos.clone(),
      vel: new THREE.Vector3(),
      yaw: Math.atan2(pos.x, pos.z),
      hp: profile.maxHp,
      maxHp: profile.maxHp,
      absorption: 0,
      kills: 0,
      deaths: 0,
      onGround: true,
      fallStartY: pos.y,
      walkDist: 0,
      swingTimer: 0,
      hitFlashTimer: 0,
      recoilTilt: 0,
      burnTimer: 0,
      burnTickTimer: 0,
      attackCooldown: 0.9 + Math.random() * 0.6,
      telegraphTimer: 0,
      telegraphKind: null,
      strafeDir: Math.random() > 0.5 ? 1 : -1,
      strafeTimer: 1.5,
      windCd: 2 + Math.random() * 2,
      pearlCd: 4 + Math.random() * 3,
      specialCd: 2.2 + Math.random() * 2.2,
      healCd: 4.5 + Math.random() * 2.5,
      stealthTimer: 0,
      isBlocking: false,
      koTimer: 0,
      alive: true,
      respawnTimer: 0,
      isBoss,
    };
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('wheel', this.handleWheel, { passive: true });
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.handleMouseDown);
    canvas.addEventListener('contextmenu', this.handleContextMenu);
  }

  private unbindEvents(): void {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('wheel', this.handleWheel);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousedown', this.handleMouseDown);
    canvas.removeEventListener('contextmenu', this.handleContextMenu);
  }

  private handleResize = (): void => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handleWheel = (e: WheelEvent): void => {
    if (this.screen !== 'playing') return;
    if (Math.abs(e.deltaY) < 4) return;
    const now = performance.now();
    if (now - this.lastWheelSwitchMs < 65) return;
    this.lastWheelSwitchMs = now;
    const len = this.getCurrentLoadout().length;
    const step = e.deltaY > 0 ? 1 : -1;
    this.selectSlot((this.activeSlot + step + len) % len);
  };

  private handleBlur = (): void => {
    this.keys.clear();
    this.mouseDownLeft = false;
    this.mouseDownRight = false;
    this.lastMouseX = null;
    this.lastMouseY = null;
    this.edgeTurnDir = 0;
    this.edgePitchDir = 0;
  };

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.handleBlur();
    }
  };

  private handlePointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    this.emitHud(true);
  };

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private requestCanvasPointerLock(): void {
    if (this.pointerLocked || this.cameraMode === 'free') return;
    try {
      const res = this.renderer.domElement.requestPointerLock?.() as unknown;
      if (res && typeof (res as Promise<void>).catch === 'function') {
        (res as Promise<void>).catch(() => {});
      }
    } catch {
      // Safe fallback: mousemove delta works without pointer lock
    }
  }

  private handleMouseDown = (e: MouseEvent): void => {
    if (this.screen !== 'playing') return;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.requestCanvasPointerLock();

    if (e.button === 0) {
      this.mouseDownLeft = true;
      this.attackBuffer = 0.12;
      this.triggerPrimaryAction();
    } else if (e.button === 2) {
      this.mouseDownRight = true;
      if (this.isGliding) {
        this.isBlocking = false;
        this.triggerFireworkBoost();
      } else {
        this.isBlocking = true;
      }
    }
  };

  private handleMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.mouseDownLeft = false;
    } else if (e.button === 2) {
      this.mouseDownRight = false;
      this.isBlocking = false;
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (this.screen !== 'playing') return;

    const sens = this.settings.sensitivity;
    const ySign = this.settings.invertY ? -1 : 1;

    if (this.pointerLocked) {
      this.targetYaw -= e.movementX * 0.0028 * sens;
      this.targetPitch = THREE.MathUtils.clamp(
        this.targetPitch - e.movementY * 0.0024 * sens * ySign,
        -1.46,
        1.42
      );
      this.edgeTurnDir = 0;
      this.edgePitchDir = 0;
      return;
    }

    const lockedMode = this.cameraMode !== 'free';
    if (lockedMode || this.mouseDownRight || this.mouseDownLeft) {
      if (this.lastMouseX !== null && this.lastMouseY !== null) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        if (Math.abs(dx) < 160 && Math.abs(dy) < 160) {
          this.targetYaw -= dx * 0.0038 * sens;
          this.targetPitch = THREE.MathUtils.clamp(
            this.targetPitch - dy * 0.0032 * sens * ySign,
            -1.46,
            1.42
          );
        }
      }
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      if (lockedMode) {
        const w = window.innerWidth || 1440;
        const h = window.innerHeight || 720;
        if (e.clientX < 28) this.edgeTurnDir = 1;
        else if (e.clientX > w - 28) this.edgeTurnDir = -1;
        else this.edgeTurnDir = 0;

        if (e.clientY < 34) this.edgePitchDir = 1;
        else if (e.clientY > h - 34) this.edgePitchDir = -1;
        else this.edgePitchDir = 0;
      } else {
        this.edgeTurnDir = 0;
        this.edgePitchDir = 0;
      }
    } else {
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.edgeTurnDir = 0;
      this.edgePitchDir = 0;
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Allow typing inside multiplayer inputs without hijacking keys
    const activeTag = (document.activeElement as HTMLElement | null)?.tagName;
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
      return;
    }

    if (this.screen === 'title') {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        this.startGame();
      }
      return;
    }

    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (this.screen === 'playing') {
        this.pauseGame();
        return;
      } else if (this.screen === 'paused') {
        this.resumeGame();
        return;
      }
    }

    if (e.code === 'KeyM') {
      this.toggleMute();
      return;
    }

    if (
      e.code === 'KeyR' &&
      (this.screen === 'playing' || this.screen === 'paused' || this.screen === 'gameover') &&
      !this.isNetworkedMode()
    ) {
      this.startGame();
      return;
    }

    if (this.screen !== 'playing') return;

    const wasHeld = this.keys.has(e.code);
    this.keys.add(e.code);

    if (e.code === 'Space') {
      e.preventDefault();
      if (!wasHeld) {
        this.playerJumpBuffer = 0.14;
      }
    }

    const isRightShift =
      e.code === 'ShiftRight' ||
      (e.key === 'Shift' && e.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT);
    if ((isRightShift || e.code === 'KeyV') && !e.repeat) {
      e.preventDefault();
      this.cycleCameraMode();
      return;
    }

    if (e.code === 'Digit1') this.selectSlot(0);
    if (e.code === 'Digit2') this.selectSlot(1);
    if (e.code === 'Digit3') this.selectSlot(2);
    if (e.code === 'Digit4') this.selectSlot(3);
    if (e.code === 'Digit5') this.selectSlot(4);
    if (e.code === 'Digit6') this.selectSlot(5);

    if (e.code === 'KeyF' && !wasHeld) {
      this.triggerElytraBoost();
    }

    if ((e.code === 'KeyJ' || e.code === 'KeyK') && !wasHeld) {
      this.attackBuffer = 0.12;
      this.triggerPrimaryAction();
    }

    if (e.code === 'KeyC') {
      this.isBlocking = true;
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
    if (e.code === 'Space' && this.playerVel.y > 0 && !this.isGliding && !this.playerInCobweb) {
      this.playerVel.y *= 0.52;
    }
    if (e.code === 'KeyC' && !this.mouseDownRight) {
      this.isBlocking = false;
    }
  };

  private nextEventId(): string {
    return `${this.mpState.selfId ?? 'local'}-${++this.localEventCounter}-${Date.now().toString(36)}`;
  }

  private emitWorldEvent(payload: Record<string, unknown>): void {
    if (!this.isNetworkedMode()) return;
    this.net.send({
      type: 'world_event',
      eventId: this.nextEventId(),
      ...payload,
    });
  }

  private applyRemoteWorldEvent(msg: Record<string, unknown>): void {
    const kind = String(msg.kind || '');
    const senderId = String(msg.senderId || 'remote');

    if (kind === 'block_place') {
      this.addPlacedBlockLocal(
        String(msg.blockId || this.nextEventId()),
        Number(msg.x || 0),
        Number(msg.y || 0),
        Number(msg.z || 0),
        msg.blockKind === 'obsidian' ? 'obsidian' : 'player_block',
        senderId,
        false
      );
      this.audio.playBlockPlace();
    } else if (kind === 'block_destroy') {
      const ids = Array.isArray(msg.blockIds) ? new Set(msg.blockIds.map(String)) : new Set<string>();
      this.removePlacedBlocksByIds(ids);
    } else if (kind === 'cobweb_spawn') {
      this.spawnCobwebAt(Number(msg.x || 0), Number(msg.y || 0), Number(msg.z || 0), false);
    } else if (kind === 'cobweb_clear') {
      const cx = Number(msg.x || 0);
      const cz = Number(msg.z || 0);
      for (const w of this.cobwebs) {
        if (w.active && Math.hypot(w.x - cx, w.z - cz) < 1.2) {
          w.active = false;
          w.breakProgress = 0;
          w.mesh.visible = false;
        }
      }
    } else if (kind === 'hazard_spawn') {
      this.spawnHazardPool(
        msg.poolKind === 'water' ? 'water' : 'lava',
        Number(msg.x || 0),
        Number(msg.y || 0),
        Number(msg.z || 0),
        senderId,
        false
      );
    } else if (kind === 'tnt_explode') {
      _v1.set(Number(msg.x || 0), Number(msg.y || 0), Number(msg.z || 0));
      this.detonateTnt(_v1, senderId, false);
    } else if (kind === 'wind_explode') {
      _v1.set(Number(msg.x || 0), Number(msg.y || 0), Number(msg.z || 0));
      this.detonateWindCharge(_v1, senderId, false);
    }
  }

  private triggerElytraBoost(): void {
    if (this.elytraCooldown > 0 || this.localRespawnTimer > 0) return;
    this.elytraCooldown = 3.8;
    this.isGliding = true;
    this.isBlocking = false;
    this.glideSpeed = 22;
    this.fireworkBoostTimer = 0.22;
    this.fireworkCooldown = 0.25;
    this.audio.playWindCharge();

    _aimDir
      .set(
        -Math.sin(this.playerYaw) * Math.cos(this.playerPitch),
        Math.sin(this.playerPitch) + 0.42,
        -Math.cos(this.playerYaw) * Math.cos(this.playerPitch)
      )
      .normalize();

    this.playerVel.x = _aimDir.x * 22;
    this.playerVel.y = Math.max(12, _aimDir.y * 18);
    this.playerVel.z = _aimDir.z * 22;
    this.playerOnGround = false;
    this.playerFallStartY = Math.max(this.playerFallStartY, this.playerPos.y + 5);
    this.fovCurrent = 82;
    this.spawnParticles(this.playerPos.x, this.playerPos.y + 1, this.playerPos.z, 14, 0x38bdf8, 6);
    this.emitHud(true);
  }

  private triggerFireworkBoost(): void {
    if (!this.isGliding || this.fireworkCooldown > 0 || this.localRespawnTimer > 0) return;
    this.fireworkCooldown = 0.85;
    this.fireworkBoostTimer = 0.55;
    this.audio.playFireworkBoost();

    _aimDir
      .set(
        -Math.sin(this.playerYaw) * Math.cos(this.playerPitch),
        Math.sin(this.playerPitch),
        -Math.cos(this.playerYaw) * Math.cos(this.playerPitch)
      )
      .normalize();

    const boostSpeed = 27;
    this.glideSpeed = Math.max(this.glideSpeed, boostSpeed);
    this.playerVel.set(_aimDir.x * boostSpeed, _aimDir.y * boostSpeed, _aimDir.z * boostSpeed);
    this.playerOnGround = false;
    this.fovCurrent = Math.max(this.fovCurrent, 84);

    // Firework burst behind player
    const bx = this.playerPos.x - _aimDir.x * 0.8;
    const by = this.playerPos.y + 1.0 - _aimDir.y * 0.8;
    const bz = this.playerPos.z - _aimDir.z * 0.8;
    this.spawnParticles(bx, by, bz, 12, 0xf43f5e, 7);
    this.spawnParticles(bx, by, bz, 10, 0xfbbf24, 6.5);
    this.spawnParticles(bx, by, bz, 8, 0xffffff, 5);
  }

  private triggerPrimaryAction(): void {
    if (this.outcome !== null || this.defeatDelayTimer > 0 || this.localRespawnTimer > 0) return;

    const loadout = this.getCurrentLoadout();
    const item = loadout[this.activeSlot];
    const maxCds: [number, number, number, number, number, number] = [
      loadout[0].id === 'crossbow' ? 1.35 : loadout[0].cooldown,
      loadout[1].id === 'crossbow' ? 1.35 : loadout[1].cooldown,
      loadout[2].id === 'crossbow' ? 1.35 : loadout[2].cooldown,
      loadout[3].id === 'crossbow' ? 1.35 : loadout[3].cooldown,
      loadout[4].id === 'crossbow' ? 1.35 : loadout[4].cooldown,
      loadout[5].id === 'crossbow' ? 1.35 : loadout[5].cooldown,
    ];

    const used = consumeSlotUse(
      this.activeSlot,
      this.slotCharges,
      this.slotMaxCharges,
      this.slotCooldowns,
      maxCds,
      this.slotUseDelays,
      item.useDelay ?? (item.id === 'crossbow' ? 0.22 : item.cooldown <= 0 ? 0 : 0.25)
    );
    if (!used) return;
    this.attackBuffer = 0;
    this.localSwingSeq++;

    const slotId = item.id;

    if (slotId === 'sword' || slotId === 'fire_sword') {
      this.swingTimer = 0.22;
      if (slotId === 'fire_sword') {
        this.audio.playFireSwing();
      } else {
        this.audio.playSwing();
      }
      this.performMeleeStrike('sword', slotId === 'fire_sword', false);
    } else if (slotId === 'spear') {
      this.swingTimer = 0.26;
      this.audio.playSpearThrust();
      const aimX = -Math.sin(this.playerYaw);
      const aimZ = -Math.cos(this.playerYaw);
      this.playerVel.x += aimX * 9.5;
      this.playerVel.z += aimZ * 9.5;
      this.performMeleeStrike('spear', false, false);
    } else if (slotId === 'axe') {
      this.swingTimer = 0.32;
      this.audio.playHeavySwing();
      this.performMeleeStrike('axe', false, true);
    } else if (slotId === 'mace') {
      this.swingTimer = 0.34;
      this.audio.playHeavySwing();
      this.performMeleeStrike('mace', false, true);
    } else if (slotId === 'bow') {
      this.swingTimer = 0.24;
      this.fireProjectile('arrow');
    } else if (slotId === 'crossbow') {
      this.swingTimer = 0.16;
      this.fireProjectile('bolt');
    } else if (slotId === 'wind_charge') {
      this.swingTimer = 0.18;
      this.fireProjectile('wind_charge');
    } else if (slotId === 'ender_pearl') {
      this.swingTimer = 0.18;
      this.fireProjectile('ender_pearl');
    } else if (slotId === 'trident') {
      this.swingTimer = 0.22;
      this.fireProjectile('trident');
    } else if (slotId === 'tnt_charge') {
      this.swingTimer = 0.22;
      this.throwTntBlock();
    } else if (slotId === 'cobweb') {
      this.swingTimer = 0.18;
      this.placeOrThrowCobweb();
    } else if (slotId === 'lava_bucket') {
      this.swingTimer = 0.2;
      this.placeBucketPool('lava');
    } else if (slotId === 'water_bucket') {
      this.swingTimer = 0.2;
      this.placeBucketPool('water');
    } else if (slotId === 'build_block') {
      this.swingTimer = 0.16;
      if (!this.placePlayerBlock()) {
        // Refund block charge if target was invalid/blocked
        this.slotCharges[this.activeSlot] = Math.min(
          this.slotMaxCharges[this.activeSlot],
          this.slotCharges[this.activeSlot] + 1
        );
      }
    } else if (slotId === 'shadow_step') {
      this.stealthTimer = 2.6;
      this.playerRig.setOpacity(0.28);
      this.audio.playShadowStep();
      const aimX = -Math.sin(this.playerYaw);
      const aimZ = -Math.cos(this.playerYaw);
      this.playerVel.x += aimX * 12;
      this.playerVel.z += aimZ * 12;
      this.spawnParticles(this.playerPos.x, this.playerPos.y + 1, this.playerPos.z, 18, 0x818cf8, 7);
      this.pushCallout('그림자 도약 · 2.6초 은신 & 이속 상승', '#818cf8');
    } else if (slotId === 'gapple') {
      this.playerHp = this.playerMaxHp;
      this.playerBurnTimer = 0;
      this.playerAbsorption = Math.min(30, this.playerAbsorption + 20);
      this.audio.playGapple();
      this.spawnParticles(this.playerPos.x, this.playerPos.y + 1.1, this.playerPos.z, 20, 0xfbbf24, 5.5);
      this.pushCallout('황금 사과 · HP 100% 풀피 회복 & 보호막!', '#fbbf24');
      this.syncVitalsToServer();
    } else if (slotId === 'potion') {
      this.playerHp = Math.min(this.playerMaxHp, this.playerHp + 65);
      this.audio.playPotionSplash();
      this.spawnParticles(this.playerPos.x, this.playerPos.y + 1.1, this.playerPos.z, 20, 0xf43f5e, 6);
      this.pushCallout('치유 물약 · +65 HP 즉시 회복', '#fb7185');
      this.syncVitalsToServer();
    }

    this.emitHud(true);
  }

  private syncVitalsToServer(): void {
    if (!this.isNetworkedMode()) return;
    this.net.send({
      type: 'heal_sync',
      hp: this.playerHp,
      absorption: this.playerAbsorption,
    });
  }

  private placePlayerBlock(): boolean {
    _aimDir
      .set(
        -Math.sin(this.playerYaw) * Math.cos(this.playerPitch),
        Math.sin(this.playerPitch),
        -Math.cos(this.playerYaw) * Math.cos(this.playerPitch)
      )
      .normalize();

    const pos = computeBlockPlacement(
      this.playerPos.x,
      this.playerPos.y + 1.56,
      this.playerPos.z,
      _aimDir.x,
      _aimDir.y,
      _aimDir.z,
      this.playerPos.x,
      this.playerPos.y,
      this.playerPos.z,
      this.blocks,
      this.currentArenaRadius
    );

    if (!pos) return false;
    const blockId = `pb-${this.mpState.selfId ?? 'local'}-${++this.localEventCounter}`;
    this.addPlacedBlockLocal(blockId, pos.x, pos.y, pos.z, 'player_block', 'player', true);
    this.audio.playBlockPlace();
    this.spawnParticles(pos.x, pos.y + 0.75, pos.z, 8, 0xc28b52, 4);
    return true;
  }

  private addPlacedBlockLocal(
    id: string,
    x: number,
    y: number,
    z: number,
    kind: 'player_block' | 'obsidian',
    ownerId: string,
    broadcast: boolean
  ): void {
    const GRID = 1.5;
    if (this.placedBlocks.length >= MAX_PLACED_BLOCKS) {
      const oldest = this.placedBlocks.shift()!;
      this.removePlacedBlocksByIds(new Set([oldest.block.id]));
    }

    const block: ArenaBlock = {
      id,
      x,
      y,
      z,
      w: GRID,
      h: GRID,
      d: GRID,
      kind,
      ownerId,
    };
    const mat = kind === 'obsidian' ? this.materials.obsidian : this.materials.player_block;
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(GRID, GRID, GRID, 3, 0.1), mat);
    mesh.position.set(x, y + GRID * 0.5, z);
    mesh.castShadow = !this.isSoftwareGl;
    mesh.receiveShadow = !this.isSoftwareGl;
    this.scene.add(mesh);
    this.envMeshes.push(mesh);
    this.blocks.push(block);
    this.placedBlocks.push({ block, mesh, life: 60 });

    if (broadcast) {
      this.emitWorldEvent({
        kind: 'block_place',
        blockId: id,
        x,
        y,
        z,
        blockKind: kind,
      });
    }
  }

  private removePlacedBlocksByIds(ids: Set<string>): void {
    if (ids.size === 0) return;
    for (let i = this.placedBlocks.length - 1; i >= 0; i--) {
      const entry = this.placedBlocks[i];
      if (!ids.has(entry.block.id)) continue;
      this.scene.remove(entry.mesh);
      entry.mesh.geometry.dispose();
      const envIdx = this.envMeshes.indexOf(entry.mesh);
      if (envIdx >= 0) this.envMeshes.splice(envIdx, 1);
      const bIdx = this.blocks.indexOf(entry.block);
      if (bIdx >= 0) this.blocks.splice(bIdx, 1);
      this.placedBlocks.splice(i, 1);
    }
  }

  private placeBucketPool(kind: 'lava' | 'water'): void {
    _aimDir
      .set(
        -Math.sin(this.playerYaw) * Math.cos(this.playerPitch),
        Math.sin(this.playerPitch),
        -Math.cos(this.playerYaw) * Math.cos(this.playerPitch)
      )
      .normalize();

    const reach = this.playerPitch < -0.45 ? 1.5 : 4.2;
    const tx = THREE.MathUtils.clamp(
      this.playerPos.x + _aimDir.x * reach,
      -this.currentArenaRadius + 2,
      this.currentArenaRadius - 2
    );
    const tz = THREE.MathUtils.clamp(
      this.playerPos.z + _aimDir.z * reach,
      -this.currentArenaRadius + 2,
      this.currentArenaRadius - 2
    );
    const ty = getSupportHeightAt(tx, tz, this.playerPos.y + 1.5, 0.4, this.blocks);
    this.spawnHazardPool(kind, tx, ty, tz, this.mpState.selfId ?? 'player', true);
  }

  private spawnHazardPool(
    kind: 'lava' | 'water',
    x: number,
    y: number,
    z: number,
    ownerId: string,
    broadcast: boolean
  ): void {
    if (kind === 'water') {
      this.audio.playWaterSplash();
      this.spawnParticles(x, y + 0.5, z, 18, 0x38bdf8, 6);
      if (ownerId === (this.mpState.selfId ?? 'player') || Math.hypot(this.playerPos.x - x, this.playerPos.z - z) < 2.5) {
        this.playerBurnTimer = 0;
        this.playerFallStartY = this.playerPos.y;
      }

      // Wash away cobwebs inside water radius
      for (const w of this.cobwebs) {
        if (w.active && Math.hypot(w.x - x, w.z - z) < 2.6) {
          w.active = false;
          w.mesh.visible = false;
        }
      }

      // Convert overlapping Lava pools into solid Obsidian blocks!
      for (const h of this.hazardPools) {
        if (h.active && h.kind === 'lava' && Math.hypot(h.x - x, h.z - z) < 2.8) {
          h.active = false;
          h.mesh.visible = false;
          const gx = Math.round(h.x / 1.5) * 1.5;
          const gz = Math.round(h.z / 1.5) * 1.5;
          const obId = `obs-${++this.localEventCounter}`;
          this.addPlacedBlockLocal(obId, gx, h.y, gz, 'obsidian', ownerId, broadcast);
          this.audio.playLavaSizzle();
          this.spawnParticles(gx, h.y + 1.0, gz, 16, 0xe2e8f0, 5);
          this.pushCallout('용암 + 물 → 흑요석 생성!', '#c084fc');
        }
      }
    } else {
      this.audio.playLavaBucket();
      this.spawnParticles(x, y + 0.5, z, 18, 0xf97316, 6);
      this.pushCallout(
        ownerId === (this.mpState.selfId ?? 'player') ? '용암 장판 설치! (본인 피해 없음)' : '용암 장판 설치!',
        '#f97316'
      );
    }

    // Find matching kind slot or update mesh colors
    let slot = this.hazardPools.find((h) => !h.active && h.kind === kind);
    if (!slot) {
      slot = this.hazardPools[this.hazardCursor];
      this.hazardCursor = (this.hazardCursor + 1) % this.hazardPools.length;
      if (slot.kind !== kind) {
        this.scene.remove(slot.mesh);
        slot.mesh = createHazardPoolMesh(kind, 2.1, this.materials.lavaTex);
        this.scene.add(slot.mesh);
        slot.kind = kind;
      }
    }

    slot.active = true;
    slot.x = x;
    slot.y = y;
    slot.z = z;
    slot.radius = 2.1;
    slot.life = kind === 'lava' ? 8.5 : 7.5;
    slot.ownerId = ownerId;
    slot.ownerGrace = 0.7;
    slot.mesh.position.set(x, y, z);
    slot.mesh.visible = true;

    if (broadcast) {
      this.emitWorldEvent({
        kind: 'hazard_spawn',
        poolKind: kind,
        x,
        y,
        z,
      });
    }
  }

  private placeOrThrowCobweb(): void {
    if (this.playerPitch < -0.42) {
      const aimX = -Math.sin(this.playerYaw);
      const aimZ = -Math.cos(this.playerYaw);
      const wx = this.playerPos.x + aimX * 1.4;
      const wz = this.playerPos.z + aimZ * 1.4;
      const wy = getSupportHeightAt(wx, wz, this.playerPos.y + 0.5, 0.5, this.blocks);
      this.spawnCobwebAt(wx, wy, wz, true);
      this.pushCallout('거미줄 설치!', '#e2e8f0');
    } else {
      this.fireProjectile('cobweb_orb');
    }
  }

  private spawnCobwebAt(x: number, y: number, z: number, broadcast: boolean): void {
    const w = this.cobwebs[this.cobwebCursor];
    this.cobwebCursor = (this.cobwebCursor + 1) % this.cobwebs.length;
    w.active = true;
    w.x = x;
    w.y = y;
    w.z = z;
    w.life = 9.0;
    w.ownerGrace = 0.55;
    w.hp = 3;
    w.breakProgress = 0;
    w.mesh.position.set(x, y, z);
    w.mesh.visible = true;
    this.audio.playCobweb();
    this.spawnParticles(x, y + 0.7, z, 12, 0xf1f5f9, 4.5);

    if (broadcast) {
      this.emitWorldEvent({ kind: 'cobweb_spawn', x, y, z });
    }
  }

  private throwTntBlock(custom?: {
    ownerId: string;
    ownerTeam: PlayerTeam;
    origin: THREE.Vector3;
    dir: THREE.Vector3;
  }): void {
    const slot = this.tntFuses.find((t) => !t.active);
    if (!slot) return;

    if (custom) {
      _aimDir.copy(custom.dir).normalize();
      slot.pos.copy(custom.origin);
      slot.ownerId = custom.ownerId;
      slot.ownerTeam = custom.ownerTeam;
    } else {
      _aimDir
        .set(
          -Math.sin(this.playerYaw) * Math.cos(this.playerPitch),
          Math.sin(this.playerPitch) + 0.12,
          -Math.cos(this.playerYaw) * Math.cos(this.playerPitch)
        )
        .normalize();
      slot.pos.set(
        this.playerPos.x - Math.sin(this.playerYaw) * 0.7,
        this.playerPos.y + 1.45,
        this.playerPos.z - Math.cos(this.playerYaw) * 0.7
      );
      slot.ownerId = this.mpState.selfId ?? 'player';
      slot.ownerTeam = this.getLocalPlayerTeam();
    }

    slot.active = true;
    slot.fuse = 1.05;
    slot.grounded = false;
    slot.vel.copy(_aimDir).multiplyScalar(18.5);
    slot.vel.y += 3.5;
    slot.mesh.position.copy(slot.pos);
    slot.mesh.visible = true;
    this.audio.playTntIgnite();
    this.spawnParticles(slot.pos.x, slot.pos.y + 0.3, slot.pos.z, 8, 0xfbbf24, 4);
  }

  private showSlashArc(colorHex: number, scale = 1): void {
    this.slashTimer = 0.14;
    const mat = this.slashMesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(colorHex);
    mat.opacity = 0.9;
    this.slashMesh.position.set(
      this.playerPos.x - Math.sin(this.playerYaw) * 0.9,
      this.playerPos.y + 1.15,
      this.playerPos.z - Math.cos(this.playerYaw) * 0.9
    );
    this.slashMesh.rotation.set(-Math.PI / 2, 0, this.playerYaw - Math.PI / 2);
    this.slashMesh.scale.setScalar(scale);
    this.slashMesh.visible = true;
  }

  private performMeleeStrike(
    kind: 'sword' | 'spear' | 'axe' | 'mace',
    isFire: boolean,
    breaksShield: boolean
  ): void {
    const prof = CHARACTERS[this.selectedCharId];
    const fallDist = Math.max(0, this.playerFallStartY - this.playerPos.y);

    const aimX = -Math.sin(this.playerYaw);
    const aimZ = -Math.cos(this.playerYaw);
    const reach = kind === 'spear' ? 6.2 : kind === 'mace' ? 4.4 : 4.1;

    const localTeam = this.getLocalPlayerTeam();
    let hitEnemy: AiFighter | null = null;
    let bestScore = Infinity;

    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.koTimer > 0) continue;
      if (!canDamageTarget(this.mpState.roomMode, localTeam, enemy.team)) continue;
      const dx = enemy.pos.x - this.playerPos.x;
      const dy = enemy.pos.y - this.playerPos.y;
      const dz = enemy.pos.z - this.playerPos.z;
      const horizDist = Math.hypot(dx, dz);
      if (horizDist > reach || Math.abs(dy) > 3.4) continue;

      const dot = horizDist < 0.1 ? 1 : (dx * aimX + dz * aimZ) / horizDist;
      if (dot > 0.22 && horizDist < bestScore) {
        bestScore = horizDist;
        hitEnemy = enemy;
      }
    }

    let hitPeer: RemotePeerActor | null = null;
    let bestPeerScore = Infinity;
    for (const peer of this.remotePeers.values()) {
      if (!peer.alive) continue;
      if (!canDamageTarget(this.mpState.roomMode, localTeam, peer.team)) continue;
      const dx = peer.pos.x - this.playerPos.x;
      const dy = peer.pos.y - this.playerPos.y;
      const dz = peer.pos.z - this.playerPos.z;
      const horizDist = Math.hypot(dx, dz);
      if (horizDist > reach || Math.abs(dy) > 3.4) continue;
      const dot = horizDist < 0.1 ? 1 : (dx * aimX + dz * aimZ) / horizDist;
      if (dot > 0.22 && horizDist < bestPeerScore) {
        bestPeerScore = horizDist;
        hitPeer = peer;
      }
    }

    if (kind !== 'mace') {
      const base = kind === 'axe' ? 22 : kind === 'spear' ? 16 : 15;
      const mult = prof.damageMult;
      const { damage, isCrit } = computeSwordDamage(base, mult, this.playerVel.y, this.playerOnGround);
      this.showSlashArc(
        isCrit ? 0xfbbf24 : isFire ? 0xf97316 : kind === 'spear' ? 0xc084fc : 0xe2e8f0,
        kind === 'spear' ? 1.2 : 1.0
      );

      if (hitPeer && (!hitEnemy || bestPeerScore <= bestScore)) {
        this.applyHitToRemotePeer(hitPeer, damage, isCrit, false, aimX, aimZ, kind === 'axe' ? 12.5 : 10, isFire);
        return;
      }
      if (!hitEnemy) return;
      if (isFire) {
        hitEnemy.burnTimer = 3.0;
        hitEnemy.burnTickTimer = 0.6;
      }
      this.applyHitToEnemy(
        hitEnemy,
        damage,
        isCrit,
        false,
        breaksShield,
        aimX,
        aimZ,
        kind === 'axe' ? 12.5 : 10.0,
        isFire ? '화염검' : kind === 'spear' ? '오비탈 창' : kind === 'axe' ? '파괴의 도끼' : '검격'
      );
      return;
    }

    const { damage, isSmash, shockwaveRadius } = computeMaceDamage(
      14,
      prof.damageMult,
      fallDist,
      this.playerOnGround
    );
    this.showSlashArc(isSmash ? 0x38bdf8 : 0x94a3b8, isSmash ? 1.35 : 1.0);

    if (isSmash && (hitEnemy || hitPeer || !this.playerOnGround)) {
      const targetRef = hitPeer ?? hitEnemy;
      const impactX = targetRef ? targetRef.pos.x : this.playerPos.x + aimX * 1.4;
      const impactZ = targetRef ? targetRef.pos.z : this.playerPos.z + aimZ * 1.4;
      const impactY = targetRef ? targetRef.pos.y + 0.1 : this.playerPos.y + 0.1;

      this.spawnShockwave(impactX, impactY, impactZ, shockwaveRadius, 0x38bdf8);
      this.spawnParticles(impactX, impactY + 0.5, impactZ, 28, 0x7dd3fc, 12);
      this.audio.playMaceSmash(Math.min(1.6, fallDist / 8));
      this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.62);
      this.hitstopTimer = 0.072;

      this.playerVel.y = 10.6;
      this.playerOnGround = false;
      this.playerFallStartY = this.playerPos.y + 3;

      const roundedH = Math.round(fallDist);
      if (roundedH > this.maxSmashHeight) this.maxSmashHeight = roundedH;

      let totalHit = 0;
      for (const enemy of this.enemies) {
        if (!enemy.alive || enemy.koTimer > 0) continue;
        if (!canDamageTarget(this.mpState.roomMode, localTeam, enemy.team)) continue;
        const d = Math.hypot(enemy.pos.x - impactX, enemy.pos.z - impactZ);
        if (d <= shockwaveRadius) {
          const splashDmg = enemy === hitEnemy ? damage : Math.round(damage * 0.68);
          const dirX = d > 0.05 ? (enemy.pos.x - impactX) / d : aimX;
          const dirZ = d > 0.05 ? (enemy.pos.z - impactZ) / d : aimZ;
          this.applyHitToEnemy(enemy, splashDmg, true, true, true, dirX, dirZ, 15.0, '메이스 스매시');
          totalHit++;
        }
      }
      for (const peer of this.remotePeers.values()) {
        if (!peer.alive) continue;
        if (!canDamageTarget(this.mpState.roomMode, localTeam, peer.team)) continue;
        const d = Math.hypot(peer.pos.x - impactX, peer.pos.z - impactZ);
        if (d <= shockwaveRadius) {
          const splashDmg = peer === hitPeer ? damage : Math.round(damage * 0.68);
          const dirX = d > 0.05 ? (peer.pos.x - impactX) / d : aimX;
          const dirZ = d > 0.05 ? (peer.pos.z - impactZ) / d : aimZ;
          this.applyHitToRemotePeer(peer, splashDmg, true, true, dirX, dirZ, 15.0, false);
          totalHit++;
        }
      }
      if (totalHit > 0) {
        this.pushCallout(`메이스 스매시 · ${roundedH}m 낙하 · ${damage} DMG`, '#38bdf8');
      }
    } else if (hitPeer) {
      this.applyHitToRemotePeer(hitPeer, damage, false, false, aimX, aimZ, 9.0, false);
    } else if (hitEnemy) {
      this.applyHitToEnemy(hitEnemy, damage, false, false, false, aimX, aimZ, 9.0, '메이스');
    }
  }

  private applyHitToRemotePeer(
    peer: RemotePeerActor,
    damage: number,
    isCrit: boolean,
    isSmash: boolean,
    dirX: number,
    dirZ: number,
    knockback: number,
    ignite: boolean
  ): void {
    this.damageDealt += damage;
    this.hitmarkerTimer = 0.2;
    this.hitmarkerCrit = isCrit || isSmash;
    this.lastHitText = isSmash ? `${damage} SMASH!` : isCrit ? `${damage} CRIT!` : `${damage}`;

    if (!isSmash) {
      this.audio.playHit(isCrit);
      this.hitstopTimer = Math.max(this.hitstopTimer, isCrit ? 0.052 : 0.025);
      this.shakeTrauma = Math.min(1, this.shakeTrauma + (isCrit ? 0.34 : 0.16));
      this.spawnParticles(
        peer.pos.x,
        peer.pos.y + 1.2,
        peer.pos.z,
        isCrit ? 20 : 11,
        isCrit ? 0xfbbf24 : 0xef4444,
        8
      );
    }

    this.net.send({
      type: 'combat_hit',
      targetId: peer.id,
      damage,
      isCrit,
      isSmash,
      kbX: dirX * knockback,
      kbY: isSmash ? 8.8 : isCrit ? 5.6 : 4.0,
      kbZ: dirZ * knockback,
      ignite,
    });
  }

  private applyHitToEnemy(
    enemy: AiFighter,
    rawDmg: number,
    isCrit: boolean,
    isMaceSmash: boolean,
    breaksShield: boolean,
    dirX: number,
    dirZ: number,
    knockback: number,
    causeLabel: string
  ): void {
    const wasBlocking = enemy.isBlocking;
    const res = applyCombatDamage(
      {
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        absorption: enemy.absorption,
        isBlocking: enemy.isBlocking,
      },
      rawDmg,
      isMaceSmash || breaksShield
    );

    if (wasBlocking && breaksShield) {
      enemy.isBlocking = false;
      enemy.attackCooldown = 1.6;
    }

    enemy.hp = res.remainingHp;
    enemy.absorption = res.remainingAbsorption;
    enemy.overhead.updateHp(enemy.hp / enemy.maxHp);
    enemy.hitFlashTimer = 0.11;
    enemy.recoilTilt = isCrit || isMaceSmash ? 0.55 : 0.32;
    enemy.rig.setHitFlash(true);

    enemy.vel.x += dirX * knockback;
    enemy.vel.z += dirZ * knockback;
    enemy.vel.y = Math.max(enemy.vel.y, isMaceSmash ? 8.8 : isCrit ? 5.6 : 4.0);
    enemy.onGround = false;

    this.damageDealt += res.finalDamage;
    this.hitmarkerTimer = 0.2;
    this.hitmarkerCrit = isCrit || isMaceSmash;
    this.lastHitText = isMaceSmash
      ? `${res.finalDamage} SMASH!`
      : wasBlocking && breaksShield
        ? `${res.finalDamage} 방패 파괴!`
        : isCrit
          ? `${res.finalDamage} CRIT!`
          : `${res.finalDamage}`;

    if (res.blocked) {
      this.audio.playShieldBlock();
      this.spawnParticles(enemy.pos.x, enemy.pos.y + 1.2, enemy.pos.z, 8, 0x94a3b8, 5);
    } else if (!isMaceSmash) {
      this.audio.playHit(isCrit);
      this.hitstopTimer = Math.max(this.hitstopTimer, isCrit ? 0.052 : 0.025);
      this.shakeTrauma = Math.min(1, this.shakeTrauma + (isCrit ? 0.34 : 0.16));
      this.spawnParticles(
        enemy.pos.x,
        enemy.pos.y + 1.2,
        enemy.pos.z,
        isCrit ? 22 : 11,
        isCrit ? 0xfbbf24 : 0xef4444,
        isCrit ? 8.5 : 6.0
      );
    }

    if (enemy.hp <= 0) {
      this.handleEnemyKo(enemy, isCrit ? `${causeLabel} 치명타` : causeLabel);
    }
  }

  private handleEnemyKo(enemy: AiFighter, cause: string): void {
    enemy.koTimer = 0.42;
    enemy.deaths += 1;
    enemy.telegraphTimer = 0;
    enemy.rig.telegraphRing.visible = false;
    this.kills += 1;
    this.comboStreak += 1;
    this.audio.playDeath(false);
    this.spawnParticles(enemy.pos.x, enemy.pos.y + 1.0, enemy.pos.z, 24, 0xc084fc, 9);
    this.addKillFeedStructured({
      killerName: this.mpState.playerName || 'Player',
      victimName: enemy.name,
      weaponId: this.getCurrentLoadout()[this.activeSlot].id,
      color: '#c084fc',
    });

    if (this.mode === 'ffa' && this.kills >= this.matchTargetKills) {
      this.triggerEndGame('victory');
    } else if (this.mode === 'link_duel' && !this.mpState.roomCode && this.kills >= 3) {
      this.triggerEndGame('victory');
    }
  }

  private fireProjectile(
    kind: 'wind_charge' | 'ender_pearl' | 'trident' | 'cobweb_orb' | 'arrow' | 'bolt',
    custom?: {
      ownerId: string;
      ownerTeam: PlayerTeam;
      origin: THREE.Vector3;
      dir: THREE.Vector3;
      damage?: number;
    }
  ): void {
    const slot = this.projectiles.find((p) => !p.active);
    if (!slot) return;

    const prof = CHARACTERS[this.selectedCharId];
    if (custom) {
      slot.pos.copy(custom.origin);
      _v2.copy(custom.dir).normalize();
      slot.ownerId = custom.ownerId;
      slot.ownerTeam = custom.ownerTeam;
    } else {
      _aimDir
        .set(
          -Math.sin(this.playerYaw) * Math.cos(this.playerPitch),
          Math.sin(this.playerPitch) + (kind === 'ender_pearl' ? 0.08 : 0.0),
          -Math.cos(this.playerYaw) * Math.cos(this.playerPitch)
        )
        .normalize();

      _right.set(Math.cos(this.playerYaw), 0, -Math.sin(this.playerYaw));
      const shoulderOffset = this.cameraMode === 'shiftlock' ? 1.05 : 0.0;

      _v1
        .set(
          this.playerPos.x + _right.x * shoulderOffset,
          this.playerPos.y + 1.62,
          this.playerPos.z + _right.z * shoulderOffset
        )
        .addScaledVector(_aimDir, 22);

      slot.pos
        .set(
          this.playerPos.x + _right.x * 0.4,
          this.playerPos.y + 1.44,
          this.playerPos.z + _right.z * 0.4
        )
        .addScaledVector(_aimDir, 0.75);

      _v2.copy(_v1).sub(slot.pos).normalize();
      slot.ownerId = this.mpState.selfId ?? 'player';
      slot.ownerTeam = this.getLocalPlayerTeam();
    }

    slot.active = true;
    slot.kind = kind;
    slot.life = kind === 'arrow' || kind === 'bolt' ? 2.2 : 2.6;
    const speed =
      kind === 'arrow'
        ? 56
        : kind === 'bolt'
          ? 48
          : kind === 'wind_charge'
            ? 35
            : kind === 'trident'
              ? 38
              : kind === 'cobweb_orb'
                ? 28
                : 30;
    slot.vel.copy(_v2).multiplyScalar(speed);
    if (kind === 'ender_pearl' || kind === 'cobweb_orb') {
      slot.vel.y += 3.8;
    }

    slot.damage =
      custom?.damage ??
      (kind === 'arrow'
        ? Math.round(24 * prof.damageMult)
        : kind === 'bolt'
          ? Math.round(15 * prof.damageMult)
          : kind === 'trident'
            ? Math.round(24 * prof.damageMult)
            : 0);

    const isArrowType = kind === 'arrow' || kind === 'bolt';
    slot.mesh.visible = !isArrowType;
    slot.arrowGroup.visible = isArrowType;

    if (isArrowType) {
      slot.arrowGroup.position.copy(slot.pos);
      slot.arrowGroup.lookAt(
        slot.pos.x + slot.vel.x,
        slot.pos.y + slot.vel.y,
        slot.pos.z + slot.vel.z
      );
      this.audio.playBowShoot(kind === 'bolt');
    } else {
      const mat = slot.mesh.material as THREE.MeshStandardMaterial;
      if (kind === 'wind_charge') {
        mat.color.setHex(0xe0f2fe);
        mat.emissive.setHex(0x38bdf8);
        this.audio.playWindCharge();
      } else if (kind === 'trident') {
        mat.color.setHex(0x2dd4bf);
        mat.emissive.setHex(0x14b8a6);
        this.audio.playTridentThrow();
      } else if (kind === 'cobweb_orb') {
        mat.color.setHex(0xf8fafc);
        mat.emissive.setHex(0xcbd5e1);
        this.audio.playCobweb();
      } else {
        mat.color.setHex(0x2dd4bf);
        mat.emissive.setHex(0xa855f7);
        this.audio.playSwing();
      }
      slot.mesh.position.copy(slot.pos);
    }
  }

  private detonateWindCharge(pos: THREE.Vector3, ownerId: string, broadcast: boolean, ownerTeam: PlayerTeam = 'ffa'): void {
    this.spawnShockwave(pos.x, Math.max(0.05, pos.y), pos.z, 4.5, 0xbae6fd);
    this.spawnParticles(pos.x, pos.y + 0.2, pos.z, 18, 0xe0f2fe, 9);
    this.audio.playWindCharge();

    const pDist = Math.hypot(this.playerPos.x - pos.x, this.playerPos.z - pos.z);
    const pDy = this.playerPos.y + 0.8 - pos.y;
    const p3D = Math.hypot(pDist, pDy);
    const isLocalOwner = ownerId === (this.mpState.selfId ?? 'player');
    if (p3D < 5.4 && (isLocalOwner || canDamageTarget(this.mpState.roomMode, ownerTeam, this.getLocalPlayerTeam()))) {
      const strength = 1 - p3D / 5.4;
      this.playerVel.y = Math.max(this.playerVel.y, 14.0 + strength * 5.5);
      if (pDist > 0.2) {
        this.playerVel.x += ((this.playerPos.x - pos.x) / pDist) * 7.5 * strength;
        this.playerVel.z += ((this.playerPos.z - pos.z) / pDist) * 7.5 * strength;
      }
      this.playerOnGround = false;
      this.playerFallStartY = this.playerPos.y + 8;
    }

    if (isLocalOwner) {
      for (const enemy of this.enemies) {
        if (!enemy.alive || enemy.koTimer > 0) continue;
        if (!canDamageTarget(this.mpState.roomMode, ownerTeam, enemy.team)) continue;
        const d = Math.hypot(enemy.pos.x - pos.x, enemy.pos.z - pos.z);
        const dy = enemy.pos.y + 0.8 - pos.y;
        if (Math.hypot(d, dy) < 5.6) {
          const dirX = d > 0.1 ? (enemy.pos.x - pos.x) / d : 0;
          const dirZ = d > 0.1 ? (enemy.pos.z - pos.z) / d : 1;
          enemy.vel.x += dirX * 12.5;
          enemy.vel.z += dirZ * 12.5;
          enemy.vel.y = Math.max(enemy.vel.y, 10.5);
          enemy.onGround = false;
          this.applyHitToEnemy(enemy, 7, false, false, false, dirX, dirZ, 4, '돌풍구');
        }
      }
      for (const peer of this.remotePeers.values()) {
        if (!peer.alive) continue;
        if (!canDamageTarget(this.mpState.roomMode, ownerTeam, peer.team)) continue;
        const d = Math.hypot(peer.pos.x - pos.x, peer.pos.z - pos.z);
        if (d < 5.6) {
          const dirX = d > 0.1 ? (peer.pos.x - pos.x) / d : 0;
          const dirZ = d > 0.1 ? (peer.pos.z - pos.z) / d : 1;
          this.applyHitToRemotePeer(peer, 7, false, false, dirX, dirZ, 12.0, false);
        }
      }
      if (broadcast) {
        this.emitWorldEvent({ kind: 'wind_explode', x: pos.x, y: pos.y, z: pos.z });
      }
    }
  }

  private detonateTnt(pos: THREE.Vector3, ownerId: string, broadcast: boolean, ownerTeam: PlayerTeam = 'ffa'): void {
    this.spawnShockwave(pos.x, Math.max(0.06, pos.y), pos.z, 6.4, 0xf97316);
    this.spawnParticles(pos.x, pos.y + 0.4, pos.z, 32, 0xf97316, 12);
    this.audio.playExplosion();
    this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.58);

    // Destroy player-placed blocks within 4.8m blast radius!
    const destroyedIds = new Set<string>();
    for (const entry of this.placedBlocks) {
      const d = Math.hypot(entry.block.x - pos.x, entry.block.y + 0.75 - pos.y, entry.block.z - pos.z);
      if (d <= 4.8) {
        destroyedIds.add(entry.block.id);
        this.spawnParticles(entry.block.x, entry.block.y + 0.75, entry.block.z, 10, 0x94a3b8, 7);
      }
    }
    this.removePlacedBlocksByIds(destroyedIds);

    // Clear cobwebs inside TNT blast!
    for (const w of this.cobwebs) {
      if (w.active && Math.hypot(w.x - pos.x, w.z - pos.z) <= 5.2) {
        w.active = false;
        w.mesh.visible = false;
      }
    }

    const isLocalOwner = ownerId === (this.mpState.selfId ?? 'player');
    const localTeam = this.getLocalPlayerTeam();

    // Blast self or take AI explosion damage if hostile
    const pDist = Math.hypot(this.playerPos.x - pos.x, this.playerPos.z - pos.z);
    if (pDist < 5.6 && Math.abs(this.playerPos.y - pos.y) < 4.5) {
      const falloff = 1 - pDist / 5.6;
      if (isLocalOwner) {
        this.playerVel.y = Math.max(this.playerVel.y, 11.5 + falloff * 5.0);
        if (pDist > 0.15) {
          this.playerVel.x += ((this.playerPos.x - pos.x) / pDist) * 11 * falloff;
          this.playerVel.z += ((this.playerPos.z - pos.z) / pDist) * 11 * falloff;
        }
        this.playerOnGround = false;
      } else if (canDamageTarget(this.mpState.roomMode, ownerTeam, localTeam)) {
        const dirX = pDist > 0.1 ? (this.playerPos.x - pos.x) / pDist : 0;
        const dirZ = pDist > 0.1 ? (this.playerPos.z - pos.z) / pDist : 1;
        this.applyDamageToLocalPlayer(Math.round(12 + falloff * 14), true, dirX, dirZ, 10.5, 'TNT 폭탄');
      }
    }

    if (isLocalOwner) {
      for (const enemy of this.enemies) {
        if (!enemy.alive || enemy.koTimer > 0) continue;
        if (!canDamageTarget(this.mpState.roomMode, ownerTeam, enemy.team)) continue;
        const d = Math.hypot(enemy.pos.x - pos.x, enemy.pos.z - pos.z);
        if (d < 6.4) {
          const falloff = 1 - d / 6.4;
          const dmg = Math.round(14 + falloff * 18);
          const dirX = d > 0.1 ? (enemy.pos.x - pos.x) / d : 0;
          const dirZ = d > 0.1 ? (enemy.pos.z - pos.z) / d : 1;
          this.applyHitToEnemy(enemy, dmg, true, false, true, dirX, dirZ, 13.5, 'TNT 폭탄');
        }
      }
      for (const peer of this.remotePeers.values()) {
        if (!peer.alive) continue;
        if (!canDamageTarget(this.mpState.roomMode, ownerTeam, peer.team)) continue;
        const d = Math.hypot(peer.pos.x - pos.x, peer.pos.z - pos.z);
        if (d < 6.4) {
          const falloff = 1 - d / 6.4;
          const dmg = Math.round(14 + falloff * 18);
          const dirX = d > 0.1 ? (peer.pos.x - pos.x) / d : 0;
          const dirZ = d > 0.1 ? (peer.pos.z - pos.z) / d : 1;
          this.applyHitToRemotePeer(peer, dmg, true, true, dirX, dirZ, 13.5, false);
        }
      }

      if (broadcast) {
        if (destroyedIds.size > 0) {
          this.emitWorldEvent({ kind: 'block_destroy', blockIds: Array.from(destroyedIds) });
        }
        this.emitWorldEvent({ kind: 'tnt_explode', x: pos.x, y: pos.y, z: pos.z });
      }
    }
  }

  private detonateEnderPearl(pos: THREE.Vector3): void {
    this.spawnParticles(pos.x, pos.y + 0.5, pos.z, 22, 0xc084fc, 8);
    this.audio.playPearlWarp();

    const clamped = resolveHorizontalCollision(
      pos.x,
      Math.max(0, pos.y),
      pos.z,
      PLAYER_RADIUS,
      PLAYER_HEIGHT,
      this.blocks,
      this.currentArenaRadius - 1
    );
    const sup = getSupportHeightAt(clamped.x, clamped.z, pos.y + 1.5, PLAYER_RADIUS, this.blocks);
    this.playerPos.set(clamped.x, Math.max(sup, pos.y), clamped.z);
    this.playerVel.y = Math.max(2, this.playerVel.y * 0.2);
    this.playerFallStartY = this.playerPos.y;
    this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.18);
  }

  private respawnLocalPlayerInMp(): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = this.mode === 'online_world' ? 18 + Math.random() * 44 : 12 + Math.random() * 8;
    const rx = Math.cos(angle) * dist;
    const rz = Math.sin(angle) * dist;
    const supY = getSupportHeightAt(rx, rz, 20, PLAYER_RADIUS, this.blocks);
    this.playerPos.set(rx, supY + 0.5, rz);
    this.playerVel.set(0, 0, 0);
    this.isGliding = false;
    this.fireworkBoostTimer = 0;
    this.camPos.set(rx, supY + 2.08, rz);
    this.camLook.set(
      rx - Math.sin(this.playerYaw) * 18,
      supY + 2.08 + Math.sin(this.playerPitch) * 18,
      rz - Math.cos(this.playerYaw) * 18
    );
    this.playerHp = this.playerMaxHp;
    this.playerAbsorption = 0;
    this.playerBurnTimer = 0;
    this.localRespawnTimer = 0;
    this.syncCameraVisibility();
    this.spawnParticles(this.playerPos.x, this.playerPos.y + 1, this.playerPos.z, 16, 0x38bdf8, 6);
  }

  private triggerEndGame(outcome: 'victory' | 'defeat'): void {
    if (this.outcome !== null) return;
    this.outcome = outcome;
    this.screen = 'gameover';
    this.keys.clear();
    this.mouseDownLeft = false;
    this.mouseDownRight = false;
    document.exitPointerLock?.();
    this.onMatchEnd?.({
      mode: this.mode,
      won: outcome === 'victory',
      kills: this.kills,
      deaths: this.deaths,
    });
    this.syncCameraVisibility();
    this.syncBodyState();
    this.emitHud(true);
  }

  private pushCallout(text: string, accent: string): void {
    this.calloutText = text;
    this.calloutAccent = accent;
    this.calloutTimer = 2.0;
  }

  private addKillFeedStructured(entry: {
    killerName: string;
    killerTeam?: PlayerTeam;
    victimName: string;
    victimTeam?: PlayerTeam;
    weaponId?: WeaponSlotId;
    text?: string;
    color: string;
  }): void {
    this.killFeed = [
      {
        id: this.nextFeedId++,
        killerName: entry.killerName,
        killerTeam: entry.killerTeam,
        victimName: entry.victimName,
        victimTeam: entry.victimTeam,
        weaponId: entry.weaponId,
        text: entry.text,
        color: entry.color,
      },
      ...this.killFeed,
    ].slice(0, 4);
  }

  private addKillFeed(text: string, color: string): void {
    this.addKillFeedStructured({ killerName: '', victimName: '', text, color });
  }

  private spawnParticles(
    x: number,
    y: number,
    z: number,
    count: number,
    hex: number,
    speed: number
  ): void {
    if (!this.settings.particlesEnabled) return;
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % this.particles.length;
      p.active = true;
      p.pos.set(x, y, z);
      const theta = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random() * 0.75);
      p.vel.set(Math.cos(theta) * sp, (0.35 + Math.random() * 0.9) * speed, Math.sin(theta) * sp);
      p.maxLife = 0.28 + Math.random() * 0.28;
      p.life = p.maxLife;
      p.size = 0.7 + Math.random() * 0.9;
      p.color.setHex(hex);
    }
  }

  private spawnShockwave(x: number, y: number, z: number, maxRadius: number, hex: number): void {
    const sw = this.shockwaves.find((s) => !s.active) ?? this.shockwaves[0];
    sw.active = true;
    sw.maxLife = 0.36;
    sw.life = sw.maxLife;
    sw.maxRadius = maxRadius;
    sw.mesh.position.set(x, y, z);
    sw.mesh.scale.setScalar(0.4);
    const mat = sw.mesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(hex);
    mat.opacity = 0.9;
    sw.mesh.visible = true;
  }

  private loop = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    this.update(dt, now * 0.001);
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.loop);
    } else {
      this.frameId = requestAnimationFrame(this.loop);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private update(dt: number, timeSec: number): void {
    this.fpsFrames += 1;
    this.fpsAccum += dt;
    if (this.fpsAccum >= 0.5) {
      this.fps = Math.max(1, Math.round(this.fpsFrames / this.fpsAccum));
      this.fpsFrames = 0;
      this.fpsAccum = 0;
    }

    for (let i = 0; i < this.crystalMeshes.length; i++) {
      const c = this.crystalMeshes[i];
      c.rotation.y += dt * 1.4;
      c.position.y += Math.sin(timeSec * 2.2 + i) * dt * 0.25;
    }

    if (this.screen === 'title') {
      this.titleOrbitAngle += dt * 0.16;
      const r = 46;
      this.camera.position.set(
        Math.sin(this.titleOrbitAngle) * r,
        17 + Math.sin(this.titleOrbitAngle * 0.6) * 3.0,
        Math.cos(this.titleOrbitAngle) * r - 6
      );
      this.camera.lookAt(0, 4.5, -10);
      this.animateIdleFighter(this.playerRig, timeSec);
      for (const e of this.enemies) {
        this.animateIdleFighter(e.rig, timeSec + e.pos.x);
      }
      return;
    }

    if (this.screen === 'paused') {
      return;
    }

    this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 2.1);
    const baseFov = this.settings.fov;
    const desiredFov =
      this.fireworkBoostTimer > 0
        ? Math.min(110, baseFov + 8)
        : this.isGliding
          ? Math.min(106, baseFov + 4)
          : this.stealthTimer > 0
            ? Math.max(58, baseFov - 2)
            : baseFov;
    this.fovCurrent = THREE.MathUtils.damp(this.fovCurrent, desiredFov, 9, dt);
    if (Math.abs(this.camera.fov - this.fovCurrent) > 0.05) {
      this.camera.fov = this.fovCurrent;
      this.camera.updateProjectionMatrix();
    }

    if (this.calloutTimer > 0) this.calloutTimer = Math.max(0, this.calloutTimer - dt);
    if (this.hitmarkerTimer > 0) this.hitmarkerTimer = Math.max(0, this.hitmarkerTimer - dt);
    if (this.slashTimer > 0) {
      this.slashTimer = Math.max(0, this.slashTimer - dt);
      const mat = this.slashMesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (this.slashTimer / 0.14) * 0.9;
      if (this.slashTimer <= 0) this.slashMesh.visible = false;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      this.updateCamera(dt);
      return;
    }

    if (this.defeatDelayTimer > 0) {
      this.defeatDelayTimer -= dt;
      this.updateParticles(dt);
      this.updateCamera(dt);
      if (this.defeatDelayTimer <= 0) {
        this.triggerEndGame('defeat');
      }
      return;
    }

    if (this.screen === 'gameover') {
      this.updateParticles(dt);
      this.updateShockwaves(dt);
      this.updateCamera(dt);
      return;
    }

    this.elapsedTime += dt;
    if (!this.isNetworkedMode()) {
      this.offlineMapTimer += dt;
      if (this.offlineMapTimer >= MAP_ROTATION_SECONDS) {
        this.offlineMapTimer = 0;
        this.applyArenaMap(getNextMapId(this.currentMapId), true);
      }
    }

    const loadout = this.getCurrentLoadout();
    const maxCds = [
      loadout[0].id === 'crossbow' ? 1.35 : loadout[0].cooldown,
      loadout[1].id === 'crossbow' ? 1.35 : loadout[1].cooldown,
      loadout[2].id === 'crossbow' ? 1.35 : loadout[2].cooldown,
      loadout[3].id === 'crossbow' ? 1.35 : loadout[3].cooldown,
      loadout[4].id === 'crossbow' ? 1.35 : loadout[4].cooldown,
      loadout[5].id === 'crossbow' ? 1.35 : loadout[5].cooldown,
    ];
    tickSlotRecharge(
      this.slotCharges,
      this.slotMaxCharges,
      this.slotCooldowns,
      maxCds,
      this.slotUseDelays,
      dt
    );

    if (this.elytraCooldown > 0) this.elytraCooldown = Math.max(0, this.elytraCooldown - dt);
    if (this.fireworkCooldown > 0) this.fireworkCooldown = Math.max(0, this.fireworkCooldown - dt);
    if (this.fireworkBoostTimer > 0) this.fireworkBoostTimer = Math.max(0, this.fireworkBoostTimer - dt);
    if (this.stealthTimer > 0) {
      this.stealthTimer = Math.max(0, this.stealthTimer - dt);
      if (this.stealthTimer <= 0) this.playerRig.setOpacity(1);
    }

    if (this.attackBuffer > 0) {
      this.attackBuffer = Math.max(0, this.attackBuffer - dt);
      if (this.slotCooldowns[this.activeSlot] <= 0 || this.slotMaxCharges[this.activeSlot] > 1) {
        this.triggerPrimaryAction();
      }
    }

    this.updateCobwebs(dt);
    this.updateHazardPools(dt);
    this.updateTntFuses(dt, timeSec);
    this.updatePlacedBlocks(dt);
    this.updatePlayer(dt, timeSec);
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.updateRemotePeers(dt);
    this.updateParticles(dt);
    this.updateShockwaves(dt);
    this.updateCamera(dt);

    if (this.isNetworkedMode()) {
      this.netStateThrottle += dt;
      if (this.netStateThrottle >= 0.05) {
        this.netStateThrottle = 0;
        this.net.send({
          type: 'player_state',
          x: this.playerPos.x,
          y: this.playerPos.y,
          z: this.playerPos.z,
          yaw: this.playerYaw,
          pitch: this.playerPitch,
          vx: this.playerVel.x,
          vy: this.playerVel.y,
          vz: this.playerVel.z,
          activeSlot: this.getCurrentLoadout()[this.activeSlot].id,
          isBlocking: this.isBlocking,
          isGliding: this.isGliding,
          isStealthed: this.stealthTimer > 0,
          swingSeq: this.localSwingSeq,
        });
      }
    }

    this.hudThrottle += dt;
    if (this.hudThrottle >= 0.08) {
      this.hudThrottle = 0;
      this.emitHud(false);
    }
  }

  private updateCobwebs(dt: number): void {
    const holdingBreak =
      this.screen === 'playing' &&
      this.localRespawnTimer <= 0 &&
      (this.mouseDownLeft || this.keys.has('KeyJ') || this.mobileAttackHeld);

    let targetWeb: ActiveCobweb | null = null;
    let bestDist = 4.2;

    for (const w of this.cobwebs) {
      if (!w.active) continue;
      w.life -= dt;
      if (w.ownerGrace > 0) w.ownerGrace = Math.max(0, w.ownerGrace - dt);
      if (w.life <= 0) {
        w.active = false;
        w.breakProgress = 0;
        w.mesh.visible = false;
        continue;
      }

      const d = Math.hypot(w.x - this.playerPos.x, w.y - this.playerPos.y, w.z - this.playerPos.z);
      if (holdingBreak && d < bestDist) {
        bestDist = d;
        targetWeb = w;
      }
    }

    for (const w of this.cobwebs) {
      if (!w.active || w === targetWeb) continue;
      if (w.breakProgress > 0) {
        w.breakProgress = Math.max(0, w.breakProgress - dt * 1.2);
      }
    }

    if (targetWeb) {
      targetWeb.breakProgress = Math.min(3.0, targetWeb.breakProgress + dt);
      this.cobwebBreakProgress = targetWeb.breakProgress / 3.0;
      if (this.swingTimer <= 0.05) {
        this.swingTimer = 0.24;
      }
      this.cobwebHoldSoundTimer -= dt;
      if (this.cobwebHoldSoundTimer <= 0) {
        this.cobwebHoldSoundTimer = 0.42;
        this.audio.playCobwebHoldTick();
        this.spawnParticles(targetWeb.x, targetWeb.y + 0.65, targetWeb.z, 4, 0xf8fafc, 3.2);
      }
      if (targetWeb.breakProgress >= 3.0) {
        targetWeb.active = false;
        targetWeb.breakProgress = 0;
        targetWeb.mesh.visible = false;
        this.cobwebBreakProgress = 0;
        this.audio.playCobwebSlice();
        this.spawnParticles(targetWeb.x, targetWeb.y + 0.7, targetWeb.z, 18, 0xf8fafc, 6.2);
        this.pushCallout('거미줄을 제거했습니다!', '#0284c7');
        this.emitWorldEvent({ kind: 'cobweb_clear', x: targetWeb.x, z: targetWeb.z });
      }
    } else {
      this.cobwebBreakProgress = 0;
      this.cobwebHoldSoundTimer = 0;
    }
  }

  private updateHazardPools(dt: number): void {
    for (const h of this.hazardPools) {
      if (!h.active) continue;
      h.life -= dt;
      if (h.ownerGrace > 0) h.ownerGrace = Math.max(0, h.ownerGrace - dt);
      if (h.life <= 0) {
        h.active = false;
        h.mesh.visible = false;
        continue;
      }
      if (h.kind === 'lava' && Math.random() < dt * 4.5) {
        this.spawnParticles(
          h.x + (Math.random() - 0.5) * 2.2,
          h.y + 0.15,
          h.z + (Math.random() - 0.5) * 2.2,
          1,
          0xf97316,
          2.2
        );
      }
    }
  }

  private updateTntFuses(dt: number, timeSec: number): void {
    for (const t of this.tntFuses) {
      if (!t.active) continue;
      t.fuse -= dt;

      if (!t.grounded) {
        t.vel.y += GRAVITY * 0.65 * dt;
        t.pos.addScaledVector(t.vel, dt);
        const sup = getSupportHeightAt(t.pos.x, t.pos.z, t.pos.y, 0.42, this.blocks);
        if (t.pos.y <= sup + 0.42) {
          t.pos.y = sup + 0.42;
          t.vel.set(0, 0, 0);
          t.grounded = true;
        }
        t.mesh.rotation.y += dt * 7;
      }

      // Blinking scale pulse during fuse countdown
      const pulse = 1 + Math.sin(timeSec * 36) * 0.12;
      t.mesh.position.copy(t.pos);
      t.mesh.scale.setScalar(pulse);

      // Direct hit on hostile enemy or player triggers instant explosion!
      let directHit = false;
      for (const e of this.enemies) {
        if (
          e.alive &&
          e.koTimer <= 0 &&
          e.id !== t.ownerId &&
          canDamageTarget(this.mpState.roomMode, t.ownerTeam, e.team) &&
          Math.hypot(t.pos.x - e.pos.x, t.pos.z - e.pos.z) < 1.35 &&
          Math.abs(t.pos.y - (e.pos.y + 1)) < 1.35
        ) {
          directHit = true;
          break;
        }
      }
      if (
        !directHit &&
        t.ownerId !== (this.mpState.selfId ?? 'player') &&
        canDamageTarget(this.mpState.roomMode, t.ownerTeam, this.getLocalPlayerTeam()) &&
        Math.hypot(t.pos.x - this.playerPos.x, t.pos.z - this.playerPos.z) < 1.35 &&
        Math.abs(t.pos.y - (this.playerPos.y + 1)) < 1.35
      ) {
        directHit = true;
      }

      if (t.fuse <= 0 || directHit) {
        t.active = false;
        t.mesh.visible = false;
        this.detonateTnt(t.pos, t.ownerId, t.ownerId === (this.mpState.selfId ?? 'player'), t.ownerTeam);
      }
    }
  }

  private updatePlacedBlocks(dt: number): void {
    const expired = new Set<string>();
    for (const entry of this.placedBlocks) {
      entry.life -= dt;
      if (entry.life <= 0) {
        expired.add(entry.block.id);
      }
    }
    if (expired.size > 0) {
      this.removePlacedBlocksByIds(expired);
    }
  }

  private animateIdleFighter(rig: FighterRig, t: number): void {
    rig.bodyGroup.position.y = Math.sin(t * 2.2) * 0.04;
    rig.leftArmPivot.rotation.x = Math.sin(t * 1.8) * 0.06;
    rig.rightArmPivot.rotation.x = -0.2 + Math.cos(t * 1.8) * 0.06;
    rig.wingsGroup.visible = false;
  }

  private updatePlayer(dt: number, timeSec: number): void {
    if (this.localRespawnTimer > 0) {
      this.localRespawnTimer = Math.max(0, this.localRespawnTimer - dt);
      this.syncCameraVisibility();
      if (this.localRespawnTimer <= 0) {
        this.respawnLocalPlayerInMp();
      }
      return;
    }

    const prof = CHARACTERS[this.selectedCharId];
    const lockedMode = this.cameraMode !== 'free';

    if (this.keys.has('ArrowLeft') || this.keys.has('KeyQ')) this.targetYaw += dt * 2.8;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyE')) this.targetYaw -= dt * 2.8;
    if (this.edgeTurnDir !== 0 && lockedMode && !this.pointerLocked) {
      this.targetYaw += this.edgeTurnDir * dt * 2.5;
    }
    if (this.edgePitchDir !== 0 && lockedMode && !this.pointerLocked) {
      this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + this.edgePitchDir * dt * 1.9, -1.46, 1.42);
    }
    if (this.keys.has('ArrowUp')) this.targetPitch = Math.min(1.42, this.targetPitch + dt * 1.9);
    if (this.keys.has('ArrowDown')) this.targetPitch = Math.max(-1.46, this.targetPitch - dt * 1.9);

    const rotSmooth = this.isGliding ? 16 : 30;
    this.playerYaw = THREE.MathUtils.damp(this.playerYaw, this.targetYaw, rotSmooth, dt);
    this.playerPitch = THREE.MathUtils.damp(this.playerPitch, this.targetPitch, rotSmooth, dt);

    let moveForward = 0;
    let moveRight = 0;
    if (this.keys.has('KeyW')) moveForward += 1;
    if (this.keys.has('KeyS')) moveForward -= 1;
    if (this.keys.has('KeyD')) moveRight += 1;
    if (this.keys.has('KeyA')) moveRight -= 1;

    _forward.set(-Math.sin(this.playerYaw), 0, -Math.cos(this.playerYaw));
    _right.set(Math.cos(this.playerYaw), 0, -Math.sin(this.playerYaw));

    _v1.set(0, 0, 0).addScaledVector(_forward, moveForward).addScaledVector(_right, moveRight);
    const hasMoveInput = _v1.lengthSq() > 0.01;
    if (hasMoveInput) _v1.normalize();

    let inWeb = false;
    for (const w of this.cobwebs) {
      if (!w.active || w.ownerGrace > 0) continue;
      if (isInsideCobweb(this.playerPos.x, this.playerPos.y, this.playerPos.z, [w])) {
        inWeb = true;
        break;
      }
    }
    this.playerInCobweb = inWeb;

    const selfOwnerId = this.mpState.selfId ?? 'player';
    const activePools = this.hazardPools.filter((h) => h.active);
    const hostilePools = activePools.filter((h) => h.kind !== 'lava' || h.ownerId !== selfOwnerId);
    const inLava = isInsideHazardPool(this.playerPos.x, this.playerPos.y, this.playerPos.z, hostilePools, 'lava');
    const inWater = isInsideHazardPool(this.playerPos.x, this.playerPos.y, this.playerPos.z, activePools, 'water');
    this.playerInLava = inLava;
    this.playerInWater = inWater;

    if (inWater) {
      this.playerBurnTimer = 0;
      this.wasInLava = false;
      this.playerFallStartY = this.playerPos.y;
    } else if (inLava) {
      if (!this.wasInLava) {
        // Immediate heavy burst when stepping into lava
        this.playerHp = Math.max(0, this.playerHp - 16);
        this.playerBurnTickTimer = 0.35;
        this.audio.playLavaSizzle();
        this.audio.playPlayerHurt();
        this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.25);
        this.spawnParticles(this.playerPos.x, this.playerPos.y + 0.8, this.playerPos.z, 10, 0xf97316, 5.2);
        if (this.isNetworkedMode()) {
          this.net.send({ type: 'heal_sync', hp: this.playerHp, absorption: this.playerAbsorption });
        }
        if (this.playerHp <= 0 && this.defeatDelayTimer <= 0 && this.localRespawnTimer <= 0) {
          this.deaths += 1;
          this.audio.playDeath(true);
          if (this.mode === 'online_world' || this.mode === 'multiplayer') {
            this.localRespawnTimer = 2.2;
            this.pushCallout('용암에 녹아 처치됨 · 2.2초 후 부활', '#f97316');
          } else {
            this.defeatDelayTimer = 0.4;
          }
          this.addKillFeed('용암 화상으로 사망', '#f97316');
        }
      }
      this.wasInLava = true;
      this.playerBurnTimer = 3.0;
    } else {
      this.wasInLava = false;
    }

    if (this.playerBurnTimer > 0) {
      this.playerBurnTimer -= dt;
      this.playerBurnTickTimer -= dt;
      if (this.playerBurnTickTimer <= 0) {
        const lavaTickDmg = inLava ? 22 : 9;
        this.playerBurnTickTimer = inLava ? 0.35 : 0.45;
        this.playerHp = Math.max(0, this.playerHp - lavaTickDmg);
        this.audio.playPlayerHurt();
        this.spawnParticles(this.playerPos.x, this.playerPos.y + 1.0, this.playerPos.z, 8, 0xf97316, 4.5);
        if (this.isNetworkedMode()) {
          this.net.send({ type: 'heal_sync', hp: this.playerHp, absorption: this.playerAbsorption });
        }
        if (this.playerHp <= 0 && this.defeatDelayTimer <= 0 && this.localRespawnTimer <= 0) {
          this.deaths += 1;
          this.audio.playDeath(true);
          if (this.mode === 'online_world' || this.mode === 'multiplayer') {
            this.localRespawnTimer = 2.2;
            this.pushCallout('용암 화상으로 처치됨 · 2.2초 후 부활', '#f97316');
          } else {
            this.defeatDelayTimer = 0.45;
          }
          this.addKillFeed('용암 화상으로 사망', '#f97316');
        }
      }
    }

    const autoMobileSprint = this.settings.mobileAutoSprint && this.mobileForwardInput > 0.65;
    const sprinting =
      (this.keys.has('ShiftLeft') || this.mobileSprintLocked || autoMobileSprint) &&
      hasMoveInput &&
      !this.isBlocking;
    const stealthMult = this.stealthTimer > 0 ? 1.35 : 1.0;
    const terrainMult = inWeb ? 0.08 : inLava ? 0.55 : inWater ? 0.78 : 1.0;
    const baseSpeed =
      (this.isBlocking ? 5.2 : sprinting ? 11.4 : 8.8) * prof.speedMult * stealthMult * terrainMult;

    if (this.isGliding && this.playerHp > 0 && this.playerHp < this.playerMaxHp && !inLava) {
      this.elytraHealAccum += 8.0 * dt;
      if (this.elytraHealAccum >= 1) {
        const healAmt = Math.floor(this.elytraHealAccum);
        this.elytraHealAccum -= healAmt;
        this.playerHp = Math.min(this.playerMaxHp, this.playerHp + healAmt);
      }
      this.elytraHealParticleTimer -= dt;
      if (this.elytraHealParticleTimer <= 0) {
        this.elytraHealParticleTimer = 0.24;
        this.spawnParticles(this.playerPos.x, this.playerPos.y + 1.0, this.playerPos.z, 3, 0x22c55e, 2.5);
      }
      this.elytraHealSyncTimer -= dt;
      if (this.elytraHealSyncTimer <= 0 && this.isNetworkedMode()) {
        this.elytraHealSyncTimer = 0.35;
        this.net.send({ type: 'heal_sync', hp: this.playerHp, absorption: this.playerAbsorption });
      }
    } else {
      this.elytraHealAccum = 0;
    }

    if (!this.isGliding) {
      const accel = this.playerOnGround ? 28 : 11;
      this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, _v1.x * baseSpeed, accel, dt);
      this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, _v1.z * baseSpeed, accel, dt);
    } else {
      this.isBlocking = false;
      _aimDir
        .set(
          -Math.sin(this.playerYaw) * Math.cos(this.playerPitch),
          Math.sin(this.playerPitch),
          -Math.cos(this.playerYaw) * Math.cos(this.playerPitch)
        )
        .normalize();

      if (this.fireworkBoostTimer > 0) {
        this.glideSpeed = THREE.MathUtils.damp(this.glideSpeed, 28, 7.5, dt);
        if (Math.random() < 0.75) {
          this.spawnParticles(
            this.playerPos.x - _aimDir.x * 0.7,
            this.playerPos.y + 1.0 - _aimDir.y * 0.7,
            this.playerPos.z - _aimDir.z * 0.7,
            2,
            Math.random() < 0.5 ? 0xf43f5e : 0xfbbf24,
            3.5
          );
        }
      } else {
        // Diving picks up speed; climbing trades momentum gently while keeping smooth cruise
        const diveAccel = -_aimDir.y * 16;
        this.glideSpeed = THREE.MathUtils.clamp(this.glideSpeed + diveAccel * dt - 1.4 * dt, 12, 31);
      }

      const targetVx = _aimDir.x * this.glideSpeed + _v1.x * 4.5;
      const targetVy = _aimDir.y * this.glideSpeed + (this.fireworkBoostTimer > 0 ? 0 : -1.5);
      const targetVz = _aimDir.z * this.glideSpeed + _v1.z * 4.5;
      const glideTurnSteer = this.fireworkBoostTimer > 0 ? 8.5 : 5.5;
      this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, targetVx, glideTurnSteer, dt);
      this.playerVel.y = THREE.MathUtils.damp(this.playerVel.y, targetVy, glideTurnSteer, dt);
      this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, targetVz, glideTurnSteer, dt);
    }

    if (this.playerOnGround) {
      this.playerCoyote = 0.12;
    } else {
      this.playerCoyote = Math.max(0, this.playerCoyote - dt);
    }
    if (this.playerJumpBuffer > 0) {
      this.playerJumpBuffer = Math.max(0, this.playerJumpBuffer - dt);
      if (this.playerCoyote > 0 || inWeb || inWater) {
        this.playerVel.y = inWeb ? 4.8 : 11.2;
        this.playerOnGround = false;
        this.playerCoyote = 0;
        this.playerJumpBuffer = 0;
        this.squashY = 1.2;
        this.audio.playJump();
      }
    }

    if (!this.isGliding) {
      this.playerVel.y += GRAVITY * dt;
    }
    if (inWeb) {
      this.playerVel.y = Math.max(-1.6, this.playerVel.y * 0.85);
      this.playerFallStartY = this.playerPos.y;
    }

    this.playerPos.x += this.playerVel.x * dt;
    this.playerPos.z += this.playerVel.z * dt;
    const resolved = resolveHorizontalCollision(
      this.playerPos.x,
      this.playerPos.y,
      this.playerPos.z,
      PLAYER_RADIUS,
      PLAYER_HEIGHT,
      this.blocks,
      this.currentArenaRadius
    );
    this.playerPos.x = resolved.x;
    this.playerPos.z = resolved.z;

    this.playerPos.y += this.playerVel.y * dt;
    const supportY = getSupportHeightAt(
      this.playerPos.x,
      this.playerPos.z,
      this.playerPos.y,
      PLAYER_RADIUS,
      this.blocks
    );

    if (this.playerPos.y <= supportY) {
      if (!this.playerOnGround && this.playerVel.y < -7) {
        this.squashY = 0.78;
        this.spawnParticles(this.playerPos.x, supportY + 0.05, this.playerPos.z, 5, 0x94a3b8, 3);
      }
      this.playerPos.y = supportY;
      this.playerVel.y = 0;
      this.playerOnGround = true;
      this.isGliding = false;
      this.playerFallStartY = supportY;
    } else {
      this.playerOnGround = false;
      if (this.playerPos.y > this.playerFallStartY) {
        this.playerFallStartY = this.playerPos.y;
      }
    }

    this.playerRig.root.position.copy(this.playerPos);

    let targetRotY = this.playerYaw + Math.PI;
    if (this.cameraMode === 'free' && hasMoveInput && !this.isGliding) {
      targetRotY = Math.atan2(_v1.x, _v1.z);
    }
    const curY = this.playerRig.root.rotation.y;
    let diffY = (targetRotY - curY) % (Math.PI * 2);
    if (diffY > Math.PI) diffY -= Math.PI * 2;
    if (diffY < -Math.PI) diffY += Math.PI * 2;
    this.playerRig.root.rotation.y = curY + diffY * (1 - Math.exp(-18 * dt));

    this.squashY = THREE.MathUtils.damp(this.squashY, 1, 16, dt);
    const invSquash = 1 / Math.sqrt(this.squashY);
    this.playerRig.bodyGroup.scale.set(invSquash, this.squashY, invSquash);

    const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
    this.playerWalkDist += horizSpeed * dt;
    const stride = this.playerOnGround
      ? Math.sin(this.playerWalkDist * 2.2) * Math.min(1, horizSpeed / 7)
      : 0.4;
    this.playerRig.leftLegPivot.rotation.x = stride * 0.68;
    this.playerRig.rightLegPivot.rotation.x = -stride * 0.68;

    if (this.swingTimer > 0) {
      this.swingTimer = Math.max(0, this.swingTimer - dt);
      const t = 1 - this.swingTimer / 0.24;
      this.playerRig.rightArmPivot.rotation.x = -1.7 + Math.sin(t * Math.PI) * 2.1;
      this.playerRig.rightArmPivot.rotation.z = -0.35;

      // Animate 1st-person hand viewmodel
      this.fpRig.handPivot.rotation.x = -Math.sin(t * Math.PI) * 0.95;
      this.fpRig.handPivot.rotation.z = Math.sin(t * Math.PI) * 0.35;
      this.fpRig.handPivot.position.set(0.46 - Math.sin(t * Math.PI) * 0.12, -0.34, -0.62 - Math.sin(t * Math.PI) * 0.14);
    } else {
      this.playerRig.rightArmPivot.rotation.x = -stride * 0.5 - 0.34;
      this.playerRig.rightArmPivot.rotation.z = -0.2;

      const bobX = Math.sin(this.playerWalkDist * 1.4) * Math.min(1, horizSpeed / 8) * 0.025;
      const bobY = Math.abs(Math.cos(this.playerWalkDist * 1.4)) * Math.min(1, horizSpeed / 8) * 0.025 + Math.sin(timeSec * 2) * 0.005;
      this.fpRig.handPivot.rotation.set(0, 0, 0);
      this.fpRig.handPivot.position.set(0.46 + bobX, -0.34 - bobY, -0.62);
    }

    this.fpRig.shieldGroup.visible = this.isBlocking;
    this.playerRig.shieldMesh.visible = this.isBlocking;
    this.playerRig.leftArmPivot.rotation.x = this.isBlocking ? -1.1 : stride * 0.5;
    this.playerRig.leftArmPivot.rotation.y = this.isBlocking ? 0.55 : 0;

    this.playerRig.wingsGroup.visible = this.isGliding || !this.playerOnGround;
    if (this.isGliding) {
      this.playerRig.leftWing.rotation.z = THREE.MathUtils.damp(this.playerRig.leftWing.rotation.z, 0.92, 10, dt);
      this.playerRig.rightWing.rotation.z = THREE.MathUtils.damp(this.playerRig.rightWing.rotation.z, -0.92, 10, dt);
      const glideBodyPitch = THREE.MathUtils.clamp(0.55 - this.playerPitch * 0.52, 0.12, 1.05);
      const bankRoll = THREE.MathUtils.clamp((this.targetYaw - this.playerYaw) * 2.4, -0.45, 0.45);
      this.playerRig.bodyGroup.rotation.x = THREE.MathUtils.damp(this.playerRig.bodyGroup.rotation.x, glideBodyPitch, 10, dt);
      this.playerRig.bodyGroup.rotation.z = THREE.MathUtils.damp(this.playerRig.bodyGroup.rotation.z, bankRoll, 10, dt);
    } else {
      this.playerRig.leftWing.rotation.z = THREE.MathUtils.damp(this.playerRig.leftWing.rotation.z, 0.18, 12, dt);
      this.playerRig.rightWing.rotation.z = THREE.MathUtils.damp(this.playerRig.rightWing.rotation.z, -0.18, 12, dt);
      this.playerRig.bodyGroup.rotation.x = THREE.MathUtils.damp(this.playerRig.bodyGroup.rotation.x, 0, 12, dt);
      this.playerRig.bodyGroup.rotation.z = THREE.MathUtils.damp(this.playerRig.bodyGroup.rotation.z, 0, 12, dt);
    }

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
      if (this.hitFlashTimer <= 0) this.playerRig.setHitFlash(false);
    }

    this.playerRig.shadowDisc.position.y = supportY - this.playerPos.y + 0.025;
    this.syncCameraVisibility();
  }

  private updateProjectiles(dt: number): void {
    const localSelfId = this.mpState.selfId ?? 'player';
    const localTeam = this.getLocalPlayerTeam();

    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.kind === 'ender_pearl' || p.kind === 'cobweb_orb') {
        p.vel.y += GRAVITY * 0.52 * dt;
      } else if (p.kind === 'arrow' || p.kind === 'bolt') {
        p.vel.y += GRAVITY * 0.16 * dt;
      }
      p.pos.addScaledVector(p.vel, dt);

      if (p.kind === 'arrow' || p.kind === 'bolt') {
        p.arrowGroup.position.copy(p.pos);
        p.arrowGroup.lookAt(p.pos.x + p.vel.x, p.pos.y + p.vel.y, p.pos.z + p.vel.z);
      } else {
        p.mesh.position.copy(p.pos);
        p.mesh.rotation.y += dt * 12;
      }

      const sup = getSupportHeightAt(p.pos.x, p.pos.z, p.pos.y, 0.22, this.blocks);
      let hitBlock = p.pos.y <= sup;
      if (!hitBlock) {
        for (const b of this.blocks) {
          if (
            Math.abs(p.pos.x - b.x) <= b.w * 0.5 + 0.2 &&
            Math.abs(p.pos.z - b.z) <= b.d * 0.5 + 0.2 &&
            p.pos.y >= b.y &&
            p.pos.y <= b.y + b.h
          ) {
            hitBlock = true;
            break;
          }
        }
      }

      let hitEnemy: AiFighter | null = null;
      let hitPeer: RemotePeerActor | null = null;
      let hitLocalPlayer = false;

      for (const e of this.enemies) {
        if (!e.alive || e.koTimer > 0 || e.id === p.ownerId) continue;
        if (p.ownerId !== localSelfId && !canDamageTarget(this.mpState.roomMode, p.ownerTeam, e.team)) continue;
        if (p.ownerId === localSelfId && !canDamageTarget(this.mpState.roomMode, localTeam, e.team)) continue;
        if (
          Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z) < 1.25 &&
          p.pos.y >= e.pos.y &&
          p.pos.y <= e.pos.y + 2.15
        ) {
          hitEnemy = e;
          break;
        }
      }

      if (!hitEnemy && p.ownerId === localSelfId) {
        for (const peer of this.remotePeers.values()) {
          if (!peer.alive) continue;
          if (!canDamageTarget(this.mpState.roomMode, localTeam, peer.team)) continue;
          if (
            Math.hypot(p.pos.x - peer.pos.x, p.pos.z - peer.pos.z) < 1.25 &&
            p.pos.y >= peer.pos.y &&
            p.pos.y <= peer.pos.y + 2.15
          ) {
            hitPeer = peer;
            break;
          }
        }
      }

      if (
        !hitEnemy &&
        !hitPeer &&
        p.ownerId !== localSelfId &&
        this.localRespawnTimer <= 0 &&
        canDamageTarget(this.mpState.roomMode, p.ownerTeam, localTeam) &&
        Math.hypot(p.pos.x - this.playerPos.x, p.pos.z - this.playerPos.z) < 1.2 &&
        p.pos.y >= this.playerPos.y &&
        p.pos.y <= this.playerPos.y + 2.1
      ) {
        hitLocalPlayer = true;
      }

      if (hitBlock || hitEnemy || hitPeer || hitLocalPlayer || p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        p.arrowGroup.visible = false;

        const dLen = Math.hypot(p.vel.x, p.vel.z) || 1;
        const dirX = p.vel.x / dLen;
        const dirZ = p.vel.z / dLen;

        if (p.kind === 'wind_charge') {
          this.detonateWindCharge(p.pos, p.ownerId, p.ownerId === localSelfId, p.ownerTeam);
        } else if (p.kind === 'ender_pearl') {
          if (p.ownerId === localSelfId) {
            this.detonateEnderPearl(p.pos);
          }
        } else if (p.kind === 'cobweb_orb') {
          const wy = hitEnemy
            ? hitEnemy.pos.y
            : hitPeer
              ? hitPeer.pos.y
              : hitLocalPlayer
                ? this.playerPos.y
                : getSupportHeightAt(p.pos.x, p.pos.z, p.pos.y + 0.6, 0.5, this.blocks);
          this.spawnCobwebAt(p.pos.x, wy, p.pos.z, p.ownerId === localSelfId);
          if (hitEnemy) {
            this.pushCallout(`${hitEnemy.name} 거미줄 포박!`, '#e2e8f0');
          } else if (hitPeer) {
            this.pushCallout(`${hitPeer.name} 거미줄 포박!`, '#e2e8f0');
          }
        } else if (p.kind === 'trident' || p.kind === 'arrow' || p.kind === 'bolt') {
          const isArrow = p.kind === 'arrow' || p.kind === 'bolt';
          const label = p.kind === 'arrow' ? '정밀 장궁' : p.kind === 'bolt' ? '속사 석궁' : '삼지창';
          const kb = p.kind === 'arrow' ? 8.5 : p.kind === 'bolt' ? 5.2 : 11;

          if (hitPeer) {
            const isCrit =
              !isArrow ||
              p.pos.y >= hitPeer.pos.y + 1.42 ||
              !this.playerOnGround;
            const dmg = isArrow && isCrit ? Math.round(p.damage * 1.35) : p.damage || 24;
            this.applyHitToRemotePeer(hitPeer, dmg, isCrit, false, dirX, dirZ, kb, false);
          } else if (hitEnemy) {
            const isHeadOrAir =
              !isArrow ||
              p.pos.y >= hitEnemy.pos.y + 1.42 ||
              !hitEnemy.onGround ||
              !this.playerOnGround;
            const dmg = isArrow && isHeadOrAir ? Math.round((p.damage || 20) * 1.35) : p.damage || 24;
            if (p.ownerId === localSelfId) {
              this.applyHitToEnemy(hitEnemy, dmg, isHeadOrAir, false, false, dirX, dirZ, kb, label);
            } else {
              // AI vs AI projectile hit
              const res = applyCombatDamage(
                { hp: hitEnemy.hp, maxHp: hitEnemy.maxHp, absorption: hitEnemy.absorption, isBlocking: hitEnemy.isBlocking },
                dmg,
                false
              );
              hitEnemy.hp = res.remainingHp;
              hitEnemy.absorption = res.remainingAbsorption;
              hitEnemy.overhead.updateHp(hitEnemy.hp / hitEnemy.maxHp);
              hitEnemy.hitFlashTimer = 0.11;
              hitEnemy.rig.setHitFlash(true);
              hitEnemy.vel.x += dirX * kb * 0.7;
              hitEnemy.vel.z += dirZ * kb * 0.7;
              this.spawnParticles(hitEnemy.pos.x, hitEnemy.pos.y + 1.2, hitEnemy.pos.z, 10, 0xef4444, 5.5);
              if (hitEnemy.hp <= 0) {
                hitEnemy.koTimer = 0.42;
                hitEnemy.deaths += 1;
                const shooter = this.enemies.find((e) => e.id === p.ownerId);
                if (shooter) shooter.kills += 1;
                this.addKillFeed(`${shooter?.name ?? 'AI'} ⚔ ${hitEnemy.name} (${label})`, '#94a3b8');
              }
            }
          } else if (hitLocalPlayer) {
            const isCrit = isArrow && p.pos.y >= this.playerPos.y + 1.45;
            const dmg = isCrit ? Math.round((p.damage || 16) * 1.3) : Math.max(8, p.damage || 16);
            const attacker = this.enemies.find((e) => e.id === p.ownerId);
            this.applyDamageToLocalPlayer(dmg, isCrit, dirX, dirZ, kb * 0.75, attacker?.name ?? label);
          } else {
            this.spawnParticles(
              p.pos.x,
              p.pos.y + 0.15,
              p.pos.z,
              8,
              isArrow ? 0xe0f2fe : 0x2dd4bf,
              4.2
            );
          }
        }
      }
    }
  }

  private updateEnemies(dt: number): void {
    let activeTokens = 0;
    for (const e of this.enemies) {
      if (e.alive && e.telegraphTimer > 0) activeTokens++;
    }

    const activePools = this.hazardPools.filter((h) => h.active);
    const localTeam = this.getLocalPlayerTeam();
    const localSelfId = this.mpState.selfId ?? 'player';

    for (const e of this.enemies) {
      if (!e.alive) {
        if (
          this.mode === 'online_world' ||
          this.mode === 'ffa' ||
          this.mode === 'multiplayer' ||
          (this.mode === 'link_duel' && this.kills < 3)
        ) {
          e.respawnTimer -= dt;
          if (e.respawnTimer <= 0) {
            this.respawnEnemy(e);
          }
        }
        continue;
      }

      if (e.koTimer > 0) {
        e.koTimer -= dt;
        e.overhead.group.visible = false;
        e.rig.root.rotation.x = THREE.MathUtils.damp(e.rig.root.rotation.x, Math.PI * 0.46, 12, dt);
        e.pos.y = Math.max(0, e.pos.y + e.vel.y * dt);
        e.vel.y += GRAVITY * dt;
        e.rig.root.position.copy(e.pos);
        if (e.koTimer <= 0) {
          e.alive = false;
          e.rig.root.visible = false;
          e.respawnTimer = this.mode === 'link_duel' ? 1.4 : 2.8;
        }
        continue;
      }

      if (e.hitFlashTimer > 0) {
        e.hitFlashTimer -= dt;
        if (e.hitFlashTimer <= 0 && e.telegraphTimer <= 0) e.rig.setHitFlash(false);
      }

      e.recoilTilt = THREE.MathUtils.damp(e.recoilTilt, 0, 14, dt);

      const enemyInLava = isInsideHazardPool(e.pos.x, e.pos.y, e.pos.z, activePools, 'lava');
      const enemyInWater = isInsideHazardPool(e.pos.x, e.pos.y, e.pos.z, activePools, 'water');
      if (enemyInWater) {
        e.burnTimer = 0;
      } else if (enemyInLava) {
        e.burnTimer = Math.max(e.burnTimer, 2.2);
      }

      if (e.burnTimer > 0) {
        e.burnTimer -= dt;
        e.burnTickTimer -= dt;
        if (e.burnTickTimer <= 0) {
          const tickDmg = enemyInLava ? 22 : 9;
          e.burnTickTimer = enemyInLava ? 0.35 : 0.45;
          e.hp = Math.max(0, e.hp - tickDmg);
          e.overhead.updateHp(e.hp / e.maxHp);
          this.damageDealt += tickDmg;
          this.spawnParticles(e.pos.x, e.pos.y + 1.1, e.pos.z, 8, 0xf97316, 4.5);
          if (e.hp <= 0) {
            this.handleEnemyKo(e, enemyInLava ? '용암 화상' : '화상');
            continue;
          }
        }
      }

      e.attackCooldown = Math.max(0, e.attackCooldown - dt);
      e.windCd = Math.max(0, e.windCd - dt);
      e.pearlCd = Math.max(0, e.pearlCd - dt);
      e.specialCd = Math.max(0, e.specialCd - dt);
      e.healCd = Math.max(0, e.healCd - dt);
      if (e.stealthTimer > 0) {
        e.stealthTimer = Math.max(0, e.stealthTimer - dt);
        e.rig.setOpacity(e.stealthTimer > 0 ? 0.28 : 1);
      }

      e.strafeTimer -= dt;
      if (e.strafeTimer <= 0) {
        e.strafeDir *= -1;
        e.strafeTimer = 1.2 + Math.random() * 1.4;
      }

      const enemyWebbed = isInsideCobweb(e.pos.x, e.pos.y, e.pos.z, this.cobwebs);

      // Extinguish self with water_bucket if burning
      if (
        e.burnTimer > 0 &&
        e.specialCd <= 0 &&
        e.profile.loadout.some((item) => item.id === 'water_bucket')
      ) {
        e.specialCd = 5.5;
        e.burnTimer = 0;
        this.spawnHazardPool('water', e.pos.x, e.pos.y, e.pos.z, e.id, false);
      }

      // Smart healing skill (gapple / potion) with proper cooldown
      if (e.hp < e.maxHp * 0.42 && e.healCd <= 0) {
        const hasGapple = e.profile.loadout.some((item) => item.id === 'gapple');
        const hasPotion = e.profile.loadout.some((item) => item.id === 'potion');
        if (hasGapple) {
          e.healCd = 11.0;
          e.hp = e.maxHp;
          e.absorption = Math.min(20, e.absorption + 15);
          this.spawnParticles(e.pos.x, e.pos.y + 1.1, e.pos.z, 18, 0xfacc15, 7);
        } else if (hasPotion) {
          e.healCd = 7.5;
          e.hp = Math.min(e.maxHp, e.hp + 65);
          this.spawnParticles(e.pos.x, e.pos.y + 1.1, e.pos.z, 16, 0xf43f5e, 6.5);
        } else {
          e.healCd = 10.0;
          e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.35);
          this.spawnParticles(e.pos.x, e.pos.y + 1.1, e.pos.z, 14, 0xfacc15, 6);
        }
        e.overhead.updateHp(e.hp / e.maxHp);
      }

      // Acquire nearest hostile target (player, remote peer, or opposing team AI)
      let targetKind: 'player' | 'enemy' | 'peer' | null = null;
      let targetEnemy: AiFighter | null = null;
      let targetPeer: RemotePeerActor | null = null;
      let targetPos = this.playerPos;
      let bestTargetDist = Infinity;

      if (
        this.stealthTimer <= 0 &&
        this.localRespawnTimer <= 0 &&
        canDamageTarget(this.mpState.roomMode, e.team, localTeam)
      ) {
        const dPlayer = Math.hypot(this.playerPos.x - e.pos.x, this.playerPos.z - e.pos.z);
        bestTargetDist = dPlayer;
        targetKind = 'player';
        targetPos = this.playerPos;
      }

      for (const other of this.enemies) {
        if (other === e || !other.alive || other.koTimer > 0 || other.stealthTimer > 0) continue;
        if (!canDamageTarget(this.mpState.roomMode, e.team, other.team)) continue;
        // In FFA, prefer engaging the player unless player is far/stealthed or bot is much closer
        const dOther = Math.hypot(other.pos.x - e.pos.x, other.pos.z - e.pos.z);
        const weight = this.mpState.roomMode === 'team' ? dOther : dOther + 5.0;
        if (weight < bestTargetDist) {
          bestTargetDist = weight;
          targetKind = 'enemy';
          targetEnemy = other;
          targetPos = other.pos;
        }
      }

      for (const peer of this.remotePeers.values()) {
        if (!peer.alive || peer.isStealthed) continue;
        if (!canDamageTarget(this.mpState.roomMode, e.team, peer.team)) continue;
        const dPeer = Math.hypot(peer.pos.x - e.pos.x, peer.pos.z - e.pos.z);
        if (dPeer < bestTargetDist) {
          bestTargetDist = dPeer;
          targetKind = 'peer';
          targetPeer = peer;
          targetPos = peer.pos;
        }
      }

      const dx = targetKind
        ? targetPos.x - e.pos.x
        : Math.sin(this.elapsedTime * 0.8 + e.pos.x) * 8;
      const dz = targetKind
        ? targetPos.z - e.pos.z
        : Math.cos(this.elapsedTime * 0.8 + e.pos.z) * 8;
      const dist = Math.hypot(dx, dz) || 0.01;
      const dirX = dx / dist;
      const dirZ = dz / dist;
      e.yaw = Math.atan2(dirX, dirZ);

      let moveX = 0;
      let moveZ = 0;
      const hazardMult = enemyWebbed ? 0.16 : enemyInLava ? 0.55 : enemyInWater ? 0.8 : 1.0;
      const stealthSpeedMult = e.stealthTimer > 0 ? 1.28 : 1.0;
      const speed = (e.isBoss ? 6.6 : 6.2) * e.profile.speedMult * hazardMult * stealthSpeedMult;

      const hasWeapon = (id: WeaponSlotId) => e.profile.loadout.some((item) => item.id === id);

      if (e.policy === 'ranged_kite') {
        const isCrossbow = hasWeapon('crossbow');
        e.rig.setActiveWeapon(isCrossbow ? 'crossbow' : 'bow');
        if (dist > 22) {
          moveX = dirX + -dirZ * 0.3 * e.strafeDir;
          moveZ = dirZ + dirX * 0.3 * e.strafeDir;
        } else if (dist < 9.5) {
          moveX = -dirX * 0.9 + -dirZ * 0.65 * e.strafeDir;
          moveZ = -dirZ * 0.9 + dirX * 0.65 * e.strafeDir;
        } else {
          moveX = -dirZ * e.strafeDir;
          moveZ = dirX * e.strafeDir;
        }

        // Defensive peel skill when enemy gets close
        if (targetKind && !enemyWebbed && e.specialCd <= 0 && dist < 10.5) {
          e.specialCd = 5.2;
          _v1.set(e.pos.x, e.pos.y + 1.45, e.pos.z);
          _v2.set(dx, (targetPos.y + 1.1) - (e.pos.y + 1.45), dz).normalize();
          if (hasWeapon('wind_charge')) {
            this.fireProjectile('wind_charge', { ownerId: e.id, ownerTeam: e.team, origin: _v1, dir: _v2 });
          } else if (hasWeapon('cobweb')) {
            this.fireProjectile('cobweb_orb', { ownerId: e.id, ownerTeam: e.team, origin: _v1, dir: _v2 });
          } else if (hasWeapon('shadow_step')) {
            e.stealthTimer = 2.0;
            e.rig.setOpacity(0.28);
            e.vel.x -= dirX * 12;
            e.vel.z -= dirZ * 12;
            this.spawnParticles(e.pos.x, e.pos.y + 1, e.pos.z, 14, 0x818cf8, 6);
          }
        }

        // Fire bow / crossbow projectile!
        if (targetKind && e.attackCooldown <= 0 && dist < 44 && Math.abs(targetPos.y - e.pos.y) < 16) {
          e.attackCooldown = isCrossbow ? 0.85 : 1.35;
          e.swingTimer = 0.22;
          _v1.set(e.pos.x, e.pos.y + 1.48, e.pos.z);
          _v2
            .set(
              targetPos.x - e.pos.x,
              (targetPos.y + 1.25) - (e.pos.y + 1.48) + dist * 0.015,
              targetPos.z - e.pos.z
            )
            .normalize();
          this.fireProjectile(isCrossbow ? 'bolt' : 'arrow', {
            ownerId: e.id,
            ownerTeam: e.team,
            origin: _v1,
            dir: _v2,
            damage: Math.round((isCrossbow ? 13 : 19) * e.profile.damageMult),
          });
        }
      } else if (e.policy === 'wind_diver') {
        if (dist > 3.8) {
          moveX = dirX + -dirZ * 0.45 * e.strafeDir;
          moveZ = dirZ + dirX * 0.45 * e.strafeDir;
        }
        if (e.onGround && !enemyWebbed && e.windCd <= 0 && dist < 14) {
          e.windCd = 3.2;
          e.vel.y = 16.0;
          e.onGround = false;
          e.fallStartY = e.pos.y + 8;
          this.spawnParticles(e.pos.x, e.pos.y + 0.3, e.pos.z, 16, 0x38bdf8, 8);
          this.audio.playWindCharge();
        } else if (targetKind && e.specialCd <= 0 && dist >= 7 && dist < 20 && hasWeapon('wind_charge')) {
          e.specialCd = 4.6;
          _v1.set(e.pos.x, e.pos.y + 1.45, e.pos.z);
          _v2.set(dx, (targetPos.y + 0.8) - (e.pos.y + 1.45), dz).normalize();
          this.fireProjectile('wind_charge', { ownerId: e.id, ownerTeam: e.team, origin: _v1, dir: _v2 });
        }
      } else if (e.policy === 'pearl_flanker') {
        if (dist > 8) {
          moveX = dirX;
          moveZ = dirZ;
        } else if (dist < 4) {
          moveX = -dirX * 0.7 + -dirZ * e.strafeDir;
          moveZ = -dirZ * 0.7 + dirX * e.strafeDir;
        } else {
          moveX = -dirZ * e.strafeDir;
          moveZ = dirX * e.strafeDir;
        }
        if (targetKind && !enemyWebbed && e.specialCd <= 0 && dist > 4 && dist < 15) {
          e.specialCd = 5.8;
          if (hasWeapon('shadow_step')) {
            e.stealthTimer = 2.1;
            e.rig.setOpacity(0.28);
            e.vel.x += dirX * 13;
            e.vel.z += dirZ * 13;
            this.spawnParticles(e.pos.x, e.pos.y + 1, e.pos.z, 16, 0x818cf8, 7);
          } else if (hasWeapon('cobweb')) {
            _v1.set(e.pos.x, e.pos.y + 1.45, e.pos.z);
            _v2.set(dx, (targetPos.y + 0.9) - (e.pos.y + 1.45) + 0.14, dz).normalize();
            this.fireProjectile('cobweb_orb', { ownerId: e.id, ownerTeam: e.team, origin: _v1, dir: _v2 });
          }
        }
        if (targetKind && !enemyWebbed && e.pearlCd <= 0 && dist > 6 && dist < 24) {
          e.pearlCd = 4.5;
          this.spawnParticles(e.pos.x, e.pos.y + 1, e.pos.z, 14, 0xc084fc, 6);
          e.pos.x = THREE.MathUtils.clamp(
            targetPos.x - dirX * 4.0 + dirZ * 2.2,
            -this.currentArenaRadius + 2,
            this.currentArenaRadius - 2
          );
          e.pos.z = THREE.MathUtils.clamp(
            targetPos.z - dirZ * 4.0 - dirX * 2.2,
            -this.currentArenaRadius + 2,
            this.currentArenaRadius - 2
          );
          this.spawnParticles(e.pos.x, e.pos.y + 1, e.pos.z, 18, 0xa855f7, 8);
          this.audio.playPearlWarp();
        }
      } else if (e.policy === 'bruiser_charger') {
        moveX = dirX;
        moveZ = dirZ;
        e.isBlocking = dist > 3.5 && dist < 9.5 && Math.sin(this.elapsedTime * 3.5) > -0.2;
        if (e.onGround && !enemyWebbed && dist < 5 && e.windCd <= 0) {
          e.windCd = 4.0;
          e.vel.y = 12.0;
          e.onGround = false;
        }
        if (targetKind && e.specialCd <= 0 && dist > 6 && dist < 17 && hasWeapon('tnt_charge')) {
          e.specialCd = 7.0;
          _v1.set(e.pos.x, e.pos.y + 1.45, e.pos.z);
          _v2.set(dx, (targetPos.y + 1.0) - (e.pos.y + 1.45) + 0.18, dz).normalize();
          this.throwTntBlock({ ownerId: e.id, ownerTeam: e.team, origin: _v1, dir: _v2 });
        } else if (targetKind && e.pearlCd <= 0 && dist < 6 && hasWeapon('lava_bucket')) {
          e.pearlCd = 8.5;
          const ly = getSupportHeightAt(targetPos.x, targetPos.z, targetPos.y + 1.2, 0.4, this.blocks);
          this.spawnHazardPool('lava', targetPos.x, ly, targetPos.z, e.id, false);
        }
      } else {
        if (dist > 2.6) {
          moveX = dirX * 0.9 + -dirZ * 0.6 * e.strafeDir;
          moveZ = dirZ * 0.9 + dirX * 0.6 * e.strafeDir;
        } else {
          moveX = -dirZ * e.strafeDir;
          moveZ = dirX * e.strafeDir;
        }
        if (e.onGround && !enemyWebbed && dist < 4.8 && Math.random() < 0.04) {
          e.vel.y = 10.5;
          e.onGround = false;
        }
        if (targetKind && e.specialCd <= 0 && dist > 7 && dist < 24) {
          if (hasWeapon('trident')) {
            e.specialCd = 4.8;
            _v1.set(e.pos.x, e.pos.y + 1.48, e.pos.z);
            _v2.set(dx, (targetPos.y + 1.1) - (e.pos.y + 1.48), dz).normalize();
            this.fireProjectile('trident', {
              ownerId: e.id,
              ownerTeam: e.team,
              origin: _v1,
              dir: _v2,
              damage: Math.round(20 * e.profile.damageMult),
            });
          } else if (hasWeapon('tnt_charge') && dist < 16) {
            e.specialCd = 7.2;
            _v1.set(e.pos.x, e.pos.y + 1.45, e.pos.z);
            _v2.set(dx, (targetPos.y + 1.0) - (e.pos.y + 1.45) + 0.18, dz).normalize();
            this.throwTntBlock({ ownerId: e.id, ownerTeam: e.team, origin: _v1, dir: _v2 });
          } else if (hasWeapon('wind_charge') && dist < 14) {
            e.specialCd = 4.5;
            _v1.set(e.pos.x, e.pos.y + 1.45, e.pos.z);
            _v2.set(dx, (targetPos.y + 0.8) - (e.pos.y + 1.45), dz).normalize();
            this.fireProjectile('wind_charge', { ownerId: e.id, ownerTeam: e.team, origin: _v1, dir: _v2 });
          }
        }
      }

      const mLen = Math.hypot(moveX, moveZ);
      if (mLen > 0.01) {
        moveX /= mLen;
        moveZ /= mLen;
      }

      e.vel.x = THREE.MathUtils.damp(e.vel.x, moveX * speed, 10, dt);
      e.vel.z = THREE.MathUtils.damp(e.vel.z, moveZ * speed, 10, dt);
      e.vel.y += GRAVITY * dt;
      if (enemyWebbed) {
        e.vel.y = Math.max(-1.4, e.vel.y * 0.75);
      }

      e.pos.x += e.vel.x * dt;
      e.pos.z += e.vel.z * dt;
      const resPos = resolveHorizontalCollision(
        e.pos.x,
        e.pos.y,
        e.pos.z,
        PLAYER_RADIUS,
        PLAYER_HEIGHT,
        this.blocks,
        this.currentArenaRadius
      );
      e.pos.x = resPos.x;
      e.pos.z = resPos.z;

      e.pos.y += e.vel.y * dt;
      const supY = getSupportHeightAt(e.pos.x, e.pos.z, e.pos.y, PLAYER_RADIUS, this.blocks);
      if (e.pos.y <= supY) {
        e.pos.y = supY;
        e.vel.y = 0;
        e.onGround = true;
      } else {
        e.onGround = false;
      }

      if (e.telegraphTimer > 0) {
        e.telegraphTimer -= dt;
        e.rig.telegraphRing.visible = true;
        e.rig.telegraphRing.scale.setScalar(1 + Math.sin(this.elapsedTime * 28) * 0.12);
        e.rig.setHitFlash(true, 0xef4444);
        if (e.telegraphTimer <= 0) {
          e.rig.telegraphRing.visible = false;
          e.rig.setHitFlash(false);
          e.swingTimer = 0.25;
          this.executeEnemyAttack(e, dist, dirX, dirZ, targetKind, targetEnemy, targetPeer);
        }
      } else if (
        targetKind !== null &&
        e.policy !== 'ranged_kite' &&
        e.attackCooldown <= 0 &&
        dist < 3.6 &&
        Math.abs(targetPos.y - e.pos.y) < 3.0
      ) {
        if (activeTokens < 2 || targetKind === 'enemy') {
          activeTokens++;
          e.isBlocking = false;
          e.telegraphKind = e.policy === 'wind_diver' && !e.onGround ? 'smash' : 'melee';
          e.telegraphTimer = 0.36;
          e.attackCooldown = e.isBoss ? 1.05 : 1.4;
          if (targetKind === 'player') this.audio.playTelegraph();
        }
      } else if (
        targetKind !== null &&
        e.policy === 'ranged_kite' &&
        e.attackCooldown <= 0 &&
        dist < 3.4 &&
        Math.abs(targetPos.y - e.pos.y) < 3.0
      ) {
        e.isBlocking = false;
        e.telegraphKind = 'melee';
        e.telegraphTimer = 0.28;
        e.attackCooldown = 1.25;
      }

      e.rig.root.position.copy(e.pos);
      e.rig.root.rotation.set(-e.recoilTilt, e.yaw, 0);
      e.rig.shieldMesh.visible = e.isBlocking;
      e.rig.leftArmPivot.rotation.x = e.isBlocking ? -1.05 : 0;

      const spd = Math.hypot(e.vel.x, e.vel.z);
      e.walkDist += spd * dt;
      const stride = e.onGround ? Math.sin(e.walkDist * 2.1) * Math.min(1, spd / 6) : 0.3;
      e.rig.leftLegPivot.rotation.x = stride * 0.6;
      e.rig.rightLegPivot.rotation.x = -stride * 0.6;

      if (e.swingTimer > 0) {
        e.swingTimer -= dt;
        e.rig.rightArmPivot.rotation.x = -1.6 + Math.sin((1 - e.swingTimer / 0.25) * Math.PI) * 1.8;
      } else if (e.telegraphTimer > 0) {
        e.rig.rightArmPivot.rotation.x = -2.2;
      } else {
        e.rig.rightArmPivot.rotation.x = -stride * 0.5 - 0.2;
      }
      e.rig.wingsGroup.visible = !e.onGround;
      e.rig.shadowDisc.position.y = supY - e.pos.y + 0.025;
      e.overhead.group.visible = true;
      e.overhead.group.quaternion.copy(this.camera.quaternion);
    }
  }

  private updateRemotePeers(dt: number): void {
    for (const peer of this.remotePeers.values()) {
      if (!peer.alive) continue;

      peer.pos.x = THREE.MathUtils.damp(peer.pos.x, peer.targetPos.x, 18, dt);
      peer.pos.y = THREE.MathUtils.damp(peer.pos.y, peer.targetPos.y, 18, dt);
      peer.pos.z = THREE.MathUtils.damp(peer.pos.z, peer.targetPos.z, 18, dt);

      // Shortest-angle yaw lerp
      let diff = peer.targetYaw - peer.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      peer.yaw += diff * Math.min(1, dt * 16);

      if (peer.hitFlashTimer > 0) {
        peer.hitFlashTimer -= dt;
        if (peer.hitFlashTimer <= 0) peer.rig.setHitFlash(false);
      }
      peer.recoilTilt = THREE.MathUtils.damp(peer.recoilTilt, 0, 14, dt);

      const spd = Math.hypot(peer.vel.x, peer.vel.z);
      peer.walkDist += spd * dt;
      const stride = Math.sin(peer.walkDist * 2.1) * Math.min(1, spd / 7);
      peer.rig.leftLegPivot.rotation.x = stride * 0.6;
      peer.rig.rightLegPivot.rotation.x = -stride * 0.6;

      if (peer.swingTimer > 0) {
        peer.swingTimer = Math.max(0, peer.swingTimer - dt);
        peer.rig.rightArmPivot.rotation.x = -1.7 + Math.sin((1 - peer.swingTimer / 0.24) * Math.PI) * 2.1;
      } else {
        peer.rig.rightArmPivot.rotation.x = -stride * 0.5 - 0.3;
      }

      peer.rig.shieldMesh.visible = peer.isBlocking;
      peer.rig.leftArmPivot.rotation.x = peer.isBlocking ? -1.05 : stride * 0.5;
      peer.rig.wingsGroup.visible = peer.isGliding;
      peer.rig.root.position.copy(peer.pos);
      peer.rig.root.rotation.set(-peer.recoilTilt, peer.yaw, 0);

      const supY = getSupportHeightAt(peer.pos.x, peer.pos.z, peer.pos.y, PLAYER_RADIUS, this.blocks);
      peer.rig.shadowDisc.position.y = supY - peer.pos.y + 0.025;
      peer.overhead.group.visible = !peer.isStealthed;
      peer.overhead.group.quaternion.copy(this.camera.quaternion);
    }
  }

  private applyDamageToLocalPlayer(
    rawDmg: number,
    canBreakShield: boolean,
    dirX: number,
    dirZ: number,
    knockback: number,
    attackerLabel: string
  ): void {
    if (this.outcome !== null || this.defeatDelayTimer > 0 || this.localRespawnTimer > 0) return;

    const res = applyCombatDamage(
      {
        hp: this.playerHp,
        maxHp: this.playerMaxHp,
        absorption: this.playerAbsorption,
        isBlocking: this.isBlocking,
      },
      rawDmg,
      canBreakShield
    );

    this.playerHp = res.remainingHp;
    this.playerAbsorption = res.remainingAbsorption;
    this.hitFlashTimer = 0.1;
    this.playerRig.setHitFlash(true, res.blocked ? 0x38bdf8 : 0xef4444);

    this.playerVel.x += dirX * (res.blocked ? knockback * 0.5 : knockback);
    this.playerVel.z += dirZ * (res.blocked ? knockback * 0.5 : knockback);
    this.playerVel.y = Math.max(this.playerVel.y, res.blocked ? 2.0 : 4.2);

    if (res.blocked) {
      this.audio.playShieldBlock();
      this.spawnParticles(this.playerPos.x, this.playerPos.y + 1.2, this.playerPos.z, 8, 0x38bdf8, 5);
    } else {
      this.audio.playPlayerHurt();
      this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.36);
      this.comboStreak = 0;
      this.spawnParticles(this.playerPos.x, this.playerPos.y + 1.1, this.playerPos.z, 12, 0xef4444, 6);
    }

    if (this.playerHp <= 0 && this.defeatDelayTimer <= 0 && this.localRespawnTimer <= 0) {
      this.deaths += 1;
      this.audio.playDeath(true);
      if (this.mode === 'online_world' || this.mode === 'multiplayer') {
        this.localRespawnTimer = 2.2;
        this.pushCallout(`${attackerLabel}에게 처치됨 · 2.2초 후 부활`, '#ef4444');
      } else {
        this.defeatDelayTimer = 0.5;
      }
      this.addKillFeed(`${attackerLabel}에게 처치됨`, '#ef4444');
    }

    this.emitHud(true);
  }

  private executeEnemyAttack(
    e: AiFighter,
    dist: number,
    dirX: number,
    dirZ: number,
    targetKind: 'player' | 'enemy' | 'peer' | null,
    targetEnemy: AiFighter | null,
    _targetPeer: RemotePeerActor | null
  ): void {
    const isSmash = e.telegraphKind === 'smash';
    if (isSmash) {
      this.spawnShockwave(e.pos.x, e.pos.y + 0.08, e.pos.z, 3.8, 0xef4444);
      this.audio.playMaceSmash(0.8);
    } else {
      this.audio.playSwing();
    }

    if (dist > (isSmash ? 4.1 : 3.6)) return;
    const rawDmg = isSmash ? 22 : e.isBoss ? 17 : 12;

    if (targetKind === 'enemy' && targetEnemy && targetEnemy.alive && targetEnemy.koTimer <= 0) {
      if (Math.abs(targetEnemy.pos.y - e.pos.y) > 2.8) return;
      const res = applyCombatDamage(
        {
          hp: targetEnemy.hp,
          maxHp: targetEnemy.maxHp,
          absorption: targetEnemy.absorption,
          isBlocking: targetEnemy.isBlocking,
        },
        rawDmg,
        isSmash
      );
      targetEnemy.hp = res.remainingHp;
      targetEnemy.absorption = res.remainingAbsorption;
      targetEnemy.overhead.updateHp(targetEnemy.hp / targetEnemy.maxHp);
      targetEnemy.hitFlashTimer = 0.11;
      targetEnemy.rig.setHitFlash(true);
      targetEnemy.vel.x += dirX * 7.5;
      targetEnemy.vel.z += dirZ * 7.5;
      this.spawnParticles(targetEnemy.pos.x, targetEnemy.pos.y + 1.1, targetEnemy.pos.z, 10, 0xef4444, 5.5);
      if (targetEnemy.hp <= 0) {
        targetEnemy.koTimer = 0.42;
        targetEnemy.deaths += 1;
        e.kills += 1;
        this.addKillFeed(`${e.name} ⚔ ${targetEnemy.name}`, '#94a3b8');
      }
      return;
    }

    if (targetKind === 'player') {
      if (Math.abs(this.playerPos.y - e.pos.y) > 2.8) return;
      this.applyDamageToLocalPlayer(rawDmg, isSmash, dirX, dirZ, 8.5, e.name);
    }
  }

  private respawnEnemy(e: AiFighter): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = this.mode === 'online_world' ? 24 + Math.random() * 48 : 16 + Math.random() * 14;
    const rx = Math.cos(angle) * dist;
    const rz = Math.sin(angle) * dist;
    const supY = getSupportHeightAt(rx, rz, 20, PLAYER_RADIUS, this.blocks);
    e.pos.set(rx, supY + 0.5, rz);
    e.vel.set(0, 0, 0);
    e.hp = e.maxHp;
    e.absorption = 0;
    e.burnTimer = 0;
    e.recoilTilt = 0;
    e.overhead.updateHp(1);
    e.overhead.group.visible = true;
    e.alive = true;
    e.koTimer = 0;
    e.telegraphTimer = 0;
    e.rig.root.visible = true;
    e.rig.root.rotation.set(0, 0, 0);
    e.rig.setHitFlash(false);
    e.rig.root.position.copy(e.pos);
    this.spawnParticles(e.pos.x, e.pos.y + 1, e.pos.z, 12, 0x38bdf8, 5);
  }

  private updateParticles(dt: number): void {
    let anyDirty = false;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyDirty = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _mat4.makeScale(0, 0, 0);
        this.particleMesh.setMatrixAt(i, _mat4);
        continue;
      }
      p.vel.y += GRAVITY * 0.4 * dt;
      p.pos.addScaledVector(p.vel, dt);
      const s = p.size * (p.life / p.maxLife);
      _scaleVec.set(s, s, s);
      _quat.identity();
      _mat4.compose(p.pos, _quat, _scaleVec);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, p.color);
    }
    if (anyDirty) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private updateShockwaves(dt: number): void {
    for (const sw of this.shockwaves) {
      if (!sw.active) continue;
      sw.life -= dt;
      if (sw.life <= 0) {
        sw.active = false;
        sw.mesh.visible = false;
        continue;
      }
      const progress = 1 - sw.life / sw.maxLife;
      const radius = 0.5 + progress * sw.maxRadius;
      sw.mesh.scale.setScalar(radius);
      (sw.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.85;
    }
  }

  private updateCamera(dt: number): void {
    _aimDir
      .set(
        -Math.sin(this.playerYaw) * Math.cos(this.playerPitch),
        Math.sin(this.playerPitch),
        -Math.cos(this.playerYaw) * Math.cos(this.playerPitch)
      )
      .normalize();

    if (this.cameraMode === 'firstperson') {
      _camGoal.set(this.playerPos.x, this.playerPos.y + 1.58, this.playerPos.z);
      _camTarget.copy(_camGoal).addScaledVector(_aimDir, 18);

      const fpPosDamp = this.isGliding ? 24 : 36;
      const fpLookDamp = this.isGliding ? 28 : 42;
      this.camPos.x = THREE.MathUtils.damp(this.camPos.x, _camGoal.x, fpPosDamp, dt);
      this.camPos.y = THREE.MathUtils.damp(this.camPos.y, _camGoal.y, fpPosDamp, dt);
      this.camPos.z = THREE.MathUtils.damp(this.camPos.z, _camGoal.z, fpPosDamp, dt);
      this.camLook.x = THREE.MathUtils.damp(this.camLook.x, _camTarget.x, fpLookDamp, dt);
      this.camLook.y = THREE.MathUtils.damp(this.camLook.y, _camTarget.y, fpLookDamp, dt);
      this.camLook.z = THREE.MathUtils.damp(this.camLook.z, _camTarget.z, fpLookDamp, dt);
      this.camera.position.copy(this.camPos);
      if (this.shakeTrauma > 0.01) {
        const s = this.shakeTrauma * this.shakeTrauma * 0.22;
        this.camera.position.x += (Math.random() - 0.5) * s;
        this.camera.position.y += (Math.random() - 0.5) * s;
      }
      this.camera.lookAt(this.camLook);
      return;
    }

    _right.set(Math.cos(this.playerYaw), 0, -Math.sin(this.playerYaw));

    const isShiftLock = this.cameraMode === 'shiftlock';
    const shoulderOffset = isShiftLock ? 1.15 : 0.0;
    const camDistance = (isShiftLock ? 4.1 : 6.2) + (this.isGliding ? 1.1 : 0);

    _rayOrigin.set(
      this.playerPos.x + _right.x * shoulderOffset,
      this.playerPos.y + 1.62,
      this.playerPos.z + _right.z * shoulderOffset
    );

    _camGoal.copy(_rayOrigin).addScaledVector(_aimDir, -camDistance);
    _camGoal.y = Math.max(0.45, _camGoal.y + (isShiftLock ? 0.25 : 0.65));

    _rayDir.copy(_camGoal).sub(_rayOrigin);
    const desiredDist = _rayDir.length();
    if (desiredDist > 0.1) {
      _rayDir.divideScalar(desiredDist);
      this.raycaster.set(_rayOrigin, _rayDir);
      this.raycaster.far = desiredDist;
      const hits = this.raycaster.intersectObjects(this.envMeshes, false);
      if (hits.length > 0) {
        const safeDist = Math.max(1.1, hits[0].distance - 0.35);
        _camGoal.copy(_rayOrigin).addScaledVector(_rayDir, safeDist);
      }
    }

    _camTarget.copy(_rayOrigin).addScaledVector(_aimDir, 18);

    const dampK = this.isGliding ? 14 : this.isSoftwareGl ? 28 : 20;
    const lookK = this.isGliding ? 18 : dampK + 4;
    this.camPos.x = THREE.MathUtils.damp(this.camPos.x, _camGoal.x, dampK, dt);
    this.camPos.y = THREE.MathUtils.damp(this.camPos.y, _camGoal.y, dampK, dt);
    this.camPos.z = THREE.MathUtils.damp(this.camPos.z, _camGoal.z, dampK, dt);

    this.camLook.x = THREE.MathUtils.damp(this.camLook.x, _camTarget.x, lookK, dt);
    this.camLook.y = THREE.MathUtils.damp(this.camLook.y, _camTarget.y, lookK, dt);
    this.camLook.z = THREE.MathUtils.damp(this.camLook.z, _camTarget.z, lookK, dt);

    this.camera.position.copy(this.camPos);
    if (this.shakeTrauma > 0.01) {
      const s = this.shakeTrauma * this.shakeTrauma * 0.28;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
    }
    this.camera.lookAt(this.camLook);
  }

  private syncBodyState(): void {
    document.body.dataset.state = this.screen;
  }

  private buildScoreboard(): ScoreboardEntry[] {
    const entries: ScoreboardEntry[] = [
      {
        id: this.mpState.selfId ?? 'local',
        name: this.mpState.playerName || 'Player',
        characterId: this.selectedCharId,
        team: this.getLocalPlayerTeam(),
        kills: this.kills,
        deaths: this.deaths,
        hp: Math.round(this.playerHp),
        maxHp: this.playerMaxHp,
        isLocal: true,
        isBot: false,
      },
    ];

    for (const peer of this.remotePeers.values()) {
      entries.push({
        id: peer.id,
        name: peer.name,
        characterId: peer.characterId,
        team: peer.team,
        kills: peer.kills,
        deaths: peer.deaths,
        hp: Math.round(peer.hp),
        maxHp: peer.maxHp,
        isLocal: false,
        isBot: false,
      });
    }

    for (const e of this.enemies) {
      entries.push({
        id: e.id,
        name: e.name,
        characterId: e.profile.id,
        team: e.team,
        kills: e.kills,
        deaths: e.deaths,
        hp: Math.round(e.hp),
        maxHp: e.maxHp,
        isLocal: false,
        isBot: true,
      });
    }

    entries.sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
    return entries;
  }

  private emitHud(force: boolean): void {
    if (!force && this.disposed) return;
    const targetKills =
      this.mode === 'multiplayer'
        ? this.matchTargetKills
        : GAME_MODES.find((m) => m.id === this.mode)?.targetKills ?? 15;
    const fallHeightReady = this.playerOnGround
      ? 0
      : Math.max(0, Math.round(this.playerFallStartY - this.playerPos.y));
    const loadout = this.getCurrentLoadout();

    const mapTimeRemaining = this.isNetworkedMode()
      ? Math.max(
          0,
          Math.ceil((MAP_ROTATION_SECONDS * 1000 - (Date.now() - this.mapStartedAtMs)) / 1000)
        )
      : Math.max(0, Math.ceil(MAP_ROTATION_SECONDS - this.offlineMapTimer));

    this.onHudChange({
      screen: this.screen,
      mode: this.mode,
      characterId: this.selectedCharId,
      roomMode: this.mpState.roomMode,
      playerTeam: this.getLocalPlayerTeam(),
      currentMapId: this.currentMapId,
      mapTimeRemaining,
      hp: Math.round(this.playerHp),
      maxHp: this.playerMaxHp,
      absorption: Math.round(this.playerAbsorption),
      stamina: Math.round(this.playerStamina),
      activeSlot: this.activeSlot,
      loadout,
      slotCooldowns: [...this.slotCooldowns] as SixTuple<number>,
      slotMaxCooldowns: [
        loadout[0].id === 'crossbow' ? 1.35 : loadout[0].cooldown,
        loadout[1].id === 'crossbow' ? 1.35 : loadout[1].cooldown,
        loadout[2].id === 'crossbow' ? 1.35 : loadout[2].cooldown,
        loadout[3].id === 'crossbow' ? 1.35 : loadout[3].cooldown,
        loadout[4].id === 'crossbow' ? 1.35 : loadout[4].cooldown,
        loadout[5].id === 'crossbow' ? 1.35 : loadout[5].cooldown,
      ],
      slotCharges: [...this.slotCharges] as SixTuple<number>,
      slotMaxCharges: [...this.slotMaxCharges] as SixTuple<number>,
      elytraCooldown: this.elytraCooldown,
      elytraMaxCooldown: 3.8,
      isGliding: this.isGliding,
      isBlocking: this.isBlocking,
      isStealthed: this.stealthTimer > 0,
      isInCobweb: this.playerInCobweb,
      cobwebBreakProgress: this.cobwebBreakProgress,
      isBurning: this.playerBurnTimer > 0,
      isInWater: this.playerInWater,
      cameraMode: this.cameraMode,
      shiftLock: this.cameraMode === 'shiftlock',
      pointerLocked: this.pointerLocked,
      kills: this.kills,
      deaths: this.deaths,
      targetKills,
      wave: this.wave,
      aliveEnemies: this.enemies.filter((e) => e.alive).length + Array.from(this.remotePeers.values()).filter((p) => p.alive).length,
      comboStreak: this.comboStreak,
      maxSmashHeight: this.maxSmashHeight,
      damageDealt: this.damageDealt,
      elapsedTime: Math.round(this.elapsedTime),
      outcome: this.outcome,
      calloutText: this.calloutText,
      calloutAccent: this.calloutAccent,
      calloutTimer: this.calloutTimer,
      killFeed: this.killFeed,
      chatMessages: this.chatMessages,
      scoreboard: this.buildScoreboard(),
      hitmarkerTimer: this.hitmarkerTimer,
      hitmarkerCrit: this.hitmarkerCrit,
      lastHitText: this.lastHitText,
      fallHeightReady,
      muted: this.audio.isMuted(),
      fps: this.fps,
      settings: { ...this.settings },
      multiplayer: this.mpState,
    });
  }

  public mobileAttack(): void {
    if (this.screen !== 'playing') return;
    this.triggerPrimaryAction();
  }

  public mobileAttackHold(pressed: boolean): void {
    this.mobileAttackHeld = pressed;
    if (pressed && this.screen === 'playing') {
      this.triggerPrimaryAction();
    }
  }

  public mobileJump(pressed: boolean): void {
    if (pressed) {
      this.keys.add('Space');
      this.playerJumpBuffer = 0.2;
    } else {
      this.keys.delete('Space');
    }
  }

  public mobileBlock(pressed: boolean): void {
    if (pressed) {
      if (this.isGliding) {
        this.isBlocking = false;
        this.triggerFireworkBoost();
      } else {
        this.keys.add('KeyB');
        this.mouseDownRight = true;
        this.isBlocking = true;
      }
    } else {
      this.keys.delete('KeyB');
      this.mouseDownRight = false;
      this.isBlocking = false;
    }
  }

  public mobileMove(forward: number, right: number): void {
    this.mobileForwardInput = forward;
    if (forward > 0.15) {
      this.keys.add('KeyW');
      this.keys.delete('KeyS');
    } else if (forward < -0.15) {
      this.keys.add('KeyS');
      this.keys.delete('KeyW');
    } else {
      this.keys.delete('KeyW');
      this.keys.delete('KeyS');
    }

    if (right > 0.15) {
      this.keys.add('KeyD');
      this.keys.delete('KeyA');
    } else if (right < -0.15) {
      this.keys.add('KeyA');
      this.keys.delete('KeyD');
    } else {
      this.keys.delete('KeyA');
      this.keys.delete('KeyD');
    }
  }

  public mobileLook(dx: number, dy: number): void {
    const sens = this.settings.sensitivity;
    const ySign = this.settings.invertY ? -1 : 1;
    this.targetYaw -= dx * 0.0045 * sens;
    this.targetPitch = THREE.MathUtils.clamp(this.targetPitch - dy * 0.0045 * sens * ySign, -1.46, 1.42);
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.unbindEvents();
    this.net.dispose();
    document.exitPointerLock?.();

    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
    for (const tex of this.materials.textures) {
      tex.dispose();
    }
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
