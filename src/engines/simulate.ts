import { CRICKET_NUMBERS, type StoredDart, type ClassicLiveState, type KillerLiveState, type ClockLiveState, type CricketLiveState, type X01LiveState, createStoredDart, type DartModifier } from '../models/types';
import { submitClassicRound, isClassicComplete } from './classic';
import { processKillerTurn, applyKillerChanges, isKillerGameOver } from './killer';
import { processClockDarts, CLOCK_MAX_TURNS, CLOCK_POSITION_FINISHED } from './clock';
import { processCricketTurn, isCricketGameOver } from './cricket';
import { processX01Turn, isX01GameOver } from './x01';

const MODIFIERS: DartModifier[] = ['single', 'double', 'triple'];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDart(): StoredDart {
  const roll = Math.random();
  if (roll < 0.1) return createStoredDart(0); // 10% miss
  if (roll < 0.15) return createStoredDart(25, Math.random() < 0.5 ? 'single' : 'double'); // 5% bull
  const num = randomInt(1, 20);
  const mod = MODIFIERS[randomInt(0, 2)];
  return createStoredDart(num, mod);
}

function randomDarts(count: number = 3): StoredDart[] {
  return Array.from({ length: count }, () => randomDart());
}

/**
 * Simulate a full Classic Halve-It game to completion.
 */
export function simulateClassicGame(state: ClassicLiveState, playerIds: string[]): ClassicLiveState {
  let current = state;
  while (!isClassicComplete(current)) {
    const playerDarts: Record<string, StoredDart[]> = {};
    for (const pid of playerIds) {
      const maxDarts = 3 + (current.bonusDarts?.[pid] ?? 0);
      playerDarts[pid] = randomDarts(maxDarts);
    }
    current = submitClassicRound(current, playerDarts, playerIds);
  }
  return current;
}

/**
 * Simulate a full Killer game to completion.
 */
export function simulateKillerGame(state: KillerLiveState): KillerLiveState {
  let current = { ...state };
  const order = current.playerOrder;

  // Number selection phase
  if (current.phase === 'number') {
    const available = Array.from({ length: 20 }, (_, i) => i + 1);
    const numbers: Record<string, number> = {};
    for (const pid of order) {
      const idx = randomInt(0, available.length - 1);
      numbers[pid] = available[idx];
      available.splice(idx, 1);
    }
    current = { ...current, phase: 'play', currentPlayerIndex: 0, numbers };
  }

  // Play phase
  let safety = 0;
  while (!isKillerGameOver(current.eliminated, order.length) && safety < 200) {
    safety++;
    const pid = order[current.currentPlayerIndex];
    if (current.eliminated[pid]) {
      current = { ...current, currentPlayerIndex: (current.currentPlayerIndex + 1) % order.length };
      continue;
    }

    const darts = randomDarts(3);
    const throwerNum = current.numbers[pid];
    const allPlayers = order
      .filter((p) => !current.eliminated[p])
      .map((p) => ({ playerId: p, number: current.numbers[p] }));

    const changes = processKillerTurn(pid, throwerNum, current.isKiller[pid] ?? false, darts, allPlayers);
    const { lives, isKiller, eliminated } = applyKillerChanges(current.lives, current.isKiller, current.eliminated, changes);

    // Advance to next alive player
    let nextIdx = current.currentPlayerIndex;
    for (let i = 1; i <= order.length; i++) {
      const idx = (current.currentPlayerIndex + i) % order.length;
      if (!eliminated[order[idx]]) { nextIdx = idx; break; }
    }

    current = {
      ...current,
      currentPlayerIndex: nextIdx,
      lives,
      isKiller,
      eliminated,
      history: [...current.history, {
        playerId: pid,
        darts,
        livesBefore: { ...current.lives },
        killerBefore: { ...current.isKiller },
        eliminatedBefore: { ...current.eliminated },
      }],
    };
  }
  return current;
}

/**
 * Simulate a full Clock game to completion.
 */
