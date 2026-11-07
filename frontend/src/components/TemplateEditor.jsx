import React, { useState, useEffect, useRef } from 'react';
import { Save, Plus, Trash2, Palette, Volume2, Type, Move, Upload, Eye, Zap, Play, RotateCcw, VolumeX, Sparkles, Download, Shield, Music, AlertTriangle, Maximize2, X, Layers, Layout } from 'lucide-react';

const EDGE_VOICES = [
  { value: 'es-MX-JorgeNeural', label: 'Español (México) - Jorge (Masculino, Natural)' },
  { value: 'es-MX-DaliaNeural', label: 'Español (México) - Dalia (Femenino, Dulce)' },
  { value: 'es-ES-AlvaroNeural', label: 'Español (España) - Alvaro (Masculino)' },
  { value: 'es-ES-ElviraNeural', label: 'Español (España) - Elvira (Femenino)' },
  { value: 'es-US-AlonsoNeural', label: 'Español (USA) - Alonso (Masculino)' },
  { value: 'es-US-PalomaNeural', label: 'Español (USA) - Paloma (Femenino)' },
  { value: 'en-US-GuyNeural', label: 'Inglés (USA) - Guy (Masculino, Profundo)' },
  { value: 'en-US-AriaNeural', label: 'Inglés (USA) - Aria (Femenino, Claro)' }
];

