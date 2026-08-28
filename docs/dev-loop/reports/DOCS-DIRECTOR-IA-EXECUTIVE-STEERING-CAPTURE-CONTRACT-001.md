# DOCS-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-CONTRACT-001

```yaml
task_id: "DOCS-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-CONTRACT-001"
outcome: "DONE_PENDING_REVIEW"
verdict: "CONTRACT_READY_FOR_FREEZE"
contract_path: "docs/director-ia/EXECUTIVE-STEERING-CAPTURE-CONTRACT.md"
contract_version: "1.0"
implementation: false
code_changes: false
test_changes: false
sql_changes: false
constitution_touched: false
ies_04_touched: false
re_05_touched: false
index_touched: false
eke_touched: false
capabilities_touched: false
matrix_changes: false
runtime: "PENDING"
authz_confirmation: "PENDING"
next_task: "ARCH-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001"
next_task_authorized: false
next_task_executed: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
secrets_check: "none"
```

## 1. Executive verdict

**`CONTRACT_READY_FOR_FREEZE`**

Se creó el contrato de dominio v1.0:

`docs/director-ia/EXECUTIVE-STEERING-CAPTURE-CONTRACT.md`

Objeto: `EXECUTIVE_STEERING_EVENT`. Tipos: `PROPOSAL`, `DECISION`, `COMMITMENT`, `HUMAN_DECLARED_CAUSE`, `CORRECTION`.

`RECORDED` afirma la **existencia de la atestación**, no la verdad del contenido. No es capa de pipeline. Runtime PENDING. Confirmación organizacional PENDING.

Constitución, `04` y `05` intactos. Index / EKE / CAPACIDADES no sincronizados (G2 posterior).

**NEXT_TASK (no autorizada):** `ARCH-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001`

---

## 2. Contract placement decision

Convención física del Index (`DIRECTOR_IA_ARCHITECTURE_INDEX.md` v1.12):

- Órdenes **0–6** = pipeline (Constitución → … → `06` Channel Projection).
- Documentos **`—`**: inventario (`CAPACIDADES`) y contrato de dominio (`FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md`). El Index declara explícitamente que FINANCIAL-ACTUAL **no** es capa, **no** es `07`.

| Opción | Veredicto |
|--------|-----------|
| **A. Contrato de dominio independiente** | **Seleccionada** |
| B. Extensión de un documento existente | Rechazada: EKE/CAPACIDADES son inventario/política; FINANCIAL-ACTUAL es otro dominio; `06` es interfaz |
| C. Sección subordinada | Rechazada: mezclaría junta con FINAL financiero o con pipeline |

Nombre/ubicación (misma familia que FINANCIAL-ACTUAL):

`docs/director-ia/EXECUTIVE-STEERING-CAPTURE-CONTRACT.md`

No se asignó `06`/`07`. Capability/domain, no capa N.

---

## 3. Upstream contractual audit

| Fuente | Hallazgo |
|--------|----------|
| Constitución I–V, VIII | Hecho ≠ evidencia ≠ hipótesis. Compatible si RECORDED no es hecho del contenido |
| Constitución VII | Nueva fuente debe declarar observación + IES. El contrato **declara**: v1.0 no produce N1 ni alimenta IES |
| Constitución VI | Impugnación old/new/quién/cuándo/motivo. Reusado como patrón de corrección, no como IES alternativo |
| EKE | Meeting statement ≠ verdad; forecast ≠ commitment. Compatible. G2 posterior |
| 02 / 03A | Linaje `content_author_id` / `extracted_by`. Reuso de patrón. No se tocan |
| 04 / 05 | Congelados. No se tocan. Review solo antes de proyectar/razonar |
| Index | Fila `—` futura. No se edita ahora |
| CAPACIDADES | PRE_CLOSE no persiste commitment. G2 posterior |
| FINANCIAL-ACTUAL | SUPERSEDED financiero ≠ este dominio. No se toca |
| Action Register | title/due/closed. SEPARATE_COMMITMENT_MODEL. No se toca |
| ARCH capture | READY_WITH_LIMITS; objeto A; first slice RECORDED; G3 antes de IMPL |
| NEXT_GAP / EVAL-003 | Residuo de junta; AR ≠ commitment; Plaud ≠ verdad |

