import { consultar, consultarUno } from '../../base-datos/pool.js';
import { esTecnico } from '../../intermedios/sesion.js';
import { nuevoId } from '../../utilidades/identificadores.js';
import { crearIntervento } from '../interventos/servicio.js';
import { otorgarAccesoMaquina } from '../maquinas/servicio.js';
import { empresaActual } from '../../intermedios/contexto-empresa.js';

const DIA_MS = 86400000;

const PALABRAS_IGNORADAS = new Set(['cliente','signor','signora','bar','caffe','caffè','problema','guasto','macchina','presso','segnala','riporta','detto','detto','che','con','per','una','uno','del','della','dei','delle','non','funziona','oggi','domani','urgenza']);

function normalizarTexto(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function puntuacionCliente(texto, cliente) {
  const consulta = normalizarTexto(texto);
  const nombre = normalizarTexto(cliente.nome);
  const palabras = nombre.split(/\s+/).filter((palabra) => palabra.length > 2);
  let puntuacion = consulta.includes(nombre) ? 12 : 0;
  for (const palabra of palabras) {
    if (consulta.includes(palabra)) puntuacion += 2;
  }
  if (consulta.includes(normalizarTexto(cliente.codice))) puntuacion += 8;
  return puntuacion;
}

function puntuacionMaquina(texto, maquina) {
  const consulta = normalizarTexto(texto);
  let puntuacion = 0;
  for (const valor of [maquina.codice_unico, maquina.matricola, maquina.modello]) {
    const buscado = normalizarTexto(valor);
    if (buscado && consulta.includes(buscado)) puntuacion += 10;
  }
  return puntuacion;
}

export async function interpretarActividad(texto) {
  const consulta = String(texto ?? '').trim();
  if (consulta.length < 5) throw new Error('Testo troppo breve');
  const clientes = await consultar(
    'SELECT id,codice,nome,citta,indirizzo FROM clienti WHERE fk_azienda=? AND stato="attivo"',
    [empresaActual()]
  );
  const maquinas = await consultar(
    'SELECT m.id,m.codice_unico,m.matricola,m.modello,m.fk_cliente,c.nome cliente,COALESCE(ma.nome,"") marca FROM macchine m JOIN clienti c ON c.id=m.fk_cliente LEFT JOIN marche ma ON ma.id=m.fk_marca WHERE m.fk_azienda=? AND m.stato="attivo" AND c.stato="attivo"',
    [empresaActual()]
  );
  const ordenados = clientes
    .map((cliente) => ({ cliente, puntuacion: puntuacionCliente(consulta, cliente) }))
    .sort((a, b) => b.puntuacion - a.puntuacion);
  const cliente = ordenados[0]?.puntuacion > 0 ? ordenados[0].cliente : null;
  const candidatas = maquinas
    .filter((maquina) => !cliente || String(maquina.fk_cliente) === String(cliente.id))
    .map((maquina) => ({ maquina, puntuacion: puntuacionMaquina(consulta, maquina) }))
    .sort((a, b) => b.puntuacion - a.puntuacion);
  const maquina = candidatas[0]?.puntuacion > 0 ? candidatas[0].maquina : null;
  const tokens = normalizarTexto(consulta)
    .split(/[^a-z0-9àèéìòù]+/i)
    .filter((token) => token.length > 3 && !PALABRAS_IGNORADAS.has(token));
  const prioridad = /urgent|subito|guasto|non funziona|perso|perde|acqua|fumo/i.test(consulta)
    ? 'alta'
    : 'normale';
  return {
    clienteId: cliente?.id ?? null,
    cliente: cliente?.nome ?? null,
    macchinaId: maquina?.id ?? null,
    macchina: maquina ? `${maquina.marca} ${maquina.modello}`.trim() : null,
    osservazione: consulta,
    priorita: prioridad,
    paroleChiave: tokens.slice(0, 8)
  };
}

/** Si una tarea lleva más de 30 días vencida, la prioridad pasa a alta. */
export function prioridadExplicada(scadenza, priorita) {
  if (!scadenza) return { priorita, motivo: null, auto: 0 };
  const hoy = new Date().toISOString().slice(0, 10);
  const dias = Math.floor((Date.parse(`${hoy}T12:00:00Z`) - Date.parse(`${scadenza}T12:00:00Z`)) / DIA_MS);
  if (dias >= 30) {
    return {
      priorita: 'alta',
      motivo: `Manutenzione scaduta da ${dias} giorni (oltre 30): priorità alta automatica.`,
      auto: 1
    };
  }
  return { priorita, motivo: null, auto: 0 };
}

export async function puedeAccederActividad(req, id) {
  if (!esTecnico(req)) return true;
  const asignacion = await consultarUno(
    'SELECT 1 ok FROM attivita_tecnici at JOIN attivita a ON a.id=at.fk_attivita WHERE at.fk_attivita=? AND at.fk_tecnico=? AND at.stato="attivo" AND a.fk_azienda=? AND a.stato="attivo"',
    [id, req.utente.sub, empresaActual()]
  );
  return Boolean(asignacion);
}

export async function listarActividades(req) {
  const tecnico = esTecnico(req);
  const filtro = tecnico
    ? ' JOIN attivita_tecnici atf ON atf.fk_attivita=a.id AND atf.fk_tecnico=? AND atf.stato="attivo"'
    : '';
  return consultar(
    'SELECT a.id,a.titolo,a.osservazione,a.richiede_appuntamento,a.scadenza,a.priorita,a.motivo_priorita,a.priorita_auto,a.fk_tipo_lavoro,a.durata_stimata_minuti,a.stato_attivita,a.descrizione_chiusura,a.fk_manutenzione_chiusura,c.nome cliente,c.indirizzo,m.codice_unico,m.modello,COALESCE(f.nome,ma.nome) marca,GROUP_CONCAT(DISTINCT u.nome ORDER BY u.nome SEPARATOR ", ") tecnici FROM attivita a' +
      filtro +
      ' LEFT JOIN clienti c ON c.id=a.fk_cliente LEFT JOIN macchine m ON m.id=a.fk_macchina LEFT JOIN fornitori f ON f.id=m.fk_fornitore LEFT JOIN marche ma ON ma.id=m.fk_marca LEFT JOIN attivita_tecnici at ON at.fk_attivita=a.id AND at.stato="attivo" LEFT JOIN utenti u ON u.id=at.fk_tecnico WHERE a.stato="attivo" AND a.fk_azienda=? GROUP BY a.id ORDER BY FIELD(a.stato_attivita,"in_viaggio","in_corso","aperta","completata"),a.scadenza,a.priorita',
    tecnico ? [req.utente.sub, empresaActual()] : [empresaActual()]
  );
}

export async function contarPendientes(req) {
  const tecnico = esTecnico(req);
  const fila = await consultarUno(
    tecnico
      ? 'SELECT COUNT(DISTINCT a.id) totale FROM attivita a JOIN attivita_tecnici atf ON atf.fk_attivita=a.id WHERE atf.fk_tecnico=? AND atf.stato="attivo" AND a.stato="attivo" AND a.fk_azienda=? AND a.stato_attivita<>"completata"'
      : 'SELECT COUNT(*) totale FROM attivita WHERE stato="attivo" AND fk_azienda=? AND stato_attivita<>"completata"',
    tecnico ? [req.utente.sub, empresaActual()] : [empresaActual()]
  );
  return Number(fila.totale);
}

export async function obtenerActividad(id) {
  const actividad = (await consultar(
    'SELECT a.*,c.nome cliente,c.indirizzo,m.id macchina_id,m.codice_unico,m.modello,COALESCE(f.nome,ma.nome) marca FROM attivita a LEFT JOIN clienti c ON c.id=a.fk_cliente LEFT JOIN macchine m ON m.id=a.fk_macchina LEFT JOIN fornitori f ON f.id=m.fk_fornitore LEFT JOIN marche ma ON ma.id=m.fk_marca WHERE a.id=? AND a.fk_azienda=?',
    [id, empresaActual()]
  ))[0];
  if (!actividad) return null;

  const tecnici = await consultar(
    'SELECT u.id,u.nome FROM attivita_tecnici at JOIN utenti u ON u.id=at.fk_tecnico WHERE at.fk_attivita=? AND at.stato="attivo"',
    [id]
  );
  return { ...actividad, tecnici };
}

export async function crearActividad(conexion, datos, usuarioId) {
  const empresaId = empresaActual();
  const cliente = await consultarUno('SELECT id FROM clienti WHERE id=? AND fk_azienda=? AND stato="attivo"', [datos.clienteId, empresaId], conexion);
  const maquina = await consultarUno('SELECT id FROM macchine WHERE id=? AND fk_azienda=? AND fk_cliente=? AND stato="attivo"', [datos.macchinaId, empresaId, datos.clienteId], conexion);
  if (!cliente || !maquina) throw new Error('Cliente o macchina non disponibili');
  if (datos.tecnici?.length) {
    const marcadores = datos.tecnici.map(() => '?').join(',');
    const tecnicos = await consultar(`SELECT id FROM utenti WHERE fk_azienda=? AND stato="attivo" AND id IN (${marcadores})`, [empresaId, ...datos.tecnici], conexion);
    if (tecnicos.length !== datos.tecnici.length) throw new Error('Tecnico non disponibile');
  }
  const id = nuevoId();
  const prioridad = prioridadExplicada(datos.scadenza, datos.priorita ?? 'normale');
  await conexion.execute(
    'INSERT INTO attivita (id,fk_azienda,fk_cliente,fk_macchina,fk_assegnato,fk_programmazione,fk_tipo_lavoro,durata_stimata_minuti,ordine_tappa,minuti_da_precedente,titolo,osservazione,richiede_appuntamento,scadenza,priorita,motivo_priorita,priorita_auto,utente_crea,utente_modifica) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [
      id,
      empresaId,
      datos.clienteId,
      datos.macchinaId,
      datos.tecnici[0],
      datos.fkProgrammazione ?? null,
      datos.fkTipoLavoro ?? null,
      datos.durataStimataMinuti ?? null,
      datos.ordineTappa ?? null,
      datos.minutiDaPrecedente ?? null,
      'Manutenzione programmata',
      datos.osservazione,
      datos.richiedeAppuntamento ? 1 : 0,
      datos.scadenza,
      prioridad.priorita,
      prioridad.motivo,
      prioridad.auto,
      usuarioId,
      usuarioId
    ]
  );
  for (const tecnico of datos.tecnici) {
    await conexion.execute(
      'INSERT INTO attivita_tecnici (fk_attivita,fk_tecnico,utente_crea,utente_modifica) VALUES (?,?,?,?)',
      [id, tecnico, usuarioId, usuarioId]
    );
    if (datos.macchinaId) await otorgarAccesoMaquina(conexion, datos.macchinaId, tecnico);
  }
  return id;
}

