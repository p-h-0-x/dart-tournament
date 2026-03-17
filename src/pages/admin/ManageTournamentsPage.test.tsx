import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { Tournament, Player } from '../../models/types';

const mockUpdateTournament = vi.fn();
const mockAddTournament = vi.fn();
const mockDeleteTournament = vi.fn();

vi.mock('../../services/firebase', () => ({
  auth: {},
  db: {},
  default: {},
}));

vi.mock('../../services/database', () => ({
  addTournament: (...args: unknown[]) => mockAddTournament(...args),
  updateTournament: (...args: unknown[]) => mockUpdateTournament(...args),
  deleteTournament: (...args: unknown[]) => mockDeleteTournament(...args),
  onPlayersChange: vi.fn(() => () => {}),
  onGamesChange: vi.fn(() => () => {}),
  onTournamentsChange: vi.fn(() => () => {}),
}));

const players: Player[] = [
  { id: 'p1', name: 'Alice', createdAt: 1000 },
  { id: 'p2', name: 'Bob', createdAt: 1001 },
  { id: 'p3', name: 'Charlie', createdAt: 1002 },
  { id: 'p4', name: 'Diana', createdAt: 1003 },
];

function getPlayer(id: string) {
  return players.find((p) => p.id === id);
}

let mockTournaments: Tournament[] = [];

vi.mock('../../context/DataContext', () => ({
  useData: () => ({
    players,
    tournaments: mockTournaments,
    games: [],
    getPlayer,
    loading: false,
  }),
}));

const { default: ManageTournamentsPage } = await import('./ManageTournamentsPage');

function renderPage() {
  return render(
    <MemoryRouter>
      <ManageTournamentsPage />
    </MemoryRouter>
  );
}

