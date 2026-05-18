"use client";

export default function ChannelConstellationPage() {
  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <h1 className="font-headline font-black text-5xl uppercase tracking-tighter mb-2 text-primary">Channel Constellation</h1>
        <p className="font-headline font-bold text-xs uppercase text-on-surface-variant">Visualize intelligence flow architecture</p>
      </div>

      <div className="border-4 border-primary p-8 neo-shadow bg-white">
        <div className="text-center py-24 border-4 border-dashed border-primary-fixed bg-primary-fixed/20">
          <span className="material-symbols-outlined text-8xl text-primary mb-4 block opacity-30">hub</span>
          <h3 className="font-headline font-black text-2xl uppercase text-primary mb-2">Architecture Visualization</h3>
          <p className="text-sm font-body text-on-surface-variant">Real-time network topology diagram</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { layer: "Input Layer", sources: 24, color: "bg-tertiary" },
          { layer: "Processing Kernel", sources: 12, color: "bg-primary" },
          { layer: "Output Layer", sources: 8, color: "bg-secondary" },
        ].map((layer) => (
          <div key={layer.layer} className={`${layer.color} text-white border-4 border-primary p-6 neo-shadow`}>
            <h4 className="font-headline font-bold uppercase text-lg mb-2">{layer.layer}</h4>
            <div className="text-4xl font-headline font-black">{layer.sources}</div>
            <p className="text-xs font-headline uppercase mt-2 opacity-80">Active Channels</p>
          </div>
        ))}
      </div>
    </div>
  );
}
