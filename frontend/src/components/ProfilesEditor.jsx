import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, KeyRound, Cpu, FileText, CheckCircle2 } from 'lucide-react';

const GEMINI_MODELS = [
  { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash (Última generación - Máxima velocidad)' },
  { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite (Ultra liviano y costo-eficiente)' },
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview (Vista previa de alta velocidad)' },
  { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview (Vista previa de razonamiento avanzado)' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Avanzado - Alto rendimiento)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Razonamiento complejo)' },
  { value: 'custom', label: 'Personalizado (Especifica el nombre de la API abajo)' }
];

export default function ProfilesEditor({ profiles, onSave, onDelete }) {
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('Nuevo Perfil Gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-3.5-flash');
  const [customModel, setCustomModel] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [success, setSuccess] = useState('');

  // Sincronizar perfiles cargados
  useEffect(() => {
    if (profiles.length > 0) {
      if (selectedId === 'new') {
        // En modo creación, no sobreescribir los estados que se acaban de resetear
        return;
      }
      
      const active = profiles.find(p => p.id === selectedId) || profiles[0];
      if (active) {
        setSelectedId(active.id);
        setName(active.name);
        setApiKey(active.apiKey || '');
        setSystemPrompt(active.systemPrompt || '');
        
        const standardValues = GEMINI_MODELS.map(m => m.value);
        if (standardValues.includes(active.model) && active.model !== 'custom') {
          setModel(active.model);
          setCustomModel('');
        } else {
          setModel('custom');
          setCustomModel(active.model || '');
        }
      }
    }
  }, [selectedId, profiles]);

  const handleCreateNew = () => {
    setSelectedId('new');
    setName('Nuevo Perfil de IA');
    setApiKey('');
    setModel('gemini-3.5-flash');
    setCustomModel('');
    setSystemPrompt('Eres un narrador experto de historias de Reddit. Genera historias cautivadoras, intrigantes y realistas que mantengan al espectador enganchado segundo a segundo. Estructura el relato en primera persona ("Yo..."). El tono debe ser natural, conversacional y misterioso.');
    setSuccess('');
  };

  const handleSaveSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');
    const finalModel = model === 'custom' ? customModel.trim() : model;
    
    if (!finalModel) {
      alert('Por favor especifica un nombre de modelo de IA válido.');
      return;
    }

    const savedProfile = await onSave({
      id: selectedId === 'new' ? undefined : selectedId,
      name,
      apiKey,
      model: finalModel,
      systemPrompt
    });
    
    if (savedProfile && savedProfile.id) {
      setSelectedId(savedProfile.id);
    }
    
    setSuccess('Perfil de IA guardado exitosamente.');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white">GESTIÓN DE PERFILES DE IA</h2>
          <p className="text-xs text-gray-400">Guarda tus API Keys y personaliza las directrices de personalidad que usará el modelo para redactar los guiones.</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all border border-border-dark cursor-pointer animate-pulse-ring"
        >
          <Plus className="w-4 h-4 text-brand-primary" />
          <span>Crear Nuevo Perfil</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selector y Configuración Base (Panel 1/3) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 border-b border-border-dark pb-2">
              <KeyRound className="w-4 h-4 text-brand-primary" />
              <span>Selección de Perfil</span>
            </h3>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400">PERFIL ACTIVO</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full bg-black/40 border border-border-dark rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-primary"
              >
                {selectedId === 'new' && (
                  <option value="new">Nuevo Perfil (Creando...)</option>
                )}
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400">NOMBRE DEL PERFIL</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/40 border border-border-dark rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-primary font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400">MODELO GEMINI</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-black/40 border border-border-dark rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-primary"
              >
                {GEMINI_MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Campo para Modelo Personalizado (Se muestra si se selecciona "custom") */}
            {model === 'custom' && (
              <div className="space-y-1 bg-black/30 p-3 rounded-xl border border-border-dark">
                <label className="block text-[10px] font-bold text-amber-400 uppercase">Nombre de API de Gemini Personalizado</label>
                <input
                  type="text"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="ej. gemini-3.5-flash-1206"
                  className="w-full bg-black/40 border border-border-dark rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-primary font-mono font-bold"
                />
                <span className="text-[8px] text-gray-500 block leading-tight mt-1">
                  Escribe el nombre de API oficial de Gemini (ej. `gemini-3.5-flash` o modelos afinados / experimentales de Google AI Studio).
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Credenciales y Prompts (Panel 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveSubmit} className="glass-panel rounded-2xl p-6 space-y-6">
            
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 border-b border-border-dark pb-2">
              <Cpu className="w-4 h-4 text-brand-primary" />
              <span>Credenciales & Prompt del Sistema</span>
            </h3>

            {/* API Key */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400">GEMINI API KEY</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Introduce tu clave API de Google AI Studio..."
                className="w-full bg-black/40 border border-border-dark rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-primary transition-all duration-200"
              />
              <span className="text-[9px] text-gray-500 block">
                Tu API Key se almacena de forma 100% local en tu ordenador (en el archivo db.json de tu proyecto) y nunca se envía a servidores externos que no sean la API oficial de Google Gemini.
              </span>
            </div>

            {/* Prompt de Sistema */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-brand-primary" />
                <span>INSTRUCCIONES DEL SISTEMA (System Prompt)</span>
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows="10"
                placeholder="Escribe el comportamiento esperado del redactor de historias..."
                className="w-full bg-black/40 border border-border-dark rounded-xl p-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-primary transition-all duration-200 resize-none font-mono leading-relaxed"
              />
            </div>

            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-3 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{success}</span>
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-4 border-t border-border-dark pt-6 justify-end">
              {profiles.length > 1 && selectedId && selectedId !== 'new' && (
                <button
                  type="button"
                  onClick={() => onDelete(selectedId)}
                  className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar Perfil</span>
                </button>
              )}

              <button
                type="submit"
                className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-hover active:scale-[0.98] text-white font-extrabold px-6 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-brand-primary/20"
              >
                <Save className="w-4 h-4 fill-current" />
                <span>Guardar Perfil de IA</span>
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
