"use client";

export default function SynthesisCompletePage() {
  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="font-headline font-black text-5xl uppercase tracking-tighter mb-2 text-primary">Synthesis Complete</h1>
        <p className="font-headline font-bold text-xs uppercase text-on-surface-variant">Analysis results and intelligence output</p>
      </div>

      <div className="border-4 border-primary p-12 neo-shadow bg-tertiary text-white text-center">
        <span className="material-symbols-outlined text-7xl mb-4 block">check_circle</span>
        <h2 className="font-headline font-black text-4xl uppercase mb-4 tracking-tighter">Analysis Complete</h2>
        <p className="font-headline font-bold text-lg mb-6">High-confidence intelligence generated from 42 data sources</p>
        <button className="bg-white text-tertiary border-4 border-white p-4 font-headline font-black uppercase neo-shadow hover:neo-shadow-active active:neo-shadow-active transition-all">
          Download Report
        </button>
      </div>

      <div className="space-y-6">
        <div className="border-4 border-primary p-6 neo-shadow bg-white">
          <h3 className="font-headline font-bold uppercase text-lg mb-4 text-primary">Key Findings</h3>
          <ul className="space-y-3">
            {[
              "CAC spike in October driven by 3 key campaigns",
              "LTV shows 23% seasonal variation",
              "Churn risk identified in 8,230 accounts",
              "Optimization opportunity in Q4 spend allocation",
            ].map((finding, i) => (
              <li key={i} className="flex gap-4">
                <span className="material-symbols-outlined flex-shrink-0 text-primary">check</span>
                <span className="font-body text-lg">{finding}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-4 border-primary p-6 neo-shadow bg-primary-fixed">
            <h4 className="font-headline font-bold uppercase text-sm mb-2 text-primary">Confidence Score</h4>
            <div className="text-5xl font-headline font-black text-primary">94.2%</div>
          </div>
          <div className="border-4 border-primary p-6 neo-shadow bg-white">
            <h4 className="font-headline font-bold uppercase text-sm mb-2 text-primary">Processing Time</h4>
            <div className="text-5xl font-headline font-black text-primary">2.3s</div>
          </div>
        </div>
      </div>
    </div>
  );
}
