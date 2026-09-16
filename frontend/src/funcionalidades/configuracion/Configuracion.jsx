import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Plus, Search } from 'lucide-react';
import { llamarApi } from '../../compartido/api/cliente.js';
import { Estado } from '../../compartido/componentes/Estado.jsx';
import { FormularioRegistro } from './FormularioRegistro.jsx';
import { RECURSOS_CONFIGURABLES, metadatosDeRecurso } from './catalogo.js';

export function Configuracion({ c }) {
  const [recurso, setRecurso] = useState(null);
  const [filas, setFilas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [edicion, setEdicion] = useState(null);
  const [consulta, setConsulta] = useState('');
  const [error, setError] = useState('');

  const cargar = async () => {
    if (!recurso) return;
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
    }
  };

  useEffect(() => {
    cargar();
  }, [recurso]);

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
      <section className="config-records">
        {filtradas.map((fila) => (
          <article key={fila.id} className={fila.stato === 'inattivo' ? 'inactive' : ''}>
            <button className="record-open" onClick={() => setEdicion(fila)}>
              <span>
                <b>
                  {recurso === 'macchine'
                    ? `${fila.fornitore || '—'} ${fila.modello || ''} · ${fila.codice_unico}`
                    : fila.nome || fila.codice_unico}
                </b>
                <small>
                  {recurso === 'macchine' ? `${fila.cliente || ''} · ${fila.indirizzo || ''}` : fila.codice || fila.unita_misura || ''}
                </small>
              </span>
            </button>
            <Estado value={fila.stato === 'attivo' ? 'risolto' : 'da_rifare'} c={c} />
            <button title={c.edit} onClick={() => setEdicion(fila)}>
              <Pencil size={17} />
            </button>
          </article>
        ))}
      </section>
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
