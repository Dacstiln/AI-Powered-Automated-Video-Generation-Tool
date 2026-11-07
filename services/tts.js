const fs = require('fs');
const path = require('path');

/**
 * Genera el audio para un texto dado y extrae los metadatos de sincronización de palabras (timestamps).
 * @param {string} text - El texto a convertir a voz
 * @param {string} voice - Nombre de la voz de Edge TTS (ej. es-MX-JorgeNeural)
 * @param {string} outputAudioPath - Ruta del archivo MP3 de salida
 * @param {object} options - Opciones de velocidad (rate) y tono (pitch)
 * @returns {Promise<Array<{word: string, start: number, end: number, duration: number}>>}
 */
async function generateSpeechAndTimestamps(text, voice, outputAudioPath, options = {}) {
  const { EdgeTTS } = require('@andresaya/edge-tts');
  
  // Creamos la carpeta contenedora del audio si no existe
  const dir = path.dirname(outputAudioPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tts = new EdgeTTS();

  const synthesisOptions = {
    rate: options.voiceRate || options.rate || '100%', // e.g. '+0%', '+10%'
    pitch: options.pitch || '0Hz' // e.g. '+0Hz'
  };

  try {
    console.log(`Generando voz con ${voice} para: "${text.substring(0, 40)}..."`);
    
    // Ejecutar síntesis
    await tts.synthesize(text, voice, synthesisOptions);
    
    // Guardar el archivo MP3
    // Si la ruta ya termina en .mp3, le removemos la extensión antes de pasársela a toFile,
    // ya que la librería edge-tts le añade siempre automáticamente la extensión .mp3 al final de la ruta recibida.
    let savePath = outputAudioPath;
    if (savePath.toLowerCase().endsWith('.mp3')) {
      savePath = savePath.substring(0, savePath.length - 4);
    }
    await tts.toFile(savePath);
    
    // Esperar a que el archivo de audio esté completamente escrito y listo en disco
    console.log(`Esperando a que el archivo de audio se estabilice en disco: ${path.basename(outputAudioPath)}`);
    await waitForFileToBeReady(outputAudioPath);
    console.log(`Audio guardado y estabilizado en disco: ${outputAudioPath}`);

    // Obtener los límites de palabra (Word Boundaries)
    // Cada elemento contiene: text, offset/audioOffset, duration
    const rawBoundaries = tts.getWordBoundaries() || [];
    
    // Procesar los límites para obtener marcas de tiempo en segundos
    // En el API de Edge, el offset/audioOffset y la duration están medidos en "ticks" (1 tick = 100 nanosegundos = 10^-7 segundos).
    // Para convertir a segundos, dividimos por 10,000,000 (10^7).
    const words = rawBoundaries.map((b) => {
      const rawOffset = b.offset !== undefined ? b.offset : b.audioOffset;
      const startSec = rawOffset / 10000000;
      const durationSec = b.duration / 10000000;
      const endSec = startSec + durationSec;

      return {
        word: b.text,
        start: Number(startSec.toFixed(3)),
        end: Number(endSec.toFixed(3)),
        duration: Number(durationSec.toFixed(3))
      };
    });

    console.log(`Extraídas ${words.length} palabras con timestamps.`);
    return words;
  } catch (error) {
    console.error('Error en la síntesis de Edge TTS:', error);
    throw error;
  }
}

/**
 * Espera a que un archivo de audio esté completamente escrito y cerrado en el disco.
 * Verifica que el archivo exista, su tamaño sea mayor a 0 y que el tamaño se haya estabilizado (sin cambios).
 * @param {string} filePath - Ruta absoluta del archivo
 * @param {number} timeoutMs - Tiempo de espera máximo en milisegundos
 * @returns {Promise<boolean>} Retorna true si el archivo está listo, false si expiró el tiempo de espera
 */
function waitForFileToBeReady(filePath, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let lastSize = -1;
    let stableCount = 0;

    const interval = setInterval(() => {
      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          const currentSize = stats.size;

          if (currentSize > 0) {
            if (currentSize === lastSize) {
              stableCount++;
              // Si el tamaño permanece constante durante 3 ciclos (300ms), está completamente escrito
              if (stableCount >= 3) {
                clearInterval(interval);
                resolve(true);
                return;
              }
            } else {
              lastSize = currentSize;
              stableCount = 0; // Se reinicia el contador de estabilidad
            }
          }
        }
      } catch (err) {
        stableCount = 0;
      }

      if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval);
        console.warn(`[TTS] Límite de tiempo alcanzado esperando estabilidad de: ${path.basename(filePath)}`);
        resolve(false);
      }
    }, 100);
  });
}

module.exports = {
  generateSpeechAndTimestamps
};
