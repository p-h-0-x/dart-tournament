import { useParams, Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { GAME_MODE_LABELS } from '../../models/types';
import { getRoundName, getTotalRounds } from '../../engines/tournament';
import MobileBackHeader from '../../components/MobileBackHeader';

interface HistoryEntry {
  id: string;
  isWin: boolean;
  opponents: string;
  mode: string;
  tournamentName?: string;
  tournamentId?: string;
  date: number;
}

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { players, games, tournaments, getPlayer, loading } = useData();

  if (loading) {
    return <div className="loading"><div className="spinner" /> Loading...</div>;
  }

  const player = players.find((p) => p.id === id);
  if (!player) {
    return <div className="card empty-state"><p>Player not found</p></div>;
  }

  const playerGames = games.filter((g) => g.status === 'completed' && g.playerIds.includes(player.id));
  const playerTournaments = tournaments.filter((t) => t.playerIds.includes(player.id));

  // Collect game IDs linked to tournament matches to avoid double-counting
  const tournamentGameIds = new Set<string>();
  for (const t of tournaments) {
    for (const m of t.matches ?? []) {
      if (m.gameId) tournamentGameIds.add(m.gameId);
    }
  }

  // Wins/losses from standalone games
  const standaloneGames = playerGames.filter((g) => !tournamentGameIds.has(g.id));
  let wins = standaloneGames.filter((g) => g.results.some((r) => r.playerId === player.id && r.rank === 1)).length;
  let losses = standaloneGames.length - wins;

  // Wins/losses from tournament matches
  for (const t of tournaments) {
    for (const m of t.matches ?? []) {
      if (m.status !== 'completed' || !m.winnerId || m.playerIds.length < 2 || !m.playerIds.includes(player.id)) continue;
      if (m.winnerId === player.id) wins++;
      else losses++;
    }
  }

  const totalPlayed = wins + losses;
  const tournamentsWon = tournaments.filter((t) => t.championId === player.id).length;

  // Head-to-head records from standalone games
  const h2h: Record<string, { wins: number; losses: number; name: string }> = {};
  for (const game of standaloneGames) {
    const isWin = game.results.some((r) => r.playerId === player.id && r.rank === 1);
    for (const pid of game.playerIds) {
      if (pid === player.id) continue;
      if (!h2h[pid]) {
        h2h[pid] = { wins: 0, losses: 0, name: getPlayer(pid)?.name ?? 'Unknown' };
      }
      if (isWin) h2h[pid].wins++;
      else h2h[pid].losses++;
    }
  }

  // Head-to-head records from tournament matches
  for (const t of tournaments) {
    for (const m of t.matches ?? []) {
      if (m.status !== 'completed' || !m.winnerId || m.playerIds.length < 2 || !m.playerIds.includes(player.id)) continue;
      const isWin = m.winnerId === player.id;
      for (const pid of m.playerIds) {
        if (pid === player.id) continue;
        if (!h2h[pid]) {
          h2h[pid] = { wins: 0, losses: 0, name: getPlayer(pid)?.name ?? 'Unknown' };
        }
        if (isWin) h2h[pid].wins++;
        else h2h[pid].losses++;
      }
    }
  }

  // Build unified game history: standalone games + tournament matches
  const history: HistoryEntry[] = [];

  for (const game of standaloneGames) {
    const isWin = game.results.some((r) => r.playerId === player.id && r.rank === 1);
    const opponents = game.playerIds
      .filter((pid) => pid !== player.id)
      .map((pid) => getPlayer(pid)?.name ?? '?')
      .join(', ');
    const tournament = game.tournamentId
      ? tournaments.find((t) => t.id === game.tournamentId)
      : null;
    history.push({
      id: game.id,
      isWin,
      opponents,
      mode: GAME_MODE_LABELS[game.mode],
      tournamentName: tournament?.name,
      tournamentId: tournament?.id,
      date: game.completedAt ?? game.createdAt,
    });
  }

  for (const t of tournaments) {
    if (!t.matches?.length) continue;
    const totalRounds = getTotalRounds(t.matches);
    for (const m of t.matches) {
      if (m.status !== 'completed' || !m.winnerId || m.playerIds.length < 2 || !m.playerIds.includes(player.id)) continue;
      const isWin = m.winnerId === player.id;
      const opponents = m.playerIds
        .filter((pid) => pid !== player.id)
        .map((pid) => getPlayer(pid)?.name ?? '?')
        .join(', ');
      history.push({
        id: `${t.id}-${m.round}-${m.matchIndex}`,
        isWin,
        opponents,
        mode: GAME_MODE_LABELS[t.gameMode],
        tournamentName: `${t.name} - ${getRoundName(m.round, totalRounds)}`,
        tournamentId: t.id,
        date: t.completedAt ?? t.createdAt,
      });
    }
  }

  history.sort((a, b) => b.date - a.date);

  return (
    <div>
      <MobileBackHeader to="/players" label="Players" />
      <div className="page-header">
        <Link to="/players" className="text-sm desktop-back-link">&larr; Back to Players</Link>
        <h1>{player.name}</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>{wins}</div>
          <div className="stat-label">Wins</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{losses}</div>
          <div className="stat-label">Losses</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalPlayed > 0 ? ((wins / totalPlayed) * 100).toFixed(0) : 0}%</div>
          <div className="stat-label">Win Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--gold)' }}>{tournamentsWon}</div>
          <div className="stat-label">Tournaments Won</div>
        </div>
      </div>

      {/* Head to Head */}
      <div className="card mb-4">
        <h2 className="card-title mb-4">Head-to-Head Records</h2>
        {Object.keys(h2h).length === 0 ? (
          <p className="text-muted">No head-to-head records yet</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Opponent</th>
                  <th>Wins</th>
                  <th>Losses</th>
                  <th>Record</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(h2h)
                  .sort(([, a], [, b]) => (b.wins - b.losses) - (a.wins - a.losses))
                  .map(([pid, record]) => (
                    <tr key={pid}>
                      <td>
                        <Link to={`/players/${pid}`}>{record.name}</Link>
                      </td>
                      <td style={{ color: 'var(--success)' }}>{record.wins}</td>
                      <td style={{ color: 'var(--danger)' }}>{record.losses}</td>
                      <td>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}>
                          <div style={{
                            height: '6px',
                            borderRadius: '3px',
                            background: 'var(--bg-hover)',
                            flex: 1,
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${(record.wins / (record.wins + record.losses)) * 100}%`,
                              background: 'var(--success)',
                              borderRadius: '3px',
                            }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Game History */}
      <div className="card mb-4">
        <h2 className="card-title mb-4">Game History</h2>
        {history.length === 0 ? (
          <p className="text-muted">No games played yet</p>
        ) : (
          history.map((entry) => (
            <div key={entry.id} className="history-item">
              <div className={`history-result ${entry.isWin ? 'win' : 'loss'}`}>
                {entry.isWin ? 'WIN' : 'LOSS'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>vs {entry.opponents}</div>
                <div className="flex gap-2 items-center mt-2">
                  <span className="mode-tag">{entry.mode}</span>
                  {entry.tournamentName && (
                    <Link to={`/tournaments/${entry.tournamentId}`} className="text-sm">
                      {entry.tournamentName}
                    </Link>
                  )}
                </div>
              </div>
              <div className="text-sm text-muted">
                {new Date(entry.date).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Tournament History */}
      <div className="card">
        <h2 className="card-title mb-4">Tournament History</h2>
        {playerTournaments.length === 0 ? (
          <p className="text-muted">No tournaments played yet</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Tournament</th>
                  <th>Mode</th>
                  <th>Result</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {playerTournaments.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link to={`/tournaments/${t.id}`}>{t.name}</Link>
                    </td>
                    <td><span className="mode-tag">{GAME_MODE_LABELS[t.gameMode]}</span></td>
                    <td>
                      {t.championId === player.id ? (
                        <span className="badge badge-warning">🏆 Champion</span>
                      ) : t.status === 'completed' ? (
                        <span className="badge badge-danger">Eliminated</span>
                      ) : (
                        <span className="badge badge-info">In Progress</span>
                      )}
                    </td>
                    <td className="text-sm text-muted">{new Date(t.createdAt).toLocaleDateString()}</td>
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
