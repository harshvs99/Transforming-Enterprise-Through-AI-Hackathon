"use client";

import { useTools } from "@/lib/useAPI";

export default function ToolRegistryPage() {
  const { data: tools, loading, error } = useTools();

  return (
    <div className="bg-background min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-background border-b-4 border-primary px-6 lg:px-10 py-4 sticky top-0 z-40">
        <h1 className="font-headline font-black text-2xl uppercase tracking-tighter text-primary">Tool Registry</h1>
        <p className="font-headline font-bold text-xs uppercase text-on-surface-variant mt-1">Available analysis and synthesis tools</p>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6 lg:p-10 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-4">
              <span className="material-symbols-outlined text-6xl text-primary mb-4 block animate-pulse">hourglass_empty</span>
              <p className="font-headline font-bold uppercase text-primary">Loading Tool Registry...</p>
              <p className="font-mono text-xs text-on-surface-variant">Fetching from deterministic kernel...</p>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl space-y-6">
            {/* Tools Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {tools.slice(0, 12).map((tool: any, i: number) => (
                <div key={tool.name} className="border-4 border-primary p-6 neo-shadow bg-white hover:shadow-lg hover:translate-x-1 hover:translate-y-1 transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="inline-flex items-center gap-3 mb-3">
                        <span className="font-headline font-black text-xs bg-primary text-white px-3 py-1 uppercase">Tool {i + 1}</span>
                      </div>
                      <h3 className="font-headline font-black text-xl uppercase text-primary mb-2">{tool.name}</h3>
                    </div>
                    <span className="material-symbols-outlined text-3xl text-tertiary group-hover:text-secondary transition-colors">build</span>
                  </div>

                  <p className="text-sm font-body text-on-surface-variant mb-4 line-clamp-2">{tool.description || "Specialized analysis tool"}</p>

                  {/* Input Schema Summary */}
                  {tool.input_schema?.properties && (
                    <div className="mb-4 p-3 bg-surface border-2 border-primary">
                      <p className="text-[10px] font-headline font-bold uppercase text-on-surface-variant mb-2">Inputs:</p>
                      <div className="text-xs space-y-1">
                        {Object.keys(tool.input_schema.properties).slice(0, 3).map((key: string) => (
                          <p key={key} className="font-mono text-on-surface-variant">• {key}</p>
                        ))}
                        {Object.keys(tool.input_schema.properties).length > 3 && (
                          <p className="font-mono text-on-surface-variant text-[9px]">+ {Object.keys(tool.input_schema.properties).length - 3} more</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Category Tag */}
                  <div className="flex gap-2">
                    {tool.category && (
                      <span className="px-3 py-1 bg-tertiary text-white text-[10px] font-headline font-bold uppercase border-2 border-tertiary">
                        {tool.category}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Stats */}
            <div className="border-4 border-primary p-8 bg-primary-fixed neo-shadow text-center">
              <h2 className="font-headline font-black text-3xl uppercase text-primary mb-2">System Toolset</h2>
              <p className="text-2xl font-headline font-black text-primary mb-1">{tools.length}</p>
              <p className="font-headline font-bold text-xs uppercase text-on-surface-variant">Tools Available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
