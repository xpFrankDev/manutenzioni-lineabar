import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Contexto de la empresa activa. Se propaga por AsyncLocalStorage para que los
 * servicios puedan filtrar por tenant sin depender de un parámetro repetido en
 * cada función. La sesión lo inicializa después de validar el JWT.
 */
export const contextoEmpresa = new AsyncLocalStorage();

export function empresaActual() {
  const empresaId = contextoEmpresa.getStore()?.empresaId;
  if (!empresaId) throw new Error('Empresa no disponible en el contexto');
  return empresaId;
}

export function usuarioActual() {
  return contextoEmpresa.getStore()?.usuarioId ?? null;
}

export function ejecutarConEmpresa(empresaId, usuarioId, tarea) {
  return contextoEmpresa.run({ empresaId, usuarioId }, tarea);
}
