"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/apiBase";

// Stage bar colors: Prospects=yellow, Leads=cyan, MQL=red, SAL=yellow, Opportunity=cyan, Closed-Won=black
const STAGE_COLORS = ["#FFCC00", "#06B6D4", "#e63b2e", "#FFCC00", "#06B6D4", "#1a1a1a"];
const STAGE_TEXT   = ["#1a1a1a", "#1a1a1a", "#ffffff", "#1a1a1a", "#1a1a1a", "#FFCC00"];

const CHANNEL_COLORS: Record<string, string> = {
  LinkedIn:     "#3B82F6",
  "Google Ads": "#06B6D4",
  Meta:         "#A855F7",
  Email:        "#F59E0B",
  Direct:       "#10B981",
};

const SEGMENT_COLORS: Record<string, string> = {
  Enterprise: "#06B6D4",
  Strategic:  "#3B82F6",
  Commercial: "#A855F7",
  SMB:        "#10B981",
};

const TIME_RANGES = ["7d", "30d", "Quarter", "YTD"] as const;

interface Stage {
  name: string;
  count: number;
  previous_count: number;
  anomaly: boolean;
  anomaly_reason: string | null;
}

interface ChannelData {
  leads: number;
  mqls: number;
  sales: number;
}

interface SegmentData {
  count: number;
  conversion_rate: number;
}

