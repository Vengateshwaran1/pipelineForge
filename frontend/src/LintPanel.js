// LintPanel.js
// Live pipeline checks — surfaces cycles, unconnected nodes, and empty required
// fields. Click an issue to focus its node. Reuses the shared DAG helper and the
// node registry (for titles + required-field metadata).

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useStore } from './store';
import { shallow } from 'zustand/shallow';
import { nodeConfigs } from './nodes/nodeRegistry';
import { isDAG } from './graph';

export function LintPanel({ onFocus }) {
  const { nodes, edges } = useStore(
    (s) => ({ nodes: s.nodes, edges: s.edges }),
    shallow
  );
  const [open, setOpen] = useState(false);

  const issues = useMemo(() => {
    const list = [];
    if (nodes.length && !isDAG(nodes, edges)) {
      list.push({ id: null, msg: 'Pipeline contains a cycle (not a DAG)' });
    }
    const connected = new Set();
    edges.forEach((e) => { connected.add(e.source); connected.add(e.target); });

    nodes.forEach((n) => {
      const cfg = nodeConfigs[n.type];
      const title = cfg?.title || n.type;
      if (nodes.length > 1 && !connected.has(n.id)) {
        list.push({ id: n.id, msg: `${title} is not connected` });
      }
      (cfg?.fields || []).forEach((f) => {
        if (!f.required) return;
        const v = n.data?.[f.name];
        if (v == null || v === '') {
          list.push({ id: n.id, msg: `${title}: ${f.label} is required` });
        }
      });
    });
    return list;
  }, [nodes, edges]);

  if (nodes.length === 0) return null;
  const count = issues.length;

  return (
    <div className="lint">
      <button
        type="button"
        className={`lint__btn ${count ? 'lint__btn--warn' : 'lint__btn--ok'}`}
        onClick={() => setOpen((o) => !o)}
        title="Pipeline checks"
      >
        {count ? <AlertTriangle size={14} strokeWidth={2.2} /> : <CheckCircle2 size={14} strokeWidth={2.2} />}
        {count ? `${count} issue${count > 1 ? 's' : ''}` : 'No issues'}
      </button>

      {open && count > 0 && (
        <div className="lint__list">
          <div className="lint__head">
            <span>Pipeline checks</span>
            <button type="button" className="lint__close" onClick={() => setOpen(false)} aria-label="Close">
              <X size={13} />
            </button>
          </div>
          {issues.map((it, i) => (
            <button
              key={i}
              type="button"
              className="lint__item"
              onClick={() => it.id && onFocus?.(it.id)}
              disabled={!it.id}
            >
              <AlertTriangle size={12} strokeWidth={2.4} />
              <span>{it.msg}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
