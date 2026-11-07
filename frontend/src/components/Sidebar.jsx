import React from 'react';
import { LayoutDashboard, Palette, KeyRound, Settings, Film, Cpu, HardDrive, Sparkles } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, gpuInfo }) {
  const menuItems = [
    { id: 'dashboard', label: 'Panel de Control', icon: LayoutDashboard },
    { id: 'presets', label: 'Plantillas Guardadas', icon: Sparkles },
    { id: 'templates', label: 'Plantillas de Video', icon: Palette },
    { id: 'profiles', label: 'Perfiles de IA', icon: KeyRound },
    { id: 'settings', label: 'Ajustes de Ruta', icon: Settings }
  ];

  return (
    <aside className="w-64 glass-panel border-r border-border-dark flex flex-col h-screen sticky top-0">
      {/* Logotipo */}
      <div className="p-6 border-b border-border-dark flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-brand-primary/20 animate-pulse-ring">
          r
        </div>
        <div>
          <h1 className="font-extrabold text-lg text-white leading-none">REDIT-GEN</h1>
          <span className="text-[10px] text-gray-400 font-medium">AUTOMATION PLATFORM</span>
        </div>
      </div>

      {/* Menú de Navegación */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/25 translate-x-1'
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Estado del Hardware */}
      <div className="p-4 border-t border-border-dark bg-black/20">
        <div className="rounded-xl bg-gray-800/40 p-4 border border-border-dark flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
            <Cpu className="w-4 h-4 text-brand-primary" />
            <span>RENDER ENGINE</span>
          </div>
          <div className="text-white font-bold text-xs truncate">
            {gpuInfo?.gpuName || 'Buscando gráfica...'}
          </div>
          
          <div className={`mt-1 flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold w-fit ${
            gpuInfo?.codec !== 'libx264'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${gpuInfo?.codec !== 'libx264' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span>{gpuInfo?.codec !== 'libx264' ? 'ACELERACIÓN GPU' : 'CPU FALLBACK'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