const FONTS = [
  { value: 'Arial Bold', label: 'Arial Bold (Altamente visible, estándar)' },
  { value: 'Bangers', label: 'Bangers (Estilo Cómic / Viral)' },
  { value: 'Impact', label: 'Impact (Estilo memes, grueso)' },
  { value: 'Montserrat', label: 'Montserrat (Moderno, elegante)' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS (Redondeado)' }
];

const ANIMATIONS = [
  { value: 'tiktok-pop', label: 'TikTok Pop (Palabra a la vez, escala y resalte rápido)' },
  { value: 'bounce-pop', label: 'Bounce Pop (Palabra a la vez, efecto rebote elástico)' },
  { value: 'borde-emergente-2', label: 'Borde Emergente II (Caja Capcut con Borde de Color)' },
  { value: 'active-highlight', label: 'Active Highlight (Bloque frase, ilumina activa)' },
  { value: 'glow-karaoke', label: 'Glow Karaoke (Frase bloque con brillo neón contorno)' },
  { value: 'clean-fade', label: 'Clean Fade (Bloque de texto con fundido suave)' },
  { value: 'slide-up', label: 'Slide Up (Palabra sube desde abajo con fade)' },
  { value: 'pop-scale', label: 'Pop Scale (Palabra aparece con escala elástica)' },
  { value: 'typewriter', label: 'Typewriter (Texto aparece letra a letra)' },
  { value: 'reveal-box', label: 'Reveal Box (Caja con fondo deslizante)' },
];

const BORDER_STYLES = [
  { value: 'outline', label: 'Borde Fino Estándar (Outline)' },
  { value: 'heavy-outline', label: 'Contorno Grueso Negrita' },
  { value: 'box', label: 'Caja de Fondo Sólida (Capcut/TikTok Style)' }
];

const ENTRY_ANIMS = [
  { value: 'none', label: 'Sin animación (Instantáneo)' },
  { value: 'fade-in', label: 'Fade In (Fundido suave)' },
  { value: 'slide-in-left', label: 'Slide In Left (Desplazamiento izquierda)' },
  { value: 'slide-in-right', label: 'Slide In Right (Desplazamiento derecha)' },
  { value: 'slide-in-bottom', label: 'Slide In Bottom (Desplazamiento abajo)' },
  { value: 'slide-in-top', label: 'Slide In Top (Desplazamiento arriba)' },
  { value: 'zoom-in', label: 'Zoom In (Escalado elegante)' }
];

const WATERMARK_ANIMS = [
  { value: 'none', label: 'Estática (Fija en posición)' },
  { value: 'bounce', label: 'Rebote de Esquina (DVD Bounce)' },
  { value: 'wobble', label: 'Bamboleo (Giro de vaivén)' },
  { value: 'bounce-wobble', label: 'Rebote de Esquina + Bamboleo' }
];

const ALIGNMENTS = [
  { value: 7, label: 'Arriba Izquierda' },
  { value: 8, label: 'Arriba Centro' },
  { value: 9, label: 'Arriba Derecha' },
  { value: 4, label: 'Centro Izquierda' },
  { value: 5, label: 'Centro Centro' },
  { value: 6, label: 'Centro Derecha' },
  { value: 1, label: 'Abajo Izquierda' },
  { value: 2, label: 'Abajo Centro' },
  { value: 3, label: 'Abajo Derecha' }
];

const EXIT_ANIMS = [
  { value: 'none', label: 'Sin animación (Instantáneo)' },
  { value: 'fade-out', label: 'Fade Out (Fundido suave)' },
  { value: 'slide-out-left', label: 'Slide Out Left (Desplazamiento izquierda)' },
  { value: 'slide-out-right', label: 'Slide Out Right (Desplazamiento derecha)' },
  { value: 'slide-out-bottom', label: 'Slide Out Bottom (Desplazamiento abajo)' },
  { value: 'slide-out-top', label: 'Slide Out Top (Desplazamiento arriba)' },
  { value: 'zoom-out', label: 'Zoom Out (Reducción elegante)' }
];

// Modos de vista de la preview
const PREVIEW_MODES = [
  { value: 'composed', label: 'Vista Completa', icon: 'Layout' },
  { value: 'card', label: 'Solo Card', icon: 'Layers' },
  { value: 'subtitles', label: 'Solo Subtítulos', icon: 'Type' },
];

const rateToPercentValue = (rateStr) => {
  if (!rateStr) return 100;
  const match = rateStr.match(/^([+-])(\d+)%$/);
  if (match) {
    const sign = match[1];
    const val = parseInt(match[2]);
    return sign === '+' ? (100 + val) : (100 - val);
  }
  const pctMatch = rateStr.match(/^(\d+)%$/);
  if (pctMatch) return parseInt(pctMatch[1]);
  return 100;
};

const percentValueToRateStr = (val) => {
  const num = parseInt(val) || 100;
  if (num >= 100) return `+${num - 100}%`;
  return `-${100 - num}%`;
};

export default function TemplateEditor({ templates, profiles = [], onSave, onDelete, onImport }) {
  const [selectedId, setSelectedId] = useState('');
  const [activeTab, setActiveTab] = useState('card');

  const [name, setName] = useState('Nueva Plantilla');
  const [profileId, setProfileId] = useState('');
  const [defaultIdea, setDefaultIdea] = useState('');
  const [outputFolder, setOutputFolder] = useState(''); // NUEVO: carpeta de salida por plantilla
  const [maleVoice, setMaleVoice] = useState('es-MX-JorgeNeural');
  const [femaleVoice, setFemaleVoice] = useState('es-MX-DaliaNeural');
  const [voiceRate, setVoiceRate] = useState('+0%');
  const [font, setFont] = useState('Arial Bold');
  const [fontSize, setFontSize] = useState(100);
  const [subtitleColor, setSubtitleColor] = useState('#FFFF00');
  const [passiveColor, setPassiveColor] = useState('#FFFFFF');
  const [animation, setAnimation] = useState('tiktok-pop');
  const [subtitleBorderStyle, setSubtitleBorderStyle] = useState('outline');

  const [cardTheme, setCardTheme] = useState('dark');
  const [cardUsername, setCardUsername] = useState('postfully_user');
  const [cardSubreddit, setCardSubreddit] = useState('r/AskReddit');
  const [cardAvatar, setCardAvatar] = useState('https://www.redditstatic.com/avatars/avatar_default_02_FF4500.png');
  const [cardFontFamily, setCardFontFamily] = useState('Inter');
  const [cardFontSizeTitle, setCardFontSizeTitle] = useState(24);
  const [cardTitleColor, setCardTitleColor] = useState('#ffffff');
  const [cardFontSizeSubreddit, setCardFontSizeSubreddit] = useState(14);
  const [cardSubredditColor, setCardSubredditColor] = useState('#ffffff');
  const [cardFontSizeUsername, setCardFontSizeUsername] = useState(12);
  const [cardUsernameColor, setCardUsernameColor] = useState('#818384');
  const [upvotes, setUpvotes] = useState('12.4k');
  const [comments, setComments] = useState('890');
  const [cardShowVerified, setCardShowVerified] = useState(true);
  const [cardShowAwards, setCardShowAwards] = useState(true);
  const [cardWidth, setCardWidth] = useState(260);
  const [cardBorderRadius, setCardBorderRadius] = useState(11);
  const [cardPadding, setCardPadding] = useState(12);
  const [cardGap, setCardGap] = useState(7);

  const [cardOffsetX, setCardOffsetX] = useState(0);
  const [cardOffsetY, setCardOffsetY] = useState(0);
  const [cardEntryAnimation, setCardEntryAnimation] = useState('none');
  const [cardExitAnimation, setCardExitAnimation] = useState('none');
  const [cardEntryDuration, setCardEntryDuration] = useState(0.4);
  const [cardExitDuration, setCardExitDuration] = useState(0.4);

  const [subtitleOffsetX, setSubtitleOffsetX] = useState(0);
  const [subtitleOffsetY, setSubtitleOffsetY] = useState(0);
  const [subtitleAnimationSpeed, setSubtitleAnimationSpeed] = useState(80);

  const [testTitle, setTestTitle] = useState('Mi vecino de al lado tiene cámaras apuntando directamente a mi ventana y la policía dice que es legal [Card Dinámica]');
  const [testSubtitleText, setTestSubtitleText] = useState('Esta es una previsualización de subtítulos dinámicos de Reddit');
  const [activeWordIndex, setActiveWordIndex] = useState(0);

  const [previewTestText, setPreviewTestText] = useState('Hola, esto es una prueba en tiempo real para verificar la entonación y velocidad de la voz seleccionada.');
  const [previewVoice, setPreviewVoice] = useState('es-MX-JorgeNeural');
  const [previewRate, setPreviewRate] = useState('+15%');
  const [previewAudioUrl, setPreviewAudioUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewWarningMsg, setPreviewWarningMsg] = useState('');
  const [previewProgress, setPreviewProgress] = useState(0);
  const [subtitleLetterSpacing, setSubtitleLetterSpacing] = useState(0);
  const [subtitleDelay, setSubtitleDelay] = useState(0.15);
  const [cardScale, setCardScale] = useState(1.0);
  const [cardOffsetX_16_9, setCardOffsetX_16_9] = useState(0);
  const [cardOffsetY_16_9, setCardOffsetY_16_9] = useState(0);
  const [cardScale_16_9, setCardScale_16_9] = useState(1.0);
  const [subtitleOffsetX_16_9, setSubtitleOffsetX_16_9] = useState(0);
  const [subtitleOffsetY_16_9, setSubtitleOffsetY_16_9] = useState(0);
  const [fontSize_16_9, setFontSize_16_9] = useState(100);
  const [exportFormat, setExportFormat] = useState('9-16');
  const [previewOrientation, setPreviewOrientation] = useState('9:16');

  // Preview mode: 'composed' | 'card' | 'subtitles'
  const [previewMode, setPreviewMode] = useState('composed');
  // Fullscreen preview
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkText, setWatermarkText] = useState('@marca_agua');
  const [watermarkFont, setWatermarkFont] = useState('Arial Bold');
  const [watermarkSize, setWatermarkSize] = useState(24);
  const [watermarkColor, setWatermarkColor] = useState('#FFFFFF');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.4);
  const [watermarkAlignment, setWatermarkAlignment] = useState(9);
  const [watermarkOffsetX, setWatermarkOffsetX] = useState(20);
  const [watermarkOffsetY, setWatermarkOffsetY] = useState(20);
  const [watermarkAnimation, setWatermarkAnimation] = useState('none');
  const [watermarkSpeed, setWatermarkSpeed] = useState(2.5);

  const [musicEnabled, setMusicEnabled] = useState(false);
  const [musicFile, setMusicFile] = useState('');
  const [musicVolume, setMusicVolume] = useState(-20);
  const [musicFileExists, setMusicFileExists] = useState(true);

  // Typewriter state para la animación typewriter
  const [typewriterDisplayText, setTypewriterDisplayText] = useState('');
  const typewriterRef = useRef(null);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Bangers&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch (e) {} };
  }, []);

  const [previewState, setPreviewState] = useState('idle');
  const timelineTimeoutRef = useRef([]);

  // Efecto typewriter para la animación correspondiente
  useEffect(() => {
    if (animation !== 'typewriter') {
      setTypewriterDisplayText('');
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
        typewriterRef.current = null;
      }
      return;
    }
    const fullText = testSubtitleText;
    let i = 0;
    setTypewriterDisplayText('');
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    typewriterRef.current = setInterval(() => {
      i++;
      setTypewriterDisplayText(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(typewriterRef.current);
        typewriterRef.current = null;
        setTimeout(() => {
          i = 0;
          setTypewriterDisplayText('');
          typewriterRef.current = setInterval(() => {
            i++;
            setTypewriterDisplayText(fullText.slice(0, i));
            if (i >= fullText.length) {
              clearInterval(typewriterRef.current);
              typewriterRef.current = null;
            }
          }, 60);
        }, 1500);
      }
    }, 60);
    return () => { if (typewriterRef.current) clearInterval(typewriterRef.current); };
  }, [animation, testSubtitleText]);

  useEffect(() => {
    if (templates.length > 0) {
      if (selectedId === 'new') return;
      let targetId = selectedId;
      if (!targetId) targetId = templates[0].id;
      const active = templates.find(t => t.id === targetId);
      if (!active) return;
      if (selectedId !== active.id) setSelectedId(active.id);
      setName(active.name);
      setProfileId(active.profileId || '');
      setDefaultIdea(active.defaultIdea || '');
      setOutputFolder(active.outputFolder || ''); // NUEVO
      setMaleVoice(active.maleVoice);
      setFemaleVoice(active.femaleVoice);
      setVoiceRate(active.voiceRate || '+0%');
      setFont(active.font);
      setFontSize(active.fontSize || 24);
      setSubtitleColor(active.subtitleColor || '#FFFF00');
      setPassiveColor(active.passiveColor || '#FFFFFF');
      setAnimation(active.animation || 'tiktok-pop');
      setSubtitleBorderStyle(active.subtitleBorderStyle || 'outline');
      setCardTheme(active.cardTheme || 'dark');
      setCardUsername(active.cardUsername || 'postfully_user');
      setCardSubreddit(active.cardSubreddit || 'r/AskReddit');
      setCardAvatar(active.cardAvatar || 'https://www.redditstatic.com/avatars/avatar_default_02_FF4500.png');
      setCardFontFamily(active.cardFontFamily || 'Inter');
      setCardFontSizeTitle(active.cardFontSizeTitle !== undefined ? active.cardFontSizeTitle : 24);
      setCardTitleColor(active.cardTitleColor || '#ffffff');
      setCardFontSizeSubreddit(active.cardFontSizeSubreddit !== undefined ? active.cardFontSizeSubreddit : 14);
      setCardSubredditColor(active.cardSubredditColor || '#ffffff');
      setCardFontSizeUsername(active.cardFontSizeUsername !== undefined ? active.cardFontSizeUsername : 12);
      setCardUsernameColor(active.cardUsernameColor || '#818384');
      setUpvotes(active.upvotes || '12.4k');
      setComments(active.comments || '890');
      setCardShowVerified(active.cardShowVerified !== undefined ? active.cardShowVerified : true);
      setCardShowAwards(active.cardShowAwards !== undefined ? active.cardShowAwards : true);
      setCardWidth(active.cardWidth !== undefined ? active.cardWidth : 260);
      setCardBorderRadius(active.cardBorderRadius !== undefined ? active.cardBorderRadius : 11);
      setCardPadding(active.cardPadding !== undefined ? active.cardPadding : 12);
      setCardGap(active.cardGap !== undefined ? active.cardGap : 7);
      setCardOffsetX(active.cardOffsetX !== undefined ? active.cardOffsetX : 0);
      setCardOffsetY(active.cardOffsetY !== undefined ? active.cardOffsetY : 0);
      setCardEntryAnimation(active.cardEntryAnimation || 'none');
      setCardExitAnimation(active.cardExitAnimation || 'none');
      setCardEntryDuration(active.cardEntryDuration !== undefined ? active.cardEntryDuration : 0.4);
      setCardExitDuration(active.cardExitDuration !== undefined ? active.cardExitDuration : 0.4);
      setSubtitleOffsetX(active.subtitleOffsetX !== undefined ? active.subtitleOffsetX : 0);
      setSubtitleOffsetY(active.subtitleOffsetY !== undefined ? active.subtitleOffsetY : 0);
      setSubtitleAnimationSpeed(active.subtitleAnimationSpeed !== undefined ? active.subtitleAnimationSpeed : 80);
      setSubtitleLetterSpacing(active.subtitleLetterSpacing !== undefined ? active.subtitleLetterSpacing : 0);
      setSubtitleDelay(active.subtitleDelay !== undefined ? active.subtitleDelay : 0.15);
      setCardScale(active.cardScale !== undefined ? active.cardScale : 1.0);
      setCardOffsetX_16_9(active.cardOffsetX_16_9 !== undefined ? active.cardOffsetX_16_9 : 0);
      setCardOffsetY_16_9(active.cardOffsetY_16_9 !== undefined ? active.cardOffsetY_16_9 : 0);
      setCardScale_16_9(active.cardScale_16_9 !== undefined ? active.cardScale_16_9 : 1.0);
      setSubtitleOffsetX_16_9(active.subtitleOffsetX_16_9 !== undefined ? active.subtitleOffsetX_16_9 : 0);
      setSubtitleOffsetY_16_9(active.subtitleOffsetY_16_9 !== undefined ? active.subtitleOffsetY_16_9 : 0);
      setFontSize_16_9(active.fontSize_16_9 !== undefined ? active.fontSize_16_9 : 24);
      setExportFormat(active.exportFormat || '9-16');
      setWatermarkEnabled(active.watermarkEnabled !== undefined ? active.watermarkEnabled : false);
      setWatermarkText(active.watermarkText || '@marca_agua');
      setWatermarkFont(active.watermarkFont || 'Arial Bold');
      setWatermarkSize(active.watermarkSize !== undefined ? active.watermarkSize : 24);
      setWatermarkColor(active.watermarkColor || '#FFFFFF');
      setWatermarkOpacity(active.watermarkOpacity !== undefined ? active.watermarkOpacity : 0.4);
      setWatermarkAlignment(active.watermarkAlignment !== undefined ? active.watermarkAlignment : 9);
      setWatermarkOffsetX(active.watermarkOffsetX !== undefined ? active.watermarkOffsetX : 20);
      setWatermarkOffsetY(active.watermarkOffsetY !== undefined ? active.watermarkOffsetY : 20);
      setWatermarkAnimation(active.watermarkAnimation || 'none');
      setWatermarkSpeed(active.watermarkSpeed !== undefined ? active.watermarkSpeed : 2.5);
      const activeMusicFile = active.musicFile || '';
      setMusicEnabled(active.musicEnabled !== undefined ? active.musicEnabled : false);
      setMusicFile(activeMusicFile);
      setMusicVolume(active.musicVolume !== undefined ? active.musicVolume : -20);
      checkMusicFileExists(activeMusicFile);
    }
  }, [selectedId, templates]);

  useEffect(() => {
    setPreviewVoice(maleVoice || 'es-MX-JorgeNeural');
    setPreviewRate(voiceRate || '+0%');
  }, [maleVoice, voiceRate]);

  const checkMusicFileExists = async (filePath) => {
    if (!filePath) { setMusicFileExists(true); return; }
    try {
      const res = await fetch(`/api/utils/file-exists?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      setMusicFileExists(data.exists);
    } catch { setMusicFileExists(true); }
  };

  const handleUploadLocalAvatar = async () => {
    try {
      const res = await fetch('/api/dialog/avatar');
      const data = await res.json();
      if (data && data.path) {
        const avatarUrl = data.path.startsWith('/avatars/') ? data.path : `/avatars/${data.path.split('/').pop()}`;
        setCardAvatar(avatarUrl);
      }
    } catch (err) { console.error('Error al subir avatar:', err); }
  };

  const handlePickMusicFile = async () => {
    try {
      const res = await fetch('/api/dialog/music');
      const data = await res.json();
      if (data && data.path) {
        setMusicFile(data.path);
        checkMusicFileExists(data.path);
      }
    } catch (err) { console.error('Error al seleccionar música:', err); }
  };

  const handlePickOutputFolder = async () => {
    try {
      const res = await fetch('/api/dialog/folder');
      const data = await res.json();
      if (data && data.path) setOutputFolder(data.path);
    } catch (err) { console.error('Error al seleccionar carpeta de salida:', err); }
  };

  const handleResetPosition = () => {
    if (previewOrientation === '16:9') { setCardOffsetX_16_9(0); setCardOffsetY_16_9(0); }
    else { setCardOffsetX(0); setCardOffsetY(0); }
  };

  const handleCreateNew = () => {
    setSelectedId('new');
    setName('Nueva Plantilla');
    setProfileId('');
    setDefaultIdea('');
    setOutputFolder('');
    setMaleVoice('es-MX-JorgeNeural');
    setFemaleVoice('es-MX-DaliaNeural');
    setVoiceRate('+0%');
    setFont('Arial Bold');
    setFontSize(100);
    setSubtitleColor('#FFFF00');
    setPassiveColor('#FFFFFF');
    setAnimation('tiktok-pop');
    setSubtitleBorderStyle('outline');
    setCardTheme('dark');
    setCardUsername('postfully_user');
    setCardSubreddit('r/AskReddit');
    setCardAvatar('https://www.redditstatic.com/avatars/avatar_default_02_FF4500.png');
    setUpvotes('12.4k');
    setComments('890');
    setCardShowVerified(true);
    setCardShowAwards(true);
    setCardWidth(260);
    setCardBorderRadius(11);
    setCardPadding(12);
    setCardGap(7);
    setCardOffsetX(0); setCardOffsetY(0);
    setCardEntryAnimation('none'); setCardExitAnimation('none');
    setCardEntryDuration(0.4); setCardExitDuration(0.4);
    setSubtitleOffsetX(0); setSubtitleOffsetY(0);
    setSubtitleAnimationSpeed(80); setSubtitleLetterSpacing(0); setSubtitleDelay(0.15);
    setCardScale(1.0);
    setCardOffsetX_16_9(0); setCardOffsetY_16_9(0); setCardScale_16_9(1.0);
    setSubtitleOffsetX_16_9(0); setSubtitleOffsetY_16_9(0); setFontSize_16_9(100);
    setExportFormat('9-16');
    setWatermarkEnabled(false); setWatermarkText('@marca_agua'); setWatermarkFont('Arial Bold');
    setWatermarkSize(24); setWatermarkColor('#FFFFFF'); setWatermarkOpacity(0.4);
    setWatermarkAlignment(9); setWatermarkOffsetX(20); setWatermarkOffsetY(20);
    setWatermarkAnimation('none'); setWatermarkSpeed(2.5);
    setMusicEnabled(false); setMusicFile(''); setMusicVolume(-20); setMusicFileExists(true);
  };

  const handleDeleteSubmit = async () => {
    if (!selectedId || selectedId === 'new') return;
    if (!confirm('¿Eliminar esta plantilla? Esta acción no se puede deshacer.')) return;
    await onDelete(selectedId);
    setSelectedId('');
  };

  const handleExportTemplate = () => {
    const active = templates.find(t => t.id === selectedId);
    if (!active) return;
    const profile = profiles.find(p => p.id === active.profileId);
    const exportData = {
      template: { ...active },
      profile: profile ? { ...profile, apiKey: '' } : null,
      exportedAt: new Date().toISOString(),
      version: '2.0'
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantilla_${active.name.replace(/\s+/g, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportTemplate = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await onImport(data);
      e.target.value = '';
    } catch (err) {
      alert('Error al importar la plantilla: ' + err.message);
    }
  };

  const handleStartTimelineSimulation = () => {
    timelineTimeoutRef.current.forEach(t => clearTimeout(t));
    timelineTimeoutRef.current = [];
    setPreviewState('intro');
    const t1 = setTimeout(() => setPreviewState('static'), (cardEntryDuration * 1000) + 200);
    const t2 = setTimeout(() => setPreviewState('outro'), (cardEntryDuration * 1000) + 1800);
    const t3 = setTimeout(() => setPreviewState('subtitles'), (cardEntryDuration * 1000) + 1800 + (cardExitDuration * 1000) + 200);
    const t4 = setTimeout(() => setPreviewState('idle'), (cardEntryDuration * 1000) + 1800 + (cardExitDuration * 1000) + 3000);
    timelineTimeoutRef.current = [t1, t2, t3, t4];
  };

  const handleResetTimelineSimulation = () => {
    timelineTimeoutRef.current.forEach(t => clearTimeout(t));
    timelineTimeoutRef.current = [];
    setPreviewState('idle');
  };

  // Avanzar palabra activa de subtítulos automáticamente
  useEffect(() => {
    const words = testSubtitleText.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return;
    const interval = setInterval(() => {
      setActiveWordIndex(prev => (prev + 1) % words.length);
    }, subtitleAnimationSpeed > 0 ? subtitleAnimationSpeed * 12 : 600);
    return () => clearInterval(interval);
  }, [testSubtitleText, subtitleAnimationSpeed]);

  const handleSaveSubmit = async (e) => {
    e.preventDefault();
    const saved = await onSave({
      id: (selectedId && selectedId !== 'new') ? selectedId : undefined,
      name,
      profileId: profileId || undefined,
      defaultIdea: defaultIdea || undefined,
      outputFolder: outputFolder || undefined, // NUEVO
      maleVoice, femaleVoice, voiceRate, font,
      fontSize: parseInt(fontSize),
      subtitleColor, passiveColor, animation, subtitleBorderStyle,
      cardTheme, cardUsername, cardSubreddit, cardAvatar, upvotes, comments,
      cardFontFamily,
      cardFontSizeTitle: parseInt(cardFontSizeTitle),
      cardTitleColor,
      cardFontSizeSubreddit: parseInt(cardFontSizeSubreddit),
      cardSubredditColor,
      cardFontSizeUsername: parseInt(cardFontSizeUsername),
      cardUsernameColor,
      cardShowVerified, cardShowAwards,
      cardWidth: parseInt(cardWidth),
      cardBorderRadius: parseInt(cardBorderRadius),
      cardPadding: parseInt(cardPadding),
      cardGap: parseInt(cardGap),
      cardOffsetX: parseInt(cardOffsetX),
      cardOffsetY: parseInt(cardOffsetY),
      cardEntryAnimation, cardExitAnimation,
      cardEntryDuration: parseFloat(cardEntryDuration),
      cardExitDuration: parseFloat(cardExitDuration),
      subtitleOffsetX: parseInt(subtitleOffsetX),
      subtitleOffsetY: parseInt(subtitleOffsetY),
      subtitleAnimationSpeed: parseInt(subtitleAnimationSpeed),
      subtitleLetterSpacing: parseInt(subtitleLetterSpacing),
      subtitleDelay: parseFloat(subtitleDelay),
      cardScale: parseFloat(cardScale),
      cardOffsetX_16_9: parseInt(cardOffsetX_16_9),
      cardOffsetY_16_9: parseInt(cardOffsetY_16_9),
      cardScale_16_9: parseFloat(cardScale_16_9),
      subtitleOffsetX_16_9: parseInt(subtitleOffsetX_16_9),
      subtitleOffsetY_16_9: parseInt(subtitleOffsetY_16_9),
      fontSize_16_9: parseInt(fontSize_16_9),
      exportFormat,
      watermarkEnabled, watermarkText, watermarkFont,
      watermarkSize: parseInt(watermarkSize),
      watermarkColor,
      watermarkOpacity: parseFloat(watermarkOpacity),
      watermarkAlignment: parseInt(watermarkAlignment),
      watermarkOffsetX: parseInt(watermarkOffsetX),
      watermarkOffsetY: parseInt(watermarkOffsetY),
      watermarkAnimation,
      watermarkSpeed: parseFloat(watermarkSpeed),
      musicEnabled, musicFile,
      musicVolume: parseInt(musicVolume)
    });
    if (saved && saved.id) {
      setSelectedId(saved.id);
      alert('Plantilla guardada exitosamente.');
    }
  };

  const wordsList = testSubtitleText.trim().split(/\s+/).filter(Boolean);

  const getSubtitleShadowStyle = () => {
    if (subtitleBorderStyle === 'outline') return { textShadow: '0px 0px 3px #000000, 0px 0px 3px #000000, 0px 0px 3px #000000' };
    if (subtitleBorderStyle === 'heavy-outline') return { textShadow: '0px 0px 5px #000000, 0px 0px 5px #000000, 0px 0px 5px #000000, 0px 0px 6px #000000, 0px 0px 6px #000000' };
    return { textShadow: 'none' };
  };

  const getWatermarkStyle = () => {
    const align = parseInt(watermarkAlignment || 9);
    const offX = (watermarkOffsetX !== undefined ? watermarkOffsetX : 20) * 0.14;
    const offY = (watermarkOffsetY !== undefined ? watermarkOffsetY : 20) * 0.14;
    let positionStyle = {};
    if (watermarkAnimation === 'bounce' || watermarkAnimation === 'bounce-wobble') {
      positionStyle = {
        animation: `watermark-bounce-sim 12s linear infinite${watermarkAnimation === 'bounce-wobble' ? ', watermark-wobble-sim 2s ease-in-out infinite' : ''}`,
        position: 'absolute', zIndex: 5
      };
    } else {
      let topVal = 'auto', bottomVal = 'auto', leftVal = 'auto', rightVal = 'auto', transformVal = '';
      if (align === 7 || align === 8 || align === 9) topVal = `${12 + offY}px`;
      else if (align === 4 || align === 5 || align === 6) { topVal = '50%'; transformVal += 'translateY(-50%) '; }
      else if (align === 1 || align === 2 || align === 3) bottomVal = `${12 + offY}px`;
      if (align === 7 || align === 4 || align === 1) leftVal = `${12 + offX}px`;
      else if (align === 8 || align === 5 || align === 2) { leftVal = '50%'; transformVal += 'translateX(-50%) '; }
      else if (align === 9 || align === 6 || align === 3) rightVal = `${12 + offX}px`;
      if (watermarkAnimation === 'wobble') positionStyle = { animation: 'watermark-wobble-sim 2s ease-in-out infinite' };
      positionStyle = { ...positionStyle, position: 'absolute', top: topVal, bottom: bottomVal, left: leftVal, right: rightVal, transform: transformVal.trim(), zIndex: 5 };
    }
    return {
      ...positionStyle,
      fontFamily: watermarkFont.split(' ')[0],
      fontSize: `${(watermarkSize || 24) * 0.14}px`,
      color: watermarkColor, opacity: watermarkOpacity, pointerEvents: 'none',
      whiteSpace: 'nowrap', fontWeight: 'bold', textShadow: '0px 0px 2px rgba(0, 0, 0, 0.8)'
    };
  };

  const getCardAnimClass = () => {
    if (previewState === 'intro') {
      switch (cardEntryAnimation) {
        case 'fade-in': return 'animate-fade-in-preview';
        case 'slide-in-left': return 'animate-slide-in-left-preview';
        case 'slide-in-right': return 'animate-slide-in-right-preview';
        case 'slide-in-bottom': return 'animate-slide-in-bottom-preview';
        case 'slide-in-top': return 'animate-slide-in-top-preview';
        case 'zoom-in': return 'animate-zoom-in-preview';
        default: return '';
      }
    }
    if (previewState === 'outro') {
      switch (cardExitAnimation) {
        case 'fade-out': return 'animate-fade-out-preview';
        case 'slide-out-left': return 'animate-slide-out-left-preview';
        case 'slide-out-right': return 'animate-slide-out-right-preview';
        case 'slide-out-bottom': return 'animate-slide-out-bottom-preview';
        case 'slide-out-top': return 'animate-slide-out-top-preview';
        case 'zoom-out': return 'animate-zoom-out-preview';
        default: return '';
      }
    }
    return '';
  };

  // Renderiza el bloque de subtítulos para la preview según la animación
  const renderSubtitlePreview = (scale = 1) => {
    const fsBase = previewOrientation === '16:9' ? fontSize_16_9 : fontSize;
    const fsSub = scale * (fsBase / 100);
    const offX = (previewOrientation === '16:9' ? subtitleOffsetX_16_9 : subtitleOffsetX) * 0.14;
    const offY = (previewOrientation === '16:9' ? subtitleOffsetY_16_9 : subtitleOffsetY) * 0.14;

    if (animation === 'slide-up') {
      return (
        <span
          key={activeWordIndex}
          className="font-extrabold uppercase inline-block"
          style={{
            fontFamily: font.split(' ')[0],
            fontSize: `${fsSub * 12.5}px`,
            letterSpacing: `${subtitleLetterSpacing}px`,
            color: subtitleColor,
            animation: 'subtitleSlideUp 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
            ...(subtitleBorderStyle === 'box'
              ? { backgroundColor: 'rgba(0,0,0,0.75)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }
              : getSubtitleShadowStyle())
          }}
        >
          {wordsList[activeWordIndex] || 'SUBTÍTULO'}
        </span>
      );
    }

    if (animation === 'pop-scale') {
      return (
        <span
          key={activeWordIndex}
          className="font-extrabold uppercase inline-block"
          style={{
            fontFamily: font.split(' ')[0],
            fontSize: `${fsSub * 12.5}px`,
            letterSpacing: `${subtitleLetterSpacing}px`,
            color: subtitleColor,
            animation: 'subtitlePopScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            ...(subtitleBorderStyle === 'box'
              ? { backgroundColor: 'rgba(0,0,0,0.75)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }
              : getSubtitleShadowStyle())
          }}
        >
          {wordsList[activeWordIndex] || 'SUBTÍTULO'}
        </span>
      );
    }

    if (animation === 'typewriter') {
      return (
        <span
          className="font-medium tracking-wide leading-relaxed"
          style={{
            fontFamily: font.split(' ')[0],
            fontSize: `${fsSub * 14}px`,
            letterSpacing: `${subtitleLetterSpacing}px`,
            color: subtitleColor,
            borderRight: '2px solid currentColor',
            animation: 'typewriterCursor 0.7s step-end infinite',
            ...(subtitleBorderStyle === 'box'
              ? { backgroundColor: 'rgba(0,0,0,0.75)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }
              : getSubtitleShadowStyle())
          }}
        >
          {typewriterDisplayText || '|'}
        </span>
      );
    }

    if (animation === 'reveal-box') {
      return (
        <span
          key={activeWordIndex}
          className="font-extrabold uppercase inline-block"
          style={{
            fontFamily: font.split(' ')[0],
            fontSize: `${fsSub * 12.5}px`,
            letterSpacing: `${subtitleLetterSpacing}px`,
            color: '#FFFFFF',
            backgroundColor: subtitleColor,
            padding: '4px 12px',
            borderRadius: '6px',
            animation: 'subtitleRevealBox 0.25s ease-out forwards',
            clipPath: 'inset(0 100% 0 0)',
          }}
        >
          {wordsList[activeWordIndex] || 'SUBTÍTULO'}
        </span>
      );
    }

    // Animaciones originales
    if (animation === 'tiktok-pop' || animation === 'bounce-pop') {
      return (
        <span
          key={activeWordIndex}
          className={`font-extrabold uppercase shadow-sm filter tracking-wide inline-block ${
            animation === 'bounce-pop' ? 'animate-[bounce_0.25s_ease-in-out_infinite]' : 'scale-[1.12] transition-transform duration-100'
          }`}
          style={{
            fontFamily: font.split(' ')[0],
            fontSize: `${previewOrientation === '16:9' ? (fontSize_16_9 / 100) * 11 : (fontSize / 100) * 12.5}px`,
            letterSpacing: `${subtitleLetterSpacing}px`,
            color: subtitleColor,
            ...(subtitleBorderStyle === 'box'
              ? { backgroundColor: 'rgba(0,0,0,0.75)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }
              : getSubtitleShadowStyle())
          }}
        >
          {wordsList[activeWordIndex] || 'SUBTÍTULO'}
        </span>
      );
    }

    if (animation === 'active-highlight' || animation === 'glow-karaoke' || animation === 'borde-emergente-2') {
      return (
        <div
          className={`flex flex-wrap justify-center items-center gap-1.5 font-bold filter leading-tight ${
            subtitleBorderStyle === 'box' && animation !== 'borde-emergente-2' ? 'bg-black/75 px-3 py-2 rounded-xl border border-white/10' : ''
          }`}
          style={{
            fontFamily: font.split(' ')[0],
            fontSize: `${previewOrientation === '16:9' ? (fontSize_16_9 / 100) * 10 : (fontSize / 100) * 11.5}px`,
            letterSpacing: `${subtitleLetterSpacing}px`,
            ...(animation !== 'borde-emergente-2' ? getSubtitleShadowStyle() : {})
          }}
        >
          {wordsList.map((w, idx) => {
            const isActive = idx === activeWordIndex;
            const wordText = animation === 'borde-emergente-2' ? w.toUpperCase() : w;
            if (isActive) {
              if (animation === 'borde-emergente-2') {
                return <span key={idx} style={{ color: '#FFFFFF', backgroundColor: '#6C138E', padding: '3px 4px', borderRadius: '6px', display: 'inline-block' }} className="font-extrabold mx-0.5 text-center animate-[pFadeIn_0.1s_ease-out]">{wordText}</span>;
              }
              return <span key={idx} style={animation === 'glow-karaoke' ? { color: subtitleColor, textShadow: `0px 0px 6px ${subtitleColor}`, transition: `all ${subtitleAnimationSpeed}ms ease` } : { color: subtitleColor, transition: `all ${subtitleAnimationSpeed}ms ease` }} className="font-extrabold mx-0.5">{wordText}</span>;
            }
            if (animation === 'borde-emergente-2') {
              return <span key={idx} style={{ color: passiveColor, backgroundColor: 'transparent', padding: '3px 4px', borderRadius: '6px', display: 'inline-block' }} className="font-extrabold mx-0.5 text-center">{wordText}</span>;
            }
            return <span key={idx} style={{ color: passiveColor, transition: `all ${subtitleAnimationSpeed}ms ease` }} className="font-extrabold mx-0.5">{wordText}</span>;
          })}
        </div>
      );
    }

    if (animation === 'clean-fade') {
      return (
        <span
          className="font-medium tracking-wide leading-relaxed animate-pulse"
          style={{
            fontFamily: font.split(' ')[0],
            fontSize: `${((previewOrientation === '16:9' ? fontSize_16_9 : fontSize) / 100) * fsSub * 14}px`,
            letterSpacing: `${subtitleLetterSpacing}px`,
            color: passiveColor,
            ...(subtitleBorderStyle === 'box'
              ? { backgroundColor: 'rgba(0,0,0,0.75)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }
              : getSubtitleShadowStyle())
          }}
        >
          {testSubtitleText}
        </span>
      );
    }

    return null;
  };

  // Componente de preview interno reutilizable (usado en normal y fullscreen)
  const PreviewCanvas = ({ fullscreen = false }) => {
    const scale = fullscreen ? 1 : 1;
    const is916 = previewOrientation === '9:16';
    const canvasW = fullscreen ? (is916 ? 360 : 640) : (is916 ? 230 : 380);
    const canvasH = fullscreen ? (is916 ? 640 : 360) : (is916 ? 395 : 215);

    const showCard = previewMode === 'composed' || previewMode === 'card';
    const showSubtitles = previewMode === 'composed' || previewMode === 'subtitles';
    const showCardInTimeline = showCard && previewState !== 'subtitles';
    const showSubInTimeline = showSubtitles && (previewState === 'subtitles' || previewState === 'idle');

    return (
      <div
        style={{ width: canvasW, height: canvasH }}
        className="rounded-2xl bg-gray-950 border-2 border-gray-800 shadow-2xl relative flex flex-col justify-between overflow-hidden shrink-0 select-none transition-all duration-300"
      >
        {/* Fondo simulado de gameplay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/30 via-slate-900/40 to-teal-900/30 opacity-70 z-0"></div>
        <div className="absolute inset-0 border border-white/5 pointer-events-none z-0"></div>

        {/* Marca de agua */}
        {watermarkEnabled && previewMode !== 'subtitles' && (
          <div style={getWatermarkStyle()}>{watermarkText}</div>
        )}
        <style>{`
          @keyframes watermark-bounce-sim {
            0% { top: 10%; left: 10%; }
            25% { top: 75%; left: 60%; }
            50% { top: 10%; left: 60%; }
            75% { top: 75%; left: 10%; }
            100% { top: 10%; left: 10%; }
          }
          @keyframes watermark-wobble-sim {
            0%, 100% { transform: rotate(-5deg) scale(1); }
            50% { transform: rotate(5deg) scale(1.05); }
          }
          @keyframes subtitleSlideUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes subtitlePopScale {
            from { transform: scale(0.3); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @keyframes subtitleRevealBox {
            from { clip-path: inset(0 100% 0 0); }
            to { clip-path: inset(0 0% 0 0); }
          }
          @keyframes typewriterCursor {
            from, to { border-color: transparent; }
            50% { border-color: currentColor; }
          }
        `}</style>

        {/* Card de Reddit */}
        {showCardInTimeline && (
          <div
            className={`z-10 w-full transition-transform duration-100 ease-out flex justify-center items-center h-full absolute inset-0 p-4 ${getCardAnimClass()}`}
            style={{
              transform: `translate(${(previewOrientation === '16:9' ? cardOffsetX_16_9 : cardOffsetX) * 0.14}px, ${(previewOrientation === '16:9' ? cardOffsetY_16_9 : cardOffsetY) * 0.14}px) scale(${previewOrientation === '16:9' ? cardScale_16_9 : cardScale})`
            }}
          >
            <div
              style={{
                width: `${cardWidth}px`,
                borderRadius: `${cardBorderRadius}px`,
                padding: `${cardPadding}px`,
                gap: `${cardGap}px`,
                backgroundColor: cardTheme === 'dark' ? '#1c1c1e' : '#ffffff',
                borderColor: cardTheme === 'dark' ? '#2c2c2e' : '#edeff1',
                color: cardTheme === 'dark' ? '#e5e5e7' : '#11151a',
                fontFamily: `'${cardFontFamily}', sans-serif`
              }}
              className="border shadow-xl flex flex-col font-sans select-none overflow-hidden transition-all duration-300"
            >
              <div className="flex items-start gap-1.5">
                <div className="relative w-9 h-9 shrink-0 overflow-hidden rounded-full">
                  <img className="absolute w-full h-full object-cover"
                    src={cardAvatar && cardAvatar.startsWith('/avatars/') ? `http://localhost:5000${cardAvatar}` : (cardAvatar || 'https://www.redditstatic.com/avatars/avatar_default_02_FF4500.png')}
                    alt="avatar"
                    onError={(e) => { e.target.src = 'https://www.redditstatic.com/avatars/avatar_default_02_FF4500.png'; }}
                  />
                </div>
                <div className="flex flex-col items-start gap-0.5">
                  <div className="flex items-center gap-1">
                    <span style={{ color: cardSubredditColor, fontSize: `${Math.round(cardFontSizeSubreddit * 0.5)}px` }} className="font-extrabold truncate max-w-[120px]">{cardSubreddit}</span>
                    {cardShowVerified && (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-blue-400 inline">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12.5589 0.726691C12.9733 0.847424 13.3429 1.1642 14.082 1.79776L14.8782 2.48016C15.2109 2.76534 15.3772 2.90792 15.5649 3.00949C15.7314 3.09957 15.9098 3.16558 16.0948 3.20551C16.3034 3.25054 16.5225 3.25054 16.9607 3.25054L17.5495 3.25054C18.6696 3.25054 19.2297 3.25054 19.6575 3.46852C20.0338 3.66027 20.3398 3.96623 20.5315 4.34255C20.7495 4.77038 20.7495 5.33043 20.7495 6.45053L20.7495 7.03934C20.7495 7.47754 20.7495 7.69664 20.7945 7.90523C20.8345 8.09025 20.9005 8.26866 20.9906 8.43513C21.0921 8.62281 21.2347 8.78916 21.5199 9.12187L22.2023 9.918C22.8359 10.6572 23.1526 11.0267 23.2734 11.4412C23.3798 11.8065 23.3798 12.1946 23.2734 12.5599C23.1526 12.9743 22.8359 13.3439 22.2023 14.0831L21.5199 14.8792C21.2347 15.2119 20.9906 15.5659 20.9005 15.7324C20.8345 15.9108 20.7945 16.0958C20.7495 16.3044 20.7495 16.5235 20.7495 16.9617L20.7495 17.5505C20.7495 18.6706 20.7495 19.2307 20.5315 19.6585C20.3398 20.0348 20.0338 20.3408 19.6575 20.5325C19.2297 20.7505 18.6696 20.7505 17.5495 20.7505L16.9607 20.7505C16.5225 20.7505 16.3034 20.7505 16.0948 20.7956C15.9098 20.8355 15.7314 20.9015 15.5649 20.9916C15.3772 21.0931 15.2109 21.2357 14.8782 21.5209L14.082 22.2033C13.3429 22.8369 12.9733 23.1537 12.5589 23.2744C12.1936 23.3808 11.8055 23.3808 11.4402 23.2744C11.0257 23.1536 10.6561 22.8369 9.917 22.2033L9.12085 21.5209C8.78814 21.2357 8.62179 21.0931 8.43412 20.9916C8.26765 20.9015 8.08923 20.8355 7.90421 20.7956C7.69562 20.7505 7.47652 20.7505 7.03832 20.7505L6.4153 20.7505C5.29519 20.7505 4.73514 20.7505 4.30732 20.5325C3.931 20.3408 3.62503 20.0348 3.43329 19.6585C3.2153 19.2307 3.2153 18.6706 3.2153 17.5505L3.2153 16.949C3.2153 16.5146 3.2153 16.2973 3.17099 16.0903C3.13169 15.9067 3.06672 15.7296 2.97801 15.5641C2.878 15.3775 2.73756 15.2118 2.45668 14.8803L1.76945 14.0693C1.14668 13.3343 0.835291 12.9669 0.716483 12.5555C0.611756 12.1929 0.611756 11.8081 0.716483 11.4455C0.835291 11.0342 1.14668 10.6667 1.76945 9.9318L2.45668 9.12078C2.73756 8.78929 2.878 8.62356 2.97801 8.437C3.06672 8.27151 3.13169 8.09435 3.17099 7.91075C3.2153 7.70376 3.2153 7.48652 3.2153 7.05204L3.2153 6.45053C3.2153 5.33043 3.2153 4.77038 3.43329 4.34255C3.62503 3.96623 3.931 3.66027 4.30732 3.46852C4.73514 3.25054 5.2952 3.25054 6.4153 3.25054L7.03832 3.25054C7.47652 3.25054 7.69562 3.25054 7.90421 3.20551C8.08923 3.16557 8.26765 3.09957 8.43412 3.00949C8.62179 2.90792 8.78814 2.76534 9.12084 2.48016L9.91699 1.79775C10.6561 1.1642 11.0257 0.847424 11.4402 0.726691C11.8055 0.620281 12.1936 0.620281 12.5589 0.726691ZM16.5306 9.53033C16.8235 9.23744 16.8235 8.76257 16.5306 8.46967C16.2377 8.17678 15.7628 8.17678 15.4699 8.46967L11.0002 12.9393L9.53058 11.4697C9.23768 11.1768 8.76281 11.1768 8.46992 11.4697C8.17702 11.7626 8.17702 12.2374 8.46992 12.5303L10.4699 14.5303C10.6106 14.671 10.8013 14.75 11.0002 14.75C11.1992 14.75 11.3899 14.671 11.5306 14.5303L16.5306 9.53033Z" fill="currentColor" />
                      </svg>
                    )}
                  </div>
                  <span style={{ color: cardUsernameColor, fontSize: `${Math.round(cardFontSizeUsername * 0.5)}px` }} className="font-medium">u/{cardUsername}</span>
                </div>
              </div>
              {cardShowAwards && (
                <div className="flex gap-0.5 mt-0.5 mb-0.5 select-none leading-none items-center">
                  <img src="/reddit-awards.png" alt="awards" className="h-[11px] w-auto object-contain block"
                    onError={(e) => { e.target.style.display = 'none'; const f = e.target.nextSibling; if (f) f.style.display = 'flex'; }} />
                  <div className="hidden gap-0.5 items-center">
                    <span className="text-[10px]">🏆</span><span className="text-[10px]">🥇</span><span className="text-[10px]">🥈</span>
                  </div>
                </div>
              )}
              <div style={{ gap: `${cardGap * 1.5}px` }} className="flex flex-col mt-0.5">
                <div style={{ color: cardTitleColor, fontSize: `${Math.round(cardFontSizeTitle * 0.5)}px` }} className="font-extrabold leading-tight break-words">
                  {testTitle || 'Aquí se mostrará el título de la historia...'}
                </div>
              </div>
              <div className="flex justify-between items-center gap-2 mt-1 select-none">
                <div className="flex items-center gap-2">
                  <div style={{ color: cardTheme === 'dark' ? '#94a3b8' : '#5c6c74' }} className="flex items-center gap-1 text-[9px] font-bold">
                    <svg className="w-3.5 h-3.5 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M12 21C13 21 22 16.0003 22 9.00046C22 5.5006 19 3.04408 16 3.00068C14.5 2.97897 13 3.50068 12 5.00062C11 3.50068 9.47405 3.00068 8 3.00068C5 3.00068 2 5.5006 2 9.00046C2 16.0003 11 21 12 21Z" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                    <span>{upvotes}</span>
                  </div>
                  <div style={{ color: cardTheme === 'dark' ? '#94a3b8' : '#5c6c74' }} className="flex items-center gap-1 text-[9px] font-bold">
                    <svg className="w-3.5 h-3.5 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.499 2.33015 14.921 2.9214 16.1973C3.38829 17.2052 3.83022 18.0644 3.50454 19.1977C3.34789 19.7429 2.95529 20.2798 2.90866 20.8475C2.85534 21.4967 3.42708 22.0228 4.06965 21.9157C5.3779 21.6977 6.0076 20.6574 7.52552 21.0144C7.69003 21.0531 8.11879 21.2065 8.97627 21.5132C9.88354 21.8377 10.8606 22 12 22Z" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                    <span>{comments}</span>
                  </div>
                </div>
                <div style={{ color: cardTheme === 'dark' ? '#94a3b8' : '#5c6c74' }} className="flex items-center gap-1 text-[9px] font-bold">
                  <svg className="w-3.5 h-3.5 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M8 10H7.5V10C6.10444 10 5.40666 10 4.83886 10.1722C3.56046 10.56 2.56004 11.5605 2.17224 12.8389C2 13.4067 2 14.1044 2 15.5V16C2 17.8638 2 18.7956 2.30448 19.5307C2.71046 20.5108 3.48915 21.2895 4.46927 21.6955C5.20435 22 6.13623 22 8 22L16 22C17.8638 22 18.7956 22 19.5307 21.6955C20.5108 21.2895 21.2895 20.5108 21.6955 19.5307C22 18.7956 22 17.8638 22 16V15.5C22 14.1044 22 13.4067 21.8278 12.8389C21.44 11.5605 20.4395 10.56 19.1611 10.1722C18.5933 10 17.8956 10 16.5 10V10H16M12 15V2M12 2L8 6M12 2L16 6" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                  <span>Share</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subtítulos */}
        {showSubInTimeline && (
          <div
            className={`z-20 absolute top-[50%] left-0 right-0 flex justify-center text-center px-4 pointer-events-none -translate-y-1/2 ${
              previewOrientation === '16:9' ? 'w-[65%] mx-auto inset-x-0' : 'w-full'
            }`}
            style={{
              transform: `translate(${(previewOrientation === '16:9' ? subtitleOffsetX_16_9 : subtitleOffsetX) * 0.14}px, ${(previewOrientation === '16:9' ? subtitleOffsetY_16_9 : subtitleOffsetY) * 0.14}px) translateY(-50%)`
            }}
          >
            {renderSubtitlePreview()}
          </div>
        )}

        {/* Indicador de modo de vista */}
        {previewMode !== 'composed' && (
          <div className="absolute bottom-2 left-2 z-30 bg-black/60 border border-white/10 text-white text-[8px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wide">
            {previewMode === 'card' ? '🎴 Solo Card' : '💬 Solo Subtítulos'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes pSlideInLeft { from { transform: translate(-120%, 0) scale(0.95); opacity: 0; } to { transform: translate(0, 0) scale(1); opacity: 1; } }
        @keyframes pSlideInRight { from { transform: translate(120%, 0) scale(0.95); opacity: 0; } to { transform: translate(0, 0) scale(1); opacity: 1; } }
        @keyframes pSlideInBottom { from { transform: translate(0, 150%) scale(0.95); opacity: 0; } to { transform: translate(0, 0) scale(1); opacity: 1; } }
        @keyframes pSlideInTop { from { transform: translate(0, -150%) scale(0.95); opacity: 0; } to { transform: translate(0, 0) scale(1); opacity: 1; } }
        @keyframes pZoomIn { from { transform: scale(0.2); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes pSlideOutLeft { from { transform: translate(0, 0); opacity: 1; } to { transform: translate(-130%, 0); opacity: 0; } }
        @keyframes pSlideOutRight { from { transform: translate(0, 0); opacity: 1; } to { transform: translate(130%, 0); opacity: 0; } }
        @keyframes pSlideOutBottom { from { transform: translate(0, 0); opacity: 1; } to { transform: translate(0, 130%); opacity: 0; } }
        @keyframes pSlideOutTop { from { transform: translate(0, 0); opacity: 1; } to { transform: translate(0, -130%); opacity: 0; } }
        @keyframes pZoomOut { from { transform: scale(1); opacity: 1; } to { transform: scale(0.2); opacity: 0; } }
        .animate-fade-in-preview { animation: pFadeIn ${cardEntryDuration}s ease-out forwards; }
        .animate-slide-in-left-preview { animation: pSlideInLeft ${cardEntryDuration}s cubic-bezier(0.175, 0.885, 0.32, 1.15) forwards; }
        .animate-slide-in-right-preview { animation: pSlideInRight ${cardEntryDuration}s cubic-bezier(0.175, 0.885, 0.32, 1.15) forwards; }
        .animate-slide-in-bottom-preview { animation: pSlideInBottom ${cardEntryDuration}s cubic-bezier(0.175, 0.885, 0.32, 1.15) forwards; }
        .animate-slide-in-top-preview { animation: pSlideInTop ${cardEntryDuration}s cubic-bezier(0.175, 0.885, 0.32, 1.15) forwards; }
        .animate-zoom-in-preview { animation: pZoomIn ${cardEntryDuration}s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-fade-out-preview { animation: pFadeOut ${cardExitDuration}s ease-in forwards; }
        .animate-slide-out-left-preview { animation: pSlideOutLeft ${cardExitDuration}s ease-in forwards; }
        .animate-slide-out-right-preview { animation: pSlideOutRight ${cardExitDuration}s ease-in forwards; }
        .animate-slide-out-bottom-preview { animation: pSlideOutBottom ${cardExitDuration}s ease-in forwards; }
        .animate-slide-out-top-preview { animation: pSlideOutTop ${cardExitDuration}s ease-in forwards; }
        .animate-zoom-out-preview { animation: pZoomOut ${cardExitDuration}s ease-in forwards; }
      `}} />

      {/* Modal de Pantalla Completa */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center gap-6 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between w-full max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Previsualización en Pantalla Completa</span>
              <div className="flex gap-1.5">
                {PREVIEW_MODES.map(m => (
                  <button key={m.value} type="button" onClick={() => setPreviewMode(m.value)}
                    className={`px-2.5 py-1 text-[9px] font-black rounded-lg transition-all cursor-pointer uppercase ${
                      previewMode === m.value ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-400 hover:text-white border border-transparent hover:bg-white/5'
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => setIsFullscreen(false)} className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-xl border border-border-dark cursor-pointer transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Canvas Fullscreen */}
          <div className="flex items-center justify-center flex-1">
            <PreviewCanvas fullscreen={true} />
          </div>

          {/* Controles en fullscreen */}
          <div className="flex gap-3 items-center">
            <div className="flex gap-1.5 p-1 bg-black/40 rounded-xl border border-border-dark">
              <button type="button" onClick={() => setPreviewOrientation('9:16')}
                className={`px-3 py-1.5 text-[9px] font-black rounded-lg transition-all cursor-pointer uppercase ${
                  previewOrientation === '9:16' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}>
                9:16
              </button>
              <button type="button" onClick={() => setPreviewOrientation('16:9')}
                className={`px-3 py-1.5 text-[9px] font-black rounded-lg transition-all cursor-pointer uppercase ${
                  previewOrientation === '16:9' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}>
                16:9
              </button>
            </div>
            <button type="button" onClick={handleStartTimelineSimulation}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 text-white font-black py-2 px-4 rounded-xl text-[10px] transition-all cursor-pointer">
              <Zap className="w-3.5 h-3.5 fill-current" /><span>Reproducir</span>
            </button>
            {previewState !== 'idle' && (
              <button type="button" onClick={handleResetTimelineSimulation}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded-xl border border-border-dark cursor-pointer">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Encabezado */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">DISEÑADOR DE PLANTILLAS DE VIDEO</h2>
          <p className="text-xs text-gray-400">Personaliza la posición, transiciones, voces (Edge TTS), velocidad de locución y perfiles de IA de tus plantillas.</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedId && selectedId !== 'new' && (
            <button onClick={handleExportTemplate} type="button"
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all border border-border-dark cursor-pointer">
              <Download className="w-4 h-4 text-brand-primary" /><span>Exportar Plantilla</span>
            </button>
          )}
          <label className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all border border-border-dark cursor-pointer">
            <Upload className="w-4 h-4 text-brand-primary" /><span>Importar Plantilla</span>
            <input type="file" accept=".json" onChange={handleImportTemplate} className="hidden" />
          </label>
          <button onClick={handleCreateNew}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all border border-border-dark cursor-pointer animate-pulse-ring">
            <Plus className="w-4 h-4 text-brand-primary" /><span>Crear Nueva Plantilla</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor (col izquierda 7/12) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSaveSubmit} className="glass-panel rounded-2xl p-6 space-y-6">

            {/* Selección de plantilla */}
            <div className="flex items-center gap-4 border-b border-border-dark pb-4">
              <div className="flex-grow space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase">Selecciona Plantilla</label>
                <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full bg-black/40 border border-border-dark rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-primary font-bold">
                  {selectedId === 'new' && <option value="new">-- Nueva Plantilla (Sin Guardar) --</option>}
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase">Nombre</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="bg-black/40 border border-border-dark rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-primary font-bold" />
              </div>
            </div>

            {/* Config general: perfil, idea, formato, carpeta de salida */}
            <div className="bg-gradient-to-r from-brand-primary/10 to-transparent p-4 rounded-xl border border-brand-primary/20 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-primary animate-pulse" />
                <span className="text-xs font-black text-white uppercase">Perfil de IA, Exportación & Carpeta de Salida</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400">PERFIL DE IA VINCULADO</label>
                  <select value={profileId} onChange={(e) => setProfileId(e.target.value)}
                    className="w-full bg-black/40 border border-border-dark rounded-xl p-2.5 text-xs text-white font-bold">
                    <option value="">(Usar Perfil predeterminado en Ajustes)</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400">IDEA O TEMA PREDETERMINADO</label>
                  <input type="text" value={defaultIdea} onChange={(e) => setDefaultIdea(e.target.value)}
                    placeholder="Ej. Mi suegra intentó sabotear mi boda confesando..."
                    className="w-full bg-black/40 border border-border-dark rounded-xl p-2.5 text-xs text-white font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400">TIPO DE EXPORTACIÓN</label>
                  <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}
                    className="w-full bg-black/40 border border-border-dark rounded-xl p-2.5 text-xs text-white font-bold">
                    <option value="9-16">9:16 Vertical (Celular)</option>
                    <option value="16-9">16:9 Horizontal (PC/TV)</option>
                    <option value="both">Ambos (9:16 y 16:9 Sincronizados)</option>
                  </select>
                </div>
              </div>

              {/* NUEVO: Carpeta de salida por plantilla */}
              <div className="space-y-1 bg-black/20 p-3 rounded-xl border border-border-dark">
                <label className="block text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1.5">
                  📁 CARPETA DE SALIDA ESPECÍFICA (opcional)
                  <span className="text-[8px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-black">NUEVO</span>
                </label>
                <p className="text-[9px] text-gray-500 leading-relaxed">
                  Si configuras una carpeta aquí, los videos de esta plantilla se guardarán en esa ruta en lugar de la carpeta global de exportación.
                </p>
                <div className="flex gap-2 mt-2">
                  <input type="text" value={outputFolder} onChange={(e) => setOutputFolder(e.target.value)}
                    placeholder="Vacío = usar carpeta global de exportación..."
                    className="flex-1 bg-black/40 border border-border-dark rounded-xl p-2.5 text-xs text-white font-mono truncate focus:outline-none focus:border-brand-primary" />
                  <button type="button" onClick={handlePickOutputFolder}
                    className="bg-gray-800 hover:bg-gray-700 text-white font-bold px-3 py-2 rounded-xl border border-border-dark cursor-pointer transition-all flex items-center gap-1.5 text-xs">
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Explorar</span>
                  </button>
                  {outputFolder && (
                    <button type="button" onClick={() => setOutputFolder('')}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold px-2.5 py-2 rounded-xl border border-red-500/20 cursor-pointer transition-all">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {outputFolder && (
                  <p className="text-[9px] text-emerald-400 font-bold mt-1.5">
                    ✓ Videos de esta plantilla → <span className="font-mono">{outputFolder}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Pestañas */}
            <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-border-dark overflow-x-auto">
              {[
                { key: 'card', label: '1. Reddit Card', icon: <Palette className="w-4 h-4" />, color: 'amber' },
                { key: 'subtitles', label: '2. Subtítulos', icon: <Type className="w-4 h-4" />, color: 'cyan' },
                { key: 'voice', label: '3. Locución', icon: <Volume2 className="w-4 h-4" />, color: 'emerald' },
                { key: 'watermark', label: '4. Marca Agua', icon: <Shield className="w-4 h-4" />, color: 'purple' },
                { key: 'music', label: '5. Música', icon: <Music className="w-4 h-4" />, color: 'pink' },
              ].map(tab => (
                <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-black rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.key
                      ? `bg-${tab.color}-500/10 text-${tab.color}-400 border border-${tab.color}-500/25 shadow-lg`
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}>
                  {tab.icon}<span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* PESTAÑA CARD */}
            {activeTab === 'card' && (
              <div className="space-y-6 animate-[pFadeIn_0.2s_ease-out]">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 border-b border-border-dark pb-2">
                    <Palette className="w-4 h-4 text-amber-400" /><span>Propiedades del Reddit Card</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400">TEMA DEL CARD</label>
                      <select value={cardTheme} onChange={(e) => setCardTheme(e.target.value)} className="w-full bg-black/40 border border-border-dark rounded-xl p-2.5 text-xs text-white font-semibold">
                        <option value="dark">Modo Oscuro Reddit</option>
                        <option value="light">Modo Claro Reddit</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400">NOMBRE DE USUARIO</label>
                      <input type="text" value={cardUsername} onChange={(e) => setCardUsername(e.target.value)} className="w-full bg-black/40 border border-border-dark rounded-xl p-2.5 text-xs text-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400">SUBREDDIT / ENCABEZADO</label>
                      <input type="text" value={cardSubreddit} onChange={(e) => setCardSubreddit(e.target.value)} className="w-full bg-black/40 border border-border-dark rounded-xl p-2.5 text-xs text-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400">UPVOTES</label>
                      <input type="text" value={upvotes} onChange={(e) => setUpvotes(e.target.value)} className="w-full bg-black/40 border border-border-dark rounded-xl p-2.5 text-xs text-white font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400">COMENTARIOS</label>
                      <input type="text" value={comments} onChange={(e) => setComments(e.target.value)} className="w-full bg-black/40 border border-border-dark rounded-xl p-2.5 text-xs text-white font-bold" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="md:col-span-2 space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400">FOTO DE PERFIL DEL CARD</label>
                      <input type="text" value={cardAvatar} onChange={(e) => setCardAvatar(e.target.value)} placeholder="URL o ruta de imagen..." className="w-full bg-black/40 border border-border-dark rounded-xl p-2 text-xs text-white truncate" />
                    </div>
                    <button type="button" onClick={handleUploadLocalAvatar} className="bg-gray-800 hover:bg-gray-700 text-white font-bold p-2.5 rounded-xl border border-border-dark cursor-pointer text-xs flex items-center justify-center gap-1.5 mt-4">
                      <Upload className="w-4 h-4 text-amber-400" /><span>Subir Foto Local</span>
                    </button>
                  </div>
                </div>
                {/* Tipografía y Colores del Texto */}
                <div className="space-y-4 bg-amber-500/5 p-4 rounded-xl border border-amber-500/10">
                  <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 border-b border-amber-500/20 pb-2">
                    <Type className="w-3.5 h-3.5" /><span>Tipografía y Colores del Texto del Card</span>
                  </h4>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">FUENTE (Aplica a todo el card)</label>
                    <select value={cardFontFamily} onChange={(e) => setCardFontFamily(e.target.value)} className="w-full bg-black/40 border border-border-dark rounded-xl p-2.5 text-xs text-white font-semibold">
                      <option value="Inter">Inter</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Oswald">Oswald</option>
                      <option value="Lato">Lato</option>
                      <option value="Merriweather">Merriweather</option>
                    </select>
                  </div>

                  {/* Texto del Post (título principal) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2 border-t border-amber-500/10">
                    <div className="md:col-span-2 space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400">TEXTO DEL POST — TAMAÑO: {cardFontSizeTitle}px</label>
                      <input type="range" min="14" max="40" value={cardFontSizeTitle} onChange={(e) => setCardFontSizeTitle(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400">COLOR</label>
                      <div className="flex gap-2 items-center">
                        <input type="color" value={cardTitleColor} onChange={(e) => setCardTitleColor(e.target.value)} className="w-9 h-9 rounded-lg bg-transparent border border-border-dark cursor-pointer" />
                        <span className="text-[10px] text-gray-400 font-bold uppercase">{cardTitleColor}</span>
                      </div>
                    </div>
                  </div>

                  {/* Subreddit / Encabezado */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2 border-t border-amber-500/10">
                    <div className="md:col-span-2 space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400">SUBREDDIT / ENCABEZADO — TAMAÑO: {cardFontSizeSubreddit}px</label>
                      <input type="range" min="10" max="22" value={cardFontSizeSubreddit} onChange={(e) => setCardFontSizeSubreddit(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400">COLOR</label>
                      <div className="flex gap-2 items-center">
                        <input type="color" value={cardSubredditColor} onChange={(e) => setCardSubredditColor(e.target.value)} className="w-9 h-9 rounded-lg bg-transparent border border-border-dark cursor-pointer" />
                        <span className="text-[10px] text-gray-400 font-bold uppercase">{cardSubredditColor}</span>
                      </div>
                    </div>
                  </div>

                  {/* Nombre de Usuario */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2 border-t border-amber-500/10">
                    <div className="md:col-span-2 space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400">NOMBRE DE USUARIO — TAMAÑO: {cardFontSizeUsername}px</label>
                      <input type="range" min="8" max="20" value={cardFontSizeUsername} onChange={(e) => setCardFontSizeUsername(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400">COLOR</label>
                      <div className="flex gap-2 items-center">
                        <input type="color" value={cardUsernameColor} onChange={(e) => setCardUsernameColor(e.target.value)} className="w-9 h-9 rounded-lg bg-transparent border border-border-dark cursor-pointer" />
                        <span className="text-[10px] text-gray-400 font-bold uppercase">{cardUsernameColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Diseño Avanzado */}
                <div className="space-y-4 bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10">
                  <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 border-b border-indigo-500/20 pb-2">
                    <Palette className="w-3.5 h-3.5" /><span>Diseño Avanzado (Estilo Postfully V2)</span>
                  </h4>
                  <div className="flex flex-wrap gap-6 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={cardShowVerified} onChange={(e) => setCardShowVerified(e.target.checked)} className="rounded bg-black/40 border-border-dark text-indigo-500 focus:ring-0 w-4 h-4" />
                      <span className="text-[10px] font-bold text-gray-300">MOSTRAR VERIFICADO</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={cardShowAwards} onChange={(e) => setCardShowAwards(e.target.checked)} className="rounded bg-black/40 border-border-dark text-indigo-500 focus:ring-0 w-4 h-4" />
                      <span className="text-[10px] font-bold text-gray-300">MOSTRAR PREMIOS</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: `ANCHO: ${cardWidth}px`, value: cardWidth, min: 200, max: 380, set: setCardWidth },
                      { label: `BORDES: ${cardBorderRadius}px`, value: cardBorderRadius, min: 0, max: 20, set: setCardBorderRadius },
                      { label: `RELLENO: ${cardPadding}px`, value: cardPadding, min: 8, max: 24, set: setCardPadding },
                      { label: `ESPACIADO: ${cardGap}px`, value: cardGap, min: 4, max: 16, set: setCardGap },
                    ].map(s => (
                      <div key={s.label} className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-400">{s.label}</label>
                        <input type="range" min={s.min} max={s.max} value={s.value} onChange={(e) => s.set(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Posicionamiento */}
                <div className="space-y-4 bg-amber-500/5 p-4 rounded-xl border border-amber-500/10">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                      <Move className="w-3.5 h-3.5" />
                      <span>Posición & Escala ({previewOrientation === '16:9' ? '16:9' : '9:16'})</span>
                    </span>
                    <button type="button" onClick={handleResetPosition} className="text-[9px] font-bold bg-gray-800 text-gray-300 hover:text-white px-2.5 py-1 rounded-md border border-border-dark cursor-pointer">
                      Centrar (0,0)
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: `X: ${previewOrientation === '16:9' ? cardOffsetX_16_9 : cardOffsetX}px`, value: previewOrientation === '16:9' ? cardOffsetX_16_9 : cardOffsetX, min: -400, max: 400, set: (v) => previewOrientation === '16:9' ? setCardOffsetX_16_9(v) : setCardOffsetX(v) },
                      { label: `Y: ${previewOrientation === '16:9' ? cardOffsetY_16_9 : cardOffsetY}px`, value: previewOrientation === '16:9' ? cardOffsetY_16_9 : cardOffsetY, min: -600, max: 600, set: (v) => previewOrientation === '16:9' ? setCardOffsetY_16_9(v) : setCardOffsetY(v) },
                      { label: `ESCALA: ${(previewOrientation === '16:9' ? cardScale_16_9 : cardScale).toFixed(2)}x`, value: (previewOrientation === '16:9' ? cardScale_16_9 : cardScale) * 100, min: 30, max: 200, set: (v) => previewOrientation === '16:9' ? setCardScale_16_9(v / 100) : setCardScale(v / 100) },
                    ].map(s => (
                      <div key={s.label} className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-400">{s.label}</label>
                        <input type="range" min={s.min} max={s.max} value={s.value} onChange={(e) => s.set(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer" />
                      </div>
                    ))}
                  </div>

                  {/* Animaciones entrada/salida */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-amber-500/10">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400">ANIMACIÓN DE ENTRADA</label>
                      <select value={cardEntryAnimation} onChange={(e) => setCardEntryAnimation(e.target.value)} className="w-full bg-black/40 border border-border-dark rounded-xl p-2.5 text-xs text-white font-semibold">
                        {ENTRY_ANIMS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400">ANIMACIÓN DE SALIDA</label>
                      <select value={cardExitAnimation} onChange={(e) => setCardExitAnimation(e.target.value)} className="w-full bg-black/40 border border-border-dark rounded-xl p-2.5 text-xs text-white font-semibold">
                        {EXIT_ANIMS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400">DURACIÓN ENTRADA: {cardEntryDuration}s</label>
                      <input type="range" min="0.1" max="1.5" step="0.05" value={cardEntryDuration} onChange={(e) => setCardEntryDuration(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400">DURACIÓN SALIDA: {cardExitDuration}s</label>
                      <input type="range" min="0.1" max="1.5" step="0.05" value={cardExitDuration} onChange={(e) => setCardExitDuration(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA SUBTÍTULOS */}
            {activeTab === 'subtitles' && (
              <div className="space-y-6 animate-[pFadeIn_0.2s_ease-out]">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 border-b border-border-dark pb-2">
                  <Type className="w-4 h-4 text-cyan-400" /><span>Estilo y Animación de Subtítulos</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">FUENTE</label>
                    <select value={font} onChange={(e) => setFont(e.target.value)} className="w-full bg-black/40 border border-border-dark rounded-xl p-2.5 text-xs text-white font-semibold">
                      {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">ESTILO DE BORDE</label>
                    <select value={subtitleBorderStyle} onChange={(e) => setSubtitleBorderStyle(e.target.value)} className="w-full bg-black/40 border border-border-dark rounded-xl p-2.5 text-xs text-white font-semibold">
                      {BORDER_STYLES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">ANIMACIÓN DE SUBTÍTULOS</label>
                    <select value={animation} onChange={(e) => setAnimation(e.target.value)} className="w-full bg-black/40 border border-border-dark rounded-xl p-2.5 text-xs text-white font-semibold">
                      {ANIMATIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">TAMAÑO (9:16): {fontSize}</label>
                    <input type="range" min="60" max="200" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer mt-2.5" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">TAMAÑO (16:9): {fontSize_16_9}</label>
                    <input type="range" min="60" max="200" value={fontSize_16_9} onChange={(e) => setFontSize_16_9(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer mt-2.5" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">VELOCIDAD ANIMACIÓN: {subtitleAnimationSpeed}ms</label>
                    <input type="range" min="20" max="300" value={subtitleAnimationSpeed} onChange={(e) => setSubtitleAnimationSpeed(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer mt-2.5" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">COLOR ACTIVO</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={subtitleColor} onChange={(e) => setSubtitleColor(e.target.value)} className="w-8 h-8 rounded-lg bg-transparent border border-border-dark cursor-pointer" />
                      <span className="text-xs text-gray-400 font-bold uppercase">{subtitleColor}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">COLOR PASIVO</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={passiveColor} onChange={(e) => setPassiveColor(e.target.value)} className="w-8 h-8 rounded-lg bg-transparent border border-border-dark cursor-pointer" />
                      <span className="text-xs text-gray-400 font-bold uppercase">{passiveColor}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">ESPACIADO LETRAS: {subtitleLetterSpacing}px</label>
                    <input type="range" min="-2" max="10" value={subtitleLetterSpacing} onChange={(e) => setSubtitleLetterSpacing(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer mt-2.5" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">DELAY ENTRE PALABRAS: {subtitleDelay}s</label>
                    <input type="range" min="0.05" max="0.8" step="0.05" value={subtitleDelay} onChange={(e) => setSubtitleDelay(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer mt-2.5" />
                  </div>
                </div>
                <div className="space-y-4 bg-cyan-500/5 p-4 rounded-xl border border-cyan-500/10">
                  <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 border-b border-cyan-500/20 pb-2">
                    <Move className="w-3.5 h-3.5" /><span>Posición de Subtítulos</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400">OFFSET X (9:16): {subtitleOffsetX}px</label>
                      <input type="range" min="-400" max="400" value={subtitleOffsetX} onChange={(e) => setSubtitleOffsetX(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400">OFFSET Y (9:16): {subtitleOffsetY}px</label>
                      <input type="range" min="-800" max="800" value={subtitleOffsetY} onChange={(e) => setSubtitleOffsetY(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400">OFFSET X (16:9): {subtitleOffsetX_16_9}px</label>
                      <input type="range" min="-400" max="400" value={subtitleOffsetX_16_9} onChange={(e) => setSubtitleOffsetX_16_9(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400">OFFSET Y (16:9): {subtitleOffsetY_16_9}px</label>
                      <input type="range" min="-400" max="400" value={subtitleOffsetY_16_9} onChange={(e) => setSubtitleOffsetY_16_9(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA VOCES */}
            {activeTab === 'voice' && (
              <div className="space-y-6 animate-[pFadeIn_0.2s_ease-out]">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 border-b border-border-dark pb-2">
                  <Volume2 className="w-4 h-4 text-emerald-400" /><span>Configuración de Voces (Edge TTS)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">VOZ MASCULINA</label>
                    <select value={maleVoice} onChange={(e) => setMaleVoice(e.target.value)} className="w-full bg-black/40 border border-border-dark rounded-xl p-2.5 text-xs text-white font-semibold">
                      {EDGE_VOICES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">VOZ FEMENINA</label>
                    <select value={femaleVoice} onChange={(e) => setFemaleVoice(e.target.value)} className="w-full bg-black/40 border border-border-dark rounded-xl p-2.5 text-xs text-white font-semibold">
                      {EDGE_VOICES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase">VELOCIDAD DE LOCUCIÓN: {rateToPercentValue(voiceRate)}%</label>
                    <span className="text-[9px] text-gray-500">{voiceRate}</span>
                  </div>
                  <input type="range" min="60" max="200" value={rateToPercentValue(voiceRate)}
                    onChange={(e) => setVoiceRate(percentValueToRateStr(e.target.value))}
                    className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer" />
                  <div className="flex justify-between text-[8.5px] text-gray-500">
                    <span>60% (Lento)</span><span>100% (Normal)</span><span>200% (Rápido)</span>
                  </div>
                </div>
                {/* Audicionador */}
                <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 space-y-4">
                  <h4 className="text-xs font-bold text-emerald-400 border-b border-emerald-500/20 pb-2">🎙️ Audicionador de Voz en Vivo</h4>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-400">TEXTO DE PRUEBA</label>
                    <textarea value={previewTestText} onChange={(e) => setPreviewTestText(e.target.value)} rows="2"
                      className="w-full bg-black/40 border border-border-dark rounded-xl p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-primary resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400">VOZ A PROBAR</label>
                      <select value={previewVoice} onChange={(e) => setPreviewVoice(e.target.value)} className="w-full bg-black/40 border border-border-dark rounded-xl p-2.5 text-xs text-white font-semibold">
                        {EDGE_VOICES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400">VELOCIDAD: {rateToPercentValue(previewRate)}%</label>
                      <input type="range" min="60" max="200" value={rateToPercentValue(previewRate)}
                        onChange={(e) => setPreviewRate(percentValueToRateStr(e.target.value))}
                        className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer mt-3" />
                    </div>
                  </div>
                  <button type="button" disabled={previewLoading}
                    onClick={async () => {
                      setPreviewLoading(true); setPreviewWarningMsg('');
                      try {
                        const res = await fetch('/api/tts/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: previewTestText, voice: previewVoice, rate: previewRate }) });
                        const data = await res.json();
                        if (data.audioUrl) setPreviewAudioUrl(data.audioUrl);
                        else setPreviewWarningMsg(data.error || 'Error generando audio de prueba.');
                      } catch { setPreviewWarningMsg('Error de conexión con el servidor.'); }
                      finally { setPreviewLoading(false); }
                    }}
                    className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 text-emerald-400 font-extrabold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
                    {previewLoading ? <><Play className="w-3.5 h-3.5 animate-spin" /><span>Generando audio...</span></> : <><Play className="w-3.5 h-3.5" /><span>Generar y Escuchar Preview</span></>}
                  </button>
                  {previewWarningMsg && <p className="text-[10px] text-amber-400 font-bold">{previewWarningMsg}</p>}
                  {previewAudioUrl && <audio controls src={previewAudioUrl} className="w-full mt-2" />}
                </div>
              </div>
            )}

            {/* PESTAÑA MARCA DE AGUA */}
            {activeTab === 'watermark' && (
              <div className="space-y-6 animate-[pFadeIn_0.2s_ease-out]">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 border-b border-border-dark pb-2">
                  <Shield className="w-4 h-4 text-purple-400" /><span>Marca de Agua de Texto</span>
                </h3>
                <div className="bg-black/20 p-4 rounded-xl border border-border-dark flex items-center justify-between">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-300 uppercase">Activar Marca de Agua</label>
                    <p className="text-[9px] text-gray-500">Muestra un texto fijo superpuesto en todos los videos de esta plantilla.</p>
                  </div>
                  <input type="checkbox" checked={watermarkEnabled} onChange={(e) => setWatermarkEnabled(e.target.checked)} className="w-4 h-4 rounded bg-black/40 border border-border-dark text-purple-500 accent-purple-500 cursor-pointer" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400">TEXTO DE LA MARCA</label>
                  <input type="text" disabled={!watermarkEnabled} value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="@tu_canal / Nombre / Branding..."
                    className="w-full bg-black/40 border border-border-dark disabled:opacity-40 rounded-xl p-2.5 text-xs text-white font-bold" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">FUENTE</label>
                    <select disabled={!watermarkEnabled} value={watermarkFont} onChange={(e) => setWatermarkFont(e.target.value)} className="w-full bg-black/40 border border-border-dark disabled:opacity-40 rounded-xl p-2.5 text-xs text-white font-bold">
                      {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">TAMAÑO (PT)</label>
                    <input type="number" disabled={!watermarkEnabled} min="10" max="100" value={watermarkSize} onChange={(e) => setWatermarkSize(parseInt(e.target.value) || 24)} className="w-full bg-black/40 border border-border-dark disabled:opacity-40 rounded-xl p-2 text-xs text-white font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">COLOR</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" disabled={!watermarkEnabled} value={watermarkColor} onChange={(e) => setWatermarkColor(e.target.value)} className="w-8 h-8 rounded-lg bg-transparent border border-border-dark cursor-pointer disabled:opacity-40" />
                      <span className="text-xs text-gray-400 font-bold uppercase">{watermarkColor}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">OPACIDAD: {Math.round(watermarkOpacity * 100)}%</label>
                    <input type="range" disabled={!watermarkEnabled} min="0.1" max="1.0" step="0.05" value={watermarkOpacity} onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer mt-2.5 disabled:opacity-40" />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">ALINEACIÓN</label>
                    <select disabled={!watermarkEnabled || watermarkAnimation === 'bounce' || watermarkAnimation === 'bounce-wobble'} value={watermarkAlignment} onChange={(e) => setWatermarkAlignment(parseInt(e.target.value))} className="w-full bg-black/40 border border-border-dark disabled:opacity-40 rounded-xl p-2.5 text-xs text-white font-bold">
                      {ALIGNMENTS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">OFFSET X: {watermarkOffsetX}px</label>
                    <input type="range" disabled={!watermarkEnabled || watermarkAnimation === 'bounce' || watermarkAnimation === 'bounce-wobble'} min="0" max="200" value={watermarkOffsetX} onChange={(e) => setWatermarkOffsetX(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer mt-2.5 disabled:opacity-40" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">OFFSET Y: {watermarkOffsetY}px</label>
                    <input type="range" disabled={!watermarkEnabled || watermarkAnimation === 'bounce' || watermarkAnimation === 'bounce-wobble'} min="0" max="200" value={watermarkOffsetY} onChange={(e) => setWatermarkOffsetY(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer mt-2.5 disabled:opacity-40" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">ANIMACIÓN</label>
                    <select disabled={!watermarkEnabled} value={watermarkAnimation} onChange={(e) => setWatermarkAnimation(e.target.value)} className="w-full bg-black/40 border border-border-dark disabled:opacity-40 rounded-xl p-2.5 text-xs text-white font-bold">
                      {WATERMARK_ANIMS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </div>
                </div>
                {watermarkEnabled && watermarkAnimation !== 'none' && (
                  <div className="space-y-2 bg-purple-500/5 p-3 rounded-lg border border-purple-500/10">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-gray-300">
                        <span className="font-bold uppercase">Velocidad del ciclo: {watermarkSpeed}s</span>
                        <span className="text-[8px] text-purple-400 font-bold uppercase">Menor = Más rápido</span>
                      </div>
                      <input type="range" min="0.5" max="8.0" step="0.5" value={watermarkSpeed} onChange={(e) => setWatermarkSpeed(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer mt-1" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PESTAÑA MÚSICA */}
            {activeTab === 'music' && (
              <div className="space-y-6 animate-[pFadeIn_0.2s_ease-out]">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 border-b border-border-dark pb-2">
                  <Music className="w-4 h-4 text-pink-400" /><span>Control de Música de Fondo</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-black/20 p-4 rounded-xl border border-border-dark flex items-center justify-between">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-300 uppercase">Activar Música de Fondo</label>
                      <p className="text-[9px] text-gray-500">Mezcla música instrumental suave con el audio de la historia.</p>
                    </div>
                    <input type="checkbox" checked={musicEnabled} onChange={(e) => setMusicEnabled(e.target.checked)} className="w-4 h-4 rounded bg-black/40 border border-border-dark accent-pink-500 cursor-pointer" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400">ARCHIVO DE AUDIO LOCAL (MP3/WAV)</label>
                    <div className="flex gap-2">
                      <input type="text" disabled={!musicEnabled} value={musicFile} onChange={(e) => { setMusicFile(e.target.value); checkMusicFileExists(e.target.value); }}
                        placeholder="Elige un archivo de música..." className="w-full bg-black/40 border border-border-dark disabled:opacity-40 rounded-xl p-2.5 text-xs text-white font-mono truncate" />
                      <button type="button" disabled={!musicEnabled} onClick={handlePickMusicFile} className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white font-bold px-3 py-2 rounded-xl border border-border-dark cursor-pointer">
                        <Upload className="w-4 h-4 text-pink-400" />
                      </button>
                    </div>
                    {musicFile && !musicFileExists && (
                      <div className="mt-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl p-3 text-[10px] flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse" />
                        <span><strong>¡Archivo no encontrado!</strong> La ruta del archivo no existe en este equipo.</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2 bg-black/20 p-4 rounded-xl border border-border-dark">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">VOLUMEN DE MÚSICA: {musicVolume} dB</label>
                    <span className="text-[9px] text-gray-500">Recomendado: -20 dB a -26 dB</span></div>
              <input type="range" min="-40" max="-5" step="1" disabled={!musicEnabled} value={musicVolume} onChange={(e) => setMusicVolume(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer disabled:opacity-40" />
              <div className="flex justify-between text-[8.5px] text-gray-500">
                <span>Muy suave (-40 dB)</span><span>Por defecto (-20 dB)</span><span>Fuerte (-5 dB)</span>
              </div>
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-4 border-t border-border-dark pt-6 justify-end">
          {templates.length > 1 && selectedId && selectedId !== 'new' && (
            <button type="button" onClick={handleDeleteSubmit}
              className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer">
              <Trash2 className="w-4 h-4" /><span>Eliminar Plantilla</span>
            </button>
          )}
          <button type="submit"
            className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-hover active:scale-[0.98] text-white font-extrabold px-6 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-brand-primary/20">
            <Save className="w-4 h-4 fill-current" /><span>Guardar Plantilla de Video</span>
          </button>
        </div>
      </form>
    </div>

    {/* Preview (col derecha 5/12) */}
    <div className="lg:col-span-5 space-y-4">
      <div className="glass-panel rounded-2xl p-4 flex flex-col items-center gap-4 h-full min-h-[540px] relative overflow-hidden bg-gradient-to-b from-gray-900 to-black">

        <div className="w-full border-b border-border-dark pb-2 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-black text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-brand-primary" /><span>Previa en Vivo</span>
          </span>
          <button type="button" onClick={() => setIsFullscreen(true)}
            className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-border-dark cursor-pointer text-[9px] font-bold transition-all">
            <Maximize2 className="w-3 h-3" /><span>PANTALLA COMPLETA</span>
          </button>
        </div>

        {/* Aspect Ratio Toggle */}
        <div className="w-full shrink-0 flex items-center justify-between bg-black/40 rounded-xl p-1.5 border border-border-dark">
          <span className="text-[10px] font-bold text-gray-400 ml-2 uppercase">Formato:</span>
          <div className="flex gap-1.5">
            {['9:16', '16:9'].map(ori => (
              <button key={ori} type="button" onClick={() => setPreviewOrientation(ori)}
                className={`px-3 py-1 text-[9px] font-black rounded-lg transition-all cursor-pointer uppercase ${
                  previewOrientation === ori ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}>
                {ori}
              </button>
            ))}
          </div>
        </div>

        {/* Modo de vista por componente */}
        <div className="w-full shrink-0 flex gap-1.5 p-1 bg-black/40 rounded-xl border border-border-dark">
          {PREVIEW_MODES.map(m => (
            <button key={m.value} type="button" onClick={() => setPreviewMode(m.value)}
              className={`flex-1 py-1.5 text-[9px] font-black rounded-lg transition-all cursor-pointer uppercase text-center ${
                previewMode === m.value ? 'bg-brand-primary/15 text-brand-primary border border-brand-primary/30' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Controles de reproducción */}
        <div className="flex gap-3 w-full shrink-0">
          <button type="button" onClick={handleStartTimelineSimulation}
            className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 active:scale-[0.98] text-white font-black py-2 px-3 rounded-xl text-[10px] transition-all cursor-pointer shadow-lg shadow-orange-500/10">
            <Zap className="w-3.5 h-3.5 fill-current" /><span>Reproducir Secuencia</span>
          </button>
          {previewState !== 'idle' && (
            <button type="button" onClick={handleResetTimelineSimulation}
              className="flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white p-2 rounded-xl border border-border-dark cursor-pointer"><RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Monitor de estado */}
            <div className="w-full bg-black/60 rounded-xl px-3 py-1.5 text-center shrink-0 border border-border-dark flex justify-between items-center">
              <span className="text-[9px] font-bold text-gray-500">ESTADO:</span>
              <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded ${
                previewState === 'idle' ? 'bg-gray-800 text-gray-300' :
                previewState === 'intro' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                previewState === 'static' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                previewState === 'outro' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              }`}>
                {previewState === 'idle' ? 'Edición Estática' :
                 previewState === 'intro' ? 'Entrada del Card' :
                 previewState === 'static' ? 'Título en Pantalla' :
                 previewState === 'outro' ? 'Salida del Card' :
                 'Subtítulos Corriendo'}
              </span>
            </div>

            {/* Canvas de preview principal */}
            <div className="shrink-0 flex items-center justify-center w-full">
              <PreviewCanvas fullscreen={false} />
            </div>

            {/* Input título de prueba */}
            <div className="w-full shrink-0 space-y-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Título de Prueba del Card:</label>
              <input type="text" value={testTitle} onChange={(e) => setTestTitle(e.target.value)}
                className="w-full bg-black/40 border border-border-dark rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-primary" />
            </div>

            {/* Input subtítulo de prueba */}
            <div className="w-full shrink-0 space-y-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Texto de Prueba de Subtítulos:</label>
              <input type="text" value={testSubtitleText} onChange={(e) => setTestSubtitleText(e.target.value)}
                className="w-full bg-black/40 border border-border-dark rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-primary" />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}