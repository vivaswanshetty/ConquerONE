import * as Speech from "expo-speech";

let _settings = {
    soundEnabled: true,
    countdownAudio: true,
    workoutVoice: "default",
    workoutVoicePitch: 1.0,
    workoutVoiceRate: 0.95,
};

export const setAudioSettings = (settings) => {
    if (settings) {
        _settings = { ..._settings, ...settings };
    }
};

export const say = (text, options = {}) => {
    if (!_settings.soundEnabled) return;
    Speech.stop();

    const speechOpts = {
        language: "en-US",
        pitch: _settings.workoutVoicePitch ?? 1.0,
        rate: _settings.workoutVoiceRate ?? 0.95,
        ...options,
    };

    if (_settings.workoutVoice && _settings.workoutVoice !== "default") {
        speechOpts.voice = _settings.workoutVoice;
    }

    Speech.speak(text, speechOpts);
};

// Preview function to test voice in settings
export const previewWorkoutVoice = (voiceId, pitch = 1.0, rate = 0.95) => {
    Speech.stop();
    const speechOpts = {
        language: "en-US",
        pitch: pitch,
        rate: rate,
    };
    if (voiceId && voiceId !== "default") {
        speechOpts.voice = voiceId;
    }
    Speech.speak("3, 2, 1. Go! Rest over. Time to conquer.", speechOpts);
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
