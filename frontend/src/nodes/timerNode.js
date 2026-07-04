// timerNode.js
// Timer / Delay node configuration — adds a configurable delay with optional
// repeat. Demonstrates slider and checkbox field types — pure config, no custom code.

export const timerNodeConfig = {
  type: 'timer',
  title: 'Timer',
  icon: 'Clock',
  category: 'logic',
  description: 'Add a delay before passing data through.',
  fields: [
    {
      name: 'delay',
      type: 'slider',
      label: 'Delay',
      default: 5,
      min: 0,
      max: 60,
      step: 1,
      unit: 's',
    },
    {
      name: 'repeat',
      type: 'checkbox',
      label: 'Repeat',
      default: false,
    },
  ],
  handles: [
    { type: 'target', position: 'left', id: 'input' },
    { type: 'source', position: 'right', id: 'output' },
  ],
};
