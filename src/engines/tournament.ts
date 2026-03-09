import type { TournamentMatch } from '../models/types';

/**
 * Generate a single-elimination bracket for the given player IDs.
 * Returns an array of TournamentMatch objects.
 *
 * Bracket is seeded so that byes (if any) go to the top seeds.
 * The number of first-round slots is padded to the next power of 2.
 */
export function generateBracket(playerIds: string[]): TournamentMatch[] {
  const n = playerIds.length;
  if (n < 3) throw new Error('Need at least 3 players');

  // Next power of 2
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
  const totalRounds = Math.log2(bracketSize);
  const matches: TournamentMatch[] = [];

  // First round matchups
  const firstRoundMatches = bracketSize / 2;
  // Seed players: index 0 is top seed
  const seeded = [...playerIds];

  for (let i = 0; i < firstRoundMatches; i++) {
    const p1Index = i;
    const p2Index = bracketSize - 1 - i;

    const p1 = p1Index < seeded.length ? seeded[p1Index] : undefined;
    const p2 = p2Index < seeded.length ? seeded[p2Index] : undefined;

    const match: TournamentMatch = {
      round: 1,
      matchIndex: i,
      playerIds: [p1, p2].filter(Boolean) as string[],
      status: 'pending',
    };

    // If only one player (bye), auto-advance
    if (match.playerIds.length === 1) {
      match.winnerId = match.playerIds[0];
      match.status = 'completed';
    }

    matches.push(match);
  }

  // Subsequent rounds (empty until feeder matches resolve)
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round);
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        round,
        matchIndex: i,
        playerIds: [],
        status: 'pending',
      });
    }
  }

  // Propagate byes to round 2
  return propagateByes(matches, totalRounds);
}

function propagateByes(matches: TournamentMatch[], totalRounds: number): TournamentMatch[] {
  for (let round = 1; round < totalRounds; round++) {
    const roundMatches = matches.filter((m) => m.round === round);
    const nextRoundMatches = matches.filter((m) => m.round === round + 1);

    for (let i = 0; i < roundMatches.length; i++) {
      const match = roundMatches[i];
      if (match.winnerId) {
        const nextMatch = nextRoundMatches[Math.floor(i / 2)];
        if (nextMatch && !nextMatch.playerIds.includes(match.winnerId)) {
          nextMatch.playerIds.push(match.winnerId);
        }
        // If next match now has only one player from byes, auto-advance
        if (nextMatch && nextMatch.playerIds.length === 1 && isFullyFed(nextMatch, roundMatches, i)) {
          nextMatch.winnerId = nextMatch.playerIds[0];
          nextMatch.status = 'completed';
        }
      }
    }
  }
  return matches;
}

function isFullyFed(_nextMatch: TournamentMatch, prevRoundMatches: TournamentMatch[], currentIdx: number): boolean {
  const feederIdx1 = Math.floor(currentIdx / 2) * 2;
  const feederIdx2 = feederIdx1 + 1;
  const f1 = prevRoundMatches[feederIdx1];
  const f2 = prevRoundMatches[feederIdx2];
  return !!f1?.winnerId && !!f2?.winnerId;
}

/**
 * Advance a winner through the bracket, updating subsequent matches.
 */
export function advanceWinner(
  matches: TournamentMatch[],
  round: number,
  matchIndex: number,
  winnerId: string
): TournamentMatch[] {
  const updated = matches.map((m) => ({ ...m }));

  // Mark current match
  const current = updated.find((m) => m.round === round && m.matchIndex === matchIndex);
  if (current) {
    current.winnerId = winnerId;
    current.status = 'completed';
  }

  // Add winner to next round
  const maxRound = Math.max(...updated.map((m) => m.round));
  if (round < maxRound) {
    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextMatch = updated.find((m) => m.round === round + 1 && m.matchIndex === nextMatchIndex);
    if (nextMatch && !nextMatch.playerIds.includes(winnerId)) {
      nextMatch.playerIds.push(winnerId);
    }
  }

  return updated;
}

export function getRoundName(round: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - round;
  switch (roundsFromEnd) {
    case 0: return 'Final';
    case 1: return 'Semifinals';
    case 2: return 'Quarterfinals';
    default: return `Round ${round}`;
  }
}

export function getTotalRounds(matches: TournamentMatch[]): number {
  if (matches.length === 0) return 0;
  return Math.max(...matches.map((m) => m.round));
}

// ============================================================
// Flexible tournament functions
// ============================================================

/**
 * Create a new round of matches from manual pairings.
 * Returns the full matches array (existing + new).
 */
export function createFlexibleRound(
  existingMatches: TournamentMatch[],
  pairings: [string, string][]
): TournamentMatch[] {
  if (pairings.length === 0) throw new Error('Need at least one pairing');

  // Validate no player appears in more than one pairing
  const allPlayers = pairings.flat();
  const seen = new Set<string>();
  for (const pid of allPlayers) {
    if (!pid) throw new Error('Player ID cannot be empty');
    if (seen.has(pid)) throw new Error(`Player ${pid} appears in multiple pairings`);
    seen.add(pid);
  }

  const nextRound = existingMatches.length === 0
    ? 1
    : Math.max(...existingMatches.map((m) => m.round)) + 1;

  const newMatches: TournamentMatch[] = pairings.map(([p1, p2], i) => ({
    round: nextRound,
    matchIndex: i,
    playerIds: [p1, p2],
    status: 'pending' as const,
  }));

  return [...existingMatches, ...newMatches];
}

/**
 * Set the winner of a match in a flexible tournament.
 * No next-round propagation (rounds are created manually).
 */
export function setFlexibleMatchWinner(
  matches: TournamentMatch[],
  round: number,
  matchIndex: number,
  winnerId: string
): TournamentMatch[] {
  return matches.map((m) => {
    if (m.round === round && m.matchIndex === matchIndex) {
      if (!m.playerIds.includes(winnerId)) {
        throw new Error(`Player ${winnerId} is not in this match`);
      }
      return { ...m, winnerId, status: 'completed' as const };
    }
    return { ...m };
  });
}

/**
 * Check if all matches in a given round are completed.
 */
export function isRoundComplete(matches: TournamentMatch[], round: number): boolean {
  const roundMatches = matches.filter((m) => m.round === round);
  if (roundMatches.length === 0) return true;
  return roundMatches.every((m) => m.status === 'completed');
}
