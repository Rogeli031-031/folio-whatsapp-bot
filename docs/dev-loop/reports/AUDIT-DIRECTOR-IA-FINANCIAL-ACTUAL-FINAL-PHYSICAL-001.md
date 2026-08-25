# Auditoría — AUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001"
outcome: "DONE_PENDING_REVIEW"
verdict: "PASS_WITH_FINDINGS"
mode: "AUDIT"
implementation: false
code_changed: false
sql_changed: false
impl_working_tree_preserved: true
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
next_task_proposed: "FIX-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```

## 1. Executive verdict

**PASS_WITH_FINDINGS.**

La materialización física de `FORECAST` / `FINAL` / `SUPERSEDED` sobre `igf.versions` es, en lo esencial, la opción A + slice B autorizados: grano GLOBAL, unique FINAL por YYYY-MM, FINALIZE/SUPERSEDE backend ZP/AD, sin replace silencioso, transacción en supersede, sin auto-FINAL, sin exposición ACTUAL_FINANCIAL.

No es **PASS**: el PATCH HG puede mutar líneas de una versión que se finaliza en la misma ventana (TOCTOU: SELECT estado sin lock, luego UPDATE). G3 §7 exige inmutabilidad de FINAL/SUPERSEDED antes del runtime de actual.

No es **FAIL**: no hay bypass de AUTHZ secuencial, no hay dos FINAL GLOBAL persistibles bajo el índice único, no hay grano por planta, no hay auto-FINAL, no hay loader de actual.

No se integró ni se expuso ACTUAL_FINANCIAL. No se corrigió nada en esta auditoría.

## 2. Scope audited

Sujeto: working tree de `IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001` (sin commit). Rama `implementation/director-ia-financial-actual-final-physical-001` ≠ `main`. HEAD `5b8d0339`.

Inspección: `sql/018_igf_financial_final.sql`, `lib/igf-financial-final.js`, `server.js` (require, `ensureSchema`, PATCH, POST finalize/supersede), `test/igf-financial-final.test.js`, paths de mutación (`delete_igf_version_5.sql`, VBA INSERT), JWT (`server.js` 5048), GET/loaders, month_close/pre_meeting, frontend, `docs/director-ia/` (solo lectura). Focales reejecutados por el auditor: **15/15**.

## 3. Files changed by IMPL

| Archivo | Clasificación |
|---------|---------------|
| `sql/018_igf_financial_final.sql` | **AUTHORIZED** |
| `lib/igf-financial-final.js` | **AUTHORIZED** |
| `server.js` (require + ensureSchema + PATCH guard + 2 POST) | **AUTHORIZED** |
| `test/igf-financial-final.test.js` | **AUTHORIZED** |
| `docs/dev-loop/reports/IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001.md` | **JUSTIFIED_SUPPORTING_CHANGE** |
| `docs/dev-loop/CURRENT_TASK.md` | vigente AUDIT (no es código IMPL) |

Sin cambios en: Constitución, `04`, `05`, IES, RE, EKE, Index, CAPACIDADES, frontend, VBA, month_close, pre_meeting, planner, capabilities. **Sin scope creep de producto.**

El auditor no usó `git restore` sobre la IMPL.

## 4. Contract sources

| Fuente | Uso |
|--------|-----|
| G3 `FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md` v1.0 | Máquina, grano, inmutabilidad, provenance |
| ARCH-…-FINAL-PHYSICAL-001 | Opción A, slice B, GET preservado |
| DECISION-…-AUTHZ-001 | ZP/AD finalize/supersede; GG view-only; USUARIOS ≠ rol |
| EKE / Index / Capacidades | Confirmar que no se expuso actual ni se editaron |

## 5. Schema audit

`sql/018`: columnas en `igf.versions` únicamente.

