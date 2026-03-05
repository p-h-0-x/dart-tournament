import { type Dart, dartScore, BOARD_ORDER } from '../models/types';

// --- Board helpers ---
function segmentNumber(d: Dart): number {
  if (d.segment === 50) return 50; // double bull
  if (d.segment === 25) return 25; // single bull
  return d.segment;
}

function isDouble(d: Dart): boolean {
  return d.modifier === 'double' || d.segment === 50;
}

function isTriple(d: Dart): boolean {
  return d.modifier === 'triple';
}

function boardIndex(n: number): number {
  return BOARD_ORDER.indexOf(n);
}

function areAdjacent(a: number, b: number): boolean {
  const ia = boardIndex(a);
  const ib = boardIndex(b);
  if (ia < 0 || ib < 0) return false;
  const diff = Math.abs(ia - ib);
  return diff === 1 || diff === BOARD_ORDER.length - 1;
}

// Segment colors
const BLACK_SEGMENTS = new Set([20, 18, 13, 10, 2, 3, 7, 8, 14, 12]);
function dartColor(d: Dart): string {
  if (d.segment === 25) return 'green';
  if (d.segment === 50) return 'red';
  if (d.segment === 0) return 'none';
  if (d.modifier === 'double' || d.modifier === 'triple') {
    return BLACK_SEGMENTS.has(d.segment) ? 'red' : 'green';
  }
  return BLACK_SEGMENTS.has(d.segment) ? 'black' : 'white';
}

// --- Contract checking ---
export interface ContractResult {
  hit: boolean;
  score: number;
}

export function checkContract(contractId: string, darts: Dart[]): ContractResult {
  switch (contractId) {
    case 'capital':
      return { hit: true, score: darts.reduce((s, d) => s + dartScore(d), 0) };

    case '20':
    case '19':
    case '18':
    case '17':
    case '16':
    case '15':
    case '14': {
      const target = parseInt(contractId);
      const matching = darts.filter((d) => d.segment === target);
      return {
        hit: matching.length > 0,
        score: matching.reduce((s, d) => s + dartScore(d), 0),
      };
    }

    case 'side':
      return checkSide(darts);

    case '3row':
      return check3Row(darts);

    case 'color':
      return checkColor(darts);

    case 'double': {
      const doubles = darts.filter(isDouble);
      return {
        hit: doubles.length > 0,
        score: doubles.reduce((s, d) => s + dartScore(d), 0),
      };
    }

    case 'triple': {
      const triples = darts.filter(isTriple);
      return {
        hit: triples.length > 0,
        score: triples.reduce((s, d) => s + dartScore(d), 0),
      };
    }

    case '57': {
      const total = darts.reduce((s, d) => s + dartScore(d), 0);
      return { hit: total === 57, score: total === 57 ? total : 0 };
    }

    case 'bull': {
      const bulls = darts.filter((d) => d.segment === 25 || d.segment === 50);
      return {
        hit: bulls.length > 0,
        score: bulls.reduce((s, d) => s + dartScore(d), 0),
      };
    }

    default:
      return { hit: false, score: 0 };
  }
}

function checkSide(darts: Dart[]): ContractResult {
  const segments = darts.map((d) => segmentNumber(d)).filter((n) => n > 0);
  if (segments.length < 3) return { hit: false, score: 0 };
  const total = darts.reduce((s, d) => s + dartScore(d), 0);

  // Single bull (25) is adjacent to every segment
  const hasSingleBull = segments.includes(25);
  const nonBullSegs = segments.filter((s) => s !== 25 && s !== 50);

  if (hasSingleBull && nonBullSegs.length >= 2) {
    // single bull + any 2 segments = side
    return { hit: true, score: total };
  }

  // Check all permutations of 3 segments for adjacency chain
  const unique = [...new Set(nonBullSegs)];
  for (let i = 0; i < unique.length; i++) {
    for (let j = 0; j < unique.length; j++) {
      if (j === i) continue;
      for (let k = 0; k < unique.length; k++) {
        if (k === i || k === j) continue;
        if (areAdjacent(unique[i], unique[j]) && areAdjacent(unique[j], unique[k])) {
          return { hit: true, score: total };
        }
      }
    }
  }

  return { hit: false, score: 0 };
}

function check3Row(darts: Dart[]): ContractResult {
  const nums = darts
    .map((d) => d.segment)
    .filter((n) => n > 0 && n <= 20);
  const unique = [...new Set(nums)].sort((a, b) => a - b);
  const total = darts.reduce((s, d) => s + dartScore(d), 0);

  if (unique.length < 3) return { hit: false, score: 0 };

  for (let i = 0; i <= unique.length - 3; i++) {
    if (unique[i + 1] === unique[i] + 1 && unique[i + 2] === unique[i] + 2) {
      return { hit: true, score: total };
    }
  }

  return { hit: false, score: 0 };
}

function checkColor(darts: Dart[]): ContractResult {
  const colors = new Set(darts.map(dartColor));
  colors.delete('none');
  const total = darts.reduce((s, d) => s + dartScore(d), 0);
  return { hit: colors.size >= 3, score: colors.size >= 3 ? total : 0 };
}
