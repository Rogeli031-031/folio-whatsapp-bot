# Reporte — FIX-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001

```yaml
task_id: "FIX-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001"
outcome: "DONE_PENDING_REVIEW"
mode: "FIX"
code_changed: true
sql_changed: true
impl_working_tree_preserved: true
audit_report_preserved: true
runtime_exposure_financial_actual: false
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "FIX no crea capability ACTUAL_FINANCIAL. 0.0 pp. La matriz NO cambia."
next_task_proposed: "REAUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```

## 1. Hallazgos corregidos

| ID | Hallazgo AUDIT | Cierre |
|----|----------------|--------|
| MAJOR 1 | TOCTOU PATCH HG: SELECT `financial_state` sin lock, luego `UPDATE hg_*` puede escribir sobre una versión ya FINAL | El check y el `UPDATE` viven en la misma transacción, tras `SELECT … FOR UPDATE` sobre `igf.versions.id` |
| MAJOR 2 | `delete_igf_version_5.sql` podía borrar FINAL/SUPERSEDED en silencio | Guard SQL fail-closed en el script + triggers BEFORE DELETE en `igf.versions` y `igf.compromiso_lines` |

No se corrigieron hallazgos fuera de esos dos MAJOR (GET latest ≠ FINAL, JWT unknown → GG, unique → 500, deadlock FINALIZE vs SUPERSEDE).

## 2. Root cause TOCTOU

`assertCompromisoLinesMutable` hacía:

```
SELECT financial_state FROM igf.versions WHERE id = $1 LIMIT 1
```

sin `FOR UPDATE` y **fuera** de la transacción del `UPDATE igf.compromiso_lines`.

Secuencia demostrada por AUDIT:

1. Request A lee `FORECAST`.
2. Request B `FINALIZE` → `FINAL` y `COMMIT`.
3. Request A ejecuta `UPDATE hg_*`.

Eso viola G3 §7 (inmutabilidad de evidencia `FINANCE_PROVIDED` FINAL/SUPERSEDED).

## 3. Mecanismo exacto de locking / atomicidad

Opción A (mínima, alineada al repo):

`updateCompromisoLinesHgIfForecast(client, versionId, empresa, fields)`:

1. `BEGIN`
2. `SELECT financial_state FROM igf.versions WHERE id = $1::int FOR UPDATE`
3. Si no hay fila → `ROLLBACK`, 404.
4. Si estado ≠ `FORECAST` → `ROLLBACK`, **409** (no 500).
5. Si `FORECAST` → `UPDATE igf.compromiso_lines` `hg_*` / util / resultado.
6. `COMMIT` (libera el lock).
7. Error inesperado → `ROLLBACK` y se relanza.

El cálculo del payload HG (lectura GET, recálculo JS) permanece **fuera** del lock. Solo el guard + write están serializados.

`PATCH /api/dashboard/igf-forecast` ya no llama `assertCompromisoLinesMutable` ni hace `UPDATE` suelto. AUTHZ del PATCH no cambió: 403 de middleware/GA/GV se preserva.

## 4. Lock ordering

| Operación | Orden de locks sobre `igf.versions` | Escritura | Liberación |
|-----------|--------------------------------------|-----------|------------|
| PATCH HG | 1) fila target `WHERE id = $1 FOR UPDATE` | `UPDATE compromiso_lines` si FORECAST | `COMMIT` / `ROLLBACK` |
| FINALIZE | 1) fila target `FOR UPDATE`; 2) FINAL vigente del YYYY-MM `FOR UPDATE` (si existe) | `markFinal` | `COMMIT` / `ROLLBACK` |
| SUPERSEDE | 1) FINAL vigente del YYYY-MM `FOR UPDATE`; 2) incoming FORECAST `FOR UPDATE` | `markSuperseded` luego `markFinal` | `COMMIT` / `ROLLBACK` |

PATCH y FINALIZE sobre la **misma** versión bloquean la misma fila primero → se serializan. No se añadió lock extra.

Órdenes legítimos bajo carrera PATCH vs FINALIZE:

1. PATCH completa en FORECAST → FINALIZE sella esa evidencia.
2. FINALIZE completa primero → PATCH ve FINAL bajo el lock y **no escribe**.

