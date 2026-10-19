import { Router } from 'express';
import { exigirPermiso } from '../../intermedios/permisos.js';
import { exigirSesion } from '../../intermedios/sesion.js';
import {
  boletasACsv,
  boletasDelPeriodo,
  consumosPorRicambio,
  ingresosPorCliente,
  interventosPorTipo,
  previsionMantenimiento,
  riepilogoPeriodo
} from './servicio.js';

export const rutasReportes = Router();

rutasReportes.use('/reportes', exigirSesion, exigirPermiso('reportes'));

rutasReportes.get('/reportes/riepilogo', async (req, res) => {
  try {
    const periodo = req.query.periodo;
    const [riepilogo, clientes, tipos, ricambi, previsione] = await Promise.all([
      riepilogoPeriodo(periodo),
      ingresosPorCliente(periodo),
      interventosPorTipo(periodo),
      consumosPorRicambio(periodo),
      previsionMantenimiento(req.query.mesi)
    ]);
    return res.json({ ...riepilogo, clientes, tipos, ricambi, previsione });
  } catch (error) {
    return res.status(400).json({ errore: error.message || 'Report non disponibile' });
  }
});

rutasReportes.get('/reportes/boletas.csv', async (req, res) => {
  try {
    const periodo = req.query.periodo;
    const filas = await boletasDelPeriodo(periodo);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="boletas-${String(periodo ?? '').slice(0, 7) || 'periodo'}.csv"`);
    return res.send(boletasACsv(filas));
  } catch (error) {
    return res.status(400).json({ errore: error.message || 'Esportazione non disponibile' });
  }
});
