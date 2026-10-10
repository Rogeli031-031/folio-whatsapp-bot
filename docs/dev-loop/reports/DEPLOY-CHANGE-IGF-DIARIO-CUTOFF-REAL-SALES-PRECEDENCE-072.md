# DEPLOY-CHANGE-IGF-DIARIO-CUTOFF-REAL-SALES-PRECEDENCE-072

status: DEPLOYED_PENDING_PRODUCTION_VALIDATION

human_authorization: Luis Rogelio Zaragoza Álvarez autoriza el deploy a producción

pr: 119

authorized_sha: 5de98adc664185351afe0c69e29222903ba2b47e

deployed_sha: 5de98adc664185351afe0c69e29222903ba2b47e

method: Render auto-deploy de main, ya en vivo para ese commit

migrations: 0

additional_changes: 0

## Pre-deploy

`git fetch origin` dejó `origin/main` en `5de98adc664185351afe0c69e29222903ba2b47e`.

PR #119 estaba merged. El squash es ese SHA y su único padre es `ad8a8ba8e00557993a8da62f735f9fe6ee020ada`.

No se creó código, no se tocaron variables, infraestructura ni la base de datos.

El checkout local sigue en otra rama y solo tiene sucio `docs/dev-loop/CURRENT_TASK.md`, el archivo de esta autorización. Render no desplegó ese árbol. Hizo checkout del commit autorizado.

## Deploy

Servicio productivo: `folio-whatsapp-bot` (`srv-d674jsesb7us73c0i7u0`), auto-deploy desde `main`.

| Campo | Valor |
| --- | --- |
| Deploy | dep-db4q4mk9v7es738fohq0 |
| Estado | live |
| Commit | 5de98adc664185351afe0c69e29222903ba2b47e |
| Inicio | 2026-10-10T02:26:34Z |
| Live | 2026-10-10T02:27:15Z |

El log dice: checkout de ese commit, `npm install`, `Build successful`, `node server.js`, `Bot corriendo en puerto 10000`, `Your service is live`, URL `https://folio-whatsapp-bot.onrender.com`.

No se disparó un segundo deploy. El que abrió el merge ya era el SHA autorizado.

`folio-dashboard` sigue live en `bccdf84e5f19fec65c282eff5eb7eec6d6132241`. Render no abrió un deploy de `5de98adc` para ese servicio. 072 no cambia frontend. El contrato vive en el backend.

## Build, startup y health

Build: éxito. Warning previo del `npm audit` (15 avisos de dependencias). No detuvo el build.

Startup: `node server.js` en puerto 10000. Schema y Delta Ingreso AI listos. Ese mensaje es el arranque existente. Esta tarea no ejecutó migraciones.

Health, 2026-10-10T02:45:57Z:

| URL | HTTP | Cuerpo |
| --- | --- | --- |
| `GET /health` | 200 | OK |
| `GET /health-db` | 200 | `{"ok":true,"hora":"2026-10-10T02:45:58.415Z"}` |
| `GET https://folio-dashboard.onrender.com/` | 200 | página |

Logs desde el live hasta la prueba: sin 500, 502, 503 ni 504. Sin texto `resolveCanalTon`, `Error` ni `exception`.

## Smoke

Sin sesión y sin escribir datos:

| Ruta | HTTP |
| --- | --- |
| `GET /api/arr/dashboard-excel` | 401 |
| `GET /api/dashboard/igf-diario-grafica` | 401 |
| `GET /api/dashboard/igf-diario-semanal` | 401 |

Las rutas de IGF Diario responden y piden autenticación. No devolvieron 5xx.

## Contrato 072 en el SHA desplegado

`resolveCanalTon` del commit en producción:

- fecha distinta del corte sigue en la rama anterior;
- fecha igual al corte, por canal: captura finita, si falta pronóstico finito, si falta null;
- fecha posterior: `canalIsAfterCutoff` y `projectedCanalValue` no cambiaron, así que el pronóstico sigue ganando;
- `finiteCanalTon` acepta 0 porque `Number.isFinite(0)` es verdadero. `null` y `""` siguen ausentes. En la fecha de corte, la ausencia devuelve null, no 0.

San Luis 04/10/2026 no se leyó en datos productivos. Hacerlo pedía una sesión sobre ventas reales. No se modificó ningún dato para fabricar el caso.

## Cierre

PRODUCTION DEPLOY = SUCCESS

DEPLOY = el SHA autorizado está live en `folio-whatsapp-bot`.

Este reporte no se empuja a `main`, para no abrir otro auto-deploy.
