import { useEffect, useState } from 'react';
import { Ban, Building2, ChevronLeft, ChevronRight, Pencil, Plus, Search } from 'lucide-react';
import { llamarApi } from '../../compartido/api/cliente.js';
import { useAvisos } from '../../compartido/componentes/Avisos.jsx';
import { FormularioEmpresa } from './FormularioEmpresa.jsx';
import { FormularioRegistro } from './FormularioRegistro.jsx';
import { PermisosRoles } from './PermisosRoles.jsx';
import { SkeletonList } from '../../compartido/componentes/Skeleton.jsx';
import { RECURSOS_CONFIGURABLES, metadatosDeRecurso } from './catalogo.js';

export function Configuracion({ c }) {
  const { confirmar, notificar } = useAvisos();
  const [recurso, setRecurso] = useState(null);
  const [filas, setFilas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [edicion, setEdicion] = useState(null);
  const [consulta, setConsulta] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const cargar = async () => {
    if (!recurso || recurso === 'roles' || recurso === 'azienda') return;
    setCargando(true);
    try {
      const [listado, listaProveedores, listaClientes] = await Promise.all([
        llamarApi(`/configurazione/${recurso}`),
        llamarApi('/configurazione/fornitori'),
        llamarApi('/clienti')
      ]);
      setFilas(listado);
      setProveedores(listaProveedores.filter((proveedor) => proveedor.stato === 'attivo'));
      setClientes(listaClientes);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [recurso]);

  async function desactivar(fila) {
    const confirmado = await confirmar({
      titulo: c.deactivate,
      mensaje: `${c.deactivate}: ${fila.nome ?? fila.codice_unico}. ${c.confirmDeactivate}`,
      textoConfirmar: c.deactivate,
      textoCancelar: c.cancel,
      peligro: true
    });
    if (!confirmado) return;
    try {
      await llamarApi(`/configurazione/${recurso}/${fila.id}`, { method: 'DELETE' });
      notificar(c.saved);
      await cargar();
    } catch (e) {
      setError(e.message);
      notificar(e.message, 'error');
    }
  }

  if (!recurso) {
    return (
      <main className="content settings-home">
        <header className="intro">
          <div>
            <h1>{c.masters}</h1>
            <p>{c.mastersHelp}</p>
          </div>
        </header>
        <section className="settings-grid">
          <button onClick={() => setRecurso('azienda')}>
            <i><Building2 size={21} /></i>
            <span><b>{c.company}</b><small>{c.companyHelp}</small></span>
            <ChevronRight size={18} />
          </button>
          {RECURSOS_CONFIGURABLES.map(([clave, Icono, etiqueta]) => (
            <button key={clave} onClick={() => setRecurso(clave)}>
              <i>
                <Icono size={21} />
              </i>
              <span>
                <b>{c[etiqueta]}</b>
                <small>{c.entries}</small>
              </span>
              <ChevronRight size={18} />
            </button>
          ))}
        </section>
      </main>
    );
  }

  if (recurso === 'roles') {
    return <PermisosRoles c={c} alVolver={() => setRecurso(null)} />;
  }
  if (recurso === 'azienda') {
    return <FormularioEmpresa c={c} alVolver={() => setRecurso(null)} />;
  }

  const { Icono, etiqueta } = metadatosDeRecurso(recurso);
  const filtradas = filas.filter((fila) => Object.values(fila).join(' ').toLowerCase().includes(consulta.toLowerCase()));

  return (
    <main className="content settings-list">
      <header className="settings-header">
        <button className="back-button" onClick={() => setRecurso(null)}>
          <ChevronLeft size={20} />
          {c.settings}
        </button>
        <div>
          <h1>
            <Icono size={26} />
            {c[etiqueta]}
          </h1>
        </div>
        <button className="primary add-record" onClick={() => setEdicion({})}>
          <Plus size={17} />
          {c.add}
        </button>
      </header>
      <div className="settings-search">
        <Search size={18} />
        <input value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder={c.search} />
      </div>
      {error && <p className="error">{error}</p>}
      {cargando ? (
        <SkeletonList filas={5} />
      ) : (
      <section className="config-records">
        {filtradas.map((fila) => (
          <article key={fila.id} className={fila.stato === 'inattivo' ? 'inactive' : ''}>
            <button className="record-open" onClick={() => setEdicion(fila)}>
              <span>
                {recurso === 'modelli' && fila.immagine_url && (
                  <img className="catalog-thumb" src={fila.immagine_url} alt="" loading="lazy" />
                )}
                <b>
                  {recurso === 'macchine'
                    ? `${fila.fornitore || '—'} ${fila.modello || ''} · ${fila.codice_unico} · ${fila.matricola || '—'}`
                    : recurso === 'utenti'
                      ? `${fila.nome} · ${fila.codice_usuario}`
                      : recurso === 'parametri'
                        ? fila.chiave
                        : fila.nome || fila.codice_unico}
                </b>
                <small>
                  {recurso === 'macchine'
                    ? `${fila.cliente || ''} · ${fila.indirizzo || ''}`
                    : recurso === 'utenti'
                      ? `${fila.email} · ${fila.ruolo}`
                      : recurso === 'parametri'
                        ? `${fila.valore} · ${fila.descrizione ?? ''}`
                        : fila.caratteristiche_label || fila.marca || fila.codice || fila.unita_misura || fila.fornitore || ''}
                </small>
              </span>
            </button>
            <span className={`status ${fila.stato === 'attivo' ? 'good' : 'warn'}`}>
              {fila.stato === 'attivo' ? c.active : c.inactive}
            </span>
            <button title={c.edit} aria-label={`${c.edit}: ${fila.nome ?? fila.codice_unico ?? ''}`} onClick={() => setEdicion(fila)}>
              <Pencil size={17} />
            </button>
            {fila.stato === 'attivo' && (
              <button
                title={c.deactivate}
                aria-label={`${c.deactivate}: ${fila.nome ?? fila.codice_unico ?? ''}`}
                onClick={() => desactivar(fila)}
              >
                <Ban size={17} />
              </button>
            )}
          </article>
        ))}
      </section>
      )}
      {edicion && (
        <FormularioRegistro
          recurso={recurso}
          registro={edicion.id ? edicion : null}
          proveedores={proveedores}
          clientes={clientes}
          c={c}
          alCerrar={() => setEdicion(null)}
          alGuardar={() => {
            setEdicion(null);
            cargar();
          }}
        />
      )}
    </main>
  );
}
