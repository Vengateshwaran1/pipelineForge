// llmNode.js
// LLM node configuration — represents a language model with system/prompt
// inputs and a response output.

export const llmNodeConfig = {
  type: 'llm',
  title: 'LLM',
  icon: 'Brain',
  category: 'processing',
  fields: [
    {
      name: 'model',
      type: 'select',
      label: 'Model',
      default: 'gpt-4o',
      options: [
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'claude-3-5', label: 'Claude 3.5 Sonnet' },
        { value: 'llama-3', label: 'Llama 3' },
      ],
    },
    {
      name: 'system',
      type: 'textarea',
      label: 'System',
      placeholder: 'System instructions…',
      rows: 2,
    },
    {
      name: 'prompt',
      type: 'textarea',
      label: 'Prompt',
      placeholder: 'User prompt…',
      required: true,
      rows: 2,
    },
    {
      name: 'temperature',
      type: 'slider',
      label: 'Temperature',
      default: 0.7,
      min: 0,
      max: 1,
      step: 0.1,
    },
  ],
  handles: [
    // One input (system/prompt are now fields), one response output.
    { type: 'target', position: 'left', id: 'input' },
    { type: 'source', position: 'right', id: 'response' },
  ],
};
