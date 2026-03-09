import { describe, it, expect, vi } from 'vitest';
import type { Player, Game, Tournament } from '../models/types';

// Mock Firebase to prevent initialization errors
vi.mock('../services/firebase', () => ({
  auth: {},
  db: {},
  default: {},
}));

vi.mock('../services/database', () => ({
  onPlayersChange: vi.fn(() => () => {}),
  onGamesChange: vi.fn(() => () => {}),
  onTournamentsChange: vi.fn(() => () => {}),
}));

// Import after mocks are set up
const { computeLeaderboard } = await import('./DataContext');

const players: Player[] = [
  { id: 'p1', name: 'Alice', createdAt: 1000 },
  { id: 'p2', name: 'Bob', createdAt: 1001 },
  { id: 'p3', name: 'Charlie', createdAt: 1002 },
];

function makeGame(overrides: Partial<Game> & Pick<Game, 'id' | 'playerIds' | 'results'>): Game {
  return {
    mode: 'classic',
    status: 'completed',
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('computeLeaderboard', () => {
  it('returns empty array for no players', () => {
    expect(computeLeaderboard([], [], [])).toEqual([]);
  });

  it('returns entries for all players even with no games', () => {
    const board = computeLeaderboard(players, [], []);
    expect(board).toHaveLength(3);
    board.forEach((entry) => {
      expect(entry.wins).toBe(0);
      expect(entry.losses).toBe(0);
      expect(entry.gamesPlayed).toBe(0);
      expect(entry.winRate).toBe(0);
    });
  });

  it('correctly counts wins and losses', () => {
    const games: Game[] = [
      makeGame({
        id: 'g1',
        playerIds: ['p1', 'p2'],
        results: [
          { playerId: 'p1', score: 100, rank: 1 },
          { playerId: 'p2', score: 50, rank: 2 },
        ],
      }),
      makeGame({
        id: 'g2',
        playerIds: ['p1', 'p2'],
        results: [
          { playerId: 'p2', score: 100, rank: 1 },
          { playerId: 'p1', score: 50, rank: 2 },
        ],
      }),
    ];

    const board = computeLeaderboard(players, games, []);
    const alice = board.find((e) => e.player.id === 'p1')!;
    const bob = board.find((e) => e.player.id === 'p2')!;

    expect(alice.wins).toBe(1);
    expect(alice.losses).toBe(1);
    expect(alice.gamesPlayed).toBe(2);
    expect(alice.winRate).toBe(0.5);

    expect(bob.wins).toBe(1);
    expect(bob.losses).toBe(1);
  });

  it('ignores non-completed games', () => {
    const games: Game[] = [
      makeGame({
        id: 'g1',
        playerIds: ['p1', 'p2'],
        status: 'in_progress',
        results: [],
      }),
    ];

    const board = computeLeaderboard(players, games, []);
    expect(board.every((e) => e.gamesPlayed === 0)).toBe(true);
  });

  it('counts tournament wins', () => {
    const tournaments: Tournament[] = [
      {
        id: 't1',
        name: 'Tournament 1',
        gameMode: 'classic',
        playerIds: ['p1', 'p2', 'p3'],
        activePlayerIds: ['p1', 'p2', 'p3'],
        matches: [
          { round: 1, matchIndex: 0, playerIds: ['p1', 'p2'], winnerId: 'p1', status: 'completed' },
          { round: 1, matchIndex: 1, playerIds: ['p3'], winnerId: 'p3', status: 'completed' },
          { round: 2, matchIndex: 0, playerIds: ['p1', 'p3'], winnerId: 'p1', status: 'completed' },
        ],
        status: 'completed',
        createdAt: 1000,
        championId: 'p1',
      },
      {
        id: 't2',
        name: 'Tournament 2',
        gameMode: 'clock',
        playerIds: ['p1', 'p2'],
        activePlayerIds: ['p1', 'p2'],
        matches: [
          { round: 1, matchIndex: 0, playerIds: ['p1', 'p2'], winnerId: 'p2', status: 'completed' },
        ],
        status: 'completed',
        createdAt: 2000,
        championId: 'p2',
      },
    ];

    const board = computeLeaderboard(players, [], tournaments);
    const alice = board.find((e) => e.player.id === 'p1')!;
    const bob = board.find((e) => e.player.id === 'p2')!;
    const charlie = board.find((e) => e.player.id === 'p3')!;

    expect(alice.tournamentsWon).toBe(1);
    expect(alice.tournamentsPlayed).toBe(2);

    expect(bob.tournamentsWon).toBe(1);
    expect(bob.tournamentsPlayed).toBe(2);

    expect(charlie.tournamentsWon).toBe(0);
    expect(charlie.tournamentsPlayed).toBe(1);
  });

  it('counts wins and losses from tournament matches', () => {
    // Tournament: p1 beats p2, p3 gets bye, p1 beats p3 in final
    const tournaments: Tournament[] = [
      {
        id: 't1',
        name: 'Tournament 1',
        gameMode: 'classic',
        playerIds: ['p1', 'p2', 'p3'],
        activePlayerIds: ['p1', 'p2', 'p3'],
        matches: [
          { round: 1, matchIndex: 0, playerIds: ['p1', 'p2'], winnerId: 'p1', status: 'completed' },
          { round: 1, matchIndex: 1, playerIds: ['p3'], winnerId: 'p3', status: 'completed' },
          { round: 2, matchIndex: 0, playerIds: ['p1', 'p3'], winnerId: 'p1', status: 'completed' },
        ],
        status: 'completed',
        createdAt: 1000,
        championId: 'p1',
      },
    ];

    const board = computeLeaderboard(players, [], tournaments);
    const alice = board.find((e) => e.player.id === 'p1')!;
    const bob = board.find((e) => e.player.id === 'p2')!;
    const charlie = board.find((e) => e.player.id === 'p3')!;

    // Alice won both her matches (vs Bob in round 1, vs Charlie in final)
    expect(alice.wins).toBe(2);
    expect(alice.losses).toBe(0);
    expect(alice.gamesPlayed).toBe(2);

    // Bob lost to Alice in round 1
    expect(bob.wins).toBe(0);
    expect(bob.losses).toBe(1);
    expect(bob.gamesPlayed).toBe(1);

    // Charlie got bye in round 1 (only 1 player, no opponent), lost to Alice in final
    expect(charlie.wins).toBe(0);
    expect(charlie.losses).toBe(1);
    expect(charlie.gamesPlayed).toBe(1);
  });

  it('sorts by wins descending, then win rate', () => {
    const games: Game[] = [
      // Alice wins 2 games
      makeGame({
        id: 'g1',
        playerIds: ['p1', 'p2'],
        results: [
          { playerId: 'p1', score: 100, rank: 1 },
          { playerId: 'p2', score: 50, rank: 2 },
        ],
      }),
      makeGame({
        id: 'g2',
        playerIds: ['p1', 'p3'],
        results: [
          { playerId: 'p1', score: 100, rank: 1 },
          { playerId: 'p3', score: 50, rank: 2 },
        ],
      }),
      // Bob wins 1 game
      makeGame({
        id: 'g3',
        playerIds: ['p2', 'p3'],
        results: [
          { playerId: 'p2', score: 100, rank: 1 },
          { playerId: 'p3', score: 50, rank: 2 },
        ],
      }),
    ];

    const board = computeLeaderboard(players, games, []);

    expect(board[0].player.id).toBe('p1'); // 2 wins
    expect(board[1].player.id).toBe('p2'); // 1 win
    expect(board[2].player.id).toBe('p3'); // 0 wins
  });

  it('uses win rate as tiebreaker', () => {
    const games: Game[] = [
      // Alice: 1 win, 0 losses (100% win rate)
      makeGame({
        id: 'g1',
        playerIds: ['p1', 'p2'],
        results: [
          { playerId: 'p1', score: 100, rank: 1 },
          { playerId: 'p2', score: 50, rank: 2 },
        ],
      }),
      // Bob: 1 win, 1 loss (50% win rate)
      makeGame({
        id: 'g2',
        playerIds: ['p2', 'p3'],
        results: [
          { playerId: 'p2', score: 100, rank: 1 },
          { playerId: 'p3', score: 50, rank: 2 },
        ],
      }),
    ];

    const board = computeLeaderboard(players, games, []);

    // Both Alice and Bob have 1 win, but Alice has 100% win rate vs Bob's 50%
    expect(board[0].player.id).toBe('p1');
    expect(board[1].player.id).toBe('p2');
  });
});