Sin contradicción que bloquee el freeze.

---

## 4. Domain identity

`EXECUTIVE_STEERING_CAPTURE` = capability de registrar semántica ejecutiva que AR, IGF, ARR, ACTUAL_FINANCIAL y el transcript **no** representan.

No es Motor. No es IES. No es PRE_CLOSE. No es month_close.

---

## 5. Canonical object

`EXECUTIVE_STEERING_EVENT`: envelope tipado. Un `event_id`, N por junta. Campos de negocio opcionales.

---

## 6. Invariants

Congelados en contrato §3. Incluyen anti-colapso PROPOSAL/DECISION/COMMITMENT/ACTION/TARGET/FORECAST/SCENARIO/ACTUAL/FINAL/hipótesis/causa evidenciada, y la prohibición de mutar fuentes operacionales.

---

## 7. RECORDED semantics

Definición contractual: atestación estructurada con provenance de que el contenido fue capturado/declarado en ese contexto.

Defendible: «quedó registrado que Acapulco se comprometió a +40 t.»  
No defendible: «aumentará / vendió / el forecast subió / está aprobado / está cumplido.»

Único estado operativo v1.0. `CONFIRMED` / `APPROVED` / candidatos = FUTURE / AUTHZ.

---

## 8. Taxonomy

Cinco tipos. Sin `MEETING_STATEMENT`, `SCENARIO`, `REJECTION`, `ACTION` en este store. Detalle en contrato §5 y §§9–13 de este reporte.

---

## 9. PROPOSAL

Propuesta formulada. No es decisión, aprobación, commitment ni ejecución. Admite existir sin decisión; ser aceptada, rechazada o supersedida después.

---

## 10. DECISION

Decisión declarada/tomada. Outcome `accepted` | `rejected` | `pending`. Ref a PROPOSAL opcional. No exige proposal previa. No implica ejecución ni commitment de todos los afectados. ≠ `DECISION_NEEDED` de PRE_CLOSE.

---

## 11. COMMITMENT

Asunción futura explícita. ≠ ACTION, `igf_meta`, FORECAST, SCENARIO, ACTUAL, FINAL. Link futuro a 0..N acciones: permitido, no obligatorio, no automático.

---

## 12. HUMAN_DECLARED_CAUSE

«La caída fue por turismo» = atribución humana registrada. ≠ causa evidenciada, verificada o hipótesis N5. La autoridad del speaker no cambia la clase.

---

## 13. CORRECTION

Evento que corrige otro. Preserva original. No borra historia.

---

## 14. Correction/supersession model

`CORRECTION` = tipo. Supersession = vigencia del original (`SUPERSEDED` de **este** dominio) + sucesor vigente. Sin overwrite. Sin `financial_state` IGF.

---

## 15. Actor identity

`declared_by` ≠ `captured_by` ≠ `extracted_by` ≠ `source`.

Modos: `KNOWN_USER` | `KNOWN_ROLE` | `FREE_TEXT_SPEAKER` | `UNKNOWN`.  
Transcript name ≠ user id. Role ≠ persona.

---

## 16. Provenance

Mínimo RECORDED: identity, type, state, raw_text, source_type, captured_by, captured_at, modo de declared_by.  
Opcional: declared_at, meeting_ref, source_id/offset, scope, period, quantity, baseline, supersedes.  
UNKNOWN > inventar.

---

## 17. Value / scope / period semantics

Payload opcional (metric/value|delta/unit). Obligatorio **si** hay métrica estructurable para trazabilidad (+40 t).  
Scope: PLANT / MULTI_PLANT / ZONE / OTHER_EXPLICIT / UNKNOWN. Scope ≠ authz.  
Period: solo el declarado, no el mes de la junta por defecto.  
Baseline: solo si existe; PRE_CLOSE no se copia solo.

