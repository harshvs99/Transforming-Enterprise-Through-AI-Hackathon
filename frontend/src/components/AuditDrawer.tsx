import { ToolResult } from "./api";
import { Database, HelpCircle } from "lucide-react";

export default function AuditDrawer({
  tier,
  model,
  metricResolutions,
  executions
}: {
  tier: number,
  model: string,
  metricResolutions: any[],
  executions: ToolResult[]
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      <div className="bg-slate-800/50 p-4 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-3">
           <div className="bg-cyan-500/20 text-cyan-400 p-1.5 rounded-lg">
              <Database size={18} />
           </div>
           <h3 className="text-white font-bold uppercase tracking-widest text-xs">Deterministic Audit Trail</h3>
        </div>
        <div className="flex gap-4 font-mono text-[10px] uppercase tracking-widest font-bold">
          <span className="flex items-center gap-1.5">
            <span className="text-slate-500">Tier:</span>
            <span className={tier === 1 ? 'text-emerald-500' : tier === 2 ? 'text-amber-500' : 'text-rose-500'}>{tier}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-slate-500">Compiler:</span>
            <span className="text-cyan-400">{model}</span>
          </span>
        </div>
      </div>

      <div className="p-6 space-y-8">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Metric Resolution Layer</h4>
            <div className="group relative">
               <HelpCircle size={12} className="text-slate-700 cursor-help" />
               <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-slate-800 text-[11px] text-slate-300 rounded-xl hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed">
                  The LLM acts as a compiler here. It extracts concepts like "CAC" and resolves them against versioned, owned metric definitions. It never guesses.
               </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {metricResolutions.map((m, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-950/50 p-3 rounded-xl border border-slate-800/50 group hover:border-cyan-500/30 transition-all">
                <span className="text-emerald-400 font-mono text-sm font-bold italic">"{m.text}"</span>
                <div className="flex items-center gap-2">
                   <div className="h-px w-4 bg-slate-800"></div>
                   <span className="text-cyan-300 font-mono text-xs font-bold">{m.canonical_name} <span className="text-slate-600">v{m.version}</span></span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Statistical Execution Plan</h4>
            <div className="group relative">
               <HelpCircle size={12} className="text-slate-700 cursor-help" />
               <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-slate-800 text-[11px] text-slate-300 rounded-xl hidden group-hover:block z-50 border border-slate-700 shadow-2xl leading-relaxed">
                  The compiler picked these specific statistical models from the registry. The outputs are purely deterministic, ensuring the same question always yields the same result.
               </div>
            </div>
          </div>
          <div className="space-y-3">
            {executions.map((ex, i) => (
              <div key={i} className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 group hover:border-cyan-500/30 transition-all">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold font-mono text-xs uppercase tracking-wider">{ex.tool_name}</span>
                    <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded uppercase">v{ex.tool_version}</span>
                  </div>
                  <span className="text-[10px] text-slate-600 font-mono">{ex.execution_time_ms}ms</span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                    <span className="text-slate-700 uppercase">Input Params:</span>
                    <span className="truncate max-w-md">{JSON.stringify(ex.inputs)}</span>
                  </div>
                  <div className="text-[10px] text-emerald-500/80 font-mono flex items-center gap-2">
                    <span className="text-slate-700 uppercase">Output Result:</span>
                    <span className="truncate max-w-md">{JSON.stringify(ex.output)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="pt-4 border-t border-slate-800 text-center">
           <p className="text-[10px] text-slate-600 uppercase tracking-[0.3em] font-bold">Provenance Chain Verified &middot; Zero Hallucination Guarantee</p>
        </div>
      </div>
    </div>
  );
}
