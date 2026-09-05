task_id: IMPL-DIRECTOR-IA-CLOSED-MONTH-MARGIN-FORECAST-CONTEXT-001

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-05T10:29:46-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-05"
objective: En mes cerrado, si no hay FINAL y sí hay latest FORECAST válida, informar ausencia de cierre y el margen de proyección etiquetado; si hay FINAL única, seguir usando solo FINAL.

in_scope:
- test/fixtures/director-ia-golden-cases.js
- test/helpers/director-ia-runtime-golden-harness.js
- test/helpers/director-ia-golden-harness.js solo si la observabilidad del Runtime Gate lo exige
- lib/director-ia-historical-margin.js (loadClosedMonth / builder / latest FORECAST como contexto etiquetado)
- helper de selección latest ya existente (p. ej. defaultQueryLatestVersion / resolveIgfGlobalVersion) solo si se reutiliza sin duplicar semántica
- tests determinísticos de historical-margin y Runtime Gate
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/IMPL-DIRECTOR-IA-CLOSED-MONTH-MARGIN-FORECAST-CONTEXT-001.md

out_of_scope:
- continuidad margen-cliente → `como vamos?`
- DB/schema/migrations
- LIVE_DB
- frontend / IGF Forecast ARR UI
- cambiar definición de FINAL
- docs/director-ia/
- contratos congelados
- convertir FORECAST en ACTUAL_FINANCIAL
- fallback silencioso de historical_margin a latest
- merge a main
- deploy
- siguiente tarea
- hardcode de Acapulco, agosto, 7.3165 o version 84

contracts_in_force:
- AGENTS.md
- docs/dev-loop/LOOP_PROTOCOL.md
- docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
- docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
- docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md
- docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md
- contratos vigentes aplicables (obedecer, no reescribir)

allowed_actions:
- (solo tras G1) crear rama impl/director-ia-closed-month-margin-forecast-context-001
- primero endurecer Runtime Gate (R-RUNTIME-006 + R-RUNTIME-007)
- ejecutar BEFORE de TIER 1 y PRE-DEPLOY Runtime Gate
- STOP si R-RUNTIME-006 no queda FAIL o si R-RUNTIME-007 / TIER 1 / 001–005 se debilitan
- después del BEFORE rojo, cambio mínimo en historical_margin para contexto FORECAST etiquetado
- tests determinísticos de observabilidad, no para acomodar el producto
- commit en la rama de tarea
- reporte final
- dejar DONE_PENDING_REVIEW

forbidden_actions:
- escribir AUTHORIZED_BY_HUMAN
- poner status AUTHORIZED
- crear, borrar o modificar authorized_by, authorized_at o human_authorization
- implementar antes de G1
- implementar producto antes de endurecer el Runtime Gate y registrar BEFORE rojo
- presentar FORECAST como cierre / ACTUAL_FINANCIAL
- usar FORECAST para ocultar VERSION_AMBIGUOUS, PLANT_AMBIGUOUS u otras anomalías
- hardcodear Acapulco, agosto, 7.3165 o version 84
- consultar LIVE_DB
- modificar docs/director-ia/
- merge/push a main
- deploy
- abrir siguiente tarea

max_attempts: 1

result_report_path: docs/dev-loop/reports/IMPL-DIRECTOR-IA-CLOSED-MONTH-MARGIN-FORECAST-CONTEXT-001.md

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

## Estado

Implementación completa en rama. Pendiente revisión humana. No merge. No deploy. No next task.

## Evidencia humana (LIVE_DB READ-ONLY vía pgAdmin; no es regla de producto)

Acapulco / GLOBAL / agosto 2026:

- total_versions = 8
- final_count = 0
- latest_version_number = 8
- latest_version_id = 84
- latest financial_state = FORECAST
- `igf.compromiso_lines` version_id=84, empresa=Acapulco: margen_kg = 7.3165

Dashboard IGF Forecast ARR: latest FORECAST → 7.3165.  
Director IA hoy: mes cerrado → exige FINAL → 0 FINAL → fail-closed.

Acapulco / agosto / 7.3165 / 84 sirven solo como evidencia/fixture. No se incrustan en producto.

## Relación con auditorías CLOSED

`AUDIT-DIRECTOR-IA-AUGUST-MARGIN-VERSION-PARITY-001` (CLOSED por humano) demostró la discrepancia de **selección de versión**, no un bug de routing. Esta tarea no la reabre. No convierte latest en FINAL.

