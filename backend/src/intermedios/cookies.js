import crypto from 'node:crypto';
import { entorno } from '../configuracion/entorno.js';

/** Parser mínimo de `Cookie` para no añadir una dependencia nueva. */
export function leerCookies(req, _res, siguiente) {
  const cabecera = req.headers?.cookie;
  req.cookies = {};
  if (!cabecera) return siguiente();

  for (const parte of cabecera.split(';')) {
    const indice = parte.indexOf('=');
    if (indice === -1) continue;
    const nombre = parte.slice(0, indice).trim();
    const valor = parte.slice(indice + 1).trim();
    if (!nombre) continue;
    try {
      req.cookies[nombre] = decodeURIComponent(valor);
    } catch {
      req.cookies[nombre] = valor;
    }
  }
  return siguiente();
}

function opciones({ httpOnly, maxAge }) {
  return {
    httpOnly,
    sameSite: 'strict',
    secure: entorno.cookies.secure,
    path: entorno.cookies.ruta,
    maxAge
  };
}

export function generarCsrf() {
  return crypto.randomBytes(32).toString('base64url');
}

/** Comparación en tiempo constante para no filtrar el token por longitud. */
export function compararSeguro(a, b) {
  const izquierda = Buffer.from(String(a ?? ''));
  const derecha = Buffer.from(String(b ?? ''));
  if (izquierda.length !== derecha.length) return false;
  return crypto.timingSafeEqual(izquierda, derecha);
}

export function establecerCookiesSesion(res, { token, refresco, csrf }) {
  const seguro = opciones({ httpOnly: true, maxAge: entorno.sesion.minutosVigencia * 60 * 1000 });
  const larga = opciones({ httpOnly: true, maxAge: entorno.sesion.refrescoDias * 24 * 60 * 60 * 1000 });
  res.cookie(entorno.cookies.nombreSesion, token, seguro);
  res.cookie(entorno.cookies.nombreRefresco, refresco, larga);
  res.cookie(entorno.cookies.nombreCsrf, csrf, { ...larga, httpOnly: false });
}

export function limpiarCookiesSesion(res) {
  res.clearCookie(entorno.cookies.nombreSesion, opciones({ httpOnly: true, maxAge: 0 }));
  res.clearCookie(entorno.cookies.nombreRefresco, opciones({ httpOnly: true, maxAge: 0 }));
  res.clearCookie(entorno.cookies.nombreCsrf, opciones({ httpOnly: false, maxAge: 0 }));
}

export function esMetodoSeguro(metodo) {
  return ['GET', 'HEAD', 'OPTIONS'].includes(String(metodo || '').toUpperCase());
}
