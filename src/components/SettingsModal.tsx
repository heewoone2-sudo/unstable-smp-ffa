import { useState } from 'react';
import { Eye, Volume2, Monitor, RotateCcw, X } from 'lucide-react';
import type { CameraMode, GameSettings, GraphicsQuality } from '../game/types';

interface SettingsModalProps {
  open: boolean;
  settings: GameSettings;
  onUpdate: (partial: Partial<GameSettings>) => void;
  onReset: () => void;
  onClose: () => void;
}

type SettingsTab = 'camera' | 'audio' | 'video';

export function SettingsModal({
  open,
  settings,
  onUpdate,
  onReset,
  onClose,
}: SettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>('camera');

  if (!open) return null;

  const cameraOptions: Array<{ id: CameraMode; label: string; desc: string }> = [
    { id: 'firstperson', label: '1인칭', desc: '정밀 조준에 최적화된 뷰모델 시점' },
    { id: 'shiftlock', label: '시프트락', desc: '캐릭터 우측 어깨 너머 3인칭 시점' },
    { id: 'free', label: '자유 시점', desc: '자유 회전 3인칭 아레나 시점' },
  ];

  const qualityOptions: Array<{ id: GraphicsQuality; label: string; desc: string }> = [
    { id: 'low', label: '낮음', desc: '그림자 끔 · 1x 해상도 (최대 프레임)' },
    { id: 'medium', label: '보통', desc: '균형 잡힌 렌더링 품질' },
    { id: 'high', label: '높음', desc: '실시간 그림자 & 고해상도' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 id="settings-modal-title" className="font-display text-lg font-bold text-slate-950">
              게임 환경설정
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">시점 · 오디오 · 그래픽 설정은 즉시 적용 및 저장됩니다.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="설정 닫기"
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-slate-50 border-b border-slate-200">
          <button
            type="button"
            data-settings-tab="camera"
            onClick={() => setTab('camera')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              tab === 'camera' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            시점 설정
          </button>
          <button
            type="button"
            data-settings-tab="audio"
            onClick={() => setTab('audio')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              tab === 'audio' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            오디오
          </button>
          <button
            type="button"
            data-settings-tab="video"
            onClick={() => setTab('video')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              tab === 'video' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            비디오
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[65vh] overflow-y-auto">
          {tab === 'camera' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">기본 카메라 시점 (인게임 V키 전환)</label>
                <div className="grid grid-cols-3 gap-2">
                  {cameraOptions.map((opt) => {
                    const active = settings.cameraMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onUpdate({ cameraMode: opt.id })}
                        className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                          active
                            ? 'bg-slate-950 border-slate-950 text-white'
                            : 'bg-white border-slate-200 text-slate-800 hover:border-slate-400'
                        }`}
                      >
                        <div className="font-display text-xs font-bold">{opt.label}</div>
                        <div className={`text-[10px] mt-0.5 leading-snug ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                          {opt.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
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
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>60° (집중)</span>
                  <span>78° (표준)</span>
                  <span>100° (광각)</span>
                </div>
              </div>

              <div className="space-y-1.5">
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

              <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-slate-800">상하 시점 반전 (Invert Y)</div>
                  <div className="text-[11px] text-slate-500">마우스/터치 위아래 이동 방향을 반대로 적용합니다.</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.invertY}
                  onChange={(e) => onUpdate({ invertY: e.target.checked })}
                  className="w-4 h-4 accent-slate-950"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-slate-800">모바일 조이스틱 자동 달리기</div>
                  <div className="text-[11px] text-slate-500">조이스틱을 끝까지 밀면 자동으로 빠르게 질주합니다.</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.mobileAutoSprint}
                  onChange={(e) => onUpdate({ mobileAutoSprint: e.target.checked })}
                  className="w-4 h-4 accent-slate-950"
                />
              </label>
            </div>
          )}

          {tab === 'audio' && (
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-slate-800">전체 효과음 음소거 (M키)</div>
                  <div className="text-[11px] text-slate-500">모든 전투 타격음과 스킬 사운드를 끕니다.</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.muted}
                  onChange={(e) => onUpdate({ muted: e.target.checked })}
                  className="w-4 h-4 accent-slate-950"
                />
              </label>

              <div className="space-y-1.5">
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
            </div>
          )}

          {tab === 'video' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">그래픽 품질</label>
                <div className="grid grid-cols-3 gap-2">
                  {qualityOptions.map((opt) => {
                    const active = settings.graphicsQuality === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onUpdate({ graphicsQuality: opt.id })}
                        className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                          active
                            ? 'bg-slate-950 border-slate-950 text-white'
                            : 'bg-white border-slate-200 text-slate-800 hover:border-slate-400'
                        }`}
                      >
                        <div className="font-display text-xs font-bold">{opt.label}</div>
                        <div className={`text-[10px] mt-0.5 leading-snug ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                          {opt.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-slate-800">전투 파티클 효과</div>
                  <div className="text-[11px] text-slate-500">타격 파편, 폭발, 스매시 입자 효과를 표시합니다.</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.particlesEnabled}
                  onChange={(e) => onUpdate({ particlesEnabled: e.target.checked })}
                  className="w-4 h-4 accent-slate-950"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-slate-800">실시간 FPS 표시</div>
                  <div className="text-[11px] text-slate-500">전투 화면 상단에 초당 프레임 수치를 표시합니다.</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showFps}
                  onChange={(e) => onUpdate({ showFps: e.target.checked })}
                  className="w-4 h-4 accent-slate-950"
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200 bg-slate-50">
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
