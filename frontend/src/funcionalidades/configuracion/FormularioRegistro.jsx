import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { llamarApi } from '../../compartido/api/cliente.js';
import { Campo } from '../../compartido/componentes/Campo.jsx';
import { TIPOS_MAQUINA, nombreTipoMaquina } from '../../compartido/dominio/maquinas.js';
import { etiquetaDeRecurso } from './catalogo.js';

export function FormularioRegistro({ recurso, registro, proveedores, clientes, c, alCerrar, alGuardar }) {
  const [formulario, setFormulario] = useState(
    registro || { stato: 'attivo', tipo_cliente: 'privato', tipo_macchina: 'macchina_caffe' }
  );
  const [error, setError] = useState('');

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
      await llamarApi(`/configurazione/${recurso}${registro ? `/${registro.id}` : ''}`, {
        method: registro ? 'PUT' : 'POST',
        body: JSON.stringify(formulario)
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
                  <select required value={formulario.fk_fornitore || ''} onChange={(e) => establecer('fk_fornitore', e.target.value)}>
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
            </>
          )}

          {recurso === 'caratteristiche' && (
            <>
              {campo('codice_unico', c.characteristicCode, 'TENSIONE')}
              {campo('nome', c.name, 'Tensione nominale')}
              {campo('unita_misura', c.unit, 'V')}
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
