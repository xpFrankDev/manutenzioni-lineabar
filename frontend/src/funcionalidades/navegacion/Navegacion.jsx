import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  UserRound,
  Wrench,
  X
} from 'lucide-react';
import { borrarSesion } from '../../compartido/api/cliente.js';
import { RUTA_ACCESO } from '../../compartido/constantes.js';

function icono(id, Icono, tamano, tareasPendientes) {
  return (
    <span className="nav-icon">
      <Icono size={tamano} />
      {id === 'tareas' && <em className="nav-badge">{tareasPendientes}</em>}
    </span>
  );
}

function salir(establecerAbierto) {
  borrarSesion();
  establecerAbierto(false);
  location.assign(RUTA_ACCESO);
}

export function Navegacion({ pagina, ir, abierto, establecerAbierto, c, tareasPendientes = 0, usuario }) {
  const enlaces = [
    ['dashboard', LayoutDashboard, c.home],
    ['boletas', ReceiptText, c.receipts],
    ['mantenimientos', Wrench, c.jobs],
    ['tareas', ClipboardList, c.tasks],
    ['configuracion', Settings, c.settings]
  ];
  const etiquetaRol = usuario?.ruolo === 'tecnico' ? c.technician : c.administrator;

  return (
    <>
      <div className={`scrim ${abierto ? 'show' : ''}`} onClick={() => establecerAbierto(false)} />
      <aside className={`side ${abierto ? 'open' : ''}`}>
        <div className="side-brand">
          <i>LB</i>
          <span>
            <b>Linea Bar</b>
            <small>di Gianluca Testa</small>
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
              {icono(id, Icono, 20, tareasPendientes)}
              {etiqueta}
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
        {enlaces.slice(0, 4).map(([id, Icono, etiqueta]) => (
          <button key={id} className={pagina === id ? 'active' : ''} onClick={() => ir(id)}>
            {icono(id, Icono, 19, tareasPendientes)}
            <small>{etiqueta}</small>
          </button>
        ))}
      </nav>
    </>
  );
}
