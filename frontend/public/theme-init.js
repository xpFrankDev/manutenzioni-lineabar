// Se ejecuta antes del bundle para evitar el destello de tema incorrecto.
// La preferencia es solo de interfaz: no contiene sesión ni datos personales.
try {
  document.documentElement.dataset.theme = localStorage.getItem('lineabar_theme') || 'dark';
} catch {
  document.documentElement.dataset.theme = 'dark';
}
