"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchHealth } from "@/lib/apiCache";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "grid_view" },
  { href: "/ask-anything", label: "Ask Anything", icon: "chat" },
  { href: "/pipeline-overview", label: "Pipeline", icon: "account_tree" },
  { href: "/metric-mapping", label: "Metrics", icon: "analytics" },
  { href: "/tool-registry", label: "Tools", icon: "build" },
  { href: "/data-ingestion", label: "Ingestion", icon: "upload" },
  { href: "/connector-studio", label: "Connectors", icon: "schema" },
  { href: "/hypothesis-lab", label: "Hypotheses", icon: "lightbulb" },
  { href: "/audit-log", label: "Audit Log", icon: "history" },
  { href: "/channel-constellation", label: "Channels", icon: "hub" },
  { href: "/synthesis-complete", label: "Synthesis", icon: "check_circle" },
  { href: "/initialize-brain", label: "Initialize", icon: "settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [llmStatus, setLlmStatus] = useState<{ enabled: boolean; model: string } | null>(null);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const h = await fetchHealth();
        if (alive) setLlmStatus({ enabled: h.llm_enabled, model: h.model });
      } catch {
        if (alive) setLlmStatus({ enabled: false, model: "unreachable" });
      }
    };
    poll();
    const id = setInterval(poll, 15_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const isActive = (href: string) => {
    if (href === "/" && pathname === "/") return true;
    return pathname.startsWith(href);
  };

  return (
    <aside className="flex flex-col h-screen w-72 border-r-4 border-primary bg-surface p-4 gap-2 shrink-0 z-20 overflow-y-auto animate-in slide-in-from-left duration-400">
      <div className="mb-8 mt-4 px-4">
        <h1 className="text-2xl font-headline font-black uppercase text-primary tracking-tighter">
          Thinking Machines
        </h1>
        <p className="font-mono text-xs text-on-surface-variant mt-1">Enterprise Analytics v2.5</p>
      </div>

      <Link
        href="/ask-anything"
        className="w-full bg-primary-fixed text-on-primary-fixed border-4 border-primary neo-shadow px-4 py-3 font-label font-bold uppercase text-xs tracking-widest mb-6 transition-all duration-300 ease-out hover:translate-x-1 hover:translate-y-1 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-dashed focus-visible:outline-primary"
      >
        New Analysis
      </Link>

      <nav className="flex-1 flex flex-col gap-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-3 flex items-center gap-3 border-2 font-label font-bold uppercase text-xs tracking-widest transition-all duration-300 ease-out focus-visible:outline-2 focus-visible:outline-dashed focus-visible:outline-primary ${
                active
                  ? "bg-primary-fixed text-on-primary-fixed border-primary neo-shadow"
                  : "text-primary border-transparent hover:border-primary hover:bg-surface-container-high hover:translate-x-1"
              }`}
            >
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              {item.label}
              {active && <span className="material-symbols-outlined text-lg ml-auto">check</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t-2 border-primary px-4 py-4 space-y-3">
        {/* LLM status light */}
        <div className="flex items-center gap-2">
          {llmStatus === null ? (
            <span className="w-2.5 h-2.5 rounded-full bg-on-surface-variant animate-pulse flex-shrink-0" />
          ) : llmStatus.enabled ? (
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_6px_2px_rgba(34,197,94,0.5)] flex-shrink-0" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase text-on-surface-variant tracking-widest leading-tight">
              {llmStatus === null
                ? "Checking LLM…"
                : llmStatus.enabled
                  ? "LLM Active"
                  : "Deterministic Mode"}
            </p>
            {llmStatus && (
              <p className="font-mono text-[8px] text-on-surface-variant opacity-60 truncate">
                {llmStatus.model}
              </p>
            )}
          </div>
        </div>
        <div className="text-[10px] font-mono uppercase text-on-surface-variant tracking-widest">
          <p>© 2026 Thinking Machines</p>
        </div>
      </div>
    </aside>
  );
}
