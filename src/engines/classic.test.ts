import { describe, it, expect } from 'vitest';
import { createStoredDart } from '../models/types';
import {
  initClassicState,
  submitClassicRound,
  undoClassicRound,
  isClassicComplete,
  getClassicResults,
} from './classic';

const sd = (num: number, mod: 'single' | 'double' | 'triple' = 'single') =>
  createStoredDart(num, mod);

const players = ['p1', 'p2'];

describe('initClassicState', () => {
  it('initializes with round 0, zero capitals, and empty pending darts', () => {
    const state = initClassicState(players);
    expect(state.mode).toBe('classic');
    expect(state.currentRound).toBe(0);
    expect(state.capitals).toEqual({ p1: 0, p2: 0 });
    expect(state.rounds).toEqual([]);
    expect(state.pendingDarts).toEqual({ p1: [], p2: [] });
  });
});

describe('submitClassicRound', () => {
  it('capital round: sets initial capital from dart scores', () => {
    const state = initClassicState(players);
    const result = submitClassicRound(
      state,
      {
        p1: [sd(20), sd(20), sd(20)], // 60
        p2: [sd(1), sd(2), sd(3)],    // 6
      },
      players,
    );

    expect(result.currentRound).toBe(1);
    expect(result.capitals['p1']).toBe(60);
    expect(result.capitals['p2']).toBe(6);
    expect(result.rounds.length).toBe(1);
    expect(result.rounds[0].contractId).toBe('capital');
    expect(result.rounds[0].players['p1'].success).toBe(true);
  });

  it('hit: adds score to capital', () => {
    // Simulate round 0 (capital) first
    let state = initClassicState(players);
    state = submitClassicRound(
      state,
      { p1: [sd(20), sd(20), sd(20)], p2: [sd(5), sd(5), sd(5)] },
      players,
    );
    // Round 1 is contract "20"
    expect(state.currentRound).toBe(1);

    // p1 hits 20 (one dart on 20), p2 misses (no 20)
    const result = submitClassicRound(
      state,
      {
        p1: [sd(20), sd(1), sd(1)], // hits 20 contract, score = 20
        p2: [sd(1), sd(2), sd(3)],  // misses 20 contract
      },
      players,
    );

    expect(result.capitals['p1']).toBe(80); // 60 + 20
    expect(result.capitals['p2']).toBe(8);  // ceil(15 / 2) = 8
    expect(result.rounds[1].players['p1'].success).toBe(true);
    expect(result.rounds[1].players['p2'].success).toBe(false);
  });

  it('miss: halves capital with ceiling', () => {
    let state = initClassicState(['p1']);
    // Capital: 15
    state = submitClassicRound(state, { p1: [sd(5), sd(5), sd(5)] }, ['p1']);
    expect(state.capitals['p1']).toBe(15);

    // Round 1 (20): miss
    state = submitClassicRound(state, { p1: [sd(1), sd(2), sd(3)] }, ['p1']);
    expect(state.capitals['p1']).toBe(8); // ceil(15/2) = 8
  });

  it('clears pending darts after submission', () => {
    const state = initClassicState(players);
    const result = submitClassicRound(
      state,
      { p1: [sd(10)], p2: [sd(10)] },
      players,
    );
    expect(result.pendingDarts).toEqual({ p1: [], p2: [] });
  });
});

describe('undoClassicRound', () => {
  it('undoes the last round and restores capitals', () => {
    let state = initClassicState(players);
    state = submitClassicRound(
      state,
      { p1: [sd(20), sd(20), sd(20)], p2: [sd(5), sd(5), sd(5)] },
      players,
    );
    expect(state.currentRound).toBe(1);

    const undone = undoClassicRound(state, players);
    expect(undone.currentRound).toBe(0);
    expect(undone.capitals).toEqual({ p1: 0, p2: 0 });
    expect(undone.rounds.length).toBe(0);
  });

  it('does nothing when no rounds to undo', () => {
    const state = initClassicState(players);
    const undone = undoClassicRound(state, players);
    expect(undone).toBe(state); // same reference
  });

  it('restores intermediate capitals correctly after multiple rounds', () => {
    let state = initClassicState(['p1']);
    // Capital: 30
    state = submitClassicRound(state, { p1: [sd(10), sd(10), sd(10)] }, ['p1']);
    expect(state.capitals['p1']).toBe(30);

    // Round 1 (20): hit, +20 = 50
    state = submitClassicRound(state, { p1: [sd(20), sd(1), sd(1)] }, ['p1']);
    expect(state.capitals['p1']).toBe(50);

    // Undo round 1 -> back to 30
    const undone = undoClassicRound(state, ['p1']);
    expect(undone.capitals['p1']).toBe(30);
    expect(undone.currentRound).toBe(1);
  });
});

describe('isClassicComplete', () => {
  it('not complete at round 0', () => {
    expect(isClassicComplete(initClassicState(players))).toBe(false);
  });

  it('complete after 15 rounds', () => {
    const state = initClassicState(players);
    // Simulate currentRound reaching 15
    const completeState = { ...state, currentRound: 15 };
    expect(isClassicComplete(completeState)).toBe(true);
  });
});

describe('getClassicResults', () => {
  it('ranks players by capital descending', () => {
    const state = {
      ...initClassicState(['p1', 'p2', 'p3']),
      capitals: { p1: 100, p2: 250, p3: 150 },
    };
    const results = getClassicResults(state, ['p1', 'p2', 'p3']);
    expect(results[0]).toEqual({ playerId: 'p2', score: 250, rank: 1 });
    expect(results[1]).toEqual({ playerId: 'p3', score: 150, rank: 2 });
    expect(results[2]).toEqual({ playerId: 'p1', score: 100, rank: 3 });
  });

  it('tied players share the same rank', () => {
    const state = {
      ...initClassicState(['p1', 'p2']),
      capitals: { p1: 200, p2: 200 },
    };
    const results = getClassicResults(state, ['p1', 'p2']);
    expect(results[0].rank).toBe(1);
    expect(results[1].rank).toBe(1);
  });

  it('rank gaps correctly after ties', () => {
    const state = {
      ...initClassicState(['p1', 'p2', 'p3']),
      capitals: { p1: 200, p2: 200, p3: 100 },
    };
    const results = getClassicResults(state, ['p1', 'p2', 'p3']);
    expect(results[0].rank).toBe(1);
    expect(results[1].rank).toBe(1);
    expect(results[2].rank).toBe(3); // rank 3, not 2
  });
});
