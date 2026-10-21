import { consultar, consultarUno, enTransaccion } from '../../base-datos/pool.js';
import { nuevoId } from '../../utilidades/identificadores.js';
import { generarProgramaConIa } from '../../ai/programmazione/servicio.js';
import { crearActividad } from '../actividades/servicio.js';

const RADIO_TIERRA_KM = 6371;
const PRIORIDAD = { alta: 0, normale: 1, bassa: 2 };

function haversineKm(a, b) {
  if (!a?.latitudine || !a?.longitudine || !b?.latitudine || !b?.longitudine) return null;
  const rad = (grados) => (Number(grados) * Math.PI) / 180;
  const dLat = rad(b.latitudine - a.latitudine);
  const dLon = rad(b.longitudine - a.longitudine);
  const lat1 = rad(a.latitudine);
  const lat2 = rad(b.latitudine);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.sqrt(h));
}

export function minutosViaje(a, b) {
  if (!a || !b) return null;
  if (a.clienteId && a.clienteId === b.clienteId) return 0;
  const km = haversineKm(a, b);
  if (km == null) return null;
  const mismaCiudad = String(a.citta ?? '').toLowerCase() === String(b.citta ?? '').toLowerCase();
  const estimado = Math.round(5 + km * 1.55);
  return mismaCiudad ? Math.max(5, estimado) : Math.max(10, estimado);
}

export async function listarCandidatos({ fecha, conexion = undefined }) {
  return consultar(
    `SELECT c.id candidatoId,c.prossima_manutenzione,c.frequenza_mesi,
            m.id macchinaId,m.codice_unico,m.modello,m.matricola,m.tipo_macchina,
            cl.id clienteId,cl.nome cliente,cl.indirizzo,cl.citta,cl.url_mappe,cl.latitudine,cl.longitudine,
            p.nome pezzo,'normale' priorita
       FROM calendario_manutenzioni_macchine c
       JOIN macchine m ON m.id=c.fk_macchina
       JOIN clienti cl ON cl.id=m.fk_cliente
       LEFT JOIN pezzi p ON p.id=c.fk_pezzo
      WHERE c.stato='attivo'
        AND c.stato_calendario='programmato'
        AND cl.latitudine IS NOT NULL AND cl.longitudine IS NOT NULL
        AND c.prossima_manutenzione<=DATE_ADD(?, INTERVAL 90 DAY)
        AND (c.fk_attivita IS NULL OR NOT EXISTS (
          SELECT 1 FROM attivita a
           WHERE a.id=c.fk_attivita AND a.stato='attivo' AND a.stato_attivita<>'completata'
        ))
      ORDER BY c.prossima_manutenzione ASC,cl.nome ASC`,
    [fecha],
    conexion
  );
}

export function matrizViaje(candidatos) {
  const matriz = [];
  for (const desde of candidatos) {
    for (const hasta of candidatos) {
      if (desde.candidatoId === hasta.candidatoId) continue;
      const minuti = minutosViaje(desde, hasta);
      if (minuti != null) matriz.push({ da: desde.candidatoId, a: hasta.candidatoId, minuti });
    }
  }
  return matriz;
}

