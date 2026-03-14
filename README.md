# CONQUER ONE

> **Elite dumbbell training protocol. Built for performance.**

A 6-day dumbbell split app built in React Native + Expo, with real-time Firebase sync, OTA updates, AI coaching, and a premium black/crimson design system. Engineered for athletes who take their training seriously.

---

## Screenshots

---

## Features

### Core Training
- **6-day structured split** — Chest · Back · Arms · Abs & Forearms · Shoulders · Legs
- **Live workout timer** with animated ring, set tracking, and final-countdown haptics
- **Rep-based & timer-based** sets with automatic phase transitions
- **Bilateral exercise support** — left/right side tracked independently
- **Jump-to-exercise navigator** — skip around mid-workout
- **Custom workout builder** — mix exercises from any muscle group

### Performance Tracking
- **Personal Records (PRs)** — automatically detected and celebrated after each set
- **Body measurements** over time (weight, chest, waist, hips, arms, thighs)
- **Weekly frequency charts** with trend analytics
- **Workout history** with per-session exercise breakdown, shareable as CSV
- **Rank system** — Recruit → Rookie → Rising Star → Warrior → Titan → Legend

### Experience
- **AI Coach** powered by Gemini (multi-model fallback: 2.5 Flash → 2.0 Flash → etc.)
- **Streak system** with freeze protection for rest/travel days
- **Milestones & Moments** — achievement cards that unlock as you progress
- **Voice guidance** via expo-speech with configurable pitch, rate, and voice selection
- **Haptic feedback** — tactile pulses on set completion, rest end, and PRs
- **Real-time calorie estimate** using MET-based calculation
- **Form tips** displayed per exercise during the active set

### Technical
- **OTA updates** via Expo EAS — zero App Store roundtrip for JS changes
- **Firebase Auth** — email/password + Google Sign-In (Apple in progress)
- **Firestore** — real-time cloud sync with single-write batch migration from AsyncStorage
- **Health Connect** — Android integration for step counts, calories burned
- **Push notifications** — daily reminders, streak-at-risk alerts, birthday wishes, milestones
- **Offline-first** — full functionality without internet; data migrates to cloud on next login
- **Per-exercise config overrides** — customize sets, rest time, and work duration

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.81 · Expo SDK 54 |
| Navigation | React Navigation v7 (Stack) |
| Auth | Firebase Auth v12 |
| Database | Cloud Firestore |
| OTA Updates | Expo EAS Updates |
| AI | Google Gemini API (multi-model fallback) |
| Animations | React Native Reanimated v4 + Animated API |
| Gestures | React Native Gesture Handler |
| Health | React Native Health Connect (Android) |
| Storage | AsyncStorage (local) → Firestore (cloud) |
| Fonts | Arimo · Outfit · Syne · Urbanist · Montserrat |
| Icons | @expo/vector-icons (Ionicons) |

---

## Architecture

```
/
├── App.js                    # Root: fonts, OTA checks, auth routing
├── src/
│   ├── screens/              # One file per screen (17 screens)
│   ├── components/           # NetworkBanner, DayIcon, WorkoutChart
│   ├── context/              # AuthContext (Firebase auth + profile)
│   ├── data/                 # workoutData.js — exercise definitions & assets
│   └── utils/
│       ├── firebase.js       # App init, auth, db, storage
│       ├── firestore.js      # All CRUD operations
│       ├── storage.js        # AsyncStorage layer (offline-first)
│       ├── sync.js           # Bridge: local → cloud
│       ├── gemini.js         # AI coach engine with fallback logic
│       ├── audio.js          # expo-speech TTS wrapper
│       ├── health.js         # Health Connect integration
│       ├── notifications.js  # Reminders, milestones, birthday wishes
│       ├── settings.js       # App preferences (persisted)
│       ├── workoutConfig.js  # Per-exercise user overrides
│       ├── cloudStorage.js   # Image processing + base64 avatars
│       └── theme.js          # Design system: colors, fonts, spacing
├── plugins/
│   └── withTTSQueries.js     # Android manifest TTS query patch
├── assets/
│   └── exercises/            # Exercise reference images (JPEG)
├── app.json                  # Expo config
└── eas.json                  # Build profiles: development / preview / production
```

### Data Flow

```
User Action
    │
    ▼
AsyncStorage (immediate, offline-safe)
    │
    ▼
triggerAutoSync() ──► Firestore (if authenticated)
                           │
                           ▼
                    Real-time across devices
```

### OTA Channel Map

| Build profile | EAS channel | Who uses it |
|---|---|---|
| `preview` | `preview` | APK on test device |
| `production` | `production` | App Store / Play Store |
| `development` | `development` | Dev client |

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- Expo CLI (`npm install -g eas-cli`)
- Android Studio or physical Android device (Health Connect requires Android 14+)

### Installation

```bash
git clone https://github.com/your-username/conquer-one.git
cd conquer-one
npm install
```

### Environment Setup

Create `.env` in the project root:

```env
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

Get your Gemini API key at [aistudio.google.com](https://aistudio.google.com/).

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/)
2. Enable **Authentication** (Email/Password + Google)
3. Enable **Firestore** in production mode
4. Copy your config into `src/utils/firebase.js`
5. Deploy Firestore security rules from `firestore.rules`

### Running

```bash
# Start Expo dev server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

---

## Building & Deploying

### Preview build (APK for internal testing)

```bash
eas build --profile preview --platform android
```

### Production build

```bash
eas build --profile production --platform android
eas build --profile production --platform ios
```

### OTA update (no new build required)

```bash
# Push to preview channel (test device)
npm run update -- --message "your message here"

# Push to production
npm run update:prod -- --message "your message here"
```

### Checking update status

Open the app → **Settings → UPDATE** to see the active channel, update ID, and runtime version. Tap "Check for update" to manually trigger.

---

## Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /{subcollection}/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## Workout Data

Exercises are defined in `src/data/workoutData.js`. Each exercise carries:

```js
{
  name: "Floor Dumbbell Press",
  sets: 3,
  type: "reps",           // "reps" | "timer"
  repRange: "12-15",
  activeTimeSec: 45,
  restTimeSec: 90,
  primaryTarget: "Middle Chest",
  image: require("..."),
  tips: ["Keep elbows at 45°", ...],
  equipment: "Dumbbells",
  unilateral: false,      // true = left + right tracked separately
}
```

To add a new day or modify exercises, edit this file. No backend changes needed — the app reads it directly at runtime.

---

## Rank System

| Sessions | Rank |
|---|---|
| 0–4 | RECRUIT |
| 5–9 | ROOKIE |
| 10–24 | RISING STAR |
| 25–49 | WARRIOR |
| 50–99 | TITAN |
| 100+ | LEGEND |

---

## Known Limitations

- **Apple Sign-In** requires Apple Developer Program enrollment (currently shows "Coming Soon")
- **Health Connect** requires Android 14+ and the Health Connect app installed
- **Voice enumeration on Samsung** devices may return an empty list — the saved voice identifier is still passed to the TTS engine and honored
- **iOS** is configured but not currently submitted to the App Store

---

## Contributing

This is a solo-built personal project. Issues and suggestions are welcome — open a GitHub issue or email `support@conquer-one.app`.

---

## License

MIT — see `LICENSE` for details.

---



**BUILT FOR POWER BY VIVASWAN SHETTY**

`CONQUER ONE CORE PROTOCOL v2.2.9`

