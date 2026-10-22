import { useEffect, useState } from 'react';
import { ChevronRight, CircleAlert, LogIn } from 'lucide-react';
import { guardarSesion, llamarApi } from '../../compartido/api/cliente.js';
import { Toggle } from '../../compartido/componentes/Toggle.jsx';
import { destinoSeguro } from '../../compartido/constantes.js';
import { obtenerCatalogo } from '../../compartido/i18n/index.js';

export function PantallaAcceso({ idioma, cambiarIdioma, tema, cambiarTema }) {
  const c = obtenerCatalogo(idioma);
  const [codigo, setCodigo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [googleDisponible, setGoogleDisponible] = useState(false);
  const busqueda = typeof location !== 'undefined' ? location.search : '';
  const next = destinoSeguro(new URLSearchParams(busqueda).get('next'));
  const errorGoogle = new URLSearchParams(busqueda).get('google') === 'error';

  useEffect(() => {
    fetch('/lineabar/api/auth/google/disponibile')
      .then((respuesta) => (respuesta.ok ? respuesta.json() : { disponibile: false }))
      .then((datos) => setGoogleDisponible(Boolean(datos.disponibile)))
      .catch(() => setGoogleDisponible(false));
  }, []);

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
      guardarSesion(sesion);
      location.assign(next);
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
        <img className="login-logo" src="/lineabar/logo-linea-bar.svg" alt="Linea Bar" />
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
        {(error || errorGoogle) && (
          <p className="error">
            <CircleAlert size={16} />
            {error || c.googleError}
          </p>
        )}
        <button className="primary" disabled={enviando}>
          {enviando ? '…' : c.login}
          <ChevronRight size={17} />
        </button>
        {googleDisponible && (
          <>
            <div className="login-divider"><span>{c.or}</span></div>
            <a className="google-login" href={`/lineabar/api/auth/google?next=${encodeURIComponent(next)}`}>
              <LogIn size={17} />
              {c.continueGoogle}
            </a>
          </>
        )}
      </form>
    </main>
  );
}
