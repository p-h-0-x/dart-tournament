import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Link } from 'react-router-dom';
import type { ClassicLiveState } from '../../models/types';

interface HighScoreEntry {
  playerId: string;
  playerName: string;
  score: number;
  gameId: string;
  completedAt: number;
  tournamentName?: string;
}

type Category = 'classic' | 'checkpoint';

function buildEntries(
  games: ReturnType<typeof useData>['games'],
  tournaments: ReturnType<typeof useData>['tournaments'],
  getPlayer: ReturnType<typeof useData>['getPlayer'],
  isCheckpoint: boolean,
): HighScoreEntry[] {
  const entries: HighScoreEntry[] = [];
  for (const g of games) {
    if (g.status !== 'completed' || g.mode !== 'classic') continue;
    const gameIsCheckpoint = (g.liveState as ClassicLiveState | undefined)?.checkpointSociety === true;
    if (gameIsCheckpoint !== isCheckpoint) continue;
    const tournament = g.tournamentId
      ? tournaments.find((t) => t.id === g.tournamentId)
      : undefined;
    for (const r of g.results) {
      entries.push({
        playerId: r.playerId,
        playerName: getPlayer(r.playerId)?.name ?? 'Unknown',
        score: r.score,
        gameId: g.id,
        completedAt: g.completedAt ?? g.createdAt,
        tournamentName: tournament?.name,
      });
    }
  }
  entries.sort((a, b) => b.score - a.score);
  return entries;
}

function getPersonalBests(entries: HighScoreEntry[]) {
  const map = new Map<string, HighScoreEntry>();
  for (const e of entries) {
    if (!map.has(e.playerId) || e.score > map.get(e.playerId)!.score) {
      map.set(e.playerId, e);
    }
  }
  return [...map.values()].sort((a, b) => b.score - a.score);
}

export default function HighScoresPage() {
  const { games, tournaments, getPlayer, loading } = useData();
  const [category, setCategory] = useState<Category>('classic');

  if (loading) {
    return <div className="loading"><div className="spinner" /> Loading high scores...</div>;
  }

  const classicEntries = buildEntries(games, tournaments, getPlayer, false);
  const checkpointEntries = buildEntries(games, tournaments, getPlayer, true);

  const entries = category === 'classic' ? classicEntries : checkpointEntries;
  const pbList = getPersonalBests(entries);
  const allTimeRecord = entries.length > 0 ? entries[0] : null;

  const hasCheckpoint = checkpointEntries.length > 0 || classicEntries.length > 0;

  return (
    <div>
      <div className="page-header">
        <h1>High Scores</h1>
        <p>Classic Halve-It best scores</p>
      </div>

      {/* Category tabs */}
      {hasCheckpoint && (
        <div className="tabs">
          <button
            className={`tab${category === 'classic' ? ' active' : ''}`}
            onClick={() => setCategory('classic')}
          >
            Classic
          </button>
          <button
            className={`tab${category === 'checkpoint' ? ' active' : ''}`}
            onClick={() => setCategory('checkpoint')}
          >
            Checkpoint Society
          </button>
        </div>
      )}

      {/* Stats */}
      {allTimeRecord && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--gold)' }}>{allTimeRecord.score}</div>
            <div className="stat-label">All-Time Record</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)', marginTop: '0.25rem' }}>
              ✨ {allTimeRecord.playerName} ✨
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{entries.length}</div>
            <div className="stat-label">Scores Recorded</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{pbList.length}</div>
            <div className="stat-label">Players</div>
          </div>
        </div>
      )}

      {/* Personal Bests */}
      <div className="card mb-4">
        <h2 className="card-title mb-4">Personal Bests</h2>
        {pbList.length === 0 ? (
          <p className="text-muted">
            No {category === 'checkpoint' ? 'Checkpoint Society' : 'Classic Halve-It'} games completed yet.
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Best Score</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {pbList.map((entry, idx) => (
                  <tr key={entry.playerId}>
                    <td>
                      <span className={`rank-${idx + 1}`}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>
                    </td>
                    <td>
                      <Link to={`/players/${entry.playerId}`} style={{ fontWeight: 500 }}>
                        {entry.playerName}
                      </Link>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--gold)' }}>{entry.score}</td>
                    <td className="text-sm text-muted">{new Date(entry.completedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All Scores */}
      <div className="card">
        <h2 className="card-title mb-4">All Scores</h2>
        {entries.length === 0 ? (
          <p className="text-muted">
            No {category === 'checkpoint' ? 'Checkpoint Society' : 'Classic Halve-It'} games completed yet.
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Score</th>
                  <th>Context</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => (
                  <tr key={`${entry.gameId}-${entry.playerId}`}>
                    <td className="text-muted">{idx + 1}</td>
                    <td>
                      <Link to={`/players/${entry.playerId}`} style={{ fontWeight: 500 }}>
                        {entry.playerName}
                      </Link>
                    </td>
                    <td style={{ fontWeight: 600, color: idx === 0 ? 'var(--gold)' : 'var(--text-primary)' }}>
                      {entry.score}
                    </td>
                    <td className="text-sm text-muted">
                      {entry.tournamentName ?? 'Standalone'}
                    </td>
                    <td className="text-sm text-muted">{new Date(entry.completedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
