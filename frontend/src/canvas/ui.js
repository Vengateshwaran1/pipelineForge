// ui.js
// Displays the drag-and-drop ReactFlow canvas with dark theme.
// --------------------------------------------------

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactFlow, { Controls, Background, MiniMap, Panel } from 'reactflow';
import { useStore } from '../store/store';
import { shallow } from 'zustand/shallow';
import { buildNodeTypes, nodeConfigs } from '../nodes/nodeRegistry';
import { MousePointerClick, Wand2, Trash2, Undo2, Redo2, Maximize2, Map, Sparkles, Zap } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { NodeContextMenu } from '../components/contextMenu';
import { FlowEdge } from './FlowEdge';
import { LintPanel } from '../components/LintPanel';
import { ControlDock } from '../components/ControlDock';
import { getToolbarItems } from '../nodes/nodeRegistry';

import 'reactflow/dist/style.css';

const gridSize = 20;
const proOptions = { hideAttribution: true };

// Build nodeTypes from registry — single source of truth
const nodeTypes = buildNodeTypes();

// Override the built-in smoothstep edge with our hover-to-delete edge, so
// every connection (old + new) gets a ✕ button on hover.
const edgeTypes = { smoothstep: FlowEdge };

// Minimap dot colour, derived from each node's registry category so the map
// stays in sync with node styling automatically.
const CATEGORY_COLORS = {
  io: '#3b82f6',
  processing: '#a855f7',
  logic: '#f59e0b',
  utility: '#06b6d4',
};

const minimapNodeColor = (node) =>
  CATEGORY_COLORS[nodeConfigs[node.type]?.category] || '#64748b';

// Toolbar items reused for the connect-and-create picker.
const paletteItems = getToolbarItems();
const MiniIcon = ({ name }) => {
  const C = LucideIcons[name] || LucideIcons.Circle;
  return <C size={14} strokeWidth={2} />;
};

const selector = (state) => ({
  nodes: state.nodes,
  edges: state.edges,
  getNodeID: state.getNodeID,
  addNode: state.addNode,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  autoLayout: state.autoLayout,
  clearPipeline: state.clearPipeline,
  pushHistory: state.pushHistory,
  undo: state.undo,
  redo: state.redo,
  canUndo: state.past.length > 0,
  canRedo: state.future.length > 0,
  requestConfirm: state.requestConfirm,
  loadSample: state.loadSample,
  runPipeline: state.runPipeline,
});

