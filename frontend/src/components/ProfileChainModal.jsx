import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ArrowUp, ArrowDown, Link, Save } from 'lucide-react';

export default function ProfileChainModal({ isOpen, onClose, profiles, templates, initialChain, onSave }) {
  const [chain, setChain] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setChain(
        initialChain && initialChain.length > 0
          ? initialChain.map(item => ({ ...item }))
          : []
      );
    }
  }, [isOpen, initialChain]);

  if (!isOpen) return null;

  const buildStep = (templateId, count) => {
    const template = templates.find(t => t.id === templateId);
    const profile = profiles.find(p => p.id === template?.profileId) || profiles[0];
    return {
      templateId,
      templateName: template ? template.name : '',
      profileId: profile ? profile.id : '',
      profileName: profile ? profile.name : '',
      count
    };
  };

  const addStep = () => {
    const firstTemplate = templates[0];
    if (!firstTemplate) return;
    setChain(prev => [...prev, buildStep(firstTemplate.id, 1)]);
  };

  const updateStep = (index, field, value) => {
    setChain(prev => prev.map((item, i) => {
      if (i !== index) return item;
      if (field === 'templateId') {
        return { ...buildStep(value, item.count) };
      }
      if (field === 'count') {
        const n = parseInt(value, 10);
        return { ...item, count: Number.isNaN(n) || n < 1 ? 1 : n };
      }
      return item;
    }));
  };

  const removeStep = (index) => {
    setChain(prev => prev.filter((_, i) => i !== index));
  };

  const moveStep = (index, direction) => {
    setChain(prev => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return next;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = () => {
    if (chain.length === 0) {
      onSave(null);
      onClose();
      return;
    }
    onSave(chain);
    onClose();
  };

  const totalVideos = chain.reduce((acc, item) => acc + (item.count || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass-panel rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-border-dark/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-primary/15 flex items-center justify-center text-brand-primary">
              <Link className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Cadena de Plantillas</h2>
              <p className="text-[10px] text-gray-400 font-bold">
                {chain.length === 0
                  ? 'Sin pasos configurados'
                  : `${totalVideos} videos · ${chain.length} ${chain.length === 1 ? 'paso' : 'pasos'}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <p className="text-[10.5px] text-gray-500 leading-relaxed -mt-1">
            Cada paso usa automáticamente el prompt/idea ya configurado en esa plantilla. Solo indica cuántos videos quieres generar con cada una.
          </p>

          {chain.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-6">
              Agrega plantillas para crear una cadena secuencial de generación.
            </p>
          )}

          {chain.map((item, index) => (
            <div key={index} className="bg-black/30 border border-border-dark/50 rounded-xl p-3 flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-500 w-5 text-center shrink-0">{index + 1}</span>

              <div className="flex-1 min-w-0">
                <select
                  value={item.templateId}
                  onChange={(e) => updateStep(index, 'templateId', e.target.value)}
                  className="w-full bg-black/40 border border-border-dark rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-brand-primary/60 cursor-pointer"
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <p className="text-[9px] text-gray-500 mt-1 truncate">Perfil: {item.profileName || '—'}</p>
              </div>

              <input
                type="number"
                min="1"
                value={item.count}
                onChange={(e) => updateStep(index, 'count', e.target.value)}
                className="w-16 bg-black/40 border border-border-dark rounded-lg px-2 py-1.5 text-xs text-white text-center outline-none focus:border-brand-primary/60 shrink-0"
              />

              <div className="flex flex-col shrink-0">
                <button type="button" onClick={() => moveStep(index, -1)} disabled={index === 0}
                  className="text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => moveStep(index, 1)} disabled={index === chain.length - 1}
                  className="text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <button type="button" onClick={() => removeStep(index)}
                className="text-red-400/70 hover:text-red-400 shrink-0 cursor-pointer">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addStep}
            disabled={templates.length === 0}
            className="w-full flex items-center justify-center gap-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary border border-brand-primary/25 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> AGREGAR PASO
          </button>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-border-dark/40">
          <button onClick={onClose}
            className="flex-1 bg-black/40 hover:bg-black/60 text-white border border-border-dark hover:border-gray-500 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer">
            CANCELAR
          </button>
          <button onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-1.5 bg-brand-primary hover:bg-brand-primary/90 text-black font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer">
            <Save className="w-3.5 h-3.5" /> GUARDAR CADENA
          </button>
        </div>

      </div>
    </div>
  );
}