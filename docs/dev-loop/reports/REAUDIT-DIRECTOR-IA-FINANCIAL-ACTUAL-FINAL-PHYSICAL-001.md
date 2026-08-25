# Reauditoría — REAUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001

```yaml
task_id: "REAUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001"
outcome: "DONE_PENDING_REVIEW"
verdict: "PASS"
mode: "AUDIT / REAUDIT"
implementation: false
code_changed: false
sql_changed: false
tests_changed: false
impl_working_tree_preserved: true
audit_report_preserved: true
fix_working_tree_preserved: true
runtime_exposure_financial_actual: false
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Reauditoría. 0.0 pp. La matriz NO cambia."
next_task_proposed: "DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-SYNC-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```

## 1. Executive verdict

**PASS.**

Los dos MAJOR de `AUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001` no se reproducen en el working tree del FIX.

1. **TOCTOU PATCH HG:** no existe una secuencia gobernada en la que FINALIZE deje `FINAL` y un PATCH posterior escriba `hg_*` sobre esa misma versión. El `UPDATE` solo corre tras `SELECT … FOR UPDATE` dentro de la misma transacción.
2. **DELETE histórico:** no existe un path normal de producto que borre `FINAL`/`SUPERSEDED` ni sus `compromiso_lines`. El script aborta; los triggers `BEFORE DELETE` rechazan; FORECAST sigue borrable.

No aparece un hallazgo material nuevo que bloquee sync/merge. Residuales (mock ≠ PG, `ensureSchema` warn, deadlock FINALIZE vs SUPERSEDE, GET latest) ya existían o están fuera de alcance; no se reabren como MAJOR.

ACTUAL_FINANCIAL sigue **NOT EXPOSED**.

## 2. Scope

Sujeto: working tree IMPL + FIX, sin commit. Rama `implementation/director-ia-financial-actual-final-physical-001` ≠ `main`.

Inspección independiente (los reportes no se tomaron como prueba):

- `lib/igf-financial-final.js`
- `server.js` (PATCH, POST finalize/supersede, `ensureSchema`, GET/`resolveIgfGlobalVersion`)
- `sql/018_igf_financial_final.sql`, `sql/019_igf_financial_final_immutability.sql`
- `delete_igf_version_5.sql`
- `test/igf-financial-final.test.js`
- grep de `UPDATE`/`DELETE` IGF en JS/SQL/VBA
- G3 §7, ARCH, AUDIT, FIX, DECISION AUTHZ (solo consulta)
- month_close / pre_meeting / capabilities / ARR (no exposición)

Escritura de esta tarea: solo `CURRENT_TASK.md` y este reporte.

## 3. Major 1 reproduction attempt

Secuencia original AUDIT:

1. PATCH lee `FORECAST` sin lock.
2. Otro request FINALIZE → `FINAL` + `COMMIT`.
3. PATCH hace `UPDATE hg_*`.

**Intento de reproducción actual:**

- `server.js` PATCH ya no llama `assertCompromisoLinesMutable`.
- No hay `UPDATE igf.compromiso_lines` en `server.js`.
- El único write HG es `updateCompromisoLinesHgIfForecast`:

```
BEGIN
→ lockVersionFinancialStateForUpdate:
     SELECT financial_state FROM igf.versions WHERE id = $1::int FOR UPDATE
     mutationGuardForState(state)
→ si !ok: ROLLBACK; return 409/404 (sin UPDATE)
→ UPDATE igf.compromiso_lines SET hg_* …
→ COMMIT
```

Si el estado bajo el lock es `FINAL` o `SUPERSEDED`, el helper hace `ROLLBACK` y devuelve `{ ok: false, status: 409 }`. El handler responde 409. El `UPDATE` no se ejecuta.

`assertCompromisoLinesMutable` / `getVersionFinancialState` (SELECT sin lock) **siguen exportados** pero **no están en el path de escritura**. No abren la carrera.

**MAJOR 1 no reproducible.**

## 4. Lock / transaction proof

