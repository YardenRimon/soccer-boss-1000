// Synthesized arcade sound effects via Web Audio API (zero external assets)

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    this.muted = muted;
  }

  _tone(freq, endFreq, duration, type = 'sine', gainVal = 0.16, delay = 0) {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  kick(isFire = false) {
    if (isFire) {
      this._tone(240, 620, 0.14, 'sawtooth', 0.15);
      this._tone(160, 70, 0.16, 'triangle', 0.18);
    } else {
      this._tone(190, 75, 0.11, 'triangle', 0.2);
    }
  }

  bossHit(isFire = false) {
    this._tone(isFire ? 420 : 320, 110, 0.18, 'square', 0.14);
    this._tone(660, 880, 0.12, 'sine', 0.12, 0.04);
  }

  queenBlock() {
    this._tone(520, 260, 0.12, 'triangle', 0.15);
  }

  fail() {
    this._tone(220, 90, 0.22, 'sawtooth', 0.14);
    this._tone(150, 65, 0.24, 'square', 0.1, 0.08);
  }

  powerup() {
    this._tone(440, 587, 0.09, 'sine', 0.14, 0);
    this._tone(587, 880, 0.14, 'sine', 0.14, 0.08);
  }

  thunder() {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    // Low rumbling thunder crack + roll
    this._tone(135, 38, 0.45, 'sawtooth', 0.11, 0);
    this._tone(90, 28, 0.65, 'triangle', 0.14, 0.06);
  }

  win() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this._tone(n, n * 1.01, 0.16, 'triangle', 0.16, i * 0.09);
    });
  }
}

export const sound = new SoundEngine();