| Columna | Tipo físico | Null | Default |
|---------|-------------|------|---------|
| `financial_state` | `TEXT NOT NULL` | no | `'FORECAST'` |
| `finalized_at` | `TIMESTAMPTZ` | sí | null |
| `finalized_by` | `TEXT` | sí | null |
| `superseded_by_version_id` | `INT` FK → `igf.versions(id)` | sí | null |

CHECK valores: exactamente `FORECAST` / `FINAL` / `SUPERSEDED`.  
CHECK shape: FORECAST sin provenance; FINAL con at/by y sin link; SUPERSEDED con at/by, link ≠ self.

Histórico: `ADD COLUMN … DEFAULT 'FORECAST'` backfill. Cero `UPDATE … FINAL`. Cero `is_final`. Cero `compromiso_lines`.

FK: **sin** `ON DELETE` / `ON UPDATE` → PostgreSQL `NO ACTION`. Borrar un `id` referenciado por `superseded_by_version_id` falla. Borrar SUPERSEDED o un FINAL no referenciado **sí** es posible.

## 6. State-machine audit

| Combinación | ¿Posible en DB? | Protección |
|-------------|-----------------|------------|
| FORECAST + finalized_* / link | No | CHECK shape |
| FINAL sin at/by | No | CHECK shape |
| FINAL + superseded_by | No | CHECK shape |
| SUPERSEDED sin link / self-link | No | CHECK shape |
| SUPERSEDED → otro YYYY-MM | **Sí (DB)** | Solo backend (`loadGlobalVersionForUpdate`) |
| SUPERSEDED → FORECAST / otra SUPERSEDED | **Sí (DB)** | Solo backend al escribir; no CHECK de destino |
| Dos FINAL GLOBAL mismo mes | No | Unique parcial |
| FINAL no GLOBAL | **Sí (DB)** | Unique no aplica; backend 409 |

El endpoint no basta si hay SQL/pgAdmin/script.

## 7. GLOBAL grain audit

`igf.versions.plant_code = 'GLOBAL'` + N filas `compromiso_lines.empresa`. FINALIZE/SUPERSEDE actúan sobre `version_id`, no empresa/planta. Backend rechaza no GLOBAL. **Conforme a ARCH.** No hay FINAL por planta.

## 8. Unique FINAL audit

```
UNIQUE (year, month) WHERE plant_code = 'GLOBAL' AND financial_state = 'FINAL'
```

No está partido por empresa, planta, `version_number` ni `is_current`. Dos FINALIZE concurrentes: el segundo choca el índice (integridad OK; HTTP puede ser 500, ver §12).

## 9. FINALIZE audit

`POST /api/dashboard/igf-forecast/finalize` + `dashboardAuthMiddleware`.

- `finalized_by` solo de JWT (`actor_id` + rol canónico). No body/query.
- `finalized_at = now()` en SQL.
- Valida year/month y que `version_id` pertenezca a ese YYYY-MM GLOBAL (409 si no).
- FORECAST → FINAL.
- Ya FINAL → 409.
- SUPERSEDED → 409.
- Otro FINAL del periodo → 409 `{ require_supersede: true }`. Sin replace silencioso.

## 10. SUPERSEDE audit

`POST /api/dashboard/igf-forecast/supersede`.

- Exige FINAL vigente del mismo YYYY-MM.
- Nueva versión distinta, GLOBAL, mismo periodo, estado FORECAST.
- Orden: `markSuperseded` luego `markFinal` dentro de `BEGIN/COMMIT`.
- Self-supersede 409. SUPERSEDED como new 409. Sin FINAL vigente 409.
- Cross-period: backend 409; **DB no lo impide**.

## 11. AUTHZ audit

`canFinalizeOrSupersede` reusa `isDirectorZPForDashboard` + `AD`. Fail closed sin auth / sin `actor_id`.

| Actor | Resultado físico |
|-------|------------------|
| ZP, DIR_ZP, DIRZP, DIRECTORZP, DIRECTOR_ZP, DZP, DIR-ZP, nombre director+zp | allowed (helper) |
| AD | allowed |
| GG, GA, GV, CF_CDMX, CDMX, ZC, GO, SG, SEH, otra, null | denied |
| Token vacío / JWT inválido | 401 middleware |