interface FunnelData {
  period: string;
  time_range: string;
  segments: string[];
  channels: string[];
  stages: Stage[];
  channel_breakdown: Record<string, ChannelData>;
  segment_breakdown: Record<string, SegmentData>;
  key_metrics: {
    average_deal_size: number;
    pipeline_value: number;
    cac: number;
    ltv: number;
    ltv_cac_ratio: number;
  };
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function KpiCard({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value: string;
  sub: string;
  loading: boolean;
}) {
  return (
    <div className="border-4 border-primary neo-shadow bg-background p-5 flex flex-col gap-1">
      <span className="text-[9px] font-label font-bold uppercase tracking-[0.12em] text-on-surface-variant">
        {label}
      </span>
      {loading ? (
        <div className="h-8 w-24 bg-surface-variant animate-pulse mt-1" />
      ) : (
        <span className="text-3xl font-headline font-black text-primary leading-tight">
          {value}
        </span>
      )}
      <span className="text-[11px] text-on-surface-variant font-body">{sub}</span>
    </div>
  );
}

export default function DashboardPage() {
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("30d");
  const [sourceMode, setSourceMode] = useState<"sourced" | "influenced">("sourced");
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [counters, setCounters] = useState<Record<string, number>>({});

  const fetchFunnel = useCallback(() => {
    setLoading(true);
    fetch(apiUrl(`/api/funnel?time_range=${timeRange}`))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: FunnelData) => {
        setFunnel(data);
        const init: Record<string, number> = {};
        data.stages.forEach((s) => {
          init[s.name] = s.count;
        });
        setCounters(init);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [timeRange]);

  useEffect(() => {
    fetchFunnel();
  }, [fetchFunnel]);

  // SSE live updates
  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const es = new EventSource(apiUrl("/api/funnel/stream"));
    es.onmessage = (e) => {
      try {
        const delta: Record<string, number> = JSON.parse(e.data);
        setCounters((prev) => {
          const next = { ...prev };
          Object.entries(delta).forEach(([k, v]) => {
            if (k in next) next[k] = (next[k] ?? 0) + v;
          });
          return next;
        });
      } catch {
        /* ignore */
      }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  const stages = funnel?.stages ?? [];
  const maxCount = Math.max(...stages.map((s) => counters[s.name] ?? s.count), 1);
  const anomalies = stages.filter((s) => s.anomaly);

  return (
    <div className="bg-background min-h-screen font-body">
      {/* PAGE HEADER */}
      <div className="border-b-4 border-primary px-8 py-5 flex items-center justify-between gap-6 bg-background sticky top-0 z-20">
        <div>
          <h1 className="font-headline font-black uppercase text-xl tracking-tight text-primary leading-none">
            Pipeline Overview
          </h1>
          <p className="font-body text-xs text-on-surface-variant mt-1">— TestPilot Inc.</p>
        </div>

        {/* Right side: time range + filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex border-2 border-primary">
            {TIME_RANGES.map((r, i) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-4 py-2 text-[11px] font-label font-bold uppercase tracking-widest transition-colors ${
                  timeRange === r
                    ? "bg-[#06B6D4] text-primary"
                    : "bg-background text-on-surface-variant hover:bg-surface-variant"
                } ${i > 0 ? "border-l-2 border-primary" : ""}`}
              >
                {r}
              </button>
            ))}
          </div>

          <button className="border-2 border-primary bg-primary text-primary-fixed px-4 py-2 text-[11px] font-label font-bold uppercase tracking-widest neo-shadow hover:translate-x-px hover:translate-y-px transition-transform">
            Segments
          </button>
          <button className="border-2 border-primary bg-primary text-primary-fixed px-4 py-2 text-[11px] font-label font-bold uppercase tracking-widest neo-shadow hover:translate-x-px hover:translate-y-px transition-transform">
            Channels
          </button>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1600px] mx-auto">
        {/* ANOMALY BANNER */}
        {anomalies.length > 0 && (
          <div className="border-4 border-secondary bg-secondary bg-opacity-10 p-4 mb-6 flex items-center gap-6 flex-wrap">
            <span className="text-[9px] font-label font-black uppercase tracking-[0.15em] text-secondary shrink-0">
              ⚠ {anomalies.length} anomal{anomalies.length > 1 ? "ies" : "y"} detected
            </span>
            <div className="flex gap-6 flex-wrap flex-1">
              {anomalies.map((s) => (
                <span key={s.name} className="text-xs text-on-surface-variant">
                  <strong className="text-primary">{s.name}</strong>
                  {s.anomaly_reason && <span> — {s.anomaly_reason}</span>}
                </span>
              ))}
            </div>
            <Link
              href={`/ask-anything?q=${encodeURIComponent(
                "Why are there anomalies in the marketing funnel?"
              )}`}
              className="text-[11px] font-label font-black uppercase tracking-widest text-secondary shrink-0 no-underline hover:underline"
            >
              Investigate →
            </Link>
          </div>
        )}

        {/* KPI CARDS */}
        <section className="grid grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="CAC"
            value={funnel ? `$${funnel.key_metrics.cac.toLocaleString()}` : "—"}
            sub="Customer Acquisition Cost"
            loading={loading}
          />
          <KpiCard
            label="LTV"
            value={funnel ? `$${(funnel.key_metrics.ltv / 1000).toFixed(0)}K` : "—"}
            sub="Lifetime Value"
            loading={loading}
          />
          <KpiCard
            label="LTV : CAC"
            value={funnel ? `${funnel.key_metrics.ltv_cac_ratio}:1` : "—"}
            sub="Target ≥ 3 : 1"
            loading={loading}
          />
          <KpiCard
            label="Pipeline"
            value={funnel ? `$${(funnel.key_metrics.pipeline_value / 1_000_000).toFixed(1)}M` : "—"}
            sub="Total Pipeline Value"
            loading={loading}
          />
        </section>

        {/* MARKETING FUNNEL SECTION */}
        <section className="border-4 border-primary neo-shadow mb-6">
          {/* Funnel header */}
          <div className="border-b-4 border-primary px-6 py-4 flex items-center justify-between gap-6 flex-wrap">
            <div>
              <h2 className="font-headline font-black uppercase text-sm tracking-wide text-primary leading-none">
                Marketing Funnel
              </h2>
              <p className="text-[11px] text-on-surface-variant font-body mt-1">
                6-stage pipeline · click any stage to drill down
              </p>
            </div>

            <div className="flex items-center gap-6 flex-wrap">
              {/* Channel legend */}
              <div className="flex gap-5">
                {Object.entries(CHANNEL_COLORS).map(([ch, color]) => (
                  <div key={ch} className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 inline-block shrink-0"
                      style={{ background: color }}
                    />
                    <span className="text-[10px] font-body text-on-surface-variant">
                      {ch.replace(" Ads", "")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Source mode toggle */}
              <div className="flex border-2 border-primary">
                {(["sourced", "influenced"] as const).map((m, i) => (
                  <button
                    key={m}
                    onClick={() => setSourceMode(m)}
                    className={`px-4 py-2 text-[10px] font-label font-bold uppercase tracking-widest transition-colors ${
                      sourceMode === m
                        ? "bg-[#06B6D4] text-primary"
                        : "bg-background text-on-surface-variant hover:bg-surface-variant"
                    } ${i > 0 ? "border-l-2 border-primary" : ""}`}
                  >
                    {m === "sourced" ? "Mktg Sourced" : "Mktg Influenced"}
                  </button>
                ))}
              </div>

              <Link
                href="/ask-anything?q=Drill+down+into+funnel+anomalies"
                className="border-2 border-primary bg-primary text-primary-fixed px-4 py-2 text-[10px] font-label font-bold uppercase tracking-widest neo-shadow no-underline hover:bg-primary/90 transition-colors"
              >
                Drill Down
              </Link>
            </div>
          </div>

          {/* Funnel bars */}
          <div className="p-6">
            {loading ? (
              <div className="flex flex-col gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4" style={{ height: 44 }}>
                    <div className="w-[130px] h-3 bg-surface-variant animate-pulse shrink-0" />
                    <div
                      className="flex-1 h-[40px] bg-surface-variant animate-pulse"
                      style={{
                        width: `${90 - i * 12}%`,
                        maxWidth: "100%",
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="py-12 text-center">
                <p className="text-secondary text-sm font-label font-bold uppercase mb-2">
                  Failed to load funnel
                </p>
                <p className="text-on-surface-variant text-xs mb-4">{error}</p>
                <button
                  onClick={fetchFunnel}
                  className="border-2 border-primary bg-primary-fixed text-primary px-6 py-2 text-xs font-label font-bold uppercase tracking-widest neo-shadow"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {stages.map((stage, idx) => {
                  const count = counters[stage.name] ?? stage.count;
                  const pct = Math.max((count / maxCount) * 100, 4);
                  const color = STAGE_COLORS[idx % STAGE_COLORS.length];
                  const txtCol = STAGE_TEXT[idx % STAGE_TEXT.length];
                  const isActive = activeStage === stage.name;

                  // Conversion rate from previous stage
                  let convRate: string | null = null;
                  if (idx > 0) {
                    const prevStage = stages[idx - 1];
                    const prevCount = counters[prevStage.name] ?? prevStage.count;
                    if (prevCount) {
                      convRate = `${((count / prevCount) * 100).toFixed(0)}%`;
                    }
                  }

                  return (
                    <div key={stage.name}>
                      {/* Conversion rate badge between stages */}
                      {convRate && (
                        <div className="flex items-center gap-4 h-6 mb-1">
                          <div className="w-[130px] shrink-0" />
                          <span className="text-[9px] font-label font-bold uppercase tracking-wider text-on-surface-variant">
                            ↓ {convRate} conv.
                          </span>
                        </div>
                      )}

                      {/* Stage bar */}
                      <div
                        className={`flex items-center gap-4 cursor-pointer transition-opacity ${
                          isActive ? "opacity-100" : "opacity-90 hover:opacity-100"
                        }`}
                        onClick={() =>
                          setActiveStage(isActive ? null : stage.name)
                        }
                        style={{ height: 44 }}
                      >
                        {/* Label */}
                        <div className="w-[130px] text-right shrink-0 flex items-center justify-end gap-2">
                          {stage.anomaly && (
                            <span
                              className="w-2 h-2 inline-block animate-pulse shrink-0"
                              style={{
                                background: "#e63b2e",
                                borderRadius: "50%",
                              }}
                            />
                          )}
                          <span
                            className={`text-[9px] font-label font-bold uppercase tracking-[0.1em] ${
                              stage.anomaly
                                ? "text-secondary"
                                : "text-on-surface-variant"
                            }`}
                          >
                            {stage.name}
                          </span>
                        </div>

                        {/* Bar */}
                        <div className="flex-1 relative h-full">
                          <div
                            className="absolute top-0 left-0 h-full flex items-center justify-end px-3 transition-all duration-300"
                            style={{
                              width: `${pct}%`,
                              background: color,
                              border: isActive
                                ? `3px solid #1a1a1a`
                                : `2px solid #1a1a1a`,
                              boxShadow: isActive
                                ? "3px 3px 0 #1a1a1a"
                                : "none",
                            }}
                          >
                            <span
                              className="text-xs font-headline font-black"
                              style={{ color: txtCol }}
                            >
                              {fmt(count)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Drill-down panel */}
            {activeStage && funnel && (() => {
              const stage = funnel.stages.find((s) => s.name === activeStage);
              if (!stage) return null;
              const delta =
                (counters[stage.name] ?? stage.count) - stage.previous_count;
              return (
                <div className="mt-6 border-4 border-primary bg-surface-variant p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] font-label font-black uppercase tracking-[0.15em] text-primary">
                      Stage — {stage.name}
                    </span>
                    <button
                      onClick={() => setActiveStage(null)}
                      className="text-[10px] font-label font-bold uppercase text-on-surface-variant hover:text-primary transition-colors"
                    >
                      Close ✕
                    </button>
                  </div>
                  <div className="flex gap-8 flex-wrap">
                    {[
                      {
                        label: "Current",
                        val: (counters[stage.name] ?? stage.count).toLocaleString(),
                      },
                      {
                        label: "Previous",
                        val: stage.previous_count.toLocaleString(),
                      },
                      {
                        label: "Change",
                        val: `${delta >= 0 ? "+" : ""}${delta.toLocaleString()}`,
                      },
                    ].map(({ label, val }) => (
                      <div key={label}>
                        <div className="text-[9px] font-label uppercase tracking-wider text-on-surface-variant mb-1">
                          {label}
                        </div>
                        <div className="text-2xl font-headline font-black text-primary">
                          {val}
                        </div>
                      </div>
                    ))}

                    {stage.anomaly && (
                      <div className="border-l-4 border-secondary pl-6">
                        <div className="text-[9px] font-label font-black uppercase tracking-wider text-secondary mb-1">
                          ⚠ Anomaly
                        </div>
                        <p className="text-xs text-on-surface-variant mb-2">
                          {stage.anomaly_reason}
                        </p>
                        <Link
                          href={`/ask-anything?q=${encodeURIComponent(
                            `Why is ${stage.name} showing an anomaly?`
                          )}`}
                          className="text-[11px] font-label font-bold uppercase tracking-wider text-secondary no-underline hover:underline"
                        >
                          Investigate →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </section>

        {/* PERFORMANCE TABLES */}
        <div className="grid grid-cols-2 gap-4">
          {/* Channel Performance */}
          <section className="border-4 border-primary neo-shadow">
            <div className="border-b-4 border-primary px-5 py-3">
              <h3 className="text-[10px] font-label font-black uppercase tracking-[0.12em] text-primary">
                Performance by Channel
              </h3>
            </div>
            {/* Header */}
            <div
              className="grid px-5 py-2 bg-surface-variant border-b-2 border-primary"
              style={{
                gridTemplateColumns: "1fr 68px 68px 52px 68px",
              }}
            >
              {["Channel", "Leads", "MQLs", "Sales", "Conv %"].map((h, i) => (
                <span
                  key={h}
                  className={`text-[9px] font-label font-bold uppercase tracking-widest text-on-surface-variant ${
                    i > 0 ? "text-right" : ""
                  }`}
                >
                  {h}
                </span>
              ))}
            </div>
            {/* Rows */}
            {loading ? (
              <div className="p-4 flex flex-col gap-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-8 bg-surface-variant animate-pulse" />
                ))}
              </div>
            ) : funnel ? (
              Object.entries(funnel.channel_breakdown).map(([ch, data], i, arr) => {
                const color = CHANNEL_COLORS[ch] ?? "#06B6D4";
                const conv = ((data.sales / (data.leads || 1)) * 100).toFixed(1);
                return (
                  <div
                    key={ch}
                    className={`grid px-5 py-3 items-center ${
                      i < arr.length - 1
                        ? "border-b-2 border-outline-variant"
                        : ""
                    }`}
                    style={{
                      gridTemplateColumns: "1fr 68px 68px 52px 68px",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 shrink-0 inline-block"
                        style={{ background: color }}
                      />
                      <span className="text-xs font-body text-on-surface">
                        {ch}
                      </span>
                    </div>
                    <span className="text-right text-xs font-headline font-bold text-primary">
                      {data.leads.toLocaleString()}
                    </span>
                    <span className="text-right text-xs font-headline font-bold text-primary">
                      {data.mqls.toLocaleString()}
                    </span>
                    <span
                      className="text-right text-xs font-headline font-bold"
                      style={{ color }}
                    >
                      {data.sales}
                    </span>
                    <span className="text-right text-xs font-headline font-bold text-on-surface-variant">
                      {conv}%
                    </span>
                  </div>
                );
              })
            ) : null}
          </section>

          {/* Segment Performance */}
          <section className="border-4 border-primary neo-shadow">
            <div className="border-b-4 border-primary px-5 py-3">
              <h3 className="text-[10px] font-label font-black uppercase tracking-[0.12em] text-primary">
                Performance by Segment
              </h3>
            </div>
            {/* Header */}
            <div
              className="grid px-5 py-2 bg-surface-variant border-b-2 border-primary"
              style={{
                gridTemplateColumns: "1fr 90px 90px",
              }}
            >
              {["Segment", "Accounts", "Conv %"].map((h, i) => (
                <span
                  key={h}
                  className={`text-[9px] font-label font-bold uppercase tracking-widest text-on-surface-variant ${
                    i > 0 ? "text-right" : ""
                  }`}
                >
                  {h}
                </span>
              ))}
            </div>
            {/* Rows */}
            {loading ? (
              <div className="p-4 flex flex-col gap-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-8 bg-surface-variant animate-pulse" />
                ))}
              </div>
            ) : funnel ? (
              Object.entries(funnel.segment_breakdown).map(([seg, data], i, arr) => {
                const color = SEGMENT_COLORS[seg] ?? "#06B6D4";
                return (
                  <div
                    key={seg}
                    className={`grid px-5 py-3 items-center ${
                      i < arr.length - 1
                        ? "border-b-2 border-outline-variant"
                        : ""
                    }`}
                    style={{
                      gridTemplateColumns: "1fr 90px 90px",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 shrink-0 inline-block"
                        style={{ background: color }}
                      />
                      <span className="text-xs font-body text-on-surface">
                        {seg}
                      </span>
                    </div>
                    <span className="text-right text-xs font-headline font-bold text-primary">
                      {data.count.toLocaleString()}
                    </span>
                    <span
                      className="text-right text-xs font-headline font-bold"
                      style={{ color }}
                    >
                      {(data.conversion_rate * 100).toFixed(1)}%
                    </span>
                  </div>
                );
              })
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
