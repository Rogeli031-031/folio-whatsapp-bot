# Reporte — ARCH-EKS-PHYSICAL-DECISIONS-001

```yaml
task_id: "ARCH-EKS-PHYSICAL-DECISIONS-001"
outcome: "BLOCKED"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-EKS-PHYSICAL-DECISIONS-001.md"
files_not_touched:
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "código productivo"
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/dev-loop/reports/IMPL-EKS-READINESS-002.md"
contracts_modified: []
ambiguities_or_contradictions:
  - "03 §4 get_snapshot: lectura por snapshot_id / trace_id sin semántica si hay varias versiones (ya reportado en IMPL-EKS-READINESS-002)."
  - "03 §4 list_versions: 'ciclo o entidad de consulta' sin clave de agrupación (ya reportado en IMPL-EKS-READINESS-002)."
deviations_from_current_task:
  - "03-EXECUTIVE-KNOWLEDGE-STORE.md no se modificó: G2_architecture_change = PENDING. allowed_actions solo permite editarlo bajo G2."
next_task_proposed: "Tras aprobación humana de D1–D9 y G2: registrar decisiones físicas en 03. IMPL-EKS-001 permanece no autorizado. Esta línea no autoriza trabajo."
secrets_check: "none"
human_decision_needed:
  - "G2: HUMAN_APPROVER debe AUTHORIZED o rechazar el cambio a 03. El implementador no autoaprobó G2."
  - "Aprobar, enmendar o rechazar cada recomendación D1–D9 (lista exacta al final). Ninguna es decisión vigente."
  - "G5: CLOSED o REJECTED de esta ejecución BLOCKED. Este reporte no abre IMPL-EKS-001."
```

## Ejecución

- Rama: `architecture/eks-physical-decisions` (no `main`; no se cambió de rama).
- G1: `authorized_by`, `authorized_at`, `human_authorization` intactos; no modificados por el implementador.
- G2: `PENDING`. No se editó `docs/director-ia/`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → análisis y reporte → `BLOCKED` (solo `status`) al llegar al gate humano/G2.
- Sin runtime. Sin commit. Sin push. Sin merge. Sin encadenar tarea.

Las **recomendaciones** de este informe no son decisiones. No se escribieron en `03`. No equivalen a `APPROVED`.

---

## Marco (contrato vs evidencia)

**Contrato (`03` v1.1):** EKS = validador/versionador/persistidor append-only de Knowledge Bundle N1–N4. No calcula N2–N4, no LLM, no muta materiality/coverage/AcquisitionStatus. Snapshot inmutable con `snapshot_id`, `bundle_id`, `version` monotónica, `persisted_at`, `bundle` bit-a-bit, `integrity` conceptual. Operaciones: `validate_structure`, `append_snapshot`, `get_snapshot`, `list_versions`. Implementación PENDIENTE. No nombra motor, JSONB, pool ni migrador.

**Constitución I:** tecnológicamente invariante. Elegir un motor en runtime no redefine N1–N5; sí requiere G2 si se **registra** en `03`.

**`04` §16:** `content_fingerprint` = huella; `signature: null` en v1.0; prohibido afirmar firma digital implementada. El `integrity` de EKS no debe contradecir esa separación.

**Índice:** EKS «Ninguno (runtime pendiente)». EB también pendiente.

**Evidencia `IMPL-EKS-READINESS-002`:** cero runtime EKS/EB; producto usa `pg` + `DATABASE_URL` + `Pool` en `server.js`; JSONB en tablas de producto (no EKS); SQL one-shot sin runner; S3 para PDFs; bitácora IA ≠ EKS; upserts `ON CONFLICT DO UPDATE` en dominio operacional (incompatible con append-only si se copian).

---

## D1 — Motor y colocalización

### 1. Evidencia observada

Única persistencia de aplicación en `origin/main`: dependencia `pg`, `DATABASE_URL` `postgresql://...` en `.env.example`, un `Pool` en `server.js`. No hay SQLite/MySQL/Mongo/Redis/ORM. S3 existe para objetos de producto, no para conocimiento. `03` no nombra motor.

