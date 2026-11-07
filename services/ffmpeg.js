const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const ffmpegPath = require('ffmpeg-static');
const gpu = require('./gpuDetector');

async function compileVideo(params, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const {
      backgroundSegments,
      cardImagePath,
      titleAudioPath,
      bodyAudioPath,
      assSubtitlesPath,
      titleDuration,
      totalDuration,
      outputPath,
      cardOffsetX = 0,
      cardOffsetY = 0,
      cardScale = 1.0,
      cardOffsetX_16_9 = 0,
      cardOffsetY_16_9 = 0,
      cardScale_16_9 = 1.0,
      aspectRatio = '9:16',
      cardEntryAnimation = 'none',
      cardExitAnimation = 'none',
      cardEntryDuration = 0.4,
      cardExitDuration = 0.4,
      renderEngine = 'auto',
      renderQuality = 'quality' // 'quality' | 'balanced' | 'fast' — por defecto mantiene el comportamiento original
    } = params;

    const activeCardOffsetX = aspectRatio === '16:9' ? (params.cardOffsetX_16_9 !== undefined ? params.cardOffsetX_16_9 : 0) : cardOffsetX;
    const activeCardOffsetY = aspectRatio === '16:9' ? (params.cardOffsetY_16_9 !== undefined ? params.cardOffsetY_16_9 : 0) : cardOffsetY;
    const activeCardScale   = aspectRatio === '16:9' ? (params.cardScale_16_9  !== undefined ? params.cardScale_16_9  : 1.0) : cardScale;

    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const autoHw = gpu.detectHardware();
    let activeCodec  = autoHw.codec;
    let activeHwaccel = autoHw.hwaccel;

    if (renderEngine && renderEngine !== 'auto') {
      activeCodec = renderEngine;
      if (renderEngine === 'h264_nvenc')    activeHwaccel = 'cuda';
      else if (renderEngine === 'h264_amf') activeHwaccel = 'd3d11va';
      else if (renderEngine === 'h264_qsv') activeHwaccel = 'qsv';
      else                                  activeHwaccel = '';
    }

    const args = [];

    // ── ENTRADA: -fflags +genpts regenera timestamps desde cero.
    //    Resuelve videos con tbr=240 (HandBrake), VFR de celular, o sin audio.
    //    -ss DESPUÉS de -i es más lento pero garantiza seeking preciso con timestamps raros.
    backgroundSegments.forEach(seg => {
      args.push(
        '-fflags', '+genpts',
        '-i', seg.path,
        // No usamos -ss antes de -i para evitar el problema de timestamps.
        // El trim lo hacemos en el filter_complex con trim+setpts.
      );
    });

    const S = backgroundSegments.length;

    args.push('-loop', '1', '-i', cardImagePath); // S
    args.push('-i', titleAudioPath);               // S+1
    args.push('-i', bodyAudioPath);                // S+2

    // ── FILTER COMPLEX ──────────────────────────────────────────────────────
    let filterComplex = '';

    // Resolución objetivo según orientación
    const outW = aspectRatio === '16:9' ? 1920 : 1080;
    const outH = aspectRatio === '16:9' ? 1080 : 1920;

    // En modo 'quality' usamos lanczos (más nítido, más lento de calcular).
    // En 'balanced'/'fast' usamos bicubic, considerablemente más rápido con pérdida
    // de nitidez casi imperceptible en video comprimido.
    const scaleFlags = renderQuality === 'quality' ? 'lanczos' : 'bicubic';

    // Expresión de crop inteligente: recorta al aspect ratio objetivo sin importar
    // la resolución o proporción original del video (funciona con 1080x1920, 1080x2400, etc.)
    const cropExpr = aspectRatio === '16:9'
      ? `crop=w='if(gte(in_w/in_h\\,16/9)\\,in_h*16/9\\,in_w)':h='if(gte(in_w/in_h\\,16/9)\\,in_h\\,in_w*9/16)'`
      : `crop=w='if(gte(in_w/in_h\\,9/16)\\,in_h*9/16\\,in_w)':h='if(gte(in_w/in_h\\,9/16)\\,in_h\\,in_w*16/9)'`;

    if (S > 1) {
      let concatInputs = '';
      for (let i = 0; i < S; i++) {
        const seg = backgroundSegments[i];
        // trim+setpts: corta el segmento en el filtro (evita -ss antes de -i con tbr alto)
        // fps=30: normaliza framerate DESPUÉS del trim, no en la lectura
        // format=yuv420p: unifica pixel format antes del concat
        filterComplex +=
          `[${i}:v]trim=start=${seg.start}:duration=${seg.duration},setpts=PTS-STARTPTS,` +
          `${cropExpr},scale=${outW}:${outH}:flags=${scaleFlags},` +
          `fps=fps=30,format=yuv420p[v_seg${i}];`;
        concatInputs += `[v_seg${i}]`;
      }
      filterComplex += `${concatInputs}concat=n=${S}:v=1:a=0[v_bg];`;
    } else {
      const seg = backgroundSegments[0];
      filterComplex +=
        `[0:v]trim=start=${seg.start}:duration=${seg.duration},setpts=PTS-STARTPTS,` +
        `${cropExpr},scale=${outW}:${outH}:flags=${scaleFlags},` +
        `fps=fps=30,format=yuv420p[v_bg];`;
    }

    // Escalar card
    const baseCardWidth = aspectRatio === '16:9'
      ? Math.round(1920 * 0.40 * activeCardScale)
      : Math.round(1080 * 0.74 * activeCardScale);
    filterComplex += `[${S}:v]scale=w=${baseCardWidth}:h=-2:flags=${scaleFlags}[card_scaled];`;

    // Animaciones fade del card
    let cardLabel = '[card_scaled]';
    const hasFadeIn  = cardEntryAnimation === 'fade-in'  || cardEntryAnimation === 'zoom-in';
    const hasFadeOut = cardExitAnimation  === 'fade-out' || cardExitAnimation  === 'zoom-out';
    if (hasFadeIn && hasFadeOut) {
      filterComplex += `[card_scaled]fade=t=in:st=0:d=${cardEntryDuration}:alpha=1,fade=t=out:st=${titleDuration - cardExitDuration}:d=${cardExitDuration}:alpha=1[card_processed];`;
      cardLabel = '[card_processed]';
    } else if (hasFadeIn) {
      filterComplex += `[card_scaled]fade=t=in:st=0:d=${cardEntryDuration}:alpha=1[card_processed];`;
      cardLabel = '[card_processed]';
    } else if (hasFadeOut) {
      filterComplex += `[card_scaled]fade=t=out:st=${titleDuration - cardExitDuration}:d=${cardExitDuration}:alpha=1[card_processed];`;
      cardLabel = '[card_processed]';
    }

    // Posicionamiento y animaciones de movimiento del card
    const exitStartTime = `(${titleDuration}-${cardExitDuration})`;
    let entryX = `((W-w)/2)+${activeCardOffsetX}`;
    let entryY = `((H-h)/2)+${activeCardOffsetY}`;
    let exitX  = `((W-w)/2)+${activeCardOffsetX}`;
    let exitY  = `((H-h)/2)+${activeCardOffsetY}`;

    if      (cardEntryAnimation === 'slide-in-left')   entryX = `-w+(((W-w)/2)+${activeCardOffsetX}+w)*(t/${cardEntryDuration})`;
    else if (cardEntryAnimation === 'slide-in-right')  entryX = `W-((W-(((W-w)/2)+${activeCardOffsetX}))*(t/${cardEntryDuration}))`;
    else if (cardEntryAnimation === 'slide-in-bottom') entryY = `H-((H-(((H-h)/2)+${activeCardOffsetY}))*(t/${cardEntryDuration}))`;
    else if (cardEntryAnimation === 'slide-in-top')    entryY = `-h+(((H-h)/2)+${activeCardOffsetY}+h)*(t/${cardEntryDuration})`;
    else if (cardEntryAnimation === 'zoom-in')         entryY = `((H-h)/2)+${activeCardOffsetY}-(60*(1-(t/${cardEntryDuration})))`;

    if      (cardExitAnimation === 'slide-out-left')   exitX = `(((W-w)/2)+${activeCardOffsetX})-w*((t-${exitStartTime})/${cardExitDuration})`;
    else if (cardExitAnimation === 'slide-out-right')  exitX = `(((W-w)/2)+${activeCardOffsetX})+W*((t-${exitStartTime})/${cardExitDuration})`;
    else if (cardExitAnimation === 'slide-out-bottom') exitY = `(((H-h)/2)+${activeCardOffsetY})+H*((t-${exitStartTime})/${cardExitDuration})`;
    else if (cardExitAnimation === 'slide-out-top')    exitY = `(((H-h)/2)+${activeCardOffsetY})-H*((t-${exitStartTime})/${cardExitDuration})`;
    else if (cardExitAnimation === 'zoom-out')         exitY = `(((H-h)/2)+${activeCardOffsetY})+(60*((t-${exitStartTime})/${cardExitDuration}))`;

    const xExpr = `if(lt(t,${cardEntryDuration}),${entryX},if(gt(t,${exitStartTime}),${exitX},((W-w)/2)+${activeCardOffsetX}))`;
    const yExpr = `if(lt(t,${cardEntryDuration}),${entryY},if(gt(t,${exitStartTime}),${exitY},((H-h)/2)+${activeCardOffsetY}))`;

    filterComplex += `[v_bg]${cardLabel}overlay=x='${xExpr}':y='${yExpr}':enable='between(t,0,${titleDuration})'[v_overlaid];`;

    // Subtítulos
    const escapedSubPath = assSubtitlesPath.replace(/\\/g, '/').replace(/:/g, '\\:');
    const fontsDir = path.join(__dirname, '..', 'fonts').replace(/\\/g, '/').replace(/:/g, '\\:');
    filterComplex += `[v_overlaid]subtitles='${escapedSubPath}':fontsdir='${fontsDir}'[v_final];`;

    // Audio
    filterComplex += `[${S+1}:a][${S+2}:a]concat=n=2:v=0:a=1[a_final]`;

    args.push('-filter_complex', filterComplex);
    args.push('-map', '[v_final]', '-map', '[a_final]');

    // Códec de video — preset y calidad ajustados según renderQuality.
    // 'quality'  = comportamiento original (máxima nitidez, más lento)
    // 'balanced' = buen punto medio, notable mejora de velocidad
    // 'fast'     = máxima velocidad, ligera pérdida de calidad visual
    if (activeCodec === 'h264_nvenc') {
      const nvencPreset = renderQuality === 'quality' ? 'slow' : renderQuality === 'balanced' ? 'fast' : 'p1';
      const nvencCq = renderQuality === 'quality' ? '19' : renderQuality === 'balanced' ? '22' : '25';
      args.push('-c:v','h264_nvenc','-preset',nvencPreset,'-profile:v','high',
                '-rc','vbr','-cq',nvencCq,'-b:v','6M','-maxrate:v','12M',
                '-bufsize:v','12M','-pix_fmt','yuv420p');
    } else if (activeCodec === 'h264_amf') {
      const amfQuality = renderQuality === 'quality' ? 'quality' : renderQuality === 'balanced' ? 'balanced' : 'speed';
      args.push('-c:v','h264_amf','-quality',amfQuality,
                '-b:v','6M','-maxrate:v','12M','-pix_fmt','yuv420p');
    } else if (activeCodec === 'h264_qsv') {
      const qsvPreset = renderQuality === 'quality' ? 'slow' : renderQuality === 'balanced' ? 'fast' : 'veryfast';
      const qsvQuality = renderQuality === 'quality' ? '19' : renderQuality === 'balanced' ? '22' : '25';
      args.push('-c:v','h264_qsv','-preset',qsvPreset,
                '-global_quality',qsvQuality,'-pix_fmt','yuv420p');
    } else {
      const x264Preset = renderQuality === 'quality' ? 'medium' : renderQuality === 'balanced' ? 'fast' : 'veryfast';
      const x264Crf = renderQuality === 'quality' ? '18' : renderQuality === 'balanced' ? '20' : '23';
      args.push('-c:v','libx264','-preset',x264Preset,'-crf',x264Crf,'-pix_fmt','yuv420p');
    }

    args.push('-r', '30');           // framerate de salida fijo
    args.push('-c:a','aac','-b:a','192k');
    args.push('-t', totalDuration.toString());
    args.push('-y', outputPath);

    console.log(`\n==== FFMPEG CMD (${activeCodec} | calidad: ${renderQuality}) ====`);
    console.log(ffmpegPath, args.map(a => a.includes(' ') ? `"${a}"` : a).join(' '));
    console.log('=====================================\n');

    // fonts.conf
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const fontsConfPath = path.join(tempDir, 'fonts.conf');
    const localFontsDir = path.join(__dirname, '..', 'fonts').replace(/\\/g, '/');
    fs.writeFileSync(fontsConfPath, `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${localFontsDir}</dir>
  <dir>C:/Windows/Fonts</dir>
</fontconfig>`, 'utf8');

    // Acumular stderr completo para mostrarlo en el error si falla
    let stderrAccum = '';

    const ffmpegProcess = spawn(ffmpegPath, args, {
      env: { ...process.env, FONTCONFIG_FILE: fontsConfPath }
    });

    ffmpegProcess.stderr.on('data', (data) => {
      const text = data.toString();
      stderrAccum += text;
      console.log('FFMPEG:', text);

      const timeMatch = text.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (timeMatch) {
        const currentSeconds =
          parseInt(timeMatch[1]) * 3600 +
          parseInt(timeMatch[2]) * 60  +
          parseInt(timeMatch[3])       +
          parseInt(timeMatch[4]) / 100;
        onProgress(Math.min(100, Math.max(0, Math.round((currentSeconds / totalDuration) * 100))));
      }
    });

    ffmpegProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`Video renderizado: ${outputPath}`);
        resolve(outputPath);
      } else {
        // Extraer las últimas líneas relevantes del error para el mensaje
        const errorLines = stderrAccum
          .split('\n')
          .filter(l => l.includes('Error') || l.includes('error') || l.includes('Invalid') || l.includes('failed'))
          .slice(-5)
          .join(' | ');
        const msg = `FFmpeg finalizó con error (código ${code}). Detalle: ${errorLines || 'Ver consola del servidor'}`;
        console.error(msg);
        reject(new Error(msg));
      }
    });

    ffmpegProcess.on('error', (err) => {
      reject(new Error(`No se pudo ejecutar FFmpeg: ${err.message}`));
    });
  });
}

module.exports = { compileVideo };