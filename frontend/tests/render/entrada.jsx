import { renderToStaticMarkup } from 'react-dom/server';
import { obtenerCatalogo } from '../../src/compartido/i18n/index.js';
import { Estado } from '../../src/compartido/componentes/Estado.jsx';
import { Actividades } from '../../src/funcionalidades/actividades/Actividades.jsx';
import { PantallaAcceso } from '../../src/funcionalidades/autenticacion/PantallaAcceso.jsx';
import { Calendario } from '../../src/funcionalidades/calendario/Calendario.jsx';
import { Configuracion } from '../../src/funcionalidades/configuracion/Configuracion.jsx';
import { HojaTrabajo } from '../../src/funcionalidades/interventos/HojaTrabajo.jsx';
import { Reportes } from '../../src/funcionalidades/reportes/Reportes.jsx';

const idioma = 'es';
const c = obtenerCatalogo(idioma);
const usuario = { nome: 'Tecnico Prueba', ruolo: 'tecnico' };
const nada = () => {};

export function renderizarPantallas() {
  return {
    login: renderToStaticMarkup(
      <PantallaAcceso idioma={idioma} cambiarIdioma={nada} tema="light" cambiarTema={nada} />
    ),
    boleta: renderToStaticMarkup(<HojaTrabajo tipo="receipt" c={c} idioma={idioma} alCerrar={nada} alGuardar={nada} />),
    mantenimiento: renderToStaticMarkup(
      <HojaTrabajo tipo="maintenance" c={c} idioma={idioma} alCerrar={nada} alGuardar={nada} />
    ),
    calendario: renderToStaticMarkup(<Calendario c={c} idioma={idioma} usuario={usuario} />),
    reportes: renderToStaticMarkup(<Reportes c={c} idioma={idioma} />),
    configuracion: renderToStaticMarkup(<Configuracion c={c} />),
    actividades: renderToStaticMarkup(<Actividades c={c} idioma={idioma} usuario={usuario} />),
    estados: renderToStaticMarkup(
      <div>
        {['vencido', 'oggi', 'imminente', 'prossimo', 'programmato', 'sospeso', 'eseguito', 'aperta', 'in_corso', 'completata'].map(
          (valor) => (
            <Estado key={valor} value={valor} c={c} />
          )
        )}
      </div>
    )
  };
}