export const PipelineUI = () => {
    const reactFlowWrapper = useRef(null);
    const clipboardRef = useRef([]);
    const connectingRef = useRef(null);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const [menu, setMenu] = useState(null);
    const [connectMenu, setConnectMenu] = useState(null);
    const {
      nodes,
      edges,
      getNodeID,
      addNode,
      onNodesChange,
      onEdgesChange,
      onConnect,
      autoLayout,
      clearPipeline,
      pushHistory,
      undo,
      redo,
      canUndo,
      canRedo,
      requestConfirm,
      loadSample,
      runPipeline
    } = useStore(selector, shallow);
    const [animating, setAnimating] = useState(false);
    const [showMinimap, setShowMinimap] = useState(true);
    const activeNodeId = useStore((s) => s.activeNodeId);
    const isRunning = activeNodeId !== null;

    // Frame the whole graph in view.
    const onFit = useCallback(() => {
      reactFlowInstance?.fitView({ padding: 0.2, duration: 450 });
    }, [reactFlowInstance]);

    // Load the demo pipeline, then frame it.
    const onLoadSample = useCallback(() => {
      loadSample();
      requestAnimationFrame(() => reactFlowInstance?.fitView({ padding: 0.25, duration: 500 }));
    }, [loadSample, reactFlowInstance]);

    // Select + centre a node (used by the lint panel).
    const onFocusNode = useCallback((id) => {
      if (!reactFlowInstance) return;
      reactFlowInstance.setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === id })));
      const node = reactFlowInstance.getNode(id);
      if (node) {
        const w = node.width || 280;
        const h = node.height || 140;
        reactFlowInstance.setCenter(node.position.x + w / 2, node.position.y + h / 2, { zoom: 1.1, duration: 400 });
      }
    }, [reactFlowInstance]);

    // Cinematic run: pan the camera to each node as it lights up (built into Run).
    useEffect(() => {
      if (!activeNodeId || !reactFlowInstance) return;
      const node = reactFlowInstance.getNode(activeNodeId);
      if (!node) return;
      const w = node.width || 280;
      const h = node.height || 140;
      reactFlowInstance.setCenter(node.position.x + w / 2, node.position.y + h / 2, { zoom: 1.15, duration: 500 });
    }, [activeNodeId, reactFlowInstance]);

    // Connect-and-create: remember the handle a drag started from.
    const onConnectStart = useCallback((_evt, params) => {
      connectingRef.current = params;
    }, []);

    // If a connection is dropped on empty canvas, offer a node picker there.
    const onConnectEnd = useCallback((event) => {
      const source = connectingRef.current;
      connectingRef.current = null;
      if (!source || source.handleType !== 'source') return;
      // Touch `touchend` has no clientX/Y (they're on changedTouches) — bail
      // rather than projecting NaN coordinates.
      if (event.clientX == null || event.clientY == null) return;
      const onPane = event.target?.classList?.contains('react-flow__pane');
      if (!onPane || !reactFlowInstance) return;
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const rawX = event.clientX - bounds.left;
      const rawY = event.clientY - bounds.top;
      const flowPos = reactFlowInstance.project({ x: rawX, y: rawY });
      // Clamp so the menu (~180×300) stays inside the canvas.
      const left = Math.min(rawX, Math.max(0, bounds.width - 190));
      const top = Math.min(rawY, Math.max(0, bounds.height - 300));
      setConnectMenu({ top, left, flowPos, source });
    }, [reactFlowInstance]);

    // Pick a node from the connect-and-create menu: create it and wire it up.
    const onPickConnectNode = useCallback((type) => {
      const m = connectMenu;
      if (!m) return;
      const store = useStore.getState();
      const id = store.getNodeID(type);
      store.addNode({ id, type, position: m.flowPos, data: { id, nodeType: type } });
      const targetHandle = (nodeConfigs[type]?.handles || []).find((h) => h.type === 'target');
      if (targetHandle) {
        store.onConnect({
          source: m.source.nodeId,
          sourceHandle: m.source.handleId,
          target: id,
          targetHandle: `${id}-${targetHandle.id}`,
        });
      }
      setConnectMenu(null);
    }, [connectMenu]);

    // Snapshot before a drag so the whole move is a single undo step.
    const onNodeDragStart = useCallback(() => pushHistory(), [pushHistory]);

    // Global keyboard shortcuts. Ignored while typing in a field so text
    // editing keeps its own behaviour.
    //   Undo/Redo         Ctrl/Cmd+Z · Ctrl/Cmd+Shift+Z · Ctrl+Y
    //   Select all        Ctrl/Cmd+A
    //   Duplicate         Ctrl/Cmd+D
    //   Copy / Paste      Ctrl/Cmd+C · Ctrl/Cmd+V
    //   Zoom in/out/reset Ctrl/Cmd+= · Ctrl/Cmd+- · Ctrl/Cmd+0
    //   Tidy / Run        Ctrl/Cmd+L · Ctrl/Cmd+Enter
    //   Deselect / close  Escape
    useEffect(() => {
      const onKeyDown = (e) => {
        const tag = e.target?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;

        const rf = reactFlowInstance;
        const store = useStore.getState();
        const mod = e.metaKey || e.ctrlKey;
        const key = e.key.toLowerCase();

        if (key === 'escape') {
          // Let the palette / confirm own Escape when they're open — don't also
          // wipe the canvas selection underneath them.
          if (store.paletteOpen || store.confirmState) return;
          if (connectMenu) { setConnectMenu(null); return; }
          rf?.setNodes((nds) => nds.map((n) => (n.selected ? { ...n, selected: false } : n)));
          rf?.setEdges((eds) => eds.map((ed) => (ed.selected ? { ...ed, selected: false } : ed)));
          setMenu(null);
          return;
        }
        if (!mod) return;

        switch (key) {
          case 'z':
            e.preventDefault();
            e.shiftKey ? store.redo() : store.undo();
            break;
          case 'y':
            e.preventDefault();
            store.redo();
            break;
          case 'a':
            e.preventDefault();
            rf?.setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
            rf?.setEdges((eds) => eds.map((ed) => ({ ...ed, selected: true })));
            break;
          case 'd': {
            e.preventDefault();
            const selected = rf?.getNodes().filter((n) => n.selected) || [];
            selected.forEach((n) => store.duplicateNode(n.id));
            break;
          }
          case 'c':
            clipboardRef.current = (rf?.getNodes().filter((n) => n.selected)) || [];
            break;
          case 'v': {
            const clip = clipboardRef.current;
            if (!clip.length) break;
            e.preventDefault();
            // Rebuild clean nodes (drop transient width/height/selected/dragging),
            // cascading each paste so repeats don't stack on one spot.
            clip.forEach((n, idx) => {
              const id = store.getNodeID(n.type);
              const off = 40 + idx * 24;
              store.addNode({
                id,
                type: n.type,
                position: { x: n.position.x + off, y: n.position.y + off },
                data: { ...n.data, id },
              });
            });
            break;
          }
          case '=':
          case '+':
            e.preventDefault();
            rf?.zoomIn({ duration: 200 });
            break;
          case '-':
            e.preventDefault();
            rf?.zoomOut({ duration: 200 });
            break;
          case '0':
            e.preventDefault();
            rf?.fitView({ padding: 0.2, duration: 300 });
            break;
          case 'l':
            e.preventDefault();
            store.autoLayout();
            break;
          case 'enter':
            e.preventDefault();
            store.runPipeline();
            break;
          default:
            break;
        }
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [reactFlowInstance, connectMenu]);

    // Tidy: reflow into dependency columns, then animate the viewport to fit.
    const onTidy = useCallback(() => {
      if (nodes.length === 0) return;
      setAnimating(true);
      autoLayout();
      requestAnimationFrame(() => {
        reactFlowInstance?.fitView({ padding: 0.2, duration: 450 });
      });
      setTimeout(() => setAnimating(false), 480);
    }, [nodes.length, autoLayout, reactFlowInstance]);

    const getInitNodeData = (nodeID, type) => {
      let nodeData = { id: nodeID, nodeType: `${type}` };
      return nodeData;
    }

    const onDrop = useCallback(
        (event) => {
          event.preventDefault();
    
          const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
          if (event?.dataTransfer?.getData('application/reactflow')) {
            const appData = JSON.parse(event.dataTransfer.getData('application/reactflow'));
            const type = appData?.nodeType;
      
            // check if the dropped element is valid
            if (typeof type === 'undefined' || !type) {
              return;
            }
      
            const position = reactFlowInstance.project({
              x: event.clientX - reactFlowBounds.left,
              y: event.clientY - reactFlowBounds.top,
            });

            const nodeID = getNodeID(type);
            const newNode = {
              id: nodeID,
              type,
              position,
              data: getInitNodeData(nodeID, type),
            };
      
            addNode(newNode);
          }
        },
        [reactFlowInstance, addNode, getNodeID]
    );

    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    // Open the context menu at the cursor, positioned within the canvas.
    const onNodeContextMenu = useCallback((event, node) => {
        event.preventDefault();
        const bounds = reactFlowWrapper.current.getBoundingClientRect();
        setMenu({
          id: node.id,
          top: event.clientY - bounds.top,
          left: event.clientX - bounds.left,
        });
    }, []);

    // Any click on the empty canvas dismisses the menus.
    const onPaneClick = useCallback(() => { setMenu(null); setConnectMenu(null); }, []);

    // Clear is destructive — confirm before wiping the whole canvas.
    const onClear = useCallback(() => {
      if (nodes.length === 0) return;
      const count = nodes.length;
      requestConfirm({
        title: 'Clear canvas?',
        message: `This removes ${count} node${count > 1 ? 's' : ''} and all connections. You can undo it afterwards.`,
        confirmLabel: 'Clear',
        tone: 'danger',
        onConfirm: clearPipeline,
      });
    }, [nodes.length, clearPipeline, requestConfirm]);

    // All canvas controls, declared once — the ControlDock renders them as a
    // draggable, reorderable panel. Run has cinematic camera built in.
    const controlItems = [
      { key: 'run', label: 'Run', title: 'Run pipeline (Ctrl/Cmd+Enter)', icon: <Zap size={14} strokeWidth={2.4} />, onClick: runPipeline, disabled: nodes.length === 0 || isRunning },
      { key: 'undo', iconOnly: true, label: 'Undo', title: 'Undo (Ctrl/Cmd+Z)', icon: <Undo2 size={15} strokeWidth={2.2} />, onClick: undo, disabled: !canUndo },
      { key: 'redo', iconOnly: true, label: 'Redo', title: 'Redo (Ctrl/Cmd+Shift+Z)', icon: <Redo2 size={15} strokeWidth={2.2} />, onClick: redo, disabled: !canRedo },
      { key: 'fit', iconOnly: true, label: 'Fit view', title: 'Fit graph to view', icon: <Maximize2 size={15} strokeWidth={2.2} />, onClick: onFit, disabled: nodes.length === 0 },
      { key: 'minimap', iconOnly: true, label: 'Toggle minimap', title: showMinimap ? 'Hide minimap' : 'Show minimap', icon: <Map size={15} strokeWidth={2.2} />, onClick: () => setShowMinimap((v) => !v), active: showMinimap },
      { key: 'tidy', label: 'Tidy', title: 'Auto-arrange (Ctrl/Cmd+L)', icon: <Wand2 size={14} strokeWidth={2.2} />, onClick: onTidy, disabled: nodes.length === 0 },
      { key: 'clear', label: 'Clear', danger: true, title: 'Remove all nodes and connections', icon: <Trash2 size={14} strokeWidth={2.2} />, onClick: onClear, disabled: nodes.length === 0 },
    ];

    return (
        <div ref={reactFlowWrapper} className={`canvas-wrapper ${animating ? 'layout-animating' : ''}`}>
            {/* Empty state indicator */}
            {nodes.length === 0 && (
              <div className="canvas-empty-state">
                <MousePointerClick size={48} className="canvas-empty-state__icon" />
                <p className="canvas-empty-state__title">Drag components here</p>
                <p className="canvas-empty-state__subtitle">Build your pipeline by dragging nodes from the dock below</p>
                <button type="button" className="canvas-empty-state__cta" onClick={onLoadSample}>
                  <Sparkles size={15} strokeWidth={2.2} />
                  Load example pipeline
                </button>
              </div>
            )}
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onInit={setReactFlowInstance}
                onNodeContextMenu={onNodeContextMenu}
                onNodeDragStart={onNodeDragStart}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                proOptions={proOptions}
                snapGrid={[gridSize, gridSize]}
                connectionLineType='smoothstep'
                deleteKeyCode={['Backspace', 'Delete']}
            >
                <Panel position="top-right">
                  <ControlDock items={controlItems} />
                </Panel>
                <Panel position="top-left">
                  <LintPanel onFocus={onFocusNode} />
                </Panel>
                <Background
                  variant="dots"
                  color="rgba(255,255,255,0.08)"
                  gap={gridSize}
                  size={1.5}
                />
                <Controls />
                {showMinimap && (
                  <MiniMap
                    pannable
                    zoomable
                    nodeColor={minimapNodeColor}
                    nodeStrokeColor={minimapNodeColor}
                    nodeStrokeWidth={3}
                    nodeBorderRadius={4}
                    maskColor="rgba(8, 11, 20, 0.72)"
                    maskStrokeColor="rgba(99, 102, 241, 0.6)"
                    maskStrokeWidth={2}
                    offsetScale={4}
                  />
                )}
            </ReactFlow>

            {menu && (
              <NodeContextMenu
                {...menu}
                onClose={() => setMenu(null)}
              />
            )}

            {/* Connect-and-create: node picker where a wire was dropped. */}
            {connectMenu && (
              <div
                className="connect-menu"
                style={{ top: connectMenu.top, left: connectMenu.left }}
              >
                <div className="connect-menu__head">Connect to…</div>
                {paletteItems.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    className={`connect-menu__item connect-menu__item--${item.category}`}
                    onClick={() => onPickConnectNode(item.type)}
                  >
                    <MiniIcon name={item.icon} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
        </div>
    )
}
