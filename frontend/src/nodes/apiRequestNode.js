// apiRequestNode.js
// API Request node configuration — configures an HTTP call with method,
// URL, and headers. Demonstrates mixing multiple field types in one config.

export const apiRequestNodeConfig = {
  type: 'apiRequest',
  title: 'API Request',
  icon: 'Globe',
  category: 'processing',
  description: 'Make an HTTP request to an external API.',
  fields: [
    {
      name: 'method',
      type: 'select',
      label: 'Method',
      default: 'GET',
      options: [
        { value: 'GET', label: 'GET' },
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'DELETE', label: 'DELETE' },
        { value: 'PATCH', label: 'PATCH' },
      ],
    },
    {
      name: 'url',
      type: 'text',
      label: 'URL',
      default: '',
      required: true,
      placeholder: 'https://api.example.com/...',
    },
    {
      name: 'headers',
      type: 'textarea',
      label: 'Headers (JSON)',
      default: '{}',
      placeholder: '{"Authorization": "Bearer ..."}',
      rows: 3,
    },
  ],
  handles: [
    { type: 'target', position: 'left', id: 'trigger' },
    { type: 'source', position: 'right', id: 'response' },
  ],
};
