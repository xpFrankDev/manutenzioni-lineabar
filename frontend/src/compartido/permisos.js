const MENUS_ADMINISTRADOR = [
  'dashboard',
  'boletas',
  'mantenimientos',
  'calendario',
  'tareas',
  'macchine',
  'reportes',
  'configuracion'
];

const MENUS_TECNICO = ['dashboard', 'boletas', 'mantenimientos', 'calendario', 'tareas', 'macchine'];

function menuPorDefecto(usuario, codigo) {
  if (usuario?.ruolo === 'tecnico') {
    return MENUS_TECNICO.includes(codigo)
      ? { codice: codigo, ver: true, modificar: ['boletas', 'mantenimientos', 'tareas'].includes(codigo) }
      : null;
  }
  return MENUS_ADMINISTRADOR.includes(codigo)
    ? { codice: codigo, ver: true, modificar: true }
    : null;
}

export function menuDeUsuario(usuario, codigo) {
  if (Array.isArray(usuario?.menus)) {
    const menu = usuario.menus.find((fila) => fila.codice === codigo);
    return menu ? { ...menu, ver: Boolean(menu.ver), modificar: Boolean(menu.modificar) } : null;
  }
  return menuPorDefecto(usuario, codigo);
}

export function puedeVer(usuario, codigo) {
  return Boolean(menuDeUsuario(usuario, codigo)?.ver);
}

export function puedeModificar(usuario, codigo) {
  return Boolean(menuDeUsuario(usuario, codigo)?.modificar);
}
