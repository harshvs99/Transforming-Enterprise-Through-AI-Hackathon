"use client";

import { useState, useEffect } from "react";
import { fetchFunnel } from "@/lib/apiCache";

const CHANNEL_COLORS: Record<string, string> = {
  "LinkedIn":   "#3B82F6",
  "Google Ads": "#06B6D4",
  "Meta":       "#A855F7",
  "Email":      "#F59E0B",
  "Direct":     "#10B981",
};

interface ChannelData {
  leads: number;
  mqls: number;
  sales: number;
}

interface FunnelData {
  channels: string[];
  channel_breakdown: Record<string, ChannelData>;
  key_metrics: { cac: number; ltv: number; ltv_cac_ratio: number; pipeline_value: number };
  stages: Array<{ name: string; count: number; anomaly: boolean }>;
}

function ChannelNode({ name, data, maxLeads, isSelected, onClick }: {
  name: string; data: ChannelData; maxLeads: number; isSelected: boolean; onClick: () => void;
}) {
  const color  = CHANNEL_COLORS[name] || "#6B7280";
  const size   = Math.max(60, Math.round((data.leads / maxLeads) * 120));
  const convRate = data.leads > 0 ? ((data.sales / data.leads) * 100).toFixed(1) : "0";
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 transition-transform hover:scale-105 ${isSelected ? "scale-110" : ""}`}
    >
      <div
        className={`rounded-full border-4 flex items-center justify-center font-headline font-black text-white transition-all ${isSelected ? "border-primary" : "border-transparent"}`}
        style={{ width: size, height: size, backgroundColor: color, fontSize: Math.max(10, size / 7) }}
      >
        {data.leads.toLocaleString()}
      </div>
      <div className="text-center">
        <p className="font-headline font-bold uppercase text-xs text-primary">{name}</p>
        <p className="font-mono text-[10px] text-on-surface-variant">{convRate}% conv.</p>
      </div>
    </button>
  );
}

export default function ChannelConstellationPage() {
  const [data, setData]         = useState<FunnelData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("30d");

  const load = async (tr: string) => {
    setLoading(true);
    try {
      const d = await fetchFunnel(tr);
      setData(d);
    } catch {
      setError("Could not load channel data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(timeRange); }, [timeRange]);

  const channels = data?.channel_breakdown ?? {};
  const maxLeads = Math.max(...Object.values(channels).map(c => c.leads), 1);
  const selectedData = selected ? channels[selected] : null;
  const totalLeads = Object.values(channels).reduce((s, c) => s + c.leads, 0);
  const totalSales = Object.values(channels).reduce((s, c) => s + c.sales, 0);

  return (
    <div className="bg-background min-h-screen">
      <header className="bg-background border-b-4 border-primary px-6 lg:px-10 py-4 sticky top-0 z-40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-headline font-black text-xl sm:text-2xl uppercase tracking-tighter text-primary">Channel Constellation</h1>
            <p className="font-headline font-bold text-xs uppercase text-on-surface-variant mt-1">Visualize acquisition channel performance</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {["7d","30d","Quarter","YTD"].map(tr => (
              <button key={tr} onClick={() => setTimeRange(tr)}
                className={`font-headline font-bold text-[10px] uppercase border-2 border-primary px-3 py-1 transition-colors ${timeRange===tr ? "bg-primary text-white" : "bg-white hover:bg-primary hover:text-white"}`}>
                {tr}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="p-6 lg:p-10 space-y-8 max-w-5xl mx-auto">
        {loading && (
          <div className="border-4 border-primary p-12 bg-primary-fixed text-center neo-shadow">
            <span className="material-symbols-outlined text-5xl text-primary animate-pulse block mb-3">hub</span>
            <p className="font-headline font-bold uppercase text-primary">Loading channel data…</p>
          </div>
        )}

        {error && <div className="border-4 border-red-500 p-6 bg-red-50 neo-shadow"><p className="font-mono text-sm text-red-700">{error}</p></div>}

        {data && !loading && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Leads",     value: totalLeads.toLocaleString() },
                { label: "Total Closed-Won",value: totalSales.toLocaleString() },
                { label: "Overall Conv.",   value: totalLeads > 0 ? `${((totalSales/totalLeads)*100).toFixed(1)}%` : "—" },
                { label: "Active Channels", value: Object.keys(channels).length },
              ].map(({ label, value }) => (
                <div key={label} className="border-4 border-primary p-4 bg-white neo-shadow text-center">
                  <div className="font-headline font-black text-2xl text-primary">{value}</div>
                  <div className="font-mono text-[10px] uppercase text-on-surface-variant mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* Constellation canvas */}
            <div className="border-4 border-primary p-8 bg-surface neo-shadow">
              <p className="font-headline font-bold uppercase text-xs text-on-surface-variant mb-6 text-center">
                Node size = lead volume · Click a channel for details
              </p>
              <div className="flex flex-wrap items-end justify-center gap-8 py-4 min-h-48">
                {Object.entries(channels).map(([name, cdata]) => (
                  <ChannelNode
                    key={name}
                    name={name}
                    data={cdata}
                    maxLeads={maxLeads}
                    isSelected={selected === name}
                    onClick={() => setSelected(selected === name ? null : name)}
                  />
                ))}
              </div>
            </div>

            {/* Selected channel detail */}
            {selected && selectedData && (
              <div className="border-4 border-primary p-6 bg-white neo-shadow-lg" style={{borderLeftColor: CHANNEL_COLORS[selected], borderLeftWidth: 8}}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-headline font-black text-xl uppercase text-primary">{selected}</h3>
                  <button onClick={() => setSelected(null)} className="font-mono text-xs text-on-surface-variant hover:text-primary">✕ close</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Leads",      value: selectedData.leads.toLocaleString() },
                    { label: "MQLs",       value: selectedData.mqls.toLocaleString() },
                    { label: "Closed-Won", value: selectedData.sales.toLocaleString() },
                  ].map(({ label, value }) => (
                    <div key={label} className="border-2 border-primary p-4 text-center bg-surface">
                      <div className="font-headline font-black text-2xl text-primary">{value}</div>
                      <div className="font-mono text-[10px] uppercase text-on-surface-variant mt-1">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t-2 border-primary">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs text-on-surface-variant">Lead → MQL rate</span>
                    <span className="font-headline font-bold text-primary">
                      {selectedData.leads > 0 ? ((selectedData.mqls/selectedData.leads)*100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-mono text-xs text-on-surface-variant">MQL → Closed-Won rate</span>
                    <span className="font-headline font-bold text-primary">
                      {selectedData.mqls > 0 ? ((selectedData.sales/selectedData.mqls)*100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-mono text-xs text-on-surface-variant">Share of total leads</span>
                    <span className="font-headline font-bold text-primary">
                      {totalLeads > 0 ? ((selectedData.leads/totalLeads)*100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Channel comparison table */}
            <div className="border-4 border-primary bg-white neo-shadow overflow-hidden">
              <div className="border-b-2 border-primary px-5 py-3 bg-surface">
                <p className="font-headline font-bold uppercase text-xs text-on-surface-variant">Channel Performance Breakdown</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-primary bg-primary-fixed">
                      {["Channel","Leads","MQLs","Closed-Won","Lead→Sale %","Share"].map(h => (
                        <th key={h} className="p-3 font-headline font-bold uppercase text-[10px] text-left text-on-surface-variant">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(channels).sort((a,b) => b[1].leads - a[1].leads).map(([name, cdata]) => (
                      <tr key={name} className="border-b border-primary hover:bg-primary-fixed transition-colors cursor-pointer"
                        onClick={() => setSelected(selected === name ? null : name)}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{backgroundColor: CHANNEL_COLORS[name]}}></div>
                            <span className="font-headline font-bold uppercase text-xs text-primary">{name}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-sm">{cdata.leads.toLocaleString()}</td>
                        <td className="p-3 font-mono text-sm">{cdata.mqls.toLocaleString()}</td>
                        <td className="p-3 font-mono text-sm">{cdata.sales.toLocaleString()}</td>
                        <td className="p-3 font-mono text-sm">
                          {cdata.leads > 0 ? ((cdata.sales/cdata.leads)*100).toFixed(1) : 0}%
                        </td>
                        <td className="p-3 font-mono text-sm">
                          {totalLeads > 0 ? ((cdata.leads/totalLeads)*100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