export async function actualizarActividad(conexion, id, datos, usuarioId) {
  const prioridad = prioridadExplicada(datos.scadenza, datos.priorita ?? 'normale');
  await conexion.execute(
    'UPDATE attivita SET fk_cliente=?,fk_macchina=?,fk_assegnato=?,osservazione=?,richiede_appuntamento=?,scadenza=?,priorita=?,motivo_priorita=?,priorita_auto=?,utente_modifica=? WHERE id=? AND fk_azienda=?',
    [
      datos.clienteId,
      datos.macchinaId,
      datos.tecnici[0],
      datos.osservazione,
      datos.richiedeAppuntamento ? 1 : 0,
      datos.scadenza,
      prioridad.priorita,
      prioridad.motivo,
      prioridad.auto,
      usuarioId,
      id,
      empresaActual()
    ]
  );
  await conexion.execute('UPDATE attivita_tecnici SET stato="inattivo",utente_modifica=? WHERE fk_attivita=?', [usuarioId, id]);
  for (const tecnico of datos.tecnici) {
    await conexion.execute(
      'INSERT INTO attivita_tecnici (fk_attivita,fk_tecnico,utente_crea,utente_modifica,stato) VALUES (?,?,?,?, "attivo") ON DUPLICATE KEY UPDATE stato="attivo",utente_modifica=VALUES(utente_modifica)',
      [id, tecnico, usuarioId, usuarioId]
    );
  }
}

