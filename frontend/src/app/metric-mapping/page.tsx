"use client";

import { useMetrics } from "@/lib/useAPI";

export default function MetricMappingPage() {
  const { data: metrics, loading, error } = useMetrics();

  const getOwnerColor = (owner: string) => {
    const colors = {
      "sales": "bg-primary",
      "marketing": "bg-secondary",
      "product": "bg-tertiary",
      "finance": "bg-primary-fixed",
    };
    return colors[owner.toLowerCase() as keyof typeof colors] || "bg-primary";
  };

  return (
    <div className="bg-background min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-background border-b-4 border-primary px-6 lg:px-10 py-4 sticky top-0 z-40">
        <h1 className="font-headline font-black text-2xl uppercase tracking-tighter text-primary">Metric Mapping</h1>
        <p className="font-headline font-bold text-xs uppercase text-on-surface-variant mt-1">Enterprise metric definitions and versioning</p>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6 lg:p-10 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-4">
              <span className="material-symbols-outlined text-6xl text-primary mb-4 block animate-pulse">data_check</span>
              <p className="font-headline font-bold uppercase text-primary">Loading Metric Definitions...</p>
              <p className="font-mono text-xs text-on-surface-variant">Querying metric registry...</p>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl space-y-8">
            {/* Stats Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border-4 border-primary p-6 bg-primary-fixed neo-shadow text-center">
                <p className="text-4xl font-headline font-black text-primary">{metrics.length}</p>
                <p className="font-headline font-bold text-xs uppercase text-on-surface-variant mt-2">Total Metrics</p>
              </div>
              <div className="border-4 border-primary p-6 bg-white neo-shadow text-center">
                <p className="text-4xl font-headline font-black text-primary">
                  {Math.max(...metrics.map(m => parseInt(m.version) || 1))}
                </p>
                <p className="font-headline font-bold text-xs uppercase text-on-surface-variant mt-2">Latest Version</p>
              </div>
              <div className="border-4 border-primary p-6 bg-surface neo-shadow text-center">
                <p className="text-4xl font-headline font-black text-primary">
                  {new Set(metrics.map(m => m.owner)).size}
                </p>
                <p className="font-headline font-bold text-xs uppercase text-on-surface-variant mt-2">Teams</p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="space-y-4">
              <h2 className="font-headline font-black text-xl uppercase text-primary border-b-4 border-primary inline-block pb-2">Definitions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {metrics.slice(0, 15).map((metric: any, i: number) => (
                  <div key={metric.id} className="border-4 border-primary p-6 neo-shadow bg-white hover:shadow-lg hover:translate-x-1 hover:translate-y-1 transition-all group">
                    <div className="mb-4">
                      <h3 className="font-headline font-black text-lg uppercase text-primary mb-1">{metric.display_name}</h3>
                      <p className="text-xs font-mono text-on-surface-variant">{metric.canonical_name}</p>
                    </div>

                    <p className="text-sm font-body text-on-surface-variant mb-4 line-clamp-3 min-h-12">
                      {metric.description || "Enterprise-wide metric for business intelligence"}
                    </p>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-headline font-bold text-[10px] uppercase">Version</span>
                        <span className="font-mono text-xs font-bold text-primary">v{metric.version}</span>
                      </div>

                      <div className="flex gap-2 flex-wrap pt-2 border-t-2 border-primary">
                        <span className={`${getOwnerColor(metric.owner)} text-white text-[10px] font-headline font-bold uppercase px-2 py-1 border border-primary`}>
                          {metric.owner || "System"}
                        </span>
                        {metric.aliases && metric.aliases.length > 0 && (
                          <span className="bg-tertiary-fixed text-primary text-[10px] font-headline font-bold uppercase px-2 py-1 border border-primary">
                            +{metric.aliases.length} aliases
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info Section */}
            <div className="border-4 border-dashed border-primary p-8 bg-surface neo-shadow">
              <h3 className="font-headline font-black text-xl uppercase text-primary mb-4">About This Registry</h3>
              <p className="font-body text-primary leading-relaxed">
                This metric mapping serves as the canonical reference for all enterprise KPIs and analytical definitions.
                Each metric is versioned, ownership tracked, and used by the deterministic kernel for query resolution and execution planning.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
