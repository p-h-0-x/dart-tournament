# CLAUDE.md

## Project Overview

Dart Tournament is a web-based dart tournament management app built with **React 19 + TypeScript + Vite**, backed by **Firebase** (Auth + Firestore). It supports leaderboards, tournament brackets, 4 game modes, and admin controls. Hosted on GitHub Pages.

## Quick Commands

```bash
npm run dev          # Start dev server (port 5173)
npm run build        # TypeScript check + Vite bundle
npm run lint         # ESLint
npm test             # Run tests once (vitest run)
npm run test:watch   # Tests in watch mode
npm run preview      # Preview production build locally
```

## Project Structure

```
src/
├── App.tsx              # Main router with provider wrappers
├── main.tsx             # React entry point
├── index.css            # Global styles + CSS variables (dark theme)
├── components/          # Reusable UI components
│   ├── layout/          # Layout, Sidebar, MobileNav
│   └── MobileBackHeader.tsx
├── context/             # React context providers
│   ├── AuthContext.tsx   # Firebase auth state + admin claim check
│   └── DataContext.tsx   # Firestore real-time data + leaderboard computation
├── pages/
│   ├── user/            # Public pages (Leaderboard, Tournaments, Games, Players)
│   └── admin/           # Protected pages (Login, ManageTournaments, ManagePlayers, ScoreGames)
├── services/
│   ├── firebase.ts      # Firebase initialization (auth + db exports)
│   └── database.ts      # Firestore CRUD operations + real-time listeners
├── engines/             # Pure business logic (no UI, no Firebase)
│   ├── contracts.ts     # Classic Halve-It contract validation
│   └── tournament.ts    # Bracket generation & match progression
├── models/
│   └── types.ts         # All TypeScript type definitions
└── test/
    └── setup.ts         # Vitest + Testing Library setup

docs/                    # Extended documentation
├── ARCHITECTURE.md      # System architecture & state management
├── FIREBASE_SETUP.md    # Firebase configuration guide
├── GAME_MODES.md        # Rules for all 4 dart game modes
└── GAME_ENGINES.md      # Tournament & contract engine docs

tools/
└── set-admin.cjs        # Utility to set Firebase admin custom claims
```

## Architecture

**Provider hierarchy:** `BrowserRouter` → `AuthProvider` → `DataProvider` → `Routes`

**Data flow:** Firestore collections (`players`, `games`, `tournaments`) → real-time listeners in `database.ts` → `DataContext` (computes leaderboard) → components via `useData()` hook.

**Authentication:** Firebase email/password auth. Admin access controlled by custom claim (`admin: true`). Firestore rules enforce admin-only writes.

**Routing:**
- Public: `/`, `/tournaments`, `/tournaments/:id`, `/games`, `/players`, `/players/:id`
- Admin (protected): `/admin/login`, `/admin/tournaments`, `/admin/players`, `/admin/games`

## Tech Stack

- **React 19** with functional components and hooks
- **TypeScript 5.9** in strict mode (`noUnusedLocals`, `noUnusedParameters`)
- **Vite 7** with React plugin, base path `/dart-tournament/`
- **Firebase 12** (Auth + Firestore)
- **React Router 7** for client-side routing
- **Vitest 4** + **@testing-library/react** for testing
- **ESLint 9** flat config with TypeScript and React plugins

## Code Conventions

- **Naming:** PascalCase for components/types, camelCase for functions/variables, UPPER_SNAKE_CASE for constants
- **Components:** Functional components with hooks only. Use `useAuth()` and `useData()` context hooks for state access.
- **Business logic:** Keep pure functions in `engines/` — no side effects, no Firebase imports. This makes them easily testable.
- **Types:** All domain models defined in `models/types.ts`. No `any` types.
- **CSS:** CSS variables for theming in `index.css`. Dark theme by default. BEM-inspired class naming.
- **File organization:** One component per file. Co-locate test files next to source files (e.g., `contracts.test.ts` beside `contracts.ts`).

## Testing

Tests use **Vitest** with **jsdom** environment and **React Testing Library**.

```bash
npm test             # Run all tests once
npm run test:watch   # Watch mode
```

Test files live alongside source files with `.test.ts` / `.test.tsx` suffix. Key test areas:
- `engines/contracts.test.ts` — Contract validation (100+ cases)
- `engines/tournament.test.ts` — Bracket generation & progression
- `context/DataContext.test.ts` — Leaderboard computation
- `pages/` — Component rendering tests with mocked Firebase

## Environment Variables

Firebase config via Vite env vars (see `.env.example`):
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Fallback values are hardcoded in `services/firebase.ts` for development.

## CI/CD

GitHub Actions workflow (`.github/workflows/deploy.yml`):
1. Triggers on push to `main`
2. Node 22, `npm ci`, `npm run build`
3. Deploys `dist/` to GitHub Pages

## Key Guidelines for AI Assistants

1. **Read before editing.** Understand existing patterns before modifying code.
2. **Run `npm run build` to validate** — this runs both TypeScript checking and Vite bundling.
3. **Run `npm test` after changes** to ensure nothing breaks.
4. **Keep engines pure.** `src/engines/` must contain only pure functions with no imports from `services/` or `context/`.
5. **Add tests** for new business logic in `engines/` or `context/`.
6. **Don't modify Firebase security rules** without understanding the auth model — public reads, admin-only writes.
7. **Respect the type system.** TypeScript strict mode is enforced. Fix type errors, don't suppress them.
8. **Base path matters.** The app runs at `/dart-tournament/` on GitHub Pages. React Router uses this as `basename`.
