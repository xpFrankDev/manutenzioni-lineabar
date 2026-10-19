/** Bloque base de carga. No anuncia contenido: el contenedor lleva aria-busy. */
export function Skeleton({ className = '', style }) {
  return <span className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}
