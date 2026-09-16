import { useEffect, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { llamarApi } from '../../compartido/api/cliente.js';

export function CierreActividad({ id, c, alCerrar, alGuardar }) {
  const [actividad, setActividad] = useState(null);
  const [piezas, setPiezas] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [descripcion, setDescripcion] = useState('');
  const [horas, setHoras] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    llamarApi(`/attivita/${id}`)
      .then((detalle) => {
        setActividad(detalle);
        return llamarApi('/maquinas').then((maquinas) => ({ detalle, maquinas }));
      })
      .then(({ detalle, maquinas }) => {
        const maquina = maquinas.find((candidata) => candidata.codice_unico === detalle.codice_unico);
        if (maquina) return llamarApi(`/piezas?maquina_id=${maquina.id}`);
        return null;
      })
      .then((listaPiezas) => listaPiezas && setPiezas(listaPiezas))
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
          persone: 1,
          ricambi: carrito.map((linea) => ({ pezzoId: linea.id, quantita: linea.qty }))
        })
      });
      alGuardar();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="sheet-wrap">
      <form className="sheet task-sheet" onSubmit={guardar}>
        <header>
          <div>
            <h2>{c.closeTask}</h2>
          </div>
          <button type="button" onClick={alCerrar}>
            <X />
          </button>
        </header>
        <main>
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
          <label>
            {c.hours}
            <input type="number" min=".5" step=".5" value={horas} onChange={(e) => setHoras(Number(e.target.value))} />
          </label>
          <div className="results">
            {piezas.map((pieza) => {
              const elegida = carrito.find((linea) => linea.id === pieza.id);
              return (
                <article key={pieza.id}>
                  <span>
                    <b>{pieza.nome}</b>
                    <small>{pieza.codice_unico}</small>
                  </span>
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
          </div>
          {error && <p className="error">{error}</p>}
        </main>
        <footer>
          <button type="button" onClick={alCerrar}>
            {c.cancel}
          </button>
          <button className="primary">{c.close}</button>
        </footer>
      </form>
    </div>
  );
}
