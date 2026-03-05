import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { addTournament, updateTournament } from '../../services/database';
import { generateBracket, advanceWinner, getTotalRounds, getRoundName } from '../../engines/tournament';
import { GAME_MODE_LABELS, type GameMode, type TournamentStatus, type Tournament, type TournamentMatch, type Player } from '../../models/types';

export default function ManageTournamentsPage() {
  const { players, tournaments, getPlayer, loading } = useData();
  const [showCreate, setShowCreate] = useState(false);

  if (loading) {
    return <div className="loading"><div className="spinner" /> Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Manage Tournaments</h1>
            <p>Create and manage dart tournaments</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New Tournament
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateTournamentForm
          players={players}
          onClose={() => setShowCreate(false)}
        />
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {tournaments.map((t) => (
          <TournamentCard key={t.id} tournament={t} getPlayer={getPlayer} />
        ))}
      </div>
    </div>
  );
}

function CreateTournamentForm({ players, onClose }: { players: { id: string; name: string }[]; onClose: () => void }) {
  const [name, setName] = useState('');
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const togglePlayer = (id: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) return setError('Name required');
    if (selectedPlayers.length < 3) return setError('Need at least 3 players');
    setCreating(true);
    setError('');
    try {
      const matches = generateBracket(selectedPlayers);
      await addTournament({
        name: name.trim(),
        gameMode,
        playerIds: selectedPlayers,
        matches,
        status: 'draft',
        createdAt: Date.now(),
      });
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Create Tournament</h2>

        <div className="form-group">
          <label className="form-label">Tournament Name</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Spring Championship 2026" />
        </div>

        <div className="form-group">
          <label className="form-label">Game Mode</label>
          <select className="form-select" value={gameMode} onChange={(e) => setGameMode(e.target.value as GameMode)}>
            {(Object.keys(GAME_MODE_LABELS) as GameMode[]).map((m) => (
              <option key={m} value={m}>{GAME_MODE_LABELS[m]}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Players ({selectedPlayers.length} selected, min 3)</label>
          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.5rem' }}>
            {players.map((p) => (
              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedPlayers.includes(p.id)}
                  onChange={() => togglePlayer(p.id)}
                />
                {p.name}
              </label>
            ))}
          </div>
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating...' : 'Create Tournament'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TournamentCard({ tournament: t, getPlayer }: { tournament: Tournament; getPlayer: (id: string) => Player | undefined }) {
  const [advancing, setAdvancing] = useState(false);

  const statusColors: Record<TournamentStatus, string> = {
    draft: 'badge-info',
    in_progress: 'badge-warning',
    completed: 'badge-success',
  };

  const startTournament = async () => {
    await updateTournament(t.id, { status: 'in_progress' });
  };

  const selectWinner = async (round: number, matchIndex: number, winnerId: string) => {
    setAdvancing(true);
    try {
      const updatedMatches = advanceWinner(t.matches, round, matchIndex, winnerId);
      const totalRounds = getTotalRounds(updatedMatches);
      const finalMatch = updatedMatches.find((m: TournamentMatch) => m.round === totalRounds);
      const isComplete = finalMatch?.winnerId;

      await updateTournament(t.id, {
        matches: updatedMatches,
        ...(isComplete ? { status: 'completed', championId: finalMatch.winnerId, completedAt: Date.now() } : {}),
      });
    } finally {
      setAdvancing(false);
    }
  };

  const totalRounds = getTotalRounds(t.matches);
  const pendingMatches = t.matches.filter(
    (m: TournamentMatch) => m.status !== 'completed' && m.playerIds.length === 2
  );

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">{t.name}</h3>
          <div className="flex gap-2 items-center mt-2">
            <span className="mode-tag">{GAME_MODE_LABELS[t.gameMode]}</span>
            <span className={`badge ${statusColors[t.status as TournamentStatus]}`}>{t.status}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {t.status === 'draft' && (
            <button className="btn btn-success btn-sm" onClick={startTournament}>
              Start Tournament
            </button>
          )}
          <Link to={`/tournaments/${t.id}`} className="btn btn-outline btn-sm">View</Link>
        </div>
      </div>

      {t.status === 'in_progress' && pendingMatches.length > 0 && (
        <div className="mt-4">
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Pending Matches - Select Winners
          </h4>
          {pendingMatches.map((match: any) => (
            <div
              key={`${match.round}-${match.matchIndex}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span className="text-sm text-muted" style={{ minWidth: '80px' }}>
                {getRoundName(match.round, totalRounds)}
              </span>
              {match.playerIds.map((pid: string) => (
                <button
                  key={pid}
                  className="btn btn-outline btn-sm"
                  onClick={() => selectWinner(match.round, match.matchIndex, pid)}
                  disabled={advancing}
                >
                  {getPlayer(pid)?.name ?? '?'}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {t.championId && (
        <div className="mt-4" style={{ color: 'var(--gold)', fontWeight: 600 }}>
          🏆 Champion: {getPlayer(t.championId)?.name ?? 'Unknown'}
        </div>
      )}
    </div>
  );
}
