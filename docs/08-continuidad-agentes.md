# 08 — Protocolo de continuidad de agentes

> **Estado: NORMATIVO DE TRABAJO (revisión 2026-10-21).** Se aplica a cualquier
> agente que trabaje en `manutenzioni-lineabar`, con independencia de la sesión.
> Adapta el protocolo de `proyecto-trading-saas/docs/governance/agent-continuity.md`.
> Regula **cuándo continuar** y **cuándo detenerse**, no qué está autorizado.

## 0. Precedencia

1. Instrucción explícita del propietario en el encargo vigente.
2. `AGENTS.md` (reglas duras del repositorio) y `docs/04-seguridad.md`.
3. Este protocolo.
4. Preferencias generales del usuario.

## A. Objetivo activo

Antes de empezar, el agente deja por escrito:

- resultado esperado y **criterios de aceptación verificables**;
- alcance autorizado (archivos, módulos, entornos y datos);
- acciones prohibidas del encargo y del repositorio;
- decisiones reservadas al propietario que el objetivo pueda requerir;
- dependencias conocidas (base de datos, Docker, VPS).

Una tarea intermedia (crear un archivo, ejecutar pruebas, documentar) **no** es el
objetivo completo: es un paso dentro de él.

## B. Continuidad autónoma

Mientras el objetivo siga incompleto y queden pasos dentro del alcance, el agente
continúa por sí mismo: pasa al siguiente paso, resuelve decisiones técnicas
reversibles, ejecuta pruebas, corrige sus fallos, actualiza la documentación
afectada y deja el trabajo listo para revisión.

No se pide permiso por haber terminado un archivo, cerrado un paso técnico o
pasado las pruebas. Esos hechos no significan que el objetivo haya terminado.

## C. Decisiones delegadas

El agente puede decidir sin consultar cuando la decisión sea técnica, reversible,
local, dentro del alcance, coherente con la arquitectura y verificable con pruebas
o evidencia reproducible. Las decisiones relevantes se documentan en el documento
afectado o en el informe.

## D. Decisiones reservadas

El agente **se detiene y pregunta** antes de:

- cambios en el VPS, despliegue, Nginx, Docker, systemd, `.env` o base de datos de
  producción;
- migrar la sesión a cookies o cualquier cambio que altere el contrato de la API;
- adoptar dependencias o infraestructura externas nuevas (gestor de secretos, WAF,
  CDN, proveedor de notificaciones);
- cerrar decisiones de producto (`docs/07-decisiones-abiertas.md`);
- publicar, fusionar ramas o hacer `push` sin autorización;
- ampliar alcance, datos o superficie expuesta.

## E. Bloqueos parciales

Si una decisión humana bloquea solo una parte, el agente continúa con las partes
independientes autorizadas y declara lo bloqueado. No hace trabajo especulativo que
la decisión pendiente pueda invalidar.

## F. Informes

Cada informe abre con un estado:

| Estado | Significado |
| --- | --- |
| `CONTINUANDO` | El objetivo sigue activo y queda trabajo autorizado. |
| `OBJETIVO_COMPLETADO` | Los criterios de aceptación están verificados. |
| `HUMAN_GATE` | Hay una decisión reservada al propietario que impide continuar. |
| `BLOQUEO_TECNICO` | Un impedimento técnico no resoluble dentro del alcance. |

El informe final incluye: estado, objetivo, criterios cumplidos, evidencia
(comandos y resultados), lo que queda pendiente, motivos de parada y riesgos
residuales.

## G. Evidencia

- Toda afirmación sobre el estado lleva etiqueta `[V]`/`[P]`/`[NV]`/`[D]` y
  referencia a ruta o comando.
- No se declara una capacidad por el nombre de una función: se exige evidencia.
- `MEMORY != EVIDENCE`: el estado se lee del repositorio, no de la conversación.

## H. Antes de tocar nada

1. Leer `AGENTS.md` y `docs/00-indice.md`.
2. Identificar el documento afectado y su estado.
3. Revisar `docs/04-seguridad.md` y `docs/07-decisiones-abiertas.md`.
4. Reanudar solo trabajo autorizado; si no puede determinarse, preguntar.

## I. Validación obligatoria

| Cambio | Verificación mínima |
| --- | --- |
| Backend | `npm run verificar` + `npm run test:unidad`; integración si toca API o SQL. |
| Frontend | `npm test` + `npm run build`. |
| Dependencias | `npm audit --omit=dev`. |
| SQL | Migración nueva numerada; nunca editar una aplicada. |
| Visual | Revisión en móvil emulado, tema claro y oscuro, sin desbordes ni errores de consola. |
| Seguridad | Prueba negativa del control tocado. |

## J. Git

- Trabajar en rama de funcionalidad; no hacer commit, push, PR, merge ni despliegue
  sin autorización explícita.
- No versionar secretos, `.env`, artefactos generados ni dependencias.
