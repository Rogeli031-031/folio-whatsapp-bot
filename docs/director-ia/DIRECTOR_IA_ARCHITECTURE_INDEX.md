# DIRECTOR_IA_ARCHITECTURE_INDEX.md

## Índice Maestro de Arquitectura — Director IA v2

**Tipo:** Índice de navegación y propiedad documental  
**Estado:** NORMATIVO (índice)  
**Fecha:** 2026-08-05

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
IES                         ← pendiente (04-IES-STANDARD)
        ↓
Reasoning Engine            ← pendiente
        ↓
Interfaces                  ← pendiente
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
  → [Futuro] proyección IES desde Snapshot
```

Ningún bypass de capas. Ningún dato crudo llega al IES directamente. Ningún LLM en Niveles 1–4.

---

# 2. Mapa documental

| Orden | Documento | Propietario de | Estado |
|------:|-----------|----------------|--------|
| 0 | `DIRECTOR_IA_CONSTITUTION.md` | Identidad, niveles, cobertura, conflictos A–E, derechos, naturaleza IES, jerarquía | APROBADA |
| 1 | `DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md` | Gobernanza del Motor; política de cobertura/IES; modelos mentales | Diseño normativo |
| 2 | `02-EVIDENCE-BUILDER.md` | Ensamblaje N1–N4; ausencia afirmable; confianza mecánica; conflictos compuestos | APROBADO PARA DISEÑO DEL IES |
| 2a | `03A-OBSERVATION-PIPELINE.md` | ObservationRecord unificado; AcquisitionStatus; pipeline de adquisición; resolución de entidades | Contrato operativo |
| 3 | `03-EXECUTIVE-KNOWLEDGE-STORE.md` | Persistencia append-only del Knowledge Bundle; Knowledge Snapshot | Contrato de almacén |
| 3b | `03B-END-TO-END-REFERENCE-FLOWS.md` | Flujos de referencia end-to-end (Casos A/B) | Validación contractual |
| 4 | `04-IES-STANDARD` *(pendiente)* | Esquema de producto IES | No creado |
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
| Executive Knowledge Store (03) | Ninguno (runtime pendiente) | **No** |
| IES Standard | Ninguno | **No** — no diseñado aún |
| Reasoning Engine | OpenAI solo en chat legado (fuera de N1–N4 oficiales) | **No** como capa constitucional |
| Capabilities (Fase 1) | `lib/director-ia-capabilities.js` + early-return en chat | **No** implementa Constitución, EKE ni Evidence Builder. Solo soporte parcial de veracidad/catálogo. |
| Planner (Fase 2) | `lib/director-ia-planner.js` (debug en chat) | **No** implementa Constitución, EKE ni Evidence Builder. Solo produce Plan. |
| Tool Orchestrator (Fase 3) | `lib/director-ia-tools.js`, `lib/director-ia-tool-orchestrator.js` (debug) | **No** implementa Constitución, EKE ni Evidence Builder. Solo declara Tool Plan; no ejecuta. |
| Chat / UI legado | `lib/director-ia-chat.js`, módulos frontend | Soporte parcial de producto; **no** es el pipeline N1–N4→IES |

### Declaración explícita (obligatoria)

**Capabilities, Planner y Tool Orchestrator no implementan todavía la Constitución, el Executive Knowledge Engine ni el Evidence Builder.**  
Son productores de *entrada* (catálogo, Plan, Tool Plan). El ensamblaje N1–N4, el Knowledge Bundle y el IES permanecen pendientes de implementación conforme a los documentos propietarios.

La columna anterior se denomina **“Código relacionado / soporte parcial”** (no “Implementación en código”), para evitar sugerir conformidad constitucional completa.

---

# 4. Propiedad de contratos clave

| Contrato | Documento propietario |
|----------|------------------------|
| ObservationRecord (campos unificados) | `03A-OBSERVATION-PIPELINE.md` |
| AcquisitionStatus | `03A-OBSERVATION-PIPELINE.md` |
| Regla de afirmación de ausencia (`ABSENCE_CONFIRMED`) | `02-EVIDENCE-BUILDER.md` (EB aplica; OP no determina) |
| Knowledge Bundle | `03-EXECUTIVE-KNOWLEDGE-STORE.md` (forma persistida); producido por Evidence Builder |
| Knowledge Snapshot | `03-EXECUTIVE-KNOWLEDGE-STORE.md` |
| Confianza Fs/R/Cb/Cs/Cb_ov | Constitución (epistemología) + Evidence Builder (mecánica; `k`/`wi` pendientes) |
| Cobertura CONOZCO… | Constitución + Motor |
| Producto IES | Futuro `04-IES-STANDARD` bajo Constitución IX |

---

# 5. Invariantes del índice

1. No hay implementación del Motor/Evidence Builder/EKS/OP en código productivo de ensamblaje.
2. Fases 1–3 = soporte parcial de entrada, no sustitutos del pipeline.
3. El EKS recibe Knowledge Bundle N1–N4 (no solo observaciones).
4. El IES futuro consume Knowledge Snapshot, no fuentes operacionales.
5. `NO_CONOZCO` es resultado válido, no error arquitectónico.

---

# Control documental

| Campo | Valor |
|-------|--------|
| Documento | `DIRECTOR_IA_ARCHITECTURE_INDEX.md` |
| Versión | 1.1 |
| Estado | APROBADO COMO ÍNDICE TRAS AUDITORÍA E2E |
| Dependencia | Constitución; EKE; Evidence Builder; 03; 03A; 03B |
| Implementación del pipeline completo | PENDIENTE |
