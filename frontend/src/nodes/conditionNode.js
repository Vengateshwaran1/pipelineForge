// conditionNode.js
// Condition (If/Else) node configuration — routes data based on a boolean
// expression. Demonstrates multiple source handles with labels for branching.

export const conditionNodeConfig = {
  type: 'condition',
  title: 'Condition',
  icon: 'GitBranch',
  category: 'logic',
  description: 'Route data based on a condition.',
  fields: [
    {
      name: 'expression',
      type: 'text',
      label: 'Expression',
      default: '',
      placeholder: 'e.g. value > 10',
    },
    {
      name: 'operator',
      type: 'select',
      label: 'Operator',
      default: 'equals',
      options: [
        { value: 'equals', label: 'Equals (==)' },
        { value: 'not_equals', label: 'Not Equals (!=)' },
        { value: 'greater', label: 'Greater Than (>)' },
        { value: 'less', label: 'Less Than (<)' },
        { value: 'contains', label: 'Contains' },
        { value: 'regex', label: 'Regex Match' },
      ],
    },
  ],
  handles: [
    { type: 'target', position: 'left', id: 'input' },
    { type: 'source', position: 'right', id: 'true', label: 'true', offset: '35%' },
    { type: 'source', position: 'right', id: 'false', label: 'false', offset: '65%' },
  ],
};
