const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Renderiza la tarjeta de Reddit (Title Card) como una imagen PNG transparente.
 * @param {object} cardData - Datos del card (title, username, subreddit, avatar, upvotes, comments, theme)
 * @param {string} outputPath - Ruta de la imagen PNG de salida
 * @returns {Promise<string>} - Retorna la ruta de salida
 */
async function renderCard(cardData, outputPath) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const {
    title,
    username = 'reddit_user',
    subreddit = 'r/AskReddit',
    avatar,
    upvotes = '1.5k',
    comments = '250',
    theme = 'dark',
    cardFontSizeSubreddit = 14,
    cardFontSizeTitle = 24,
    cardFontSizeUsername,
    cardFontSizeStats = 13,
    cardAvatarSize = 42,
    cardEmojiSize = 14,
    cardTitleColor = '',
    cardSubredditColor = '',
    cardUsernameColor = '',
    cardFontFamily = 'Inter',
  } = cardData;

  // Avatar por defecto si no se provee uno
  const defaultAvatar = 'https://www.redditstatic.com/avatars/avatar_default_02_FF4500.png';
  let activeAvatar = avatar || defaultAvatar;

  // Si es un avatar guardado localmente, convertimos la ruta relativa a ruta absoluta compatible con Puppeteer (file:///)
  // Si es un avatar en base64, Puppeteer lo acepta directamente sin conversión
  if (avatar && avatar.startsWith('data:image/')) {
    activeAvatar = avatar;
    console.log(`[cardRenderer] Usando avatar en formato base64 embebido.`);
  } else if (avatar && avatar.startsWith('/avatars/')) {
    // Compatibilidad con formato antiguo de rutas locales
    const filename = path.basename(avatar);
    const absolutePath = path.join(__dirname, '..', 'temp', 'avatars', filename);
    if (fs.existsSync(absolutePath)) {
      const formattedPath = absolutePath.replace(/\\/g, '/');
      activeAvatar = `file:///${formattedPath}`;
      console.log(`[cardRenderer] Convertida ruta relativa de avatar a ruta absoluta para Puppeteer: ${activeAvatar}`);
    }
  }

  // Esquema de colores según el tema
  const bg = theme === 'dark' ? '#1a1a1b' : '#ffffff';
  const textColor = theme === 'dark' ? '#d7dadc' : '#1c1c1c';
  const baseTitleColor = theme === 'dark' ? '#ffffff' : '#1a1a1b';
  const titleColor = cardTitleColor || baseTitleColor;
  const baseMetaColor = theme === 'dark' ? '#818384' : '#787c7e';
  const metaColor = baseMetaColor;
  const subredditColor = cardSubredditColor || baseTitleColor;
  const usernameColor = cardUsernameColor || baseMetaColor;
  const borderColor = theme === 'dark' ? '#343536' : '#edeff1';
  const buttonHover = theme === 'dark' ? '#272729' : '#f6f7f8';
  const usernameFontSize = cardFontSizeUsername !== undefined && cardFontSizeUsername !== null
    ? cardFontSizeUsername
    : Math.max(9, cardFontSizeSubreddit - 2);
  const googleFont = cardFontFamily !== 'Inter' ? cardFontFamily : 'Inter';

  // Plantilla HTML con estilos en línea emulando a Reddit
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Roboto:wght@400;700;900&family=Oswald:wght@400;600;700&family=Lato:wght@400;700;900&family=Merriweather:wght@400;700&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 40px;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: transparent;
      font-family: '${googleFont}', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #reddit-card {
      background-color: ${bg};
      color: ${textColor};
      width: 520px;
      border-radius: 18px;
      padding: 24px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
      border: 1px solid ${borderColor};
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .avatar {
      width: ${cardAvatarSize}px;
      height: ${cardAvatarSize}px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }
    .meta-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .meta-top {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .subreddit {
      font-weight: 700;
      font-size: ${cardFontSizeSubreddit}px;
      color: ${subredditColor};
    }
    .verified-badge {
      display: inline-flex;
      color: #0079d3;
      width: ${cardFontSizeSubreddit}px;
      height: ${cardFontSizeSubreddit}px;
    }
    .username-line {
      font-size: ${usernameFontSize}px;
      color: ${usernameColor};
    }
    .rewards-badges {
      display: flex;
      gap: 4px;
      margin-top: 2px;
    }
    .badge {
      font-size: ${cardEmojiSize}px;
      line-height: 1;
    }
    .title-content {
      font-weight: 700;
      font-size: ${cardFontSizeTitle}px;
      line-height: 1.35;
      color: ${titleColor};
      margin: 0;
      word-wrap: break-word;
    }
    .footer {
      display: flex;
      align-items: center;
      gap: 16px;
      border-top: 1px solid ${borderColor};
      padding-top: 16px;
      margin-top: 4px;
    }
    .action-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: ${buttonHover};
      padding: 8px 16px;
      border-radius: 9999px;
      font-size: ${cardFontSizeStats}px;
      font-weight: 600;
      color: ${textColor};
    }
    .icon {
      width: ${cardFontSizeStats + 5}px;
      height: ${cardFontSizeStats + 5}px;
      fill: currentColor;
    }
  </style>
