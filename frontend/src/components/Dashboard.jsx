import React, { useState, useEffect, useRef } from 'react';
import { Play, Loader2, Info, CheckCircle2, AlertTriangle, Terminal, ListOrdered, X, Layers, Link, RefreshCw, Clock } from 'lucide-react';
import ProfileChainModal from './ProfileChainModal';

const formatTime = (seconds) => {
  if (seconds === undefined || seconds === null) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s} min`;
};

export default function Dashboard({
  profiles, templates, settings, backgroundStatus, refreshBackground,
  activeJob, logs = [], jobError = '', jobSuccess = '',
  onClearJobError, onClearJobSuccess
}) {
  const [seeds, setSeeds] = useState([]);
  const [count, setCount] = useState(1);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [clearedLogsCount, setClearedLogsCount] = useState(0);

  const [profileChain, setProfileChain] = useState(null);
  const [isChainModalOpen, setIsChainModalOpen] = useState(false);

  const [lastFailedCount, setLastFailedCount] = useState(0);
  const [isPausing, setIsPausing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [isRetryingFailed, setIsRetryingFailed] = useState(false);

  useEffect(() => {
    fetch('/api/jobs/failed-count')
      .then(res => res.json())
      .then(data => { if (data.failedCount !== undefined) setLastFailedCount(data.failedCount); })
      .catch(err => console.error(err));
  }, [activeJob]);

  const handlePauseGeneration = async () => {
    setIsPausing(true);
    try { await fetch('/api/jobs/pause', { method: 'POST' }); }
    catch (err) { console.error(err); }
    finally { setIsPausing(false); }
  };

  const handleResumeGeneration = async () => {
    setIsResuming(true);
    try { await fetch('/api/jobs/resume', { method: 'POST' }); }
    catch (err) { console.error(err); }
    finally { setIsResuming(false); }
  };

  const handleRetryFailed = async () => {
    setIsRetryingFailed(true);
    try {
      const res = await fetch('/api/jobs/retry-failed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Error al reintentar videos fallidos'); }
      else { setLastFailedCount(0); }
    } catch (err) {
      console.error(err);
      alert('Error de conexión con el servidor.');
    } finally { setIsRetryingFailed(false); }
  };

  const handleChainCountChange = (index, newCount) => {
    const n = Math.max(1, Math.min(200, parseInt(newCount) || 1));
    setProfileChain(prev => prev.map((item, i) =>
      i === index ? { ...item, count: n } : item
    ));
  };

  const terminalEndRef = useRef(null);

  useEffect(() => {
    setSeeds(prev => {
      const next = [...prev];
      const defaultTemp = templates.find(t => t.id === settings.defaultTemplateId) || templates[0];
      const defaultProf = profiles.find(p => p.id === (defaultTemp?.profileId || settings.defaultProfileId)) || profiles[0];
      if (next.length < count) {
        while (next.length < count) {
          next.push({ prompt: '', templateId: selectedTemplate || defaultTemp?.id || '', profileId: selectedProfile || defaultProf?.id || '' });
        }
      } else if (next.length > count) {
        next.splice(count);
      }
      return next;
    });
  }, [count, templates, profiles, settings]);

  useEffect(() => {
    if (seeds.length > 0) {
      setSeeds(prev => {
        const next = [...prev];
        if (next[0] && (next[0].templateId !== selectedTemplate || next[0].profileId !== selectedProfile)) {
          next[0] = { ...next[0], templateId: selectedTemplate, profileId: selectedProfile };
        }
        return next;
      });
    }
  }, [selectedTemplate, selectedProfile]);

  const handleSeedChange = (index, value) => {
    setSeeds(prev => {
      const next = [...prev];
      next[index] = { ...next[index], prompt: value };
      return next;
    });
  };

  useEffect(() => {
    if (profiles.length > 0 && !selectedProfile) {
      const defaultProf = profiles.find(p => p.id === settings.defaultProfileId) || profiles[0];
      setSelectedProfile(defaultProf.id);
    }
  }, [profiles, settings]);

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      const defaultTemp = templates.find(t => t.id === settings.defaultTemplateId) || templates[0];
      setSelectedTemplate(defaultTemp.id);
    }
  }, [templates, settings]);

  useEffect(() => {
    if (selectedTemplate && templates.length > 0) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template && template.profileId) setSelectedProfile(template.profileId);
    }
  }, [selectedTemplate, templates]);

  useEffect(() => {
    if (selectedProfile && profiles.length > 0) {
      const activeProfile = profiles.find(p => p.id === selectedProfile);
      if (activeProfile) {
        const folder = activeProfile.backgroundFolder || settings.backgroundFolder || '';
        refreshBackground(folder, activeProfile.id);
      }
    }
  }, [selectedProfile, profiles, settings]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleStartGeneration = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);

    if (!profileChain) {
      const hasEmptyPrompt = seeds.some(s => !s.prompt.trim());
      if (hasEmptyPrompt) {
        setSubmitError(count === 1
          ? 'Por favor introduce un prompt de tema para la historia.'
          : 'Por favor especifica los temas para todas las historias del lote.'
        );
        setIsSubmitting(false);
        return;
      }
    }

    try {
      let payload;
      if (profileChain) {
        const batchItems = profileChain.map(item => ({
          templateId: item.templateId,
          profileId: item.profileId,
          count: item.count,
          prompt: ''
        }));
        payload = { batch: batchItems, backgroundFolder: settings.backgroundFolder };
      } else {
        payload = count === 1 ? {
          prompt: seeds[0].prompt, count: 1,
          profileId: selectedProfile, templateId: selectedTemplate,
          backgroundFolder: settings.backgroundFolder
        } : {
          batch: seeds.map((s) => ({ templateId: selectedTemplate, profileId: selectedProfile, count: 1, prompt: s.prompt })),
          backgroundFolder: settings.backgroundFolder
        };
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        setSubmitError(data.error || 'Error al iniciar la cola de renderizado.');
        return;
      }

      const defaultTemp = templates.find(t => t.id === settings.defaultTemplateId) || templates[0];
      const defaultProf = profiles.find(p => p.id === (defaultTemp?.profileId || settings.defaultProfileId)) || profiles[0];
      setSeeds([{ prompt: '', templateId: selectedTemplate || defaultTemp?.id || '', profileId: selectedProfile || defaultProf?.id || '' }]);
      setProfileChain(null);
      setCount(1);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelGeneration = async () => {
    if (!confirm('¿Estás seguro de que deseas detener la generación de videos en curso? El proceso actual se abortará.')) return;
    setIsCancelling(true);
    try {
      const res = await fetch('/api/jobs/cancel', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) alert('Error al detener la generación: ' + (data.error || 'Desconocido'));
    } catch (err) {
      console.error('Error al solicitar la detención del proceso:', err);
      alert('Error de conexión con el servidor local.');
    } finally { setIsCancelling(false); }
  };

  const visibleLogs = logs.slice(clearedLogsCount);
  const totalChainCount = profileChain ? profileChain.reduce((acc, item) => acc + item.count, 0) : count;
  const leftColSpan = profileChain ? 'lg:col-span-3' : 'lg:col-span-2';
  const rightColSpan = profileChain ? 'lg:col-span-2' : 'lg:col-span-3';

  const getGlobalOffset = (idx) => {
    if (!profileChain) return 0;
    let offset = 1;
    for (let i = 0; i < idx; i++) offset += profileChain[i].count;
    return offset;
  };

  // Detectar si el job está en modo reintento automático
  const isAutoRetrying = activeJob && activeJob.status === 'retrying';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <span>GENERADOR AUTOMÁTICO DE CONTENIDO</span>
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Genera historias de Reddit, conviértelas a voz y edítalas en video vertical continuo con un solo click.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className={`${leftColSpan} space-y-6 transition-all duration-300`}>
          <form onSubmit={handleStartGeneration} className="glass-panel rounded-2xl p-6 space-y-6">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 border-b border-border-dark/40 pb-3">
              <ListOrdered className="w-4.5 h-4.5 text-brand-primary" />
              <span>Nueva Cola de Videos</span>
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider">
                  Paso 1: Cantidad de Videos
                </label>
                <span className={`text-[9px] font-black px-2.5 py-0.5 rounded border ${
                  profileChain
                    ? 'bg-brand-primary/15 text-brand-primary border-brand-primary/30'
                    : 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
                }`}>
                  {profileChain ? 'Cadena de Perfiles' : 'Fila de Trabajo'}
                </span>
              </div>

              {profileChain ? (
                <div className="bg-brand-primary/8 border border-brand-primary/25 rounded-2xl p-4 space-y-3.5 animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-primary/15 flex items-center justify-center text-brand-primary shrink-0">
                      <Link className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-gray-400 block uppercase">Cadena Secuencial Activa</span>
                      <span className="text-xs font-black text-white leading-normal">
                        {totalChainCount} videos · {profileChain.length} {profileChain.length === 1 ? 'paso' : 'pasos'}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto">
                        {profileChain.map((item, i) => (
                          <React.Fragment key={i}>
                            <span className="text-[8.5px] font-bold text-brand-primary/80 bg-brand-primary/10 border border-brand-primary/20 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                              {item.templateName} ({item.count})
                            </span>
                            {i < profileChain.length - 1 && <span className="text-gray-600 text-xs shrink-0">→</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIsChainModalOpen(true)} disabled={!!activeJob}
                      className="flex-1 bg-black/40 hover:bg-black/60 text-white border border-border-dark hover:border-gray-500 font-bold py-2 rounded-xl text-[10.5px] transition-all cursor-pointer text-center">
                      ✎ EDITAR CADENA
                    </button>
                    <button type="button" onClick={() => setProfileChain(null)} disabled={!!activeJob}
                      className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold py-2 rounded-xl text-[10.5px] transition-all cursor-pointer text-center">
                      ✕ MODO SIMPLE
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2.5">
                    <input type="number" min="1" max="100" value={count}
                      onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                      disabled={!!activeJob}
                      className="bg-black/40 border border-border-dark rounded-xl px-3 py-2.5 text-sm text-white font-bold w-20 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/40 disabled:opacity-50 text-center transition-all"
                    />
                    <div className="flex-1 grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 5, 10].map((num) => (
                        <button key={num} type="button" onClick={() => setCount(num)} disabled={!!activeJob}
                          className={`py-2.5 rounded-xl font-bold text-xs border transition-all duration-300 ${
                            count === num
                              ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/30 scale-[1.02]'
                              : 'bg-black/30 border-border-dark text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-800/20'
                          } disabled:opacity-50 cursor-pointer`}>
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="button" onClick={() => setIsChainModalOpen(true)} disabled={!!activeJob}
                    className="w-full bg-black/40 hover:bg-black/60 hover:border-brand-primary/40 border border-border-dark text-gray-300 hover:text-white font-extrabold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                    <Link className="w-3.5 h-3.5 text-brand-primary animate-pulse" />
                    <span>CADENA SECUENCIAL POR PERFILES (AUTOMÁTICO)</span>
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider">
                  Paso 2: {profileChain ? 'Resumen de la Cadena (Automático)' : count === 1 ? 'Idea de la Historia' : 'Temas e Ideas del Lote'}
                </label>
                {profileChain ? (
                  <span className="text-[9px] bg-brand-primary/15 text-brand-primary font-bold px-2 py-0.5 rounded-full border border-brand-primary/25 uppercase tracking-wide">
                    Cadena ({totalChainCount} Videos)
                  </span>
                ) : count > 1 ? (
                  <span className="text-[9px] bg-brand-primary/15 text-brand-primary font-bold px-2 py-0.5 rounded-full border border-brand-primary/20 uppercase tracking-wide">
                    {count} Videos Configurados
                  </span>
                ) : null}
              </div>

              {profileChain ? (
                <div className="flex gap-4 overflow-x-auto pb-3 pt-1 px-0.5 max-w-full custom-scrollbar">
                  {profileChain.map((item, idx) => {
                    const globalOffset = getGlobalOffset(idx);
                    const isActive = activeJob && activeJob.currentTemplateId === item.templateId;
                    return (
                      <div key={idx} className={`flex-1 min-w-[220px] max-w-[280px] p-4 rounded-2xl flex flex-col space-y-2.5 animate-fadeIn transition-all duration-300 ${
                        isActive ? 'bg-emerald-500/5 border-2 border-emerald-500/70 shadow-lg shadow-emerald-500/5 scale-[1.01]' : 'bg-black/25 border border-brand-primary/20'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-black text-white uppercase tracking-wide truncate">{item.templateName}</h4>
                              {isActive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />}
                            </div>
                            <p className={`text-[9px] font-extrabold uppercase mt-0.5 truncate transition-colors duration-300 ${isActive ? 'text-emerald-400' : 'text-brand-primary'}`}>
                              Perfil: {item.profileName}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <label className="text-[8px] font-black text-gray-500 uppercase">Videos</label>
                            <input type="number" min="1" max="200" value={item.count}
                              onChange={(e) => handleChainCountChange(idx, e.target.value)}
                              disabled={!!activeJob}
                              className="w-16 bg-black/55 border border-border-dark rounded-lg px-2 py-1 text-xs text-white font-bold text-center focus:outline-none focus:border-brand-primary disabled:opacity-50"
                            />
                          </div>
                        </div>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded inline-block transition-colors duration-300 ${
                          isActive ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-brand-primary/70 bg-brand-primary/10 border border-brand-primary/20'
                        }`}>
                          #{globalOffset} → #{globalOffset + item.count - 1} · {item.count} {item.count === 1 ? 'video' : 'videos'}
                        </span>
                        <p className="text-[9.5px] text-gray-500 leading-relaxed pt-1 border-t border-border-dark/30">
                          Se usará automáticamente el prompt configurado en esta plantilla, {item.count} {item.count === 1 ? 'vez' : 'veces'}.
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                count === 1 ? (
                  <textarea value={seeds[0]?.prompt || ''} onChange={(e) => handleSeedChange(0, e.target.value)}
                    placeholder="Ej. Historias escalofriantes sobre campamentos en bosques abandonados..." rows="4" disabled={!!activeJob}
                    className="w-full bg-black/40 border border-border-dark rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50 transition-all duration-200 resize-none disabled:opacity-50 font-medium"
                  />
                ) : (
                  <div className="space-y-3.5 max-h-[340px] overflow-y-auto pr-1 border border-border-dark/40 bg-black/10 p-3 rounded-2xl divide-y divide-border-dark/20">
                    {seeds.map((s, idx) => (
                      <div key={idx} className={`space-y-2 ${idx > 0 ? 'pt-3.5' : ''}`}>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center text-[10px] font-black border border-brand-primary/30">{idx + 1}</span>
                          <span className="text-xs font-black text-gray-300 uppercase tracking-wide">Video #{idx + 1}</span>
                        </div>
                        <textarea value={s.prompt || ''} onChange={(e) => handleSeedChange(idx, e.target.value)}
                          placeholder={`Escribe el tema o idea para el video #${idx + 1}...`} rows="2.5" disabled={!!activeJob}
                          className="w-full bg-black/40 border border-border-dark rounded-xl p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50 transition-all duration-200 resize-none disabled:opacity-50 font-medium"
                        />
                      </div>
                    ))}
                  </div>
                )
              )}

              <span className="text-[10px] text-gray-500 flex items-start gap-1.5 px-1 leading-normal">
                <Info className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                <span>La IA analizará el tema, creará la historia y clasificará el género de voz automáticamente.</span>
              </span>
            </div>

            {!profileChain && (
              <div className="bg-black/25 p-4 rounded-2xl border border-border-dark/60 space-y-4">
                <div className="flex justify-between items-center border-b border-border-dark/40 pb-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider">Paso 3: Estilo Global por Defecto</label>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/20">SISTEMA DE RESPALDO</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase">PLANTILLA VISUAL & VOZ</label>
                    <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} disabled={!!activeJob}
                      className="w-full bg-black/45 border border-border-dark rounded-xl px-2.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/40 disabled:opacity-50 font-bold cursor-pointer transition-all">
                      {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase">PERFIL IA / MODELO</label>
                    <select value={selectedProfile} onChange={(e) => setSelectedProfile(e.target.value)} disabled={!!activeJob}
                      className="w-full bg-black/45 border border-border-dark rounded-xl px-2.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/40 disabled:opacity-50 font-bold cursor-pointer transition-all">
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.name} ({p.model})</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {submitError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3.5 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /><span>{submitError}</span>
              </div>
            )}
            {jobError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3.5 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="flex-1">{jobError}</span>
                {onClearJobError && <button onClick={onClearJobError} className="text-red-400/60 hover:text-red-400 font-bold cursor-pointer ml-1 text-base leading-none">×</button>}
              </div>
            )}
            {jobSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-3.5 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="flex-1">{jobSuccess}</span>
                {onClearJobSuccess && <button onClick={onClearJobSuccess} className="text-emerald-400/60 hover:text-emerald-400 font-bold cursor-pointer ml-1 text-base leading-none">×</button>}
              </div>
            )}

            <button type="submit" disabled={isSubmitting || !!activeJob}
              className="w-full bg-brand-primary hover:bg-brand-primary-hover active:scale-[0.98] disabled:bg-gray-800 disabled:text-gray-500 disabled:scale-100 text-white font-extrabold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-primary/20">
              {isSubmitting || activeJob ? (
                <><Loader2 className="w-5 h-5 animate-spin" /><span>RENDERIZANDO EN COLA...</span></>
              ) : (
                <><Play className="w-5 h-5 fill-current" /><span>COMENZAR GENERACIÓN DE VIDEOS</span></>
              )}
            </button>
          </form>

          <div className="glass-panel rounded-2xl p-4 flex items-center justify-between border-l-4 border-l-brand-primary">
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">PISTA DE VIDEO CONTINUA</span>
              <span className="text-sm font-extrabold text-white">{backgroundStatus.count} videos detectados</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">PLAYHEAD OFFSET</span>
              <span className="text-sm font-extrabold text-brand-primary">
                Vídeo #{backgroundStatus.playhead?.currentVideoIndex || 0} a las {(backgroundStatus.playhead?.currentOffset || 0).toFixed(0)}s
              </span>
            </div>
          </div>
        </div>

        <div className={`${rightColSpan} flex flex-col space-y-6 transition-all duration-300`}>
          {/* Tarjeta de Progreso Activo */}
          {activeJob && (
            <div className={`glass-panel rounded-2xl p-6 space-y-4 border-l-4 ${isAutoRetrying ? 'border-l-amber-400' : 'border-l-emerald-500'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider block animate-pulse ${isAutoRetrying ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {isAutoRetrying ? '🔄 REINTENTANDO AUTOMÁTICAMENTE' : 'PROCESO DE RENDERIZACIÓN ACTIVO'}
                  </span>
                  <h4 className="text-lg font-black text-white mt-1">
                    Vídeo {activeJob.currentVideoIndex} de {activeJob.totalCount}
                  </h4>
                  {activeJob.elapsedSeconds !== undefined && (
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1 font-semibold">
                      <span>Transcurrido: {formatTime(activeJob.elapsedSeconds)}</span>
                      <span>·</span>
                      <span className="text-brand-primary">
                        Restante: {activeJob.etaSeconds !== null ? formatTime(activeJob.etaSeconds) : 'Calculando...'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-white">{activeJob.progress}%</span>
                  <span className="text-[10px] text-gray-400 block font-semibold">de codificación</span>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="w-full bg-gray-800/80 rounded-full h-3.5 overflow-hidden border border-border-dark shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-300 shadow-lg relative overflow-hidden ${
                    isAutoRetrying
                      ? 'bg-gradient-to-r from-amber-500 to-orange-400 shadow-amber-500/25'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-emerald-500/25'
                  }`}
                  style={{ width: `${activeJob.progress}%` }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-bar-stripes_1s_linear_infinite]" />
                </div>
              </div>

              {/* Bloque de reintento automático */}
              {isAutoRetrying && (
                <div className="bg-amber-500/8 border border-amber-500/25 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      <span className="text-xs font-black text-amber-400 uppercase">
                        Reintento automático {activeJob.retryCount || 1}/3
                      </span>
                    </div>
                    {activeJob.retryWaitSeconds > 0 && (
                      <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span className="text-xs font-black text-amber-300 font-mono">{activeJob.retryWaitSeconds}s</span>
                      </div>
                    )}
                  </div>
                  {activeJob.lastErrorMsg && (
                    <p className="text-[10px] text-amber-300/70 font-mono leading-relaxed truncate" title={activeJob.lastErrorMsg}>
                      Error anterior: {activeJob.lastErrorMsg}
                    </p>
                  )}
                  <p className="text-[9px] text-gray-500">
                    {activeJob.retryWaitSeconds > 0
                      ? `Esperando ${activeJob.retryWaitSeconds}s antes de reintentar...`
                      : 'Reintentando la generación ahora...'}
                  </p>
                </div>
              )}

              {/* Paso actual */}
              <div className="flex items-center gap-2 text-xs font-bold text-gray-300 bg-black/30 px-3.5 py-2.5 rounded-xl border border-border-dark">
                {activeJob.isPaused ? (
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                ) : isAutoRetrying ? (
                  <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                ) : (
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
                )}
                <span className="truncate flex-grow">
                  {activeJob.isPaused ? 'Cola en pausa' : activeJob.currentStep || 'Renderizando...'}
                </span>
              </div>

              {/* Controles de Pausa y Cancelación */}
              <div className="flex flex-col sm:flex-row gap-2">
                {activeJob.isPaused ? (
                  <button type="button" onClick={handleResumeGeneration} disabled={isResuming}
                    className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98] font-extrabold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/25 disabled:opacity-50">
                    {isResuming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '▶ REANUDAR'}
                  </button>
                ) : activeJob.pauseRequested ? (
                  <button type="button" disabled
                    className="flex-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-extrabold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 opacity-85">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /><span>⏸ PAUSANDO...</span>
                  </button>
                ) : (
                  <button type="button" onClick={handlePauseGeneration} disabled={isPausing || isAutoRetrying}
                    className="flex-1 bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 border border-amber-500/20 font-extrabold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
                    {isPausing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '⏸ PAUSAR'}
                  </button>
                )}
                <button type="button" onClick={handleCancelGeneration} disabled={isCancelling}
                  className="flex-1 bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/20 font-extrabold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer disabled:opacity-50">
                  {isCancelling ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" /><span>DETENIENDO...</span></>
                  ) : (
                    <><AlertTriangle className="w-3.5 h-3.5 text-red-400" /><span>CANCELAR COLA</span></>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Alerta de Videos Fallidos */}
          {!activeJob && lastFailedCount > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wide">Lote anterior con errores</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Se detectaron {lastFailedCount} videos fallidos en el lote.</p>
                </div>
              </div>
              <button type="button" onClick={handleRetryFailed} disabled={isRetryingFailed}
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/25">
                {isRetryingFailed ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>REINTENTANDO...</span></>
                ) : (
                  <><Play className="w-3.5 h-3.5 fill-current" /><span>REINTENTAR VIDEOS FALLIDOS</span></>
                )}
              </button>
            </div>
          )}

          {/* Consola de Logs */}
          <div className="glass-panel rounded-2xl flex-1 flex flex-col overflow-hidden">
            <div className="bg-gray-900 border-b border-border-dark px-4 py-3 flex items-center justify-between shrink-0 rounded-t-2xl">
              <div className="flex items-center gap-6">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]"></span>
                  <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]"></span>
                  <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]"></span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                  <Terminal className="w-4 h-4 text-brand-primary" />
                  <span>Terminal de Logs en Vivo</span>
                  {activeJob && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </div>
              </div>
              {logs.length > clearedLogsCount && (
                <button type="button" onClick={() => setClearedLogsCount(logs.length)}
                  className="text-[10px] font-black text-gray-400 hover:text-white bg-black/45 border border-border-dark/80 px-2.5 py-1 rounded-md transition-all hover:bg-gray-800/40 cursor-pointer">
                  LIMPIAR CONSOLA
                </button>
              )}
            </div>
            <div className="bg-black/60 p-5 flex-grow overflow-y-auto h-[350px] font-mono text-xs space-y-2.5 border-t-0 text-gray-300">
              {visibleLogs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 italic select-none">
                  La terminal está inactiva. Introduce un prompt e inicia la cola para ver los logs en vivo.
                </div>
              ) : (
                visibleLogs.map((log, i) => {
                  const isError = log.includes('ERROR') || log.includes('❌') || log.includes('falló') || log.includes('FALLO');
                  const isRetry = log.includes('REINTENTO') || log.includes('⏳') || log.includes('🔄');
                  const isSuccess = log.includes('COMPILADO') || log.includes('exitosamente') || log.includes('🎉') || log.includes('con éxito');
                  let color = 'text-gray-300';
                  if (isError) color = 'text-red-400 font-bold';
                  if (isRetry) color = 'text-amber-400 font-bold';
                  if (isSuccess) color = 'text-emerald-400 font-bold';
                  return <div key={i} className={`${color} leading-relaxed break-words`}>{log}</div>;
                })
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </div>
      </div>

      <ProfileChainModal
        isOpen={isChainModalOpen}
        onClose={() => setIsChainModalOpen(false)}
        profiles={profiles}
        templates={templates}
        initialChain={profileChain}
        onSave={(chain) => setProfileChain(chain)}
      />
    </div>
  );
}