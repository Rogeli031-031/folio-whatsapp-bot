# ARCH-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001

```yaml
task_id: "ARCH-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001"
outcome: "STOPPED"
readiness: "STOPPED"
implementation: false
code_changes: false
test_changes: false
sql_created: false
canonical_docs_changes: false
contract_reinterpreted: false
authz_write: "AUTHZ_DECISION_REQUIRED"
next_task: "DECISION-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-AUTHZ-001"
next_task_authorized: false
next_task_executed: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
secrets_check: "none"
```

## 1. Executive verdict

**Readiness:** `STOPPED`

La materialización física del contrato v1.0 es **diseñable y coherente** con el repo: store dedicado en schema `arr`, una fila = un `EXECUTIVE_STEERING_EVENT`, `attestation_state` explícito solo `RECORDED`, contenido semántico inmutable, corrección por evento + relación `SUPERSEDES` append-only.

**No** se implementa. **No** se abre IMPL.

`RECORD` / escritura no está congelada en el contrato. Bitácora y Action Register permiten insertar a quien tenga acceso de planta; eso **no** es autoridad para atestar un `COMMITMENT` tipado. Inferir ZP/AD está prohibido (contrato §17; DECISION financiera no se hereda).

**NEXT_TASK (no autorizada):** `DECISION-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-AUTHZ-001`

Persistir ≠ verificar. `RECORDED` ≠ confirmado, aprobado, ejecutado, cumplido, target, forecast, actual ni FINAL.

---

## 2. Physical repo audit

| Hallazgo | Evidencia |
|----------|-----------|
| Schema operativo Director IA | `arr.*` (bitácora `014`, pending work `017`, AR en `server.js`) |
| Schema conocimiento | `eks.snapshots` JSONB append-only. Cifras de negocio **no** viven ahí |
| IDs | `SERIAL` dominante en `arr`/`igf_meta`. EKS usa `TEXT` snapshot_id. Casi no hay UUID de producto |
| Timestamps | `TIMESTAMPTZ NOT NULL DEFAULT now()`. Fechas de negocio: `DATE` |
| Enums | `VARCHAR` + `CHECK` (bitácora tipo/fuente; PWI status; `igf.versions.financial_state`) |
| JSONB | metadata/bundle/gap. No es identidad de evento |
| FK | `public.plantas(id)`, `public.usuarios(id)` |
| Soft-delete | Bitácora `is_active`. PWI `status` incl. `superseded` sin borrar |
| Inmutabilidad financiera | `019` rechaza DELETE de FINAL/SUPERSEDED. **No** reusar |
| Bitácora | `planta_id INT NOT NULL` + `contenido TEXT`. Una planta. Blob. `fuente` puede ser `plaud` |
| AR | `planta_id` NOT NULL; title/due/closed. Write = acceso de planta |
| Meeting store | **No existe** `meeting_id` |
| Zona | Cue de portafolio en PRE_CLOSE. **No** hay tabla de zona canónica |
| Authz planta | JWT ZP/AD ALL; GG `plantas_permitidas`; `assertDashboardPlantaAccess*` |
| PRE_CLOSE | Pack efímero; no persiste commitment |
| IES | Runtime pendiente; EKS no es este dominio |

---

## 3. Store selection

| Opción | Aislamiento | Historia | Query | Consejo/Plaud/live | Authz | Migración | Duplicate truth |
|--------|-------------|----------|-------|---------------------|-------|-----------|-----------------|
| **A. Store dedicado** | Alta | Diseñable | Alta | Un modelo | Acotable | Media | Baja |
| B. Extender AR | Nula | `closed` | Por ítem | Contamina | AR | Alta corrupción | **Alta** |
| C. EKS / claims | Media | Bundle | JSON | Mezcla IES | Difusa | Alta | Alta |
| D. Bitácora | Nula | Texto | Mala | Dump | Planta única | Alta | Transcript |
| E. Meeting store | — | — | — | — | — | Crear todo | — |
| F. IGF/meta/comentarios | Nula | Forecast/texto | No | No | Prestada | **Alta** | **Alta** |

**Selección: A.**

Demostración física: bitácora **exige** `planta_id` (zona no cabe); AR es ACTION; EKS es snapshot IES; no hay meeting store. El contrato exige dominio separado; el repo **no** ofrece un host semánticamente limpio.

Nombres conceptuales (no SQL ejecutado): `arr.executive_steering_events`, `arr.executive_steering_event_plants`, `arr.executive_steering_event_relations`.

---

## 4. Grain and identity

