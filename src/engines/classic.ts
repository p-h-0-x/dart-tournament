import { CONTRACTS, CHECKPOINT_REWARDS, type StoredDart, type ClassicLiveState, type ClassicRound, type GameResult, storedDartToEngineDart } from '../models/types';
import { checkContract } from './contracts';

const SIMPLE_NUMBER_CONTRACTS = new Set(['20', '19', '18', '17', '16', '15', '14']);

/**
 * Check if all darts hit the target number (for checkpoint bonus on simple contracts).
 */
function allDartsOnTarget(darts: StoredDart[], contractId: string): boolean {
  if (!SIMPLE_NUMBER_CONTRACTS.has(contractId)) return false;
  const target = parseInt(contractId);
  return darts.length > 0 && darts.every((d) => d.number === target);
}

/**
 * Initialize a new Classic Halve-It game state.
 */
export function initClassicState(playerIds: string[], checkpointSociety?: boolean): ClassicLiveState {
  const capitals: Record<string, number> = {};
  const pendingDarts: Record<string, StoredDart[]> = {};
  const bonusDarts: Record<string, number> = {};
  for (const pid of playerIds) {
    capitals[pid] = 0;
    pendingDarts[pid] = [];
    bonusDarts[pid] = 0;
  }
  return {
    mode: 'classic',
    currentRound: 0,
    capitals,
    rounds: [],
    pendingDarts,
    ...(checkpointSociety ? { checkpointSociety: true, bonusDarts } : {}),
  };
}

/**
 * Get the number of darts a player can throw this round (3 + bonus darts consumed).
 */
export function getPlayerMaxDarts(state: ClassicLiveState, playerId: string): number {
  if (!state.checkpointSociety) return 3;
  const bonus = state.bonusDarts?.[playerId] ?? 0;
  return 3 + bonus;
}

/**
 * Submit a round: process all players' darts for the current contract.
 * Returns a new state with the round recorded and currentRound advanced.
 */
export function submitClassicRound(
  state: ClassicLiveState,
  playerDarts: Record<string, StoredDart[]>,
  playerIds: string[],
): ClassicLiveState {
  const contractId = CONTRACTS[state.currentRound].id;
  const isFirstRound = state.currentRound === 0;
  const isCheckpoint = state.checkpointSociety === true;

  const reward = isCheckpoint
    ? CHECKPOINT_REWARDS.find((r) => r.contractId === contractId)
    : undefined;

  const roundResult: ClassicRound = {
    contractId,
    players: {},
  };

  const newCapitals = { ...state.capitals };
  const newBonusDarts = { ...(state.bonusDarts ?? {}) };

  for (const pid of playerIds) {
    const storedDarts = playerDarts[pid] || [];
    const engineDarts = storedDarts.map(storedDartToEngineDart);
    const result = checkContract(contractId, engineDarts);

    // Check if checkpoint bonus is earned
    let bonusEarned: string | undefined;
    let x2Applied = false;

    if (isCheckpoint && reward && result.hit) {
      const bonusTriggered = reward.trigger === 'contract_hit'
        ? true
        : allDartsOnTarget(storedDarts, contractId);

      if (bonusTriggered) {
        bonusEarned = reward.description;

        // Apply in-game effects
        if (reward.type === 'x2_score') {
          x2Applied = true;
        } else if (reward.type === 'bonus_dart' || reward.type === 'free_darts') {
          newBonusDarts[pid] = (newBonusDarts[pid] ?? 0) + (reward.extraDarts ?? 0);
        }
      }
    }

    // Consume bonus darts if any were used this round
    if (isCheckpoint && storedDarts.length > 3) {
      const used = storedDarts.length - 3;
      newBonusDarts[pid] = Math.max(0, (newBonusDarts[pid] ?? 0) - used);
    }

    const score = x2Applied ? result.score * 2 : result.score;

    let capitalAfter: number;
    if (isFirstRound) {
      capitalAfter = score;
    } else if (result.hit) {
      capitalAfter = newCapitals[pid] + score;
    } else {
      capitalAfter = Math.ceil(newCapitals[pid] / 2);
    }

    newCapitals[pid] = capitalAfter;
    roundResult.players[pid] = {
      darts: storedDarts,
      score,
      success: result.hit,
      capitalAfter,
      ...(bonusEarned ? { bonusEarned } : {}),
      ...(x2Applied ? { x2Applied } : {}),
    };
  }

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
    ...(isCheckpoint ? { bonusDarts: newBonusDarts } : {}),
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

  // Rebuild bonus darts from scratch if checkpoint mode
  let bonusDarts: Record<string, number> | undefined;
  if (state.checkpointSociety) {
    bonusDarts = {};
    for (const pid of playerIds) bonusDarts[pid] = 0;
    for (const round of newRounds) {
      const reward = CHECKPOINT_REWARDS.find((r) => r.contractId === round.contractId);
      for (const pid of playerIds) {
        const pr = round.players[pid];
        if (!pr) continue;
        // Add earned bonus darts
        if (pr.bonusEarned && reward && (reward.type === 'bonus_dart' || reward.type === 'free_darts')) {
          bonusDarts[pid] += reward.extraDarts ?? 0;
        }
        // Subtract consumed bonus darts
        if (pr.darts.length > 3) {
          bonusDarts[pid] = Math.max(0, bonusDarts[pid] - (pr.darts.length - 3));
        }
      }
    }
  }

  return {
    ...state,
    currentRound: newRounds.length,
    capitals: newCapitals,
    rounds: newRounds,
    pendingDarts: newPendingDarts,
    ...(bonusDarts !== undefined ? { bonusDarts } : {}),
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

  entries.sort((a, b) => b.score - a.score);

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
