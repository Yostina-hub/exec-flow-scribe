// Sound effect utilities for immersive meeting experience

class SoundEffectPlayer {
  private audioContext: AudioContext | null = null;

  private getContext() {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (err) {
        console.error("AudioContext not supported:", err);
        throw new Error("Audio not supported");
      }
    }
    return this.audioContext;
  }

  // Create a short beep sound
  private createBeep(frequency: number, duration: number, volume: number = 0.3) {
    try {
      const ctx = this.getContext();
      
      // Resume context if needed (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(err => console.error("Failed to resume audio:", err));
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (err) {
      // Silently fail if audio isn't available
      console.warn("Sound effect failed:", err);
    }
  }

  // Play a notification sound
  playNotification() {
    this.createBeep(800, 0.1, 0.2);
    setTimeout(() => this.createBeep(1000, 0.1, 0.2), 100);
  }

  // Play a success sound
  playSuccess() {
    this.createBeep(523.25, 0.1, 0.15); // C
    setTimeout(() => this.createBeep(659.25, 0.1, 0.15), 100); // E
    setTimeout(() => this.createBeep(783.99, 0.15, 0.2), 200); // G
  }

  // Play hand raise sound
  playHandRaise() {
    this.createBeep(440, 0.15, 0.2);
  }

  // Play join sound
  playJoin() {
    this.createBeep(660, 0.08, 0.15);
    setTimeout(() => this.createBeep(880, 0.12, 0.2), 80);
  }

  // Play leave sound
  playLeave() {
    this.createBeep(880, 0.08, 0.15);
    setTimeout(() => this.createBeep(660, 0.12, 0.15), 80);
  }

  // Play end meeting sound
  playEndMeeting() {
    this.createBeep(880, 0.1, 0.15);
    setTimeout(() => this.createBeep(660, 0.1, 0.15), 100);
    setTimeout(() => this.createBeep(440, 0.2, 0.2), 200);
  }

  // Play error sound (descending tones)
  playError() {
    this.createBeep(392, 0.15, 0.3); // G4
    setTimeout(() => this.createBeep(293.66, 0.2, 0.35), 150); // D4
  }

  // Clean up
  dispose() {
    try {
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
    } catch (err) {
      console.error("Error disposing audio:", err);
    }
  }
}

export const soundFX = new SoundEffectPlayer();

// Export convenience functions for common sound effects
export const playSuccessSound = () => soundFX.playSuccess();
export const playErrorSound = () => soundFX.playError();
export const playNotificationSound = () => soundFX.playNotification();