### 2. Alternativas

| ID | Alternativa |
|----|-------------|
| P1 | Mismo motor ya usado por el producto; **esquema/tablas nuevas** |
| P2 | Misma familia de motor; **base o instancia dedicada** |
| P3 | Otro motor no presente en dependencias |
| P4 | Solo archivos en disco |
| P5 | Objetos S3 + índice |

### 3. Recomendación (no aprobada)

**P1:** colocalizar en el motor ya operativo, objetos **nuevos** (esquema propio, p. ej. no `public` de folios ni `arr` de bitácora/ARR). No reutilizar `director_ia_bitacora` ni tablas ARR/IGF/folios.

### 4. Trade-offs

- P1 reutiliza ops y secretos ya existentes; comparte fallos y capacidad con WhatsApp/dashboard.
- P2 aísla mejor; añade operación y credenciales.
- P3/P4 no tienen patrón de despliegue en el repo. P4 es frágil en host stateless.
- P5 mezcla el bucket de PDFs si no se aísla; `integrity` debería cubrir índice y blob.

### 5. Decisión que requiere aprobación humana

¿Se aprueba **P1** (mismo motor, esquema/tablas nuevas), u otra de P2–P5?

### 6. Cambio contractual si G2 fuese autorizado

Añadir en `03` una cláusula de **realización física v1** (no epistemología): el EKS v1 puede persistir en el motor de aplicación existente en objetos nuevos; el contrato sigue sin redefinir N1–N5 ni exigir un motor constitucionalmente.

---

## D2 — Representación física del Knowledge Snapshot

### 1. Evidencia observada

`03` §3 exige `bundle` como copia íntegra sin mutación (invariante 5 bit-a-bit). Readiness: JSONB ya usado en producto; normalizar N2–N4 en tablas arriesga “mejorar” el Bundle. EKS no debe calcular ni transformar.

### 2. Alternativas

| ID | Alternativa |
|----|-------------|
| R1 | Documento único del Bundle + metadatos |
| R2 | Tablas relacionales N2–N4 + cabecera |
| R3 | Híbrido: columnas de metadatos indexadas + Bundle **opaco** |
| R4 | Objeto inmutable + fila índice |

### 3. Recomendación (no aprobada)

**R3:** columnas `snapshot_id`, `bundle_id`, `trace_id`, `version`, `persisted_at`, `integrity` + Bundle opaco (documento). Si se aprueba P1, el documento puede **codificarse** en el tipo nativo de documento de ese motor; eso es encoding, no taxonomía N2–N4. **No R2** en v1 (riesgo de no ser bit-a-bit).

### 4. Trade-offs

- R3 preserva invariante 5 y `validate_structure` sobre el documento; consultas internas al Bundle son más pesadas.
- R2 facilita SQL por hecho/evidencia; viola el espíritu de “no transformar” si el desglose no es idéntico.
- R4: dos fallos de consistencia.

### 5. Decisión que requiere aprobación humana

¿Se aprueba **R3**, u otra de R1/R2/R4?

### 6. Cambio contractual si G2 fuese autorizado

Registrar en `03`: el Snapshot físico v1 = metadatos de almacén + Bundle opaco idéntico al recibido; prohibido descomponer N2–N4 en tablas de verdad.

---

## D3 — Versionado monotónico y concurrencia

### 1. Evidencia observada

`03`: `version` monotónica append-only; `append_snapshot` no sobrescribe. El repo usa `ON CONFLICT DO UPDATE` en dominio operacional (no copiable). `snapshot_id` ya es identificador inmutable distinto de `version`.

### 2. Alternativas

| ID | Alternativa |
|----|-------------|
| V1 | `UNIQUE(clave, version)` + INSERT; error si colisión |
| V2 | Transacción `max(version)+1` bajo bloqueo |
| V3 | `snapshot_id` opaco + `version` entero (ya exigido por `03` como campos) |

