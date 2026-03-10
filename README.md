# Dart Tournament

A dart tournament management app built with React + TypeScript, Firebase, and deployed on GitHub Pages.

## Features

- **Leaderboard** - Overall player rankings with wins, losses, win rate, and tournaments won
- **Tournament Management** - Flexible tournament format with single-elimination brackets, multi-player matches, dynamic round creation, and horizontal bracket visualization
- **Game Modes** - Supports 4 dart game modes:
  - **Classic Halve-It** - Traditional 15-round game with fixed contracts
  - **Clock** - Racing game through targets 1-10 then Bull
  - **Killer** - Elimination game with personal target numbers
  - **301/501** - Point-based countdown game
- **Player Profiles** - Individual player stats, head-to-head records, and game history
- **Admin Interface** - Protected login for tournament organizers to create tournaments, manage players, delete tournaments, and record game results
- **Real-time Updates** - Firebase-powered live data syncing

## Documentation

- [Firebase Setup Guide](docs/FIREBASE_SETUP.md) - Step-by-step Firebase configuration
- [Architecture](docs/ARCHITECTURE.md) - App structure, state management, and data flow
- [Game Engines](docs/GAME_ENGINES.md) - Tournament bracket and contract scoring logic
- [Game Modes](docs/GAME_MODES.md) - Rules and details for each dart game mode

## Setup

### 1. Firebase Configuration

> **New to Firebase?** Follow the detailed step-by-step guide: [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)

Quick version:

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password provider)
3. Create an admin user in Authentication > Users
4. Enable **Firestore Database** and publish the security rules from `firestore.rules`
5. Update the Firebase config in `src/services/firebase.ts` with your project's values:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
};
```

> **Note:** Firebase API keys are not secret — they are safe to commit. See [Firebase docs](https://firebase.google.com/docs/projects/api-keys) for details. You can optionally use environment variables via `.env.example` instead.

### 2. Local Development

```bash
npm install
npm run dev
```

### 3. Build

```bash
npm run build
```

### 4. GitHub Pages Deployment

The app is configured to deploy automatically via GitHub Actions when pushing to the `main` branch.

1. In your GitHub repo settings, go to **Pages** > **Source** > select **GitHub Actions**
2. Push to `main` and the app will deploy

**Note:** Update the `base` option in `vite.config.ts` if your repository name differs from `dart-tournament`.

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** for bundling
- **Firebase** (Auth + Firestore) for backend
- **React Router** for SPA routing
- **GitHub Pages** for hosting

## Project Structure

```
src/
  components/layout/  - Sidebar, mobile nav, layout wrapper
  context/            - Auth and data context providers
  engines/            - Game logic (contracts, tournament brackets)
  models/             - TypeScript types and data models
  pages/admin/        - Admin: login, manage tournaments/players, score games
  pages/user/         - User: leaderboard, tournaments, games, player profiles
  services/           - Firebase config and database operations
docs/                 - Additional documentation
```
