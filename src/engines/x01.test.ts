import { describe, it, expect } from 'vitest';
import { createStoredDart } from '../models/types';
import {
  initX01State,
  processX01Turn,
  undoX01Turn,
  isX01GameOver,
  getX01Results,
  getX01Winner,
  isBust,
  calcDartsTotal,
} from './x01';

describe('initX01State', () => {
  it('initializes with correct start score for 301', () => {
    const state = initX01State(['p1', 'p2'], 301, 'double');
    expect(state.startScore).toBe(301);
    expect(state.outMode).toBe('double');
    expect(state.scores['p1']).toBe(301);
    expect(state.scores['p2']).toBe(301);
    expect(state.playerOrder).toEqual(['p1', 'p2']);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.finishOrder).toEqual([]);
    expect(state.history).toEqual([]);
  });

  it('initializes with correct start score for 501', () => {
    const state = initX01State(['p1', 'p2'], 501, 'straight');
    expect(state.startScore).toBe(501);
    expect(state.outMode).toBe('straight');
    expect(state.scores['p1']).toBe(501);
    expect(state.scores['p2']).toBe(501);
  });
});

describe('calcDartsTotal', () => {
  it('sums dart scores', () => {
    const darts = [createStoredDart(20, 'triple'), createStoredDart(20, 'single'), createStoredDart(0)];
    expect(calcDartsTotal(darts)).toBe(80); // 60 + 20 + 0
  });
});

describe('isBust', () => {
  it('busts when total exceeds remaining', () => {
    const darts = [createStoredDart(20, 'triple')]; // 60
    expect(isBust(50, darts, 'straight')).toBe(true);
  });

  it('does not bust when total is under remaining (straight out)', () => {
    const darts = [createStoredDart(20, 'single')];
    expect(isBust(50, darts, 'straight')).toBe(false);
  });

  it('does not bust when hitting exact zero with straight out', () => {
    const darts = [createStoredDart(20, 'single')];
    expect(isBust(20, darts, 'straight')).toBe(false);
  });

  it('busts when hitting exact zero without double in double-out mode', () => {
    const darts = [createStoredDart(20, 'single')];
    expect(isBust(20, darts, 'double')).toBe(true);
  });

  it('does not bust when hitting exact zero with double in double-out mode', () => {
    const darts = [createStoredDart(10, 'double')]; // 20 points
    expect(isBust(20, darts, 'double')).toBe(false);
  });

  it('busts when remaining would be 1 in double-out mode', () => {
    const darts = [createStoredDart(19, 'single')];
    expect(isBust(20, darts, 'double')).toBe(true);
  });

  it('does not bust when remaining would be 1 in straight-out mode', () => {
    const darts = [createStoredDart(19, 'single')];
    expect(isBust(20, darts, 'straight')).toBe(false);
  });
});

describe('processX01Turn', () => {
  it('deducts score on valid turn', () => {
    const state = initX01State(['p1', 'p2'], 301, 'straight');
    const darts = [createStoredDart(20, 'triple'), createStoredDart(20, 'triple'), createStoredDart(20, 'triple')];
    const next = processX01Turn(state, 'p1', darts);
    expect(next.scores['p1']).toBe(301 - 180);
    expect(next.currentPlayerIndex).toBe(1);
    expect(next.history).toHaveLength(1);
    expect(next.history[0].bust).toBe(false);
  });

  it('resets score on bust', () => {
    const state = initX01State(['p1', 'p2'], 301, 'double');
    // First reduce p1's score
    let current = processX01Turn(state, 'p1', [createStoredDart(20, 'triple'), createStoredDart(20, 'triple'), createStoredDart(20, 'triple')]); // 301 - 180 = 121
    current = processX01Turn(current, 'p2', [createStoredDart(1, 'single')]); // p2's turn
    current = processX01Turn(current, 'p1', [createStoredDart(20, 'triple'), createStoredDart(20, 'triple')]); // 121 - 120 = 1, bust because double out and 1 remaining
    expect(current.scores['p1']).toBe(121); // reset to before turn
    expect(current.history[current.history.length - 1].bust).toBe(true);
  });

  it('finishes player when hitting exactly 0 (straight out)', () => {
    const state = initX01State(['p1', 'p2'], 301, 'straight');
    // Set p1 score to 20
    const modifiedState = { ...state, scores: { ...state.scores, p1: 20 } };
    const next = processX01Turn(modifiedState, 'p1', [createStoredDart(20, 'single')]);
    expect(next.scores['p1']).toBe(0);
    expect(next.finishOrder).toContain('p1');
  });

  it('finishes player when hitting exactly 0 with double (double out)', () => {
    const state = initX01State(['p1', 'p2'], 301, 'double');
    const modifiedState = { ...state, scores: { ...state.scores, p1: 20 } };
    const next = processX01Turn(modifiedState, 'p1', [createStoredDart(10, 'double')]);
    expect(next.scores['p1']).toBe(0);
    expect(next.finishOrder).toContain('p1');
  });

  it('advances to next player after turn', () => {
    const state = initX01State(['p1', 'p2', 'p3'], 301, 'straight');
    const next = processX01Turn(state, 'p1', [createStoredDart(20, 'single')]);
    expect(next.currentPlayerIndex).toBe(1);
    const next2 = processX01Turn(next, 'p2', [createStoredDart(20, 'single')]);
    expect(next2.currentPlayerIndex).toBe(2);
  });

  it('skips finished players when advancing', () => {
    const state = initX01State(['p1', 'p2', 'p3'], 301, 'straight');
    // Finish p2
    const modifiedState = { ...state, scores: { ...state.scores, p2: 0 }, finishOrder: ['p2'], currentPlayerIndex: 2 };
    const next = processX01Turn(modifiedState, 'p3', [createStoredDart(20, 'single')]);
    expect(next.currentPlayerIndex).toBe(0); // skips p2 (index 1)
  });
});

