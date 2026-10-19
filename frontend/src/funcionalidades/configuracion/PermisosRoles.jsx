import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { llamarApi } from '../../compartido/api/cliente.js';
import { useAvisos } from '../../compartido/componentes/Avisos.jsx';

export function PermisosRoles({ c, alVolver }) {
  const { notificar } = useAvisos();
  const [roles, setRoles] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    llamarApi('/configurazione/roles')
      .then((datos) => {
        setRoles(datos.roles);
        setSeleccionado(datos.roles[0]?.id ?? null);
      })
      .catch((e) => setError(e.message));
  }, []);

  const rol = useMemo(() => roles?.find((fila) => fila.id === seleccionado) ?? null, [roles, seleccionado]);

  function cambiarPermiso(codice, campo, valor) {
    setRoles((actual) =>
      actual.map((fila) =>
        fila.id === seleccionado
          ? {
              ...fila,
              menus: fila.menus.map((menu) => {
                if (menu.codice !== codice) return menu;
                const siguiente = { ...menu, [campo]: valor };
                if (campo === 'ver' && !valor) siguiente.modificar = false;
                return siguiente;
              })
            }
          : fila
      )
    );
  }

  async function guardar() {
    if (!rol) return;
    setGuardando(true);
    setError('');
    try {
      const datos = await llamarApi(`/configurazione/roles/${rol.id}`, {
        method: 'PUT',
        body: JSON.stringify({ permisos: rol.menus.map((menu) => ({ codice: menu.codice, ver: menu.ver, modificar: menu.modificar })) })
      });
      setRoles(datos.roles);
      notificar(c.rolePermissionsSaved);
    } catch (e) {
      setError(e.message);
      notificar(e.message, 'error');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="content settings-list">
      <header className="settings-header">
        <button className="back-button" onClick={alVolver}>
          <ChevronLeft size={20} />
          {c.settings}
        </button>
        <div>
          <h1>
            <ShieldCheck size={26} />
            {c.roles}
          </h1>
          <p>{c.rolesHelp}</p>
        </div>
      </header>

      {error && <p className="error">{error}</p>}
      {roles === null ? (
        <p>{c.loading}</p>
      ) : (
        <section className="permissions-panel">
          <div className="role-tabs" role="tablist" aria-label={c.roles}>
            {roles.map((fila) => (
              <button
                key={fila.id}
                role="tab"
                aria-selected={fila.id === seleccionado}
                className={fila.id === seleccionado ? 'active' : ''}
                onClick={() => setSeleccionado(fila.id)}
              >
                {fila.nome}
              </button>
            ))}
          </div>

          {rol && (
            <div className="permission-list">
              {rol.menus.map((menu) => (
                <article key={menu.codice} className="permission-row">
                  <b>{menu.nome}</b>
                  <label className="check-line">
                    <input
                      type="checkbox"
                      checked={menu.ver}
                      onChange={(e) => cambiarPermiso(menu.codice, 'ver', e.target.checked)}
                    />
                    {c.view}
                  </label>
                  <label className="check-line">
                    <input
                      type="checkbox"
                      checked={menu.modificar}
                      disabled={!menu.ver}
                      onChange={(e) => cambiarPermiso(menu.codice, 'modificar', e.target.checked)}
                    />
                    {c.modify}
                  </label>
                </article>
              ))}
              <button className="primary" onClick={guardar} disabled={guardando}>
                {c.savePermissions}
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
