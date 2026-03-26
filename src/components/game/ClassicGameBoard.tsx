import { useState } from 'react';
import { CONTRACTS, type ClassicLiveState, type StoredDart, type Player, storedDartToEngineDart } from '../../models/types';
import { checkContract } from '../../engines/contracts';
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

  const clearPlayerDarts = (playerId: string) => {
    setPendingDarts((prev) => ({ ...prev, [playerId]: [] }));
  };

  // Simplify dart input for simple contracts
  const SIMPLE_NUMBER_CONTRACTS = new Set(['20', '19', '18', '17', '16', '15', '14']);
  const contractId = currentContract?.id;
  const isSimpleNumber = contractId != null && SIMPLE_NUMBER_CONTRACTS.has(contractId);
  const isBull = contractId === 'bull';
  const allowedNumbers = isSimpleNumber ? [parseInt(contractId!)] : isBull ? [25] : undefined;
  const showModifiers = !isBull; // bull only has single/double, handled automatically

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
            {playerIds.map((pid) => {
              const confirmed = pendingDarts[pid];
              const hasConfirmed = confirmed && confirmed.length > 0;

              if (hasConfirmed) {
                return (
                  <ConfirmedDarts
                    key={`${pid}-confirmed`}
                    label={getName(pid)}
                    darts={confirmed}
                    currentCapital={liveState.capitals[pid] ?? 0}
                    contractId={contractId!}
                    isFirstRound={liveState.currentRound === 0}
                    onReenter={() => clearPlayerDarts(pid)}
                  />
                );
              }

              return (
                <DartInput
                  key={`${pid}-${contractId}`}
                  label={getName(pid)}
                  onDartsConfirmed={(darts) => handleConfirmDarts(pid, darts)}
                  allowedNumbers={allowedNumbers}
                  showModifiers={showModifiers}
                />
              );
            })}
          </div>

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

function formatDart(d: StoredDart): string {
  if (d.number === 0) return 'Miss';
  const prefix = d.modifier === 'double' ? 'D' : d.modifier === 'triple' ? 'T' : '';
  if (d.number === 25) return prefix ? `${prefix}Bull` : 'Bull';
  return `${prefix}${d.number}`;
}

function ConfirmedDarts({ label, darts, currentCapital, contractId, isFirstRound, onReenter }: {
  label: string;
  darts: StoredDart[];
  currentCapital: number;
  contractId: string;
  isFirstRound: boolean;
  onReenter: () => void;
}) {
  const engineDarts = darts.map(storedDartToEngineDart);
  const result = checkContract(contractId, engineDarts);

  let projectedCapital: number;
  let isHit: boolean;
  if (isFirstRound) {
    projectedCapital = result.score;
    isHit = true;
  } else if (result.hit) {
    projectedCapital = currentCapital + result.score;
    isHit = true;
  } else {
    projectedCapital = Math.ceil(currentCapital / 2);
    isHit = false;
  }

  return (
    <div className="dart-input">
      {label && <div className="dart-input__label">{label}</div>}
      <div className="dart-input__slots">
        {darts.map((d, i) => (
          <div key={i} className="dart-input__slot dart-input__slot--filled">
            {formatDart(d)}
          </div>
        ))}
        {Array.from({ length: Math.max(0, 3 - darts.length) }, (_, i) => (
          <div key={`empty-${i}`} className="dart-input__slot">-</div>
        ))}
        <div className="dart-input__total" style={{ color: isHit ? 'var(--success)' : 'var(--danger)' }}>
          {isHit ? projectedCapital : `${projectedCapital} (½)`}
        </div>
      </div>
      <div className="dart-input__actions">
        <button className="btn btn-outline btn-sm" onClick={onReenter}>
          Re-enter
        </button>
      </div>
    </div>
  );
}
