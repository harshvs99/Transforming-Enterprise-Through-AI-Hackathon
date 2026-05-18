"use client";

export default function DashboardPage() {
  const scrollToSection = (id: string) => {
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        const mainContainer = document.querySelector('main');
        if (mainContainer) {
          const elementRect = element.getBoundingClientRect();
          const containerRect = mainContainer.getBoundingClientRect();
          const offset = elementRect.top - containerRect.top + mainContainer.scrollTop - 80;
          mainContainer.scrollTo({
            top: offset,
            behavior: "smooth"
          });
        }
      }
    }, 0);
  };

  return (
    <>
      {/* Top Header Bar */}
      <header className="bg-background border-b-4 border-primary px-6 lg:px-10 py-4 sticky top-0 z-40">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <h1 className="font-headline font-black text-2xl uppercase tracking-tighter text-primary">Dashboard</h1>
            <nav className="hidden lg:flex space-x-6">
              <a href="#" onClick={(e) => { e.preventDefault(); scrollToSection("pipeline-velocity"); }} className="text-primary font-bold hover:text-tertiary transition-colors text-sm uppercase cursor-pointer">Analytics</a>
              <a href="#" onClick={(e) => { e.preventDefault(); scrollToSection("system-status"); }} className="text-primary font-bold hover:text-tertiary transition-colors text-sm uppercase cursor-pointer">Execution</a>
              <a href="#" onClick={(e) => { e.preventDefault(); scrollToSection("system-log"); }} className="text-primary font-bold hover:text-tertiary transition-colors text-sm uppercase cursor-pointer">Models</a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <input type="text" placeholder="SEARCH..." className="bg-surface border-b-2 border-primary px-3 py-2 font-headline text-xs uppercase focus:outline-none" />
            <button className="p-2 hover:text-tertiary transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6 lg:p-10 space-y-10 bg-background">
        {/* Hero Metric Section */}
        <section id="pipeline-velocity" className="grid grid-cols-1 lg:grid-cols-12 gap-6 reveal-item">
          <div className="lg:col-span-8 bg-primary-fixed border-4 border-primary p-8 neo-shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 pointer-events-none">
              <span className="material-symbols-outlined text-6xl opacity-10 rotate-12 transition-transform group-hover:rotate-45">bolt</span>
            </div>
            <div className="relative z-10">
              <h2 className="font-headline font-black text-4xl uppercase tracking-tighter text-primary mb-4">Pipeline Velocity</h2>
              <div className="flex items-baseline space-x-4 mb-6">
                <span className="font-headline font-black text-8xl text-primary">98.2</span>
                <span className="font-headline font-bold text-2xl uppercase text-primary">m/s²</span>
              </div>
              <p className="font-headline font-bold uppercase text-sm text-primary max-w-md leading-relaxed">
                Deterministic Kernel status: <span className="bg-primary text-white px-3 py-1">OPTIMAL</span>. High-throughput synthesis active across 12 distributed nodes.
              </p>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col justify-between space-y-6">
            <div className="bg-tertiary text-white border-4 border-primary p-6 neo-shadow-lg flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-headline font-bold uppercase text-xs tracking-widest mb-4">System Health</h3>
                <div className="text-5xl font-headline font-black uppercase mb-4">Nominal</div>
              </div>
              <div>
                <div className="mt-4 h-3 bg-primary w-full border border-white">
                  <div className="h-full bg-primary-fixed w-[94%]"></div>
                </div>
                <p className="text-[10px] font-headline font-bold uppercase mt-3 opacity-80">Latency: 14ms | Uptime: 99.999%</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button className="flex-1 bg-primary text-white border-4 border-primary p-4 neo-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none transition-all font-headline font-bold uppercase text-sm">
                Run Synthesis
              </button>
              <button className="bg-white text-primary border-4 border-primary p-4 neo-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">science</span>
              </button>
            </div>
          </div>
        </section>

        {/* Summary Insights Grid */}
        <section id="system-status" className="space-y-4">
          <h2 className="font-headline font-black text-3xl uppercase tracking-tighter text-primary">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Ingestion Card */}
            <div className="bg-white border-4 border-primary p-8 neo-shadow-lg relative group">
              <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none opacity-5">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <path d="M0,50 L20,30 L40,60 L60,10 L80,90 L100,40" fill="none" stroke="black" strokeWidth="10"></path>
                </svg>
              </div>
              <div className="relative z-10">
                <div className="bg-tertiary-fixed w-14 h-14 border-2 border-primary mb-6 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-2xl">hub</span>
                </div>
                <h3 className="font-headline font-black text-2xl uppercase mb-2 text-primary">Ingestion</h3>
                <p className="font-headline font-bold text-xs uppercase text-on-surface-variant mb-6">Connectors Source Rate</p>
                <div className="text-5xl font-headline font-black text-primary">4.2 GB/s</div>
              </div>
            </div>

            {/* Hypotheses Card */}
            <div className="bg-primary-fixed border-4 border-primary p-8 neo-shadow-lg">
              <div className="bg-primary w-14 h-14 border-2 border-primary mb-6 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-2xl">biotech</span>
              </div>
              <h3 className="font-headline font-black text-2xl uppercase mb-2 text-primary">Hypotheses</h3>
              <p className="font-headline font-bold text-xs uppercase text-on-surface-variant mb-6">Active Lab Experiments</p>
              <div className="text-5xl font-headline font-black text-primary mb-6">142</div>
              <div className="flex -space-x-3">
                <div className="w-10 h-10 bg-tertiary border-2 border-primary"></div>
                <div className="w-10 h-10 bg-secondary border-2 border-primary"></div>
                <div className="w-10 h-10 bg-white border-2 border-primary"></div>
                <div className="w-10 h-10 bg-primary border-2 border-primary flex items-center justify-center text-white text-xs font-bold">+9</div>
              </div>
            </div>

            {/* Audit Traces Card */}
            <div className="bg-white border-4 border-primary p-8 neo-shadow-lg">
              <div className="bg-secondary-fixed w-14 h-14 border-2 border-primary mb-6 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-2xl">history_edu</span>
              </div>
              <h3 className="font-headline font-black text-2xl uppercase mb-2 text-primary">Audit Traces</h3>
              <p className="font-headline font-bold text-xs uppercase text-on-surface-variant mb-6">Verified Verifiable Chains</p>
              <div className="text-5xl font-headline font-black text-primary mb-4">8.9M</div>
              <div className="flex items-center text-tertiary font-headline font-bold text-xs uppercase">
                <span className="material-symbols-outlined text-sm mr-2">check_circle</span>
                Integrity Guaranteed
              </div>
            </div>
          </div>
        </section>

        {/* System Log */}
        <section id="system-log" className="space-y-4">
          <h3 className="font-headline font-black text-xl uppercase border-b-4 border-primary inline-block pb-2 text-primary">System Log</h3>
          <div className="space-y-3 max-w-2xl">
            {[
              { time: "14:22:01", msg: "Kernel Re-calibration required in Hub 4", icon: "warning", color: "text-secondary" },
              { time: "14:18:45", msg: "Synthesis sequence completed successfully", icon: "sync", color: "text-tertiary" },
              { time: "13:55:12", msg: "New dataset ingested from Global_Stream", icon: "database", color: "text-primary" },
            ].map((log, i) => (
              <div key={i} className="flex items-start space-x-4 p-4 border-2 border-primary bg-white hover:bg-primary-fixed transition-colors group">
                <span className={`material-symbols-outlined text-sm pt-1 ${log.color}`}>{log.icon}</span>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-on-surface-variant">{log.time}</p>
                  <p className="font-headline font-bold text-xs uppercase mt-1">{log.msg}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-4 border-dashed border-primary p-12 bg-surface text-center neo-shadow">
          <span className="material-symbols-outlined text-7xl text-primary mb-4 block">auto_fix_high</span>
          <h2 className="font-headline font-black text-3xl uppercase tracking-tighter text-primary mb-3">Ready for New Synthesis?</h2>
          <p className="font-headline font-bold text-sm uppercase text-on-surface-variant mb-8 max-w-md mx-auto">Combine your ingested connectors with verified lab hypotheses to generate verifiable intelligence outputs.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-primary text-white border-4 border-primary px-8 py-4 font-headline font-black uppercase tracking-widest neo-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none transition-all">
              Run New Synthesis
            </button>
            <button className="bg-white text-primary border-4 border-primary px-8 py-4 font-headline font-black uppercase tracking-widest neo-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none transition-all">
              Open Lab
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
