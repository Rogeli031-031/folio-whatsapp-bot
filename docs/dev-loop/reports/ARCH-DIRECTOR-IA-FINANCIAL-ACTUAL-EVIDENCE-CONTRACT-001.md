# Reporte — ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-EVIDENCE-CONTRACT-001

```yaml
task_id: "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-EVIDENCE-CONTRACT-001"
outcome: "DONE_PENDING_REVIEW"
mode: "ARCHITECTURE_CONTRACT_ONLY"
implementation: false
schema: false
is_final_column: false
runtime: false
constitution_modified: false
ies_04_modified: false
re_05_modified: false
g3_file_created: false
readiness: "READY_WITH_LIMITS"
g3_document_path: "docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md"
g3_document_version: "v1.0"
g3_index_order: "em-dash — not 07"
authz: "AUTHZ_DECISION_REQUIRED"
authz_blocks_g3: false
authz_blocks_runtime_exposure: true
g2_sync_after_g3:
  - "DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md §7 Financiero"
  - "DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
implementation_gate_closed: true
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "This contract task does not measure modules. 0.0 pp."
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-EVIDENCE-CONTRACT-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "test/"
  - "sql/"
  - "server.js"
  - "vba/"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-EVIDENCE-CONTRACT-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "G3 de la NEXT_TASK lo autoriza solo el humano."
  - "AUTHZ_DECISION_REQUIRED antes de exponer P&L actual en runtime. No bloquea G3."
  - "52.5% no cambia (0.0 pp)."
```

## Respuesta inequívoca

**DONE_PENDING_REVIEW.** Contrato normativo diseñado. Archivo G3 **no** creado (fuera de `writable`).

**Ubicación G3 (convención del índice, sin inventar `07`):**

`docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md` — **v1.0**

Orden en el índice: **`—`** (como `DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md`). **No** es capa de pipeline. **No** es `07`.

Compatible con Constitución / `04` / `05` congelados. No se reabren.

**AUTHZ_DECISION_REQUIRED** se mantiene. No inventa roles. No bloquea G3. **Sí** bloquea exposición runtime de P&L actual.

**NEXT_TASK (primer gate):** `DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-EVIDENCE-CONTRACT-001` — escribir y congelar el archivo G3. Sin Index, EKE, inventario, schema, runtime.

---

## Ejecución

- Rama: `architecture/director-ia-financial-actual-evidence-contract-001` (≠ `main`).
- HEAD: `dab73a87 Merge branch 'architecture/director-ia-financial-actual-source-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-25`. Solo se cambió `status`.
- Inspección read-only: Constitución, EKE, `02`, `03A`, `03B`, `04`, `05`, `06`, Index, inventario. Sin cambios en `docs/director-ia/`.

---

## Compatibilidad y subordinación

Cadena del índice (no se inserta una capa nueva):

```
Constitution → EKE → EB → IES (04 congelado) → RE (05 congelado) → 06
```

Este contrato es **evidencia de dominio**. Se subordina a Constitución y EKE. No escribe IES. No es N5. No es Channel Projection. Chat legado no es pipeline N1–N5 (`03B`: SAP/ledger = FICTICIO).

| Norma | Relación |
|-------|----------|
| Constitución VII | Cumplida por **declaración**: cómo se observa ACTUAL_FINANCIAL y que **aún no alimenta IES**. No se edita la Constitución. |
| Constitución VIII | Ningún «resultado real» sin evidencia FINANCE_PROVIDED de una versión `FINAL`. |
| EKE §7 Financiero | Hoy «ARR, IGF, margen, forecast». G2 posterior distingue FORECAST vs ACTUAL_FINANCIAL. `NOT_FINAL` ≠ `NO_CONOZCO` (la fuente existe). |
| `04` | Congelado. Sin campo de producto nuevo. IES sigue sin este dominio hasta G2 futuro. |
| `05` | Congelado. RE no es fuente de verdad; no infiere FINAL. Este contrato añade restricciones al chat legado **sin** editar `05`. |
| `02` / `03A` | Observation ya tiene `source.system` / lineage. Campos FINAL cuando exista path N1. No se tocan ahora. |
| Inventario | Hoy `financial.actual = UNSUPPORTED_METRIC`. G2 posterior: SUPPORTED solo si `FINAL`. |

