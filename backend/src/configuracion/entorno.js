import 'dotenv/config';

const produccion = process.env.NODE_ENV === 'production';
const segretoJwt = process.env.JWT_SECRET || (produccion ? null : 'solo-sviluppo');

if (!segretoJwt) {
  throw new Error('JWT_SECRET es obligatorio en producción.');
}

function listaSeparadaPorComas(valor) {
  return String(valor || '')
    .split(',')
    .map((elemento) => elemento.trim())
    .filter(Boolean);
}

export const entorno = {
  produccion,
  puerto: Number(process.env.PORT || 3001),
  origenesPermitidos: listaSeparadaPorComas(process.env.CORS_ORIGIN),
  sesion: {
    secreto: segretoJwt,
    emisor: 'lineabar',
    minutosVigencia: Number(process.env.LINEABAR_ACCESO_MINUTOS || 10),
    refrescoDias: Number(process.env.LINEABAR_REFRESCO_DIAS || 30)
  },
  ocr: {
    // Por defecto Tesseract local: gratuito y sin depender de servicios de pago.
    proveedor: (process.env.LINEABAR_OCR_PROVEEDOR || 'tesseract').toLowerCase(),
    idiomas: process.env.LINEABAR_OCR_IDIOMAS || 'ita',
    endpoint:
      process.env.LINEABAR_OCR_ENDPOINT ||
      (process.env.OPENAI_API_KEY ? 'https://api.openai.com/v1/chat/completions' : null),
    apiKey: process.env.LINEABAR_OCR_API_KEY || process.env.OPENAI_API_KEY || null,
    modelo: process.env.LINEABAR_OCR_MODELO || 'gpt-4o-mini',
    tiempoLimiteMs: Number(process.env.LINEABAR_OCR_TIEMPO_LIMITE_MS || 60000),
    maximoBytes: Number(process.env.LINEABAR_OCR_MAX_BYTES || 8 * 1024 * 1024)
  },
  baseDatos: {
    host: process.env.DB_HOST || 'mariadb',
    puerto: Number(process.env.DB_PORT || 3306),
    usuario: process.env.LINEABAR_DB_USER,
    contrasena: process.env.LINEABAR_DB_PASSWORD,
    nombre: process.env.MARIADB_DATABASE
  }
};
