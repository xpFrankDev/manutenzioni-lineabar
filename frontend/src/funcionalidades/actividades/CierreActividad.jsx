import { useEffect, useState } from 'react';
import { Minus, Plus, Search, X } from 'lucide-react';
import { llamarApi } from '../../compartido/api/cliente.js';
import { formatearMoneda } from '../../compartido/utilidades/formato.js';
import { useAvisos } from '../../compartido/componentes/Avisos.jsx';
import { SkeletonSheet } from '../../compartido/componentes/Skeleton.jsx';
import { useBloquearScroll } from '../../compartido/utilidades/scroll.js';

export function CierreActividad({ id, c, idioma, alCerrar, alGuardar }) {
  useBloquearScroll();
  const { notificar } = useAvisos();
  const [actividad, setActividad] = useState(null);
  const [piezas, setPiezas] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [consulta, setConsulta] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [horas, setHoras] = useState(1);
  const [personas, setPersonas] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    llamarApi(`/attivita/${id}`)
      .then(async (detalle) => {
        setActividad(detalle);
        let maquinaId = detalle.macchina_id;
        if (!maquinaId) {
          const maquinas = await llamarApi('/maquinas');
          maquinaId = maquinas.find((candidata) => candidata.codice_unico === detalle.codice_unico)?.id;
        }
        if (maquinaId) setPiezas(await llamarApi(`/piezas?maquina_id=${maquinaId}`));
      })
      .catch((e) => setError(e.message));
  }, [id]);

  function cambiarCantidad(pieza, delta) {
    setCarrito((actual) => {
      const existente = actual.find((linea) => linea.id === pieza.id);
      const cantidad = Math.max(0, (existente?.qty || 0) + delta);
      if (!cantidad) return actual.filter((linea) => linea.id !== pieza.id);
      if (existente) return actual.map((linea) => (linea.id === pieza.id ? { ...linea, qty: cantidad } : linea));
      return [...actual, { ...pieza, qty: cantidad }];
    });
  }

  async function guardar(evento) {
    evento.preventDefault();
    try {
      await llamarApi(`/attivita/${id}/chiudi`, {
        method: 'POST',
        body: JSON.stringify({
          descrizione: descripcion,
          ore: horas,
          persone: personas,
          ricambi: carrito.map((linea) => ({ pezzoId: linea.id, quantita: linea.qty }))
        })
      });
      notificar(c.saved);
      alGuardar();
    } catch (e) {
      setError(e.message);
      notificar(e.message, 'error');
    }
  }

  const filtradas = piezas.filter((pieza) =>
    `${pieza.nome} ${pieza.codice_unico}`.toLowerCase().includes(consulta.toLowerCase())
  );

  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true">
      <form className="sheet task-sheet" onSubmit={guardar}>
        <header>
          <div>
            <h2>{c.closeTask}</h2>
          </div>
          <button type="button" onClick={alCerrar} aria-label={c.cancel}>
            <X />
          </button>
        </header>
        <main>
          {!actividad && <SkeletonSheet />}
          {actividad && (
            <div className="detail-line">
              <b>
                {actividad.marca} {actividad.modello} · {actividad.codice_unico}
              </b>
              <small>{actividad.cliente}</small>
            </div>
          )}
          <label>
            {c.closingDescription}
            <textarea
              required
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder={c.closingPlaceholder}
            />
          </label>
          <div className="labour">
            <label>
              {c.hours}
              <input type="number" min=".5" step=".5" value={horas} onChange={(e) => setHoras(Number(e.target.value))} />
            </label>
            <label>
              {c.people}
              <input type="number" min="1" value={personas} onChange={(e) => setPersonas(Number(e.target.value))} />
            </label>
          </div>
          <label>
            {c.parts}
            <div className="search">
              <Search size={18} />
              <input value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder={c.findPart} />
            </div>
          </label>
          <div className="results">
            {filtradas.map((pieza) => {
              const elegida = carrito.find((linea) => linea.id === pieza.id);
              return (
                <article key={pieza.id}>
                  <span>
                    <b>{pieza.nome}</b>
                    <small>{pieza.codice_unico}</small>
                  </span>
                  <strong>{formatearMoneda(pieza.prezzo, idioma)}</strong>
                  <div className="qty">
                    <button disabled={!elegida} type="button" onClick={() => cambiarCantidad(pieza, -1)}>
                      <Minus size={15} />
                    </button>
                    <b>{elegida?.qty || 0}</b>
                    <button type="button" onClick={() => cambiarCantidad(pieza, 1)}>
                      <Plus size={15} />
                    </button>
                  </div>
                </article>
              );
            })}
            {!filtradas.length && <p className="empty-state">{c.noPartsForMachine}</p>}
          </div>
          {error && <p className="error">{error}</p>}
        </main>
        <footer>
          <button type="button" onClick={alCerrar} aria-label={c.cancel}>
            {c.cancel}
          </button>
          <button className="primary">{c.close}</button>
        </footer>
      </form>
    </div>
  );
}
