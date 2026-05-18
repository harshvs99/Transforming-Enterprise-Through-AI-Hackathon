"use client";

export default function PipelineOverviewPage() {
  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div>
        <h1 className="font-headline font-black text-5xl uppercase tracking-tighter mb-2 text-primary">Pipeline Overview</h1>
        <p className="font-headline font-bold text-xs uppercase text-on-surface-variant">Real-time execution visualization</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { stage: "Input", status: "Active", count: 12 },
          { stage: "Processing", status: "Active", count: 45 },
          { stage: "Analysis", status: "Running", count: 28 },
          { stage: "Output", status: "Ready", count: 8 },
        ].map((item) => (
          <div key={item.stage} className="border-4 border-primary p-6 neo-shadow bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline font-black text-2xl uppercase">{item.stage}</h3>
              <span className="material-symbols-outlined text-primary text-3xl">check_circle</span>
            </div>
            <p className="text-xs font-headline uppercase text-on-surface-variant mb-2">Status: {item.status}</p>
            <div className="text-4xl font-headline font-black text-primary">{item.count}</div>
          </div>
        ))}
      </div>

      <div className="border-4 border-primary p-8 neo-shadow bg-primary-fixed">
        <h2 className="font-headline font-black text-3xl uppercase text-primary mb-4">Execution Timeline</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-4 h-4 bg-primary border-2 border-primary"></div>
              <div className="flex-1">
                <p className="font-headline font-bold uppercase text-xs">Step {i}</p>
                <div className="w-full h-2 bg-primary mt-2">
                  <div className="h-full bg-tertiary w-[70%]"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
