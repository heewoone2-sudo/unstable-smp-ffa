export class GameAudio {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
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
      const len = Math.floor(sampleRate * 0.25);
      const buf = this.ctx.createBuffer(1, len, sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
    }
    return this.ctx;
  }

  private jitter(base: number, pct = 0.07): number {
    return base * (1 + (Math.random() * 2 - 1) * pct);
  }

  private triggerSnap(ctx: AudioContext, startTime: number, freq: number, gainAmt: number, dur = 0.045): void {
    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq, startTime);
      filter.Q.setValueAtTime(2.2, startTime);

      const g = ctx.createGain();
      g.gain.setValueAtTime(gainAmt, startTime);
      g.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

      src.connect(filter).connect(g).connect(ctx.destination);
      src.start(startTime);
      src.stop(startTime + dur + 0.01);
    }

    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 0.45, startTime);
    osc.frequency.exponentialRampToValueAtTime(95, startTime + dur);
    og.gain.setValueAtTime(gainAmt * 0.75, startTime);
    og.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
    osc.connect(og).connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.01);
  }

  public playSwing(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(900, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start(now);
      src.stop(now + 0.085);
    }
  }

  /**
   * Visceral Java-style hit ("때리는 소리" snappy slap + crunch) & "TAK-TAK" double-crack critical hit sound.
   */
  public playHit(isCrit: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (isCrit) {
      // "TAK-TAK!" double percussive crunch + low body thud
      this.triggerSnap(ctx, now, this.jitter(2150), 0.36, 0.044);
      this.triggerSnap(ctx, now + 0.052, this.jitter(2680), 0.4, 0.056);

      const punch = ctx.createOscillator();
      const pg = ctx.createGain();
      punch.type = 'sine';
      punch.frequency.setValueAtTime(175, now);
      punch.frequency.exponentialRampToValueAtTime(52, now + 0.11);
      pg.gain.setValueAtTime(0.26, now);
      pg.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      punch.connect(pg).connect(ctx.destination);
      punch.start(now);
      punch.stop(now + 0.13);
    } else {
      // Punchy slap-thwack matching "때리는 소리" transient
      this.triggerSnap(ctx, now, this.jitter(1650), 0.28, 0.046);
      const body = ctx.createOscillator();
      const bg = ctx.createGain();
      body.type = 'triangle';
      body.frequency.setValueAtTime(155, now);
      body.frequency.exponentialRampToValueAtTime(58, now + 0.085);
      bg.gain.setValueAtTime(0.2, now);
      bg.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      body.connect(bg).connect(ctx.destination);
      body.start(now);
      body.stop(now + 0.095);
    }
  }

  /**
   * Distinct player-receiving-damage impact ("맞는 소리" bone/armor crack + low oof thud).
   */
  public playPlayerHurt(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    this.triggerSnap(ctx, now, this.jitter(1050), 0.34, 0.062);

    const thud = ctx.createOscillator();
    const tg = ctx.createGain();
    thud.type = 'sawtooth';
    thud.frequency.setValueAtTime(135, now);
    thud.frequency.exponentialRampToValueAtTime(46, now + 0.12);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(520, now);

    tg.gain.setValueAtTime(0.26, now);
    tg.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    thud.connect(lp).connect(tg).connect(ctx.destination);
    thud.start(now);
    thud.stop(now + 0.14);
  }

  public playBlockPlace(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerSnap(ctx, now, this.jitter(680), 0.28, 0.045);
    const thud = ctx.createOscillator();
    const g = ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(160, now);
    thud.frequency.exponentialRampToValueAtTime(65, now + 0.06);
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    thud.connect(g).connect(ctx.destination);
    thud.start(now);
    thud.stop(now + 0.07);
  }

  public playLavaSizzle(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerSnap(ctx, now, 3400, 0.28, 0.14);
    this.triggerSnap(ctx, now + 0.035, 1100, 0.2, 0.08);
  }

  public playLavaBucket(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerSnap(ctx, now, 920, 0.3, 0.07);
    this.triggerSnap(ctx, now + 0.03, 3200, 0.26, 0.14);
    const sub = ctx.createOscillator();
    const g = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(175, now);
    sub.frequency.exponentialRampToValueAtTime(52, now + 0.12);
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    sub.connect(g).connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.14);
  }

  public playWaterSplash(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerSnap(ctx, now, 1550, 0.3, 0.12);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playFireSwing(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerSnap(ctx, now, this.jitter(2200), 0.22, 0.065);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.08);
    g.gain.setValueAtTime(0.11, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playSpearThrust(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerSnap(ctx, now, this.jitter(2400), 0.25, 0.055);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.09);
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playHeavySwing(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerSnap(ctx, now, this.jitter(780), 0.26, 0.075);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(62, now + 0.1);
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playTridentThrow(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerSnap(ctx, now, 2600, 0.22, 0.05);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.13);
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playTntIgnite(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerSnap(ctx, now, 1300, 0.24, 0.06);
    this.triggerSnap(ctx, now + 0.04, 3800, 0.16, 0.12);
  }

  public playShadowStep(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerSnap(ctx, now, 1800, 0.22, 0.09);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.18);
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playPotionSplash(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerSnap(ctx, now, 3400, 0.28, 0.055);
    [587.33, 783.99, 987.77].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      gain.gain.setValueAtTime(0.14, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.13);
    });
  }

  public playMaceSmash(intensity = 1): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    this.triggerSnap(ctx, now, 1800, 0.38, 0.08);
    this.triggerSnap(ctx, now + 0.045, 1100, 0.3, 0.1);

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(155 + intensity * 35, now);
    sub.frequency.exponentialRampToValueAtTime(34, now + 0.36);
    subGain.gain.setValueAtTime(Math.min(0.4, 0.26 + intensity * 0.1), now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    sub.connect(subGain).connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.39);

    const clang = ctx.createOscillator();
    const clangGain = ctx.createGain();
    clang.type = 'triangle';
    clang.frequency.setValueAtTime(this.jitter(560), now);
    clang.frequency.exponentialRampToValueAtTime(190, now + 0.22);
    clangGain.gain.setValueAtTime(0.18, now);
    clangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
    clang.connect(clangGain).connect(ctx.destination);
    clang.start(now);
    clang.stop(now + 0.24);
  }

  public playExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerSnap(ctx, now, 620, 0.44, 0.18);
    const sub = ctx.createOscillator();
    const g = ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(125, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 0.36);
    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.37);
    sub.connect(g).connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.38);
  }

  public playCobweb(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerSnap(ctx, now, 2800, 0.26, 0.055);
    const pop = ctx.createOscillator();
    const g = ctx.createGain();
    pop.type = 'triangle';
    pop.frequency.setValueAtTime(320, now);
    pop.frequency.exponentialRampToValueAtTime(140, now + 0.06);
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    pop.connect(g).connect(ctx.destination);
    pop.start(now);
    pop.stop(now + 0.07);
  }

  public playWindCharge(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerSnap(ctx, now, 1750, 0.22, 0.06);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.jitter(240), now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.15);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playPearlWarp(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerSnap(ctx, now, 2100, 0.2, 0.05);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(780, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.11);
    osc.frequency.exponentialRampToValueAtTime(1040, now + 0.22);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playGapple(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerSnap(ctx, now, 1900, 0.24, 0.045);
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.055);
      gain.gain.setValueAtTime(0.16, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.14);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.15);
    });
  }

  public playShieldBlock(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerSnap(ctx, now, 950, 0.26, 0.055);
  }

  public playJump(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.jitter(180), now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.075);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playKo(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerSnap(ctx, now, 1600, 0.24, 0.06);
    [440, 554.37, 659.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);
      gain.gain.setValueAtTime(0.16, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.19);
    });
  }

  public playTelegraph(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(590, now + 0.18);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }
}

