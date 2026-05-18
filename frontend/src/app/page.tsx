"use client";

import { useState, useEffect } from "react";
import AuditDrawer from "@/components/AuditDrawer";
import ToolRegistry from "@/components/ToolRegistry";
import PipelineSankey from "@/components/PipelineSankey";
import { QueryResponse, ToolMetadata } from "@/components/api";
import { Search, Send, Database, BarChart3, MessageSquare, Lightbulb, AlertTriangle } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"ask" | "registry" | "pipeline">("ask");
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<QueryResponse | any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tools, setTools] = useState<ToolMetadata[]>([]);

  useEffect(() => {
    fetch("http://localhost:8000/tools")
      .then(res => res.json())
      .then(data => setTools(data))
      .catch(err => console.error("Failed to fetch tools", err));
  }, []);

  const handleAsk = async () => {
    setIsLoading(true);
    setResponse(null);
    try {
      const res = await fetch("http://localhost:8000/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query })
      });
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-cyan-500 rounded flex items-center justify-center font-bold text-slate-950">TM</div>
          <span className="font-bold text-xl tracking-tight text-white">Thinking Machines</span>
        </div>
        <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab("ask")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm transition-all ${activeTab === "ask" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
          >
            <MessageSquare size={16} /> Ask
          </button>
          <button
             onClick={() => setActiveTab("pipeline")}
             className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm transition-all ${activeTab === "pipeline" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
          >
            <BarChart3 size={16} /> Pipeline
          </button>
          <button
             onClick={() => setActiveTab("registry")}
             className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm transition-all ${activeTab === "registry" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Database size={16} /> Registry
          </button>
        </div>
        <div className="text-sm text-slate-500 font-mono">TestPilot Inc.</div>
      </nav>

      {/* Main Workspace */}
      <div className="flex-1 p-8 max-w-6xl mx-auto w-full">
        {activeTab === "ask" && (
          <div className="flex flex-col gap-8 h-full">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Why did our CAC spike in October?"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-5 pl-14 text-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all placeholder:text-slate-600 shadow-2xl"
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={24} />
              <button
                onClick={handleAsk}
                disabled={isLoading || !query}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white p-2.5 rounded-lg transition-all active:scale-95"
              >
                <Send size={20} />
              </button>
            </div>

            {isLoading && (
              <div className="flex flex-col items-center justify-center p-20 gap-4">
                <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                <p className="text-slate-500 font-mono animate-pulse uppercase tracking-widest text-xs">Compiling Execution Plan...</p>
              </div>
            )}

            {response && !isLoading && (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
                  <p className="text-2xl leading-relaxed text-slate-100 font-medium">
                    {response.answer}
                  </p>
                </div>

                {response.investigation_mode && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {response.hypotheses.map((h: any, i: number) => (
                      <div key={i} className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl hover:border-amber-500/50 transition-colors group">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                            <Lightbulb size={20} />
                          </div>
                          <h4 className="font-bold text-slate-200">{h.title}</h4>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed mb-4">{h.description}</p>
                        {h.requires_new_tool && (
                          <div className="flex items-center gap-2 text-[10px] font-bold text-amber-500 uppercase tracking-widest bg-amber-500/5 px-2 py-1 rounded border border-amber-500/20">
                            <AlertTriangle size={12} /> Requires New Tool: {h.proposed_tool_name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {!response.investigation_mode && (
                  <AuditDrawer
                    tier={response.tier}
                    model={response.model}
                    metricResolutions={response.metric_resolutions}
                    executions={response.executions}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "registry" && (
          <ToolRegistry tools={tools} />
        )}

        {activeTab === "pipeline" && (
          <PipelineSankey />
        )}
      </div>

      {/* Footer Status */}
      <footer className="p-4 border-t border-slate-900 bg-slate-950 flex justify-between text-[10px] text-slate-600 font-mono uppercase tracking-widest px-8">
        <div className="flex gap-6">
          <span className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> System Healthy</span>
          <span>Deterministic Kernel: 100% Verified</span>
          <span>SQLite Engine Ready</span>
        </div>
        <div className="flex gap-4">
          <span className="text-slate-800">Thinking Machines v1.0.0</span>
          <span>&copy; 2026 TestPilot Inc.</span>
        </div>
      </footer>
    </main>
  );
}
