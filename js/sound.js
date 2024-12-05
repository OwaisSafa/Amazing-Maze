// Sound Manager using Web Audio API
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.isMuted = false;
        this.initialized = false;
        this.lastPlayTime = 0;
        this.init();
    }

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.setupSoundToggle();
            this.initialized = true;
            console.log('Sound system initialized');
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
        }
    }

    setupSoundToggle() {
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) {
            this.isMuted = false;
            soundToggle.addEventListener('click', () => {
                this.isMuted = !this.isMuted;
                soundToggle.textContent = `Sound: ${this.isMuted ? 'OFF' : 'ON'}`;
                soundToggle.classList.toggle('selected', !this.isMuted);
                console.log('Sound muted:', this.isMuted);
            });
        }
    }

    createSmoothEnvelope(gainNode, startTime, duration, maxGain = 0.4) {
        const attackTime = duration * 0.3;
        const releaseTime = duration * 0.7;
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(maxGain, startTime + attackTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        gainNode.gain.setValueAtTime(0, startTime + duration);
    }

    createReverbNode() {
        const convolver = this.audioContext.createConvolver();
        const rate = this.audioContext.sampleRate;
        const length = rate * 2; // 2 seconds
        const impulse = this.audioContext.createBuffer(2, length, rate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (rate * 0.2));
            }
        }
        
        convolver.buffer = impulse;
        return convolver;
    }

    play(soundName) {
        if (!this.initialized || this.isMuted || !this.audioContext) return;

        // Add minimum delay between sounds
        const now = Date.now();
        if (now - this.lastPlayTime < 50) return;  // 50ms minimum delay between sounds
        this.lastPlayTime = now;

        try {
            const currentTime = this.audioContext.currentTime;
            const reverb = this.createReverbNode();
            const masterGain = this.audioContext.createGain();
            masterGain.gain.value = 0.5;  // Reduced from 0.9 to 0.5
            
            reverb.connect(masterGain);
            masterGain.connect(this.audioContext.destination);

            switch(soundName) {
                case 'move':
                    // Ethereal movement sound
                    const moveOsc1 = this.audioContext.createOscillator();
                    const moveOsc2 = this.audioContext.createOscillator();
                    const moveGain = this.audioContext.createGain();
                    
                    moveOsc1.type = 'sine';
                    moveOsc2.type = 'sine';
                    moveOsc1.frequency.setValueAtTime(440, currentTime); // A4
                    moveOsc2.frequency.setValueAtTime(554.37, currentTime); // C#5
                    moveOsc1.frequency.linearRampToValueAtTime(446, currentTime + 0.2);
                    moveOsc2.frequency.linearRampToValueAtTime(560, currentTime + 0.2);
                    
                    moveOsc1.connect(moveGain);
                    moveOsc2.connect(moveGain);
                    moveGain.connect(reverb);
                    
                    this.createSmoothEnvelope(moveGain, currentTime, 0.3, 0.3);
                    
                    moveOsc1.start(currentTime);
                    moveOsc2.start(currentTime);
                    moveOsc1.stop(currentTime + 0.3);
                    moveOsc2.stop(currentTime + 0.3);
                    break;
                    
                case 'wall':
                    // Soft ambient pulse
                    const wallOsc = this.audioContext.createOscillator();
                    const wallFilter = this.audioContext.createBiquadFilter();
                    const wallGain = this.audioContext.createGain();
                    
                    wallFilter.type = 'lowpass';
                    wallFilter.frequency.setValueAtTime(200, currentTime);
                    wallFilter.Q.value = 1;
                    
                    wallOsc.type = 'sine';
                    wallOsc.frequency.setValueAtTime(120, currentTime);
                    wallOsc.frequency.exponentialRampToValueAtTime(60, currentTime + 0.4);
                    
                    wallOsc.connect(wallFilter);
                    wallFilter.connect(wallGain);
                    wallGain.connect(reverb);
                    
                    this.createSmoothEnvelope(wallGain, currentTime, 0.4, 0.35);
                    
                    wallOsc.start(currentTime);
                    wallOsc.stop(currentTime + 0.4);
                    break;
                    
                case 'start':
                    // Crystal-like ambient start
                    [329.63, 440, 554.37, 659.25].forEach((freq, i) => { // E4, A4, C#5, E5
                        const startOsc = this.audioContext.createOscillator();
                        const startGain = this.audioContext.createGain();
                        
                        startOsc.type = 'sine';
                        startOsc.frequency.setValueAtTime(freq, currentTime + i * 0.15);
                        
                        startOsc.connect(startGain);
                        startGain.connect(reverb);
                        
                        this.createSmoothEnvelope(startGain, currentTime + i * 0.15, 0.6, 0.4);
                        
                        startOsc.start(currentTime + i * 0.15);
                        startOsc.stop(currentTime + i * 0.15 + 0.6);
                    });
                    break;
                    
                case 'guide':
                    // Mystical ambient guide sound
                    const guideOsc1 = this.audioContext.createOscillator();
                    const guideOsc2 = this.audioContext.createOscillator();
                    const guideFilter = this.audioContext.createBiquadFilter();
                    const guideGain = this.audioContext.createGain();
                    
                    guideFilter.type = 'bandpass';
                    guideFilter.frequency.setValueAtTime(1000, currentTime);
                    guideFilter.Q.value = 2;
                    
                    guideOsc1.type = 'sine';
                    guideOsc2.type = 'sine';
                    guideOsc1.frequency.setValueAtTime(440, currentTime); // A4
                    guideOsc2.frequency.setValueAtTime(880, currentTime); // A5
                    guideOsc1.frequency.linearRampToValueAtTime(444, currentTime + 0.6);
                    guideOsc2.frequency.linearRampToValueAtTime(888, currentTime + 0.6);
                    
                    guideOsc1.connect(guideFilter);
                    guideOsc2.connect(guideFilter);
                    guideFilter.connect(guideGain);
                    guideGain.connect(reverb);
                    
                    this.createSmoothEnvelope(guideGain, currentTime, 0.8, 0.4);
                    
                    guideOsc1.start(currentTime);
                    guideOsc2.start(currentTime);
                    guideOsc1.stop(currentTime + 0.8);
                    guideOsc2.stop(currentTime + 0.8);
                    break;
                    
                case 'win':
                    // Ethereal victory sequence
                    const chords = [
                        { freqs: [440, 554.37, 659.25], time: 0 },    // A4, C#5, E5
                        { freqs: [493.88, 587.33, 739.99], time: 0.4 }, // B4, D5, F#5
                        { freqs: [523.25, 659.25, 783.99], time: 0.8 }, // C5, E5, G5
                        { freqs: [587.33, 739.99, 880], time: 1.2 }     // D5, F#5, A5
                    ];
                    
                    chords.forEach(chord => {
                        chord.freqs.forEach(freq => {
                            const winOsc = this.audioContext.createOscillator();
                            const winGain = this.audioContext.createGain();
                            
                            winOsc.type = 'sine';
                            winOsc.frequency.setValueAtTime(freq, currentTime + chord.time);
                            
                            winOsc.connect(winGain);
                            winGain.connect(reverb);
                            
                            this.createSmoothEnvelope(winGain, currentTime + chord.time, 0.8, 0.35);
                            
                            winOsc.start(currentTime + chord.time);
                            winOsc.stop(currentTime + chord.time + 0.8);
                        });
                    });
                    break;
            }
        } catch (error) {
            console.error(`Error playing sound ${soundName}:`, error);
        }
    }

    stopAll() {
        if (this.audioContext) {
            this.audioContext.close().then(() => {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            });
        }
    }
}

// Create and export sound manager instance
window.soundManager = new SoundManager();
