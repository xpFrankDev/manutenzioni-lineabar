export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/**
 * Valida una imagen enviada como data URL o base64 simple. Se usa tanto para
 * los scontrini como para las fotos de máquina.
 */
export function analizarImagenEntrada({ immagine, tipoMime, nomeFile }, { maximoBytes = 8 * 1024 * 1024 } = {}) {
  if (!immagine || typeof immagine !== 'string') throw new Error('Carica una foto');

  const coincidencia = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(immagine.trim());
  const tipo = (coincidencia?.[1] ?? tipoMime ?? 'image/jpeg').toLowerCase();
  const base64 = (coincidencia?.[2] ?? immagine).replace(/\s+/g, '');

  if (!TIPOS_IMAGEN.includes(tipo)) throw new Error('Formato immagine non supportato');
  if (!/^[A-Za-z0-9+/=]+$/.test(base64)) throw new Error('Immagine non valida');

  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > maximoBytes) {
    throw new Error(`La foto supera gli ${Math.floor(maximoBytes / (1024 * 1024))} MB consentiti`);
  }

  return { tipoMime: tipo, base64, bytes, nomeFile: normalizarNombreArchivo(nomeFile) };
}

export function normalizarNombreArchivo(nombre) {
  const limpio = String(nombre ?? 'foto.jpg').replace(/[^\w.\-]+/g, '_');
  return (limpio || 'foto.jpg').slice(0, 190);
}
