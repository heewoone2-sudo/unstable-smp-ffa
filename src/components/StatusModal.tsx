import type { PlayerAccountProfile } from '../firebase';
import type { HudSnapshot } from '../game/types';

interface StatusModalProps {
  hud: HudSnapshot;
  account: PlayerAccountProfile | null;
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
  onLeaveRoom: () => void;
}

export function StatusModal({
  hud,
  account,
  onResume,
  onRestart,
  onTitle,
  onLeaveRoom,
}: StatusModalProps) {
  const isPause = hud.screen === 'paused';
  const isVictory = hud.outcome === 'victory';
  const isNetworked =
    Boolean(hud.multiplayer.roomCode) &&
    (hud.mode === 'online_world' || hud.mode === 'multiplayer' || hud.mode === 'link_duel');
  const isLinkDuel = hud.mode === 'link_duel';

  const heading = isPause
    ? '일시정지'
    : isVictory
      ? isLinkDuel
        ? '링크전 승리!'
        : '아레나 승리!'
      : isLinkDuel
        ? '링크전 패배'
        : '전투 불능';

  const subtitle = isPause
    ? hud.mode === 'online_world'
      ? '216m 글로벌 오픈월드가 실시간으로 진행 중입니다.'
      : isNetworked
        ? '실시간 온라인 매치가 진행 중입니다.'
        : '전투를 재개하거나 캐릭터/모드를 변경할 수 있습니다.'
    : isVictory
      ? isLinkDuel
        ? '1v1 링크전에서 3선승을 달성했습니다!'
        : '모든 목표를 달성하고 아레나를 제압했습니다.'
      : '상대의 공격에 쓰러졌습니다. 다시 도전하세요.';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#070910]/80 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="w-full max-w-md bg-[#111423] border border-white/15 rounded-xl p-6 space-y-5"
      >
        <div>
          <h2
            id="modal-title"
            className={`font-display text-3xl font-bold ${
              isPause ? 'text-white' : isVictory ? 'text-amber-400' : 'text-red-400'
            }`}
          >
            {heading}
          </h2>
          <p className="text-sm text-slate-300 mt-1">{subtitle}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#181c30] border border-white/10 rounded-lg p-3">
            <div className="text-[11px] text-slate-400">처치 수</div>
            <div className="font-display font-mono-num text-2xl font-bold text-white mt-0.5">
              {hud.kills}
            </div>
          </div>
          <div className="bg-[#181c30] border border-white/10 rounded-lg p-3">
            <div className="text-[11px] text-slate-400">최대 스매시</div>
            <div className="font-display font-mono-num text-2xl font-bold text-sky-300 mt-0.5">
              {hud.maxSmashHeight}m
            </div>
          </div>
          <div className="bg-[#181c30] border border-white/10 rounded-lg p-3">
            <div className="text-[11px] text-slate-400">총 피해량</div>
            <div className="font-display font-mono-num text-2xl font-bold text-amber-300 mt-0.5">
              {hud.damageDealt}
            </div>
          </div>
        </div>

        {!isPause && isLinkDuel && account && (
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#191d33] border border-purple-400/35 text-xs">
            <span className="text-slate-300 font-medium">{account.nickname} 랭크 반영</span>
            <span className="font-display font-bold text-amber-300">
              {account.tier} · {account.elo} ELO ({isVictory ? '+28' : '-18'})
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          {isPause ? (
            <button
              type="button"
              onClick={onResume}
              className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-base cursor-pointer"
            >
              계속하기
            </button>
          ) : !isNetworked || hud.multiplayer.isHost ? (
            <button
              type="button"
              data-start="true"
              onClick={onRestart}
              className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-base cursor-pointer"
            >
              {isNetworked ? '리매치 시작' : '다시 플레이'}
            </button>
          ) : null}

          {isPause && !isNetworked && (
            <button
              type="button"
              onClick={onRestart}
              className="px-4 py-2.5 rounded-lg bg-[#1b2036] hover:bg-[#252c48] border border-white/15 text-white font-medium text-sm cursor-pointer"
            >
              재시작
            </button>
          )}

          <button
            type="button"
            onClick={isNetworked ? onLeaveRoom : onTitle}
            className="px-4 py-2.5 rounded-lg bg-[#1b2036] hover:bg-[#252c48] border border-white/15 text-slate-200 font-medium text-sm cursor-pointer"
          >
            {hud.mode === 'online_world' ? '월드 나가기' : isNetworked ? '방 나가기' : '타이틀로'}
          </button>
        </div>
      </div>
    </div>
  );
}