Prohibido (cerrado): FINALIZE exitoso y después PATCH modifica esa misma versión.

## 5. Root cause delete histórico

`delete_igf_version_5.sql` hacía `DELETE FROM igf.compromiso_lines` + `DELETE FROM igf.versions` por `version_number = 5` **sin** mirar `financial_state`. AUDIT: FK `superseded_by_version_id` es `NO ACTION` (no impide borrar un FINAL no referenciado). No había trigger ni endpoint guard.

## 6. Paths de delete auditados

| Path | Clasificación | Acción FIX |
|------|---------------|------------|
| `delete_igf_version_5.sql` | **needs fix** | Guard `RAISE` si el target es FINAL/SUPERSEDED; `DELETE` solo `FORECAST` |
| HTTP DELETE `igf.versions` / `compromiso_lines` | **not applicable** | No existe |
| Helpers / maintenance JS | **not applicable** | No hay delete IGF |
| VBA `ModIgfBuildInsertCompromiso` | **already safe** | Solo INSERT FORECAST |
| POST finalize/supersede | **already safe** | No borran |
| PATCH HG | **needs fix** (MAJOR 1, no delete) | Transacción + `FOR UPDATE` |
| Chat / GET / Excel / ARR loaders | **not applicable** | Solo SELECT |
| FK `compromiso_lines` → versions | **already safe** respecto a cascade de FINAL | No hay `ON DELETE CASCADE` en el DDL vivo auditado; trigger de líneas cubre delete directo |
| pgAdmin / superusuario PostgreSQL | **out of product governance** | Ver §8 |

## 7. Protección implementada

1. **Script gobernado:** `delete_igf_version_5.sql` aborta con `IGF_FINAL_HISTORY_IMMUTABLE` si existe v5 GLOBAL en FINAL/SUPERSEDED. No es skip silencioso (0 filas). El `DELETE` posterior filtra `financial_state = 'FORECAST'`.
2. **Triggers (019):** `BEFORE DELETE` en `igf.versions` y `igf.compromiso_lines`. FINAL/SUPERSEDED → `RAISE EXCEPTION`. FORECAST permitido.
3. **`ensureSchema`:** aplica `sql/019_igf_financial_final_immutability.sql` tras 018, mismo patrón defensivo (`console.warn` si falla).

FORECAST: el flujo administrativo de re-subir v5 sigue permitido.

## 8. Boundary pgAdmin / DBA

La inmutabilidad es **application-level / governed-path**:

- endpoints
- script de borrado del repo
- triggers activos para el rol de la app

**≠** protección absoluta contra un DBA privilegiado que desactive triggers, use `session_replication_role = replica`, o ejecute SQL manual en pgAdmin.

ZP tiene acceso pgAdmin. Un superusuario puede destruir datos deliberadamente. Eso **no** invalida G3 si el acceso DBA queda fuera del control de la app.

## 9. Archivos modificados

### FIX (este turno)

| Archivo | Rol |
|---------|-----|
| `lib/igf-financial-final.js` | lock + write atómico; apply 019 |
| `server.js` | PATCH usa el helper; `ensureSchema` aplica 019 |
| `sql/019_igf_financial_final_immutability.sql` | triggers DELETE |
| `delete_igf_version_5.sql` | guard fail-closed |
| `test/igf-financial-final.test.js` | tests 1–21 del FIX |
| `docs/dev-loop/CURRENT_TASK.md` | `DONE_PENDING_REVIEW` + resultado |
| `docs/dev-loop/reports/FIX-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001.md` | este reporte |

### IMPL (preexistente, no restaurado)

`sql/018_igf_financial_final.sql`, `lib/igf-financial-final.js` (base), `server.js` (require + 018 + POST finalize/supersede), `test/igf-financial-final.test.js` (base), `docs/dev-loop/reports/IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001.md`

### AUDIT (preexistente, no restaurado)

`docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001.md`

### No tocados

Constitution, 04, 05, EKE, Index, Capacidades, G3, VBA, frontend, IES, RE, `month_close_result`, `pre_meeting`, GET latest, Excel/export, ARR.

