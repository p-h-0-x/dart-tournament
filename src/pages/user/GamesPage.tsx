import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { GAME_MODE_LABELS, type GameMode } from '../../models/types';
import { getRoundName, getTotalRounds } from '../../engines/tournament';

interface GameEntry {
  id: string;
  date: number;
  mode: GameMode;
  playerIds: string[];
  winnerPlayerId?: string;
  status: 'pending' | 'in_progress' | 'completed';
  tournamentName?: string;
  /** True if this entry has a Firestore game document (with liveState/turn history). */
  hasGameDoc: boolean;
}

export default function GamesPage() {
  const { games, tournaments, getPlayer, loading } = useData();
  const [modeFilter, setModeFilter] = useState<GameMode | 'all'>('all');

  if (loading) {
    return <div className="loading"><div className="spinner" /> Loading games...</div>;
  }

  // Collect game IDs linked to tournament matches to avoid duplicates
  const tournamentGameIds = new Set<string>();
  for (const t of tournaments) {
    for (const m of t.matches ?? []) {
      if (m.gameId) tournamentGameIds.add(m.gameId);
    }
  }

  // Build unified list: all games + tournament matches without a linked game
  const entries: GameEntry[] = [];

  // Add all games (standalone and tournament-linked)
  for (const g of games) {
    const winner = g.results.find((r) => r.rank === 1);
    entries.push({
      id: g.id,
      date: g.completedAt ?? g.createdAt,
      mode: g.mode,
      playerIds: g.playerIds,
      winnerPlayerId: winner?.playerId,
      status: g.status,
      tournamentName: g.tournamentId
        ? tournaments.find((t) => t.id === g.tournamentId)?.name
        : undefined,
      hasGameDoc: true,
    });
  }

  // Add tournament matches (that don't have a linked game)
  for (const t of tournaments) {
    if (!t.matches?.length) continue;
    const totalRounds = getTotalRounds(t.matches);
    for (const m of t.matches) {
      if (m.gameId) continue; // already added from games list
      if (m.playerIds.length < 2) continue; // skip byes
      entries.push({
        id: `${t.id}-${m.round}-${m.matchIndex}`,
        date: t.completedAt ?? t.createdAt,
        mode: t.gameMode,
        playerIds: m.playerIds,
        winnerPlayerId: m.winnerId,
        status: m.status,
        tournamentName: `${t.name} - ${getRoundName(m.round, totalRounds)}`,
        hasGameDoc: false,
      });
    }
  }

  // Sort by date descending
  entries.sort((a, b) => b.date - a.date);

  const filtered = modeFilter === 'all'
    ? entries
    : entries.filter((e) => e.mode === modeFilter);

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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr key={entry.id}>
                    <td className="text-sm text-muted">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td>
                      <span className="mode-tag">{GAME_MODE_LABELS[entry.mode]}</span>
                      {entry.tournamentName && (
                        <div className="text-sm text-muted">{entry.tournamentName}</div>
                      )}
                    </td>
                    <td>{entry.playerIds.map((pid) => getPlayer(pid)?.name ?? '?').join(', ')}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                      {entry.winnerPlayerId ? getPlayer(entry.winnerPlayerId)?.name : '-'}
                    </td>
                    <td>
                      {entry.status === 'completed' ? (
                        <span className="badge badge-success">Done</span>
                      ) : entry.status === 'in_progress' ? (
                        <Link to={`/games/${entry.id}`} className="badge badge-warning" style={{ textDecoration: 'none' }}>
                          Watch Live
                        </Link>
                      ) : (
                        <span className="badge badge-info">Pending</span>
                      )}
                    </td>
                    <td>
                      {entry.hasGameDoc && (
                        <Link to={`/games/${entry.id}`} className="btn btn-outline btn-sm">
                          View
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
