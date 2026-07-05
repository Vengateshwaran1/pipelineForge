// commandPalette.js
// Cmd/Ctrl+K launcher. Fuzzy-search all node types (from the registry) plus
// global actions (Run, Clear), navigate with arrows, execute with Enter.

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { Search, Command } from 'lucide-react';
import { useStore } from '../store/store';
import { getToolbarItems } from '../nodes/nodeRegistry';

const Icon = ({ name, size = 15 }) => {
  const C = LucideIcons[name] || LucideIcons.Circle;
  return <C size={size} strokeWidth={2} />;
};

export const CommandPalette = () => {
  const open = useStore((s) => s.paletteOpen);
  const closePalette = useStore((s) => s.closePalette);
  const togglePalette = useStore((s) => s.togglePalette);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  const addNode = useStore((s) => s.addNode);
  const getNodeID = useStore((s) => s.getNodeID);
  const runPipeline = useStore((s) => s.runPipeline);
  const clearPipeline = useStore((s) => s.clearPipeline);
  const autoLayout = useStore((s) => s.autoLayout);
  const loadSample = useStore((s) => s.loadSample);

  // Spawn a node near the canvas centre with a little scatter so repeats
  // don't stack exactly on top of each other.
  const spawnNode = useCallback((type) => {
    const id = getNodeID(type);
    addNode({
      id,
      type,
      position: {
        x: 320 + (Math.random() - 0.5) * 120,
        y: 200 + (Math.random() - 0.5) * 120,
      },
      data: { id, nodeType: type },
    });
  }, [addNode, getNodeID]);

  // Full command list: node types + global actions.
  const commands = useMemo(() => {
    const nodes = getToolbarItems().map((item) => ({
      id: `add-${item.type}`,
      label: `Add ${item.label}`,
      hint: 'Node',
      icon: item.icon,
      run: () => spawnNode(item.type),
    }));
    const actions = [
      { id: 'sample', label: 'Load example pipeline', hint: 'Action', icon: 'Sparkles', run: loadSample },
      { id: 'run', label: 'Run pipeline', hint: 'Action', icon: 'Zap', run: runPipeline },
      { id: 'tidy', label: 'Tidy layout', hint: 'Action', icon: 'Wand2', run: autoLayout },
      { id: 'clear', label: 'Clear canvas', hint: 'Action', icon: 'Trash2', run: clearPipeline },
    ];
    return [...nodes, ...actions];
  }, [spawnNode, runPipeline, autoLayout, clearPipeline, loadSample]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [query, commands]);

  // Global Cmd/Ctrl+K toggle.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        togglePalette();
      } else if (e.key === 'Escape') {
        closePalette();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePalette, closePalette]);

  // Reset + focus each time it opens.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // Focus after the element mounts.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Keep the highlighted row in range as the list shrinks.
  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(filtered.length - 1, 0)));
  }, [filtered.length]);

  const execute = useCallback((cmd) => {
    if (!cmd) return;
    cmd.run();
    closePalette();
  }, [closePalette]);

  const onInputKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      execute(filtered[active]);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="cmdk-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closePalette}
        >
          <motion.div
            className="cmdk-panel"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cmdk-search">
              <Search size={16} className="cmdk-search__icon" />
              <input
                ref={inputRef}
                className="cmdk-search__input"
                placeholder="Add a node or run a command..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
              />
              <span className="cmdk-search__kbd">ESC</span>
            </div>

            <div className="cmdk-list">
              {filtered.length === 0 && (
                <div className="cmdk-empty">No matches</div>
              )}
              {filtered.map((cmd, i) => (
                <button
                  key={cmd.id}
                  className={`cmdk-item ${i === active ? 'cmdk-item--active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => execute(cmd)}
                >
                  <span className="cmdk-item__icon"><Icon name={cmd.icon} /></span>
                  <span className="cmdk-item__label">{cmd.label}</span>
                  <span className="cmdk-item__hint">{cmd.hint}</span>
                </button>
              ))}
            </div>

            <div className="cmdk-footer">
              <span><Command size={11} /> K to toggle</span>
              <span>↑↓ navigate · ↵ select</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
