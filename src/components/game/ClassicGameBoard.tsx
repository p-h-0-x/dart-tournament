import { useState } from 'react';
import { CONTRACTS, type ClassicLiveState, type StoredDart, type Player } from '../../models/types';
import DartInput from './DartInput';

interface ClassicGameBoardProps {
  liveState: ClassicLiveState;
  playerIds: string[];
  players: Player[];
  isAdmin: boolean;
  onSubmitRound?: (playerDarts: Record<string, StoredDart[]>) => void;
  onUndoRound?: () => void;
}

export default function ClassicGameBoard({
  liveState,
  playerIds,
  players,
  isAdmin,
  onSubmitRound,
  onUndoRound,
}: ClassicGameBoardProps) {
  const [pendingDarts, setPendingDarts] = useState<Record<string, StoredDart[]>>(() => {
    const init: Record<string, StoredDart[]> = {};
    for (const pid of playerIds) init[pid] = [];
    return init;
  });

  const getName = (id: string) => players.find((p) => p.id === id)?.name ?? 'Unknown';
  const isComplete = liveState.currentRound >= CONTRACTS.length;
  const currentContract = isComplete ? null : CONTRACTS[liveState.currentRound];

  const allPlayersHaveDarts = playerIds.every((pid) => (pendingDarts[pid]?.length ?? 0) > 0);

  const handleConfirmDarts = (playerId: string, darts: StoredDart[]) => {
    setPendingDarts((prev) => ({ ...prev, [playerId]: darts }));
  };

  const handleSubmitRound = () => {
    if (!allPlayersHaveDarts || !onSubmitRound) return;
    onSubmitRound(pendingDarts);
    // Reset pending darts
    const reset: Record<string, StoredDart[]> = {};
    for (const pid of playerIds) reset[pid] = [];
    setPendingDarts(reset);
  };

  const handleUndoRound = () => {
    onUndoRound?.();
    // Reset pending darts
    const reset: Record<string, StoredDart[]> = {};
    for (const pid of playerIds) reset[pid] = [];
    setPendingDarts(reset);
  };

  return (
    <div className="classic-board">
      {/* Current round display */}
      {!isComplete && currentContract && (
        <div className="classic-board__round-display">
          <div className="classic-board__round-name">{currentContract.name}</div>
          <div className="classic-board__round-num">
            Round {liveState.currentRound + 1} of {CONTRACTS.length}
          </div>
        </div>
      )}

      {/* Score table */}
      <div className="table-container">
        <table className="classic-board__table">
          <thead>
            <tr>
              <th>Contract</th>
              {playerIds.map((pid) => (
                <th key={pid}>{getName(pid)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CONTRACTS.map((contract, roundIdx) => {
              const round = liveState.rounds[roundIdx];
              const isCurrent = roundIdx === liveState.currentRound;
              const isFuture = roundIdx > liveState.currentRound;

              return (
                <tr
                  key={contract.id}
                  className={isCurrent ? 'classic-board__row--current' : ''}
                >
                  <td>{contract.name}</td>
                  {playerIds.map((pid) => {
                    if (isFuture || !round) {
                      return <td key={pid}>-</td>;
                    }
                    const pr = round.players[pid];
                    if (!pr) return <td key={pid}>-</td>;

                    if (roundIdx === 0) {
                      // Capital round: always show score
                      return (
                        <td key={pid} className="classic-board__cell--capital">
                          {pr.capitalAfter}
                        </td>
                      );
                    }

                    return (
                      <td
                        key={pid}
                        className={pr.success ? 'classic-board__cell--success' : 'classic-board__cell--fail'}
                      >
                        {pr.success ? `+${pr.score}` : '½'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {/* Total row */}
            <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border)' }}>
              <td>Total</td>
              {playerIds.map((pid) => (
                <td key={pid} className="classic-board__cell--capital">
                  {liveState.capitals[pid] ?? 0}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Admin: dart inputs for current round */}
      {isAdmin && !isComplete && (
        <>
          <div className="classic-board__inputs">
            {playerIds.map((pid) => (
              <DartInput
                key={pid}
                label={getName(pid)}
                onDartsConfirmed={(darts) => handleConfirmDarts(pid, darts)}
                disabled={pendingDarts[pid]?.length > 0}
              />
            ))}
          </div>

          {/* Show confirmed darts summary */}
          {playerIds.some((pid) => pendingDarts[pid]?.length > 0) && (
            <div style={{ marginBottom: '0.75rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {playerIds.map((pid) => {
                const darts = pendingDarts[pid];
                if (!darts || darts.length === 0) return null;
                const total = darts.reduce((s, d) => s + d.score, 0);
                return (
                  <span key={pid} style={{ marginRight: '1rem' }}>
                    {getName(pid)}: {total} pts
                  </span>
                );
              })}
            </div>
          )}

          <div className="classic-board__actions">
            <button
              className="btn btn-outline"
              onClick={handleUndoRound}
              disabled={liveState.rounds.length === 0}
            >
              Undo Round
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmitRound}
              disabled={!allPlayersHaveDarts}
            >
              Submit Round
            </button>
          </div>
        </>
      )}
    </div>
  );
}
