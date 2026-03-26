import { describe, it, expect } from 'vitest';
import { createStoredDart } from '../models/types';
import {
  processClockDarts,
  getClockPreviewTarget,
  getClockProgress,
  determineClockWinner,
  getClockTargetName,
  CLOCK_POSITION_BULL,
  CLOCK_POSITION_FINISHED,
} from './clock';

// Helpers
const sd = (num: number, mod: 'single' | 'double' | 'triple' = 'single') =>
  createStoredDart(num, mod);

describe('processClockDarts', () => {
  it('returns starting position when no darts hit the target', () => {
    const result = processClockDarts([sd(5), sd(10), sd(20)], 1);
    expect(result.endPosition).toBe(1);
    expect(result.finished).toBe(false);
    expect(result.extraTurn).toBe(false);
  });

  it('advances position when dart hits the current target', () => {
    const result = processClockDarts([sd(1), sd(5), sd(5)], 1);
    expect(result.endPosition).toBe(2);
  });

  it('handles multiple hits in one turn as targets advance mid-turn', () => {
    // Start at 1, hit 1 -> now at 2, hit 2 -> now at 3, miss
    const result = processClockDarts([sd(1), sd(2), sd(5)], 1);
    expect(result.endPosition).toBe(3);
  });

  it('double advances 2 positions', () => {
    const result = processClockDarts([sd(1, 'double'), sd(5), sd(5)], 1);
    expect(result.endPosition).toBe(3);
  });

  it('triple advances 3 positions', () => {
    const result = processClockDarts([sd(1, 'triple'), sd(5), sd(5)], 1);
    expect(result.endPosition).toBe(4);
  });

  it('caps at Bull position (11) when advancing past 10', () => {
    // At position 9, triple 9 would go to 12, but caps at 11
    const result = processClockDarts([sd(9, 'triple'), sd(5), sd(5)], 9);
    expect(result.endPosition).toBe(CLOCK_POSITION_BULL);
  });

  it('finishes when bull is hit at bull position', () => {
    const result = processClockDarts([sd(25)], CLOCK_POSITION_BULL);
    expect(result.endPosition).toBe(CLOCK_POSITION_FINISHED);
    expect(result.finished).toBe(true);
  });

  it('does not finish when non-bull is hit at bull position', () => {
    const result = processClockDarts([sd(20), sd(5), sd(10)], CLOCK_POSITION_BULL);
    expect(result.endPosition).toBe(CLOCK_POSITION_BULL);
    expect(result.finished).toBe(false);
  });

  it('grants extra turn when last dart hits target (not finishing)', () => {
    const result = processClockDarts([sd(5), sd(5), sd(1)], 1);
    expect(result.endPosition).toBe(2);
    expect(result.lastDartHit).toBe(true);
    expect(result.extraTurn).toBe(true);
  });

  it('does not grant extra turn when finishing', () => {
    const result = processClockDarts([sd(5), sd(5), sd(25)], CLOCK_POSITION_BULL);
    expect(result.finished).toBe(true);
    expect(result.extraTurn).toBe(false);
  });

  it('does not grant extra turn when last dart misses', () => {
    const result = processClockDarts([sd(1), sd(5), sd(5)], 1);
    expect(result.extraTurn).toBe(false);
  });

  it('handles empty darts array', () => {
    const result = processClockDarts([], 5);
    expect(result.endPosition).toBe(5);
    expect(result.finished).toBe(false);
    expect(result.extraTurn).toBe(false);
  });

  it('double bull at bull position finishes the game', () => {
    const result = processClockDarts([sd(25, 'double')], CLOCK_POSITION_BULL);
    expect(result.finished).toBe(true);
  });
});

describe('getClockPreviewTarget', () => {
  it('returns end position after simulating darts', () => {
    expect(getClockPreviewTarget([sd(1)], 1)).toBe(2);
    expect(getClockPreviewTarget([], 5)).toBe(5);
  });
});

describe('getClockProgress', () => {
  it('returns 0 at position 1', () => {
    expect(getClockProgress(1, false)).toBe(0);
  });

  it('returns 100 when finished', () => {
    expect(getClockProgress(12, true)).toBe(100);
  });

  it('returns proportional progress for intermediate positions', () => {
    // Position 6: (6-1)/11 * 100 ≈ 45.45%
    const progress = getClockProgress(6, false);
    expect(progress).toBeCloseTo(45.45, 1);
  });
});

describe('getClockTargetName', () => {
  it('returns number string for positions 1-10', () => {
    expect(getClockTargetName(1)).toBe('1');
    expect(getClockTargetName(10)).toBe('10');
  });

  it('returns Bull for position 11', () => {
    expect(getClockTargetName(11)).toBe('Bull');
  });

  it('returns Finished for position 12+', () => {
    expect(getClockTargetName(12)).toBe('Finished');
  });
});

describe('determineClockWinner', () => {
  it('first finisher wins', () => {
    const result = determineClockWinner(
      ['p1', 'p2'],
      { p1: 12, p2: 12 },
      ['p2', 'p1'],
    );
    expect(result.winners).toEqual(['p2']);
    expect(result.isTie).toBe(false);
  });

  it('highest position wins when no one finishes', () => {
    const result = determineClockWinner(
      ['p1', 'p2', 'p3'],
      { p1: 5, p2: 8, p3: 3 },
      [],
    );
    expect(result.winners).toEqual(['p2']);
    expect(result.isTie).toBe(false);
  });

  it('detects tie when positions are equal', () => {
    const result = determineClockWinner(
      ['p1', 'p2'],
      { p1: 7, p2: 7 },
      [],
    );
    expect(result.winners).toEqual(['p1', 'p2']);
    expect(result.isTie).toBe(true);
  });

  it('defaults to position 1 for players without a recorded position', () => {
    const result = determineClockWinner(
      ['p1', 'p2'],
      { p1: 3 },
      [],
    );
    expect(result.winners).toEqual(['p1']);
    expect(result.isTie).toBe(false);
  });
});
