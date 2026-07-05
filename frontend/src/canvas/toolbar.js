// toolbar.js
// Floating glass dock — a draggable palette of reorderable, icon-only node
// chips. The search icon opens the ⌘K command palette (single search surface).

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, GripVertical } from 'lucide-react';
import { DraggableNode } from './draggableNode';
import { getToolbarItems } from '../nodes/nodeRegistry';
import { useStore } from '../store/store';

const OFFSET_KEY = 'pf-dock-offset';
const ORDER_KEY = 'pf-dock-order';

// Registry is static, so compute the palette items once (stable identity).
const ITEMS = getToolbarItems();

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return fallback;
}

export const PipelineToolbar = () => {
    const items = ITEMS;
    const openPalette = useStore((s) => s.openPalette);

    const [offset, setOffset] = useState(() => load(OFFSET_KEY, { x: 0, y: 0 }));
    const [order, setOrder] = useState(() => load(ORDER_KEY, items.map((i) => i.type)));
    const draggingType = useRef(null);

    useEffect(() => { localStorage.setItem(OFFSET_KEY, JSON.stringify(offset)); }, [offset]);
    useEffect(() => { localStorage.setItem(ORDER_KEY, JSON.stringify(order)); }, [order]);

    // Reconcile stored order with the registry (drop stale, append new types).
    useEffect(() => {
        setOrder((prev) => {
            const types = items.map((i) => i.type);
            const kept = prev.filter((t) => types.includes(t));
            const added = types.filter((t) => !kept.includes(t));
            const next = [...kept, ...added];
            return next.length === prev.length && next.every((t, i) => t === prev[i]) ? prev : next;
        });
    }, [items]);

    // Drag the whole dock by its grip.
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

    // Chip reorder (native drag over a sibling chip).
    const onReorderStart = useCallback((t) => { draggingType.current = t; }, []);
    const onReorderEnd = useCallback(() => { draggingType.current = null; }, []);
    const onReorderOver = useCallback((t) => {
        const from = draggingType.current;
        if (!from || from === t) return;
        setOrder((prev) => {
            const a = [...prev];
            const fi = a.indexOf(from);
            const ti = a.indexOf(t);
            if (fi < 0 || ti < 0) return prev;
            a.splice(fi, 1);
            a.splice(ti, 0, from);
            return a;
        });
    }, []);

    const byType = Object.fromEntries(items.map((i) => [i.type, i]));
    const ordered = order.map((t) => byType[t]).filter(Boolean);

    const style = (offset.x || offset.y)
        ? { transform: `translate(calc(-50% + ${offset.x}px), ${offset.y}px)` }
        : undefined;

    return (
        <div className="pipeline-dock" role="toolbar" aria-label="Node palette" style={style}>
            <button
                type="button"
                className="dock-grip"
                onPointerDown={onGripDown}
                title="Drag to move palette"
                aria-label="Move palette"
            >
                <GripVertical size={14} strokeWidth={2} />
            </button>

            <button
                type="button"
                className="dock-search-btn"
                onClick={openPalette}
                title="Search nodes & commands (⌘K)"
                aria-label="Open command palette"
            >
                <Search size={16} strokeWidth={2.2} />
            </button>

            <div className="pipeline-dock__divider" aria-hidden="true" />

            <div className="pipeline-dock__group">
                {ordered.map((item) => (
                    <DraggableNode
                        key={item.type}
                        type={item.type}
                        label={item.label}
                        icon={item.icon}
                        category={item.category}
                        onReorderStart={onReorderStart}
                        onReorderOver={onReorderOver}
                        onReorderEnd={onReorderEnd}
                    />
                ))}
            </div>
        </div>
    );
};