JWT de dashboard (`server.js` 5048): rol no mapeado → **`GG`**. GG no finaliza. No abre FINALIZE. USUARIOS no es rol; no hay path finalize por ACCESS_KEY.

Riesgo residual: `actor_nombre` con «director» + «zp» y rol distinto podría pasar el helper. No es el JWT colapsado habitual (role ya es `ZP`/`GG`). **OBSERVATION.**

Frontend: cero llamadas a finalize/supersede. Hide no otorga.

## 12. Atomicity / concurrency audit

SUPERSEDE: `BEGIN` → lock FINAL + new `FOR UPDATE` → UPDATE old → UPDATE new → `COMMIT` / `ROLLBACK`. Test de inyección `failOn: markFinal` cubre rollback en mock (no PG real).

| Carrera | Resultado |
|---------|-----------|
| FINALIZE A + FINALIZE B mismo mes | Unique impide dos FINAL. Perdedor: **500** (no mapea `unique_violation`). |
| SUPERSEDE A + B | Serializan en el row FINAL (`FOR UPDATE`). |
| FINALIZE + SUPERSEDE | Orden de locks distinto → **deadlock** posible; PG aborta una tx. Sin corrupción persistida. |
| FINALIZE + PATCH HG | Ver §14 TOCTOU. |

## 13. Mutation-path inventory

| Path | Clasificación |
|------|----------------|
| VBA INSERT new version + lines | **SAFE_FORECAST_ONLY** (default FORECAST; no toca FINAL) |
| `PATCH /api/dashboard/igf-forecast` | **GUARDED_FINAL** secuencial; **BYPASS_POSSIBLE** concurrente (TOCTOU) |
| POST finalize/supersede | **GUARDED_FINAL** |
| Otros HTTP UPDATE `compromiso_lines` | **NOT_APPLICABLE** (un solo UPDATE en `server.js`) |
| HTTP UPDATE `igf.versions` metadata | **NOT_APPLICABLE** (solo markFinal/markSuperseded) |
| `delete_igf_version_5.sql` | **BYPASS_POSSIBLE** (DELETE no gobierna estado) |
| pgAdmin (proceso ZP) | **BYPASS_POSSIBLE** (fuera de app) |
| Chat / GET / Excel / ARR loaders | **NOT_APPLICABLE** (SELECT) |

## 14. HG PATCH audit

FORECAST: mismo UPDATE de siempre.  
FINAL/SUPERSEDED secuencial: 409 backend.

Guard: `assertCompromisoLinesMutable` = `SELECT financial_state … LIMIT 1` **sin** `FOR UPDATE` y **sin** transacción con el UPDATE. Ventana: PATCH lee FORECAST → otro request FINALIZE → PATCH escribe `hg_*` / util en la fila ya FINAL.

G3 §7: no alterar en silencio FINANCE_PROVIDED de FINAL/SUPERSEDED. **Hallazgo MAJOR.**

## 15. is_current / latest interaction

Finalize/supersede **no** tocan `is_current`. GET / `loadIgfCommitSnapshot` / Excel raw: `ORDER BY version_number DESC LIMIT 1`, no `is_current`, no `financial_state`.

Puede quedar: SUPERSEDED `is_current=true` y FINAL `is_current=false`. El GET igual muestra el **mayor `version_number`**.

Tras upload VBA post-FINAL: nueva FORECAST es latest operativo; GET la muestra aunque exista FINAL. **No es auto-FINAL.** Semántica: `LATEST_OPERATIONAL_VERSION` ≠ `AUTHORITATIVE_FINAL_VERSION`. Conforme a slice B (no relabel GET). Riesgo de producto, no bug de sello.

## 16. Historical-period audit