### 3. Recomendación (no aprobada)

**V2 + red de seguridad V1:** EKS asigna `version = max(version)+1` por `trace_id` en transacción con bloqueo; `UNIQUE(trace_id, version)`; `snapshot_id` opaco inmutable. Prohibido UPDATE/DELETE del Snapshot. V3 no es alternativa excluyente: son campos de `03`.

### 4. Trade-offs

- V2 evita carreras; introduce bloqueo.
- Solo V1 sin asignación automática obliga al llamador a elegir versión (el EKS dejaría de ser el versionador).
- Upsert de producto rompería append-only.

### 5. Decisión que requiere aprobación humana

¿Se aprueba **asignación de versión por EKS (V2) + UNIQUE(trace_id, version)**, u otra estrategia?

### 6. Cambio contractual si G2 fuese autorizado

Aclarar en `03` §4: `append_snapshot` asigna `version` monotónica por `trace_id`; nunca edita filas previas.

---

## D4 — Semántica de `get_snapshot(trace_id)` con múltiples versiones

### 1. Evidencia observada

`03` §4: lectura por `snapshot_id` / `trace_id`. No dice qué devolver si hay v1..vn. `03B` A.12 usa un `snapshot_id` concreto (`snap_caseA_v1`).

### 2. Alternativas

| ID | Alternativa |
|----|-------------|
| G_EXACT | `get_snapshot` solo por `snapshot_id`; `trace_id` insuficiente |
| G_LATEST | `snapshot_id` = exacto; `trace_id` = versión monotónica **máxima** |
| G_ALL | `trace_id` devuelve todas las versiones (solapa `list_versions`) |

### 3. Recomendación (no aprobada)

**G_LATEST:** `get_snapshot(snapshot_id)` exacto; `get_snapshot(trace_id)` la última versión de ese ciclo. Nunca fusionar versiones. Historial = `list_versions`.

### 4. Trade-offs

- G_LATEST cumple la lectura por `trace_id` de §4; un lector descuidado puede no ver v1.
- G_EXACT es más seguro y debilita el texto actual de §4.
- G_ALL duplica `list_versions`.

### 5. Decisión que requiere aprobación humana

¿Se aprueba **G_LATEST**, G_EXACT o G_ALL?

### 6. Cambio contractual si G2 fuese autorizado

Reemplazar la fila ambigua de `get_snapshot` en `03` §4 por la semántica aprobada.

---

## D5 — Clave de agrupación para `list_versions`

### 1. Evidencia observada

`03` §4: historial del «ciclo o entidad de consulta». Invariante 7: trazabilidad vía `trace_id`. Bundle ya contiene planta/periodo en su interior. No hay clave de entidad canónica fuera del Bundle.

### 2. Alternativas

| ID | Alternativa |
|----|-------------|
| L_TRACE | Agrupar solo por `trace_id` |
| L_ENTITY | Agrupar por planta/periodo/pregunta (hay que definir el identificador) |
| L_BOTH | `trace_id` obligatorio; entidad opcional |

### 3. Recomendación (no aprobada)

**L_TRACE** en v1. No inventar “entidad de consulta” relacional. Planta/periodo se leen dentro del Bundle opaco, no como clave de almacén.

### 4. Trade-offs

- L_TRACE es trazable y mínimo; no lista “todas las versiones de Puebla” sin recorrer Bundles.
- L_ENTITY exige un identificador que `03` no posee hoy (G7 si se inventa en silencio).

### 5. Decisión que requiere aprobación humana

¿Se aprueba **L_TRACE**, o se define otra clave de entidad?

### 6. Cambio contractual si G2 fuese autorizado

En `03` §4: `list_versions(trace_id)` = historial append-only ordenado por `version`.

---

## D6 — Estrategia de migraciones

### 1. Evidencia observada

