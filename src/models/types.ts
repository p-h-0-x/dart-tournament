// ============================================================
// Data models for the Dart Tournament App
// ============================================================

// --- Game Modes ---
export type GameMode = 'classic' | 'clock' | 'killer';

export const GAME_MODE_LABELS: Record<GameMode, string> = {
  classic: 'Classic Halve-It',
  clock: 'Clock',
  killer: 'Killer',
};

// --- Dart & Board ---
export type DartModifier = 'single' | 'double' | 'triple';

export interface Dart {
  segment: number; // 0 = miss, 1-20, 25 (single bull), 50 (double bull)
  modifier: DartModifier;
}

export function dartScore(d: Dart): number {
  if (d.segment === 0) return 0;
  if (d.segment === 25 || d.segment === 50) return d.segment;
  const mult = d.modifier === 'double' ? 2 : d.modifier === 'triple' ? 3 : 1;
  return d.segment * mult;
}

// Clockwise board order
export const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

// --- Contracts (for Classic) ---
export interface Contract {
  id: string;
  name: string;
  order: number;
}

export const CONTRACTS: Contract[] = [
  { id: 'capital', name: 'Capital', order: 1 },
  { id: '20', name: '20', order: 2 },
  { id: 'side', name: 'Side', order: 3 },
  { id: '19', name: '19', order: 4 },
  { id: '3row', name: '3 in a Row', order: 5 },
  { id: '18', name: '18', order: 6 },
  { id: 'color', name: 'Color', order: 7 },
  { id: '17', name: '17', order: 8 },
  { id: 'double', name: 'Double', order: 9 },
  { id: '16', name: '16', order: 10 },
  { id: 'triple', name: 'Triple', order: 11 },
  { id: '15', name: '15', order: 12 },
  { id: '57', name: '57', order: 13 },
  { id: '14', name: '14', order: 14 },
  { id: 'bull', name: 'Bull', order: 15 },
];

// --- Player ---
export interface Player {
  id: string;
  name: string;
  createdAt: number;
}

// --- Game (a single match within or outside a tournament) ---
export interface GameResult {
  playerId: string;
  score: number;
  rank: number; // 1 = winner
}

export interface Game {
  id: string;
  mode: GameMode;
  tournamentId?: string;
  tournamentRound?: number;
  tournamentMatchIndex?: number;
  playerIds: string[];
  results: GameResult[];
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: number;
  completedAt?: number;
}

// --- Tournament ---
export type TournamentStatus = 'draft' | 'in_progress' | 'completed';

export interface TournamentMatch {
  round: number;
  matchIndex: number;
  playerIds: string[]; // may be empty until feeder matches resolve
  winnerId?: string;
  gameId?: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface Tournament {
  id: string;
  name: string;
  gameMode: GameMode;
  playerIds: string[];
  matches: TournamentMatch[];
  status: TournamentStatus;
  createdAt: number;
  completedAt?: number;
  championId?: string;
}

// --- Leaderboard entry (computed) ---
export interface LeaderboardEntry {
  player: Player;
  wins: number;
  losses: number;
  gamesPlayed: number;
  tournamentsWon: number;
  tournamentsPlayed: number;
  winRate: number;
}
