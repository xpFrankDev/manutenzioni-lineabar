import { useEffect, useState } from 'react';
import {
  CalendarRange,
  Check,
  ChevronRight,
  MapPin,
  Navigation,
  Play,
  Sparkles,
  X
} from 'lucide-react';
import { llamarApi } from '../../compartido/api/cliente.js';
import { Estado } from '../../compartido/componentes/Estado.jsx';
import { useAvisos } from '../../compartido/componentes/Avisos.jsx';
import { fechaDeHoy, formatearFecha } from '../../compartido/utilidades/formato.js';
import { useBloquearScroll } from '../../compartido/utilidades/scroll.js';
import { CierreActividad } from '../actividades/CierreActividad.jsx';

function etiquetaOrigen(programa, c) {
  return programa.origine === 'ia' ? c.aiGenerated : c.fallbackGenerated;
}

function TarjetaPrograma({ programa, c, idioma, alAbrir }) {
  const total = Number(programa.tappe ?? 0);
  const completadas = Number(programa.completate ?? 0);
  return (
    <button type="button" className="program-card" onClick={() => alAbrir(programa)}>
      <i>
        <CalendarRange size={19} />
      </i>
      <span>
        <b>{formatearFecha(programa.data, idioma)}</b>
        <small>
          {programa.tecnico || c.unassigned} · {total} {c.stops} · {completadas} {c.completedStops}
        </small>
        <small>
          {c.programOrigin}: {etiquetaOrigen(programa, c)} · <Estado value={programa.stato} c={c} />
        </small>
      </span>
      <ChevronRight size={18} />
    </button>
  );
}