FORECAST ≠ ACTUAL_FINANCIAL. `latest ≠ FINAL`. Missing ACTUAL no cae a FORECAST como si fuera cierre.

## Objetivo de producto (después del BEFORE)

Pregunta tipo `¿Cuál es el margen de agosto?` (planta/mes, sin cliente), mes **cerrado**:

A) Única FINAL válida → margen FINAL (contrato actual). No sustituir por latest FORECAST.

B) No hay FINAL y sí latest FORECAST válida → informar **ambas** cosas:
   - no existe cierre / margen FINAL defendible;
   - la última proyección disponible muestra margen X $/kg;
   - etiquetar explícitamente FORECAST / proyección / vista vigente;
   - jamás presentarlo como cierre real o ACTUAL_FINANCIAL.

C) Tampoco hay FORECAST válida → DATA_NOT_FOUND / fail-closed.

No usar FORECAST como fallback silencioso de `historical_margin`. La distinción epistemológica permanece visible.

## Orden de ejecución (obligatorio)

### Paso 1 — Endurecer Runtime Gate (antes de producto)

Agregar al menos:

**R-RUNTIME-006** — closed month + NO FINAL + latest FORECAST válida.

Expected:

- reconoce `historical_margin` de planta;
- constata ausencia de FINAL;
- expone latest FORECAST como contexto **explícitamente etiquetado**;
- no afirma ACTUAL/FINAL;
- no responde únicamente «no hay margen» si existe forecast defendible.

**R-RUNTIME-007** — closed month + única FINAL válida.

Expected:

- utiliza FINAL;
- no sustituye el cierre por latest FORECAST;
- preserva contrato actual.

No debilitar TIER 1 ni R-RUNTIME-001..005.

No hardcodear planta, mes ni importe en producto. Fixtures del harness pueden suministrar versiones FORECAST/FINAL genéricas.

### Paso 2 — BEFORE

Desde origin/main (tras G1). Rama propuesta:

impl/director-ia-closed-month-margin-forecast-context-001

Ejecutar:

npm run test:director-ia:golden

y:

npm run test:director-ia:predeploy -- --gate

BEFORE esperado **antes** del FIX:

- TIER 1 intacto (8/8 PASS)
- R-RUNTIME-001..005 PASS
- R-RUNTIME-006 FAIL (producto actual solo fail-closed FINAL)
- R-RUNTIME-007 PASS
- PRE-DEPLOY GATE = FAIL por R-RUNTIME-006

Si 006 no queda rojo, o 007/TIER 1/001–005 no permanecen PASS, STOP. No modificar producto.

### Paso 3 — FIX (solo si el BEFORE coincide)

Regla productiva mínima:

- `closed_month` + unique_valid_FINAL → FINAL
- `closed_month` + reason=`NOT_FINAL` + valid_latest_FORECAST → FINAL unavailable + contexto FORECAST etiquetado
- `closed_month` + sin evidencia usable → fail-closed

FORECAST **no** oculta `VERSION_AMBIGUOUS`, `PLANT_AMBIGUOUS` ni otras anomalías de integridad.

Preferir reutilizar el helper de latest ya existente. No duplicar la semántica del dashboard.

## Protección

TIER 1 8/8 PASS. R-RUNTIME-001..005 y 007 no se debilitan. No inherit-block que rompa cruce diario.

## Objetivo AFTER

TIER 1 8/8 PASS  
R-RUNTIME-001..007 PASS  
HARNESS FAILURE = 0  
PRE-DEPLOY GATE = PASS  

Si solo una parte cabe, no falsear verde.

## Evidencia final

1. diff del Runtime Gate (006 + 007);
2. BEFORE rojo de 006 y PASS de 007 / TIER 1 / 001–005;
3. FIRST_BAD_BOUNDARY de 006;
4. frontera causal corregida;
5. AFTER TIER 1 / RUNTIME / GATE;
6. confirmación de que FORECAST no se relabeló como ACTUAL/FINAL;
7. confirmación de que no se hardcodearon Acapulco / agosto / 7.3165 / 84;
8. commit SHA;
9. git status --short.

## Completion

DONE_PENDING_REVIEW.

NO merge.
NO deploy.
NO next task.

STOP.