| # | Requisito | Evidencia física | Resultado |
|---|-----------|------------------|-----------|
| 1 | PATCH abre transacción ANTES del `FOR UPDATE` | `updateCompromisoLinesHgIfForecast` línea `BEGIN` antes de `lockVersionFinancialStateForUpdate` | **PASS** |
| 2 | `FOR UPDATE` = misma fila que FINALIZE | PATCH: `igf.versions WHERE id = $1`. FINALIZE: `loadGlobalVersionForUpdate` `WHERE id = $1 FOR UPDATE` (o GLOBAL+year+month+version_number, misma tupla). Lock de fila PostgreSQL. | **PASS** |
| 3 | State check DESPUÉS del lock | `SELECT … FOR UPDATE` luego `mutationGuardForState` | **PASS** |
| 4 | UPDATE en la misma transacción | UPDATE solo si `locked.ok`; mismo `BEGIN` | **PASS** |
| 5 | COMMIT después del UPDATE | `COMMIT` al final del try | **PASS** |
| 6 | FINAL → no UPDATE | `locked.ok` false → `ROLLBACK` + return | **PASS** |
| 7 | SUPERSEDED → no UPDATE | igual | **PASS** |
| 8 | Error 409, no 500 | `status: 409`; handler `res.status(wrote.status \|\| 409)` | **PASS** |
| 9 | Rollback si falla antes de COMMIT | `catch` → `ROLLBACK`; deny de negocio también `ROLLBACK` | **PASS** (código); ver §11 TEST_GAP de inyección PATCH |
| 10 | No otro path HG sin lock | único `UPDATE igf.compromiso_lines` en el repo de app: el helper. VBA = INSERT. | **PASS** |

## 5. Interleaving analysis

### CASO A — PATCH gana

PATCH: `FOR UPDATE` FORECAST → UPDATE HG → COMMIT (lock liberado, sigue FORECAST).  
FINALIZE: espera el mismo `id` → obtiene lock → FORECAST → FINAL.

Resultado: HG escrito **antes** del sello. **Válido.** Cubierto por test `4a` (mock de cola de lock).

### CASO B — FINALIZE gana

FINALIZE: `FOR UPDATE` → FINAL → COMMIT.  
PATCH: espera → lock → ve FINAL → 409 → ROLLBACK, **sin UPDATE**.

Resultado: ninguna escritura post-FINAL. **Válido.** Cubierto por test `4b` y por test `6`.

### Tercera secuencia (prohibida)

`FINALIZE success` + `PATCH success posterior` sobre la misma versión.

Tras el COMMIT de FINALIZE el estado persistido es FINAL. El PATCH no puede ver FORECAST bajo `FOR UPDATE`. El UPDATE está después del check. **No existe esa tercera secuencia en el path gobernado.**

Limitación: 4a/4b serializan `FOR UPDATE` en memoria. El SQL de producción es el mismo protocolo. No se corrió PostgreSQL real.

## 6. Deadlock / lock-order assessment

| Operación | Orden |
|-----------|--------|
| PATCH HG | 1) `igf.versions.id` `FOR UPDATE` 2) `UPDATE compromiso_lines` (locks de fila de líneas) |
| FINALIZE | 1) target `igf.versions` `FOR UPDATE` 2) FINAL vigente YYYY-MM `FOR UPDATE` (si hay) 3) `markFinal` |
| SUPERSEDE | 1) FINAL vigente YYYY-MM `FOR UPDATE` 2) incoming FORECAST `FOR UPDATE` 3) `markSuperseded` 4) `markFinal` |

| Par | Assessment | Nota |
|-----|------------|------|
| PATCH vs FINALIZE (misma versión) | **SAFE** | Misma fila primero |
| PATCH vs SUPERSEDE (incoming FORECAST) | **SAFE** | SUPERSEDE toma FINAL vieja primero; PATCH solo la nueva. Sin ciclo |
| PATCH vs SUPERSEDE (PATCH sobre FINAL) | **SAFE** | PATCH toma FINAL, deniega, suelta; SUPERSEDE espera |
| FINALIZE vs SUPERSEDE | **RISK** | Orden inverso (target vs FINAL). **Preexistente** AUDIT MINOR 4. PG aborta una tx. Sin corrupción. **No reabierto** |
| Algún path lockea lines antes de version | **SAFE** | No hay UPDATE/DELETE de líneas gobernado que preceda el lock de versión |

Ningún path de producto bloquea `compromiso_lines` antes de `igf.versions`.

## 7. Major 2 reproduction attempt

Hallazgo original: `delete_igf_version_5.sql` borraba `compromiso_lines` + `versions` por `version_number = 5` sin mirar estado.

**Intento actual:**

1. El script **consulta** `financial_state` **antes** de cualquier DELETE (`DO` + `RAISE EXCEPTION` si existe v5 GLOBAL FINAL/SUPERSEDED).
2. Los DELETE posteriores filtran `financial_state = 'FORECAST'`.
3. Triggers 019: `BEFORE DELETE` en ambas tablas, `RAISE` si FINAL/SUPERSEDED.
4. No hay endpoint HTTP DELETE IGF. No hay helper JS de delete IGF. VBA IGF = INSERT.

