# 00 — Índice documental de Linea Bar

> **Estado: NORMATIVO DE NAVEGACIÓN (revisión 2026-10-21).** Documento de entrada.
> No sustituye a ningún otro documento: indica qué leer, con qué confianza y qué
> evidencia lo respalda. Si este documento contradice al código, manda el código.

## 1. Etiquetas de evidencia

| Etiqueta | Significado |
| --- | --- |
| `[V]` | **Verificado** en el código, la configuración o una ejecución real citada. |
| `[P]` | **Propuesta** de diseño; no implementada ni autorizada. |
| `[NV]` | **No verificado**: falta evidencia para concluir. |
| `[D]` | **Decisión pendiente** del propietario. |

Solo `[V]` es un hecho. `[P]` es diseño. `[NV]` es una laguna declarada, no un
problema resuelto. Las decisiones `[D]` se cierran en `07-decisiones-abiertas.md`.

## 2. Mapa documental

| Documento | Naturaleza | Contenido |
| --- | --- | --- |
| `01-arquitectura.md` | Diseño verificado | Stack real, componentes, módulos, flujo de datos, fronteras y despliegue. |
| `02-estado-funcional.md` | Auditoría `[V]` | Qué pide el producto/roadmap, qué está implementado y qué queda a medias. |
| `03-modelo-datos.md` | Diseño verificado | Tablas, relaciones, migraciones, campos de auditoría, semillas y códigos. |
| `04-seguridad.md` | **Normativo de seguridad** | Controles existentes, hallazgos con severidad, matriz de amenazas y plan de remediación. |
| `05-verificacion.md` | Evidencia `[V]` | Comandos ejecutados, resultados reales, cobertura y límites declarados. |
| `06-operaciones.md` | Guía operativa | Desarrollo local, variables, migraciones, despliegue, copia de seguridad y reversión. |
| `07-decisiones-abiertas.md` | Registro | Decisiones humanas `[D]` abiertas y su motivo. |
| `08-continuidad-agentes.md` | Normativo de trabajo | Objetivo activo, autonomía, decisiones reservadas y estados de informe. |
| `09-post-roadmap.md` | Plan | Prioridades posteriores al roadmap, criterios de aceptación y deuda técnica. |
| `../ROADMAP.md` | Plan histórico | Roadmap cerrado de septiembre de 2026, conservado como registro. |
| `../PRODUCT.md` | Producto | Plataforma, usuarios, propósito, principios y restricciones. |
| `../DESIGN.md` | Diseño | Dirección visual, tokens e interacción. |
| `../README.md` | Operativa | Arranque local, scripts, base de datos y despliegue. |

## 3. Orden de lectura recomendado

- **Continuar trabajo:** `AGENTS.md` → `08-continuidad-agentes.md` → `09-post-roadmap.md`
  → `02-estado-funcional.md`.
- **Seguridad:** `04-seguridad.md` → `01-arquitectura.md` → `07-decisiones-abiertas.md`.
- **Operación/despliegue:** `06-operaciones.md` → `README.md` → `05-verificacion.md`.
- **Producto/datos:** `PRODUCT.md` → `02-estado-funcional.md` → `03-modelo-datos.md`.

## 4. Regla de mantenimiento

1. Todo cambio de arquitectura, seguridad, datos o contrato actualiza el
   documento afectado **en el mismo cambio**.
2. Las decisiones pendientes no se resuelven por silencio: se cierran
   explícitamente en `07-decisiones-abiertas.md`.
3. Toda afirmación sobre el estado del proyecto lleva etiqueta `[V]`/`[P]`/`[NV]`/`[D]`
   y referencia a la ruta que la respalda.
4. `05-verificacion.md` se actualiza cuando cambie el resultado real de las suites.