</head>
<body>
  <div id="reddit-card">
    <div class="header">
      <img class="avatar" src="${activeAvatar}" alt="avatar" />
      <div class="meta-container">
        <div class="meta-top">
          <span class="subreddit">${subreddit}</span>
          <svg class="verified-badge" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.7 3.1 5.52l.34 3.69L1 12l2.44 2.79-.34 3.69 3.61.82 1.89 3.2L12 21.04l3.4 1.46 1.89-3.2 3.61-.82-.34-3.69L23 12zm-13 5l-4-4 1.41-1.42L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <div class="rewards-badges">
            <span class="badge">🪙</span>
            <span class="badge">💎</span>
            <span class="badge">🔥</span>
          </div>
        </div>
        <div class="username-line">
          Posted by u/${username} • 2 hours ago
        </div>
      </div>
    </div>
    
    <h1 class="title-content">${title}</h1>
    
    <div class="footer">
      <!-- Votos -->
      <div class="action-btn">
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M4 14h6v8h4v-8h6L12 4 4 14z"/>
        </svg>
        <span>${upvotes}</span>
        <svg class="icon" viewBox="0 0 24 24" style="transform: rotate(180deg);">
          <path d="M4 14h6v8h4v-8h6L12 4 4 14z"/>
        </svg>
      </div>
      
      <!-- Comentarios -->
      <div class="action-btn">
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        </svg>
        <span>${comments}</span>
      </div>
      
      <!-- Compartir -->
      <div class="action-btn">
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/>
        </svg>
        <span>Share</span>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  let browser;
  try {
    console.log(`Renderizando card de Reddit a PNG: "${title.substring(0, 30)}..."`);
    // Iniciamos Puppeteer. Para entornos locales, intentará usar el cromo instalado
    // o el que Puppeteer descargó al instalarse.
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    // Indicamos que el fondo del viewport debe ser transparente
    await page.setViewport({ width: 800, height: 800, deviceScaleFactor: 2 }); // Scale factor para mayor nitidez (HD)
    await page.setContent(htmlContent);

    // Esperar a que cargue la fuente de Google
    await page.evaluateHandle('document.fonts.ready');

    // Seleccionamos el contenedor exacto del card
    const cardElement = await page.$('#reddit-card');
    if (!cardElement) {
      throw new Error('No se pudo encontrar el elemento #reddit-card en el HTML renderizado.');
    }

    // Tomamos captura únicamente de la caja del card (recortado automático) con fondo transparente
    await cardElement.screenshot({
      path: outputPath,
      omitBackground: true
    });

    console.log(`Tarjeta de Reddit guardada exitosamente en: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error rendering Title Card with Puppeteer:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = {
  renderCard
};