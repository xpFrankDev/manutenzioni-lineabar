import 'dotenv/config';

const produccion = process.env.NODE_ENV === 'production';

function numero(nombre, valor, { defecto, min, max }) {
  const numero = valor === undefined || valor === '' ? defecto : Number(valor);
  if (!Number.isFinite(numero) || numero < min || numero > max) {
    throw new Error(`${nombre} debe ser un número entre ${min} y ${max}.`);
  }
  return numero;
}

function texto(nombre, valor, { defecto = '', min = 0, max = 10000, obligatorio = false } = {}) {
  const texto = String(valor ?? defecto).trim();
  if (!texto && obligatorio) throw new Error(`${nombre} es obligatorio.`);
  if (texto.length < min || texto.length > max) {
    throw new Error(`${nombre} debe tener entre ${min} y ${max} caracteres.`);
  }
  return texto;
}

/** Un secreto de producción nunca puede ser la plantilla ni un valor de ejemplo. */
function secreto(nombre, valor, { defecto = '', min = 1, obligatorio = false } = {}) {
  const resultado = texto(nombre, valor, { defecto, min, max: 4096, obligatorio });
  if (produccion && /^(reemplaza|cambia|valor_|solo-sviluppo)/i.test(resultado)) {
    throw new Error(`${nombre} conserva un valor de ejemplo; define un secreto real en producción.`);
  }
  return resultado;
}

function listaSeparadaPorComas(valor) {
  return String(valor || '')
    .split(',')
    .map((elemento) => elemento.trim())
    .filter(Boolean);
}

function origenesPermitidos(valor) {
  const origenes = listaSeparadaPorComas(valor).map((origen) => {
    let url;
    try {
      url = new URL(origen);
    } catch {
      throw new Error('CORS_ORIGIN contiene un origen que no es una URL válida.');
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('CORS_ORIGIN solo admite orígenes http o https.');
    }
    if (url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
      throw new Error('CORS_ORIGIN debe contener solo el origen, sin ruta, credenciales ni parámetros.');
    }
    return url.origin;
  });
  return [...new Set(origenes)];
}

const segretoJwt = secreto('JWT_SECRET', process.env.JWT_SECRET, {
  defecto: produccion ? '' : 'solo-sviluppo',
  min: produccion ? 32 : 1,
  obligatorio: produccion
});

const proveedorOcr = texto('LINEABAR_OCR_PROVEEDOR', process.env.LINEABAR_OCR_PROVEEDOR, {
  defecto: 'tesseract',
  min: 1,
  max: 30
}).toLowerCase();
if (!['tesseract', 'openai', 'ninguno'].includes(proveedorOcr)) {
  throw new Error('LINEABAR_OCR_PROVEEDOR debe ser tesseract, openai o ninguno.');
}

const usuarioBaseDatos = texto('LINEABAR_DB_USER', process.env.LINEABAR_DB_USER, {
  min: produccion ? 1 : 0,
  max: 80,
  obligatorio: produccion
});
const contrasenaBaseDatos = secreto('LINEABAR_DB_PASSWORD', process.env.LINEABAR_DB_PASSWORD, {
  min: produccion ? 1 : 0,
  obligatorio: produccion
});
const googleClientId = texto('GOOGLE_CLIENT_ID', process.env.GOOGLE_CLIENT_ID, { max: 300 });
const googleClientSecret = texto('GOOGLE_CLIENT_SECRET', process.env.GOOGLE_CLIENT_SECRET, { max: 500 });
if (Boolean(googleClientId) !== Boolean(googleClientSecret)) {
  throw new Error('GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET deben configurarse juntos.');
}
const googleRedirectUri = texto('GOOGLE_REDIRECT_URI', process.env.GOOGLE_REDIRECT_URI, {
  defecto: origenesPermitidos(process.env.CORS_ORIGIN)[0]
    ? `${origenesPermitidos(process.env.CORS_ORIGIN)[0]}/lineabar/api/auth/google/callback`
    : '',
  max: 1000
});
const nombreBaseDatos = texto('MARIADB_DATABASE', process.env.MARIADB_DATABASE, {
  min: produccion ? 1 : 0,
  max: 64,
  obligatorio: produccion
});

export const entorno = {
  produccion,
  puerto: numero('PORT', process.env.PORT, { defecto: 3001, min: 1, max: 65535 }),
  /**
   * Número de proxies de confianza delante de la API. En producción hay dos
   * saltos (Nginx del host y Nginx del contenedor frontend); en local no hay
   * ninguno. Sin este valor, todos los clientes compartirían la misma cubeta
   * de rate limiting detrás de un proxy.
   */
  trustProxy: numero('TRUST_PROXY_HOPS', process.env.TRUST_PROXY_HOPS, {
    defecto: produccion ? 2 : 0,
    min: 0,
    max: 5
  }),
  origenesPermitidos: origenesPermitidos(process.env.CORS_ORIGIN),
  google: {
    clientId: googleClientId,
    clientSecret: googleClientSecret,
    redirectUri: googleRedirectUri
  },
  cookies: {
    nombreSesion: 'lineabar_sesion',
    nombreRefresco: 'lineabar_refresco',
    ruta: texto('COOKIE_PATH', process.env.COOKIE_PATH, {
      defecto: produccion ? '/lineabar/api' : '/',
      min: 1,
      max: 200
    }),
    secure: produccion || String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true'
  },
  sesion: {
    secreto: segretoJwt,
    emisor: 'lineabar',
    minutosVigencia: numero('LINEABAR_ACCESO_MINUTOS', process.env.LINEABAR_ACCESO_MINUTOS, {
      defecto: 10,
      min: 1,
      max: 1440
    }),
    refrescoDias: numero('LINEABAR_REFRESCO_DIAS', process.env.LINEABAR_REFRESCO_DIAS, {
      defecto: 30,
      min: 1,
      max: 365
    })
  },
  ocr: {
    // Por defecto Tesseract local: gratuito y sin depender de servicios de pago.
    proveedor: proveedorOcr,
    idiomas: texto('LINEABAR_OCR_IDIOMAS', process.env.LINEABAR_OCR_IDIOMAS, {
      defecto: 'ita',
      min: 2,
      max: 30
    }),
    endpoint:
      process.env.LINEABAR_OCR_ENDPOINT ||
      (process.env.OPENAI_API_KEY ? 'https://api.openai.com/v1/chat/completions' : null),
    apiKey: process.env.LINEABAR_OCR_API_KEY || process.env.OPENAI_API_KEY || null,
    modelo: texto('LINEABAR_OCR_MODELO', process.env.LINEABAR_OCR_MODELO, {
      defecto: 'gpt-4o-mini',
      min: 1,
      max: 80
    }),
    tiempoLimiteMs: numero('LINEABAR_OCR_TIEMPO_LIMITE_MS', process.env.LINEABAR_OCR_TIEMPO_LIMITE_MS, {
      defecto: 60000,
      min: 1000,
      max: 300000
    }),
    maximoBytes: numero('LINEABAR_OCR_MAX_BYTES', process.env.LINEABAR_OCR_MAX_BYTES, {
      defecto: 8 * 1024 * 1024,
      min: 1024,
      max: 12 * 1024 * 1024
    })
  },
  baseDatos: {
    host: texto('DB_HOST', process.env.DB_HOST, { defecto: 'mariadb', min: 1, max: 255 }),
    puerto: numero('DB_PORT', process.env.DB_PORT, { defecto: 3306, min: 1, max: 65535 }),
    usuario: usuarioBaseDatos,
    contrasena: contrasenaBaseDatos,
    nombre: nombreBaseDatos
  }
};