---

## 18. Action Register boundary

Store separado. COMMITMENT ≠ ACTION. DICF «compromiso» = fecha de tarea. LINK_ACTION organizacional = AUTHZ futura.

---

## 19. Forecast / target / actual / final boundary

Ningún event muta IGF, meta, ARR, ACTUAL_FINANCIAL ni FINAL. Proyecciones = otros contratos/runtime.

---

## 20. Scenario boundary

Fuera de v1.0. «Si X entonces Y» ≠ COMMITMENT. Sin tipo SCENARIO. Sin engine.

---

## 21. Automated extraction boundary

Transcript → candidato FUTURE → captura humana → RECORDED.  
LLM no confirma, no inventa speaker/quantity/period/plant/cause, no aprueba.

---

## 22. Plaud boundary

Fuente posible, no dominio. Runtime Plaud fuera. Compatible con SOURCE → candidato → capture.

---

## 23. IES / Evidence Builder boundary

**Domain first.** No es evidence IES directa.  
`IES_REVIEW_REQUIRED` antes de proyectar. `02`/`04` no modificados.  
EB: compatible; no SYNC en esta tarea.

---

## 24. Reasoning Engine boundary

RECORDED COMMITMENT = evidencia de **declaración**, no de cumplimiento.  
HUMAN_DECLARED_CAUSE = evidencia de **atribución**, no de causa.  
`RE_REVIEW_REQUIRED` antes de N5. `05` no modificado.

---

## 25. Constitution impact

**`CONSTITUTION_CHANGE_NOT_REQUIRED` / `NOT_REQUIRED`.**

VII satisfecho por declaración de no-alimentación IES. Sin nueva truth class constitucional.

---

## 26. AUTHZ unresolved boundary

`AUTHZ_DECISION_REQUIRED` para CONFIRM / APPROVE / CORRECT-SUPERSEDE ajeno / LINK_ACTION org.

No se decide quién. ZP/AD no heredan ACTUAL_FINANCIAL. First slice `RECORDED` no espera esa decisión.

---

## 27. Council compatibility

Cadena A→B→C→D→E(externo)→outcome(futuro) consultable por tipos. Sin runtime.

---

## 28. Post-close compatibility

Payload + period + scope permiten comparar contra actual/final externo. Sin `FULFILLED` automático.

---

## 29. Live-copilot compatibility

Mismos tipos. Live ≠ más autoridad. Sin hardware/streaming.

---

## 30. EVAL-003 validation

Cifras **no** se copian al contrato. Clasificación contractual:

| Contexto | Tipo | Estado | Value si defendible | Scope | Period | Se puede afirmar | No se puede afirmar |
|----------|------|--------|---------------------|-------|--------|------------------|---------------------|
| Puebla ~1,177 / ~775 mil «cómo está quedando» | `PROPOSAL` de cifra intervenida | `RECORDED` si se captura | 1177 t / 775k **solo** si el registrar los trae; si no, raw_text | Puebla | No inferir agosto solo por la junta | Quedó propuesta esa cifra | COMMITMENT, FORECAST, FINAL |
| Acapulco +40 t / 0.50 / terceros | `PROPOSAL`; `COMMITMENT` **solo** si el enunciado asume | `RECORDED` | +40 t, desc ~0.50 si se capturan | Acapulco | UNKNOWN salvo declaración | Quedó propuesta/asumida | Vendió +40; forecast +40; ACTION |
| Canal Acapulco mal | `CORRECTION` (dato) | `RECORDED` | Sin toneladas | Acapulco | — | Quedó registrada la corrección de canal | Reconciliation Finance vs ARR; truth del canal |
| Querétaro +15 t | `PROPOSAL` | `RECORDED` | +15 t si se captura | Querétaro | UNKNOWN | Quedó propuesta | Commitment automático |
| Querétaro recorte incompleto | `DECISION` `pending` | `RECORDED` | — | Querétaro | — | Quedó pendiente | Cierre ejecutado |
| Morelos volumen reescrito | `COMMITMENT` + sucesor/`CORRECTION` | cadena SUPERSEDED + vigente | solo cifras dichas | Morelos | UNKNOWN | Historial de asunciones | Un único número eterno |
| San Luis «vamos por este cierre» | `COMMITMENT` cualitativo | `RECORDED` | payload null | San Luis | cierre aludido, no inventar YYYY-MM | Quedó asunción cualitativa | IGF latest = commitment |
| Zona +632 mil «si se cumple» | **Fuera** (scenario). No COMMITMENT | — | no persistir como commitment | Zona | — | — | Actual regional; FINAL; compromiso zonal |

