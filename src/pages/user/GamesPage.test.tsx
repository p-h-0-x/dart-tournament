import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import GamesPage from './GamesPage';

vi.mock('../../context/DataContext', () => ({
  useData: vi.fn(),
}));

import { useData } from '../../context/DataContext';
const mockUseData = vi.mocked(useData);

function renderPage() {
  return render(
    <MemoryRouter>
      <GamesPage />
    </MemoryRouter>
  );
}

const mockGames = [
  {
    id: 'g1',
    mode: 'classic' as const,
    playerIds: ['p1', 'p2'],
    results: [{ playerId: 'p1', score: 100, rank: 1 }, { playerId: 'p2', score: 50, rank: 2 }],
    status: 'completed' as const,
    createdAt: Date.now(),
  },
  {
    id: 'g2',
    mode: 'killer' as const,
    playerIds: ['p1', 'p3'],
    results: [],
    status: 'in_progress' as const,
    createdAt: Date.now(),
  },
];

describe('GamesPage', () => {
  it('shows loading state', () => {
    mockUseData.mockReturnValue({
      games: [],
      loading: true,
      players: [],
      tournaments: [],
      leaderboard: [],
      getPlayer: () => undefined,
    });

    renderPage();
    expect(screen.getByText('Loading games...')).toBeInTheDocument();
  });

  it('shows empty state when no games', () => {
    mockUseData.mockReturnValue({
      games: [],
      loading: false,
      players: [],
      tournaments: [],
      leaderboard: [],
      getPlayer: () => undefined,
    });

    renderPage();
    expect(screen.getByText('No games recorded yet')).toBeInTheDocument();
  });

  it('renders game list', () => {
    mockUseData.mockReturnValue({
      games: mockGames,
      loading: false,
      players: [],
      tournaments: [],
      leaderboard: [],
      getPlayer: (id: string) => {
        const map: Record<string, any> = {
          p1: { id: 'p1', name: 'Alice', createdAt: 1000 },
          p2: { id: 'p2', name: 'Bob', createdAt: 1001 },
          p3: { id: 'p3', name: 'Charlie', createdAt: 1002 },
        };
        return map[id];
      },
    });

    renderPage();
    // Mode tags and tabs both render game mode names, so check for multiple
    expect(screen.getAllByText('Classic Halve-It').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Killer').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('Watch Live')).toBeInTheDocument();
  });

  it('filters games by mode', async () => {
    const user = userEvent.setup();

    mockUseData.mockReturnValue({
      games: mockGames,
      loading: false,
      players: [],
      tournaments: [],
      leaderboard: [],
      getPlayer: (id: string) => {
        const map: Record<string, any> = {
          p1: { id: 'p1', name: 'Alice', createdAt: 1000 },
          p2: { id: 'p2', name: 'Bob', createdAt: 1001 },
          p3: { id: 'p3', name: 'Charlie', createdAt: 1002 },
        };
        return map[id];
      },
    });

    renderPage();

    // Click "Killer" tab
    const killerTab = screen.getByRole('button', { name: 'Killer' });
    await user.click(killerTab);

    // The "Classic Halve-It" tab still exists, but the mode-tag in the table should not
    // Check that only 1 row remains (killer), not 2
    const modeTags = document.querySelectorAll('.mode-tag');
    expect(modeTags).toHaveLength(1);
    expect(modeTags[0].textContent).toBe('Killer');
  });
});
