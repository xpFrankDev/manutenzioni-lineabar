import { CLAVES, RUTA_ACCESO } from '../constantes.js';

const URL_API = import.meta.env.VITE_API_URL ?? '/lineabar/api';

export class ErrorApi extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
  }
}

export function guardarSesion(token) {
  localStorage.setItem(CLAVES.sesion, token);
}

export function leerSesion() {
  return localStorage.getItem(CLAVES.sesion);
}

export function borrarSesion() {
  localStorage.removeItem(CLAVES.sesion);
}

export async function llamarApi(ruta, opciones = {}) {
  const token = leerSesion();
  const respuesta = await fetch(`${URL_API}${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opciones.headers || {})
    }
  });

  if (respuesta.status === 401) {
    borrarSesion();
    if (location.pathname !== RUTA_ACCESO) location.replace(RUTA_ACCESO);
    throw new ErrorApi(401, 'Sessione scaduta');
  }
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => ({}));
    throw new ErrorApi(respuesta.status, cuerpo.errore || 'Errore');
  }
  return respuesta.status === 204 ? null : respuesta.json();
}
