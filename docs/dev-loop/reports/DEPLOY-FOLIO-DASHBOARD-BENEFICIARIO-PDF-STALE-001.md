# DEPLOY-FOLIO-DASHBOARD-BENEFICIARIO-PDF-STALE-001

```yaml
task_id: "DEPLOY-FOLIO-DASHBOARD-BENEFICIARIO-PDF-STALE-001"
outcome: "BLOCKED"
mode: "DEPLOY"
implementation: false
code_changes: false
commits: false
push: false
merge: false
schema_changes: false
docs_director_ia_changed: false
origin_main: "cc55a607202e997fb1817b2616f43be4de8b198d"
functional_commit_ancestor: "d087d232"
deployed_sha: "NOT_PROVEN"
render_trigger: "NOT_AVAILABLE"
v1_sha: "NOT_PROVEN"
v2_health: "PASS_ENDPOINTS_ONLY"
v3_errors: "NOT_OBSERVABLE"
v4_functional: "NOT_EXECUTABLE"
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
contracts_modified: []
ambiguities_or_contradictions:
  - "El prompt de chat pedía terminar en DONE_PENDING_REVIEW. CURRENT_TASK §4/§7 exige BLOCKED si no se puede disparar/observar Render o si V4 no es ejecutable. Prevalece CURRENT_TASK."
deviations_from_current_task: []
files_touched:
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/DEPLOY-FOLIO-DASHBOARD-BENEFICIARIO-PDF-STALE-001.md
files_not_touched:
  - server.js
  - lib/folio-detalle-lineas-principal-beneficiario.js
  - frontend-dashboard/
  - docs/director-ia/
human_decision_needed:
  - "Disparar o confirmar en el dashboard de Render el deploy LIVE de cc55a607202e997fb1817b2616f43be4de8b198d y reportar RENDER_GIT_COMMIT."
  - "Si se quiere que el implementador dispare/observe Render: canal existente (API/CLI) sin pegar secretos en el repo."
  - "Prueba funcional V4 requiere sesión dashboard ya autorizada; no fabricar token."
```

## Causa del BLOCK

El entorno de esta sesión **no puede disparar ni observar** el deploy Render del SHA congelado.

CURRENT_TASK §4: si no es posible disparar/observar Render → STOP / BLOCK. No inventar canal.

No se declara producción = `cc55a607`.
No se declara PASS funcional.

## Precondiciones §2

Ejecutado `git fetch origin main`.

| Check | Resultado |
| --- | --- |
| `git rev-parse origin/main` | `cc55a607202e997fb1817b2616f43be4de8b198d` |
| mensaje | `Merge branch 'fix/folio-dashboard-beneficiario-pdf-stale-001'` |
| `d087d232` ancestro de `origin/main` | YES |
| SHA posterior sustituido | NO |

`origin/main` no avanzó. El artefacto autorizado sigue siendo exactamente `cc55a607`.

## Canal de deploy intentado

| Canal | Resultado |
| --- | --- |
| `RENDER_API_KEY` en el entorno de la sesión | unset (boolean check previo; no se imprimió valor) |
| binario `render` | no encontrado |
| binario `gh` | no encontrado |
| GitHub Deployments API (`/deployments?per_page=10`) | `[]` |
| Commit status de `cc55a607` | `total_count: 0`, `statuses: []` |
| Service ID Render en el repo | no hay |
| Push a `main` | no ejecutado (prohibido) |

No se creó servicio nuevo.
No se cambió env, build command ni instance type.
No se commiteó.

## V1 — SHA desplegado

**NOT_PROVEN.**

Fuente exigida: metadato Render (`RENDER_GIT_COMMIT` o equivalente LIVE).

`GET https://folio-whatsapp-bot.onrender.com/health` headers observados (2026-09-02T23:03:25Z):

* `200 OK`
* `x-render-origin-server: Render`
* `rndr-id: d8931cee-edba-4f4c` (id de request, no git SHA)
* sin `RENDER_GIT_COMMIT` / commit SHA

No se inventó endpoint `/version`.

Sin SHA LIVE no se puede afirmar que producción = `cc55a607`. Health vivo no prueba el commit.

## V2 — Health

Servicio productivo ya cableado: `https://folio-whatsapp-bot.onrender.com`

| URL | HTTP | Cuerpo |
| --- | --- | --- |
| `GET /health` | 200 | `OK` |
| `GET /health-db` | 200 | `{"ok":true,"hora":"2026-09-02T23:03:26.797Z"}` |

`https://folio-bot.onrender.com/health` → `503` "This service has been suspended." No se usó como producción.

`https://folio-dashboard.onrender.com/` responde página ("Cargando…"). El fix de este bug es backend; el dashboard no expone el SHA.

V2 prueba que el backend LIVE responde. **No** prueba que el proceso sea `cc55a607`.

## V3 — Errores nuevos

**NOT_OBSERVABLE.**

Sin API/CLI Render no hay logs de deploy ni runtime de este SHA.

No se reclasificaron errores preexistentes.
No se afirma ausencia de errores nuevos relevantes.

## V4 — Prueba funcional

**NOT_EXECUTABLE.**

Falta sesión dashboard ya autorizada. CURRENT_TASK prohíbe fabricar tokens WhatsApp/dashboard.

No se editó beneficiario en producción.
No se regeneró PDF.
No se declara PASS ni FAIL del bug.

Póliza no se usó como sustituto.

## Alcance respetado

* no implementación;
* no commits adicionales;
* no cambios de código;
* no DB/schema;
* no Director IA;
* no rollback;
* no merge / no push a `main`;
* no siguiente tarea.

## Qué necesita el humano para desbloquear

1. En Render, desplegar o confirmar LIVE = `cc55a607202e997fb1817b2616f43be4de8b198d`.
2. Entregar evidencia del SHA (`RENDER_GIT_COMMIT`).
3. Completar o habilitar V4 (sesión dashboard) para A → B → guardar → PDF muestra B, y 1..N intactos en multilínea.

Hasta entonces esta tarea no puede pasar a `DONE_PENDING_REVIEW`.
