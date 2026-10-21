import { renderToStaticMarkup } from 'react-dom/server';
import { AvisosProvider } from '../../src/compartido/componentes/Avisos.jsx';
import { obtenerCatalogo } from '../../src/compartido/i18n/index.js';
import { Estado } from '../../src/compartido/componentes/Estado.jsx';
import { Actividades } from '../../src/funcionalidades/actividades/Actividades.jsx';
import { PantallaAcceso } from '../../src/funcionalidades/autenticacion/PantallaAcceso.jsx';
import { Calendario } from '../../src/funcionalidades/calendario/Calendario.jsx';
import { Configuracion } from '../../src/funcionalidades/configuracion/Configuracion.jsx';
import { HojaTrabajo } from '../../src/funcionalidades/interventos/HojaTrabajo.jsx';
import { DetalleMaquina } from '../../src/funcionalidades/maquinas/DetalleMaquina.jsx';
import { ListaMaquinas } from '../../src/funcionalidades/maquinas/ListaMaquinas.jsx';
import { PantallaError } from '../../src/funcionalidades/errores/PantallaError.jsx';
import { Programmazione } from '../../src/funcionalidades/programmazione/Programmazione.jsx';
import { Reportes } from '../../src/funcionalidades/reportes/Reportes.jsx';

const idioma = 'es';
const c = obtenerCatalogo(idioma);
const usuario = { nome: 'Tecnico Prueba', ruolo: 'tecnico' };
const nada = () => {};
const conAvisos = (elemento) => renderToStaticMarkup(<AvisosProvider>{elemento}</AvisosProvider>);

export function renderizarPantallas() {
  return {
    login: conAvisos(
      <PantallaAcceso idioma={idioma} cambiarIdioma={nada} tema="light" cambiarTema={nada} />
    ),
    boleta: conAvisos(<HojaTrabajo tipo="receipt" c={c} idioma={idioma} alCerrar={nada} alGuardar={nada} cargandoInicial={false} />),
    mantenimiento: conAvisos(
      <HojaTrabajo tipo="maintenance" c={c} idioma={idioma} alCerrar={nada} alGuardar={nada} cargandoInicial={false} />
    ),
    calendario: conAvisos(<Calendario c={c} idioma={idioma} usuario={usuario} />),
    reportes: conAvisos(<Reportes c={c} idioma={idioma} />),
    configuracion: conAvisos(<Configuracion c={c} />),
    actividades: conAvisos(<Actividades c={c} idioma={idioma} usuario={usuario} />),
    maquinas: conAvisos(<ListaMaquinas c={c} alAbrir={nada} />),
    maquina: conAvisos(
      <DetalleMaquina id="11111111-1111-4111-8111-000000000001" c={c} idioma={idioma} usuario={usuario} alVolver={nada} />
    ),
    programmazione: conAvisos(<Programmazione c={c} idioma={idioma} usuario={usuario} />),
    error403: conAvisos(<PantallaError tipo="403" c={c} alVolver={nada} />),
    estados: conAvisos(
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
