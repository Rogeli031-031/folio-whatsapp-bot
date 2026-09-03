# AUDIT-DIRECTOR-IA-AUGUST-MARGIN-VERSION-PARITY-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-AUGUST-MARGIN-VERSION-PARITY-001"
outcome: "BLOCKED"
mode: "AUDIT"
implementation: false
docs_director_ia_changed: false
live_db: "AUTHORIZED_BUT_NOT_REACHABLE"
has_db_env: false
env_file_present: false
selects_executed: 0
writes_executed: 0
ddl_executed: 0
product_changed: false
tests_changed: false
contracts_changed: false
latest_reinterpreted_as_final: false
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
secrets_check: "none — no connection string printed or stored"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md
  - docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md
  - lib/director-ia-historical-margin.js
  - server.js
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "G1 autorizó LIVE_DB READ-ONLY; este entorno no tiene DATABASE_URL ni .env. SELECT no ejecutado. No se inventaron filas."
human_decision_needed:
  - "Proveer DATABASE_URL de producción al entorno del implementador (archivo .env gitignored, no pegar el secreto en chat ni en el reporte) y reabrir con G1 nuevo si se desea completar los 8 puntos."
  - "No merge. No deploy. No next task desde este reporte."
```

## 1. Alcance ejecutado

G1 vigente: `live_db_authorized: YES`, `implementation_authorized: NO`.

Rama: `audit/director-ia-august-margin-version-parity-001`.

Hecho:

- `status` → `IN_PROGRESS` (solo ese campo de autorización).
- Inspección de conexión: workspace, `User`/`Machine`/`Process` env, `.env`, `gh`, Render CLI, `psql`.
- Relectura de `loadClosedMonth` / `findUniquePlantRow` / `resolveIgfGlobalVersion`.
- Cero SELECT. Cero writes. Cero DDL. Producto/tests/contratos no tocados.

## 2. Bloqueo de conexión

| Comprobación | Resultado |
| --- | --- |
| `process` / shell `DATABASE_URL` | unset |
| User env `DATABASE_URL` | unset |
| Machine env `DATABASE_URL` | unset |
| `.env` en el repo | ausente (gitignored; no existe en disco) |
| `.env` en Desktop/Open AI o `$USERPROFILE` | no encontrado |
| `gh` | no instalado |
| Render CLI | no instalado |
| `psql` | no instalado |

`HAS_DB_ENV = false`.  
`LIVE_DB_SELECT = NOT_EXECUTED`.

No se usó HTTP del dashboard como sustituto de `igf.versions`. Eso no demostraría `financial_state`.

## 3. Demostraciones 1–8 (estado)

| # | Pregunta | Estado |
| --- | --- | --- |
| 1 | Versiones GLOBAL 2026-08 (`id`, `version_number`, `financial_state`, `created_at`) | **NOT_PROVEN** — sin filas |
| 2 | Latest por `version_number` | **NOT_PROVEN** |
| 3 | Conteo de `FINAL` | **NOT_PROVEN** |
| 4 | `margen_kg` Acapulco en latest | **NOT_PROVEN** (UI humana ≈ 7.32 no sustituye SELECT) |
| 5 | `margen_kg` Acapulco en FINAL + matcher único | **NOT_PROVEN** |
| 6 | `reason` de `loadClosedMonth` | **NOT_PROVEN** |
| 7 | 7.32 = latest / FINAL / ambos / ninguno | **NOT_PROVEN** en DB; por código el dashboard **elige** latest, no FINAL |
| 8 | Dashboard vs Director IA version selection | **PROVEN EN CÓDIGO** (abajo). Paridad de **datos** = **NOT_PROVEN** |
| 9 | A / B / C / D | **NOT_CONCLUDED** — falta `reason` físico |
| 10 | Hueco PRE-DEPLOY / TIER 2 | Propuesto (abajo); no implementado |

No se concluye ausencia de FINAL. No se concluye bug de producto. No se reinterpreta latest como FINAL.

## 4. Queries autorizadas (no corridas)

Sesión prevista (si hubiera conexión):

```sql
SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;
BEGIN READ ONLY;