Un `DELETE FROM igf.versions WHERE id = FINAL` en un path gobernado (rol de app, triggers activos) **falla**. Igual SUPERSEDED. Igual sus líneas.

**MAJOR 2 no reproducible** en paths normales.

## 8. Trigger / delete proof

### Triggers (`sql/019_igf_financial_final_immutability.sql`)

| Campo | Valor |
|-------|--------|
| Tabla 1 | `igf.versions` |
| Trigger 1 | `igf_versions_reject_delete_final_superseded` `BEFORE DELETE` `FOR EACH ROW` |
| Función 1 | `igf.reject_delete_final_or_superseded_version()` |
| Condición | `OLD.financial_state IN ('FINAL', 'SUPERSEDED')` → `RAISE EXCEPTION 'IGF_FINAL_HISTORY_IMMUTABLE…'` |
| FORECAST | `RETURN OLD` (permite) |
| Tabla 2 | `igf.compromiso_lines` |
| Trigger 2 | `igf_compromiso_lines_reject_delete_final_superseded` `BEFORE DELETE` `FOR EACH ROW` |
| Función 2 | `igf.reject_delete_final_or_superseded_lines()` |
| Condición | `SELECT financial_state FROM igf.versions WHERE id = OLD.version_id` ∈ FINAL/SUPERSEDED → RAISE |
| Aplicación | `ensureSchema` → `applyIgfFinancialFinalImmutabilityMigration` (warn si falla, igual que 018) |

Error explícito (`RAISE EXCEPTION`), no no-op.

### Script `delete_igf_version_5.sql`

| Check | Resultado |
|-------|-----------|
| Identifica versión | `plant_code = 'GLOBAL' AND version_number = 5` (year/month opcional, comentado; mismo alcance histórico) |
| Consulta `financial_state` | sí, en el `DO` |
| Aborta FINAL | `RAISE EXCEPTION` si existe match FINAL/SUPERSEDED |
| Aborta SUPERSEDED | misma cláusula |
| No borra lines antes de validar | `DO` precede a ambos DELETE |
| No silent 0-rows para prohibido | RAISE; además DELETE no apunta a FINAL/SUPERSEDED |
| FORECAST deletable | DELETE filtrado a FORECAST |

FK `igf_versions_superseded_by_fk` = `REFERENCES igf.versions(id)` **sin** `ON DELETE CASCADE` (NO ACTION). No hay cascade de `igf.versions` → `compromiso_lines` en el DDL del repo. El trigger de líneas cubre DELETE directo de líneas.

Si se borra una FORECAST, el trigger de líneas ve padre FORECAST o ya ausente (`st` NULL) y permite. No toca filas FINAL de otra versión.

## 9. Product-vs-DBA boundary

Clasificación: **GOVERNED_PRODUCT_PATH_PROTECTION**.

No es **ABSOLUTE_SUPERUSER_IMMUTABILITY**.

Un superusuario / ZP en pgAdmin puede `DISABLE TRIGGER`, `session_replication_role = replica`, o `DROP TRIGGER` y destruir filas. Eso queda **fuera** del control de la app. **No es fallo del FIX.** G3 exige inmutabilidad de producto, no imposibilidad física ante DBA.

## 10. Regression review

Inspección de código (no solo conteos):

| Superficie | ¿FIX la cambió? | ¿Sigue el contrato slice B? |
|------------|-----------------|------------------------------|
| FINALIZE ZP / alias / AD | no (AUTHZ intacto) | sí; tests unitarios 403 GG |
| SUPERSEDE atómico | no | sí; rollback `failOn: markFinal` |
| unique FINAL GLOBAL YYYY-MM | no (018 intacto) | sí |
| PATCH HG FORECAST | mismo recálculo; write ahora transaccional | sí |
| GET IGF | `ORDER BY version_number DESC` | latest operativo **sin cambio** |
| Excel/export / ARR | no importan `igf-financial-final` | sí |
| month_close | `financial_actual: UNSUPPORTED_METRIC` | sí |
| pre_meeting | sin `igf-financial-final` | sí |
| capabilities / IES / RE / VBA | no tocados por FIX | sí |

Focales reejecutados por este auditor: **28/28**. Los números FIX 104/104 y 1005/1005 no se volvieron a correr enteros aquí; el diff FIX no toca esos módulos. No se contradicen.

## 11. Test coverage table