**Grain:** una fila = un `EXECUTIVE_STEERING_EVENT`. No meeting blob. No mezclar proposals/commitments.

Hijos justificados:

- `event_plants` — solo `scope_kind=MULTI_PLANT`
- `event_relations` — CORRECTS / SUPERSEDES / REFERS_PROPOSAL

**ID:** `SERIAL` / `BIGSERIAL` (convención `arr`). Estable para CORRECTION, Consejo, linkage futuro. No UUID: el repo de producto no lo usa. No se implementa.

---

## 5. Event type / state representation

**Tipo:** `VARCHAR` + `CHECK` ∈ {`PROPOSAL`,`DECISION`,`COMMITMENT`,`HUMAN_DECLARED_CAUSE`,`CORRECTION`}. Misma convención que bitácora. Sin lookup table (cinco valores cerrados). Sin tipos nuevos.

**Estado — opción A:** columna `attestation_state` con `CHECK` que **hoy** solo admite `RECORDED`.

Rechazada B (existencia = RECORDED): al añadir `EXTRACTED_CANDIDATE` en el futuro se corrompería el default. No persistir `CONFIRMED`/`APPROVED`.

`vigor` ∈ {`CURRENT`,`SUPERSEDED`} es vigencia de cadena, **no** aprobación.

---

## 6. Content shape

Columnas tipadas para lo consultable; **no** un JSONB de negocio como registro canónico.

| Grupo | Campos conceptuales |
|-------|---------------------|
| Identidad | `id`, `event_type`, `attestation_state`, `vigor` |
| Texto | `raw_text` NOT NULL |
| Decisión | `decision_outcome` NULL salvo DECISION |
| Valor | `metric_key`, `numeric_value`, `unit`, `value_mode` — todos nullable |
| Periodo | `period_kind`, `period_year`, `period_month`, `period_start`, `period_end` |
| Scope | `scope_kind`, `scope_label`, `plant_id` nullable |
| Actores | ver §8–9 |
| Source | ver §9 |
| Baseline | nullable |
| Tiempos | ver §18 |
| Relación | via `event_relations`; no payload |

JSONB solo para `source_location` opaco o metadata **no semántica**, nunca como único lugar de type/value/scope.

---

## 7. Metric / value / unit

No hay catálogo gobernado de métricas en el repo. First slice:

- `metric_key` TEXT libre (`venta_ton`, `descuento`, `HG`, `gasto`, `resultado_importe`, other)
- `numeric_value` NUMERIC NULL
- `unit` TEXT NULL
- `value_mode` ∈ {`ABSOLUTE`,`DELTA`,`UNKNOWN`} NULL si no hay número

+40 t → DELTA 40, unit t. 1,177 t → ABSOLUTE. $632k **no** se persiste como COMMITMENT (scenario). Descuento sin cifra → solo `raw_text`.

---

## 8. Actor identities

| Campo | Uso |
|-------|-----|
| `declared_kind` | `KNOWN_USER` / `KNOWN_ROLE` / `FREE_TEXT_SPEAKER` / `UNKNOWN` |
| `declared_user_id` | FK usuario, NULL si no KNOWN_USER |
| `declared_role_key` | NULL ok |
| `declared_display_name` | Speaker de transcript; NULL ok |
| `captured_by_usuario_id` | Usuario autenticado que registra. First slice manual: NOT NULL |
| `extracted_by` | TEXT NULL. First slice manual: NULL |

No colapsar. Nombre de Plaud ≠ `KNOWN_USER`.

---

## 9. Source / provenance

| Campo | First slice |
|-------|-------------|
| `source_type` | CHECK: `MANUAL`, `DIRECTOR_IA_CONVERSATION`, `PLAUD_FUTURE`, `UPLOADED_NOTES`, `BITACORA`, `OTHER` |
| `source_id` | NULL o id de bitácora/packet |
| `source_location` | offset/ts; NULL |
| `meeting_ref` | TEXT NULL (ref externa) |

No duplicar transcript. Plaud = tipo de fuente, no runtime.

---

## 10. Meeting reference

**A.** `meeting_ref` / `source_id` nullable en el event.

Rechazada B/C: no hay entidad meeting; bitácora no es canónica (una planta + blob). First slice no crea meeting store.

---

## 11. Scope / multi-plant

Identidad de planta: `public.plantas.id` (INT). PRE_CLOSE ya la usa.

| `scope_kind` | Persistencia |
|--------------|--------------|
| `PLANT` | `plant_id` NOT NULL = esa planta. Free text **no** sustituye id conocido |
| `MULTI_PLANT` | `plant_id` NULL; filas en `event_plants` |
| `ZONE` | `scope_label` (p. ej. Provincia); **sin** exigir plantas. No hay tabla de zona |
| `OTHER_EXPLICIT` / `UNKNOWN` | label o null; sin inventar plantas |

