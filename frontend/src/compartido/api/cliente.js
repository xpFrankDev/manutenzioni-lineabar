import { CLAVES, RUTA_ACCESO } from '../constantes.js';

// `import.meta.env` existe bajo Vite; en pruebas de Node queda indefinido.
const URL_API = import.meta.env?.VITE_API_URL ?? '/lineabar/api';

export class ErrorApi extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
  }
}

export function guardarSesion(sesion) {
  if (typeof sesion === 'string') {
    localStorage.setItem(CLAVES.sesion, sesion);
    return;
  }
  localStorage.setItem(CLAVES.sesion, sesion.token);
  if (sesion.refresco) localStorage.setItem(CLAVES.refresco, sesion.refresco);
}

export function leerSesion() {
  return localStorage.getItem(CLAVES.sesion);
}

export function leerRefresco() {
  return localStorage.getItem(CLAVES.refresco);
}

export function borrarSesion() {
  localStorage.removeItem(CLAVES.sesion);
  localStorage.removeItem(CLAVES.refresco);
}

function cerrarPorSesionExpirada() {
  borrarSesion();
  if (location.pathname !== RUTA_ACCESO) location.replace(RUTA_ACCESO);
}

// Un único refresco en vuelo: varias peticiones que reciben 401 a la vez
// comparten la rotación del token en lugar de invalidarse entre ellas.
let refrescoEnCurso = null;

async function renovarSesion() {
  const refresco = leerRefresco();
  if (!refresco) return null;
  if (refrescoEnCurso) return refrescoEnCurso;

  refrescoEnCurso = (async () => {
    try {
      const respuesta = await fetch(`${URL_API}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresco })
      });
      if (!respuesta.ok) {
        borrarSesion();
        return null;
      }
      const sesion = await respuesta.json();
      guardarSesion(sesion);
      return sesion.token;
    } catch {
      return null;
    } finally {
      refrescoEnCurso = null;
    }
  })();

  return refrescoEnCurso;
}

async function peticion(ruta, opciones) {
  const token = leerSesion();
  return fetch(`${URL_API}${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  const refresco = leerRefresco();
  if (refresco) {
    await fetch(`${URL_API}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresco })
    }).catch(() => {});
  }
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
