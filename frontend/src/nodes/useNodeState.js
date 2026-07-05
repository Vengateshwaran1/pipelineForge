// useNodeState.js
// Custom hook for managing node field state.
//
// Single source of truth: the Zustand store. Field values live in
// store.nodes[].data, which ReactFlow mirrors into each node's `data` prop.
// The hook derives its live view from `data` and writes through to the store —
// there is no separate local copy to drift out of sync.

import { useMemo, useCallback, useRef, useEffect } from 'react';
import { useStore } from '../store/store';

/**
 * Computes a single field's default value.
 * Priority: dynamic default fn → static config default → type-based fallback.
 * @param {string} nodeId - The node's unique identifier
 * @param {object} field - Field config object
 * @returns {any} default value
 */
function computeDefault(nodeId, field) {
  if (typeof field.defaultValueFn === 'function') {
    return field.defaultValueFn(nodeId);
  }
  if (field.default !== undefined) {
    return field.default;
  }
  switch (field.type) {
    case 'checkbox':
      return false;
    case 'slider':
      return field.min ?? 0;
    default:
      return '';
  }
}

/**
 * Custom hook for node field state management.
 *
 * Provides a getValue/setValue API backed entirely by the store:
 * - Derives values from the node's `data` prop (the store's mirror), falling
 *   back to config defaults so readers never see `undefined`.
 * - setValue writes straight to the store; the re-render flows back through
 *   `data`, keeping a single source of truth.
 * - Seeds any missing defaults into the store once on mount so other nodes,
 *   dynamic handles, and Submit can read them.
 *
 * @param {string} nodeId - The node's unique identifier
 * @param {object} data - The node's data object from ReactFlow (store mirror)
 * @param {Array} fields - Array of field config objects from the node config
 * @returns {{ getValue: (name: string) => any, setValue: (name: string, value: any) => void, values: object }}
 */
export function useNodeState(nodeId, data, fields) {
  const updateNodeField = useStore((state) => state.updateNodeField);

  // Live view derived from the store's mirror. `??` keeps falsy-but-valid
  // values (e.g. '' or 0) and only falls back before the mount-seed lands.
  const values = useMemo(() => {
    const v = {};
    for (const field of fields) {
      v[field.name] = data?.[field.name] ?? computeDefault(nodeId, field);
    }
    return v;
  }, [data, fields, nodeId]);

  // Seed missing defaults into the store once, so downstream readers
  // (dynamic {{variable}} handles, Submit serialization) see real values.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    for (const field of fields) {
      if (data?.[field.name] === undefined) {
        updateNodeField(nodeId, field.name, computeDefault(nodeId, field));
      }
    }
    // Mount only — subsequent value changes flow through the store directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getValue = useCallback((name) => values[name], [values]);

  const setValue = useCallback(
    (name, value) => {
      updateNodeField(nodeId, name, value);
    },
    [nodeId, updateNodeField]
  );

  return { getValue, setValue, values };
}
