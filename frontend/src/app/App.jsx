import { useEffect, useState } from 'react';
import { Menu, Plus, ReceiptText, Wrench } from 'lucide-react';
import { guardarSesion, llamarApi } from '../compartido/api/cliente.js';
import { Toggle } from '../compartido/componentes/Toggle.jsx';
import {
  CLAVES,
  RUTA_ACCESO,
  RUTAS,
  RUTAS_HOJA,
  hojaDesdeRuta,
  maquinaIdDesdeRuta,
  paginaDesdeRuta
} from '../compartido/constantes.js';
import { IDIOMA_POR_DEFECTO, obtenerCatalogo } from '../compartido/i18n/index.js';
import { puedeVer } from '../compartido/permisos.js';
import { Actividades } from '../funcionalidades/actividades/Actividades.jsx';
import { PantallaAcceso } from '../funcionalidades/autenticacion/PantallaAcceso.jsx';
import { Calendario } from '../funcionalidades/calendario/Calendario.jsx';
import { Configuracion } from '../funcionalidades/configuracion/Configuracion.jsx';
import { DetalleRegistro } from '../funcionalidades/interventos/DetalleRegistro.jsx';
import { HojaTrabajo } from '../funcionalidades/interventos/HojaTrabajo.jsx';
import { ListaOperaciones } from '../funcionalidades/interventos/ListaOperaciones.jsx';
import { DetalleMaquina } from '../funcionalidades/maquinas/DetalleMaquina.jsx';
import { ListaMaquinas } from '../funcionalidades/maquinas/ListaMaquinas.jsx';
import { Navegacion } from '../funcionalidades/navegacion/Navegacion.jsx';
import { PantallaError } from '../funcionalidades/errores/PantallaError.jsx';
import { Reportes } from '../funcionalidades/reportes/Reportes.jsx';
import { Tablero } from '../funcionalidades/tablero/Tablero.jsx';

