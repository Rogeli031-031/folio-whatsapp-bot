task_id: FIX-DIRECTOR-IA-RENTABILIDAD-CHAT-UPLOAD-DAY-ONLY-002

task_type: FIX
mode: REGRESSION_FIRST

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-05T22:10:17-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-05 - MICRO FIX IMPLEMENTATION AUTHORIZED; REGRESSION_FIRST; COMMIT ON FIX BRANCH AUTHORIZED; NO LIVE_DB; NO MERGE; NO PUSH MAIN; NO DEPLOY"
implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 17adf284d6113bf92c28bb0307e0cbf0115edb6b

result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-RENTABILIDAD-CHAT-UPLOAD-DAY-ONLY-002.md

objective: Corregir exclusivamente la pérdida de req.body.upload_day entre askDirectorIa y assembleRentabilidadDeterioroSnapshot.

contracts_in_force:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CHAT-EFFECTIVE-CUT-TRANSPORT-001.md

## Hechos congelados

LIVE:

POST /api/director-ia/chat
upload_day=2026-09-05

PROVEN:

CHAT_CUT_TRANSPORTED_BUT_NOT_CONSUMED

FIRST_BAD_BOUNDARY:

askDirectorIa
→ assembleRentabilidadDeterioroSnapshot

El snapshot ya soporta deps.upload_day y reutiliza:

resolveUploadDayLikeClientesPorMes

## Cambio funcional autorizado

Únicamente transportar:

req.body.upload_day

hasta:

assembleRentabilidadDeterioroSnapshot({
  ...
  upload_day: ...
})

La forma funcional objetivo debe ser equivalente a:

upload_day:
  (req && req.body && req.body.upload_day) || null

## Explícitamente prohibido

NO usar:

req.body.cutoff_date

NO agregar alias alternativos.
NO agregar otra fuente de cut.
NO modificar frontend.
NO modificar server.js.
NO modificar arr.upload_log.
NO DB/schema.
NO fórmula financiera.
NO Delta Ingreso.
NO planner/CEL.
NO hardcode LIVE.

## Regression first

La prueba debe cruzar askDirectorIa.

Cubrir como mínimo:

R-RENT-CHAT-CUT-001
request upload_day llega al snapshot.

R-RENT-CHAT-CUT-002
B abierto entrega el mismo YMD al mini.

R-RENT-CHAT-CUT-003
con explicit cut B usa forecast y no MTD.

R-RENT-CHAT-CUT-004
sin upload_day conserva fallback.

R-RENT-CHAT-CUT-005
invalid/mismatched upload_day usa semántica canónica existente.

R-RENT-CHAT-CUT-006
A cerrado permanece real.

## In scope

- lib/director-ia-chat.js
- test/director-ia-rent-chat-cut.test.js
- fixtures/helpers estrictamente necesarios si el baseline los requiere
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/FIX-DIRECTOR-IA-RENTABILIDAD-CHAT-UPLOAD-DAY-ONLY-002.md

## Out of scope

- frontend-dashboard/
- server.js
- lib/director-ia-rentabilidad-deterioro-snapshot.js salvo contradicción física y STOP
- DB/schema
- arr.upload_log
- fórmulas financieras
- Delta Ingreso
- Action Register
- planner/CEL
- docs/director-ia/
- merge
- push main
- deploy
- LIVE_DB
- next task

allowed_actions:
  - ninguna hasta G1 humano
  - tras G1: regression-first
  - tras G1: implementación mínima dentro de in_scope
  - tras G1: tests y validaciones
  - tras G1: reporte
  - tras G1: commit únicamente en rama del FIX si G1 lo autoriza
  - tras G1: DONE_PENDING_REVIEW

forbidden_actions:
  - escribir AUTHORIZED_BY_HUMAN
  - poner status AUTHORIZED
  - usar req.body.cutoff_date
  - agregar fuentes alternativas de cut
  - LIVE_DB
  - DB/schema
  - frontend
  - merge/push main
  - deploy
  - abrir siguiente tarea

## Acceptance

PASS solo si:

req.body.upload_day
→ askDirectorIa
→ snapshot deps.upload_day

sin cutoff_date ni otra fuente adicional.

BEFORE rojo.
AFTER verde.

Suites relacionadas sin NEW FAILURE.

## Completion

DRAFT.

Esperar G1 humano.

STOP.
