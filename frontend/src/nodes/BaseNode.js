// BaseNode.js
// Universal shell component for all pipeline nodes.
// Renders the styled container, category-coloured header with icon,
// declarative fields via NodeField, handle components with optional labels,
// and an escape-hatch children slot for custom body content.

import React, { useEffect } from 'react';
import { Handle, Position, NodeResizer, useUpdateNodeInternals } from 'reactflow';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { NodeField } from './NodeField';
import { useNodeState } from './useNodeState';
import { useStore } from '../store';
import './nodeStyles.css';

/**
 * Maps position strings from config to ReactFlow Position constants.
 */
const POSITION_MAP = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

/**
 * Resolves a Lucide icon component by name.
 * Falls back to a generic circle if the icon name isn't found.
 * @param {string} iconName - PascalCase Lucide icon name
 * @returns {React.Component}
 */
function getIcon(iconName) {
  return LucideIcons[iconName] || LucideIcons.Circle;
}

/**
 * Computes the `top` style for handles that share a side.
 * When multiple handles are on the same side, they are evenly distributed.
 *
 * @param {Array} handles - All handle configs from the node config
 * @param {object} handle - The current handle config
 * @returns {object} Inline style object for the handle
 */
function computeHandleStyle(handles, handle) {
  // If an explicit offset is provided, use it
  if (handle.offset) {
    return { top: handle.offset };
  }

  // Count handles on the same side & position
  const sameSide = handles.filter(
    (h) => h.position === handle.position && h.type === handle.type
  );

  if (sameSide.length <= 1) {
    return {}; // Single handle on this side — default centering
  }

  const index = sameSide.indexOf(handle);
  const percentage = ((index + 1) / (sameSide.length + 1)) * 100;
  return { top: `${percentage}%` };
}

/**
 * BaseNode — the universal node shell.
 *
 * @param {object} props
 * @param {string} props.id - Node id from ReactFlow
 * @param {object} props.data - Node data from ReactFlow
 * @param {boolean} props.selected - Whether node is selected
 * @param {object} props.config - Declarative node configuration
 * @param {React.ReactNode} [props.children] - Optional custom body content
 */
export function BaseNode({ id, data, selected, config, children }) {
  const { fields = [], title, icon, category = 'utility' } = config;
  const { getValue, setValue, values } = useNodeState(id, data, fields);

  // Handles may be static (config.handles) or derived from live field values
  // (config.getHandles) — the latter powers dynamic {{variable}} inputs.
  const handles = typeof config.getHandles === 'function'
    ? config.getHandles(values)
    : (config.handles || []);

  // Optional content-driven container style (e.g. the Text node growing its
  // width to fit typed text). Mirrors the getHandles pattern.
  const dynamicStyle = typeof config.getStyle === 'function'
    ? config.getStyle(values)
    : undefined;

  // Live-run state (see store.runPipeline) — drives the execution glow.
  const isRunning = useStore((s) => s.activeNodeId === id);
  const isDone = useStore((s) => s.ranNodeIds.includes(id));

  // When the handle set changes (e.g. a {{variable}} handle is removed),
  // prune any edges left dangling on this node.
  const syncEdgesForNode = useStore((s) => s.syncEdgesForNode);
  const updateNodeInternals = useUpdateNodeInternals();
  const handleKey = handles.map((h) => `${id}-${h.id}`).join('|');
  useEffect(() => {
    const validIds = new Set(handleKey ? handleKey.split('|') : []);
    syncEdgesForNode(id, validIds);
    // Handle set changed (added/removed {{variable}} handle, or positions
    // shifted as siblings redistribute). Tell ReactFlow to re-measure this
    // node's handles, otherwise edges render at stale coords ("flying").
    updateNodeInternals(id);
  }, [handleKey, id, syncEdgesForNode, updateNodeInternals]);

  const IconComponent = getIcon(icon);

  // Nodes are resizable by default; auto-sizing nodes (e.g. Text, which grows
  // to fit its content) opt out via `resizable: false` in their config.
  const resizable = config.resizable !== false;

  return (
    <motion.div
      className={
        `base-node base-node--${category}` +
        `${selected ? ' selected' : ''}` +
        `${isRunning ? ' base-node--running' : ''}` +
        `${isDone ? ' base-node--done' : ''}`
      }
      style={dynamicStyle}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Resize from any edge/corner. The body flex-grows so the node stays
          filled and aligned at any size. */}
      {resizable && (
        <NodeResizer
          isVisible={selected}
          minWidth={240}
          minHeight={120}
          maxWidth={620}
          maxHeight={520}
          lineClassName="node-resize-line"
          handleClassName="node-resize-handle"
        />
      )}

      {/* ── Header ───────────────────────────────────── */}
      <div className={`base-node__header base-node__header--${category}`}>
        <span className="base-node__header-icon">
          <IconComponent size={15} strokeWidth={2.2} />
        </span>
        <span className="base-node__header-title">{title}</span>
      </div>

      {/* ── Body: fields + children ──────────────────── */}
      {(fields.length > 0 || children) && (
        <div className={`base-node__body base-node__body--${category}`}>
          {fields.map((field) => (
            <NodeField
              key={field.name}
              field={field}
              value={getValue(field.name)}
              onChange={(val) => setValue(field.name, val)}
            />
          ))}
          {children}
        </div>
      )}

      {/* ── Handles ──────────────────────────────────── */}
      {handles.map((handle) => {
        const position = POSITION_MAP[handle.position] || Position.Right;
        const handleStyle = computeHandleStyle(handles, handle);
        const handleId = `${id}-${handle.id}`;

        // A labelled handle renders as a rounded pill with its text inside —
        // the pill IS the connection handle. Unlabelled handles stay as dots.
        return (
          <Handle
            key={handleId}
            type={handle.type}
            position={position}
            id={handleId}
            style={handleStyle}
            className={handle.label ? `base-node__handle-pill base-node__handle-pill--${handle.position}` : undefined}
          >
            {handle.label}
          </Handle>
        );
      })}
    </motion.div>
  );
}
