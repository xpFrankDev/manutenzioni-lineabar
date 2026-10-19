import { consultarUno } from '../../base-datos/pool.js';
import { nuevoId } from '../../utilidades/identificadores.js';
import { programarCalendario } from '../calendario/servicio.js';
import { otorgarAccesoMaquina } from '../maquinas/servicio.js';

/** Agrupa líneas repetidas del mismo ricambio antes de consultar precios. */
export function agruparRecambios(recambios = []) {
  const agrupados = new Map();
  for (const recambio of recambios) {
    const cantidad = Number(recambio.quantita);
    agrupados.set(recambio.pezzoId, (agrupados.get(recambio.pezzoId) ?? 0) + cantidad);
  }
  return [...agrupados.entries()].map(([pezzoId, quantita]) => ({ pezzoId, quantita }));
}

export async function calcularRecambios(conexion, recambios) {
  const lineas = agruparRecambios(recambios);
  if (!lineas.length) return { totale: 0, righe: [] };

  const identificadores = lineas.map((linea) => linea.pezzoId);
  const marcadores = identificadores.map(() => '?').join(',');
  const [piezas] = await conexion.query(
    `SELECT id,prezzo,intervallo_mesi FROM pezzi WHERE stato="attivo" AND id IN (${marcadores})`,
    identificadores
  );
  if (piezas.length !== identificadores.length) {
    throw new Error('Uno o più ricambi non sono disponibili');
  }

  const precios = new Map(piezas.map((pieza) => [pieza.id, pieza]));
  return {
    totale: lineas.reduce((suma, linea) => suma + Number(precios.get(linea.pezzoId).prezzo) * linea.quantita, 0),
    righe: lineas.map((linea) => ({
      pezzoId: linea.pezzoId,
      quantita: linea.quantita,
      prezzo: Number(precios.get(linea.pezzoId).prezzo),
      intervalloMeses: precios.get(linea.pezzoId).intervallo_mesi ? Number(precios.get(linea.pezzoId).intervallo_mesi) : null
    }))
  };
}

export async function validarDestino(conexion, entrada) {
  const maquina = await consultarUno('SELECT id,fk_cliente,tipo_macchina,stato FROM macchine WHERE id=?', [entrada.macchinaId], conexion);
  if (!maquina || maquina.stato !== 'attivo') throw new Error('Macchina non disponibile');

  const clienteId = entrada.clienteId ?? maquina.fk_cliente;
  if (String(clienteId) !== String(maquina.fk_cliente)) {
    throw new Error('La macchina non appartiene al cliente selezionato');
  }
  const cliente = await consultarUno('SELECT id,stato FROM clienti WHERE id=?', [clienteId], conexion);
  if (!cliente || cliente.stato !== 'attivo') throw new Error('Cliente non disponibile');

  return { maquina, clienteId };
}

export async function crearIntervento(conexion, entrada, tecnicoId) {
  const { maquina, clienteId } = await validarDestino(conexion, entrada);
  const recambios = await calcularRecambios(conexion, entrada.ricambi);

  const manutencionId = nuevoId();
  await conexion.execute(
    'INSERT INTO manutenzioni (id,fk_cliente,fk_tecnico,data,ubicazione,note,esito,ore,persone,utente_crea,utente_modifica) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [
      manutencionId,
      clienteId,
      tecnicoId,
      entrada.data,
      entrada.ubicazione,
      entrada.note || null,
      entrada.esito,
      entrada.ore,
      entrada.persone,
      tecnicoId,
      tecnicoId
    ]
  );
  await conexion.execute(
    'INSERT INTO macchine_manutenzioni (fk_macchina,fk_manutenzione,utente_crea,utente_modifica) VALUES (?,?,?,?)',
    [maquina.id, manutencionId, tecnicoId, tecnicoId]
  );
  await otorgarAccesoMaquina(conexion, maquina.id, tecnicoId);
  for (const riga of recambios.righe) {
    await conexion.execute(
      'INSERT INTO pezzi_manutenzioni (fk_manutenzione,fk_pezzo,quantita,prezzo_unitario,utente_crea,utente_modifica) VALUES (?,?,?,?,?,?)',
      [manutencionId, riga.pezzoId, riga.quantita, riga.prezzo, tecnicoId, tecnicoId]
    );
  }

  const programados = await programarCalendario(conexion, {
    macchinaId: maquina.id,
    fecha: entrada.data,
    manutencionId,
    recambios: recambios.righe,
    usuarioId: tecnicoId
  });

  await conexion.execute(
    'UPDATE clienti SET ultimo_manutenzione=GREATEST(COALESCE(ultimo_manutenzione,?),?),utente_modifica=? WHERE id=?',
    [entrada.data, entrada.data, tecnicoId, clienteId]
  );

  return { id: manutencionId, clienteId, recambios, programados };
}

/** Un técnico solo accede a los interventos que registró él mismo. */
export async function puedeAccederIntervento(req, id) {
  if (req.utente.ruolo !== 'tecnico') return true;
  const fila = await consultarUno('SELECT id FROM manutenzioni WHERE id=? AND fk_tecnico=?', [id, req.utente.sub]);
  return Boolean(fila);
}
