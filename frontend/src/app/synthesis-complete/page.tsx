"use client";

import { useState, useEffect } from "react";
import { fetchFunnel, fetchPipelineStatus, fetchAuditLog } from "@/lib/apiCache";
import Link from "next/link";

export default function SynthesisCompletePage() {
  const [funnel, setFunnel]     = useState<any>(null);
  const [pipeline, setPipeline] = useState<any>(null);
  const [events, setEvents]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchFunnel("30d"),
      fetchPipelineStatus(),
      fetchAuditLog(20),
    ])
      .then(([f, p, e]) => { setFunnel(f); setPipeline(p); setEvents(e); })
      .catch(() => setError("Could not load synthesis data."))
      .finally(() => setLoading(false));
  }, []);

  const queryEvents  = events.filter(e => e.action === "Query");
  const successCount = events.filter(e => e.level === "success").length;
  const closedWon    = funnel?.stages?.find((s: any) => s.name === "Closed-Won");
  const mql          = funnel?.stages?.find((s: any) => s.name === "MQL");
  const anomalies    = funnel?.stages?.filter((s: any) => s.anomaly) ?? [];
  const cac          = funnel?.key_metrics?.cac;
  const ltv          = funnel?.key_metrics?.ltv;
  const ltvRatio     = funnel?.key_metrics?.ltv_cac_ratio;
  const pipeline_val = funnel?.key_metrics?.pipeline_value;

  return (
    <div className="bg-background min-h-screen">
      <header className="bg-background border-b-4 border-primary px-6 lg:px-10 py-4 sticky top-0 z-40">
        <h1 className="font-headline font-black text-2xl uppercase tracking-tighter text-primary">Synthesis Complete</h1>
        <p className="font-headline font-bold text-xs uppercase text-on-surface-variant mt-1">Live intelligence output from your data</p>
      </header>

      <div className="p-6 lg:p-10 space-y-8 max-w-4xl mx-auto">
        {loading && (
          <div className="border-4 border-primary p-12 text-center bg-primary-fixed neo-shadow">
            <span className="material-symbols-outlined text-5xl text-primary animate-pulse block mb-3">summarize</span>
            <p className="font-headline font-bold uppercase text-primary">Synthesizing intelligence…</p>
          </div>
        )}

        {error && <div className="border-4 border-red-500 p-6 bg-red-50 neo-shadow"><p className="font-mono text-sm text-red-700">{error}</p></div>}

        {!loading && funnel && (
          <>
            {/* Hero */}
            <div className="border-4 border-primary p-10 neo-shadow bg-tertiary text-white text-center">
              <span className="material-symbols-outlined text-6xl mb-3 block">check_circle</span>
              <h2 className="font-headline font-black text-3xl uppercase mb-2 tracking-tighter">Analysis Live</h2>
              <p className="font-headline font-bold text-base">
                {pipeline?.tool_count ?? 0} deterministic tools · {funnel.period}
              </p>
              {pipeline?.dev_mode && (
                <span className="font-mono text-xs opacity-70 mt-2 block">DEV mode — simulated connector data</span>
              )}
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Pipeline Value",  value: pipeline_val ? `$${(pipeline_val/1_000_000).toFixed(1)}M` : "—" },
                { label: "Avg CAC",         value: cac ? `$${cac.toLocaleString()}` : "—" },
                { label: "LTV",             value: ltv ? `$${ltv.toLocaleString()}` : "—" },
                { label: "LTV:CAC",         value: ltvRatio ? `${ltvRatio}×` : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="border-4 border-primary p-5 bg-white neo-shadow text-center">
                  <div className="font-headline font-black text-2xl text-primary">{value}</div>
                  <div className="font-mono text-[10px] uppercase text-on-surface-variant mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* Anomalies detected */}
            <div className="border-4 border-primary p-6 bg-white neo-shadow">
              <h3 className="font-headline font-bold uppercase text-sm text-on-surface-variant mb-4">
                Anomalies Detected — {anomalies.length === 0 ? "None" : anomalies.length + " stage" + (anomalies.length !== 1 ? "s" : "")}
              </h3>
              {anomalies.length === 0 ? (
                <p className="font-body text-sm text-on-surface-variant">All funnel stages within normal range for the period.</p>
              ) : (
                <div className="space-y-2">
                  {anomalies.map((a: any) => (
                    <div key={a.name} className="border-2 border-secondary p-3 bg-yellow-50 flex items-start gap-3">
                      <span className="material-symbols-outlined text-secondary flex-shrink-0">warning</span>
                      <div>
                        <p className="font-headline font-bold uppercase text-xs text-secondary">{a.name}</p>
                        <p className="font-body text-sm text-on-surface-variant mt-0.5">{a.anomaly_reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Funnel snapshot */}
            <div className="border-4 border-primary p-6 bg-white neo-shadow">
              <h3 className="font-headline font-bold uppercase text-sm text-on-surface-variant mb-4">Funnel Snapshot — {funnel.period}</h3>
              <div className="space-y-2">
                {funnel.stages?.map((s: any) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className={`font-headline font-bold uppercase text-[10px] w-20 sm:w-32 flex-shrink-0 ${s.anomaly ? "text-secondary" : "text-on-surface-variant"}`}>{s.name}</span>
                    <div className="flex-1 bg-surface h-7 border-2 border-primary relative overflow-hidden">
                      <div className={`h-full ${s.anomaly ? "bg-secondary" : "bg-primary"} transition-all`}
                        style={{width: `${Math.min(100, (s.count/(funnel.stages[0].count||1))*100)}%`}} />
                    </div>
                    <span className="font-mono text-sm w-20 text-right text-primary">{s.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Session activity */}
            <div className="border-4 border-primary p-6 bg-surface neo-shadow">
              <h3 className="font-headline font-bold uppercase text-sm text-on-surface-variant mb-4">Session Activity</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                {[
                  { label: "Queries Run",    value: queryEvents.length },
                  { label: "System Events",  value: successCount },
                  { label: "Tools Active",   value: pipeline?.tool_count ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="border-2 border-primary p-3 bg-white text-center">
                    <div className="font-headline font-black text-2xl text-primary">{value}</div>
                    <div className="font-mono text-[9px] uppercase text-on-surface-variant mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
              {queryEvents.slice(0, 4).map((e, i) => (
                <div key={i} className="border-2 border-primary p-3 bg-white mb-2 flex justify-between items-center">
                  <p className="font-body text-xs text-primary truncate max-w-xs">{e.detail}</p>
                  <span className="font-mono text-[9px] text-on-surface-variant flex-shrink-0 ml-2">
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="grid grid-cols-2 gap-4">
              <Link href="/ask-anything"
                className="border-4 border-primary p-5 bg-primary text-white text-center neo-shadow hover:neo-shadow-active transition-all font-headline font-black uppercase">
                Ask a Question
              </Link>
              <Link href="/dashboard"
                className="border-4 border-primary p-5 bg-white text-primary text-center neo-shadow hover:neo-shadow-active transition-all font-headline font-black uppercase">
                View Dashboard
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
