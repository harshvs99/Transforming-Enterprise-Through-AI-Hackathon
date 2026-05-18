"use client";

import { useState } from "react";

export default function InitializeBrainPage() {
  const [completed, setCompleted] = useState([true, true, true, false, false, false]);

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="font-headline font-black text-5xl uppercase tracking-tighter mb-2 text-primary">Initialize System</h1>
        <p className="font-headline font-bold text-xs uppercase text-on-surface-variant">Complete system setup and configuration</p>
      </div>

      <div className="space-y-4">
        {[
          { step: 1, title: "Install Dependencies", desc: "Core system packages" },
          { step: 2, title: "Configure Database", desc: "SQLite schema and indices" },
          { step: 3, title: "Seed Metrics", desc: "Load metric definitions" },
          { step: 4, title: "Enable Connectors", desc: "Activate data sources" },
          { step: 5, title: "Initialize Kernel", desc: "Start deterministic engine" },
          { step: 6, title: "Launch System", desc: "Go live with analytics" },
        ].map((item, i) => (
          <div
            key={item.step}
            className={`border-4 border-primary p-6 neo-shadow ${completed[i] ? "bg-primary-fixed" : "bg-white"}`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 border-4 border-primary flex items-center justify-center font-headline font-black text-lg ${
                  completed[i] ? "bg-primary text-white" : "bg-white text-primary"
                }`}
              >
                {completed[i] ? "✓" : item.step}
              </div>
              <div className="flex-1">
                <h3 className="font-headline font-bold uppercase text-lg text-primary">{item.title}</h3>
                <p className="text-sm font-body text-on-surface-variant mt-1">{item.desc}</p>
              </div>
              {completed[i] && <span className="material-symbols-outlined text-primary text-3xl">check_circle</span>}
            </div>
          </div>
        ))}
      </div>

      <button className="w-full bg-secondary text-white border-4 border-primary p-6 font-headline font-black uppercase neo-shadow hover:neo-shadow-active active:neo-shadow-active transition-all">
        Complete Setup & Launch
      </button>
    </div>
  );
}
