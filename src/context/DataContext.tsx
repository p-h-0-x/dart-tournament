import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Player, Game, Tournament, LeaderboardEntry } from '../models/types';
import { onPlayersChange, onGamesChange, onTournamentsChange } from '../services/database';

interface DataContextType {
  players: Player[];
  games: Game[];
  tournaments: Tournament[];
  leaderboard: LeaderboardEntry[];
  loading: boolean;
  getPlayer: (id: string) => Player | undefined;
}

const DataContext = createContext<DataContextType>({
  players: [],
  games: [],
  tournaments: [],
  leaderboard: [],
  loading: true,
  getPlayer: () => undefined,
});

function computeLeaderboard(players: Player[], games: Game[], tournaments: Tournament[]): LeaderboardEntry[] {
  const completedGames = games.filter((g) => g.status === 'completed');

  return players.map((player) => {
    const playerGames = completedGames.filter((g) => g.playerIds.includes(player.id));
    const wins = playerGames.filter((g) => g.results.some((r) => r.playerId === player.id && r.rank === 1)).length;
    const losses = playerGames.length - wins;
    const tournamentsPlayed = tournaments.filter((t) => t.playerIds.includes(player.id)).length;
    const tournamentsWon = tournaments.filter((t) => t.championId === player.id).length;

    return {
      player,
      wins,
      losses,
      gamesPlayed: playerGames.length,
      tournamentsWon,
      tournamentsPlayed,
      winRate: playerGames.length > 0 ? wins / playerGames.length : 0,
    };
  }).sort((a, b) => b.wins - a.wins || b.winRate - a.winRate);
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let loaded = 0;
    const check = () => { loaded++; if (loaded >= 3) setLoading(false); };

    const unsub1 = onPlayersChange((p) => { setPlayers(p); check(); });
    const unsub2 = onGamesChange((g) => { setGames(g); check(); });
    const unsub3 = onTournamentsChange((t) => { setTournaments(t); check(); });

    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const leaderboard = computeLeaderboard(players, games, tournaments);

  const getPlayer = (id: string) => players.find((p) => p.id === id);

  return (
    <DataContext.Provider value={{ players, games, tournaments, leaderboard, loading, getPlayer }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