`sql/NNN_*.sql` + `scripts/apply-*.js`. Sin runner ni tabla de historial. DDL en caliente en bitácora/Delta Ingreso. EKS no debe alterar tablas de producto.

### 2. Alternativas

| ID | Alternativa |
|----|-------------|
| M1 | `sql/` + `scripts/apply-*.js` + `CREATE IF NOT EXISTS` en objetos **nuevos** |
| M2 | Runner con ledger de migraciones (no existe hoy) |
| M3 | DDL en bootstrap del proceso EKS |

### 3. Recomendación (no aprobada)

**M1** para el primer esquema EKS. Sin M3 en el módulo EKS (no mezclar almacén con auto-DDL de producto). M2 queda como evolución humana posterior, no como requisito de v1.

### 4. Trade-offs

- M1 encaja el repo; no deja historial de migraciones.
- M2 es más auditable; introduce herramienta nueva (decisión extra).
- M3 copia un hábito peligroso del producto.

### 5. Decisión que requiere aprobación humana

¿Se aprueba **M1** para v1, o M2/M3?

### 6. Cambio contractual si G2 fuese autorizado

Nota de realización: el esquema EKS se crea por artefacto SQL nuevo, no por ALTER de tablas operacionales. `03` no necesita nombrar el runner si se elige M1.

---

## D7 — Mecanismo de `integrity` del Snapshot

### 1. Evidencia observada

`03` §3: «sello/hash o equivalente conceptual». `04` §16: huella ≠ firma; `signature: null` en IES v1.0. `crypto` existe en `server.js`. Canonicalización IES aún no congelada.

### 2. Alternativas

| ID | Alternativa |
|----|-------------|
| I_DIGEST | Huella (digest) del Bundle persistido bit-a-bit; no firma |
| I_SIGN | Firma digital (choca con aplazamiento de `04` si se afirma “implementada”) |
| I_NULL | `integrity` placeholder hasta freeze canónico IES |

### 3. Recomendación (no aprobada)

**I_DIGEST:** huella del documento Bundle **tal como se persistió** (bytes/contenido idéntico). No declarar firma digital. No reutilizar el freeze canónico pendiente de IES como si ya existiera. Algoritmo concreto (p. ej. SHA-256) es detalle de realización, no G8 (`k`/`wi` / firma IES).

### 4. Trade-offs

- I_DIGEST permite T7 de readiness (huella estable al releer) sin pretender firma.
- I_SIGN usurparía G8/`04`.
- I_NULL deja T7 vacío.

### 5. Decisión que requiere aprobación humana

¿Se aprueba **I_DIGEST** (huella ≠ firma), I_SIGN o I_NULL? Si I_DIGEST, ¿se nombra algoritmo en `03` o se deja “digest de realización”?

### 6. Cambio contractual si G2 fuese autorizado

En `03` §3: `integrity` = huella del Bundle persistido; explícitamente **no** es firma digital IES (`04` §16).

---

## D8 — Pool compartido vs cliente/pool dedicado

### 1. Evidencia observada

Un `Pool` global en `server.js` (max default 20). El propio `server.js` documenta saturación del pool (menú de ayuda). Scripts EKS-irrelevantes ya usan `Client`/`Pool` propios.

### 2. Alternativas

| ID | Alternativa |
|----|-------------|
| POOL_SHARE | Inyectar el `Pool` de `server.js` |
| POOL_DEDICATED | Pool o Client propio del EKS (mismo `DATABASE_URL` si P1) |
| POOL_ISOLATED | Pool hacia instancia distinta (acoplado a P2) |

### 3. Recomendación (no aprobada)

**POOL_DEDICATED** si P1: no compartir el pool del bot. Límites propios. Si P2, POOL_ISOLATED.

### 4. Trade-offs

- Dedicado evita que un append EKS bloquee WhatsApp; más conexiones totales.
- Compartido es simple y hereda la saturación ya observada.

### 5. Decisión que requiere aprobación humana

¿Se aprueba **POOL_DEDICATED**, POOL_SHARE o POOL_ISOLATED?

