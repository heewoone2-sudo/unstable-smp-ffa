import type { PlayerAccountProfile } from '../firebase';
import { CHARACTER_LIST } from '../game/characters';
import { MAP_DEFINITIONS, MAP_ORDER } from '../game/maps';
import type { CharacterId, HudSnapshot, MapId } from '../game/types';

interface StatusModalProps {
  hud: HudSnapshot;
  account: PlayerAccountProfile | null;
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
  onExitMatch: () => void;
  onOpenSettings: () => void;
  onChangeCharacter?: (id: CharacterId) => void;
  onChangeMap?: (mapId: MapId) => void;
}

export function StatusModal({
  hud,
  account,
  onResume,
  onRestart,
  onTitle,
  onExitMatch,
  onOpenSettings,
  onChangeCharacter,
  onChangeMap,
}: StatusModalProps) {
  const isPause = hud.screen === 'paused';
  const isVictory = hud.outcome === 'victory';
  const isNetworked =
    Boolean(hud.multiplayer.roomCode) &&
    (hud.mode === 'online_world' || hud.mode === 'multiplayer' || hud.mode === 'link_duel');
  const isRoomMatch =
    Boolean(hud.multiplayer.roomCode) &&
    (hud.mode === 'multiplayer' || hud.mode === 'link_duel');
  const isLinkDuel = hud.mode === 'link_duel';

  const heading = isPause
    ? '일시정지'
    : isVictory
      ? isLinkDuel
        ? '링크전 승리'
        : '아레나 승리'
      : isLinkDuel
        ? '링크전 패배'
        : '전투 불능';

  const subtitle = isPause
    ? hud.mode === 'online_world'
      ? '초원 216m 글로벌 오픈월드가 실시간으로 진행 중입니다.'
      : isRoomMatch
        ? '게임 나가기를 누르면 방을 유지한 채 사설 대기실로 돌아갑니다.'
        : '전투를 재개하거나 타이틀로 돌아갈 수 있습니다.'
    : isVictory
      ? isLinkDuel
        ? '1v1 링크전에서 3선승을 달성했습니다.'
        : '모든 목표를 달성했습니다.'
      : '상대의 공격에 쓰러졌습니다.';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-lg p-6 space-y-5 text-slate-900"
      >
        <div>
          <h2
            id="modal-title"
            className={`font-display text-2xl font-bold ${
              isPause ? 'text-slate-950' : isVictory ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {heading}
          </h2>
          <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 py-3 border-y border-slate-200">
          <div>
            <div className="text-xs text-slate-500">처치 수</div>
            <div className="font-display font-mono-num text-2xl font-bold text-slate-950 mt-0.5">
              {hud.kills}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">최대 스매시</div>
            <div className="font-display font-mono-num text-2xl font-bold text-slate-950 mt-0.5">
              {hud.maxSmashHeight}m
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">총 피해량</div>
            <div className="font-display font-mono-num text-2xl font-bold text-slate-950 mt-0.5">
              {hud.damageDealt}
            </div>
          </div>
        </div>

        {!isPause && isLinkDuel && account && (
          <div className="flex items-center justify-between text-xs text-slate-700">
            <span>{account.nickname} 랭크 반영</span>
            <span className="font-mono-num font-bold text-slate-950">
              {account.tier} · {account.elo} ELO ({isVictory ? '+28' : '-18'})
            </span>
          </div>
        )}

        {isPause && !isNetworked && hud.mode === 'ffa' && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="font-bold text-slate-800">연습장 캐릭터 &amp; 맵 즉시 변경</div>
            <div className="grid grid-cols-2 gap-2">
              <select
                data-testid="pause-char-select"
                aria-label="일시정지 캐릭터 변경"
                value={hud.characterId}
                onChange={(e) => onChangeCharacter?.(e.target.value as CharacterId)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900 cursor-pointer"
              >
                {CHARACTER_LIST.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                data-testid="pause-map-select"
                aria-label="일시정지 맵 변경"
                value={hud.currentMapId}
                onChange={(e) => onChangeMap?.(e.target.value as MapId)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900 cursor-pointer"
              >
                {MAP_ORDER.map((mId) => (
                  <option key={mId} value={mId}>
                    {MAP_DEFINITIONS[mId].name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          {isPause ? (
            <button
              type="button"
              onClick={onResume}
              className="flex-1 px-4 py-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white font-display font-bold text-sm cursor-pointer"
            >
              계속하기
            </button>
          ) : !isNetworked || hud.multiplayer.isHost ? (
            <button
              type="button"
              data-start="true"
              onClick={onRestart}
              className="flex-1 px-4 py-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white font-display font-bold text-sm cursor-pointer"
            >
              {isNetworked ? '리매치 시작' : '다시 플레이'}
            </button>
          ) : null}

          {isPause && !isNetworked && (
            <button
              type="button"
              onClick={onRestart}
              className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-medium text-sm cursor-pointer"
            >
              재시작
            </button>
          )}

          {isPause && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-medium text-sm cursor-pointer"
            >
              환경설정
            </button>
          )}

          <button
            type="button"
            data-testid="modal-exit-match-btn"
            onClick={isNetworked ? onExitMatch : onTitle}
            className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 font-medium text-sm cursor-pointer"
          >
            {hud.mode === 'online_world' ? '월드 나가기' : isRoomMatch ? '게임 나가기' : '타이틀로'}
          </button>
        </div>
      </div>
    </div>
  );
}
