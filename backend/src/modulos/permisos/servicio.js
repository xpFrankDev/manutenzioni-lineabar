import { consultar } from '../../base-datos/pool.js';

/**
 * Menús activos con los permisos del rol indicado. Devuelve también los menús
 * ocultos para que el administrador pueda configurarlos.
 */
export async function permisosDeRol(rolCodigo) {
  const filas = await consultar(
    `SELECT m.codice,m.nome,m.ruta,m.icona,m.ordine,rm.puo_vedere,rm.puo_modificare
       FROM menu m
       JOIN ruoli_menu rm ON rm.fk_menu=m.id AND rm.stato='attivo'
       JOIN ruoli r ON r.id=rm.fk_ruolo
      WHERE r.codice=? AND m.stato='attivo'
      ORDER BY m.ordine`,
    [rolCodigo]
  );
  return filas.map((fila) => ({
    codice: fila.codice,
    nome: fila.nome,
    ruta: fila.ruta,
    icona: fila.icona,
    ordine: Number(fila.ordine),
    ver: Boolean(Number(fila.puo_vedere)),
    modificar: Boolean(Number(fila.puo_modificare))
  }));
}

export async function menusVisibles(rolCodigo) {
  const permisos = await permisosDeRol(rolCodigo);
  return permisos.filter((menu) => menu.ver);
}

export async function tienePermiso(rolCodigo, menuCodigo, accion = 'ver') {
  const filas = await consultar(
    `SELECT rm.puo_vedere,rm.puo_modificare
       FROM ruoli_menu rm
       JOIN ruoli r ON r.id=rm.fk_ruolo
       JOIN menu m ON m.id=rm.fk_menu
      WHERE r.codice=? AND m.codice=? AND m.stato='attivo' AND rm.stato='attivo'`,
    [rolCodigo, menuCodigo]
  );
  const fila = filas[0];
  if (!fila) return false;
  return accion === 'editar' ? Boolean(Number(fila.puo_modificare)) : Boolean(Number(fila.puo_vedere));
}

export async function listarRolesConPermisos() {
  const roles = await consultar('SELECT id,codice,nome FROM ruoli ORDER BY nome');
  const menus = await consultar('SELECT id,codice,nome,ordine FROM menu WHERE stato="attivo" ORDER BY ordine');
  const relaciones = await consultar(
    'SELECT fk_ruolo,fk_menu,puo_vedere,puo_modificare FROM ruoli_menu WHERE stato="attivo"'
  );
  const porRol = new Map();
  for (const relacion of relaciones) {
    if (!porRol.has(relacion.fk_ruolo)) porRol.set(relacion.fk_ruolo, new Map());
    porRol.get(relacion.fk_ruolo).set(relacion.fk_menu, relacion);
  }
  return roles.map((rol) => ({
    id: rol.id,
    codice: rol.codice,
    nome: rol.nome,
    menus: menus.map((menu) => {
      const relacion = porRol.get(rol.id)?.get(menu.id);
      return {
        id: menu.id,
        codice: menu.codice,
        nome: menu.nome,
        ver: Boolean(Number(relacion?.puo_vedere ?? 0)),
        modificar: Boolean(Number(relacion?.puo_modificare ?? 0))
      };
    })
  }));
}

export async function actualizarPermisosRol(conexion, rolId, permisos, actorId) {
  await conexion.execute('UPDATE ruoli_menu SET stato="inattivo",utente_modifica=? WHERE fk_ruolo=?', [actorId, rolId]);
  for (const permiso of permisos) {
    await conexion.execute(
      `INSERT INTO ruoli_menu (fk_ruolo,fk_menu,puo_vedere,puo_modificare,stato,utente_crea,utente_modifica)
       SELECT ?,m.id,?,?,'attivo',?,? FROM menu m WHERE m.codice=? AND m.stato='attivo'
       ON DUPLICATE KEY UPDATE puo_vedere=VALUES(puo_vedere),puo_modificare=VALUES(puo_modificare),stato='attivo',utente_modifica=VALUES(utente_modifica)`,
      [rolId, permiso.ver ? 1 : 0, permiso.ver && permiso.modificar ? 1 : 0, actorId, actorId, permiso.codice]
    );
  }
}