**Multi-plant — B:** relation `event_plants`.

| Opción | Por qué no / sí |
|--------|-----------------|
| A JSON/list | Authz y JOIN débiles |
| **B relation** | Query + authz por `planta_id` |
| C un event por planta | Duplica identity; rompe CORRECTION |
| D jerarquía repo | **No existe** |

Zona («Zona Provincia debe cerrar positiva»): **una fila** `ZONE`. No expandir a todas las plantas (inventarías scope).

---

## 12. Period / baseline

**Periodo:** `period_kind` ∈ {`YYYY_MM`,`DATE`,`RANGE`,`UNKNOWN`} + `period_year`/`period_month` o `period_start`/`period_end`. Todo nullable. **Prohibido** copiar la fecha de junta.

**Baseline:** `baseline_ref`, `baseline_value`, `baseline_source` — todos optional. No copiar PRE_CLOSE. No inventar «contra qué» para +40 t si no se declaró.

---

## 13. Event relations

Tabla `event_relations`: `from_event_id`, `to_event_id`, `relation_kind` ∈ {`REFERS_PROPOSAL`,`CORRECTS`,`SUPERSEDES`}, `created_at`, `created_by_usuario_id`.

`DECISION` **puede** `REFERS_PROPOSAL`. No obligatorio.  
No `proposal_event_id` suelto: un solo patrón reutilizable.  
Sin self-ref. Insert-only.

---

## 14. Action Register linkage

**D. Sin link físico en first slice.**

A/B/C acoplarían ACTION=COMMITMENT o exigirían schema AR. El contrato permite linkage futuro; no lo obliga. `LINK_ACTION` = AUTHZ posterior.

---

## 15. Correction

`CORRECTION` es event de primera clase. Relación `CORRECTS` → event original. Original **intacto**.

First slice: solo `CORRECTS` (+ `SUPERSEDES` si el sucesor reemplaza vigencia). Sin lifecycle `clarify` extra.

---

## 16. Supersession

**Selección: B** — relación `SUPERSEDES` append-only.

El original no se reescribe. `vigor` en el original pasa a `SUPERSEDED` **solo** en la misma transacción que el INSERT de la relación (metadata auditable; `created_by` en la relación).

Rechazada A (`superseded_by` como único mutador sin relación).  
Rechazada C (flag suelto).  
D (solo query) es el fallback de lectura; B es la fuente de la arista.

≠ `igf.versions.financial_state`.

---

## 17. Immutability / delete / update

| Política | Norma |
|----------|--------|
| Hard delete de `RECORDED` | **Prohibido** en path de producto |
| Soft-delete que oculte historia | **Prohibido** (bitácora `is_active` no se copia) |
| Anulación | Nuevo event + SUPERSEDES |
| Superuser DELETE | No se diseña ni se garantiza (como `019`) |

| Campo | Clase |
|-------|--------|
| type, raw_text, quantity, scope, period, declared_*, source semántico | **IMMUTABLE** |
| `vigor` (con relación) | **MUTABLE_METADATA** transaccional |
| Cualquier cambio de contenido | **CORRECTION_REQUIRED** |

Candidatos extraídos: **fuera** del store. No hay draft en first slice.

---

## 18. Timestamps

| Campo | Norma |
|-------|--------|
| `created_at` | TIMESTAMPTZ, insert |
| `captured_at` | TIMESTAMPTZ; instante de registro |
| `declared_at` | TIMESTAMPTZ NULL; **solo** si la fuente lo prueba |

`created_at` ≠ `declared_at`. No inventar `declared_at`. Fechas de periodo en calendario de negocio (CDMX); instantes en TIMESTAMPTZ (convención repo).

---

## 19. Read models

Conceptual, sin endpoints:

1. Por `meeting_ref` / `source_id`
2. Por planta (`plant_id` o `event_plants`) — **authz primero**
3. Por periodo
4. Por `event_type`
5. Commitments por planta+periodo
6. Cadena CORRECTS/SUPERSEDES de un id
7. **HISTORY:** todos los events visibles
8. **CURRENT_EFFECTIVE_ATTESTATIONS:** `vigor=CURRENT` (no supersedidos)

CURRENT ≠ truth. Latest ≠ hecho. Siguen siendo `RECORDED`.

---

## 20. Authz read

