import { z } from 'zod';
import { consultar, consultarUno } from '../../base-datos/pool.js';
import { nuevoId } from '../../utilidades/identificadores.js';
import { obtenerParametros } from '../parametros/servicio.js';

export const DIAS_PROXIMOS = 30;
export const DIAS_AVISO = 7;

export function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Suma meses a una fecha ISO (YYYY-MM-DD) sin desbordar el día: el 31 de
 * enero más un mes es el último día de febrero.
 */
export function sumarMeses(fecha, meses) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const destino = new Date(Date.UTC(anio, mes - 1 + Number(meses), 1));
  const ultimoDia = new Date(Date.UTC(destino.getUTCFullYear(), destino.getUTCMonth() + 1, 0)).getUTCDate();
  destino.setUTCDate(Math.min(dia, ultimoDia));
  return destino.toISOString().slice(0, 10);
}

export function diasHasta(fecha, referencia = hoyIso()) {
  const destino = Date.parse(`${fecha}T12:00:00Z`);
  const origen = Date.parse(`${referencia}T12:00:00Z`);
  return Math.round((destino - origen) / 86400000);
}

export function estadoVencimiento(proxima, estadoCalendario = 'programmato', referencia = hoyIso()) {
  if (estadoCalendario === 'sospeso') return 'sospeso';
  if (estadoCalendario === 'eseguito') return 'eseguito';
  const dias = diasHasta(proxima, referencia);
  if (dias < 0) return 'vencido';
  if (dias === 0) return 'oggi';
  if (dias <= DIAS_AVISO) return 'imminente';
  if (dias <= DIAS_PROXIMOS) return 'prossimo';
  return 'programmato';
}

/**
 * Programa (o renueva) la próxima manutención de cada ricambio con intervalo
 * definido. Se llama al registrar una manutención y reemplaza la fecha
 * anterior de esa máquina y ricambio, de modo que el calendario siempre tenga
 * una única programación vigente por combinación.
 */
export async function programarCalendario(conexion, { macchinaId, fecha, manutencionId, recambios, usuarioId }) {
  const programados = [];
  for (const recambio of recambios) {
    const meses = Number(recambio.intervalloMeses ?? recambio.intervallo_meses ?? 0);
    if (!meses) continue;
    const proxima = sumarMeses(fecha, meses);
    await conexion.execute(
      'INSERT INTO calendario_manutenzioni_macchine (id,fk_macchina,fk_pezzo,fk_manutenzione_origine,frequenza_mesi,ultima_esecuzione,prossima_manutenzione,stato_calendario,utente_crea,utente_modifica) VALUES (?,?,?,?,?,?,?,"programmato",?,?) ON DUPLICATE KEY UPDATE fk_manutenzione_origine=VALUES(fk_manutenzione_origine),frequenza_mesi=VALUES(frequenza_mesi),ultima_esecuzione=VALUES(ultima_esecuzione),prossima_manutenzione=VALUES(prossima_manutenzione),stato_calendario="programmato",note=NULL,utente_modifica=VALUES(utente_modifica),stato="attivo"',
      [nuevoId(), macchinaId, recambio.pezzoId, manutencionId, meses, fecha, proxima, usuarioId, usuarioId]
    );
    programados.push({ pezzoId: recambio.pezzoId, prossimaManutenzione: proxima, frequenzaMesi: meses });
  }
  return programados;
}

function construirFiltros({ clienteId, desde, hasta, estado, tecnicoId }) {
  const condiciones = ['c.stato="attivo"', 'm.stato="attivo"'];
  const valores = [];

  if (clienteId) {
    condiciones.push('cl.id=?');
    valores.push(clienteId);
  }
  if (desde) {
    condiciones.push('c.prossima_manutenzione>=?');
    valores.push(desde);
  }
  if (hasta) {
    condiciones.push('c.prossima_manutenzione<=?');
    valores.push(hasta);
  }
  if (tecnicoId) {
    condiciones.push(
      '(c.fk_attivita IS NULL OR EXISTS (SELECT 1 FROM attivita_tecnici at WHERE at.fk_attivita=c.fk_attivita AND at.fk_tecnico=? AND at.stato="attivo"))'
    );
    valores.push(tecnicoId);
  }

  const hoy = hoyIso();
  if (estado === 'vencido') {
    condiciones.push('c.prossima_manutenzione<? AND c.stato_calendario="programmato"');
    valores.push(hoy);
  }
  if (estado === 'hoy') {
    condiciones.push('c.prossima_manutenzione=? AND c.stato_calendario="programmato"');
    valores.push(hoy);
  }
  if (estado === 'proximos') {
    condiciones.push('c.prossima_manutenzione>=? AND c.prossima_manutenzione<=? AND c.stato_calendario="programmato"');
    valores.push(hoy, fechaMasDias(hoy, DIAS_PROXIMOS));
  }
  if (estado === 'pendientes') condiciones.push('c.stato_calendario="programmato"');
  if (estado === 'sospeso') condiciones.push('c.stato_calendario="sospeso"');

  return { sql: condiciones.join(' AND '), valores };
}

export function fechaMasDias(fecha, dias) {
  const destino = new Date(`${fecha}T12:00:00Z`);
  destino.setUTCDate(destino.getUTCDate() + dias);
  return destino.toISOString().slice(0, 10);
}

