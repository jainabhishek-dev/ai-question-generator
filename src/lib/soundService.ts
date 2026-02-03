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
  private gameEndAudio: HTMLAudioElement | null = null;
  // Layered audio elements for progressive music build-up
  private layeredAudioElements: HTMLAudioElement[] = [];
  private currentLayer: number = 0;
  private layerInterval: NodeJS.Timeout | null = null;
  private isLayeredMusicPlaying: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const win = window as unknown as ExtendedWindow;
      const AudioContextConstructor = win.AudioContext || win.webkitAudioContext || AudioContext;
      this.audioContext = new AudioContextConstructor();
      
      // Initialize custom audio elements
      this.gameStartAudio = new Audio('/sounds/game-start.wav');
      // Removed loop - this is a one-time event sound
      this.gameEndAudio = new Audio('/sounds/game-end.wav');
      
      // Initialize layered audio elements for progressive build-up
      this.layeredAudioElements = [
        new Audio('/sounds/first_sound.m4a'),   // Bass 1
        new Audio('/sounds/second_sound.m4a'),  // Bass 2
        new Audio('/sounds/third_sound.m4a')    // Drums 1
      ];
      
      // Set all to loop and adjust volume for layering
      this.layeredAudioElements.forEach(audio => {
        audio.loop = true;
        audio.volume = 0.5; // Lower volume for better blend
      });
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    
    // Mute/unmute all layered audio tracks
    this.layeredAudioElements.forEach(audio => {
      audio.muted = muted;
    });
    
    // Mute/unmute game start and end sounds
    if (this.gameStartAudio) {
      this.gameStartAudio.muted = muted;
    }
    if (this.gameEndAudio) {
      this.gameEndAudio.muted = muted;
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
  playGameComplete() {
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
   * Start layered background music - progressive build-up
   */
  startBackgroundMusic() {
    if (this.isMuted || this.isLayeredMusicPlaying) return;
    
    this.isLayeredMusicPlaying = true;
    this.currentLayer = 0;
    
    // Start first layer (Bass 1)
    this.layeredAudioElements[0].play().catch(e => {
      console.warn('Audio play failed:', e);
    });
    
    // Add new layer every 10 seconds
    this.layerInterval = setInterval(() => {
      this.currentLayer++;
      if (this.currentLayer < this.layeredAudioElements.length) {
        this.layeredAudioElements[this.currentLayer].play().catch(e => {
          console.warn('Audio play failed:', e);
        });
      } else {
        // All layers playing, stop adding more
        if (this.layerInterval) {
          clearInterval(this.layerInterval);
          this.layerInterval = null;
        }
      }
    }, 10000); // 10 seconds between layers
  }

  /**
   * Stop layered background music
   */
  stopBackgroundMusic() {
    // Stop all layered audio tracks
    this.layeredAudioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    // Clear interval
    if (this.layerInterval) {
      clearInterval(this.layerInterval);
      this.layerInterval = null;
    }
    
    // Reset state
    this.currentLayer = 0;
    this.isLayeredMusicPlaying = false;
  }

  /**
   * Play celebration sound for podium - plays twice
   */
  playCelebration() {
    if (this.isMuted || !this.audioContext) return;

    // Play first celebration
    this.playPodiumCheer();
    
    // Play second celebration after 1 second
    setTimeout(() => {
      this.playPodiumCheer();
    }, 1000);
  }

  /**
   * Single podium cheer sound - ascending triumphant tones
   */
  private playPodiumCheer() {
    if (this.isMuted || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    // Triumphant ascending chord progression
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.05 + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8 + i * 0.1);
      
      osc.connect(gain);
      gain.connect(this.audioContext!.destination);
      
      osc.start(now + i * 0.1);
      osc.stop(now + 0.8 + i * 0.1);
    });
  }
}

// Export singleton instance
export const soundService = new SoundService();
