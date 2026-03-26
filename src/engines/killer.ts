import { BOARD_ORDER } from '../models/types';
import type { StoredDart, DartModifier, KillerLiveState } from '../models/types';

/**
 * Initialize a new Killer game state.
 */
export function initKillerState(playerIds: string[]): KillerLiveState {
  const lives: Record<string, number> = {};
  const isKiller: Record<string, boolean> = {};
  const eliminated: Record<string, boolean> = {};
  for (const pid of playerIds) {
    lives[pid] = 0;
    isKiller[pid] = false;
    eliminated[pid] = false;
  }
  return {
    mode: 'killer',
    phase: 'number',
    currentPlayerIndex: 0,
    playerOrder: [...playerIds],
    numbers: {},
    lives,
    isKiller,
    eliminated,
    history: [],
  };
}

export const KILLER_MAX_LIVES = 9;
export const KILLER_ELIMINATED_THRESHOLD = -1;

function getMultiplier(modifier: DartModifier): number {
  if (modifier === 'double') return 2;
  if (modifier === 'triple') return 3;
  return 1;
}

/**
 * Get the two adjacent numbers on the dartboard for a given number.
 * Uses the physical clockwise board order.
 */
export function getAdjacentNumbers(num: number): number[] {
  const idx = BOARD_ORDER.indexOf(num);
  if (idx < 0) return [];
  const left = BOARD_ORDER[(idx - 1 + BOARD_ORDER.length) % BOARD_ORDER.length];
  const right = BOARD_ORDER[(idx + 1) % BOARD_ORDER.length];
  return [left, right];
}

export interface KillerChange {
  playerId: string;
  delta: number;
  reason: 'own' | 'adjacent' | 'killed' | 'adj-killed';
}

/**
 * Process a killer turn: determine life changes for all players based on thrown darts.
 *
 * @param throwerId - the player throwing
 * @param throwerNum - the thrower's chosen number
 * @param isThrowerKiller - whether the thrower was a killer before this turn
 * @param darts - darts thrown this turn
 * @param allPlayers - all non-eliminated players with their numbers: { playerId, number }
 * @returns array of individual life changes (may contain multiple entries per player)
 */
export function processKillerTurn(
  throwerId: string,
  throwerNum: number,
  isThrowerKiller: boolean,
  darts: StoredDart[],
  allPlayers: { playerId: string; number: number }[],
): KillerChange[] {
  const changes: KillerChange[] = [];
  const throwerAdj = getAdjacentNumbers(throwerNum);
  let runningLives = 0; // Track relative change for killer status mid-turn
  let isKillerNow = isThrowerKiller;

  for (const dart of darts) {
    if (dart.number === 0 || dart.number === 25) continue; // miss or bull: no effect

    const multiplier = getMultiplier(dart.modifier);
    const wasKillerBeforeDart = isKillerNow;

    // Self-benefit: hitting own number or adjacent
    if (dart.number === throwerNum) {
      const delta = 3 * multiplier;
      changes.push({ playerId: throwerId, delta, reason: 'own' });
      runningLives += delta;
    } else if (throwerAdj.includes(dart.number)) {
      const delta = 1 * multiplier;
      changes.push({ playerId: throwerId, delta, reason: 'adjacent' });
      runningLives += delta;
    }

    // Check if thrower became killer mid-turn (doesn't affect this dart's attacks)
    if (!isKillerNow && runningLives >= KILLER_MAX_LIVES) {
      isKillerNow = true;
    }

    // Killer attacks: if thrower was killer before this dart, damage others
    if (wasKillerBeforeDart) {
      for (const other of allPlayers) {
        if (other.playerId === throwerId) continue;
        const otherAdj = getAdjacentNumbers(other.number);

        if (dart.number === other.number) {
          changes.push({ playerId: other.playerId, delta: -3 * multiplier, reason: 'killed' });
        } else if (otherAdj.includes(dart.number)) {
          changes.push({ playerId: other.playerId, delta: -1 * multiplier, reason: 'adj-killed' });
        }
      }
    }
  }

  return changes;
}

/**
 * Aggregate individual changes into net deltas per player.
 */
export function aggregateChanges(changes: KillerChange[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const c of changes) {
    result[c.playerId] = (result[c.playerId] || 0) + c.delta;
  }
  return result;
}

/**
 * Apply life changes and return updated lives, killer status, and elimination status.
 * Lives are capped at KILLER_MAX_LIVES.
 */
export function applyKillerChanges(
  lives: Record<string, number>,
  isKiller: Record<string, boolean>,
  eliminated: Record<string, boolean>,
  changes: KillerChange[],
): {
  lives: Record<string, number>;
  isKiller: Record<string, boolean>;
  eliminated: Record<string, boolean>;
  newlyEliminated: string[];
} {
  const newLives = { ...lives };
  const newIsKiller = { ...isKiller };
  const newEliminated = { ...eliminated };
  const newlyEliminated: string[] = [];

  const deltas = aggregateChanges(changes);

  for (const [playerId, delta] of Object.entries(deltas)) {
    if (newEliminated[playerId]) continue;
    newLives[playerId] = Math.min((newLives[playerId] || 0) + delta, KILLER_MAX_LIVES);
  }

  // Check killer status
  for (const playerId of Object.keys(newLives)) {
    if (!newEliminated[playerId] && newLives[playerId] >= KILLER_MAX_LIVES) {
      newIsKiller[playerId] = true;
    }
  }

  // Check eliminations
  for (const playerId of Object.keys(newLives)) {
    if (!newEliminated[playerId] && newLives[playerId] <= KILLER_ELIMINATED_THRESHOLD) {
      newEliminated[playerId] = true;
      newlyEliminated.push(playerId);
    }
  }

  return { lives: newLives, isKiller: newIsKiller, eliminated: newEliminated, newlyEliminated };
}

/**
 * Determine if the killer game is over (1 or fewer players remaining).
 */
export function isKillerGameOver(eliminated: Record<string, boolean>, totalPlayers: number): boolean {
  const aliveCount = totalPlayers - Object.values(eliminated).filter(Boolean).length;
  return aliveCount <= 1;
}

/**
 * Get the winner of a killer game (last player standing).
 */
export function getKillerWinner(
  playerIds: string[],
  eliminated: Record<string, boolean>,
): string | null {
  const alive = playerIds.filter((p) => !eliminated[p]);
  return alive.length === 1 ? alive[0] : null;
}
