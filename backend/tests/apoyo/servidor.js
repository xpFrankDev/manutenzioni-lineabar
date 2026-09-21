import { crearApp } from '../../src/app.js';

export async function levantarServidor() {
  const app = crearApp();
  const servidor = app.listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  const { port } = servidor.address();
  return {
    base: `http://127.0.0.1:${port}/api`,
    cerrar: () =>
      new Promise((resolver) => {
        servidor.closeAllConnections?.();
        servidor.close(resolver);
      })
  };
}

export async function pedir(base, ruta, { metodo = 'GET', token, cuerpo, cabeceras = {} } = {}) {
  const respuesta = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: {
      ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...cabeceras
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  });
  const texto = await respuesta.text();
  let datos = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = texto;
  }
  return { estado: respuesta.status, datos, cabeceras: respuesta.headers };
}

export async function iniciarSesion(base, codigo_usuario, password) {
  const { estado, datos } = await pedir(base, '/auth/login', { metodo: 'POST', cuerpo: { codigo_usuario, password } });
  if (estado !== 200) throw new Error(`Login fallido para ${codigo_usuario}: ${estado} ${JSON.stringify(datos)}`);
  return datos;
}
