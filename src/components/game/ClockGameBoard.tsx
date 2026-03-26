import type { ClockLiveState, StoredDart, Player } from '../../models/types';
import { getClockTargetName, getClockProgress, processClockDarts, CLOCK_MAX_TURNS, CLOCK_POSITION_FINISHED } from '../../engines/clock';
import DartInput from './DartInput';

interface ClockGameBoardProps {
  liveState: ClockLiveState;
  playerIds: string[];
  players: Player[];
  isAdmin: boolean;
  onUpdateState?: (state: ClockLiveState) => void;
}

export default function ClockGameBoard({
  liveState,
  players,
  isAdmin,
  onUpdateState,
}: ClockGameBoardProps) {
  const getName = (id: string) => players.find((p) => p.id === id)?.name ?? 'Unknown';

  const currentPlayerId = liveState.playerOrder[liveState.currentPlayerIndex];
  const currentPos = liveState.positions[currentPlayerId] ?? 1;
  const currentTarget = getClockTargetName(currentPos);

  // Check if game is over
  const allFinishedOrMaxTurns = liveState.playerOrder.every((pid) =>
    liveState.finished[pid] || (liveState.turnCounts[pid] ?? 0) >= CLOCK_MAX_TURNS,
  );
  const anyoneFinished = liveState.finishOrder.length > 0;
  const isGameOver = anyoneFinished || allFinishedOrMaxTurns;

  // Determine which numbers are allowed for the current target
  const getAllowedNumbers = (): number[] | undefined => {
    if (currentPos >= CLOCK_POSITION_FINISHED) return undefined;
    if (currentPos > 10) return [25]; // Bull target: only bull
    return [currentPos]; // Number target: only the target number
  };

  // Whether to show modifiers (hide for Bull target)
  const showModifiers = currentPos <= 10;

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

  const handleDartsConfirmed = (darts: StoredDart[]) => {
    if (!isAdmin || !onUpdateState || isGameOver) return;

    const pid = currentPlayerId;
    const startPos = liveState.positions[pid] ?? 1;
    const result = processClockDarts(darts, startPos);

    const snapshot = {
      playerId: pid,
      prevPos: startPos,
      newPos: result.endPosition,
      darts,
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

    // Determine next player
    let nextIdx = liveState.currentPlayerIndex;
    const newState: ClockLiveState = {
      ...liveState,
      positions: newPositions,
      finished: newFinished,
      finishOrder: newFinishOrder,
      turnCounts: newTurnCounts,
      history: [...liveState.history, snapshot],
      currentPlayerIndex: nextIdx, // placeholder
    };

    if (result.extraTurn) {
      // Same player goes again
      newState.currentPlayerIndex = liveState.currentPlayerIndex;
    } else {
      newState.currentPlayerIndex = getNextPlayerIndex(liveState.currentPlayerIndex, newState);
    }

    onUpdateState(newState);
  };

  const handleUndo = () => {
    if (!isAdmin || !onUpdateState || liveState.history.length === 0) return;
    const prev = liveState.history[liveState.history.length - 1];

    const newPositions = { ...liveState.positions, [prev.playerId]: prev.prevPos };
    const newFinished = { ...liveState.finished };
    const newTurnCounts = { ...liveState.turnCounts, [prev.playerId]: (liveState.turnCounts[prev.playerId] ?? 1) - 1 };

    // Restore finish state
    if (liveState.finished[prev.playerId] && prev.prevPos < CLOCK_POSITION_FINISHED) {
      newFinished[prev.playerId] = false;
    }

    onUpdateState({
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

          let cardClass = 'clock-board__player-card';
          if (isCurrent) cardClass += ' clock-board__player-card--current';
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
            </div>
          );
        })}
      </div>

      {/* Current turn info */}
      {isAdmin && !isGameOver && (
        <div>
          <div className="clock-board__current-info">
            <div className="clock-board__current-player">{getName(currentPlayerId)}'s turn</div>
            <div className="clock-board__current-target">Target: {currentTarget}</div>
          </div>
          <DartInput
            onDartsConfirmed={handleDartsConfirmed}
            allowedNumbers={getAllowedNumbers()}
            showModifiers={showModifiers}
            label={`Hit ${currentTarget}`}
          />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.75rem' }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleUndo}
              disabled={liveState.history.length === 0}
            >
              Undo Turn
            </button>
          </div>
        </div>
      )}

      {/* Read-only view for non-admin */}
      {!isAdmin && !isGameOver && (
        <div className="clock-board__current-info">
          <div className="clock-board__current-player">{getName(currentPlayerId)}'s turn</div>
          <div className="clock-board__current-target">Target: {currentTarget}</div>
        </div>
      )}
    </div>
  );
}
