// textNode.js
// Text node — a template string with one output.
//
// Showcase feature: any `{{variable}}` token in the text dynamically
// sprouts a matching input handle on the left. Type `{{name}}` and a
// `name` input appears; delete it and the handle disappears. The textarea
// also auto-resizes to fit its content. All driven declaratively via the
// config's `getHandles(values)` hook — no bespoke component needed.

// Matches valid JS-identifier variable names inside {{ }}.
const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z_$][\w$]*)\s*\}\}/g;

// JS reserved words — syntactically valid identifiers but illegal as variable
// names, so they don't become handles.
const RESERVED_WORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
  'default', 'delete', 'do', 'else', 'export', 'extends', 'false', 'finally',
  'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'null',
  'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof',
  'var', 'void', 'while', 'with', 'yield', 'let', 'static', 'enum', 'await',
  'implements', 'package', 'protected', 'interface', 'private', 'public',
]);

/**
 * Extracts unique, valid variable names from a template string.
 * Rejects JS reserved words. Order-preserving, deduplicated.
 * @param {string} text
 * @returns {string[]}
 */
function extractVariables(text) {
  const found = [...String(text || '').matchAll(VARIABLE_PATTERN)].map((m) => m[1]);
  return [...new Set(found)].filter((name) => !RESERVED_WORDS.has(name));
}

// Node width bounds (px) and the approximate width of one monospace char
// at the textarea's font size. Width grows with the longest line, height
// grows via the auto-resizing textarea (NodeField).
const MIN_WIDTH = 260;
const MAX_WIDTH = 560;
const CHAR_PX = 7.2;
const CHROME_PX = 56; // node + field horizontal padding

// Vertical layout for the dynamic {{variable}} input pills on the left edge.
// Each pill gets an explicit px offset from the top so it clears the header and
// the pills stay evenly spaced regardless of count (a percentage spread would
// crowd the header and compress as variables grow). The node's minHeight grows
// to match so the pills always sit in the body, aligned in a neat column.
const HEADER_PX = 52; // header height — first pill sits just below it
const ROW_PX = 32;    // vertical spacing between adjacent input pills
const BOTTOM_PX = 16; // breathing room below the last pill

/**
 * Computes the node's minimum height so N input pills fit in an even column
 * below the header. Returns 0 when there are no inputs (natural height).
 * @param {number} count - number of {{variable}} input handles
 * @returns {number} min height in px
 */
function heightForInputs(count) {
  return count > 0 ? HEADER_PX + count * ROW_PX + BOTTOM_PX : 0;
}

/**
 * Computes node width from the longest line in the text.
 * @param {string} text
 * @returns {number} clamped width in px
 */
function widthForText(text) {
  const lines = String(text || '').split('\n');
  const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(longest * CHAR_PX + CHROME_PX)));
}

export const textNodeConfig = {
  type: 'text',
  resizable: false, // auto-sizes to fit content instead
  title: 'Text',
  icon: 'Type',
  category: 'utility',
  fields: [
    {
      name: 'text',
      type: 'textarea',
      label: 'Text',
      default: '{{input}}',
      placeholder: 'Type text. Use {{variable}} to create inputs...',
      rows: 2,
      autoResize: true,
    },
  ],
  // Width follows the longest line; height grows to fit the input pill column
  // (whichever is taller — the textarea or the pills — wins). Setting maxWidth
  // inline overrides the fixed cap in the stylesheet.
  getStyle: (values) => {
    const width = widthForText(values.text);
    const minHeight = heightForInputs(extractVariables(values.text).length);
    return { width, maxWidth: width, minHeight };
  },
  // Dynamic handles: one input per unique {{variable}}, plus the output. Each
  // input pill gets an explicit top offset so the column stays evenly spaced
  // and clears the header no matter how many variables are added.
  getHandles: (values) => {
    const inputs = extractVariables(values.text).map((name, i) => ({
      type: 'target',
      position: 'left',
      id: `var-${name}`,
      label: name,
      offset: `${HEADER_PX + i * ROW_PX + ROW_PX / 2}px`,
    }));
    return [...inputs, { type: 'source', position: 'right', id: 'output' }];
  },
};
