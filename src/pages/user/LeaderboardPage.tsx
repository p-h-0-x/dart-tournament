import { Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';

export default function LeaderboardPage() {
  const { leaderboard, games, tournaments, loading } = useData();

  // Count unique completed games + completed tournament matches (with 2+ players, no linked game)
  const completedGameCount = games.filter((g) => g.status === 'completed').length;
  const tournamentGameIds = new Set<string>();
  let tournamentMatchCount = 0;
  for (const t of tournaments) {
    for (const m of t.matches ?? []) {
      if (m.gameId) tournamentGameIds.add(m.gameId);
      else if (m.status === 'completed' && m.playerIds.length >= 2) tournamentMatchCount++;
    }
  }
  const totalGamesPlayed = completedGameCount + tournamentMatchCount;

  if (loading) {
    return <div className="loading"><div className="spinner" /> Loading leaderboard...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Leaderboard</h1>
        <p>Overall player rankings across all games and tournaments</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{leaderboard.length}</div>
          <div className="stat-label">Total Players</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalGamesPlayed}</div>
          <div className="stat-label">Games Played</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{tournaments.length}</div>
          <div className="stat-label">Tournaments</div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Wins</th>
                <th>Losses</th>
                <th>Games</th>
                <th>Win Rate</th>
                <th>Tournaments Won</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted" style={{ padding: '2rem' }}>
                    No players registered yet
                  </td>
                </tr>
              ) : (
                leaderboard.map((entry, idx) => (
                  <tr key={entry.player.id}>
                    <td>
                      <span className={`rank-${idx + 1}`}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>
                    </td>
                    <td>
                      <Link to={`/players/${entry.player.id}`} style={{ fontWeight: 500 }}>
                        {entry.player.name}
                      </Link>
                    </td>
                    <td style={{ color: 'var(--success)' }}>{entry.wins}</td>
                    <td style={{ color: 'var(--danger)' }}>{entry.losses}</td>
                    <td>{entry.gamesPlayed}</td>
                    <td>{(entry.winRate * 100).toFixed(0)}%</td>
                    <td>
                      {entry.tournamentsWon > 0 && (
                        <span className="badge badge-warning">
                          🏆 {entry.tournamentsWon}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
