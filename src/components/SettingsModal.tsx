import { Eye, Monitor, RotateCcw, Volume2, X } from 'lucide-react';
import type { CameraMode, GameSettings, GraphicsQuality } from '../game/types';

interface SettingsModalProps {
  open: boolean;
  settings: GameSettings;
  onUpdate: (partial: Partial<GameSettings>) => void;
  onReset: () => void;
  onClose: () => void;
}

export function SettingsModal({
  open,
  settings,
  onUpdate,
  onReset,
  onClose,
}: SettingsModalProps) {
  if (!open) return null;

  const cameraOptions: Array<{ id: CameraMode; label: string; desc: string }> = [
    { id: 'firstperson', label: '1인칭', desc: '정밀 조준 시점' },
    { id: 'shiftlock', label: '시프트락', desc: '어깨 너머 3인칭' },
    { id: 'free', label: '자유 시점', desc: '자유 회전 3인칭' },
  ];

  const qualityOptions: Array<{ id: GraphicsQuality; label: string; desc: string }> = [
    { id: 'low', label: '낮음', desc: '최대 프레임 우선' },
    { id: 'medium', label: '보통', desc: '균형 품질' },
    { id: 'high', label: '높음', desc: '그림자 · 고해상도' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 id="settings-modal-title" className="font-display text-lg font-bold text-slate-950">
              게임 환경설정
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">시점 · 그래픽 · 오디오 설정이 한 화면에 모두 표시되며 즉시 적용됩니다.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="설정 닫기"
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3-Column Zero-Scroll Unified Body */}
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* Column 1: Camera & Sensitivity */}
          <div className="space-y-3 bg-slate-50/70 border border-slate-200 rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 pb-2 border-b border-slate-200">
              <Eye className="w-3.5 h-3.5 text-rose-600" />
              <span>시점 · 감도</span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-600">카메라 시점 (인게임 V키)</label>
              <div className="grid grid-cols-3 gap-1.5">
                {cameraOptions.map((opt) => {
                  const active = settings.cameraMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onUpdate({ cameraMode: opt.id })}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                        active
                          ? 'bg-slate-950 border-slate-950 text-white'
                          : 'bg-white border-slate-200 text-slate-800 hover:border-slate-400'
                      }`}
                    >
                      <div className="font-display text-xs font-bold">{opt.label}</div>
                      <div className={`text-[10px] mt-0.5 leading-tight ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">시야각 (FOV)</span>
                <span className="font-mono-num font-bold text-slate-950">{settings.fov}°</span>
              </div>
              <input
                type="range"
                min={60}
                max={100}
                step={1}
                value={settings.fov}
                onChange={(e) => onUpdate({ fov: Number(e.target.value) })}
                className="w-full accent-slate-950 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">마우스 · 터치 감도</span>
                <span className="font-mono-num font-bold text-slate-950">{settings.sensitivity.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.4}
                max={2.5}
                step={0.05}
                value={settings.sensitivity}
                onChange={(e) => onUpdate({ sensitivity: Number(e.target.value) })}
                className="w-full accent-slate-950 cursor-pointer"
              />
            </div>

            <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-slate-800">상하 시점 반전 (Invert Y)</div>
                <div className="text-[10px] text-slate-500">상하 이동 방향 반전</div>
              </div>
              <input
                type="checkbox"
                checked={settings.invertY}
                onChange={(e) => onUpdate({ invertY: e.target.checked })}
                className="w-4 h-4 accent-slate-950 shrink-0"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-slate-800">모바일 자동 달리기</div>
                <div className="text-[10px] text-slate-500">조이스틱 최대 입력 시 질주</div>
              </div>
              <input
                type="checkbox"
                checked={settings.mobileAutoSprint}
                onChange={(e) => onUpdate({ mobileAutoSprint: e.target.checked })}
                className="w-4 h-4 accent-slate-950 shrink-0"
              />
            </label>
          </div>

          {/* Column 2: Graphics & Display */}
          <div className="space-y-3 bg-slate-50/70 border border-slate-200 rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 pb-2 border-b border-slate-200">
              <Monitor className="w-3.5 h-3.5 text-sky-600" />
              <span>비디오 · 그래픽</span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-600">그래픽 품질</label>
              <div className="grid grid-cols-3 gap-1.5">
                {qualityOptions.map((opt) => {
                  const active = settings.graphicsQuality === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onUpdate({ graphicsQuality: opt.id })}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                        active
                          ? 'bg-slate-950 border-slate-950 text-white'
                          : 'bg-white border-slate-200 text-slate-800 hover:border-slate-400'
                      }`}
                    >
                      <div className="font-display text-xs font-bold">{opt.label}</div>
                      <div className={`text-[10px] mt-0.5 leading-tight ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-slate-800">전투 파티클 효과</div>
                <div className="text-[10px] text-slate-500">타격 파편·폭발·스매시 입자 표시</div>
              </div>
              <input
                type="checkbox"
                checked={settings.particlesEnabled}
                onChange={(e) => onUpdate({ particlesEnabled: e.target.checked })}
                className="w-4 h-4 accent-slate-950 shrink-0"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-slate-800">실시간 FPS 표시</div>
                <div className="text-[10px] text-slate-500">전투 화면 상단 프레임 수치 표시</div>
              </div>
              <input
                type="checkbox"
                checked={settings.showFps}
                onChange={(e) => onUpdate({ showFps: e.target.checked })}
                className="w-4 h-4 accent-slate-950 shrink-0"
              />
            </label>
          </div>

          {/* Column 3: Audio & Keybinds */}
          <div className="space-y-3 bg-slate-50/70 border border-slate-200 rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 pb-2 border-b border-slate-200">
              <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>오디오 · 조작 키</span>
            </div>

            <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-slate-800">전체 효과음 음소거 (M키)</div>
                <div className="text-[10px] text-slate-500">전투 타격음·스킬 사운드 끄기</div>
              </div>
              <input
                type="checkbox"
                checked={settings.muted}
                onChange={(e) => onUpdate({ muted: e.target.checked })}
                className="w-4 h-4 accent-slate-950 shrink-0"
              />
            </label>

            <div className="space-y-1 bg-white border border-slate-200 rounded-lg p-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">마스터 볼륨</span>
                <span className="font-mono-num font-bold text-slate-950">{settings.masterVolume}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={settings.masterVolume}
                onChange={(e) => onUpdate({ masterVolume: Number(e.target.value) })}
                className="w-full accent-slate-950 cursor-pointer"
              />
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-1.5">
              <div className="text-[11px] font-bold text-slate-600">핵심 단축키</div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div className="flex justify-between px-1.5 py-0.5 rounded bg-slate-50">
                  <span className="text-slate-500">무기 슬롯</span>
                  <span className="font-mono-num font-bold text-slate-900">1~6</span>
                </div>
                <div className="flex justify-between px-1.5 py-0.5 rounded bg-slate-50">
                  <span className="text-slate-500">겉날개</span>
                  <span className="font-mono-num font-bold text-slate-900">F</span>
                </div>
                <div className="flex justify-between px-1.5 py-0.5 rounded bg-slate-50">
                  <span className="text-slate-500">시점 전환</span>
                  <span className="font-mono-num font-bold text-slate-900">V</span>
                </div>
                <div className="flex justify-between px-1.5 py-0.5 rounded bg-slate-50">
                  <span className="text-slate-500">전적표</span>
                  <span className="font-mono-num font-bold text-slate-900">Tab</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            기본값 복원
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
}