**No BLOCKED.** No hay contradicción que fuerce reabrir `04`/`05`.

---

## Ubicación G3 (auditoría de convenciones)

El índice numera **solo** el pipeline: `0` Constitución, `1` EKE, `2`/`2a` EB/03A, `3`/`3b` EKS/03B, `4` IES, `5` RE, `6` Channel Projection. El inventario es `—`.

Asignar `07-…` **inventaría** una capa posterior a 06. Este contrato no es interfaz ni N6.

| Campo | Valor |
|-------|--------|
| Nombre | FINANCIAL-ACTUAL-EVIDENCE-CONTRACT |
| Versión | v1.0 |
| Ruta | `docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md` |
| Orden índice (G2 posterior) | `—` |
| Estado al congelar | PROPUESTO → APROBADO/CONGELADO solo por humano G3 |
| Tipo | Contrato de evidencia de dominio; sin autoridad epistemológica sobre IES/RE |

El texto normativo de las secciones siguientes es el **contenido** que la NEXT_TASK G3 debe transcribir. Esta tarea no crea el archivo.

---

# Contrato normativo (contenido G3 v1.0)

## 0. Alcance

Gobierna la clase de evidencia **ACTUAL_FINANCIAL** / **FINANCIAL_ACTUAL**.

No crea fuente. No crea schema. No añade `is_final`. No toca runtime.

Fuente física: `igf.versions` + `igf.compromiso_lines`. Owner: **FINANZAS**.

Grain: versión `GLOBAL` + fila `empresa`. Un `FINAL` por YYYY-MM. No hay FINAL por planta separado.

## 1. Orígenes de campo (normativos)

| Origen | Definición |
|--------|------------|
| **FINANCE_PROVIDED** | Valor físicamente presente en el artefacto de Finanzas (celda persistida en `compromiso_lines`) de una versión identificada, con periodo, versión y provenance. |
| **ARR_ACTUAL** | Actual comercial canónico (ARR). Planta y grano de fecha/periodo exactos. |
| **RUNTIME_COMPUTED** | Valor calculado, sustituido, overlay, agregado o transformado **después** de la ingestión (GET, PROY, Folios, presupuesto, `recalcularUtilYResultado`, PATCH que reescribe). |
| **DERIVED** | Modelo/cálculo (`forecast_mensual` u homólogo). Distinto de actual. |

`FINAL` sella la **versión de evidencia**. **No** convierte RUNTIME_COMPUTED en FINANCE_PROVIDED.

Prohibido: «Finanzas cerró con resultado X» si X es recálculo GET. Admitido: «Con datos finales de Finanzas y ARR, el sistema calculó X» — X sigue RUNTIME_COMPUTED.

## 2. Clases de verdad

| Clase | Fuente | No es |
|-------|--------|-------|
| ACTUAL_COMMERCIAL | ARR | ACTUAL_FINANCIAL |
| TARGET_COMMITMENT | `igf_meta` | actual / forecast |
| FORECAST | IGF no `FINAL` (mes abierto o versión no designada) | actual |
| ACTUAL_FINANCIAL | Solo FINANCE_PROVIDED de la versión `FINAL` vigente del YYYY-MM + `empresa` autorizada | overlay, PROY, Folios, latest, meta |
| DERIVED_MODEL | `forecast_mensual` | actual / target |

Invariantes: las cinco clases no se relabelan. `is_current` ≠ `FINAL`. latest ≠ `FINAL`. mes transcurrido ≠ `FINAL`. ARR completo ≠ `FINAL`. `FINAL` es explícito. Missing ACTUAL_FINANCIAL **no** cae a FORECAST ni a TARGET.

## 3. Definición de ACTUAL_FINANCIAL

Campos **FINANCE_PROVIDED** de la fila `compromiso_lines` de la única versión `FINAL` no `SUPERSEDED` de ese YYYY-MM, para la identidad canónica autorizada.

No incluye: GET displayed, PROY, Folios, overlays, util/resultado recalculados, `forecast_mensual`, `igf_meta`, latest no `FINAL`.

## 4. Catálogo de origen (referencia física; no schema)

