import { NavLink } from 'react-router-dom';

export default function MobileNav() {
  return (
    <nav className="mobile-nav">
      <NavLink to="/" end className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
        <span className="mobile-nav-icon">📊</span>
        Board
      </NavLink>
      <NavLink to="/tournaments" className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
        <span className="mobile-nav-icon">🏆</span>
        Tourneys
      </NavLink>
      <NavLink to="/games" className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
        <span className="mobile-nav-icon">🎮</span>
        Games
      </NavLink>
      <NavLink to="/players" className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
        <span className="mobile-nav-icon">👥</span>
        Players
      </NavLink>
    </nav>
  );
}
