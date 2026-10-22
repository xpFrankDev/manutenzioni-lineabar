import { useEffect, useState } from 'react';
import { ChevronLeft, Save } from 'lucide-react';
import { llamarApi } from '../../compartido/api/cliente.js';
import { useAvisos } from '../../compartido/componentes/Avisos.jsx';
import { Campo } from '../../compartido/componentes/Campo.jsx';

export function FormularioEmpresa({ c, alVolver }) {
  const { notificar } = useAvisos();
  const [empresa, setEmpresa] = useState(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    llamarApi('/azienda')
      .then(setEmpresa)
      .catch((e) => setError(e.message));
  }, []);

  const cambiar = (clave, valor) => setEmpresa((actual) => ({ ...actual, [clave]: valor }));

  async function guardar(evento) {
    evento.preventDefault();
    setGuardando(true);
    try {
      setEmpresa(await llamarApi('/azienda', { method: 'PUT', body: JSON.stringify(empresa) }));
      notificar(c.saved);
    } catch (e) {
      setError(e.message);
      notificar(e.message, 'error');
    } finally {
      setGuardando(false);
    }
  }

  if (!empresa) return <main className="content settings-list"><p className="loading">{error || c.loading}</p></main>;

  return (
    <main className="content settings-list">
      <header className="settings-header">
        <button className="back-button" onClick={alVolver}><ChevronLeft size={20} />{c.settings}</button>
        <div><h1>{c.company}</h1><p>{c.companyHelp}</p></div>
      </header>
      <form className="company-form" onSubmit={guardar}>
        <Campo label={c.companyName}><input required value={empresa.nome ?? ''} onChange={(e) => cambiar('nome', e.target.value)} /></Campo>
        <Campo label={c.companyLogo}><input value={empresa.logo_url ?? ''} placeholder="/lineabar/logo-linea-bar.svg" onChange={(e) => cambiar('logo_url', e.target.value)} /></Campo>
        <Campo label={c.warehouseAddress}><input value={empresa.indirizzo ?? ''} onChange={(e) => cambiar('indirizzo', e.target.value)} /></Campo>
        <Campo label={c.city}><input value={empresa.citta ?? ''} onChange={(e) => cambiar('citta', e.target.value)} /></Campo>
        <Campo label={c.latitude}><input type="number" step="0.000001" value={empresa.latitudine ?? ''} onChange={(e) => cambiar('latitudine', e.target.value)} /></Campo>
        <Campo label={c.longitude}><input type="number" step="0.000001" value={empresa.longitudine ?? ''} onChange={(e) => cambiar('longitudine', e.target.value)} /></Campo>
        <Campo label={c.startTime}><input type="time" value={(empresa.ora_partenza ?? '08:00:00').slice(0, 5)} onChange={(e) => cambiar('ora_partenza', e.target.value)} /></Campo>
        <Campo label={c.email}><input type="email" value={empresa.email ?? ''} onChange={(e) => cambiar('email', e.target.value)} /></Campo>
        <Campo label={c.phone}><input value={empresa.telefono ?? ''} onChange={(e) => cambiar('telefono', e.target.value)} /></Campo>
        <Campo label={c.website}><input type="url" value={empresa.sito_url ?? ''} onChange={(e) => cambiar('sito_url', e.target.value)} /></Campo>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={guardando}><Save size={16} />{guardando ? c.loading : c.saveChanges}</button>
      </form>
    </main>
  );
}
