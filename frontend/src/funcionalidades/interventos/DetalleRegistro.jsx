import { useEffect, useState } from 'react';
import { CalendarClock, Clock3, X } from 'lucide-react';
import { llamarApi } from '../../compartido/api/cliente.js';
import { Estado } from '../../compartido/componentes/Estado.jsx';
import { formatearFecha, formatearMoneda } from '../../compartido/utilidades/formato.js';

export function DetalleRegistro({ tipo, id, c, idioma, alCerrar }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    llamarApi(`/${tipo}/${id}`)
      .then(setDatos)
      .catch((e) => setError(e.message));
  }, [tipo, id]);

  return (
    <div className="sheet-wrap">
      <section className="sheet detail-sheet">
        <header>
          <div>
            <p className="eyebrow">{tipo === 'boletas' ? c.receipts : c.jobs}</p>
            <h2>{datos?.codice_boleta || `${datos?.marca ?? ''} ${datos?.modello ?? ''}`.trim() || c.details}</h2>
          </div>
          <button onClick={alCerrar}>
            <X />
          </button>
        </header>
        <main>
          {error && <p className="error">{error}</p>}
          {!datos && <p>{c.loading}</p>}
          {datos && (
            <>
              <div className="detail-line">
                <b>
                  {datos.marca} {datos.modello} · {datos.codice_unico}
                </b>
                <small>
                  {datos.cliente || c.warehouse} · {datos.indirizzo || '—'}
                </small>
              </div>
              <div className="detail-meta">
                <span>
                  {c.created}
                  <b>{formatearFecha(datos.data, idioma)}</b>
                </span>
                <span>
                  {c.location}
                  <b>{datos.ubicazione === 'magazzino' ? c.warehouse : c.customerSite}</b>
                </span>
                <span>
                  {c.labour}
                  <b>
                    {Number(datos.ore ?? 0)} h × {Number(datos.persone ?? 1)}
                  </b>
                </span>
                <Estado value={datos.esito || datos.stato} c={c} />
              </div>
              {tipo === 'boletas' && <p className="detail-total">{formatearMoneda(datos.prezzo_totale, idioma)}</p>}
              {tipo === 'boletas' && datos.totales && (
                <p className="part-line">
                  <span>
                    <Clock3 size={14} /> {c.labour}
                  </span>
                  <b>{formatearMoneda(datos.totales.manoDeObra, idioma)}</b>
                </p>
              )}
              <h3>{c.partsUsed}</h3>
              {datos.ricambi.length ? (
                datos.ricambi.map((recambio) => (
                  <p className="part-line" key={recambio.codice_unico}>
                    <span>
                      {recambio.nome} × {recambio.quantita}
                    </span>
                    <b>{formatearMoneda(Number(recambio.prezzo_unitario) * Number(recambio.quantita), idioma)}</b>
                  </p>
                ))
              ) : (
                <p className="empty-state">{c.noPart}</p>
              )}
              {datos.prossime?.length > 0 && (
                <>
                  <h3>
                    <CalendarClock size={15} /> {c.nextMaintenance}
                  </h3>
                  {datos.prossime.map((proxima) => (
                    <p className="part-line" key={`${proxima.pezzo}-${proxima.prossima_manutenzione}`}>
                      <span>{proxima.pezzo ?? c.machine}</span>
                      <b>{formatearFecha(proxima.prossima_manutenzione, idioma)}</b>
                    </p>
                  ))}
                </>
              )}
              {datos.note && (
                <>
                  <h3>{c.notes}</h3>
                  <p className="detail-note">{datos.note}</p>
                </>
              )}
            </>
          )}
        </main>
        <footer>
          <button className="primary" onClick={alCerrar}>
            {c.close}
          </button>
        </footer>
      </section>
    </div>
  );
}
