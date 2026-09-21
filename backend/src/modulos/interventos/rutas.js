import { Router } from 'express';
import { consultar, enTransaccion } from '../../base-datos/pool.js';
import { alcanceTecnico, exigirSesion } from '../../intermedios/sesion.js';
import { esquemaIntervento } from './esquemas.js';
import { crearIntervento, puedeAccederIntervento } from './servicio.js';

export const rutasInterventos = Router();

rutasInterventos.get('/interventi', exigirSesion, async (req, res) => {
  const alcance = alcanceTecnico(req);
  const filas = await consultar(
    'SELECT m.id,m.data,m.ubicazione,m.note,m.esito,m.stato,c.nome cliente,c.indirizzo,u.nome tecnico,mq.codice_unico,mq.modello,COALESCE(f.nome,ma.nome) marca,b.id boleta_id,b.codice_boleta FROM manutenzioni m LEFT JOIN clienti c ON c.id=m.fk_cliente JOIN utenti u ON u.id=m.fk_tecnico JOIN macchine_manutenzioni mm ON mm.fk_manutenzione=m.id AND mm.stato="attivo" JOIN macchine mq ON mq.id=mm.fk_macchina LEFT JOIN fornitori f ON f.id=mq.fk_fornitore LEFT JOIN marche ma ON ma.id=mq.fk_marca LEFT JOIN boletas_manutenzioni bm ON bm.fk_manutenzione=m.id AND bm.stato="attivo" LEFT JOIN boletas b ON b.id=bm.fk_boleta AND b.stato<>"annullata" WHERE m.stato="attivo"' +
      alcance.sql +
      ' ORDER BY m.data DESC,m.id DESC',
    alcance.valores
  );
  res.json(filas);
});

rutasInterventos.get('/interventi/:id', exigirSesion, async (req, res) => {
  if (!(await puedeAccederIntervento(req, req.params.id))) {
    return res.status(403).json({ errore: 'Intervento non assegnato' });
  }
  const intervento = (await consultar(
    'SELECT m.*,c.nome cliente,c.indirizzo,mq.codice_unico,mq.modello,COALESCE(f.nome,ma.nome) marca FROM manutenzioni m LEFT JOIN clienti c ON c.id=m.fk_cliente JOIN macchine_manutenzioni mm ON mm.fk_manutenzione=m.id AND mm.stato="attivo" JOIN macchine mq ON mq.id=mm.fk_macchina LEFT JOIN fornitori f ON f.id=mq.fk_fornitore LEFT JOIN marche ma ON ma.id=mq.fk_marca WHERE m.id=?',
    [req.params.id]
  ))[0];
  if (!intervento) return res.status(404).json({ errore: 'Intervento non trovato' });

  const ricambi = await consultar(
    'SELECT p.nome,p.codice_unico,pm.quantita,pm.prezzo_unitario FROM pezzi_manutenzioni pm JOIN pezzi p ON p.id=pm.fk_pezzo WHERE pm.fk_manutenzione=? AND pm.stato="attivo"',
    [req.params.id]
  );
  const prossime = await consultar(
    'SELECT c.prossima_manutenzione,c.frequenza_mesi,p.nome pezzo FROM calendario_manutenzioni_macchine c LEFT JOIN pezzi p ON p.id=c.fk_pezzo WHERE c.fk_macchina=(SELECT fk_macchina FROM macchine_manutenzioni WHERE fk_manutenzione=? AND stato="attivo" LIMIT 1) AND c.stato="attivo" AND c.stato_calendario<>"sospeso" ORDER BY c.prossima_manutenzione',
    [req.params.id]
  );
  return res.json({ ...intervento, ricambi, prossime });
});

rutasInterventos.post('/interventi', exigirSesion, async (req, res) => {
  const entrada = esquemaIntervento.safeParse(req.body);
  if (!entrada.success) {
    return res.status(422).json({ errore: 'Dati intervento non validi', dettagli: entrada.error.flatten() });
  }

  try {
    const creado = await enTransaccion((conexion) => crearIntervento(conexion, entrada.data, req.utente.sub));
    return res.status(201).json({ id: creado.id });
  } catch (error) {
    return res.status(400).json({ errore: error.message || 'Impossibile creare l’intervento' });
  }
});

rutasInterventos.put('/interventi/:id', exigirSesion, async (req, res) => {
  const entrada = esquemaIntervento.partial().safeParse(req.body);
  if (!entrada.success) return res.status(422).json({ errore: 'Dati intervento non validi' });
  if (!(await puedeAccederIntervento(req, req.params.id))) {
    return res.status(403).json({ errore: 'Intervento non assegnato' });
  }

  const dati = entrada.data;
  await consultar(
    'UPDATE manutenzioni SET data=COALESCE(?,data),ubicazione=COALESCE(?,ubicazione),note=COALESCE(?,note),esito=COALESCE(?,esito),ore=COALESCE(?,ore),persone=COALESCE(?,persone),utente_modifica=? WHERE id=? AND stato="attivo"',
    [
      dati.data ?? null,
      dati.ubicazione ?? null,
      dati.note ?? null,
      dati.esito ?? null,
      dati.ore ?? null,
      dati.persone ?? null,
      req.utente.sub,
      req.params.id
    ]
  );
  res.json({ id: Number(req.params.id) });
});

rutasInterventos.delete('/interventi/:id', exigirSesion, async (req, res) => {
  if (!(await puedeAccederIntervento(req, req.params.id))) {
    return res.status(403).json({ errore: 'Intervento non assegnato' });
  }
  await consultar('UPDATE manutenzioni SET stato="inattivo",utente_modifica=? WHERE id=?', [req.utente.sub, req.params.id]);
  res.status(204).end();
});
