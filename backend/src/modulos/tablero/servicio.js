import { consultar, consultarUno } from '../../base-datos/pool.js';
import { esTecnico } from '../../intermedios/sesion.js';

export async function obtenerTablero(req) {
  const periodo = String(req.query.periodo || new Date().toISOString().slice(0, 7));
  const tecnico = esTecnico(req);
  const filtroTecnico = tecnico ? ' AND m.fk_tecnico=?' : '';

  const metriche = await consultarUno(
    'SELECT COUNT(*) interventi,COALESCE(SUM(b.prezzo_totale),0) ricavi,SUM(CASE WHEN m.esito="risolto" THEN 1 ELSE 0 END) risolti FROM manutenzioni m LEFT JOIN boletas_manutenzioni bm ON bm.fk_manutenzione=m.id AND bm.stato="attivo" LEFT JOIN boletas b ON b.id=bm.fk_boleta AND b.stato="emessa" WHERE m.stato="attivo" AND m.data LIKE ?' +
      filtroTecnico,
    tecnico ? [`${periodo}%`, req.utente.sub] : [`${periodo}%`]
  );

  const pendenti = await consultarUno(
    'SELECT COUNT(*) totale FROM attivita WHERE stato="attivo" AND stato_attivita<>"completata"' +
      (tecnico ? ' AND fk_assegnato=?' : ''),
    tecnico ? [req.utente.sub] : []
  );

  const recenti = await consultar(
    'SELECT m.id,m.data,m.ubicazione,m.esito,c.nome cliente,c.indirizzo,mq.codice_unico,mq.modello,COALESCE(f.nome,ma.nome) marca,b.codice_boleta,b.prezzo_totale FROM manutenzioni m LEFT JOIN clienti c ON c.id=m.fk_cliente JOIN macchine_manutenzioni mm ON mm.fk_manutenzione=m.id AND mm.stato="attivo" JOIN macchine mq ON mq.id=mm.fk_macchina LEFT JOIN fornitori f ON f.id=mq.fk_fornitore LEFT JOIN marche ma ON ma.id=mq.fk_marca LEFT JOIN boletas_manutenzioni bm ON bm.fk_manutenzione=m.id AND bm.stato="attivo" LEFT JOIN boletas b ON b.id=bm.fk_boleta AND b.stato<>"annullata" WHERE m.stato="attivo"' +
      filtroTecnico +
      ' ORDER BY m.data DESC,m.id DESC LIMIT 6',
    tecnico ? [req.utente.sub] : []
  );

  const interventi = Number(metriche.interventi);
  return {
    periodo,
    metriche: {
      interventi,
      ricavi: Number(metriche.ricavi),
      attivitaPendenti: Number(pendenti.totale),
      esito: interventi ? Math.round((Number(metriche.risolti) * 100) / interventi) : 0
    },
    recenti
  };
}
