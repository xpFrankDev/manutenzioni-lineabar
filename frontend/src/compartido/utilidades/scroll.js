import { useEffect } from 'react';

/**
 * Bloquea el scroll de la página mientras una hoja/modal está abierta. El
 * contenido del modal conserva su propio scroll.
 */
export function useBloquearScroll(activo = true) {
  useEffect(() => {
    if (!activo || typeof document === 'undefined') return undefined;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [activo]);
}