GET acepta `year`/`month` explícitos. Loaders igual. Frontend: sin selector nuevo (cero matches finalize/financial_state). Clasificación ARCH **BACKEND_SUPPORTED_UI_MISSING** intacta. Query histórica ≠ query FINAL.

## 17. End-of-month / ARR completeness

Lib de final **no** referencia `is_current`, ARR, corte, `lastYmd`. `isIgfMesCerradoPorCorte` no se usó para sellar. Excel/ARR no se alteraron. PROY el último día (`corte > lastYmd`) **no** se “arregló”. Sin `ARR_COMPLETE`.

## 18. ACTUAL_FINANCIAL exposure

`month_close_result` sigue `financial_actual: UNSUPPORTED_METRIC`. pre_meeting / planner / capabilities / IES / RE / chat: sin loader ni intent nuevo. GET no emite `ACTUAL_FINANCIAL`. `financial_state` no se añadió al payload GET.

Runtime ACTUAL_FINANCIAL = **NOT EXPOSED**.

## 19. Migration safety

Idempotente (`IF NOT EXISTS` / `IF to_regclass`). Default FORECAST: CHECK shape compatible. Unique: no FINAL previo → sin conflicto. FK: links null. `ensureSchema` aplica el SQL y **traga** el error (`console.warn`) → columnas/índice podrían faltar en silencio. No se ejecutó contra producción.

## 20. Provenance audit

`finalized_at`: `now()` DB.  
`finalized_by`: `usuario:{actor_id}|role:{ZP|AD}` desde JWT. Sin `actor_id` → 403.

Suficiente para quién/cuándo a nivel app. No hay username/email/filename/hash (ARCH: hash no exigido). G3 provenance de *afirmación* ACTUAL_FINANCIAL (truth_class, field origin) **N/A** en este slice.

## 21. Regression audit

Inspección semántica (no solo tests verdes): GET overlay PROY/ARR igual; un solo UPDATE HG; Excel raw latest; Director IA files no importan el helper. Focales re-corridos: 15/15. Suites IMPL (104 / 1005) no se re-ejecutaron aquí; no se contradicen por el diff acotado.

## 22. Test coverage matrix

| INVARIANT | TEST EXISTS | TIPO | PASS | GAP |
|-----------|-------------|------|------|-----|
| default FORECAST | sí | SQL parse | sí | no ejecuta PG |
| historical backfill | sí (DEFAULT; no UPDATE FINAL) | SQL parse | sí | |
| state CHECK | sí | SQL parse | sí | no inserta filas ilegales en PG |
| unique FINAL | sí (texto índice) | SQL parse | sí | no carrera real |
| ZP / DIR_ZP / DIRECTOR_ZP / DZP | sí | unit | sí | |
| DIR-ZP, DIRZP, DIRECTORZP | no | — | — | **TEST_GAP** (helper sí los tiene) |
| AD | sí | unit | sí | |
| GG / rest deny | sí | unit | sí | |
| FORECAST → FINAL + provenance | sí | mock | sí | |
| existing FINAL conflict | sí | mock | sí | |
| SUPERSEDED cannot finalize | no | — | — | **TEST_GAP** (código sí) |
| cross-period finalize | sí | mock | sí | |
| cross-period supersede | no | — | — | **TEST_GAP** |
| self-supersede | sí | mock | sí | |
| atomic rollback | sí | mock fail inject | sí | no PG |
| old SUPERSEDED / new FINAL / link | sí | mock | sí | |
| HG FORECAST / FINAL / SUPERSEDED | sí | unit + scan PATCH | sí | no TOCTOU |
| finalized_by trusted | sí | unit | sí | no JWT HTTP |
| no auto FINAL | sí (scan lib) | static | sí | |
| no actual exposure | sí | static | sí | |
| 401 token vacío | no | — | — | **TEST_GAP** |
| regression GET/Excel/ARR/MC/pre | parcial | static + suite previa | n/d aquí | no HTTP GET post-FINAL |

## 23. Contract compliance matrix

