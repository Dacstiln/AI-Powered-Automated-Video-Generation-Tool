const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const TEMP_DIR = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Crea, ejecuta y limpia un script temporal de PowerShell.
 * Esto evita el stripping de variables '$' en CMD/subprocesos de Node.
 * @param {string} scriptContent 
 * @returns {string} Resultado de la consola
 */
function runPowerShellScript(scriptContent) {
  const tempScriptPath = path.join(TEMP_DIR, `dialog_${uuidv4().substring(0, 8)}.ps1`);
  try {
    fs.writeFileSync(tempScriptPath, scriptContent, 'utf8');
    
    // Forzamos el flag -STA que es mandatorio para componentes GUI de Windows
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -STA -File "${tempScriptPath}"`;
    const output = execSync(cmd, { encoding: 'utf8' }).trim();
    return output;
  } catch (error) {
    console.error('Error al ejecutar script de PowerShell:', error);
    return '';
  } finally {
    try {
      if (fs.existsSync(tempScriptPath)) {
        fs.unlinkSync(tempScriptPath);
      }
    } catch (cleanError) {
      console.warn('No se pudo limpiar el script temporal de PowerShell:', cleanError.message);
    }
  }
}

/**
 * Lanza un diálogo nativo de Windows para seleccionar una carpeta usando FolderBrowserDialog moderno.
 * @returns {string} Ruta absoluta de la carpeta seleccionada o cadena vacía.
 */
function selectLocalFolder() {
  if (process.platform !== 'win32') return '';

  const psScript = `
    Add-Type -AssemblyName System.Windows.Forms
    $owner = New-Object System.Windows.Forms.Form
    $owner.TopMost = $true
    $owner.StartPosition = 'CenterScreen'
    $owner.Size = New-Object System.Drawing.Size(1, 1)
    $owner.Show()
    $owner.Activate()
    $f = New-Object System.Windows.Forms.FolderBrowserDialog
    $f.Description = 'Selecciona la carpeta de destino'
    $f.ShowNewFolderButton = $true
    $result = $f.ShowDialog($owner)
    $owner.Dispose()
    if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
      $f.SelectedPath
    }
  `;

  return runPowerShellScript(psScript);
}

/**
 * Lanza un diálogo nativo de Windows para seleccionar múltiples archivos de video forzando el modo -STA.
 * @returns {Array<string>} Lista de rutas absolutas de archivos seleccionados.
 */
function selectLocalFiles() {
  if (process.platform !== 'win32') return [];

  const psScript = `
    Add-Type -AssemblyName System.Windows.Forms
    $owner = New-Object System.Windows.Forms.Form
    $owner.TopMost = $true
    $owner.StartPosition = 'CenterScreen'
    $owner.Size = New-Object System.Drawing.Size(1, 1)
    $owner.Show()
    $owner.Activate()
    $f = New-Object System.Windows.Forms.OpenFileDialog
    $f.Filter = 'Archivos de Video (*.mp4;*.mkv;*.mov;*.avi)|*.mp4;*.mkv;*.mov;*.avi'
    $f.Multiselect = $true
    $f.Title = 'Selecciona tus videos de fondo'
    $result = $f.ShowDialog($owner)
    $owner.Dispose()
    if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
      $f.FileNames -join ';'
    }
  `;

  const output = runPowerShellScript(psScript);
  if (!output) return [];
  return output.split(';').map(p => p.trim());
}

/**
 * Lanza un diálogo nativo de Windows para seleccionar una imagen de avatar forzando el modo -STA.
 * @returns {{path: string, base64: string}} Ruta y contenido en base64 de la imagen.
 */
function selectLocalImage() {
  if (process.platform !== 'win32') return null;

  const psScript = `
    Add-Type -AssemblyName System.Windows.Forms
    $owner = New-Object System.Windows.Forms.Form
    $owner.TopMost = $true
    $owner.StartPosition = 'CenterScreen'
    $owner.Size = New-Object System.Drawing.Size(1, 1)
    $owner.Show()
    $owner.Activate()
    $f = New-Object System.Windows.Forms.OpenFileDialog
    $f.Filter = 'Imagenes (*.png;*.jpg;*.jpeg)|*.png;*.jpg;*.jpeg'
    $f.Multiselect = $false
    $f.Title = 'Selecciona la foto de perfil'
    $result = $f.ShowDialog($owner)
    $owner.Dispose()
    if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
      $f.FileName
    }
  `;

  const imagePath = runPowerShellScript(psScript);
  if (!imagePath || !fs.existsSync(imagePath)) return null;

  try {
    const ext = path.extname(imagePath).toLowerCase().replace('.', '');
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Data = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    console.log(`[Avatar] Imagen convertida a base64 correctamente.`);
    
    return {
      path: imagePath,
      base64: base64Data
    };
  } catch (error) {
    console.error('Error al procesar la imagen seleccionada:', error);
    return null;
  }
}

module.exports = {
  selectLocalFolder,
  selectLocalFiles,
  selectLocalImage
};
