// store.js

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
  } from 'reactflow';
import { topologicalOrder, computeLayout } from '../lib/graph';

export const useStore = create(persist((set, get) => ({
    nodes: [],
    edges: [],
    nodeIDs: {},
    activeNodeId: null,   // node currently "executing" during a run
    ranNodeIds: [],       // nodes already executed this run
    past: [],             // undo stack (graph snapshots)
    future: [],           // redo stack
    _runToken: 0,         // invalidates an in-flight run when the graph changes
    toasts: [],           // active toast notifications
    _toastSeq: 0,         // monotonic toast id source

    // ── Undo / Redo ──────────────────────────────────────────
    // Snapshots capture only the durable graph (nodes/edges/nodeIDs); transient
    // run state is intentionally excluded. Call pushHistory() BEFORE mutating.
    _snapshot: () => ({
      nodes: get().nodes,
      edges: get().edges,
      nodeIDs: get().nodeIDs,
    }),
    pushHistory: () => {
      set({
        past: [...get().past.slice(-49), get()._snapshot()],
        future: [],
      });
    },
    undo: () => {
      const { past } = get();
      if (past.length === 0) return;
      const previous = past[past.length - 1];
      set({
        past: past.slice(0, -1),
        future: [get()._snapshot(), ...get().future].slice(0, 50),
        ...previous,
        activeNodeId: null,
        ranNodeIds: [],
        _runToken: get()._runToken + 1,
      });
    },
    redo: () => {
      const { future } = get();
      if (future.length === 0) return;
      const next = future[0];
      set({
        past: [...get().past, get()._snapshot()].slice(-50),
        future: future.slice(1),
        ...next,
        activeNodeId: null,
        ranNodeIds: [],
        _runToken: get()._runToken + 1,
      });
    },

    // ── Command palette (single search surface) ──────────────
    paletteOpen: false,
    openPalette: () => set({ paletteOpen: true }),
    closePalette: () => set({ paletteOpen: false }),
    togglePalette: () => set({ paletteOpen: !get().paletteOpen }),

    // ── Confirm dialog ───────────────────────────────────────
    // A styled, promise-free confirm. requestConfirm stores the request +
    // its onConfirm callback; ConfirmHost renders it and runs the callback.
    confirmState: null,
    requestConfirm: (opts) => set({ confirmState: opts }),
    closeConfirm: () => set({ confirmState: null }),

    // ── Toast notifications ──────────────────────────────────
    addToast: ({ type = 'info', title, message, duration } = {}) => {
      const id = get()._toastSeq + 1;
      set({ _toastSeq: id, toasts: [...get().toasts, { id, type, title, message, duration }] });
      return id;
    },
    dismissToast: (id) => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    },

    getNodeID: (type) => {
        const newIDs = {...get().nodeIDs};
        if (newIDs[type] === undefined) {
            newIDs[type] = 0;
        }
        newIDs[type] += 1;
        set({nodeIDs: newIDs});
        return `${type}-${newIDs[type]}`;
    },
    addNode: (node) => {
        get().pushHistory();
        set({
            nodes: [...get().nodes, node]
        });
    },
    onNodesChange: (changes) => {
      // Deletions (incl. keyboard Delete/Backspace) are recorded so they undo.
      if (changes.some((c) => c.type === 'remove')) get().pushHistory();
      set({
        nodes: applyNodeChanges(changes, get().nodes),
      });
    },
    onEdgesChange: (changes) => {
      if (changes.some((c) => c.type === 'remove')) get().pushHistory();
      set({
        edges: applyEdgeChanges(changes, get().edges),
      });
    },
    onConnect: (connection) => {
      // Reject self-loops and exact duplicate connections.
      if (connection.source === connection.target) return;
      const duplicate = get().edges.some(
        (e) =>
          e.source === connection.source &&
          e.target === connection.target &&
          e.sourceHandle === connection.sourceHandle &&
          e.targetHandle === connection.targetHandle
      );
      if (duplicate) return;
      get().pushHistory();
      set({
        edges: addEdge({ ...connection, type: 'smoothstep' }, get().edges),
      });
    },
    // Delete a single edge (hover ✕ button on the edge).
    deleteEdge: (edgeId) => {
      get().pushHistory();
      set({ edges: get().edges.filter((e) => e.id !== edgeId) });
    },
    updateNodeField: (nodeId, fieldName, fieldValue) => {
      set({
        nodes: get().nodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, [fieldName]: fieldValue } }
            : node
        ),
      });
    },
    // Remove a node and any edges touching it (right-click → Delete).
    deleteNode: (nodeId) => {
      get().pushHistory();
      set({
        nodes: get().nodes.filter((n) => n.id !== nodeId),
        edges: get().edges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId
        ),
      });
    },
    // Clone a node with a fresh id, offset so it doesn't overlap the original.
    duplicateNode: (nodeId) => {
      const source = get().nodes.find((n) => n.id === nodeId);
      if (!source) return;
      get().pushHistory();
      const newId = get().getNodeID(source.type);
      const clone = {
        ...source,
        id: newId,
        position: {
          x: source.position.x + 40,
          y: source.position.y + 40,
        },
        data: { ...source.data, id: newId },
        selected: false,
      };
      set({ nodes: [...get().nodes, clone] });
    },
    // Live execution simulation: light up nodes in topological (dependency)
    // order, one every 550ms, so the graph visibly "runs".
    runPipeline: () => {
      const { nodes, edges } = get();
      if (nodes.length === 0 || get().activeNodeId !== null) return;

      const order = topologicalOrder(nodes, edges);
      // Any node not reachable by topo order (part of a cycle) is appended
      // so every node still animates.
      const missing = nodes.map((n) => n.id).filter((id) => !order.includes(id));
      const sequence = [...order, ...missing];

      // Token this run so a mid-run Clear/Load/Undo can cancel it (any of those
      // bumps _runToken; a stale step then bails instead of resurrecting dead ids).
      const token = get()._runToken + 1;
      set({ _runToken: token });

      let i = 0;
      const step = () => {
        if (get()._runToken !== token) return; // cancelled
        if (i >= sequence.length) {
          // Brief "all done" flash, then reset.
          set({ activeNodeId: null, ranNodeIds: sequence });
          setTimeout(() => { if (get()._runToken === token) set({ ranNodeIds: [] }); }, 900);
          return;
        }
        set({ activeNodeId: sequence[i], ranNodeIds: sequence.slice(0, i) });
        i += 1;
        setTimeout(step, 550);
      };
      step();
    },
    // Cancel any in-flight run (bumps the token; also clears live run state).
    cancelRun: () => set({ _runToken: get()._runToken + 1, activeNodeId: null, ranNodeIds: [] }),
    // Remove edges that reference a handle this node no longer exposes.
    // Used when a node's handle set changes (e.g. a {{variable}} is deleted,
    // dropping its input handle) so no dangling connections remain.
    syncEdgesForNode: (nodeId, validHandleIds) => {
      const edges = get().edges;
      const next = edges.filter((e) => {
        if (e.source === nodeId && e.sourceHandle && !validHandleIds.has(e.sourceHandle)) return false;
        if (e.target === nodeId && e.targetHandle && !validHandleIds.has(e.targetHandle)) return false;
        return true;
      });
      // Pruning a dangling edge (e.g. a {{variable}} was renamed) is undoable.
      if (next.length !== edges.length) {
        get().pushHistory();
        set({ edges: next });
      }
    },
    // Arrange nodes into tidy dependency columns (Tidy button / Cmd+K).
    autoLayout: () => {
      const { nodes, edges } = get();
      if (nodes.length === 0) return;
      get().pushHistory();
      const positions = computeLayout(nodes, edges);
      set({
        nodes: nodes.map((n) =>
          positions[n.id] ? { ...n, position: positions[n.id] } : n
        ),
      });
    },
    // Load a small ready-made pipeline (empty-state "Load example" / Cmd+K).
    // Input → LLM → Output, wired and ready to Run or Submit.
    loadSample: () => {
      get().pushHistory();
      const make = (type, x, y, data = {}) => {
        const id = get().getNodeID(type);
        return { id, type, position: { x, y }, data: { id, nodeType: type, ...data } };
      };
      const input = make('customInput', 60, 150, { inputName: 'user_query' });
      const llm = make('llm', 400, 130);
      const output = make('customOutput', 760, 150, { outputName: 'answer' });
      const edge = (s, sh, t, th) => ({
        id: `sample-${s}-${t}`,
        source: s,
        sourceHandle: `${s}-${sh}`,
        target: t,
        targetHandle: `${t}-${th}`,
        type: 'smoothstep',
      });
      set({
        nodes: [input, llm, output],
        edges: [edge(input.id, 'value', llm.id, 'input'), edge(llm.id, 'response', output.id, 'value')],
        activeNodeId: null,
        ranNodeIds: [],
        _runToken: get()._runToken + 1,
      });
    },
    // Wipe the canvas (Cmd+K → Clear canvas).
    clearPipeline: () => {
      if (get().nodes.length === 0 && get().edges.length === 0) return;
      get().pushHistory();
      set({ nodes: [], edges: [], nodeIDs: {}, activeNodeId: null, ranNodeIds: [], _runToken: get()._runToken + 1 });
    },
  }), {
    name: 'pipelineforge-storage',
    // Only persist the graph itself — transient run state stays out of storage.
    partialize: (state) => ({
      nodes: state.nodes,
      edges: state.edges,
      nodeIDs: state.nodeIDs,
    }),
  }));
