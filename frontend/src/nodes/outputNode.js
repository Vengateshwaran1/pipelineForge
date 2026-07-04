// outputNode.js
// Output node configuration — defines a pipeline output with name and type fields.

export const outputNodeConfig = {
  type: 'customOutput',
  title: 'Output',
  icon: 'Upload',
  category: 'io',
  fields: [
    {
      name: 'outputName',
      type: 'text',
      label: 'Name',
      defaultValueFn: (id) => id.replace('customOutput-', 'output_'),
      placeholder: 'Enter output name...',
    },
    {
      name: 'outputType',
      type: 'select',
      label: 'Type',
      default: 'Text',
      options: [
        { value: 'Text', label: 'Text' },
        { value: 'Image', label: 'Image' },
      ],
    },
  ],
  handles: [
    { type: 'target', position: 'left', id: 'value' },
  ],
};
