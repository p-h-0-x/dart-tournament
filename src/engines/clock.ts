import type { StoredDart, DartModifier, ClockLiveState } from '../models/types';

/**
 * Initialize a new Clock game state.
 */
export function initClockState(playerIds: string[]): ClockLiveState {
  const positions: Record<string, number> = {};
  const finished: Record<string, boolean> = {};
  const turnCounts: Record<string, number> = {};
  for (const pid of playerIds) {
    positions[pid] = 1;
    finished[pid] = false;
    turnCounts[pid] = 0;
  }
  return {
    mode: 'clock',
    currentPlayerIndex: 0,
    playerOrder: [...playerIds],
    positions,
    finished,
    finishOrder: [],
    turnCounts,
    history: [],
  };
}

// Target positions: 1-10 = numbers, 11 = Bull, 12 = finished
export const CLOCK_POSITION_BULL = 11;
export const CLOCK_POSITION_FINISHED = 12;

// Maximum number of turns per player before the game ends
export const CLOCK_MAX_TURNS = 10;

function getMultiplier(modifier: DartModifier): number {
  if (modifier === 'double') return 2;
  if (modifier === 'triple') return 3;
  return 1;
}

export function getClockTargetName(position: number): string {
  if (position >= CLOCK_POSITION_FINISHED) return 'Finished';
  if (position >= CLOCK_POSITION_BULL) return 'Bull';
  return String(position);
}

export interface ClockDartResult {
  endPosition: number;
  lastDartHit: boolean;
  finished: boolean;
  extraTurn: boolean;
}

/**
 * Process a set of darts against a starting position.
 * Each dart is evaluated against the current target at that point in the turn.
 */
export function processClockDarts(darts: StoredDart[], startPosition: number): ClockDartResult {
  if (!darts || darts.length === 0) {
    return { endPosition: startPosition, lastDartHit: false, finished: false, extraTurn: false };
  }

  let pos = startPosition;
  let lastDartHit = false;

  for (let i = 0; i < darts.length; i++) {
    const dart = darts[i];
    if (pos >= CLOCK_POSITION_FINISHED) break;

    let hit = false;
    if (pos <= 10) {
      if (dart.number === pos) {
        hit = true;
        const advance = getMultiplier(dart.modifier);
        pos = pos + advance;
        if (pos > CLOCK_POSITION_BULL) pos = CLOCK_POSITION_BULL;
      }
    } else {
      // Target is bull (position 11)
      if (dart.number === 25) {
        hit = true;
        pos = CLOCK_POSITION_FINISHED;
      }
    }

    lastDartHit = (i === darts.length - 1) && hit;
  }

  const finished = pos >= CLOCK_POSITION_FINISHED;
  const extraTurn = lastDartHit && !finished;

  return {
    endPosition: finished ? CLOCK_POSITION_FINISHED : pos,
    lastDartHit,
    finished,
    extraTurn,
  };
}

/**
 * Preview target position after simulating the given darts.
 * Used to dynamically update the UI as darts are entered one at a time.
 */
export function getClockPreviewTarget(darts: StoredDart[], startPosition: number): number {
  return processClockDarts(darts, startPosition).endPosition;
}

/**
 * Calculate progress percentage for a clock position (0-100).
 */
export function getClockProgress(position: number, finished: boolean): number {
  if (finished) return 100;
  return ((position - 1) / 11) * 100;
}

export interface ClockWinnerResult {
  winners: string[];
  isTie: boolean;
}

/**
 * Determine the winner(s) of a clock game.
 * If any player finished, the first finisher wins.
 * Otherwise, player(s) with the highest position win.
 */
export function determineClockWinner(
  playerIds: string[],
  positions: Record<string, number>,
  finishOrder: string[],
): ClockWinnerResult {
  if (finishOrder && finishOrder.length > 0) {
    return { winners: [finishOrder[0]], isTie: false };
  }

  let highPos = 0;
  playerIds.forEach((p) => {
    const pos = positions[p] || 1;
    if (pos > highPos) highPos = pos;
  });

  const winners = playerIds.filter((p) => (positions[p] || 1) === highPos);
  return { winners, isTie: winners.length > 1 };
}
