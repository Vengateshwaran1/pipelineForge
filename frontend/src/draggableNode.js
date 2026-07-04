// draggableNode.js
// A dock chip representing a draggable node type — an icon-only "logo" tile in
// the node's category color. Dragging it onto the canvas creates the node;
// dragging it over another chip reorders the palette (see toolbar.js). The name
// shows as a tooltip on hover.

import * as LucideIcons from 'lucide-react';

export const DraggableNode = ({ type, label, icon, category, onReorderStart, onReorderOver, onReorderEnd }) => {
    const onDragStart = (event, nodeType) => {
      const appData = { nodeType };
      event.target.style.cursor = 'grabbing';
      event.dataTransfer.setData('application/reactflow', JSON.stringify(appData));
      event.dataTransfer.effectAllowed = 'move';
      onReorderStart?.(nodeType);
    };

    const IconComponent = icon ? (LucideIcons[icon] || null) : null;
    const categoryClass = category ? `dock-chip--${category}` : '';

    return (
      <div
        className={`dock-chip dock-chip--icon-only ${categoryClass}`}
        onDragStart={(event) => onDragStart(event, type)}
        onDragEnd={(event) => { event.target.style.cursor = 'grab'; onReorderEnd?.(); }}
        onDragOver={(event) => { event.preventDefault(); onReorderOver?.(type); }}
        draggable
        tabIndex={0}
        aria-label={label}
      >
          <span className="dock-chip__name">{label}</span>
          {IconComponent && (
            <IconComponent className="dock-chip__logo" size={26} strokeWidth={1.8} />
          )}
      </div>
    );
  };
