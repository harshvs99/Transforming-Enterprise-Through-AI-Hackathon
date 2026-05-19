"use client";

import { useState, useRef, useEffect } from "react";
import { executeQuery } from "@/lib/apiCache";

export default function AskAnythingPage() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const runQuery = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setResponse(null);
    setError(null);
    try {
      const data = await executeQuery(q);
      setResponse(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to reach the backend. Is it running on port 8000?");
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loading) return;
    await runQuery(query);
  };

  // Read ?q=... from the URL on mount and auto-submit it. Using
  // window.location instead of useSearchParams keeps this compatible
  // with `output: 'export'` (no Suspense boundary needed).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      setQuery(q);
      runQuery(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 300) + 'px';
    }
  }, [query]);

  return (
    <div className="bg-background min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-background border-b-4 border-primary px-6 lg:px-10 py-4 sticky top-0 z-40">
        <h1 className="font-headline font-black text-2xl uppercase tracking-tighter text-primary">Ask Anything</h1>
        <p className="font-headline font-bold text-xs uppercase text-on-surface-variant mt-1">Query your enterprise data with natural language</p>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6 lg:p-10 overflow-y-auto">
        <div className="max-w-4xl space-y-8">
          {/* Query Input Section */}
          <section className="space-y-4">
            <form onSubmit={handleQuery} className="space-y-4">
              <div className={`relative transition-all duration-300 ${isFocused ? 'neo-shadow-lg' : 'neo-shadow'}`}>
                <textarea
                  ref={textareaRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={(e) => e.ctrlKey && e.key === 'Enter' && handleQuery()}
                  placeholder="Why did our CAC spike in October? What's our MRR trend? How does churn compare YoY?"
                  className="w-full bg-white border-4 border-primary p-6 font-body text-lg focus:outline-none min-h-40 resize-none color-transition overflow-hidden"
                  style={{
                    boxShadow: isFocused ? '8px 8px 0px 0px rgba(26, 26, 26, 1)' : '4px 4px 0px 0px rgba(26, 26, 26, 1)',
                  }}
                />
                {isFocused && (
                  <div className="absolute bottom-2 right-4 text-[10px] font-mono text-on-surface-variant animate-pulse">
                    Ctrl+Enter to submit
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="w-full bg-primary text-white border-4 border-primary p-6 font-headline font-black uppercase text-lg transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed hover:scale-100"
                style={{
                  boxShadow: loading ? '2px 2px 0px 0px rgba(26, 26, 26, 1)' : '4px 4px 0px 0px rgba(26, 26, 26, 1)',
                  transform: loading ? 'translate(2px, 2px)' : 'translate(0, 0)',
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent loading-spinner"></span>
                    Analyzing Question...
                  </span>
                ) : (
                  "Submit Query"
                )}
              </button>
            </form>
          </section>

          {/* Response Section */}
          {loading && (
            <section className="space-y-4">
              <div className="border-4 border-primary p-12 bg-primary-fixed text-center neo-shadow">
                <span className="material-symbols-outlined text-6xl text-primary mb-4 block animate-pulse">autorenew</span>
                <p className="font-headline font-bold uppercase text-primary">Executing Deterministic Kernel...</p>
                <p className="font-mono text-xs text-on-surface-variant mt-2">Compiling execution plan...</p>
              </div>
            </section>
          )}

          {error && !loading && (
            <section className="border-4 border-red-500 p-6 bg-red-50 neo-shadow">
              <p className="font-headline font-bold uppercase text-xs text-red-600 mb-2">Error</p>
              <p className="font-mono text-sm text-red-700">{error}</p>
            </section>
          )}

          {response && !loading && (
            <section className="space-y-6" style={{
              animation: 'slideInUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }}>
              {/* Main Answer */}
              <div className="border-4 border-primary p-8 bg-white neo-shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-tertiary"></div>
                <div className="pl-4">
                  <h2 className="font-headline font-bold uppercase text-xs text-on-surface-variant mb-4">Answer</h2>
                  <p className="font-body text-lg leading-relaxed text-primary">{response.answer}</p>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border-4 border-primary p-6 bg-surface neo-shadow">
                  <h3 className="font-headline font-bold uppercase text-xs text-on-surface-variant mb-3">Tier</h3>
                  <p className="font-headline font-black text-3xl text-primary">Tier {response.tier}</p>
                  <p className="font-mono text-[10px] text-on-surface-variant mt-2">
                    {response.tier === 1 ? "Direct Lookup" : response.tier === 2 ? "Analysis Mode" : "Investigation Mode"}
                  </p>
                </div>

                <div className="border-4 border-primary p-6 bg-surface neo-shadow">
                  <h3 className="font-headline font-bold uppercase text-xs text-on-surface-variant mb-3">Model</h3>
                  <p className="font-headline font-black text-lg text-primary">{response.model}</p>
                  <p className="font-mono text-[10px] text-on-surface-variant mt-2">Processing complete</p>
                </div>
              </div>

              {/* Metric Resolutions */}
              {response.metric_resolutions && response.metric_resolutions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-headline font-black text-xl uppercase text-primary border-b-4 border-primary inline-block pb-2">Metrics Resolved</h3>
                  <div className="space-y-3">
                    {response.metric_resolutions.map((m: any, i: number) => (
                      <div key={i} className="border-2 border-primary p-4 bg-white">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-headline font-bold uppercase text-primary">{m.canonical_name}</p>
                            <p className="text-xs font-mono text-on-surface-variant mt-1">v{m.version} • {m.owner}</p>
                          </div>
                          <span className="font-headline font-bold text-xs bg-tertiary text-white px-3 py-1 uppercase">Resolved</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Executions */}
              {response.executions && response.executions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-headline font-black text-xl uppercase text-primary border-b-4 border-primary inline-block pb-2">Execution Trace</h3>
                  <div className="space-y-3">
                    {response.executions.map((ex: any, i: number) => (
                      <div key={i} className="border-2 border-primary p-4 bg-surface neo-shadow hover:bg-primary-fixed transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-headline font-bold uppercase text-primary">{ex.tool_name}</p>
                            <p className="text-[10px] font-mono text-on-surface-variant">v{ex.tool_version}</p>
                          </div>
                          <span className="material-symbols-outlined text-tertiary">check_circle</span>
                        </div>
                        {ex.output && (
                          <div className="text-sm font-mono text-on-surface-variant bg-white border border-primary p-3 max-h-24 overflow-y-auto">
                            {JSON.stringify(ex.output).substring(0, 200)}...
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Placeholder State */}
          {!response && !loading && (
            <section className="border-4 border-dashed border-primary p-12 bg-surface text-center">
              <span className="material-symbols-outlined text-7xl text-primary mb-4 block opacity-30">help</span>
              <h2 className="font-headline font-black text-2xl uppercase tracking-tighter text-primary mb-2">Ask a Question</h2>
              <p className="font-headline font-bold text-sm uppercase text-on-surface-variant">Examples:</p>
              <ul className="text-sm text-on-surface-variant mt-4 space-y-2 inline-block text-left">
                <li>• "Why did our CAC spike in October?"</li>
                <li>• "What's our current MRR and growth rate?"</li>
                <li>• "Analyze churn patterns this quarter"</li>
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
