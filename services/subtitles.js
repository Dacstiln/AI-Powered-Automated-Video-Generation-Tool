const fs = require('fs');
const path = require('path');

// Convierte un color Hex de CSS (#RRGGBB) a formato ASS Hex (&H00BBGGRR&)
function colorToAss(hex) {
  if (!hex) return '&H00FFFFFF&';
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 6) {
    const r = cleanHex.substring(0, 2);
    const g = cleanHex.substring(2, 4);
    const b = cleanHex.substring(4, 6);
    return `&H00${b}${g}${r}&`; // Formato: BGR
  }
  return '&H00FFFFFF&';
}

// Formatea segundos (ej. 3.42) a formato de tiempo ASS (h:mm:ss.cs)
function formatTimeASS(seconds) {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds - hrs * 3600) / 60);
  const secs = Math.floor(seconds - hrs * 3600 - mins * 60);
  const ms = Math.floor((seconds % 1) * 100);

  const hStr = hrs.toString();
  const mStr = mins.toString().padStart(2, '0');
  const sStr = secs.toString().padStart(2, '0');
  const msStr = ms.toString().padStart(2, '0');

  return `${hStr}:${mStr}:${sStr}.${msStr}`;
}

/**
 * Genera un archivo de subtítulos .ass altamente dinámico y estilizado.
 * @param {Array<{word: string, start: number, end: number, duration: number}>} wordTimestamps - Timestamps de palabras
 * @param {string} outputPath - Ruta de salida para el archivo .ass
 * @param {object} template - Plantilla con configuraciones de estilo
 * @param {number} startOffset - Segundo en el que finaliza el Title Card y deben comenzar los subtítulos
 * @returns {Promise<string>} - Ruta del archivo .ass generado
 */
