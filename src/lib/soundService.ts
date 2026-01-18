/**
 * Sound Service for Quiz Games
 * Combines Web Audio API for sound effects with custom audio files for music
 */

// Extend Window interface for webkit prefix support
interface ExtendedWindow extends Window {
  AudioContext: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

class SoundService {
  private audioContext: AudioContext | null = null;
  private isMuted: boolean = false;
  // Custom audio elements for instaku sounds
  private gameStartAudio: HTMLAudioElement | null = null;
  private backgroundMusicAudio: HTMLAudioElement | null = null;
  private gameEndAudio: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const win = window as unknown as ExtendedWindow;
      const AudioContextConstructor = win.AudioContext || win.webkitAudioContext || AudioContext;
      this.audioContext = new AudioContextConstructor();
      
      // Initialize custom audio elements
      this.gameStartAudio = new Audio('/sounds/game-start.wav');
      this.gameStartAudio.loop = true;
      this.backgroundMusicAudio = new Audio('/sounds/background-music.wav');
      this.backgroundMusicAudio.loop = true;
      this.backgroundMusicAudio.volume = 1.0; // Use full system volume
      this.gameEndAudio = new Audio('/sounds/game-end.wav');
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.backgroundMusicAudio) {
      this.backgroundMusicAudio.muted = muted;
    }
  }

  getMuted() {
    return this.isMuted;
  }

  /**
   * Play correct answer sound - cheerful ascending tones
   */
  playCorrect() {
    if (this.isMuted || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    // Cheerful ascending chord
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      
      osc.connect(gain);
      gain.connect(this.audioContext!.destination);
      
      osc.start(now + i * 0.1);
      osc.stop(now + 0.5 + i * 0.1);
    });
  }

  /**
   * Play incorrect answer sound - descending tones
   */
  playIncorrect() {
    if (this.isMuted || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    // Sad descending tones
    [392.00, 329.63].forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      
      osc.connect(gain);
      gain.connect(this.audioContext!.destination);
      
      osc.start(now + i * 0.15);
      osc.stop(now + 0.4 + i * 0.15);
    });
  }

  /**
   * Play game start sound - custom instaku sound
   */
  playGameStart() {
    if (this.isMuted || !this.gameStartAudio) return;

    this.gameStartAudio.currentTime = 0;
    this.gameStartAudio.play().catch(err => {
      console.warn('Failed to play game start sound:', err);
    });
  }

  /**
   * Stop game start sound
   */
  stopGameStart() {
    if (this.gameStartAudio) {
      this.gameStartAudio.pause();
      this.gameStartAudio.currentTime = 0;
    }
  }

  /**
   * Play streak sound - exciting combo
   */
  playStreak(streakCount: number) {
    if (this.isMuted || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    const baseFreq = 523.25 + (streakCount * 50); // Higher pitch for longer streaks
    
    // Quick ascending beep
    const osc = this.audioContext!.createOscillator();
    const gain = this.audioContext!.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.linearRampToValueAtTime(baseFreq * 1.5, now + 0.1);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.connect(gain);
    gain.connect(this.audioContext!.destination);
    
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Play points earned sound - satisfying ding
   */
  playPoints(points: number) {
    if (this.isMuted || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    const intensity = Math.min(points / 500, 1); // 0 to 1 based on points
    
    // Bell-like sound
    [1046.50, 1318.51, 1567.98].forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const vol = 0.2 * intensity;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      
      osc.connect(gain);
      gain.connect(this.audioContext!.destination);
      
      osc.start(now + i * 0.02);
      osc.stop(now + 0.3 + i * 0.02);
    });
  }

  /**
   * Play game complete sound - custom instaku sound
   */
  playGameComplete(won: boolean) {
    if (this.isMuted || !this.gameEndAudio) return;

    // Use same sound for both win and lose
    this.gameEndAudio.currentTime = 0;
    this.gameEndAudio.play().catch(err => {
      console.warn('Failed to play game end sound:', err);
    });
  }

  /**
   * Stop game end sound
   */
  stopGameEnd() {
    if (this.gameEndAudio) {
      this.gameEndAudio.pause();
      this.gameEndAudio.currentTime = 0;
    }
  }

  /**
   * Play button click sound
   */
  playClick() {
    if (this.isMuted || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    const osc = this.audioContext!.createOscillator();
    const gain = this.audioContext!.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = 800;
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    
    osc.connect(gain);
    gain.connect(this.audioContext!.destination);
    
    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Play countdown tick sound
   */
  playTick() {
    if (this.isMuted || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    const osc = this.audioContext!.createOscillator();
    const gain = this.audioContext!.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = 1000;
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
    
    osc.connect(gain);
    gain.connect(this.audioContext!.destination);
    
    osc.start(now);
    osc.stop(now + 0.03);
  }

  /**
   * Start background music - custom instaku sound
   */
  startBackgroundMusic() {
    if (this.isMuted || !this.backgroundMusicAudio) return;
    
    // Stop any existing music before starting new one
    if (!this.backgroundMusicAudio.paused) {
      this.stopBackgroundMusic();
    }

    this.backgroundMusicAudio.currentTime = 0;
    this.backgroundMusicAudio.play().catch(err => {
      console.warn('Failed to play background music:', err);
    });
  }

  /**
   * Stop background music
   */
  stopBackgroundMusic() {
    if (this.backgroundMusicAudio) {
      this.backgroundMusicAudio.pause();
      this.backgroundMusicAudio.currentTime = 0;
    }
  }
}

// Export singleton instance
export const soundService = new SoundService();
