# Documentación: Sistema de Detección Automática de Género y Prompts de IA

Este documento detalla el funcionamiento interno de la inteligencia artificial en la plataforma para clasificar automáticamente el género del narrador ("masculino" o "femenino") a partir de una única consulta a la API de Gemini, permitiendo la asignación correcta de voces TTS y subtítulos.

---

## 1. ¿Cómo Funciona la Detección Automática de Género?

Para ahorrar en costos y agilizar el renderizado de video, evitamos realizar una segunda llamada a la IA para analizar el texto. En su lugar, el sistema obliga al modelo (en este caso **Gemini 1.5 Flash**) a retornar un archivo estructurado en **JSON** con una clave específica de género (`gender`).

### Criterios de Clasificación Narrativa
El modelo analiza los siguientes puntos lingüísticos para determinar el género del narrador:
1. **Relaciones e Interacciones**: 
   - *"Mi novio y yo..."* / *"Mi esposo me dijo..."* $\rightarrow$ Clasifica automáticamente como **`female`** (femenino).
   - *"Mi esposa estaba en la cocina..."* / *"Mi novia llamó..."* $\rightarrow$ Clasifica automáticamente como **`male`** (masculino).
2. **Concordancia de Adjetivos (en Español)**:
   - *"Estaba cansado..."* / *"Estaba solo..."* $\rightarrow$ **`male`**.
   - *"Estaba cansada..."* / *"Estaba sola..."* $\rightarrow$ **`female`**.
3. **Contexto Neutral**:
   - Si la historia no contiene marcas de género claras, el modelo asigna el género de forma aleatoria o dramática basándose en el tono de la historia (ej. historias de suspenso crudo a veces se benefician de una voz masculina profunda, e historias de confesiones domésticas de una voz femenina suave).

---

## 2. Esquema de Validación JSON de Gemini

El backend utiliza el SDK de Google Generative AI e impone un esquema de respuesta estricto (`responseSchema`). Esto asegura que Gemini **nunca** responderá con texto libre de chat, sino estrictamente con un formato JSON estructurado:

```json
{
  "type": "OBJECT",
  "properties": {
    "title": {
      "type": "STRING",
      "description": "Un título corto y llamativo para el card de Reddit."
    },
    "content": {
      "type": "STRING",
      "description": "El cuerpo completo de la historia redactado de manera fluida y natural."
    },
    "gender": {
      "type": "STRING",
      "enum": ["male", "female"],
      "description": "Clasificación de género según el contexto narrativo."
    }
  },
  "required": ["title", "content", "gender"]
}
```

Si el modelo devuelve un JSON inválido o le faltan llaves, el backend captura el error en la terminal de logs y reintenta de forma segura.

---

## 3. ¿Cómo Actualizar o Modificar las Directrices?

Puedes cambiar las instrucciones que recibe el modelo directamente desde la interfaz web en la pestaña **"Perfiles de IA"** modificando el campo **Prompt del Sistema (System Instruction)**.

### Puntos clave a tener en cuenta al editar el prompt:
Si deseas refinar o alterar la estructura o el tono de tus historias, asegúrate de mantener las siguientes pautas en tu instrucción del sistema:

*   **Primera Persona (`"Yo"`)**: Mantén siempre la instrucción de redactar en primera persona. Esto es vital para que existan marcas de género lingüísticas en español (ej: *"me sentía asustado/asustada"*).
*   **Prohibición de Emojis y Formatos Extraños**: Como el texto final será leído por el sintetizador de voz (Edge TTS), tu prompt del sistema debe prohibir estrictamente el uso de emojis, viñetas, o hashtags, ya que el motor TTS intentará deletrearlos, arruinando el ritmo del audio.
*   **Segmentación Fluida**: Instruye a la IA a escribir oraciones cortas o medianas separadas por comas o puntos. Esto facilita la generación de subtítulos ASS en bloques legibles de 4 palabras, mejorando la retención del espectador en plataformas de video vertical.
