import { Languages, Moon, Sun } from 'lucide-react';
import { obtenerCatalogo } from '../i18n/index.js';

export function Toggle({ idioma, cambiarIdioma, tema, cambiarTema }) {
  const c = obtenerCatalogo(idioma);

  return (
    <div className="tools">
      <button onClick={() => cambiarIdioma(idioma === 'it' ? 'es' : 'it')}>
        <Languages size={17} />
        {idioma.toUpperCase()}
      </button>
      <button
        onClick={() => cambiarTema(tema === 'light' ? 'dark' : 'light')}
        title={tema === 'light' ? c.dark : c.light}
      >
        {tema === 'light' ? <Moon size={17} /> : <Sun size={17} />}
      </button>
    </div>
  );
}
