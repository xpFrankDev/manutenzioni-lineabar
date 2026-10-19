import { Router } from 'express';
import { z } from 'zod';
import { consultar, enTransaccion, pool } from '../../base-datos/pool.js';
import { exigirPermiso } from '../../intermedios/permisos.js';
import { exigirSesion } from '../../intermedios/sesion.js';
import { crearCliente } from '../clientes/servicio.js';
import { crearMaquina } from '../maquinas/servicio.js';

export const rutasCatalogos = Router();

rutasCatalogos.get('/maquinas', exigirSesion, async (_req, res) => {
  res.json(
    await consultar(
      'SELECT m.id,m.codice_unico,m.modello,m.tipo_macchina,m.fk_marca,m.fk_fornitore,c.id cliente_id,c.nome cliente,c.indirizzo,COALESCE(f.nome,ma.nome) marca FROM macchine m JOIN clienti c ON c.id=m.fk_cliente LEFT JOIN fornitori f ON f.id=m.fk_fornitore LEFT JOIN marche ma ON ma.id=m.fk_marca WHERE m.stato="attivo" ORDER BY c.nome,m.modello'
    )
  );
});

rutasCatalogos.get('/piezas', exigirSesion, async (req, res) => {
  const maquinaId = z.string().uuid().safeParse(req.query.maquina_id);
  if (!maquinaId.success) return res.status(422).json({ errore: 'Macchina non valida' });
  res.json(
    await consultar(
      'SELECT p.id,p.nome,p.codice_unico,CAST(p.prezzo AS DECIMAL(10,2)) prezzo,p.intervallo_mesi,p.tipo_macchina FROM pezzi p JOIN macchine m ON m.id=? WHERE p.stato="attivo" AND (p.tipo_macchina=m.tipo_macchina OR p.tipo_macchina IN ("filtro","addolcitore")) ORDER BY p.nome',
      [maquinaId.data]
    )
  );
});

rutasCatalogos.get('/clienti', exigirSesion, async (_req, res) => {
  res.json(
    await consultar(
      'SELECT c.id,c.codice,c.nome,c.indirizzo,c.citta,c.tipo_cliente,f.nome fornitore FROM clienti c LEFT JOIN fornitori f ON f.id=c.fk_fornitore WHERE c.stato="attivo" ORDER BY c.nome'
    )
  );
});

rutasCatalogos.get('/marche', exigirSesion, async (_req, res) => {
  res.json(await consultar('SELECT id,nome FROM marche WHERE stato="attivo" ORDER BY nome'));
});

rutasCatalogos.get('/fornitori', exigirSesion, async (_req, res) => {
  res.json(await consultar('SELECT id,codice,nome FROM fornitori WHERE stato="attivo" ORDER BY nome'));
});

rutasCatalogos.get('/tecnici', exigirSesion, exigirPermiso('configuracion', 'editar'), async (_req, res) => {
  res.json(
    await consultar(
      'SELECT u.id,u.nome,u.codice_usuario FROM utenti u JOIN ruoli r ON r.id=u.fk_ruolo WHERE u.stato="attivo" AND r.codice IN ("tecnico","amministratore") ORDER BY u.nome'
    )
  );
});

rutasCatalogos.post('/clienti', exigirSesion, async (req, res) => {
  try {
    const creado = await enTransaccion((conexion) => crearCliente(conexion, req.body, req.utente.sub));
    return res.status(201).json(creado);
  } catch (error) {
    return res.status(400).json({ errore: error.message || 'Impossibile creare il cliente' });
  }
});

rutasCatalogos.post('/maquinas', exigirSesion, async (req, res) => {
  try {
    const creado = await crearMaquina(pool, req.body, req.utente.sub);
    return res.status(201).json(creado);
  } catch (error) {
    return res.status(400).json({ errore: error.message || 'Impossibile creare la macchina' });
  }
});
