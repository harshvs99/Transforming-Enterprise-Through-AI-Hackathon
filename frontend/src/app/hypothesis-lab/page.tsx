"use client";

export default function HypothesisLabPage() {
  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <h1 className="font-headline font-black text-5xl uppercase tracking-tighter mb-2 text-primary">Hypothesis Lab</h1>
        <p className="font-headline font-bold text-xs uppercase text-on-surface-variant">Create and test analytical hypotheses</p>
      </div>

      <button className="w-full bg-primary text-white border-4 border-primary p-6 font-headline font-black uppercase neo-shadow hover:neo-shadow-active active:neo-shadow-active transition-all">
        + New Hypothesis
      </button>

      <div className="space-y-4">
        {[
          { title: "CAC Spike Pattern", status: "Active", confidence: "92%" },
          { title: "Seasonal Conversion Trend", status: "Testing", confidence: "78%" },
          { title: "Churn Prediction Model", status: "Pending", confidence: "64%" },
          { title: "LTV Optimization Strategy", status: "Complete", confidence: "88%" },
        ].map((hyp) => (
          <div key={hyp.title} className="border-4 border-primary p-6 neo-shadow bg-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-headline font-bold uppercase text-lg">{hyp.title}</h3>
                <p className="text-xs font-headline uppercase text-on-surface-variant mt-1">{hyp.status}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-headline font-black text-primary">{hyp.confidence}</div>
                <p className="text-[10px] font-headline uppercase text-on-surface-variant">Confidence</p>
              </div>
            </div>
            <div className="w-full h-2 bg-primary-fixed">
              <div className="h-full bg-tertiary" style={{ width: hyp.confidence }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
