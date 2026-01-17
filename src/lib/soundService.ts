/**
 * Sound Service for Quiz Games
 * Generates game sounds using Web Audio API
 * Similar to Kahoot's engaging sound effects
 */

// Extend Window interface for webkit prefix support
interface ExtendedWindow extends Window {
  AudioContext: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

class SoundService {
  private audioContext: AudioContext | null = null;
  private isMuted: boolean = false;
  private backgroundMusic: OscillatorNode | null = null;
  private musicGain: GainNode | null = null;
  private musicStyle: 'upbeat' | 'energetic' | 'calm' | 'retro' | 'epic' | 'adventure' | 'magical' | 'mario' | 'kahoot' = 'kahoot';
  private musicLoopTimeout: NodeJS.Timeout | null = null;
  private variationCount: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      const win = window as unknown as ExtendedWindow;
      const AudioContextConstructor = win.AudioContext || win.webkitAudioContext || AudioContext;
      this.audioContext = new AudioContextConstructor();
    }
  }

  setMusicStyle(style: 'upbeat' | 'energetic' | 'calm' | 'retro' | 'epic' | 'adventure' | 'magical' | 'mario' | 'kahoot') {
    this.musicStyle = style;
    // Restart music with new style if already playing
    if (this.backgroundMusic) {
      this.stopBackgroundMusic();
      this.startBackgroundMusic();
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.musicGain) {
      this.musicGain.gain.setTargetAtTime(0, this.audioContext!.currentTime, 0.1);
    } else if (!muted && this.musicGain) {
      this.musicGain.gain.setTargetAtTime(0.20, this.audioContext!.currentTime, 0.1);
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
   * Play game start sound - exciting fanfare
   */
  playGameStart() {
    if (this.isMuted || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    // Exciting fanfare
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      
      osc.type = 'square';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      
      osc.connect(gain);
      gain.connect(this.audioContext!.destination);
      
      osc.start(now + i * 0.08);
      osc.stop(now + 0.3 + i * 0.08);
    });
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
   * Play game complete sound - victory fanfare
   */
  playGameComplete(won: boolean) {
    if (this.isMuted || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    if (won) {
      // Victory fanfare - ascending major scale
      [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50].forEach((freq, i) => {
        const osc = this.audioContext!.createOscillator();
        const gain = this.audioContext!.createGain();
        
        osc.type = 'triangle';
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        osc.connect(gain);
        gain.connect(this.audioContext!.destination);
        
        osc.start(now + i * 0.08);
        osc.stop(now + 0.3 + i * 0.08);
      });
    } else {
      // Loss sound - descending notes
      [523.25, 466.16, 392.00, 349.23].forEach((freq, i) => {
        const osc = this.audioContext!.createOscillator();
        const gain = this.audioContext!.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        osc.connect(gain);
        gain.connect(this.audioContext!.destination);
        
        osc.start(now + i * 0.15);
        osc.stop(now + 0.4 + i * 0.15);
      });
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
   * Start ambient background music (multiple styles available)
   */
  startBackgroundMusic() {
    if (this.isMuted || !this.audioContext) return;
    
    // Stop any existing music before starting new one
    if (this.backgroundMusic) {
      this.stopBackgroundMusic();
    }

    const now = this.audioContext.currentTime;
    
    // Create gain node for volume control
    this.musicGain = this.audioContext.createGain();
    this.musicGain.gain.setValueAtTime(0.20, now);
    this.musicGain.connect(this.audioContext.destination);

    // Use a dummy oscillator to track if music is playing
    this.backgroundMusic = this.audioContext.createOscillator();
    this.backgroundMusic.frequency.value = 0;
    this.backgroundMusic.start();

    // Start the selected music style
    switch (this.musicStyle) {
      case 'upbeat':
        this.playUpbeatMusic();
        break;
      case 'energetic':
        this.playEnergeticMusic();
        break;
      case 'calm':
        this.playCalmMusic();
        break;
      case 'retro':
        this.playRetroMusic();
        break;
      case 'epic':
        this.playEpicMusic();
        break;
      case 'adventure':
        this.playAdventureMusic();
        break;
      case 'magical':
        this.playMagicalMusic();
        break;
      case 'mario':
        this.playMarioMusic();
        break;
      case 'kahoot':
        this.playKahootMusic();
        break;
    }
  }

  /**
   * Style 1: Upbeat Arpeggio (Kahoot-style) - Cheerful and bouncy
   */
  private playUpbeatMusic() {
    if (!this.audioContext || this.isMuted || !this.backgroundMusic) return;
    
    // Upbeat chord progression: C major arpeggio
    const notes = [
      { freq: 523.25, duration: 0.15 },  // C5
      { freq: 659.25, duration: 0.15 },  // E5
      { freq: 783.99, duration: 0.15 },  // G5
      { freq: 659.25, duration: 0.15 },  // E5
      { freq: 523.25, duration: 0.15 },  // C5
      { freq: 392.00, duration: 0.15 },  // G4
      { freq: 523.25, duration: 0.15 },  // C5
      { freq: 659.25, duration: 0.15 },  // E5
    ];
    
    this.playMelody(notes, 'triangle', 0.25);
    this.musicLoopTimeout = setTimeout(() => this.playUpbeatMusic(), notes.length * 150 + 200);
  }

  /**
   * Style 2: Energetic Beats - Fast-paced and exciting
   */
  private playEnergeticMusic() {
    if (!this.audioContext || this.isMuted || !this.backgroundMusic) return;
    
    // Fast energetic melody with driving rhythm
    const notes = [
      { freq: 659.25, duration: 0.1 },   // E5
      { freq: 783.99, duration: 0.1 },   // G5
      { freq: 880.00, duration: 0.1 },   // A5
      { freq: 1046.50, duration: 0.15 }, // C6
      { freq: 880.00, duration: 0.1 },   // A5
      { freq: 783.99, duration: 0.1 },   // G5
      { freq: 659.25, duration: 0.1 },   // E5
      { freq: 523.25, duration: 0.15 },  // C5
    ];
    
    this.playMelody(notes, 'square', 0.2);
    this.musicLoopTimeout = setTimeout(() => this.playEnergeticMusic(), notes.length * 100 + 150);
  }

  /**
   * Style 3: Calm Ambient - Soothing and peaceful
   */
  private playCalmMusic() {
    if (!this.audioContext || this.isMuted || !this.backgroundMusic) return;
    
    // Slow, calming chord progression
    const notes = [
      { freq: 261.63, duration: 0.4 },  // C4
      { freq: 329.63, duration: 0.4 },  // E4
      { freq: 392.00, duration: 0.4 },  // G4
      { freq: 329.63, duration: 0.4 },  // E4
      { freq: 293.66, duration: 0.4 },  // D4
      { freq: 261.63, duration: 0.4 },  // C4
    ];
    
    this.playMelody(notes, 'sine', 0.15);
    this.musicLoopTimeout = setTimeout(() => this.playCalmMusic(), notes.length * 400 + 300);
  }

  /**
   * Style 4: Retro Game - Classic 8-bit style
   */
  private playRetroMusic() {
    if (!this.audioContext || this.isMuted || !this.backgroundMusic) return;
    
    // Classic video game melody
    const notes = [
      { freq: 659.25, duration: 0.12 },  // E5
      { freq: 659.25, duration: 0.12 },  // E5
      { freq: 659.25, duration: 0.24 },  // E5
      { freq: 523.25, duration: 0.12 },  // C5
      { freq: 659.25, duration: 0.24 },  // E5
      { freq: 783.99, duration: 0.36 },  // G5
      { freq: 392.00, duration: 0.36 },  // G4
    ];
    
    this.playMelody(notes, 'square', 0.22);
    this.musicLoopTimeout = setTimeout(() => this.playRetroMusic(), notes.length * 150 + 400);
  }

  /**
   * Style 5: Epic Adventure - Dramatic and heroic
   */
  private playEpicMusic() {
    if (!this.audioContext || this.isMuted || !this.backgroundMusic) return;
    
    // Epic rising melody
    const notes = [
      { freq: 392.00, duration: 0.2 },   // G4
      { freq: 440.00, duration: 0.2 },   // A4
      { freq: 493.88, duration: 0.2 },   // B4
      { freq: 523.25, duration: 0.3 },   // C5
      { freq: 587.33, duration: 0.2 },   // D5
      { freq: 659.25, duration: 0.2 },   // E5
      { freq: 783.99, duration: 0.4 },   // G5
      { freq: 659.25, duration: 0.3 },   // E5
    ];
    
    this.playMelody(notes, 'sawtooth', 0.18);
    this.musicLoopTimeout = setTimeout(() => this.playEpicMusic(), notes.length * 250 + 300);
  }

  /**
   * Style 6: Uplifting Adventure - Video game inspired (Mario/Sonic style)
   * Catchy main theme with bass line, melody, and harmony layers that evolve
   */
  private playAdventureMusic() {
    if (!this.audioContext || this.isMuted || !this.backgroundMusic) return;
    
    // Increment variation counter for musical evolution
    this.variationCount++;
    const variation = this.variationCount % 4; // 4 variations before looping
    
    const now = this.audioContext.currentTime;
    let time = now;
    
    // Main catchy melody - uplifting and memorable
    const melody = variation === 0 ? [
      // A section - Main theme
      { freq: 523.25, duration: 0.2 },  // C5
      { freq: 659.25, duration: 0.2 },  // E5
      { freq: 783.99, duration: 0.2 },  // G5
      { freq: 880.00, duration: 0.3 },  // A5
      { freq: 783.99, duration: 0.15 }, // G5
      { freq: 659.25, duration: 0.15 }, // E5
      { freq: 783.99, duration: 0.2 },  // G5
      { freq: 1046.50, duration: 0.4 }, // C6 (high point!)
    ] : variation === 1 ? [
      // B section - Variation with slight change
      { freq: 587.33, duration: 0.2 },  // D5
      { freq: 659.25, duration: 0.2 },  // E5
      { freq: 783.99, duration: 0.2 },  // G5
      { freq: 880.00, duration: 0.3 },  // A5
      { freq: 783.99, duration: 0.15 }, // G5
      { freq: 659.25, duration: 0.15 }, // E5
      { freq: 587.33, duration: 0.2 },  // D5
      { freq: 523.25, duration: 0.4 },  // C5 (resolves down)
    ] : variation === 2 ? [
      // C section - Build up variation
      { freq: 523.25, duration: 0.15 }, // C5
      { freq: 587.33, duration: 0.15 }, // D5
      { freq: 659.25, duration: 0.15 }, // E5
      { freq: 783.99, duration: 0.2 },  // G5
      { freq: 880.00, duration: 0.2 },  // A5
      { freq: 1046.50, duration: 0.2 }, // C6
      { freq: 880.00, duration: 0.15 }, // A5
      { freq: 783.99, duration: 0.15 }, // G5
      { freq: 1046.50, duration: 0.5 }, // C6 (triumphant hold)
    ] : [
      // D section - Descending variation
      { freq: 1046.50, duration: 0.2 }, // C6
      { freq: 880.00, duration: 0.15 }, // A5
      { freq: 783.99, duration: 0.15 }, // G5
      { freq: 659.25, duration: 0.2 },  // E5
      { freq: 783.99, duration: 0.2 },  // G5
      { freq: 659.25, duration: 0.15 }, // E5
      { freq: 523.25, duration: 0.15 }, // C5
      { freq: 659.25, duration: 0.4 },  // E5 (upbeat ending)
    ];
    
    // Play melody (bright, clear lead)
    melody.forEach((note) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      
      osc.type = 'triangle'; // Softer than square, clearer than sine
      osc.frequency.value = note.freq;
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.22, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, time + note.duration);
      
      osc.connect(gain);
      gain.connect(this.musicGain!);
      
      osc.start(time);
      osc.stop(time + note.duration);
      
      time += note.duration;
    });
    
    // Add bass line (one octave below melody, simpler rhythm)
    let bassTime = now;
    const bassNotes = [
      { freq: 130.81, duration: 0.4 },  // C3
      { freq: 164.81, duration: 0.4 },  // E3
      { freq: 196.00, duration: 0.4 },  // G3
      { freq: 220.00, duration: 0.4 },  // A3
    ];
    
    bassNotes.forEach((note) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      
      osc.type = 'sine'; // Deep bass
      osc.frequency.value = note.freq;
      
      gain.gain.setValueAtTime(0, bassTime);
      gain.gain.linearRampToValueAtTime(0.15, bassTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, bassTime + note.duration);
      
      osc.connect(gain);
      gain.connect(this.musicGain!);
      
      osc.start(bassTime);
      osc.stop(bassTime + note.duration);
      
      bassTime += note.duration;
    });
    
    // Add harmony layer (every other variation for variety)
    if (variation % 2 === 0) {
      let harmonyTime = now + 0.1; // Slight delay for richness
      const harmony = melody.map(note => ({
        freq: note.freq * 1.25, // Perfect fourth above melody
        duration: note.duration
      }));
      
      harmony.forEach((note) => {
        const osc = this.audioContext!.createOscillator();
        const gain = this.audioContext!.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = note.freq;
        
        gain.gain.setValueAtTime(0, harmonyTime);
        gain.gain.linearRampToValueAtTime(0.12, harmonyTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, harmonyTime + note.duration);
        
        osc.connect(gain);
        gain.connect(this.musicGain!);
        
        osc.start(harmonyTime);
        osc.stop(harmonyTime + note.duration);
        
        harmonyTime += note.duration;
      });
    }
    
    // Calculate total duration and schedule next loop
    const totalDuration = melody.reduce((sum, note) => sum + note.duration, 0);
    this.musicLoopTimeout = setTimeout(
      () => this.playAdventureMusic(), 
      totalDuration * 1000 + 200 // Add small gap between loops
    );
  }

  /**
   * Style 7: Magical Arrival - "Arriving at Hogwarts" inspired
   * Mysterious, grand, inspiring - perfect for starting a learning adventure
   */
  private playMagicalMusic() {
    if (!this.audioContext || this.isMuted || !this.backgroundMusic) return;
    
    const now = this.audioContext.currentTime;
    
    // Increment variation for evolving musical phrases
    this.variationCount++;
    const variation = this.variationCount % 3;
    
    // Layer 1: Sparkly high "magical" notes (like celesta/glockenspiel)
    // These create the iconic "magical" sound
    const sparkleNotes = variation === 0 ? [
      { freq: 1046.50, duration: 0.25 }, // C6
      { freq: 1318.51, duration: 0.25 }, // E6
      { freq: 1567.98, duration: 0.3 },  // G6
      { freq: 1318.51, duration: 0.2 },  // E6
      { freq: 1046.50, duration: 0.25 }, // C6
      { freq: 1174.66, duration: 0.25 }, // D6
      { freq: 1318.51, duration: 0.5 },  // E6 (hold)
    ] : variation === 1 ? [
      { freq: 1174.66, duration: 0.25 }, // D6
      { freq: 1318.51, duration: 0.25 }, // E6
      { freq: 1567.98, duration: 0.3 },  // G6
      { freq: 1760.00, duration: 0.3 },  // A6 (higher!)
      { freq: 1567.98, duration: 0.2 },  // G6
      { freq: 1318.51, duration: 0.25 }, // E6
      { freq: 1174.66, duration: 0.5 },  // D6 (resolve)
    ] : [
      { freq: 1046.50, duration: 0.2 },  // C6
      { freq: 1174.66, duration: 0.2 },  // D6
      { freq: 1318.51, duration: 0.2 },  // E6
      { freq: 1567.98, duration: 0.25 }, // G6
      { freq: 2093.00, duration: 0.35 }, // C7 (very high, magical peak!)
      { freq: 1567.98, duration: 0.25 }, // G6
      { freq: 1318.51, duration: 0.6 },  // E6 (long magical hold)
    ];
    
    // Play sparkly high notes (sine wave for pure, bell-like tone)
    let sparkleTime = now;
    sparkleNotes.forEach((note) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      
      osc.type = 'sine'; // Pure tone for magical bells
      osc.frequency.value = note.freq;
      
      // Gentle attack, sustained, gentle release
      gain.gain.setValueAtTime(0, sparkleTime);
      gain.gain.linearRampToValueAtTime(0.15, sparkleTime + 0.03);
      gain.gain.setValueAtTime(0.15, sparkleTime + note.duration * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.01, sparkleTime + note.duration);
      
      osc.connect(gain);
      gain.connect(this.musicGain!);
      
      osc.start(sparkleTime);
      osc.stop(sparkleTime + note.duration);
      
      sparkleTime += note.duration;
    });
    
    // Layer 2: Sweeping string-like chords (warm, inviting harmony)
    const chordProgression = [
      // C major chord - home, welcoming
      { freqs: [261.63, 329.63, 392.00], duration: 0.8 },  // C-E-G
      // A minor chord - mysterious
      { freqs: [220.00, 261.63, 329.63], duration: 0.8 },  // A-C-E
      // F major chord - uplifting
      { freqs: [174.61, 220.00, 261.63], duration: 0.8 },  // F-A-C
      // G major chord - anticipation, leading back
      { freqs: [196.00, 246.94, 293.66], duration: 0.8 },  // G-B-D
    ];
    
    let chordTime = now;
    chordProgression.forEach((chord) => {
      chord.freqs.forEach((freq) => {
        const osc = this.audioContext!.createOscillator();
        const gain = this.audioContext!.createGain();
        
        osc.type = 'sawtooth'; // Rich, string-like sound
        osc.frequency.value = freq;
        
        // Slow attack for sweeping effect
        gain.gain.setValueAtTime(0, chordTime);
        gain.gain.linearRampToValueAtTime(0.08, chordTime + 0.15);
        gain.gain.setValueAtTime(0.08, chordTime + chord.duration * 0.8);
        gain.gain.exponentialRampToValueAtTime(0.01, chordTime + chord.duration);
        
        osc.connect(gain);
        gain.connect(this.musicGain!);
        
        osc.start(chordTime);
        osc.stop(chordTime + chord.duration);
      });
      
      chordTime += chord.duration;
    });
    
    // Layer 3: Deep bass foundation (grounding, majestic)
    const bassLine = [
      { freq: 65.41, duration: 0.8 },   // C2
      { freq: 55.00, duration: 0.8 },   // A2
      { freq: 43.65, duration: 0.8 },   // F2
      { freq: 49.00, duration: 0.8 },   // G2
    ];
    
    let bassTime = now;
    bassLine.forEach((note) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      
      osc.type = 'sine'; // Deep, pure bass
      osc.frequency.value = note.freq;
      
      gain.gain.setValueAtTime(0, bassTime);
      gain.gain.linearRampToValueAtTime(0.12, bassTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, bassTime + note.duration);
      
      osc.connect(gain);
      gain.connect(this.musicGain!);
      
      osc.start(bassTime);
      osc.stop(bassTime + note.duration);
      
      bassTime += note.duration;
    });
    
    // Layer 4: Subtle mid-range "warmth" (only on variation 2 for variety)
    if (variation === 2) {
      const midNotes = [
        { freq: 523.25, duration: 1.6 },  // C5 (long hold)
        { freq: 587.33, duration: 1.6 },  // D5 (long hold)
      ];
      
      let midTime = now + 0.2; // Slight delay
      midNotes.forEach((note) => {
        const osc = this.audioContext!.createOscillator();
        const gain = this.audioContext!.createGain();
        
        osc.type = 'triangle'; // Warm, mellow tone
        osc.frequency.value = note.freq;
        
        gain.gain.setValueAtTime(0, midTime);
        gain.gain.linearRampToValueAtTime(0.06, midTime + 0.3);
        gain.gain.setValueAtTime(0.06, midTime + note.duration * 0.8);
        gain.gain.exponentialRampToValueAtTime(0.01, midTime + note.duration);
        
        osc.connect(gain);
        gain.connect(this.musicGain!);
        
        osc.start(midTime);
        osc.stop(midTime + note.duration);
        
        midTime += note.duration;
      });
    }
    
    // Schedule next loop (slower tempo for majestic feel)
    const totalDuration = sparkleNotes.reduce((sum, note) => sum + note.duration, 0);
    this.musicLoopTimeout = setTimeout(
      () => this.playMagicalMusic(), 
      totalDuration * 1000 + 400 // Longer gap for breathing room
    );
  }

  /**
   * Style 8: Super Mario Bros Theme - Classic video game overworld music
   * Iconic, fun, energetic - perfect for adventure learning
   */
  private playMarioMusic() {
    if (!this.audioContext || this.isMuted || !this.backgroundMusic) return;
    
    const now = this.audioContext.currentTime;
    let time = now;
    
    // Extended Super Mario Bros. theme - multiple sections for variety
    const melody = [
      // SECTION 1: Opening phrase - "dun dun, dun, dun dun"
      { freq: 659.25, duration: 0.12 },   // E5
      { freq: 0, duration: 0.12 },        // Rest
      { freq: 659.25, duration: 0.12 },   // E5
      { freq: 0, duration: 0.12 },        // Rest
      { freq: 659.25, duration: 0.12 },   // E5
      { freq: 0, duration: 0.12 },        // Rest
      { freq: 523.25, duration: 0.12 },   // C5
      { freq: 659.25, duration: 0.12 },   // E5
      { freq: 0, duration: 0.12 },        // Rest
      { freq: 783.99, duration: 0.12 },   // G5 (up!)
      { freq: 0, duration: 0.36 },        // Long rest
      { freq: 392.00, duration: 0.12 },   // G4 (down!)
      { freq: 0, duration: 0.36 },        // Long rest
      
      // SECTION 2: Descending walk
      { freq: 523.25, duration: 0.12 },   // C5
      { freq: 0, duration: 0.24 },        // Rest
      { freq: 392.00, duration: 0.12 },   // G4
      { freq: 0, duration: 0.24 },        // Rest
      { freq: 329.63, duration: 0.12 },   // E4
      { freq: 0, duration: 0.24 },        // Rest
      { freq: 440.00, duration: 0.12 },   // A4
      { freq: 0, duration: 0.12 },        // Rest
      { freq: 493.88, duration: 0.12 },   // B4
      { freq: 0, duration: 0.12 },        // Rest
      { freq: 466.16, duration: 0.12 },   // A#4
      { freq: 440.00, duration: 0.12 },   // A4
      { freq: 0, duration: 0.12 },        // Rest
      
      // SECTION 3: Walking bass pattern
      { freq: 392.00, duration: 0.16 },   // G4
      { freq: 659.25, duration: 0.16 },   // E5
      { freq: 783.99, duration: 0.16 },   // G5
      { freq: 880.00, duration: 0.12 },   // A5
      { freq: 0, duration: 0.12 },        // Rest
      { freq: 698.46, duration: 0.12 },   // F5
      { freq: 783.99, duration: 0.12 },   // G5
      { freq: 0, duration: 0.12 },        // Rest
      { freq: 659.25, duration: 0.12 },   // E5
      { freq: 0, duration: 0.12 },        // Rest
      { freq: 523.25, duration: 0.12 },   // C5
      { freq: 587.33, duration: 0.12 },   // D5
      { freq: 493.88, duration: 0.12 },   // B4
      { freq: 0, duration: 0.24 },        // Rest
      
      // SECTION 4: Repeat opening (variation)
      { freq: 0, duration: 0.24 },        // Extra rest for breathing
      { freq: 783.99, duration: 0.12 },   // G5
      { freq: 740.00, duration: 0.12 },   // F#5
      { freq: 698.46, duration: 0.12 },   // F5
      { freq: 622.25, duration: 0.12 },   // D#5
      { freq: 0, duration: 0.12 },        // Rest
      { freq: 659.25, duration: 0.12 },   // E5
      { freq: 0, duration: 0.12 },        // Rest
      { freq: 415.30, duration: 0.12 },   // G#4
      { freq: 440.00, duration: 0.12 },   // A4
      { freq: 523.25, duration: 0.12 },   // C5
      { freq: 0, duration: 0.12 },        // Rest
      { freq: 440.00, duration: 0.12 },   // A4
      { freq: 523.25, duration: 0.12 },   // C5
      { freq: 587.33, duration: 0.12 },   // D5
      { freq: 0, duration: 0.24 },        // Rest
      
      // SECTION 5: Another variation
      { freq: 783.99, duration: 0.12 },   // G5
      { freq: 740.00, duration: 0.12 },   // F#5
      { freq: 698.46, duration: 0.12 },   // F5
      { freq: 622.25, duration: 0.12 },   // D#5
      { freq: 0, duration: 0.12 },        // Rest
      { freq: 659.25, duration: 0.12 },   // E5
      { freq: 0, duration: 0.12 },        // Rest
      { freq: 1046.50, duration: 0.12 },  // C6 (high!)
      { freq: 0, duration: 0.12 },        // Rest
      { freq: 1046.50, duration: 0.12 },  // C6
      { freq: 1046.50, duration: 0.12 },  // C6
      { freq: 0, duration: 0.24 },        // Rest
      
      // SECTION 6: Lower melody
      { freq: 0, duration: 0.24 },        // Rest
      { freq: 622.25, duration: 0.12 },   // D#5
      { freq: 0, duration: 0.24 },        // Rest
      { freq: 587.33, duration: 0.12 },   // D5
      { freq: 0, duration: 0.24 },        // Rest
      { freq: 523.25, duration: 0.18 },   // C5
      { freq: 0, duration: 0.36 },        // Long rest
      
      // SECTION 7: Closing phrase (callback to opening)
      { freq: 659.25, duration: 0.12 },   // E5
      { freq: 0, duration: 0.12 },        // Rest
      { freq: 659.25, duration: 0.12 },   // E5
      { freq: 0, duration: 0.12 },        // Rest
      { freq: 659.25, duration: 0.12 },   // E5
      { freq: 0, duration: 0.12 },        // Rest
      { freq: 523.25, duration: 0.12 },   // C5
      { freq: 659.25, duration: 0.12 },   // E5
      { freq: 0, duration: 0.12 },        // Rest
      { freq: 783.99, duration: 0.24 },   // G5 (longer hold)
      { freq: 0, duration: 0.48 },        // Extra long rest before loop
    ];
    
    // Play melody with square wave (classic NES sound)
    melody.forEach((note) => {
      if (note.freq > 0) {
        const osc = this.audioContext!.createOscillator();
        const gain = this.audioContext!.createGain();
        
        osc.type = 'square'; // Classic 8-bit sound
        osc.frequency.value = note.freq;
        
        // Sharp attack, quick decay (bouncy!)
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.25, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, time + note.duration * 0.9);
        
        osc.connect(gain);
        gain.connect(this.musicGain!);
        
        osc.start(time);
        osc.stop(time + note.duration);
      }
      
      time += note.duration;
    });
    
    // Add bass line (extended to match melody length)
    let bassTime = now;
    const bassNotes = [
      { freq: 130.81, duration: 0.48 },   // C3
      { freq: 196.00, duration: 0.48 },   // G3
      { freq: 130.81, duration: 0.48 },   // C3
      { freq: 164.81, duration: 0.48 },   // E3
      
      { freq: 196.00, duration: 0.48 },   // G3
      { freq: 130.81, duration: 0.48 },   // C3
      { freq: 174.61, duration: 0.48 },   // F3
      { freq: 196.00, duration: 0.48 },   // G3
      
      { freq: 130.81, duration: 0.48 },   // C3
      { freq: 196.00, duration: 0.48 },   // G3
      { freq: 146.83, duration: 0.48 },   // D3
      { freq: 196.00, duration: 0.48 },   // G3
      
      { freq: 130.81, duration: 0.48 },   // C3
      { freq: 174.61, duration: 0.48 },   // F3
      { freq: 196.00, duration: 0.48 },   // G3
      { freq: 130.81, duration: 0.48 },   // C3 (end)
    ];
    
    bassNotes.forEach((note) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      
      osc.type = 'triangle'; // Softer bass for NES style
      osc.frequency.value = note.freq;
      
      gain.gain.setValueAtTime(0, bassTime);
      gain.gain.linearRampToValueAtTime(0.15, bassTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, bassTime + note.duration);
      
      osc.connect(gain);
      gain.connect(this.musicGain!);
      
      osc.start(bassTime);
      osc.stop(bassTime + note.duration);
      
      bassTime += note.duration;
    });
    
    // Calculate total duration and loop (now much longer!)
    const totalDuration = melody.reduce((sum, note) => sum + note.duration, 0);
    this.musicLoopTimeout = setTimeout(
      () => this.playMarioMusic(), 
      totalDuration * 1000 + 800 // Longer gap before repeating
    );
  }

  /**
   * Style 9: Complete Super Mario Bros Theme - all 9 sections!
   * No quick repetition - full theme lasts ~30-35 seconds
   */
  private playKahootMusic() {
    if (!this.audioContext || this.isMuted || !this.backgroundMusic) return;
    
    // CRITICAL: Clear any existing timeout to prevent overlapping
    if (this.musicLoopTimeout) {
      clearTimeout(this.musicLoopTimeout);
      this.musicLoopTimeout = null;
    }
    
    const now = this.audioContext.currentTime;
    let time = now;
    
    // Complete Super Mario Bros theme - all sections with proper breaks!
    const melody = [
      // Section 1: Main theme intro (^C G E, A B Bb A, G ^E ^G ^A, ^F ^G ^E ^C ^D B)
      { freq: 523.25, duration: 0.15 }, // C5
      { freq: 392.00, duration: 0.15 }, // G4
      { freq: 329.63, duration: 0.2 },  // E4
      { freq: 0, duration: 0.15 },      // REST
      { freq: 440.00, duration: 0.15 }, // A4
      { freq: 493.88, duration: 0.15 }, // B4
      { freq: 466.16, duration: 0.15 }, // Bb4
      { freq: 440.00, duration: 0.2 },  // A4
      { freq: 0, duration: 0.15 },      // REST
      { freq: 392.00, duration: 0.15 }, // G4
      { freq: 659.25, duration: 0.15 }, // E5
      { freq: 783.99, duration: 0.15 }, // G5
      { freq: 880.00, duration: 0.2 },  // A5
      { freq: 0, duration: 0.15 },      // REST
      { freq: 698.46, duration: 0.15 }, // F5
      { freq: 783.99, duration: 0.15 }, // G5
      { freq: 659.25, duration: 0.15 }, // E5
      { freq: 523.25, duration: 0.15 }, // C5
      { freq: 587.33, duration: 0.15 }, // D5
      { freq: 493.88, duration: 0.25 },  // B4 (hold)
      { freq: 0, duration: 0.25 },      // REST (break before next section)
      
      // Section 2: Rising melody (^G ^F# ^F ^D ^E, G A ^C, A ^C ^D, ^G ^F# ^F ^D ^E, *C *C *C)
      { freq: 783.99, duration: 0.15 }, // G5
      { freq: 739.99, duration: 0.15 }, // F#5
      { freq: 698.46, duration: 0.15 }, // F5
      { freq: 587.33, duration: 0.15 }, // D5
      { freq: 659.25, duration: 0.2 },  // E5
      { freq: 0, duration: 0.15 },      // REST
      { freq: 392.00, duration: 0.15 }, // G4
      { freq: 440.00, duration: 0.15 }, // A4
      { freq: 523.25, duration: 0.2 },  // C5
      { freq: 0, duration: 0.15 },      // REST
      { freq: 440.00, duration: 0.15 }, // A4
      { freq: 523.25, duration: 0.15 }, // C5
      { freq: 587.33, duration: 0.2 },  // D5
      { freq: 0, duration: 0.15 },      // REST
      { freq: 783.99, duration: 0.15 }, // G5
      { freq: 739.99, duration: 0.15 }, // F#5
      { freq: 698.46, duration: 0.15 }, // F5
      { freq: 587.33, duration: 0.15 }, // D5
      { freq: 659.25, duration: 0.2 },  // E5
      { freq: 0, duration: 0.15 },      // REST
      { freq: 1046.5, duration: 0.12 }, // C6
      { freq: 1046.5, duration: 0.12 }, // C6
      { freq: 1046.5, duration: 0.25 },  // C6 (hold)
      { freq: 0, duration: 0.25 },      // REST (break before next section)
      
      // Section 3: Continuation (^G ^F# ^F ^D ^E, G A ^C, A ^C ^D, ^D# ^D ^C, ^C ^C ^C, ^C ^D ^E ^C A G, ^C ^C ^C, ^C ^D ^E)
      { freq: 783.99, duration: 0.15 }, // G5
      { freq: 739.99, duration: 0.15 }, // F#5
      { freq: 698.46, duration: 0.15 }, // F5
      { freq: 587.33, duration: 0.15 }, // D5
      { freq: 659.25, duration: 0.2 },  // E5
      { freq: 0, duration: 0.15 },      // REST
      { freq: 392.00, duration: 0.15 }, // G4
      { freq: 440.00, duration: 0.15 }, // A4
      { freq: 523.25, duration: 0.2 },  // C5
      { freq: 0, duration: 0.15 },      // REST
      { freq: 440.00, duration: 0.15 }, // A4
      { freq: 523.25, duration: 0.15 }, // C5
      { freq: 587.33, duration: 0.2 },  // D5
      { freq: 0, duration: 0.15 },      // REST
      { freq: 622.25, duration: 0.15 }, // D#5
      { freq: 587.33, duration: 0.15 }, // D5
      { freq: 523.25, duration: 0.2 },  // C5
      { freq: 0, duration: 0.2 },       // REST
      { freq: 523.25, duration: 0.12 }, // C5
      { freq: 523.25, duration: 0.12 }, // C5
      { freq: 523.25, duration: 0.2 },  // C5
      { freq: 0, duration: 0.15 },      // REST
      { freq: 523.25, duration: 0.15 }, // C5
      { freq: 587.33, duration: 0.15 }, // D5
      { freq: 659.25, duration: 0.15 }, // E5
      { freq: 523.25, duration: 0.15 }, // C5
      { freq: 440.00, duration: 0.15 }, // A4
      { freq: 392.00, duration: 0.25 },  // G4 (hold)
      { freq: 0, duration: 0.2 },       // REST
      { freq: 523.25, duration: 0.12 }, // C5
      { freq: 523.25, duration: 0.12 }, // C5
      { freq: 523.25, duration: 0.2 },  // C5
      { freq: 0, duration: 0.15 },      // REST
      { freq: 523.25, duration: 0.15 }, // C5
      { freq: 587.33, duration: 0.15 }, // D5
      { freq: 659.25, duration: 0.25 },  // E5 (hold)
      { freq: 0, duration: 0.25 },      // REST (break before next section)
      
      // Section 4: Repeat variation (^C ^C ^C, ^C ^D ^E ^C A G, ^E ^E ^E, ^C ^E ^G, G)
      { freq: 523.25, duration: 0.12 }, // C5
      { freq: 523.25, duration: 0.12 }, // C5
      { freq: 523.25, duration: 0.2 },  // C5
      { freq: 0, duration: 0.15 },      // REST
      { freq: 523.25, duration: 0.15 }, // C5
      { freq: 587.33, duration: 0.15 }, // D5
      { freq: 659.25, duration: 0.15 }, // E5
      { freq: 523.25, duration: 0.15 }, // C5
      { freq: 440.00, duration: 0.15 }, // A4
      { freq: 392.00, duration: 0.25 },  // G4 (hold)
      { freq: 0, duration: 0.2 },       // REST
      { freq: 659.25, duration: 0.12 }, // E5
      { freq: 659.25, duration: 0.12 }, // E5
      { freq: 659.25, duration: 0.2 },  // E5
      { freq: 0, duration: 0.15 },      // REST
      { freq: 523.25, duration: 0.15 }, // C5
      { freq: 659.25, duration: 0.15 }, // E5
      { freq: 783.99, duration: 0.3 }, // G5 (hold)
      { freq: 0, duration: 0.2 },       // REST
      { freq: 392.00, duration: 0.3 }, // G4 (hold)
      { freq: 0, duration: 0.4 },       // REST (longer break before repeat)
      
      // Section 5: Theme repeat (^C G E, A B Bb A, G ^E ^G ^A, ^F ^G ^E ^C ^D B)
      { freq: 523.25, duration: 0.15 }, // C5
      { freq: 392.00, duration: 0.15 }, // G4
      { freq: 329.63, duration: 0.2 },  // E4
      { freq: 0, duration: 0.15 },      // REST
      { freq: 440.00, duration: 0.15 }, // A4
      { freq: 493.88, duration: 0.15 }, // B4
      { freq: 466.16, duration: 0.15 }, // Bb4
      { freq: 440.00, duration: 0.2 },  // A4
      { freq: 0, duration: 0.15 },      // REST
      { freq: 392.00, duration: 0.15 }, // G4
      { freq: 659.25, duration: 0.15 }, // E5
      { freq: 783.99, duration: 0.15 }, // G5
      { freq: 880.00, duration: 0.2 },  // A5
      { freq: 0, duration: 0.15 },      // REST
      { freq: 698.46, duration: 0.15 }, // F5
      { freq: 783.99, duration: 0.15 }, // G5
      { freq: 659.25, duration: 0.15 }, // E5
      { freq: 523.25, duration: 0.15 }, // C5
      { freq: 587.33, duration: 0.15 }, // D5
      { freq: 493.88, duration: 0.25 },  // B4 (hold)
      { freq: 0, duration: 0.25 },      // REST (break)
      
      // Section 6: Second repeat (^C G E, A B Bb A, G ^E ^G ^A, ^F ^G ^E ^C ^D B)
      { freq: 523.25, duration: 0.15 }, // C5
      { freq: 392.00, duration: 0.15 }, // G4
      { freq: 329.63, duration: 0.2 },  // E4
      { freq: 0, duration: 0.15 },      // REST
      { freq: 440.00, duration: 0.15 }, // A4
      { freq: 493.88, duration: 0.15 }, // B4
      { freq: 466.16, duration: 0.15 }, // Bb4
      { freq: 440.00, duration: 0.2 },  // A4
      { freq: 0, duration: 0.15 },      // REST
      { freq: 392.00, duration: 0.15 }, // G4
      { freq: 659.25, duration: 0.15 }, // E5
      { freq: 783.99, duration: 0.15 }, // G5
      { freq: 880.00, duration: 0.2 },  // A5
      { freq: 0, duration: 0.15 },      // REST
      { freq: 698.46, duration: 0.15 }, // F5
      { freq: 783.99, duration: 0.15 }, // G5
      { freq: 659.25, duration: 0.15 }, // E5
      { freq: 523.25, duration: 0.15 }, // C5
      { freq: 587.33, duration: 0.15 }, // D5
      { freq: 493.88, duration: 0.25 },  // B4 (hold)
      { freq: 0, duration: 0.4 },       // REST (longer break before bridge)
      
      // Section 7: Bridge part 1 (^E-^C G, G A ^F ^F A, B ^A ^A ^A ^G ^F, ^E ^C A G)
      { freq: 659.25, duration: 0.2 },  // E5
      { freq: 523.25, duration: 0.2 },  // C5
      { freq: 392.00, duration: 0.25 },  // G4
      { freq: 0, duration: 0.15 },      // REST
      { freq: 392.00, duration: 0.15 }, // G4
      { freq: 440.00, duration: 0.15 }, // A4
      { freq: 698.46, duration: 0.15 }, // F5
      { freq: 698.46, duration: 0.15 }, // F5
      { freq: 440.00, duration: 0.2 },  // A4
      { freq: 0, duration: 0.15 },      // REST
      { freq: 493.88, duration: 0.15 }, // B4
      { freq: 880.00, duration: 0.15 }, // A5
      { freq: 880.00, duration: 0.15 }, // A5
      { freq: 880.00, duration: 0.15 }, // A5
      { freq: 783.99, duration: 0.15 }, // G5
      { freq: 698.46, duration: 0.2 },  // F5
      { freq: 0, duration: 0.15 },      // REST
      { freq: 659.25, duration: 0.15 }, // E5
      { freq: 523.25, duration: 0.15 }, // C5
      { freq: 440.00, duration: 0.15 }, // A4
      { freq: 392.00, duration: 0.25 },  // G4
      { freq: 0, duration: 0.25 },      // REST (break)
      
      // Section 8: Bridge part 2 (^E-^C G, G A ^F ^F A, B ^F ^F ^F ^E ^D ^C, G E C)
      { freq: 659.25, duration: 0.2 },  // E5
      { freq: 523.25, duration: 0.2 },  // C5
      { freq: 392.00, duration: 0.25 },  // G4
      { freq: 0, duration: 0.15 },      // REST
      { freq: 392.00, duration: 0.15 }, // G4
      { freq: 440.00, duration: 0.15 }, // A4
      { freq: 698.46, duration: 0.15 }, // F5
      { freq: 698.46, duration: 0.15 }, // F5
      { freq: 440.00, duration: 0.2 },  // A4
      { freq: 0, duration: 0.15 },      // REST
      { freq: 493.88, duration: 0.15 }, // B4
      { freq: 698.46, duration: 0.15 }, // F5
      { freq: 698.46, duration: 0.15 }, // F5
      { freq: 698.46, duration: 0.15 }, // F5
      { freq: 659.25, duration: 0.15 }, // E5
      { freq: 587.33, duration: 0.15 }, // D5
      { freq: 523.25, duration: 0.2 },  // C5
      { freq: 0, duration: 0.15 },      // REST
      { freq: 392.00, duration: 0.15 }, // G4
      { freq: 329.63, duration: 0.15 }, // E4
      { freq: 261.63, duration: 0.3 }, // C4 (hold)
      { freq: 0, duration: 0.3 },       // REST (break before ending)
      
      // Section 9: Ending (^C G E, A B A, G# Bb G#, G-F#-G)
      { freq: 523.25, duration: 0.15 }, // C5
      { freq: 392.00, duration: 0.15 }, // G4
      { freq: 329.63, duration: 0.2 },  // E4
      { freq: 0, duration: 0.15 },      // REST
      { freq: 440.00, duration: 0.15 }, // A4
      { freq: 493.88, duration: 0.15 }, // B4
      { freq: 440.00, duration: 0.2 },  // A4
      { freq: 0, duration: 0.15 },      // REST
      { freq: 415.30, duration: 0.15 }, // G#4
      { freq: 466.16, duration: 0.15 }, // Bb4
      { freq: 415.30, duration: 0.2 },  // G#4
      { freq: 0, duration: 0.15 },      // REST
      { freq: 392.00, duration: 0.12 }, // G4
      { freq: 369.99, duration: 0.12 }, // F#4
      { freq: 392.00, duration: 0.3 }, // G4 (final note, hold)
      { freq: 0, duration: 0.5 },       // REST (long pause before loop)
    ];
    
    // Play melody with bright triangle wave (classic Mario sound)
    melody.forEach((note) => {
      // Skip rest notes (silence/breaks)
      if (note.freq === 0) {
        time += note.duration;
        return;
      }
      
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      
      osc.type = 'square'; // Punchy, drum-like percussive sound
      osc.frequency.value = note.freq;
      
      // Sharp attack and quick decay for drum-like percussion
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.28, time + 0.005); // Very fast attack
      
      // Quick decay for punchy drum sound
      gain.gain.exponentialRampToValueAtTime(0.08, time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.01, time + note.duration);
      
      osc.connect(gain);
      gain.connect(this.musicGain!);
      
      osc.start(time);
      osc.stop(time + note.duration);
      
      time += note.duration;
    });
    
    // Loop - complete theme lasts ~30-35 seconds so no quick repetition!
    const totalDuration = melody.reduce((sum, note) => sum + note.duration, 0);
    this.musicLoopTimeout = setTimeout(
      () => this.playKahootMusic(), 
      totalDuration * 1000
    );
  }

  /**
   * Helper method to play a melody
   */
  private playMelody(notes: Array<{freq: number, duration: number}>, waveType: OscillatorType, volume: number) {
    if (!this.audioContext || !this.musicGain) return;
    
    let time = this.audioContext.currentTime;
    
    notes.forEach((note) => {
      const osc = this.audioContext!.createOscillator();
      const noteGain = this.audioContext!.createGain();
      
      osc.type = waveType;
      osc.frequency.value = note.freq;
      
      // Envelope for each note
      noteGain.gain.setValueAtTime(0, time);
      noteGain.gain.linearRampToValueAtTime(volume, time + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.01, time + note.duration);
      
      osc.connect(noteGain);
      noteGain.connect(this.musicGain!);
      
      osc.start(time);
      osc.stop(time + note.duration);
      
      time += note.duration;
    });
  }

  /**
   * Stop background music
   */
  stopBackgroundMusic() {
    if (this.musicLoopTimeout) {
      clearTimeout(this.musicLoopTimeout);
      this.musicLoopTimeout = null;
    }
    
    if (this.backgroundMusic && this.audioContext) {
      this.backgroundMusic.stop();
      this.backgroundMusic = null;
      this.musicGain = null;
    }
    
    // Reset variation counter when stopping
    this.variationCount = 0;
  }
}

// Export singleton instance
export const soundService = new SoundService();
