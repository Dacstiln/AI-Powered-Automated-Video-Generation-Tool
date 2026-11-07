import React, { useState } from 'react';
import { Play, Sparkles, Volume2, Type, CreditCard, Film, Info } from 'lucide-react';

export default function PresetsHub({ templates, profiles, settings, backgroundStatus, onLaunchExpress, launchError = '', onClearLaunchError }) {
  const [counts, setCounts] = useState({});
  const [prompts, setPrompts] = useState({});
  const [selectedProfiles, setSelectedProfiles] = useState({});
  const [error, setError] = useState('');

  const getCount = (templateId) => counts[templateId] || 1;
  const getPrompt = (templateId) => {
    if (prompts[templateId] !== undefined) return prompts[templateId];
    const tpl = templates.find(t => t.id === templateId);
    return tpl?.defaultIdea || '';
  };
  const getProfileId = (templateId) => selectedProfiles[templateId] || '';

  const handleCountChange = (templateId, val) => {
    setCounts(prev => ({ ...prev, [templateId]: val }));
  };

  const handlePromptChange = (templateId, val) => {
    setPrompts(prev => ({ ...prev, [templateId]: val }));
  };

  const handleProfileChange = (templateId, val) => {
    setSelectedProfiles(prev => ({ ...prev, [templateId]: val }));
  };

  const handleLaunch = (templateId, boundProfileId) => {
    setError('');
    if (onClearLaunchError) onClearLaunchError();
    const prompt = getPrompt(templateId);
    const count = getCount(templateId);
    const profileId = getProfileId(templateId) || boundProfileId || settings.defaultProfileId || (profiles[0]?.id || '');

    if (!prompt.trim()) {
      setError('Por favor escribe la idea o semilla de la historia antes de lanzar la generación rápida.');
      return;
    }

    // Disparar generación unificada (la validación de carpeta se hace en App)
    onLaunchExpress({
      templateId,
      prompt,
      count,
      profileId
    });
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-black text-white">CENTRO DE PLANTILLAS GUARDADAS</h2>
        <p className="text-xs text-gray-400">Elige una de tus plantillas preconfiguradas, escribe un prompt rápido y lanza la generación de videos con un solo click.</p>
      </div>

      {(error || launchError) && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3.5 text-xs flex items-start gap-2">
          <span className="flex-1">{launchError || error}</span>
          {launchError && onClearLaunchError && (
            <button onClick={onClearLaunchError} className="text-red-400/60 hover:text-red-400 ml-2 shrink-0 font-bold cursor-pointer">×</button>
          )}
        </div>
      )}

      {/* Catálogo de Plantillas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {templates.map((tpl) => {
          const count = getCount(tpl.id);
          const prompt = getPrompt(tpl.id);

          return (
            <div 
              key={tpl.id} 
              className="glass-panel rounded-2xl p-6 flex flex-col justify-between border-t-4 border-t-brand-primary glass-card-hover"
            >
              {/* Encabezado de la Tarjeta */}
              <div className="space-y-1 pb-4 border-b border-border-dark">
                <span className="text-[10px] font-bold text-gray-500 uppercase block">TEMPLATE PRESET</span>
                <h3 className="text-base font-black text-white truncate">{tpl.name}</h3>
              </div>

              {/* Detalles y Resumen */}
              <div className="py-4 flex-grow space-y-3">
                {/* Voces */}
                <div className="flex items-start gap-2.5 text-xs text-gray-300">
                  <Volume2 className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                  <div className="truncate">
                    <span className="text-gray-500 block text-[9px] font-bold uppercase">Locución TTS</span>
                    <span className="font-semibold block truncate">♂ {tpl.maleVoice.split('-').slice(2).join(' ')}</span>
                    <span className="font-semibold block truncate">♀ {tpl.femaleVoice.split('-').slice(2).join(' ')}</span>
                  </div>
                </div>

                {/* Subtítulos */}
                <div className="flex items-start gap-2.5 text-xs text-gray-300">
                  <Type className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-gray-500 block text-[9px] font-bold uppercase">Estilo de Subtítulos</span>
                    <span className="font-semibold">{tpl.font} ({tpl.fontSize}px) • </span>
                    <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-black/45" style={{ color: tpl.subtitleColor }}>
                      {tpl.subtitleColor}
                    </span>
                    <span className="block text-[10px] text-brand-primary font-bold uppercase mt-0.5">
                      ★ {tpl.animation.replace('-', ' ')}
                    </span>
                  </div>
                </div>

                {/* Tarjeta Reddit */}
                <div className="flex items-start gap-2.5 text-xs text-gray-300">
                  <CreditCard className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                  <div className="truncate">
                    <span className="text-gray-500 block text-[9px] font-bold uppercase">Reddit Card Overlay</span>
                    <span className="font-semibold block truncate">u/{tpl.cardUsername} • {tpl.cardSubreddit}</span>
                    <span className="text-[10px] text-gray-400 font-semibold block">
                      👍 {tpl.upvotes} | 💬 {tpl.comments} • Theme: {tpl.cardTheme}
                    </span>
                    {(tpl.cardOffsetX !== 0 || tpl.cardOffsetY !== 0) && (
                      <span className="text-[9px] text-amber-400 font-bold block mt-0.5">
                        Posición: X {tpl.cardOffsetX}px, Y {tpl.cardOffsetY}px
                      </span>
                    )}
                    {tpl.cardEntryAnimation && tpl.cardEntryAnimation !== 'none' && (
                      <span className="text-[9px] text-emerald-400 font-bold block">
                        Transición: {tpl.cardEntryAnimation} $\rightarrow$ {tpl.cardExitAnimation}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Inputs rápidos y Lanzamiento */}
              <div className="border-t border-border-dark pt-4 space-y-3">
                {/* Prompt Rápido */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase">Idea o Semilla de la Historia (Tema)</label>
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => handlePromptChange(tpl.id, e.target.value)}
                    placeholder="Ej. Mi suegra intentó sabotear mi boda confesando..."
                    className="w-full bg-black/40 border border-border-dark rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-primary"
                  />
                </div>

                {/* Selector de Perfil de IA */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase">Perfil de IA & Prompt a usar</label>
                  <select
                    value={getProfileId(tpl.id) || tpl.profileId || settings.defaultProfileId || (profiles[0]?.id || '')}
                    onChange={(e) => handleProfileChange(tpl.id, e.target.value)}
                    className="w-full bg-black/40 border border-border-dark rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-brand-primary font-semibold"
                  >
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Cantidad y Botón */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="w-20 shrink-0">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Videos</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={count}
                      onChange={(e) => handleCountChange(tpl.id, Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                      className="w-full bg-black/40 border border-border-dark rounded-xl px-2 py-2 text-xs text-white focus:outline-none font-bold text-center"
                    />
                  </div>

                  <button
                    onClick={() => handleLaunch(tpl.id, tpl.profileId)}
                    className="flex-1 bg-brand-primary hover:bg-brand-primary-hover active:scale-[0.98] text-white font-extrabold py-2 rounded-xl text-xs transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-brand-primary/10 mt-3.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>GENERACIÓN EXPRESS</span>
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Nota de ayuda */}
      <div className="bg-gray-800/30 rounded-2xl p-4 border border-border-dark flex items-start gap-3">
        <Info className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400 leading-relaxed">
          <strong>¿Qué es la Generación Express?</strong> Esta sección te permite lanzar la cola de compilación directamente sin pasar por el formulario general. El sistema leerá automáticamente tu perfil de IA predeterminado para conectarse a la API de Gemini y aplicará todas las configuraciones estilísticas e imágenes que guardaste en esa plantilla.
        </p>
      </div>
    </div>
  );
}
