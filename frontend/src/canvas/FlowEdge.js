// FlowEdge.js
// Custom smoothstep edge that reveals a delete (✕) button at its midpoint on
// hover. The button lives in a <foreignObject> INSIDE the edge's <g>, so a
// plain CSS `.react-flow__edge:hover` rule can toggle it — and because the
// button is a descendant of the edge, moving the cursor onto it keeps the edge
// hovered (no flicker gap).

import { BaseEdge, getSmoothStepPath } from 'reactflow';
import { X } from 'lucide-react';
import { useStore } from '../store/store';

export function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
}) {
  const deleteEdge = useStore((s) => s.deleteEdge);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      {/* No markerEnd — arrows intentionally removed; direction is shown by the
          flowing orbs below. */}
      <BaseEdge id={id} path={edgePath} style={style} />

      {/* Light orbs stream along the edge (source → target) — the signature
          "flowing conduit" look. Staggered begins make a continuous trail. */}
      {[0, 0.6, 1.2].map((begin, i) => (
        <circle key={i} className="edge-flow-dot" r={i === 0 ? 3.2 : 2.3}>
          <animateMotion dur="1.8s" begin={`${begin}s`} repeatCount="indefinite" calcMode="linear">
            <mpath href={`#${id}`} />
          </animateMotion>
        </circle>
      ))}

      <foreignObject
        className="edge-delete-fo"
        width={24}
        height={24}
        x={labelX - 12}
        y={labelY - 12}
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <button
          type="button"
          className="edge-delete-btn nodrag nopan"
          title="Delete connection"
          aria-label="Delete connection"
          onClick={(event) => {
            event.stopPropagation();
            deleteEdge(id);
          }}
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      </foreignObject>
    </>
  );
}