function DetallePrograma({ id, c, idioma, usuario, alCerrar, alActualizar }) {
  useBloquearScroll();
  const { notificar } = useAvisos();
  const [programa, setPrograma] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cerrando, setCerrando] = useState(null);

  const cargar = async () => {
    try {
      setPrograma(await llamarApi(`/programmazioni/${id}`));
    } catch (e) {
      notificar(e.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [id]);

  async function actualizar(accion) {
    try {
      await accion();
      await cargar();
      alActualizar();
    } catch (e) {
      notificar(e.message, 'error');
    }
  }

  async function tomar() {
    await actualizar(() => llamarApi(`/programmazioni/${id}/prendi`, { method: 'POST' }));
  }

  async function estadoLote(estado) {
    await actualizar(() =>
      llamarApi(`/programmazioni/${id}/stato`, { method: 'PATCH', body: JSON.stringify({ stato }) })
    );
  }

  async function estadoTappa(tappaId, estado) {
    await actualizar(() =>
      llamarApi(`/attivita/${tappaId}/stato`, { method: 'PATCH', body: JSON.stringify({ stato }) })
    );
  }

  if (cargando) return <div className="sheet-wrap" role="dialog" aria-modal="true"><section className="sheet task-sheet loading-sheet">{c.loading}</section></div>;
  if (!programa) return null;

  const esTecnico = usuario?.ruolo === 'tecnico';
  const puedeTomar = esTecnico && !programa.fk_tecnico;
  const puedeIniciar = programa.stato === 'pianificata' && (programa.fk_tecnico === usuario?.sub || !esTecnico);
  const puedeCompletar = programa.stato === 'in_corso';

  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true">
      <section className="sheet task-sheet program-sheet">
        <header>
          <div>
            <p className="eyebrow">{c.programDetail}</p>
            <h2>{formatearFecha(programa.data, idioma)}</h2>
          </div>
          <button type="button" onClick={alCerrar} aria-label={c.close}><X /></button>
        </header>
        <main>
          <div className="detail-line">
            <b>{programa.tecnico || c.unassigned}</b>
            <small>{c.programOrigin}: {etiquetaOrigen(programa, c)} · {programa.tappe?.length ?? 0} {c.stops}</small>
            {programa.riepilogo && <small>{programa.riepilogo}</small>}
          </div>

          <div className="program-stop-list">
            {(programa.tappe ?? []).map((tappa) => (
              <article className="program-stop" key={tappa.id}>
                <span className="stop-number">{tappa.ordine_tappa}</span>
                <div>
                  <b>{tappa.cliente}</b>
                  <small>{tappa.codice_unico} · {tappa.matricola || '—'}</small>
                  <small><MapPin size={12} /> {tappa.indirizzo}, {tappa.citta}</small>
                  <small>
                    {Number(tappa.minuti_da_precedente) > 0
                      ? `${tappa.minuti_da_precedente} ${c.minutesBefore}`
                      : c.firstStop}
                  </small>
                  <div className="stop-actions">
                    {tappa.url_mappe && (
                      <a href={tappa.url_mappe} target="_blank" rel="noreferrer">
                        <Navigation size={13} /> {c.openMaps}
                      </a>
                    )}
                    {tappa.stato_attivita !== 'completata' && (
                      <>
                        {tappa.stato_attivita === 'aperta' && (
                          <button type="button" onClick={() => estadoTappa(tappa.id, 'in_viaggio')}>
                            <Navigation size={13} /> {c.onTheWay}
                          </button>
                        )}
                        <button type="button" onClick={() => setCerrando(tappa.id)}>
                          <Check size={13} /> {c.completed}
                        </button>
                      </>
                    )}
                    <Estado value={tappa.stato_attivita} c={c} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </main>
        <footer>
          <button type="button" onClick={alCerrar}>{c.close}</button>
          {puedeTomar && <button type="button" className="primary" onClick={tomar}><Play size={15} /> {c.takeBatch}</button>}
          {puedeIniciar && <button type="button" className="primary" onClick={() => estadoLote('in_corso')}><Play size={15} /> {c.startBatch}</button>}
          {puedeCompletar && <button type="button" className="primary" onClick={() => estadoLote('completata')}><Check size={15} /> {c.completeBatch}</button>}
        </footer>
      </section>
      {cerrando && (
        <CierreActividad
          id={cerrando}
          c={c}
          idioma={idioma}
          alCerrar={() => setCerrando(null)}
          alGuardar={() => {
            setCerrando(null);
            cargar();
            alActualizar();
          }}
        />
      )}
    </div>
  );
}

export function Programmazione({ c, idioma, usuario }) {
  const { notificar } = useAvisos();
  const [programas, setProgramas] = useState(null);
  const [seleccion, setSeleccion] = useState(null);
  const [tecnicos, setTecnicos] = useState([]);
  const [candidatos, setCandidatos] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [formulario, setFormulario] = useState({
    data: fechaDeHoy(),
    tecnicoId: '',
    maxTappe: 6,
    minutiMin: 10,
    minutiMax: 30
  });
  const esAdministrador = usuario?.ruolo === 'amministratore';

  const cargar = () =>
    llamarApi('/programmazioni')
      .then(setProgramas)
      .catch((e) => notificar(e.message, 'error'));

  useEffect(() => {
    cargar();
    if (esAdministrador) {
      llamarApi('/tecnici')
        .then((lista) => {
          setTecnicos(lista);
          setFormulario((actual) => ({ ...actual, tecnicoId: actual.tecnicoId || lista[0]?.id || '' }));
        })
        .catch((e) => notificar(e.message, 'error'));
    }
  }, []);

  useEffect(() => {
    if (!esAdministrador || !formulario.data) return;
    setCandidatos(null);
    llamarApi(`/programmazioni/candidati?data=${formulario.data}`)
      .then(setCandidatos)
      .catch(() => setCandidatos([]));
  }, [formulario.data, esAdministrador]);

  async function generar() {
    setGenerando(true);
    try {
      await llamarApi('/programmazioni/genera', { method: 'POST', body: JSON.stringify(formulario) });
      notificar(c.programCreated);
      await cargar();
    } catch (e) {
      notificar(e.message, 'error');
    } finally {
      setGenerando(false);
    }
  }

  return (
    <main className="content operational">
      <header className="list-title">
        <div>
          <h1>{c.programming}</h1>
          <p>{c.programmingHelp}</p>
        </div>
      </header>

      {esAdministrador && (
        <section className="program-form">
          <label>
            {c.date}
            <input type="date" value={formulario.data} onChange={(e) => setFormulario({ ...formulario, data: e.target.value })} />
          </label>
          <label>
            {c.technician}
            <select value={formulario.tecnicoId} onChange={(e) => setFormulario({ ...formulario, tecnicoId: e.target.value })}>
              <option value="">{c.select}</option>
              {tecnicos.map((tecnico) => <option key={tecnico.id} value={tecnico.id}>{tecnico.nome}</option>)}
            </select>
          </label>
          <label>
            {c.maxStops}
            <input type="number" min="3" max="6" value={formulario.maxTappe} onChange={(e) => setFormulario({ ...formulario, maxTappe: Number(e.target.value) })} />
          </label>
          <label>
            {c.minutesMin}
            <input type="number" min="5" max="90" value={formulario.minutiMin} onChange={(e) => setFormulario({ ...formulario, minutiMin: Number(e.target.value) })} />
          </label>
          <label>
            {c.minutesMax}
            <input type="number" min="10" max="120" value={formulario.minutiMax} onChange={(e) => setFormulario({ ...formulario, minutiMax: Number(e.target.value) })} />
          </label>
          <button className="primary" onClick={generar} disabled={generando || !formulario.tecnicoId}>
            <Sparkles size={16} /> {generando ? c.loading : c.generateProgram}
          </button>
          <small>
            {candidatos === null ? c.loading : `${candidatos.length} ${c.candidatesFound}`}
          </small>
          {candidatos?.length === 0 && <small className="muted">{c.noCandidates}</small>}
        </section>
      )}

      <section className="program-list">
        {programas === null ? (
          <p className="loading">{c.loading}</p>
        ) : programas.length ? (
          programas.map((programa) => (
            <TarjetaPrograma key={programa.id} programa={programa} c={c} idioma={idioma} alAbrir={setSeleccion} />
          ))
        ) : (
          <p className="empty-state">{c.noPrograms}</p>
        )}
      </section>

      {seleccion && (
        <DetallePrograma
          id={seleccion.id}
          c={c}
          idioma={idioma}
          usuario={usuario}
          alCerrar={() => setSeleccion(null)}
          alActualizar={cargar}
        />
      )}
    </main>
  );
}
