"use client";

export default function ConnectorStudioPage() {
  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <h1 className="font-headline font-black text-5xl uppercase tracking-tighter mb-2 text-primary">Connector Studio</h1>
        <p className="font-headline font-bold text-xs uppercase text-on-surface-variant">Build and manage data connections</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { name: "Salesforce", icon: "cloud", status: "Active" },
          { name: "HubSpot", icon: "hub", status: "Active" },
          { name: "Stripe", icon: "credit_card", status: "Inactive" },
          { name: "Google Sheets", icon: "table_chart", status: "Active" },
          { name: "Mixpanel", icon: "analytics", status: "Pending" },
          { name: "Slack", icon: "chat", status: "Inactive" },
        ].map((connector) => (
          <div key={connector.name} className="border-4 border-primary p-6 neo-shadow bg-white hover:neo-shadow-lg transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-primary-fixed border-2 border-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">{connector.icon}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-headline font-bold uppercase text-lg">{connector.name}</h3>
                <p className="text-[10px] font-headline uppercase text-on-surface-variant">{connector.status}</p>
              </div>
            </div>
            <button className="w-full bg-primary text-white border-2 border-primary p-3 font-headline font-bold uppercase text-xs neo-shadow hover:neo-shadow-active active:neo-shadow-active transition-all">
              Configure
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
