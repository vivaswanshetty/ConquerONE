import * as Speech from "expo-speech";

let _settings = { soundEnabled: true, countdownAudio: true };

export const setAudioSettings = (settings) => {
    _settings = settings;
};

const say = (text, options = {}) => {
    if (!_settings.soundEnabled) return;
    Speech.stop();
    Speech.speak(text, {
        language: "en-US",
        pitch: 1.0,
        rate: 0.95,
        ...options,
    });
};

// Countdown: "3… 2… 1"
export const speakCountdown = (seconds, onDone) => {
    if (!_settings.soundEnabled || !_settings.countdownAudio) return;
    let remaining = seconds;

    const tick = () => {
        if (remaining <= 0) { onDone?.(); return; }
        say(String(remaining), { rate: 1.0 });
        remaining -= 1;
        setTimeout(tick, 1000);
    };
    tick();
};

// Phase announcements
export const announceWorkStart = () => say("Go");
export const announceSetDone = () => say("Set done. Rest.");
export const announceExerciseDone = () => say("Exercise complete. Get ready.");
export const announceRestOver = () => say("Rest over. Ready?");
export const announceWorkoutDone = () => say("Workout complete. Well done.");
export const announceSide = (side) => say(`Switch to ${side} side`);

// Countdown before phase ends
export const announceFinalCountdown = (secsLeft) => {
    if (!_settings.soundEnabled || !_settings.countdownAudio) return;
    if (secsLeft <= 3 && secsLeft > 0) say(String(secsLeft), { rate: 1.1 });
};
