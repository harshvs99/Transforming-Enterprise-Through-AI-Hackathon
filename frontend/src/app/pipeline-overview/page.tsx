"use client";

import { useState, useEffect } from "react";
import { fetchPipelineStatus } from "@/lib/apiCache";

const CATEGORY_COLORS: Record<string, string> = {
  "Anomaly Detection":      "#e63b2e",
  "Time Series":            "#3B82F6",
  "Statistical":            "#A855F7",
  "Segmentation":           "#06B6D4",
  "Attribution":            "#F59E0B",
  "Causal Inference":       "#10B981",
  "Forecasting":            "#6366F1",
};

interface Tool {
  name: string;
  version: string;
  category: string;
  description: string;
  reproducibility: string;
  classical_basis: string;
  typical_runtime_ms?: number;
}

export default function PipelineOverviewPage() {
  const [data, setData]       = useState<{ tool_count: number; categories: string[]; tools: Tool[]; kernel_status: string; dev_mode: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetchPipelineStatus()
      .then(setData)
      .catch(() => setError("Could not reach backend."))
      .finally(() => setLoading(false));
  }, []);

  const byCategory = (data?.tools ?? []).reduce<Record<string, Tool[]>>((acc, t) => {
    (acc[t.category] = acc[t.category] ?? []).push(t);
    return acc;
  }, {});

  return (
    <div className="bg-background min-h-screen">
      <header className="bg-background border-b-4 border-primary px-6 lg:px-10 py-4 sticky top-0 z-40">
        <h1 className="font-headline font-black text-2xl uppercase tracking-tighter text-primary">Pipeline Overview</h1>
        <p className="font-headline font-bold text-xs uppercase text-on-surface-variant mt-1">Deterministic tool kernel — real-time execution status</p>
      </header>

      <div className="p-6 lg:p-10 space-y-8 max-w-5xl mx-auto">
        {loading && (
          <div className="border-4 border-primary p-12 text-center bg-primary-fixed neo-shadow">
            <span className="material-symbols-outlined text-5xl text-primary animate-pulse block mb-3">account_tree</span>
            <p className="font-headline font-bold uppercase text-primary">Loading pipeline…</p>
          </div>
        )}

        {error && <div className="border-4 border-red-500 p-6 bg-red-50 neo-shadow"><p className="font-mono text-sm text-red-700">{error}</p></div>}

        {data && (
          <>
            {/* Status banner */}
            <div className="border-4 border-tertiary p-6 bg-green-50 neo-shadow flex items-center gap-4">
              <span className="material-symbols-outlined text-tertiary text-3xl">check_circle</span>
              <div>
                <p className="font-headline font-bold uppercase text-tertiary">Kernel Operational</p>
                <p className="font-mono text-xs text-on-surface-variant mt-0.5">
                  {data.tool_count} tools registered · {data.categories.length} categories · {data.dev_mode ? "DEV" : "PROD"} mode
                </p>
              </div>
            </div>

            {/* Category summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Tools",  value: data.tool_count },
                { label: "Categories",   value: data.categories.length },
                { label: "Reproducibility", value: "100%" },
                { label: "Avg Runtime",  value: `${Math.round((data.tools.reduce((s,t)=>s+(t.typical_runtime_ms??20),0))/Math.max(data.tools.length,1))}ms` },
              ].map(({ label, value }) => (
                <div key={label} className="border-4 border-primary p-4 bg-white neo-shadow text-center">
                  <div className="font-headline font-black text-2xl text-primary">{value}</div>
                  <div className="font-mono text-[10px] uppercase text-on-surface-variant mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* Query pipeline steps diagram */}
            <div className="border-4 border-primary p-6 bg-surface neo-shadow">
              <p className="font-headline font-bold uppercase text-xs text-on-surface-variant mb-4">Query Execution Pipeline</p>
              <div className="flex items-center gap-0 overflow-x-auto pb-2">
                {[
                  { label: "TierClassifier",  icon: "fork_right",       desc: "T1/T2/T3 routing" },
                  { label: "MetricResolver",  icon: "manage_search",    desc: "Canonical name lookup" },
                  { label: "PlanCompiler",    icon: "playlist_add_check",desc: "Tool chain selection" },
                  { label: "Tool Execution",  icon: "build",            desc: "Deterministic kernel" },
                  { label: "Decompiler",      icon: "summarize",        desc: "NL synthesis" },
                ].map((node, i, arr) => (
                  <div key={node.label} className="flex items-center">
                    <div className="border-4 border-primary p-3 bg-white min-w-28 text-center neo-shadow flex-shrink-0">
                      <span className="material-symbols-outlined text-2xl text-primary block">{node.icon}</span>
                      <p className="font-headline font-bold uppercase text-[10px] text-primary mt-1">{node.label}</p>
                      <p className="font-mono text-[9px] text-on-surface-variant mt-0.5">{node.desc}</p>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="w-6 h-0.5 bg-primary flex-shrink-0 relative">
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-primary text-xs">›</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tools by category */}
            {Object.entries(byCategory).map(([cat, tools]) => (
              <div key={cat} className="border-4 border-primary bg-white neo-shadow overflow-hidden">
                <div className="border-b-2 border-primary px-5 py-3 flex items-center gap-3"
                  style={{backgroundColor: (CATEGORY_COLORS[cat] ?? "#1a1a1a") + "15"}}>
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{backgroundColor: CATEGORY_COLORS[cat] ?? "#1a1a1a"}}></div>
                  <p className="font-headline font-bold uppercase text-xs text-primary">{cat}</p>
                  <span className="font-mono text-[10px] text-on-surface-variant ml-auto">{tools.length} tool{tools.length!==1?"s":""}</span>
                </div>
                <div className="divide-y-2 divide-primary">
                  {tools.map(t => (
                    <div key={t.name}
                      className="px-5 py-4 cursor-pointer hover:bg-primary-fixed transition-colors"
                      onClick={() => setSelected(selected === t.name ? null : t.name)}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-headline font-bold uppercase text-sm text-primary">{t.name}</span>
                          <span className="font-mono text-[10px] text-on-surface-variant ml-2">v{t.version}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] border border-tertiary text-tertiary px-2 py-0.5 uppercase">{t.reproducibility}</span>
                          <span className="material-symbols-outlined text-sm text-on-surface-variant">
                            {selected === t.name ? "expand_less" : "expand_more"}
                          </span>
                        </div>
                      </div>
                      {selected === t.name && (
                        <div className="mt-3 space-y-1">
                          <p className="font-body text-sm text-on-surface-variant">{t.description}</p>
                          <p className="font-mono text-[10px] text-on-surface-variant">Basis: {t.classical_basis}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