describe('undoX01Turn', () => {
  it('restores previous state', () => {
    const state = initX01State(['p1', 'p2'], 301, 'straight');
    const next = processX01Turn(state, 'p1', [createStoredDart(20, 'triple')]);
    const undone = undoX01Turn(next);
    expect(undone.scores['p1']).toBe(301);
    expect(undone.history).toHaveLength(0);
    expect(undone.currentPlayerIndex).toBe(0);
  });

  it('restores finished player on undo', () => {
    const state = initX01State(['p1', 'p2'], 301, 'straight');
    const modifiedState = { ...state, scores: { ...state.scores, p1: 20 } };
    const finished = processX01Turn(modifiedState, 'p1', [createStoredDart(20, 'single')]);
    expect(finished.finishOrder).toContain('p1');
    const undone = undoX01Turn(finished);
    expect(undone.finishOrder).not.toContain('p1');
    expect(undone.scores['p1']).toBe(20);
  });

  it('returns same state if no history', () => {
    const state = initX01State(['p1', 'p2'], 301, 'straight');
    expect(undoX01Turn(state)).toBe(state);
  });
});

describe('isX01GameOver', () => {
  it('returns false when all players have remaining score', () => {
    const state = initX01State(['p1', 'p2'], 301, 'straight');
    expect(isX01GameOver(state)).toBe(false);
  });

  it('returns true when only one player has remaining score', () => {
    const state = initX01State(['p1', 'p2'], 301, 'straight');
    const modifiedState = { ...state, scores: { ...state.scores, p1: 0 }, finishOrder: ['p1'] };
    expect(isX01GameOver(modifiedState)).toBe(true);
  });

  it('returns true when all players finished', () => {
    const state = initX01State(['p1', 'p2'], 301, 'straight');
    const modifiedState = { ...state, scores: { p1: 0, p2: 0 }, finishOrder: ['p1', 'p2'] };
    expect(isX01GameOver(modifiedState)).toBe(true);
  });
});

describe('getX01Results', () => {
  it('assigns ranks based on finish order', () => {
    const state = initX01State(['p1', 'p2', 'p3'], 301, 'straight');
    const modifiedState = {
      ...state,
      scores: { p1: 0, p2: 0, p3: 100 },
      finishOrder: ['p2', 'p1'],
    };
    const results = getX01Results(modifiedState);
    expect(results.find((r) => r.playerId === 'p2')?.rank).toBe(1);
    expect(results.find((r) => r.playerId === 'p1')?.rank).toBe(2);
    expect(results.find((r) => r.playerId === 'p3')?.rank).toBe(3);
  });
});

describe('getX01Winner', () => {
  it('returns first finisher as winner', () => {
    const state = initX01State(['p1', 'p2'], 301, 'straight');
    const modifiedState = { ...state, finishOrder: ['p2', 'p1'] };
    expect(getX01Winner(modifiedState)).toEqual({ winnerId: 'p2', isTie: false });
  });

  it('returns null when no one finished', () => {
    const state = initX01State(['p1', 'p2'], 301, 'straight');
    expect(getX01Winner(state)).toEqual({ winnerId: null, isTie: false });
  });
});
