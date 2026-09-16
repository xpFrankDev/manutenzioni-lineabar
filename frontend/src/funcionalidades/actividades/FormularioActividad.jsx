import { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';
import { llamarApi } from '../../compartido/api/cliente.js';

function maquinasDelCliente(maquinas, clienteId) {
  return clienteId ? maquinas.filter((maquina) => String(maquina.cliente_id) === String(clienteId)) : maquinas;
}

export function FormularioActividad({ c, alCerrar, alGuardar }) {
  const [clientes, setClientes] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [formulario, setFormulario] = useState({
    clienteId: '',
    macchinaId: '',
    tecnici: [],
    osservazione: '',
    scadenza: '',
    priorita: 'normale',
    richiedeAppuntamento: false
  });
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([llamarApi('/clienti'), llamarApi('/maquinas'), llamarApi('/tecnici')])
      .then(([listaClientes, listaMaquinas, listaTecnicos]) => {
        setClientes(listaClientes);
        setMaquinas(listaMaquinas);
        setTecnicos(listaTecnicos);
      })
      .catch((e) => setError(e.message));
  }, []);

  const establecer = (clave, valor) => setFormulario((actual) => ({ ...actual, [clave]: valor }));
  const alternarTecnico = (id) =>
    establecer(
      'tecnici',
      formulario.tecnici.includes(id) ? formulario.tecnici.filter((tecnico) => tecnico !== id) : [...formulario.tecnici, id]
    );

  async function guardar(evento) {
    evento.preventDefault();
    try {
      await llamarApi('/attivita', {
        method: 'POST',
        body: JSON.stringify({
          ...formulario,
          tecnici: formulario.tecnici.map(Number),
          clienteId: Number(formulario.clienteId),
          macchinaId: Number(formulario.macchinaId)
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
            <h2>
              {c.add} {c.tasks}
            </h2>
          </div>
          <button type="button" onClick={alCerrar}>
            <X />
          </button>
        </header>
        <main>
          <label>
            {c.client}
            <select
              required
              value={formulario.clienteId}
              onChange={(e) => {
                establecer('clienteId', e.target.value);
                establecer('macchinaId', '');
              }}
            >
              <option value="">{c.select}</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            {c.machine}
            <select required value={formulario.macchinaId} onChange={(e) => establecer('macchinaId', e.target.value)}>
              <option value="">{c.select}</option>
              {maquinasDelCliente(maquinas, formulario.clienteId).map((maquina) => (
                <option key={maquina.id} value={maquina.id}>
                  {maquina.marca} {maquina.modello} · {maquina.codice_unico}
                </option>
              ))}
            </select>
          </label>
          <label>
            {c.problem}
            <textarea
              required
              value={formulario.osservazione}
              onChange={(e) => establecer('osservazione', e.target.value)}
              placeholder={c.problemPlaceholder}
            />
          </label>
          <label>
            {c.estimatedDate}
            <input required type="date" value={formulario.scadenza} onChange={(e) => establecer('scadenza', e.target.value)} />
          </label>
          <label>
            {c.importance}
            <select value={formulario.priorita} onChange={(e) => establecer('priorita', e.target.value)}>
              <option value="bassa">{c.priorityLow}</option>
              <option value="normale">{c.priorityNormal}</option>
              <option value="alta">{c.priorityHigh}</option>
            </select>
          </label>
          <label className="check-line">
            <input
              type="checkbox"
              checked={formulario.richiedeAppuntamento}
              onChange={(e) => establecer('richiedeAppuntamento', e.target.checked)}
            />
            {c.appointment}
          </label>
          <fieldset>
            <legend>{c.assignedTechnicians}</legend>
            {tecnicos.map((tecnico) => (
              <label className="check-line" key={tecnico.id}>
                <input
                  type="checkbox"
                  checked={formulario.tecnici.includes(tecnico.id)}
                  onChange={() => alternarTecnico(tecnico.id)}
                />
                {tecnico.nome}
              </label>
            ))}
          </fieldset>
          {error && <p className="error">{error}</p>}
        </main>
        <footer>
          <button type="button" onClick={alCerrar}>
            {c.cancel}
          </button>
          <button className="primary">
            <Save size={16} />
            {c.save}
          </button>
        </footer>
      </form>
    </div>
  );
}
