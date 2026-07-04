// graph.js
// Pure graph helpers shared by the analyzer (submit.js) and the live
// execution simulation (store.js). No React, no side effects.

import dagre from '@dagrejs/dagre';

/**
 * Determines whether the directed graph is acyclic.
 * 3-colour iterative DFS: WHITE = unvisited, GRAY = on current path,
 * BLACK = fully explored. A GRAY neighbour is a back-edge → cycle.
 *
 * @param {Array<{id: string}>} nodes
 * @param {Array<{source: string, target: string}>} edges
 * @returns {boolean} true if the graph is a DAG
 */
export function isDAG(nodes, edges) {
  const adjacency = buildAdjacency(nodes, edges);
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map([...adjacency.keys()].map((id) => [id, WHITE]));

  const hasCycleFrom = (start) => {
    const stack = [[start, 0]];
    color.set(start, GRAY);
    while (stack.length) {
      const frame = stack[stack.length - 1];
      const neighbors = adjacency.get(frame[0]) || [];
      if (frame[1] < neighbors.length) {
        const next = neighbors[frame[1]];
        frame[1] += 1;
        const c = color.get(next);
        if (c === GRAY) return true;
        if (c === WHITE) {
          color.set(next, GRAY);
          stack.push([next, 0]);
        }
      } else {
        color.set(frame[0], BLACK);
        stack.pop();
      }
    }
    return false;
  };

  for (const id of adjacency.keys()) {
    if (color.get(id) === WHITE && hasCycleFrom(id)) return false;
  }
  return true;
}

/**
 * Kahn's algorithm — returns node ids in a valid execution order.
 * If the graph has a cycle, the returned order is shorter than `nodes`
 * (cyclic nodes are omitted), which the caller can detect.
 *
 * @param {Array<{id: string}>} nodes
 * @param {Array<{source: string, target: string}>} edges
 * @returns {string[]} topologically ordered node ids
 */
export function topologicalOrder(nodes, edges) {
  const adjacency = buildAdjacency(nodes, edges);
  const indegree = new Map(nodes.map((n) => [n.id, 0]));
  for (const edge of edges) {
    if (indegree.has(edge.target)) {
      indegree.set(edge.target, indegree.get(edge.target) + 1);
    }
  }

  const queue = [...indegree.keys()].filter((id) => indegree.get(id) === 0);
  const order = [];
  while (queue.length) {
    const node = queue.shift();
    order.push(node);
    for (const next of adjacency.get(node) || []) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  return order;
}

// Fallback dimensions when a node hasn't been measured by ReactFlow yet.
const DEFAULT_NODE_WIDTH = 280;
const DEFAULT_NODE_HEIGHT = 140;

/**
 * Computes a premium graph layout using dagre (the layout engine ReactFlow
 * recommends). Unlike a naive layerer, dagre minimises edge crossings, centres
 * parents over their children, and spaces ranks using each node's real
 * measured size — so the result reads like a hand-arranged diagram.
 *
 * Left-to-right ('LR') matches our left-input / right-output handle layout.
 * dagre breaks cycles internally, so cyclic graphs lay out cleanly too.
 *
 * @param {Array<{id: string, width?: number, height?: number}>} nodes
 * @param {Array<{source: string, target: string}>} edges
 * @param {'LR'|'TB'} [direction='LR']
 * @returns {Record<string, {x: number, y: number}>} id → top-left position
 */
export function computeLayout(nodes, edges, direction = 'LR') {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    ranksep: 130,   // gap between dependency columns
    nodesep: 55,    // gap between siblings in a column
    edgesep: 20,
    marginx: 30,
    marginy: 30,
  });

  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const node of nodes) {
    g.setNode(node.id, {
      width: node.width || DEFAULT_NODE_WIDTH,
      height: node.height || DEFAULT_NODE_HEIGHT,
    });
  }
  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  // dagre returns node centres; ReactFlow positions are top-left corners.
  const positions = {};
  for (const node of nodes) {
    const laidOut = g.node(node.id);
    if (!laidOut) continue;
    const w = node.width || DEFAULT_NODE_WIDTH;
    const h = node.height || DEFAULT_NODE_HEIGHT;
    positions[node.id] = {
      x: laidOut.x - w / 2,
      y: laidOut.y - h / 2,
    };
  }
  return positions;
}

/**
 * Builds a source → [targets] adjacency map, seeded with every node id
 * so isolated nodes are still present as keys.
 */
function buildAdjacency(nodes, edges) {
  const adjacency = new Map(nodes.map((n) => [n.id, []]));
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, []);
    adjacency.get(edge.source).push(edge.target);
  }
  return adjacency;
}
