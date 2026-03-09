import { useParams, Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { GAME_MODE_LABELS } from '../../models/types';
import { getTotalRounds, getEliminatedPlayerIds } from '../../engines/tournament';
import MobileBackHeader from '../../components/MobileBackHeader';

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { tournaments, games, getPlayer, loading } = useData();

  if (loading) {
    return <div className="loading"><div className="spinner" /> Loading...</div>;
  }

  const tournament = tournaments.find((t) => t.id === id);
  if (!tournament) {
    return <div className="card empty-state"><p>Tournament not found</p></div>;
  }

  const matches = tournament.matches ?? [];
  const totalRounds = getTotalRounds(matches);
  const rounds = Array.from({ length: totalRounds }, (_, i) => totalRounds - i); // reverse: latest first
  const activePlayerIds = tournament.activePlayerIds ?? tournament.playerIds ?? [];
  const eliminatedIds = getEliminatedPlayerIds(matches);
  const tournamentGames = games.filter((g) => g.tournamentId === tournament.id);

  return (
    <div>
      <MobileBackHeader to="/tournaments" label="Tournaments" />
      <div className="page-header">
        <Link to="/tournaments" className="text-sm desktop-back-link">&larr; Back to Tournaments</Link>
        <h1>{tournament.name}</h1>
        <div className="flex gap-2 items-center mt-2">
          <span className="mode-tag">{GAME_MODE_LABELS[tournament.gameMode]}</span>
          <span className="badge badge-info">{tournament.status}</span>
          <span className="text-sm text-muted">{activePlayerIds.length} active players</span>
        </div>
      </div>

      {tournament.championId && (
        <div className="card mb-4" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '3rem' }}>🏆</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--gold)', marginTop: '0.5rem' }}>
            {getPlayer(tournament.championId)?.name ?? 'Unknown'} is the Champion!
          </div>
        </div>
      )}

      {/* Active Player Pool */}
      <div className="card mb-4">
        <h2 className="card-title mb-4">Active Players</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {activePlayerIds.map((pid) => {
            const isEliminated = eliminatedIds.has(pid);
            return (
              <span key={pid} style={{
                padding: '0.25rem 0.75rem',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius)',
                fontSize: '0.9rem',
                textDecoration: isEliminated ? 'line-through' : 'none',
                opacity: isEliminated ? 0.6 : 1,
              }}>
                {getPlayer(pid)?.name ?? 'Unknown'}
              </span>
            );
          })}
          {activePlayerIds.length === 0 && (
            <span className="text-muted">No active players</span>
          )}
        </div>
      </div>

      {/* Rounds */}
      {totalRounds > 0 && (
        <div className="card mb-4">
          <h2 className="card-title mb-4">Rounds</h2>
          {rounds.map((round) => {
            const roundMatches = matches.filter((m) => m.round === round);
            const allComplete = roundMatches.every((m) => m.status === 'completed');
            return (
              <div key={round} style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>Round {round}</h3>
                  {allComplete ? (
                    <span className="badge badge-success">Complete</span>
                  ) : (
                    <span className="badge badge-warning">In Progress</span>
                  )}
                </div>
                {roundMatches.map((match) => (
                  <div
                    key={`${match.round}-${match.matchIndex}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {match.playerIds.map((pid, idx) => (
                      <span key={pid}>
                        {idx > 0 && <span className="text-muted" style={{ marginRight: '0.75rem' }}>vs</span>}
                        <span style={{
                          fontWeight: match.winnerId === pid ? 700 : 400,
                          color: match.winnerId === pid ? 'var(--success)' : 'inherit',
                        }}>
                          {getPlayer(pid)?.name ?? 'Unknown'}
                          {match.winnerId === pid && ' ✓'}
                        </span>
                      </span>
                    ))}
                    {match.status === 'pending' && (
                      <span className="text-muted text-sm" style={{ marginLeft: 'auto' }}>Pending</span>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {totalRounds === 0 && (
        <div className="card mb-4 empty-state">
          <p>No rounds played yet</p>
        </div>
      )}

      {tournamentGames.length > 0 && (
        <div className="card mt-4">
          <h2 className="card-title mb-4">Match Results</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Round</th>
                  <th>Players</th>
                  <th>Winner</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tournamentGames.map((game) => {
                  const winner = game.results.find((r) => r.rank === 1);
                  return (
                    <tr key={game.id}>
                      <td>Round {game.tournamentRound ?? 1}</td>
                      <td>{game.playerIds.map((pid) => getPlayer(pid)?.name ?? '?').join(' vs ')}</td>
                      <td style={{ color: 'var(--success)' }}>{winner ? getPlayer(winner.playerId)?.name : '-'}</td>
                      <td>
                        {game.status === 'completed' ? (
                          <span className="badge badge-success">Done</span>
                        ) : (
                          <span className="badge badge-warning">In Progress</span>
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
