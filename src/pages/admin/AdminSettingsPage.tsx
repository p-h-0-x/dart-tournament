import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { resetAllData } from '../../services/database';

export function isDevMode(): boolean {
  return localStorage.getItem('dart-dev-mode') === 'true';
}

export default function AdminSettingsPage() {
  const { players, games, tournaments, loading } = useData();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState('');
  const [devMode, setDevMode] = useState(isDevMode);

  const handleReset = async () => {
    if (confirmText !== 'RESET') return;
    setResetting(true);
    setMessage('');
    try {
      const counts = await resetAllData();
      setShowConfirm(false);
      setConfirmText('');
      setMessage(
        `Reset complete. Deleted ${counts.players} players, ${counts.games} games, and ${counts.tournaments} tournaments.`
      );
    } catch {
      setMessage('Failed to reset data. Please try again.');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner" /> Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Admin Settings</h1>
        <p>Manage application data</p>
      </div>

      <div className="card mb-4">
        <h2 className="card-title mb-4">Testing Mode</h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={devMode}
            onChange={(e) => {
              const val = e.target.checked;
              setDevMode(val);
              localStorage.setItem('dart-dev-mode', String(val));
            }}
          />
          <span>Enable testing mode</span>
        </label>
        <p className="text-sm text-muted mt-2">
          Adds a "Simulate Game" button on in-progress games that auto-plays to completion with random darts.
        </p>
      </div>

      <div className="card">
        <h2 className="card-title mb-4">Reset All Data</h2>
        <p className="text-sm text-muted mb-4">
          Permanently delete all players, games, and tournaments. This action cannot be undone.
        </p>
        <div className="text-sm mb-4" style={{ display: 'flex', gap: '1.5rem' }}>
          <span><strong>{players.length}</strong> players</span>
          <span><strong>{games.length}</strong> games</span>
          <span><strong>{tournaments.length}</strong> tournaments</span>
        </div>
        <button
          className="btn"
          style={{ background: 'var(--danger)', color: 'white' }}
          onClick={() => setShowConfirm(true)}
          disabled={players.length === 0 && games.length === 0 && tournaments.length === 0}
        >
          Reset Everything
        </button>
        {message && (
          <p className="text-sm mt-2" style={{ color: message.startsWith('Reset complete') ? 'var(--success)' : 'var(--danger)' }}>
            {message}
          </p>
        )}
      </div>

      {showConfirm && (
        <div className="modal-overlay" onClick={() => { setShowConfirm(false); setConfirmText(''); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="card-title mb-4">Confirm Reset</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--danger)' }}>
              This will permanently delete <strong>all {players.length} players</strong>,{' '}
              <strong>all {games.length} games</strong>, and{' '}
              <strong>all {tournaments.length} tournaments</strong>.
            </p>
            <p className="text-sm mb-4">
              Type <strong>RESET</strong> to confirm:
            </p>
            <input
              className="form-input mb-4"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type RESET"
              autoFocus
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                className="btn"
                onClick={() => { setShowConfirm(false); setConfirmText(''); }}
                disabled={resetting}
              >
                Cancel
              </button>
              <button
                className="btn"
                style={{ background: 'var(--danger)', color: 'white' }}
                onClick={handleReset}
                disabled={confirmText !== 'RESET' || resetting}
              >
                {resetting ? 'Resetting...' : 'Permanently Delete All Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
