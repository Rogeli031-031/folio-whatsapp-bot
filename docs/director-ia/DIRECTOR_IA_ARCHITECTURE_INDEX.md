# DIRECTOR_IA_ARCHITECTURE_INDEX.md

## Índice Maestro de Arquitectura — Director IA v2

**Tipo:** Índice de navegación y propiedad documental  
**Estado:** NORMATIVO (índice)  
**Fecha:** 2026-08-21

Este índice no redefine la Constitución. En conflicto, prevalece `docs/director-ia/DIRECTOR_IA_CONSTITUTION.md`.

---

# 1. Pipeline oficial

```
Constitution
        ↓
Executive Knowledge Engine
        ↓
Evidence Builder
        ↓
IES Standard                ← Esquema v1.0 APROBADO PARA CONGELAMIENTO (runtime pendiente)
        ↓
Reasoning Engine            ← 05 v1.0 APROBADO PARA CONGELAMIENTO (runtime pendiente)
        ↓
Interfaces / Channel Projection ← 06 v1.0 PROPUESTO PARA REVISIÓN HUMANA (runtime pendiente)
```

### Cadena operativa de entrada (antes del Evidence Builder)

```
Question Request
  → Capabilities / Veracidad (Fase 1)
  → Planner Plan (Fase 2)
  → Tool Plan (Fase 3)
  → Tool Execution Results (futuro / parcial)
  → Acquisition Status + Observation Pipeline (03A)
  → Observation Records (si hay resultado de negocio)
  → Evidence Builder → Knowledge Bundle
  → Executive Knowledge Store (03) → Knowledge Snapshot
  → Proyección IES desde Snapshot (Esquema definido; runtime pendiente)
```

Ningún bypass de capas. Ningún dato crudo llega al IES directamente. Ningún LLM en Niveles 1–4.

---

# 2. Mapa documental

| Orden | Documento | Propietario de | Estado |
|------:|-----------|----------------|--------|
| 0 | `DIRECTOR_IA_CONSTITUTION.md` | Identidad, niveles, cobertura, conflictos A–E, derechos, naturaleza IES, jerarquía | APROBADA |
| 1 | `DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md` | Gobernanza del Motor; política de cobertura/IES; modelos mentales; **política/catálogo materiality (`MAT_*`, `MATERIALITY_NOT_ASSESSED`)** | Diseño normativo |
| 2 | `02-EVIDENCE-BUILDER.md` | Ensamblaje N1–N4; ausencia afirmable; confianza mecánica; conflictos compuestos; **mecánica de materiality** (si ruleset calibrado) | APROBADO PARA DISEÑO DEL IES |
| 2a | `03A-OBSERVATION-PIPELINE.md` | ObservationRecord unificado; AcquisitionStatus (técnico; ≠ verdad empresarial / ≠ `ABSENCE_CONFIRMED`); pipeline de adquisición; resolución de entidades | Contrato operativo |
| 3 | `03-EXECUTIVE-KNOWLEDGE-STORE.md` | Persistencia append-only del Knowledge Bundle; Knowledge Snapshot | Contrato de almacén; runtime mínimo integrado (no COMPLETE constitucional) |
| 3b | `03B-END-TO-END-REFERENCE-FLOWS.md` | Flujos de referencia end-to-end (Casos A/B) | Validación contractual |
| 4 | `04-IES-STANDARD.md` | Esquema de producto IES | IES v1.0 APROBADO PARA CONGELAMIENTO |
| 5 | `05-REASONING-ENGINE.md` | Nivel 5 — hipótesis/inferencia subordinada al IES; Reasoning Result / Run | **v1.0** — REASONING ENGINE v1.0 APROBADO PARA CONGELAMIENTO; **runtime PENDIENTE** |
| 6 | `06-CHANNEL-PROJECTION.md` | Interfaces; proyección semántica pura; Projection Model; `projection_depth` L0–L3 | **v1.0** — PROPUESTO PARA REVISIÓN HUMANA; **runtime PENDIENTE**; no congelado |
| — | `DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md` | Inventario de fuentes | Complemento |
| F1 | `DIRECTOR_IA_V2_FASE_1_VERACIDAD.md` | Catálogo/veracidad (entrada) | Código soporte parcial |
| F2 | `DIRECTOR_IA_V2_FASE_2_PLANNER.md` | Plan de intents/dominios (entrada) | Código soporte parcial |
| F3 | `DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md` | Tool Plan declarativo (entrada) | Código soporte parcial |

---

# 3. Tabla maestra (código relacionado / soporte parcial)

