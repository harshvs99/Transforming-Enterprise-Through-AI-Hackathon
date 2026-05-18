"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function PipelineSankey() {
  const [metrics, setMetrics] = useState<any[]>([]);

  useEffect(() => {
    fetch("http://localhost:8000/metrics")
      .then(res => res.json())
      .then(data => {
        // Sort and map for visualization
        const important = ["MQL", "SAL", "Opp", "CW"];
        const filtered = data
          .filter((m: any) => important.includes(m.display_name))
          .sort((a: any, b: any) => important.indexOf(a.display_name) - important.indexOf(b.display_name));

        setMetrics(filtered.map((m: any, i: number) => ({
           name: m.display_name,
           value: Math.floor(10000 / (i + 1) * (0.8 + 0.4 * Math.random())),
           color: ["bg-cyan-600", "bg-cyan-500", "bg-teal-500", "bg-emerald-500"][i]
        })));
      });
  }, []);

  const stages = metrics.length > 0 ? metrics : [
    { name: "MQLs", value: 4500, color: "bg-cyan-600" },
    { name: "SALs", value: 2100, color: "bg-cyan-500" },
    { name: "Opps", value: 850, color: "bg-teal-500" },
    { name: "Closed Won", value: 320, color: "bg-emerald-500" },
  ];

  const maxVal = stages[0].value;

  return (
    <div className="w-full bg-slate-900/50 p-8 rounded-2xl border border-slate-800">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h3 className="text-2xl font-bold text-white tracking-tight">Pipeline Velocity</h3>
          <p className="text-slate-500 text-sm mt-1">Real-time throughput from Prospect to Customer</p>
        </div>
        <div className="flex gap-4 text-xs font-mono text-slate-500">
          <span className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> LIVE
          </span>
          <span className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700">TESTPILOT INC.</span>
        </div>
      </div>

      <div className="relative h-64 flex items-end gap-2 px-4">
        {stages.map((stage, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-6 group">
            <div className="relative w-full flex justify-center">
               {i < stages.length - 1 && (
                 <div className="absolute top-1/2 left-1/2 w-full h-px bg-gradient-to-r from-cyan-500/50 to-transparent -translate-y-1/2 z-0"></div>
               )}

               <motion.div
                 initial={{ height: 0, opacity: 0 }}
                 animate={{ height: (stage.value / maxVal) * 160, opacity: 1 }}
                 className={`w-20 ${stage.color} rounded-t-xl relative z-10 shadow-[0_0_20px_rgba(6,182,212,0.1)] group-hover:brightness-125 transition-all cursor-pointer group-hover:-translate-y-1`}
               >
                 <div className="absolute -top-10 left-1/2 -translate-x-1/2 font-mono text-xs font-bold text-white bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                   {stage.value.toLocaleString()}
                 </div>
               </motion.div>
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{stage.name}</span>
          </div>
        ))}
      </div>

      <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "MQL→SAL", val: "46.7%", delta: "+2.1%", color: "text-emerald-500" },
          { label: "SAL→OPP", val: "40.5%", delta: "-1.4%", color: "text-rose-500" },
          { label: "OPP→CW", val: "37.6%", delta: "+0.8%", color: "text-emerald-500" },
          { label: "CYCLE TIME", val: "42 DAYS", delta: "-2 DAYS", color: "text-emerald-500" },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-950/50 border border-slate-800 p-5 rounded-2xl hover:border-slate-700 transition-colors">
            <div className="text-[10px] text-slate-600 uppercase font-black tracking-widest mb-2">{stat.label}</div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-white">{stat.val}</div>
              <div className={`text-[11px] font-bold ${stat.color}`}>
                {stat.delta}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