Evidencia: PRE_CLOSE / ACTUAL_FINANCIAL VIEW = ZP+AD ALL_PLANTS; GG ASSIGNED; resto deny. Bitácora/AR listan por `assertPlantaAccess`.

**VIEW first slice:** reutilizar scope de planta.

- Event `PLANT` / `MULTI_PLANT`: visible si el lector puede **cada** planta listada (fail closed: si falta una, no ver el event).
- Event `ZONE` / `UNKNOWN` sin plantas: **solo** ALL_PLANTS (ZP/AD). GG no ve zona sin plantas asignables. No inventar roster zonal.

No heredar `canViewFinancialActual` ni `acceso_igf_forecast_kpis`.

---

## 21. Authz write

**`AUTHZ_DECISION_REQUIRED`.**

El contrato no congela quién puede `RECORD`.  
Bitácora/AR: write = acceso de planta a **notas/acciones**, no a atestación tipada de junta.  
ACTUAL_FINANCIAL: ZP/AD finalizan P&L; **no** se copia.

Prohibido inferir «ZP/AD pueden RECORD».  
`CONFIRM` / `APPROVE` / SUPERSEDE ajeno / `LINK_ACTION` siguen PENDING.

Por la regla de terminal de esta tarea: **STOPPED**, no IMPL.

---

## 22. Automated extraction boundary

**No** en la misma tabla. First slice = solo `RECORDED` humano.  
`EXTRACTED_CANDIDATE` = store o estado futuro. Mezclarlos violaría el contrato (transcript ≠ confirmed; LLM ≠ confirmation).

---

## 23. Transactional integrity

Atómico:

1. INSERT event
2. INSERT `event_plants` si MULTI
3. INSERT relations (CORRECTS / SUPERSEDES / REFERS_PROPOSAL)
4. UPDATE `vigor` del original si SUPERSEDES

Fallo → rollback completo. Sin event huérfano ni supersession a medias.

---

## 24. Constraints

| Constraint | |
|------------|--|
| `event_type` CHECK cinco valores | Sí |
| `attestation_state` = `RECORDED` | Sí (v1 física) |
| `raw_text` NOT NULL / no vacío | Sí |
| `captured_by_usuario_id` NOT NULL (manual) | Sí |
| `source_type` CHECK | Sí |
| DECISION ⇒ `decision_outcome` NOT NULL | Sí |
| No DECISION ⇒ outcome NULL | Sí |
| CORRECTS/SUPERSEDES ⇒ to_id existe, ≠ from_id | Sí |
| `PLANT` ⇒ `plant_id` NOT NULL | Sí |
| `MULTI_PLANT` ⇒ ≥1 `event_plants` | Sí (app + CHECK diferible) |
| `numeric_value` sin `value_mode` | Rechazar o forzar UNKNOWN |
| Periodo junta automático | Prohibido (no constraint DB; regla de servicio) |

No exigir actor user, period, metric, meeting_ref.

---

## 25. Backfill policy

**`NO_BACKFILL`**

Plaud/EVAL-003 no se importan como `RECORDED`. Haría canónico un transcript no gobernado.  
`MANUAL_CURATED_BACKFILL` solo tras AUTHZ + revisión humana, **otra** tarea.  
`CANDIDATE_ONLY_FUTURE` para ingestión Plaud.

---

## 26. EVAL-003 physical walkthrough

Periodo: UNKNOWN (no inferir 2026-08). Actor: UNKNOWN o FREE_TEXT si el packet nombra speaker. Estado: `RECORDED` si un humano lo captura después. Source: `OTHER` / packet; no Plaud runtime.

| Caso | type | statement (raw) | metric | scope | relation | NO se afirma |
|------|------|-----------------|--------|-------|----------|--------------|
| Puebla 1,177 | `PROPOSAL` | cifra intervenida | ABSOLUTE 1177 t si se registra | PLANT Puebla | — | COMMITMENT, FORECAST, FINAL |
| Acapulco +40 | `PROPOSAL` y/o `COMMITMENT` si asume | +40 / 0.50 | DELTA 40 t | PLANT Acapulco | — | venta +40; ACTION; forecast |
| Canal Acapulco | `CORRECTION` | canal mal | null | PLANT Acapulco | CORRECTS si hay event previo; si no, standalone | reconciliation Finance; truth de canal |
| Querétaro +15 | `PROPOSAL` | +15 t | DELTA 15 t | PLANT Qro | — | commitment auto |
| Qro recorte | `DECISION` pending | recorte incompleto | null | PLANT Qro | REFERS_PROPOSAL opcional | ejecutado |
| Morelos cambio | `COMMITMENT` + sucesor | cifras dichas | solo si numéricas | PLANT Morelos | SUPERSEDES | número único eterno |
| Zona +632 | **No persistir** (scenario) | — | — | — | — | COMMITMENT zonal; FINAL |

