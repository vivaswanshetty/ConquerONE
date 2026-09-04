const { withMainActivity, withAndroidManifest } = require('@expo/config-plugins');

function withHealthConnectMainActivity(config) {
    return withMainActivity(config, (config) => {
        let content = config.modResults.contents;

        const importStatement = 'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate';
        const delegateCall = '    HealthConnectPermissionDelegate.setPermissionDelegate(this)';

        // 1. Add import if not present
        if (!content.includes(importStatement)) {
            content = content.replace(/(package\s+[^\n]+)/, `$1\n\n${importStatement}`);
        }

        // 2. Add delegate call inside onCreate if not present
        if (!content.includes('HealthConnectPermissionDelegate.setPermissionDelegate')) {
            if (/super\.onCreate\([^\)]*\)/.test(content)) {
                content = content.replace(/(super\.onCreate\([^\)]*\))/, `$1\n${delegateCall}`);
            } else if (/override\s+fun\s+onCreate\([^\)]*\)\s*\{/.test(content)) {
                content = content.replace(/(override\s+fun\s+onCreate\([^\)]*\)\s*\{)/, `$1\n${delegateCall}`);
            }
        }

        config.modResults.contents = content;
        return config;
    });
}

function withHealthConnectManifest(config) {
    return withAndroidManifest(config, (config) => {
        const manifest = config.modResults.manifest;

        // Ensure <queries> exists and includes Health Connect package
        if (!manifest.queries) {
            manifest.queries = [{}];
        }
        const queries = manifest.queries[0];
        if (!queries.package) {
            queries.package = [];
        }
        const healthPackage = 'com.google.android.apps.healthdata';
        if (!queries.package.some((p) => p.$ && p.$['android:name'] === healthPackage)) {
            queries.package.push({ $: { 'android:name': healthPackage } });
        }

        // Ensure MainActivity has ACTION_SHOW_PERMISSIONS_RATIONALE intent-filter without duplication
        const app = manifest.application[0];
        if (app.activity && Array.isArray(app.activity)) {
            const mainActivity = app.activity.find((a) => a.$ && a.$['android:name'] === '.MainActivity');
            if (mainActivity) {
                if (!mainActivity['intent-filter']) {
                    mainActivity['intent-filter'] = [];
                }
                let rationaleFound = false;
                mainActivity['intent-filter'] = mainActivity['intent-filter'].filter((filter) => {
                    const isRationale = filter.action && filter.action.some((a) => a.$ && a.$['android:name'] === 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE');
                    if (isRationale) {
                        if (rationaleFound) return false;
                        rationaleFound = true;
                    }
                    return true;
                });
                if (!rationaleFound) {
                    mainActivity['intent-filter'].push({
                        action: [{ $: { 'android:name': 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE' } }],
                    });
                }
            }
        }

        // Ensure Android 14 VIEW_PERMISSION_USAGE activity-alias exists
        if (!app['activity-alias']) {
            app['activity-alias'] = [];
        }
        const aliasName = 'ViewPermissionUsageActivity';
        const hasAlias = app['activity-alias'].some((a) => a.$ && a.$['android:name'] === aliasName);
        if (!hasAlias) {
            app['activity-alias'].push({
                $: {
                    'android:name': aliasName,
                    'android:exported': 'true',
                    'android:targetActivity': '.MainActivity',
                    'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE',
                },
                'intent-filter': [
                    {
                        action: [{ $: { 'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE' } }],
                        category: [{ $: { 'android:name': 'android.intent.category.HEALTH_PERMISSIONS' } }],
                    },
                ],
            });
        }

        return config;
    });
}

module.exports = function withHealthConnect(config) {
    config = withHealthConnectMainActivity(config);
    config = withHealthConnectManifest(config);
    return config;
};
