import { ToolMetadata } from "./api";
import { Info, Database } from "lucide-react";

export default function ToolRegistry({ tools }: { tools: ToolMetadata[] }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Deterministic Kernel</h2>
          <p className="text-slate-500 mt-1">Decades of battle-tested statistics, accessible via natural language.</p>
        </div>
        <div className="bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-widest">
          {tools.length} Registered Algorithms
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-cyan-500/50 transition-all group flex flex-col h-full shadow-lg hover:shadow-cyan-500/5">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-lg text-slate-100 group-hover:text-cyan-400 transition-colors">{tool.name}</h3>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-full font-mono uppercase">v{tool.version}</span>
            </div>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed flex-grow">{tool.description}</p>

            <div className="space-y-4 pt-4 border-t border-slate-800">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                     <Info size={12} /> Classical Basis
                  </div>
                  <span className="text-[11px] text-slate-300 font-medium">{tool.classical_basis}</span>
               </div>
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                     <Database size={12} /> Reproducibility
                  </div>
                  <span className="text-[11px] text-emerald-500 font-bold uppercase tracking-widest">{tool.reproducibility}</span>
               </div>
            </div>

            <div className="mt-6">
              <span className="text-[10px] font-bold uppercase tracking-widest bg-cyan-500/10 text-cyan-500 px-3 py-1.5 rounded-lg border border-cyan-500/20">
                {tool.category}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
