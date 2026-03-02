---
description: How to push an OTA update to the app
---

## Channel Map

| Build profile | Channel | Who uses it |
|---|---|---|
| `preview` | `preview` | **Current APK on phone** (internal distribution) |
| `production` | `production` | App Store / Play Store release |
| `development` | `development` | Dev client builds |

## Pushing an update

Always use the npm scripts instead of raw `eas update` to avoid targeting the wrong channel.

### Preview build (phone APK)
```
npm run update -- --message "your message here"
```

### Production (store release)
```
npm run update:prod -- --message "your message here"
```

## Checking the status

- Open the app on the phone
- Go to **Settings → UPDATE**
- The **Channel**, **Running update ID**, and **Runtime version** rows show exactly what's live
- Tap **"Check for update"** to manually trigger a check and download

## How updates apply

1. App opens → waits 3 seconds → checks for an update
2. If one is found → downloads it → calls `reloadAsync()` → app silently restarts with new code

## Troubleshooting: update not appearing

| Cause | Fix |
|---|---|
| Pushed to wrong branch (`main` instead of `preview`) | Use `npm run update` not raw `eas update` |
| App still showing old code after push | Force-kill app from recents, reopen it |
| Channel mismatch | Check Settings → UPDATE → Channel row |
| Runtime version mismatch | A new native module was added — requires a new build, not just an OTA |
