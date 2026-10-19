import { Router } from 'express';
import { consultar, consultarUno, enTransaccion } from '../../base-datos/pool.js';
import { alcanceTecnico, exigirSesion } from '../../intermedios/sesion.js';
import { nuevoId } from '../../utilidades/identificadores.js';
import { crearIntervento } from '../interventos/servicio.js';
import { obtenerParametros } from '../parametros/servicio.js';
import { esquemaBoleta, esquemaEstadoBoleta } from './esquemas.js';
import { calcularTotales, proximoCodigoBoleta } from './servicio.js';

export const rutasBoletas = Router();

async function puedeAccederBoleta(req, id) {
  if (req.utente.ruolo !== 'tecnico') return true;
  const fila = await consultarUno('SELECT id FROM boletas WHERE id=? AND fk_tecnico=?', [id, req.utente.sub]);
  return Boolean(fila);
}

rutasBoletas.get('/boletas', exigirSesion, async (req, res) => {
  const alcance = alcanceTecnico(req, 'b.fk_tecnico');
  const filas = await consultar(
    'SELECT b.id,b.codice_boleta,b.data,b.prezzo_totale,b.stato,c.nome cliente,c.indirizzo,u.nome tecnico,mq.codice_unico,mq.modello,COALESCE(f.nome,ma.nome) marca,m.esito FROM boletas b JOIN clienti c ON c.id=b.fk_cliente JOIN utenti u ON u.id=b.fk_tecnico JOIN boletas_manutenzioni bm ON bm.fk_boleta=b.id AND bm.stato="attivo" JOIN manutenzioni m ON m.id=bm.fk_manutenzione JOIN boletas_macchine bmq ON bmq.fk_boleta=b.id AND bmq.stato="attivo" JOIN macchine mq ON mq.id=bmq.fk_macchina LEFT JOIN fornitori f ON f.id=mq.fk_fornitore LEFT JOIN marche ma ON ma.id=mq.fk_marca WHERE b.stato<>"annullata"' +
      alcance.sql +
      ' ORDER BY b.data DESC,b.id DESC',
    alcance.valores
  );
  res.json(filas);
});

rutasBoletas.get('/boletas/:id', exigirSesion, async (req, res) => {
  if (!(await puedeAccederBoleta(req, req.params.id))) {
    return res.status(403).json({ errore: 'Boleta non assegnata' });
  }
  const boleta = (await consultar(
    'SELECT b.id,b.codice_boleta,b.data,b.prezzo_totale,b.stato,b.fk_scontrino,c.id cliente_id,c.nome cliente,c.indirizzo,u.nome tecnico,m.id manutenzione_id,m.ubicazione,m.note,m.esito,m.ore,m.ora,m.persone,mq.id macchina_id,mq.codice_unico,mq.modello,COALESCE(f.nome,ma.nome) marca FROM boletas b JOIN clienti c ON c.id=b.fk_cliente JOIN utenti u ON u.id=b.fk_tecnico JOIN boletas_manutenzioni bm ON bm.fk_boleta=b.id AND bm.stato="attivo" JOIN manutenzioni m ON m.id=bm.fk_manutenzione JOIN boletas_macchine bmq ON bmq.fk_boleta=b.id AND bmq.stato="attivo" JOIN macchine mq ON mq.id=bmq.fk_macchina LEFT JOIN fornitori f ON f.id=mq.fk_fornitore LEFT JOIN marche ma ON ma.id=mq.fk_marca WHERE b.id=?',
    [req.params.id]
  ))[0];
  if (!boleta) return res.status(404).json({ errore: 'Boleta non trovata' });

  const ricambi = await consultar(
    'SELECT p.nome,p.codice_unico,pm.quantita,pm.prezzo_unitario FROM pezzi_manutenzioni pm JOIN pezzi p ON p.id=pm.fk_pezzo WHERE pm.fk_manutenzione=? AND pm.stato="attivo"',
    [boleta.manutenzione_id]
  );
  const prossime = await consultar(
    'SELECT c.prossima_manutenzione,c.frequenza_mesi,p.nome pezzo FROM calendario_manutenzioni_macchine c LEFT JOIN pezzi p ON p.id=c.fk_pezzo WHERE c.fk_macchina=? AND c.stato="attivo" AND c.stato_calendario<>"sospeso" ORDER BY c.prossima_manutenzione',
    [boleta.macchina_id]
  );
  const totales = calcularTotales(
    ricambi.reduce((suma, recambio) => suma + Number(recambio.prezzo_unitario) * Number(recambio.quantita), 0),
    Number(boleta.ore ?? 0),
    Number(boleta.persone ?? 1),
    (await obtenerParametros()).tariffa_manodopera_ora
  );
  return res.json({ ...boleta, ricambi, prossime, totales });
});