### 6. Cambio contractual si G2 fuese autorizado

Opcional en `03` (es runtime). Si se registra: EKS no debe depender del pool del canal WhatsApp/dashboard.

---

## D9 — Orden de implementación EKS vs Evidence Builder

### 1. Evidencia observada

Índice: EB y EKS sin runtime. `03` §5: EB es el **único** productor del Bundle. `03B` A.10/B.8 son Bundles ilustrativos. Readiness: pruebas EKS deben inyectar fixtures, no producir conocimiento.

### 2. Alternativas

| ID | Alternativa |
|----|-------------|
| O_EKS_FIRST | EKS contra fixtures `03B`; EB después |
| O_EB_FIRST | Esperar runtime EB |
| O_PARALLEL | Ambos en la misma tarea (fuera de alcance; no encadenar) |

### 3. Recomendación (no aprobada)

**O_EKS_FIRST:** EKS se prueba con fixtures `03B` (cifras ficticias, no cobertura institucional). No sustituye al EB. No abre IMPL-EKS-001.

### 4. Trade-offs

- O_EKS_FIRST desbloquea el almacén sin fingir un EB.
- O_EB_FIRST retrasa el único persistidor; el EB aún no existe.
- Paralelo violaría una-tarea / no encadenar.

### 5. Decisión que requiere aprobación humana

¿Se aprueba **O_EKS_FIRST** u O_EB_FIRST?

### 6. Cambio contractual si G2 fuese autorizado

Nota en `03`: el runtime EKS puede aceptarse contra Bundles de prueba conformes a §2; el productor de producción sigue siendo únicamente el Evidence Builder.

---

## Qué se escribiría en `03` si G2 y D1–D9 se aprobaran tal cual

Bloque **propuesto, no aplicado, no aprobado**. Solo se insertaría con G2 humano y decisiones humanas explícitas.

```
## Realización física v1 (no epistemología)

Pendiente de texto exacto según D1–D9 aprobados. No redefinir N1–N5.
No LLM. Append-only. Bundle opaco bit-a-bit.
get_snapshot / list_versions según D4–D5 aprobados.
integrity = huella ≠ firma IES, si se aprueba I_DIGEST.
```

Este bloque **no** está en `03` hoy.

---

## STOP — Gate G2 / decisión humana

G2 permanece **PENDING**. El implementador no registró nada en `03`. No se implementó EKS.

### Decisiones exactas que debe aprobar, enmendar o rechazar HUMAN_APPROVER

1. **D1 motor/colocalización:** ¿P1 (mismo motor, esquema/tablas nuevas) / P2 / P3 / P4 / P5?
2. **D2 representación Snapshot:** ¿R3 (metadatos + Bundle opaco) / R1 / R2 / R4?
3. **D3 versionado/concurrencia:** ¿V2+UNIQUE(trace_id, version) / otra?
4. **D4 get_snapshot(trace_id):** ¿G_LATEST / G_EXACT / G_ALL?
5. **D5 list_versions:** ¿L_TRACE / L_ENTITY (definir clave) / L_BOTH?
6. **D6 migraciones:** ¿M1 / M2 / M3?
7. **D7 integrity:** ¿I_DIGEST / I_SIGN / I_NULL? ¿Nombrar algoritmo en `03`?
8. **D8 pool:** ¿POOL_DEDICATED / POOL_SHARE / POOL_ISOLATED?
9. **D9 orden:** ¿O_EKS_FIRST (fixtures 03B) / O_EB_FIRST?
10. **G2:** ¿autorizar edición de `03-EXECUTIVE-KNOWLEDGE-STORE.md` para registrar solo lo aprobado en 1–9?

Sin esos diez actos humanos no hay formalización contractual ni IMPL-EKS-001.

## Verificaciones

- `docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md` no modificado.
- Código runtime no modificado.
- Ninguna recomendación se escribió como `APPROVED` ni `AUTHORIZED_BY_HUMAN`.
