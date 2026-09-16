import { consultarUno } from '../../base-datos/pool.js';

export async function calcularRecambios(conexion, recambios) {
  if (!recambios.length) return { totale: 0, righe: [] };

  const identificadores = recambios.map((recambio) => recambio.pezzoId);
  const marcadores = identificadores.map(() => '?').join(',');
  const [piezas] = await conexion.query(
    `SELECT id,prezzo FROM pezzi WHERE stato="attivo" AND id IN (${marcadores})`,
    identificadores
  );
  if (piezas.length !== identificadores.length) {
    throw new Error('Uno o più ricambi non sono disponibili');
  }

  const precios = new Map(piezas.map((pieza) => [pieza.id, Number(pieza.prezzo)]));
  return {
    totale: recambios.reduce((suma, recambio) => suma + precios.get(recambio.pezzoId) * Number(recambio.quantita), 0),
    righe: recambios.map((recambio) => ({ ...recambio, prezzo: precios.get(recambio.pezzoId) }))
  };
}

export async function crearIntervento(conexion, entrada, tecnicoId) {
  let { clienteId } = entrada;
  if (clienteId === undefined || clienteId === null) {
    const maquina = await consultarUno('SELECT fk_cliente FROM macchine WHERE id=?', [entrada.macchinaId], conexion);
    clienteId = maquina?.fk_cliente ?? null;
  }

  const recambios = await calcularRecambios(conexion, entrada.ricambi);
  const [manutencion] = await conexion.execute(
    'INSERT INTO manutenzioni (fk_cliente,fk_tecnico,data,ubicazione,note,esito,utente_crea,utente_modifica) VALUES (?,?,?,?,?,?,?,?)',
    [clienteId, tecnicoId, entrada.data, entrada.ubicazione, entrada.note || null, entrada.esito, tecnicoId, tecnicoId]
  );
  await conexion.execute(
    'INSERT INTO macchine_manutenzioni (fk_macchina,fk_manutenzione,utente_crea,utente_modifica) VALUES (?,?,?,?)',
    [entrada.macchinaId, manutencion.insertId, tecnicoId, tecnicoId]
  );
  for (const riga of recambios.righe) {
    await conexion.execute(
      'INSERT INTO pezzi_manutenzioni (fk_manutenzione,fk_pezzo,quantita,prezzo_unitario,utente_crea,utente_modifica) VALUES (?,?,?,?,?,?)',
      [manutencion.insertId, riga.pezzoId, riga.quantita, riga.prezzo, tecnicoId, tecnicoId]
    );
  }

  return { id: manutencion.insertId, clienteId, recambios };
}
