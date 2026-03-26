import { useState, useCallback } from 'react';
import type { StoredDart, DartModifier } from '../../models/types';
import { createStoredDart } from '../../models/types';

interface DartInputProps {
  onDartsConfirmed: (darts: StoredDart[]) => void;
  maxDarts?: number;
  /** Restrict which numbers can be selected (for Clock mode). If undefined, all numbers available. */
  allowedNumbers?: number[];
  /** Whether modifier buttons are shown (hidden for Clock Bull target, Killer number selection). */
  showModifiers?: boolean;
  disabled?: boolean;
  /** Label shown above the dart slots (e.g., player name, target info). */
  label?: string;
}

export default function DartInput({
  onDartsConfirmed,
  maxDarts = 3,
  allowedNumbers,
  showModifiers = true,
  disabled = false,
  label,
}: DartInputProps) {
  const [darts, setDarts] = useState<StoredDart[]>([]);
  const [modifier, setModifier] = useState<DartModifier>('single');

  const addDart = useCallback(
    (number: number) => {
      if (disabled || darts.length >= maxDarts) return;
      // Bull: only single or double (no triple)
      const mod = number === 25 && modifier === 'triple' ? 'single' : modifier;
      // Miss: always single, score 0
      const finalMod = number === 0 ? 'single' : mod;
      setDarts((prev) => [...prev, createStoredDart(number, finalMod)]);
      setModifier('single'); // Reset modifier after each dart
    },
    [disabled, darts.length, maxDarts, modifier],
  );

  const undoLast = useCallback(() => {
    setDarts((prev) => prev.slice(0, -1));
  }, []);

  const clearAll = useCallback(() => {
    setDarts([]);
    setModifier('single');
  }, []);

  const confirm = useCallback(() => {
    if (darts.length === 0) return;
    onDartsConfirmed(darts);
    setDarts([]);
    setModifier('single');
  }, [darts, onDartsConfirmed]);

  const total = darts.reduce((sum, d) => sum + d.score, 0);

  const numbers = allowedNumbers ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const showBull = !allowedNumbers || allowedNumbers.includes(25);
  const showMiss = true;
  const totalButtons = numbers.length + (showBull ? 1 : 0) + (showMiss ? 1 : 0);
  const isCompact = totalButtons <= 4;

  const formatDart = (d: StoredDart): string => {
    if (d.number === 0) return 'Miss';
    const prefix = d.modifier === 'double' ? 'D' : d.modifier === 'triple' ? 'T' : '';
    if (d.number === 25) return prefix ? `${prefix}Bull` : 'Bull';
    return `${prefix}${d.number}`;
  };

  return (
    <div className={`dart-input ${disabled ? 'dart-input--disabled' : ''}`}>
      {label && <div className="dart-input__label">{label}</div>}

      {/* Dart slots */}
      <div className="dart-input__slots">
        {Array.from({ length: maxDarts }, (_, i) => (
          <div key={i} className={`dart-input__slot ${darts[i] ? 'dart-input__slot--filled' : ''}`}>
            {darts[i] ? formatDart(darts[i]) : '-'}
          </div>
        ))}
        <div className="dart-input__total">{total}</div>
      </div>

      {/* Modifier buttons */}
      {showModifiers && (
        <div className="dart-input__modifiers">
          {(['single', 'double', 'triple'] as DartModifier[]).map((mod) => (
            <button
              key={mod}
              className={`dart-input__mod-btn ${modifier === mod ? 'dart-input__mod-btn--active' : ''}`}
              onClick={() => setModifier(mod)}
              disabled={disabled || darts.length >= maxDarts}
            >
              {mod === 'single' ? 'S' : mod === 'double' ? 'D' : 'T'}
            </button>
          ))}
        </div>
      )}

      {/* Number grid */}
      <div
        className="dart-input__grid"
        style={isCompact ? { gridTemplateColumns: `repeat(${totalButtons}, 1fr)` } : undefined}
      >
        {numbers.map((num) => (
          <button
            key={num}
            className="dart-input__num-btn"
            onClick={() => addDart(num)}
            disabled={disabled || darts.length >= maxDarts}
          >
            {num}
          </button>
        ))}
        {showBull && (
          <button
            className={`dart-input__num-btn${isCompact ? '' : ' dart-input__num-btn--bull'}`}
            onClick={() => addDart(25)}
            disabled={disabled || darts.length >= maxDarts}
          >
            Bull
          </button>
        )}
        {showMiss && (
          <button
            className={`dart-input__num-btn${isCompact ? '' : ' dart-input__num-btn--miss'}`}
            onClick={() => addDart(0)}
            disabled={disabled || darts.length >= maxDarts}
          >
            Miss
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="dart-input__actions">
        <button
          className="btn btn-outline btn-sm"
          onClick={undoLast}
          disabled={disabled || darts.length === 0}
        >
          Undo
        </button>
        <button
          className="btn btn-outline btn-sm"
          onClick={clearAll}
          disabled={disabled || darts.length === 0}
        >
          Clear
        </button>
        <button
          className="btn btn-success btn-sm"
          onClick={confirm}
          disabled={disabled || darts.length === 0}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
