import { useState } from 'react';
import type { GameResult, Player } from '../../models/types';

interface GameResultsBannerProps {
  results: GameResult[];
  players: Player[];
  /** Whether this game is linked to a tournament. */
  tournamentId?: string;
  /** Called when admin navigates back to tournament. */
  onBackToTournament?: () => void;
  /** Admin mode: allow picking winner on tie. */
  isAdmin?: boolean;
  /** Called when admin picks a winner from tied players. */
  onPickWinner?: (winnerId: string) => void;
}

export default function GameResultsBanner({
  results,
  players,
  tournamentId,
  onBackToTournament,
  isAdmin = false,
  onPickWinner,
}: GameResultsBannerProps) {
  const [pickingWinner, setPickingWinner] = useState(false);

  const getPlayerName = (id: string) => players.find((p) => p.id === id)?.name ?? 'Unknown';

  const sorted = [...results].sort((a, b) => a.rank - b.rank);
  const winners = sorted.filter((r) => r.rank === 1);
  const isTied = winners.length > 1;

  return (
    <div className="game-results-banner">
      <div className="game-results-banner__trophy">🏆</div>

      {isTied && !pickingWinner ? (
        <>
          <h2 className="game-results-banner__title">Tie!</h2>
          <p className="game-results-banner__subtitle">
            {winners.map((w) => getPlayerName(w.playerId)).join(' & ')} tied with {winners[0].score} points
          </p>
          {isAdmin && tournamentId && onPickWinner && (
            <button
              className="btn btn-primary"
              onClick={() => setPickingWinner(true)}
              style={{ marginTop: '1rem' }}
            >
              Pick Tournament Winner
            </button>
          )}
        </>
      ) : isTied && pickingWinner ? (
        <>
          <h2 className="game-results-banner__title">Pick Winner</h2>
          <p className="game-results-banner__subtitle">Who advances in the tournament?</p>
          <div className="game-results-banner__pick-buttons">
            {winners.map((w) => (
              <button
                key={w.playerId}
                className="btn btn-primary"
                onClick={() => onPickWinner?.(w.playerId)}
              >
                {getPlayerName(w.playerId)}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2 className="game-results-banner__title">
            {getPlayerName(winners[0].playerId)} Wins!
          </h2>
          <p className="game-results-banner__subtitle">
            Score: {winners[0].score}
          </p>
        </>
      )}

      {/* Full results table */}
      <div className="game-results-banner__table">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.playerId} className={r.rank === 1 ? 'game-results-banner__winner-row' : ''}>
                <td>#{r.rank}</td>
                <td>{getPlayerName(r.playerId)}</td>
                <td>{r.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tournamentId && onBackToTournament && !pickingWinner && (
        <button
          className="btn btn-outline"
          onClick={onBackToTournament}
          style={{ marginTop: '1rem' }}
        >
          Back to Tournament
        </button>
      )}
    </div>
  );
}