function planDeterminista(candidatos, { maxTappe, minutosMin, minutosMax }) {
  const ordenados = [...candidatos].sort((a, b) => {
    const porFecha = String(a.prossima_manutenzione).localeCompare(String(b.prossima_manutenzione));
    if (porFecha !== 0) return porFecha;
    return (PRIORIDAD[a.priorita] ?? 1) - (PRIORIDAD[b.priorita] ?? 1);
  });

  const seleccion = [];
  const restantes = new Set(ordenados);
  let actual = ordenados[0] ?? null;
  while (actual && seleccion.length < maxTappe) {
    const anterior = seleccion[seleccion.length - 1];
    const minuti = anterior ? minutosViaje(anterior.candidato, actual) : 0;
    const mismaCiudad =
      anterior && String(anterior.candidato.citta ?? '').toLowerCase() === String(actual.citta ?? '').toLowerCase();
    const compatible =
      !anterior ||
      minuti == null ||
      minuti === 0 ||
      mismaCiudad ||
      (minuti <= minutosMax && minuti >= (minutosMin || 0));
    if (compatible) {
      seleccion.push({ candidato: actual, minutiDaPrecedente: anterior ? minuti ?? 0 : 0 });
    }
    restantes.delete(actual);

    const siguientes = [...restantes]
      .map((candidato) => ({ candidato, minuti: minutosViaje(actual, candidato) }))
      .filter((fila) => {
        if (fila.minuti == null || fila.minuti > minutosMax) return false;
        const misma = String(actual.citta ?? '').toLowerCase() === String(fila.candidato.citta ?? '').toLowerCase();
        return fila.minuti === 0 || misma || fila.minuti >= (minutosMin || 0);
      })
      .sort((a, b) => {
        const distancia = (a.minuti ?? 999) - (b.minuti ?? 999);
        if (distancia !== 0) return distancia;
        return (PRIORIDAD[a.candidato.priorita] ?? 1) - (PRIORIDAD[b.candidato.priorita] ?? 1);
      });
    actual = siguientes[0]?.candidato ?? null;
  }

  return {
    tappe: seleccion.map((fila, indice) => ({
      attivitaId: fila.candidato.candidatoId,
      ordine: indice + 1,
      minutiDaPrecedente: fila.minutiDaPrecedente
    })),
    riepilogo: `Giro di ${seleccion.length} tappe ottimizzato per prossimità e scadenze.`
  };
}

function normalizarPlan(plan, candidatos, maxTappe, minutosMin, minutosMax) {
  const porId = new Map(candidatos.map((fila) => [fila.candidatoId, fila]));
  const vistos = new Set();
  const seleccionados = [];
  for (const tappa of plan.tappe ?? []) {
    if (!porId.has(tappa.attivitaId) || vistos.has(tappa.attivitaId)) continue;
    vistos.add(tappa.attivitaId);
    seleccionados.push(porId.get(tappa.attivitaId));
    if (seleccionados.length >= maxTappe) break;
  }

  const tappe = [];
  for (let indice = 0; indice < seleccionados.length; indice += 1) {
    const candidato = seleccionados[indice];
    const anterior = seleccionados[indice - 1];
    const minuti = anterior ? minutosViaje(anterior, candidato) : 0;
    const mismaCiudad =
      anterior && String(anterior.citta ?? '').toLowerCase() === String(candidato.citta ?? '').toLowerCase();
    if (!anterior) {
      tappe.push({ attivitaId: candidato.candidatoId, ordine: 1, minutiDaPrecedente: 0 });
      continue;
    }
    if (minuti == null || minuti > minutosMax || (!mismaCiudad && minuti < minutosMin)) return null;
    tappe.push({ attivitaId: candidato.candidatoId, ordine: indice + 1, minutiDaPrecedente: minuti });
  }

  return {
    tappe,
    riepilogo: String(plan.riepilogo ?? 'Programma generato.').slice(0, 1500)
  };
}

