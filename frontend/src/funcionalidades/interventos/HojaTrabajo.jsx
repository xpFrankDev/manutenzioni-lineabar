import { useEffect, useState } from 'react';
import { Building2, Camera, Check, ChevronRight, CircleAlert, Clock3, Minus, Plus, ReceiptText, Search, Users, Wrench, X } from 'lucide-react';
import { llamarApi } from '../../compartido/api/cliente.js';
import { ICONOS_MAQUINA } from '../../compartido/dominio/maquinas.js';
import { importeManoDeObra } from '../../compartido/dominio/mano-de-obra.js';
import { fechaDeHoy, formatearMoneda } from '../../compartido/utilidades/formato.js';

export function HojaTrabajo({ tipo, c, idioma, alCerrar, alGuardar }) {
  const [paso, setPaso] = useState(1);
  const [maquinas, setMaquinas] = useState([]);
  const [piezas, setPiezas] = useState([]);
  const [maquina, setMaquina] = useState(null);
  const [consulta, setConsulta] = useState('');
  const [consultaPieza, setConsultaPieza] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [horas, setHoras] = useState(1);
  const [personas, setPersonas] = useState(1);
  const [notas, setNotas] = useState('');
  const [resultado, setResultado] = useState('risolto');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const esBoleta = tipo === 'receipt';

  useEffect(() => {
    llamarApi('/maquinas')
      .then(setMaquinas)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!maquina) return;
    setCarrito([]);
    llamarApi(`/piezas?maquina_id=${maquina.id}`)
      .then(setPiezas)
      .catch((e) => setError(e.message));
  }, [maquina]);

  const maquinasFiltradas = maquinas.filter((m) =>
    `${m.codice_unico} ${m.modello} ${m.cliente}`.toLowerCase().includes(consulta.toLowerCase())
  );
  const piezasFiltradas = piezas.filter((p) =>
    `${p.nome} ${p.codice_unico}`.toLowerCase().includes(consultaPieza.toLowerCase())
  );
  const total = carrito.reduce((suma, linea) => suma + Number(linea.prezzo) * linea.qty, 0) + importeManoDeObra(horas, personas);

  function cambiarCantidad(pieza, delta) {
    setCarrito((actual) => {
      const existente = actual.find((linea) => linea.id === pieza.id);
      const cantidad = Math.max(0, (existente?.qty || 0) + delta);
      if (!cantidad) return actual.filter((linea) => linea.id !== pieza.id);
      if (existente) return actual.map((linea) => (linea.id === pieza.id ? { ...linea, qty: cantidad } : linea));
      return [...actual, { ...pieza, qty: cantidad }];
    });
  }

  function continuar() {
    if (paso === 1 && !maquina) return setError(c.required);
    if (paso === 2 && esBoleta && !carrito.length) return setError(c.noPart);
    setError('');
    setPaso(paso + 1);
    return undefined;
  }

  async function guardar() {
    setGuardando(true);
    try {
      const cuerpo = {
        clienteId: maquina.cliente_id,
        macchinaId: maquina.id,
        data: fechaDeHoy(),
        ubicazione: esBoleta ? 'cliente' : 'magazzino',
        note: notas,
        esito: resultado,
        ore: horas,
        persone: personas,
        ricambi: carrito.map((linea) => ({ pezzoId: linea.id, quantita: linea.qty }))
      };
      await llamarApi(esBoleta ? '/boletas' : '/interventi', { method: 'POST', body: JSON.stringify(cuerpo) });
      alGuardar();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  const titulo = esBoleta ? c.newReceipt : c.newJob;

  return (
    <div className="sheet-wrap">
      <section className="sheet">
        <header>
          <div>
            <p className="eyebrow">{titulo}</p>
            <h2>{paso === 1 ? c.machine : paso === 2 ? c.parts : c.details}</h2>
          </div>
          <button onClick={alCerrar}>
            <X />
          </button>
        </header>
        <div className={`workflow-note ${esBoleta ? 'receipt' : 'warehouse'}`}>
          <span>{esBoleta ? <ReceiptText size={18} /> : <Building2 size={18} />}</span>
          {esBoleta ? c.receiptHint : c.maintenanceHint}
        </div>
        <div className="steps">
          <b className={paso >= 1 ? 'on' : ''}>1</b>
          <i />
          <b className={paso >= 2 ? 'on' : ''}>2</b>
          <i />
          <b className={paso >= 3 ? 'on' : ''}>3</b>
        </div>
        <main>
          {paso === 1 && (
            <>
              {esBoleta && (
                <button className="scan" type="button">
                  <Camera size={20} />
                  <span>
                    <b>{c.scan}</b>
                    <small>{c.scanHint}</small>
                  </span>
                </button>
              )}
              <label>
                {c.machine}
                <div className="search">
                  <Search size={18} />
                  <input value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder={c.findMachine} />
                </div>
              </label>
              <div className="results">
                {maquinasFiltradas.map((m) => {
                  const Icono = ICONOS_MAQUINA[m.tipo_macchina] || Wrench;
                  return (
                    <button className={maquina?.id === m.id ? 'chosen' : ''} key={m.id} onClick={() => setMaquina(m)}>
                      <i>
                        <Icono size={18} />
                      </i>
                      <span>
                        <b>
                          {m.marca} {m.modello} · {m.codice_unico}
                        </b>
                        <small>
                          {m.cliente} · {m.indirizzo}
                        </small>
                      </span>
                      {maquina?.id === m.id && <Check size={18} />}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {paso === 2 && (
            <>
              <div className="machine">
                <i>
                  <Wrench size={19} />
                </i>
                <span>
                  <b>
                    {maquina.marca} {maquina.modello} · {maquina.codice_unico}
                  </b>
                  <small>
                    {maquina.cliente} · {maquina.indirizzo}
                  </small>
                </span>
                <button onClick={() => setPaso(1)}>{c.back}</button>
              </div>
              <label>
                {c.parts}
                <div className="search">
                  <Search size={18} />
                  <input value={consultaPieza} onChange={(e) => setConsultaPieza(e.target.value)} placeholder={c.findPart} />
                </div>
              </label>
              <div className="results">
                {piezasFiltradas.map((pieza) => {
                  const seleccionada = carrito.find((linea) => linea.id === pieza.id);
                  return (
                    <article key={pieza.id}>
                      <span>
                        <b>{pieza.nome}</b>
                        <small>{pieza.codice_unico}</small>
                      </span>
                      <strong>{formatearMoneda(pieza.prezzo, idioma)}</strong>
                      <div className="qty">
                        <button disabled={!seleccionada} onClick={() => cambiarCantidad(pieza, -1)}>
                          <Minus size={15} />
                        </button>
                        <b>{seleccionada?.qty || 0}</b>
                        <button onClick={() => cambiarCantidad(pieza, 1)}>
                          <Plus size={15} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="labour">
                <Clock3 size={19} />
                <label>
                  {c.hours}
                  <input
                    type="number"
                    min=".5"
                    step=".5"
                    value={horas}
                    onChange={(e) => setHoras(Math.max(0.5, Number(e.target.value)))}
                  />
                </label>
                <Users size={19} />
                <label>
                  {c.people}
                  <input
                    type="number"
                    min="1"
                    value={personas}
                    onChange={(e) => setPersonas(Math.max(1, Number(e.target.value)))}
                  />
                </label>
              </div>
            </>
          )}

          {paso === 3 && (
            <>
              <div className="summary">
                <span>{c.machine}</span>
                <b>
                  {maquina.marca} {maquina.modello} · {maquina.codice_unico}
                </b>
                {carrito.map((linea) => (
                  <p key={linea.id}>
                    {linea.nome} × {linea.qty}
                    <b>{formatearMoneda(linea.prezzo * linea.qty, idioma)}</b>
                  </p>
                ))}
                <p>
                  {c.labour}
                  <b>{formatearMoneda(importeManoDeObra(horas, personas), idioma)}</b>
                </p>
                {esBoleta && (
                  <>
                    <hr />
                    <div>
                      <b>{c.total}</b>
                      <strong>{formatearMoneda(total, idioma)}</strong>
                    </div>
                  </>
                )}
              </div>
              <label>
                {c.result}
                <select value={resultado} onChange={(e) => setResultado(e.target.value)}>
                  <option value="risolto">{c.resolved}</option>
                  <option value="parziale">{c.partial}</option>
                  <option value="da_rifare">{c.redo}</option>
                </select>
              </label>
              <label>
                {c.notes}
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder={esBoleta ? c.receiptHint : c.maintenanceHint}
                />
              </label>
            </>
          )}

          {error && (
            <p className="error">
              <CircleAlert size={16} />
              {error}
            </p>
          )}
        </main>
        <footer>
          <button onClick={() => (paso === 1 ? alCerrar() : setPaso(paso - 1))}>{paso === 1 ? c.cancel : c.back}</button>
          <button className="primary" disabled={guardando} onClick={() => (paso === 3 ? guardar() : continuar())}>
            {guardando ? '…' : paso === 3 ? c.save : c.next}
            <ChevronRight size={17} />
          </button>
        </footer>
      </section>
    </div>
  );
}
