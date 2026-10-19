import { consultar, consultarUno } from '../../base-datos/pool.js';
import { TARIFA_MANO_DE_OBRA_HORA } from '../boletas/servicio.js';
import { fechaMasDias, hoyIso, sumarMeses } from '../calendario/servicio.js';
import { obtenerParametros } from '../parametros/servicio.js';

export function periodoValido(valor) {
  const periodo = String(valor ?? hoyIso().slice(0, 7));
  if (!/^\d{4}-\d{2}$/.test(periodo)) throw new Error('Periodo non valido');
  return periodo;
}

export async function riepilogoPeriodo(periodo) {
  const mes = `${periodoValido(periodo)}%`;
  const parametros = await obtenerParametros();
  const boletas = await consultarUno(
    'SELECT COUNT(*) totale,COALESCE(SUM(prezzo_totale),0) ricavi,COALESCE(AVG(prezzo_totale),0) medio FROM boletas WHERE stato="emessa" AND data LIKE ?',
    [mes]
  );
  const interventos = await consultarUno(
    'SELECT COUNT(*) totale,COALESCE(SUM(ore*persone),0) ore_uomo,COALESCE(SUM(CASE WHEN esito="risolto" THEN 1 ELSE 0 END),0) risolti FROM manutenzioni WHERE stato="attivo" AND data LIKE ?',
    [mes]
  );
  const ricambi = await consultarUno(
    'SELECT COALESCE(SUM(pm.quantita),0) pezzi,COALESCE(SUM(pm.quantita*pm.prezzo_unitario),0) valore FROM pezzi_manutenzioni pm JOIN manutenzioni m ON m.id=pm.fk_manutenzione WHERE pm.stato="attivo" AND m.stato="attivo" AND m.data LIKE ?',
    [mes]
  );
  const clientes = await consultarUno(
    'SELECT COUNT(DISTINCT b.fk_cliente) totale FROM boletas b WHERE b.stato="emessa" AND b.data LIKE ?',
    [mes]
  );

  const interventiTotal = Number(interventos.totale);
  const oreUomo = Number(interventos.ore_uomo);
  return {
    periodo,
    boletas: Number(boletas.totale),
    ricavi: Number(boletas.ricavi),
    boletaMedia: Number(Number(boletas.medio).toFixed(2)),
    interventi: interventiTotal,
    esito: interventiTotal ? Math.round((Number(interventos.risolti) * 100) / interventiTotal) : 0,
    oreUomo,
    manodopera: Number((oreUomo * Number(parametros.tarifa_mano_de_obra_hora ?? TARIFA_MANO_DE_OBRA_HORA)).toFixed(2)),
    clienti: Number(clientes.totale),
    pezzi: Number(ricambi.pezzi),
    valorePezzi: Number(ricambi.valore)
  };
}

export async function ingresosPorCliente(periodo, limite = 8) {
  return consultar(
    'SELECT c.id,c.codice,c.nome,c.citta,COUNT(b.id) boletas,COALESCE(SUM(b.prezzo_totale),0) ricavi FROM boletas b JOIN clienti c ON c.id=b.fk_cliente WHERE b.stato="emessa" AND b.data LIKE ? GROUP BY c.id,c.codice,c.nome,c.citta ORDER BY ricavi DESC LIMIT ?',
    [mes(periodo), Number(limite)]
  );
}

export async function interventosPorTipo(periodo) {
  return consultar(
    'SELECT mq.tipo_macchina,COUNT(DISTINCT m.id) interventi,COALESCE(SUM(pm.quantita*pm.prezzo_unitario),0) valore_ricambi FROM manutenzioni m JOIN macchine_manutenzioni mm ON mm.fk_manutenzione=m.id AND mm.stato="attivo" JOIN macchine mq ON mq.id=mm.fk_macchina LEFT JOIN pezzi_manutenzioni pm ON pm.fk_manutenzione=m.id AND pm.stato="attivo" WHERE m.stato="attivo" AND m.data LIKE ? GROUP BY mq.tipo_macchina ORDER BY interventi DESC',
    [mes(periodo)]
  );
}

