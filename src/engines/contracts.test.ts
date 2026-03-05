import { describe, it, expect } from 'vitest';
import { checkContract } from './contracts';
import type { Dart } from '../models/types';

// Helper to create darts quickly
const s = (segment: number): Dart => ({ segment, modifier: 'single' });
const d = (segment: number): Dart => ({ segment, modifier: 'double' });
const t = (segment: number): Dart => ({ segment, modifier: 'triple' });
const miss: Dart = { segment: 0, modifier: 'single' };
const singleBull: Dart = { segment: 25, modifier: 'single' };
const doubleBull: Dart = { segment: 50, modifier: 'double' };

describe('checkContract', () => {
  // ========================================
  // Capital contract
  // ========================================
  describe('capital', () => {
    it('always hits and sums all 3 darts', () => {
      const result = checkContract('capital', [s(20), s(5), s(18)]);
      expect(result.hit).toBe(true);
      expect(result.score).toBe(43);
    });

    it('scores 0 on 3 misses but still hits', () => {
      const result = checkContract('capital', [miss, miss, miss]);
      expect(result.hit).toBe(true);
      expect(result.score).toBe(0);
    });

    it('includes multiplied scores', () => {
      const result = checkContract('capital', [t(20), d(10), s(5)]);
      // 60 + 20 + 5 = 85
      expect(result.score).toBe(85);
    });
  });

  // ========================================
  // Number contracts (20, 19, 18, 17, 16, 15, 14)
  // ========================================
  describe.each([
    { contractId: '20', target: 20 },
    { contractId: '19', target: 19 },
    { contractId: '18', target: 18 },
    { contractId: '17', target: 17 },
    { contractId: '16', target: 16 },
    { contractId: '15', target: 15 },
    { contractId: '14', target: 14 },
  ])('number contract $contractId', ({ contractId, target }) => {
    it('hits when at least one dart hits the target', () => {
      const result = checkContract(contractId, [s(target), s(1), s(2)]);
      expect(result.hit).toBe(true);
      expect(result.score).toBe(target); // single = target value
    });

    it('scores only matching darts (not all 3)', () => {
      const result = checkContract(contractId, [s(target), s(target), s(1)]);
      expect(result.hit).toBe(true);
      expect(result.score).toBe(target * 2);
    });

    it('misses when no dart hits the target', () => {
      const other = target === 20 ? 19 : 20;
      const result = checkContract(contractId, [s(other), s(1), s(2)]);
      expect(result.hit).toBe(false);
      expect(result.score).toBe(0);
    });

    it('triple counts multiplied score', () => {
      const result = checkContract(contractId, [t(target), s(1), s(2)]);
      expect(result.hit).toBe(true);
      expect(result.score).toBe(target * 3);
    });

    it('double counts multiplied score', () => {
      const result = checkContract(contractId, [d(target), s(1), s(2)]);
      expect(result.hit).toBe(true);
      expect(result.score).toBe(target * 2);
    });
  });

  // ========================================
  // Side contract (3 adjacent board segments)
  // ========================================
  describe('side', () => {
    // Board order: 20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5
    it('hits with 3 adjacent segments (20-1-18)', () => {
      const result = checkContract('side', [s(20), s(1), s(18)]);
      expect(result.hit).toBe(true);
      expect(result.score).toBe(39);
    });

    it('hits with 3 adjacent segments in any throw order', () => {
      const result = checkContract('side', [s(18), s(20), s(1)]);
      expect(result.hit).toBe(true);
    });

    it('hits with wrap-around adjacency (5-20-1)', () => {
      // Board is circular: ...12, 5, 20, 1, 18...
      const result = checkContract('side', [s(5), s(20), s(1)]);
      expect(result.hit).toBe(true);
    });

    it('misses with non-adjacent segments', () => {
      const result = checkContract('side', [s(20), s(3), s(7)]);
      expect(result.hit).toBe(false);
    });

    it('hits with single bull (adjacent to everything) + 2 others', () => {
      const result = checkContract('side', [singleBull, s(3), s(7)]);
      expect(result.hit).toBe(true);
      expect(result.score).toBe(25 + 3 + 7);
    });

    it('misses when fewer than 3 non-miss darts', () => {
      const result = checkContract('side', [s(20), s(1), miss]);
      expect(result.hit).toBe(false);
    });
  });

  // ========================================
  // 3 in a Row (consecutive numbers)
  // ========================================
  describe('3row', () => {
    it('hits with 3 consecutive numbers (5-6-7)', () => {
      const result = checkContract('3row', [s(5), s(6), s(7)]);
      expect(result.hit).toBe(true);
      expect(result.score).toBe(18);
    });

    it('hits with 1-2-3', () => {
      const result = checkContract('3row', [s(1), s(2), s(3)]);
      expect(result.hit).toBe(true);
    });

    it('hits with 18-19-20', () => {
      const result = checkContract('3row', [s(18), s(19), s(20)]);
      expect(result.hit).toBe(true);
    });

    it('hits regardless of throw order', () => {
      const result = checkContract('3row', [s(7), s(5), s(6)]);
      expect(result.hit).toBe(true);
    });

    it('misses with non-consecutive numbers', () => {
      const result = checkContract('3row', [s(1), s(3), s(5)]);
      expect(result.hit).toBe(false);
    });

    it('misses with duplicates (not 3 unique)', () => {
      const result = checkContract('3row', [s(5), s(5), s(6)]);
      expect(result.hit).toBe(false);
    });

    it('bull does not count for 3-in-a-row', () => {
      const result = checkContract('3row', [singleBull, s(1), s(2)]);
      expect(result.hit).toBe(false);
    });

    it('includes multiplier in score when hit', () => {
      const result = checkContract('3row', [t(5), d(6), s(7)]);
      // 15 + 12 + 7 = 34
      expect(result.hit).toBe(true);
      expect(result.score).toBe(34);
    });
  });

  // ========================================
  // Color contract (3 different colors)
  // ========================================
  describe('color', () => {
    // Colors: black singles (20,18,13,10,2,3,7,8,14,12),
    //         white singles (1,4,6,15,17,19,16,11,9,5),
    //         red = double/triple on black segments, or double bull
    //         green = double/triple on white segments, or single bull

    it('hits with 3 different colors (black, white, red)', () => {
      // s(20) = black, s(1) = white, d(18) = red (double on black)
      const result = checkContract('color', [s(20), s(1), d(18)]);
      expect(result.hit).toBe(true);
    });

    it('hits with black, white, green', () => {
      // s(20) = black, s(1) = white, d(4) = green (double on white)
      const result = checkContract('color', [s(20), s(1), d(4)]);
      expect(result.hit).toBe(true);
    });

    it('hits with single bull (green) for third color', () => {
      // s(20) = black, s(1) = white, singleBull = green
      const result = checkContract('color', [s(20), s(1), singleBull]);
      expect(result.hit).toBe(true);
    });

    it('hits with double bull (red) for third color', () => {
      // s(20) = black, s(1) = white, doubleBull = red
      const result = checkContract('color', [s(20), s(1), doubleBull]);
      expect(result.hit).toBe(true);
    });

    it('misses with only 2 colors', () => {
      // s(20) = black, s(18) = black, s(1) = white → only 2 colors
      const result = checkContract('color', [s(20), s(18), s(1)]);
      expect(result.hit).toBe(false);
    });

    it('misses with all same color', () => {
      const result = checkContract('color', [s(20), s(18), s(13)]);
      expect(result.hit).toBe(false);
    });

    it('sums all darts for score when hit', () => {
      const result = checkContract('color', [s(20), s(1), d(18)]);
      // 20 + 1 + 36 = 57
      expect(result.score).toBe(57);
    });
  });

  // ========================================
  // Double contract
  // ========================================
  describe('double', () => {
    it('hits with a double', () => {
      const result = checkContract('double', [d(20), s(1), s(2)]);
      expect(result.hit).toBe(true);
      expect(result.score).toBe(40); // only double 20
    });

    it('double bull counts as double', () => {
      const result = checkContract('double', [doubleBull, s(1), s(2)]);
      expect(result.hit).toBe(true);
      expect(result.score).toBe(50);
    });

    it('misses with no doubles', () => {
      const result = checkContract('double', [s(20), s(1), t(5)]);
      expect(result.hit).toBe(false);
    });

    it('scores only double darts', () => {
      const result = checkContract('double', [d(20), d(10), s(5)]);
      expect(result.hit).toBe(true);
      expect(result.score).toBe(60); // 40 + 20
    });
  });

  // ========================================
  // Triple contract
  // ========================================
  describe('triple', () => {
    it('hits with a triple', () => {
      const result = checkContract('triple', [t(20), s(1), s(2)]);
      expect(result.hit).toBe(true);
      expect(result.score).toBe(60);
    });

    it('misses with no triples', () => {
      const result = checkContract('triple', [d(20), s(1), s(2)]);
      expect(result.hit).toBe(false);
    });

    it('scores only triple darts', () => {
      const result = checkContract('triple', [t(20), t(19), s(5)]);
      expect(result.hit).toBe(true);
      expect(result.score).toBe(117); // 60 + 57
    });
  });

  // ========================================
  // 57 contract
  // ========================================
  describe('57', () => {
    it('hits when sum equals exactly 57', () => {
      // 20 + 20 + 17 = 57
      const result = checkContract('57', [s(20), s(20), s(17)]);
      expect(result.hit).toBe(true);
      expect(result.score).toBe(57);
    });

    it('misses when sum is not 57', () => {
      const result = checkContract('57', [s(20), s(20), s(20)]);
      expect(result.hit).toBe(false);
      expect(result.score).toBe(0);
    });

    it('works with multiplied darts', () => {
      // T19 (57) + miss + miss = 57
      const result = checkContract('57', [t(19), miss, miss]);
      expect(result.hit).toBe(true);
      expect(result.score).toBe(57);
    });

    it('misses at 56', () => {
      const result = checkContract('57', [s(20), s(20), s(16)]);
      expect(result.hit).toBe(false);
    });
  });

  // ========================================
  // Bull contract
  // ========================================
  describe('bull', () => {
    it('hits with single bull', () => {
      const result = checkContract('bull', [singleBull, s(1), s(2)]);
      expect(result.hit).toBe(true);
      expect(result.score).toBe(25);
    });

    it('hits with double bull', () => {
      const result = checkContract('bull', [doubleBull, s(1), s(2)]);
      expect(result.hit).toBe(true);
      expect(result.score).toBe(50);
    });

    it('scores both bulls when hitting both', () => {
      const result = checkContract('bull', [singleBull, doubleBull, s(1)]);
      expect(result.hit).toBe(true);
      expect(result.score).toBe(75);
    });

    it('misses with no bulls', () => {
      const result = checkContract('bull', [s(20), s(19), s(18)]);
      expect(result.hit).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  // ========================================
  // Unknown contract
  // ========================================
  describe('unknown contract', () => {
    it('returns miss for unknown contract id', () => {
      const result = checkContract('nonexistent', [s(20), s(20), s(20)]);
      expect(result.hit).toBe(false);
      expect(result.score).toBe(0);
    });
  });
});
