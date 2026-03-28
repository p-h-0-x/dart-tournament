import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function Sidebar() {
  const { isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>
          <span className="dart-icon">🎯</span>
          Dart Tournament
        </h1>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <div className="nav-section-title">Main</div>
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span>📊</span> Leaderboard
          </NavLink>
          <NavLink to="/tournaments" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span>🏆</span> Tournaments
          </NavLink>
          <NavLink to="/high-scores" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span>⭐</span> High Scores
          </NavLink>
          <NavLink to="/games" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span>🎮</span> Games
          </NavLink>
          <NavLink to="/players" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span>👥</span> Players
          </NavLink>
        </div>

        {isAdmin && (
          <div className="nav-section">
            <div className="nav-section-title">Admin</div>
            <NavLink to="/admin/tournaments" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <span>⚙️</span> Manage Tournaments
            </NavLink>
            <NavLink to="/admin/games" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <span>📝</span> Score Games
            </NavLink>
            <NavLink to="/admin/players" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <span>👤</span> Manage Players
            </NavLink>
            <NavLink to="/admin/settings" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <span>🔧</span> Settings
            </NavLink>
          </div>
        )}

        <div className="nav-section" style={{ marginTop: 'auto' }}>
          <button onClick={toggleTheme} className="nav-link w-full" style={{ border: 'none', background: 'none', textAlign: 'left' }}>
            <span>{theme === 'dark' ? '☀️' : '🌙'}</span> {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          {isAdmin ? (
            <button onClick={logout} className="nav-link w-full" style={{ border: 'none', background: 'none', textAlign: 'left' }}>
              <span>🚪</span> Logout
            </button>
          ) : (
            <NavLink to="/admin/login" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <span>🔑</span> Admin Login
            </NavLink>
          )}
        </div>
      </nav>
    </aside>
  );
}
