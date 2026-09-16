import { Router } from 'express';
import { consultar } from '../../base-datos/pool.js';
import { autorizar, exigirSesion, ROLES_ADMINISTRADOR } from '../../intermedios/sesion.js';

export const rutasCatalogos = Router();

rutasCatalogos.get('/maquinas', exigirSesion, async (_req, res) => {
  res.json(
    await consultar(
      'SELECT m.id,m.codice_unico,m.modello,m.tipo_macchina,c.id cliente_id,c.nome cliente,c.indirizzo,COALESCE(f.nome,ma.nome) marca FROM macchine m JOIN clienti c ON c.id=m.fk_cliente LEFT JOIN fornitori f ON f.id=m.fk_fornitore LEFT JOIN marche ma ON ma.id=m.fk_marca WHERE m.stato="attivo" ORDER BY c.nome,m.modello'
    )
  );
});

rutasCatalogos.get('/piezas', exigirSesion, async (req, res) => {
  res.json(
    await consultar(
      'SELECT p.id,p.nome,p.codice_unico,CAST(p.prezzo AS DECIMAL(10,2)) prezzo FROM pezzi p JOIN macchine m ON m.id=? WHERE p.stato="attivo" AND (p.tipo_macchina=m.tipo_macchina OR p.tipo_macchina IN ("filtro","addolcitore")) ORDER BY p.nome',
      [Number(req.query.maquina_id)]
    )
  );
});

rutasCatalogos.get('/clienti', exigirSesion, async (_req, res) => {
  res.json(await consultar('SELECT id,codice,nome,citta FROM clienti WHERE stato="attivo" ORDER BY nome'));
});

rutasCatalogos.get('/tecnici', exigirSesion, autorizar(...ROLES_ADMINISTRADOR), async (_req, res) => {
  res.json(
    await consultar(
      'SELECT u.id,u.nome,u.codice_usuario FROM utenti u JOIN ruoli r ON r.id=u.fk_ruolo WHERE u.stato="attivo" AND r.codice IN ("tecnico","amministratore") ORDER BY u.nome'
    )
  );
});
