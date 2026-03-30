import { CRICKET_NUMBERS, type StoredDart, type CricketLiveState, type CricketTurnHistory, type GameResult } from '../models/types';

/**
 * Cricket dart game rules:
 * - Target numbers: 20, 19, 18, 17, 16, 15, Bull (25)
 * - Hit a number to mark it: single=1 mark, double=2, triple=3
 * - 3 marks closes a number for you
 * - Once you've closed a number, additional hits score points (face value)
 *   BUT only if at least one opponent hasn't closed it yet
 * - A number is "dead" when ALL players have closed it (no more scoring)
 * - Game ends when one player closes all 7 numbers AND has >= highest score
 * - If all numbers are dead, highest score wins
 */

export function initCricketState(playerIds: string[]): CricketLiveState {
  const marks: Record<string, Record<string, number>> = {};
  const scores: Record<string, number> = {};
  for (const pid of playerIds) {
    marks[pid] = {};
    for (const num of CRICKET_NUMBERS) {
      marks[pid][String(num)] = 0;
    }
    scores[pid] = 0;
  }
  return {
    mode: 'cricket',
    currentPlayerIndex: 0,
    playerOrder: [...playerIds],
    marks,
    scores,
    history: [],
  };
}

function getMarksForDart(dart: StoredDart): { target: string; hits: number } | null {
  const targetSet = new Set(CRICKET_NUMBERS);
  if (dart.number === 0) return null;
  // Bull: number 25
  if (dart.number === 25) {
    if (!targetSet.has(25)) return null;
    // Single bull = 1 mark, double bull = 2 marks
    return { target: '25', hits: dart.modifier === 'double' ? 2 : 1 };
  }
  if (!targetSet.has(dart.number)) return null;
  const hits = dart.modifier === 'triple' ? 3 : dart.modifier === 'double' ? 2 : 1;
  return { target: String(dart.number), hits };
}

function getPointValue(target: string): number {
  const num = parseInt(target);
  if (num === 25) return 25; // Bull is worth 25 per mark
  return num;
}

/**
 * Check if a number is dead (closed by ALL players).
 */
function isNumberDead(marks: Record<string, Record<string, number>>, playerOrder: string[], target: string): boolean {
  return playerOrder.every((pid) => (marks[pid]?.[target] ?? 0) >= 3);
}

/**
 * Process a cricket turn: apply darts, compute marks and scoring.
 */
export function processCricketTurn(
  state: CricketLiveState,
  playerId: string,
  darts: StoredDart[],
): CricketLiveState {
  const newMarks = JSON.parse(JSON.stringify(state.marks)) as Record<string, Record<string, number>>;
  const newScores = { ...state.scores };
  const turnMarksGained: Record<string, number> = {};
  let turnPointsScored = 0;

  for (const dart of darts) {
    const parsed = getMarksForDart(dart);
    if (!parsed) continue;

    const { target, hits } = parsed;
    const currentMarks = newMarks[playerId][target] ?? 0;

    if (currentMarks >= 3) {
      // Already closed for this player -- score points if not dead
      if (!isNumberDead(newMarks, state.playerOrder, target)) {
        const points = hits * getPointValue(target);
        newScores[playerId] += points;
        turnPointsScored += points;
      }
    } else {
      // Not yet closed -- add marks
      const marksToClose = 3 - currentMarks;
      const marksUsed = Math.min(hits, marksToClose);
      const overflow = hits - marksUsed;

      newMarks[playerId][target] = currentMarks + marksUsed;
      turnMarksGained[target] = (turnMarksGained[target] ?? 0) + marksUsed;

      // Overflow marks become scoring if now closed and number not dead
      if (overflow > 0 && !isNumberDead(newMarks, state.playerOrder, target)) {
        const points = overflow * getPointValue(target);
        newScores[playerId] += points;
        turnPointsScored += points;
      }
    }
  }

  const turnHistory: CricketTurnHistory = {
    playerId,
    darts: [...darts],
    marksGained: turnMarksGained,
    pointsScored: turnPointsScored,
  };

  // Advance to next player
  const nextIdx = (state.currentPlayerIndex + 1) % state.playerOrder.length;

  return {
    ...state,
    currentPlayerIndex: nextIdx,
    marks: newMarks,
    scores: newScores,
    history: [...state.history, turnHistory],
  };
}