---

## 27. Council compatibility

Queries por type + HISTORY/CURRENT + scope/period/payload bastan para «qué se propuso/decidió/comprometió/corrigió». FINAL se **compone** desde month_close / ACTUAL_FINANCIAL, no se copia al event.

---

## 28. Post-close compatibility

Shape suficiente: metric/value/unit/scope/period cuando existan. Sin `FULFILLED`. Evaluación = capa futura.

---

## 29. Live-copilot compatibility

Mismo `id` canónico **después** de flujo humano → `RECORDED`. Live no escribe este store. Sin streaming.

---

## 30. IES boundary

Store de **dominio** en `arr`, no `eks`, no IES. First slice: cero writes N1. Adapter futuro = otra tarea + `IES_REVIEW`. `04` intacto.

---

## 31. G2 order

**Selección: C** — IMPL (cuando exista AUTHZ) → G2 Index/EKE/CAPACIDADES.

El contrato v1.0 **ya** es autoridad de semántica. G2 de inventario no abre runtime (LOOP: G2 = editar docs canónicos). PRE_CLOSE sincronizó docs **después** del runtime. FINANCIAL-ACTUAL indexó en G2 separado.  
G2 **no** es el siguiente gate: lo es AUTHZ de escritura.

---

## 32. First physical slice

**Selección: B** — schema conceptual + servicio mínimo create/read in-process (sin HTTP UI, sin Plaud, sin AR link).

Prueba: persist, read, history, CORRECTS/SUPERSEDES, provenance, VIEW plant-scoped.

**No IMPL hasta DECISION de RECORD.** El slice está diseñado, no autorizado.

Rechazadas: A (schema huérfano), C (API prematura), D/E/F (fuera de contrato).

---

## 33. Risks / limits

- RECORD sin DECISION = atestaciones “oficiales” por analogía con bitácora.
- `ZONE` sin roster: GG no ve; ZP ve todo el label.
- `SERIAL` no es UUID global entre sistemas.
- `vigor` cacheado mal actualizado rompe CURRENT; debe ser transaccional.
- EVAL-003 sin backfill: el store nace vacío.
- G2 pendiente no describe el contrato en el Index (navegación, no semántica).

---

## 34. Matrix impact

| | |
|--|--|
| Baseline | 10.5 / 20 = 52.5% |
| Después | 10.5 / 20 = 52.5% |
| Delta | **0.0 pp** |
| Matriz modificada | **No** |

---

## 35. Final readiness

**`STOPPED`**

| # | Output |
|---|---------|
| 1–3 | Store A; grain 1:1; SERIAL |
| 4–5 | CHECK types; state A `RECORDED` |
| 6–7 | Columnas tipadas; metric libre + numeric/unit/mode |
| 8–10 | Actor 4 modos; captured ≠ extracted; source_type |
| 11 | Meeting ref A |
| 12–13 | scope_kind + event_plants (B) |
| 14–15 | period estructurado; baseline optional |
| 16–17 | relations table; AR link D |
| 18–21 | CORRECTS; SUPERSEDES B; no hard delete; content immutable |
| 22–25 | 3 timestamps; HISTORY vs CURRENT attestation |
| 26 | VIEW planta existente |
| 27 | **WRITE = AUTHZ_DECISION_REQUIRED** |
| 28–31 | Candidatos fuera; tx atómica; constraints; NO_BACKFILL |
| 32–36 | EVAL mapeado; Consejo/post-close/live/IES domain-first |
| 37 | G2 = C (tras IMPL) |
| 38 | First slice B, bloqueado por AUTHZ |

No `READY` / `READY_WITH_LIMITS` (la regla de terminal exige STOPPED).  
No `BLOCKED` (no hay contradicción contractual).

---

## 36. Exactly one NEXT_TASK

**`DECISION-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-AUTHZ-001`**

| Campo | Valor |
|-------|--------|
| Por qué no IMPL | RECORD/WRITE no congelado; no inferir ZP/AD |
| Por qué no G2 | Inventario no desbloquea escritura |
| Alcance propuesto | Decidir VIEW (si se confirma reuso de planta) y quién puede RECORD / CORRECT propio / si GG escribe solo su planta. CONFIRM org puede seguir PENDING. No implementar |
| Autorizada | **No** |
| Ejecutada | **No** |

STOP. No commit. No push. No merge.