| Regla G3 | Veredicto |
|----------|-----------|
| FINANCE_PROVIDED ≠ RUNTIME_COMPUTED | **COMPLIANT** (GET no relabelado) |
| FINAL explícito | **COMPLIANT** |
| missing ≠ forecast | **NOT_APPLICABLE** (sin read actual) |
| FINAL/SUPERSEDED immutable | **PARTIAL** (secuencial sí; TOCTOU/DELETE no) |
| corrección = nueva versión | **COMPLIANT** (endpoints) |
| unique FINAL GLOBAL | **COMPLIANT** (índice) |
| provenance at/by | **COMPLIANT** (slice B) |
| lectura default = FINAL vigente | **PARTIAL** (GET sigue latest; slice B lo preservó) |
| reconciliación ARR | **NOT_APPLICABLE** |
| no alimenta IES | **COMPLIANT** |
| AUTHZ de exposición actual | **NOT_APPLICABLE** (no se expone); texto G3 `AUTHZ_DECISION_REQUIRED` desfasado |

## 24. Findings by severity

### MAJOR

1. **PATCH TOCTOU** — `server.js` 12355–12411: guard sin lock; UPDATE posterior puede escribir FINAL. Evidencia: `getVersionFinancialState` sin `FOR UPDATE`; PATCH sin `BEGIN`.
2. **DELETE no gobernado** — `delete_igf_version_5.sql` borra lines + version por `version_number`. FK no impide borrar SUPERSEDED ni FINAL no referenciado. Rompe historia (G3 §6.6 / §11).

### MINOR

3. Unique violation de FINALIZE concurrente → **500**, no 409.
4. Deadlock posible FINALIZE vs SUPERSEDE (orden de locks).
5. Unique solo `plant_code='GLOBAL'`; FINAL no GLOBAL no está cubierto por índice.
6. DB no valida que `superseded_by_version_id` sea mismo YYYY-MM / FINAL.
7. `ensureSchema` traga fallo de migración.
8. TEST_GAP: SUPERSEDED→FINALIZE, supersede cross-period, aliases DIR-ZP/DIRZP/DIRECTORZP, 401 HTTP, TOCTOU.

### OBSERVATION

9. GET = latest operativo ≠ FINAL autoritativo.
10. `is_current` no se mueve; WhatsApp/`igf-handler` puede seguir `is_current`.
11. JWT unknown → GG; GG deny finalize (seguro para este slice).
12. Alias por nombre «director»+«zp».
13. G3 §13 texto AUTHZ pendiente vs decisión RESOLVED (documental).

## 25. Blocking vs non-blocking

| Hallazgo | ¿Bloquea integrar el marker en rama? | ¿Bloquea ACTUAL_FINANCIAL runtime? |
|----------|--------------------------------------|-------------------------------------|
| PATCH TOCTOU | no (slice B usable con riesgo de carrera) | **sí** (G3 §7) |
| DELETE script / pgAdmin | no (preexistente) | evaluar gobernanza |
| MINOR / OBS | no | no |

## 26. Final verdict

**PASS_WITH_FINDINGS**

Suficientemente correcta para conservar la IMPL y no reabrir A/B/C/D ni AUTHZ. **No** suficientemente inmutable bajo concurrencia/admin SQL para construir ACTUAL_FINANCIAL encima.

## 27. Exact recommendation

1. No commit/push/merge en esta tarea.
2. No documentation sync todavía.
3. Corregir el guard PATCH: misma transacción, `SELECT … FOR UPDATE` del `igf.versions` target, luego UPDATE de líneas (y mapear unique_violation → 409).
4. No exponer ACTUAL_FINANCIAL ni cambiar GET a “lectura FINAL” en ese FIX (sigue siendo slice de integridad).
5. DELETE/pgAdmin: no ampliar alcance salvo que HUMAN lo pida.

## 28. Exactly one NEXT_TASK

`FIX-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001`

No autorizada. No ejecutada.

STOP.
