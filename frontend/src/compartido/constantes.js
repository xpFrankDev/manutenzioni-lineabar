export const CLAVES = {
  idioma: 'lineabar_lang',
  tema: 'lineabar_theme'
};

export const RUTA_ACCESO = '/lineabar/login';

export const RUTAS = {
  dashboard: '/lineabar/dashboard',
  boletas: '/lineabar/boletas',
  mantenimientos: '/lineabar/mantenimientos',
  tareas: '/lineabar/tareas',
  calendario: '/lineabar/calendario',
  reportes: '/lineabar/reportes',
  configuracion: '/lineabar/configuracion'
};

export const RUTAS_HOJA = {
  receipt: '/lineabar/nueva-boleta',
  maintenance: '/lineabar/nuevo-mantenimiento'
};

export function paginaDesdeRuta(pathname) {
  return Object.entries(RUTAS).find(([, ruta]) => ruta === pathname)?.[0] ?? 'dashboard';
}

export function hojaDesdeRuta(pathname) {
  return Object.entries(RUTAS_HOJA).find(([, ruta]) => ruta === pathname)?.[0] ?? null;
}
