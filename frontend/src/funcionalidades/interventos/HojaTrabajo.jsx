import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  CalendarClock,
  Camera,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Minus,
  Plus,
  ReceiptText,
  Search,
  Sparkles,
  Users,
  Wrench,
  X
} from 'lucide-react';
import { llamarApi } from '../../compartido/api/cliente.js';
import { proximasManutenciones } from '../../compartido/dominio/calendario.js';
import { TIPOS_MAQUINA, ICONOS_MAQUINA, nombreTipoMaquina } from '../../compartido/dominio/maquinas.js';
import { importeManoDeObra } from '../../compartido/dominio/mano-de-obra.js';
import { fechaDeHoy, formatearFecha, formatearMoneda } from '../../compartido/utilidades/formato.js';

const ANCHO_MAXIMO_FOTO = 1600;

async function comprimirImagen(archivo) {
  const original = await new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(lector.result);
    lector.onerror = rechazar;
    lector.readAsDataURL(archivo);
  });
  if (!('createImageBitmap' in window)) return original;

  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, ANCHO_MAXIMO_FOTO / Math.max(bitmap.width, bitmap.height));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(bitmap.width * escala);
    lienzo.height = Math.round(bitmap.height * escala);
    lienzo.getContext('2d').drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
    return lienzo.toDataURL('image/jpeg', 0.82);
  } catch {
    return original;
  }
}

