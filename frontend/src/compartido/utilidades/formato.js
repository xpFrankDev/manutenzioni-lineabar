export function formatearMoneda(valor, idioma) {
  return new Intl.NumberFormat(idioma === 'it' ? 'it-IT' : 'es-ES', { style: 'currency', currency: 'EUR' }).format(
    Number(valor || 0)
  );
}

export function formatearFecha(valor, idioma) {
  if (!valor) return '—';
  const texto = String(valor);
  const tieneHora = texto.includes('T') || texto.includes(':');
  const fecha = new Date(tieneHora ? texto.replace(' ', 'T') : `${texto}T12:00:00`);
  if (Number.isNaN(fecha.valueOf())) return '—';
  return new Intl.DateTimeFormat(idioma === 'it' ? 'it-IT' : 'es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(fecha);
}

export function formatearHora(valor) {
  if (!valor) return '';
  return String(valor).slice(0, 5);
}

export function horaDeAhora() {
  const ahora = new Date();
  return `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
}

export function fechaDeHoy() {
  return new Date().toISOString().slice(0, 10);
}
