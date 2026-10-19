import { RUTA_ACCESO } from '../constantes.js';

// `import.meta.env` existe bajo Vite; en pruebas de Node queda indefinido.
const URL_API = import.meta.env?.VITE_API_URL ?? '/lineabar/api';

export class ErrorApi extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
  }
}

// El token CSRF vive en memoria y nunca se persiste en el navegador. La sesión
// viaja en cookies HttpOnly que JavaScript no puede leer.
let csrfEnMemoria = null;

function csrfActual() {
  return csrfEnMemoria;
}

export function guardarSesion(sesion) {
  if (sesion?.csrf) csrfEnMemoria = sesion.csrf;
}

export function borrarSesion() {
  csrfEnMemoria = null;
}

function cerrarPorSesionExpirada() {
  borrarSesion();
  if (location.pathname === RUTA_ACCESO) return;
  const retorno = encodeURIComponent(`${location.pathname}${location.search}`);
  location.replace(`${RUTA_ACCESO}?next=${retorno}`);
}

// Un único refresco en vuelo: varias peticiones que reciben 401 a la vez
// comparten la rotación de la sesión en lugar de invalidarse entre ellas.
let refrescoEnCurso = null;

async function renovarSesion() {
  if (refrescoEnCurso) return refrescoEnCurso;

  refrescoEnCurso = (async () => {
    try {
      const respuesta = await fetch(`${URL_API}/auth/refresh`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!respuesta.ok) {
        borrarSesion();
        return null;
      }
      const sesion = await respuesta.json();
      guardarSesion(sesion);
      return true;
    } catch {
      return null;
    } finally {
      refrescoEnCurso = null;
    }
  })();

  return refrescoEnCurso;
}

async function peticion(ruta, opciones = {}) {
  const metodo = String(opciones.method || 'GET').toUpperCase();
  const csrf = csrfActual();
  return fetch(`${URL_API}${ruta}`, {
    ...opciones,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(csrf && metodo !== 'GET' && metodo !== 'HEAD' ? { 'X-CSRF-Token': csrf } : {}),
      ...(opciones.headers || {})
    }
  });
}

export async function llamarApi(ruta, opciones = {}, reintentar = true) {
  const respuesta = await peticion(ruta, opciones);

  if (respuesta.status === 401) {
    if (reintentar && (await renovarSesion())) return llamarApi(ruta, opciones, false);
    cerrarPorSesionExpirada();
    throw new ErrorApi(401, 'Sessione scaduta');
  }
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => ({}));
    throw new ErrorApi(respuesta.status, cuerpo.errore || 'Errore');
  }
  return respuesta.status === 204 ? null : respuesta.json();
}

export async function cerrarSesion() {
  await fetch(`${URL_API}/auth/logout`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' }
  }).catch(() => {});
  borrarSesion();
}

/** Descarga autenticada de un export (por ejemplo el CSV de boletas). */
export async function descargarArchivo(ruta, nombre) {
  const respuesta = await peticion(ruta, {});
  if (respuesta.status === 401 && (await renovarSesion())) return descargarArchivo(ruta, nombre);
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, 'Download non disponibile');
  const blob = await respuesta.blob();
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(enlace.href);
}
