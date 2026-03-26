import { useData } from '../../context/DataContext';
import { Link } from 'react-router-dom';

interface HighScoreEntry {
  playerId: string;
  playerName: string;
  score: number;
  gameId: string;
  completedAt: number;
  tournamentName?: string;
}

export default function HighScoresPage() {
  const { games, tournaments, getPlayer, loading } = useData();

  if (loading) {
    return <div className="loading"><div className="spinner" /> Loading high scores...</div>;
  }

  // Classic Halve-It high scores: every player result from completed classic games
  const classicEntries: HighScoreEntry[] = [];
  for (const g of games) {
    if (g.status !== 'completed' || g.mode !== 'classic') continue;
    const tournament = g.tournamentId
      ? tournaments.find((t) => t.id === g.tournamentId)
      : undefined;
    for (const r of g.results) {
      classicEntries.push({
        playerId: r.playerId,
        playerName: getPlayer(r.playerId)?.name ?? 'Unknown',
        score: r.score,
        gameId: g.id,
        completedAt: g.completedAt ?? g.createdAt,
        tournamentName: tournament?.name,
      });
    }
  }

  // Sort by score descending
  classicEntries.sort((a, b) => b.score - a.score);

  // Personal bests: highest score per player
  const personalBests = new Map<string, HighScoreEntry>();
  for (const entry of classicEntries) {
    if (!personalBests.has(entry.playerId) || entry.score > personalBests.get(entry.playerId)!.score) {
      personalBests.set(entry.playerId, entry);
    }
  }
  const pbList = [...personalBests.values()].sort((a, b) => b.score - a.score);

  const allTimeRecord = classicEntries.length > 0 ? classicEntries[0] : null;

  return (
    <div>
      <div className="page-header">
        <h1>High Scores</h1>
        <p>Classic Halve-It best scores</p>
      </div>

      {/* Stats */}
      {allTimeRecord && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--gold)' }}>{allTimeRecord.score}</div>
            <div className="stat-label">All-Time Record</div>
            <div className="text-sm text-muted">{allTimeRecord.playerName}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{classicEntries.length}</div>
            <div className="stat-label">Scores Recorded</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{personalBests.size}</div>
            <div className="stat-label">Players</div>
          </div>
        </div>
      )}

      {/* Personal Bests */}
      <div className="card mb-4">
        <h2 className="card-title mb-4">Personal Bests</h2>
        {pbList.length === 0 ? (
          <p className="text-muted">No Classic Halve-It games completed yet.</p>
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
        {classicEntries.length === 0 ? (
          <p className="text-muted">No Classic Halve-It games completed yet.</p>
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
                {classicEntries.map((entry, idx) => (
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
