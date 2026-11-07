# 🎥 reddit-generador: Generador Automático de Videos Virales de Reddit

reddit-generador es una plataforma web profesional y autocontenida diseñada para automatizar la creación de videos virales en formatos vertical (9:16) y horizontal (16:9) ideales para redes sociales como **TikTok, Facebook Reels, YouTube Shorts, e Instagram**.

Combina el poder de la Inteligencia Artificial de Google Gemini, síntesis de voz en alta definición, renderizado estético de tarjetas de publicaciones de Reddit y compilación de video ultra rápida optimizada por hardware (GPU).

---

## 🚀 Características Clave

1. **Generación Creativa de Historias (IA):**
   * Redacción automatizada de guiones dramáticos con micro-cliffhangers de retención basados en ideas simples.
   * Integración directa con los modelos de última generación de Google Gemini (**Gemini 3.5 Flash** predeterminado).
   
2. **Locución Narrativa de Alta Calidad:**
   * Síntesis de voz en tiempo real con voces naturales en español neutro (masculino/femenino) mediante **Edge-TTS** local.
   * Ajuste fino de la velocidad de locución para maximizar la retención del espectador (narradores a +15% o +20%).

3. **Subtítulos Sincronizados Enriquecidos (Tipo Capcut):**
   * Generación automática de subtítulos portables en formato `.ass`.
   * **Animaciones Avanzadas en Vivo:** 
     * **Borde Emergente II (Capcut Style):** Caja de color morado sólido plano que resalta las palabras en sincronía exacta sin alterar el tamaño ni la escala del bloque de texto.
     * **Active Highlight:** Iluminación en amarillo de la palabra activa sin zoom.
     * **TikTok Pop / Bounce Pop:** Palabra a la vez con efectos de escalado suaves.
   * Soporte integrado de fuentes locales (ej. **Bangers**, Arial Bold) para uso portátil sin necesidad de instalación global en el sistema.

4. **Compilación de Video Profesional con FFmpeg:**
   * Escalado a Full HD (1080p) con transiciones dinámicas (slide, fade, zoom) en la tarjeta del post de Reddit.
   * **Aceleración por Hardware (GPU) de Calidad Master:** Autodetecta y utiliza la GPU del sistema (NVIDIA NVENC, AMD AMF, Intel QSV) aplicando configuraciones de bitrate inteligente (**VBR de 6Mbps a 12Mbps**) para garantizar videos completamente nítidos y sin pixelación.

---

## 🛠️ Requisitos Previos

Antes de iniciar la aplicación, asegúrate de tener instalado en tu sistema:
1. **[Node.js](https://nodejs.org/)** (Versión 18 o superior recomendada).
2. **[FFmpeg](https://ffmpeg.org/)** (Asegúrate de que está en las variables de entorno de tu Windows para que la compilación se inicie correctamente).

---

## 💻 Instalación y Puesta en Marcha

1. Clona el repositorio o descarga la carpeta en tu computadora.
2. Abre una terminal de comandos en la carpeta raíz del proyecto y descarga las dependencias del servidor:
   ```bash
   npm install
   ```
3. Ve a la carpeta `frontend` e instala las dependencias del panel de control web:
   ```bash
   cd frontend
   npm install
   ```
4. Inicia el servidor de desarrollo del backend y el frontend de manera simultánea desde la raíz:
   ```bash
   npm run dev
   ```
5. Abre en tu navegador preferido:
   ```url
   http://localhost:3000
   ```

---

## ⚙️ Cómo Funciona la Aplicación (Guía de Uso)

### Paso 1: Configurar la API Key de Gemini
Ve a la sección **Ajustes** en la barra lateral del panel e introduce tu clave de API de Google Gemini. Selecciona tu perfil y guarda la configuración.

### Paso 2: Crear o Editar una Plantilla
En la pestaña de **Plantillas de Video**:
* Asigna la voz de tu narrador o narradora predeterminada.
* Ajusta la tipografía de los subtítulos. Para la fuente Bangers u otras personalizadas, selecciona la escala y verás la previsualización interactiva de inmediato.
* El **Tamaño de Fuente 100** representa ahora la escala estándar recomendada para evitar desbordamientos.
* **Previa en Vivo:** Usa el reproductor dinámico para simular el comportamiento de las animaciones en tiempo real y corregir el posicionamiento en los ejes X e Y antes de renderizar.

### Paso 3: Generación del Video Final
Ve al panel principal, ingresa una idea sencilla (ej: *"Mi madre me quería encerrar en un manicomio para robar mi herencia"*), selecciona tu plantilla favorita y haz clic en **Generar Video**.

La IA redactará la historia, el sintetizador de voz creará los audios, se generarán los subtítulos alineados palabra por palabra en la línea de tiempo y **FFmpeg compilará automáticamente el video final** en tu escritorio usando la aceleración de tu tarjeta gráfica para completarlo en segundos.

---

## 📂 Estructura del Proyecto

* `/services/ffmpeg.js`: El cerebro de renderizado. Controla los argumentos del filtro complejo de FFmpeg y las velocidades/presets de las GPUs.
* `/services/subtitles.js`: Genera los estilos de la tipografía y sincronización del archivo ASS.
* `/services/gemini.js`: Conexión de IA para la redacción de guiones con fallback de sobrecarga.
* `/frontend`: Panel de administración web interactivo en React.
* `/fonts`: Carpeta para tipografías TTF personalizadas.

---

## 📄 Licencia

Este proyecto es privado. Todos los derechos reservados.
