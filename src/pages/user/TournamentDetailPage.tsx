import { useParams, Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { GAME_MODE_LABELS } from '../../models/types';
import { getRoundName, getTotalRounds } from '../../engines/tournament';

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

  const totalRounds = getTotalRounds(tournament.matches);
  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);
  const tournamentGames = games.filter((g) => g.tournamentId === tournament.id);

  return (
    <div>
      <div className="page-header">
        <Link to="/tournaments" className="text-sm">&larr; Back to Tournaments</Link>
        <h1>{tournament.name}</h1>
        <div className="flex gap-2 items-center mt-2">
          <span className="mode-tag">{GAME_MODE_LABELS[tournament.gameMode]}</span>
          <span className="badge badge-info">{tournament.status}</span>
          <span className="text-sm text-muted">{tournament.playerIds.length} players</span>
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

      <div className="card">
        <h2 className="card-title mb-4">Bracket</h2>
        <div className="bracket">
          {rounds.map((round) => {
            const roundMatches = tournament.matches.filter((m) => m.round === round);
            return (
              <div key={round} className="bracket-round">
                <div className="bracket-round-title">
                  {getRoundName(round, totalRounds)}
                </div>
                {roundMatches.map((match) => (
                  <div key={`${match.round}-${match.matchIndex}`} className="bracket-match">
                    {match.playerIds.length === 0 ? (
                      <>
                        <div className="bracket-player tbd">TBD</div>
                        <div className="bracket-player tbd">TBD</div>
                      </>
                    ) : (
                      match.playerIds.map((pid) => (
                        <div
                          key={pid}
                          className={`bracket-player${match.winnerId === pid ? ' winner' : ''}`}
                        >
                          <span>{getPlayer(pid)?.name ?? 'Unknown'}</span>
                          {match.winnerId === pid && <span>✓</span>}
                        </div>
                      ))
                    )}
                    {match.playerIds.length === 1 && (
                      <div className="bracket-player tbd">BYE</div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

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
                      <td>{getRoundName(game.tournamentRound ?? 1, totalRounds)}</td>
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