const COLUMNAS_CALENDARIO =
  'c.id,c.fk_macchina,c.fk_pezzo,c.fk_attivita,c.fk_manutenzione_origine,c.frequenza_mesi,c.ultima_esecuzione,c.prossima_manutenzione,c.stato_calendario,c.note,m.codice_unico,m.modello,m.tipo_macchina,cl.id cliente_id,cl.nome cliente,cl.indirizzo,cl.citta,COALESCE(f.nome,ma.nome) marca,p.nome pezzo,p.codice_unico pezzo_codice,p.intervallo_mesi,a.stato_attivita,a.priorita,a.scadenza,a.id attivita_id';

const DESDE_CALENDARIO =
  'FROM calendario_manutenzioni_macchine c JOIN macchine m ON m.id=c.fk_macchina JOIN clienti cl ON cl.id=m.fk_cliente LEFT JOIN fornitori f ON f.id=m.fk_fornitore LEFT JOIN marche ma ON ma.id=m.fk_marca LEFT JOIN pezzi p ON p.id=c.fk_pezzo LEFT JOIN attivita a ON a.id=c.fk_attivita AND a.stato="attivo" AND a.stato_attivita<>"completata"';

export async function listarCalendario(filtros = {}) {
  const { sql, valores } = construirFiltros(filtros);
  const filas = await consultar(
    `SELECT ${COLUMNAS_CALENDARIO} ${DESDE_CALENDARIO} WHERE ${sql} ORDER BY (c.stato_calendario="programmato") DESC,c.prossima_manutenzione ASC,cl.nome ASC`,
    valores
  );
  const referencia = hoyIso();
  return filas.map((fila) => ({ ...fila, vencimiento: estadoVencimiento(fila.prossima_manutenzione, fila.stato_calendario, referencia) }));
}

export async function resumenCalendario({ tecnicoId = null } = {}) {
  const { sql, valores } = construirFiltros({ tecnicoId });
  const hoy = hoyIso();
  const parametros = await obtenerParametros();
  const diasAviso = Number(parametros.aviso_manutencion_dias ?? DIAS_AVISO);
  const horizonte = Number(parametros.horizonte_calendario_dias ?? DIAS_PROXIMOS);
  const fila = await consultarUno(
    `SELECT COUNT(*) pendientes, SUM(c.prossima_manutenzione<?) vencidos, SUM(c.prossima_manutenzione=?) hoy, SUM(c.prossima_manutenzione>? AND c.prossima_manutenzione<=?) proximos, SUM(c.fk_attivita IS NOT NULL) programados ${DESDE_CALENDARIO} WHERE ${sql} AND c.stato_calendario="programmato"`,
    [hoy, hoy, hoy, fechaMasDias(hoy, diasAviso), ...valores]
  );

  const proximas = await consultar(
    `SELECT ${COLUMNAS_CALENDARIO} ${DESDE_CALENDARIO} WHERE ${sql} AND c.stato_calendario="programmato" AND c.prossima_manutenzione<=? ORDER BY c.prossima_manutenzione ASC LIMIT 5`,
    [...valores, fechaMasDias(hoy, horizonte)]
  );

  const pendientes = Number(fila?.pendientes ?? 0);
  const vencidos = Number(fila?.vencidos ?? 0);
  const proximos = Number(fila?.proximos ?? 0);
  return {
    pendientes,
    vencidos,
    hoy: Number(fila?.hoy ?? 0),
    proximos,
    programados: Number(fila?.programados ?? 0),
    avisos: vencidos + Number(fila?.hoy ?? 0) + proximos,
    proximas: proximas.map((entrada) => ({ ...entrada, vencimiento: estadoVencimiento(entrada.prossima_manutenzione, entrada.stato_calendario) }))
  };
}

export async function obtenerEntradaCalendario(id) {
  return consultarUno(`SELECT ${COLUMNAS_CALENDARIO} ${DESDE_CALENDARIO} WHERE c.id=?`, [id]);
}

export async function actualizarEntradaCalendario(id, datos, usuarioId) {
  await consultar(
    'UPDATE calendario_manutenzioni_macchine SET prossima_manutenzione=COALESCE(?,prossima_manutenzione),frequenza_mesi=COALESCE(?,frequenza_mesi),stato_calendario=COALESCE(?,stato_calendario),note=COALESCE(?,note),utente_modifica=? WHERE id=?',
    [datos.prossimaManutenzione ?? null, datos.frequenzaMesi ?? null, datos.statoCalendario ?? null, datos.note ?? null, usuarioId, id]
  );
  return id;
}

export const esquemaReprogramacion = z.object({
  prossimaManutenzione: z.string().date().optional(),
  frequenzaMesi: z.coerce.number().int().min(1).max(120).optional(),
  statoCalendario: z.enum(['programmato', 'eseguito', 'sospeso']).optional(),
  note: z.string().trim().max(255).nullable().optional()
});

export const esquemaProgramacion = z.object({
  tecnici: z.array(z.string().uuid()).min(1).max(20),
  priorita: z.enum(['bassa', 'normale', 'alta']).default('normale'),
  richiedeAppuntamento: z.boolean().default(true),
  osservazione: z.string().trim().min(5).max(3000).optional(),
  scadenza: z.string().date().optional()
});
