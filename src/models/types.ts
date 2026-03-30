// ============================================================
// Data models for the Dart Tournament App
// ============================================================

// --- Game Modes ---
export type GameMode = 'classic' | 'clock' | 'killer' | 'cricket' | '301/501';

export const GAME_MODE_LABELS: Record<GameMode, string> = {
  classic: 'Classic Halve-It',
  clock: 'Clock',
  killer: 'Killer',
  cricket: 'Cricket',
  '301/501': '301/501',
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
  liveState?: LiveGameState;
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
  checkpointSociety?: boolean;
  playerIds: string[];       // all players who ever participated (for stats)
  activePlayerIds: string[]; // current player pool (can be modified mid-tournament)
  matches: TournamentMatch[];
  status: TournamentStatus;
  createdAt: number;
  completedAt?: number;
  championId?: string;
}

// --- StoredDart (Firestore-friendly dart format) ---
// Uses { number, modifier, score } where number 25 = bull (both single and double).
// The existing Dart type uses segment where 50 = double bull -- used by the contracts engine.
export interface StoredDart {
  number: number;        // 0=miss, 1-20, 25=bull
  modifier: DartModifier;
  score: number;         // precomputed point value
}

export function storedDartToEngineDart(sd: StoredDart): Dart {
  if (sd.number === 25 && sd.modifier === 'double') {
    return { segment: 50, modifier: 'double' };
  }
  if (sd.number === 25) {
    return { segment: 25, modifier: 'single' };
  }
  return { segment: sd.number, modifier: sd.modifier };
}

export function createStoredDart(number: number, modifier: DartModifier = 'single'): StoredDart {
  let score: number;
  if (number === 0) {
    score = 0;
  } else if (number === 25) {
    score = modifier === 'double' ? 50 : 25;
  } else {
    const mult = modifier === 'double' ? 2 : modifier === 'triple' ? 3 : 1;
    score = number * mult;
  }
  return { number, modifier, score };
}

// --- Live Game State (stored in Firestore on in-progress games) ---

// Classic Halve-It: 15 rounds, all players play the same contract each round
export interface ClassicPlayerRound {
  darts: StoredDart[];
  score: number;
  success: boolean;
  capitalAfter: number;
  bonusEarned?: string;  // checkpoint reward description if earned
  x2Applied?: boolean;   // true if X2 was applied to this round's score
}

export interface ClassicRound {
  contractId: string;
  players: Record<string, ClassicPlayerRound>; // playerId -> round result
}

export interface ClassicLiveState {
  mode: 'classic';
  currentRound: number;                          // 0-14 index into CONTRACTS
  capitals: Record<string, number>;              // playerId -> current capital
  rounds: ClassicRound[];                        // completed rounds
  pendingDarts: Record<string, StoredDart[]>;    // per-player darts for current round (before submit)
  checkpointSociety?: boolean;                   // optional Checkpoint Society bonus mode
  bonusDarts?: Record<string, number>;           // playerId -> accumulated bonus darts available
}

// --- Checkpoint Society Rewards ---
export type CheckpointRewardType = 'x2_score' | 'bonus_dart' | 'free_darts' | 'external';

export interface CheckpointReward {
  contractId: string;
  type: CheckpointRewardType;
  description: string;
  /** For bonus_dart / free_darts: number of extra darts granted */
  extraDarts?: number;
  /** 'all_darts' = all darts must hit the target number, 'contract_hit' = standard hit, 'first_dart_t19' = first dart is triple 19 */
  trigger: 'all_darts' | 'contract_hit' | 'first_dart_t19';
}

export const CHECKPOINT_REWARDS: CheckpointReward[] = [
  // capital: no reward
  { contractId: '20',     type: 'external',    description: '1 Roll for a shot for free',     trigger: 'all_darts' },
  { contractId: 'side',   type: 'external',    description: 'Just 1 shot for free',           trigger: 'contract_hit' },
  { contractId: '19',     type: 'bonus_dart',  description: '+1 Bonus Dart',  extraDarts: 1,  trigger: 'all_darts' },
  { contractId: '3row',   type: 'x2_score',    description: 'X2 Score Contract',              trigger: 'contract_hit' },
  { contractId: '18',     type: 'external',    description: '2 Rolls for a shot for free',    trigger: 'all_darts' },
  { contractId: 'color',  type: 'external',    description: 'Just 1 galopin for free',        trigger: 'contract_hit' },
  { contractId: '17',     type: 'external',    description: '+1 Joker Retry',                 trigger: 'all_darts' },
  { contractId: 'double', type: 'free_darts',  description: '+3 Free Darts',  extraDarts: 3,  trigger: 'all_darts' },
  { contractId: '16',     type: 'external',    description: 'Just 1 Demi for free',           trigger: 'all_darts' },
  { contractId: 'triple', type: 'external',    description: 'Just 1 Pinte for free',          trigger: 'all_darts' },
  { contractId: '15',     type: 'bonus_dart',  description: '+1 Bonus Dart',  extraDarts: 1,  trigger: 'all_darts' },
  { contractId: '57',     type: 'external',    description: '1 Cocktail free',                trigger: 'first_dart_t19' },
  { contractId: '14',     type: 'x2_score',    description: 'X2 Score Contract',              trigger: 'all_darts' },
  { contractId: 'bull',   type: 'external',    description: '30 Casino Coins + 2 Cocktails',  trigger: 'all_darts' },
];

// Killer: lives-based elimination game
export interface KillerTurnSnapshot {
  playerId: string;
  darts: StoredDart[];
  livesBefore: Record<string, number>;
  killerBefore: Record<string, boolean>;
  eliminatedBefore: Record<string, boolean>;
}

export interface KillerLiveState {
  mode: 'killer';
  phase: 'number' | 'play';
  currentPlayerIndex: number;
  playerOrder: string[];                          // playerId order for turns
  numbers: Record<string, number>;                // playerId -> chosen number (1-20)
  lives: Record<string, number>;                  // playerId -> current lives
  isKiller: Record<string, boolean>;              // playerId -> has 9+ lives
  eliminated: Record<string, boolean>;            // playerId -> eliminated
  history: KillerTurnSnapshot[];                  // for undo
}

// Clock: race from 1 to Bull
export interface ClockTurnHistory {
  playerId: string;
  prevPos: number;
  newPos: number;
  darts: StoredDart[];
  extraTurn: boolean;
  finishOrderBefore: string[];
}

export interface ClockLiveState {
  mode: 'clock';
  currentPlayerIndex: number;
  playerOrder: string[];                          // playerId order for turns
  positions: Record<string, number>;              // playerId -> position (1-12)
  finished: Record<string, boolean>;
  finishOrder: string[];                          // playerIds in finish order
  turnCounts: Record<string, number>;             // playerId -> number of turns taken
  history: ClockTurnHistory[];                    // for undo
}

// Cricket: close numbers and score points
export const CRICKET_NUMBERS = [20, 19, 18, 17, 16, 15, 25]; // 25 = Bull

export interface CricketTurnHistory {
  playerId: string;
  darts: StoredDart[];
  marksGained: Record<string, number>;  // target -> marks gained this turn
  pointsScored: number;
}

export interface CricketLiveState {
  mode: 'cricket';
  currentPlayerIndex: number;
  playerOrder: string[];
  /** marks[playerId][target] = number of marks (0+, 3 = closed) */
  marks: Record<string, Record<string, number>>;
  /** points scored from hitting closed-for-opponent numbers */
  scores: Record<string, number>;
  history: CricketTurnHistory[];
}

export type LiveGameState = ClassicLiveState | KillerLiveState | ClockLiveState | CricketLiveState;

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