export function App() {
  const [idioma, setIdioma] = useState(() => localStorage.getItem(CLAVES.idioma) || IDIOMA_POR_DEFECTO);
  const [tema, setTema] = useState(() => localStorage.getItem(CLAVES.tema) || 'dark');
  const [pagina, setPagina] = useState(() => paginaDesdeRuta(location.pathname));
  const [maquinaId, setMaquinaId] = useState(() => maquinaIdDesdeRuta(location.pathname));
  const [menu, setMenu] = useState(false);
  const [acciones, setAcciones] = useState(false);
  const [hoja, setHoja] = useState(() => hojaDesdeRuta(location.pathname));
  const [detalle, setDetalle] = useState(null);
  const [detalleBoleta, setDetalleBoleta] = useState(null);
  const [tareasPendientes, setTareasPendientes] = useState(0);
  const [avisosCalendario, setAvisosCalendario] = useState(0);
  const [usuario, setUsuario] = useState(null);
  const [sesion, setSesion] = useState(location.pathname === RUTA_ACCESO ? 'skip' : 'check');

  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    localStorage.setItem(CLAVES.tema, tema);
  }, [tema]);

  useEffect(() => localStorage.setItem(CLAVES.idioma, idioma), [idioma]);

  useEffect(() => {
    if (sesion !== 'check') return;
    llamarApi('/auth/sessione')
      .then((datos) => {
        guardarSesion(datos);
        setUsuario({ ...datos.utente, menus: datos.menus ?? [] });
        setSesion('ok');
      })
      .catch(() => {});
  }, [sesion]);

  useEffect(() => {
    if (sesion !== 'ok') return undefined;
    const actualizarTareas = () =>
      llamarApi('/attivita/contatore')
        .then((datos) => setTareasPendientes(datos.pendenti))
        .catch(() => {});
    const actualizarCalendario = () =>
      llamarApi('/calendario/resumen')
        .then((datos) => setAvisosCalendario(datos.avisos))
        .catch(() => {});
    actualizarTareas();
    actualizarCalendario();
    addEventListener('lineabar:tasks', actualizarTareas);
    addEventListener('lineabar:calendar', actualizarCalendario);
    return () => {
      removeEventListener('lineabar:tasks', actualizarTareas);
      removeEventListener('lineabar:calendar', actualizarCalendario);
    };
  }, [sesion]);

  useEffect(() => {
    const sincronizar = () => {
      setPagina(paginaDesdeRuta(location.pathname));
      setMaquinaId(maquinaIdDesdeRuta(location.pathname));
      setHoja(hojaDesdeRuta(location.pathname));
      setDetalle(null);
      setDetalleBoleta(null);
    };
    addEventListener('popstate', sincronizar);
    return () => removeEventListener('popstate', sincronizar);
  }, []);

  const c = obtenerCatalogo(idioma);

  function ir(destino) {
    setPagina(destino);
    setMaquinaId(null);
    history.pushState({}, '', RUTAS[destino]);
  }

  function abrirMaquina(id) {
    setPagina('maquina');
    setMaquinaId(id);
    history.pushState({}, '', `/lineabar/macchine/${id}`);
  }

  function abrirHoja(tipo) {
    setAcciones(false);
    setHoja(tipo);
    history.pushState({}, '', RUTAS_HOJA[tipo]);
  }

  function cerrarHoja() {
    setHoja(null);
    history.pushState({}, '', RUTAS[pagina] ?? location.pathname);
  }

  if (location.pathname === RUTA_ACCESO) {
    return <PantallaAcceso idioma={idioma} cambiarIdioma={setIdioma} tema={tema} cambiarTema={setTema} />;
  }
  if (sesion !== 'ok') return <main className="login">{c.loading}</main>;

  const menuDePagina = {
    dashboard: 'dashboard',
    boletas: 'boletas',
    mantenimientos: 'mantenimientos',
    macchine: 'macchine',
    maquina: 'macchine',
    tareas: 'tareas',
    calendario: 'calendario',
    reportes: 'reportes',
    configuracion: 'configuracion'
  }[pagina];
  const paginaPermitida = !menuDePagina || puedeVer(usuario, menuDePagina);
  const tablero = (
    <Tablero
      c={c}
      idioma={idioma}
      usuario={usuario}
      alAbrirDetalle={(id) => setDetalle(id)}
      alIrCalendario={() => ir('calendario')}
    />
  );

  const contenido = !paginaPermitida ? (
    <PantallaError tipo="403" c={c} alVolver={() => ir('dashboard')} />
  ) : pagina === 'boletas' ? (
      <ListaOperaciones tipo="boletas" c={c} idioma={idioma} alCrear={() => abrirHoja('receipt')} />
    ) : pagina === 'mantenimientos' ? (
      <ListaOperaciones tipo="interventi" c={c} idioma={idioma} alCrear={() => abrirHoja('maintenance')} />
    ) : pagina === 'tareas' ? (
      <Actividades c={c} idioma={idioma} usuario={usuario} />
    ) : pagina === 'macchine' ? (
      <ListaMaquinas c={c} alAbrir={abrirMaquina} />
    ) : pagina === 'maquina' && maquinaId ? (
      <DetalleMaquina
        id={maquinaId}
        c={c}
        idioma={idioma}
        usuario={usuario}
        alVolver={() => ir('macchine')}
        alAbrirBoleta={(id) => setDetalleBoleta(id)}
        alAbrirIntervento={(id) => setDetalle(id)}
      />
    ) : pagina === 'calendario' ? (
      <Calendario c={c} idioma={idioma} usuario={usuario} />
    ) : pagina === 'reportes' ? (
      <Reportes c={c} idioma={idioma} />
    ) : pagina === 'configuracion' ? (
      <Configuracion c={c} />
    ) : pagina === '404' || (pagina === 'maquina' && !maquinaId) ? (
      <PantallaError tipo="404" c={c} alVolver={() => ir('dashboard')} />
    ) : (
      tablero
    );

  return (
    <>
      <header className="top">
        <button onClick={() => setMenu(true)} aria-label={c.settings}>
          <Menu />
        </button>
        <button className="brand-home" onClick={() => ir('dashboard')}>
          Linea Bar
        </button>
        <Toggle idioma={idioma} cambiarIdioma={setIdioma} tema={tema} cambiarTema={setTema} />
      </header>
      <Navegacion
        pagina={pagina}
        ir={ir}
        abierto={menu}
        establecerAbierto={setMenu}
        c={c}
        tareasPendientes={tareasPendientes}
        avisosCalendario={avisosCalendario}
        usuario={usuario}
      />
      {contenido}
      {(puedeVer(usuario, 'mantenimientos') || puedeVer(usuario, 'boletas')) && (
        <>
          <div className={`quick-actions ${acciones ? 'open' : ''}`}>
            {puedeVer(usuario, 'mantenimientos') && (
              <button onClick={() => abrirHoja('maintenance')}>
                <Wrench size={18} />
                {c.newJob}
              </button>
            )}
            {puedeVer(usuario, 'boletas') && (
              <button onClick={() => abrirHoja('receipt')}>
                <ReceiptText size={18} />
                {c.newReceipt}
              </button>
            )}
          </div>
          <button className="fab" aria-label={c.add} onClick={() => setAcciones(!acciones)}>
            <Plus size={25} />
          </button>
        </>
      )}
      {hoja && (
        <HojaTrabajo
          tipo={hoja}
          c={c}
          idioma={idioma}
          alCerrar={cerrarHoja}
          alGuardar={() => {
            setHoja(null);
            dispatchEvent(new Event('lineabar:tasks'));
            dispatchEvent(new Event('lineabar:calendar'));
            ir(hoja === 'receipt' ? 'boletas' : 'mantenimientos');
          }}
        />
      )}
      {detalle && <DetalleRegistro tipo="interventi" id={detalle} c={c} idioma={idioma} alCerrar={() => setDetalle(null)} />}
      {detalleBoleta && (
        <DetalleRegistro tipo="boletas" id={detalleBoleta} c={c} idioma={idioma} alCerrar={() => setDetalleBoleta(null)} />
      )}
    </>
  );
}