describe('ManageTournamentsPage — flexible round planning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateTournament.mockResolvedValue(undefined);
  });

  it('shows "Add Match to Round 1" when tournament has no matches', () => {
    mockTournaments = [{
      id: 't1',
      name: 'Test Tournament',
      gameMode: 'classic',
      playerIds: ['p1', 'p2', 'p3', 'p4'],
      activePlayerIds: ['p1', 'p2', 'p3', 'p4'],
      matches: [],
      status: 'in_progress',
      createdAt: Date.now(),
    }];

    renderPage();
    expect(screen.getByText('+ Add Match to Round 1')).toBeInTheDocument();
  });

  it('stays on round 1 after a match is completed (no auto-advance)', async () => {
    // Tournament has one completed match in round 1
    mockTournaments = [{
      id: 't1',
      name: 'Test Tournament',
      gameMode: 'classic',
      playerIds: ['p1', 'p2', 'p3', 'p4'],
      activePlayerIds: ['p1', 'p2', 'p3', 'p4'],
      matches: [
        { round: 1, matchIndex: 0, playerIds: ['p1', 'p2'], status: 'completed', winnerId: 'p1' },
      ],
      status: 'in_progress',
      createdAt: Date.now(),
    }];

    renderPage();

    // Should still show Round 1 for adding matches, NOT Round 2
    expect(screen.getByText('+ Add Match to Round 1')).toBeInTheDocument();
    expect(screen.queryByText('+ Add Match to Round 2')).not.toBeInTheDocument();
  });

  it('shows "Start Round 2" button inside match UI when round 1 is complete', async () => {
    mockTournaments = [{
      id: 't1',
      name: 'Test Tournament',
      gameMode: 'classic',
      playerIds: ['p1', 'p2', 'p3', 'p4'],
      activePlayerIds: ['p1', 'p2', 'p3', 'p4'],
      matches: [
        { round: 1, matchIndex: 0, playerIds: ['p1', 'p2'], status: 'completed', winnerId: 'p1' },
      ],
      status: 'in_progress',
      createdAt: Date.now(),
    }];

    const user = userEvent.setup();
    renderPage();

    // Open the match UI
    await user.click(screen.getByText('+ Add Match to Round 1'));

    // Should see "Start Round 2" button
    expect(screen.getByText('Start Round 2')).toBeInTheDocument();
  });

  it('switches to round 2 planning when "Start Round 2" is clicked', async () => {
    mockTournaments = [{
      id: 't1',
      name: 'Test Tournament',
      gameMode: 'classic',
      playerIds: ['p1', 'p2', 'p3', 'p4'],
      activePlayerIds: ['p1', 'p2', 'p3', 'p4'],
      matches: [
        { round: 1, matchIndex: 0, playerIds: ['p1', 'p2'], status: 'completed', winnerId: 'p1' },
        { round: 1, matchIndex: 1, playerIds: ['p3', 'p4'], status: 'completed', winnerId: 'p3' },
      ],
      status: 'in_progress',
      createdAt: Date.now(),
    }];

    const user = userEvent.setup();
    renderPage();

    // Open match UI
    await user.click(screen.getByText('+ Add Match to Round 1'));

    // Click "Start Round 2"
    await user.click(screen.getByText('Start Round 2'));

    // Should now show Round 2 heading and back button
    expect(screen.getByText('Round 2 — Add Match')).toBeInTheDocument();
    expect(screen.getByText('Back to Round 1')).toBeInTheDocument();
  });

  it('can go back to current round after clicking "Start Round N"', async () => {
    mockTournaments = [{
      id: 't1',
      name: 'Test Tournament',
      gameMode: 'classic',
      playerIds: ['p1', 'p2', 'p3', 'p4'],
      activePlayerIds: ['p1', 'p2', 'p3', 'p4'],
      matches: [
        { round: 1, matchIndex: 0, playerIds: ['p1', 'p2'], status: 'completed', winnerId: 'p1' },
      ],
      status: 'in_progress',
      createdAt: Date.now(),
    }];

    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText('+ Add Match to Round 1'));
    await user.click(screen.getByText('Start Round 2'));

    expect(screen.getByText('Round 2 — Add Match')).toBeInTheDocument();

    // Go back
    await user.click(screen.getByText('Back to Round 1'));
    expect(screen.getByText('Round 1 — Add Match')).toBeInTheDocument();
  });

  it('does not show "Start Round" button when current round has pending matches', async () => {
    mockTournaments = [{
      id: 't1',
      name: 'Test Tournament',
      gameMode: 'classic',
      playerIds: ['p1', 'p2', 'p3', 'p4'],
      activePlayerIds: ['p1', 'p2', 'p3', 'p4'],
      matches: [
        { round: 1, matchIndex: 0, playerIds: ['p1', 'p2'], status: 'pending' },
      ],
      status: 'in_progress',
      createdAt: Date.now(),
    }];

    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText('+ Add Match to Round 1'));

    // Should NOT see a "Start Round 2" button since round 1 isn't complete
    expect(screen.queryByText('Start Round 2')).not.toBeInTheDocument();
  });

  it('allows selecting players and adding a match', async () => {
    mockTournaments = [{
      id: 't1',
      name: 'Test Tournament',
      gameMode: 'classic',
      playerIds: ['p1', 'p2', 'p3', 'p4'],
      activePlayerIds: ['p1', 'p2', 'p3', 'p4'],
      matches: [],
      status: 'in_progress',
      createdAt: Date.now(),
    }];

    const user = userEvent.setup();
    renderPage();

    // Open match UI
    await user.click(screen.getByText('+ Add Match to Round 1'));

    // Select two players
    await user.click(screen.getByRole('button', { name: 'Alice' }));
    await user.click(screen.getByRole('button', { name: 'Bob' }));

    // Click add match
    await user.click(screen.getByText('Add Match (2 players)'));

    expect(mockUpdateTournament).toHaveBeenCalledWith('t1', {
      matches: expect.arrayContaining([
        expect.objectContaining({
          round: 1,
          matchIndex: 0,
          playerIds: ['p1', 'p2'],
          status: 'pending',
        }),
      ]),
    });
  });

  it('shows pending matches with winner selection buttons', async () => {
    mockTournaments = [{
      id: 't1',
      name: 'Test Tournament',
      gameMode: 'classic',
      playerIds: ['p1', 'p2'],
      activePlayerIds: ['p1', 'p2'],
      matches: [
        { round: 1, matchIndex: 0, playerIds: ['p1', 'p2'], status: 'pending' },
      ],
      status: 'in_progress',
      createdAt: Date.now(),
    }];

    renderPage();

    // Should show "Round 1 - Select Winners" section
    expect(screen.getByText('Round 1 - Select Winners')).toBeInTheDocument();

    // Should show buttons for each player in the pending match
    const winnerSection = screen.getByText('Round 1 - Select Winners').closest('div')!;
    const aliceBtn = within(winnerSection).getByRole('button', { name: 'Alice' });
    const bobBtn = within(winnerSection).getByRole('button', { name: 'Bob' });
    expect(aliceBtn).toBeInTheDocument();
    expect(bobBtn).toBeInTheDocument();
  });

  it('calls updateTournament with winner when selecting a winner', async () => {
    mockTournaments = [{
      id: 't1',
      name: 'Test Tournament',
      gameMode: 'classic',
      playerIds: ['p1', 'p2'],
      activePlayerIds: ['p1', 'p2'],
      matches: [
        { round: 1, matchIndex: 0, playerIds: ['p1', 'p2'], status: 'pending' },
      ],
      status: 'in_progress',
      createdAt: Date.now(),
    }];

    const user = userEvent.setup();
    renderPage();

    const winnerSection = screen.getByText('Round 1 - Select Winners').closest('div')!;
    await user.click(within(winnerSection).getByRole('button', { name: 'Alice' }));

    expect(mockUpdateTournament).toHaveBeenCalledWith('t1', {
      matches: expect.arrayContaining([
        expect.objectContaining({
          round: 1,
          matchIndex: 0,
          winnerId: 'p1',
          status: 'completed',
        }),
      ]),
    });
  });
});
