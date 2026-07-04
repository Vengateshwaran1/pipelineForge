// NodeField.js
// Polymorphic field renderer — switches on field.type to render the appropriate
// form control. Each field is fully controlled via the useNodeState hook.

import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Custom themed dropdown — replaces the native <select> so the option list
 * matches the app theme (native option lists can't be styled cross-browser).
 */
function CustomSelect({ field, value, onChange, invalid }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const options = field.options || [];
  const current =
    options.find((o) => o.value === value) ||
    options.find((o) => o.value === field.default) ||
    options[0];

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    // Capture Escape here (and stop it) so it closes the menu without the
    // canvas's global handler also clearing the node selection.
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <div className={`node-select nodrag ${open ? 'is-open' : ''}`} ref={ref}>
      <button
        type="button"
        className={`node-select__trigger${invalid ? ' node-field__control--invalid' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="node-select__value">{current?.label ?? 'Select…'}</span>
        <ChevronDown size={14} className="node-select__chevron" strokeWidth={2.2} />
      </button>
      {open && (
        <div className="node-select__menu nowheel">
          {options.map((o) => (
            <button
              type="button"
              key={o.value}
              className={`node-select__option${o.value === value ? ' is-selected' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              <span>{o.label}</span>
              {o.value === value && <Check size={13} strokeWidth={2.6} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Textarea that grows its height to fit content. Uses useLayoutEffect so
 * height is recomputed after every render — including when the node's width
 * changes and the text rewraps — avoiding a stale one-keystroke lag.
 */
function AutoTextarea({ field, value, onChange, autoResize, invalidClass = '' }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (!autoResize || !ref.current) return;
    const el = ref.current;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value, autoResize]);

  return (
    <textarea
      ref={ref}
      className={`node-field__textarea nodrag nowheel${invalidClass}`}
      value={value ?? ''}
      onChange={onChange}
      placeholder={field.placeholder || ''}
      rows={field.rows || 3}
    />
  );
}

/**
 * @typedef {object} FieldConfig
 * @property {string} name - Field key in node data
 * @property {'text'|'select'|'textarea'|'slider'|'checkbox'|'display'} type - Field type
 * @property {string} label - Display label
 * @property {string} [placeholder] - Placeholder text (text/textarea)
 * @property {Array<{value: string, label: string}>} [options] - Options for select
 * @property {number} [min] - Minimum value (slider)
 * @property {number} [max] - Maximum value (slider)
 * @property {number} [step] - Step increment (slider)
 * @property {number} [rows] - Number of rows (textarea)
 */

/**
 * Renders a single node field based on its config type.
 *
 * @param {{ field: FieldConfig, value: any, onChange: (value: any) => void }} props
 */
export function NodeField({ field, value, onChange }) {
  const handleChange = (e) => {
    const newValue =
      field.type === 'checkbox' ? e.target.checked : e.target.value;
    onChange(newValue);
  };

  // A required text/select/textarea field with no value is flagged invalid.
  const invalid = field.required && (value == null || value === '');
  const invalidClass = invalid ? ' node-field__control--invalid' : '';

  switch (field.type) {
    case 'text':
      return (
        <div className="node-field">
          <label className="node-field__label">
            {field.label}
            {field.required && <span className="node-field__req">*</span>}
          </label>
          <input
            className={`node-field__input nodrag${invalidClass}`}
            type="text"
            value={value ?? ''}
            onChange={handleChange}
            placeholder={field.placeholder || ''}
          />
          {invalid && <span className="node-field__error">{field.label} is required</span>}
        </div>
      );

    case 'select':
      return (
        <div className="node-field">
          <label className="node-field__label">
            {field.label}
            {field.required && <span className="node-field__req">*</span>}
          </label>
          <CustomSelect field={field} value={value} onChange={onChange} invalid={invalid} />
        </div>
      );

    case 'textarea':
      return (
        <div className="node-field">
          <label className="node-field__label">
            {field.label}
            {field.required && <span className="node-field__req">*</span>}
          </label>
          <AutoTextarea
            field={field}
            value={value}
            onChange={handleChange}
            autoResize={field.autoResize}
            invalidClass={invalidClass}
          />
          {invalid && <span className="node-field__error">{field.label} is required</span>}
        </div>
      );

    case 'slider':
      return (
        <div className="node-field">
          <label className="node-field__label">
            {field.label}
            <span className="node-field__slider-value">
              {value ?? field.min ?? 0}
              {field.unit ? ` ${field.unit}` : ''}
            </span>
          </label>
          <input
            className="node-field__slider nodrag"
            type="range"
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.step ?? 1}
            value={value ?? field.min ?? 0}
            onChange={handleChange}
          />
        </div>
      );

    case 'checkbox':
      return (
        <div className="node-field node-field--checkbox">
          <button
            type="button"
            className="node-field__checkbox-label nodrag"
            onClick={() => onChange(!value)}
            aria-pressed={!!value}
          >
            <span className={`node-field__toggle ${value ? 'node-field__toggle--active' : ''}`}>
              <span className="node-field__toggle-thumb" />
            </span>
            <span>{field.label}</span>
          </button>
        </div>
      );

    case 'display':
      return (
        <div className="node-field">
          <p className="node-field__display">
            {field.content || value || ''}
          </p>
        </div>
      );

    default:
      return null;
  }
}
