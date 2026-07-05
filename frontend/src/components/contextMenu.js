// contextMenu.js
// Right-click menu for a node — Duplicate / Delete.
// Positioned absolutely within the canvas wrapper by ui.js.

import { motion } from 'framer-motion';
import { Copy, Trash2 } from 'lucide-react';
import { useStore } from '../store/store';

/**
 * @param {object} props
 * @param {string} props.id - Target node id
 * @param {number} props.top - Y offset within the canvas
 * @param {number} props.left - X offset within the canvas
 * @param {() => void} props.onClose - Dismiss handler
 */
export const NodeContextMenu = ({ id, top, left, onClose }) => {
  const deleteNode = useStore((s) => s.deleteNode);
  const duplicateNode = useStore((s) => s.duplicateNode);

  const run = (fn) => () => {
    fn(id);
    onClose();
  };

  return (
    <motion.div
      className="context-menu"
      style={{ top, left }}
      initial={{ opacity: 0, scale: 0.9, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button className="context-menu__item" onClick={run(duplicateNode)}>
        <Copy size={14} />
        Duplicate
      </button>
      <div className="context-menu__divider" />
      <button
        className="context-menu__item context-menu__item--danger"
        onClick={run(deleteNode)}
      >
        <Trash2 size={14} />
        Delete
        <span className="context-menu__hint">Del</span>
      </button>
    </motion.div>
  );
};
