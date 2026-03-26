import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { onGameChange, updateGameLiveState, completeGame, completeGameAndAdvanceTournament } from '../../services/database';
import type { Game, ClassicLiveState, KillerLiveState, ClockLiveState, StoredDart, GameResult } from '../../models/types';
import { GAME_MODE_LABELS } from '../../models/types';
import { submitClassicRound, undoClassicRound, isClassicComplete, getClassicResults } from '../../engines/classic';
import { isKillerGameOver, getKillerWinner } from '../../engines/killer';
import { determineClockWinner } from '../../engines/clock';
import ClassicGameBoard from '../../components/game/ClassicGameBoard';
import KillerGameBoard from '../../components/game/KillerGameBoard';
import ClockGameBoard from '../../components/game/ClockGameBoard';
import GameResultsBanner from '../../components/game/GameResultsBanner';

export default function GamePlayPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { players } = useData();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const handleCompleteGame = async (results: GameResult[], winnerId?: string) => {
    if (!id || saving) return;
    setSaving(true);
    try {
      if (game.tournamentId != null && winnerId) {
        await completeGameAndAdvanceTournament(
          id,
          results,
          game.tournamentId,
          (matches) =>
            matches.map((m) =>
              m.round === game.tournamentRound && m.matchIndex === game.tournamentMatchIndex
                ? { ...m, winnerId, status: 'completed' as const }
                : m,
            ),
        );
      } else {
        await completeGame(id, results);
      }
    } finally {
      setSaving(false);
    }
  };

  // --- Classic mode handlers ---
  const handleClassicSubmitRound = async (playerDarts: Record<string, StoredDart[]>) => {
    if (!id || !game.liveState || game.liveState.mode !== 'classic') return;
    setSaving(true);
    try {
      const newState = submitClassicRound(game.liveState, playerDarts, game.playerIds);
      await updateGameLiveState(id, newState);

      // Check if game is complete
      if (isClassicComplete(newState)) {
        const results = getClassicResults(newState, game.playerIds);
        const winners = results.filter((r) => r.rank === 1);
        // Auto-complete if single winner or no tournament
        if (winners.length === 1 || !game.tournamentId) {
          await handleCompleteGame(results, winners.length === 1 ? winners[0].playerId : undefined);
        }
        // If tied + tournament: the results banner will handle pick-winner flow
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClassicUndoRound = async () => {
    if (!id || !game.liveState || game.liveState.mode !== 'classic') return;
    setSaving(true);
    try {
      const newState = undoClassicRound(game.liveState, game.playerIds);
      await updateGameLiveState(id, newState);
    } finally {
      setSaving(false);
    }
  };

  // --- Killer mode handler ---
  const handleKillerStateUpdate = async (newState: KillerLiveState) => {
    if (!id) return;
    setSaving(true);
    try {
      await updateGameLiveState(id, newState);

      // Check if game is over
      if (isKillerGameOver(newState.eliminated, newState.playerOrder.length)) {
        const winnerId = getKillerWinner(newState.playerOrder, newState.eliminated);
        const results: GameResult[] = newState.playerOrder.map((pid, _i) => ({
          playerId: pid,
          score: newState.lives[pid] ?? 0,
          rank: pid === winnerId ? 1 : 2,
        }));
        if (winnerId) {
          await handleCompleteGame(results, winnerId);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  // --- Clock mode handler ---
  const handleClockStateUpdate = async (newState: ClockLiveState) => {
    if (!id) return;
    setSaving(true);
    try {
      await updateGameLiveState(id, newState);

      // Check if game is over (anyone finished or all max turns)
      const anyFinished = newState.finishOrder.length > 0;
      const allMaxTurns = newState.playerOrder.every(
        (pid) => newState.finished[pid] || (newState.turnCounts[pid] ?? 0) >= 10,
      );

      if (anyFinished || allMaxTurns) {
        const { winners, isTie } = determineClockWinner(
          newState.playerOrder,
          newState.positions,
          newState.finishOrder,
        );
        const results: GameResult[] = newState.playerOrder.map((pid) => ({
          playerId: pid,
          score: newState.positions[pid] ?? 1,
          rank: winners.includes(pid) ? 1 : 2,
        }));

        if (!isTie || !game.tournamentId) {
          await handleCompleteGame(results, winners[0]);
        }
        // If tied in tournament: results banner handles pick-winner
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePickWinner = async (winnerId: string) => {
    if (!game.liveState) return;
    let results: GameResult[] = [];
    if (game.liveState.mode === 'classic') {
      results = getClassicResults(game.liveState, game.playerIds);
    } else if (game.liveState.mode === 'clock') {
      const ls = game.liveState as ClockLiveState;
      const { winners } = determineClockWinner(ls.playerOrder, ls.positions, ls.finishOrder);
      results = ls.playerOrder.map((pid) => ({
        playerId: pid,
        score: ls.positions[pid] ?? 1,
        rank: winners.includes(pid) ? 1 : 2,
      }));
    } else if (game.liveState.mode === 'killer') {
      const ls = game.liveState as KillerLiveState;
      results = ls.playerOrder.map((pid) => ({
        playerId: pid,
        score: ls.lives[pid] ?? 0,
        rank: pid === winnerId ? 1 : 2,
      }));
    }
    await handleCompleteGame(results, winnerId);
  };

  const handleBackToTournament = () => {
    if (game.tournamentId) {
      navigate(`/admin/tournaments`);
    }
  };

  return (
    <div>
      <div className="game-play-page__header">
        <div>
          <div className="game-play-page__title">
            <span className="game-play-page__mode-tag">{modeLabel}</span>
            {' '}Game
          </div>
          <div className="game-play-page__status">
            {isCompleted ? 'Completed' : 'In Progress'}
            {game.tournamentId && ' · Tournament Game'}
          </div>
        </div>
      </div>

      {/* Completed: show results */}
      {isCompleted && game.results.length > 0 && (
        <GameResultsBanner
          results={game.results}
          players={gamePlayers}
          tournamentId={game.tournamentId}
          onBackToTournament={game.tournamentId ? handleBackToTournament : undefined}
        />
      )}

      {/* Classic mode */}
      {game.liveState?.mode === 'classic' && (
        <>
          <ClassicGameBoard
            liveState={game.liveState as ClassicLiveState}
            playerIds={game.playerIds}
            players={gamePlayers}
            isAdmin={!isCompleted}
            onSubmitRound={handleClassicSubmitRound}
            onUndoRound={handleClassicUndoRound}
          />

          {/* Tie resolution: game is mechanically complete but not yet marked complete */}
          {!isCompleted && isClassicComplete(game.liveState as ClassicLiveState) && (
            <GameResultsBanner
              results={getClassicResults(game.liveState as ClassicLiveState, game.playerIds)}
              players={gamePlayers}
              tournamentId={game.tournamentId}
              isAdmin={true}
              onPickWinner={handlePickWinner}
              onBackToTournament={game.tournamentId ? handleBackToTournament : undefined}
            />
          )}
        </>
      )}

      {/* Killer mode */}
      {game.liveState?.mode === 'killer' && (
        <KillerGameBoard
          liveState={game.liveState as KillerLiveState}
          playerIds={game.playerIds}
          players={gamePlayers}
          isAdmin={!isCompleted}
          onUpdateState={handleKillerStateUpdate}
        />
      )}

      {/* Clock mode */}
      {game.liveState?.mode === 'clock' && (
        <>
          <ClockGameBoard
            liveState={game.liveState as ClockLiveState}
            playerIds={game.playerIds}
            players={gamePlayers}
            isAdmin={!isCompleted}
            onUpdateState={handleClockStateUpdate}
          />

          {/* Tie resolution for clock in tournament context */}
          {!isCompleted && (() => {
            const ls = game.liveState as ClockLiveState;
            const anyFinished = ls.finishOrder.length > 0;
            const allMaxTurns = ls.playerOrder.every(
              (pid) => ls.finished[pid] || (ls.turnCounts[pid] ?? 0) >= 10,
            );
            if (!anyFinished && !allMaxTurns) return null;
            const { winners, isTie } = determineClockWinner(ls.playerOrder, ls.positions, ls.finishOrder);
            if (!isTie || !game.tournamentId) return null;
            const results = ls.playerOrder.map((pid) => ({
              playerId: pid,
              score: ls.positions[pid] ?? 1,
              rank: winners.includes(pid) ? 1 : 2,
            }));
            return (
              <GameResultsBanner
                results={results}
                players={gamePlayers}
                tournamentId={game.tournamentId}
                isAdmin={true}
                onPickWinner={handlePickWinner}
                onBackToTournament={game.tournamentId ? handleBackToTournament : undefined}
              />
            );
          })()}
        </>
      )}

      {/* No liveState and not completed: legacy game */}
      {!game.liveState && !isCompleted && (
        <p className="text-muted">This game has no live state. It may have been created before the game engine was integrated.</p>
      )}
    </div>
  );
}
