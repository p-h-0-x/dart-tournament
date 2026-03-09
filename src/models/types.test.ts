import { describe, it, expect } from 'vitest';
import { dartScore, BOARD_ORDER, CONTRACTS, GAME_MODE_LABELS } from './types';
import type { Dart } from './types';

describe('dartScore', () => {
  it('returns 0 for a miss', () => {
    expect(dartScore({ segment: 0, modifier: 'single' })).toBe(0);
  });

  it('returns segment value for singles', () => {
    expect(dartScore({ segment: 20, modifier: 'single' })).toBe(20);
    expect(dartScore({ segment: 1, modifier: 'single' })).toBe(1);
  });

  it('returns double value for doubles', () => {
    expect(dartScore({ segment: 20, modifier: 'double' })).toBe(40);
    expect(dartScore({ segment: 10, modifier: 'double' })).toBe(20);
  });

  it('returns triple value for triples', () => {
    expect(dartScore({ segment: 20, modifier: 'triple' })).toBe(60);
    expect(dartScore({ segment: 19, modifier: 'triple' })).toBe(57);
  });

  it('returns 25 for single bull', () => {
    expect(dartScore({ segment: 25, modifier: 'single' })).toBe(25);
  });

  it('returns 50 for double bull', () => {
    expect(dartScore({ segment: 50, modifier: 'double' })).toBe(50);
  });

  it('bull values ignore modifier (raw segment)', () => {
    // Bull segments return their face value regardless of modifier
    const sb: Dart = { segment: 25, modifier: 'single' };
    const db: Dart = { segment: 50, modifier: 'double' };
    expect(dartScore(sb)).toBe(25);
    expect(dartScore(db)).toBe(50);
  });

  it('handles all segments 1-20', () => {
    for (let seg = 1; seg <= 20; seg++) {
      expect(dartScore({ segment: seg, modifier: 'single' })).toBe(seg);
      expect(dartScore({ segment: seg, modifier: 'double' })).toBe(seg * 2);
      expect(dartScore({ segment: seg, modifier: 'triple' })).toBe(seg * 3);
    }
  });
});

describe('BOARD_ORDER', () => {
  it('has 20 segments', () => {
    expect(BOARD_ORDER).toHaveLength(20);
  });

  it('contains all numbers 1-20 exactly once', () => {
    const sorted = [...BOARD_ORDER].sort((a, b) => a - b);
    expect(sorted).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it('starts with 20 (top of board)', () => {
    expect(BOARD_ORDER[0]).toBe(20);
  });

  it('has correct adjacencies', () => {
    // 20-1 adjacent
    expect(BOARD_ORDER[0]).toBe(20);
    expect(BOARD_ORDER[1]).toBe(1);
    // 5-20 wrap-around adjacent
    expect(BOARD_ORDER[19]).toBe(5);
    expect(BOARD_ORDER[0]).toBe(20);
  });
});

describe('CONTRACTS', () => {
  it('has 15 contracts', () => {
    expect(CONTRACTS).toHaveLength(15);
  });

  it('contracts are ordered 1-15', () => {
    const orders = CONTRACTS.map((c) => c.order);
    expect(orders).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
  });

  it('first contract is capital', () => {
    expect(CONTRACTS[0].id).toBe('capital');
  });

  it('last contract is bull', () => {
    expect(CONTRACTS[14].id).toBe('bull');
  });

  it('all contracts have unique ids', () => {
    const ids = CONTRACTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(15);
  });

  it('includes all expected contract ids', () => {
    const ids = CONTRACTS.map((c) => c.id);
    const expected = ['capital', '20', 'side', '19', '3row', '18', 'color', '17', 'double', '16', 'triple', '15', '57', '14', 'bull'];
    expect(ids).toEqual(expected);
  });
});

describe('GAME_MODE_LABELS', () => {
  it('has labels for all 4 game modes', () => {
    expect(Object.keys(GAME_MODE_LABELS)).toHaveLength(4);
    expect(GAME_MODE_LABELS.classic).toBe('Classic Halve-It');
    expect(GAME_MODE_LABELS.clock).toBe('Clock');
    expect(GAME_MODE_LABELS.killer).toBe('Killer');
    expect(GAME_MODE_LABELS['301/501']).toBe('301/501');
  });
});
