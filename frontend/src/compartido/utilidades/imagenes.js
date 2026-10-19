export const ANCHO_MAXIMO_FOTO = 1600;

/**
 * Convierte un archivo de imagen en data URL JPEG comprimida. Si el navegador
 * no puede procesarla, devuelve el data URL original para que el backend
 * valide formato y tamaño.
 */
export async function comprimirImagen(archivo, { anchoMaximo = ANCHO_MAXIMO_FOTO, calidad = 0.82 } = {}) {
  const original = await new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(lector.result);
    lector.onerror = rechazar;
    lector.readAsDataURL(archivo);
  });
  if (typeof window === 'undefined' || !('createImageBitmap' in window)) return original;

  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, anchoMaximo / Math.max(bitmap.width, bitmap.height));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(bitmap.width * escala);
    lienzo.height = Math.round(bitmap.height * escala);
    lienzo.getContext('2d').drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
    return lienzo.toDataURL('image/jpeg', calidad);
  } catch {
    return original;
  }
}
