"use client";

import { useState, useEffect } from "react";
import { runInitialize, fetchDevMode, setDevMode as apiSetDevMode } from "@/lib/apiCache";
import Link from "next/link";

interface SetupStep {
  step: number;
  title: string;
  status: "ok" | "warning" | "error" | "pending";
  detail: string;
}

const INIT_CACHE_KEY = "initialize_brain_v1";

function loadCache(): { steps: SetupStep[]; allOk: boolean; devMode: boolean; ranAt: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(INIT_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

const STATUS_CONFIG: Record<string, { icon: string; cls: string; bg: string }> = {
  ok:      { icon: "check_circle", cls: "text-tertiary", bg: "bg-primary-fixed" },
  warning: { icon: "warning",      cls: "text-secondary", bg: "bg-yellow-50" },
  error:   { icon: "error",        cls: "text-red-500",   bg: "bg-red-50" },
  pending: { icon: "radio_button_unchecked", cls: "text-on-surface-variant", bg: "bg-white" },
};

const DEV_FEATURES = [
  "Connectors use simulated data — no real credentials needed",
  "Connection tests always pass",
  "Sync pulls from in-memory fixture data",
];

const PROD_FEATURES = [
  "Connectors require real API credentials",
  "Connection tests hit live endpoints",
  "Sync fetches actual data from source systems",
];

export default function InitializeBrainPage() {
  const [steps, setSteps]       = useState<SetupStep[]>([
    { step: 1, title: "Install Dependencies",  status: "pending", detail: "Core system packages and tool libraries" },
    { step: 2, title: "Configure Database",    status: "pending", detail: "SQLite schema creation and index setup" },
    { step: 3, title: "Seed Metrics",          status: "pending", detail: "Load canonical metric definitions" },
    { step: 4, title: "Enable Connectors",     status: "pending", detail: "Activate data source integrations" },
    { step: 5, title: "Initialize Kernel",     status: "pending", detail: "Register deterministic tool suite" },
    { step: 6, title: "Launch System",         status: "pending", detail: "Verify data availability and go live" },
  ]);
  const [running, setRunning]   = useState(false);
  const [done, setDone]         = useState(false);
  const [allOk, setAllOk]       = useState(false);
  const [devMode, setDevMode]   = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [ranAt, setRanAt]       = useState<string | null>(null);

  // Restore cached setup result; fetch live dev-mode state
  useEffect(() => {
    const cached = loadCache();
    if (cached) {
      setSteps(cached.steps);
      setAllOk(cached.allOk);
      setDone(true);
      setRanAt(cached.ranAt);
    } else {
      handleRun();
    }
    fetchDevMode().then(({ dev_mode }) => setDevMode(dev_mode)).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleMode = async () => {
    setToggling(true);
    try {
      const { dev_mode } = await apiSetDevMode(!devMode);
      setDevMode(dev_mode);
    } catch {
      setError("Could not toggle mode — is the backend running?");
    } finally {
      setToggling(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setDone(false);
    setError(null);
    setSteps(prev => prev.map(s => ({ ...s, status: "pending" })));
    try {
      const result = await runInitialize();
      for (let i = 0; i < result.steps.length; i++) {
        await new Promise(r => setTimeout(r, 250));
        setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, ...result.steps[i] } : s));
      }
      setAllOk(result.all_ok);
      setDevMode(result.dev_mode ?? true);
      setDone(true);
      const ts = new Date().toISOString();
      setRanAt(ts);
      try {
        localStorage.setItem(INIT_CACHE_KEY, JSON.stringify({
          steps: result.steps, allOk: result.all_ok, devMode: result.dev_mode ?? true, ranAt: ts,
        }));
      } catch {}
    } catch {
      setError("Could not reach backend. Ensure uvicorn is running.");
    } finally {
      setRunning(false);
    }
  };

  const completedCount = steps.filter(s => s.status === "ok").length;

  return (
    <div className="bg-background min-h-screen">
      <header className="bg-background border-b-4 border-primary px-6 lg:px-10 py-4 sticky top-0 z-40">
        <h1 className="font-headline font-black text-2xl uppercase tracking-tighter text-primary">Initialize System</h1>
        <p className="font-headline font-bold text-xs uppercase text-on-surface-variant mt-1">Setup, configuration, and environment mode</p>
      </header>

      <div className="p-6 lg:p-10 space-y-8 max-w-4xl mx-auto">

        {/* ── Dev / Prod Mode Toggle ── */}
        <div className="border-4 border-primary neo-shadow overflow-hidden">
          <div className="bg-primary px-6 py-3 flex items-center justify-between">
            <span className="font-headline font-black uppercase text-sm text-white tracking-tight">Environment Mode</span>
            <span className="font-mono text-[10px] text-white opacity-70 uppercase">affects connectors &amp; data sources</span>
          </div>

          <div className="p-4 sm:p-6 bg-white flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            {/* Toggle control */}
            <div className="flex sm:flex-col items-center gap-4 sm:gap-2 shrink-0">
              <button
                onClick={handleToggleMode}
                disabled={toggling}
                aria-label="Toggle dev/prod mode"
                className={`relative w-16 h-8 border-4 border-primary transition-colors duration-200 disabled:opacity-50 ${
                  devMode ? "bg-amber-400" : "bg-green-500"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white border-2 border-primary transition-all duration-200 ${
                    devMode ? "left-0.5" : "left-[34px]"
                  }`}
                />
              </button>
              <span className={`font-headline font-black uppercase text-xs ${devMode ? "text-amber-600" : "text-green-600"}`}>
                {toggling ? "…" : devMode ? "DEV" : "PROD"}
              </span>
            </div>

            {/* Mode description */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* DEV column */}
              <div className={`border-2 p-4 transition-colors ${devMode ? "border-amber-400 bg-amber-50" : "border-primary opacity-50 bg-white"}`}>
                <p className="font-headline font-bold uppercase text-xs text-amber-700 mb-2">Dev Mode</p>
                <ul className="space-y-1">
                  {DEV_FEATURES.map(f => (
                    <li key={f} className="font-mono text-[10px] text-on-surface-variant flex gap-1.5">
                      <span className="text-amber-500 shrink-0">·</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
              {/* PROD column */}
              <div className={`border-2 p-4 transition-colors ${!devMode ? "border-green-500 bg-green-50" : "border-primary opacity-50 bg-white"}`}>
                <p className="font-headline font-bold uppercase text-xs text-green-700 mb-2">Prod Mode</p>
                <ul className="space-y-1">
                  {PROD_FEATURES.map(f => (
                    <li key={f} className="font-mono text-[10px] text-on-surface-variant flex gap-1.5">
                      <span className="text-green-500 shrink-0">·</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* ── Status banner ── */}
        {running && (
          <div className="border-4 border-primary p-4 bg-primary-fixed neo-shadow">
            <div className="flex items-center gap-3">
              <span className="inline-block w-5 h-5 border-2 border-primary border-t-transparent loading-spinner" />
              <span className="font-headline font-bold uppercase text-primary">Running setup checks… {completedCount}/{steps.length}</span>
            </div>
          </div>
        )}

        {done && !running && (
          <div className={`border-4 p-6 neo-shadow ${allOk ? "border-tertiary bg-green-50" : "border-secondary bg-yellow-50"}`}>
            <div className="flex items-center gap-3">
              <span className={`material-symbols-outlined text-2xl ${allOk ? "text-tertiary" : "text-secondary"}`}>
                {allOk ? "check_circle" : "warning"}
              </span>
              <div>
                <p className={`font-headline font-bold uppercase ${allOk ? "text-tertiary" : "text-secondary"}`}>
                  {allOk ? "All systems operational" : "Setup complete with warnings"}
                </p>
                <p className="font-mono text-xs text-on-surface-variant mt-0.5">
                  {completedCount}/{steps.length} checks passed
                  {ranAt && ` · Last checked ${new Date(ranAt).toLocaleTimeString()}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="border-4 border-red-500 p-6 bg-red-50 neo-shadow">
            <p className="font-mono text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ── Setup steps ── */}
        <div className="space-y-4">
          {steps.map((item) => {
            const cfg = STATUS_CONFIG[item.status];
            return (
              <div key={item.step} className={`border-4 border-primary p-6 neo-shadow ${cfg.bg} transition-colors`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 border-4 border-primary flex items-center justify-center font-headline font-black text-lg flex-shrink-0 ${
                    item.status === "ok" ? "bg-primary text-white" : "bg-white text-primary"
                  }`}>
                    {item.status === "ok" ? "✓" : item.status === "error" ? "✗" : item.step}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-headline font-bold uppercase text-base text-primary">{item.title}</h3>
                    <p className="text-sm font-body text-on-surface-variant mt-1">{item.detail}</p>
                  </div>
                  {item.status !== "pending" && (
                    <span className={`material-symbols-outlined text-2xl flex-shrink-0 ${cfg.cls}`}>{cfg.icon}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-3">
          <button
            onClick={handleRun}
            disabled={running}
            className="w-full bg-secondary text-white border-4 border-primary p-6 font-headline font-black uppercase neo-shadow hover:neo-shadow-active transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {running ? (
              <span className="flex items-center justify-center gap-3">
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent loading-spinner" />
                Running Setup…
              </span>
            ) : done ? "Re-Run Setup Check" : "Complete Setup & Launch"}
          </button>

          {done && allOk && (
            <Link href="/dashboard"
              className="block w-full text-center bg-primary text-white border-4 border-primary p-5 font-headline font-black uppercase neo-shadow hover:neo-shadow-active transition-all">
              Go to Dashboard →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
