import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { onGameChange } from '../../services/database';
import type { Game, ClassicLiveState, KillerLiveState, ClockLiveState, CricketLiveState } from '../../models/types';
import { GAME_MODE_LABELS } from '../../models/types';
import ClassicGameBoard from '../../components/game/ClassicGameBoard';
import KillerGameBoard from '../../components/game/KillerGameBoard';
import ClockGameBoard from '../../components/game/ClockGameBoard';
import CricketGameBoard from '../../components/game/CricketGameBoard';
import GameResultsBanner from '../../components/game/GameResultsBanner';
import GameTurnHistory from '../../components/game/GameTurnHistory';

export default function GameViewPage() {
  const { id } = useParams<{ id: string }>();
  const { players } = useData();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const unsub = onGameChange(id, (g) => {
      setGame(g);
      setLoading(false);
    });
    return unsub;
  }, [id]);

  if (loading) return <p>Loading game...</p>;
  if (!game) return <p>Game not found.</p>;

  const gamePlayers = players.filter((p) => game.playerIds.includes(p.id));
  const modeLabel = GAME_MODE_LABELS[game.mode] ?? game.mode;
  const isCompleted = game.status === 'completed';
  const isLive = game.status === 'in_progress';

  return (
    <div>
      <div className="game-play-page__header">
        <div>
          <div className="game-play-page__title">
            <span className="game-play-page__mode-tag">{modeLabel}</span>
            {' '}Game
            {isLive && <span className="game-view__live-badge" style={{ marginLeft: '0.5rem' }}>LIVE</span>}
          </div>
          <div className="game-play-page__status">
            {isCompleted ? 'Completed' : isLive ? 'In Progress' : 'Pending'}
          </div>
        </div>
      </div>

      {/* Completed: show results */}
      {isCompleted && game.results.length > 0 && (
        <GameResultsBanner
          results={game.results}
          players={gamePlayers}
        />
      )}

      {/* Classic mode: read-only view */}
      {game.liveState?.mode === 'classic' && (
        <ClassicGameBoard
          liveState={game.liveState as ClassicLiveState}
          playerIds={game.playerIds}
          players={gamePlayers}
          isAdmin={false}
        />
      )}

      {/* Killer mode: read-only view */}
      {game.liveState?.mode === 'killer' && (
        <KillerGameBoard
          liveState={game.liveState as KillerLiveState}
          playerIds={game.playerIds}
          players={gamePlayers}
          isAdmin={false}
        />
      )}

      {/* Clock mode: read-only view */}
      {game.liveState?.mode === 'clock' && (
        <ClockGameBoard
          liveState={game.liveState as ClockLiveState}
          playerIds={game.playerIds}
          players={gamePlayers}
          isAdmin={false}
        />
      )}

      {/* Cricket mode: read-only view */}
      {game.liveState?.mode === 'cricket' && (
        <CricketGameBoard
          liveState={game.liveState as CricketLiveState}
          playerIds={game.playerIds}
          players={gamePlayers}
          isAdmin={false}
        />
      )}

      {/* Turn history */}
      {game.liveState && (
        <GameTurnHistory liveState={game.liveState} players={gamePlayers} playerIds={game.playerIds} />
      )}

      {/* No liveState and not completed */}
      {!game.liveState && !isCompleted && (
        <p className="text-muted">Waiting for game to start...</p>
      )}
    </div>
  );
}
