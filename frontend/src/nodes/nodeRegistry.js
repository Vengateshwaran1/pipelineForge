// nodeRegistry.js
// Central registry for all pipeline nodes.
//
// Adding a new node requires exactly:
// 1. Create a config file (e.g., myNode.js) with an exported config object
// 2. Import the config here and add one entry to NODE_CONFIGS
//
// No other files need to be touched — ui.js, toolbar.js, and BaseNode
// all consume this registry dynamically.

import React from 'react';
import { BaseNode } from './BaseNode';

// ── Node config imports ──────────────────────────────────────
import { inputNodeConfig } from './inputNode';
import { outputNodeConfig } from './outputNode';
import { llmNodeConfig } from './llmNode';
import { textNodeConfig } from './textNode';
import { noteNodeConfig } from './noteNode';
import { apiRequestNodeConfig } from './apiRequestNode';
import { conditionNodeConfig } from './conditionNode';
import { timerNodeConfig } from './timerNode';
import { dataTransformNodeConfig, DataTransformNode } from './dataTransformNode';

// ── Registry ─────────────────────────────────────────────────
// Each entry: { config, component? }
// If `component` is provided, it's used directly (for nodes with children escape hatch).
// Otherwise, a wrapper around BaseNode is auto-generated.
const NODE_ENTRIES = [
  { config: inputNodeConfig },
  { config: outputNodeConfig },
  { config: llmNodeConfig },
  { config: textNodeConfig },
  { config: noteNodeConfig },
  { config: apiRequestNodeConfig },
  { config: conditionNodeConfig },
  { config: timerNodeConfig },
  { config: dataTransformNodeConfig, component: DataTransformNode },
];

/**
 * Map of all node configs keyed by type.
 * Useful for introspection, serialization, or testing.
 */
export const nodeConfigs = Object.fromEntries(
  NODE_ENTRIES.map((entry) => [entry.config.type, entry.config])
);

/**
 * Creates a React component that wraps BaseNode with a specific config.
 * This is the factory function for config-only nodes.
 * @param {object} config - Node configuration object
 * @returns {React.FC} React component for ReactFlow
 */
function createNodeComponent(config) {
  const NodeComponent = (props) => (
    <BaseNode {...props} config={config} />
  );
  NodeComponent.displayName = `${config.title.replace(/\s+/g, '')}Node`;
  return NodeComponent;
}

/**
 * Builds the nodeTypes map expected by ReactFlow.
 * For nodes with a custom component, uses that directly.
 * For config-only nodes, auto-generates a wrapper around BaseNode.
 *
 * @returns {Record<string, React.FC>} Map of { typeKey: ReactComponent }
 */
export function buildNodeTypes() {
  const types = {};
  for (const entry of NODE_ENTRIES) {
    types[entry.config.type] = entry.component || createNodeComponent(entry.config);
  }
  return types;
}

/**
 * Returns an array of toolbar items derived from all registered nodes.
 * Each item contains the info needed to render a DraggableNode.
 *
 * @returns {Array<{ type: string, label: string, icon: string, category: string }>}
 */
export function getToolbarItems() {
  return NODE_ENTRIES.map((entry) => ({
    type: entry.config.type,
    label: entry.config.title,
    icon: entry.config.icon,
    category: entry.config.category,
  }));
}
