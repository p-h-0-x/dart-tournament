import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Layout from './components/layout/Layout';
import { ThemeProvider } from './context/ThemeContext';

// User pages
import LeaderboardPage from './pages/user/LeaderboardPage';
import TournamentsPage from './pages/user/TournamentsPage';
import TournamentDetailPage from './pages/user/TournamentDetailPage';
import GamesPage from './pages/user/GamesPage';
import PlayersPage from './pages/user/PlayersPage';
import PlayerDetailPage from './pages/user/PlayerDetailPage';
import HighScoresPage from './pages/user/HighScoresPage';

// Admin pages
import LoginPage from './pages/admin/LoginPage';
import ManageTournamentsPage from './pages/admin/ManageTournamentsPage';
import ManagePlayersPage from './pages/admin/ManagePlayersPage';
import ScoreGamesPage from './pages/admin/ScoreGamesPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import GamePlayPage from './pages/admin/GamePlayPage';
import GameViewPage from './pages/user/GameViewPage';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /> Loading...</div>;
  if (!isAdmin){
    console.log('AdminRoute blocked: not admin');
    return <Navigate to="/admin/login" replace />;
  } 
  return <>{children}</>;
}

function App() {
  // Use basename for GitHub Pages (repo name will be the base)
  const basename = import.meta.env.BASE_URL;

  return (
    <ThemeProvider>
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <DataProvider>
          <Routes>
            <Route element={<Layout />}>
              {/* Public user routes */}
              <Route path="/" element={<LeaderboardPage />} />
              <Route path="/tournaments" element={<TournamentsPage />} />
              <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
              <Route path="/high-scores" element={<HighScoresPage />} />
              <Route path="/games" element={<GamesPage />} />
              <Route path="/games/:id" element={<GameViewPage />} />
              <Route path="/players" element={<PlayersPage />} />
              <Route path="/players/:id" element={<PlayerDetailPage />} />

              {/* Admin routes */}
              <Route path="/admin/login" element={<LoginPage />} />
              <Route path="/admin/tournaments" element={<AdminRoute><ManageTournamentsPage /></AdminRoute>} />
              <Route path="/admin/games" element={<AdminRoute><ScoreGamesPage /></AdminRoute>} />
              <Route path="/admin/games/:id" element={<AdminRoute><GamePlayPage /></AdminRoute>} />
              <Route path="/admin/players" element={<AdminRoute><ManagePlayersPage /></AdminRoute>} />
              <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
