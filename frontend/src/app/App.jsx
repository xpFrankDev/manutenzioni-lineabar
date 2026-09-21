import { useEffect, useState } from 'react';
import { Menu, Plus, ReceiptText, Wrench } from 'lucide-react';
import { llamarApi } from '../compartido/api/cliente.js';
import { Toggle } from '../compartido/componentes/Toggle.jsx';
import { CLAVES, RUTA_ACCESO, RUTAS, RUTAS_HOJA, hojaDesdeRuta, paginaDesdeRuta } from '../compartido/constantes.js';
import { IDIOMA_POR_DEFECTO, obtenerCatalogo } from '../compartido/i18n/index.js';
import { Actividades } from '../funcionalidades/actividades/Actividades.jsx';
import { PantallaAcceso } from '../funcionalidades/autenticacion/PantallaAcceso.jsx';
import { Calendario } from '../funcionalidades/calendario/Calendario.jsx';
import { Configuracion } from '../funcionalidades/configuracion/Configuracion.jsx';
import { DetalleRegistro } from '../funcionalidades/interventos/DetalleRegistro.jsx';
import { HojaTrabajo } from '../funcionalidades/interventos/HojaTrabajo.jsx';
import { ListaOperaciones } from '../funcionalidades/interventos/ListaOperaciones.jsx';
import { Navegacion } from '../funcionalidades/navegacion/Navegacion.jsx';
import { Reportes } from '../funcionalidades/reportes/Reportes.jsx';
import { Tablero } from '../funcionalidades/tablero/Tablero.jsx';

export function App() {
  const [idioma, setIdioma] = useState(() => localStorage.getItem(CLAVES.idioma) || IDIOMA_POR_DEFECTO);
  const [tema, setTema] = useState(() => localStorage.getItem(CLAVES.tema) || 'dark');
  const [pagina, setPagina] = useState(() => paginaDesdeRuta(location.pathname));
  const [menu, setMenu] = useState(false);
  const [acciones, setAcciones] = useState(false);
  const [hoja, setHoja] = useState(() => hojaDesdeRuta(location.pathname));
  const [detalle, setDetalle] = useState(null);
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
        setUsuario(datos.utente);
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
      setHoja(hojaDesdeRuta(location.pathname));
      setDetalle(null);
    };
    addEventListener('popstate', sincronizar);
    return () => removeEventListener('popstate', sincronizar);
  }, []);

  const c = obtenerCatalogo(idioma);

  function ir(destino) {
    setPagina(destino);
    history.pushState({}, '', RUTAS[destino]);
  }

  function abrirHoja(tipo) {
    setAcciones(false);
    setHoja(tipo);
    history.pushState({}, '', RUTAS_HOJA[tipo]);
  }

  function cerrarHoja() {
    setHoja(null);
    history.pushState({}, '', RUTAS[pagina]);
  }

  if (location.pathname === RUTA_ACCESO) {
    return <PantallaAcceso idioma={idioma} cambiarIdioma={setIdioma} tema={tema} cambiarTema={setTema} />;
  }
  if (sesion !== 'ok') return <main className="login">{c.loading}</main>;

  const esAdministrador = usuario?.ruolo !== 'tecnico';
  const tablero = (
    <Tablero
      c={c}
      idioma={idioma}
      usuario={usuario}
      alAbrirDetalle={(id) => setDetalle(id)}
      alIrCalendario={() => ir('calendario')}
    />
  );

  const contenido =
    pagina === 'boletas' ? (
      <ListaOperaciones tipo="boletas" c={c} idioma={idioma} alCrear={() => abrirHoja('receipt')} />
    ) : pagina === 'mantenimientos' ? (
      <ListaOperaciones tipo="interventi" c={c} idioma={idioma} alCrear={() => abrirHoja('maintenance')} />
    ) : pagina === 'tareas' ? (
      <Actividades c={c} idioma={idioma} usuario={usuario} />
    ) : pagina === 'calendario' ? (
      <Calendario c={c} idioma={idioma} usuario={usuario} />
    ) : pagina === 'reportes' && esAdministrador ? (
      <Reportes c={c} idioma={idioma} />
    ) : pagina === 'configuracion' && esAdministrador ? (
      <Configuracion c={c} />
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
      <div className={`quick-actions ${acciones ? 'open' : ''}`}>
        <button onClick={() => abrirHoja('maintenance')}>
          <Wrench size={18} />
          {c.newJob}
        </button>
        <button onClick={() => abrirHoja('receipt')}>
          <ReceiptText size={18} />
          {c.newReceipt}
        </button>
      </div>
      <button className="fab" aria-label={c.add} onClick={() => setAcciones(!acciones)}>
        <Plus size={25} />
      </button>
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
    </>
  );
}
