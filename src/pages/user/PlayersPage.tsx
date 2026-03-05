import { Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';

export default function PlayersPage() {
  const { leaderboard, loading } = useData();

  if (loading) {
    return <div className="loading"><div className="spinner" /> Loading players...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Players</h1>
        <p>All registered dart players</p>
      </div>

      {leaderboard.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">👥</div>
          <p>No players registered yet</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {leaderboard.map((entry, idx) => (
            <Link
              to={`/players/${entry.player.id}`}
              key={entry.player.id}
              className="card"
              style={{ display: 'block', color: 'inherit' }}
            >
              <div className="flex items-center gap-3">
                <div style={{
                  width: '3rem',
                  height: '3rem',
                  borderRadius: '50%',
                  background: 'var(--bg-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: idx < 3 ? ['var(--gold)', 'var(--silver)', 'var(--bronze)'][idx] : 'var(--text-muted)',
                }}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{entry.player.name}</div>
                  <div className="text-sm text-muted">
                    {entry.wins}W - {entry.losses}L &middot; {entry.gamesPlayed} games
                  </div>
                  {entry.tournamentsWon > 0 && (
                    <span className="badge badge-warning mt-2">
                      🏆 {entry.tournamentsWon} tournament{entry.tournamentsWon > 1 ? 's' : ''} won
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
