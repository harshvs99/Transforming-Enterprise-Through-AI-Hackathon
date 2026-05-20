"use client";

import { useState, useEffect } from "react";
import { fetchConnectors, configureConnector, testConnector, syncConnector } from "@/lib/apiCache";

interface ConnectorField {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "textarea";
  placeholder: string;
  required: boolean;
}

interface Connector {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  configured: boolean;
  status: "disconnected" | "configured" | "connected";
  last_sync: string | null;
  record_count: number;
  fields: ConnectorField[];
  dev_mode: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  connected:    "bg-tertiary text-white",
  configured:   "bg-secondary text-white",
  disconnected: "bg-surface text-on-surface-variant",
};

function ConnectorCard({ connector, onRefresh }: { connector: Connector; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm]         = useState<Record<string, string>>({});
  const [saving, setSaving]     = useState(false);
  const [testing, setTesting]   = useState(false);
  const [syncing, setSyncing]   = useState(false);
  const [msg, setMsg]           = useState<{ text: string; ok: boolean } | null>(null);

  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await configureConnector(connector.id, form);
      flash("Configuration saved.", true);
      onRefresh();
    } catch {
      flash("Failed to save — check backend.", false);
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const r = await testConnector(connector.id);
      flash(r.message || "Connection successful.", true);
      onRefresh();
    } catch {
      flash("Connection test failed.", false);
    } finally { setTesting(false); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await syncConnector(connector.id);
      flash(`Synced ${r.record_count?.toLocaleString()} records.`, true);
      onRefresh();
    } catch {
      flash("Sync failed.", false);
    } finally { setSyncing(false); }
  };

  return (
    <div className="border-4 border-primary bg-white neo-shadow overflow-hidden">
      <div className="p-5 flex items-start gap-4">
        <div className="w-11 h-11 bg-primary-fixed border-2 border-primary flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-primary">{connector.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-headline font-bold uppercase text-base text-primary">{connector.name}</h3>
            <span className="font-mono text-[9px] uppercase text-on-surface-variant border border-primary px-2 py-0.5">{connector.category}</span>
            {connector.dev_mode && <span className="font-mono text-[9px] uppercase bg-secondary text-white px-2 py-0.5">DEV</span>}
          </div>
          <p className="text-xs font-body text-on-surface-variant mt-0.5 leading-snug">{connector.description}</p>
          {connector.last_sync && (
            <p className="font-mono text-[10px] text-on-surface-variant mt-1">
              Last sync: {new Date(connector.last_sync).toLocaleString()}
              {connector.record_count > 0 && ` · ${connector.record_count.toLocaleString()} records`}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`font-headline font-bold text-[10px] uppercase px-2 py-1 ${STATUS_COLOR[connector.status]}`}>
            {connector.status}
          </span>
          <button
            onClick={() => setExpanded(v => !v)}
            className="font-headline font-bold text-[10px] uppercase border-2 border-primary px-3 py-1 bg-surface hover:bg-primary hover:text-white transition-colors"
          >
            {expanded ? "Close" : "Configure"}
          </button>
        </div>
      </div>

      {connector.status === "connected" && !expanded && (
        <div className="border-t-2 border-primary px-5 py-3 bg-primary-fixed flex gap-3">
          <button onClick={handleSync} disabled={syncing}
            className="font-headline font-bold text-[10px] uppercase border-2 border-primary px-4 py-2 bg-white hover:bg-primary hover:text-white transition-colors disabled:opacity-50">
            {syncing ? "Syncing…" : "Sync Now"}
          </button>
          <button onClick={() => setExpanded(true)}
            className="font-headline font-bold text-[10px] uppercase border-2 border-primary px-4 py-2 bg-white hover:bg-primary hover:text-white transition-colors">
            Edit Config
          </button>
        </div>
      )}

      {expanded && (
        <div className="border-t-2 border-primary p-5 bg-surface space-y-4">
          {connector.dev_mode && (
            <div className="border-2 border-secondary p-3 bg-white">
              <p className="font-headline font-bold uppercase text-[10px] text-secondary">DEV Mode — Simulated Data</p>
              <p className="font-mono text-xs text-on-surface-variant mt-1">
                Credentials are saved but not used. Real API calls are replaced with realistic simulated data.
                Set <code>DEV_MODE=false</code> on the backend to connect to real services.
              </p>
            </div>
          )}
          <form onSubmit={handleSave} className="space-y-3">
            {connector.fields.map((field) => (
              <div key={field.key}>
                <label className="block font-headline font-bold uppercase text-[10px] text-on-surface-variant mb-1">
                  {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    value={form[field.key] || ""}
                    onChange={(e) => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    rows={4}
                    className="w-full bg-white border-2 border-primary p-3 font-mono text-xs focus:outline-none resize-y"
                  />
                ) : (
                  <input
                    type={field.type}
                    value={form[field.key] || ""}
                    onChange={(e) => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full bg-white border-2 border-primary p-3 font-mono text-sm focus:outline-none"
                  />
                )}
              </div>
            ))}
            {msg && (
              <div className={`border-2 p-3 font-mono text-xs ${msg.ok ? "border-tertiary bg-green-50 text-tertiary" : "border-red-500 bg-red-50 text-red-700"}`}>
                {msg.text}
              </div>
            )}
            <div className="flex gap-3 pt-1 flex-wrap">
              <button type="submit" disabled={saving}
                className="font-headline font-bold uppercase text-xs border-2 border-primary bg-primary text-white px-5 py-2 disabled:opacity-50"
                style={{ boxShadow: "2px 2px 0 rgba(26,26,26,1)" }}>
                {saving ? "Saving…" : "Save Configuration"}
              </button>
              <button type="button" onClick={handleTest} disabled={testing}
                className="font-headline font-bold uppercase text-xs border-2 border-primary bg-white px-5 py-2 disabled:opacity-50 hover:bg-primary hover:text-white transition-colors"
                style={{ boxShadow: "2px 2px 0 rgba(26,26,26,1)" }}>
                {testing ? "Testing…" : "Test Connection"}
              </button>
              {(connector.configured || connector.dev_mode) && (
                <button type="button" onClick={handleSync} disabled={syncing}
                  className="font-headline font-bold uppercase text-xs border-2 border-primary bg-white px-5 py-2 disabled:opacity-50 hover:bg-primary hover:text-white transition-colors"
                  style={{ boxShadow: "2px 2px 0 rgba(26,26,26,1)" }}>
                  {syncing ? "Syncing…" : "Sync Data"}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function ConnectorStudioPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await fetchConnectors();
      setConnectors(data);
    } catch {
      setError("Could not reach backend. Is it running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const connected  = connectors.filter(c => c.status === "connected").length;
  const configured = connectors.filter(c => c.configured || c.dev_mode).length;

  return (
    <div className="bg-background min-h-screen">
      <header className="bg-background border-b-4 border-primary px-6 lg:px-10 py-4 sticky top-0 z-40">
        <h1 className="font-headline font-black text-2xl uppercase tracking-tighter text-primary">Connector Studio</h1>
        <p className="font-headline font-bold text-xs uppercase text-on-surface-variant mt-1">Build and manage data connections</p>
      </header>

      <div className="p-6 lg:p-10 space-y-6 max-w-4xl mx-auto">
        {!loading && connectors.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Connectors", value: connectors.length },
              { label: "Configured",       value: configured },
              { label: "Connected",        value: connected },
            ].map(({ label, value }) => (
              <div key={label} className="border-4 border-primary p-4 bg-white neo-shadow text-center">
                <div className="font-headline font-black text-3xl text-primary">{value}</div>
                <div className="font-mono text-[10px] uppercase text-on-surface-variant mt-1">{label}</div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="border-4 border-primary p-12 bg-primary-fixed text-center neo-shadow">
            <span className="material-symbols-outlined text-5xl text-primary animate-pulse block mb-3">sync</span>
            <p className="font-headline font-bold uppercase text-primary">Loading connectors…</p>
          </div>
        )}

        {error && (
          <div className="border-4 border-red-500 p-6 bg-red-50 neo-shadow">
            <p className="font-headline font-bold uppercase text-xs text-red-600 mb-1">Error</p>
            <p className="font-mono text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && connectors.map(c => (
          <ConnectorCard key={c.id} connector={c} onRefresh={load} />
        ))}
      </div>
    </div>
  );
}
