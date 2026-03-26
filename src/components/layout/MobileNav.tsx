import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

export default function MobileNav() {
  const { isAdmin, logout } = useAuth();
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <>
      {showAdminMenu && (
        <div className="mobile-admin-overlay" onClick={() => setShowAdminMenu(false)}>
          <div className="mobile-admin-menu" onClick={(e) => e.stopPropagation()}>
            {isAdmin ? (
              <>
                <NavLink to="/admin/tournaments" className="mobile-admin-link" onClick={() => setShowAdminMenu(false)}>
                  <span>⚙️</span> Manage Tournaments
                </NavLink>
                <NavLink to="/admin/games" className="mobile-admin-link" onClick={() => setShowAdminMenu(false)}>
                  <span>📝</span> Score Games
                </NavLink>
                <NavLink to="/admin/players" className="mobile-admin-link" onClick={() => setShowAdminMenu(false)}>
                  <span>👤</span> Manage Players
                </NavLink>
                <NavLink to="/admin/settings" className="mobile-admin-link" onClick={() => setShowAdminMenu(false)}>
                  <span>🔧</span> Settings
                </NavLink>
                <button onClick={() => { logout(); setShowAdminMenu(false); }} className="mobile-admin-link" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
                  <span>🚪</span> Logout
                </button>
              </>
            ) : (
              <NavLink to="/admin/login" className="mobile-admin-link" onClick={() => setShowAdminMenu(false)}>
                <span>🔑</span> Admin Login
              </NavLink>
            )}
          </div>
        </div>
      )}
      <nav className="mobile-nav">
        <NavLink to="/" end className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
          <span className="mobile-nav-icon">📊</span>
          Board
        </NavLink>
        <NavLink to="/tournaments" className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
          <span className="mobile-nav-icon">🏆</span>
          Tourneys
        </NavLink>
        <NavLink to="/high-scores" className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
          <span className="mobile-nav-icon">⭐</span>
          Scores
        </NavLink>
        <NavLink to="/games" className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
          <span className="mobile-nav-icon">🎮</span>
          Games
        </NavLink>
        <NavLink to="/players" className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
          <span className="mobile-nav-icon">👥</span>
          Players
        </NavLink>
        <button
          className={`mobile-nav-item${isAdminRoute ? ' active' : ''}`}
          onClick={() => setShowAdminMenu(!showAdminMenu)}
        >
          <span className="mobile-nav-icon">{isAdmin ? '⚙️' : '🔑'}</span>
          Admin
        </button>
      </nav>
    </>
  );
}