export async function generarProgramacion({ data, tecnicoId, maxTappe, minutosMin, minutosMax, usuarioId }) {
  return enTransaccion(async (conexion) => {
    const candidatos = await listarCandidatos({ fecha: data, conexion });
    if (!candidatos.length) throw new Error('Non ci sono manutenzioni da programmare per questa data');

    const matriz = matrizViaje(candidatos);
    let plan = null;
    let origen = 'fallback';
    let payloadIa = null;
    try {
      plan = await generarProgramaConIa({
        data,
        tecnico: tecnicoId,
        maxTappe,
        minutiMin,
        minutiMax,
        candidatos,
        matriceViaggio: matriz
      });
      if (plan) origen = 'ia';
    } catch (error) {
      payloadIa = { errore: error.message };
    }

    if (!plan?.tappe?.length) plan = planDeterminista(candidatos, { maxTappe, minutosMin, minutosMax });
    plan = normalizarPlan(plan, candidatos, maxTappe, minutosMin, minutosMax);
    if (!plan?.tappe?.length) {
      plan = planDeterminista(candidatos, { maxTappe, minutosMin, minutosMax });
      origen = 'fallback';
      plan = normalizarPlan(plan, candidatos, maxTappe, minutosMin, minutosMax);
    }
    if (!plan?.tappe?.length) throw new Error('Non è stato possibile costruire un giro valido');

    const id = nuevoId();
    await conexion.execute(
      `INSERT INTO programmazioni
        (id,data,fk_tecnico,stato,max_tappe,minuti_min,minuti_max,origine,riepilogo,payload_ia,utente_crea,utente_modifica)
       VALUES (?,?,?,'pianificata',?,?,?,?,?,?,?,?)`,
      [
        id,
        data,
        tecnicoId,
        maxTappe,
        minutosMin,
        minutosMax,
        origen,
        plan.riepilogo,
        payloadIa ? JSON.stringify(payloadIa) : null,
        usuarioId,
        usuarioId
      ]
    );

    for (const tappa of plan.tappe) {
      const candidato = candidatos.find((fila) => fila.candidatoId === tappa.attivitaId);
      if (!candidato) continue;
      const actividadId = await crearActividad(
        conexion,
        {
          clienteId: candidato.clienteId,
          macchinaId: candidato.macchinaId,
          tecnici: [tecnicoId],
          osservazione: `Manutenzione programmata: ${candidato.pezzo ?? 'controllo macchina'} ogni ${candidato.frequenza_mesi} mesi.`,
          scadenza: String(candidato.prossima_manutenzione).slice(0, 10),
          priorita: 'normale',
          richiedeAppuntamento: true,
          fkProgrammazione: id,
          ordineTappa: tappa.ordine,
          minutiDaPrecedente: tappa.minutiDaPrecedente
        },
        usuarioId
      );
      await conexion.execute(
        'UPDATE calendario_manutenzioni_macchine SET fk_attivita=?,stato_calendario="programmato",utente_modifica=? WHERE id=?',
        [actividadId, usuarioId, candidato.candidatoId]
      );
    }

    return { id, origine: origen, tappe: plan.tappe.length, riepilogo: plan.riepilogo };
  });
}

export async function listarProgramaciones(usuario) {
  const esTecnico = usuario.ruolo === 'tecnico';
  return consultar(
    `SELECT p.id,p.data,p.fk_tecnico,p.stato,p.max_tappe,p.minuti_min,p.minuti_max,p.origine,p.riepilogo,
            MAX(u.nome) tecnico,
            COUNT(a.id) tappe,
            COALESCE(SUM(a.stato_attivita='completata'),0) completate
       FROM programmazioni p
       LEFT JOIN utenti u ON u.id=p.fk_tecnico
       LEFT JOIN attivita a ON a.fk_programmazione=p.id AND a.stato='attivo'
      WHERE p.stato_registro='attivo'${esTecnico ? ' AND (p.fk_tecnico=? OR p.fk_tecnico IS NULL)' : ''}
      GROUP BY p.id
      ORDER BY p.data DESC,p.creato_at DESC`,
    esTecnico ? [usuario.sub] : []
  );
}

export async function obtenerProgramacion(id, usuario) {
  const esTecnico = usuario.ruolo === 'tecnico';
  const programacion = await consultarUno(
    `SELECT p.id,p.data,p.fk_tecnico,p.stato,p.max_tappe,p.minuti_min,p.minuti_max,p.origine,p.riepilogo,p.creato_at,p.modificato_at,u.nome tecnico
       FROM programmazioni p LEFT JOIN utenti u ON u.id=p.fk_tecnico
      WHERE p.id=? AND p.stato_registro='attivo'${esTecnico ? ' AND (p.fk_tecnico=? OR p.fk_tecnico IS NULL)' : ''}`,
    esTecnico ? [id, usuario.sub] : [id]
  );
  if (!programacion) return null;
  const tappe = await consultar(
    `SELECT a.id,a.ordine_tappa,a.minuti_da_precedente,a.stato_attivita,a.osservazione,a.scadenza,
            c.id cliente_id,c.nome cliente,c.indirizzo,c.citta,c.url_mappe,
            m.codice_unico,m.modello,m.matricola
       FROM attivita a
       JOIN clienti c ON c.id=a.fk_cliente
       LEFT JOIN macchine m ON m.id=a.fk_macchina
      WHERE a.fk_programmazione=? AND a.stato='attivo'
      ORDER BY a.ordine_tappa,a.id`,
    [id]
  );
  return { ...programacion, tappe };
}

