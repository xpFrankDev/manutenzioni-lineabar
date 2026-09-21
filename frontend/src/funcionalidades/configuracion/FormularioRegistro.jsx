import { useEffect, useState } from 'react';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { llamarApi } from '../../compartido/api/cliente.js';
import { Campo } from '../../compartido/componentes/Campo.jsx';
import { TIPOS_MAQUINA, nombreTipoMaquina } from '../../compartido/dominio/maquinas.js';
import { etiquetaDeRecurso } from './catalogo.js';

function caracteristicasIniciales(valor) {
  if (!valor) return [];
  return String(valor)
    .split(';')
    .map((par) => {
      const [tipoCaratteristicaId, quantita] = par.split(':');
      return { tipoCaratteristicaId: Number(tipoCaratteristicaId), quantita: Number(quantita) };
    })
    .filter((fila) => fila.tipoCaratteristicaId && fila.quantita);
}

export function FormularioRegistro({ recurso, registro, proveedores, clientes, c, alCerrar, alGuardar }) {
  const [formulario, setFormulario] = useState(
    registro || { stato: 'attivo', tipo_cliente: 'privato', tipo_macchina: 'macchina_caffe', ruolo: 'tecnico' }
  );
  const [caracteristicas, setCaracteristicas] = useState(() => caracteristicasIniciales(registro?.caratteristiche));
  const [marcas, setMarcas] = useState([]);
  const [tiposCaracteristica, setTiposCaracteristica] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (recurso !== 'pezzi' && recurso !== 'macchine') return;
    llamarApi('/marche')
      .then(setMarcas)
      .catch(() => {});
    if (recurso === 'pezzi') {
      llamarApi('/configurazione/caratteristiche')
        .then(setTiposCaracteristica)
        .catch(() => {});
    }
  }, [recurso]);

  const establecer = (clave, valor) => setFormulario((actual) => ({ ...actual, [clave]: valor }));
  const campo = (clave, etiqueta, marcador, tipo = 'text') => (
    <Campo label={etiqueta}>
      <input
        type={tipo}
        value={formulario[clave] ?? ''}
        placeholder={marcador}
        onChange={(e) => establecer(clave, e.target.value)}
      />
    </Campo>
  );

  async function guardar(evento) {
    evento.preventDefault();
    try {
      const cuerpo = {
        ...formulario,
        ...(recurso === 'pezzi' ? { caratteristiche: caracteristicas } : {})
      };
      await llamarApi(`/configurazione/${recurso}${registro ? `/${registro.id}` : ''}`, {
        method: registro ? 'PUT' : 'POST',
        body: JSON.stringify(cuerpo)
      });
      alGuardar();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="sheet-wrap">
      <form className="sheet config-sheet" onSubmit={guardar}>
        <header>
          <div>
            <h2>{etiquetaDeRecurso(recurso, c)}</h2>
          </div>
          <button type="button" onClick={alCerrar}>
            <X />
          </button>
        </header>
        <main>
          {recurso === 'fornitori' && (
            <>
              {campo('codice', c.supplierCode, 'CIMBALI')}
              {campo('nome', c.name, 'La Cimbali')}
            </>
          )}

          {recurso === 'marche' && campo('nome', c.name, 'La Cimbali')}

          {recurso === 'clienti' && (
            <>
              {campo('nome', c.name, 'Nome attività')}
              {campo('indirizzo', c.address, 'Via e numero civico')}
              {campo('citta', c.city, 'Città italiana')}
              <Campo label={c.clientType}>
                <select value={formulario.tipo_cliente || 'privato'} onChange={(e) => establecer('tipo_cliente', e.target.value)}>
                  <option value="privato">{c.private}</option>
                  <option value="fornitore">{c.linked}</option>
                </select>
              </Campo>
              {formulario.tipo_cliente === 'fornitore' && (
                <Campo label={c.supplier}>
                  <select
                    required
                    value={formulario.fk_fornitore || ''}
                    onChange={(e) => establecer('fk_fornitore', e.target.value)}
                  >
                    <option value="">{c.select}</option>
                    {proveedores.map((proveedor) => (
                      <option key={proveedor.id} value={proveedor.id}>
                        {proveedor.nome}
                      </option>
                    ))}
                  </select>
                </Campo>
              )}
              {campo('codice', c.clientCode, 'Automatico se vuoto')}
            </>
          )}

          {recurso === 'macchine' && (
            <>
              {campo('codice_unico', c.machineCode, 'MC-XXX-0001')}
              <Campo label={c.machineType}>
                <select
                  value={formulario.tipo_macchina || 'macchina_caffe'}
                  onChange={(e) => establecer('tipo_macchina', e.target.value)}
                >
                  {TIPOS_MAQUINA.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {nombreTipoMaquina(tipo, c)}
                    </option>
                  ))}
                </select>
              </Campo>
              {campo('modello', c.model, 'Modello macchina')}
              <Campo label={c.clients}>
                <select required value={formulario.fk_cliente || ''} onChange={(e) => establecer('fk_cliente', e.target.value)}>
                  <option value="">{c.select}</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label={c.supplier}>
                <select value={formulario.fk_fornitore || ''} onChange={(e) => establecer('fk_fornitore', e.target.value)}>
                  <option value="">{c.select}</option>
                  {proveedores.map((proveedor) => (
                    <option key={proveedor.id} value={proveedor.id}>
                      {proveedor.nome}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label={c.brand}>
                <select value={formulario.fk_marca || ''} onChange={(e) => establecer('fk_marca', e.target.value)}>
                  <option value="">{c.select}</option>
                  {marcas.map((marca) => (
                    <option key={marca.id} value={marca.id}>
                      {marca.nome}
                    </option>
                  ))}
                </select>
              </Campo>
            </>
          )}

          {recurso === 'pezzi' && (
            <>
              {campo('nome', c.name, 'Nome del ricambio')}
              {campo('codice_unico', c.partCode, 'PZ-XXX-0001')}
              <Campo label={c.machineType}>
                <select
                  value={formulario.tipo_macchina || 'macchina_caffe'}
                  onChange={(e) => establecer('tipo_macchina', e.target.value)}
                >
                  {TIPOS_MAQUINA.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {nombreTipoMaquina(tipo, c)}
                    </option>
                  ))}
                </select>
              </Campo>
              {campo('prezzo', c.price, '0,00', 'number')}
              {campo('intervallo_mesi', c.interval, '12', 'number')}
              <Campo label={c.brand}>
                <select value={formulario.fk_marca || ''} onChange={(e) => establecer('fk_marca', e.target.value)}>
                  <option value="">{c.select}</option>
                  {marcas.map((marca) => (
                    <option key={marca.id} value={marca.id}>
                      {marca.nome}
                    </option>
                  ))}
                </select>
              </Campo>
              <fieldset className="characteristics">
                <legend>{c.characteristics}</legend>
                {caracteristicas.map((fila, indice) => (
                  <div className="characteristic-row" key={`${fila.tipoCaratteristicaId}-${indice}`}>
                    <select
                      value={fila.tipoCaratteristicaId}
                      onChange={(e) =>
                        setCaracteristicas((actual) =>
                          actual.map((elemento, posicion) =>
                            posicion === indice ? { ...elemento, tipoCaratteristicaId: Number(e.target.value) } : elemento
                          )
                        )
                      }
                    >
                      {tiposCaracteristica.map((tipo) => (
                        <option key={tipo.id} value={tipo.id}>
                          {tipo.nome} {tipo.unita_misura ? `(${tipo.unita_misura})` : ''}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={fila.quantita}
                      onChange={(e) =>
                        setCaracteristicas((actual) =>
                          actual.map((elemento, posicion) =>
                            posicion === indice ? { ...elemento, quantita: Number(e.target.value) } : elemento
                          )
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setCaracteristicas((actual) => actual.filter((_, posicion) => posicion !== indice))}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="ghost-action"
                  disabled={!tiposCaracteristica.length}
                  onClick={() =>
                    setCaracteristicas((actual) => [
                      ...actual,
                      { tipoCaratteristicaId: tiposCaracteristica[0].id, quantita: 1 }
                    ])
                  }
                >
                  <Plus size={15} /> {c.characteristics}
                </button>
              </fieldset>
            </>
          )}

          {recurso === 'caratteristiche' && (
            <>
              {campo('codice_unico', c.characteristicCode, 'TENSIONE')}
              {campo('nome', c.name, 'Tensione nominale')}
              {campo('unita_misura', c.unit, 'V')}
            </>
          )}

          {recurso === 'parametri' && (
            <>
              {campo('chiave', c.name, 'tarifa_mano_de_obra_hora')}
              {campo('valore', c.value, '65')}
              {campo('descrizione', c.notes, 'Tarifa por hora')}
            </>
          )}

          {recurso === 'utenti' && (
            <>
              {campo('nome', c.name, 'Nome e cognome')}
              {campo('codice_usuario', c.code, 'tecnico02')}
              {campo('email', c.email, 'tecnico@lineabar.it')}
              <Campo label={c.role}>
                <select value={formulario.ruolo || 'tecnico'} onChange={(e) => establecer('ruolo', e.target.value)}>
                  <option value="tecnico">{c.technician}</option>
                  <option value="amministratore">{c.administrator}</option>
                </select>
              </Campo>
              <Campo label={c.password}>
                <input
                  type="password"
                  minLength="8"
                  required={!registro}
                  placeholder={registro ? '••••••••' : c.password}
                  value={formulario.password ?? ''}
                  onChange={(e) => establecer('password', e.target.value)}
                />
              </Campo>
            </>
          )}

          <Campo label={c.status}>
            <select value={formulario.stato || 'attivo'} onChange={(e) => establecer('stato', e.target.value)}>
              <option value="attivo">{c.active}</option>
              <option value="inattivo">{c.inactive}</option>
            </select>
          </Campo>
          {error && <p className="error">{error}</p>}
        </main>
        <footer>
          <button type="button" onClick={alCerrar}>
            {c.cancel}
          </button>
          <button className="primary">
            <Save size={16} />
            {c.saveChanges}
          </button>
        </footer>
      </form>
    </div>
  );
}
