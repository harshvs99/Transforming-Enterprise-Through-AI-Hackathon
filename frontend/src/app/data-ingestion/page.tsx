"use client";

import { useState, useEffect, useRef } from "react";
import { fetchConnectors, syncConnector, fetchConnectorData } from "@/lib/apiCache";
import { apiUrl } from "@/lib/apiBase";

interface Connector {
  id: string;
  name: string;
  icon: string;
  status: string;
  last_sync: string | null;
  record_count: number;
  dev_mode: boolean;
}

interface AuditEvent {
  id: number;
  timestamp: string;
  action: string;
  detail: string;
  level: string;
}

const STATUS_BAR: Record<string, string> = {
  connected:    "bg-tertiary",
  configured:   "bg-secondary",
  disconnected: "bg-on-surface-variant",
};

const LEVEL_DOT: Record<string, string> = {
  success: "bg-green-400",
  warning: "bg-amber-400",
  info:    "bg-blue-400",
};

const LEVEL_TEXT: Record<string, string> = {
  success: "text-green-400",
  warning: "text-amber-400",
  info:    "text-blue-400",
};

const MAX_EVENTS = 80;

export default function DataIngestionPage() {
  const [connectors, setConnectors]           = useState<Connector[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [syncing, setSyncing]                 = useState<Record<string, boolean>>({});
  const [preview, setPreview]                 = useState<Record<string, any>>({});
  const [previewLoading, setPreviewLoading]   = useState<Record<string, boolean>>({});
  const [auditEvents, setAuditEvents]         = useState<AuditEvent[]>([]);
  const [streamConnected, setStreamConnected] = useState(false);
  const eventIdRef = useRef(0);
  const feedRef    = useRef<HTMLDivElement>(null);

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

  // Connect to the real audit SSE stream
  useEffect(() => {
    const es = new EventSource(apiUrl("/api/audit/stream"));
    es.onopen  = () => setStreamConnected(true);
    es.onerror = () => setStreamConnected(false);
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        const id = ++eventIdRef.current;
        setAuditEvents(prev => [{ ...ev, id }, ...prev].slice(0, MAX_EVENTS));
      } catch {}
    };
    return () => { es.close(); setStreamConnected(false); };
  }, []);

  const handleSync = async (id: string) => {
    setSyncing(s => ({ ...s, [id]: true }));
    try { await syncConnector(id); await load(); }
    finally { setSyncing(s => ({ ...s, [id]: false })); }
  };

  const handlePreview = async (id: string) => {
    if (preview[id]) { setPreview(p => { const n = {...p}; delete n[id]; return n; }); return; }
    setPreviewLoading(p => ({ ...p, [id]: true }));
    try {
      const data = await fetchConnectorData(id);
      setPreview(p => ({ ...p, [id]: data }));
    } finally { setPreviewLoading(p => ({ ...p, [id]: false })); }
  };

  const totalRecords = connectors.reduce((s, c) => s + (c.record_count || 0), 0);
  const connected    = connectors.filter(c => c.status === "connected").length;

  return (
    <div className="bg-background min-h-screen">
      <header className="bg-background border-b-4 border-primary px-6 lg:px-10 py-4 sticky top-0 z-40">
        <h1 className="font-headline font-black text-2xl uppercase tracking-tighter text-primary">Data Ingestion</h1>
        <p className="font-headline font-bold text-xs uppercase text-on-surface-variant mt-1">Stream and manage data source imports</p>
      </header>

      <div className="p-6 lg:p-10 space-y-8 max-w-5xl mx-auto">

        {/* Summary stats */}
        {!loading && connectors.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Stored Records",  value: totalRecords.toLocaleString() },
              { label: "Active Sources",  value: connected },
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

        {/* System activity feed */}
        <div className="border-4 border-primary bg-white neo-shadow overflow-hidden">
          <div className="bg-primary px-5 py-3 flex items-center gap-3">
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                streamConnected
                  ? "bg-green-400 shadow-[0_0_6px_2px_rgba(74,222,128,0.6)]"
                  : "bg-amber-300 animate-pulse"
              }`}
            />
            <h2 className="font-headline font-black uppercase text-sm text-white tracking-tight flex-1">
              System Activity
            </h2>
            <span className="font-mono text-[9px] text-white opacity-70 uppercase">
              {streamConnected ? "Live — audit log" : "Connecting…"}
            </span>
          </div>

          <div
            ref={feedRef}
            className="h-72 overflow-y-auto bg-gray-950 font-mono text-[11px] leading-relaxed p-3 space-y-1"
          >
            {auditEvents.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                {streamConnected ? "Waiting for system events — run a query to see activity" : "Connecting to audit stream…"}
              </p>
            )}
            {auditEvents.map(ev => (
              <div
                key={ev.id}
                className="flex items-start gap-2 border-b border-gray-800 pb-1 animate-in fade-in duration-200"
              >
                <span className="text-gray-500 text-[9px] tabular-nums shrink-0 pt-0.5">
                  {new Date(ev.timestamp).toLocaleTimeString()}
                </span>
                <span className={`shrink-0 pt-0.5 ${LEVEL_DOT[ev.level] ?? "bg-gray-500"} w-1.5 h-1.5 rounded-full mt-1`} />
                <span className="text-gray-300 shrink-0">[{ev.action}]</span>
                <span className={`${LEVEL_TEXT[ev.level] ?? "text-gray-400"} flex-1 min-w-0 truncate`}>
                  {ev.detail}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-gray-900 px-4 py-2 flex gap-4 text-[9px] font-mono text-gray-400 uppercase">
            <span>{auditEvents.length} events</span>
            <span>·</span>
            <span>Real system events — queries, syncs, investigations</span>
          </div>
        </div>

        {/* Connector cards */}
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

              <div className="h-1 bg-surface">
                <div className={`h-full ${STATUS_BAR[c.status] ?? "bg-on-surface-variant"} transition-all`}
                  style={{width: c.status === "connected" ? "100%" : c.status === "configured" ? "50%" : "10%"}} />
              </div>

              {preview[c.id] && (
                <div className="border-t-2 border-primary p-4 bg-surface space-y-3">
                  <p className="font-headline font-bold uppercase text-[10px] text-on-surface-variant">
                    Data Preview — {preview[c.id].record_count?.toLocaleString()} records · {c.dev_mode ? "Simulated" : "Live"}
                  </p>
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
