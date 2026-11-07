import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, HardDrive, Cpu, Film, CheckCircle2, FileVideo } from 'lucide-react';

export default function SettingsPanel({ settings, gpuInfo, backgroundStatus, onSave, refreshBackground }) {
  const [backgroundFolder, setBackgroundFolder] = useState('');
  const [exportFolder, setExportFolder] = useState('');
  const [renderEngine, setRenderEngine] = useState('auto');
  const [renderQuality, setRenderQuality] = useState('quality');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (settings) {
      setBackgroundFolder(settings.backgroundFolder || '');
      setExportFolder(settings.exportFolder || '');
      setRenderEngine(settings.renderEngine || 'auto');
      setRenderQuality(settings.renderQuality || 'quality');
      setSelectedFiles(settings.selectedFiles || []);
    }
  }, [settings]);

  const handlePickFolder = async (target) => {
    try {
      const res = await fetch('/api/dialog/folder');
      const data = await res.json();
      if (data.path) {
        if (target === 'background') {
          setBackgroundFolder(data.path);
          setSelectedFiles([]); // Limpiar selección manual de archivos al elegir carpeta
        } else {
          setExportFolder(data.path);
        }
      }
    } catch (err) {
      console.error('Error al abrir selector nativo de carpeta:', err);
    }
  };

  const handlePickFiles = async () => {
    try {
      const res = await fetch('/api/dialog/files');
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        setSelectedFiles(data.files);
        // Rellenar automáticamente la carpeta padre en el input visual
        const lastSlash = data.files[0].lastIndexOf('\\');
        if (lastSlash !== -1) {
          const parentDir = data.files[0].substring(0, lastSlash);
          setBackgroundFolder(parentDir);
        }
      }
    } catch (err) {
      console.error('Error al abrir selector nativo de archivos:', err);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccess('');
    onSave({
      backgroundFolder,
      exportFolder,
      renderEngine,
      renderQuality,
      selectedFiles
    });
    setSuccess('Ajustes y rutas locales guardados exitosamente.');
    refreshBackground(); // Escanear biblioteca
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-black text-white">AJUSTES DEL EDITOR DE VIDEO</h2>
        <p className="text-xs text-gray-400">Vincula tus directorios locales, elige videos específicos y fuerza de manera manual el codificador de hardware para FFmpeg.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Panel de Configuración de Rutas (3/5) */}
        <div className="lg:col-span-3 space-y-6">
          <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6 space-y-6">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 border-b border-border-dark pb-2">
              <HardDrive className="w-4 h-4 text-brand-primary" />
              <span>Directorios Locales de Trabajo</span>
            </h3>

            {/* Carpeta de Videos de Fondo */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase">Videos de Fondo (Background Videos)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={backgroundFolder}
                  onChange={(e) => setBackgroundFolder(e.target.value)}
                  placeholder="Ningún directorio seleccionado..."
                  className="w-full bg-black/40 border border-border-dark rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-primary font-mono truncate"
                />
                
                {/* Botón de Carpeta */}
                <button
                  type="button"
                  onClick={() => handlePickFolder('background')}
                  title="Seleccionar Carpeta Completa"
                  className="bg-gray-800 hover:bg-gray-700 text-white font-bold p-3 rounded-xl border border-border-dark cursor-pointer transition-all duration-200"
                >
                  <FolderOpen className="w-5 h-5 text-brand-primary" />
                </button>

                {/* Botón de Archivos */}
                <button
                  type="button"
                  onClick={handlePickFiles}
                  title="Seleccionar Archivos de Video Específicos"
                  className="bg-gray-800 hover:bg-gray-700 text-white font-bold p-3 rounded-xl border border-border-dark cursor-pointer transition-all duration-200 flex items-center gap-1.5 text-xs"
                >
                  <FileVideo className="w-5 h-5 text-brand-primary shrink-0" />
                  <span className="hidden sm:inline">Elegir Archivos</span>
                </button>
              </div>
              
              {selectedFiles.length > 0 ? (
                <span className="text-[10px] text-amber-400 font-bold block">
                  ★ Usando {selectedFiles.length} videos específicos seleccionados manualmente.
                </span>
              ) : (
                <span className="text-[10px] text-gray-500 block">
                  Puedes seleccionar una carpeta completa para que el sistema escanee todos sus videos, o hacer click en "Elegir Archivos" para seleccionar videos de fondo específicos de corrido.
                </span>
              )}
            </div>

            {/* Carpeta de Exportación */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase">Carpeta de Salida de Videos (Export Folder)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={exportFolder}
                  onChange={(e) => setExportFolder(e.target.value)}
                  placeholder="Ningún directorio de salida seleccionado..."
                  className="w-full bg-black/40 border border-border-dark rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-primary font-mono truncate"
                />
                
                <button
                  type="button"
                  onClick={() => handlePickFolder('export')}
                  className="bg-gray-800 hover:bg-gray-700 text-white font-bold p-3 rounded-xl border border-border-dark cursor-pointer transition-all duration-200"
                >
                  <FolderOpen className="w-5 h-5 text-brand-primary" />
                </button>
              </div>
              <span className="text-[10px] text-gray-500 block">
                Ruta local donde se exportarán tus videos listos. Se guardarán en orden con el nombre de la historia generada.
              </span>
            </div>

            {/* Forzar Renderizador GPU */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase">Codificador de Renderizado (Manual GPU/CPU Lock)</label>
              <select
                value={renderEngine}
                onChange={(e) => setRenderEngine(e.target.value)}
                className="w-full bg-black/40 border border-border-dark rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-brand-primary"
              >
                <option value="auto">Auto-Detectar Gráfica Activa (Recomendado)</option>
                <option value="h264_nvenc">NVIDIA NVENC (Acelerado por GPU NVIDIA)</option>
                <option value="h264_amf">AMD AMF (Acelerado por GPU AMD/Radeon)</option>
                <option value="h264_qsv">Intel QuickSync (Acelerado por GPU integrada de Intel)</option>
                <option value="libx264">CPU Standard (Sin GPU - Más compatible, lento)</option>
              </select>
              <span className="text-[10px] text-gray-500 block">
                Por defecto, el backend detecta tu hardware en Windows y elige la mejor aceleración. Si deseas forzar un motor de codificación específico, elígelo en esta lista.
              </span>
            </div>

            {/* Velocidad de Renderizado */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase">Velocidad de Renderizado</label>
              <select
                value={renderQuality}
                onChange={(e) => setRenderQuality(e.target.value)}
                className="w-full bg-black/40 border border-border-dark rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-brand-primary"
              >
                <option value="quality">Calidad Máxima (más lento — comportamiento actual)</option>
                <option value="balanced">Equilibrado (notablemente más rápido, calidad casi igual)</option>
                <option value="fast">Velocidad Máxima (mucho más rápido, ligera pérdida de nitidez)</option>
              </select>
              <span className="text-[10px] text-gray-500 block">
                Controla qué tanto prioriza FFmpeg la velocidad de codificación sobre la nitidez. "Equilibrado" es buena opción para lotes grandes de videos.
              </span>
            </div>

            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-3 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{success}</span>
              </div>
            )}

            {/* Acciones */}
            <div className="flex justify-end pt-4 border-t border-border-dark">
              <button
                type="submit"
                className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-hover active:scale-[0.98] text-white font-extrabold px-6 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-brand-primary/20"
              >
                <Save className="w-4 h-4 fill-current" />
                <span>Guardar Ajustes de Ruta</span>
              </button>
            </div>

          </form>
        </div>

        {/* Panel de Hardware y Biblioteca (2/5) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tarjeta de Gráfica */}
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 border-b border-border-dark pb-2">
              <Cpu className="w-4 h-4 text-brand-primary" />
              <span>Especificación de Codificación GPU</span>
            </h3>

            <div className="space-y-3">
              <div className="bg-black/40 rounded-xl p-3 border border-border-dark space-y-2">
                <span className="text-[10px] text-gray-400 font-bold block uppercase">Tarjetas Gráficas Detectadas ({gpuInfo?.allGpus?.length || 0})</span>
                {gpuInfo?.allGpus && gpuInfo.allGpus.length > 0 ? (
                  <ul className="list-disc list-inside text-xs text-white space-y-1 font-bold">
                    {gpuInfo.allGpus.map((gpu, idx) => (
                      <li key={idx} className="truncate">{gpu}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-xs font-black text-white">{gpuInfo?.gpuName || 'CPU Standard'}</span>
                )}
              </div>

              <div className="bg-black/40 rounded-xl p-3 border border-border-dark">
                <span className="text-[10px] text-gray-400 font-bold block">MOTOR DE ENCODE ACTIVO</span>
                <span className="text-xs font-mono font-bold text-brand-primary">
                  {renderEngine === 'auto' ? `Auto (${gpuInfo?.codec || 'libx264'})` : renderEngine}
                </span>
              </div>

              <p className="text-[10px] text-gray-500 leading-relaxed">
                {renderEngine === 'auto' 
                  ? gpuInfo?.description 
                  : `Se ha forzado el renderizador manual: "${renderEngine}". Asegúrate de tener los controladores de hardware adecuados instalados en tu sistema.`
                }
              </p>
            </div>
          </div>

          {/* Estado biblioteca */}
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 border-b border-border-dark pb-2">
              <Film className="w-4 h-4 text-brand-primary" />
              <span>Biblioteca de Fondos Actual</span>
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Archivos Cargados:</span>
                <span className="font-bold text-white">
                  {selectedFiles.length > 0 ? `${selectedFiles.length} específicos` : `${backgroundStatus?.count || 0} de carpeta`}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Duración Total de Fondos:</span>
                <span className="font-bold text-white">
                  {backgroundStatus?.totalDuration ? `${Math.round(backgroundStatus.totalDuration / 60)} min` : '0 min'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Playhead Virtual actual:</span>
                <span className="font-mono text-brand-primary font-bold">
                  v_{backgroundStatus.playhead?.currentVideoIndex || 0} ({backgroundStatus.playhead?.currentOffset || 0}s)
                </span>
              </div>
              <p className="text-[9px] text-gray-500 mt-2">
                * El playhead virtual se desliza hacia adelante con cada video generado para lograr un fondo de corrido, simulando un gameplay continuo de fondo.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}