import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, CalendarPlus, CalendarX2, CircleAlert, Pencil, RefreshCw, X } from 'lucide-react';
import { llamarApi } from '../../compartido/api/cliente.js';
import { useAvisos } from '../../compartido/componentes/Avisos.jsx';
import { Estado } from '../../compartido/componentes/Estado.jsx';
import { SkeletonList } from '../../compartido/componentes/Skeleton.jsx';
import { fechaDeHoy, formatearFecha } from '../../compartido/utilidades/formato.js';
import { useBloquearScroll } from '../../compartido/utilidades/scroll.js';

const FILTROS = [
  ['todas', 'all'],
  ['pendientes', 'pendingCalendar'],
  ['vencido', 'overdue'],
  ['proximos', 'dueSoon'],
  ['sospeso', 'suspended']
];

export function Calendario({ c, idioma, usuario }) {
  const { notificar } = useAvisos();
  const [filtro, setFiltro] = useState('pendientes');
  const [filas, setFilas] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [edicion, setEdicion] = useState(null);
  const [programacion, setProgramacion] = useState(null);
  const [error, setError] = useState('');
  const esAdministrador = usuario?.ruolo !== 'tecnico';

  const cargar = useCallback(async () => {
    try {
      const consulta = filtro === 'todas' ? '' : `?estado=${filtro}`;
      const [listado, datosResumen] = await Promise.all([
        llamarApi(`/calendario${consulta}`),
        llamarApi('/calendario/resumen')
      ]);
      setFilas(listado);
      setResumen(datosResumen);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [filtro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function cambiarEstado(fila, estadoCalendario) {
    try {
      await llamarApi(`/calendario/${fila.id}`, { method: 'PUT', body: JSON.stringify({ statoCalendario }) });
      dispatchEvent(new Event('lineabar:calendar'));
      notificar(c.saved);
      cargar();
    } catch (e) {
      setError(e.message);
      notificar(e.message, 'error');
    }
  }

  return (
    <main className="content operational">
      <header className="list-title">
        <div>
          <h1>{c.calendar}</h1>
          <p>{c.calendarHelp}</p>
        </div>
      </header>

      {resumen && (
        <section className="calendar-summary">
          <article className={resumen.vencidos ? 'danger' : ''}>
            <span>{c.overdue}</span>
            <b>{resumen.vencidos}</b>
          </article>
          <article>
            <span>{c.todayState}</span>
            <b>{resumen.hoy}</b>
          </article>
          <article>
            <span>{c.dueSoon}</span>
            <b>{resumen.proximos}</b>
          </article>
          <article>
            <span>{c.pendingCalendar}</span>
            <b>{resumen.pendientes}</b>
          </article>
        </section>
      )}

      <div className="filter-chips">
        {FILTROS.map(([clave, etiqueta]) => (
          <button key={clave} className={filtro === clave ? 'active' : ''} onClick={() => setFiltro(clave)}>
            {c[etiqueta]}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}

      <section className="operation-list">
        {filas === null ? (
          <SkeletonList filas={5} />
        ) : filas.length ? (
          filas.map((fila) => (
            <article key={fila.id}>
              <div className="operation-main">
                <span className="operation-name">
                  <b>
                    {fila.cliente} · {fila.codice_unico}
                  </b>
                  <small>
                    {fila.pezzo ? `${fila.pezzo} · ` : ''}
                    {c.frequency}: {fila.frequenza_mesi} {c.months}
                  </small>
                  <small>
                    {c.nextMaintenance}: {formatearFecha(fila.prossima_manutenzione, idioma)} · {c.lastExecution}:{' '}
                    {formatearFecha(fila.ultima_esecuzione, idioma)}
                  </small>
                  {fila.attivita_id && <small>{c.linkedTask}: #{fila.attivita_id}</small>}
                </span>
                <Estado value={fila.vencimiento} c={c} />
              </div>
              <div className="operation-foot">
                {esAdministrador ? (
                  <>
                    {fila.attivita_id ? (
                      <span className="linked-task">
                        <CalendarPlus size={14} /> {c.linkedTask} #{fila.attivita_id}
                      </span>
                    ) : (
                      <button className="text-action" onClick={() => setProgramacion(fila)}>
                        <CalendarPlus size={14} /> {c.schedule}
                      </button>
                    )}
                    <button className="text-action" onClick={() => setEdicion(fila)}>
                      <Pencil size={14} /> {c.reschedule}
                    </button>
                    {fila.stato_calendario === 'sospeso' ? (
                      <button className="text-action" onClick={() => cambiarEstado(fila, 'programmato')}>
                        <RefreshCw size={14} /> {c.pendingCalendar}
                      </button>
                    ) : (
                      <button className="text-action" onClick={() => cambiarEstado(fila, 'sospeso')}>
                        <CalendarX2 size={14} /> {c.suspended}
                      </button>
                    )}
                  </>
                ) : (
                  <span>{c.maintenanceHint}</span>
                )}
              </div>
            </article>
          ))
        ) : (
          <p className="empty-state">{c.noCalendarRecords}</p>
        )}
      </section>

      {programacion && (
        <ProgramarIntervento
          fila={programacion}
          c={c}
          idioma={idioma}
          alCerrar={() => setProgramacion(null)}
          alGuardar={() => {
            setProgramacion(null);
            dispatchEvent(new Event('lineabar:calendar'));
            dispatchEvent(new Event('lineabar:tasks'));
            cargar();
          }}
        />
      )}

      {edicion && (
        <Reprogramar
          fila={edicion}
          c={c}
          alCerrar={() => setEdicion(null)}
          alGuardar={() => {
            setEdicion(null);
            dispatchEvent(new Event('lineabar:calendar'));
            cargar();
          }}
        />
      )}
    </main>
  );
}

function ProgramarIntervento({ fila, c, idioma, alCerrar, alGuardar }) {
  useBloquearScroll();
  const { notificar } = useAvisos();
  const [tecnicos, setTecnicos] = useState([]);
  const [formulario, setFormulario] = useState({
    tecnici: [],
    priorita: fila.vencimiento === 'vencido' ? 'alta' : 'normale',
    richiedeAppuntamento: true,
    scadenza: String(fila.prossima_manutenzione).slice(0, 10),
    osservazione: ''
  });
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    llamarApi('/tecnici')
      .then(setTecnicos)
      .catch((e) => setError(e.message));
  }, []);

  async function guardar(evento) {
    evento.preventDefault();
    setGuardando(true);
    try {
      await llamarApi(`/calendario/${fila.id}/programar`, { method: 'POST', body: JSON.stringify(formulario) });
      notificar(c.activityCreated || c.saved);
      alGuardar();
    } catch (e) {
      setError(e.message);
      notificar(e.message, 'error');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true">
      <form className="sheet task-sheet" onSubmit={guardar}>
        <header>
          <div>
            <p className="eyebrow">{c.scheduleTitle}</p>
            <h2>
              {fila.cliente} · {fila.codice_unico}
            </h2>
          </div>
          <button type="button" onClick={alCerrar} aria-label={c.cancel}>
            <X />
          </button>
        </header>
        <main>
          <div className="detail-line">
            <b>
              {fila.pezzo ?? c.machine} · {c.frequency}: {fila.frequenza_mesi} {c.months}
            </b>
            <small>
              {c.nextMaintenance}: {formatearFecha(fila.prossima_manutenzione, idioma)}
            </small>
          </div>
          <label>
            {c.estimatedDate}
            <input
              type="date"
              required
              value={formulario.scadenza}
              onChange={(e) => setFormulario({ ...formulario, scadenza: e.target.value })}
            />
          </label>
          <label>
            {c.importance}
            <select value={formulario.priorita} onChange={(e) => setFormulario({ ...formulario, priorita: e.target.value })}>
              <option value="bassa">{c.priorityLow}</option>
              <option value="normale">{c.priorityNormal}</option>
              <option value="alta">{c.priorityHigh}</option>
            </select>
          </label>
          <label>
            {c.observation}
            <textarea
              value={formulario.osservazione}
              placeholder={`${fila.pezzo ?? c.machine} · ${fila.cliente}`}
              onChange={(e) => setFormulario({ ...formulario, osservazione: e.target.value })}
            />
          </label>
          <label className="check-line">
            <input
              type="checkbox"
              checked={formulario.richiedeAppuntamento}
              onChange={(e) => setFormulario({ ...formulario, richiedeAppuntamento: e.target.checked })}
            />
            {c.appointment}
          </label>
          <fieldset>
            <legend>{c.assignedTechnicians}</legend>
            {tecnicos.map((tecnico) => (
              <label className="check-line" key={tecnico.id}>
                <input
                  type="checkbox"
                  checked={formulario.tecnici.includes(tecnico.id)}
                  onChange={() =>
                    setFormulario({
                      ...formulario,
                      tecnici: formulario.tecnici.includes(tecnico.id)
                        ? formulario.tecnici.filter((id) => id !== tecnico.id)
                        : [...formulario.tecnici, tecnico.id]
                    })
                  }
                />
                {tecnico.nome}
              </label>
            ))}
          </fieldset>
          {error && (
            <p className="error">
              <CircleAlert size={16} />
              {error}
            </p>
          )}
        </main>
        <footer>
          <button type="button" onClick={alCerrar} aria-label={c.cancel}>
            {c.cancel}
          </button>
          <button className="primary" disabled={guardando || !formulario.tecnici.length}>
            <CalendarClock size={16} />
            {c.schedule}
          </button>
        </footer>
      </form>
    </div>
  );
}

function Reprogramar({ fila, c, alCerrar, alGuardar }) {
  useBloquearScroll();
  const { notificar } = useAvisos();
  const [formulario, setFormulario] = useState({
    prossimaManutenzione: String(fila.prossima_manutenzione).slice(0, 10),
    frequenzaMesi: fila.frequenza_mesi,
    statoCalendario: fila.stato_calendario,
    note: fila.note ?? ''
  });
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function guardar(evento) {
    evento.preventDefault();
    setGuardando(true);
    try {
      await llamarApi(`/calendario/${fila.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...formulario, frequenzaMesi: Number(formulario.frequenzaMesi) })
      });
      notificar(c.saved);
      alGuardar();
    } catch (e) {
      setError(e.message);
      notificar(e.message, 'error');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true">
      <form className="sheet task-sheet" onSubmit={guardar}>
        <header>
          <div>
            <p className="eyebrow">{c.reprogramTitle}</p>
            <h2>
              {fila.cliente} · {fila.codice_unico}
            </h2>
          </div>
          <button type="button" onClick={alCerrar} aria-label={c.cancel}>
            <X />
          </button>
        </header>
        <main>
          <label>
            {c.nextMaintenance}
            <input
              type="date"
              required
              min={fechaDeHoy()}
              value={formulario.prossimaManutenzione}
              onChange={(e) => setFormulario({ ...formulario, prossimaManutenzione: e.target.value })}
            />
          </label>
          <label>
            {c.frequencyMesi}
            <input
              type="number"
              min="1"
              max="120"
              required
              value={formulario.frequenzaMesi}
              onChange={(e) => setFormulario({ ...formulario, frequenzaMesi: e.target.value })}
            />
          </label>
          <label>
            {c.status}
            <select
              value={formulario.statoCalendario}
              onChange={(e) => setFormulario({ ...formulario, statoCalendario: e.target.value })}
            >
              <option value="programmato">{c.scheduled}</option>
              <option value="sospeso">{c.suspended}</option>
            </select>
          </label>
          <label>
            {c.notes}
            <textarea value={formulario.note} onChange={(e) => setFormulario({ ...formulario, note: e.target.value })} />
          </label>
          {error && (
            <p className="error">
              <CircleAlert size={16} />
              {error}
            </p>
          )}
        </main>
        <footer>
          <button type="button" onClick={alCerrar} aria-label={c.cancel}>
            {c.cancel}
          </button>
          <button className="primary" disabled={guardando}>
            {c.save}
          </button>
        </footer>
      </form>
    </div>
  );
}
