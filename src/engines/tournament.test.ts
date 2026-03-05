import { describe, it, expect } from 'vitest';
import { generateBracket, advanceWinner, getRoundName, getTotalRounds } from './tournament';

describe('generateBracket', () => {
  it('throws with fewer than 3 players', () => {
    expect(() => generateBracket(['a', 'b'])).toThrow('Need at least 3 players');
    expect(() => generateBracket(['a'])).toThrow();
    expect(() => generateBracket([])).toThrow();
  });

  it('generates correct bracket for 4 players (power of 2)', () => {
    const matches = generateBracket(['a', 'b', 'c', 'd']);
    // 4 players = bracket size 4, 2 rounds
    // Round 1: 2 matches, Round 2: 1 match (final)
    const round1 = matches.filter((m) => m.round === 1);
    const round2 = matches.filter((m) => m.round === 2);

    expect(round1).toHaveLength(2);
    expect(round2).toHaveLength(1);
    expect(getTotalRounds(matches)).toBe(2);

    // All 4 players should be in round 1
    const allR1Players = round1.flatMap((m) => m.playerIds);
    expect(allR1Players).toHaveLength(4);
    expect(allR1Players).toContain('a');
    expect(allR1Players).toContain('b');
    expect(allR1Players).toContain('c');
    expect(allR1Players).toContain('d');

    // No completed matches yet (no byes)
    expect(round1.every((m) => m.status === 'pending')).toBe(true);
    // Round 2 has no players yet
    expect(round2[0].playerIds).toHaveLength(0);
  });

  it('generates correct bracket for 3 players (with 1 bye)', () => {
    const matches = generateBracket(['a', 'b', 'c']);
    // 3 players → bracket size 4, 2 rounds
    const round1 = matches.filter((m) => m.round === 1);
    const round2 = matches.filter((m) => m.round === 2);

    expect(round1).toHaveLength(2);
    expect(round2).toHaveLength(1);

    // One match should be a bye (1 player, auto-completed)
    const byeMatch = round1.find((m) => m.playerIds.length === 1);
    expect(byeMatch).toBeDefined();
    expect(byeMatch!.status).toBe('completed');
    expect(byeMatch!.winnerId).toBe(byeMatch!.playerIds[0]);

    // The bye winner should be propagated to round 2
    expect(round2[0].playerIds).toContain(byeMatch!.winnerId);
  });

  it('generates correct bracket for 5 players (with 3 byes)', () => {
    const matches = generateBracket(['a', 'b', 'c', 'd', 'e']);
    // 5 players → bracket size 8, 3 rounds
    const round1 = matches.filter((m) => m.round === 1);
    const round2 = matches.filter((m) => m.round === 2);
    const round3 = matches.filter((m) => m.round === 3);

    expect(round1).toHaveLength(4);
    expect(round2).toHaveLength(2);
    expect(round3).toHaveLength(1);
    expect(getTotalRounds(matches)).toBe(3);

    // Should have 3 bye matches in round 1
    const byeMatches = round1.filter((m) => m.playerIds.length === 1);
    expect(byeMatches).toHaveLength(3);

    // All bye matches should be completed
    byeMatches.forEach((m) => {
      expect(m.status).toBe('completed');
      expect(m.winnerId).toBeDefined();
    });
  });

  it('generates correct bracket for 8 players (power of 2)', () => {
    const players = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const matches = generateBracket(players);
    // 8 players → bracket size 8, 3 rounds
    const round1 = matches.filter((m) => m.round === 1);
    const round2 = matches.filter((m) => m.round === 2);
    const round3 = matches.filter((m) => m.round === 3);

    expect(round1).toHaveLength(4);
    expect(round2).toHaveLength(2);
    expect(round3).toHaveLength(1);

    // All round 1 matches should have 2 players (no byes)
    round1.forEach((m) => {
      expect(m.playerIds).toHaveLength(2);
      expect(m.status).toBe('pending');
    });

    // No players advanced yet
    round2.forEach((m) => expect(m.playerIds).toHaveLength(0));
    round3.forEach((m) => expect(m.playerIds).toHaveLength(0));
  });

  it('includes all players exactly once', () => {
    const players = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
    const matches = generateBracket(players);
    const round1 = matches.filter((m) => m.round === 1);
    const allPlayers = round1.flatMap((m) => m.playerIds);

    // Each player appears exactly once
    players.forEach((p) => {
      expect(allPlayers.filter((x) => x === p)).toHaveLength(1);
    });
  });
});

