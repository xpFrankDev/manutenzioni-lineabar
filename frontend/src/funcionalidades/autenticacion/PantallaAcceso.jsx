import { useState } from 'react';
import { ChevronRight, CircleAlert } from 'lucide-react';
import { guardarSesion, llamarApi } from '../../compartido/api/cliente.js';
import { Toggle } from '../../compartido/componentes/Toggle.jsx';
import { RUTAS } from '../../compartido/constantes.js';
import { obtenerCatalogo } from '../../compartido/i18n/index.js';

export function PantallaAcceso({ idioma, cambiarIdioma, tema, cambiarTema }) {
  const c = obtenerCatalogo(idioma);
  const [codigo, setCodigo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function acceder(evento) {
    evento.preventDefault();
    if (codigo.trim().length < 5 || contrasena.length < 8) return setError(c.required);
    setEnviando(true);
    setError('');
    try {
      const sesion = await llamarApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ codigo_usuario: codigo.trim(), password: contrasena })
      });
      guardarSesion(sesion.token);
      location.assign(RUTAS.dashboard);
    } catch {
      setError(c.loginError);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="login">
      <Toggle idioma={idioma} cambiarIdioma={cambiarIdioma} tema={tema} cambiarTema={cambiarTema} />
      <section className="login-brand">
        <i>LB</i>
        <h1>Linea Bar</h1>
        <p>{c.tagline}</p>
      </section>
      <form className="login-card" onSubmit={acceder}>
        <p className="eyebrow">{c.access}</p>
        <h2>{c.login}</h2>
        <label>
          {c.code}
          <input
            required
            minLength="5"
            autoFocus
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder={c.codePlaceholder}
          />
          <small>{c.hint}</small>
        </label>
        <label>
          {c.pass}
          <input
            required
            minLength="8"
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            placeholder={c.passPlaceholder}
          />
        </label>
        {error && (
          <p className="error">
            <CircleAlert size={16} />
            {error}
          </p>
        )}
        <button className="primary" disabled={enviando}>
          {enviando ? '…' : c.login}
          <ChevronRight size={17} />
        </button>
      </form>
    </main>
  );
}
