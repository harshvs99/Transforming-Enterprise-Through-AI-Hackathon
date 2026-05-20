"use client";

import { useState, useEffect, useCallback } from "react";
import { executeQuery } from "@/lib/apiCache";

// ── Types ──────────────────────────────────────────────────────────────────

interface SubHypothesis {
  id: string;
  title: string;
  description: string;
  requires_new_tool: boolean;
  proposed_tool_name?: string | null;
}

type HypothesisStatus = "idle" | "running" | "done" | "error";

interface Hypothesis {
  id: string;
  question: string;
  title: string;
  notes: string;
  status: HypothesisStatus;
  confidence: number;
  createdAt: string;
  lastRunAt?: string;
  tier?: number;
  answer?: string;
  findings?: string;
  subHypotheses?: SubHypothesis[];
  executions?: any[];
  error?: string;
}

// ── Persistence ────────────────────────────────────────────────────────────

const STORAGE_KEY = "hypothesis_lab_v1";

function load(): Hypothesis[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function save(items: Hypothesis[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ── Helpers ────────────────────────────────────────────────────────────────

function deriveTitle(question: string): string {
  const q = question.trim();
  if (q.length <= 48) return q;
  return q.slice(0, 45) + "…";
}

function confidenceFromResult(result: any): number {
  if (!result) return 70;
  if (result.tier === 1) return 98;
  if (result.tier === 2) return 85;
  return 68; // Tier 3 investigation — speculative
}

function statusColor(status: HypothesisStatus) {
  if (status === "running") return "text-blue-600 bg-blue-50 border-blue-400";
  if (status === "done") return "text-green-700 bg-green-50 border-green-500";
  if (status === "error") return "text-red-600 bg-red-50 border-red-500";
  return "text-on-surface-variant bg-surface border-primary";
}

function statusLabel(status: HypothesisStatus) {
  if (status === "running") return "Running";
  if (status === "done") return "Active";
  if (status === "error") return "Error";
  return "Pending";
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="w-full h-2 bg-primary-fixed mt-2">
      <div
        className="h-full bg-tertiary transition-all duration-700"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function SubHypothesisCard({ h }: { h: SubHypothesis }) {
  return (
    <div className="border-2 border-primary p-4 bg-white space-y-1">
      <div className="flex items-start justify-between gap-2">
        <p className="font-headline font-bold uppercase text-sm text-primary">{h.title}</p>
        {h.requires_new_tool && (
          <span className="text-[10px] font-headline font-bold uppercase bg-secondary text-white px-2 py-0.5 whitespace-nowrap">
            Needs Tool
          </span>
        )}
      </div>
      <p className="text-xs font-body text-on-surface-variant leading-relaxed">{h.description}</p>
      {h.proposed_tool_name && (
        <p className="text-[10px] font-mono text-tertiary">→ {h.proposed_tool_name}</p>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function HypothesisLabPage() {
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => { setHypotheses(load()); }, []);

  const persist = useCallback((items: Hypothesis[]) => {
    setHypotheses(items);
    save(items);
  }, []);

  // ── Create ──────────────────────────────────────────────────────────────

  const createHypothesis = () => {
    if (!newQuestion.trim()) return;
    const h: Hypothesis = {
      id: Date.now().toString(),
      question: newQuestion.trim(),
      title: newTitle.trim() || deriveTitle(newQuestion.trim()),
      notes: "",
      status: "idle",
      confidence: 70,
      createdAt: new Date().toISOString(),
    };
    persist([h, ...hypotheses]);
    setNewQuestion("");
    setNewTitle("");
    setShowNew(false);
  };

  // ── Run ─────────────────────────────────────────────────────────────────

  const runHypothesis = async (id: string) => {
    const current = hypotheses.find((h) => h.id === id);
    if (!current) return;

    // Mark running
    persist(
      hypotheses.map((h) =>
        h.id === id ? { ...h, status: "running", error: undefined } : h
      )
    );

    try {
      const result = await executeQuery(current.question);
      persist(
        hypotheses.map((h) => {
          if (h.id !== id) return h;
          return {
            ...h,
            status: "done",
            confidence: confidenceFromResult(result),
            tier: result.tier,
            answer: result.answer,
            findings: result.investigation_mode ? result.answer : undefined,
            subHypotheses: result.hypotheses ?? undefined,
            executions: result.executions ?? undefined,
            lastRunAt: new Date().toISOString(),
          };
        })
      );
      setExpanded(id);
    } catch (err: any) {
      persist(
        hypotheses.map((h) =>
          h.id === id
            ? {
                ...h,
                status: "error",
                error: err?.message || "Backend unreachable",
                lastRunAt: new Date().toISOString(),
              }
            : h
        )
      );
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────

  const deleteHypothesis = (id: string) => {
    persist(hypotheses.filter((h) => h.id !== id));
    if (expanded === id) setExpanded(null);
    if (editing === id) setEditing(null);
  };

  // ── Edit ────────────────────────────────────────────────────────────────

  const startEdit = (h: Hypothesis) => {
    setEditing(h.id);
    setEditQuestion(h.question);
    setEditNotes(h.notes);
  };

  const saveEdit = (id: string) => {
    persist(
      hypotheses.map((h) =>
        h.id === id
          ? {
              ...h,
              question: editQuestion.trim() || h.question,
              title: newTitle.trim() || deriveTitle(editQuestion.trim() || h.question),
              notes: editNotes,
            }
          : h
      )
    );
    setEditing(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="bg-background min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-background border-b-4 border-primary px-6 lg:px-10 py-4 sticky top-0 z-40">
        <h1 className="font-headline font-black text-2xl uppercase tracking-tighter text-primary">
          Hypothesis Lab
        </h1>
        <p className="font-headline font-bold text-xs uppercase text-on-surface-variant mt-1">
          Create, run, and refine analytical hypotheses
        </p>
      </header>

      <div className="flex-1 p-6 lg:p-10 space-y-6 max-w-4xl">

        {/* New Hypothesis Button / Form */}
        {!showNew ? (
          <button
            onClick={() => setShowNew(true)}
            className="w-full bg-primary text-white border-4 border-primary p-5 font-headline font-black uppercase neo-shadow hover:neo-shadow-active active:neo-shadow-active transition-all"
          >
            + New Hypothesis
          </button>
        ) : (
          <div className="border-4 border-primary p-6 bg-white neo-shadow space-y-4">
            <h2 className="font-headline font-black uppercase text-primary text-lg">New Hypothesis</h2>

            <div>
              <label className="block text-[10px] font-headline font-bold uppercase text-on-surface-variant mb-1">
                Question / Hypothesis
              </label>
              <textarea
                autoFocus
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                onKeyDown={(e) => e.ctrlKey && e.key === "Enter" && createHypothesis()}
                placeholder="e.g. Why did CAC spike in October? What drives churn in the SMB segment?"
                className="w-full border-4 border-primary p-4 font-body text-base focus:outline-none min-h-28 resize-none bg-surface"
              />
              <p className="text-[10px] font-mono text-on-surface-variant mt-1">Ctrl+Enter to save</p>
            </div>

            <div>
              <label className="block text-[10px] font-headline font-bold uppercase text-on-surface-variant mb-1">
                Title (optional)
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Short label for this hypothesis"
                className="w-full border-4 border-primary p-3 font-body text-sm focus:outline-none bg-surface"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={createHypothesis}
                disabled={!newQuestion.trim()}
                className="flex-1 bg-primary text-white border-4 border-primary p-3 font-headline font-black uppercase disabled:opacity-40 neo-shadow hover:neo-shadow-active transition-all"
              >
                Save Hypothesis
              </button>
              <button
                onClick={() => { setShowNew(false); setNewQuestion(""); setNewTitle(""); }}
                className="border-4 border-primary px-6 py-3 font-headline font-bold uppercase hover:bg-surface transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {hypotheses.length === 0 && (
          <div className="border-4 border-dashed border-primary p-12 text-center">
            <span className="material-symbols-outlined text-7xl text-primary block mb-4 opacity-30">
              science
            </span>
            <h2 className="font-headline font-black text-2xl uppercase tracking-tighter text-primary mb-2">
              No Hypotheses Yet
            </h2>
            <p className="font-headline font-bold text-sm uppercase text-on-surface-variant">
              Create your first hypothesis to start experimenting
            </p>
          </div>
        )}

        {/* Hypothesis List */}
        <div className="space-y-4">
          {hypotheses.map((h) => {
            const isExpanded = expanded === h.id;
            const isEditing = editing === h.id;
            const isRunning = h.status === "running";

            return (
              <div key={h.id} className="border-4 border-primary bg-white neo-shadow">
                {/* Card Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <textarea
                          value={editQuestion}
                          onChange={(e) => setEditQuestion(e.target.value)}
                          className="w-full border-2 border-primary p-2 font-body text-sm focus:outline-none bg-surface min-h-20 resize-none"
                        />
                      ) : (
                        <>
                          <h3 className="font-headline font-bold uppercase text-base text-primary break-words">
                            {h.title}
                          </h3>
                          <p className="text-xs font-mono text-on-surface-variant mt-1 break-words line-clamp-2">
                            {h.question}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Confidence Badge */}
                    <div className="text-right shrink-0">
                      {isRunning ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-block w-6 h-6 border-2 border-primary border-t-transparent loading-spinner" />
                          <p className="text-[10px] font-headline uppercase text-on-surface-variant">Analyzing</p>
                        </div>
                      ) : h.status === "done" ? (
                        <>
                          <div className="text-3xl font-headline font-black text-primary">{h.confidence}%</div>
                          <p className="text-[10px] font-headline uppercase text-on-surface-variant">Confidence</p>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Status + Tier */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[10px] font-headline font-bold uppercase border px-2 py-0.5 ${statusColor(h.status)}`}>
                      {statusLabel(h.status)}
                    </span>
                    {h.tier && (
                      <span className="text-[10px] font-headline uppercase text-on-surface-variant border border-primary px-2 py-0.5">
                        Tier {h.tier} — {h.tier === 1 ? "Lookup" : h.tier === 2 ? "Analysis" : "Investigation"}
                      </span>
                    )}
                    {h.lastRunAt && (
                      <span className="text-[10px] font-mono text-on-surface-variant">
                        {new Date(h.lastRunAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  {/* Confidence bar */}
                  {h.status === "done" && <ConfidenceBar value={h.confidence} />}

                  {/* Error */}
                  {h.status === "error" && h.error && (
                    <p className="text-xs font-mono text-red-600 mt-2 p-2 bg-red-50 border border-red-300">
                      {h.error}
                    </p>
                  )}

                  {/* Notes (edit mode) */}
                  {isEditing && (
                    <div className="mt-3">
                      <label className="block text-[10px] font-headline font-bold uppercase text-on-surface-variant mb-1">
                        Notes
                      </label>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Add research notes…"
                        className="w-full border-2 border-primary p-2 font-body text-xs focus:outline-none bg-surface min-h-16 resize-none"
                      />
                    </div>
                  )}

                  {/* Notes display */}
                  {!isEditing && h.notes && (
                    <p className="text-xs font-body text-on-surface-variant mt-2 italic border-l-2 border-tertiary pl-2">
                      {h.notes}
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => saveEdit(h.id)}
                          className="bg-primary text-white border-2 border-primary px-4 py-2 font-headline font-bold uppercase text-xs neo-shadow hover:neo-shadow-active transition-all"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="border-2 border-primary px-4 py-2 font-headline font-bold uppercase text-xs hover:bg-surface transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => runHypothesis(h.id)}
                          disabled={isRunning}
                          className="bg-primary text-white border-2 border-primary px-4 py-2 font-headline font-bold uppercase text-xs disabled:opacity-40 neo-shadow hover:neo-shadow-active transition-all"
                        >
                          {h.status === "done" ? "Re-Run" : "Run"}
                        </button>
                        {h.status === "done" && (
                          <button
                            onClick={() => setExpanded(isExpanded ? null : h.id)}
                            className="border-2 border-primary px-4 py-2 font-headline font-bold uppercase text-xs hover:bg-surface transition-colors"
                          >
                            {isExpanded ? "Collapse" : "View Results"}
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(h)}
                          disabled={isRunning}
                          className="border-2 border-primary px-4 py-2 font-headline font-bold uppercase text-xs hover:bg-surface transition-colors disabled:opacity-40"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteHypothesis(h.id)}
                          disabled={isRunning}
                          className="border-2 border-red-400 text-red-600 px-4 py-2 font-headline font-bold uppercase text-xs hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded Results */}
                {isExpanded && h.status === "done" && (
                  <div className="border-t-4 border-primary p-6 bg-primary-fixed space-y-5">

                    {/* Answer / Findings */}
                    {h.answer && (
                      <div>
                        <p className="text-[10px] font-headline font-bold uppercase text-on-surface-variant mb-2">
                          {h.tier === 3 ? "Findings" : "Answer"}
                        </p>
                        <p className="font-body text-sm leading-relaxed text-primary border-l-4 border-primary pl-4 bg-white p-3">
                          {h.answer}
                        </p>
                      </div>
                    )}

                    {/* Sub-hypotheses (Tier 3 investigation) */}
                    {h.subHypotheses && h.subHypotheses.length > 0 && (
                      <div>
                        <p className="text-[10px] font-headline font-bold uppercase text-on-surface-variant mb-2">
                          Hypotheses Generated ({h.subHypotheses.length})
                        </p>
                        <div className="space-y-2">
                          {h.subHypotheses.map((sh) => (
                            <div key={sh.id} className="space-y-1">
                              <SubHypothesisCard h={sh} />
                              {!sh.requires_new_tool && (
                                <button
                                  onClick={() => {
                                    const child: Hypothesis = {
                                      id: Date.now().toString(),
                                      question: sh.title + " — " + sh.description.slice(0, 80),
                                      title: sh.title,
                                      notes: "Spawned from: " + h.title,
                                      status: "idle",
                                      confidence: 70,
                                      createdAt: new Date().toISOString(),
                                    };
                                    const updated = [child, ...hypotheses];
                                    persist(updated);
                                  }}
                                  className="text-[10px] font-headline font-bold uppercase text-primary border border-primary px-3 py-1 hover:bg-white transition-colors"
                                >
                                  + Add as Hypothesis
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Execution Trace (Tier 1/2) */}
                    {h.executions && h.executions.length > 0 && (
                      <div>
                        <p className="text-[10px] font-headline font-bold uppercase text-on-surface-variant mb-2">
                          Execution Trace ({h.executions.length} steps)
                        </p>
                        <div className="space-y-2">
                          {h.executions.map((ex: any, i: number) => (
                            <div
                              key={i}
                              className="border-2 border-primary p-3 bg-white flex items-start justify-between gap-3"
                            >
                              <div>
                                <p className="font-headline font-bold uppercase text-xs text-primary">
                                  {ex.tool_name}
                                </p>
                                <p className="text-[10px] font-mono text-on-surface-variant">
                                  v{ex.tool_version} · {ex.execution_time_ms}ms
                                </p>
                                {ex.output && (
                                  <p className="text-[10px] font-mono text-on-surface-variant mt-1 truncate max-w-xs">
                                    {JSON.stringify(ex.output).slice(0, 120)}
                                  </p>
                                )}
                              </div>
                              <span className="material-symbols-outlined text-tertiary text-sm shrink-0">check_circle</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
