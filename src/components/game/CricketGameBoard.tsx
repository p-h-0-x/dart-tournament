import { CRICKET_NUMBERS, type CricketLiveState, type StoredDart, type Player } from '../../models/types';
import { processCricketTurn, isCricketGameOver, undoCricketTurn } from '../../engines/cricket';
import DartInput from './DartInput';

interface CricketGameBoardProps {
  liveState: CricketLiveState;
  playerIds: string[];
  players: Player[];
  isAdmin: boolean;
  onUpdateState?: (state: CricketLiveState) => void;
  onUndoState?: (state: CricketLiveState) => void;
}

function markSymbol(count: number): string {
  if (count === 0) return '';
  if (count === 1) return '/';
  if (count === 2) return 'X';
  return 'O';  // 3+ = closed
}

function targetLabel(num: number): string {
  return num === 25 ? 'Bull' : String(num);
}

export default function CricketGameBoard({
  liveState,
  players,
  isAdmin,
  onUpdateState,
  onUndoState,
}: CricketGameBoardProps) {
  const getName = (id: string) => players.find((p) => p.id === id)?.name ?? 'Unknown';

  const currentPlayerId = liveState.playerOrder[liveState.currentPlayerIndex];
  const isGameOver = isCricketGameOver(liveState);

  // Check if a number is dead (all players closed it)
  const isNumberDead = (target: string) =>
    liveState.playerOrder.every((pid) => (liveState.marks[pid]?.[target] ?? 0) >= 3);

  const handleDartsConfirmed = (darts: StoredDart[]) => {
    if (!isAdmin || !onUpdateState || isGameOver) return;
    const newState = processCricketTurn(liveState, currentPlayerId, darts);
    onUpdateState(newState);
  };

  const handleUndo = () => {
    if (!isAdmin || liveState.history.length === 0) return;
    const handler = onUndoState ?? onUpdateState;
    if (!handler) return;
    handler(undoCricketTurn(liveState));
  };

  // Allowed numbers for DartInput: cricket targets + miss
  const cricketAllowed = CRICKET_NUMBERS.filter((n) => n !== 25); // 15-20 as regular numbers, bull handled separately

  return (
    <div>
      {/* Scoreboard */}
      <div className="table-container">
        <table className="cricket-board__table">
          <thead>
            <tr>
              <th>Target</th>
              {liveState.playerOrder.map((pid) => (
                <th key={pid} className={pid === currentPlayerId && !isGameOver ? 'cricket-board__active-player' : ''}>
                  {getName(pid)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CRICKET_NUMBERS.map((num) => {
              const target = String(num);
              const dead = isNumberDead(target);
              return (
                <tr key={num} className={dead ? 'cricket-board__row--dead' : ''}>
                  <td className="cricket-board__target">{targetLabel(num)}</td>
                  {liveState.playerOrder.map((pid) => {
                    const count = liveState.marks[pid]?.[target] ?? 0;
                    return (
                      <td key={pid} className="cricket-board__mark">
                        <span className={`cricket-board__mark-symbol ${count >= 3 ? 'cricket-board__mark--closed' : ''}`}>
                          {markSymbol(count)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {/* Score row */}
            <tr className="cricket-board__score-row">
              <td className="cricket-board__target">Score</td>
              {liveState.playerOrder.map((pid) => (
                <td key={pid} className="cricket-board__score">
                  {liveState.scores[pid] ?? 0}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Current turn */}
      {isAdmin && !isGameOver && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{getName(currentPlayerId)}'s turn</span>
          </div>
          <DartInput
            onDartsConfirmed={handleDartsConfirmed}
            allowedNumbers={cricketAllowed}
            label={`Targets: 15-20, Bull`}
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

      {/* Read-only current turn */}
      {!isAdmin && !isGameOver && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{getName(currentPlayerId)}'s turn</span>
        </div>
      )}
    </div>
  );
}
