# 10 — Integración con Cimbali Service Square

> **Estado: INVESTIGACIÓN `[V]` (2026-10-22).** No hay una API pública documentada
> para clientes finales; la integración requiere credenciales de partner.

## Hallazgos

- El portal de asistencia es **Service Square**:
  `https://servicesquare.cimbaligroup.com/`.
- Es una aplicación Angular que apunta a un backend SAP Commerce Cloud/OCC:
  `https://api.cimbaligroup.com`.
- El HTML declara `occ-backend-base-url=https://api.cimbaligroup.com`.
- El bundle del portal contiene llamadas OCC del tipo:
  - `/occ/v2/{baseSite}/c4c/current/techticketscount`
  - `/occ/v2/{baseSite}/c4c/current/techtickets/interventions`
  - `/occ/v2/{baseSite}/c4c/current/techtickets/maintenance`
  - `/occ/v2/{baseSite}/c4c/current/techtickets/installations`
  - `/occ/v2/{baseSite}/c4c/current/techtickets/{id}`
- El acceso usa autenticación de Service Square (OAuth/sesión de SAP Commerce);
  no se encontró una API pública con documentación, clave de partner ni
  catálogo abierto.
- No se han usado credenciales de Cimbali ni se ha intentado eludir el portal.

## Consecuencia para Linea Bar

No conviene implementar una integración real hasta disponer de:

1. Contrato/portal de partner y usuario de servicio.
2. Documentación OCC/API, `baseSite`, permisos y límites.
3. Método de autenticación aprobado (OAuth, mTLS o el que indique Cimbali).
4. Autorización escrita para leer/escribir tareas de nuestros clientes.

Mientras tanto, Linea Bar mantiene su propia programación y puede importar las
tareas manualmente. La integración futura debe implementarse como un conector
con `CIMBALI_CLIENT_ID`, `CIMBALI_CLIENT_SECRET` y endpoint en el `.env` del
servidor, nunca con credenciales en el frontend ni en el repositorio.