| Capa / documento | Código relacionado / soporte parcial | ¿Implementa Constitución / EKE / Evidence Builder? |
|------------------|--------------------------------------|-----------------------------------------------------|
| Constitución | Ninguno | N/A (norma) |
| Executive Knowledge Engine | Ninguno | **No** — solo diseño |
| Evidence Builder | Ninguno (runtime pendiente) | **No** — solo especificación |
| Observation Pipeline (03A) | Ninguno (runtime pendiente) | **No** |
| Executive Knowledge Store (03) | `lib/director-ia-eks.js`; `sql/015_director_ia_eks.sql`; `createEksRuntime`; ciclo dashboard | Runtime mínimo integrado y validado en producción; **no** COMPLETE constitucional (`query_context_metadata` no persistido en PG); **no** implementa Constitución / EKE / Evidence Builder |
| IES Standard | Ninguno (runtime pendiente) | **No** — especificación escrita; runtime pendiente |
| Reasoning Engine (`05`) | Chat legado (fuera del contrato N5 oficial; proveedor no normativo) | **No** — contrato congelado; runtime pendiente |
| Channel Projection (`06`) | Ninguno (runtime pendiente) | **No** — contrato propuesto; runtime pendiente |
| Capabilities (Fase 1) | `lib/director-ia-capabilities.js` + early-return en chat | **No** implementa Constitución, EKE ni Evidence Builder. Solo soporte parcial de veracidad/catálogo. |
| Planner (Fase 2) | `lib/director-ia-planner.js` (debug en chat) | **No** implementa Constitución, EKE ni Evidence Builder. Solo produce Plan. |
| Tool Orchestrator (Fase 3) | `lib/director-ia-tools.js`, `lib/director-ia-tool-orchestrator.js` (debug) | **No** implementa Constitución, EKE ni Evidence Builder. Solo declara Tool Plan; no ejecuta. |
| Chat / UI legado | `lib/director-ia-chat.js`, módulos frontend | Soporte parcial de producto; **no** es el pipeline N1–N4→IES |

### Declaración explícita (obligatoria)

**Capabilities, Planner y Tool Orchestrator no implementan todavía la Constitución, el Executive Knowledge Engine ni el Evidence Builder.**  
Son productores de *entrada* (catálogo, Plan, Tool Plan). El ensamblaje N1–N4, el Knowledge Bundle y el runtime del IES permanecen pendientes de implementación conforme a los documentos propietarios.

La columna anterior se denomina **“Código relacionado / soporte parcial”** (no “Implementación en código”), para evitar sugerir conformidad constitucional completa.

---

# 4. Propiedad de contratos clave

| Contrato | Documento propietario |
|----------|------------------------|
| ObservationRecord (campos unificados) | `03A-OBSERVATION-PIPELINE.md` |
| AcquisitionStatus | `03A-OBSERVATION-PIPELINE.md` (técnico; no determina verdad empresarial) |
| Regla de afirmación de ausencia (`ABSENCE_CONFIRMED`) | `02-EVIDENCE-BUILDER.md` (EB aplica; OP no determina; **≠** AcquisitionStatus) |
| Tipificación `DATA_NOT_FOUND` / elevación a ausencia | `02-EVIDENCE-BUILDER.md` §10 |
| Knowledge Coverage (`CONOZCO`…`NO_CONOZCO`) | Constitución (estados) + Motor §9 (política/agregación); EB aplica; EKS persiste; IES proyecta `COV_*` |
| Tokens `COV_*` | `04-IES-STANDARD.md` (proyección 1:1 de los cuatro estados constitucionales; sin quinto estado) |
| Knowledge Bundle | `03-EXECUTIVE-KNOWLEDGE-STORE.md` (forma persistida); producido por Evidence Builder |
| Knowledge Snapshot | `03-EXECUTIVE-KNOWLEDGE-STORE.md` |
| Confianza Fs/R/Cb/Cs/Cb_ov | Constitución (epistemología) + Evidence Builder (mecánica; `k`/`wi` pendientes) |
| Materiality (`MAT_*` / `MATERIALITY_NOT_ASSESSED`) | Motor §7A (política/catálogo); Evidence Builder §11B (asignación mecánica si ruleset); EKS solo persiste; IES solo proyecta; RE/canal solo consumen |
| Producto IES | `04-IES-STANDARD.md` bajo Constitución IX |
| Reasoning Engine (N5) / Reasoning Result / Reasoning Run | `05-REASONING-ENGINE.md` (v1.0 congelado; no escribe EKS/IES; almacén Run pendiente) |
| Channel Projection | `06-CHANNEL-PROJECTION.md` (v1.0 propuesto; no congelado; runtime pendiente; no escribe IES/RE; sin autoridad epistemológica) |

---

# 5. Invariantes del índice

1. No hay implementación constitucionalmente completa del Motor/Evidence Builder/OP/IES/RE oficial en código productivo de ensamblaje. El EKS tiene runtime mínimo persistente integrado (`lib/director-ia-eks.js`, schema `015`, ciclo productivo); no se declara COMPLETE constitucional (deuda: `query_context_metadata` no persistido en PG). Esta fila no re-declara runtime de OP/EB/IES/RE/CP.
2. Fases 1–3 = soporte parcial de entrada, no sustitutos del pipeline.
3. El EKS recibe Knowledge Bundle N1–N4 (no solo observaciones).
4. El IES consume Knowledge Snapshot, no fuentes operacionales.
5. `NO_CONOZCO` es resultado válido, no error arquitectónico.
6. El Reasoning Engine consume IES; no modifica IES/Bundle/Snapshot; no es fuente de verdad.

---

# Control documental

| Campo | Valor |
|-------|--------|
| Documento | `DIRECTOR_IA_ARCHITECTURE_INDEX.md` |
| Versión | 1.8 |
| Estado | APROBADO COMO ÍNDICE (incluye `05` v1.0 congelado; `06` v1.0 propuesto, no congelado; EKS runtime mínimo sincronizado, no COMPLETE constitucional) |
| Dependencia | Constitución; EKE; Evidence Builder; 03; 03A; 03B; 04; 05; 06 |
| Implementación del pipeline completo | PENDIENTE |
