// submit.js
// Backend-integrated pipeline analyzer.
//
// The Analyze button asks for confirmation, then POSTs the current nodes +
// edges to the FastAPI backend (`POST /pipelines/parse`), which returns
// { num_nodes, num_edges, is_dag }. The result is shown in a styled modal —
// no native alert.

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Play, CheckCircle2, XCircle, Boxes, Spline, X, Zap, Loader2, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/store';
import { shallow } from 'zustand/shallow';
import { Confetti } from '../components/Confetti';
import { nodeConfigs } from '../nodes/nodeRegistry';

const API_BASE = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '');

const selector = (state) => ({ nodes: state.nodes, edges: state.edges });

/**
 * RunFlowButton — triggers the live topological execution animation.
 * Nodes light up one-by-one in dependency order (see store.runPipeline).
 */
export const RunFlowButton = () => {
  const runPipeline = useStore((s) => s.runPipeline);
  const isRunning = useStore((s) => s.activeNodeId !== null);
  const hasNodes = useStore((s) => s.nodes.length > 0);

  return (
    <button
      className="run-flow__button"
      type="button"
      onClick={runPipeline}
      disabled={isRunning || !hasNodes}
      title="Simulate execution in dependency order"
    >
      <Zap size={14} strokeWidth={2.5} />
      {isRunning ? 'Running…' : 'Run'}
    </button>
  );
};

export const SubmitButton = () => {
  const { nodes, edges } = useStore(selector, shallow);
  const requestConfirm = useStore((s) => s.requestConfirm);
  // result shape: null | {loading} | {error} | {numNodes, numEdges, isDag}
  const [result, setResult] = useState(null);

  // The actual backend call — runs only after the user confirms.
  const runAnalysis = useCallback(async () => {
    setResult({ loading: true });
    try {
      const response = await fetch(`${API_BASE}/pipelines/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges }),
      });
      if (!response.ok) {
        throw new Error(`Server responded ${response.status}`);
      }
      const data = await response.json();
      setResult({
        numNodes: data.num_nodes,
        numEdges: data.num_edges,
        isDag: data.is_dag,
      });
    } catch (err) {
      setResult({ error: err.message || 'Could not reach the backend' });
    }
  }, [nodes, edges]);

  // Ask for confirmation first, then analyze. Warn if required fields are empty.
  const handleSubmit = useCallback(() => {
    let missing = 0;
    for (const n of nodes) {
      for (const f of nodeConfigs[n.type]?.fields || []) {
        if (f.required) {
          const v = n.data?.[f.name];
          if (v == null || v === '') missing += 1;
        }
      }
    }
    requestConfirm({
      title: missing ? 'Missing required fields' : 'Analyze pipeline?',
      message: missing
        ? `${missing} required field${missing > 1 ? 's are' : ' is'} empty. Analyze the pipeline anyway?`
        : `Send ${nodes.length} node${nodes.length === 1 ? '' : 's'} and ${edges.length} edge${edges.length === 1 ? '' : 's'} to the backend for analysis.`,
      confirmLabel: 'Analyze',
      tone: missing ? 'danger' : undefined,
      onConfirm: runAnalysis,
    });
  }, [requestConfirm, nodes, edges.length, runAnalysis]);

  const close = useCallback(() => setResult(null), []);

  return (
    <>
      <div className="submit-bar">
        <button
          className="submit-bar__button"
          type="button"
          onClick={handleSubmit}
          disabled={result?.loading || nodes.length === 0}
          title={nodes.length === 0 ? 'Add at least one node first' : 'Analyze the pipeline'}
        >
          {result?.loading
            ? <Loader2 size={14} strokeWidth={2.5} className="submit-bar__spinner" />
            : <Play size={14} strokeWidth={2.5} />}
          {result?.loading ? 'Submitting…' : 'Submit'}
        </button>
      </div>

      {createPortal(
        <AnimatePresence>
        {result && !result.loading && (
          <motion.div
            className="result-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          >
            {!result.error && result.isDag && <Confetti />}
            <motion.div
              className="result-panel"
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="result-panel__close" onClick={close} aria-label="Close">
                <X size={16} />
              </button>

              {result.error ? (
                <div className="result-error">
                  <span className="result-error__icon"><AlertTriangle size={22} /></span>
                  <h2 className="result-panel__title">Couldn’t analyze pipeline</h2>
                  <p className="result-panel__subtitle">{result.error}</p>
                  <p className="result-error__hint">
                    Start the backend: <code>uvicorn main:app --reload</code> in <code>/backend</code>
                  </p>
                </div>
              ) : (
                <>
                  {result.isDag && (
                    <div className="result-success">🎉 Pipeline created successfully!</div>
                  )}
                  <h2 className="result-panel__title">Pipeline Analysis</h2>
                  <p className="result-panel__subtitle">Returned by the backend</p>

                  <div className="result-panel__stats">
                    <div className="result-stat">
                      <span className="result-stat__icon result-stat__icon--nodes">
                        <Boxes size={18} />
                      </span>
                      <span className="result-stat__value">{result.numNodes}</span>
                      <span className="result-stat__label">Nodes</span>
                    </div>
                    <div className="result-stat">
                      <span className="result-stat__icon result-stat__icon--edges">
                        <Spline size={18} />
                      </span>
                      <span className="result-stat__value">{result.numEdges}</span>
                      <span className="result-stat__label">Edges</span>
                    </div>
                  </div>

                  <div className={`result-dag result-dag--${result.isDag ? 'valid' : 'invalid'}`}>
                    {result.isDag ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                    <div className="result-dag__text">
                      <strong>{result.isDag ? 'Valid DAG' : 'Contains a cycle'}</strong>
                      <span>
                        {result.isDag
                          ? 'This pipeline is a directed acyclic graph and can execute.'
                          : 'Remove the cycle so the pipeline can run end to end.'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};
