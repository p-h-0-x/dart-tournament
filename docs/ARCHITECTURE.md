# Architecture

Overview of how the Dart Tournament app is structured and how data flows through the system.

---

## Overview

The app is a **React single-page application** (SPA) with a **Firebase** backend, deployed to **GitHub Pages**. There is no custom server — Firebase provides authentication and database services directly from the browser.

```
Browser (React SPA)
  ├── Firebase Auth   → admin login/logout
  └── Cloud Firestore → players, games, tournaments (real-time)
```

## Directory Structure

```
src/
  components/       UI components shared across pages
    layout/         Layout shell, sidebar, mobile navigation
  context/          React context providers for global state
    AuthContext      Authentication state (user, login, logout)
    DataContext      Application data with real-time Firestore sync
  engines/          Pure business logic (no UI, no Firebase)
    contracts.ts    Classic Halve-It contract validation
    tournament.ts   Bracket generation & flexible round management
  models/
    types.ts        All TypeScript interfaces and type definitions
  pages/
    admin/          Protected pages for tournament organizers
    user/           Public pages (leaderboard, tournaments, games, players)
  services/
    firebase.ts     Firebase app initialization, auth & Firestore exports
    database.ts     Firestore CRUD operations and real-time listeners
```

## Routing

Defined in `src/App.tsx`. Uses React Router with a `basename` derived from `import.meta.env.BASE_URL` (set to `/dart-tournament/` for GitHub Pages).

### Public Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | LeaderboardPage | Overall player rankings |
| `/tournaments` | TournamentsPage | List of all tournaments |
| `/tournaments/:id` | TournamentDetailPage | Bracket view and match details |
| `/games` | GamesPage | Game history |
| `/players` | PlayersPage | Player list |
| `/players/:id` | PlayerDetailPage | Individual stats, head-to-head, game history |

### Admin Routes (Protected)

All admin routes are wrapped in an `AdminRoute` component that checks `isAdmin` from `AuthContext`. Unauthenticated users are redirected to `/admin/login`.

| Path | Page | Description |
|------|------|-------------|
| `/admin/login` | LoginPage | Email/password login |
| `/admin/tournaments` | ManageTournamentsPage | Create tournaments, set bracket winners, delete |
| `/admin/games` | ScoreGamesPage | Create games and record results |
| `/admin/players` | ManagePlayersPage | Add and manage players |

## State Management

The app uses two React context providers, both wrapped around all routes in `App.tsx`:

### AuthContext (`src/context/AuthContext.tsx`)

Manages Firebase authentication state.

- **`user`** — Current Firebase `User` object, or `null` if not logged in
- **`loading`** — `true` while Firebase checks the initial auth state
- **`isAdmin`** — `true` if any user is authenticated (all authenticated users are treated as admins)
- **`login(email, password)`** — Signs in with `signInWithEmailAndPassword`
- **`logout()`** — Signs out with `signOut`

Uses `onAuthStateChanged` to listen for auth state changes.

### DataContext (`src/context/DataContext.tsx`)

Subscribes to all Firestore collections and provides real-time data to the entire app.

- **`players`** — All players, sorted by name
- **`games`** — All games, sorted by creation date (newest first)
- **`tournaments`** — All tournaments, sorted by creation date (newest first)
- **`leaderboard`** — Computed from players, games, and tournaments (see below)
- **`loading`** — `true` until all three collections have loaded
- **`getPlayer(id)`** — Helper to look up a player by ID

#### Leaderboard Computation

The `computeLeaderboard` function builds rankings from raw data:

1. Identifies games linked to tournament matches (via `gameId` on `TournamentMatch`) to avoid double-counting
2. Counts wins/losses from **standalone games** (not linked to any tournament match)
3. Counts wins/losses from **tournament matches** (using match `winnerId`)
4. Computes `tournamentsPlayed` (player appears in tournament `playerIds`) and `tournamentsWon` (player is `championId`)
5. Sorts by wins descending, then win rate descending

## Database Layer (`src/services/database.ts`)

All Firestore operations are in this single module. Key patterns:

- **Real-time listeners** — `onPlayersChange`, `onGamesChange`, `onTournamentsChange` use Firestore's `onSnapshot` for live updates. These are consumed by `DataContext`.
- **CRUD functions** — `addPlayer`, `addGame`, `updateGame`, `addTournament`, `updateTournament`
- **Cascading deletes** — `deleteTournament` uses a Firestore `writeBatch` to delete the tournament and all its associated games in a single atomic operation
- **Queries** — `getGamesByTournament` filters games by `tournamentId`

### Firestore Collections

| Collection | Document Fields | Access |
|------------|----------------|--------|
| `players` | `name`, `createdAt` | Public read, admin write |
| `games` | `mode`, `playerIds`, `results`, `status`, `tournamentId?`, etc. | Public read, admin write |
| `tournaments` | `name`, `gameMode`, `playerIds`, `activePlayerIds`, `matches`, `status`, etc. | Public read, admin write |

Security rules are defined in `firestore.rules` — anyone can read, only authenticated users can write.

## Firebase Integration (`src/services/firebase.ts`)

Initializes the Firebase app with a hardcoded configuration object and exports:

- **`auth`** — Firebase Auth instance (used by `AuthContext`)
- **`db`** — Firestore instance (used by `database.ts`)

The config values are hardcoded directly in the source file. Firebase API keys are safe to expose in frontend code — access is controlled by Firestore security rules and API key restrictions (see [Firebase Setup Guide](FIREBASE_SETUP.md#8-restrict-your-api-key-recommended)).

## Build & Deployment

- **Dev server**: `npm run dev` — Vite dev server at `http://localhost:5173/dart-tournament/`
- **Build**: `npm run build` — TypeScript check + Vite bundle to `dist/`
- **Lint**: `npm run eslint`
- **Test**: `npm run test` (single run) or `npm run test:watch`
- **Deploy**: GitHub Actions workflow (`.github/workflows/deploy.yml`) triggers on push to `main`, builds the app, and deploys to GitHub Pages
- **SPA routing**: `public/404.html` and a script in `index.html` handle client-side routing on GitHub Pages by redirecting 404s back to the app
