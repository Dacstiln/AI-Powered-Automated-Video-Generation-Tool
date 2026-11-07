const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Genera una historia estructurada de Reddit basada en el prompt del usuario
 * @param {string} apiKey - Gemini API Key
 * @param {string} modelName - Nombre del modelo (ej. gemini-1.5-flash)
 * @param {string} userPrompt - Lo que el usuario quiere contar (ej. "historias de terror")
 * @param {string} systemPrompt - Instrucciones de comportamiento para la IA
 * @returns {Promise<{title: string, content: string, gender: string}>}
 */
async function generateStory(apiKey, modelName, userPrompt, systemPrompt) {
  if (!apiKey) {
    throw new Error('API Key de Gemini no proporcionada. Por favor, configúrala en Ajustes.');
  }

  // Importar el SDK de Google Gen AI.
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  
  // Inicializamos el cliente
  // NOTA IMPORTANTE PARA EL USUARIO:
  // Si deseas actualizar el prompt del sistema o entender cómo funciona la detección de género:
  // 1. Mandamos al modelo un esquema estructurado (responseSchema) para evitar que retorne texto plano.
  // 2. Le pedimos explícitamente que analice pronombres y relaciones (ej: "mi novia" -> masculino, "mi esposo" -> femenino)
  //    para categorizar el género como "male" o "female".
  
  let activeModel = modelName || 'gemini-3.5-flash';
  if (activeModel === 'gemini-1.5-flash' || activeModel === 'gemini-3-flash-preview') {
    activeModel = 'gemini-3.5-flash';
  }

  const ai = new GoogleGenerativeAI(apiKey);

  const schema = {
    type: 'OBJECT',
    properties: {
      title: {
        type: 'STRING',
        description: 'Un título corto, extremadamente llamativo e intrigante de la historia de Reddit (máximo 15 palabras).'
      },
      content: {
        type: 'STRING',
        description: 'El cuerpo de la historia. Debe estar redactado en primera persona de manera fluida, natural, interesante y cautivadora, listo para ser convertido a audio sin marcas raras ni emojis (excepto puntuación normal).'
      },
      gender: {
        type: 'STRING',
        enum: ['male', 'female'],
        description: 'Clasificación de género del narrador de la historia. Si es un hombre contando (menciona "mi esposa", "mi novia", etc.) usa "male". Si es una mujer contando (menciona "mi novio", "mi esposo", etc.) usa "female". Si es neutral o ambiguo, asigna el género que mejor encaje dramáticamente.'
      }
    },
    required: ['title', 'content', 'gender']
  };

  const promptCompleto = `
Genera una historia única basada en el siguiente tema o prompt:
"${userPrompt}"

Reglas estrictas de redacción:
- Debe parecer una publicación real de Reddit en foros como r/nosleep, r/confessions, o r/AskReddit.
- Empieza directamente con el relato, sin introducciones decorativas como "Aquí tienes tu historia".
- Evita caracteres especiales extraños o emojis, ya que esto será leído por un sintetizador de voz (TTS).
`;

  const maxAttempts = 5;
  let attempt = 0;
  let delay = 3000; // Comenzar con un retardo inicial de 3 segundos

  while (attempt < maxAttempts) {
    attempt++;
    console.log(`[Gemini] Intento de generación ${attempt}/${maxAttempts} usando el modelo: ${activeModel}`);
    
    try {
      const model = ai.getGenerativeModel({
        model: activeModel,
        systemInstruction: systemPrompt
      });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: promptCompleto }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.8
        }
      });

      const responseText = result.response.text();
      console.log('Respuesta cruda de Gemini:', responseText);

      // Limpiar posibles bloques de markdown que Gemini a veces añade (```json ... ```)
      const cleanedText = responseText.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

      let storyData;
      try {
        storyData = JSON.parse(cleanedText);
      } catch (parseErr) {
        // JSON cortado o malformado — se trata como error transitorio para reintentar
        console.error('[Gemini] JSON inválido recibido, reintentando...', cleanedText.substring(0, 200));
        const retryErr = new Error('JSON inválido o incompleto recibido de Gemini: ' + parseErr.message);
        retryErr._isJsonParseError = true;
        throw retryErr;
      }

      if (!storyData.title || !storyData.content || !storyData.gender) {
        throw new Error('La respuesta de Gemini no coincide con el esquema requerido.');
      }
      
      return storyData;
    } catch (error) {
      console.error(`[Gemini] Error en intento ${attempt}:`, error.message || error);

      // Si es el último intento, lanzamos el error
      if (attempt >= maxAttempts) {
        throw error;
      }

      // Analizar si el error es de sobrecarga, cuota o indisponibilidad (503, 429, etc.)
      // JSON cortado/inválido también es transitorio (Gemini a veces corta la respuesta bajo carga)
      const isTransient = error._isJsonParseError || error.status === 503 || error.status === 429 ||
        (error.message && (
          error.message.includes('high demand') ||
          error.message.includes('limit') ||
          error.message.includes('Service Unavailable') ||
          error.message.includes('quota') ||
          error.message.includes('Rate limit') ||
          error.message.includes('Temporary') ||
          error.message.includes('experiencing')
        ));

      if (isTransient) {
        // En el intento 3, si seguimos fallando con el modelo seleccionado (ej: gemini-3-flash-preview o gemini-3-flash), 
        // cambiamos automáticamente a un modelo estable y de alta disponibilidad alternativo como último recurso
        if (attempt === 3 && activeModel !== 'gemini-3.5-flash') {
          console.log(`[Gemini] El modelo ${activeModel} sigue experimentando alta demanda/cuota. Aplicando fallback automático a gemini-3.5-flash para los reintentos restantes...`);
          activeModel = 'gemini-3.5-flash';
        } else if (attempt === 3 && activeModel === 'gemini-3.5-flash') {
          console.log(`[Gemini] El modelo gemini-3.5-flash sigue experimentando alta demanda/cuota. Aplicando fallback automático a gemini-2.5-flash...`);
          activeModel = 'gemini-2.5-flash';
        }

        const jitter = Math.random() * 1000;
        const currentDelay = delay + jitter;
        console.log(`[Gemini] Error de servidor/cuota transitorio detectado. Reintentando en ${(currentDelay / 1000).toFixed(1)} segundos...`);
        
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        delay *= 2; // Incremento exponencial
      } else {
        // Si no es un error de cuota/indisponibilidad (ej. error de validación de clave), fallamos inmediatamente
        throw error;
      }
    }
  }
}

module.exports = {
  generateStory
};