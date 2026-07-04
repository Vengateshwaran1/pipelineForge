// dataTransformNode.js
// Data Transform node — applies a transformation operation to incoming data.
// Demonstrates the `children` escape hatch: the config drives the fields,
// but a custom React component is used for a live preview area below them.

import React from 'react';
import { BaseNode } from './BaseNode';

/**
 * Node config for the Data Transform node.
 */
export const dataTransformNodeConfig = {
  type: 'dataTransform',
  title: 'Data Transform',
  icon: 'Shuffle',
  category: 'processing',
  description: 'Transform data with a built-in operation.',
  fields: [
    {
      name: 'operation',
      type: 'select',
      label: 'Operation',
      default: 'uppercase',
      options: [
        { value: 'uppercase', label: 'Uppercase' },
        { value: 'lowercase', label: 'Lowercase' },
        { value: 'trim', label: 'Trim Whitespace' },
        { value: 'reverse', label: 'Reverse String' },
        { value: 'json_parse', label: 'JSON Parse' },
        { value: 'base64_encode', label: 'Base64 Encode' },
      ],
    },
    {
      name: 'key',
      type: 'text',
      label: 'Target Key',
      default: '',
      placeholder: 'e.g. data.message',
    },
  ],
  handles: [
    { type: 'target', position: 'left', id: 'input' },
    { type: 'source', position: 'right', id: 'output' },
  ],
};

/**
 * DataTransformNode — uses the children escape hatch to render
 * a custom preview area below the config-driven fields.
 */
export function DataTransformNode(props) {
  return (
    <BaseNode {...props} config={dataTransformNodeConfig}>
      <div
        style={{
          marginTop: 4,
          padding: '8px 10px',
          background: 'rgba(168, 85, 247, 0.08)',
          borderRadius: 8,
          border: '1px dashed rgba(168, 85, 247, 0.25)',
          fontSize: 11,
          color: '#94a3b8',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <span style={{ fontWeight: 600, color: '#a855f7', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Preview
        </span>
        <div style={{ marginTop: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#cbd5e1' }}>
          input → <strong style={{ color: '#c4b5fd' }}>{props.data?.operation || 'uppercase'}</strong> → output
        </div>
      </div>
    </BaseNode>
  );
}
