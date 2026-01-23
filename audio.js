let audioCtx;
let successSound, failSound, startSound;
let backgroundMusicSource;
let backgroundMusicGain;
let musicMuteGain;
let sfxGain;
let analyser;
let isMusicPlaying = false;

const MAX_MUSIC_VOLUME = 0.3; // Keep background music from being too loud
const FADE_DURATION = 15; // 15 seconds
const MUSIC_DURATION = 140; // 140 seconds total length

export function initAudio() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();

        const loadSound = (url) => {
            return fetch(url)
                .then(response => response.arrayBuffer())
                .then(buffer => audioCtx.decodeAudioData(buffer));
        };

        // Create master gain for SFX
        sfxGain = audioCtx.createGain();
        sfxGain.gain.value = 1;
        sfxGain.connect(audioCtx.destination);

        const createSoundPlayer = (buffer) => () => {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(sfxGain);
            source.start(0);
        };

        Promise.all([
            loadSound('success.mp3'),
            loadSound('fail.mp3'),
            loadSound('start_sound.mp3')
        ]).then(([successBuffer, failBuffer, startBuffer]) => {
            successSound = createSoundPlayer(successBuffer);
            failSound = createSoundPlayer(failBuffer);
            startSound = createSoundPlayer(startBuffer);
        }).catch(e => console.error("Error loading audio:", e));
    }
}

export function fadeOutMusic(duration = 0.5) {
    if (!backgroundMusicGain || !audioCtx) return;
    const now = audioCtx.currentTime;
    backgroundMusicGain.gain.cancelScheduledValues(now);
    // Ramp down to a very small value instead of 0 to avoid potential issues
    backgroundMusicGain.gain.linearRampToValueAtTime(0.0001, now + duration);
}

export function fadeInMusic(duration = 1.0) {
    if (!backgroundMusicGain || !audioCtx) return;
    const now = audioCtx.currentTime;
    backgroundMusicGain.gain.cancelScheduledValues(now);
    backgroundMusicGain.gain.linearRampToValueAtTime(MAX_MUSIC_VOLUME, now + duration);
}

async function setupBackgroundMusic() {
    if (!audioCtx) initAudio();
    if (!audioCtx || backgroundMusicSource) return;

    try {
        const response = await fetch('/Infinite Orbit - Track 1 (Extended 2) - Sonauto.ogg');
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        backgroundMusicSource = audioCtx.createBufferSource();
        backgroundMusicSource.buffer = audioBuffer;
        backgroundMusicSource.loop = true;

        backgroundMusicGain = audioCtx.createGain();
        backgroundMusicGain.gain.value = 0; // Start at 0 volume

        musicMuteGain = audioCtx.createGain();
        musicMuteGain.gain.value = 1;

        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256; // Lower size for performance is fine for this use case

        // Reroute for visualizer to work when muted
        // Source -> FadeGain -> Analyser -> MuteGain -> Destination
        backgroundMusicSource.connect(backgroundMusicGain);
        backgroundMusicGain.connect(analyser);
        analyser.connect(musicMuteGain);
        musicMuteGain.connect(audioCtx.destination);
    } catch (e) {
        console.error("Error loading background music:", e);
    }
}


export async function playBackgroundMusic() {
    if (isMusicPlaying) return;
    isMusicPlaying = true; // Set immediately to prevent multiple calls

    if (!backgroundMusicSource) {
        await setupBackgroundMusic();
    }
    
    if (!audioCtx || !backgroundMusicSource) return;

    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }

    backgroundMusicSource.start(0);

    const scheduleFades = () => {
        const now = audioCtx.currentTime;
        
        // Cancel any previously scheduled automations
        backgroundMusicGain.gain.cancelScheduledValues(now);

        // Initial fade-in
        backgroundMusicGain.gain.setValueAtTime(0, now);
        backgroundMusicGain.gain.linearRampToValueAtTime(MAX_MUSIC_VOLUME, now + FADE_DURATION);

        // Schedule fade-out and fade-in for subsequent loops for a long time
        for (let i = 0; i < 100; i++) { // Schedule for ~4 hours
            const loopStartTime = now + (i * MUSIC_DURATION);
            
            // Time points for the current loop
            const currentFadeOutStartTime = loopStartTime + MUSIC_DURATION - FADE_DURATION;
            const currentFadeOutEndTime = loopStartTime + MUSIC_DURATION;

            // Time points for the next loop's fade-in
            const nextFadeInStartTime = currentFadeOutEndTime;
            const nextFadeInEndTime = nextFadeInStartTime + FADE_DURATION;

            // Schedule the fade-out at the end of the current loop
            // We use setValueAtTime to ensure the volume is at max before the ramp starts
            backgroundMusicGain.gain.setValueAtTime(MAX_MUSIC_VOLUME, currentFadeOutStartTime);
            backgroundMusicGain.gain.linearRampToValueAtTime(0, currentFadeOutEndTime);
            
            // Schedule the fade-in for the beginning of the next loop
            backgroundMusicGain.gain.setValueAtTime(0, nextFadeInStartTime);
            backgroundMusicGain.gain.linearRampToValueAtTime(MAX_MUSIC_VOLUME, nextFadeInEndTime);
        }
    };
    
    scheduleFades();
}


export function getAudioData() {
    if (!analyser) return null;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    return dataArray;
}

export function playSuccess() {
    if (successSound) successSound();
}

export function playFail() {
    if (failSound) failSound();
}

export function playStart() {
    if (startSound) startSound();
}

export function setMusicMuted(muted) {
    if (musicMuteGain && audioCtx) {
        const now = audioCtx.currentTime;
        musicMuteGain.gain.cancelScheduledValues(now);
        musicMuteGain.gain.setValueAtTime(muted ? 0 : 1, now);
    }
}

export function setSFXMuted(muted) {
    if (sfxGain && audioCtx) {
        const now = audioCtx.currentTime;
        sfxGain.gain.cancelScheduledValues(now);
        sfxGain.gain.setValueAtTime(muted ? 0 : 1, now);
    }
}