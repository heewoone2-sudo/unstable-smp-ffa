export class GameAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private softClipCurve: Float32Array<ArrayBuffer> | null = null;
  private muted = false;
  private masterVolume = 0.85;

  public setMuted(m: boolean): void {
    this.muted = m;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(m ? 0 : this.masterVolume, this.ctx.currentTime);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMasterVolume(vol01: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol01));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || this.masterVolume <= 0.001) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx && !this.noiseBuffer) {
      const sampleRate = this.ctx.sampleRate;
      const len = Math.floor(sampleRate * 0.32);
      const buf = this.ctx.createBuffer(1, len, sampleRate);
      const data = buf.getChannelData(0);
      // Slightly brown/pink-weighted noise so transients sound dull & physical rather than digital hiss
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = last * 0.52 + white * 0.48;
        data[i] = last * 1.45;
      }
      this.noiseBuffer = buf;
    }
    if (!this.softClipCurve) {
      const n = 256;
      const buf = new ArrayBuffer(n * 4);
      const curve = new Float32Array(buf);
      for (let i = 0; i < n; i++) {
        const x = (i * 2) / n - 1;
        curve[i] = Math.tanh(x * 2.2);
      }
      this.softClipCurve = curve;
    }
    return this.ctx;
  }

  private jitter(base: number, pct = 0.08): number {
    return base * (1 + (Math.random() * 2 - 1) * pct);
  }

  /**
   * Low-passed heavy physical thud + muted body punch (dull, non-electronic impact).
   */
  private triggerDullThud(
    ctx: AudioContext,
    startTime: number,
    cutoffHz: number,
    bodyStartHz: number,
    bodyEndHz: number,
    gainAmt: number,
    dur = 0.075
  ): void {
    const shaper = ctx.createWaveShaper();
    if (this.softClipCurve) {
      shaper.curve = this.softClipCurve;
    }

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(cutoffHz, startTime);
      filter.frequency.exponentialRampToValueAtTime(Math.max(120, cutoffHz * 0.35), startTime + dur);
      filter.Q.setValueAtTime(0.9, startTime);

      const g = ctx.createGain();
      g.gain.setValueAtTime(gainAmt, startTime);
      g.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

      src.connect(filter).connect(shaper).connect(g).connect(this.masterGain ?? ctx.destination);
      src.start(startTime);
      src.stop(startTime + dur + 0.015);
    }

    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    const bodyLp = ctx.createBiquadFilter();
    bodyLp.type = 'lowpass';
    bodyLp.frequency.setValueAtTime(Math.max(240, bodyStartHz * 2.2), startTime);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(bodyStartHz, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(24, bodyEndHz), startTime + dur * 1.15);

    og.gain.setValueAtTime(gainAmt * 0.95, startTime);
    og.gain.exponentialRampToValueAtTime(0.001, startTime + dur * 1.25);

    osc.connect(bodyLp).connect(shaper).connect(og).connect(this.masterGain ?? ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + dur * 1.3);
  }

  public playSwing(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(this.jitter(440), now);
      filter.frequency.exponentialRampToValueAtTime(190, now + 0.09);
      filter.Q.setValueAtTime(1.1, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
      src.connect(filter).connect(gain).connect(this.masterGain ?? ctx.destination);
      src.start(now);
      src.stop(now + 0.1);
    }
  }

  public playBowShoot(isCrossbow = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isCrossbow ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isCrossbow ? this.jitter(360) : this.jitter(290), now);
    osc.frequency.exponentialRampToValueAtTime(isCrossbow ? 115 : 85, now + 0.09);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
    osc.connect(gain).connect(this.masterGain ?? ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
    this.triggerDullThud(ctx, now, isCrossbow ? 820 : 640, 155, 58, 0.22, 0.06);
  }

  /**
   * High-impact FPS hitmarker + visceral low-end crunch ("틱-퍽!" / crit double-crunch).
   */
  public playHit(isCrit: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const shaper = ctx.createWaveShaper();
    if (this.softClipCurve) {
      shaper.curve = this.softClipCurve;
    }

    // 1. Sharp FPS hitmarker transient tick (non-robotic organic wood/plate click)
    const tick = ctx.createOscillator();
    const tickGain = ctx.createGain();
    tick.type = 'triangle';
    tick.frequency.setValueAtTime(isCrit ? this.jitter(2550, 0.04) : this.jitter(1850, 0.05), now);
    tick.frequency.exponentialRampToValueAtTime(isCrit ? 880 : 620, now + 0.024);
    tickGain.gain.setValueAtTime(isCrit ? 0.34 : 0.25, now);
    tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);
    tick.connect(tickGain).connect(this.masterGain ?? ctx.destination);
    tick.start(now);
    tick.stop(now + 0.032);

    // 2. Band-passed physical impact crack
    if (this.noiseBuffer) {
      const snap = ctx.createBufferSource();
      snap.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(isCrit ? 2250 : 1550, now);
      bp.frequency.exponentialRampToValueAtTime(480, now + 0.055);
      bp.Q.setValueAtTime(1.1, now);
      const sg = ctx.createGain();
      sg.gain.setValueAtTime(isCrit ? 0.56 : 0.42, now);
      sg.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      snap.connect(bp).connect(shaper).connect(sg).connect(this.masterGain ?? ctx.destination);
      snap.start(now);
      snap.stop(now + 0.068);
    }

    // 3. Heavy chest sub-punch
    if (isCrit) {
      this.triggerDullThud(ctx, now, this.jitter(820), this.jitter(162), 38, 0.54, 0.075);
      this.triggerDullThud(ctx, now + 0.045, this.jitter(940), this.jitter(196), 44, 0.52, 0.088);
    } else {
      this.triggerDullThud(ctx, now, this.jitter(640), this.jitter(142), 40, 0.46, 0.07);
    }
  }

  /**
   * Muffled low chest impact when taking damage.
   */
  public playPlayerHurt(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerDullThud(ctx, now, this.jitter(360), this.jitter(105), 32, 0.42, 0.11);
  }

  public playBlockPlace(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerDullThud(ctx, now, this.jitter(420), this.jitter(128), 52, 0.34, 0.065);
  }

  public playLavaSizzle(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerDullThud(ctx, now, 780, 92, 38, 0.28, 0.14);
  }

  public playLavaBucket(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerDullThud(ctx, now, 480, 125, 42, 0.36, 0.11);
    this.triggerDullThud(ctx, now + 0.045, 720, 88, 36, 0.24, 0.13);
  }

  public playWaterSplash(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerDullThud(ctx, now, 680, 210, 85, 0.28, 0.12);
  }

  public playFireSwing(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerDullThud(ctx, now, this.jitter(520), 145, 58, 0.24, 0.09);
  }

  public playSpearThrust(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerDullThud(ctx, now, this.jitter(600), 175, 65, 0.26, 0.075);
  }

  public playHeavySwing(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerDullThud(ctx, now, this.jitter(340), 120, 42, 0.34, 0.12);
  }

  public playTridentThrow(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerDullThud(ctx, now, 540, 190, 72, 0.24, 0.1);
  }

  public playTntIgnite(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerDullThud(ctx, now, 460, 118, 46, 0.28, 0.09);
  }

  public playShadowStep(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerDullThud(ctx, now, 380, 140, 44, 0.3, 0.15);
  }

  public playPotionSplash(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerDullThud(ctx, now, 620, 220, 95, 0.28, 0.095);
    this.triggerDullThud(ctx, now + 0.04, 480, 165, 78, 0.2, 0.09);
  }

  public playMaceSmash(intensity = 1): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const scale = Math.min(1.4, 0.9 + intensity * 0.22);
    this.triggerDullThud(ctx, now, 560, 135, 30, 0.48 * scale, 0.16);
    this.triggerDullThud(ctx, now + 0.045, 380, 98, 26, 0.42 * scale, 0.26);
  }

  public playExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerDullThud(ctx, now, 440, 112, 24, 0.55, 0.32);
    this.triggerDullThud(ctx, now + 0.03, 280, 76, 22, 0.45, 0.36);
  }

  public playCobweb(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerDullThud(ctx, now, 520, 165, 68, 0.24, 0.07);
  }

  public playCobwebSlice(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerDullThud(ctx, now, 560, 150, 58, 0.26, 0.065);
  }

  public playCobwebHoldTick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerDullThud(ctx, now, 420, 128, 56, 0.18, 0.055);
  }

  public playWindCharge(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerDullThud(ctx, now, 580, 140, 62, 0.26, 0.12);
  }

  public playFireworkBoost(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Initial rocket tube pop
    this.triggerDullThud(ctx, now, 680, 165, 55, 0.34, 0.085);

    // Pressurized firework exhaust hiss sweeping smoothly
    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1900, now + 0.02);
      bp.frequency.exponentialRampToValueAtTime(640, now + 0.32);
      bp.Q.setValueAtTime(1.2, now + 0.02);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.28, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      src.connect(bp).connect(g).connect(this.masterGain ?? ctx.destination);
      src.start(now);
      src.stop(now + 0.34);
    }
  }

  public playPearlWarp(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerDullThud(ctx, now, 460, 155, 52, 0.3, 0.14);
  }

  public playGapple(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerDullThud(ctx, now, 440, 130, 58, 0.26, 0.065);
    this.triggerDullThud(ctx, now + 0.075, 500, 155, 68, 0.24, 0.075);
  }

  public playShieldBlock(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerDullThud(ctx, now, 430, 118, 44, 0.38, 0.085);
  }

  public playJump(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerDullThud(ctx, now, 300, 115, 54, 0.14, 0.06);
  }

  /**
   * Crisp, high-impact PvP elimination / death SFX:
   * Layer 1: High-definition transient crack/snap to slice cleanly through combat audio
   * Layer 2: Heavy saturated sub-bass impact thump
   * Layer 3: Distinct confirmation hit (punchy armor-drop snap for enemy KO, deep collapse for player death)
   */
  public playDeath(isPlayer = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const shaper = ctx.createWaveShaper();
    if (this.softClipCurve) {
      shaper.curve = this.softClipCurve;
    }

    // 1. Crisp transient crack (noise + pitch-swept click)
    if (this.noiseBuffer) {
      const snapSrc = ctx.createBufferSource();
      snapSrc.buffer = this.noiseBuffer;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(isPlayer ? 1350 : 2100, now);
      bp.frequency.exponentialRampToValueAtTime(isPlayer ? 380 : 680, now + 0.055);
      bp.Q.setValueAtTime(1.35, now);

      const snapGain = ctx.createGain();
      snapGain.gain.setValueAtTime(isPlayer ? 0.55 : 0.68, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      snapSrc.connect(bp).connect(shaper).connect(snapGain).connect(this.masterGain ?? ctx.destination);
      snapSrc.start(now);
      snapSrc.stop(now + 0.07);
    }

    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(isPlayer ? 480 : 720, now);
    clickOsc.frequency.exponentialRampToValueAtTime(95, now + 0.032);
    clickGain.gain.setValueAtTime(0.42, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.036);
    clickOsc.connect(shaper).connect(clickGain).connect(this.masterGain ?? ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.042);

    // 2. Heavy sub-chest impact
    this.triggerDullThud(
      ctx,
      now,
      isPlayer ? 620 : 820,
      isPlayer ? 138 : 165,
      isPlayer ? 24 : 30,
      0.56,
      0.16
    );

    // 3. Delayed confirmation drop (armor shatter for enemy KO vs deep collapse for player death)
    if (isPlayer) {
      this.triggerDullThud(ctx, now + 0.075, 420, 108, 22, 0.48, 0.25);
    } else {
      if (this.noiseBuffer) {
        const tailSrc = ctx.createBufferSource();
        tailSrc.buffer = this.noiseBuffer;

        const tailBp = ctx.createBiquadFilter();
        tailBp.type = 'bandpass';
        tailBp.frequency.setValueAtTime(1650, now + 0.06);
        tailBp.frequency.exponentialRampToValueAtTime(420, now + 0.16);
        tailBp.Q.setValueAtTime(1.1, now + 0.06);

        const tailGain = ctx.createGain();
        tailGain.gain.setValueAtTime(0.0001, now);
        tailGain.gain.setValueAtTime(0.42, now + 0.06);
        tailGain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

        tailSrc.connect(tailBp).connect(shaper).connect(tailGain).connect(this.masterGain ?? ctx.destination);
        tailSrc.start(now + 0.06);
        tailSrc.stop(now + 0.18);
      }
      this.triggerDullThud(ctx, now + 0.06, 700, 185, 44, 0.44, 0.12);
    }
  }

  public playKo(): void {
    this.playDeath(false);
  }

  public playTelegraph(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerDullThud(ctx, now, 360, 128, 72, 0.14, 0.1);
  }

  public playJumpPad(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.19);
    g.gain.setValueAtTime(0.26, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(g).connect(this.masterGain ?? ctx.destination);
    osc.start(now);
    osc.stop(now + 0.23);
    this.triggerDullThud(ctx, now, 540, 140, 62, 0.26, 0.09);
  }

  private triggerValorantHit(
    ctx: AudioContext,
    startTime: number,
    rootHz: number,
    durationSec: number,
    gainAmt: number,
    withFifth = false
  ): void {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(4800, rootHz * 4.5), startTime);
    lp.frequency.exponentialRampToValueAtTime(Math.max(900, rootHz * 1.8), startTime + durationSec);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(gainAmt, startTime + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec);

    const o1 = ctx.createOscillator();
    o1.type = 'triangle';
    o1.frequency.setValueAtTime(rootHz, startTime);

    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(rootHz * 2, startTime);
    const o2Gain = ctx.createGain();
    o2Gain.gain.setValueAtTime(0.45, startTime);

    o1.connect(lp);
    o2.connect(o2Gain).connect(lp);

    if (withFifth) {
      const o3 = ctx.createOscillator();
      o3.type = 'triangle';
      o3.frequency.setValueAtTime(rootHz * 1.498, startTime);
      const o3Gain = ctx.createGain();
      o3Gain.gain.setValueAtTime(0.55, startTime);
      o3.connect(o3Gain).connect(lp);
      o3.start(startTime);
      o3.stop(startTime + durationSec + 0.02);
    }

    lp.connect(env).connect(this.masterGain ?? ctx.destination);
    o1.start(startTime);
    o2.start(startTime);
    o1.stop(startTime + durationSec + 0.02);
    o2.stop(startTime + durationSec + 0.02);

    // Tight sub-bass chest kick under the chime
    this.triggerDullThud(ctx, startTime, 980, 145, 36, gainAmt * 0.95, 0.075);
  }

  /**
   * Valorant-style escalating multi-kill audio:
   * 1 kill: 빰! | 2 kills: 빰! (higher) | 3 kills: 빰!! (chord)
   * 4 kills: 빰-빰! | 5 kills (Ace): 빠-바-바-밤!! | 6+ (Overkill): 빠-바-바-바-밤!!
   */
  public playMultiKillChime(streak: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const s = Math.max(1, streak);

    if (s === 1) {
      this.triggerValorantHit(ctx, now, 587.33, 0.32, 0.28, false); // D5: 빰
    } else if (s === 2) {
      this.triggerValorantHit(ctx, now, 659.25, 0.36, 0.30, false); // E5: 빰!
    } else if (s === 3) {
      this.triggerValorantHit(ctx, now, 739.99, 0.42, 0.32, true); // F#5 + 5th: 빰!!
    } else if (s === 4) {
      // 4 kills: 빰-빰!
      this.triggerValorantHit(ctx, now, 783.99, 0.14, 0.28, false);
      this.triggerValorantHit(ctx, now + 0.11, 880.0, 0.45, 0.34, true);
    } else if (s === 5) {
      // 5 kills (Ace): 빠-바-바-밤!!
      const notes = [659.25, 739.99, 880.0, 1174.66];
      const offsets = [0, 0.072, 0.144, 0.225];
      notes.forEach((hz, idx) => {
        const isLast = idx === notes.length - 1;
        this.triggerValorantHit(ctx, now + offsets[idx], hz, isLast ? 0.58 : 0.11, isLast ? 0.36 : 0.24, isLast);
      });
    } else {
      // 6+ kills (Overkill): 빠-바-바-바-밤!!
      const notes = [698.46, 783.99, 880.0, 1046.5, 1318.51];
      const offsets = [0, 0.06, 0.12, 0.18, 0.25];
      notes.forEach((hz, idx) => {
        const isLast = idx === notes.length - 1;
        this.triggerValorantHit(ctx, now + offsets[idx], hz, isLast ? 0.65 : 0.1, isLast ? 0.38 : 0.25, isLast);
      });
    }
  }

  public playMapVotePop(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.08);
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(g).connect(this.masterGain ?? ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playRouletteTick(step = 0): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    const freq = 360 + (step % 8) * 32;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.72, now + 0.04);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(g).connect(this.masterGain ?? ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playRouletteLock(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [523.25, 783.99, 1046.5];
    for (let i = 0; i < freqs.length; i++) {
      const t = now + i * 0.045;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freqs[i], t);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(g).connect(this.masterGain ?? ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    }
  }

  public playBountyClaim(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [587.33, 739.99, 880, 1174.66];
    for (let i = 0; i < notes.length; i++) {
      const t = now + i * 0.05;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(notes[i], t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.24, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(g).connect(this.masterGain ?? ctx.destination);
      osc.start(t);
      osc.stop(t + 0.32);
    }
  }

  public playRoundAdvance(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    for (let i = 0; i < notes.length; i++) {
      const t = now + i * 0.065;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(notes[i], t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
      osc.connect(g).connect(this.masterGain ?? ctx.destination);
      osc.start(t);
      osc.stop(t + 0.36);
    }
  }

  public playJackpotElimination(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Celebratory 777 slot-machine fanfare + coin cascade
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
    for (let i = 0; i < notes.length; i++) {
      const t = now + i * 0.048;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(notes[i], t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.25, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(g).connect(this.masterGain ?? ctx.destination);
      osc.start(t);
      osc.stop(t + 0.34);
    }
    this.triggerDullThud(ctx, now + 0.12, 620, 150, 38, 0.38, 0.18);
  }
}
