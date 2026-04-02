import type { StoredDart, X01LiveState, X01OutMode, GameResult } from '../models/types';

/**
 * Initialize a new X01 (301/501) game state.
 */
export function initX01State(
  playerIds: string[],
  startScore: 301 | 501,
  outMode: X01OutMode,
): X01LiveState {
  const scores: Record<string, number> = {};
  for (const pid of playerIds) {
    scores[pid] = startScore;
  }
  return {
    mode: '301/501',
    startScore,
    outMode,
    currentPlayerIndex: 0,
    playerOrder: [...playerIds],
    scores,
    finishOrder: [],
    history: [],
  };
}

/**
 * Calculate the total score of a set of darts.
 */
export function calcDartsTotal(darts: StoredDart[]): number {
  return darts.reduce((sum, d) => sum + d.score, 0);
}

/**
 * Check if the last dart in a set is a double.
 */
function isLastDartDouble(darts: StoredDart[]): boolean {
  if (darts.length === 0) return false;
  const last = darts[darts.length - 1];
  return last.modifier === 'double' && last.number !== 0;
}

/**
 * Determine if a turn is a bust.
 * A turn busts if:
 * - The total would bring the score below 0
 * - The total would bring the score to exactly 0 but outMode is 'double' and last dart isn't a double
 * - The total would bring the score to 1 in double-out mode (impossible to finish with a double from 1)
 */
export function isBust(
  remainingScore: number,
  darts: StoredDart[],
  outMode: X01OutMode,
): boolean {
  const total = calcDartsTotal(darts);
  const newScore = remainingScore - total;

  if (newScore < 0) return true;
  if (newScore === 0 && outMode === 'double' && !isLastDartDouble(darts)) return true;
  if (newScore === 1 && outMode === 'double') return true;

  return false;
}

/**
 * Process a player's turn. Returns the new game state.
 */
export function processX01Turn(
  state: X01LiveState,
  playerId: string,
  darts: StoredDart[],
): X01LiveState {
  const scoreBefore = state.scores[playerId];
  const total = calcDartsTotal(darts);
  const bust = isBust(scoreBefore, darts, state.outMode);
  const scoreAfter = bust ? scoreBefore : scoreBefore - total;

  const newScores = { ...state.scores, [playerId]: scoreAfter };
  const newFinishOrder = [...state.finishOrder];

  if (scoreAfter === 0 && !bust) {
    newFinishOrder.push(playerId);
  }

  const turnEntry = { playerId, darts: [...darts], scoreBefore, scoreAfter, bust };

  // Find next player who hasn't finished
  let nextIdx = state.currentPlayerIndex;
  for (let i = 1; i <= state.playerOrder.length; i++) {
    const idx = (state.currentPlayerIndex + i) % state.playerOrder.length;
    const pid = state.playerOrder[idx];
    if (newScores[pid] > 0) {
      nextIdx = idx;
      break;
    }
  }

  return {
    ...state,
    scores: newScores,
    finishOrder: newFinishOrder,
    history: [...state.history, turnEntry],
    currentPlayerIndex: nextIdx,
  };
}

/**
 * Undo the last turn.
 */
export function undoX01Turn(state: X01LiveState): X01LiveState {
  if (state.history.length === 0) return state;

  const lastTurn = state.history[state.history.length - 1];
  const newScores = { ...state.scores, [lastTurn.playerId]: lastTurn.scoreBefore };
  const newFinishOrder = state.finishOrder.filter((pid) => pid !== lastTurn.playerId);

  return {
    ...state,
    scores: newScores,
    finishOrder: newFinishOrder,
    history: state.history.slice(0, -1),
    currentPlayerIndex: state.playerOrder.indexOf(lastTurn.playerId),
  };
}

/**
 * Check if the game is over (all players finished or only 1 remains).
 * For 2+ players, game ends when all but one have finished (last place is determined).
 * Actually, we end when at least one player finishes (for tournament context, first to 0 wins).
 */
export function isX01GameOver(state: X01LiveState): boolean {
  // Game is over when all players have finished, or only one hasn't finished
  const remaining = state.playerOrder.filter((pid) => state.scores[pid] > 0);
  return remaining.length <= (state.playerOrder.length > 1 ? 1 : 0);
}

/**
 * Get the winner and results. Lower finish position = better rank.
 */
export function getX01Results(state: X01LiveState): GameResult[] {
  return state.playerOrder.map((pid) => {
    const finishIdx = state.finishOrder.indexOf(pid);
    const finished = finishIdx >= 0;
    return {
      playerId: pid,
      score: state.startScore - state.scores[pid], // points scored (deducted from start)
      rank: finished ? finishIdx + 1 : state.finishOrder.length + 1,
    };
  });
}

/**
 * Get the winner (first to finish).
 */
export function getX01Winner(state: X01LiveState): { winnerId: string | null; isTie: boolean } {
  if (state.finishOrder.length === 0) {
    return { winnerId: null, isTie: false };
  }
  return { winnerId: state.finishOrder[0], isTie: false };
}
