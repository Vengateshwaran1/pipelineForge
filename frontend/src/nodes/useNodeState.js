// useNodeState.js
// Custom hook for managing node field state with automatic store synchronization.
// Eliminates the need for individual useState calls in each node component.

import { useState, useCallback, useRef, useEffect } from 'react';
import { useStore } from '../store';

/**
 * Initializes field values from node data, config defaults, or dynamic default functions.
 * @param {string} nodeId - The node's unique identifier
 * @param {object} data - The node's data object from ReactFlow
 * @param {Array} fields - Array of field config objects from the node config
 * @returns {object} Initial values map { fieldName: value }
 */
function computeInitialValues(nodeId, data, fields) {
  const values = {};
  for (const field of fields) {
    if (data?.[field.name] !== undefined) {
      // Priority 1: Value already in node data
      values[field.name] = data[field.name];
    } else if (typeof field.defaultValueFn === 'function') {
      // Priority 2: Dynamic default based on node id
      values[field.name] = field.defaultValueFn(nodeId);
    } else if (field.default !== undefined) {
      // Priority 3: Static default from config
      values[field.name] = field.default;
    } else {
      // Priority 4: Type-based fallback
      switch (field.type) {
        case 'checkbox':
          values[field.name] = false;
          break;
        case 'slider':
          values[field.name] = field.min ?? 0;
          break;
        default:
          values[field.name] = '';
      }
    }
  }
  return values;
}

/**
 * Custom hook for node field state management.
 *
 * Provides a clean getValue/setValue API that:
 * - Initializes values from data, config defaults, or dynamic defaults
 * - Keeps local React state in sync with the Zustand store
 * - Batches updates to avoid unnecessary re-renders
 *
 * @param {string} nodeId - The node's unique identifier
 * @param {object} data - The node's data object from ReactFlow
 * @param {Array} fields - Array of field config objects from the node config
 * @returns {{ getValue: (name: string) => any, setValue: (name: string, value: any) => void, values: object }}
 */
export function useNodeState(nodeId, data, fields) {
  const updateNodeField = useStore((state) => state.updateNodeField);
  const initialValues = useRef(computeInitialValues(nodeId, data, fields));
  const [values, setValues] = useState(initialValues.current);

  // Sync initial values to the store on mount so other nodes/components can read them
  useEffect(() => {
    const init = initialValues.current;
    for (const [fieldName, fieldValue] of Object.entries(init)) {
      updateNodeField(nodeId, fieldName, fieldValue);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getValue = useCallback(
    (name) => values[name],
    [values]
  );

  const setValue = useCallback(
    (name, value) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      updateNodeField(nodeId, name, value);
    },
    [nodeId, updateNodeField]
  );

  return { getValue, setValue, values };
}
