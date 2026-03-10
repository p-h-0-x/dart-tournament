# Game Engines

The `src/engines/` directory contains pure business logic with no UI or Firebase dependencies. These modules are fully unit-tested.

---

## Tournament Engine (`src/engines/tournament.ts`)

Handles bracket generation and match progression for tournaments.

### Standard Bracket

#### `generateBracket(playerIds: string[]): TournamentMatch[]`

Creates a single-elimination bracket for 3+ players.

1. Pads the bracket to the next power of 2 (e.g., 5 players → 8 slots)
2. Seeds players so top seeds face bottom seeds in round 1
3. Players without opponents receive a **bye** (auto-advanced)
4. Byes are propagated through subsequent rounds automatically

Example with 5 players (8-slot bracket):

```
Round 1          Round 2        Final
Player 1 ─┐
           ├─ ? ─┐
Player 5 ─┘      │
                  ├─ ?
Player 4 ─┐      │
      bye ─┘─ P4 ┘
Player 3 ─┐
      bye ─┘─ P3 ─┐
                   ├─ ?
Player 2 ─┐       │
      bye ─┘─ P2 ─┘
```

#### `advanceWinner(matches, round, matchIndex, winnerId): TournamentMatch[]`

Marks a match as completed and adds the winner to the next round's match. Used for standard bracket progression where the bracket structure is pre-defined.

#### `getRoundName(round, totalRounds): string`

Returns human-readable names: "Round 1", "Quarterfinals", "Semifinals", "Final".

#### `getTotalRounds(matches): number`

Returns the highest round number in the bracket.

### Flexible Tournament Format

For tournaments that don't follow a strict single-elimination bracket. Admins manually create rounds and pair players.

#### `createFlexibleRound(existingMatches, groups: string[][]): TournamentMatch[]`

Creates a new round from manual player groupings. Each group is an array of 2+ player IDs.

- Validates no player appears in multiple groups
- Each group must have at least 2 players
- Round number auto-increments from the highest existing round
- Supports multi-player matches (not just 1v1)

Example:
```typescript
// Round 1: two 3-player matches
createFlexibleRound([], [
  ['player1', 'player2', 'player3'],
  ['player4', 'player5', 'player6'],
]);
```

#### `setFlexibleMatchWinner(matches, round, matchIndex, winnerId): TournamentMatch[]`

Sets the winner of a match without auto-propagating to the next round (unlike `advanceWinner`). The admin creates the next round manually.

#### `getEliminatedPlayerIds(matches): Set<string>`

Returns all player IDs that have lost at least one match. Used to show eliminated players with strikethrough styling in the UI and to inform pairing decisions.

#### `isRoundComplete(matches, round): boolean`

Checks if all matches in a given round are completed. Used to determine when the admin can create the next round.

---

## Contract Engine (`src/engines/contracts.ts`)

Validates dart throws against the 15 contracts used in Classic Halve-It mode.

### `checkContract(contractId: string, darts: Dart[]): ContractResult`

Takes a contract ID and an array of 3 darts. Returns `{ hit: boolean, score: number }`.

- If `hit` is `true`, the player scores the `score` value
- If `hit` is `false`, the player's total score is halved (handled at the game level, not in this function)

### The 15 Contracts

Played in this fixed order:

| # | Contract | ID | Rule |
|---|----------|----|------|
| 1 | Capital | `capital` | Always hits. Score = sum of all 3 darts |
| 2 | 20 | `20` | Hit the 20 segment. Score = matching darts only |
| 3 | Side | `side` | 3 darts on adjacent board segments (see below) |
| 4 | 19 | `19` | Hit the 19 segment |
| 5 | 3 in a Row | `3row` | 3 darts on consecutive numbers (e.g., 5-6-7) |
| 6 | 18 | `18` | Hit the 18 segment |
| 7 | Color | `color` | 3 darts landing on 3 different colors (black, white, red, green) |
| 8 | 17 | `17` | Hit the 17 segment |
| 9 | Double | `double` | Hit any double (including double bull / bullseye) |
| 10 | 16 | `16` | Hit the 16 segment |
| 11 | Triple | `triple` | Hit any triple |
| 12 | 15 | `15` | Hit the 15 segment |
| 13 | 57 | `57` | 3 darts totaling exactly 57 points |
| 14 | 14 | `14` | Hit the 14 segment |
| 15 | Bull | `bull` | Hit any bull (single bull 25 or double bull 50) |

### Contract Details

**Number contracts** (20, 19, 18, 17, 16, 15, 14): Only darts hitting the specified segment count. Singles, doubles, and triples of that number all qualify, and score is calculated with modifiers (e.g., triple 20 = 60).

**Side**: Requires 3 darts on physically adjacent segments on the dartboard. Uses the clockwise board order: `20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5`. Single bull (25) is treated as adjacent to every segment.

**3 in a Row**: Requires 3 darts on numerically consecutive numbers (e.g., 7-8-9). Only segments 1-20 qualify. Bull does not count.

**Color**: The dartboard has 4 colors — black, white, red, and green. Double/triple rings are red or green. Single segments are black or white. Single bull is green, double bull is red. Requires 3 different colors.

**57**: The total score of all 3 darts must be exactly 57 points.

---

## Data Models (`src/models/types.ts`)

### Core Types

```typescript
type GameMode = 'classic' | 'clock' | 'killer' | '301/501';

interface Dart {
  segment: number;      // 0 = miss, 1-20, 25 (single bull), 50 (double bull)
  modifier: DartModifier; // 'single' | 'double' | 'triple'
}

interface Player {
  id: string;
  name: string;
  createdAt: number;
}
```

### Game Model

```typescript
interface Game {
  id: string;
  mode: GameMode;
  tournamentId?: string;         // links game to a tournament
  tournamentRound?: number;      // which round in the tournament
  tournamentMatchIndex?: number; // which match in the round
  playerIds: string[];
  results: GameResult[];         // { playerId, score, rank }
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: number;
  completedAt?: number;
}
```

### Tournament Model

```typescript
interface Tournament {
  id: string;
  name: string;
  gameMode: GameMode;
  playerIds: string[];        // all players who ever participated (for stats)
  activePlayerIds: string[];  // current player pool (modifiable mid-tournament)
  matches: TournamentMatch[];
  status: 'draft' | 'in_progress' | 'completed';
  createdAt: number;
  completedAt?: number;
  championId?: string;
}

interface TournamentMatch {
  round: number;
  matchIndex: number;
  playerIds: string[];  // may be empty until feeder matches resolve
  winnerId?: string;
  gameId?: string;      // optional link to a scored Game
  status: 'pending' | 'in_progress' | 'completed';
}
```

### Leaderboard Entry (Computed)

```typescript
interface LeaderboardEntry {
  player: Player;
  wins: number;
  losses: number;
  gamesPlayed: number;
  tournamentsWon: number;
  tournamentsPlayed: number;
  winRate: number;
}
```

Computed in `DataContext` from games and tournament matches, avoiding double-counting (see [Architecture](ARCHITECTURE.md#leaderboard-computation)).
