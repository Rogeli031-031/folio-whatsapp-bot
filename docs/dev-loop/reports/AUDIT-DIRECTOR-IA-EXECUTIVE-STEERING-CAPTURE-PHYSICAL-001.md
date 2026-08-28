# AUDIT-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001"
outcome: "DONE_PENDING_REVIEW"
verdict: "PASS_WITH_FINDINGS"
mode: "AUDIT / EVALUATION"
implementation: false
code_changes: false
test_changes: false
sql_changes: false
g2_canonical_docs: false
critical: 0
major: 1
minor: 1
observation: 5
independent_probes: "71 (68 pass / 3 fail = 2 MAJOR reproductions + 1 MINOR)"
director_ia_suite: "1098/1098 pass, 0 fail, 0 skipped"
git_diff_check: "clean"
impl_intact: true
contract_intact: true
next_task_proposed: "FIX-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001"
next_task_authorized: false
next_task_executed: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
secrets_check: "none"
```

## 1. Verdict

**PASS_WITH_FINDINGS.**

El first physical slice es **esencialmente conforme**: store dedicado, grain 1:1, cinco tipos, `RECORDED`-only, `DECLARED_BY` ≠ `RECORDED_BY`, MULTI/ZONE full-scope fail closed en el camino de clave/rol, CORRECTION append-only, aislamiento de otros dominios, sin RECORD autónomo Plaud/LLM/chat.

No es **PASS**: hay un hallazgo MAJOR de autoridad (heurístico de nombre de `isDirectorZPForDashboard` eleva a ZP/ALL_PLANTS).

No es **FAIL**: no hay bypass por rol/clave, no hay leakage de MULTI/ZONE, no hay mutación de IGF/ARR/ACTUAL_FINANCIAL/AR, no hay promoción de `RECORDED` a verdad, no hay pérdida gobernada de historia.

## 2. Executive summary

Auditoría independiente. El reporte IMPL y el 1098/1098 **no** se usaron como prueba. Se inspeccionó SQL/lib/tests y se ejecutaron 71 probes propios (cliente en memoria + source scan + wiring scan).

| Área | Resultado |
|------|-----------|
| ZP/AD ALL_PLANTS por rol/clave | Hold |
| GG ASSIGNED + MULTI/ZONE ⊆ | Hold |
| Resto / ACCESS_KEY / JWT GO→GG | Hold (deny antes de BEGIN) |
| Nombre `Director ZP` en rol no-ZP | **MAJOR** eleva a ALL_PLANTS |
| Recorder spoof desde body | Hold |
| Tipos / RECORDED-only | Hold |
| CORRECTION + historia | Hold (salvo flag `supersede_original:false` = MINOR) |
| Aislamiento otros dominios | Hold |
| Automation RECORD | Hold (sin wire) |

## 3. Contract conformance

Fuentes: contrato v1.0, ARCH semántica, ARCH física, DECISION AUTHZ.

Núcleo de semántica y matriz de clave/rol: conforme. Desviación material: la clase de autoridad no es solo ZP/aliases/AD/GG; hereda match de **nombre** del helper de dashboard.

## 4. Physical schema audit

`sql/020_executive_steering_capture.sql`: `arr.executive_steering_events` + `event_plants` + `event_relations`. SERIAL. CHECK de tipos, `attestation_state IN ('RECORDED')`, vigor CURRENT|SUPERSEDED, scope, declared_kind, source_type. FK a `plantas`/`usuarios`. Sin JSONB de negocio. Sin ON DELETE CASCADE. Sin trigger de inmutabilidad.

`event_plants` también recibe plantas de demostración ZONE (desviación de ARCH §4; justificada por AUTHZ GG ZONE). No inventa roster desde label.

## 5. AUTHZ audit

`steeringAuthorityClass` + `authorizeSteeringScope` **antes** de BEGIN en deny de rol/scope.

| Probe | Resultado |
|-------|-----------|
| ZP/AD RECORD planta ajena | allow |
| GG assigned / unassigned | allow / deny + 0 SQL BEGIN |
| GA GV CF_CDMX CDMX ZC GO SG SEH | deny + 0 BEGIN |
| USUARIOS ACCESS_KEY | deny |
| JWT `role=GG` + `rol_clave=GO` | deny |
| Aliases DIR_ZP / DZP | ZP |
| GA + `actor_nombre="Director ZP"` | **allow ALL_PLANTS** (F-AUTHZ-001) |
| GG + nombre Director ZP + planta no assigned | **allow** (F-AUTHZ-001) |

No hay camino HTTP/chat/tools que salte el helper: el módulo no está importado fuera de sí mismo y sus tests.

## 6. GG PLANT

Assigned → persist + view. Unassigned → `STEERING_SCOPE_DENIED`, `event` ausente en get, 0 filas.

## 7. GG MULTI_PLANT

Obligatorio:

- assigned `[PUEBLA=1, QUERETARO=2]`, requested `[PUEBLA, ACAPULCO=3]` → DENY, events=0, plants=0, rels=0, BEGIN=false.
- requested `[PUEBLA, QUERETARO]` → allow.

Implementación: `plants.every(p => assigned.includes(p))` = subset, no intersección.

## 8. GG ZONE

| Caso | Código |
|------|--------|
| plant_ids ⊆ assigned | allow |
| plant_ids con planta fuera | SCOPE_DENIED |
| solo `scope_label` | ZONE_UNRESOLVED |
| fallback por label | no existe |

## 9. Read leakage

MULTI Puebla+Acapulco creado por ZP: GG get `ok=false` sin `event`; list `events.length=0`. No recorte silencioso. ZONE análoga: deny.

`list` hace `SELECT id` global y filtra por get (contenido no se devuelve). Ver OBS-004.

## 10. RECORDED_BY spoofing

Body `captured_by_usuario_id` / `recorded_by` / `recorded_by_user_id` ignorados. INSERT usa `capturedByUsuarioId(auth)` (`actor_id` / `usuario_id`). Probe: auth 77 + body 1 → persistido 77.

La superficie in-process **confía** en el objeto `auth`. Sin HTTP, no hay spoof de red. Quien construya `auth` ya puede poner `role=ZP`.

## 11. DECLARED_BY

FREE_TEXT_SPEAKER «Gerente Acapulco» + recorder 10. UNKNOWN no copia recorder (`declared_user_id`/`display_name` null). Default `declared_kind=UNKNOWN` si se omite.

## 12. Event types

Cinco contractuales persistidos. Rechazados: ACTION, SCENARIO, FORECAST, TARGET, ACTUAL, FINAL, SUMMARY, NOTE, FOO → `STEERING_INVALID_EVENT_TYPE`.

## 13. RECORDED-only

INSERT literal `'RECORDED'`. Body CANDIDATE/CONFIRMED/APPROVED/REJECTED/FULFILLED/FINAL → `STEERING_INVALID_ATTESTATION_STATE`. Sin promotion.

## 14. Correction/history

Original +40 permanece (`raw_text`, `numeric_value=40`, type COMMITMENT, state RECORDED). vigor → SUPERSEDED. Historia n=2. Self/0 → RELATION_INVALID. Target 9999 → NOT_FOUND. GG corrige Acapulco no assigned → deny, original CURRENT, n=1. Texto «confirmado organizacionalmente» sigue `RECORDED` + `meaning.not` incluye APPROVED/ORGANIZATIONALLY_CONFIRMED.

`supersede_original: false` aceptado: dos CURRENT. **MINOR F-CORR-001.**

## 15. Update/delete

Helpers siempre `UPDATE_FORBIDDEN` / `DELETE_FORBIDDEN`. Único UPDATE de producto: `vigor='SUPERSEDED'` en la TX de SUPERSEDES.

**PRODUCT_GOVERNED_IMMUTABILITY.** No **ABSOLUTE_DB_IMMUTABILITY**: no hay trigger (a diferencia de `019` IGF). Superusuario PostgreSQL puede UPDATE/DELETE. El contrato no promete inmunidad de superusuario.

FK sin CASCADE: DELETE padre con hijos falla en PG estándar; se pueden borrar hijos y luego padre.

## 16. Atomicity

Fallo `insert_plant` en MULTI: rollback, 0 event/plants/rels. Fallo `insert_rel` en CORRECTION: rollback del sucesor, original intacto, 0 relations. Deny MULTI ocurre **antes** de BEGIN.

BEGIN/COMMIT/ROLLBACK reales en el servicio. El probe de rollback es contra cliente en memoria que honra snapshot (no PostgreSQL live).

## 17. Concurrency/TOCTOU

Authz usa el snapshot `auth` en memoria; no relee assignments de DB. Sin `SELECT FOR UPDATE`. Dos CORRECTION concurrentes del mismo original pueden dejar dos CURRENT + dos SUPERSEDES. First slice sin HTTP: riesgo no explotable hoy. OBS-002. No se inventa bypass TOCTOU de scope en la superficie actual.

## 18. Null/unknown

Descuento sin cifra: `numeric_value=null` (no 0), `period_kind=null`, `baseline_ref=null`, `meeting_ref=null`, `declared_at=null`. Periodo de junta no existe en el servicio (no se infiere). `source_type` default MANUAL si se omite (no inventa Plaud).

## 19. Provenance

Campos: source_*, meeting_ref, declared_*, captured_by, timestamps, relations. `extracted_by` NULL (slice manual). `reason_text` contractual no es columna (va en `raw_text`). OBS-005.

## 20. Other-domain isolation

Lib sin SQL a `igf.*`, `action_register`, `ventas_diarias`, `financial_state`, `compromiso_lines`, `month_close`. COMMITMENT no crea ACTION. +40 no toca forecast. CORRECTION no toca ACTUAL_FINANCIAL. Suites de esos dominios: 0 fallos.

## 21. Automation authority

Sin import en `director-ia-chat.js`, `director-ia-tools.js`, `director-ia-planner.js`, `server.js`. Sin endpoint. Plaud/LLM/live no tienen path RECORD. `source_type=PLAUD_FUTURE` es literal, no runtime.

## 22. EVAL-003

Modelo puede representar Puebla 1177 (PROPOSAL), Acapulco +40 (COMMITMENT RECORDED), corrección de canal (CORRECTION, original intacto), Qro +15 (PROPOSAL), Morelos (COMMITMENT), Zona +632 **sin** auto-import. +40 RECORDED no implica venta/forecast/target/actual/ACTION/cumplimiento (`meaning.not`).

## 23. Read semantics

`vigor=CURRENT` = no superseded. `meaning.recorded=attestation_exists_with_provenance`. No relabela a VERIFIED_TRUE / CONFIRMED / ACTUAL / FINAL.

## 24. Test-quality audit

Tests de producto (33) cubren happy + MULTI deny + ZONE + spoof recorder + isolation source-scan. Huecos:

- no cubren heurístico de nombre (F-AUTHZ-001)
- no cubren `supersede_original: false`
- cliente en memoria no aplica CHECK/FK PostgreSQL
- aislamiento de otros dominios es scan de fuente, no spy runtime
- no hay test de concurrencia

Los tests no ocultan F-AUTHZ-001: no lo ejercitan. Authz de rol/scope sí se prueba en `record`/`get`, no solo en el helper.

## 25. Regression

Reejecutada en este turno (no copiada del IMPL):

| Suite | Resultado |
|-------|-----------|
| Probes AUDIT independientes | 71 (68 pass / 3 fail) |
| PRE_CLOSE | 37/37 |
| ACTUAL_FINANCIAL | 23/23 |
| IGF M7 | 13/13 |
| IGF reviewable | 26/26 |
| IGF FINAL | 28/28 |
| ARR | 24/24 |
| Action Register routing | 19/19 |
| month_close_result | 27/27 |
| `node --test test/director-ia-*.test.js` | **1098/1098**, 0 fail |

## 26. Findings table

### F-AUTHZ-001 — MAJOR

| Campo | Valor |
|-------|--------|
| ID | F-AUTHZ-001 |
| SEVERITY | MAJOR |
| INVARIANT | AUTHZ: solo ZP+aliases documentados / AD / GG; resto DENY; GG no sale de ASSIGNED_PLANTS |
| EVIDENCE | `steeringAuthorityClass` llama `isZpToken(..., actor_nombre)` → `isDirectorZPForDashboard` (`/director/i` && `/zp/i`). Probes A10/A11 |
| REPRODUCTION | `{ role: "GA", actor_id: 3, actor_nombre: "Director ZP" }` RECORD planta Acapulco → persist ok, class=ZP. `{ role: "GG", rol_clave: "GG", actor_nombre: "Director ZP Acapulco", plantas_permitidas: [1,2] }` RECORD Acapulco(3) → persist ok |
| IMPACT | Actor cuya **clave** es GA/GG obtiene ALL_PLANTS si el nombre coincide. First slice no tiene HTTP; el riesgo se materializa cuando un adapter futuro pase `rol_nombre` de catálogo |
| REQUIRED_FIX | Autoridad steering por `role`/`rol_clave` ∈ {ZP + aliases listados, AD, GG}. No heredar match de nombre de dashboard. GG con cualquier nombre permanece ASSIGNED_PLANTS |

No CRITICAL: no hay superficie de red; quien controla `auth` ya puede setear `role=ZP`. Sí MAJOR: el helper **es** la matriz de este slice y no coincide con DECISION §2.

### F-CORR-001 — MINOR

| Campo | Valor |
|-------|--------|
| ID | F-CORR-001 |
| SEVERITY | MINOR |
| INVARIANT | Contrato §6: original pasa a vigor SUPERSEDED cuando hay sucesor que reemplaza vigencia |
| EVIDENCE | `supersede_original: body.supersede_original !== false`. Probe I6 |
| REPRODUCTION | CORRECTION con `supersede_original: false` → original CURRENT + correction CURRENT |
| IMPACT | Dos atestaciones CURRENT. No borra historia ni promociona a confirmación |
| REQUIRED_FIX | No aceptar flag de body que evite SUPERSEDES en first slice, o exigir política explícita no manipulable |

## 27. Residual risks

| ID | SEVERITY | Nota |
|----|----------|------|
| OBS-001 | OBSERVATION | Inmutabilidad de producto, no de superusuario PG. Sin trigger tipo `019` |
| OBS-002 | OBSERVATION | Sin locks; fork de CORRECTION concurrente posible. Sin HTTP hoy |
| OBS-003 | OBSERVATION | Tests/probes no usan PostgreSQL real |
| OBS-004 | OBSERVATION | `list` selecciona todos los `id` y filtra; no filtra contenido |
| OBS-005 | OBSERVATION | `reason_text` contractual no es columna (OPTIONAL_AS_CONTRACTED) |

No se trata OBS-001 como hallazgo de incumplimiento: ARCH física y el contrato no exigen trigger de superusuario.

## 28. Matrix impact

| | |
|--|--|
| Baseline | 10.5 / 20 = 52.5% |
| Después | 10.5 / 20 = 52.5% |
| Delta | **0.0 pp** |
| M0–M20 | no modificados |

## 29. Exactly one NEXT_TASK

**`FIX-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001`**

Cerrar F-AUTHZ-001 (y F-CORR-001 si el FIX lo incluye). **No autorizada. No ejecutada.**

G2 Index/EKE/CAPACIDADES **después** del FIX/cierre. No se abre aquí.

STOP. No commit. No push. No merge. Código de producto intacto.
