"use client";

export default function AuditLogPage() {
  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <h1 className="font-headline font-black text-5xl uppercase tracking-tighter mb-2 text-primary">Audit Log</h1>
        <p className="font-headline font-bold text-xs uppercase text-on-surface-variant">Complete activity and change history</p>
      </div>

      <div className="space-y-3">
        {[
          { time: "14:22:01", action: "Kernel Re-calibration required", type: "warning", icon: "warning" },
          { time: "14:18:45", action: "Synthesis sequence completed successfully", type: "success", icon: "sync" },
          { time: "13:55:12", action: "New dataset ingested from Global_Stream", type: "info", icon: "database" },
          { time: "13:42:33", action: "User created new hypothesis in Lab", type: "info", icon: "edit" },
          { time: "13:30:18", action: "Backup completed - 2.3GB archived", type: "success", icon: "backup" },
          { time: "13:15:45", action: "Data validation failed for 142 records", type: "warning", icon: "error" },
        ].map((log, i) => (
          <div key={i} className="border-4 border-primary p-4 neo-shadow bg-white hover:bg-primary-fixed transition-colors flex items-start gap-4">
            <span
              className={`material-symbols-outlined text-lg flex-shrink-0 pt-1 ${
                log.type === "warning" ? "text-secondary" : log.type === "success" ? "text-tertiary" : "text-primary"
              }`}
            >
              {log.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-headline font-bold uppercase text-on-surface-variant">{log.time}</p>
              <p className="font-headline font-bold uppercase text-sm mt-1">{log.action}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
