/**
 * Sentinel Web Audio Synthesizer
 * Inspired by Aravindkumar855/Sentinel-security-webcam
 * Pure Web Audio API tone synthesis with zero external audio assets.
 */

class SoundAlertManager {
  private enabled: boolean = true;
  private lastAlertTime: number = 0;
  private cooldownMs: number = 3500; // Prevent spamming sounds

  constructor() {
    const saved = localStorage.getItem('sentinel_sound_enabled');
    if (saved !== null) {
      this.enabled = saved === 'true';
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    localStorage.setItem('sentinel_sound_enabled', String(this.enabled));
    if (this.enabled) {
      this.playChime(true);
    }
    return this.enabled;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    localStorage.setItem('sentinel_sound_enabled', String(val));
  }

  /**
   * Two-Tone Security Notification Chime (Sentinel style)
   */
  public playChime(force = false) {
    if (!this.enabled && !force) return;
    const now = performance.now();
    if (!force && now - this.lastAlertTime < this.cooldownMs) return;
    this.lastAlertTime = now;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      [[784, 0], [1046, 0.20], [784, 0.45], [1046, 0.65]].forEach(([freq, delay]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);

        const startTime = ctx.currentTime + delay;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.20, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.38);

        osc.start(startTime);
        osc.stop(startTime + 0.42);
      });
    } catch (err) {
      console.warn('[Audio] Chime playback error:', err);
    }
  }

  /**
   * Tactical High-Priority Threat Tone (For Weapons and Critical Zone Intrusions)
   */
  public playTacticalAlarm(force = false) {
    if (!this.enabled && !force) return;
    const now = performance.now();
    if (!force && now - this.lastAlertTime < this.cooldownMs) return;
    this.lastAlertTime = now;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Pulsing threat sweep
      [0, 0.25, 0.50].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = ctx.currentTime + delay;
        osc.frequency.setValueAtTime(880, start);
        osc.frequency.exponentialRampToValueAtTime(1400, start + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.28, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

        osc.start(start);
        osc.stop(start + 0.24);
      });
    } catch (err) {
      console.warn('[Audio] Threat alarm playback error:', err);
    }
  }
}

export const soundManager = new SoundAlertManager();
