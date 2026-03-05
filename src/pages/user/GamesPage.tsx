import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { GAME_MODE_LABELS, type GameMode } from '../../models/types';

export default function GamesPage() {
  const { games, getPlayer, loading } = useData();
  const [modeFilter, setModeFilter] = useState<GameMode | 'all'>('all');

  if (loading) {
    return <div className="loading"><div className="spinner" /> Loading games...</div>;
  }

  const filtered = modeFilter === 'all'
    ? games
    : games.filter((g) => g.mode === modeFilter);

  return (
    <div>
      <div className="page-header">
        <h1>Games History</h1>
        <p>All game results across all modes</p>
      </div>

      <div className="tabs">
        <button
          className={`tab${modeFilter === 'all' ? ' active' : ''}`}
          onClick={() => setModeFilter('all')}
        >
          All
        </button>
        {(Object.keys(GAME_MODE_LABELS) as GameMode[]).map((mode) => (
          <button
            key={mode}
            className={`tab${modeFilter === mode ? ' active' : ''}`}
            onClick={() => setModeFilter(mode)}
          >
            {GAME_MODE_LABELS[mode]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">🎮</div>
          <p>No games recorded yet</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mode</th>
                  <th>Players</th>
                  <th>Winner</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((game) => {
                  const winner = game.results.find((r) => r.rank === 1);
                  return (
                    <tr key={game.id}>
                      <td className="text-sm text-muted">
                        {new Date(game.createdAt).toLocaleDateString()}
                      </td>
                      <td><span className="mode-tag">{GAME_MODE_LABELS[game.mode]}</span></td>
                      <td>{game.playerIds.map((pid) => getPlayer(pid)?.name ?? '?').join(', ')}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                        {winner ? getPlayer(winner.playerId)?.name : '-'}
                      </td>
                      <td>
                        {game.status === 'completed' ? (
                          <span className="badge badge-success">Done</span>
                        ) : game.status === 'in_progress' ? (
                          <span className="badge badge-warning">Live</span>
                        ) : (
                          <span className="badge badge-info">Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
