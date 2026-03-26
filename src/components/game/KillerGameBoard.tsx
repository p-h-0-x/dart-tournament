import { useState } from 'react';
import { BOARD_ORDER, type KillerLiveState, type StoredDart, type Player } from '../../models/types';
import { getAdjacentNumbers, processKillerTurn, applyKillerChanges, KILLER_MAX_LIVES } from '../../engines/killer';
import DartInput from './DartInput';

interface KillerGameBoardProps {
  liveState: KillerLiveState;
  playerIds: string[];
  players: Player[];
  isAdmin: boolean;
  onUpdateState?: (state: KillerLiveState) => void;
}

export default function KillerGameBoard({
  liveState,
  players,
  isAdmin,
  onUpdateState,
}: KillerGameBoardProps) {
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);

  const getName = (id: string) => players.find((p) => p.id === id)?.name ?? 'Unknown';

  const currentPlayerId = liveState.playerOrder[liveState.currentPlayerIndex];
  const isNumberPhase = liveState.phase === 'number';

  // Numbers already taken
  const takenNumbers = new Set(Object.values(liveState.numbers));

  // Get next alive player index
  const getNextAlivePlayerIndex = (fromIndex: number): number => {
    const order = liveState.playerOrder;
    for (let i = 1; i <= order.length; i++) {
      const idx = (fromIndex + i) % order.length;
      if (!liveState.eliminated[order[idx]]) return idx;
    }
    return fromIndex;
  };

  // --- Number selection phase ---
  const handleSelectNumber = () => {
    if (!isAdmin || !isNumberPhase || !selectedNumber || !onUpdateState) return;
    const pid = currentPlayerId;

    const newNumbers = { ...liveState.numbers, [pid]: selectedNumber };
    const allPicked = liveState.playerOrder.every((p) => newNumbers[p] != null);

    if (allPicked) {
      // Transition to play phase
      onUpdateState({
        ...liveState,
        phase: 'play',
        currentPlayerIndex: 0,
        numbers: newNumbers,
      });
    } else {
      // Next player picks
      const nextIdx = (liveState.currentPlayerIndex + 1) % liveState.playerOrder.length;
      onUpdateState({
        ...liveState,
        currentPlayerIndex: nextIdx,
        numbers: newNumbers,
      });
    }
    setSelectedNumber(null);
  };

  // --- Play phase ---
  const handleDartsConfirmed = (darts: StoredDart[]) => {
    if (!isAdmin || isNumberPhase || !onUpdateState) return;

    const pid = currentPlayerId;
    const throwerNum = liveState.numbers[pid];
    const allPlayersForTurn = liveState.playerOrder
      .filter((p) => !liveState.eliminated[p])
      .map((p) => ({ playerId: p, number: liveState.numbers[p] }));

    // Snapshot for undo
    const snapshot = {
      playerId: pid,
      darts,
      livesBefore: { ...liveState.lives },
      killerBefore: { ...liveState.isKiller },
      eliminatedBefore: { ...liveState.eliminated },
    };

    const changes = processKillerTurn(
      pid,
      throwerNum,
      liveState.isKiller[pid] ?? false,
      darts,
      allPlayersForTurn,
    );

    const { lives, isKiller, eliminated } = applyKillerChanges(
      liveState.lives,
      liveState.isKiller,
      liveState.eliminated,
      changes,
    );

    const nextIdx = getNextAlivePlayerIndex(liveState.currentPlayerIndex);

    onUpdateState({
      ...liveState,
      currentPlayerIndex: nextIdx,
      lives,
      isKiller,
      eliminated,
      history: [...liveState.history, snapshot],
    });
  };

  const handleUndo = () => {
    if (!isAdmin || !onUpdateState || liveState.history.length === 0) return;
    const prev = liveState.history[liveState.history.length - 1];

    onUpdateState({
      ...liveState,
      currentPlayerIndex: liveState.playerOrder.indexOf(prev.playerId),
      lives: prev.livesBefore,
      isKiller: prev.killerBefore,
      eliminated: prev.eliminatedBefore,
      history: liveState.history.slice(0, -1),
    });
  };

  // Check game over
  const aliveCount = liveState.playerOrder.filter((p) => !liveState.eliminated[p]).length;
  const isGameOver = aliveCount <= 1;

  // Highlight numbers for current player's DartInput
  const currentPlayerNum = liveState.numbers[currentPlayerId];
  const currentPlayerAdj = currentPlayerNum ? getAdjacentNumbers(currentPlayerNum) : [];
  const relevantNumbers = currentPlayerNum ? [currentPlayerNum, ...currentPlayerAdj] : [];

  return (
    <div>
      {/* Player cards */}
      <div className="killer-board__players">
        {liveState.playerOrder.map((pid) => {
          const lives = liveState.lives[pid] ?? 0;
          const isKillerStatus = liveState.isKiller[pid] ?? false;
          const isEliminated = liveState.eliminated[pid] ?? false;
          const isCurrent = pid === currentPlayerId && !isGameOver;
          const livesPercent = Math.max(0, (lives / KILLER_MAX_LIVES) * 100);

          let cardClass = 'killer-board__player-card';
          if (isCurrent) cardClass += ' killer-board__player-card--current';
          if (isKillerStatus && !isEliminated) cardClass += ' killer-board__player-card--killer';
          if (isEliminated) cardClass += ' killer-board__player-card--eliminated';

          return (
            <div key={pid} className={cardClass}>
              <div className="killer-board__player-name">{getName(pid)}</div>
              {liveState.numbers[pid] != null && (
                <div className="killer-board__player-number">#{liveState.numbers[pid]}</div>
              )}
              {!isNumberPhase && (
                <>
                  <div className="killer-board__lives-bar">
                    <div
                      className={`killer-board__lives-fill ${isKillerStatus ? 'killer-board__lives-fill--killer' : ''}`}
                      style={{ width: `${livesPercent}%` }}
                    />
                  </div>
                  <div className="killer-board__lives-count">{lives} lives</div>
                </>
              )}
              {isKillerStatus && !isEliminated && (
                <span className="killer-board__badge killer-board__badge--killer">KILLER</span>
              )}
              {isEliminated && (
                <span className="killer-board__badge killer-board__badge--eliminated">OUT</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Number selection phase */}
      {isAdmin && isNumberPhase && !isGameOver && (
        <div>
          <div className="killer-board__phase-title">
            {getName(currentPlayerId)} — Pick your number
          </div>
          <div className="dart-input__grid">
            {BOARD_ORDER.map((num) => (
              <button
                key={num}
                className={`dart-input__num-btn ${selectedNumber === num ? 'dart-input__mod-btn--active' : ''}`}
                onClick={() => setSelectedNumber(num)}
                disabled={takenNumbers.has(num)}
                style={takenNumbers.has(num) ? { opacity: 0.3 } : undefined}
              >
                {num}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.75rem' }}>
            <button
              className="btn btn-primary"
              onClick={handleSelectNumber}
              disabled={!selectedNumber}
            >
              Confirm #{selectedNumber ?? '?'}
            </button>
          </div>
        </div>
      )}

      {/* Play phase */}
      {isAdmin && !isNumberPhase && !isGameOver && (
        <div>
          <div className="killer-board__phase-title">
            {getName(currentPlayerId)}'s turn
            {liveState.isKiller[currentPlayerId] && ' (KILLER)'}
          </div>
          <DartInput
            onDartsConfirmed={handleDartsConfirmed}
            allowedNumbers={relevantNumbers.length > 0 ? relevantNumbers : undefined}
            label={`Target: #${currentPlayerNum}`}
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

      {/* Read-only view for non-admin in play phase */}
      {!isAdmin && !isNumberPhase && !isGameOver && (
        <div className="killer-board__phase-title">
          {getName(currentPlayerId)}'s turn
        </div>
      )}
    </div>
  );
}
