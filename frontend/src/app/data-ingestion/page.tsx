"use client";

import { useState, useEffect } from "react";
import { fetchConnectors, syncConnector, fetchConnectorData } from "@/lib/apiCache";

interface Connector {
  id: string;
  name: string;
  icon: string;
  status: string;
  last_sync: string | null;
  record_count: number;
  dev_mode: boolean;
}

const STATUS_BAR: Record<string, string> = {
  connected:    "bg-tertiary",
  configured:   "bg-secondary",
  disconnected: "bg-on-surface-variant",
};

export default function DataIngestionPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [syncing, setSyncing]       = useState<Record<string, boolean>>({});
  const [preview, setPreview]       = useState<Record<string, any>>({});
  const [previewLoading, setPreviewLoading] = useState<Record<string, boolean>>({});

  const load = async () => {
    try {
      const data = await fetchConnectors();
      setConnectors(data);
    } catch {
      setError("Could not reach backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSync = async (id: string) => {
    setSyncing(s => ({ ...s, [id]: true }));
    try {
      await syncConnector(id);
      await load();
    } finally {
      setSyncing(s => ({ ...s, [id]: false }));
    }
  };

  const handlePreview = async (id: string) => {
    if (preview[id]) { setPreview(p => { const n = {...p}; delete n[id]; return n; }); return; }
    setPreviewLoading(p => ({ ...p, [id]: true }));
    try {
      const data = await fetchConnectorData(id);
      setPreview(p => ({ ...p, [id]: data }));
    } finally {
      setPreviewLoading(p => ({ ...p, [id]: false }));
    }
  };

  const totalRecords = connectors.reduce((s, c) => s + (c.record_count || 0), 0);
  const connected    = connectors.filter(c => c.status === "connected").length;

  return (
    <div className="bg-background min-h-screen">
      <header className="bg-background border-b-4 border-primary px-6 lg:px-10 py-4 sticky top-0 z-40">
        <h1 className="font-headline font-black text-2xl uppercase tracking-tighter text-primary">Data Ingestion</h1>
        <p className="font-headline font-bold text-xs uppercase text-on-surface-variant mt-1">Stream and manage data source imports</p>
      </header>

      <div className="p-6 lg:p-10 space-y-8 max-w-4xl mx-auto">
        {!loading && connectors.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Records",   value: totalRecords.toLocaleString() },
              { label: "Active Streams",  value: connected },
              { label: "Data Sources",    value: connectors.length },
            ].map(({ label, value }) => (
              <div key={label} className="border-4 border-primary p-4 bg-white neo-shadow text-center">
                <div className="font-headline font-black text-3xl text-primary">{value}</div>
                <div className="font-mono text-[10px] uppercase text-on-surface-variant mt-1">{label}</div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="border-4 border-primary p-10 text-center bg-primary-fixed neo-shadow">
            <span className="material-symbols-outlined text-4xl text-primary animate-pulse block mb-2">cloud_download</span>
            <p className="font-headline font-bold uppercase text-primary">Loading streams…</p>
          </div>
        )}

        {error && <div className="border-4 border-red-500 p-6 bg-red-50 neo-shadow"><p className="font-mono text-sm text-red-700">{error}</p></div>}

        <div className="space-y-4">
          {connectors.map(c => (
            <div key={c.id} className="border-4 border-primary bg-white neo-shadow overflow-hidden">
              <div className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 bg-primary-fixed border-2 border-primary flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary text-lg">{c.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-headline font-bold uppercase text-base text-primary">{c.name}</h4>
                    {c.dev_mode && <span className="font-mono text-[9px] bg-secondary text-white px-2 py-0.5 uppercase">DEV</span>}
                  </div>
                  {c.last_sync ? (
                    <p className="font-mono text-[10px] text-on-surface-variant mt-0.5">
                      Last sync: {new Date(c.last_sync).toLocaleString()} · {c.record_count.toLocaleString()} records
                    </p>
                  ) : (
                    <p className="font-mono text-[10px] text-on-surface-variant mt-0.5">Not yet synced</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-headline font-bold text-[10px] uppercase px-2 py-1 text-white ${STATUS_BAR[c.status] ?? "bg-on-surface-variant"}`}>
                    {c.status}
                  </span>
                  <button onClick={() => handleSync(c.id)} disabled={syncing[c.id]}
                    className="font-headline font-bold text-[10px] uppercase border-2 border-primary px-3 py-1 bg-white hover:bg-primary hover:text-white transition-colors disabled:opacity-50">
                    {syncing[c.id] ? "…" : "Sync"}
                  </button>
                  <button onClick={() => handlePreview(c.id)} disabled={previewLoading[c.id]}
                    className="font-headline font-bold text-[10px] uppercase border-2 border-primary px-3 py-1 bg-white hover:bg-primary hover:text-white transition-colors disabled:opacity-50">
                    {previewLoading[c.id] ? "…" : preview[c.id] ? "Hide" : "Preview"}
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-surface">
                <div className={`h-full ${STATUS_BAR[c.status] ?? "bg-on-surface-variant"} transition-all`}
                  style={{width: c.status === "connected" ? "100%" : c.status === "configured" ? "50%" : "10%"}} />
              </div>

              {/* Data preview */}
              {preview[c.id] && (
                <div className="border-t-2 border-primary p-4 bg-surface space-y-3">
                  <p className="font-headline font-bold uppercase text-[10px] text-on-surface-variant">
                    Data Preview — {preview[c.id].record_count?.toLocaleString()} records · {c.dev_mode ? "Simulated" : "Live"}
                  </p>
                  {/* Show stats if available */}
                  {preview[c.id].stats && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(preview[c.id].stats).slice(0, 6).map(([k, v]) => (
                        <div key={k} className="border-2 border-primary p-3 bg-white">
                          <div className="font-headline font-bold uppercase text-[9px] text-on-surface-variant">{k.replace(/_/g," ")}</div>
                          <div className="font-mono text-sm text-primary mt-0.5">
                            {typeof v === "number" ? (v > 1000 ? v.toLocaleString() : v) : String(v)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Raw JSON snippet */}
                  <details className="cursor-pointer">
                    <summary className="font-mono text-[10px] text-on-surface-variant hover:text-primary">View raw data structure</summary>
                    <pre className="mt-2 text-[10px] font-mono text-on-surface-variant bg-white border-2 border-primary p-3 overflow-x-auto max-h-48 overflow-y-auto">
                      {JSON.stringify(preview[c.id], null, 2).substring(0, 2000)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
