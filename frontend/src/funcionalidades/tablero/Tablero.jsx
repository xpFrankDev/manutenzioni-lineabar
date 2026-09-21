import { useEffect, useState } from 'react';
import { CalendarClock, Check, ChevronRight, CircleAlert, ClipboardList, Euro, Wrench } from 'lucide-react';
import { llamarApi } from '../../compartido/api/cliente.js';
import { Estado } from '../../compartido/componentes/Estado.jsx';
import { formatearFecha, formatearMoneda } from '../../compartido/utilidades/formato.js';

export function Tablero({ c, idioma, usuario, alAbrirDetalle, alIrCalendario }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    llamarApi('/dashboard')
      .then(setDatos)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <main className="content">
        <p className="error">{error}</p>
      </main>
    );
  }
  if (!datos) return <main className="content loading">{c.loading}</main>;

  const metricas = [
    [Wrench, c.done, datos.metriche.interventi],
    [Euro, c.income, formatearMoneda(datos.metriche.ricavi, idioma)],
    [ClipboardList, c.pending, datos.metriche.attivitaPendenti],
    [CalendarClock, c.nextMaintenance, datos.metriche.manutenzioniProgrammate],
    [Check, c.success, `${datos.metriche.esito}%`]
  ];
  const scadenze = datos.scadenze ?? { vencidos: 0, proximas: [] };

  return (
    <main className="content">
      <header className="intro">
        <div>
          <h1>
            {c.hello}
            {usuario?.nome ? `, ${usuario.nome}` : ''}.
          </h1>
          <p>{datos.periodo} · Linea Bar</p>
        </div>
      </header>

      {scadenze.vencidos > 0 && (
        <button className="alert-banner" onClick={alIrCalendario}>
          <CircleAlert size={19} />
          <span>
            <b>
              {scadenze.vencidos} {c.overdue.toLowerCase()}
            </b>
            <small>{c.calendarHelp}</small>
          </span>
          <ChevronRight size={18} />
        </button>
      )}

      <section className="metrics">
        {metricas.map(([Icono, etiqueta, valor]) => (
          <article key={etiqueta}>
            <Icono size={19} />
            <span>{etiqueta}</span>
            <b>{valor}</b>
          </article>
        ))}
      </section>

      <section className="panel">
        <header>
          <h2>{c.nextMaintenance}</h2>
          <button onClick={alIrCalendario}>{c.seeCalendar}</button>
        </header>
        {scadenze.proximas.length ? (
          scadenze.proximas.map((entrada) => (
            <div className="row" key={entrada.id}>
              <i>
                <CalendarClock size={19} />
              </i>
              <span>
                <b>
                  {entrada.cliente} · {entrada.codice_unico}
                </b>
                <small>
                  {entrada.pezzo ? `${entrada.pezzo} · ` : ''}
                  {formatearFecha(entrada.prossima_manutenzione, idioma)}
                </small>
              </span>
              <Estado value={entrada.vencimiento} c={c} />
            </div>
          ))
        ) : (
          <p className="empty-state">{c.noCalendarRecords}</p>
        )}
      </section>

      <section className="panel">
        <header>
          <h2>{c.recent}</h2>
        </header>
        {datos.recenti.length ? (
          datos.recenti.map((fila) => (
            <button className="row recent-row" key={fila.id} onClick={() => alAbrirDetalle(fila.id)}>
              <i>
                <Wrench size={19} />
              </i>
              <span>
                <b>
                  {fila.marca} {fila.modello} · {fila.codice_unico}
                </b>
                <small>
                  {fila.cliente} · {formatearFecha(fila.data, idioma)}
                </small>
              </span>
              <Estado value={fila.esito} c={c} />
              <ChevronRight size={18} />
            </button>
          ))
        ) : (
          <p className="empty-state">{c.noRecords}</p>
        )}
      </section>
    </main>
  );
}
