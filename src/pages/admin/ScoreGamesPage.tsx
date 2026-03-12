import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { addGame, updateGame } from '../../services/database';
import { GAME_MODE_LABELS, type GameMode, type GameResult, type Game, type Player } from '../../models/types';

export default function ScoreGamesPage() {
  const { players, games, getPlayer, loading } = useData();
  const [showCreate, setShowCreate] = useState(false);

  if (loading) {
    return <div className="loading"><div className="spinner" /> Loading...</div>;
  }

  const activeGames = games.filter((g) => g.status === 'in_progress');
  const recentGames = games.filter((g) => g.status === 'completed').slice(0, 10);

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Score Games</h1>
            <p>Record game results</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New Game
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateGameForm
          players={players}
          onClose={() => setShowCreate(false)}
        />
      )}

      {activeGames.length > 0 && (
        <div className="card mb-4">
          <h2 className="card-title mb-4">Active Games</h2>
          {activeGames.map((game) => (
            <ActiveGameCard key={game.id} game={game} getPlayer={getPlayer} />
          ))}
        </div>
      )}

      <div className="card">
        <h2 className="card-title mb-4">Recent Completed Games</h2>
        {recentGames.length === 0 ? (
          <p className="text-muted">No completed games yet</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mode</th>
                  <th>Players</th>
                  <th>Winner</th>
                </tr>
              </thead>
              <tbody>
                {recentGames.map((game) => {
                  const winner = game.results.find((r) => r.rank === 1);
                  return (
                    <tr key={game.id}>
                      <td className="text-sm text-muted">{new Date(game.createdAt).toLocaleDateString()}</td>
                      <td><span className="mode-tag">{GAME_MODE_LABELS[game.mode]}</span></td>
                      <td>{game.playerIds.map((pid) => getPlayer(pid)?.name ?? '?').join(', ')}</td>
                      <td style={{ color: 'var(--success)' }}>{winner ? getPlayer(winner.playerId)?.name : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateGameForm({ players, onClose }: { players: { id: string; name: string }[]; onClose: () => void }) {
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
    if (selectedPlayers.length < 2) return;
    setCreating(true);
    setError('');
    try {
      await addGame({
        mode: gameMode,
        playerIds: selectedPlayers,
        results: [],
        status: 'in_progress',
        createdAt: Date.now(),
      });
      onClose();
    } catch {
      setError('Failed to create game. You may not have permission.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">New Game</h2>

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

        {error && <p className="text-sm" style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>{error}</p>}
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={creating || selectedPlayers.length < 2}>
            {creating ? 'Creating...' : 'Start Game'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActiveGameCard({ game, getPlayer }: {
  game: Game;
  getPlayer: (id: string) => Player | undefined;
}) {
  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(game.playerIds.map((pid: string) => [pid, '']))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFinish = async () => {
    const results: GameResult[] = game.playerIds.map((pid: string) => {
      const score = parseInt(scores[pid]) || 0;
      return {
        playerId: pid,
        score: Math.max(0, Math.min(score, 999999)),
        rank: 0,
      };
    });

    // Sort by score descending and assign ranks
    results.sort((a, b) => b.score - a.score);
    results.forEach((r, i) => { r.rank = i + 1; });

    setSaving(true);
    setError('');
    try {
      await updateGame(game.id, {
        results,
        status: 'completed',
        completedAt: Date.now(),
      });
    } catch {
      setError('Failed to save game. You may not have permission.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
      <div className="flex justify-between items-center mb-2">
        <span className="mode-tag">{GAME_MODE_LABELS[game.mode]}</span>
        <span className="badge badge-warning">In Progress</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
        {game.playerIds.map((pid: string) => (
          <div key={pid} className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{getPlayer(pid)?.name ?? '?'}</label>
            <input
              type="number"
              className="form-input"
              placeholder="Score"
              min="0"
              max="999999"
              value={scores[pid]}
              onChange={(e) => setScores((prev) => ({ ...prev, [pid]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      {error && <p className="text-sm mt-2" style={{ color: 'var(--danger)' }}>{error}</p>}
      <button className="btn btn-success btn-sm mt-4" onClick={handleFinish} disabled={saving}>
        {saving ? 'Saving...' : 'Finish Game'}
      </button>
    </div>
  );
}
