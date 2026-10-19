import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Search, Wrench, X } from 'lucide-react';
import { llamarApi } from '../../compartido/api/cliente.js';
import { nombreTipoMaquina } from '../../compartido/dominio/maquinas.js';

export function ListaMaquinas({ c, alAbrir }) {
  const [maquinas, setMaquinas] = useState(null);
  const [consulta, setConsulta] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    llamarApi('/maquinas')
      .then(setMaquinas)
      .catch((e) => setError(e.message));
  }, []);

  const filtradas = useMemo(() => {
    const texto = consulta.trim().toLowerCase();
    if (!maquinas) return [];
    if (!texto) return maquinas;
    return maquinas.filter((fila) =>
      `${fila.codice_unico} ${fila.modello} ${fila.cliente} ${fila.marca} ${fila.indirizzo}`.toLowerCase().includes(texto)
    );
  }, [maquinas, consulta]);

  return (
    <main className="content machine-list">
      <header className="list-title">
        <div>
          <h1>{c.machines}</h1>
          <p>{c.findMachineList}</p>
        </div>
      </header>

      <div className="settings-search">
        <Search size={18} />
        <input
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder={c.findMachineList}
          aria-label={c.findMachineList}
        />
        {consulta && (
          <button type="button" aria-label={c.cancel} onClick={() => setConsulta('')}>
            <X size={16} />
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <section className="machine-list-grid">
        {maquinas === null ? (
          <p>{c.loading}</p>
        ) : filtradas.length ? (
          filtradas.map((fila) => (
            <button className="machine-card" key={fila.id} onClick={() => alAbrir(fila.id)}>
              <i>
                <Wrench size={18} />
              </i>
              <span>
                <b>{fila.codice_unico}</b>
                <small>
                  {fila.marca ? `${fila.marca} · ` : ''}
                  {fila.modello || nombreTipoMaquina(fila.tipo_macchina, c)}
                </small>
                <small>
                  {fila.cliente} · {fila.indirizzo}
                </small>
              </span>
              <ChevronRight size={18} />
            </button>
          ))
        ) : (
          <p className="empty-state">{c.noMachines}</p>
        )}
      </section>
    </main>
  );
}
