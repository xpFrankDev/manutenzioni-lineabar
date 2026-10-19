import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import { useBloquearScroll } from '../utilidades/scroll.js';

const AvisosContext = createContext(null);

export function AvisosProvider({ children }) {
  const [confirmacion, setConfirmacion] = useState(null);
  const [aviso, setAviso] = useState(null);
  const temporizador = useRef(null);
  const resolver = useRef(null);

  useBloquearScroll(Boolean(confirmacion));

  const cerrarConfirmacion = useCallback((resultado) => {
    if (resolver.current) resolver.current(resultado);
    resolver.current = null;
    setConfirmacion(null);
  }, []);

  const confirmar = useCallback(
    (opciones) =>
      new Promise((resolverPromesa) => {
        resolver.current = resolverPromesa;
        setConfirmacion({
          titulo: opciones.titulo || '',
          mensaje: opciones.mensaje || '',
          textoConfirmar: opciones.textoConfirmar || 'OK',
          textoCancelar: opciones.textoCancelar || 'Cancelar',
          peligro: Boolean(opciones.peligro)
        });
      }),
    []
  );

  const notificar = useCallback((mensaje, tipo = 'success') => {
    if (temporizador.current) clearTimeout(temporizador.current);
    setAviso({ mensaje, tipo });
    temporizador.current = setTimeout(() => setAviso(null), 3500);
  }, []);

  const valor = useMemo(() => ({ confirmar, notificar }), [confirmar, notificar]);

  return (
    <AvisosContext.Provider value={valor}>
      {children}
      {aviso && (
        <div className={`aviso-toast ${aviso.tipo}`} role="status" aria-live="polite">
          {aviso.tipo === 'error' ? <CircleAlert size={18} /> : <CheckCircle2 size={18} />}
          <span>{aviso.mensaje}</span>
          <button type="button" aria-label="Chiudi" onClick={() => setAviso(null)}>
            <X size={15} />
          </button>
        </div>
      )}
      {confirmacion && (
        <div className="aviso-backdrop" role="presentation" onMouseDown={() => cerrarConfirmacion(false)}>
          <section
            className="aviso-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="aviso-titulo"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 id="aviso-titulo">{confirmacion.titulo}</h2>
            <p>{confirmacion.mensaje}</p>
            <div className="aviso-actions">
              <button type="button" onClick={() => cerrarConfirmacion(false)}>
                {confirmacion.textoCancelar}
              </button>
              <button
                type="button"
                className={confirmacion.peligro ? 'danger' : 'primary'}
                onClick={() => cerrarConfirmacion(true)}
              >
                {confirmacion.textoConfirmar}
              </button>
            </div>
          </section>
        </div>
      )}
    </AvisosContext.Provider>
  );
}

export function useAvisos() {
  const contexto = useContext(AvisosContext);
  if (!contexto) throw new Error('useAvisos debe usarse dentro de AvisosProvider');
  return contexto;
}
