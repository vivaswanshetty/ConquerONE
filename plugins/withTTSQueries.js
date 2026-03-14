const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withTTSQueries(config) {
    return withAndroidManifest(config, (config) => {
        const androidManifest = config.modResults;

        // Ensure <queries> exists
        if (!androidManifest.manifest.queries) {
            androidManifest.manifest.queries = [{}];
        }

        const queries = androidManifest.manifest.queries[0];

        // Ensure <package> exists in <queries>
        if (!queries.package) {
            queries.package = [];
        }

        const ttsPackages = ['com.google.android.tts', 'com.samsung.SMT'];
        ttsPackages.forEach(pkg => {
            if (!queries.package.some(p => p.$['android:name'] === pkg)) {
                queries.package.push({ $: { 'android:name': pkg } });
            }
        });

        // Ensure <intent> exists in <queries>
        if (!queries.intent) {
            queries.intent = [];
        }

        // Check if the TTS intent already exists
        const hasTTSIntent = queries.intent.some(
            (intent) => intent.action && intent.action[0].$['android:name'] === 'android.intent.action.TTS_SERVICE'
        );

        if (!hasTTSIntent) {
            queries.intent.push({
                action: [{ $: { 'android:name': 'android.intent.action.TTS_SERVICE' } }],
            });
        }

        return config;
    });
};