| Campo | Stored Excel | GET / runtime | Origen si se afirma ACTUAL_FINANCIAL |
|-------|--------------|---------------|--------------------------------------|
| `venta_ton` stored | sí | — | FINANCE_PROVIDED |
| `venta_ton` GET cerrado | — | ARR sum | ARR_ACTUAL |
| `venta_ton` GET abierto | — | PROY | RUNTIME_COMPUTED |
| `com_desc_kg` stored / GET cerrado | sí | se deja | FINANCE_PROVIDED |
| `com_desc_kg` GET abierto | — | PROY | RUNTIME_COMPUTED |
| `margen_kg` | sí | no pisa | FINANCE_PROVIDED |
| `gasto_kg` stored | sí | — | FINANCE_PROVIDED |
| `gasto_kg` GET | — | presupuesto+folios | RUNTIME_COMPUTED |
| `impuesto_kg` | sí | no pisa | FINANCE_PROVIDED |
| `hg_*` stored | sí | PATCH puede mutar | FINANCE_PROVIDED solo si no mutada post-carga |
| `bancos_planta_kg` | sí | no pisa | FINANCE_PROVIDED |
| `provision_planta_kg` | sí | no pisa | FINANCE_PROVIDED |
| `util_oper_*` stored / `*_igf` | sí | shadow | FINANCE_PROVIDED |
| `util_oper_*` GET | — | recálculo | RUNTIME_COMPUTED |
| `gtos_apoyos_corp_kg` | sí | no folios | FINANCE_PROVIDED |
| `bancos_corp_kg` | sí | no pisa | FINANCE_PROVIDED |
| `otros_programas_kg` | sí | no pisa | FINANCE_PROVIDED |
| `inversiones_kg` mes pasado stored | sí | se deja | FINANCE_PROVIDED |
| `inversiones_kg` GET mes actual | — | Folios | RUNTIME_COMPUTED |
| `resultado_final_*` stored / `*_igf` | sí | shadow | FINANCE_PROVIDED |
| `resultado_final_*` GET | — | recálculo | RUNTIME_COMPUTED |

## 5. Máquina de estados

| Estado | Significado |
|--------|-------------|
| FORECAST | Versión de Finanzas usable como vista/plan. No es cierre autoritativo. |
| FINAL | Designación **explícita** (proceso FINANZAS) de que esa versión es el cierre autoritativo del YYYY-MM. |
| SUPERSEDED | Fue FINAL; sustituida por corrección FINAL posterior. Histórico. No es el default. |

Transiciones **prohibidas**: FORECAST→FINAL por tiempo, por `is_current`, por último día ARR, o por latest. SUPERSEDED→autoritativo sin nueva designación explícita.

Autoridad de designar FINAL: proceso **FINANZAS**. El rol/permiso de aplicación es **AUTHZ_DECISION_REQUIRED** (no se inventa aquí).

A lo más un FINAL vigente por YYYY-MM (GLOBAL).

## 6. Corrección y supersession

1. Corrección = **nueva** versión (no UPDATE destructivo del histórico).
2. Nueva se designa FINAL.
3. FINAL anterior → SUPERSEDED.
4. Lectura default = FINAL vigente.
5. SUPERSEDED consultable.
6. Provenance e historia de finalización se conservan.

## 7. Inmutabilidad y PATCH HG

Cualquier mutación (incluido `PATCH /api/dashboard/igf-forecast` que hoy reescribe `hg_*` y util/resultado **en la misma fila**) **no puede alterar en silencio** evidencia FINANCE_PROVIDED de versiones `FINAL` o `SUPERSEDED`.

Esta tarea **no** implementa el bloqueo. El contrato lo exige antes de runtime de actual.

## 8. Provenance mínima

Obligatorio en toda afirmación material: `truth_class`, `source_owner`, tipo de artefacto, identidad canónica, YYYY-MM, identidad de versión, estado de finalización, `finalized_at` si FINAL, autoridad/proceso, **field origin**.

Opcional si existe físicamente: `created_at`/upload, filename, hash, referencia a versión SUPERSEDED.

`created_at` = timestamp de carga. **No** es fecha efectiva de negocio salvo prueba explícita.

## 9. Reconciliación

ARR = ACTUAL_COMMERCIAL canónico. No se pisa con `venta_ton` Excel.

Si FINANCE_PROVIDED (p. ej. venta) contradice ARR del mismo periodo: `FINANCIAL_ACTUAL_RECONCILIATION_GAP`. Se conservan ambos y ambas cadenas. GPT no elige.

