const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db.json');

const INITIAL_DB = {
  profiles: [
    {
      id: 'default-gemini',
      name: 'Gemini 3.5 Flash (Recomendado)',
      apiKey: '',
      model: 'gemini-3.5-flash',
      systemPrompt: 'Eres un narrador experto de historias de Reddit. Genera historias cautivadoras, intrigantes y realistas que mantengan al espectador enganchado segundo a segundo. Estructura el relato en primera persona ("Yo..."). El tono debe ser natural, conversacional y misterioso.'
    },
    {
      id: 'facebook-dramatico',
      name: 'Guionista FamiliaReddit (Facebook Dramático - Gemini 3.5)',
      apiKey: '',
      model: 'gemini-3.5-flash',
      systemPrompt: 'Eres un guionista experto en historias virales dramáticas estilo FamiliaReddit extremo para Facebook en español latino neutro. Mantienes coherencia total y narrativa lineal. Generas la historia y retornas obligatoriamente un objeto JSON que sigue estrictamente este esquema:\n- title: Un título en MAYÚSCULAS (máximo 85 caracteres), extremadamente polémico y sensacionalista, que describa la traición o injusticia principal.\n- content: El relato completo en PRIMERA PERSONA de forma continua. El relato debe finalizar exactamente con este llamado a la acción (CTA):\n\"¿Alguna vez un familiar te traicionó por dinero, herencia o un secreto? Hay historias que duelen… pero también historias que te recuerdan que la vida siempre da vueltas. Síguenos para más relatos que sanan el alma.\"\n- gender: Coloca "male" si la perspectiva del narrador es de un hombre (Voz Masculina), o "female" si es de una mujer (Voz Femenina).\n\nREGLAS OBLIGATORIAS (sigue estrictamente):\n- Longitud total exacta: 1600-1800 palabras (8-10 minutos de narración).\n- 100% primera persona todo el tiempo, coherente con la voz (gender) asignada.\n- Hook brutal y shockeante en las primeras 3 líneas.\n- Título sensacionalista.\n- Sigue FIDELMENTE la semilla que te dé el usuario como base 100%: no inventes tramas nuevas ni cambies personajes principales.\n- Nivel alto de drama y polémica: traiciones, manipulación, secretos familiares, dinero, herencias. El protagonista no es santo.\n- Micro-cliffhangers cada 400-500 palabras.\n- Detalles sensoriales y diálogos naturales concretos.\n- Limpio y seguro para Facebook: sin violencia física, sin delitos graves, sin lenguaje de odio.\n- Variar tramas y nombres según la semilla. Nunca repetir historias anteriores.'
    }
  ],
  templates: [
    {
      id: 'default-template',
      name: 'TikTok Reddit Pop (Negro/Amarillo)',
      maleVoice: 'es-MX-JorgeNeural',
      femaleVoice: 'es-MX-DaliaNeural',
      font: 'Arial Bold',
      fontSize: 100,
      subtitleColor: '#FFFF00', // Yellow active
      passiveColor: '#FFFFFF', // White passive
      animation: 'tiktok-pop',
      cardTheme: 'dark',
      cardAvatar: 'https://www.redditstatic.com/avatars/avatar_default_02_FF4500.png',
      cardUsername: 'reddit_stories',
      cardSubreddit: 'r/AskReddit',
      upvotes: '14.5k',
      comments: '1.2k',
      showShare: true
    }
  ],
  timeline: {
    currentVideoIndex: 0,
    currentOffset: 0,
    backgroundVideos: [] // List of local video paths
  },
  settings: {
    exportFolder: path.join(process.env.USERPROFILE || 'C:\\', 'Desktop', 'redit_exports'),
    defaultProfileId: 'default-gemini',
    defaultTemplateId: 'default-template'
  }
};

function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DB, null, 2), 'utf8');
      return INITIAL_DB;
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading local db.json:', error);
    return INITIAL_DB;
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing to local db.json:', error);
    return false;
  }
}

module.exports = {
  readDb,
  writeDb
};