export function HojaTrabajo({ tipo, c, idioma, alCerrar, alGuardar }) {
  const esBoleta = tipo === 'receipt';
  const [paso, setPaso] = useState(1);
  const [clientes, setClientes] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [parametros, setParametros] = useState({});
  const [piezas, setPiezas] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [maquina, setMaquina] = useState(null);
  const [carrito, setCarrito] = useState([]);
  const [consultaCliente, setConsultaCliente] = useState('');
  const [consultaMaquina, setConsultaMaquina] = useState('');
  const [consultaPieza, setConsultaPieza] = useState('');
  const [horas, setHoras] = useState(1);
  const [personas, setPersonas] = useState(1);
  const [notas, setNotas] = useState('');
  const [resultado, setResultado] = useState('risolto');
  const [fecha, setFecha] = useState(fechaDeHoy());
  const [nuevoCliente, setNuevoCliente] = useState(null);
  const [nuevaMaquina, setNuevaMaquina] = useState(null);
  const [scontrino, setScontrino] = useState(null);
  const [analizando, setAnalizando] = useState(false);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const entradaFoto = useRef(null);

  useEffect(() => {
    // Los datos indispensables del flujo: si fallan, se avisa y se detiene.
    Promise.all([llamarApi('/clienti'), llamarApi('/maquinas')])
      .then(([listaClientes, listaMaquinas]) => {
        setClientes(listaClientes);
        setMaquinas(listaMaquinas);
      })
      .catch((e) => setError(e.message));

    // Los auxiliares no deben bloquear el alta si alguno no responde.
    llamarApi('/marche')
      .then(setMarcas)
      .catch(() => {});
    llamarApi('/fornitori')
      .then(setProveedores)
      .catch(() => {});
    llamarApi('/parametros')
      .then(setParametros)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!maquina) return;
    setCarrito([]);
    llamarApi(`/piezas?maquina_id=${maquina.id}`)
      .then(setPiezas)
      .catch((e) => setError(e.message));
  }, [maquina]);

  const clientesFiltrados = useMemo(
    () => clientes.filter((fila) => `${fila.nome} ${fila.citta} ${fila.codice}`.toLowerCase().includes(consultaCliente.toLowerCase())),
    [clientes, consultaCliente]
  );
  const maquinasCliente = useMemo(
    () =>
      maquinas
        .filter((fila) => String(fila.cliente_id) === String(cliente?.id))
        .filter((fila) => `${fila.codice_unico} ${fila.modello} ${fila.marca}`.toLowerCase().includes(consultaMaquina.toLowerCase())),
    [maquinas, cliente, consultaMaquina]
  );
  const maquinasPorCliente = useMemo(() => {
    const conteo = new Map();
    for (const fila of maquinas) {
      const clave = String(fila.cliente_id);
      conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
    }
    return conteo;
  }, [maquinas]);
  const piezasFiltradas = useMemo(
    () => piezas.filter((fila) => `${fila.nome} ${fila.codice_unico}`.toLowerCase().includes(consultaPieza.toLowerCase())),
    [piezas, consultaPieza]
  );
  const tarifa = parametros.tarifa_mano_de_obra_hora;
  const importeRecambios = carrito.reduce((suma, linea) => suma + Number(linea.prezzo) * linea.qty, 0);
  const importeTrabajo = importeManoDeObra(horas, personas, tarifa);
  const total = importeRecambios + importeTrabajo;
  const cantidadPiezas = carrito.reduce((suma, linea) => suma + linea.qty, 0);
  const proximas = proximasManutenciones(fecha, carrito);

  const titulo = esBoleta ? c.newReceipt : c.newJob;
  const encabezado = paso === 1 ? c.stepClient : paso === 2 ? c.stepMachine : paso === 3 ? c.stepParts : c.stepSummary;

  function cambiarCantidad(pieza, delta) {
    setCarrito((actual) => {
      const existente = actual.find((linea) => linea.id === pieza.id);
      const cantidad = Math.max(0, (existente?.qty || 0) + delta);
      if (!cantidad) return actual.filter((linea) => linea.id !== pieza.id);
      if (existente) return actual.map((linea) => (linea.id === pieza.id ? { ...linea, qty: cantidad } : linea));
      return [...actual, { ...pieza, qty: cantidad }];
    });
  }

  function elegirCliente(seleccionado) {
    setCliente(seleccionado);
    setMaquina(null);
    setError('');
  }

  function continuar() {
    if (paso === 1 && !cliente) return setError(c.clientRequired);
    if (paso === 2 && !maquina) return setError(c.machineRequired);
    if (paso === 3 && esBoleta && !carrito.length) return setError(c.noPart);
    setError('');
    return setPaso(paso + 1);
  }

  async function analizarFoto(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    setAnalizando(true);
    setError('');
    try {
      const immagine = await comprimirImagen(archivo);
      const respuesta = await llamarApi('/scontrini/analisi', {
        method: 'POST',
        body: JSON.stringify({ immagine, nomeFile: archivo.name })
      });
      setScontrino({ ...respuesta, nombreArchivo: archivo.name });
      if (respuesta.cliente) {
        elegirCliente(respuesta.cliente);
      } else if (respuesta.analisi?.nome) {
        setNuevoCliente({
          nome: respuesta.analisi.nome,
          indirizzo: respuesta.analisi.indirizzo ?? '',
          citta: respuesta.analisi.citta ?? '',
          tipo_cliente: 'privato',
          fk_fornitore: ''
        });
      }
    } catch (e) {
      setError(`${c.scanError} ${e.message}`);
    } finally {
      setAnalizando(false);
    }
  }

  async function crearClienteDesdeFoto() {
    try {
      const resultado = await llamarApi(`/scontrini/${scontrino.id}/cliente`, {
        method: 'POST',
        body: JSON.stringify(nuevoCliente)
      });
      setClientes((actual) => [...actual.filter((fila) => fila.id !== resultado.cliente.id), resultado.cliente]);
      elegirCliente(resultado.cliente);
      setNuevoCliente(null);
    } catch (e) {
      setError(e.message);
    }
  }

  async function crearCliente() {
    try {
      const creado = await llamarApi('/clienti', { method: 'POST', body: JSON.stringify(nuevoCliente) });
      const completo = { ...nuevoCliente, id: creado.id, codice: creado.codice };
      setClientes((actual) => [...actual, completo].sort((a, b) => a.nome.localeCompare(b.nome)));
      elegirCliente(completo);
      setNuevoCliente(null);
    } catch (e) {
      setError(e.message);
    }
  }

  async function crearMaquina() {
    try {
      const creado = await llamarApi('/maquinas', { method: 'POST', body: JSON.stringify(nuevaMaquina) });
      const completo = {
        ...nuevaMaquina,
        id: creado.id,
        cliente_id: Number(nuevaMaquina.fk_cliente),
        cliente: cliente.nome,
        indirizzo: cliente.indirizzo,
        marca: marcas.find((marca) => String(marca.id) === String(nuevaMaquina.fk_marca))?.nome ?? ''
      };
      setMaquinas((actual) => [...actual, completo]);
      setMaquina(completo);
      setNuevaMaquina(null);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }

  async function guardar() {
    setGuardando(true);
    try {
      const cuerpo = {
        clienteId: cliente.id,
        macchinaId: maquina.id,
        data: fecha,
        ubicazione: esBoleta ? 'cliente' : 'magazzino',
        note: notas,
        esito: resultado,
        ore: horas,
        persone: personas,
        ricambi: carrito.map((linea) => ({ pezzoId: linea.id, quantita: linea.qty }))
      };
      if (scontrino?.id) cuerpo.scontrinoId = scontrino.id;
      await llamarApi(esBoleta ? '/boletas' : '/interventi', { method: 'POST', body: JSON.stringify(cuerpo) });
      alGuardar();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="sheet-wrap">
      <section className="sheet workflow">
        <header>
          <div>
            <p className="eyebrow">{titulo}</p>
            <h2>{encabezado}</h2>
          </div>
          <button onClick={alCerrar}>
            <X />
          </button>
        </header>
        {paso === 1 && (
          <div className={`workflow-note ${esBoleta ? 'receipt' : 'warehouse'}`}>
            <span>{esBoleta ? <ReceiptText size={18} /> : <Building2 size={18} />}</span>
            {esBoleta ? c.receiptHint : c.maintenanceHint}
          </div>
        )}
        <div className="steps">
          <b className={paso >= 1 ? 'on' : ''}>1</b>
          <i />
          <b className={paso >= 2 ? 'on' : ''}>2</b>
          <i />
          <b className={paso >= 3 ? 'on' : ''}>3</b>
          <i />
          <b className={paso >= 4 ? 'on' : ''}>4</b>
        </div>

        <main>
          {paso === 1 && (
            <>
              {esBoleta && (
                <>
                  <button type="button" className="scan" onClick={() => entradaFoto.current?.click()}>
                    <Camera size={20} />
                    <span>
                      <b>{analizando ? c.scanning : c.scan}</b>
                      <small>{c.scanHint}</small>
                    </span>
                  </button>
                  <input
                    ref={entradaFoto}
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={analizarFoto}
                    tabIndex={-1}
                  />
                  {scontrino && (
                    <div className="detected">
                      <Sparkles size={17} />
                      <span>
                        <b>{scontrino.analisi?.nome ? `${c.detectedClient}: ${scontrino.analisi.nome}` : c.photoSaved}</b>
                        <small>{scontrino.analisi?.messaggio ?? scontrino.messaggio ?? ''}</small>
                      </span>
                    </div>
                  )}
                </>
              )}

              {nuevoCliente ? (
                <div className="inline-form">
                  <p className="eyebrow">{c.newClient}</p>
                  <label>
                    {c.name}
                    <input value={nuevoCliente.nome} onChange={(e) => setNuevoCliente({ ...nuevoCliente, nome: e.target.value })} />
                  </label>
                  <label>
                    {c.address}
                    <input
                      value={nuevoCliente.indirizzo}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, indirizzo: e.target.value })}
                    />
                  </label>
                  <label>
                    {c.city}
                    <input value={nuevoCliente.citta} onChange={(e) => setNuevoCliente({ ...nuevoCliente, citta: e.target.value })} />
                  </label>
                  <label>
                    {c.clientType}
                    <select
                      value={nuevoCliente.tipo_cliente}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, tipo_cliente: e.target.value })}
                    >
                      <option value="privato">{c.private}</option>
                      <option value="fornitore">{c.linked}</option>
                    </select>
                  </label>
                  {nuevoCliente.tipo_cliente === 'fornitore' && (
                    <label>
                      {c.supplier}
                      <select
                        value={nuevoCliente.fk_fornitore}
                        onChange={(e) => setNuevoCliente({ ...nuevoCliente, fk_fornitore: e.target.value })}
                      >
                        <option value="">{c.select}</option>
                        {proveedores.map((proveedor) => (
                          <option key={proveedor.id} value={proveedor.id}>
                            {proveedor.nome}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="inline-actions">
                    <button type="button" onClick={() => setNuevoCliente(null)}>
                      {c.cancel}
                    </button>
                    <button type="button" className="primary" onClick={scontrino?.id && !scontrino.cliente ? crearClienteDesdeFoto : crearCliente}>
                      {scontrino?.id && !scontrino.cliente ? c.createFromPhoto : c.createClient}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="pick-hint">{c.selectClientHint}</p>
                  <div className="pick-row">
                    <div className="search">
                      <Search size={18} />
                      <input
                        value={consultaCliente}
                        onChange={(e) => setConsultaCliente(e.target.value)}
                        placeholder={c.findClient}
                        aria-label={c.selectClient}
                      />
                    </div>
                    <button
                      type="button"
                      className="icon-action"
                      title={c.newClient}
                      aria-label={c.newClient}
                      onClick={() => setNuevoCliente({ nome: '', indirizzo: '', citta: '', tipo_cliente: 'privato', fk_fornitore: '' })}
                    >
                      <Plus size={19} />
                    </button>
                  </div>
                  <div className="pick-list">
                    {clientesFiltrados.map((fila) => {
                      const disponibles = maquinasPorCliente.get(String(fila.id)) ?? 0;
                      return (
                        <button
                          type="button"
                          className={`pick-card ${cliente?.id === fila.id ? 'chosen' : ''}`}
                          key={fila.id}
                          onClick={() => elegirCliente(fila)}
                        >
                          <i>
                            <Building2 size={18} />
                          </i>
                          <span>
                            <b>{fila.nome}</b>
                            <small>
                              {fila.citta} · {disponibles} {disponibles === 1 ? c.machineShort : c.machinesShort}
                              {fila.fornitore ? ` · ${c.supplierLabel}: ${fila.fornitore}` : ''}
                            </small>
                          </span>
                          <em className="pick-check" aria-hidden="true">
                            {cliente?.id === fila.id && <Check size={15} />}
                          </em>
                        </button>
                      );
                    })}
                    {!clientesFiltrados.length && <p className="empty-state">{c.noClients}</p>}
                  </div>
                </>
              )}
            </>
          )}

          {paso === 2 && (
            <>
              <div className="ctx-chip">
                <i>
                  <Building2 size={19} />
                </i>
                <span>
                  <b>{cliente.nome}</b>
                  <small>{cliente.citta}</small>
                </span>
                <button onClick={() => setPaso(1)}>{c.change}</button>
              </div>

              {nuevaMaquina ? (
                <div className="inline-form">
                  <p className="eyebrow">{c.newMachine}</p>
                  <label>
                    {c.machineCode}
                    <input
                      value={nuevaMaquina.codice_unico}
                      onChange={(e) => setNuevaMaquina({ ...nuevaMaquina, codice_unico: e.target.value })}
                      placeholder="MC-XXX-0001"
                    />
                  </label>
                  <label>
                    {c.machineType}
                    <select
                      value={nuevaMaquina.tipo_macchina}
                      onChange={(e) => setNuevaMaquina({ ...nuevaMaquina, tipo_macchina: e.target.value })}
                    >
                      {TIPOS_MAQUINA.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {nombreTipoMaquina(tipo, c)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {c.model}
                    <input value={nuevaMaquina.modello} onChange={(e) => setNuevaMaquina({ ...nuevaMaquina, modello: e.target.value })} />
                  </label>
                  <label>
                    {c.brand}
                    <select value={nuevaMaquina.fk_marca} onChange={(e) => setNuevaMaquina({ ...nuevaMaquina, fk_marca: e.target.value })}>
                      <option value="">{c.select}</option>
                      {marcas.map((marca) => (
                        <option key={marca.id} value={marca.id}>
                          {marca.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="inline-actions">
                    <button type="button" onClick={() => setNuevaMaquina(null)}>
                      {c.cancel}
                    </button>
                    <button type="button" className="primary" onClick={crearMaquina}>
                      {c.createMachine}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="pick-hint">{c.selectMachineHint}</p>
                  <div className="pick-row">
                    <div className="search">
                      <Search size={18} />
                      <input
                        value={consultaMaquina}
                        onChange={(e) => setConsultaMaquina(e.target.value)}
                        placeholder={c.findMachineShort}
                        aria-label={c.machine}
                      />
                    </div>
                    <button
                      type="button"
                      className="icon-action"
                      title={c.newMachine}
                      aria-label={c.newMachine}
                      onClick={() =>
                        setNuevaMaquina({ fk_cliente: cliente.id, codice_unico: '', tipo_macchina: 'macchina_caffe', modello: '', fk_marca: '' })
                      }
                    >
                      <Plus size={19} />
                    </button>
                  </div>
                  <div className="pick-list">
                    {maquinasCliente.map((fila) => {
                      const Icono = ICONOS_MAQUINA[fila.tipo_macchina] || Wrench;
                      return (
                        <button
                          type="button"
                          className={`pick-card ${maquina?.id === fila.id ? 'chosen' : ''}`}
                          key={fila.id}
                          onClick={() => setMaquina(fila)}
                        >
                          <i>
                            <Icono size={18} />
                          </i>
                          <span>
                            <b>{`${fila.marca} ${fila.modello ?? ''}`.trim()}</b>
                            <small>
                              {fila.codice_unico} · {nombreTipoMaquina(fila.tipo_macchina, c)}
                            </small>
                          </span>
                          <em className="pick-check" aria-hidden="true">
                            {maquina?.id === fila.id && <Check size={15} />}
                          </em>
                        </button>
                      );
                    })}
                    {!maquinasCliente.length && <p className="empty-state">{c.noMachineForClient}</p>}
                  </div>
                </>
              )}
            </>
          )}

          {paso === 3 && (
            <>
              <div className="ctx-chip">
                <i>
                  <Wrench size={19} />
                </i>
                <span>
                  <b>{`${maquina.marca} ${maquina.modello ?? ''}`.trim()}</b>
                  <small>
                    {maquina.codice_unico} · {cliente.nome}
                  </small>
                </span>
                <button onClick={() => setPaso(2)}>{c.change}</button>
              </div>
              <div className="pick-head">
                <p className="pick-hint">
                  {c.partsCompatible} · {piezas.length} {c.availableShort}
                  {cantidadPiezas ? ` · ${cantidadPiezas} ${cantidadPiezas === 1 ? c.pieceShort : c.piecesShort}` : ''}
                </p>
                <div className="search">
                  <Search size={18} />
                  <input
                    value={consultaPieza}
                    onChange={(e) => setConsultaPieza(e.target.value)}
                    placeholder={c.findPart}
                    aria-label={c.parts}
                  />
                </div>
              </div>
              <div className="part-list">
                {piezasFiltradas.map((pieza) => {
                  const seleccionada = carrito.find((linea) => linea.id === pieza.id);
                  return (
                    <article className={seleccionada ? 'selected' : ''} key={pieza.id}>
                      <span>
                        <b>{pieza.nome}</b>
                        <small>
                          {pieza.codice_unico}
                          {pieza.intervallo_mesi ? (
                            <em className="interval-badge">
                              {c.every} {pieza.intervallo_mesi} {c.months}
                            </em>
                          ) : null}
                          <strong className="part-price">{formatearMoneda(pieza.prezzo, idioma)}</strong>
                        </small>
                      </span>
                      <div className="qty">
                        <button type="button" disabled={!seleccionada} onClick={() => cambiarCantidad(pieza, -1)}>
                          <Minus size={15} />
                        </button>
                        <b>{seleccionada?.qty || 0}</b>
                        <button type="button" onClick={() => cambiarCantidad(pieza, 1)}>
                          <Plus size={15} />
                        </button>
                      </div>
                    </article>
                  );
                })}
                {!piezasFiltradas.length && <p className="empty-state">{c.noPartsForMachine}</p>}
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

          {paso === 4 && (
            <>
              <div className="summary">
                <span>{c.stepClient}</span>
                <b>{cliente.nome}</b>
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
                  {c.labour} · {horas} h × {personas}
                  <b>{formatearMoneda(importeManoDeObra(horas, personas, tarifa), idioma)}</b>
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

              <div className="next-preview">
                <CalendarClock size={18} />
                <span>
                  <b>{c.nextPreview}</b>
                  {proximas.length ? (
                    proximas.map((linea) => (
                      <small key={linea.nome}>
                        {linea.nome}: {formatearFecha(linea.fecha, idioma)}
                      </small>
                    ))
                  ) : (
                    <small>{c.noNextPreview}</small>
                  )}
                </span>
              </div>

              <label>
                {c.date}
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </label>
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
          {paso === 3 && maquina && (
            <div className="sheet-total">
              <span>
                {cantidadPiezas} {cantidadPiezas === 1 ? c.pieceShort : c.piecesShort} · {c.labourSummary} {horas} h ×{' '}
                {personas}
              </span>
              <b>
                {c.total}
                <strong>{formatearMoneda(total, idioma)}</strong>
              </b>
            </div>
          )}
          <div className="footer-actions">
            <button onClick={() => (paso === 1 ? alCerrar() : setPaso(paso - 1))}>{paso === 1 ? c.cancel : c.back}</button>
            <button className="primary" disabled={guardando} onClick={() => (paso === 4 ? guardar() : continuar())}>
              {guardando ? '…' : paso === 4 ? c.save : c.next}
              <ChevronRight size={17} />
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