rutasBoletas.post('/boletas', exigirSesion, async (req, res) => {
  const entrada = esquemaBoleta.safeParse(req.body);
  if (!entrada.success) {
    return res.status(422).json({ errore: 'Dati boleta non validi', dettagli: entrada.error.flatten() });
  }

  try {
    const creada = await enTransaccion(async (conexion) => {
      const intervento = await crearIntervento(conexion, entrada.data, req.utente.sub);
      const codice = await proximoCodigoBoleta(conexion, entrada.data.data);
      const parametros = await obtenerParametros(conexion);
      const totales = calcularTotales(
        intervento.recambios.totale,
        entrada.data.ore,
        entrada.data.persone,
        parametros.tariffa_manodopera_ora
      );
      const boletaId = nuevoId();
      await conexion.execute(
        'INSERT INTO boletas (id,fk_cliente,fk_tecnico,fk_scontrino,codice_boleta,data,prezzo_totale,utente_crea,utente_modifica,stato) VALUES (?,?,?,?,?,?,?,?,?,"emessa")',
        [
          boletaId,
          intervento.clienteId,
          req.utente.sub,
          entrada.data.scontrinoId ?? null,
          codice,
          entrada.data.data,
          totales.total,
          req.utente.sub,
          req.utente.sub
        ]
      );
      await conexion.execute(
        'INSERT INTO boletas_manutenzioni (fk_boleta,fk_manutenzione,utente_crea,utente_modifica) VALUES (?,?,?,?)',
        [boletaId, intervento.id, req.utente.sub, req.utente.sub]
      );
      await conexion.execute(
        'INSERT INTO boletas_macchine (fk_boleta,fk_macchina,utente_crea,utente_modifica) VALUES (?,?,?,?)',
        [boletaId, entrada.data.macchinaId, req.utente.sub, req.utente.sub]
      );
      await conexion.execute(
        'INSERT INTO boletas_operatori (fk_boleta,fk_operatore,utente_crea,utente_modifica) VALUES (?,?,?,?)',
        [boletaId, req.utente.sub, req.utente.sub, req.utente.sub]
      );
      if (entrada.data.scontrinoId) {
        await conexion.execute(
          'UPDATE scontrini SET fk_cliente=?,stato_analisi="confermato",utente_modifica=? WHERE id=?',
          [intervento.clienteId, req.utente.sub, entrada.data.scontrinoId]
        );
      }
      return {
        id: boletaId,
        codice,
        manutenzioneId: intervento.id,
        prezzoTotale: totales.total,
        prossimeManutenzioni: intervento.programados
      };
    });
    return res.status(201).json(creada);
  } catch (error) {
    return res.status(400).json({ errore: error.message || 'Impossibile creare la boleta' });
  }
});

rutasBoletas.put('/boletas/:id', exigirSesion, async (req, res) => {
  const estado = esquemaEstadoBoleta.safeParse(req.body.stato);
  if (!estado.success) return res.status(422).json({ errore: 'Stato non valido' });
  if (!(await puedeAccederBoleta(req, req.params.id))) {
    return res.status(403).json({ errore: 'Boleta non assegnata' });
  }

  const boleta = await consultarUno('SELECT id FROM boletas WHERE id=?', [req.params.id]);
  if (!boleta) return res.status(404).json({ errore: 'Boleta non trovata' });

  await consultar('UPDATE boletas SET stato=?,utente_modifica=? WHERE id=?', [estado.data, req.utente.sub, req.params.id]);
  return res.json({ id: req.params.id, stato: estado.data });
});
