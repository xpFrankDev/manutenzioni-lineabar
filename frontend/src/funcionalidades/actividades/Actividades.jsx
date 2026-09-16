import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { llamarApi } from '../../compartido/api/cliente.js';
import { Estado } from '../../compartido/componentes/Estado.jsx';
import { formatearFecha } from '../../compartido/utilidades/formato.js';
import { CierreActividad } from './CierreActividad.jsx';
import { FormularioActividad } from './FormularioActividad.jsx';

function estadoDeActividad(actividad) {
  if (actividad.stato_attivita === 'completata') return 'risolto';
  if (actividad.stato_attivita === 'in_corso') return 'parziale';
  return actividad.priorita === 'alta' ? 'da_rifare' : 'parziale';
}

export function Actividades({ c, idioma }) {
  const [filas, setFilas] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cerrando, setCerrando] = useState(null);
  const [error, setError] = useState('');

  const cargar = () =>
    llamarApi('/attivita')
      .then(setFilas)
      .catch((e) => setError(e.message));
  const notificarCambio = () => {
    dispatchEvent(new Event('lineabar:tasks'));
    cargar();
  };

  useEffect(() => {
    cargar();
  }, []);

  async function tomar(id) {
    try {
      await llamarApi(`/attivita/${id}/prendi`, { method: 'POST' });
      notificarCambio();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <main className="content operational">
      <header className="list-title">
        <div>
          <h1>{c.tasks}</h1>
          <p>{c.tasksHelp}</p>
        </div>
        <button className="primary add-record" onClick={() => setMostrarFormulario(true)}>
          <Plus size={17} />
          {c.add}
        </button>
      </header>
      {error && <p className="error">{error}</p>}
      <section className="operation-list">
        {filas === null ? (
          <p>{c.loading}</p>
        ) : filas.length ? (
          filas.map((actividad) => (
            <article key={actividad.id}>
              <div className="operation-main">
                <span className="operation-name">
                  <b>
                    {actividad.marca} {actividad.modello} · {actividad.codice_unico}
                  </b>
                  <small>
                    {actividad.cliente} · {formatearFecha(actividad.scadenza, idioma)}
                  </small>
                  <small>{actividad.osservazione}</small>
                </span>
              </div>
              <div className="operation-foot">
                <Estado value={estadoDeActividad(actividad)} c={c} />
                <span>{actividad.tecnici}</span>
                {actividad.stato_attivita === 'aperta' && (
                  <button className="text-action" onClick={() => tomar(actividad.id)}>
                    {c.take}
                  </button>
                )}
                {actividad.stato_attivita !== 'completata' && (
                  <button className="text-action" onClick={() => setCerrando(actividad.id)}>
                    {c.close}
                  </button>
                )}
              </div>
            </article>
          ))
        ) : (
          <p className="empty-state">{c.noRecords}</p>
        )}
      </section>
      {mostrarFormulario && (
        <FormularioActividad
          c={c}
          alCerrar={() => setMostrarFormulario(false)}
          alGuardar={() => {
            setMostrarFormulario(false);
            notificarCambio();
          }}
        />
      )}
      {cerrando && (
        <CierreActividad
          id={cerrando}
          c={c}
          alCerrar={() => setCerrando(null)}
          alGuardar={() => {
            setCerrando(null);
            notificarCambio();
          }}
        />
      )}
    </main>
  );
}
