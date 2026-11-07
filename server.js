const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { v4: uuidv4 } = require('uuid');

// Importar servicios locales
const db = require('./services/db');
const gpu = require('./services/gpuDetector');
const gemini = require('./services/gemini');
const tts = require('./services/tts');
const cardRenderer = require('./services/cardRenderer');
const subtitles = require('./services/subtitles');
const timeline = require('./services/timeline');
const ffmpeg = require('./services/ffmpeg');
const dialogs = require('./services/dialogs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Carpetas de almacenamiento temporal
const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}
const PREVIEWS_DIR = path.join(TEMP_DIR, 'previews');
if (!fs.existsSync(PREVIEWS_DIR)) {
  fs.mkdirSync(PREVIEWS_DIR, { recursive: true });
}
const AVATARS_DIR = path.join(TEMP_DIR, 'avatars');
if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

// Servir carpetas estáticas
app.use('/previews', express.static(PREVIEWS_DIR));
app.use('/avatars', express.static(AVATARS_DIR));

// Estado de la cola de trabajos en memoria
let activeJob = null;
let jobLogs = [];
const sseClients = new Set();
let cancelRequested = false;
let pauseRequested = false;
let isPaused = false;
let failedItems = [];
let batchStartTime = null;

// -------------------------------------------------------
// REINTENTO AUTOMÁTICO: configuración y clasificación
// -------------------------------------------------------
const MAX_AUTO_RETRIES = 3;       // Intentos automáticos por video antes de marcarlo fallido
const RETRY_WAIT_MS = 90000;      // 90 segundos de espera entre reintentos automáticos

/**
 * Determina si un error es recuperable (temporal) y merece reintento automático.
 * Los errores permanentes (ruta inválida, plantilla corrupta, etc.) NO se reintentan.
 */
function isRetryableError(err) {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  // Errores de red / API temporales
  if (msg.includes('timeout')) return true;
  if (msg.includes('rate limit') || msg.includes('quota') || msg.includes('resource_exhausted')) return true;
  if (msg.includes('503') || msg.includes('502') || msg.includes('429') || msg.includes('500')) return true;
  if (msg.includes('network') || msg.includes('econnreset') || msg.includes('enotfound') || msg.includes('econnrefused')) return true;
  if (msg.includes('fetch failed') || msg.includes('socket hang up')) return true;
  // FFmpeg errores transitorios (ej. bloqueo de recurso)
  if (msg.includes('ffmpeg') && (msg.includes('ebusy') || msg.includes('eagain') || msg.includes('código') && msg.includes('1'))) return true;
  // Errores de I/O temporales
  if (msg.includes('ebusy') || msg.includes('eagain')) return true;
  return false;
}

function getEtaSeconds(job) {
  if (!batchStartTime) return null;
  const elapsedMs = Date.now() - batchStartTime;
  const finishedCount = job.currentVideoIndex - 1;
  const progressRatio = (job.progress || 0) / 100;
  const estimatedCompletedVideos = finishedCount + progressRatio;

  if (estimatedCompletedVideos < 0.05) {
    return 90 * job.totalCount;
  }

  const avgTimePerVideo = elapsedMs / estimatedCompletedVideos;
  const remainingVideos = job.totalCount - estimatedCompletedVideos;
  return Math.max(0, Math.round((avgTimePerVideo * remainingVideos) / 1000));
}

async function sendNotification(messageOrOptions) {
  try {
    const currentDb = db.readDb();
    const settings = currentDb.settings || {};

    let tgMessage = '';
    let discordPayload = null;

    if (typeof messageOrOptions === 'object' && messageOrOptions !== null) {
      const { status, successCount, totalCount, failedCount, durationStr, profileList, templateList, exportFolder, errorMsg } = messageOrOptions;

      if (status === 'completed') {
        tgMessage = `🎉 *[REDIT-GEN] ¡LOTE COMPLETADO CON ÉXITO!* 🎉\n\n` +
          `🟢 *Estado:* Completado exitosamente\n` +
          `⏱️ *Tiempo Total:* ${durationStr}\n` +
          `📹 *Videos Generados:* ${successCount} de ${totalCount} ✅\n` +
          `👤 *Perfil(es) Usado(s):* ${profileList || 'Por defecto'}\n` +
          `🎨 *Plantilla(s) Usada(s):* ${templateList || 'Por defecto'}\n` +
          `📁 *Carpeta de Salida:* \`${exportFolder || 'N/A'}\`\n\n` +
          `¡Tus videos están listos para ser publicados! 🚀`;
      } else if (status === 'completed_with_errors') {
        tgMessage = `⚠️ *[REDIT-GEN] ¡LOTE FINALIZADO CON DETALLES!* ⚠️\n\n` +
          `🟡 *Estado:* Finalizado con algunos errores\n` +
          `⏱️ *Tiempo Total:* ${durationStr}\n` +
          `📹 *Videos Exitosos:* ${successCount} de ${totalCount} ✅\n` +
          `❌ *Videos Fallados:* ${failedCount} ❌\n` +
          `👤 *Perfil(es) Usado(s):* ${profileList || 'Por defecto'}\n` +
          `🎨 *Plantilla(s) Usada(s):* ${templateList || 'Por defecto'}\n` +
          `📁 *Carpeta de Salida:* \`${exportFolder || 'N/A'}\`\n\n` +
          `🔄 Los videos fallidos se pueden reintentar desde el Dashboard con un solo clic.`;
      } else if (status === 'cancelled') {
        tgMessage = `🛑 *[REDIT-GEN] GENERACIÓN DETENIDA* 🛑\n\n` +
          `• *Estado:* Cancelado por el usuario\n` +
          `• *Videos procesados:* ${successCount || 0} de ${totalCount || 0}\n` +
          `• *Tiempo transcurrido:* ${durationStr || '0s'} ⏱️`;
      } else {
        tgMessage = `💥 *[REDIT-GEN] ERROR CRÍTICO EN EL LOTE* 💥\n\n` +
          `• *Estado:* Fallido\n` +
          `• *Error:* ${errorMsg || 'Error desconocido'}\n` +
          `• *Tiempo transcurrido:* ${durationStr || '0s'} ⏱️`;
      }

      const embedColor = status === 'completed' ? 3066993
        : status === 'completed_with_errors' ? 15105570
        : status === 'cancelled' ? 10070709
        : 15158332;

      const embedTitle = status === 'completed' ? '🎉 ¡LOTE COMPLETADO CON ÉXITO!'
        : status === 'completed_with_errors' ? '⚠️ LOTE FINALIZADO CON DETALLES'
        : status === 'cancelled' ? '🛑 GENERACIÓN DETENIDA'
        : '💥 ERROR CRÍTICO EN EL LOTE';

      const embedDesc = status === 'completed' ? 'El generador de videos ha finalizado la cola de renderizado sin fallas.'
        : status === 'completed_with_errors' ? 'La cola de renderizado ha terminado, pero se registraron algunos errores.'
        : status === 'cancelled' ? 'El renderizado fue cancelado manualmente por el usuario.'
        : 'El renderizado se interrumpió debido a un error inesperado.';

      const fields = [];
      if (status === 'completed' || status === 'completed_with_errors') {
        fields.push({ name: '⏱️ Tiempo Total', value: durationStr || 'N/A', inline: true });
        if (status === 'completed') {
          fields.push({ name: '📹 Videos Generados', value: `${successCount} de ${totalCount} ✅`, inline: true });
        } else {
          fields.push({ name: '📹 Videos Exitosos', value: `${successCount} de ${totalCount} ✅`, inline: true });
          fields.push({ name: '❌ Videos Fallados', value: `${failedCount} ❌`, inline: true });
        }
        fields.push({ name: '👤 Perfil de API', value: profileList || 'Por defecto', inline: true });
        fields.push({ name: '🎨 Plantilla(s)', value: templateList || 'Por defecto', inline: true });
        fields.push({ name: '📁 Carpeta de Salida', value: exportFolder ? `\`${exportFolder}\`` : 'N/A', inline: false });
      } else {
        fields.push({ name: '⏱️ Tiempo Transcurrido', value: durationStr || 'N/A', inline: true });
        fields.push({ name: '📹 Videos Procesados', value: `${successCount || 0} de ${totalCount || 0}`, inline: true });
        if (errorMsg) {
          fields.push({ name: '❌ Mensaje de Error', value: `\`\`\`${errorMsg}\`\`\``, inline: false });
        }
      }

      discordPayload = {
        embeds: [
          {
            title: embedTitle,
            description: embedDesc,
            color: embedColor,
            fields: fields,
            footer: { text: 'REDIT-GEN • Sistema de Notificaciones' },
            timestamp: new Date().toISOString()
          }
        ]
      };
    } else {
      const text = String(messageOrOptions);
      tgMessage = text;
      discordPayload = { content: text };
    }

    if (settings.discordEnabled && settings.discordWebhookUrl) {
      const webhookUrl = settings.discordWebhookUrl.trim();
      if (webhookUrl) {
        try {
          new URL(webhookUrl);
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'REDIT-GEN/1.0' },
            body: JSON.stringify(discordPayload),
            signal: AbortSignal.timeout(6000)
          });
        } catch (dErr) {
          console.error('[Notification] Discord Error:', dErr.message);
        }
      }
    }

    if (settings.whatsappEnabled && settings.whatsappPhone && settings.whatsappApiKey) {
      const phone = settings.whatsappPhone.trim();
      const apiKey = settings.whatsappApiKey.trim();
      if (phone && apiKey) {
        try {
          const normalizedPhone = phone.replace(/[+\s]/g, '');
          const urlStr = `https://api.callmebot.com/whatsapp.php?phone=${normalizedPhone}&text=${encodeURIComponent(tgMessage)}&apikey=${apiKey}`;
          await fetch(urlStr, { method: 'GET', signal: AbortSignal.timeout(6000) });
        } catch (wErr) {
          console.error('[Notification] WhatsApp Error:', wErr.message);
        }
      }
    }
  } catch (err) {
    console.error('[Notification] General Error:', err.message);
  }
}

