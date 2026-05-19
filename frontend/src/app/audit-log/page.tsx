"use client";

import { useState, useEffect, useRef } from "react";
import { fetchAuditLog } from "@/lib/apiCache";

interface AuditEvent {
  timestamp: string;
  action: string;
  detail: string;
  level: "info" | "success" | "warning" | "error";
}

const LEVEL_STYLE: Record<string, { icon: string; cls: string }> = {
  success: { icon: "check_circle", cls: "text-tertiary" },
  info:    { icon: "info",         cls: "text-primary" },
  warning: { icon: "warning",      cls: "text-secondary" },
  error:   { icon: "error",        cls: "text-red-500" },
};

function EventRow({ event }: { event: AuditEvent }) {
  const { icon, cls } = LEVEL_STYLE[event.level] ?? LEVEL_STYLE.info;
  const ts = new Date(event.timestamp);
  return (
    <div className="border-4 border-primary p-4 neo-shadow bg-white hover:bg-primary-fixed transition-colors flex items-start gap-4">
      <span className={`material-symbols-outlined flex-shrink-0 pt-0.5 ${cls}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-headline font-bold uppercase text-xs text-primary">{event.action}</span>
          <span className={`font-mono text-[9px] uppercase px-2 py-0.5 border ${
            event.level === "success" ? "border-tertiary text-tertiary" :
            event.level === "warning" ? "border-secondary text-secondary" :
            event.level === "error"   ? "border-red-500 text-red-500" :
            "border-primary text-primary"
          }`}>{event.level}</span>
        </div>
        <p className="font-body text-sm text-on-surface-variant mt-0.5">{event.detail}</p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="font-mono text-[10px] text-on-surface-variant">{ts.toLocaleTimeString()}</p>
        <p className="font-mono text-[9px] text-on-surface-variant">{ts.toLocaleDateString()}</p>
      </div>
    </div>
  );
}

export default function AuditLogPage() {
  const [events, setEvents]           = useState<AuditEvent[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter]           = useState("all");
  const intervalRef                   = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    try {
      const data = await fetchAuditLog(100);
      setEvents(data);
      setError(null);
    } catch {
      setError("Could not reach backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    if (autoRefresh) intervalRef.current = setInterval(load, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  const filtered = filter === "all" ? events : events.filter(e => e.level === filter);
  const counts   = { total: events.length, success: events.filter(e=>e.level==="success").length, warning: events.filter(e=>e.level==="warning").length, error: events.filter(e=>e.level==="error").length };

  return (
    <div className="bg-background min-h-screen">
      <header className="bg-background border-b-4 border-primary px-6 lg:px-10 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline font-black text-2xl uppercase tracking-tighter text-primary">Audit Log</h1>
            <p className="font-headline font-bold text-xs uppercase text-on-surface-variant mt-1">Complete activity and change history</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="w-4 h-4 border-2 border-primary" />
              <span className="font-mono text-[10px] uppercase text-on-surface-variant">Live</span>
            </label>
            <button onClick={load} className="font-headline font-bold text-[10px] uppercase border-2 border-primary px-3 py-2 bg-white hover:bg-primary hover:text-white transition-colors">
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total", value: counts.total,   color: "text-primary" },
            { label: "OK",    value: counts.success, color: "text-tertiary" },
            { label: "Warn",  value: counts.warning, color: "text-secondary" },
            { label: "Error", value: counts.error,   color: "text-red-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="border-4 border-primary p-4 bg-white neo-shadow text-center">
              <div className={`font-headline font-black text-3xl ${color}`}>{value}</div>
              <div className="font-mono text-[10px] uppercase text-on-surface-variant mt-1">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {["all","success","info","warning","error"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`font-headline font-bold text-[10px] uppercase border-2 border-primary px-3 py-1 transition-colors ${filter===f ? "bg-primary text-white" : "bg-white hover:bg-primary hover:text-white"}`}>
              {f}
            </button>
          ))}
        </div>

        {loading && (
          <div className="border-4 border-primary p-10 text-center bg-primary-fixed neo-shadow">
            <span className="material-symbols-outlined text-4xl text-primary animate-pulse block mb-2">history</span>
            <p className="font-headline font-bold uppercase text-primary">Loading events…</p>
          </div>
        )}

        {error && <div className="border-4 border-red-500 p-6 bg-red-50 neo-shadow"><p className="font-mono text-sm text-red-700">{error}</p></div>}

        {!loading && filtered.length === 0 && !error && (
          <div className="border-4 border-dashed border-primary p-10 text-center bg-surface">
            <span className="material-symbols-outlined text-5xl text-primary opacity-30 block mb-2">history</span>
            <p className="font-headline font-bold uppercase text-on-surface-variant">No events yet — use the platform to generate logs</p>
          </div>
        )}

        <div className="space-y-3">{filtered.map((e, i) => <EventRow key={i} event={e} />)}</div>
      </div>
    </div>
  );
}
