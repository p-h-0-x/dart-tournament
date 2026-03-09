import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TournamentsPage from './TournamentsPage';

vi.mock('../../context/DataContext', () => ({
  useData: vi.fn(),
}));

import { useData } from '../../context/DataContext';
const mockUseData = vi.mocked(useData);

function renderPage() {
  return render(
    <MemoryRouter>
      <TournamentsPage />
    </MemoryRouter>
  );
}

describe('TournamentsPage', () => {
  it('shows loading state', () => {
    mockUseData.mockReturnValue({
      tournaments: [],
      loading: true,
      players: [],
      games: [],
      leaderboard: [],
      getPlayer: () => undefined,
    });

    renderPage();
    expect(screen.getByText('Loading tournaments...')).toBeInTheDocument();
  });

  it('shows empty state when no tournaments', () => {
    mockUseData.mockReturnValue({
      tournaments: [],
      loading: false,
      players: [],
      games: [],
      leaderboard: [],
      getPlayer: () => undefined,
    });

    renderPage();
    expect(screen.getByText('No tournaments yet')).toBeInTheDocument();
  });

  it('renders tournament cards', () => {
    mockUseData.mockReturnValue({
      tournaments: [
        {
          id: 't1',
          name: 'Spring Championship',
          gameMode: 'classic',
          playerIds: ['p1', 'p2', 'p3'],
          activePlayerIds: ['p1', 'p2', 'p3'],
          matches: [],
          status: 'in_progress',
          createdAt: Date.now(),
        },
      ],
      loading: false,
      players: [],
      games: [],
      leaderboard: [],
      getPlayer: () => undefined,
    });

    renderPage();
    expect(screen.getByText('Spring Championship')).toBeInTheDocument();
    expect(screen.getByText('Classic Halve-It')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('3 players')).toBeInTheDocument();
  });

  it('shows champion name for completed tournament', () => {
    mockUseData.mockReturnValue({
      tournaments: [
        {
          id: 't1',
          name: 'Winter Cup',
          gameMode: 'killer',
          playerIds: ['p1', 'p2', 'p3'],
          activePlayerIds: ['p1', 'p2', 'p3'],
          matches: [],
          status: 'completed',
          createdAt: Date.now(),
          championId: 'p1',
        },
      ],
      loading: false,
      players: [{ id: 'p1', name: 'Alice', createdAt: 1000 }],
      games: [],
      leaderboard: [],
      getPlayer: (id: string) =>
        id === 'p1' ? { id: 'p1', name: 'Alice', createdAt: 1000 } : undefined,
    });

    renderPage();
    expect(screen.getByText(/Champion: Alice/)).toBeInTheDocument();
  });
});