describe('advanceWinner', () => {
  it('marks current match as completed with winner', () => {
    const matches = generateBracket(['a', 'b', 'c', 'd']);
    const updated = advanceWinner(matches, 1, 0, 'a');

    const match = updated.find((m) => m.round === 1 && m.matchIndex === 0);
    expect(match!.winnerId).toBe('a');
    expect(match!.status).toBe('completed');
  });

  it('adds winner to the next round match', () => {
    const matches = generateBracket(['a', 'b', 'c', 'd']);
    const updated = advanceWinner(matches, 1, 0, 'a');

    const nextMatch = updated.find((m) => m.round === 2 && m.matchIndex === 0);
    expect(nextMatch!.playerIds).toContain('a');
  });

  it('both round 1 winners feed into the same round 2 match', () => {
    const matches = generateBracket(['a', 'b', 'c', 'd']);
    let updated = advanceWinner(matches, 1, 0, 'a');
    updated = advanceWinner(updated, 1, 1, 'c');

    const finalMatch = updated.find((m) => m.round === 2 && m.matchIndex === 0);
    expect(finalMatch!.playerIds).toContain('a');
    expect(finalMatch!.playerIds).toContain('c');
    expect(finalMatch!.playerIds).toHaveLength(2);
  });

  it('does not add winner to next round if already there', () => {
    const matches = generateBracket(['a', 'b', 'c', 'd']);
    let updated = advanceWinner(matches, 1, 0, 'a');
    // Advance same winner again (idempotent)
    updated = advanceWinner(updated, 1, 0, 'a');

    const finalMatch = updated.find((m) => m.round === 2 && m.matchIndex === 0);
    expect(finalMatch!.playerIds.filter((p) => p === 'a')).toHaveLength(1);
  });

  it('does not modify the original matches array', () => {
    const matches = generateBracket(['a', 'b', 'c', 'd']);
    const round1Match0 = matches.find((m) => m.round === 1 && m.matchIndex === 0);
    const originalStatus = round1Match0!.status;

    advanceWinner(matches, 1, 0, 'a');

    // Original should be unchanged
    expect(round1Match0!.status).toBe(originalStatus);
    expect(round1Match0!.winnerId).toBeUndefined();
  });

  it('full tournament flow with 4 players', () => {
    const matches = generateBracket(['a', 'b', 'c', 'd']);

    // Round 1
    let updated = advanceWinner(matches, 1, 0, 'a');
    updated = advanceWinner(updated, 1, 1, 'd');

    // Final
    updated = advanceWinner(updated, 2, 0, 'a');

    const finalMatch = updated.find((m) => m.round === 2 && m.matchIndex === 0);
    expect(finalMatch!.winnerId).toBe('a');
    expect(finalMatch!.status).toBe('completed');
  });
});

describe('getRoundName', () => {
  it('returns Final for last round', () => {
    expect(getRoundName(3, 3)).toBe('Final');
  });

  it('returns Semifinals for second-to-last', () => {
    expect(getRoundName(2, 3)).toBe('Semifinals');
  });

  it('returns Quarterfinals for third-to-last', () => {
    expect(getRoundName(1, 3)).toBe('Quarterfinals');
  });

  it('returns Round N for earlier rounds', () => {
    expect(getRoundName(1, 5)).toBe('Round 1');
    expect(getRoundName(2, 5)).toBe('Round 2');
  });

  it('2-round tournament: Semifinals + Final', () => {
    expect(getRoundName(1, 2)).toBe('Semifinals');
    expect(getRoundName(2, 2)).toBe('Final');
  });
});

describe('getTotalRounds', () => {
  it('returns the max round number', () => {
    const matches = generateBracket(['a', 'b', 'c', 'd']);
    expect(getTotalRounds(matches)).toBe(2);
  });

  it('returns 3 for 8-player bracket', () => {
    const matches = generateBracket(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    expect(getTotalRounds(matches)).toBe(3);
  });
});