/**
 * Check if a player has closed all 7 cricket numbers.
 */
function hasClosedAll(marks: Record<string, number>): boolean {
  return CRICKET_NUMBERS.every((num) => (marks[String(num)] ?? 0) >= 3);
}

/**
 * Check if the cricket game is over.
 * - A player has closed all numbers AND has the highest (or tied) score
 * - OR all numbers are dead for everyone
 */
export function isCricketGameOver(state: CricketLiveState): boolean {
  // Check if all numbers are dead
  const allDead = CRICKET_NUMBERS.every((num) =>
    isNumberDead(state.marks, state.playerOrder, String(num)),
  );
  if (allDead) return true;

  // Check if any player has closed all and leads (or ties)
  const maxScore = Math.max(...state.playerOrder.map((pid) => state.scores[pid] ?? 0));
  for (const pid of state.playerOrder) {
    if (hasClosedAll(state.marks[pid] ?? {}) && (state.scores[pid] ?? 0) >= maxScore) {
      return true;
    }
  }

  return false;
}

/**
 * Get the winner of a cricket game.
 * Priority: player who closed all with highest score > highest score overall.
 */
export function getCricketWinner(state: CricketLiveState): { winnerId: string | null; isTie: boolean } {
  const maxScore = Math.max(...state.playerOrder.map((pid) => state.scores[pid] ?? 0));

  // Players who closed all numbers
  const closedPlayers = state.playerOrder.filter((pid) => hasClosedAll(state.marks[pid] ?? {}));

  if (closedPlayers.length > 0) {
    // Among those who closed all, find highest score
    const closedMax = Math.max(...closedPlayers.map((pid) => state.scores[pid] ?? 0));
    const winners = closedPlayers.filter((pid) => (state.scores[pid] ?? 0) === closedMax);
    return { winnerId: winners[0], isTie: winners.length > 1 };
  }

  // Nobody closed all -- highest score wins
  const winners = state.playerOrder.filter((pid) => (state.scores[pid] ?? 0) === maxScore);
  return { winnerId: winners[0], isTie: winners.length > 1 };
}

/**
 * Get final game results.
 */
export function getCricketResults(state: CricketLiveState): GameResult[] {
  const entries = state.playerOrder.map((pid) => ({
    playerId: pid,
    score: state.scores[pid] ?? 0,
    closed: hasClosedAll(state.marks[pid] ?? {}),
  }));

  // Sort: closed first, then by score desc
  entries.sort((a, b) => {
    if (a.closed !== b.closed) return a.closed ? -1 : 1;
    return b.score - a.score;
  });

  const results: GameResult[] = [];
  let currentRank = 1;
  for (let i = 0; i < entries.length; i++) {
    if (i > 0) {
      const prev = entries[i - 1];
      const curr = entries[i];
      if (prev.closed !== curr.closed || prev.score !== curr.score) {
        currentRank = i + 1;
      }
    }
    results.push({ playerId: entries[i].playerId, score: entries[i].score, rank: currentRank });
  }
  return results;
}

/**
 * Undo the last turn.
 */
export function undoCricketTurn(state: CricketLiveState): CricketLiveState {
  if (state.history.length === 0) return state;

  // Rebuild state from scratch by replaying all turns except the last
  let rebuilt = initCricketState(state.playerOrder);
  const turns = state.history.slice(0, -1);
  for (const turn of turns) {
    rebuilt = processCricketTurn(rebuilt, turn.playerId, turn.darts);
  }
  return rebuilt;
}