export async function tomarProgramacion(id, usuario) {
  const programacion = await consultarUno(
    "SELECT id,fk_tecnico,stato FROM programmazioni WHERE id=? AND stato_registro='attivo'",
    [id]
  );
  if (!programacion) return { estado: 'no_encontrada' };
  if (programacion.fk_tecnico && programacion.fk_tecnico !== usuario.sub && usuario.ruolo === 'tecnico') {
    return { estado: 'ajena' };
  }
  if (usuario.ruolo === 'tecnico' && !programacion.fk_tecnico) {
    await consultar("UPDATE programmazioni SET fk_tecnico=?,stato='in_corso',utente_modifica=? WHERE id=?", [
      usuario.sub,
      usuario.sub,
      id
    ]);
  } else if (programacion.stato === 'pianificata') {
    await consultar("UPDATE programmazioni SET stato='in_corso',utente_modifica=? WHERE id=?", [usuario.sub, id]);
  }
  return { estado: 'ok' };
}

export async function actualizarEstadoProgramacion(id, estado, usuario) {
  const programacion = await consultarUno(
    "SELECT id,fk_tecnico FROM programmazioni WHERE id=? AND stato_registro='attivo'",
    [id]
  );
  if (!programacion) return false;
  if (usuario.ruolo === 'tecnico' && programacion.fk_tecnico && programacion.fk_tecnico !== usuario.sub) return false;
  await consultar('UPDATE programmazioni SET stato=?,utente_modifica=? WHERE id=?', [estado, usuario.sub, id]);
  return true;
}

export async function actualizarEstadoActividad(id, estado, usuario) {
  const actividad = await consultarUno(
    `SELECT a.id,a.fk_assegnato,a.fk_programmazione,a.stato,
            EXISTS(SELECT 1 FROM attivita_tecnici at WHERE at.fk_attivita=a.id AND at.fk_tecnico=? AND at.stato='attivo') asignado
       FROM attivita a WHERE a.id=? AND a.stato='attivo'`,
    [usuario.sub, id]
  );
  if (!actividad) return { estado: 'no_encontrada' };
  if (
    usuario.ruolo === 'tecnico' &&
    actividad.fk_assegnato !== usuario.sub &&
    !Number(actividad.asignado)
  ) {
    return { estado: 'ajena' };
  }
  await consultar('UPDATE attivita SET stato_attivita=?,utente_modifica=? WHERE id=?', [estado, usuario.sub, id]);
  if (estado === 'completata') {
    await consultar(
      'UPDATE calendario_manutenzioni_macchine SET stato_calendario="eseguito",fk_attivita=NULL,utente_modifica=? WHERE fk_attivita=?',
      [usuario.sub, id]
    );
  }

  if (actividad.fk_programmazione) {
    const pendientes = await consultarUno(
      "SELECT COUNT(*) total FROM attivita WHERE fk_programmazione=? AND stato='attivo' AND stato_attivita<>'completata'",
      [actividad.fk_programmazione]
    );
    if (Number(pendientes?.total ?? 0) === 0) {
      await consultar("UPDATE programmazioni SET stato='completata',utente_modifica=? WHERE id=?", [
        usuario.sub,
        actividad.fk_programmazione
      ]);
    }
  }
  return { estado: 'ok', programmazioneId: actividad.fk_programmazione };
}
