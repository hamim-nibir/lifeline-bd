# 🩸 Lifeline BD

A React Native mobile application connecting blood donors with patients in Bangladesh.

Built with **Expo** · **TypeScript** · **NativeWind (Tailwind CSS)** · **Expo Router**

---

## 📋 Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Where to Make Changes](#where-to-make-changes)
- [Config Files — Do Not Touch](#config-files--do-not-touch)
- [Environment Variables](#environment-variables)
- [Firebase Setup](#firebase-setup)
- [Running on Device](#running-on-device)
- [Common Errors & Fixes](#common-errors--fixes)
- [Contributing](#contributing)

---

## 🛠 Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| React Native | 0.81.5 | Mobile framework |
| Expo | ~54.0.33 | Build & development tooling |
| Expo Router | ~6.0.23 | File-based navigation |
| TypeScript | ~5.9.2 | Type safety |
| NativeWind | ^2.0.11 | Tailwind CSS for React Native |
| Tailwind CSS | ^3.3.2 | Utility-first styling |

---

## ✅ Prerequisites

Make sure you have the following installed before cloning:

- **Node.js** v18 or later → https://nodejs.org
  - Check: `node -v`
- **npm** v9 or later (comes with Node)
  - Check: `npm -v`
- **Expo Go app** on your Android or iOS device
  - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
  - iOS: https://apps.apple.com/app/expo-go/id982107779
- **Git**
  - Check: `git --version`

---

## 🚀 Getting Started

Follow these steps exactly to run the project locally.

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/lifeline-bd.git
cd lifeline-bd
```

### 2. Install dependencies

> ⚠️ You **must** use `--legacy-peer-deps`. This project uses Expo 54 which has peer dependency conflicts with npm's strict resolver. The flag is safe here.

```bash
npm install --legacy-peer-deps
```

### 3. Start the development server

```bash
npx expo start --clear
```

### 4. Open on your device

- Scan the **QR code** shown in the terminal using the **Expo Go** app
- Or press `a` to open on Android emulator, `i` for iOS simulator

---

## 📁 Project Structure

```
lifeline-bd/
│
├── app/                          # All screens & navigation (Expo Router)
│   ├── (tabs)/                   # Tab navigator group
│   │   ├── _layout.tsx           # Tab bar configuration
│   │   ├── index.tsx             # Home tab screen
│   │   ├── search.tsx            # Search donors screen
│   │   └── profile.tsx           # User profile screen
│   ├── (auth)/                   # Auth screens (no tab bar)
│   │   ├── login.tsx             # Login screen
│   │   └── register.tsx          # Registration screen
│   ├── request/
│   │   └── [id].tsx              # Dynamic blood request detail screen
│   └── _layout.tsx               # Root layout — imports global.css
│
├── components/
│   ├── ui/                       # Small reusable UI pieces
│   │   ├── Button.tsx            # Custom button component
│   │   ├── Card.tsx              # Card container component
│   │   └── Badge.tsx             # Blood type / status badge
│   └── layout/
│       └── ScreenWrapper.tsx     # Safe area screen wrapper
│
├── hooks/                        # Custom React hooks
│   └── useAuth.ts                # Authentication hook
│
├── services/                     # External API & Firebase logic
│   ├── firebase.ts               # Firebase app initialization
│   ├── auth.ts                   # Auth service functions
│   └── firestore.ts              # Firestore database functions
│
├── store/                        # Global state management
│   └── authStore.ts              # Auth state (Zustand or Context)
│
├── constants/                    # App-wide constant values
│   ├── colors.ts                 # Color palette
│   └── config.ts                 # App config values
│
├── types/                        # TypeScript type definitions
│   └── index.ts                  # All shared interfaces & types
│
├── assets/                       # Images, fonts, icons
│
├── .env                          # Local env variables (NOT committed)
├── .env.example                  # Example env file (committed)
│
# ── Config files (do not modify unless you know what you're doing) ──
├── app.json                      # Expo app configuration
├── babel.config.js               # Babel transpiler config
├── metro.config.js               # Metro bundler config
├── tailwind.config.js            # Tailwind CSS config
├── global.css                    # Tailwind directives entry point
├── nativewind-env.d.ts           # NativeWind TypeScript types
├── tsconfig.json                 # TypeScript compiler config
├── .npmrc                        # npm config (legacy-peer-deps=true)
└── package.json                  # Dependencies & scripts
```

---

## ✏️ Where to Make Changes

### Adding a new screen
Create a new `.tsx` file inside the `app/` folder. Expo Router automatically turns it into a route.

```
app/donors.tsx         → navigates to /donors
app/request/[id].tsx   → navigates to /request/123
```

### Adding a new component
Put reusable UI pieces in `components/ui/` and layout wrappers in `components/layout/`.

```tsx
// components/ui/BloodTypeCard.tsx
import { View, Text } from "react-native";

export default function BloodTypeCard({ type }: { type: string }) {
  return (
    <View className="bg-red-100 rounded-xl p-4">
      <Text className="text-red-600 font-bold text-lg">{type}</Text>
    </View>
  );
}
```

### Adding styling
Use **Tailwind class names** directly on components via `className`. No separate stylesheet needed.

```tsx
<View className="flex-1 bg-gray-50 px-4 py-6">
  <Text className="text-red-600 text-2xl font-bold">Hello</Text>
</View>
```

### Adding a new type / interface
Add it to `types/index.ts`:

```ts
export interface BloodRequest {
  id: string;
  bloodType: string;
  hospital: string;
  units: number;
  urgency: "Urgent" | "Normal";
  createdAt: Date;
}
```

### Adding a new constant
Add to `constants/colors.ts` or `constants/config.ts`:

```ts
// constants/colors.ts
export const Colors = {
  primary: "#DC2626",   // red-600
  secondary: "#FEE2E2", // red-100
};
```

---

## 🔒 Config Files — Do Not Touch

These files are carefully configured. **Do not modify them** unless you understand what you're doing — wrong changes will break the entire build.

| File | Why it's sensitive |
|------|--------------------|
| `babel.config.js` | Configures NativeWind v2 babel transform. Wrong preset order breaks bundling. |
| `metro.config.js` | Metro bundler setup. Changing this breaks the dev server. |
| `tailwind.config.js` | Must not include `nativewind/preset` (that's v4 only — we use v2). |
| `global.css` | Tailwind entry point imported by root layout. Must stay in project root. |
| `nativewind-env.d.ts` | Gives TypeScript awareness of `className` prop and CSS imports. |
| `tsconfig.json` | Must include `nativewind-env.d.ts` in the `include` array. |
| `.npmrc` | Contains `legacy-peer-deps=true`. Removing this will break `npm install`. |
| `app.json` | Contains `scheme`, `plugins: ["expo-router"]`, and `web.bundler: "metro"` — all required. |

---

## 🔑 Environment Variables

The project uses `.env` for secrets (API keys, Firebase config). This file is **not committed** to git.

### Setup

1. Copy the example file:
```bash
cp .env.example .env
```

2. Fill in your values in `.env`:
```
EXPO_PUBLIC_FIREBASE_API_KEY=your_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

> In Expo, environment variables must be prefixed with `EXPO_PUBLIC_` to be accessible in the app.

---

## 🔥 Firebase Setup

Firebase is not yet integrated but the folder structure is ready. When you're ready:

1. Go to https://console.firebase.google.com
2. Create a new project
3. Add an Android/iOS app and download the config
4. Install Firebase:
```bash
npm install firebase --legacy-peer-deps
```
5. Add your Firebase config to `.env` (see above)
6. Initialize in `services/firebase.ts`

---

## 📱 Running on Device

### Physical device (recommended)
1. Install **Expo Go** on your phone
2. Run `npx expo start --clear`
3. Scan the QR code — make sure your phone and PC are on the **same WiFi network**

### Android emulator
1. Install Android Studio and set up an AVD
2. Run `npx expo start --clear` then press `a`

### iOS simulator (Mac only)
1. Install Xcode
2. Run `npx expo start --clear` then press `i`

---

## 🐛 Common Errors & Fixes

### `npm install` fails with peer dependency error
```bash
npm install --legacy-peer-deps
```

### `Cannot find module 'babel-preset-expo'`
```bash
npm install --save-dev babel-preset-expo --legacy-peer-deps
npx expo start --clear
```

### `Cannot find module 'nativewind/preset'`
Your `tailwind.config.js` has a NativeWind v4 preset. Remove the `presets` line — we use v2:
```js
// ❌ Remove this line
presets: [require("nativewind/preset")],
```

### `className` not working / no styles applied
Make sure `app/_layout.tsx` imports `global.css` as the **very first line**:
```tsx
import "../global.css"; // must be first
```

### Metro bundler cache issues
```bash
npx expo start --clear
```

### Styles not updating after changes
Stop the server, then:
```bash
npx expo start --clear
```

---

## 🤝 Contributing

1. Create a new branch for your feature:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes inside `app/`, `components/`, `hooks/`, `services/`, `store/`, or `types/`

3. **Do not modify** config files unless discussed with the team

4. Commit your changes:
```bash
git add .
git commit -m "feat: add donor search screen"
```

5. Push and open a Pull Request:
```bash
git push origin feature/your-feature-name
```

---

## 📄 License

This project is private and proprietary. All rights reserved.
