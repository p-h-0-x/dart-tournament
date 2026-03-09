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

export function computeLeaderboard(players: Player[], games: Game[], tournaments: Tournament[]): LeaderboardEntry[] {
  const completedGames = games.filter((g) => g.status === 'completed');

  // Collect game IDs linked to tournament matches to avoid double-counting
  const tournamentGameIds = new Set<string>();
  for (const t of tournaments) {
    for (const m of t.matches) {
      if (m.gameId) tournamentGameIds.add(m.gameId);
    }
  }

  return players.map((player) => {
    const playerGames = completedGames.filter((g) => g.playerIds.includes(player.id));

    // Wins/losses from standalone games (not linked to a tournament match)
    const standaloneGames = playerGames.filter((g) => !tournamentGameIds.has(g.id));
    let wins = standaloneGames.filter((g) => g.results.some((r) => r.playerId === player.id && r.rank === 1)).length;
    let losses = standaloneGames.length - wins;

    // Wins/losses from tournament matches
    for (const t of tournaments) {
      for (const m of t.matches) {
        if (m.status !== 'completed' || !m.winnerId || m.playerIds.length < 2 || !m.playerIds.includes(player.id)) continue;
        if (m.winnerId === player.id) wins++;
        else losses++;
      }
    }

    const gamesPlayed = wins + losses;
    const tournamentsPlayed = tournaments.filter((t) => t.playerIds.includes(player.id)).length;
    const tournamentsWon = tournaments.filter((t) => t.championId === player.id).length;

    return {
      player,
      wins,
      losses,
      gamesPlayed,
      tournamentsWon,
      tournamentsPlayed,
      winRate: gamesPlayed > 0 ? wins / gamesPlayed : 0,
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