export async function consumosPorRicambio(periodo, limite = 10) {
  return consultar(
    'SELECT p.id,p.codice_unico,p.nome,SUM(pm.quantita) quantita,COALESCE(SUM(pm.quantita*pm.prezzo_unitario),0) valore,COUNT(DISTINCT m.fk_cliente) clienti FROM pezzi_manutenzioni pm JOIN pezzi p ON p.id=pm.fk_pezzo JOIN manutenzioni m ON m.id=pm.fk_manutenzione WHERE pm.stato="attivo" AND m.stato="attivo" AND m.data LIKE ? GROUP BY p.id,p.codice_unico,p.nome ORDER BY quantita DESC LIMIT ?',
    [mes(periodo), Number(limite)]
  );
}

export async function previsionMantenimiento(meses) {
  const parametros = await obtenerParametros();
  const horizonte = Number(meses ?? parametros.prevision_manutencion_meses ?? 6);
  const hasta = sumarMeses(hoyIso(), horizonte);
  const filas = await consultar(
    'SELECT DATE_FORMAT(c.prossima_manutenzione,"%Y-%m") periodo,COUNT(*) totale,SUM(c.prossima_manutenzione<?) vencidos FROM calendario_manutenzioni_macchine c JOIN macchine m ON m.id=c.fk_macchina JOIN clienti cl ON cl.id=m.fk_cliente WHERE c.stato="attivo" AND m.stato="attivo" AND c.stato_calendario="programmato" AND c.prossima_manutenzione<=? GROUP BY periodo ORDER BY periodo',
    [hoyIso(), hasta]
  );
  return filas.map((fila) => ({ ...fila, totale: Number(fila.totale), vencidos: Number(fila.vencidos ?? 0) }));
}

export async function boletasDelPeriodo(periodo) {
  return consultar(
    'SELECT b.codice_boleta,b.data,b.stato,b.prezzo_totale,c.codice codice_cliente,c.nome cliente,CONCAT(COALESCE(f.nome,ma.nome)," ",COALESCE(mq.modello,"")," ",mq.codice_unico) macchina,u.nome tecnico,m.ore,m.persone,m.ubicazione,m.esito FROM boletas b JOIN clienti c ON c.id=b.fk_cliente JOIN utenti u ON u.id=b.fk_tecnico LEFT JOIN boletas_manutenzioni bm ON bm.fk_boleta=b.id AND bm.stato="attivo" LEFT JOIN manutenzioni m ON m.id=bm.fk_manutenzione LEFT JOIN macchine_manutenzioni mm ON mm.fk_manutenzione=m.id AND mm.stato="attivo" LEFT JOIN macchine mq ON mq.id=mm.fk_macchina LEFT JOIN fornitori f ON f.id=mq.fk_fornitore LEFT JOIN marche ma ON ma.id=mq.fk_marca WHERE b.data LIKE ? ORDER BY b.data,b.codice_boleta',
    [mes(periodo)]
  );
}

export function boletasACsv(filas) {
  const cabecera = ['Codice boleta', 'Data', 'Stato', 'Cliente', 'Codice cliente', 'Macchina', 'Tecnico', 'Ore', 'Persone', 'Ubicazione', 'Esito', 'Totale'];
  // Neutraliza la inyección de fórmulas al abrir el CSV en una hoja de cálculo.
  const prefijoPeligroso = /^[=+\-@\t\r]/;
  const escapar = (valor) => {
    let texto = String(valor ?? '');
    if (prefijoPeligroso.test(texto)) texto = `'${texto}`;
    return `"${texto.replace(/"/g, '""')}"`;
  };
  const lineas = filas.map((fila) =>
    [
      fila.codice_boleta,
      fila.data instanceof Date ? fila.data.toISOString().slice(0, 10) : String(fila.data).slice(0, 10),
      fila.stato,
      fila.cliente,
      fila.codice_cliente,
      fila.macchina,
      fila.tecnico,
      fila.ore,
      fila.persone,
      fila.ubicazione,
      fila.esito,
      Number(fila.prezzo_totale).toFixed(2)
    ]
      .map(escapar)
      .join(';')
  );
  return ['\ufeff' + cabecera.map(escapar).join(';'), ...lineas].join('\r\n');
}

function mes(periodo) {
  return `${periodoValido(periodo)}%`;
}
