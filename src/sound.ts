// Synthesized Web Audio API sound effects with multiple atmospheric Sound Themes
export type SoundTheme = 'gothic' | 'cyberpunk' | 'fantasy';

export interface SoundThemeConfig {
  id: SoundTheme;
  name: string;
  badge: string;
  description: string;
}

export const SOUND_THEMES: SoundThemeConfig[] = [
  {
    id: 'gothic',
    name: '冥界ゴシック',
    badge: 'GOTHIC',
    description: '大聖堂の鐘、重厚な鉄石の打音、陰鬱なオルガン和音'
  },
  {
    id: 'cyberpunk',
    name: '電脳サイバー',
    badge: 'CYBER',
    description: '高速レーザーパルス、FMデジタルグリッチ、重低音サイバーベース'
  },
  {
    id: 'fantasy',
    name: '深淵魔導',
    badge: 'FANTASY',
    description: '漆黒の呪術波、神聖アルペジオ、地響きサブベース'
  }
];

class SoundFX {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  public theme: SoundTheme = 'gothic';

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setTheme(newTheme: SoundTheme) {
    this.theme = newTheme;
    this.previewTheme(newTheme);
  }

  // Preview sound when changing themes
  public previewTheme(themeToPreview: SoundTheme) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      if (themeToPreview === 'gothic') {
        // Church bell toll preview
        [220, 277.18, 329.63].forEach((freq) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.18, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.5);
        });
      } else if (themeToPreview === 'cyberpunk') {
        // High-tech cyber boot chirp
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(1400, t + 0.15);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
      } else {
        // Fantasy magic ping
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t + i * 0.05);
          gain.gain.setValueAtTime(0.15, t + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.3);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t + i * 0.05);
          osc.stop(t + i * 0.05 + 0.3);
        });
      }
    } catch {
      // ignore
    }
  }

  // Stone drop / strike
  playPlace(isPlayer: boolean) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      if (this.theme === 'gothic') {
        // Heavy iron/stone bell thud
        const osc = this.ctx.createOscillator();
        const sub = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        sub.type = 'triangle';
        const baseFreq = isPlayer ? 130 : 190;
        osc.frequency.setValueAtTime(baseFreq, t);
        osc.frequency.exponentialRampToValueAtTime(55, t + 0.2);
        sub.frequency.setValueAtTime(baseFreq * 1.5, t);
        sub.frequency.exponentialRampToValueAtTime(70, t + 0.15);

        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(gain);
        sub.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        sub.start(t);
        osc.stop(t + 0.2);
        sub.stop(t + 0.2);
      } else if (this.theme === 'cyberpunk') {
        // Punchy FM laser attack
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = isPlayer ? 'sawtooth' : 'square';
        const startFreq = isPlayer ? 980 : 1200;
        osc.frequency.setValueAtTime(startFreq, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.09);

        gain.gain.setValueAtTime(0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.09);
      } else {
        // Fantasy (default)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isPlayer ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(isPlayer ? 180 : 320, t);
        osc.frequency.exponentialRampToValueAtTime(isPlayer ? 60 : 120, t + 0.12);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
      }
    } catch {
      // ignore
    }
  }

  // Reversal mental rewrite sound
  playFlip(count: number) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      if (this.theme === 'gothic') {
        // Haunting dark choral fifth / metallic chime
        const baseFreq = 220 + Math.min(count * 25, 200);
        [baseFreq, baseFreq * 1.5].forEach((freq) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.1, t + 0.22);

          gain.gain.setValueAtTime(0.16, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.22);
        });
      } else if (this.theme === 'cyberpunk') {
        // Digital glitch frequency modulation sweep
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const base = 400 + Math.min(count * 80, 600);
        osc.type = 'square';
        osc.frequency.setValueAtTime(base, t);
        osc.frequency.linearRampToValueAtTime(base * 2.2, t + 0.1);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
      } else {
        // Fantasy mental rewrite sweep
        const baseFreq = 260 + Math.min(count * 40, 400);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(baseFreq, t);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.15);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
      }
    } catch {
      // ignore
    }
  }

  // Absolute Sanctuary (Corner)
  playCorner() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      if (this.theme === 'gothic') {
        // Deep cathedral church bell toll (A minor chord with long resonant decay)
        const bellTones = [164.81, 220.00, 261.63, 329.63]; // E3, A3, C4, E4
        bellTones.forEach((freq, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + idx * 0.08);

          gain.gain.setValueAtTime(0.24, t + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.85);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t + idx * 0.08);
          osc.stop(t + idx * 0.08 + 0.85);
        });
      } else if (this.theme === 'cyberpunk') {
        // Forcefield initialization arpeggio
        const arp = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        arp.forEach((freq, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, t + idx * 0.04);

          gain.gain.setValueAtTime(0.18, t + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.35);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t + idx * 0.04);
          osc.stop(t + idx * 0.04 + 0.35);
        });
      } else {
        // Fantasy divine chord
        const chords = [523.25, 659.25, 783.99, 1046.50];
        chords.forEach((freq, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + idx * 0.06);

          gain.gain.setValueAtTime(0.2, t + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.4);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t + idx * 0.06);
          osc.stop(t + idx * 0.06 + 0.4);
        });
      }
    } catch {
      // ignore
    }
  }

  // Annihilation Reversal (All out terror)
  playCalamity() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      if (this.theme === 'gothic') {
        // Dissonant pipe organ cluster & dark thunder boom
        const organNotes = [65.41, 92.50, 130.81, 185.00]; // C2, F#2, C3, F#3 tritone
        organNotes.forEach((freq) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, t);
          osc.frequency.exponentialRampToValueAtTime(freq * 0.85, t + 0.7);

          gain.gain.setValueAtTime(0.22, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.7);
        });
      } else if (this.theme === 'cyberpunk') {
        // Detuned cyber reese bass drop + distortion sweep
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(240, t);
        osc1.frequency.exponentialRampToValueAtTime(35, t + 0.65);
        osc2.frequency.setValueAtTime(243, t); // 3Hz detune for massive chorus
        osc2.frequency.exponentialRampToValueAtTime(36, t + 0.65);

        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.65);
        osc2.stop(t + 0.65);
      } else {
        // Fantasy sub-bass cataclysm shockwave
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.6);

        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.6);
      }
    } catch {
      // ignore
    }
  }

  // Countdown urgent tick (< 5s)
  playWarningTick(urgent: boolean) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      if (this.theme === 'gothic') {
        // Grandfather clock / iron pendulum tick
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(urgent ? 520 : 330, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.07);

        gain.gain.setValueAtTime(urgent ? 0.25 : 0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.07);
      } else if (this.theme === 'cyberpunk') {
        // High-tech digital alarm blip
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(urgent ? 1600 : 1000, t);

        gain.gain.setValueAtTime(urgent ? 0.22 : 0.09, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
      } else {
        // Fantasy tension tick
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = urgent ? 'square' : 'sine';
        osc.frequency.setValueAtTime(urgent ? 880 : 440, t);

        gain.gain.setValueAtTime(urgent ? 0.2 : 0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.08);
      }
    } catch {
      // ignore
    }
  }
}

export const sounds = new SoundFX();
