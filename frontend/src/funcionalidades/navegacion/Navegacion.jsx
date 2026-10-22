import {
  BarChart3,
  Boxes,
  CalendarClock,
  CalendarRange,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  UserRound,
  Wrench,
  X
} from 'lucide-react';
import { cerrarSesion } from '../../compartido/api/cliente.js';
import { RUTA_ACCESO } from '../../compartido/constantes.js';
import { puedeVer } from '../../compartido/permisos.js';

const ENLACES = [
  ['dashboard', LayoutDashboard, 'home', 'siempre'],
  ['boletas', ReceiptText, 'receipts', 'siempre'],
  ['mantenimientos', Wrench, 'jobs', 'siempre'],
  ['calendario', CalendarClock, 'calendar', 'siempre'],
  ['tareas', ClipboardList, 'tasks', 'siempre'],
  ['macchine', Boxes, 'machines', 'siempre'],
  ['programmazione', CalendarRange, 'programming', 'siempre'],
  ['reportes', BarChart3, 'reports', 'administrador'],
  ['configuracion', Settings, 'settings', 'administrador']
];

function icono(id, Icono, tamano, avisos) {
  return (
    <span className="nav-icon">
      <Icono size={tamano} />
      {avisos[id] > 0 && <em className="nav-badge">{avisos[id]}</em>}
    </span>
  );
}

async function salir(establecerAbierto) {
  await cerrarSesion();
  establecerAbierto(false);
  location.assign(RUTA_ACCESO);
}

export function Navegacion({ pagina, ir, abierto, establecerAbierto, c, tareasPendientes = 0, avisosCalendario = 0, usuario, empresa }) {
  const esAdministrador = usuario?.ruolo !== 'tecnico';
  const enlaces = ENLACES.filter(([id]) => puedeVer(usuario, id));
  const etiquetaRol = usuario?.ruolo === 'tecnico' ? c.technician : c.administrator;
  const avisos = { tareas: tareasPendientes, calendario: avisosCalendario };
  const enlacesInferiores = enlaces.slice(0, 5);

  return (
    <>
      <div className={`scrim ${abierto ? 'show' : ''}`} onClick={() => establecerAbierto(false)} />
      <aside className={`side ${abierto ? 'open' : ''}`}>
        <div className="side-brand">
          {empresa?.logo_url ? <img className="side-logo" src={empresa.logo_url} alt="" /> : <i>LB</i>}
          <span>
            <b>{empresa?.nome ?? 'Linea Bar'}</b>
            <small>{usuario?.nome ?? ''}</small>
          </span>
          <button onClick={() => establecerAbierto(false)}>
            <X />
          </button>
        </div>
        <nav>
          {enlaces.map(([id, Icono, etiqueta]) => (
            <button
              key={id}
              className={pagina === id ? 'active' : ''}
              onClick={() => {
                ir(id);
                establecerAbierto(false);
              }}
            >
              {icono(id, Icono, 20, avisos)}
              {c[etiqueta]}
            </button>
          ))}
        </nav>
        <div className="side-user">
          <i>
            <UserRound size={17} />
          </i>
          <span>
            <b>{usuario?.nome ?? '—'}</b>
            <small>{etiquetaRol}</small>
          </span>
        </div>
        <button className="logout" onClick={() => salir(establecerAbierto)}>
          <LogOut size={19} />
          {c.out}
        </button>
      </aside>
      <nav className="bottom">
        {enlacesInferiores.map(([id, Icono, etiqueta]) => (
          <button key={id} className={pagina === id ? 'active' : ''} onClick={() => ir(id)}>
            {icono(id, Icono, 19, avisos)}
            <small>{c[etiqueta]}</small>
          </button>
        ))}
      </nav>
    </>
  );
}
