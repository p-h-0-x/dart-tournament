import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { addPlayer } from '../../services/database';

export default function ManagePlayersPage() {
  const { players, loading } = useData();
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (name.trim().length > 50) {
      setMessage('Player name must be 50 characters or less');
      return;
    }
    setAdding(true);
    setMessage('');
    try {
      await addPlayer(name.trim());
      setName('');
      setMessage(`Player "${name.trim()}" added!`);
    } catch {
      setMessage('Failed to add player');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner" /> Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Manage Players</h1>
        <p>Add and view players</p>
      </div>

      <div className="card mb-4">
        <h2 className="card-title mb-4">Add Player</h2>
        <form onSubmit={handleAdd} className="flex gap-3 items-center">
          <input
            className="form-input"
            placeholder="Player name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            style={{ maxWidth: '300px' }}
          />
          <button type="submit" className="btn btn-primary" disabled={adding}>
            {adding ? 'Adding...' : 'Add Player'}
          </button>
        </form>
        {message && <p className="text-sm mt-2" style={{ color: 'var(--success)' }}>{message}</p>}
      </div>

      <div className="card">
        <h2 className="card-title mb-4">All Players ({players.length})</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td className="text-sm text-muted">{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