function broadcastProgress(data) {
  if (activeJob && batchStartTime) {
    activeJob.elapsedSeconds = Math.round((Date.now() - batchStartTime) / 1000);
    activeJob.etaSeconds = getEtaSeconds(activeJob);
    activeJob.failedCount = failedItems.length;
    activeJob.pauseRequested = pauseRequested;
    activeJob.isPaused = isPaused;
  }
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => client.write(payload));
  if (data.log) {
    jobLogs.push(`[${new Date().toLocaleTimeString()}] ${data.log}`);
  }
}

// ----------------------------------------------------
// RUTAS API REST
// ----------------------------------------------------

app.get('/api/detect-hardware', (req, res) => {
  try {
    const hw = gpu.detectHardware();
    const currentDb = db.readDb();
    const renderEngine = currentDb.settings?.renderEngine || 'auto';

    if (renderEngine && renderEngine !== 'auto') {
      hw.codec = renderEngine;
      if (renderEngine === 'h264_nvenc') {
        hw.hwaccel = 'cuda';
        hw.description = 'Renderizador manual forzado: NVIDIA NVENC (Acelerado por GPU NVIDIA)';
      } else if (renderEngine === 'h264_amf') {
        hw.hwaccel = 'd3d11va';
        hw.description = 'Renderizador manual forzado: AMD AMF (Acelerado por GPU AMD/Radeon)';
      } else if (renderEngine === 'h264_qsv') {
        hw.hwaccel = 'qsv';
        hw.description = 'Renderizador manual forzado: Intel QuickSync (Acelerado por GPU integrada de Intel)';
      } else if (renderEngine === 'libx264') {
        hw.hwaccel = '';
        hw.description = 'Renderizador manual forzado: CPU Standard (libx264 - Sin aceleración GPU)';
      }
    }
    res.json(hw);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/settings', (req, res) => {
  const currentDb = db.readDb();
  res.json(currentDb.settings);
});

app.post('/api/settings', (req, res) => {
  try {
    const currentDb = db.readDb();
    currentDb.settings = { ...currentDb.settings, ...req.body };
    db.writeDb(currentDb);
    res.json({ success: true, settings: currentDb.settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notifications/test', async (req, res) => {
  try {
    const { discordEnabled, discordWebhookUrl, whatsappEnabled, whatsappPhone, whatsappApiKey } = req.body;

    if (!discordEnabled && !whatsappEnabled) {
      return res.status(400).json({ error: 'Configura y activa al menos un canal (Discord o WhatsApp) para probar.' });
    }

    const message = '🔔 [REDIT-GEN] ¡Prueba de integración exitosa! Tus notificaciones están correctamente vinculadas.';
    const promises = [];

    if (discordEnabled && discordWebhookUrl) {
      const webhookUrl = discordWebhookUrl.trim();
      if (webhookUrl) {
        promises.push((async () => {
          try {
            new URL(webhookUrl);
            const response = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'User-Agent': 'REDIT-GEN/1.0' },
              body: JSON.stringify({
                embeds: [{
                  title: '🔔 [REDIT-GEN] ¡Prueba de Integración!',
                  description: 'Tus notificaciones de Discord están configuradas correctamente.',
                  color: 3066993,
                  timestamp: new Date().toISOString()
                }]
              }),
              signal: AbortSignal.timeout(6000)
            });
            if (response.ok) return { service: 'Discord', success: true };
            let errDetail = response.status;
            try { const parsed = await response.json(); errDetail = parsed.message || errDetail; } catch(e) {}
            throw new Error(`Discord: ${errDetail}`);
          } catch (dErr) {
            throw new Error(`Discord: ${dErr.message}`);
          }
        })());
      }
    }

    if (whatsappEnabled && whatsappPhone && whatsappApiKey) {
      const phone = whatsappPhone.trim();
      const apiKey = whatsappApiKey.trim();
      if (phone && apiKey) {
        promises.push((async () => {
          try {
            const normalizedPhone = phone.replace(/[+\s]/g, '');
            const urlStr = `https://api.callmebot.com/whatsapp.php?phone=${normalizedPhone}&text=${encodeURIComponent(message)}&apikey=${apiKey}`;
            const response = await fetch(urlStr, { method: 'GET', signal: AbortSignal.timeout(6000) });
            if (response.ok) return { service: 'WhatsApp', success: true };
            throw new Error(`WhatsApp: Error del servidor (${response.status})`);
          } catch (wErr) {
            throw new Error(`WhatsApp: ${wErr.message}`);
          }
        })());
      }
    }

    if (promises.length === 0) {
      return res.status(400).json({ error: 'Configura campos válidos de Discord o WhatsApp para probar.' });
    }

    const results = await Promise.all(promises);
    res.json({ success: true, message: 'Notificación de prueba enviada con éxito.', results });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/profiles', (req, res) => {
  const currentDb = db.readDb();
  res.json(currentDb.profiles);
});

app.post('/api/profiles', (req, res) => {
  try {
    const currentDb = db.readDb();
    const newProfile = req.body;

    if (!newProfile.id) {
      newProfile.id = uuidv4();
      currentDb.profiles.push(newProfile);
    } else {
      const idx = currentDb.profiles.findIndex(p => p.id === newProfile.id);
      if (idx !== -1) {
        currentDb.profiles[idx] = { ...currentDb.profiles[idx], ...newProfile };
      } else {
        currentDb.profiles.push(newProfile);
      }
    }

    db.writeDb(currentDb);
    res.json({ success: true, profile: currentDb.profiles[currentDb.profiles.findIndex(p => p.id === newProfile.id)] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/profiles/:id', (req, res) => {
  try {
    const currentDb = db.readDb();
    currentDb.profiles = currentDb.profiles.filter(p => p.id !== req.params.id);
    db.writeDb(currentDb);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/profiles/import', (req, res) => {
  try {
    const currentDb = db.readDb();
    const importedProfiles = req.body;

    if (!Array.isArray(importedProfiles)) {
      return res.status(400).json({ error: 'El archivo de importación debe contener una lista de perfiles (array).' });
    }

    importedProfiles.forEach(imported => {
      if (!imported.name) return;
      if (!imported.id) imported.id = uuidv4();
      const idx = currentDb.profiles.findIndex(p => p.id === imported.id);
      if (idx !== -1) {
        currentDb.profiles[idx] = { ...currentDb.profiles[idx], ...imported };
      } else {
        currentDb.profiles.push(imported);
      }
    });

    db.writeDb(currentDb);
    res.json({ success: true, profiles: currentDb.profiles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/templates', (req, res) => {
  const currentDb = db.readDb();
  res.json(currentDb.templates);
});

app.post('/api/templates', (req, res) => {
  try {
    const currentDb = db.readDb();
    const newTemplate = req.body;

    if (!newTemplate.id) {
      newTemplate.id = uuidv4();
      currentDb.templates.push(newTemplate);
    } else {
      const idx = currentDb.templates.findIndex(t => t.id === newTemplate.id);
      if (idx !== -1) {
        currentDb.templates[idx] = newTemplate;
      } else {
        currentDb.templates.push(newTemplate);
      }
    }

    db.writeDb(currentDb);
    res.json({ success: true, template: newTemplate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/templates/:id', (req, res) => {
  try {
    const currentDb = db.readDb();
    currentDb.templates = currentDb.templates.filter(t => t.id !== req.params.id);
    db.writeDb(currentDb);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/templates/import', (req, res) => {
  try {
    const currentDb = db.readDb();
    const { template, profile } = req.body;

    if (!template) {
      return res.status(400).json({ error: 'Falta la plantilla de video en el paquete.' });
    }

    let finalProfileId = null;
    if (profile) {
      const cleanProfile = { ...profile, apiKey: profile.apiKey || '' };
      const existingProfileIdx = currentDb.profiles.findIndex(p => p.id === cleanProfile.id || p.name === cleanProfile.name);
      if (existingProfileIdx !== -1) {
        const existingApiKey = currentDb.profiles[existingProfileIdx].apiKey;
        if (existingApiKey) cleanProfile.apiKey = existingApiKey;
        currentDb.profiles[existingProfileIdx] = cleanProfile;
        finalProfileId = cleanProfile.id;
      } else {
        if (!cleanProfile.id) cleanProfile.id = uuidv4();
        currentDb.profiles.push(cleanProfile);
        finalProfileId = cleanProfile.id;
      }
    }

    const cleanTemplate = { ...template };
    if (finalProfileId) cleanTemplate.profileId = finalProfileId;
    cleanTemplate.id = uuidv4();

    let tempName = cleanTemplate.name;
    let nameSuffix = 1;
    while (currentDb.templates.some(t => t.name === tempName)) {
      tempName = `${cleanTemplate.name} (${nameSuffix})`;
      nameSuffix++;
    }
    cleanTemplate.name = tempName;

    currentDb.templates.push(cleanTemplate);
    db.writeDb(currentDb);
    res.json({ success: true, templates: currentDb.templates, profiles: currentDb.profiles, newTemplateId: cleanTemplate.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/background-videos', (req, res) => {
  try {
    const currentDb = db.readDb();
    const bgFolder = req.query.folder || currentDb.settings.backgroundFolder || currentDb.timeline.backgroundFolder || '';

    if (!bgFolder || !fs.existsSync(bgFolder)) {
      return res.json({ count: 0, duration: 0, files: [] });
    }

    const videos = timeline.scanBackgroundVideos(bgFolder);
    let totalDur = 0;

    const fileInfos = videos.map(videoPath => {
      const dur = timeline.getVideoDuration(videoPath);
      totalDur += dur;
      return { name: path.basename(videoPath), path: videoPath, duration: Math.round(dur) };
    });

    const profileId = req.query.profileId || 'global';
    const profile = profileId !== 'global' ? currentDb.profiles?.find(p => p.id === profileId) : null;
    const playhead = profile ? (profile.timeline || { currentVideoIndex: 0, currentOffset: 0, backgroundVideos: [] }) : (currentDb.timeline || { currentVideoIndex: 0, currentOffset: 0, backgroundVideos: [] });

    res.json({ count: fileInfos.length, totalDuration: Math.round(totalDur), files: fileInfos, playhead });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dialog/folder', (req, res) => {
  try {
    const selectedPath = dialogs.selectLocalFolder();
    res.json({ path: selectedPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dialog/files', (req, res) => {
  try {
    const selectedFiles = dialogs.selectLocalFiles();
    res.json({ files: selectedFiles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dialog/avatar', (req, res) => {
  try {
    const imgData = dialogs.selectLocalImage();
    res.json(imgData || { path: '', base64: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dialog/music', (req, res) => {
  try {
    const selectedFile = dialogs.selectLocalAudio();
    res.json({ path: selectedFile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/utils/file-exists', (req, res) => {
  try {
    const { path: filePath } = req.query;
    if (!filePath) return res.json({ exists: false });
    res.json({ exists: fs.existsSync(filePath) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tts/preview', async (req, res) => {
  const { text, voice, rate } = req.body;
  if (!text || !voice) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: text o voice.' });
  }

  try {
    const filename = `preview_${uuidv4().substring(0, 8)}.mp3`;
    const outputPath = path.join(TEMP_DIR, 'previews', filename);
    await tts.generateSpeechAndTimestamps(text, voice, outputPath, { rate: rate || '+0%' });
    const audioUrl = `/previews/${filename}`;
    res.json({ success: true, audioUrl });

    setTimeout(() => {
      try {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch (err) {
        console.warn(`No se pudo eliminar el audio de prueba temporal ${filename}:`, err.message);
      }
    }, 60000);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/jobs/progress', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  sseClients.add(res);
  console.log(`Cliente SSE conectado. Total: ${sseClients.size}`);
  res.write(`data: ${JSON.stringify({ type: 'init', activeJob, logs: jobLogs })}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
    console.log(`Cliente SSE desconectado. Total: ${sseClients.size}`);
  });
});

app.post('/api/generate', async (req, res) => {
  const { prompt, count = 1, profileId, templateId, backgroundFolder, batch } = req.body;

  if (activeJob) {
    return res.status(400).json({ error: 'Ya hay un proceso de renderizado en curso. Por favor espera a que finalice.' });
  }

  const currentDb = db.readDb();

  let normalizedBatch = [];
  if (batch && Array.isArray(batch)) {
    normalizedBatch = batch.map(item => ({
      templateId: item.templateId,
      count: parseInt(item.count) || 1,
      prompt: item.prompt,
      profileId: item.profileId
    }));
  } else {
    normalizedBatch = [{
      templateId: templateId,
      count: parseInt(count) || 1,
      prompt: prompt,
      profileId: profileId
    }];
  }

  const exportFolderGlobal = currentDb.settings.exportFolder;
  for (const item of normalizedBatch) {
    const template = currentDb.templates.find(t => t.id === item.templateId);
    if (!template) {
      return res.status(400).json({ error: `No se encontró la plantilla con ID: ${item.templateId}` });
    }

    const finalProfileId = item.profileId || template.profileId || currentDb.settings.defaultProfileId;
    const profile = currentDb.profiles.find(p => p.id === finalProfileId) || currentDb.profiles[0];
    if (!profile || !profile.apiKey) {
      return res.status(400).json({ error: `La plantilla "${template.name}" requiere un perfil de IA con API Key configurada.` });
    }

    const activeBgFolder = (profile && profile.backgroundFolder && profile.backgroundFolder.trim())
      ? profile.backgroundFolder
      : backgroundFolder;
    if (!activeBgFolder || !fs.existsSync(activeBgFolder)) {
      return res.status(400).json({ error: `La carpeta de videos de fondo para la plantilla "${template.name}" no está configurada o no existe.` });
    }

    // Prioridad de carpeta de salida: plantilla > perfil > global
    const activeExportFolder = (template.outputFolder && template.outputFolder.trim())
      ? template.outputFolder
      : (profile && profile.exportFolder && profile.exportFolder.trim())
        ? profile.exportFolder
        : exportFolderGlobal;
    if (!activeExportFolder || !activeExportFolder.trim()) {
      return res.status(400).json({ error: `La carpeta de exportación para la plantilla "${template.name}" no está configurada.` });
    }
  }

  const totalCount = normalizedBatch.reduce((sum, item) => sum + item.count, 0);

  activeJob = {
    id: uuidv4(),
    prompt: normalizedBatch.length > 1 ? `Lote de ${normalizedBatch.length} plantillas` : (normalizedBatch[0].prompt || 'Generación rápida'),
    totalCount: totalCount,
    currentVideoIndex: 0,
    status: 'starting',
    progress: 0,
    currentStep: 'Iniciando cola de generación',
    retryCount: 0,
    retryWaitSeconds: 0,
    lastErrorMsg: ''
  };
  jobLogs = [];

  res.json({ success: true, jobId: activeJob.id });

  runGenerationQueue(activeJob, normalizedBatch, backgroundFolder).catch(err => {
    console.error('Error crítico en la cola de renderizado:', err);
    activeJob = null;
    broadcastProgress({ type: 'error', error: err.message, log: `ERROR CRÍTICO: ${err.message}` });
  });
});

app.post('/api/jobs/cancel', (req, res) => {
  if (!activeJob) {
    return res.status(400).json({ error: 'No hay ningún trabajo de generación activo en curso.' });
  }

  cancelRequested = true;
  console.log(`[Cancelación] Solicitud de cancelación recibida para el trabajo: ${activeJob.id}`);

  try {
    const { execSync } = require('child_process');
    execSync('taskkill /F /IM ffmpeg.exe', { stdio: 'ignore' });
    console.log('[Cancelación] Comando taskkill FFmpeg enviado de manera exitosa.');
  } catch (err) {
    // Si no hay procesos de FFmpeg activos, taskkill fallará, lo cual se ignora de forma segura
  }

  res.json({ success: true, message: 'Proceso de generación cancelado exitosamente.' });
});

app.post('/api/jobs/pause', (req, res) => {
  if (!activeJob) {
    return res.status(400).json({ error: 'No hay ningún trabajo de generación activo para pausar.' });
  }
  pauseRequested = true;
  res.json({ success: true, message: 'Solicitud de pausa enviada. Se pausará al terminar el video actual.' });
});

app.post('/api/jobs/resume', (req, res) => {
  if (!activeJob) {
    return res.status(400).json({ error: 'No hay ningún trabajo de generación activo para reanudar.' });
  }
  pauseRequested = false;
  res.json({ success: true, message: 'Cola de generación reanudada exitosamente.' });
});

app.get('/api/jobs/failed-count', (req, res) => {
  res.json({ failedCount: failedItems ? failedItems.length : 0 });
});

app.post('/api/jobs/retry-failed', (req, res) => {
  if (activeJob) {
    return res.status(400).json({ error: 'Ya hay un proceso de renderizado en curso.' });
  }
  if (!failedItems || failedItems.length === 0) {
    return res.status(400).json({ error: 'No hay videos fallidos registrados para reintentar.' });
  }

  const currentDb = db.readDb();
  const retryBatch = [...failedItems];
  failedItems = [];

  activeJob = {
    id: uuidv4(),
    prompt: `Reintento de ${retryBatch.length} videos fallidos`,
    totalCount: retryBatch.length,
    currentVideoIndex: 0,
    status: 'starting',
    progress: 0,
    currentStep: 'Reintentando videos fallidos',
    retryCount: 0,
    retryWaitSeconds: 0,
    lastErrorMsg: ''
  };
  jobLogs = [];

  res.json({ success: true, jobId: activeJob.id });

  runGenerationQueue(activeJob, retryBatch, currentDb.settings.backgroundFolder).catch(err => {
    console.error('Error crítico en la cola de reintento:', err);
    activeJob = null;
    broadcastProgress({ type: 'error', error: err.message, log: `ERROR CRÍTICO: ${err.message}` });
  });
});

// ----------------------------------------------------
// MOTOR DE LA COLA EN SEGUNDO PLANO
// ----------------------------------------------------
async function runGenerationQueue(job, normalizedBatch, defaultBackgroundFolder) {
  batchStartTime = Date.now();
  pauseRequested = false;
  isPaused = false;
  failedItems = [];

  const currentDb = db.readDb();
  const defaultExportFolder = currentDb.settings.exportFolder || path.join(__dirname, 'temp');
    const batchReportsByTemplate = {}; // { [templateName]: { items: [], folder: string, totalExpected: number } }
  let bgFolder = defaultBackgroundFolder;
  let exportFolder = defaultExportFolder;

  const usedTemplates = new Set();
  const usedProfiles = new Set();

  const getTemplateReportBucket = (tpl, folder) => {
    const key = tpl.name;
    if (!batchReportsByTemplate[key]) {
      const totalExpected = normalizedBatch
        .filter(it => it.templateId === tpl.id)
        .reduce((sum, it) => sum + it.count, 0);
      batchReportsByTemplate[key] = { items: [], folder, totalExpected };
    }
    return batchReportsByTemplate[key];
  };

  try {
    broadcastProgress({ type: 'status', status: 'processing', activeJob: job, log: `Iniciando generación de lote: ${job.totalCount} videos solicitados.` });

    for (let index = 0; index < job.totalCount; index++) {
      if (cancelRequested) {
        throw new Error('La generación fue cancelada por solicitud del usuario.');
      }

      // Verificar si hay solicitud de pausa activa entre videos
      if (pauseRequested && !cancelRequested) {
        isPaused = true;
        job.status = 'paused';
        job.currentStep = 'Proceso pausado temporalmente';
        broadcastProgress({
          type: 'status', status: 'paused', activeJob: job,
          log: `Generación pausada antes de iniciar el Video #${index + 1}. El proceso está congelado.`
        });

        while (pauseRequested && !cancelRequested) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        isPaused = false;
        if (!cancelRequested) {
          job.status = 'processing';
          job.currentStep = 'Reanudando generación';
          broadcastProgress({
            type: 'status', status: 'processing', activeJob: job,
            log: 'Generación reanudada. Continuando con la cola.'
          });
        }
      }

      job.currentVideoIndex = index + 1;
      const videoNumStr = `[Video ${job.currentVideoIndex}/${job.totalCount}]`;

      // Encontrar a qué plantilla del lote corresponde el video actual
      let accumulatedCount = 0;
      let currentItem = null;
      for (const item of normalizedBatch) {
        accumulatedCount += item.count;
        if (index < accumulatedCount) {
          currentItem = item;
          break;
        }
      }

      if (!currentItem) throw new Error('Error al determinar la plantilla del lote actual.');

      const template = currentDb.templates.find(t => t.id === currentItem.templateId);
      const finalProfileId = currentItem.profileId || template.profileId || currentDb.settings.defaultProfileId;
      const profile = currentDb.profiles.find(p => p.id === finalProfileId) || currentDb.profiles[0];

      job.currentProfileId = finalProfileId;
      job.currentTemplateId = template?.id;

      if (template && template.name) usedTemplates.add(template.name);
      if (profile && profile.name) usedProfiles.add(profile.name);

      bgFolder = (profile && profile.backgroundFolder && profile.backgroundFolder.trim())
        ? profile.backgroundFolder
        : defaultBackgroundFolder;

      // Prioridad de carpeta de salida: plantilla > perfil > global
      exportFolder = (template && template.outputFolder && template.outputFolder.trim())
        ? template.outputFolder
        : (profile && profile.exportFolder && profile.exportFolder.trim())
          ? profile.exportFolder
          : defaultExportFolder;

      if (cancelRequested) throw new Error('La generación fue cancelada por solicitud del usuario.');

      // -------------------------------------------------------
      // REINTENTO AUTOMÁTICO INTELIGENTE POR VIDEO
      // -------------------------------------------------------
      let videoSuccess = false;
      let autoRetryCount = 0;

      while (!videoSuccess && autoRetryCount <= MAX_AUTO_RETRIES) {
        if (cancelRequested) throw new Error('La generación fue cancelada por solicitud del usuario.');

        // Si no es el primer intento, esperar antes de reintentar
        if (autoRetryCount > 0) {
          const waitSecs = Math.round(RETRY_WAIT_MS / 1000);
          job.retryCount = autoRetryCount;
          job.retryWaitSeconds = waitSecs;
          job.currentStep = `Reintento automático ${autoRetryCount}/${MAX_AUTO_RETRIES} — esperando ${waitSecs}s...`;
          broadcastProgress({
            type: 'status', status: 'retrying', activeJob: job,
            log: `${videoNumStr} ⏳ Reintento automático ${autoRetryCount}/${MAX_AUTO_RETRIES}. Esperando ${waitSecs}s antes de reintentar...`
          });

          // Countdown visible en el panel
          for (let s = waitSecs; s > 0; s--) {
            if (cancelRequested) throw new Error('La generación fue cancelada por solicitud del usuario.');
            job.retryWaitSeconds = s;
            broadcastProgress({ type: 'status', status: 'retrying', activeJob: job, log: null });
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          job.retryWaitSeconds = 0;
          broadcastProgress({
            type: 'status', status: 'processing', activeJob: job,
            log: `${videoNumStr} 🔄 Reintentando generación (intento ${autoRetryCount + 1})...`
          });
        } else {
          job.retryCount = 0;
          job.retryWaitSeconds = 0;
          job.lastErrorMsg = '';
        }

        const jobTempDir = path.join(TEMP_DIR, `video_${index}_${uuidv4().substring(0, 8)}`);
        if (!fs.existsSync(jobTempDir)) fs.mkdirSync(jobTempDir, { recursive: true });

        try {
          broadcastProgress({
            type: 'status', status: 'processing', activeJob: job,
            log: `${videoNumStr} [${template.name}] Generando guion usando Gemini API...`
          });

          const currentPrompt = currentItem.prompt || template.defaultIdea || 'Inventa una historia dramática';
          const primaryAttempts = profile.primaryAttempts !== undefined ? parseInt(profile.primaryAttempts) : 2;
          const fallbackAttempts = profile.fallbackAttempts !== undefined ? parseInt(profile.fallbackAttempts) : 3;
          const fallbackModel = profile.fallbackModel || 'gemini-2.5-flash';

          const story = await gemini.generateStory(
            profile.apiKey, profile.model, currentPrompt, profile.systemPrompt,
            primaryAttempts, fallbackAttempts, fallbackModel
          );

          if (cancelRequested) throw new Error('La generación fue cancelada por solicitud del usuario.');
          broadcastProgress({
            type: 'status', status: 'processing', activeJob: job,
            log: `${videoNumStr} Guion generado con éxito. Título: "${story.title}". Género: ${story.gender === 'male' ? 'Masculino (Jorge)' : 'Femenino (Dalia)'}`
          });

          const titleAudioPath = path.join(jobTempDir, 'title.mp3');
          const bodyAudioPath = path.join(jobTempDir, 'body.mp3');
          const cardImagePath = path.join(jobTempDir, 'card.png');
          const assPath = path.join(jobTempDir, 'subtitles.ass');

          const activeVoice = story.gender === 'male' ? template.maleVoice : template.femaleVoice;

          broadcastProgress({ type: 'status', status: 'processing', activeJob: job, log: `${videoNumStr} Sintetizando audio del TÍTULO...` });
          const titleTimestamps = await tts.generateSpeechAndTimestamps(story.title, activeVoice, titleAudioPath, template);
          const titleDuration = timeline.getVideoDuration(titleAudioPath);

          if (cancelRequested) throw new Error('La generación fue cancelada por solicitud del usuario.');
          broadcastProgress({ type: 'status', status: 'processing', activeJob: job, log: `${videoNumStr} Sintetizando audio de la HISTORIA...` });
          const bodyTimestamps = await tts.generateSpeechAndTimestamps(story.content, activeVoice, bodyAudioPath, template);
          const bodyDuration = timeline.getVideoDuration(bodyAudioPath);
          const totalDuration = titleDuration + bodyDuration;

          broadcastProgress({
            type: 'status', status: 'processing', activeJob: job,
            log: `${videoNumStr} Audios completados. Título: ${titleDuration}s | Cuerpo: ${bodyDuration}s | Total: ${totalDuration.toFixed(1)}s`
          });

          if (cancelRequested) throw new Error('La generación fue cancelada por solicitud del usuario.');
          broadcastProgress({ type: 'status', status: 'processing', activeJob: job, log: `${videoNumStr} Renderizando Tarjeta de Reddit con Puppeteer...` });

          const cardData = {
            title: story.title,
            username: template.cardUsername,
            subreddit: template.cardSubreddit,
            avatar: template.cardAvatar,
            upvotes: template.upvotes,
            comments: template.comments,
            theme: template.cardTheme,
            cardShowVerified: template.cardShowVerified !== undefined ? template.cardShowVerified : true,
            cardShowAwards: template.cardShowAwards !== undefined ? template.cardShowAwards : true,
            cardWidth: template.cardWidth !== undefined ? template.cardWidth : 260,
            cardBorderRadius: template.cardBorderRadius !== undefined ? template.cardBorderRadius : 11,
            cardPadding: template.cardPadding !== undefined ? template.cardPadding : 12,
            cardGap: template.cardGap !== undefined ? template.cardGap : 7,
            cardFontFamily: template.cardFontFamily || 'Inter',
            cardFontSizeTitle: template.cardFontSizeTitle !== undefined ? template.cardFontSizeTitle : 24,
            cardTitleColor: template.cardTitleColor || '',
            cardFontSizeSubreddit: template.cardFontSizeSubreddit !== undefined ? template.cardFontSizeSubreddit : 14,
            cardSubredditColor: template.cardSubredditColor || '',
            cardFontSizeUsername: template.cardFontSizeUsername !== undefined ? template.cardFontSizeUsername : undefined,
            cardUsernameColor: template.cardUsernameColor || ''
          };
          await cardRenderer.renderCard(cardData, cardImagePath);
          broadcastProgress({ type: 'status', status: 'processing', activeJob: job, log: `${videoNumStr} Tarjeta de Reddit renderizada con éxito.` });

          broadcastProgress({ type: 'status', status: 'processing', activeJob: job, log: `${videoNumStr} Consultando línea de tiempo de video continuo...` });
          const { segments } = timeline.getBackgroundSegments(totalDuration, bgFolder, profile.id);
          broadcastProgress({ type: 'status', status: 'processing', activeJob: job, log: `${videoNumStr} Pista de fondo virtual asignada.` });

          const cleanTitle = story.title
            .replace(/[\\/:*?"<>|]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          const safeTitle = cleanTitle || `video_${uuidv4().substring(0, 8)}`;

          // Asegurar carpeta de salida existe
          if (!fs.existsSync(exportFolder)) {
            fs.mkdirSync(exportFolder, { recursive: true });
          }

          const formatMode = template.exportFormat || '9-16';

          if (formatMode === 'both') {
            const assPath916 = path.join(jobTempDir, 'subtitles_9_16.ass');
            const assPath169 = path.join(jobTempDir, 'subtitles_16_9.ass');

            broadcastProgress({ type: 'status', status: 'processing', activeJob: job, log: `${videoNumStr} Generando subtítulos ASS para 9:16...` });
            await subtitles.generateAssSubtitles(bodyTimestamps, assPath916, template, titleDuration, false);

            broadcastProgress({ type: 'status', status: 'processing', activeJob: job, log: `${videoNumStr} Generando subtítulos ASS para 16:9...` });
            await subtitles.generateAssSubtitles(bodyTimestamps, assPath169, template, titleDuration, true);

            const storyMetaPath = path.join(jobTempDir, 'story_meta.json');
            fs.writeFileSync(storyMetaPath, JSON.stringify({
              title: story.title, content: story.content, gender: story.gender, activeVoice,
              prompt: currentPrompt, templateName: template.name, exportFormat: 'both',
              files: { titleAudio: titleAudioPath, bodyAudio: bodyAudioPath, cardImage: cardImagePath, subtitlesAss916: assPath916, subtitlesAss169: assPath169 }
            }, null, 2), 'utf8');

            if (cancelRequested) throw new Error('La generación fue cancelada por solicitud del usuario.');

            const finalVideoPath916 = path.join(exportFolder, `video ${job.currentVideoIndex} 9-16 ${safeTitle}.mp4`);
            broadcastProgress({ type: 'status', status: 'processing', activeJob: job, log: `${videoNumStr} Compilando formato 9:16 vertical...` });
            await ffmpeg.compileVideo({
              backgroundSegments: segments, cardImagePath, titleAudioPath, bodyAudioPath,
              assSubtitlesPath: assPath916, titleDuration, totalDuration, outputPath: finalVideoPath916,
              cardOffsetX: template.cardOffsetX || 0, cardOffsetY: template.cardOffsetY || 0,
              cardScale: template.cardScale !== undefined ? template.cardScale : 1.0,
              aspectRatio: '9:16',
              cardEntryAnimation: template.cardEntryAnimation || 'none', cardExitAnimation: template.cardExitAnimation || 'none',
              cardEntryDuration: template.cardEntryDuration !== undefined ? template.cardEntryDuration : 0.4,
              cardExitDuration: template.cardExitDuration !== undefined ? template.cardExitDuration : 0.4,
              renderEngine: currentDb.settings.renderEngine || 'auto',
              renderQuality: currentDb.settings.renderQuality || 'quality',
              musicEnabled: template.musicEnabled || false, musicFile: template.musicFile || '',
              musicVolume: template.musicVolume !== undefined ? template.musicVolume : -20
            }, (percent) => {
              job.progress = Math.round(percent * 0.5);
              broadcastProgress({ type: 'progress', activeJob: job, percent: job.progress, log: `${videoNumStr} Codificación 9:16: ${percent}%` });
            });

            const finalVideoPath169 = path.join(exportFolder, `video ${job.currentVideoIndex} 16-9 ${safeTitle}.mp4`);
            broadcastProgress({ type: 'status', status: 'processing', activeJob: job, log: `${videoNumStr} Compilando formato 16:9 horizontal...` });
            await ffmpeg.compileVideo({
              backgroundSegments: segments, cardImagePath, titleAudioPath, bodyAudioPath,
              assSubtitlesPath: assPath169, titleDuration, totalDuration, outputPath: finalVideoPath169,
              cardOffsetX_16_9: template.cardOffsetX_16_9 !== undefined ? template.cardOffsetX_16_9 : 0,
              cardOffsetY_16_9: template.cardOffsetY_16_9 !== undefined ? template.cardOffsetY_16_9 : 0,
              cardScale_16_9: template.cardScale_16_9 !== undefined ? template.cardScale_16_9 : 1.0,
              aspectRatio: '16:9',
              cardEntryAnimation: template.cardEntryAnimation || 'none', cardExitAnimation: template.cardExitAnimation || 'none',
              cardEntryDuration: template.cardEntryDuration !== undefined ? template.cardEntryDuration : 0.4,
              cardExitDuration: template.cardExitDuration !== undefined ? template.cardExitDuration : 0.4,
              renderEngine: currentDb.settings.renderEngine || 'auto',
              renderQuality: currentDb.settings.renderQuality || 'quality',
              musicEnabled: template.musicEnabled || false, musicFile: template.musicFile || '',
              musicVolume: template.musicVolume !== undefined ? template.musicVolume : -20
            }, (percent) => {
              job.progress = 50 + Math.round(percent * 0.5);
              broadcastProgress({ type: 'progress', activeJob: job, percent: job.progress, log: `${videoNumStr} Codificación 16:9: ${percent}%` });
            });

            const finalHashtags = profile.hashtags !== undefined ? profile.hashtags : (currentDb.settings.hashtags || '');
            const tplBucketBoth = getTemplateReportBucket(template, exportFolder);
            tplBucketBoth.items.push({
              index: tplBucketBoth.items.length + 1, title: story.title, safeTitle, isBoth: true, hashtags: finalHashtags,
              files: [
                `Formato Vertical (9:16): video ${job.currentVideoIndex} 9-16 ${safeTitle}.mp4`,
                `Formato Horizontal (16:9): video ${job.currentVideoIndex} 16-9 ${safeTitle}.mp4`
              ]
            });

            broadcastProgress({ type: 'status', status: 'processing', activeJob: job, log: `${videoNumStr} Videos creados con éxito en ambos formatos. Guardados en: ${exportFolder}` });

          } else {
            const isLandscape = formatMode === '16-9';
            broadcastProgress({ type: 'status', status: 'processing', activeJob: job, log: `${videoNumStr} Generando subtítulos ASS (Modo: ${isLandscape ? '16:9' : '9:16'})...` });
            await subtitles.generateAssSubtitles(bodyTimestamps, assPath, template, titleDuration, isLandscape);

            const storyMetaPath = path.join(jobTempDir, 'story_meta.json');
            fs.writeFileSync(storyMetaPath, JSON.stringify({
              title: story.title, content: story.content, gender: story.gender, activeVoice,
              prompt: currentPrompt, templateName: template.name, exportFormat: formatMode,
              files: { titleAudio: titleAudioPath, bodyAudio: bodyAudioPath, cardImage: cardImagePath, subtitlesAss: assPath }
            }, null, 2), 'utf8');

            if (cancelRequested) throw new Error('La generación fue cancelada por solicitud del usuario.');

            const videoName = isLandscape ? `video ${job.currentVideoIndex} 16-9 ${safeTitle}` : `video ${job.currentVideoIndex} 9-16 ${safeTitle}`;
            const finalVideoPath = path.join(exportFolder, `${videoName}.mp4`);
            broadcastProgress({ type: 'status', status: 'processing', activeJob: job, log: `${videoNumStr} Iniciando codificación FFmpeg (${videoName}.mp4)...` });

            await ffmpeg.compileVideo({
              backgroundSegments: segments, cardImagePath, titleAudioPath, bodyAudioPath,
              assSubtitlesPath: assPath, titleDuration, totalDuration, outputPath: finalVideoPath,
              cardOffsetX: template.cardOffsetX || 0, cardOffsetY: template.cardOffsetY || 0,
              cardScale: template.cardScale !== undefined ? template.cardScale : 1.0,
              cardOffsetX_16_9: template.cardOffsetX_16_9 !== undefined ? template.cardOffsetX_16_9 : 0,
              cardOffsetY_16_9: template.cardOffsetY_16_9 !== undefined ? template.cardOffsetY_16_9 : 0,
              cardScale_16_9: template.cardScale_16_9 !== undefined ? template.cardScale_16_9 : 1.0,
              aspectRatio: isLandscape ? '16:9' : '9:16',
              cardEntryAnimation: template.cardEntryAnimation || 'none', cardExitAnimation: template.cardExitAnimation || 'none',
              cardEntryDuration: template.cardEntryDuration !== undefined ? template.cardEntryDuration : 0.4,
              cardExitDuration: template.cardExitDuration !== undefined ? template.cardExitDuration : 0.4,
              renderEngine: currentDb.settings.renderEngine || 'auto',
              renderQuality: currentDb.settings.renderQuality || 'quality',
              musicEnabled: template.musicEnabled || false, musicFile: template.musicFile || '',
              musicVolume: template.musicVolume !== undefined ? template.musicVolume : -20
            }, (percent) => {
              job.progress = percent;
              broadcastProgress({ type: 'progress', activeJob: job, percent, log: `${videoNumStr} Progreso FFmpeg: ${percent}%` });
            });

            const finalHashtags = profile.hashtags !== undefined ? profile.hashtags : (currentDb.settings.hashtags || '');
            const tplBucketSingle = getTemplateReportBucket(template, exportFolder);
            tplBucketSingle.items.push({
              index: tplBucketSingle.items.length + 1, title: story.title, safeTitle, isBoth: false,
              formatSuffix: isLandscape ? '16-9' : '9-16', videoPath: finalVideoPath, hashtags: finalHashtags,
              files: [`Formato ${isLandscape ? 'Horizontal (16:9)' : 'Vertical (9:16)'}: ${videoName}.mp4`]
            });

            broadcastProgress({ type: 'status', status: 'processing', activeJob: job, log: `${videoNumStr} Video compilado con éxito. Guardado en: ${finalVideoPath}` });
          }

          // Reporte consolidado
          // Reporte por plantilla (uno por cada plantilla usada en el lote, no uno combinado)
          {
            const tplReport = batchReportsByTemplate[template.name];
            if (tplReport) {
              const safeTemplateName = template.name
                .replace(/[\\/:*?"<>|]/g, '')
                .replace(/\s+/g, ' ')
                .trim() || 'plantilla';
              const templateReportPath = path.join(tplReport.folder, `${safeTemplateName}.txt`);

              let tplContent = `============================================================\n`;
              tplContent += `REPORTE DE GENERACIÓN — PLANTILLA: ${template.name}\n`;
              tplContent += `============================================================\n`;
              tplContent += `ID de Lote: ${job.id}\n`;
              tplContent += `Videos Generados con esta Plantilla: ${tplReport.items.length} / ${tplReport.totalExpected}\n\n`;
              for (const reportItem of tplReport.items) {
                tplContent += `------------------------------------------------------------\n`;
                tplContent += `[Video ${reportItem.index}/${tplReport.totalExpected}]\n`;
                tplContent += `Título: ${reportItem.title}\n\n`;
                if (reportItem.hashtags) tplContent += `${reportItem.hashtags}\n\n`;
                tplContent += `Archivo(s) Generado(s):\n`;
                reportItem.files.forEach(f => { tplContent += `- ${f}\n`; });
              }
              tplContent += `------------------------------------------------------------\n`;

              if (!fs.existsSync(tplReport.folder)) fs.mkdirSync(tplReport.folder, { recursive: true });
              fs.writeFileSync(templateReportPath, tplContent, 'utf8');
            }
          }

          // Video generado correctamente: salir del loop de reintentos
          videoSuccess = true;
          job.retryCount = 0;
          job.retryWaitSeconds = 0;
          job.lastErrorMsg = '';

        } catch (err) {
          // Limpiar carpeta temporal del intento fallido
          try {
            if (fs.existsSync(jobTempDir)) fs.rmSync(jobTempDir, { recursive: true, force: true });
          } catch (rmErr) {}

          if (cancelRequested) throw err; // Cancelación manual: propagar inmediatamente

          const retryable = isRetryableError(err);

          if (retryable && autoRetryCount < MAX_AUTO_RETRIES) {
            autoRetryCount++;
            job.lastErrorMsg = err.message;
            console.warn(`[Reintento] Video ${index + 1} falló con error recuperable (intento ${autoRetryCount}/${MAX_AUTO_RETRIES}): ${err.message}`);
            broadcastProgress({
              type: 'status', status: 'retrying', activeJob: job,
              log: `[REINTENTO AUTOMÁTICO] ${videoNumStr} Error recuperable detectado: "${err.message}". Se reintentará automáticamente (${autoRetryCount}/${MAX_AUTO_RETRIES}).`
            });
            // Continuar al siguiente ciclo del while para reintentar
          } else {
            // Error permanente o agotados los reintentos: marcar como fallido y continuar con el siguiente video
            const motivo = retryable
              ? `Agotados ${MAX_AUTO_RETRIES} reintentos automáticos. Último error: ${err.message}`
              : `Error permanente (no recuperable): ${err.message}`;

            console.error(`[Fallo definitivo] Video ${index + 1}: ${motivo}`);
            broadcastProgress({
              type: 'status', status: 'processing', activeJob: job,
              log: `[FALLO] ${videoNumStr} ${motivo}`
            });
            failedItems.push({
              templateId: currentItem.templateId,
              profileId: currentItem.profileId,
              count: 1,
              prompt: currentItem.prompt
            });
            videoSuccess = true; // Salir del loop (ya no hay más reintentos)
            job.retryCount = 0;
            job.retryWaitSeconds = 0;
            job.lastErrorMsg = '';
          }
        } finally {
          // Limpieza garantizada de la carpeta temporal si aún existe
          try {
            if (fs.existsSync(jobTempDir)) {
              fs.rmSync(jobTempDir, { recursive: true, force: true });
              console.log(`[Limpieza] Subcarpeta temporal eliminada: ${jobTempDir}`);
            }
          } catch (rmErr) {
            console.warn('No se pudo borrar subcarpeta temporal:', rmErr.message);
          }
        }
      } // fin while reintento automático
    } // fin for index

    // Cola finalizada
    job.failedCount = failedItems.length;
    job.failedItems = failedItems;

    const durationMs = Date.now() - batchStartTime;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    const durationStr = `${minutes}m ${seconds}s`;
    const profileList = Array.from(usedProfiles).join(', ') || 'Global';
    const templateList = Array.from(usedTemplates).join(', ') || 'N/A';

    if (failedItems.length > 0) {
      job.status = 'completed_with_errors';
      job.progress = 100;
      job.currentStep = `Generación finalizada con ${failedItems.length} errores`;
      broadcastProgress({
        type: 'status', status: 'completed_with_errors', activeJob: job,
        log: `Lote finalizado con ${failedItems.length} videos fallidos. Puedes reintentarlos desde el Dashboard.`
      });
      sendNotification({
        status: 'completed_with_errors',
        successCount: job.totalCount - failedItems.length,
        totalCount: job.totalCount,
        failedCount: failedItems.length,
        durationStr, profileList, templateList, exportFolder
      });
    } else {
      job.status = 'completed';
      job.progress = 100;
      job.currentStep = 'Generación completada';
      broadcastProgress({
        type: 'status', status: 'completed', activeJob: job,
        log: 'Lote completado con éxito. Todos los videos listos en tu carpeta de exportación.'
      });
      sendNotification({
        status: 'completed',
        successCount: job.totalCount,
        totalCount: job.totalCount,
        durationStr, profileList, templateList, exportFolder
      });
    }
    activeJob = null;
    cancelRequested = false;

  } catch (error) {
    console.error('Error procesando video en cola:', error);

    const durationMs = Date.now() - batchStartTime;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    const durationStr = `${minutes}m ${seconds}s`;

    if (cancelRequested) {
      job.status = 'cancelled';
      job.currentStep = 'Cancelado por el usuario';
      broadcastProgress({ type: 'status', status: 'cancelled', activeJob: job, log: 'PROCESO CANCELADO: La generación fue detenida por el usuario.' });
      sendNotification({ status: 'cancelled', successCount: job.currentVideoIndex, totalCount: job.totalCount, durationStr });
    } else {
      job.status = 'failed';
      job.currentStep = 'Error en el proceso';
      broadcastProgress({ type: 'status', status: 'failed', activeJob: job, error: error.message, log: `Error en el proceso: ${error.message}` });
      sendNotification({ status: 'failed', successCount: job.currentVideoIndex, totalCount: job.totalCount, durationStr, errorMsg: error.message });
    }
    activeJob = null;
    cancelRequested = false;
  }
}

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Servidor local Reddit Generator corriendo en puerto: ${PORT}`);
  console.log(`====================================================`);
});