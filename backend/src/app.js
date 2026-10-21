import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { entorno } from './configuracion/entorno.js';
import { leerCookies } from './intermedios/cookies.js';
import { manejadorErrores } from './intermedios/errores.js';
import { exigirPermiso } from './intermedios/permisos.js';
import { limiteGeneral } from './intermedios/limite.js';
import { exigirSesion } from './intermedios/sesion.js';
import { rutasActividades } from './modulos/actividades/rutas.js';
import { rutasAutenticacion } from './modulos/autenticacion/rutas.js';
import { rutasBoletas } from './modulos/boletas/rutas.js';
import { rutasCalendario } from './modulos/calendario/rutas.js';
import { rutasCatalogos } from './modulos/catalogos/rutas.js';
import { rutasConfiguracion } from './modulos/configuracion/rutas.js';
import { rutasInterventos } from './modulos/interventos/rutas.js';
import { rutasMaquinas } from './modulos/maquinas/rutas.js';
import { rutasParametros } from './modulos/parametros/rutas.js';
import { rutasProgrammaciones } from './modulos/programmaciones/rutas.js';
import { rutasReportes } from './modulos/reportes/rutas.js';
import { rutasScontrini } from './modulos/scontrini/rutas.js';
import { rutasTablero } from './modulos/tablero/rutas.js';

export function crearApp() {
  const app = express();

  app.set('trust proxy', entorno.trustProxy);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: entorno.origenesPermitidos.length ? entorno.origenesPermitidos : false,
      credentials: true
    })
  );
  app.use(express.json({ limit: '12mb' }));
  app.use(leerCookies);

  app.get('/api/salute', (_req, res) => res.json({ stato: 'ok' }));

  app.use('/api', limiteGeneral);
  app.use('/api', rutasAutenticacion);

  // Acceso modular por menú. Los catálogos compartidos por el flujo de campo
  // se protegen en su propio módulo para no romper la selección de máquinas.
  app.use('/api/dashboard', exigirSesion, exigirPermiso('dashboard'));
  app.use('/api/interventi', exigirSesion, exigirPermiso('mantenimientos'));
  app.use('/api/boletas', exigirSesion, exigirPermiso('boletas'));
  app.use('/api/calendario', exigirSesion, exigirPermiso('calendario'));
  app.use('/api/attivita', exigirSesion, exigirPermiso('tareas'));
  app.use('/api/reportes', exigirSesion, exigirPermiso('reportes'));
  app.use('/api/configurazione', exigirSesion, exigirPermiso('configuracion', 'editar'));
  app.use('/api/programmazioni', exigirSesion, exigirPermiso('programmazione'));

  app.use('/api', rutasTablero);
  app.use('/api', rutasCatalogos);
  app.use('/api', rutasMaquinas);
  app.use('/api', rutasInterventos);
  app.use('/api', rutasBoletas);
  app.use('/api', rutasCalendario);
  app.use('/api', rutasScontrini);
  app.use('/api', rutasReportes);
  app.use('/api', rutasParametros);
  app.use('/api', rutasActividades);
  app.use('/api', rutasProgrammaciones);
  app.use('/api', rutasConfiguracion);

  app.use(manejadorErrores);
  return app;
}