export function simulateClockGame(state: ClockLiveState): ClockLiveState {
  let current = { ...state };
  const order = current.playerOrder;

  let safety = 0;
  while (safety < 500) {
    safety++;
    const anyFinished = current.finishOrder.length > 0;
    const allMaxTurns = order.every((pid) =>
      current.finished[pid] || (current.turnCounts[pid] ?? 0) >= CLOCK_MAX_TURNS,
    );
    if (anyFinished || allMaxTurns) break;

    const pid = order[current.currentPlayerIndex];
    if (current.finished[pid] || (current.turnCounts[pid] ?? 0) >= CLOCK_MAX_TURNS) {
      // Skip to next player
      for (let i = 1; i <= order.length; i++) {
        const idx = (current.currentPlayerIndex + i) % order.length;
        const p = order[idx];
        if (!current.finished[p] && (current.turnCounts[p] ?? 0) < CLOCK_MAX_TURNS) {
          current = { ...current, currentPlayerIndex: idx };
          break;
        }
      }
      continue;
    }

    // Generate darts that have a chance of hitting the target
    const pos = current.positions[pid] ?? 1;
    const darts: StoredDart[] = [];
    for (let i = 0; i < 3; i++) {
      if (pos >= CLOCK_POSITION_FINISHED) break;
      const currentPos = processClockDarts(darts, current.positions[pid] ?? 1).endPosition;
      if (currentPos >= CLOCK_POSITION_FINISHED) break;
      if (Math.random() < 0.4) {
        // Hit the target
        if (currentPos > 10) {
          darts.push(createStoredDart(25)); // Bull
        } else {
          const mod = MODIFIERS[randomInt(0, 2)];
          darts.push(createStoredDart(currentPos, mod));
        }
      } else {
        darts.push(createStoredDart(0)); // Miss
      }
    }
    if (darts.length === 0) darts.push(createStoredDart(0));

    const result = processClockDarts(darts, current.positions[pid] ?? 1);

    const newPositions = { ...current.positions, [pid]: result.endPosition };
    const newFinished = { ...current.finished };
    const newFinishOrder = [...current.finishOrder];
    const newTurnCounts = { ...current.turnCounts, [pid]: (current.turnCounts[pid] ?? 0) + 1 };

    if (result.finished && !current.finished[pid]) {
      newFinished[pid] = true;
      newFinishOrder.push(pid);
    }

    let nextIdx = current.currentPlayerIndex;
    if (!result.extraTurn) {
      for (let i = 1; i <= order.length; i++) {
        const idx = (current.currentPlayerIndex + i) % order.length;
        const p = order[idx];
        if (!newFinished[p] && (newTurnCounts[p] ?? 0) < CLOCK_MAX_TURNS) {
          nextIdx = idx;
          break;
        }
      }
    }

    current = {
      ...current,
      currentPlayerIndex: nextIdx,
      positions: newPositions,
      finished: newFinished,
      finishOrder: newFinishOrder,
      turnCounts: newTurnCounts,
      history: [...current.history, {
        playerId: pid,
        prevPos: current.positions[pid] ?? 1,
        newPos: result.endPosition,
        darts,
        extraTurn: result.extraTurn,
        finishOrderBefore: [...current.finishOrder],
      }],
    };
  }
  return current;
}

/**
 * Simulate a full Cricket game to completion.
 */
export function simulateCricketGame(state: CricketLiveState): CricketLiveState {
  let current = { ...state };
  const order = current.playerOrder;

  let safety = 0;
  while (!isCricketGameOver(current) && safety < 500) {
    safety++;
    const pid = order[current.currentPlayerIndex];

    // Generate darts biased toward cricket numbers
    const darts: StoredDart[] = [];
    for (let i = 0; i < 3; i++) {
      if (Math.random() < 0.7) {
        const target = CRICKET_NUMBERS[randomInt(0, CRICKET_NUMBERS.length - 1)];
        if (target === 25) {
          darts.push(createStoredDart(25, Math.random() < 0.5 ? 'single' : 'double'));
        } else {
          const mod = MODIFIERS[randomInt(0, 2)];
          darts.push(createStoredDart(target, mod));
        }
      } else {
        darts.push(createStoredDart(0));
      }
    }

    current = processCricketTurn(current, pid, darts);
  }
  return current;
}

/**
 * Simulate a full X01 (301/501) game to completion.
 */
export function simulateX01Game(state: X01LiveState): X01LiveState {
  let current = { ...state };
  const order = current.playerOrder;

  let safety = 0;
  while (!isX01GameOver(current) && safety < 500) {
    safety++;
    const pid = order[current.currentPlayerIndex];
    if (current.scores[pid] <= 0) {
      // Skip finished players
      current = { ...current, currentPlayerIndex: (current.currentPlayerIndex + 1) % order.length };
      continue;
    }

    const remaining = current.scores[pid];
    const darts: StoredDart[] = [];
    let runningRemaining = remaining;

    for (let i = 0; i < 3; i++) {
      if (runningRemaining <= 0) break;

      // Try to finish if possible
      if (runningRemaining <= 40 && current.outMode === 'double' && runningRemaining % 2 === 0) {
        const doubleTarget = runningRemaining / 2;
        if (doubleTarget >= 1 && doubleTarget <= 20 && Math.random() < 0.3) {
          darts.push(createStoredDart(doubleTarget, 'double'));
          runningRemaining = 0;
          continue;
        }
      }
      if (current.outMode === 'straight' && runningRemaining <= 20 && Math.random() < 0.3) {
        darts.push(createStoredDart(runningRemaining, 'single'));
        runningRemaining = 0;
        continue;
      }

      // Random scoring dart
      const dart = randomDart();
      const newRemaining = runningRemaining - dart.score;
      if (newRemaining >= 0) {
        runningRemaining = newRemaining;
        darts.push(dart);
      } else {
        darts.push(createStoredDart(0)); // miss to avoid bust
      }
    }

    if (darts.length === 0) darts.push(createStoredDart(0));
    current = processX01Turn(current, pid, darts);
  }
  return current;
}
