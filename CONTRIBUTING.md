# Contributing

Technical documentation for developers working on the Dart Tournament app.

## Tech Stack

- **React 19** + **TypeScript 5.9** (strict mode)
- **Vite 7** for bundling and dev server
- **Firebase 12** (Auth + Firestore) for backend
- **React Router 7** for SPA routing
- **Vitest 4** + **React Testing Library** for tests
- **GitHub Pages** for hosting (auto-deploy via GitHub Actions)

## Setup

### 1. Firebase Configuration

> **New to Firebase?** Follow the detailed guide: [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)

Quick version:

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password provider)
3. Create an admin user in Authentication > Users
4. Enable **Firestore Database** and publish the security rules from `firestore.rules`
5. Update the Firebase config in `src/services/firebase.ts` with your project's values

> **Note:** Firebase API keys are not secret -- they are safe to commit. See [Firebase docs](https://firebase.google.com/docs/projects/api-keys). You can optionally use environment variables via `.env.example`.

### 2. Local Development

```bash
npm install
npm run dev        # Start dev server (port 5173)
npm run build      # TypeScript check + Vite bundle
npm test           # Run tests once
npm run test:watch # Tests in watch mode
npm run lint       # ESLint
```

### 3. GitHub Pages Deployment

Deploys automatically via GitHub Actions on push to `main`.

1. In repo settings, go to **Pages** > **Source** > select **GitHub Actions**
2. Update `base` in `vite.config.ts` if your repo name differs from `dart-tournament`

## Project Structure

```
src/
  components/
    game/           - DartInput, game boards (Classic, Killer, Clock), results banner, turn history
    layout/         - Sidebar, MobileNav, Layout wrapper
  context/          - AuthContext, DataContext, ThemeContext
  engines/          - Pure game logic (no UI, no Firebase)
    classic.ts      - Classic Halve-It game flow + Checkpoint Society bonuses
    clock.ts        - Clock mode dart processing and winner determination
    killer.ts       - Killer mode lives, attacks, elimination
    contracts.ts    - Contract validation for all 15 Halve-It contracts
    tournament.ts   - Bracket generation and match progression
  models/
    types.ts        - All TypeScript types, constants, and Checkpoint rewards
  pages/
    admin/          - Login, ManageTournaments, ScoreGames, ManagePlayers, GamePlayPage, Settings
    user/           - Leaderboard, Tournaments, Games, Players, HighScores, GameViewPage
  services/
    firebase.ts     - Firebase initialization
    database.ts     - Firestore CRUD + real-time listeners
docs/               - Extended documentation
```

## Further Documentation

- [Architecture](docs/ARCHITECTURE.md) - App structure, state management, and data flow
- [Firebase Setup](docs/FIREBASE_SETUP.md) - Step-by-step Firebase configuration
- [Game Engines](docs/GAME_ENGINES.md) - Tournament bracket and contract scoring logic
- [Game Modes](docs/GAME_MODES.md) - Detailed rules for each dart game mode
