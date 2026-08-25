# FINANCIAL-ACTUAL-EVIDENCE-CONTRACT

## Contrato de evidencia de dominio — ACTUAL_FINANCIAL / FINANCIAL_ACTUAL

**Documento:** `docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md`  
**Versión:** 1.0  
**Estado:** FINANCIAL-ACTUAL-EVIDENCE-CONTRACT v1.0 — creado bajo G3 autorizado (`DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-EVIDENCE-CONTRACT-001`). Sin runtime. Sin schema. Sin `is_final`. Sin autoridad epistemológica sobre IES/RE.  
**Tipo:** Contrato de evidencia de dominio. **No** es capa de pipeline. **No** es `07`.  
**Orden futuro en Index:** `—` (como `DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md`).

Fuente normativa transcrita: `docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-EVIDENCE-CONTRACT-001.md`. Este archivo no rediseña esa arquitectura.

### Dependencia normativa

| Documento | Rol |
|-----------|-----|
| `docs/director-ia/DIRECTOR_IA_CONSTITUTION.md` | Norma superior. Este contrato **no** la modifica. VII: declara cómo se observa ACTUAL_FINANCIAL y que **aún no alimenta IES**. VIII: ningún «resultado real» sin evidencia FINANCE_PROVIDED de una versión `FINAL`. |
| `docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md` | Política del Motor. Este contrato **no** edita EKE. G2 posterior (§7 Financiero) distinguirá FORECAST vs ACTUAL_FINANCIAL. `NOT_FINAL` ≠ `NO_CONOZCO`. |
| `docs/director-ia/02-EVIDENCE-BUILDER.md` | Compatible. No se toca. Observation ya tiene `source.system` / lineage. |
| `docs/director-ia/03A-OBSERVATION-PIPELINE.md` | Compatible. No se toca. |
| `docs/director-ia/04-IES-STANDARD.md` | **IES v1.0 APROBADO PARA CONGELAMIENTO.** Este contrato **no** lo modifica ni añade campo de producto. |
| `docs/director-ia/05-REASONING-ENGINE.md` | **RE v1.0 APROBADO PARA CONGELAMIENTO.** Este contrato **no** lo modifica. RE no es fuente de verdad; no infiere FINAL. |
| `docs/director-ia/06-CHANNEL-PROJECTION.md` | Este contrato no es interfaz ni Channel Projection. |
| `docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md` | Índice. G2 posterior indexará este archivo como `—`. Este contrato **no** modifica el índice. |
| `docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md` | Inventario. G2 posterior. Este contrato **no** lo modifica. |

En conflicto, prevalece la Constitución.  
Este documento **no modifica** Constitución, `04` ni `05`.  
**No** redefine N1–N5. **No** alimenta el IES oficial. **No** implementa runtime.

---

## 0. Alcance

Gobierna la clase de evidencia **ACTUAL_FINANCIAL** / **FINANCIAL_ACTUAL**.

No crea fuente. No crea schema. No añade `is_final`. No toca runtime.

Fuente física: `igf.versions` + `igf.compromiso_lines`. Owner: **FINANZAS**.

Grain: versión `GLOBAL` + fila `empresa`. Un `FINAL` por YYYY-MM. No hay FINAL por planta separado.

---

## 1. Orígenes de campo (normativos)

| Origen | Definición |
|--------|------------|
| **FINANCE_PROVIDED** | Valor físicamente presente en el artefacto de Finanzas (celda persistida en `compromiso_lines`) de una versión identificada, con periodo, versión y provenance. |
| **ARR_ACTUAL** | Actual comercial canónico (ARR). Planta y grano de fecha/periodo exactos. |
| **RUNTIME_COMPUTED** | Valor calculado, sustituido, overlay, agregado o transformado **después** de la ingestión (GET, PROY, Folios, presupuesto, `recalcularUtilYResultado`, PATCH que reescribe). |
| **DERIVED** | Modelo/cálculo (`forecast_mensual` u homólogo). Distinto de actual. |

`FINAL` sella la **versión de evidencia**. **No** convierte RUNTIME_COMPUTED en FINANCE_PROVIDED.

Prohibido: «Finanzas cerró con resultado X» si X es recálculo GET. Admitido: «Con datos finales de Finanzas y ARR, el sistema calculó X» — X sigue RUNTIME_COMPUTED.

---

## 2. Clases de verdad

| Clase | Fuente | No es |
|-------|--------|-------|
| ACTUAL_COMMERCIAL | ARR | ACTUAL_FINANCIAL |
| TARGET_COMMITMENT | `igf_meta` | actual / forecast |
| FORECAST | IGF no `FINAL` (mes abierto o versión no designada) | actual |
| ACTUAL_FINANCIAL | Solo FINANCE_PROVIDED de la versión `FINAL` vigente del YYYY-MM + `empresa` autorizada | overlay, PROY, Folios, latest, meta |
| DERIVED_MODEL | `forecast_mensual` | actual / target |

Invariantes: las cinco clases no se relabelan.

- `is_current` ≠ `FINAL`
- latest ≠ `FINAL`
- mes transcurrido ≠ `FINAL`
- ARR completo ≠ `FINAL`
- `FINAL` es explícito
- `ACTUAL_COMMERCIAL` ≠ `ACTUAL_FINANCIAL`
- `TARGET_COMMITMENT` ≠ `ACTUAL_FINANCIAL`
- `FORECAST` ≠ `ACTUAL_FINANCIAL`
- `DERIVED_MODEL` ≠ `ACTUAL_FINANCIAL`
- Missing ACTUAL_FINANCIAL **no** cae a FORECAST ni a TARGET

