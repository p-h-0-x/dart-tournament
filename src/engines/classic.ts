import { CONTRACTS, type StoredDart, type ClassicLiveState, type ClassicRound, type GameResult, storedDartToEngineDart } from '../models/types';
import { checkContract } from './contracts';

/**
 * Initialize a new Classic Halve-It game state.
 */
export function initClassicState(playerIds: string[]): ClassicLiveState {
  const capitals: Record<string, number> = {};
  const pendingDarts: Record<string, StoredDart[]> = {};
  for (const pid of playerIds) {
    capitals[pid] = 0;
    pendingDarts[pid] = [];
  }
  return {
    mode: 'classic',
    currentRound: 0,
    capitals,
    rounds: [],
    pendingDarts,
  };
}

/**
 * Submit a round: process all players' darts for the current contract.
 * Returns a new state with the round recorded and currentRound advanced.
 *
 * @param state - current game state
 * @param playerDarts - map of playerId -> StoredDart[] for this round
 * @param playerIds - ordered player IDs (to ensure consistent processing)
 */
export function submitClassicRound(
  state: ClassicLiveState,
  playerDarts: Record<string, StoredDart[]>,
  playerIds: string[],
): ClassicLiveState {
  const contractId = CONTRACTS[state.currentRound].id;
  const isFirstRound = state.currentRound === 0;

  const roundResult: ClassicRound = {
    contractId,
    players: {},
  };

  const newCapitals = { ...state.capitals };

  for (const pid of playerIds) {
    const storedDarts = playerDarts[pid] || [];
    const engineDarts = storedDarts.map(storedDartToEngineDart);
    const result = checkContract(contractId, engineDarts);

    let capitalAfter: number;
    if (isFirstRound) {
      // Capital round: score is the starting capital
      capitalAfter = result.score;
    } else if (result.hit) {
      capitalAfter = newCapitals[pid] + result.score;
    } else {
      capitalAfter = Math.ceil(newCapitals[pid] / 2);
    }

    newCapitals[pid] = capitalAfter;
    roundResult.players[pid] = {
      darts: storedDarts,
      score: result.score,
      success: result.hit,
      capitalAfter,
    };
  }

  // Clear pending darts for new round
  const newPendingDarts: Record<string, StoredDart[]> = {};
  for (const pid of playerIds) {
    newPendingDarts[pid] = [];
  }

  return {
    ...state,
    currentRound: state.currentRound + 1,
    capitals: newCapitals,
    rounds: [...state.rounds, roundResult],
    pendingDarts: newPendingDarts,
  };
}

/**
 * Undo the last completed round, restoring the previous state.
 */
export function undoClassicRound(state: ClassicLiveState, playerIds: string[]): ClassicLiveState {
  if (state.rounds.length === 0) return state;

  const newRounds = state.rounds.slice(0, -1);

  // Rebuild capitals from the remaining rounds
  const newCapitals: Record<string, number> = {};
  for (const pid of playerIds) {
    newCapitals[pid] = 0;
  }
  for (const round of newRounds) {
    for (const pid of playerIds) {
      const playerRound = round.players[pid];
      if (playerRound) {
        newCapitals[pid] = playerRound.capitalAfter;
      }
    }
  }

  // Clear pending darts
  const newPendingDarts: Record<string, StoredDart[]> = {};
  for (const pid of playerIds) {
    newPendingDarts[pid] = [];
  }

  return {
    ...state,
    currentRound: newRounds.length,
    capitals: newCapitals,
    rounds: newRounds,
    pendingDarts: newPendingDarts,
  };
}

/**
 * Check if the classic game is complete (all 15 rounds played).
 */
export function isClassicComplete(state: ClassicLiveState): boolean {
  return state.currentRound >= CONTRACTS.length;
}

/**
 * Get final game results sorted by capital descending.
 */
export function getClassicResults(state: ClassicLiveState, playerIds: string[]): GameResult[] {
  const entries = playerIds.map((pid) => ({
    playerId: pid,
    score: state.capitals[pid] || 0,
  }));

  // Sort by score descending
  entries.sort((a, b) => b.score - a.score);

  // Assign ranks (tied players get the same rank)
  const results: GameResult[] = [];
  let currentRank = 1;
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].score < entries[i - 1].score) {
      currentRank = i + 1;
    }
    results.push({
      playerId: entries[i].playerId,
      score: entries[i].score,
      rank: currentRank,
    });
  }

  return results;
}
