import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { entorno } from './configuracion/entorno.js';
import { manejadorErrores } from './intermedios/errores.js';
import { rutasActividades } from './modulos/actividades/rutas.js';
import { rutasAutenticacion } from './modulos/autenticacion/rutas.js';
import { rutasBoletas } from './modulos/boletas/rutas.js';
import { rutasCatalogos } from './modulos/catalogos/rutas.js';
import { rutasConfiguracion } from './modulos/configuracion/rutas.js';
import { rutasInterventos } from './modulos/interventos/rutas.js';
import { rutasTablero } from './modulos/tablero/rutas.js';

export function crearApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: entorno.origenesPermitidos.length ? entorno.origenesPermitidos : false,
      credentials: true
    })
  );
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/salute', (_req, res) => res.json({ stato: 'ok' }));

  app.use('/api', rutasAutenticacion);
  app.use('/api', rutasTablero);
  app.use('/api', rutasCatalogos);
  app.use('/api', rutasInterventos);
  app.use('/api', rutasBoletas);
  app.use('/api', rutasActividades);
  app.use('/api', rutasConfiguracion);

  app.use(manejadorErrores);
  return app;
}