async function generateAssSubtitles(wordTimestamps, outputPath, template, startOffset = 0, isLandscape = false) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const {
    font = 'Arial Bold',
    fontSize = 26,
    subtitleColor = '#FFFF00', // Color activo
    passiveColor = '#FFFFFF', // Color pasivo
    animation = 'tiktok-pop', // tiktok-pop, bounce-pop, active-highlight, glow-karaoke, clean-fade, borde-emergente-2
    subtitleOffsetX = 0, // Desplazamiento horizontal manual (defecto 0)
    subtitleOffsetY = 0, // Desplazamiento vertical manual (defecto 0)
    subtitleAnimationSpeed = 80, // Velocidad de zoom/pop en milisegundos (defecto 80ms)
    subtitleBorderStyle = 'outline', // outline, heavy-outline, box
    subtitleLetterSpacing = 0, // Separación de letras por píxeles
    fontSize_16_9 = 24,
    subtitleOffsetX_16_9 = 0,
    subtitleOffsetY_16_9 = 0
  } = template;

  const activeFontSize = isLandscape ? (fontSize_16_9 !== undefined ? fontSize_16_9 : 24) : fontSize;
  const activeOffsetX = isLandscape ? (subtitleOffsetX_16_9 !== undefined ? subtitleOffsetX_16_9 : 0) : subtitleOffsetX;
  const activeOffsetY = isLandscape ? (subtitleOffsetY_16_9 !== undefined ? subtitleOffsetY_16_9 : 0) : subtitleOffsetY;

  const assActiveColor = colorToAss(subtitleColor);
  const assPassiveColor = colorToAss(passiveColor);
  const assOutlineColor = '&H00000000&'; // Borde negro absoluto

  // Mapear el estilo de contorno de subtítulos de ASS
  let assBorderStyle = '1';
  let assOutlineSize = '3.5';
  let assShadowSize = '0.5';
  let assBackColour = '&H00000000&'; // Fondo negro

  if (subtitleBorderStyle === 'heavy-outline') {
    assBorderStyle = '1';
    assOutlineSize = '5.0';
    assShadowSize = '0';
  } else if (subtitleBorderStyle === 'box') {
    assBorderStyle = '3'; // Caja de fondo sólida (Estilo Capcut/TikTok)
    assOutlineSize = '1.0'; // Pequeño margen interno en la caja
    assShadowSize = '0';
    assBackColour = '&H80000000&'; // Negro con 50% de opacidad para efecto premium
  }

  // Coordenadas físicas calculadas sobre lienzo
  const resX = isLandscape ? 1920 : 1080;
  const resY = isLandscape ? 1080 : 1920;
  const X = (resX / 2) + parseInt(activeOffsetX);
  const Y = (resY / 2) + parseInt(activeOffsetY);
  const speed = parseInt(subtitleAnimationSpeed);

  // Encabezado del script ASS
  let assContent = `[Script Info]
Title: Reddit Auto Subtitles
ScriptType: v4.00+
WrapStyle: 0
PlayResX: ${resX}
PlayResY: ${resY}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${font},${activeFontSize},${assPassiveColor},&H000000FF&,${assOutlineColor},${assBackColour},-1,0,0,0,100,100,${subtitleLetterSpacing},0,${assBorderStyle},${assOutlineSize},${assShadowSize},5,60,60,650,1
Style: TitleCard,${font},28,&H00FFFFFF&,&H000000FF&,${assOutlineColor},&H00000000&,-1,0,0,0,100,100,0,0,1,3.5,0.5,5,60,60,650,1
`;

  // Estilo dedicado de Borde Emergente II (Caja de color morado plano estilo Capcut sin contorno blanco)
  if (animation === 'borde-emergente-2') {
    const boxBgColor = '&H008E136C&'; // Morado Capcut en BGR (#6C138E)
    // Para BorderStyle 3 (caja sólida), el PrimaryColour es el texto y el OutlineColour es el fondo de la caja
    assContent += `Style: BordeEmergente,${font},${activeFontSize},&H00FFFFFF&,&H000000FF&,${boxBgColor},&H00000000&,-1,0,0,0,100,100,${subtitleLetterSpacing},0,3,4.0,0,5,60,60,650,1\n`;
  }

  assContent += `
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  // Estilo 1: TikTok Pop (Una palabra a la vez en el centro de la pantalla, efecto de escala y resalte rápido)
  if (animation === 'tiktok-pop') {
    wordTimestamps.forEach((wt) => {
      const start = formatTimeASS(wt.start + startOffset);
      const end = formatTimeASS(wt.end + startOffset);
      
      const cleanWord = wt.word.toUpperCase();
      // Aplicamos \\pos(X,Y) y control de velocidad en la marca temporal \\t
      const text = `{\\pos(${X},${Y})\\fscx125\\fscy125\\c${assActiveColor}\\t(0, ${speed}, \\fscx100\\fscy100)}${cleanWord}`;
      
      assContent += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
    });
  } 
  
  // Estilo 1b: Bounce Pop (Efecto rebote elástico por palabra, alta retención)
  else if (animation === 'bounce-pop') {
    const halfSpeed = Math.round(speed / 2);
    wordTimestamps.forEach((wt) => {
      const start = formatTimeASS(wt.start + startOffset);
      const end = formatTimeASS(wt.end + startOffset);
      
      const cleanWord = wt.word.toUpperCase();
      // El rebote utiliza dos transiciones consecutivas escaladas según el tiempo de velocidad
      const text = `{\\pos(${X},${Y})\\fscx145\\fscy145\\c${assActiveColor}\\t(0, ${halfSpeed}, \\fscx92\\fscy92)\\t(${halfSpeed}, ${speed}, \\fscx100\\fscy100)}${cleanWord}`;
      
      assContent += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
    });
  }

  // Estilo 1c: Borde Emergente II (Caja morada plana sin borde blanco que emerge sobre la palabra de la frase en bloque sin zoom)
  else if (animation === 'borde-emergente-2') {
    const wordsPerPhrase = 4;
    const phrases = [];
    
    for (let i = 0; i < wordTimestamps.length; i += wordsPerPhrase) {
      phrases.push(wordTimestamps.slice(i, i + wordsPerPhrase));
    }

    phrases.forEach((phrase) => {
      phrase.forEach((activeWt) => {
        const wordStart = formatTimeASS(activeWt.start + startOffset);
        const wordEnd = formatTimeASS(activeWt.end + startOffset);

        // Capa 1: Capa Pasiva (Default) - Todas las letras en blanco/pasivo, la palabra activa es transparente
        const passiveTextParts = phrase.map((wt) => {
          if (wt === activeWt) {
            return `{\\alpha&HFF&}${wt.word.toUpperCase()}{\\alpha&H00&}`;
          } else {
            return wt.word.toUpperCase();
          }
        });
        const passiveDialogueText = `{\\pos(${X},${Y})}${passiveTextParts.join(' ')}`;

        // Capa 2: Capa Activa (BordeEmergente) - Todas las letras transparentes, la palabra activa es opaca (sin zoom/escala)
        const activeTextParts = phrase.map((wt) => {
          if (wt === activeWt) {
            return `{\\alpha&H00&}${wt.word.toUpperCase()}{\\alpha&HFF&}`;
          } else {
            return wt.word.toUpperCase();
          }
        });
        const activeDialogueText = `{\\pos(${X},${Y})}{\\alpha&HFF&}${activeTextParts.join(' ')}`;

        // Escribimos ambas capas en el mismo intervalo de tiempo
        assContent += `Dialogue: 0,${wordStart},${wordEnd},Default,,0,0,0,,${passiveDialogueText}\n`;
        assContent += `Dialogue: 1,${wordStart},${wordEnd},BordeEmergente,,0,0,0,,${activeDialogueText}\n`;
      });
    });
  }

  // Estilo 2: Active Highlight (Muestra bloques de frase de 4 palabras, iluminando en amarillo la palabra activa, sin zoom)
  else if (animation === 'active-highlight') {
    const wordsPerPhrase = 4;
    const phrases = [];
    
    for (let i = 0; i < wordTimestamps.length; i += wordsPerPhrase) {
      phrases.push(wordTimestamps.slice(i, i + wordsPerPhrase));
    }

    phrases.forEach((phrase) => {
      phrase.forEach((activeWt) => {
        const wordStart = formatTimeASS(activeWt.start + startOffset);
        const wordEnd = formatTimeASS(activeWt.end + startOffset);

        const textParts = phrase.map((wt) => {
          if (wt === activeWt) {
            return `{\\c${assActiveColor}}${wt.word}{\\c${assPassiveColor}}`;
          } else {
            return wt.word;
          }
        });

        // Inyectamos la posición libre al inicio de todo el bloque
        const dialogueText = `{\\pos(${X},${Y})}${textParts.join(' ')}`;
        assContent += `Dialogue: 0,${wordStart},${wordEnd},Default,,0,0,0,,${dialogueText}\n`;
      });
    });
  } 
  
  // Estilo 2b: Glow Karaoke (Línea de frase bloque con resalte de contorno brillante estilo Neón, sin zoom)
  else if (animation === 'glow-karaoke') {
    const wordsPerPhrase = 4;
    const phrases = [];
    
    for (let i = 0; i < wordTimestamps.length; i += wordsPerPhrase) {
      phrases.push(wordTimestamps.slice(i, i + wordsPerPhrase));
    }

    phrases.forEach((phrase) => {
      phrase.forEach((activeWt) => {
        const wordStart = formatTimeASS(activeWt.start + startOffset);
        const wordEnd = formatTimeASS(activeWt.end + startOffset);

        const textParts = phrase.map((wt) => {
          if (wt === activeWt) {
            // Activa: cambia contorno (\3c) al color brillante, sin escalar
            return `{\\c${assActiveColor}\\3c${assActiveColor}}${wt.word}{\\c${assPassiveColor}\\3c${assOutlineColor}}`;
          } else {
            return wt.word;
          }
        });

        const dialogueText = `{\\pos(${X},${Y})}${textParts.join(' ')}`;
        assContent += `Dialogue: 0,${wordStart},${wordEnd},Default,,0,0,0,,${dialogueText}\n`;
      });
    });
  }

  // Estilo 3: Clean Fade (Minimimalista, bloques que aparecen con fundido suave)
  else {
    const wordsPerBlock = 5;
    for (let i = 0; i < wordTimestamps.length; i += wordsPerBlock) {
      const block = wordTimestamps.slice(i, i + wordsPerBlock);
      const start = formatTimeASS(block[0].start + startOffset);
      const end = formatTimeASS(block[block.length - 1].end + startOffset);
      
      const blockText = block.map(w => w.word).join(' ');
      const text = `{\\pos(${X},${Y})\\fad(100,100)\\c${assPassiveColor}}${blockText}`;
      
      assContent += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
    }
  }

  try {
    fs.writeFileSync(outputPath, assContent, 'utf8');
    console.log(`Subtítulos ASS generados exitosamente en: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error escribiendo subtítulos ASS:', error);
    throw error;
  }
}

module.exports = {
  generateAssSubtitles
};