SELECT id, version_number, financial_state, created_at
  FROM igf.versions
 WHERE plant_code = 'GLOBAL' AND year = 2026 AND month = 8
 ORDER BY version_number DESC;

SELECT financial_state, COUNT(*)
  FROM igf.versions
 WHERE plant_code = 'GLOBAL' AND year = 2026 AND month = 8
 GROUP BY 1;

-- :latest_id = MAX(version_number) de la primera query
SELECT empresa, margen_kg
  FROM igf.compromiso_lines
 WHERE version_id = :latest_id
 ORDER BY empresa;

-- :final_id solo si COUNT(FINAL) >= 1
SELECT empresa, margen_kg
  FROM igf.compromiso_lines
 WHERE version_id = :final_id
 ORDER BY empresa;

ROLLBACK;
```

## 5. Mapa reason (código; no ejecutado contra filas)

`loadClosedMonth` (`lib/director-ia-historical-margin.js`):

| Condición | `reason` |
| --- | --- |
| 0 filas `igf.versions` 2026-08 GLOBAL | `NO_VERSION` |
| ≥1 versión y 0 con `financial_state='FINAL'` | `NOT_FINAL` |
| >1 `FINAL` | `VERSION_AMBIGUOUS` |
| 1 FINAL + `findUniquePlantRow` >1 | `PLANT_AMBIGUOUS` |
| 1 FINAL + 0 match | `NO_PLANT_ROW` |
| 1 FINAL + match + `margen_kg` no numérico | `NULL_MARGIN` |
| 1 FINAL + match único + margen numérico | `valid` |

Copy LIVE («No hay un margen histórico FINAL defendible para agosto 2026.») = `closed_month` + `status !== valid`. Excluye copy de `VERSION_AMBIGUOUS` / `PLANT_AMBIGUOUS`. No distingue `NO_VERSION` / `NOT_FINAL` / `NO_PLANT_ROW` / `NULL_MARGIN` sin `reason`.

`findUniquePlantRow`: igualdad normalizada de `empresa` vs clave/nombre; sin ILIKE. Dashboard `findRowByPlanta` sí admite contains/suffix.

## 6. Comparación de selección (código; PROVEN)

| Superficie | Función | Filtro de versión |
| --- | --- | --- |
| IGF Forecast ARR | `server.js` `resolveIgfGlobalVersion` | `plant_code='GLOBAL' AND year AND month` + `ORDER BY version_number DESC LIMIT 1`. **Sin** `financial_state`. |
| Director IA mes cerrado | `loadClosedMonth` | Todas las versiones del mes; luego **solo** `financial_state === 'FINAL'`. |

EKE / FINANCIAL-ACTUAL: `latest ≠ FINAL`; FORECAST ≠ ACTUAL_FINANCIAL; missing actual no cae a FORECAST.

Esto explica **cómo** pueden divergir 7.32 y el fail-closed. **No** demuestra cuál `reason` ocurrió en producción.

## 7. Punto 10 — PRE-DEPLOY / TIER 2 (propuesta, no implementada)

Para detectar esto **antes** de deploy, sin reinterpretar latest como FINAL:

- TIER 2 READ-ONLY: snapshot `igf.versions` GLOBAL del mes cerrado nombrado (`financial_state` + latest id).
- Criterio: `pack=historical_margin` ∧ si 0 FINAL → `reason=NOT_FINAL` (o el reason real) ∧ **no** exigir el `margen_kg` de latest como ACTUAL.
- No fixture que **invente** FINAL (el 8.2 de R-RUNTIME-005 oculta este hueco).
- Opcional: comparar latest.`margen_kg` vs respuesta HM y fallar el gate si el harness afirma paridad numérica con Forecast ARR.

No se añadió ningún test en esta tarea.

## 8. Conclusión

`outcome: BLOCKED`.

La autorización G1 de lectura existe. La conexión de producción **no** está en este entorno. Los puntos 1–7 y 9 siguen `NOT_PROVEN`. El punto 8 (regla de código) está demostrado. El punto 10 está propuesto.

No merge. No deploy. No next task.

docs SHA: `5542c721983b6962aa26dbfe30c58656012a25d3`
