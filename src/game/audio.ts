export class GameAudio {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private softClipCurve: Float32Array<ArrayBuffer> | null = null;
  private muted = false;

  public setMuted(m: boolean): void {
    this.muted = m;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
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

      src.connect(filter).connect(shaper).connect(g).connect(ctx.destination);
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

    osc.connect(bodyLp).connect(shaper).connect(og).connect(ctx.destination);
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
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start(now);
      src.stop(now + 0.1);
    }
  }

  /**
   * Heavy, dull meaty hit ("퍽!") & weighty double-thud critical ("퍽-퍽!").
   */
  public playHit(isCrit: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (isCrit) {
      this.triggerDullThud(ctx, now, this.jitter(680), this.jitter(148), 40, 0.44, 0.068);
      this.triggerDullThud(ctx, now + 0.056, this.jitter(760), this.jitter(172), 42, 0.48, 0.085);
    } else {
      this.triggerDullThud(ctx, now, this.jitter(520), this.jitter(132), 42, 0.36, 0.068);
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

      src.connect(bp).connect(g).connect(ctx.destination);
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

      snapSrc.connect(bp).connect(shaper).connect(snapGain).connect(ctx.destination);
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
    clickOsc.connect(shaper).connect(clickGain).connect(ctx.destination);
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

        tailSrc.connect(tailBp).connect(shaper).connect(tailGain).connect(ctx.destination);
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
}
