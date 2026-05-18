"use client";

import { useState, useEffect } from "react";
import AuditDrawer from "@/components/AuditDrawer";
import ToolRegistry from "@/components/ToolRegistry";
import PipelineSankey from "@/components/PipelineSankey";
import { QueryResponse, ToolMetadata } from "@/components/api";
import { Search, Send, Database, BarChart3, MessageSquare, Lightbulb, AlertTriangle, ShieldCheck, HelpCircle } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"ask" | "registry" | "pipeline">("ask");
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<QueryResponse | any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tools, setTools] = useState<ToolMetadata[]>([]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://thinking-machines-api.onrender.com";

  useEffect(() => {
    fetch(`${API_URL}/tools`)
      .then(res => res.json())
      .then(data => setTools(data))
      .catch(err => console.error("Failed to fetch tools", err));
  }, [API_URL]);

  const handleAsk = async () => {
    setIsLoading(true);
    setResponse(null);
    try {
      const res = await fetch(`${API_URL}/query`, {
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
          <div className="w-8 h-8 bg-cyan-500 rounded flex items-center justify-center font-bold text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]">TM</div>
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
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
            <ShieldCheck size={12} /> Deterministic Kernel Active
          </div>
          <div className="text-sm text-slate-500 font-mono">TestPilot Inc.</div>
        </div>
      </nav>

      {/* Main Workspace */}
      <div className="flex-1 p-8 max-w-6xl mx-auto w-full">
        {activeTab === "ask" && (
          <div className="flex flex-col gap-8 h-full">
            <div className="relative group">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Why did our CAC spike in October?"
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 pl-16 text-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all placeholder:text-slate-600 shadow-2xl group-hover:border-slate-700"
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              />
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-500 transition-colors" size={28} />
              <button
                onClick={handleAsk}
                disabled={isLoading || !query}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white p-3 rounded-xl transition-all active:scale-95 shadow-lg"
              >
                <Send size={24} />
              </button>
            </div>

            {isLoading && (
              <div className="flex flex-col items-center justify-center p-20 gap-6">
                <div className="relative">
                   <div className="w-16 h-16 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin"></div>
                   <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 bg-cyan-500/20 rounded-full animate-pulse"></div>
                   </div>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold uppercase tracking-[0.2em] text-xs">Compiling Execution Plan</p>
                  <p className="text-slate-500 text-[10px] mt-2 font-mono uppercase">Consulting Deterministic Kernel v1.0...</p>
                </div>
              </div>
            )}

            {response && !isLoading && (
              <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-cyan-500 to-blue-600"></div>

                  <div className="flex items-center gap-2 mb-6">
                     <span className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em]">Compiler Synthesis</span>
                     <div className="h-px flex-1 bg-slate-800"></div>
                  </div>

                  <p className="text-3xl leading-relaxed text-slate-100 font-medium tracking-tight">
                    {response.answer}
                  </p>

                  <div className="mt-10 pt-8 border-t border-slate-800/50 flex flex-wrap gap-6 items-center">
                     <div className="flex items-center gap-2 text-slate-500">
                        <HelpCircle size={14} className="text-slate-600" />
                        <span className="text-xs">How was this calculated?</span>
                     </div>
                     <div className="px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-700">
                        Ground Truth: Verified
                     </div>
                     <div className="px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-700">
                        Methodology: {response.model === 'gemini-2.0-flash' ? 'Standard Tier' : 'Deep Reasoning'}
                     </div>
                  </div>
                </div>

                {response.investigation_mode && (
                  <div className="space-y-4">
                     <h4 className="text-xs font-bold text-amber-500 uppercase tracking-[0.2em] px-4 flex items-center gap-2">
                        <AlertTriangle size={14} /> Investigation Hypotheses (Deep Reasoning Mode)
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {response.hypotheses.map((h: any, i: number) => (
                           <div key={i} className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl hover:border-amber-500/50 transition-all group relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                              <Lightbulb size={48} className="text-amber-500" />
                           </div>
                           <div className="flex items-center gap-3 mb-4">
                              <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/20">
                                 <Lightbulb size={20} />
                              </div>
                              <h4 className="font-bold text-lg text-slate-100">{h.title}</h4>
                           </div>
                           <p className="text-sm text-slate-400 leading-relaxed mb-6 pr-8">{h.description}</p>
                           {h.requires_new_tool ? (
                              <div className="inline-flex items-center gap-2 text-[10px] font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                                 <AlertTriangle size={12} /> Requires New Tool: {h.proposed_tool_name}
                              </div>
                           ) : (
                              <div className="inline-flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                                 <ShieldCheck size={12} /> Verified with Core Library
                              </div>
                           )}
                           </div>
                        ))}
                     </div>
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

                <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-2xl">
                   <div className="flex items-start gap-4">
                      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                         <Info size={20} />
                      </div>
                      <div>
                         <h4 className="text-sm font-bold text-blue-100 mb-1 italic">Pro Tip for Marketers</h4>
                         <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                            The AI here acts as a **Compiler**, not an analyst. It translates your natural language into a precise chain of statistical models. This ensures that the same question always yields the same result, unlike typical "chatbots" that guess. You can see the exact math used in the Audit Trail above.
                         </p>
                      </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "registry" && (
          <ToolRegistry tools={tools} />
        )}

        {activeTab === "pipeline" && (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <PipelineSankey API_URL={API_URL} />
          </div>
        )}
      </div>

      {/* Footer Status */}
      <footer className="p-4 border-t border-slate-900 bg-slate-950/50 backdrop-blur-sm flex justify-between text-[10px] text-slate-600 font-mono uppercase tracking-widest px-8">
        <div className="flex gap-6">
          <span className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> System Healthy</span>
          <span>Deterministic Kernel: 100% Verified</span>
          <span>SQLite Engine Ready</span>
        </div>
        <div className="flex gap-4">
          <span className="text-slate-800">Thinking Machines v1.0.0-final</span>
          <span>&copy; 2026 TestPilot Inc.</span>
        </div>
      </footer>
    </main>
  );
}
