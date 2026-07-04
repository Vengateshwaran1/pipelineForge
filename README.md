# VectorShift — Frontend Technical Assessment

A visual pipeline builder: drag nodes onto a canvas, wire them together, and
analyze the graph against a FastAPI backend.

**Stack:** React 18 + ReactFlow + Zustand + Framer Motion (frontend) · Python +
FastAPI (backend).

---

## Running it

**Backend** (`http://localhost:8000`)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend** (`http://localhost:3000`)
```bash
cd frontend
npm install
npm start
```

**Tests**
```bash
cd backend && pytest        # DAG logic + endpoint
cd frontend && npm run build # type/lint clean under CI
```

---

## The four required parts

### Part 1 — Node abstraction
A single config-driven engine replaces per-node boilerplate.

| File | Role |
|------|------|
| `frontend/src/nodes/BaseNode.js` | Universal node shell — header, fields, handles, animation. Reads declarative config. |
| `frontend/src/nodes/NodeField.js` | Polymorphic field renderer (text, select, textarea, slider, checkbox, display). |
| `frontend/src/nodes/useNodeState.js` | Field state + store sync — removes per-node `useState`. |
| `frontend/src/nodes/nodeRegistry.js` | Single source of truth. Toolbar + ReactFlow `nodeTypes` derive from it. |

**Adding a node = one config file + one registry line.** No other files change:
```js
export const timerNodeConfig = {
  type: 'timer', title: 'Timer', icon: 'Clock', category: 'logic',
  fields: [{ name: 'delay', type: 'slider', label: 'Delay', min: 0, max: 60, unit: 's' }],
  handles: [
    { type: 'target', position: 'left', id: 'input' },
    { type: 'source', position: 'right', id: 'output' },
  ],
};
```

The four originals (Input, Output, LLM, Text) plus **five new demo nodes** —
API Request, Condition, Timer, Note, Data Transform — show the range: multiple
field types, branching handles, zero-handle annotations, and a `children`
escape hatch (Data Transform) for custom body content.

### Part 2 — Styling
A cohesive dark design system (`frontend/src/nodes/nodeStyles.css`): CSS token
palette, four category accent colors flowing through headers/handles/minimap,
glassmorphism cards, glowing handles, custom toggles/sliders, animated edges,
empty state, and a themed toolbar/header. Fully **responsive** (tablet/phone
breakpoints, swipeable palette).

### Part 3 — Text node logic
- **Auto-resize:** the node grows in **width** (from the longest line) and
  **height** (auto-growing textarea) as you type.
- **`{{ variable }}` handles:** typing a valid JS identifier in double braces
  sprouts a matching left input handle; deleting it removes the handle and
  prunes any now-dangling edge. Reserved words (`for`, `return`, …) are
  ignored. Powered by generic `config.getHandles(values)` / `config.getStyle(values)`
  hooks on `BaseNode` — reusable by any node.

### Part 4 — Backend integration
- **Submit** POSTs `{ nodes, edges }` to `POST /pipelines/parse`.
- Backend returns `{ num_nodes, num_edges, is_dag }` — DAG via Kahn's
  topological sort (`backend/main.py`).
- Frontend shows the result in a native `alert()` **and** a styled modal
  (loading + error states included).

---

## Keyboard shortcuts

| Keys | Action |
|------|--------|
| `Ctrl/Cmd + Z` · `⇧Z` / `Ctrl+Y` | Undo · Redo |
| `Ctrl/Cmd + A` | Select all |
| `Ctrl/Cmd + D` | Duplicate selected |
| `Ctrl/Cmd + C` / `V` | Copy / Paste |
| `Delete` / `Backspace` | Delete selected |
| `Ctrl/Cmd + =` · `-` · `0` | Zoom in · out · fit |
| `Ctrl/Cmd + L` | Tidy layout |
| `Ctrl/Cmd + Enter` | Run pipeline |
| `Ctrl/Cmd + K` | Command palette |
| `Escape` | Deselect / close menus |

---

## Notable decisions
- **Config over components:** node behavior is data, not code, so styling and
  new nodes scale without duplication.
- **DAG lives in two places on purpose:** the backend is the source of truth for
  Part 4; the frontend keeps a local topological sort only to drive the Run
  animation and Tidy layout.
- **CORS origins are explicit** (not `*`) so credentialed requests stay spec-valid.