## 10. Ausencias

| Código | Significado | No es |
|--------|-------------|-------|
| `FINANCIAL_ACTUAL_MISSING_FOR_PERIOD` | No hay versión de ese YYYY-MM | 0; unauthorized |
| `FINANCIAL_ACTUAL_NOT_FINAL` | Hay versión(es); ninguna FINAL | forecast |
| `FINANCIAL_ACTUAL_VERSION_AMBIGUOUS` | Más de un FINAL o designación incompleta | missing |
| `FINANCIAL_ACTUAL_SOURCE_UNAVAILABLE` | Fallo técnico de lectura de la fuente física | missing de negocio |
| `FINANCIAL_ACTUAL_RECONCILIATION_GAP` | Conflicto ARR vs Finanzas | elección de un número |
| `FINANCIAL_ACTUAL_UNAUTHORIZED` | Fail closed / sin permiso de P&L actual | missing |

missing ≠ 0. not_final ≠ forecast. unauthorized ≠ missing.

Hoy el inventario puede seguir diciendo `FINANCIAL_ACTUAL_UNSUPPORTED` hasta el G2 de CAPACIDADES.

## 11. Histórico

Versiones previas son registros inmutables. Permitido: comparar FORECAST/SUPERSEDED vs FINAL; TARGET vs FORECAST vs FINAL si hay provenance.

Prohibido afirmar «as of 15 de agosto» solo porque `created_at` es el 15.

## 12. Restricciones de razonamiento

El razonamiento (chat legado o N5 futuro) puede sintetizar y calcular comparaciones **etiquetadas**.

No puede: promover clase de verdad; inferir FINAL; inferir causa desde gap o coincidencia temporal; omitir limitation.

N5 oficial (`05`) no se modifica. Hasta mapeo IES, el dominio actual financiero no entra a N1–N5; no se hipotetiza utilidad real desde FORECAST o NOT_FINAL.

## 13. Autorización (límite, no matriz)

**AUTHZ_DECISION_REQUIRED.**

`acceso_igf_forecast_kpis` **no** concede P&L / ACTUAL_FINANCIAL.

Fail closed; una planta; sin cross-plant. El contrato carga la **clasificación** (forecast vs actual). No inventa roles.

---

## Plan G2 (después de G3 congelado)

No se ejecuta en esta tarea.

| Orden | Documento | Sync exacto |
|------:|-----------|-------------|
| 1 | `DIRECTOR_IA_ARCHITECTURE_INDEX.md` | Fila `—` + propiedad: este contrato es dueño de ACTUAL_FINANCIAL / estados FINAL / origen de campo. El índice no redefine. |
| 2 | EKE §7 Financiero (~L265–270) | Distinguir IGF FORECAST vs ACTUAL_FINANCIAL. `NOT_FINAL` ≠ `NO_CONOZCO`. Sin reabrir política IES. |
| 3 | `DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md` | `month_close_result` / `pre_meeting` / clases (~L1005–1064, L1952–1960, L2646, L2710, L2753): `financial.actual` SUPPORTED **solo** si FINAL; cinco clases; gap codes; no fallback. |

`04` / `05` / Constitución: **fuera** de este G2.

---

## Implementation gate

Cerrado hasta:

1. G3: archivo v1.0 congelado por humano
2. G2 Index
3. G2 EKE §7
4. G2 inventario
5. Decisión AUTHZ **antes de exponer** actual en runtime

Sin schema, `is_final`, VBA, loader, permisos ni `month_close_result` antes.

---

## Readiness

**READY_WITH_LIMITS:** contrato diseñado; G3 aún no escrito en `docs/director-ia/`; AUTHZ pendiente para runtime.

No STOPPED: no hace falta otra decisión humana para **redactar** G3.

No BLOCKED: compatible con `04`/`05`.

---

## Porcentaje

10.5 / 20 = **52.5%**. **0.0 pp.**

---

## NEXT_TASK (exactamente una; primer gate; no autorizada; no ejecutada)

`DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-EVIDENCE-CONTRACT-001`

Crear y congelar (G3 humano) `docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md` v1.0 con el texto normativo de este reporte. Sin Index, EKE, inventario, schema, runtime.

No autorizar. No ejecutar.

STOP.
