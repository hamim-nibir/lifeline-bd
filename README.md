# 🩸 Lifeline BD

A Unified Emergency Response System for Bangladesh.

Built with **Expo** · **TypeScript** · **NativeWind (Tailwind CSS)** · **Expo Router** · **Firebase**

---

## 📋 Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Firebase Setup](#firebase-setup)
- [Project Structure](#project-structure)
- [Where to Make Changes](#where-to-make-changes)
- [Config Files — Do Not Touch](#config-files--do-not-touch)
- [Environment Variables](#environment-variables)
- [Authentication Flow](#authentication-flow)
- [Running on Device](#running-on-device)
- [Common Errors & Fixes](#common-errors--fixes)
- [Contributing — Full Workflow Guide](#contributing--full-workflow-guide)

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
| Firebase | latest | Auth, Firestore database |
| Zustand | latest | Global state management |

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
git clone https://github.com/hamim-nibir/lifeline-bd.git
cd lifeline-bd
```

### 2. Install dependencies

> ⚠️ You **must** use `--legacy-peer-deps`. This project uses Expo 54 which has peer dependency conflicts with npm's strict resolver. The flag is safe here.

```bash
npm install --legacy-peer-deps
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Fill in your Firebase config values in `.env`. See the [Firebase Setup](#firebase-setup) section below.

### 4. Start the development server

```bash
npx expo start --clear
```

### 5. Open on your device

- Scan the **QR code** in the terminal using the **Expo Go** app
- Or press `a` for Android emulator, `i` for iOS simulator

---

## 🔥 Firebase Setup

Every collaborator needs to set up their `.env` file with the Firebase config. The Firebase project is shared — you do not create a new one. Get the config values from the team lead.

### If you are the team lead — one-time setup

1. Go to https://console.firebase.google.com
2. Click **Add project** → name it `lifeline-bd` → Continue
3. Disable Google Analytics → **Create project**
4. Click the **Web icon** (`</>`) → name it `lifeline-bd` → **Register app**
5. Copy the config object shown on screen
6. Go to **Authentication** → **Get started** → **Email/Password** → Enable → **Save**
7. Go to **Firestore Database** → **Create database** → **Start in test mode** → choose a region → **Enable**
8. Share the config values with your team (via a secure channel, not GitHub)

### Setting up your `.env` file

Create a `.env` file in the project root and fill in the values:

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

> All Expo environment variables must be prefixed with `EXPO_PUBLIC_` to be accessible in the app.
> Never commit your `.env` file — it is already in `.gitignore`.

### Firestore data structure

```
users/                        ← collection
  {uid}/                      ← document per user
    uid: string
    name: string
    email: string
    bloodType: string | null
    phone: string | null
    location: string | null
    isDonor: boolean
    createdAt: timestamp
```

---

## 📁 Project Structure

```
lifeline-bd/
│
├── app/                          # All screens & navigation (Expo Router)
│   ├── _layout.tsx               # Root layout — auth guard & routing
│   ├── (auth)/                   # Auth screens (no bottom navbar)
│   │   ├── _layout.tsx           # Auth stack layout
│   │   └── login.tsx             # Animated login + register screen
│   └── (tabs)/                   # Authenticated screens (with bottom navbar)
│       ├── _layout.tsx           # Tab bar configuration
│       ├── index.tsx             # Home screen
│       ├── search.tsx            # Search donors
│       ├── request.tsx           # Blood request
│       ├── notifications.tsx     # Notifications
│       └── profile.tsx           # User profile + sign out
│
├── components/
│   ├── ui/                       # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Badge.tsx
│   └── layout/
│       └── ScreenWrapper.tsx
│
├── hooks/
│   └── useAuth.ts                # Auth state hook
│
├── services/                     # Firebase logic
│   ├── firebase.ts               # Firebase app initialization
│   ├── auth.ts                   # register, login, logout, auth listener
│   └── firestore.ts              # Firestore read/write functions
│
├── store/
│   └── authStore.ts              # Global auth state (Zustand)
│
├── constants/
│   ├── colors.ts
│   └── config.ts
│
├── types/
│   └── index.ts                  # UserProfile, AuthFormData interfaces
│
├── assets/
│
├── .env                          # Your local secrets — NOT committed
├── .env.example                  # Template — committed, no real values
│
├── app.json
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
├── global.css
├── nativewind-env.d.ts
├── tsconfig.json
├── .npmrc
└── package.json
```

---

## ✏️ Where to Make Changes

### Adding a new screen
Create a `.tsx` file inside `app/`. Expo Router automatically makes it a route.

```
app/(tabs)/donors.tsx     → accessible after login at /donors tab
app/donor/[id].tsx        → dynamic route at /donor/123
```

### Adding a new component
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

### Adding a Firestore function
Add it to `services/firestore.ts`:
```ts
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export const getUserProfile = async (uid: string) => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
};
```

### Adding a new type
Add to `types/index.ts`:
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

### Using global auth state
```tsx
import { useAuthStore } from "../store/authStore";

const { user } = useAuthStore();
console.log(user?.displayName); // logged in user's name
```

---

## 🔒 Config Files — Do Not Touch

| File | Why it's sensitive |
|------|--------------------|
| `babel.config.js` | NativeWind v2 babel transform — wrong order breaks bundling |
| `metro.config.js` | Metro bundler setup — changing this breaks the dev server |
| `tailwind.config.js` | Must not include `nativewind/preset` — we use v2 not v4 |
| `global.css` | Tailwind entry point — must stay in root, imported first in `_layout.tsx` |
| `nativewind-env.d.ts` | Gives TypeScript awareness of `className` and CSS imports |
| `tsconfig.json` | Must include `nativewind-env.d.ts` in the `include` array |
| `.npmrc` | Contains `legacy-peer-deps=true` — removing this breaks `npm install` |
| `app.json` | Contains `scheme`, `plugins: ["expo-router"]`, `web.bundler: "metro"` — all required |
| `services/firebase.ts` | Firebase initialization — only one instance allowed via `getApps()` check |

---

## 🔑 Environment Variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase project API key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |

Get these values from the team lead. Never commit your `.env` file.

---

## 🔐 Authentication Flow

```
App opens
    ↓
Root _layout.tsx checks auth state (Firebase onAuthStateChanged)
    ↓
Not logged in → redirect to /(auth)/login
Logged in     → redirect to /(tabs)
    ↓
login.tsx — animated tab switcher between Sign In and Register
    ↓
On success → root layout detects user → auto redirects to /(tabs)
    ↓
Profile screen → Sign Out → root layout detects null user → redirects to login
```

The bottom navbar is only visible inside `(tabs)/` — unauthenticated users never see it.

---

## 📱 Running on Device

### Physical device (recommended)
1. Install **Expo Go** on your phone
2. Run `npx expo start --clear`
3. Scan the QR code — phone and PC must be on the **same WiFi network**

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
Remove the `presets` line from `tailwind.config.js` — we use NativeWind v2:
```js
// ❌ Remove this line
presets: [require("nativewind/preset")],
```

### `className` not working
Make sure `app/_layout.tsx` imports `global.css` as the very first line:
```tsx
import "../global.css"; // must be first
```

### Firebase: `auth/invalid-credential`
Your `.env` values are wrong or missing. Double-check them against the Firebase console.

### Firebase: `Cannot read property 'app' of undefined`
Your `.env` file is missing or the variable names are wrong. Make sure all keys start with `EXPO_PUBLIC_`.

### App stuck on blank screen after login
Run `npx expo start --clear` — Metro cache needs clearing after auth state changes.

### Metro bundler cache issues
```bash
npx expo start --clear
```

---

## 🤝 Contributing — Full Workflow Guide

This project uses a **3-branch strategy** to keep the codebase safe and stable.

| Branch | Purpose | Who pushes here |
|--------|---------|-----------------|
| `main` | Production-ready releases only | Nobody directly — only merged from `develop` |
| `develop` | Integration branch — all features land here | Nobody directly — only merged from feature branches |
| `feature/xxx` | Your personal working branch for one task | You |

> ⚠️ **Never push directly to `main` or `develop`.** Always work on a feature branch and open a Pull Request.

---

### Step 1 — Get assigned a task

Before writing any code, coordinate with the team lead. Know exactly which screen, component, or feature you own. This prevents two people editing the same file simultaneously.

---

### Step 2 — Clone the repo (first time only)

```bash
git clone https://github.com/hamim-nibir/lifeline-bd.git
cd lifeline-bd
npm install --legacy-peer-deps
cp .env.example .env
# fill in .env with Firebase config values from team lead
```

---

### Step 3 — Always start from the latest `develop`

```bash
git checkout develop
git pull origin develop
```

Do this every single time before starting new work.

---

### Step 4 — Create your feature branch

```bash
git checkout -b feature/your-feature-name
```

| What you're building | Branch name |
|----------------------|-------------|
| Login screen | `feature/login-screen` |
| Donor search | `feature/donor-search` |
| Profile page | `feature/profile-screen` |
| Bug fix | `fix/search-crash` |
| UI update | `ui/home-redesign` |

---

### Step 5 — Make your changes

Work only in files relevant to your task. Never touch config files.

---

### Step 6 — Commit regularly

```bash
git add .
git commit -m "feat: add donor search screen"
```

| Prefix | When to use |
|--------|-------------|
| `feat:` | New functionality |
| `fix:` | Bug fix |
| `ui:` | Visual changes only |
| `refactor:` | Code restructure |
| `chore:` | Dependency or config updates |
| `docs:` | README or comments |

---

### Step 7 — Push your branch

```bash
git push -u origin feature/your-feature-name
```

---

### Step 8 — Open a Pull Request on GitHub

1. Go to the repo on GitHub
2. Click **Compare & pull request** on the banner
3. Set base branch to **`develop`** — not `main`
4. Fill in the title and description:

```
## What this PR does
- Brief description of the feature

## How to test
1. Steps to test the feature

## Screenshots
(attach a screenshot)
```

5. Request a review from the team lead

---

### Step 9 — Respond to review comments

```bash
# make changes, then:
git add .
git commit -m "fix: address review comments"
git push
```

---

### Step 10 — After your PR is merged

```bash
git checkout develop
git pull origin develop
git branch -d feature/your-feature-name
```

---

### 🔁 Quick reference

```bash
git checkout develop && git pull origin develop
git checkout -b feature/your-feature-name
# do your work
git add . && git commit -m "feat: what you built"
git push -u origin feature/your-feature-name
# open PR on GitHub → base: develop
# after merge:
git checkout develop && git pull origin develop
git branch -d feature/your-feature-name
```

---

### 🚨 Golden rules

1. Never push directly to `main` or `develop`
2. Always `git pull origin develop` before creating a branch
3. One feature = one branch = one Pull Request
4. Only touch files related to your assigned task
5. Never modify config files without discussing with the team lead
6. Use `feat/fix/ui/refactor` prefix in every commit message
7. Delete your branch locally after it is merged

---

## 📄 License

This project is private and proprietary. All rights reserved.
