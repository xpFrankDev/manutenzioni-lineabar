import { CalendarClock, Check, ClipboardList, MapPin, Users, X } from 'lucide-react';
import { Estado } from '../../compartido/componentes/Estado.jsx';
import { useBloquearScroll } from '../../compartido/utilidades/scroll.js';
import { formatearFecha } from '../../compartido/utilidades/formato.js';

function estadoDeActividad(actividad) {
  if (actividad.stato_attivita === 'completata') return 'completata';
  if (actividad.stato_attivita === 'in_corso') return 'in_corso';
  if (actividad.stato_attivita === 'in_viaggio') return 'in_viaggio';
  return actividad.priorita === 'alta' ? 'vencido' : 'aperta';
}

function prioridad(c) {
  return { bassa: c.priorityLow, normale: c.priorityNormal, alta: c.priorityHigh };
}

export function DetalleActividad({ actividad, c, idioma, alCerrar, alTomar, alCerrarTarea }) {
  useBloquearScroll();

  if (!actividad) return null;

  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true">
      <section className="sheet detail-sheet task-sheet">
        <header>
          <div>
            <p className="eyebrow">{c.activityDetail}</p>
            <h2>
              {actividad.marca} {actividad.modello} · {actividad.codice_unico}
            </h2>
          </div>
          <button onClick={alCerrar} aria-label={c.close}>
            <X />
          </button>
        </header>
        <main>
          <div className="detail-line">
            <b>{actividad.cliente}</b>
            <small>
              <MapPin size={13} /> {actividad.indirizzo || '—'}
            </small>
          </div>

          <div className="detail-meta">
            <span>
              <CalendarClock size={13} /> {c.estimatedDate}
              <b>{formatearFecha(actividad.scadenza, idioma)}</b>
            </span>
            <span>
              <ClipboardList size={13} /> {c.importance}
              <b>{prioridad(c)[actividad.priorita] ?? actividad.priorita}</b>
            </span>
            <span>
              <Users size={13} /> {c.assignedTechnicians}
              <b>{actividad.tecnici || '—'}</b>
            </span>
            <Estado value={estadoDeActividad(actividad)} c={c} />
          </div>

          {actividad.motivo_priorita && (
            <p className="priority-reason detail-note">{actividad.motivo_priorita}</p>
          )}

          <h3>{c.problem}</h3>
          <p className="detail-note">{actividad.osservazione || '—'}</p>

          {actividad.descrizione_chiusura && (
            <>
              <h3>{c.closingDescription}</h3>
              <p className="detail-note">{actividad.descrizione_chiusura}</p>
            </>
          )}

          {actividad.richiede_appuntamento && (
            <p className="check-line">
              <Check size={15} /> {c.appointment}
            </p>
          )}
        </main>
        <footer>
          <button type="button" onClick={alCerrar}>
            {c.close}
          </button>
          {actividad.stato_attivita === 'aperta' && (
            <button className="primary" onClick={() => alTomar(actividad.id)}>
              {c.take}
            </button>
          )}
          {actividad.stato_attivita !== 'completata' && actividad.stato_attivita !== 'aperta' && (
            <button className="primary" onClick={() => alCerrarTarea(actividad.id)}>
              {c.closeTask}
            </button>
          )}
          {actividad.stato_attivita === 'aperta' && (
            <button className="primary" onClick={() => alCerrarTarea(actividad.id)}>
              {c.closeTask}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
