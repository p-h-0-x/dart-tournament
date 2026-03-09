import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { addTournament, updateTournament, deleteTournament } from '../../services/database';
import { createFlexibleRound, setFlexibleMatchWinner, isRoundComplete, getTotalRounds, getEliminatedPlayerIds } from '../../engines/tournament';
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
          <TournamentCard key={t.id} tournament={t} allPlayers={players} getPlayer={getPlayer} />
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
    if (selectedPlayers.length < 2) return setError('Need at least 2 players');
    setCreating(true);
    setError('');
    try {
      await addTournament({
        name: name.trim(),
        gameMode,
        playerIds: [...selectedPlayers],
        activePlayerIds: [...selectedPlayers],
        matches: [],
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
          <label className="form-label">Players ({selectedPlayers.length} selected, min 2)</label>
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

function TournamentCard({ tournament: t, allPlayers, getPlayer }: { tournament: Tournament; allPlayers: Player[]; getPlayer: (id: string) => Player | undefined }) {
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState<string[][]>([]);
  const [groupSelection, setGroupSelection] = useState<string[]>([]);
  const [showPairingUI, setShowPairingUI] = useState(false);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const activePlayerIds = t.activePlayerIds ?? t.playerIds ?? [];
  const totalRounds = getTotalRounds(t.matches ?? []);
  const currentRoundComplete = totalRounds === 0 || isRoundComplete(t.matches ?? [], totalRounds);
  const eliminatedIds = getEliminatedPlayerIds(t.matches ?? []);

  const statusColors: Record<TournamentStatus, string> = {
    draft: 'badge-info',
    in_progress: 'badge-warning',
    completed: 'badge-success',
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTournament(t.id);
    } catch (e) {
      alert('Failed to delete tournament: ' + String(e));
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const startTournament = async () => {
    await updateTournament(t.id, { status: 'in_progress' });
  };

  // --- Player pool management ---
  const addPlayerToTournament = async (playerId: string) => {
    setSaving(true);
    try {
      const newActive = [...activePlayerIds, playerId];
      const newAll = t.playerIds.includes(playerId) ? t.playerIds : [...t.playerIds, playerId];
      await updateTournament(t.id, { activePlayerIds: newActive, playerIds: newAll });
    } finally {
      setSaving(false);
      setAddPlayerOpen(false);
    }
  };

  const removePlayerFromTournament = async (playerId: string) => {
    // Block if player is in a pending match in current round
    const currentRoundMatches = (t.matches ?? []).filter((m: TournamentMatch) => m.round === totalRounds && m.status !== 'completed');
    const inPendingMatch = currentRoundMatches.some((m: TournamentMatch) => m.playerIds.includes(playerId));
    if (inPendingMatch) {
      alert('Cannot remove a player who is in a pending match. Complete or remove the round first.');
      return;
    }
    setSaving(true);
    try {
      const newActive = activePlayerIds.filter((id) => id !== playerId);
      await updateTournament(t.id, { activePlayerIds: newActive });
    } finally {
      setSaving(false);
    }
  };

  // --- Group/pairing management ---
  const toggleGroupPlayer = (playerId: string) => {
    setGroupSelection((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const addGroup = () => {
    if (groupSelection.length >= 2) {
      setGroups((prev) => [...prev, [...groupSelection]]);
      setGroupSelection([]);
    }
  };

  const removeGroup = (index: number) => {
    setGroups((prev) => prev.filter((_, i) => i !== index));
  };

  const groupedPlayerIds = new Set(groups.flat());

  const availableForGrouping = activePlayerIds.filter((id) => !groupedPlayerIds.has(id));

  const createRound = async () => {
    if (groups.length === 0) return;
    setSaving(true);
    try {
      const updatedMatches = createFlexibleRound(t.matches ?? [], groups);
      await updateTournament(t.id, { matches: updatedMatches });
      setGroups([]);
      setGroupSelection([]);
      setShowPairingUI(false);
    } finally {
      setSaving(false);
    }
  };

  // --- Winner selection ---
  const selectWinner = async (round: number, matchIndex: number, winnerId: string) => {
    setSaving(true);
    try {
      const updatedMatches = setFlexibleMatchWinner(t.matches ?? [], round, matchIndex, winnerId);
      await updateTournament(t.id, { matches: updatedMatches });
    } finally {
      setSaving(false);
    }
  };

  // --- End tournament ---
  const [showEndTournament, setShowEndTournament] = useState(false);
  const [selectedChampion, setSelectedChampion] = useState('');

  const endTournament = async () => {
    if (!selectedChampion) return;
    setSaving(true);
    try {
      await updateTournament(t.id, {
        status: 'completed',
        championId: selectedChampion,
        completedAt: Date.now(),
      });
      setShowEndTournament(false);
    } finally {
      setSaving(false);
    }
  };

  // Pending matches in the current round
  const pendingMatches = (t.matches ?? []).filter(
    (m: TournamentMatch) => m.round === totalRounds && m.status !== 'completed' && m.playerIds.length >= 2
  );

  // Players available to add (registered but not currently active)
  const availableToAdd = allPlayers.filter((p) => !activePlayerIds.includes(p.id));

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">{t.name}</h3>
          <div className="flex gap-2 items-center mt-2">
            <span className="mode-tag">{GAME_MODE_LABELS[t.gameMode]}</span>
            <span className={`badge ${statusColors[t.status as TournamentStatus]}`}>{t.status}</span>
            <span className="text-sm text-muted">{activePlayerIds.length} active players</span>
          </div>
        </div>
        <div className="flex gap-2">
          {t.status === 'draft' && (
            <button className="btn btn-success btn-sm" onClick={startTournament}>
              Start Tournament
            </button>
          )}
          <Link to={`/tournaments/${t.id}`} className="btn btn-outline btn-sm">View</Link>
          <button
            className="btn btn-outline btn-sm"
            style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Player Pool Management */}
      {(t.status === 'draft' || t.status === 'in_progress') && (
        <div className="mt-4">
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Active Players
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {activePlayerIds.map((pid) => {
              const isEliminated = eliminatedIds.has(pid);
              return (
              <span key={pid} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                padding: '0.25rem 0.5rem', background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius)', fontSize: '0.85rem',
                textDecoration: isEliminated ? 'line-through' : 'none',
                opacity: isEliminated ? 0.6 : 1,
              }}>
                {getPlayer(pid)?.name ?? '?'}
                <button
                  onClick={() => removePlayerFromTournament(pid)}
                  disabled={saving}
                  style={{
                    background: 'none', border: 'none', color: 'var(--danger)',
                    cursor: 'pointer', padding: '0 0.2rem', fontSize: '1rem', lineHeight: 1,
                  }}
                  title="Remove from tournament"
                >
                  x
                </button>
              </span>
              );
            })}
          </div>
          {availableToAdd.length > 0 && (
            <div>
              {addPlayerOpen ? (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {availableToAdd.map((p) => (
                    <button key={p.id} className="btn btn-outline btn-sm" onClick={() => addPlayerToTournament(p.id)} disabled={saving}>
                      + {p.name}
                    </button>
                  ))}
                  <button className="btn btn-outline btn-sm" onClick={() => setAddPlayerOpen(false)}>Cancel</button>
                </div>
              ) : (
                <button className="btn btn-outline btn-sm" onClick={() => setAddPlayerOpen(true)}>
                  + Add Player
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pending matches - select winners */}
      {t.status === 'in_progress' && pendingMatches.length > 0 && (
        <div className="mt-4">
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Round {totalRounds} - Select Winners
          </h4>
          {pendingMatches.map((match: TournamentMatch) => (
            <div
              key={`${match.round}-${match.matchIndex}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.5rem 0', borderBottom: '1px solid var(--border)',
              }}
            >
              <span className="text-sm text-muted" style={{ minWidth: '80px' }}>
                Match {match.matchIndex + 1}
              </span>
              {match.playerIds.map((pid: string) => (
                <button
                  key={pid}
                  className="btn btn-outline btn-sm"
                  onClick={() => selectWinner(match.round, match.matchIndex, pid)}
                  disabled={saving}
                >
                  {getPlayer(pid)?.name ?? '?'}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Create new round */}
      {t.status === 'in_progress' && currentRoundComplete && (
        <div className="mt-4">
          {!showPairingUI ? (
            <button className="btn btn-primary btn-sm" onClick={() => setShowPairingUI(true)}>
              + Create Round {totalRounds + 1}
            </button>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Round {totalRounds + 1} — Match Setup
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', marginTop: 0 }}>
                Select 2 or more players for each match, then confirm. Repeat to create all matches for this round.
              </p>

              {/* Confirmed matches */}
              {groups.length > 0 && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Matches:</p>
                  {groups.map((group, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--border)',
                      background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', marginBottom: '0.25rem',
                    }}>
                      <span style={{ fontSize: '0.85rem', flex: 1 }}>
                        {group.map((pid) => getPlayer(pid)?.name ?? '?').join(' vs ')}
                      </span>
                      <button
                        onClick={() => removeGroup(i)}
                        style={{
                          background: 'none', border: 'none', color: 'var(--danger)',
                          cursor: 'pointer', fontSize: '0.85rem',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Select players for a match */}
              {availableForGrouping.length >= 2 && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Tap players to add them to a match ({groupSelection.length} selected):
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {availableForGrouping.map((pid) => {
                      const isElim = eliminatedIds.has(pid);
                      return (
                        <button
                          key={pid}
                          className={`btn btn-sm ${groupSelection.includes(pid) ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => toggleGroupPlayer(pid)}
                          style={{ textDecoration: isElim ? 'line-through' : 'none' }}
                        >
                          {getPlayer(pid)?.name ?? '?'}
                        </button>
                      );
                    })}
                  </div>
                  {groupSelection.length >= 2 && (
                    <button className="btn btn-success btn-sm mt-2" onClick={addGroup}>
                      Confirm Match ({groupSelection.length} players)
                    </button>
                  )}
                </div>
              )}

              {availableForGrouping.length === 1 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  1 player without a match: {getPlayer(availableForGrouping[0])?.name ?? '?'} (sits out this round)
                </p>
              )}

              {availableForGrouping.length === 0 && groups.length > 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--success)', marginBottom: '0.75rem' }}>
                  All players assigned!
                </p>
              )}

              <div className="flex gap-2">
                <button className="btn btn-primary btn-sm" onClick={createRound} disabled={saving || groups.length === 0}>
                  {saving ? 'Creating...' : `Create Round ${totalRounds + 1} (${groups.length} match${groups.length !== 1 ? 'es' : ''})`}
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => { setShowPairingUI(false); setGroups([]); setGroupSelection([]); }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* End tournament */}
      {t.status === 'in_progress' && totalRounds > 0 && (
        <div className="mt-4">
          {!showEndTournament ? (
            <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => setShowEndTournament(true)}>
              End Tournament
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem' }}>Select champion:</span>
              <select
                className="form-select"
                style={{ width: 'auto', fontSize: '0.85rem' }}
                value={selectedChampion}
                onChange={(e) => setSelectedChampion(e.target.value)}
              >
                <option value="">-- Select --</option>
                {activePlayerIds.map((pid) => (
                  <option key={pid} value={pid}>{getPlayer(pid)?.name ?? '?'}</option>
                ))}
              </select>
              <button className="btn btn-success btn-sm" onClick={endTournament} disabled={saving || !selectedChampion}>
                Confirm
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => setShowEndTournament(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {t.championId && (
        <div className="mt-4" style={{ color: 'var(--gold)', fontWeight: 600 }}>
          Champion: {getPlayer(t.championId)?.name ?? 'Unknown'}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Delete Tournament</h2>
            <p>Are you sure you want to delete <strong>{t.name}</strong>? This will also permanently delete all associated games. This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                Cancel
              </button>
              <button
                className="btn btn-outline"
                style={{ color: 'white', background: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Tournament'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