| INVARIANT | TEST EXISTS | PASS | PROTECTION TYPE | GAP |
|-----------|-------------|------|-----------------|-----|
| PATCH FORECAST allowed | sí (`1`) | sí | mock transaccional | no PG |
| PATCH FINAL denied | sí (`2`) | sí | mock 409 + no write | |
| PATCH SUPERSEDED denied | sí (`3`) | sí | mock 409 + no write | |
| PATCH/FINALIZE concurrency | sí (`4a`, `4b`, `5`, `6`) | sí | mock lock queue | no PG real |
| rollback on PATCH failure | **parcial** | código sí | `ROLLBACK` en deny y `catch` | **TEST_GAP**: no `failOn` del UPDATE HG (SUPERSEDE sí inyecta `markFinal`) |
| delete FORECAST allowed | sí (`7`) + texto script | sí | mock + SQL parse | mock ≠ trigger PG |
| delete FINAL denied | sí (`8`) + 019/v5 parse | sí | mock + SQL | |
| delete SUPERSEDED denied | sí (`9`) | sí | mock + SQL | |
| delete lines of FINAL denied | sí (`8`, `10`) | sí | mock | |
| delete lines of SUPERSEDED denied | sí (`9`) | sí | mock | |
| ZP finalize | sí | sí | unit | |
| AD finalize | sí | sí | unit | |
| GG deny | sí | sí | unit 403 | |
| supersede atomic | sí | sí | mock rollback | |
| unique FINAL | sí (SQL 018) | sí | parse índice | no carrera PG |
| no ACTUAL_FINANCIAL exposure | sí (estático) | sí | source scan | |

TEST_GAPs preexistentes AUDIT (DIR-ZP string, 401 HTTP, SUPERSEDED→FINALIZE dedicado) **no** reabren los MAJOR.

## 12. New findings if any

Ningún hallazgo **CRITICAL** / **MAJOR** nuevo.

| ID | Severidad | Qué | ¿Bloquea? |
|----|-----------|-----|-----------|
| R1 | OBSERVATION | Tests de lock/delete son mock; 019 no se ejecutó contra PG vivo | no |
| R2 | OBSERVATION | `ensureSchema` traga fallo de 019 (mismo patrón que 018) | no — residual de deploy |
| R3 | OBSERVATION | No hay test de inyección de fallo del UPDATE HG | no — código tiene ROLLBACK |
| R4 | OBSERVATION | `assertCompromisoLinesMutable` no-lock sigue exportado; no está en PATCH | no |
| R5 | MINOR (preexistente) | Deadlock FINALIZE vs SUPERSEDE | no |
| R6 | OBSERVATION (preexistente) | GET latest ≠ FINAL | no — fuera de alcance |

En psql sin `ON_ERROR_STOP`, un `RAISE` del `DO` no cancela statements posteriores del archivo. Esos DELETE siguen filtrados a FORECAST y los triggers cubren FINAL. **No** es bypass de historia. No se eleva.

## 13. Blocking vs non-blocking

| Ítem | ¿Bloquea DOCS/sync? | ¿Bloquea ACTUAL_FINANCIAL runtime futuro? |
|------|---------------------|-------------------------------------------|
| MAJOR 1 (cerrado) | no | no por este TOCTOU |
| MAJOR 2 (cerrado) | no | no por delete gobernado |
| R1–R4, R6 | no | no |
| R5 deadlock | no | no (integridad; una tx aborta) |
| GET latest | no | sí **de producto** (ya aceptado; no es defect del FIX) |

## 14. Final verdict

**PASS**

Los dos MAJOR originales están físicamente cerrados. El FIX no introduce un defecto material equivalente. No hay scope creep (sin loader actual, sin GET FINAL, sin UI histórica, sin ARR_COMPLETE, sin auto-FINAL, sin VBA, sin IES, sin nuevo modelo de permisos).

G3 §7 (no alterar en silencio FINANCE_PROVIDED FINAL/SUPERSEDED vía PATCH) queda **COMPLIANT** en paths gobernados + concurrencia PATCH/FINALIZE.

## 15. Exact next recommendation

1. HUMAN_APPROVER cierra esta reauditoría.
2. No commit / push / merge en esta tarea.
3. Siguiente trabajo: documentation sync del marker físico. No reabrir A/B, AUTHZ, ni GET latest.
4. No exponer ACTUAL_FINANCIAL en el sync.

## 16. Exactly one NEXT_TASK

`DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-SYNC-001`

No autorizada. No ejecutada.

## Porcentaje

10.5 / 20 = **52.5%**. Delta **0.0 pp.** La matriz NO cambia.

STOP.