## 10. Tests nuevos / ajustados

`test/igf-financial-final.test.js` (15 → **28**).

| # | Caso | Tipo |
|---|------|------|
| 1 | PATCH HG FORECAST escribe | mock transaccional |
| 2 | PATCH HG FINAL → 409, no escribe | mock |
| 3 | PATCH HG SUPERSEDED → 409, no escribe | mock |
| 4a | PATCH toma lock; FINALIZE espera; PATCH escribe; FINALIZE sella | interleaving mock |
| 4b | FINALIZE toma lock; PATCH espera; FINALIZE sella; PATCH 409 sin escribir | interleaving mock |
| 5 | FINALIZE tras PATCH completado | mock |
| 6 | PATCH tras FINALIZE completado | mock |
| 7 | DELETE FORECAST permitido | mock + SQL |
| 8 | DELETE FINAL falla | mock + SQL 019 / v5 |
| 9 | DELETE SUPERSEDED falla | mock + SQL |
| 10 | borrar FORECAST no destruye líneas FINAL | mock |
| 11–15 | FINALIZE ZP / AD / GG 403 / SUPERSEDE atómico / unique FINAL | existentes |
| 16–20 | GET / Excel / ARR / month_close / pre_meeting sin relabel | estáticos |
| 21 | suite Director IA completa | ver §11 |

Limitación de 4a/4b: el mock serializa `FOR UPDATE` en memoria. No es PostgreSQL real. Demuestra el invariante de lock/atomicidad del helper.

## 11. Resultados focales

| Suite | Resultado |
|-------|-----------|
| `node --test test/igf-financial-final.test.js` | **28/28** |
| IGF + ARR + month_close + pre_meeting (m7, reviewable, month-close, pre-meeting, real-input-arr) | **104/104** |
| `node --test test/director-ia-*.test.js` | **1005/1005** |

## 12. Regresiones

Ninguna detectada en las suites de §11.

Preservado: `FORECAST`/`FINAL`/`SUPERSEDED`, provenance, unique FINAL GLOBAL YYYY-MM, FINALIZE ZP/AD, SUPERSEDE atómico, GG deny, GET latest operativo, no auto-FINAL, no `ACTUAL_FINANCIAL`.

## 13. git diff --check

Limpio (exit 0). Sin commit, push ni merge. Sin `git restore` / `reset` / `clean`.

`git status` distingue:

- **M** `delete_igf_version_5.sql`, `docs/dev-loop/CURRENT_TASK.md`, `server.js`
- **??** `sql/018_…`, `sql/019_…`, `lib/igf-financial-final.js`, `test/igf-financial-final.test.js`, reportes IMPL / AUDIT / FIX

## 14. Remaining limitations

- 019 no se ejecutó contra producción en este FIX; `ensureSchema` traga el error con warn (igual que 018).
- Tests de lock/delete son mock, no PG.
- Superusuario puede evadir triggers (boundary §8).
- GET latest ≠ FINAL: **fuera de alcance** (OBSERVATION AUDIT).
- Unique violation concurrente sigue pudiendo ser HTTP 500.
- Deadlock FINALIZE vs SUPERSEDE (orden de locks distinto) no se tocó.

## 15. Confirmation: ACTUAL_FINANCIAL sigue NO EXPOSED

GET IGF no emite `ACTUAL_FINANCIAL` ni `financial_state`. `month_close_result` / `pre_meeting` / ARR no importan `igf-financial-final`. No hay loader, intent, UI histórica ni `financial.actual`. Runtime = **NOT EXPOSED**.

## 16. Exactly one NEXT_TASK

`REAUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001`

No autorizada. No ejecutada. No es DOCS.

## Self-check

¿Existe todavía FORECAST check → FINAL concurrente → HG UPDATE? **No.** El `UPDATE` solo corre tras `FOR UPDATE` en la misma transacción.

¿Existe un path normal del producto que DELETE FINAL o SUPERSEDED? **No.** Script gobernado + triggers. pgAdmin privilegiado queda fuera.

## Porcentaje

10.5 / 20 = **52.5%**. Delta **0.0 pp.** La matriz NO cambia.

STOP.
