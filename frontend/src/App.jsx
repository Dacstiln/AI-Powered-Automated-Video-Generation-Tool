import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TemplateEditor from './components/TemplateEditor';
import ProfilesEditor from './components/ProfilesEditor';
import SettingsPanel from './components/SettingsPanel';
import PresetsHub from './components/PresetsHub';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Estados cargados desde el servidor
  const [profiles, setProfiles] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [settings, setSettings] = useState({});
  const [gpuInfo, setGpuInfo] = useState(null);
  const [backgroundStatus, setBackgroundStatus] = useState({ count: 0, duration: 0, files: [], playhead: {} });
  const [expressLaunchError, setExpressLaunchError] = useState('');

  // Estado global del job activo (SSE al nivel de App para no perder eventos al cambiar de tab)
  const [activeJob, setActiveJob] = useState(null);
  const [jobLogs, setJobLogs] = useState([]);
  const [jobError, setJobError] = useState('');
  const [jobSuccess, setJobSuccess] = useState('');

  // Conectar SSE globalmente al montar App (persiste entre tabs)
  useEffect(() => {
    const eventSource = new EventSource('/api/jobs/progress');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'init') {
        setActiveJob(data.activeJob);
        if (data.logs && data.logs.length > 0) setJobLogs(data.logs);
      } else if (data.type === 'status') {
        setActiveJob(data.activeJob);
        if (data.status === 'completed') {
          setJobSuccess('Generación de videos completada con éxito.');
          refreshBackgroundVideos();
        } else if (data.status === 'failed') {
          setJobError(data.error || 'Ocurrió un error en el procesamiento.');
        }
      } else if (data.type === 'progress') {
        setActiveJob(data.activeJob);
      } else if (data.type === 'error') {
        setJobError(data.error || 'Error crítico en la generación.');
        setActiveJob(null);
      }

      if (data.log) {
        setJobLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${data.log}`]);
      }
    };

    eventSource.onerror = () => {
      // Se reconecta automáticamente
    };

    return () => eventSource.close();
  }, []);

  // Cargar datos al montar la aplicación
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Obtener Detección de Hardware
      const gpuRes = await fetch('/api/detect-hardware');
      const gpuData = await gpuRes.json();
      setGpuInfo(gpuData);

      // 2. Obtener Ajustes
      const settingsRes = await fetch('/api/settings');
      const settingsData = await settingsRes.json();
      setSettings(settingsData);

      // 3. Obtener Perfiles
      const profilesRes = await fetch('/api/profiles');
      const profilesData = await profilesRes.json();
      setProfiles(profilesData);

      // 4. Obtener Plantillas
      const templatesRes = await fetch('/api/templates');
      const templatesData = await templatesRes.json();
      setTemplates(templatesData);

      // 5. Obtener Biblioteca de Videos
      if (settingsData.backgroundFolder) {
        refreshBackgroundVideos(settingsData.backgroundFolder);
      }
    } catch (error) {
      console.error('Error cargando especificaciones del backend local:', error);
    }
  };

  const refreshBackgroundVideos = async (folder = '') => {
    try {
      const activeFolder = folder || settings.backgroundFolder || '';
      if (!activeFolder) return;
      const res = await fetch(`/api/background-videos?folder=${encodeURIComponent(activeFolder)}`);
      const data = await res.json();
      setBackgroundStatus(data);
    } catch (err) {
      console.error('Error al actualizar biblioteca de fondos:', err);
    }
  };

  // ----------------------------------------------------
  // MANEJADORES DE ACCIÓN API
  // ----------------------------------------------------

  // Guardar Ajustes
  const handleSaveSettings = async (newSettings) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        // Escanear carpeta si cambió
        if (newSettings.backgroundFolder) {
          refreshBackgroundVideos(newSettings.backgroundFolder);
        }
      }
    } catch (err) {
      console.error('Error al guardar ajustes:', err);
    }
  };

  // Guardar Perfil de IA
  const handleSaveProfile = async (profile) => {
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      const data = await res.json();
      if (data.success) {
        // Recargar perfiles
        const pRes = await fetch('/api/profiles');
        const pData = await pRes.json();
        setProfiles(pData);
        return data.profile;
      }
    } catch (err) {
      console.error('Error al guardar perfil de IA:', err);
    }
  };

  // Eliminar Perfil de IA
  const handleDeleteProfile = async (id) => {
    try {
      const res = await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        const pRes = await fetch('/api/profiles');
        const pData = await pRes.json();
        setProfiles(pData);
      }
    } catch (err) {
      console.error('Error al eliminar perfil de IA:', err);
    }
  };

  // Guardar Plantilla de Video
  const handleSaveTemplate = async (template) => {
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });
      const data = await res.json();
      if (data.success) {
        const tRes = await fetch('/api/templates');
        const tData = await tRes.json();
        setTemplates(tData);
        return data.template; // Retornamos la plantilla guardada (con su nuevo ID)
      }
    } catch (err) {
      console.error('Error al guardar plantilla:', err);
    }
    return null;
  };

  // Eliminar Plantilla de Video
  const handleDeleteTemplate = async (id) => {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        const tRes = await fetch('/api/templates');
        const tData = await tRes.json();
        setTemplates(tData);
      }
    } catch (err) {
      console.error('Error al eliminar plantilla:', err);
    }
  };

  // Lanzamiento Express unificado desde el Hub de Plantillas
  const handleLaunchExpress = async (launchParams) => {
    setExpressLaunchError('');
    try {
      // Leer ajustes frescos del servidor para garantizar backgroundFolder actualizado
      const freshSettingsRes = await fetch('/api/settings');
      const freshSettings = await freshSettingsRes.json();
      if (freshSettings) setSettings(freshSettings);

      const bgFolder = freshSettings.backgroundFolder || settings.backgroundFolder || '';
      if (!bgFolder) {
        setExpressLaunchError('No hay carpeta de videos de fondo configurada. Ve a Ajustes y selecciona una carpeta primero.');
        return;
      }

      const template = templates.find(t => t.id === launchParams.templateId);
      const finalProfileId = launchParams.profileId || template?.profileId || freshSettings.defaultProfileId || settings.defaultProfileId || profiles[0]?.id;

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: launchParams.prompt,
          count: launchParams.count,
          profileId: finalProfileId,
          templateId: launchParams.templateId,
          backgroundFolder: bgFolder
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setExpressLaunchError(data.error || 'Error al iniciar la generación rápida.');
        return;
      }
      
      // Agregar log inmediato de inicio
      setJobLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Solicitud de generación enviada al servidor...`]);
      
      // Solo redirigir al Panel de Control si el job se inició correctamente
      setActiveTab('dashboard');
    } catch (err) {
      console.error(err);
      setExpressLaunchError(err.message || 'Error de conexión con el servidor local.');
    }
  };

  return (
    <div className="flex bg-bg-dark min-h-screen text-gray-100">
      {/* Sidebar de navegación */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        gpuInfo={gpuInfo} 
      />

      {/* Panel de Contenido Principal */}
      <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {activeTab === 'dashboard' && (
          <Dashboard 
            profiles={profiles} 
            templates={templates} 
            settings={settings}
            backgroundStatus={backgroundStatus}
            refreshBackground={() => refreshBackgroundVideos()}
            activeJob={activeJob}
            logs={jobLogs}
            jobError={jobError}
            jobSuccess={jobSuccess}
            onClearJobError={() => setJobError('')}
            onClearJobSuccess={() => setJobSuccess('')}
            onLogsInit={(initLogs) => setJobLogs(initLogs)}
          />
        )}
        
        {activeTab === 'presets' && (
          <PresetsHub 
            templates={templates} 
            profiles={profiles}
            settings={settings}
            backgroundStatus={backgroundStatus}
            onLaunchExpress={handleLaunchExpress}
            launchError={expressLaunchError}
            onClearLaunchError={() => setExpressLaunchError('')}
          />
        )}
        
        {activeTab === 'templates' && (
          <TemplateEditor 
            templates={templates} 
            profiles={profiles}
            onSave={handleSaveTemplate}
            onDelete={handleDeleteTemplate}
          />
        )}
        
        {activeTab === 'profiles' && (
          <ProfilesEditor 
            profiles={profiles} 
            onSave={handleSaveProfile}
            onDelete={handleDeleteProfile}
          />
        )}
        
        {activeTab === 'settings' && (
          <SettingsPanel 
            settings={settings} 
            gpuInfo={gpuInfo}
            backgroundStatus={backgroundStatus}
            onSave={handleSaveSettings}
            refreshBackground={() => refreshBackgroundVideos()}
          />
        )}
      </main>
    </div>
  );
}