---

## 3. Definición de ACTUAL_FINANCIAL

Campos **FINANCE_PROVIDED** de la fila `compromiso_lines` de la única versión `FINAL` no `SUPERSEDED` de ese YYYY-MM, para la identidad canónica autorizada.

No incluye: GET displayed, PROY, Folios, overlays, util/resultado recalculados, `forecast_mensual`, `igf_meta`, latest no `FINAL`.

---

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

---

## 5. Máquina de estados

| Estado | Significado |
|--------|-------------|
| FORECAST | Versión de Finanzas usable como vista/plan. No es cierre autoritativo. |
| FINAL | Designación **explícita** (proceso FINANZAS) de que esa versión es el cierre autoritativo del YYYY-MM. |
| SUPERSEDED | Fue FINAL; sustituida por corrección FINAL posterior. Histórico. No es el default. |

Transiciones **prohibidas**: FORECAST→FINAL por tiempo, por `is_current`, por último día ARR, o por latest. SUPERSEDED→autoritativo sin nueva designación explícita.

Autoridad de designar FINAL: proceso **FINANZAS**. El rol/permiso de aplicación es **AUTHZ_DECISION_REQUIRED** (no se inventa aquí).

A lo más un FINAL vigente por YYYY-MM (GLOBAL).

---

## 6. Corrección y supersession

1. Corrección = **nueva** versión (no UPDATE destructivo del histórico).
2. Nueva se designa FINAL.
3. FINAL anterior → SUPERSEDED.
4. Lectura default = FINAL vigente.
5. SUPERSEDED consultable.
6. Provenance e historia de finalización se conservan.

---

## 7. Inmutabilidad y PATCH HG

Cualquier mutación (incluido `PATCH /api/dashboard/igf-forecast` que hoy reescribe `hg_*` y util/resultado **en la misma fila**) **no puede alterar en silencio** evidencia FINANCE_PROVIDED de versiones `FINAL` o `SUPERSEDED`.

Este contrato **no** implementa el bloqueo. Lo exige antes de runtime de actual.

---

## 8. Provenance mínima

Obligatorio en toda afirmación material: `truth_class`, `source_owner`, tipo de artefacto, identidad canónica, YYYY-MM, identidad de versión, estado de finalización, `finalized_at` si FINAL, autoridad/proceso, **field origin**.

Opcional si existe físicamente: `created_at`/upload, filename, hash, referencia a versión SUPERSEDED.

`created_at` = timestamp de carga. **No** es fecha efectiva de negocio salvo prueba explícita.

---

## 9. Reconciliación

ARR = ACTUAL_COMMERCIAL canónico. No se pisa con `venta_ton` Excel.

Si FINANCE_PROVIDED (p. ej. venta) contradice ARR del mismo periodo: `FINANCIAL_ACTUAL_RECONCILIATION_GAP`. Se conservan ambos y ambas cadenas. GPT no elige.

---

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

El inventario puede seguir diciendo `FINANCIAL_ACTUAL_UNSUPPORTED` hasta el G2 de CAPACIDADES.

---

## 11. Histórico

Versiones previas son registros inmutables. Permitido: comparar FORECAST/SUPERSEDED vs FINAL; TARGET vs FORECAST vs FINAL si hay provenance.

Prohibido afirmar «as of 15 de agosto» solo porque `created_at` es el 15.

---

## 12. Restricciones de razonamiento

El razonamiento (chat legado o N5 futuro) puede sintetizar y calcular comparaciones **etiquetadas**.

No puede: promover clase de verdad; inferir FINAL; inferir causa desde gap o coincidencia temporal; omitir limitation.

N5 oficial (`05`) no se modifica. Hasta mapeo IES, el dominio actual financiero no entra a N1–N5; no se hipotetiza utilidad real desde FORECAST o NOT_FINAL.

---

## 13. Autorización (límite, no matriz)

**AUTHZ_DECISION_REQUIRED.**

`acceso_igf_forecast_kpis` **no** concede P&L / ACTUAL_FINANCIAL.

Fail closed; una planta; sin cross-plant. El contrato carga la **clasificación** (forecast vs actual). No inventa roles.

Esto **no** bloquea G3. **Sí** bloquea exposición runtime de P&L actual.

---

## 14. Límite IES

ACTUAL_FINANCIAL **aún no alimenta** el IES oficial.

Este contrato define solo la semántica de evidencia de dominio. Una integración futura debe obedecer Constitución / EKE / Evidence Builder / IES. Hasta entonces no se descongela `04` ni `05`.

---

## 15. Implementation gate (este contrato no lo abre)

Cerrado hasta:

1. Este archivo v1.0 congelado por humano G3
2. G2 Index
3. G2 EKE §7 Financiero
4. G2 inventario `CAPACIDADES_Y_FUENTES`
5. Decisión AUTHZ **antes de exponer** actual en runtime

Sin schema, `is_final`, VBA, loader, permisos ni `month_close_result` por este documento.

G2 posteriores **no** forman parte de este archivo.

---

# Control documental

| Campo | Valor |
|-------|--------|
| Documento | `FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md` |
| Versión | 1.0 |
| Estado | Creado bajo G3 autorizado; sin runtime; IES no alimentado |
| Tipo | Contrato de evidencia de dominio |
| Orden Index (futuro G2) | `—` |
| Dependencia | Constitución; EKE; compatible con `02`, `03A`, `04` congelado, `05` congelado |
| Implementación | PROHIBIDA hasta gates G2 + AUTHZ de exposición |
