"use client";

export default function DataIngestionPage() {
  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="font-headline font-black text-5xl uppercase tracking-tighter mb-2 text-primary">Data Ingestion</h1>
        <p className="font-headline font-bold text-xs uppercase text-on-surface-variant">Stream and import data sources</p>
      </div>

      <div className="border-4 border-dashed border-primary p-12 bg-white text-center neo-shadow">
        <span className="material-symbols-outlined text-7xl text-primary mb-4 block">cloud_upload</span>
        <h2 className="font-headline font-black text-3xl uppercase mb-2">Upload Data Source</h2>
        <p className="font-headline font-bold text-sm uppercase text-on-surface-variant mb-6">Drag and drop or click to select files</p>
        <button className="bg-primary text-white border-4 border-primary p-4 font-headline font-black uppercase neo-shadow hover:neo-shadow-active active:neo-shadow-active transition-all">
          Choose Files
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="font-headline font-black text-2xl uppercase">Active Ingestion Streams</h3>
        {[
          { name: "Salesforce CRM", status: "Connected", records: "2.4M" },
          { name: "Google Analytics", status: "Syncing", records: "15.7M" },
          { name: "Stripe Payments", status: "Connected", records: "890K" },
        ].map((stream) => (
          <div key={stream.name} className="border-4 border-primary p-6 neo-shadow bg-white">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-headline font-bold uppercase text-lg">{stream.name}</h4>
                <p className="text-xs font-headline uppercase text-on-surface-variant">{stream.records} records</p>
              </div>
              <span className="px-4 py-2 bg-tertiary text-white font-headline font-bold uppercase text-xs neo-shadow border border-primary">
                {stream.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