export async function iniciarActividad(id, usuarioId) {
  await consultar('UPDATE attivita SET stato_attivita="in_corso",utente_modifica=? WHERE id=? AND fk_azienda=? AND stato_attivita="aperta"', [
    usuarioId,
    id,
    empresaActual()
  ]);
}

export async function cerrarActividad(conexion, actividad, datos, usuarioId) {
  const intervento = await crearIntervento(
    conexion,
    {
      clienteId: actividad.fk_cliente,
      macchinaId: actividad.fk_macchina,
      data: new Date().toISOString().slice(0, 10),
      ora: new Date().toTimeString().slice(0, 8),
      ubicazione: 'cliente',
      note: datos.descrizione,
      esito: 'risolto',
      ore: datos.ore,
      persone: datos.persone,
      ricambi: datos.ricambi
    },
    usuarioId
  );
  await conexion.execute(
    'UPDATE attivita SET stato_attivita="completata",descrizione_chiusura=?,fk_manutenzione_chiusura=?,utente_modifica=? WHERE id=? AND fk_azienda=?',
    [datos.descrizione, intervento.id, usuarioId, actividad.id, empresaActual()]
  );
  // La voce di calendario che ha originato la tappa si chiude solo se non è
  // stata già riprogrammata dal ricambio usato nell'intervento.
  await conexion.execute(
    'UPDATE calendario_manutenzioni_macchine SET stato_calendario="eseguito",fk_attivita=NULL,utente_modifica=? WHERE fk_attivita=? AND fk_azienda=? AND (fk_manutenzione_origine IS NULL OR fk_manutenzione_origine<>?)',
    [usuarioId, actividad.id, empresaActual(), intervento.id]
  );
  return intervento.id;
}
