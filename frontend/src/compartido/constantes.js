export const CLAVES = {
  idioma: 'lineabar_lang',
  tema: 'lineabar_theme'
};

export const RUTA_ACCESO = '/lineabar/login';
export const RUTA_MAQUINA_PREFIJO = '/lineabar/macchine/';

export const RUTAS = {
  dashboard: '/lineabar/dashboard',
  boletas: '/lineabar/boletas',
  mantenimientos: '/lineabar/mantenimientos',
  macchine: '/lineabar/macchine',
  programmazione: '/lineabar/programmazione',
  tareas: '/lineabar/tareas',
  calendario: '/lineabar/calendario',
  reportes: '/lineabar/reportes',
  configuracion: '/lineabar/configuracion'
};

export const RUTAS_HOJA = {
  receipt: '/lineabar/nueva-boleta',
  maintenance: '/lineabar/nuevo-mantenimiento'
};

export function maquinaIdDesdeRuta(pathname) {
  const coincidencia = String(pathname ?? '').match(/^\/lineabar\/macchine\/([0-9a-f-]{36})$/i);
  return coincidencia?.[1] ?? null;
}

export function rutaMaquina(id) {
  return `${RUTA_MAQUINA_PREFIJO}${id}`;
}

export function paginaDesdeRuta(pathname) {
  const ruta = String(pathname ?? '');
  if (ruta === '/lineabar' || ruta === '/lineabar/') return 'dashboard';
  if (maquinaIdDesdeRuta(ruta)) return 'maquina';
  return Object.entries(RUTAS).find(([, destino]) => destino === ruta)?.[0] ?? '404';
}

export function hojaDesdeRuta(pathname) {
  return Object.entries(RUTAS_HOJA).find(([, ruta]) => ruta === pathname)?.[0] ?? null;
}

/**
 * Solo se acepta como destino de retorno una ruta interna de la aplicación.
 * Evita redirecciones abiertas desde `?next=`.
 */
export function destinoSeguro(next) {
  const valor = String(next ?? '');
  return valor.startsWith('/lineabar/') && !valor.startsWith(RUTA_ACCESO) ? valor : RUTAS.dashboard;
}
