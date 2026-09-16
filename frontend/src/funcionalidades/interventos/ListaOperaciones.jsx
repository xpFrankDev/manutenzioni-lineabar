import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Plus, Search } from 'lucide-react';
import { llamarApi } from '../../compartido/api/cliente.js';
import { Estado } from '../../compartido/componentes/Estado.jsx';
import { formatearFecha, formatearMoneda } from '../../compartido/utilidades/formato.js';
import { DetalleRegistro } from './DetalleRegistro.jsx';

export function ListaOperaciones({ tipo, c, idioma, alCrear }) {
  const [filas, setFilas] = useState(null);
  const [consulta, setConsulta] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [error, setError] = useState('');
  const esBoleta = tipo === 'boletas';

  useEffect(() => {
    llamarApi(`/${tipo}`)
      .then(setFilas)
      .catch((e) => setError(e.message));
  }, [tipo]);

  const listadas = useMemo(
    () => (!filas ? [] : filas.filter((fila) => Object.values(fila).join(' ').toLowerCase().includes(consulta.toLowerCase()))),
    [filas, consulta]
  );

  return (
    <main className="content operational">
      <header className="list-title">
        <div>
          <h1>{esBoleta ? c.receipts : c.jobs}</h1>
          <p>{esBoleta ? c.receiptHint : c.maintenanceHint}</p>
        </div>
        <button className="primary add-record" onClick={alCrear}>
          <Plus size={17} />
          {c.add}
        </button>
      </header>
      <div className="settings-search">
        <Search size={18} />
        <input value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder={c.search} />
      </div>
      {error && <p className="error">{error}</p>}
      <section className="operation-list">
        {filas === null ? (
          <p>{c.loading}</p>
        ) : listadas.length ? (
          listadas.map((fila) => (
            <article key={fila.id}>
              <button className="operation-main" onClick={() => setDetalle(fila.id)}>
                <span className="operation-name">
                  <b>{esBoleta ? fila.codice_boleta : `${fila.marca} ${fila.modello} · ${fila.codice_unico}`}</b>
                  <small>
                    {esBoleta ? `${fila.marca} ${fila.modello} · ${fila.codice_unico}` : fila.cliente || c.warehouse}
                  </small>
                  <small>
                    {fila.cliente && esBoleta ? `${fila.cliente} · ${fila.indirizzo}` : formatearFecha(fila.data, idioma)}
                  </small>
                </span>
                <ChevronRight size={18} />
              </button>
              <div className="operation-foot">
                <Estado value={esBoleta ? fila.stato : fila.esito} c={c} />
                <span>
                  {esBoleta ? formatearMoneda(fila.prezzo_totale, idioma) : fila.ubicazione === 'magazzino' ? c.warehouse : c.customerSite}
                </span>
              </div>
            </article>
          ))
        ) : (
          <p className="empty-state">{c.noRecords}</p>
        )}
      </section>
      {detalle && <DetalleRegistro tipo={tipo} id={detalle} c={c} idioma={idioma} alCerrar={() => setDetalle(null)} />}
    </main>
  );
}
