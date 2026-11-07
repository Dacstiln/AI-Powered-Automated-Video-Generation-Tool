const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ffprobe = require('ffprobe-static');
const db = require('./db');

/**
 * Obtiene la duración exacta de un archivo de video en segundos usando ffprobe.
 * @param {string} filePath - Ruta absoluta del archivo de video
 * @returns {number} Duración en segundos
 */
function getVideoDuration(filePath) {
  try {
    const cmd = `"${ffprobe.path}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const output = execSync(cmd, { encoding: 'utf8' }).trim();
    const duration = parseFloat(output);
    if (isNaN(duration)) {
      return 600; // Fallback a 10 minutos
    }
    return duration;
  } catch (error) {
    console.error(`Error al obtener duración con ffprobe para ${filePath}:`, error.message);
    return 600; // Fallback a 10 minutos
  }
}

/**
 * Escanea una carpeta en búsqueda de archivos de video válidos (.mp4, .mkv, .mov, .avi).
 * @param {string} folderPath - Ruta de la carpeta
 * @returns {Array<string>} Lista de rutas absolutas de videos ordenados alfabéticamente
 */
function scanBackgroundVideos(folderPath) {
  if (!folderPath || !fs.existsSync(folderPath)) {
    return [];
  }

  const extensions = ['.mp4', '.mkv', '.mov', '.avi'];
  try {
    const files = fs.readdirSync(folderPath);
    return files
      .filter(file => extensions.includes(path.extname(file).toLowerCase()))
      .map(file => path.join(folderPath, file))
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    console.error('Error escaneando carpeta de videos de fondo:', error);
    return [];
  }
}

/**
 * Calcula y consume los segmentos de video de fondo necesarios para una duración dada.
 * Actualiza el playhead en la base de datos local y retorna los segmentos.
 * @param {number} duration - Duración requerida en segundos (ej. 150 segundos)
 * @param {string} folderPath - Carpeta donde se escanean los videos de fondo
 * @returns {{segments: Array<{path: string, start: number, duration: number}>, playheadState: object}}
 */
function getBackgroundSegments(duration, folderPath) {
  const currentDb = db.readDb();

  const savedFiles = currentDb.settings?.selectedFiles || currentDb.timeline?.selectedFiles || [];
  let videos = savedFiles.filter(f => {
    const exists = fs.existsSync(f);
    if (!exists) console.warn('[timeline] Archivo guardado no encontrado, ignorando:', f);
    return exists;
  });

  if (videos.length === 0) {
    videos = scanBackgroundVideos(folderPath);
  }

  if (videos.length === 0) {
    throw new Error(`No se encontraron videos de fondo válidos (.mp4, .mov, etc.). Configura tus carpetas o archivos en Ajustes.`);
  }

  // Máximo de segundos que puede aportar un solo segmento antes de forzar
  // un salto a otro video random. Así siempre hay variedad aunque los videos sean largos.
  const MAX_SEGMENT_DURATION = 90;

  const segments = [];
  let remainingNeeded = duration;
  let lastVideoIndex = 0;
  let lastOffset = 0;
  let previousVideoIndex = -1; // Para evitar repetir el mismo video dos veces seguidas

  console.log(`[timeline] Segmentos ALEATORIOS requeridos: ${duration}s | Videos disponibles: ${videos.length}`);

  let safetyLoopCounter = 0;
  while (remainingNeeded > 0.1 && safetyLoopCounter < 200) {
    safetyLoopCounter++;

    // 1) Elegir video al azar — intentar no repetir el anterior si hay más de 1 video
    let randomVideoIndex;
    if (videos.length === 1) {
      randomVideoIndex = 0;
    } else {
      do {
        randomVideoIndex = Math.floor(Math.random() * videos.length);
      } while (randomVideoIndex === previousVideoIndex);
    }

    const currentVideoPath = videos[randomVideoIndex];
    const totalVideoDuration = getVideoDuration(currentVideoPath);

    if (!totalVideoDuration || totalVideoDuration < 1) {
      // Video demasiado corto o corrupto, skip
      continue;
    }

    // 2) Elegir punto de inicio al azar dentro del video.
    //    Dejamos al menos 1 segundo de margen al final para que el segmento tenga contenido.
    const maxStart = Math.max(0, totalVideoDuration - 1);
    const randomStart = Math.random() * maxStart;

    // 3) Cuánto podemos tomar desde ese punto
    const availableFromStart = totalVideoDuration - randomStart;

    // 4) El segmento que tomamos es el mínimo entre:
    //    - lo que falta por cubrir
    //    - lo que queda en el video desde el punto random
    //    - el límite máximo por segmento (fuerza variedad)
    const segmentDuration = Math.min(remainingNeeded, availableFromStart, MAX_SEGMENT_DURATION);

    if (segmentDuration < 0.1) continue;

    segments.push({
      path: currentVideoPath,
      start: Number(randomStart.toFixed(3)),
      duration: Number(segmentDuration.toFixed(3))
    });

    console.log(`  [segmento ${segments.length}] ${path.basename(currentVideoPath)} | inicio: ${randomStart.toFixed(1)}s | dur: ${segmentDuration.toFixed(1)}s`);

    remainingNeeded -= segmentDuration;
    lastVideoIndex = randomVideoIndex;
    lastOffset = randomStart + segmentDuration;
    previousVideoIndex = randomVideoIndex;
  }

  // Guardar referencia informativa para la UI
  currentDb.timeline = {
    currentVideoIndex: lastVideoIndex,
    currentOffset: Number(lastOffset.toFixed(3)),
    backgroundVideos: videos
  };
  db.writeDb(currentDb);

  console.log(`[timeline] Total segmentos generados: ${segments.length} | Duración cubierta: ${(duration - remainingNeeded).toFixed(1)}s`);

  return {
    segments,
    playheadState: currentDb.timeline
  };
}

module.exports = {
  scanBackgroundVideos,
  getVideoDuration,
  getBackgroundSegments
};