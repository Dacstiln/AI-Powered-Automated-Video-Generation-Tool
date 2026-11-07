const { execSync } = require('child_process');

/**
 * Autodetecta todas las tarjetas gráficas y procesadores instalados en Windows y determina el códec de aceleración para FFmpeg.
 * @returns {{gpuName: string, cpuName: string, codec: string, hwaccel: string, description: string, allGpus: Array<string>}}
 */
function detectHardware() {
  const result = {
    gpuName: 'Desconocido / Genérico',
    cpuName: 'Procesador Genérico',
    codec: 'libx264', // CPU Fallback por defecto
    hwaccel: '',
    description: 'Renderizado por Software (CPU) - Seguro pero más lento.',
    allGpus: []
  };

  // Solo corremos comandos de Windows si estamos en Windows
  if (process.platform !== 'win32') {
    result.description = 'Plataforma no Windows. Usando codificador CPU estándar (libx264).';
    result.allGpus = ['CPU Standard Node'];
    return result;
  }

  // 1. Detectar CPU
  try {
    const cpuCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance -ClassName Win32_Processor | Select-Object -ExpandProperty Name"`;
    const rawCpuInfo = execSync(cpuCmd, { encoding: 'utf8' }).trim();
    if (rawCpuInfo) {
      result.cpuName = rawCpuInfo;
    }
  } catch (cpuError) {
    console.error('Error al detectar procesador:', cpuError.message);
  }

  // 2. Detectar GPU
  try {
    // Usamos Get-CimInstance para consultar los controladores gráficos instalados.
    // Evitamos utilizar $_.Name ya que las comillas dobles y subprocesos de Node a veces eliminan el caracter $.
    const psCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance -ClassName Win32_VideoController | Select-Object -ExpandProperty Name"`;
    const rawGpuInfo = execSync(psCmd, { encoding: 'utf8' });
    const lines = rawGpuInfo.split('\n')
      .map(line => line.trim())
      .filter(line => line && line.toLowerCase() !== 'name');

    if (lines.length > 0) {
      result.allGpus = lines; // Guardar todas las GPUs encontradas en el sistema

      // Buscar si existe alguna GPU dedicada prioritaria (Nvidia o AMD) en la lista
      let selectedGpu = lines[0];
      for (const line of lines) {
        const lower = line.toLowerCase();
        if (lower.includes('nvidia') || lower.includes('geforce') || lower.includes('rtx') || lower.includes('amd') || lower.includes('radeon')) {
          selectedGpu = line;
          break;
        }
      }

      result.gpuName = selectedGpu;
      const gpuLower = selectedGpu.toLowerCase();

      if (gpuLower.includes('nvidia') || gpuLower.includes('geforce') || gpuLower.includes('quadro') || gpuLower.includes('rtx')) {
        result.codec = 'h264_nvenc';
        result.hwaccel = 'cuda';
        result.description = `Aceleración por Hardware NVIDIA CUDA (${selectedGpu}) activa. ¡Máxima velocidad!`;
      } else if (gpuLower.includes('amd') || gpuLower.includes('radeon')) {
        result.codec = 'h264_amf';
        result.hwaccel = 'd3d11va';
        result.description = `Aceleración por Hardware AMD AMF (${selectedGpu}) activa. Alta velocidad.`;
      } else if (gpuLower.includes('intel') || gpuLower.includes('iris') || gpuLower.includes('uhd')) {
        result.codec = 'h264_qsv';
        result.hwaccel = 'qsv';
        result.description = `Aceleración por Hardware Intel QuickSync (${selectedGpu}) activa. Velocidad optimizada.`;
      } else {
        result.description = `Gráfica genérica detectada (${selectedGpu}). Usando CPU para mayor estabilidad.`;
      }
    }
  } catch (error) {
    console.error('Error al detectar hardware gráfico mediante powershell:', error.message);
    try {
      // Fallback a wmic si PowerShell falla
      const rawGpuInfo = execSync('wmic path win32_VideoController get name', { encoding: 'utf8' });
      const lines = rawGpuInfo.split('\n')
        .map(line => line.trim())
        .filter(line => line && line.toLowerCase() !== 'name');

      if (lines.length > 0) {
        result.allGpus = lines;
        let selectedGpu = lines[0];
        for (const line of lines) {
          const lower = line.toLowerCase();
          if (lower.includes('nvidia') || lower.includes('geforce') || lower.includes('rtx') || lower.includes('amd') || lower.includes('radeon')) {
            selectedGpu = line;
            break;
          }
        }
        result.gpuName = selectedGpu;
        const gpuLower = selectedGpu.toLowerCase();
        if (gpuLower.includes('nvidia') || gpuLower.includes('geforce') || gpuLower.includes('quadro') || gpuLower.includes('rtx')) {
          result.codec = 'h264_nvenc';
          result.hwaccel = 'cuda';
          result.description = `Aceleración por Hardware NVIDIA CUDA (${selectedGpu}) activa. ¡Máxima velocidad!`;
        } else if (gpuLower.includes('amd') || gpuLower.includes('radeon')) {
          result.codec = 'h264_amf';
          result.hwaccel = 'd3d11va';
          result.description = `Aceleración por Hardware AMD AMF (${selectedGpu}) activa. Alta velocidad.`;
        } else if (gpuLower.includes('intel') || gpuLower.includes('iris') || gpuLower.includes('uhd')) {
          result.codec = 'h264_qsv';
          result.hwaccel = 'qsv';
          result.description = `Aceleración por Hardware Intel QuickSync (${selectedGpu}) activa. Velocidad optimizada.`;
        } else {
          result.description = `Gráfica genérica detectada (${selectedGpu}). Usando CPU para mayor estabilidad.`;
        }
      }
    } catch (fallbackError) {
      result.description = 'Error al escanear la GPU. Usando CPU por seguridad.';
      result.allGpus = ['CPU Fallback (wmic failed)'];
    }
  }

  // Si tenemos una CPU detectada, la añadimos de manera premium en la descripción
  if (result.cpuName && result.cpuName !== 'Procesador Genérico') {
    result.description = `[CPU: ${result.cpuName}] | ` + result.description;
  }

  return result;
}

module.exports = {
  detectHardware
};

