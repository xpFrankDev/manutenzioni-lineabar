import { consultar, consultarUno } from '../../base-datos/pool.js';
import { esTecnico } from '../../intermedios/sesion.js';
import { crearIntervento } from '../interventos/servicio.js';

export async function puedeAccederActividad(req, id) {
  if (!esTecnico(req)) return true;
  const asignacion = await consultarUno(
    'SELECT 1 ok FROM attivita_tecnici WHERE fk_attivita=? AND fk_tecnico=? AND stato="attivo"',
    [id, req.utente.sub]
  );
  return Boolean(asignacion);
}

export async function listarActividades(req) {
  const tecnico = esTecnico(req);
  const filtro = tecnico
    ? ' JOIN attivita_tecnici atf ON atf.fk_attivita=a.id AND atf.fk_tecnico=? AND atf.stato="attivo"'
    : '';
  return consultar(
    'SELECT a.id,a.titolo,a.osservazione,a.richiede_appuntamento,a.scadenza,a.priorita,a.stato_attivita,a.descrizione_chiusura,a.fk_manutenzione_chiusura,c.nome cliente,c.indirizzo,m.codice_unico,m.modello,COALESCE(f.nome,ma.nome) marca,GROUP_CONCAT(DISTINCT u.nome ORDER BY u.nome SEPARATOR ", ") tecnici FROM attivita a' +
      filtro +
      ' LEFT JOIN clienti c ON c.id=a.fk_cliente LEFT JOIN macchine m ON m.id=a.fk_macchina LEFT JOIN fornitori f ON f.id=m.fk_fornitore LEFT JOIN marche ma ON ma.id=m.fk_marca LEFT JOIN attivita_tecnici at ON at.fk_attivita=a.id AND at.stato="attivo" LEFT JOIN utenti u ON u.id=at.fk_tecnico WHERE a.stato="attivo" GROUP BY a.id ORDER BY FIELD(a.stato_attivita,"in_corso","aperta","completata"),a.scadenza,a.priorita',
    tecnico ? [req.utente.sub] : []
  );
}

export async function contarPendientes(req) {
  const tecnico = esTecnico(req);
  const fila = await consultarUno(
    tecnico
      ? 'SELECT COUNT(DISTINCT a.id) totale FROM attivita a JOIN attivita_tecnici atf ON atf.fk_attivita=a.id WHERE atf.fk_tecnico=? AND atf.stato="attivo" AND a.stato="attivo" AND a.stato_attivita<>"completata"'
      : 'SELECT COUNT(*) totale FROM attivita WHERE stato="attivo" AND stato_attivita<>"completata"',
    tecnico ? [req.utente.sub] : []
  );
  return Number(fila.totale);
}

export async function obtenerActividad(id) {
  const actividad = (await consultar(
    'SELECT a.*,c.nome cliente,c.indirizzo,m.codice_unico,m.modello,COALESCE(f.nome,ma.nome) marca FROM attivita a LEFT JOIN clienti c ON c.id=a.fk_cliente LEFT JOIN macchine m ON m.id=a.fk_macchina LEFT JOIN fornitori f ON f.id=m.fk_fornitore LEFT JOIN marche ma ON ma.id=m.fk_marca WHERE a.id=?',
    [id]
  ))[0];
  if (!actividad) return null;

  const tecnici = await consultar(
    'SELECT u.id,u.nome FROM attivita_tecnici at JOIN utenti u ON u.id=at.fk_tecnico WHERE at.fk_attivita=? AND at.stato="attivo"',
    [id]
  );
  return { ...actividad, tecnici };
}

export async function crearActividad(conexion, datos, usuarioId) {
  const [actividad] = await conexion.execute(
    'INSERT INTO attivita (fk_cliente,fk_macchina,fk_assegnato,titolo,osservazione,richiede_appuntamento,scadenza,priorita,utente_crea,utente_modifica) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [
      datos.clienteId,
      datos.macchinaId,
      datos.tecnici[0],
      'Manutenzione programmata',
      datos.osservazione,
      datos.richiedeAppuntamento ? 1 : 0,
      datos.scadenza,
      datos.priorita,
      usuarioId,
      usuarioId
    ]
  );
  for (const tecnico of datos.tecnici) {
    await conexion.execute(
      'INSERT INTO attivita_tecnici (fk_attivita,fk_tecnico,utente_crea,utente_modifica) VALUES (?,?,?,?)',
      [actividad.insertId, tecnico, usuarioId, usuarioId]
    );
  }
  return actividad.insertId;
}

export async function actualizarActividad(conexion, id, datos, usuarioId) {
  await conexion.execute(
    'UPDATE attivita SET fk_cliente=?,fk_macchina=?,fk_assegnato=?,osservazione=?,richiede_appuntamento=?,scadenza=?,priorita=?,utente_modifica=? WHERE id=?',
    [
      datos.clienteId,
      datos.macchinaId,
      datos.tecnici[0],
      datos.osservazione,
      datos.richiedeAppuntamento ? 1 : 0,
      datos.scadenza,
      datos.priorita,
      usuarioId,
      id
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
  await consultar('UPDATE attivita SET stato_attivita="in_corso",utente_modifica=? WHERE id=? AND stato_attivita="aperta"', [
    usuarioId,
    id
  ]);
}

export async function cerrarActividad(conexion, actividad, datos, usuarioId) {
  const intervento = await crearIntervento(
    conexion,
    {
      clienteId: actividad.fk_cliente,
      macchinaId: actividad.fk_macchina,
      data: new Date().toISOString().slice(0, 10),
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
    'UPDATE attivita SET stato_attivita="completata",descrizione_chiusura=?,fk_manutenzione_chiusura=?,utente_modifica=? WHERE id=?',
    [datos.descrizione, intervento.id, usuarioId, actividad.id]
  );
  return intervento.id;
}
