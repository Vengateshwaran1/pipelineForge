import { PipelineToolbar } from './toolbar.js';
import { PipelineUI } from './ui.js';
import { SubmitButton } from './submit.js';
import { CommandPalette } from './commandPalette.js';
import { useState, useEffect } from 'react';
import { ToastHost } from './toast.js';
import { ConfirmHost } from './confirm.js';
import { Workflow, Sun, Moon } from 'lucide-react';

function App() {
  // Theme: persisted, applied to <html data-theme> so CSS tokens switch.
  const [theme, setTheme] = useState(() => localStorage.getItem('pipelineforge-theme') || 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pipelineforge-theme', theme);
  }, [theme]);

  return (
    <div className="app-container">
      {/* ── Top header ────────────────────────────── */}
      <header className="app-header">
        <div className="app-header__brand">
          <div className="app-header__logo">
            <Workflow size={18} color="#fff" strokeWidth={2.2} />
          </div>
          <span className="app-header__title">
            PipelineForge
            <span className="app-header__subtitle">v1.0</span>
          </span>
        </div>
        <div className="app-header__actions">
          <kbd className="app-header__kbd">⌘K</kbd>
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle color theme"
          >
            {theme === 'dark' ? <Sun size={15} strokeWidth={2.2} /> : <Moon size={15} strokeWidth={2.2} />}
          </button>
          <SubmitButton />
        </div>
      </header>

      {/* ── Workspace: canvas + floating dock palette ── */}
      <div className="app-workspace">
        <PipelineUI />
        <PipelineToolbar />
      </div>

      {/* ── Cmd+K command palette ─────────────────── */}
      <CommandPalette />

      {/* ── Toast notifications ───────────────────── */}
      <ToastHost />

      {/* ── Confirm dialogs (Submit / Clear) ──────── */}
      <ConfirmHost />
    </div>
  );
}

export default App;
