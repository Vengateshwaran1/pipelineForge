// Confetti.js
// Lightweight, dependency-free confetti burst — pure DOM + CSS keyframes.
// Rendered when a pipeline comes back as a valid DAG.

import { useMemo } from 'react';

const COLORS = ['#6366f1', '#a855f7', '#3b82f6', '#06b6d4', '#f59e0b', '#22c55e', '#ec4899'];

export function Confetti({ count = 60 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.35,
        duration: 1.8 + Math.random() * 1.4,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 7,
        drift: (Math.random() - 0.5) * 220,
      })),
    [count]
  );

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti__piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: `${p.size}px`,
            height: `${p.size * 0.42}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--drift': `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
