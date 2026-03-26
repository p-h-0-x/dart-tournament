import { describe, it, expect } from 'vitest';
import { createStoredDart } from '../models/types';
import {
  getAdjacentNumbers,
  processKillerTurn,
  aggregateChanges,
  applyKillerChanges,
  isKillerGameOver,
  getKillerWinner,
  KILLER_MAX_LIVES,
} from './killer';

const sd = (num: number, mod: 'single' | 'double' | 'triple' = 'single') =>
  createStoredDart(num, mod);

describe('getAdjacentNumbers', () => {
  it('returns correct adjacent numbers for 20 (top of board)', () => {
    // Board: ...5, 20, 1, 18...
    const adj = getAdjacentNumbers(20);
    expect(adj).toContain(5);
    expect(adj).toContain(1);
    expect(adj).toHaveLength(2);
  });

  it('returns correct adjacent numbers for a middle segment', () => {
    // Board: ...4, 13, 6...
    const adj = getAdjacentNumbers(13);
    expect(adj).toContain(4);
    expect(adj).toContain(6);
  });

  it('wraps around the board', () => {
    // Board: ...12, 5, 20, 1... (5 is last, wraps to 20 which is first)
    const adj = getAdjacentNumbers(5);
    expect(adj).toContain(12);
    expect(adj).toContain(20);
  });

  it('returns empty for invalid number', () => {
    expect(getAdjacentNumbers(99)).toEqual([]);
    expect(getAdjacentNumbers(0)).toEqual([]);
  });
});

describe('processKillerTurn', () => {
  const players = [
    { playerId: 'p1', number: 15 },
    { playerId: 'p2', number: 6 },
  ];

  it('gains 3 lives per multiplier for hitting own number', () => {
    const changes = processKillerTurn('p1', 15, false, [sd(15)], players);
    const own = changes.filter((c) => c.playerId === 'p1' && c.reason === 'own');
    expect(own.length).toBe(1);
    expect(own[0].delta).toBe(3);
  });

  it('gains 6 lives for double own number', () => {
    const changes = processKillerTurn('p1', 15, false, [sd(15, 'double')], players);
    const own = changes.filter((c) => c.playerId === 'p1' && c.reason === 'own');
    expect(own[0].delta).toBe(6);
  });

  it('gains 1 life per multiplier for hitting adjacent number', () => {
    // 15 is adjacent to 10 and 2 on the board
    const adj = getAdjacentNumbers(15);
    const changes = processKillerTurn('p1', 15, false, [sd(adj[0])], players);
    const adjChange = changes.filter((c) => c.playerId === 'p1' && c.reason === 'adjacent');
    expect(adjChange.length).toBe(1);
    expect(adjChange[0].delta).toBe(1);
  });

  it('misses and bulls have no effect', () => {
    const changes = processKillerTurn('p1', 15, false, [sd(0), sd(25), sd(7)], players);
    expect(changes.length).toBe(0);
  });

  it('killer attacks other players by hitting their number', () => {
    const changes = processKillerTurn('p1', 15, true, [sd(6)], players);
    const killed = changes.filter((c) => c.playerId === 'p2' && c.reason === 'killed');
    expect(killed.length).toBe(1);
    expect(killed[0].delta).toBe(-3);
  });

  it('killer attacks other players by hitting their adjacent number', () => {
    const adjOf6 = getAdjacentNumbers(6);
    const changes = processKillerTurn('p1', 15, true, [sd(adjOf6[0])], players);
    const adjKilled = changes.filter((c) => c.playerId === 'p2' && c.reason === 'adj-killed');
    expect(adjKilled.length).toBe(1);
    expect(adjKilled[0].delta).toBe(-1);
  });

  it('non-killer does not attack others', () => {
    const changes = processKillerTurn('p1', 15, false, [sd(6)], players);
    const p2Changes = changes.filter((c) => c.playerId === 'p2');
    expect(p2Changes.length).toBe(0);
  });

  it('triple multiplies attacks', () => {
    const changes = processKillerTurn('p1', 15, true, [sd(6, 'triple')], players);
    const killed = changes.filter((c) => c.playerId === 'p2' && c.reason === 'killed');
    expect(killed[0].delta).toBe(-9);
  });
});

describe('aggregateChanges', () => {
  it('sums deltas per player', () => {
    const changes = [
      { playerId: 'p1', delta: 3, reason: 'own' as const },
      { playerId: 'p1', delta: 1, reason: 'adjacent' as const },
      { playerId: 'p2', delta: -3, reason: 'killed' as const },
    ];
    const result = aggregateChanges(changes);
    expect(result['p1']).toBe(4);
    expect(result['p2']).toBe(-3);
  });
});

describe('applyKillerChanges', () => {
  it('applies life changes and caps at max lives', () => {
    const lives = { p1: 7 };
    const isKiller = { p1: false };
    const eliminated = { p1: false };
    const changes = [{ playerId: 'p1', delta: 6, reason: 'own' as const }];

    const result = applyKillerChanges(lives, isKiller, eliminated, changes);
    expect(result.lives['p1']).toBe(KILLER_MAX_LIVES); // capped at 9
    expect(result.isKiller['p1']).toBe(true);
  });

  it('eliminates players at -1 or below', () => {
    const lives = { p1: 0 };
    const isKiller = { p1: false };
    const eliminated = { p1: false };
    const changes = [{ playerId: 'p1', delta: -2, reason: 'killed' as const }];

    const result = applyKillerChanges(lives, isKiller, eliminated, changes);
    expect(result.lives['p1']).toBe(-2);
    expect(result.eliminated['p1']).toBe(true);
    expect(result.newlyEliminated).toContain('p1');
  });

  it('does not affect already eliminated players', () => {
    const lives = { p1: -1 };
    const isKiller = { p1: false };
    const eliminated = { p1: true };
    const changes = [{ playerId: 'p1', delta: 3, reason: 'own' as const }];

    const result = applyKillerChanges(lives, isKiller, eliminated, changes);
    expect(result.lives['p1']).toBe(-1); // unchanged
  });
});

describe('isKillerGameOver', () => {
  it('game over when 1 or fewer players remain', () => {
    expect(isKillerGameOver({ p1: true, p2: true, p3: false }, 3)).toBe(true);
    expect(isKillerGameOver({ p1: true, p2: false, p3: false }, 3)).toBe(false);
  });
});

describe('getKillerWinner', () => {
  it('returns last player standing', () => {
    expect(getKillerWinner(['p1', 'p2', 'p3'], { p1: true, p2: false, p3: true })).toBe('p2');
  });

  it('returns null if multiple players alive', () => {
    expect(getKillerWinner(['p1', 'p2'], { p1: false, p2: false })).toBe(null);
  });
});
