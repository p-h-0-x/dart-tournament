import { useState, useEffect } from 'react';
import { CONTRACTS, CHECKPOINT_REWARDS, type ClassicLiveState, type StoredDart, type Player, storedDartToEngineDart } from '../../models/types';
import { checkContract } from '../../engines/contracts';
import { getPlayerMaxDarts } from '../../engines/classic';
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
  const [rewardPopup, setRewardPopup] = useState<{ playerName: string; reward: string } | null>(null);

  const getName = (id: string) => players.find((p) => p.id === id)?.name ?? 'Unknown';
  const isComplete = liveState.currentRound >= CONTRACTS.length;
  const currentContract = isComplete ? null : CONTRACTS[liveState.currentRound];
  const isCheckpoint = liveState.checkpointSociety === true;

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
  const showModifiers = !isBull;

  // Get checkpoint reward for current contract
  const currentReward = isCheckpoint && contractId
    ? CHECKPOINT_REWARDS.find((r) => r.contractId === contractId)
    : undefined;

  // Detect new bonus earned from last submitted round and show popup (admin only, in-progress games)
  useEffect(() => {
    if (!isCheckpoint || !isAdmin || isComplete || liveState.rounds.length === 0) return;
    const lastRound = liveState.rounds[liveState.rounds.length - 1];
    for (const pid of playerIds) {
      const pr = lastRound.players[pid];
      if (pr?.bonusEarned) {
        setRewardPopup({ playerName: getName(pid), reward: pr.bonusEarned });
        return;
      }
    }
  }, [liveState.rounds.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirmDarts = (playerId: string, darts: StoredDart[]) => {
    setPendingDarts((prev) => ({ ...prev, [playerId]: darts }));
  };

  const handleSubmitRound = () => {
    if (!allPlayersHaveDarts || !onSubmitRound) return;
    onSubmitRound(pendingDarts);
    const reset: Record<string, StoredDart[]> = {};
    for (const pid of playerIds) reset[pid] = [];
    setPendingDarts(reset);
  };

  const handleUndoRound = () => {
    onUndoRound?.();
    const reset: Record<string, StoredDart[]> = {};
    for (const pid of playerIds) reset[pid] = [];
    setPendingDarts(reset);
  };

  return (
    <div className="classic-board">
      {/* Reward popup */}
      {rewardPopup && (
        <div className="modal-overlay" onClick={() => setRewardPopup(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎁</div>
            <h2 className="modal-title" style={{ color: 'var(--gold)' }}>Bonus Unlocked!</h2>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              {rewardPopup.playerName}
            </p>
            <p style={{ fontSize: '1.25rem', color: 'var(--gold)' }}>
              {rewardPopup.reward}
            </p>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => setRewardPopup(null)}>
                Nice!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current round display */}
      {!isComplete && currentContract && (
        <div className="classic-board__round-display">
          <div className="classic-board__round-name">{currentContract.name}</div>
          <div className="classic-board__round-num">
            Round {liveState.currentRound + 1} of {CONTRACTS.length}
          </div>
          {currentReward && (
            <div style={{ fontSize: '0.8rem', color: 'var(--gold)', marginTop: '0.25rem' }}>
              Bonus: {currentReward.description}
              {currentReward.trigger === 'all_darts' && (
                <span style={{ color: 'var(--text-muted)' }}> (all darts on target)</span>
              )}
              {currentReward.trigger === 'first_dart_t19' && (
                <span style={{ color: 'var(--text-muted)' }}> (first dart T19)</span>
              )}
            </div>
          )}
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
              {isCheckpoint && <th>Bonus</th>}
            </tr>
          </thead>
          <tbody>
            {CONTRACTS.map((contract, roundIdx) => {
              const round = liveState.rounds[roundIdx];
              const isCurrent = roundIdx === liveState.currentRound;
              const isFuture = roundIdx > liveState.currentRound;
              const reward = isCheckpoint
                ? CHECKPOINT_REWARDS.find((r) => r.contractId === contract.id)
                : undefined;

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
                        {pr.x2Applied && <span style={{ color: 'var(--gold)', fontSize: '0.7rem' }}> x2</span>}
                        {pr.bonusEarned && <span style={{ marginLeft: '0.25rem' }}>🎁</span>}
                      </td>
                    );
                  })}
                  {isCheckpoint && (
                    <td style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {reward?.description ?? ''}
                    </td>
                  )}
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
              {isCheckpoint && <td></td>}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bonus darts indicator */}
      {isCheckpoint && isAdmin && !isComplete && (
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', margin: '0.5rem 0', fontSize: '0.85rem' }}>
          {playerIds.map((pid) => {
            const bonus = liveState.bonusDarts?.[pid] ?? 0;
            if (bonus === 0) return null;
            return (
              <span key={pid} style={{ color: 'var(--gold)' }}>
                {getName(pid)}: +{bonus} bonus dart{bonus > 1 ? 's' : ''}
              </span>
            );
          })}
        </div>
      )}

      {/* Admin: dart inputs for current round */}
      {isAdmin && !isComplete && (
        <>
          <div className="classic-board__inputs">
            {playerIds.map((pid) => {
              const confirmed = pendingDarts[pid];
              const hasConfirmed = confirmed && confirmed.length > 0;
              const maxDarts = getPlayerMaxDarts(liveState, pid);

              if (hasConfirmed) {
                return (
                  <ConfirmedDarts
                    key={`${pid}-confirmed`}
                    label={getName(pid)}
                    darts={confirmed}
                    currentCapital={liveState.capitals[pid] ?? 0}
                    contractId={contractId!}
                    isFirstRound={liveState.currentRound === 0}
                    isCheckpoint={isCheckpoint}
                    onReenter={() => clearPlayerDarts(pid)}
                  />
                );
              }

              return (
                <DartInput
                  key={`${pid}-${contractId}`}
                  label={`${getName(pid)}${maxDarts > 3 ? ` (${maxDarts} darts)` : ''}`}
                  onDartsConfirmed={(darts) => handleConfirmDarts(pid, darts)}
                  allowedNumbers={allowedNumbers}
                  showModifiers={showModifiers}
                  maxDarts={maxDarts}
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

function ConfirmedDarts({ label, darts, currentCapital, contractId, isFirstRound, isCheckpoint, onReenter }: {
  label: string;
  darts: StoredDart[];
  currentCapital: number;
  contractId: string;
  isFirstRound: boolean;
  isCheckpoint: boolean;
  onReenter: () => void;
}) {
  const engineDarts = darts.map(storedDartToEngineDart);
  const result = checkContract(contractId, engineDarts);

  // Check for X2 bonus
  const reward = isCheckpoint ? CHECKPOINT_REWARDS.find((r) => r.contractId === contractId) : undefined;
  const SIMPLE = new Set(['20', '19', '18', '17', '16', '15', '14']);
  let x2 = false;
  if (reward?.type === 'x2_score' && result.hit) {
    const triggered = reward.trigger === 'contract_hit' || (SIMPLE.has(contractId) && darts.every((d) => d.number === parseInt(contractId)));
    x2 = triggered;
  }
  const score = x2 ? result.score * 2 : result.score;

  let projectedCapital: number;
  let isHit: boolean;
  if (isFirstRound) {
    projectedCapital = score;
    isHit = true;
  } else if (result.hit) {
    projectedCapital = currentCapital + score;
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
          {x2 && <span style={{ color: 'var(--gold)', fontSize: '0.7rem' }}> x2</span>}
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
