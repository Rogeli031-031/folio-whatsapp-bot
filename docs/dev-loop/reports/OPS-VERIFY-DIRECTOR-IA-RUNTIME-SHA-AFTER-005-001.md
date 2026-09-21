# OPS-VERIFY-DIRECTOR-IA-RUNTIME-SHA-AFTER-005-001

## Identidad

| Campo | Valor |
|---|---|
| task_id | OPS-VERIFY-DIRECTOR-IA-RUNTIME-SHA-AFTER-005-001 |
| expected_main_sha | 6a22ace37ba9a43270d2a3f8820a48ff3097d88b |
| classification | CURRENT_RUNTIME_CONFIRMED |
| schema_changes | false |
| data_mutation | false |
| code_changes | false |
| patch | no |
| deploy | no |
| PR | no |
| merge | false |
| commit | false |

Fuente Render: CLI `render` v2.26.0, workspace autenticado (`lzaragoza.a@tomza.com`). No se usó inferencia por fecha. Los SHA salen de `commit.id` + `status` de cada deploy.

## 1. Git

`git fetch origin` ejecutado.

| Ref | SHA | Mensaje |
|---|---|---|
| `origin/main` | `6a22ace37ba9a43270d2a3f8820a48ff3097d88b` | Merge pull request #50 — IMPL-DIRECTOR-IA-COMMERCIAL-RUNTIME-HARDENING-005 |
| `main` local | `567e68e05e4e7d7b5fec8ecd1384bf00bff4a9c7` | Merge pull request #37 — IGF modal physical bounds (checkout local atrasado; no se actualizó) |
| HEAD de esta rama | `ca4c7fc25ae92be3bd19efdf4e93aa90d93115c5` | impl 005 (rama `implementation/director-ia-commercial-runtime-hardening-005`) |

`6a22ace` contiene `lib/director-ia-commercial-runtime-hardening-005.js` y `test/director-ia-commercial-runtime-hardening-005.test.js`.

`ca4c7fc2` es ancestro de `6a22ace` (`git merge-base --is-ancestor` exit 0).

`origin/main` **sí** es el SHA esperado.

`main` local **no** es el SHA esperado. Eso no cambia el runtime: el servicio live lee el remoto.

## 2. Render — servicio que sirve Director IA (backend)

Servicio actualmente servido para planner/chat/lib (las pruebas comerciales):

| Campo | Valor |
|---|---|
| name | `folio-whatsapp-bot` |
| id | `srv-d674jsesb7us73c0i7u0` |
| url | https://folio-whatsapp-bot.onrender.com |
| repo | https://github.com/Rogeli031-031/folio-whatsapp-bot |
| branch | `main` |
| rootDir | (repo root; `node server.js`) |
| autoDeploy | commit |

### Último deploy iniciado

| Campo | Valor |
|---|---|
| deploy id | `dep-damo1c3tqb8s73bqoang` |
| trigger | `new_commit` |
| status | `live` |
| startedAt | 2026-09-18T18:19:28.280607Z |
| finishedAt | 2026-09-18T18:20:14.084314Z |
| commit SHA | `6a22ace37ba9a43270d2a3f8820a48ff3097d88b` |

### Último deploy exitoso

El mismo: `dep-damo1c3tqb8s73bqoang` / `6a22ace37ba9a43270d2a3f8820a48ff3097d88b` / `live`.

No hay deploys posteriores en `created`, `queued`, `build_in_progress` ni `update_in_progress`.

### Commit SHA del deploy live

`6a22ace37ba9a43270d2a3f8820a48ff3097d88b`

Live == esperado.

## 3. Render — frontend dashboard (no es el runtime 005)

005 no tocó `frontend-dashboard/`. El chat comercial se resuelve en el bot. Se documenta para no confundir SHA de UI con SHA de planner.

| Campo | Valor |
|---|---|
| name | `folio-dashboard` |
| id | `srv-d6h78mh5pdvs73dck980` |
| url | https://folio-dashboard.onrender.com |
| branch | `main` |
| rootDir | `frontend-dashboard` |

| Rol | deploy id | SHA | status |
|---|---|---|---|
| último iniciado / live / último exitoso | `dep-dammd10u01pc73949pu0` | `2e50dabae05df7cdad24cbfefaca285c16615db8` | `live` |

No aparece deploy de `6a22ace` ni de `df95fafa` en la lista del dashboard (004/005 no cambiaron el frontend).

Servicios de test (`folio-whatsapp-bot-director-ia-test`, `folio-dashboard-director-ia-test`) siguen en `feature/director-ia-mvp`. No son el runtime de las pruebas reales.

## 4. Clasificación

```
CURRENT_RUNTIME_CONFIRMED
```

Criterio de la tarea: live SHA del servicio que ejecuta Director IA (`folio-whatsapp-bot`) == `6a22ace37ba9a43270d2a3f8820a48ff3097d88b`.

Las pruebas reales del usuario **sí** se ejecutaron contra código que ya contiene IMPL-DIRECTOR-IA-COMMERCIAL-RUNTIME-HARDENING-005.

No es `STALE_RUNTIME_CONFIRMED`.

No se corrigió 005. No se desplegó. No se parcheó.

## 5. Fallos reales aún presentes (contra 6a22ace live)

Registrados como regresiones de runtime actuales, no como evidencia de SHA viejo:

| ID | Caso | Observación humana |
|---|---|---|
| A | `total de clientes nuevos` + `agosto` | → unknown |
| B | clientes DEJARON en septiembre → `¿Cuánto dejamos de vender por ellos?` | pierde result set DEJARON; termina en DISMINUYERON |
| C | `¿Qué clientes están en riesgo de dejar de comprar?` | respuesta vacía |
| D | `¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?` | respuesta vacía |
| E | `¿qué descuento tenemos?` | → unknown |
| F | `¿qué HG tenemos?` | → unknown |

También queda el matiz de B como dos fallos del prompt: follow-up «por ellos» pierde DEJARON, y DEJARON puede convertirse en DISMINUYERON.

## 6. Siguiente tarea recomendada (no autorizada)

`IMPL-DIRECTOR-IA-DIRECT-METRICS-AND-CONTEXT-HARDENING-006`

Esta línea es propuesta. No es G1. No se abre ni se implementa.

## 7. Fuera de alcance (intacto)

Planner, chat, predictive, IGF, deploy, rollback, patch, PR, merge, código, fix.

## Cierre

CURRENT_TASK → DONE_PENDING_REVIEW.

STOP.

NO PR. NO merge. NO deploy. NO siguiente tarea.
