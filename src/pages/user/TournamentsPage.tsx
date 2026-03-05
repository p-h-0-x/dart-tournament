import { Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { GAME_MODE_LABELS, type TournamentStatus } from '../../models/types';

function statusBadge(status: TournamentStatus) {
  switch (status) {
    case 'draft': return <span className="badge badge-info">Draft</span>;
    case 'in_progress': return <span className="badge badge-warning">In Progress</span>;
    case 'completed': return <span className="badge badge-success">Completed</span>;
  }
}

export default function TournamentsPage() {
  const { tournaments, getPlayer, loading } = useData();

  if (loading) {
    return <div className="loading"><div className="spinner" /> Loading tournaments...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Tournaments</h1>
        <p>Browse current and past tournaments</p>
      </div>

      {tournaments.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">🏆</div>
          <p>No tournaments yet</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {tournaments.map((t) => (
            <Link to={`/tournaments/${t.id}`} key={t.id} className="card" style={{ display: 'block', color: 'inherit' }}>
              <div className="card-header">
                <div>
                  <h3 className="card-title">{t.name}</h3>
                  <div className="flex gap-2 items-center mt-2">
                    <span className="mode-tag">{GAME_MODE_LABELS[t.gameMode]}</span>
                    {statusBadge(t.status)}
                    <span className="text-sm text-muted">{t.playerIds.length} players</span>
                  </div>
                </div>
                <div className="text-sm text-muted">
                  {new Date(t.createdAt).toLocaleDateString()}
                </div>
              </div>
              {t.championId && (
                <div style={{ color: 'var(--gold)', fontWeight: 600 }}>
                  🏆 Champion: {getPlayer(t.championId)?.name ?? 'Unknown'}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
