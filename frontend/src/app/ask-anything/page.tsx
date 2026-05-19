"use client";

import { useState, useRef, useEffect } from "react";
import { executeQuery, investigateHypothesis } from "@/lib/apiCache";

// ---------- types ----------

interface Hypothesis {
  id: string;
  title: string;
  description: string;
  requires_new_tool: boolean;
  proposed_tool_name: string | null;
}

interface HypothesisAnalysis {
  hypothesis_id: string;
  hypothesis_title: string;
  finding: string;
  executions: any[];
  model: string;
  loading: boolean;
  error?: string;
}

interface ConversationTurn {
  id: string;
  question: string;
  response: any;
  timestamp: Date;
  analyses: Record<string, HypothesisAnalysis>;
}

// ---------- small components ----------

function TierBadge({ tier }: { tier: number }) {
  const label = tier === 1 ? "Direct Lookup" : tier === 2 ? "Analysis" : "Investigation";
  return (
    <div className="flex items-center gap-3">
      <span className="font-headline font-black text-2xl text-primary">Tier {tier}</span>
      <span className="font-mono text-[10px] uppercase bg-primary text-white px-2 py-1">{label}</span>
    </div>
  );
}

function ExecutionTrace({ executions }: { executions: any[] }) {
  if (!executions?.length) return null;
  return (
    <div className="space-y-2 mt-3">
      {executions.map((ex: any, i: number) => (
        <div key={i} className="border-2 border-primary p-3 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="font-headline font-bold uppercase text-xs text-primary">{ex.tool_name}</span>
            <span className="font-mono text-[10px] text-on-surface-variant">
              v{ex.tool_version} · {ex.execution_time_ms}ms
            </span>
          </div>
          {ex.output && (
            <pre className="text-[10px] font-mono text-on-surface-variant bg-surface p-2 overflow-x-auto whitespace-pre-wrap max-h-24 overflow-y-auto">
              {JSON.stringify(ex.output, null, 2).substring(0, 400)}
              {JSON.stringify(ex.output).length > 400 ? "\n…" : ""}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

function HypothesisCard({
  hypothesis,
  analysis,
  onAnalyze,
}: {
  hypothesis: Hypothesis;
  analysis?: HypothesisAnalysis;
  onAnalyze: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (analysis && !analysis.loading) setExpanded(true);
  }, [analysis]);

  return (
    <div className="border-2 border-primary bg-white">
      {/* Card header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="font-headline font-bold uppercase text-sm text-primary">{hypothesis.title}</p>
            <p className="font-body text-xs text-on-surface-variant mt-1 leading-relaxed">
              {hypothesis.description}
            </p>
          </div>
          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            {hypothesis.requires_new_tool ? (
              <span className="font-mono text-[10px] bg-on-surface-variant text-white px-2 py-1 uppercase text-center">
                Requires Tool<br />
                <span className="text-[9px] opacity-80">{hypothesis.proposed_tool_name}</span>
              </span>
            ) : analysis?.loading ? (
              <span className="flex items-center gap-1 font-mono text-[10px] text-on-surface-variant">
                <span className="inline-block w-3 h-3 border-2 border-primary border-t-transparent loading-spinner"></span>
                Running…
              </span>
            ) : analysis ? (
              <button
                onClick={() => setExpanded(v => !v)}
                className="font-headline font-bold text-[10px] uppercase border-2 border-primary px-3 py-1 bg-surface hover:bg-primary hover:text-white transition-colors"
              >
                {expanded ? "Collapse" : "View Results"}
              </button>
            ) : (
              <button
                onClick={onAnalyze}
                className="font-headline font-bold text-[10px] uppercase border-2 border-primary px-3 py-1 bg-primary text-white hover:opacity-80 transition-opacity"
                style={{ boxShadow: "2px 2px 0px 0px rgba(26,26,26,1)" }}
              >
                Run Analysis
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Analysis result */}
      {analysis && !analysis.loading && expanded && (
        <div className="border-t-2 border-primary p-4 bg-primary-fixed space-y-3">
          {analysis.error ? (
            <p className="font-mono text-xs text-red-600">{analysis.error}</p>
          ) : (
            <>
              <div>
                <p className="font-headline font-bold uppercase text-[10px] text-on-surface-variant mb-1">Finding</p>
                <p className="font-body text-sm leading-relaxed text-primary">{analysis.finding}</p>
              </div>
              <div>
                <p className="font-headline font-bold uppercase text-[10px] text-on-surface-variant mb-1">Tool Execution Trace</p>
                <ExecutionTrace executions={analysis.executions} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ConversationTurnView({
  turn,
  onInvestigate,
  onFollowUp,
}: {
  turn: ConversationTurn;
  onInvestigate: (h: Hypothesis) => void;
  onFollowUp: (q: string) => void;
}) {
  const r = turn.response;
  const isInvestigation = r?.investigation_mode;

  return (
    <div className="space-y-4" style={{ animation: "slideInUp 0.4s cubic-bezier(0.25,0.46,0.45,0.94)" }}>
      {/* User question */}
      <div className="flex justify-end">
        <div className="max-w-2xl border-4 border-primary bg-primary text-white px-5 py-3 neo-shadow">
          <p className="font-body text-base leading-relaxed">{turn.question}</p>
        </div>
      </div>

      {/* System response */}
      <div className="border-4 border-primary bg-white neo-shadow-lg overflow-hidden">
        {/* Tier + model strip */}
        <div className="border-b-2 border-primary px-6 py-3 bg-surface flex items-center justify-between">
          <TierBadge tier={r.tier} />
          <span className="font-mono text-[10px] text-on-surface-variant">{r.model}</span>
        </div>

        <div className="p-6 space-y-6">
          {/* Answer / Findings */}
          <div className="relative pl-4">
            <div className="absolute left-0 top-0 h-full w-1 bg-tertiary" />
            <p className="font-headline font-bold uppercase text-[10px] text-on-surface-variant mb-2">
              {isInvestigation ? "Findings" : "Answer"}
            </p>
            <p className="font-body text-base leading-relaxed text-primary">{r.answer}</p>
          </div>

          {/* Investigation: Hypothesis Cards */}
          {isInvestigation && r.hypotheses?.length > 0 && (
            <div className="space-y-3">
              <p className="font-headline font-bold uppercase text-xs text-on-surface-variant border-b-2 border-primary pb-2">
                Hypotheses — click Run Analysis to investigate with live data
              </p>
              {r.hypotheses.map((h: Hypothesis) => (
                <HypothesisCard
                  key={h.id}
                  hypothesis={h}
                  analysis={turn.analyses[h.id]}
                  onAnalyze={() => onInvestigate(h)}
                />
              ))}
            </div>
          )}

          {/* Tier 1/2: Metric resolutions */}
          {!isInvestigation && r.metric_resolutions?.length > 0 && (
            <div className="space-y-2">
              <p className="font-headline font-bold uppercase text-[10px] text-on-surface-variant">Metrics Resolved</p>
              {r.metric_resolutions.map((m: any, i: number) => (
                <div key={i} className="border-2 border-primary p-3 bg-surface flex justify-between items-center">
                  <div>
                    <p className="font-headline font-bold uppercase text-xs text-primary">{m.canonical_name}</p>
                    <p className="font-mono text-[10px] text-on-surface-variant">v{m.version} · {m.owner}</p>
                  </div>
                  <span className="font-mono text-[10px] bg-tertiary text-white px-2 py-1">Resolved</span>
                </div>
              ))}
            </div>
          )}

          {/* Tier 1/2: Execution trace */}
          {!isInvestigation && r.executions?.length > 0 && (
            <div className="space-y-2">
              <p className="font-headline font-bold uppercase text-[10px] text-on-surface-variant">Execution Trace</p>
              <ExecutionTrace executions={r.executions} />
            </div>
          )}

          {/* Follow-up suggestion chips */}
          {isInvestigation && (
            <div className="pt-2 border-t-2 border-dashed border-primary">
              <p className="font-headline font-bold uppercase text-[10px] text-on-surface-variant mb-2">Ask a follow-up</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Which funnel stage is underperforming most?",
                  "How does this compare to last quarter?",
                  "Break down CAC by channel",
                  "What's the MQL to SAL conversion trend?",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => onFollowUp(s)}
                    className="text-[11px] font-mono bg-surface border-2 border-primary px-3 py-1 hover:bg-primary hover:text-white transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlaceholderState({ onSuggest }: { onSuggest: (q: string) => void }) {
  const examples = [
    "Why did our CAC spike in October?",
    "Drill down into funnel anomalies",
    "What's our current MRR and growth rate?",
    "Analyze churn patterns this quarter",
  ];
  return (
    <div className="border-4 border-dashed border-primary p-12 bg-surface text-center">
      <span className="material-symbols-outlined text-7xl text-primary mb-4 block opacity-30">help</span>
      <h2 className="font-headline font-black text-2xl uppercase tracking-tighter text-primary mb-2">Ask a Question</h2>
      <p className="font-headline font-bold text-sm uppercase text-on-surface-variant mb-4">Try one of these:</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {examples.map((e) => (
          <button
            key={e}
            onClick={() => onSuggest(e)}
            className="text-sm font-body border-2 border-primary px-4 py-2 bg-white hover:bg-primary hover:text-white transition-colors neo-shadow"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- main page ----------

export default function AskAnythingPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const submitQuery = async (q: string) => {
    if (!q.trim() || loading) return;
    setLoading(true);
    setError(null);
    setQuery("");
    try {
      const data = await executeQuery(q);
      const id = `${Date.now()}-${Math.random()}`;
      setTurns((prev) => [
        ...prev,
        { id, question: q, response: data, timestamp: new Date(), analyses: {} },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reach backend.");
      setQuery(q); // restore so user can retry
    } finally {
      setLoading(false);
    }
  };

  const handleInvestigate = async (turnId: string, hypothesis: Hypothesis, originalQuestion: string) => {
    // Optimistically mark loading
    setTurns((prev) =>
      prev.map((t) =>
        t.id !== turnId
          ? t
          : {
              ...t,
              analyses: {
                ...t.analyses,
                [hypothesis.id]: {
                  hypothesis_id: hypothesis.id,
                  hypothesis_title: hypothesis.title,
                  finding: "",
                  executions: [],
                  model: "",
                  loading: true,
                },
              },
            }
      )
    );
    try {
      const result = await investigateHypothesis({
        hypothesis_id: hypothesis.id,
        hypothesis_title: hypothesis.title,
        hypothesis_description: hypothesis.description,
        original_question: originalQuestion,
      });
      setTurns((prev) =>
        prev.map((t) =>
          t.id !== turnId
            ? t
            : { ...t, analyses: { ...t.analyses, [hypothesis.id]: { ...result, loading: false } } }
        )
      );
    } catch {
      setTurns((prev) =>
        prev.map((t) =>
          t.id !== turnId
            ? t
            : {
                ...t,
                analyses: {
                  ...t.analyses,
                  [hypothesis.id]: {
                    hypothesis_id: hypothesis.id,
                    hypothesis_title: hypothesis.title,
                    finding: "",
                    executions: [],
                    model: "",
                    loading: false,
                    error: "Analysis failed — check backend logs.",
                  },
                },
              }
        )
      );
    }
  };

  // Auto-submit ?q= param on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      setQuery(q);
      submitQuery(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-grow textarea
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
  }, [query]);

  // Scroll to bottom on new turns
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, loading]);

  const handleFollowUp = (q: string) => {
    setQuery(q);
    textareaRef.current?.focus();
  };

  return (
    <div className="bg-background min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-background border-b-4 border-primary px-6 lg:px-10 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline font-black text-2xl uppercase tracking-tighter text-primary">Ask Anything</h1>
            <p className="font-headline font-bold text-xs uppercase text-on-surface-variant mt-1">
              Query your enterprise data with natural language
            </p>
          </div>
          {turns.length > 0 && (
            <button
              onClick={() => { setTurns([]); setError(null); setQuery(""); }}
              className="font-headline font-bold text-xs uppercase border-2 border-primary px-3 py-2 bg-surface hover:bg-primary hover:text-white transition-colors"
            >
              New Session
            </button>
          )}
        </div>
      </header>

      {/* Conversation thread */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-10 pb-4">
        <div className="max-w-4xl mx-auto space-y-8">
          {turns.length === 0 && !loading && !error && (
            <PlaceholderState onSuggest={(q) => { setQuery(q); textareaRef.current?.focus(); }} />
          )}

          {turns.map((turn) => (
            <ConversationTurnView
              key={turn.id}
              turn={turn}
              onInvestigate={(h) => handleInvestigate(turn.id, h, turn.question)}
              onFollowUp={handleFollowUp}
            />
          ))}

          {loading && (
            <div className="border-4 border-primary p-10 bg-primary-fixed text-center neo-shadow">
              <span className="material-symbols-outlined text-5xl text-primary mb-3 block animate-pulse">
                autorenew
              </span>
              <p className="font-headline font-bold uppercase text-primary">Executing Deterministic Kernel…</p>
              <p className="font-mono text-xs text-on-surface-variant mt-1">Compiling execution plan…</p>
            </div>
          )}

          {error && !loading && (
            <div className="border-4 border-red-500 p-6 bg-red-50 neo-shadow">
              <p className="font-headline font-bold uppercase text-xs text-red-600 mb-2">Error</p>
              <p className="font-mono text-sm text-red-700">{error}</p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Sticky input area */}
      <div className="border-t-4 border-primary bg-surface px-6 lg:px-10 pt-4 pb-6">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Suggestion chips — shown only after first turn */}
          {turns.length > 0 && turns[turns.length - 1]?.response?.investigation_mode && (
            <div className="flex flex-wrap gap-2">
              {[
                "Which channel is underperforming?",
                "Show me the full funnel breakdown",
                "Is CAC improving or worsening?",
                "Compare MQL trends across segments",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => handleFollowUp(s)}
                  className="text-[11px] font-mono bg-white border-2 border-primary px-3 py-1 hover:bg-primary hover:text-white transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); submitQuery(query); }}
            className="flex gap-3 items-end"
          >
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.ctrlKey && e.key === "Enter") submitQuery(query); }}
              placeholder={turns.length > 0 ? "Ask a follow-up…" : "Why did our CAC spike in October?"}
              className="flex-1 bg-white border-4 border-primary p-4 font-body text-base focus:outline-none resize-none overflow-hidden"
              style={{ minHeight: "60px", boxShadow: "4px 4px 0px 0px rgba(26,26,26,1)" }}
              rows={1}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-primary text-white border-4 border-primary px-6 py-4 font-headline font-black uppercase text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              style={{ boxShadow: "4px 4px 0px 0px rgba(26,26,26,1)" }}
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent loading-spinner" />
              ) : turns.length > 0 ? (
                "Send"
              ) : (
                "Submit"
              )}
            </button>
          </form>
          <p className="font-mono text-[10px] text-on-surface-variant">Ctrl+Enter to submit</p>
        </div>
      </div>
    </div>
  );
}
