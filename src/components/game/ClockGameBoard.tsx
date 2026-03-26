import { useState, useCallback } from 'react';
import type { ClockLiveState, StoredDart, Player, DartModifier } from '../../models/types';
import { createStoredDart } from '../../models/types';
import { getClockTargetName, getClockProgress, getClockPreviewTarget, processClockDarts, CLOCK_MAX_TURNS, CLOCK_POSITION_FINISHED } from '../../engines/clock';

interface ClockGameBoardProps {
  liveState: ClockLiveState;
  playerIds: string[];
  players: Player[];
  isAdmin: boolean;
  onUpdateState?: (state: ClockLiveState) => void;
  /** Separate handler for undo that skips game-completion checks. */
  onUndoState?: (state: ClockLiveState) => void;
}

export default function ClockGameBoard({
  liveState,
  players,
  isAdmin,
  onUpdateState,
  onUndoState,
}: ClockGameBoardProps) {
  const [darts, setDarts] = useState<StoredDart[]>([]);
  const [modifier, setModifier] = useState<DartModifier>('single');

  const getName = (id: string) => players.find((p) => p.id === id)?.name ?? 'Unknown';

  const currentPlayerId = liveState.playerOrder[liveState.currentPlayerIndex];
  const currentStartPos = liveState.positions[currentPlayerId] ?? 1;

  // Check if game is over
  const allFinishedOrMaxTurns = liveState.playerOrder.every((pid) =>
    liveState.finished[pid] || (liveState.turnCounts[pid] ?? 0) >= CLOCK_MAX_TURNS,
  );
  const anyoneFinished = liveState.finishOrder.length > 0;
  const isGameOver = anyoneFinished || allFinishedOrMaxTurns;

  // Detect extra turn: last history entry was this same player and had extraTurn
  const lastHistory = liveState.history.length > 0 ? liveState.history[liveState.history.length - 1] : null;
  const isExtraTurn = lastHistory?.playerId === currentPlayerId && lastHistory?.extraTurn === true;

  // Dynamic target: preview where we are after the darts entered so far
  const previewPos = getClockPreviewTarget(darts, currentStartPos);
  const previewFinished = previewPos >= CLOCK_POSITION_FINISHED;
  const currentTargetName = getClockTargetName(previewPos);

  // Determine which number button to show based on current preview position
  const getTargetNumber = (): number | null => {
    if (previewFinished) return null; // already finished mid-turn
    if (previewPos > 10) return 25; // Bull
    return previewPos; // 1-10
  };

  const showModifiers = previewPos <= 10 && !previewFinished;
  const targetNumber = getTargetNumber();

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

  const getNextPlayerIndex = (fromIndex: number, state: ClockLiveState): number => {
    const order = state.playerOrder;
    for (let i = 1; i <= order.length; i++) {
      const idx = (fromIndex + i) % order.length;
      const pid = order[idx];
      if (!state.finished[pid] && (state.turnCounts[pid] ?? 0) < CLOCK_MAX_TURNS) {
        return idx;
      }
    }
    return fromIndex;
  };

  const submitTurn = () => {
    if (!isAdmin || !onUpdateState || isGameOver || darts.length === 0) return;

    const pid = currentPlayerId;
    const startPos = liveState.positions[pid] ?? 1;
    const result = processClockDarts(darts, startPos);

    const snapshot = {
      playerId: pid,
      prevPos: startPos,
      newPos: result.endPosition,
      darts: [...darts],
      extraTurn: result.extraTurn,
      finishOrderBefore: [...liveState.finishOrder],
    };

    const newPositions = { ...liveState.positions, [pid]: result.endPosition };
    const newFinished = { ...liveState.finished };
    const newFinishOrder = [...liveState.finishOrder];
    const newTurnCounts = { ...liveState.turnCounts, [pid]: (liveState.turnCounts[pid] ?? 0) + 1 };

    if (result.finished && !liveState.finished[pid]) {
      newFinished[pid] = true;
      newFinishOrder.push(pid);
    }

    const newState: ClockLiveState = {
      ...liveState,
      positions: newPositions,
      finished: newFinished,
      finishOrder: newFinishOrder,
      turnCounts: newTurnCounts,
      history: [...liveState.history, snapshot],
      currentPlayerIndex: liveState.currentPlayerIndex,
    };

    if (result.extraTurn) {
      newState.currentPlayerIndex = liveState.currentPlayerIndex;
    } else {
      newState.currentPlayerIndex = getNextPlayerIndex(liveState.currentPlayerIndex, newState);
    }

    setDarts([]);
    setModifier('single');
    onUpdateState(newState);
  };

  const handleUndoTurn = () => {
    if (!isAdmin || liveState.history.length === 0) return;
    const handler = onUndoState ?? onUpdateState;
    if (!handler) return;

    const prev = liveState.history[liveState.history.length - 1];

    const newPositions = { ...liveState.positions, [prev.playerId]: prev.prevPos };
    const newFinished = { ...liveState.finished };
    const newTurnCounts = { ...liveState.turnCounts, [prev.playerId]: (liveState.turnCounts[prev.playerId] ?? 1) - 1 };

    if (liveState.finished[prev.playerId] && prev.prevPos < CLOCK_POSITION_FINISHED) {
      newFinished[prev.playerId] = false;
    }

    setDarts([]);
    setModifier('single');
    handler({
      ...liveState,
      currentPlayerIndex: liveState.playerOrder.indexOf(prev.playerId),
      positions: newPositions,
      finished: newFinished,
      finishOrder: prev.finishOrderBefore,
      turnCounts: newTurnCounts,
      history: liveState.history.slice(0, -1),
    });
  };

  return (
    <div>
      {/* Player cards */}
      <div className="clock-board__players">
        {liveState.playerOrder.map((pid) => {
          const pos = liveState.positions[pid] ?? 1;
          const fin = liveState.finished[pid] ?? false;
          const isCurrent = pid === currentPlayerId && !isGameOver;
          const progress = getClockProgress(pos, fin);
          const finishRank = liveState.finishOrder.indexOf(pid);
          const turns = liveState.turnCounts[pid] ?? 0;
          const isExtra = isCurrent && isExtraTurn;

          let cardClass = 'clock-board__player-card';
          if (isCurrent) cardClass += ' clock-board__player-card--current';
          if (isExtra) cardClass += ' clock-board__player-card--extra-turn';
          if (fin) cardClass += ' clock-board__player-card--finished';

          return (
            <div key={pid} className={cardClass}>
              <div className="clock-board__player-name">{getName(pid)}</div>
              <div className="clock-board__player-target">
                Target: {getClockTargetName(pos)}
              </div>
              <div className="clock-board__progress-bar">
                <div className="clock-board__progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="clock-board__progress-text">
                {fin ? 'Finished' : `${pos - 1}/11`} · Turn {turns}/{CLOCK_MAX_TURNS}
              </div>
              {fin && finishRank >= 0 && (
                <span className="clock-board__badge--finished">#{finishRank + 1}</span>
              )}
              {isExtra && (
                <span className="clock-board__extra-turn">EXTRA TURN</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Admin: inline clock dart input */}
      {isAdmin && !isGameOver && (
        <div className="dart-input">
          <div className="clock-board__current-info">
            <div className="clock-board__current-player">
              {getName(currentPlayerId)}'s turn
              {isExtraTurn && <span className="clock-board__extra-turn" style={{ marginLeft: '0.5rem' }}>EXTRA TURN</span>}
            </div>
            <div className="clock-board__current-target">Target: {currentTargetName}</div>
          </div>

          {/* Dart slots */}
          <div className="dart-input__slots">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`dart-input__slot ${darts[i] ? 'dart-input__slot--filled' : ''}`}>
                {darts[i] ? formatDart(darts[i]) : '-'}
              </div>
            ))}
          </div>

          {/* Modifier buttons (only for number targets 1-10) */}
          {showModifiers && darts.length < 3 && !previewFinished && (
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

          {/* Target button + Miss (dynamic per dart) */}
          {darts.length < 3 && !previewFinished && (
            <div className="dart-input__grid" style={{ gridTemplateColumns: targetNumber === 25 ? '1fr 1fr' : 'repeat(2, 1fr)' }}>
              {targetNumber !== null && (
                <button
                  className={`dart-input__num-btn ${targetNumber === 25 ? 'dart-input__num-btn--bull' : ''}`}
                  onClick={() => addDart(targetNumber)}
                >
                  {targetNumber === 25 ? 'Bull' : targetNumber}
                </button>
              )}
              <button
                className="dart-input__num-btn dart-input__num-btn--miss"
                onClick={() => addDart(0)}
              >
                Miss
              </button>
            </div>
          )}

          {/* Finished mid-turn message */}
          {previewFinished && darts.length < 3 && (
            <p style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600, margin: '0.75rem 0' }}>
              Finished! Submit to confirm.
            </p>
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
        <div className="clock-board__current-info">
          <div className="clock-board__current-player">
            {getName(currentPlayerId)}'s turn
            {isExtraTurn && <span className="clock-board__extra-turn" style={{ marginLeft: '0.5rem' }}>EXTRA TURN</span>}
          </div>
          <div className="clock-board__current-target">Target: {getClockTargetName(currentStartPos)}</div>
        </div>
      )}
    </div>
  );
}
