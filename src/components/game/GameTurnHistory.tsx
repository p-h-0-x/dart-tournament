import { useState } from 'react';
import {
  CONTRACTS,
  type LiveGameState,
  type ClassicLiveState,
  type KillerLiveState,
  type ClockLiveState,
  type StoredDart,
  type Player,
} from '../../models/types';
import { getClockTargetName } from '../../engines/clock';
import { getAdjacentNumbers, KILLER_MAX_LIVES } from '../../engines/killer';

interface GameTurnHistoryProps {
  liveState: LiveGameState;
  players: Player[];
  playerIds: string[];
}

function formatDart(d: StoredDart): string {
  if (d.number === 0) return 'Miss';
  const prefix = d.modifier === 'double' ? 'D' : d.modifier === 'triple' ? 'T' : '';
  if (d.number === 25) return prefix ? `${prefix}Bull` : 'Bull';
  return `${prefix}${d.number}`;
}

function formatDarts(darts: StoredDart[]): string {
  return darts.map(formatDart).join(', ');
}

// ---------------------------------------------------------------------------
// Classic
// ---------------------------------------------------------------------------
function ClassicHistory({ state, players, playerIds }: { state: ClassicLiveState; players: Player[]; playerIds: string[] }) {
  const getName = (id: string) => players.find((p) => p.id === id)?.name ?? '?';

  if (state.rounds.length === 0) {
    return <p className="text-muted text-sm">No rounds played yet.</p>;
  }

  return (
    <div className="table-container">
      <table className="turn-history__table">
        <thead>
          <tr>
            <th>Round</th>
            {playerIds.map((pid) => (
              <th key={pid}>{getName(pid)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.rounds.map((round, idx) => {
            const contract = CONTRACTS[idx];
            return (
              <tr key={idx}>
                <td className="turn-history__round-name">{contract?.name ?? `#${idx + 1}`}</td>
                {playerIds.map((pid) => {
                  const pr = round.players[pid];
                  if (!pr) return <td key={pid}>-</td>;
                  const dartsStr = formatDarts(pr.darts);
                  return (
                    <td key={pid} className={pr.success ? 'turn-history__cell--hit' : 'turn-history__cell--miss'}>
                      <div className="turn-history__cell-score">
                        {idx === 0 ? pr.capitalAfter : pr.success ? `+${pr.score}` : '½'}
                      </div>
                      <div className="turn-history__cell-darts">{dartsStr}</div>
                      <div className="turn-history__cell-capital">Capital: {pr.capitalAfter}</div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Killer
// ---------------------------------------------------------------------------
function KillerHistory({ state, players }: { state: KillerLiveState; players: Player[] }) {
  const getName = (id: string) => players.find((p) => p.id === id)?.name ?? '?';

  if (state.history.length === 0) {
    return <p className="text-muted text-sm">No turns played yet.</p>;
  }

  return (
    <div className="table-container">
      <table className="turn-history__table">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Darts</th>
            <th>Effect</th>
          </tr>
        </thead>
        <tbody>
          {state.history.map((turn, idx) => {
            const throwerNum = state.numbers[turn.playerId];
            const throwerAdj = throwerNum ? getAdjacentNumbers(throwerNum) : [];
            const wasKiller = turn.killerBefore[turn.playerId] ?? false;

            // Compute what happened
            const effects: string[] = [];
            let selfDelta = 0;
            const otherDeltas: Record<string, number> = {};

            for (const dart of turn.darts) {
              if (dart.number === 0 || dart.number === 25) continue;
              const mult = dart.modifier === 'double' ? 2 : dart.modifier === 'triple' ? 3 : 1;

              if (dart.number === throwerNum) {
                selfDelta += 3 * mult;
              } else if (throwerAdj.includes(dart.number)) {
                selfDelta += 1 * mult;
              }

              if (wasKiller) {
                for (const pid of state.playerOrder) {
                  if (pid === turn.playerId || turn.eliminatedBefore[pid]) continue;
                  const otherNum = state.numbers[pid];
                  const otherAdj = otherNum ? getAdjacentNumbers(otherNum) : [];
                  if (dart.number === otherNum) {
                    otherDeltas[pid] = (otherDeltas[pid] ?? 0) - 3 * mult;
                  } else if (otherAdj.includes(dart.number)) {
                    otherDeltas[pid] = (otherDeltas[pid] ?? 0) - 1 * mult;
                  }
                }
              }
            }

            if (selfDelta > 0) effects.push(`+${selfDelta} lives`);
            for (const [pid, delta] of Object.entries(otherDeltas)) {
              if (delta !== 0) effects.push(`${getName(pid)} ${delta}`);
            }
            if (effects.length === 0) effects.push('No effect');

            // Compute lives after
            const livesBefore = turn.livesBefore[turn.playerId] ?? 0;
            const livesAfter = Math.min(livesBefore + selfDelta, KILLER_MAX_LIVES);

            return (
              <tr key={idx} className={turn.eliminatedBefore[turn.playerId] ? 'turn-history__row--eliminated' : ''}>
                <td className="text-muted">{idx + 1}</td>
                <td>
                  <span className="font-bold">{getName(turn.playerId)}</span>
                  {wasKiller && <span className="turn-history__killer-badge">K</span>}
                </td>
                <td className="turn-history__cell-darts">{formatDarts(turn.darts)}</td>
                <td>
                  <div>{effects.join(' · ')}</div>
                  <div className="text-muted text-sm">{livesBefore} → {livesAfter} lives</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clock
// ---------------------------------------------------------------------------
function ClockHistory({ state, players }: { state: ClockLiveState; players: Player[] }) {
  const getName = (id: string) => players.find((p) => p.id === id)?.name ?? '?';

  if (state.history.length === 0) {
    return <p className="text-muted text-sm">No turns played yet.</p>;
  }

  return (
    <div className="table-container">
      <table className="turn-history__table">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Darts</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          {state.history.map((turn, idx) => {
            const hitsCount = turn.darts.filter((d) => d.number !== 0).length;
            const finished = turn.newPos >= 12;

            return (
              <tr key={idx}>
                <td className="text-muted">{idx + 1}</td>
                <td>
                  <span className="font-bold">{getName(turn.playerId)}</span>
                  {turn.extraTurn && <span className="turn-history__extra-badge">+1</span>}
                </td>
                <td className="turn-history__cell-darts">{formatDarts(turn.darts)}</td>
                <td>
                  <div>
                    {getClockTargetName(turn.prevPos)} → {getClockTargetName(turn.newPos)}
                    {hitsCount > 0 && <span className="turn-history__hits"> ({hitsCount} hit{hitsCount > 1 ? 's' : ''})</span>}
                  </div>
                  {finished && <span className="turn-history__finish-tag">FINISHED</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function GameTurnHistory({ liveState, players, playerIds }: GameTurnHistoryProps) {
  const [expanded, setExpanded] = useState(false);

  // Count turns
  let turnCount = 0;
  if (liveState.mode === 'classic') turnCount = liveState.rounds.length;
  else if (liveState.mode === 'killer') turnCount = liveState.history.length;
  else if (liveState.mode === 'clock') turnCount = liveState.history.length;

  if (turnCount === 0) return null;

  return (
    <div className="turn-history card">
      <button
        className="turn-history__toggle"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <span className="card-title">Turn History ({turnCount})</span>
        <span className="turn-history__chevron">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="turn-history__content">
          {liveState.mode === 'classic' && (
            <ClassicHistory state={liveState} players={players} playerIds={playerIds} />
          )}
          {liveState.mode === 'killer' && (
            <KillerHistory state={liveState} players={players} />
          )}
          {liveState.mode === 'clock' && (
            <ClockHistory state={liveState} players={players} />
          )}
        </div>
      )}
    </div>
  );
}
