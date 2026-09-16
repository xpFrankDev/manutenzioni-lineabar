import { Router } from 'express';
import { consultar, enTransaccion } from '../../base-datos/pool.js';
import { alcanceTecnico, exigirSesion } from '../../intermedios/sesion.js';
import { crearIntervento } from '../interventos/servicio.js';
import { esquemaBoleta, esquemaEstadoBoleta } from './esquemas.js';
import { calcularTotales, proximoCodigoBoleta } from './servicio.js';

export const rutasBoletas = Router();

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
  const boleta = (await consultar(
    'SELECT b.id,b.codice_boleta,b.data,b.prezzo_totale,b.stato,c.nome cliente,c.indirizzo,u.nome tecnico,m.id manutenzione_id,m.ubicazione,m.note,m.esito,mq.codice_unico,mq.modello,COALESCE(f.nome,ma.nome) marca FROM boletas b JOIN clienti c ON c.id=b.fk_cliente JOIN utenti u ON u.id=b.fk_tecnico JOIN boletas_manutenzioni bm ON bm.fk_boleta=b.id AND bm.stato="attivo" JOIN manutenzioni m ON m.id=bm.fk_manutenzione JOIN boletas_macchine bmq ON bmq.fk_boleta=b.id AND bmq.stato="attivo" JOIN macchine mq ON mq.id=bmq.fk_macchina LEFT JOIN fornitori f ON f.id=mq.fk_fornitore LEFT JOIN marche ma ON ma.id=mq.fk_marca WHERE b.id=?',
    [req.params.id]
  ))[0];
  if (!boleta) return res.status(404).json({ errore: 'Boleta non trovata' });

  const ricambi = await consultar(
    'SELECT p.nome,p.codice_unico,pm.quantita,pm.prezzo_unitario FROM pezzi_manutenzioni pm JOIN pezzi p ON p.id=pm.fk_pezzo WHERE pm.fk_manutenzione=? AND pm.stato="attivo"',
    [boleta.manutenzione_id]
  );
  return res.json({ ...boleta, ricambi });
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
      const totales = calcularTotales(intervento.recambios.totale, entrada.data.ore, entrada.data.persone);
      const [boleta] = await conexion.execute(
        'INSERT INTO boletas (fk_cliente,fk_tecnico,codice_boleta,data,prezzo_totale,utente_crea,utente_modifica,stato) VALUES (?,?,?,?,?,?,?,"emessa")',
        [intervento.clienteId, req.utente.sub, codice, entrada.data.data, totales.total, req.utente.sub, req.utente.sub]
      );
      await conexion.execute(
        'INSERT INTO boletas_manutenzioni (fk_boleta,fk_manutenzione,utente_crea,utente_modifica) VALUES (?,?,?,?)',
        [boleta.insertId, intervento.id, req.utente.sub, req.utente.sub]
      );
      await conexion.execute(
        'INSERT INTO boletas_macchine (fk_boleta,fk_macchina,utente_crea,utente_modifica) VALUES (?,?,?,?)',
        [boleta.insertId, entrada.data.macchinaId, req.utente.sub, req.utente.sub]
      );
      await conexion.execute(
        'INSERT INTO boletas_operatori (fk_boleta,fk_operatore,utente_crea,utente_modifica) VALUES (?,?,?,?)',
        [boleta.insertId, req.utente.sub, req.utente.sub, req.utente.sub]
      );
      return { id: boleta.insertId, codice, manutenzioneId: intervento.id, prezzoTotale: totales.total };
    });
    return res.status(201).json(creada);
  } catch (error) {
    return res.status(400).json({ errore: error.message || 'Impossibile creare la boleta' });
  }
});

rutasBoletas.put('/boletas/:id', exigirSesion, async (req, res) => {
  const estado = esquemaEstadoBoleta.safeParse(req.body.stato);
  if (!estado.success) return res.status(422).json({ errore: 'Stato non valido' });

  await consultar('UPDATE boletas SET stato=?,utente_modifica=? WHERE id=?', [estado.data, req.utente.sub, req.params.id]);
  return res.json({ id: Number(req.params.id), stato: estado.data });
});
