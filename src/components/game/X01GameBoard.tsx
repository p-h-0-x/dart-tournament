import { useState, useCallback } from 'react';
import type { X01LiveState, StoredDart, Player, DartModifier } from '../../models/types';
import { createStoredDart } from '../../models/types';
import { processX01Turn, undoX01Turn, calcDartsTotal, isBust } from '../../engines/x01';

interface X01GameBoardProps {
  liveState: X01LiveState;
  playerIds: string[];
  players: Player[];
  isAdmin: boolean;
  onUpdateState?: (state: X01LiveState) => void;
  onUndoState?: (state: X01LiveState) => void;
}

export default function X01GameBoard({
  liveState,
  players,
  isAdmin,
  onUpdateState,
  onUndoState,
}: X01GameBoardProps) {
  const [darts, setDarts] = useState<StoredDart[]>([]);
  const [modifier, setModifier] = useState<DartModifier>('single');

  const getName = (id: string) => players.find((p) => p.id === id)?.name ?? 'Unknown';

  const currentPlayerId = liveState.playerOrder[liveState.currentPlayerIndex];
  const currentScore = liveState.scores[currentPlayerId] ?? 0;
  const isGameOver = liveState.playerOrder.filter((pid) => liveState.scores[pid] > 0).length <= 1
    && liveState.finishOrder.length > 0;

  const dartsTotal = calcDartsTotal(darts);
  const wouldBust = darts.length > 0 && isBust(currentScore, darts, liveState.outMode);
  const wouldFinish = !wouldBust && currentScore - dartsTotal === 0;

  const formatDart = (d: StoredDart): string => {
    if (d.number === 0) return 'Miss';
    const prefix = d.modifier === 'double' ? 'D' : d.modifier === 'triple' ? 'T' : '';
    if (d.number === 25) return prefix ? `${prefix}Bull` : 'Bull';
    return `${prefix}${d.number}`;
  };

  const addDart = useCallback(
    (number: number) => {
      if (darts.length >= 3) return;
      const mod = number === 25 && modifier === 'triple' ? 'single' : modifier;
      const finalMod = number === 0 ? 'single' : mod;
      setDarts((prev) => [...prev, createStoredDart(number, finalMod)]);
      setModifier('single');
    },
    [darts.length, modifier],
  );

  const undoLastDart = useCallback(() => {
    setDarts((prev) => prev.slice(0, -1));
  }, []);

  const clearDarts = useCallback(() => {
    setDarts([]);
    setModifier('single');
  }, []);

  const submitTurn = () => {
    if (!isAdmin || !onUpdateState || isGameOver || darts.length === 0) return;
    const newState = processX01Turn(liveState, currentPlayerId, darts);
    setDarts([]);
    setModifier('single');
    onUpdateState(newState);
  };

  const handleUndoTurn = () => {
    if (!isAdmin || liveState.history.length === 0) return;
    const handler = onUndoState ?? onUpdateState;
    if (!handler) return;
    setDarts([]);
    setModifier('single');
    handler(undoX01Turn(liveState));
  };

  return (
    <div>
      {/* Game info */}
      <div className="x01-board__info">
        <span className="x01-board__variant">{liveState.startScore}</span>
        <span className="x01-board__out-mode">{liveState.outMode === 'double' ? 'Double Out' : 'Straight Out'}</span>
      </div>

      {/* Player score cards */}
      <div className="x01-board__players">
        {liveState.playerOrder.map((pid) => {
          const score = liveState.scores[pid] ?? 0;
          const finished = score === 0;
          const isCurrent = pid === currentPlayerId && !isGameOver;
          const finishRank = liveState.finishOrder.indexOf(pid);
          const progress = ((liveState.startScore - score) / liveState.startScore) * 100;

          let cardClass = 'x01-board__player-card';
          if (isCurrent) cardClass += ' x01-board__player-card--current';
          if (finished) cardClass += ' x01-board__player-card--finished';

          return (
            <div key={pid} className={cardClass}>
              <div className="x01-board__player-name">{getName(pid)}</div>
              <div className="x01-board__player-score">{score}</div>
              <div className="x01-board__progress-bar">
                <div className="x01-board__progress-fill" style={{ width: `${progress}%` }} />
              </div>
              {finished && finishRank >= 0 && (
                <span className="x01-board__badge--finished">#{finishRank + 1}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Admin dart input */}
      {isAdmin && !isGameOver && (
        <div className="dart-input">
          <div className="x01-board__current-info">
            <div className="x01-board__current-player">{getName(currentPlayerId)}'s turn</div>
            <div className="x01-board__current-remaining">
              Remaining: {currentScore}
              {darts.length > 0 && (
                <span className={wouldBust ? 'x01-board__preview--bust' : wouldFinish ? 'x01-board__preview--finish' : ''}>
                  {' '}&rarr; {wouldBust ? 'BUST' : currentScore - dartsTotal}
                </span>
              )}
            </div>
          </div>

          {/* Dart slots */}
          <div className="dart-input__slots">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`dart-input__slot ${darts[i] ? 'dart-input__slot--filled' : ''}`}>
                {darts[i] ? formatDart(darts[i]) : '-'}
              </div>
            ))}
            <div className="dart-input__total">{dartsTotal}</div>
          </div>

          {/* Bust / finish indicator */}
          {wouldBust && (
            <p style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 600, margin: '0.5rem 0' }}>
              BUST! Score resets to {currentScore}.
            </p>
          )}
          {wouldFinish && (
            <p style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600, margin: '0.5rem 0' }}>
              Checkout! Submit to finish.
            </p>
          )}

          {/* Modifier buttons */}
          {darts.length < 3 && (
            <div className="dart-input__modifiers">
              {(['single', 'double', 'triple'] as DartModifier[]).map((mod) => (
                <button
                  key={mod}
                  className={`dart-input__mod-btn ${modifier === mod ? 'dart-input__mod-btn--active' : ''}`}
                  onClick={() => setModifier(mod)}
                  disabled={darts.length >= 3}
                >
                  {mod === 'single' ? 'S' : mod === 'double' ? 'D' : 'T'}
                </button>
              ))}
            </div>
          )}

          {/* Number grid */}
          {darts.length < 3 && (
            <div className="dart-input__grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((num) => (
                <button
                  key={num}
                  className="dart-input__num-btn"
                  onClick={() => addDart(num)}
                  disabled={darts.length >= 3}
                >
                  {num}
                </button>
              ))}
              <button
                className="dart-input__num-btn dart-input__num-btn--bull"
                onClick={() => addDart(25)}
                disabled={darts.length >= 3}
              >
                Bull
              </button>
              <button
                className="dart-input__num-btn dart-input__num-btn--miss"
                onClick={() => addDart(0)}
                disabled={darts.length >= 3}
              >
                Miss
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="dart-input__actions">
            <button
              className="btn btn-outline btn-sm"
              onClick={undoLastDart}
              disabled={darts.length === 0}
            >
              Undo Dart
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={clearDarts}
              disabled={darts.length === 0}
            >
              Clear
            </button>
            <button
              className="btn btn-success btn-sm"
              onClick={submitTurn}
              disabled={darts.length === 0}
            >
              Submit Turn
            </button>
          </div>

          {/* Undo previous turn */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.75rem' }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleUndoTurn}
              disabled={liveState.history.length === 0}
            >
              Undo Previous Turn
            </button>
          </div>
        </div>
      )}

      {/* Read-only view for non-admin */}
      {!isAdmin && !isGameOver && (
        <div className="x01-board__current-info">
          <div className="x01-board__current-player">{getName(currentPlayerId)}'s turn</div>
          <div className="x01-board__current-remaining">Remaining: {currentScore}</div>
        </div>
      )}
    </div>
  );
}
