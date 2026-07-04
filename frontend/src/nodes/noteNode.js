// noteNode.js
// Note node configuration — a sticky-note annotation with zero handles.
// Demonstrates that the abstraction gracefully handles nodes that are
// pure annotations with no connections.

export const noteNodeConfig = {
  type: 'note',
  title: 'Note',
  icon: 'StickyNote',
  category: 'utility',
  description: 'Add a comment or annotation to your pipeline.',
  fields: [
    {
      name: 'body',
      type: 'textarea',
      label: 'Note',
      default: '',
      placeholder: 'Write a note...',
      rows: 4,
    },
    {
      name: 'color',
      type: 'select',
      label: 'Color',
      default: 'default',
      options: [
        { value: 'default', label: 'Default' },
        { value: 'yellow', label: 'Yellow' },
        { value: 'green', label: 'Green' },
        { value: 'pink', label: 'Pink' },
      ],
    },
  ],
  handles: [],
};