---

## 31. Runtime status

| | |
|--|--|
| CONTRACT | v1.0 APPROVED_FOR_FREEZE (semántica; espera cierre humano G5 de esta tarea) |
| RUNTIME | **PENDING** |
| AUTHZ_CONFIRMATION | **PENDING** |
| IES | no alimentado |
| Physical store | no diseñado |

---

## 32. Contract impact matrix

| Documento | Clasificación | ¿Editado aquí? |
|-----------|---------------|----------------|
| Constitution | **NOT_REQUIRED** | No |
| EKE | **SYNC_REQUIRED** (G2 posterior) | No |
| Evidence Builder | **NOT_REQUIRED** (compatible; patrón reusado) | No |
| IES | **REVIEW_REQUIRED** (antes de proyectar); **CONTRACT_CHANGE** no | No |
| Reasoning Engine | **REVIEW_REQUIRED** (antes de N5); **CONTRACT_CHANGE** no | No |
| Architecture Index | **SYNC_REQUIRED** (G2, fila `—`) | No |
| Capabilities | **SYNC_REQUIRED** (G2 posterior) | No |
| FINANCIAL-ACTUAL | NOT_REQUIRED | No |

Syncs **no** ejecutados. El protocolo pide separar contrato de sync documental.

---

## 33. Physical-readiness prerequisites

First physical slice (no implementar): captura **manual** de los cinco tipos, `RECORDED` only, store dedicado. Sin Plaud, Consejo, post-close, what-if, live, CONFIRMED org.

| ¿Hace falta antes de IMPL? | |
|----------------------------|--|
| IES/RE review | No para domain store; sí antes de IES/N5 |
| DECISION AUTHZ | No para `RECORDED`; sí para CONFIRM |
| G2 Index/CAPACIDADES/EKE | Después o cuando HUMAN_APPROVER autorice; no bloquean diseñar persistencia |
| **ARCH física** | **Sí** — semántica congelada; persistencia/API/authz de planta de escritura aún no diseñadas |

Prerrequisito siguiente: ARCH física.

---

## 34. Matrix impact

| | |
|--|--|
| Baseline | 10.5 / 20 = 52.5% |
| Después | 10.5 / 20 = 52.5% |
| Delta | **0.0 pp** |
| Matriz modificada | **No** |
| `MATRIX_REVIEW_REQUIRED` | **No** |

---

## 35. Exactly one NEXT_TASK

**`ARCH-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001`**

| Campo | Valor |
|-------|--------|
| Por qué no IMPL | Falta shape físico, persistencia y frontera de escritura `RECORDED` |
| Por qué no DECISION AUTHZ | First slice no confirma organizacionalmente |
| Por qué no IES/RE review | Domain store no proyecta ni razona N5 |
| Por qué no DOCS SYNC | Index/EKE/CAPACIDADES se sincronizan después; no reabren semántica |
| Alcance propuesto | Diseñar persistencia conceptual/física del event store sin reinterpretar v1.0; sin SQL de producción si el ARCH lo evita; sin Plaud/Consejo/CONFIRMED |
| Autorizada | **No** |
| Ejecutada | **No** |

STOP. No commit. No push. No merge.
