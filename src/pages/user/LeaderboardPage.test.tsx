import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LeaderboardPage from './LeaderboardPage';

// Mock the useData hook
vi.mock('../../context/DataContext', () => ({
  useData: vi.fn(),
}));

import { useData } from '../../context/DataContext';
const mockUseData = vi.mocked(useData);

function renderPage() {
  return render(
    <MemoryRouter>
      <LeaderboardPage />
    </MemoryRouter>
  );
}

describe('LeaderboardPage', () => {
  it('shows loading state', () => {
    mockUseData.mockReturnValue({
      leaderboard: [],
      loading: true,
      players: [],
      games: [],
      tournaments: [],
      getPlayer: () => undefined,
    });

    renderPage();
    expect(screen.getByText('Loading leaderboard...')).toBeInTheDocument();
  });

  it('shows empty state when no players', () => {
    mockUseData.mockReturnValue({
      leaderboard: [],
      loading: false,
      players: [],
      games: [],
      tournaments: [],
      getPlayer: () => undefined,
    });

    renderPage();
    expect(screen.getByText('No players registered yet')).toBeInTheDocument();
  });

  it('renders leaderboard with player data', () => {
    mockUseData.mockReturnValue({
      leaderboard: [
        {
          player: { id: 'p1', name: 'Alice', createdAt: 1000 },
          wins: 5,
          losses: 2,
          gamesPlayed: 7,
          tournamentsWon: 1,
          tournamentsPlayed: 2,
          winRate: 5 / 7,
        },
        {
          player: { id: 'p2', name: 'Bob', createdAt: 1001 },
          wins: 3,
          losses: 4,
          gamesPlayed: 7,
          tournamentsWon: 0,
          tournamentsPlayed: 2,
          winRate: 3 / 7,
        },
      ],
      loading: false,
      players: [],
      games: [],
      tournaments: [],
      getPlayer: () => undefined,
    });

    renderPage();

    // Check header
    expect(screen.getByText('Leaderboard')).toBeInTheDocument();

    // Check player names are rendered
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    // Check stats
    expect(screen.getByText('Total Players')).toBeInTheDocument();
    expect(screen.getByText('Games Played')).toBeInTheDocument();
    expect(screen.getByText('Tournaments')).toBeInTheDocument();
  });

  it('renders stat summary cards with correct totals', () => {
    mockUseData.mockReturnValue({
      leaderboard: [
        {
          player: { id: 'p1', name: 'Alice', createdAt: 1000 },
          wins: 5,
          losses: 2,
          gamesPlayed: 7,
          tournamentsWon: 1,
          tournamentsPlayed: 2,
          winRate: 5 / 7,
        },
        {
          player: { id: 'p2', name: 'Bob', createdAt: 1001 },
          wins: 3,
          losses: 4,
          gamesPlayed: 3,
          tournamentsWon: 0,
          tournamentsPlayed: 1,
          winRate: 3 / 7,
        },
      ],
      loading: false,
      players: [],
      games: [],
      tournaments: [],
      getPlayer: () => undefined,
    });

    renderPage();

    // Check stat cards contain correct totals
    const statCards = document.querySelectorAll('.stat-card');
    expect(statCards).toHaveLength(3);

    // Total Players = 2
    expect(statCards[0].querySelector('.stat-value')!.textContent).toBe('2');
    // Games Played = 7 + 3 = 10
    expect(statCards[1].querySelector('.stat-value')!.textContent).toBe('10');
    // Tournaments = 2 + 1 = 3
    expect(statCards[2].querySelector('.stat-value')!.textContent).toBe('3');
  });

  it('renders player links pointing to player detail', () => {
    mockUseData.mockReturnValue({
      leaderboard: [
        {
          player: { id: 'p1', name: 'Alice', createdAt: 1000 },
          wins: 1, losses: 0, gamesPlayed: 1,
          tournamentsWon: 0, tournamentsPlayed: 0, winRate: 1,
        },
      ],
      loading: false,
      players: [],
      games: [],
      tournaments: [],
      getPlayer: () => undefined,
    });

    renderPage();
    const link = screen.getByText('Alice').closest('a');
    expect(link).toHaveAttribute('href', '/players/p1');
  });

  it('shows win rate as percentage', () => {
    mockUseData.mockReturnValue({
      leaderboard: [
        {
          player: { id: 'p1', name: 'Alice', createdAt: 1000 },
          wins: 3, losses: 1, gamesPlayed: 4,
          tournamentsWon: 0, tournamentsPlayed: 0, winRate: 0.75,
        },
      ],
      loading: false,
      players: [],
      games: [],
      tournaments: [],
      getPlayer: () => undefined,
    });

    renderPage();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});
