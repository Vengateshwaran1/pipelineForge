// inputNode.js
// Input node configuration — defines a pipeline input with name and type fields.

export const inputNodeConfig = {
  type: 'customInput',
  title: 'Input',
  icon: 'Download',
  category: 'io',
  fields: [
    {
      name: 'inputName',
      type: 'text',
      label: 'Name',
      defaultValueFn: (id) => id.replace('customInput-', 'input_'),
      placeholder: 'Enter input name...',
    },
    {
      name: 'inputType',
      type: 'select',
      label: 'Type',
      default: 'Text',
      options: [
        { value: 'Text', label: 'Text' },
        { value: 'File', label: 'File' },
      ],
    },
  ],
  handles: [
    { type: 'source', position: 'right', id: 'value' },
  ],
};
