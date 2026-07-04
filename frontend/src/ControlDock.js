// ControlDock.js
// A floating control panel that is BOTH draggable (grab the grip to reposition)
// and reorderable (drag any button to reshuffle). Position + order persist to
// localStorage. Driven by a declarative `items` array so the same component can
// host any set of controls.

import { useState, useEffect, useRef, useCallback } from 'react';
import { GripVertical } from 'lucide-react';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return fallback;
}

export function ControlDock({ items, storageKey = 'pf-controldock' }) {
  const [offset, setOffset] = useState(() => load(`${storageKey}-off`, { x: 0, y: 0 }));
  const [order, setOrder] = useState(() => load(`${storageKey}-order`, items.map((i) => i.key)));
  const dragKey = useRef(null);

  useEffect(() => { localStorage.setItem(`${storageKey}-off`, JSON.stringify(offset)); }, [offset, storageKey]);
  useEffect(() => { localStorage.setItem(`${storageKey}-order`, JSON.stringify(order)); }, [order, storageKey]);

  // Reconcile stored order with the current item set (drop stale, append new).
  useEffect(() => {
    setOrder((prev) => {
      const keys = items.map((i) => i.key);
      const kept = prev.filter((k) => keys.includes(k));
      const added = keys.filter((k) => !kept.includes(k));
      const next = [...kept, ...added];
      return next.length === prev.length && next.every((k, i) => k === prev[i]) ? prev : next;
    });
  }, [items]);

  // Panel drag (grip handle) via pointer events.
  const onGripDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const start = { sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y };
    const move = (ev) => setOffset({ x: start.ox + ev.clientX - start.sx, y: start.oy + ev.clientY - start.sy });
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, [offset]);

  // Item reorder via native HTML5 drag-and-drop.
  const onItemDragStart = (k) => (e) => { dragKey.current = k; e.dataTransfer.effectAllowed = 'move'; };
  const onItemDragOver = (k) => (e) => {
    e.preventDefault();
    const from = dragKey.current;
    if (from == null || from === k) return;
    setOrder((prev) => {
      const a = [...prev];
      const fi = a.indexOf(from);
      const ti = a.indexOf(k);
      if (fi < 0 || ti < 0) return prev;
      a.splice(fi, 1);
      a.splice(ti, 0, from);
      return a;
    });
  };
  const onItemDragEnd = () => { dragKey.current = null; };

  const byKey = Object.fromEntries(items.map((i) => [i.key, i]));
  const ordered = order.map((k) => byKey[k]).filter(Boolean);

  return (
    <div className="control-dock" style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
      <button
        type="button"
        className="control-dock__grip"
        onPointerDown={onGripDown}
        title="Drag to move panel"
        aria-label="Move panel"
      >
        <GripVertical size={14} strokeWidth={2} />
      </button>
      <div className="control-dock__items">
        {ordered.map((it) => (
          <button
            key={it.key}
            type="button"
            className={
              `canvas-action-btn${it.iconOnly ? ' canvas-action-btn--icon' : ''}` +
              `${it.danger ? ' canvas-action-btn--danger' : ''}` +
              `${it.active ? ' is-active' : ''}`
            }
            onClick={it.onClick}
            disabled={it.disabled}
            title={it.title}
            aria-label={it.label}
            draggable
            onDragStart={onItemDragStart(it.key)}
            onDragOver={onItemDragOver(it.key)}
            onDragEnd={onItemDragEnd}
          >
            {it.icon}
            {!it.iconOnly && it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
