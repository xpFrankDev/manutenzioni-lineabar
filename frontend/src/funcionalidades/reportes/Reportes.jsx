import { useEffect, useState } from 'react';
import { Download, TrendingUp } from 'lucide-react';
import { descargarArchivo, llamarApi } from '../../compartido/api/cliente.js';
import { nombreTipoMaquina } from '../../compartido/dominio/maquinas.js';
import { fechaDeHoy, formatearMoneda } from '../../compartido/utilidades/formato.js';
import { SkeletonReport } from '../../compartido/componentes/Skeleton.jsx';

/**
 * Safari en iPhone no ofrece selector nativo para `input type="month"`, así
 * que el período se elige con una lista de los últimos 18 meses.
 */
function opcionesPeriodo(idioma) {
  const formato = new Intl.DateTimeFormat(idioma === 'it' ? 'it-IT' : 'es-ES', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
  const hoy = new Date();
  return Array.from({ length: 18 }, (_, indice) => {
    const fecha = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - indice, 1));
    return [fecha.toISOString().slice(0, 7), formato.format(fecha)];
  });
}

export function Reportes({ c, idioma }) {
  const [periodo, setPeriodo] = useState(fechaDeHoy().slice(0, 7));
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    setDatos(null);
    llamarApi(`/reportes/riepilogo?periodo=${periodo}`)
      .then(setDatos)
      .catch((e) => setError(e.message));
  }, [periodo]);

  async function exportar() {
    setDescargando(true);
    try {
      await descargarArchivo(`/reportes/boletas.csv?periodo=${periodo}`, `boletas-${periodo}.csv`);
    } catch (e) {
      setError(e.message);
    } finally {
      setDescargando(false);
    }
  }

  const kpis = datos
    ? [
        [c.receipts, datos.boletas],
        [c.income, formatearMoneda(datos.ricavi, idioma)],
        [c.kpiAverage, formatearMoneda(datos.boletaMedia, idioma)],
        [c.done, datos.interventi],
        [c.success, `${datos.esito}%`],
        [c.kpiHours, datos.oreUomo],
        [c.labour, formatearMoneda(datos.manodopera, idioma)],
        [c.kpiParts, `${datos.pezzi} · ${formatearMoneda(datos.valorePezzi, idioma)}`],
        [c.kpiClients, datos.clienti]
      ]
    : [];
  const clientes = datos?.clientes ?? [];
  const ricambi = datos?.ricambi ?? [];
  const tipos = datos?.tipos ?? [];
  const previsione = datos?.previsione ?? [];

  return (
    <main className="content operational">
      <header className="list-title">
        <div>
          <h1>{c.reports}</h1>
          <p>{c.reportsHelp}</p>
        </div>
        <button className="primary add-record" onClick={exportar} disabled={descargando}>
          <Download size={16} />
          {c.exportCsv}
        </button>
      </header>

      <label className="report-period">
        {c.period}
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
          {opcionesPeriodo(idioma).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="error">{error}</p>}
      {!datos && !error && <SkeletonReport />}

      {datos && (
        <>
          <section className="metrics report-metrics">
            {kpis.map(([etiqueta, valor]) => (
              <article key={etiqueta}>
                <span>{etiqueta}</span>
                <b>{valor}</b>
              </article>
            ))}
          </section>

          <section className="panel">
            <header>
              <h2>{c.topClients}</h2>
            </header>
            {clientes.length ? (
              clientes.map((fila) => (
                <p className="part-line" key={fila.id}>
                  <span>
                    {fila.nome} · {fila.citta}
                  </span>
                  <b>
                    {fila.boletas} · {formatearMoneda(fila.ricavi, idioma)}
                  </b>
                </p>
              ))
            ) : (
              <p className="empty-state">{c.noRecords}</p>
            )}
          </section>

          <section className="panel">
            <header>
              <h2>{c.topParts}</h2>
            </header>
            {ricambi.length ? (
              ricambi.map((fila) => (
                <p className="part-line" key={fila.id}>
                  <span>
                    {fila.nome} · {fila.codice_unico}
                  </span>
                  <b>
                    {Number(fila.quantita)} · {formatearMoneda(fila.valore, idioma)}
                  </b>
                </p>
              ))
            ) : (
              <p className="empty-state">{c.noRecords}</p>
            )}
          </section>

          <section className="panel">
            <header>
              <h2>{c.byMachineType}</h2>
            </header>
            {tipos.length ? (
              tipos.map((fila) => (
                <p className="part-line" key={fila.tipo_macchina}>
                  <span>{nombreTipoMaquina(fila.tipo_macchina, c)}</span>
                  <b>
                    {fila.interventi} · {formatearMoneda(fila.valore_ricambi, idioma)}
                  </b>
                </p>
              ))
            ) : (
              <p className="empty-state">{c.noRecords}</p>
            )}
          </section>

          <section className="panel">
            <header>
              <h2>
                <TrendingUp size={17} /> {c.forecast}
              </h2>
            </header>
            {previsione.length ? (
              previsione.map((fila) => (
                <p className="part-line" key={fila.periodo}>
                  <span>{fila.periodo}</span>
                  <b>
                    {fila.totale} {c.manutenzioneCount}
                    {fila.vencidos ? ` · ${fila.vencidos} ${c.overdue.toLowerCase()}` : ''}
                  </b>
                </p>
              ))
            ) : (
              <p className="empty-state">{c.noCalendarRecords}</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
