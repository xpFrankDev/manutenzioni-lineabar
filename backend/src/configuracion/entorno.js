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
    minutosVigencia: 10
  },
  baseDatos: {
    host: process.env.DB_HOST || 'mariadb',
    puerto: Number(process.env.DB_PORT || 3306),
    usuario: process.env.LINEABAR_DB_USER,
    contrasena: process.env.LINEABAR_DB_PASSWORD,
    nombre: process.env.MARIADB_DATABASE
  }
};
