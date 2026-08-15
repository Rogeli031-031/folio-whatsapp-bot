# Reporte — IMPL-EKS-READINESS-002

```yaml
task_id: "IMPL-EKS-READINESS-002"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-EKS-READINESS-002.md"
files_not_touched:
  - "docs/director-ia/"
  - "server.js"
  - "lib/"
  - "sql/"
  - "scripts/"
  - "package.json"
  - "código productivo"
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/TASK_TEMPLATE.md"
  - "docs/dev-loop/reports/README.md"
  - "docs/dev-loop/reports/IMPL-EKS-READINESS-001.md"
  - ".cursor/"
  - ".cursorrules"
  - ".github/"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
contracts_modified: []
ambiguities_or_contradictions:
  - "03 §4 get_snapshot admite lectura por snapshot_id o trace_id; no precisa qué devolver si un trace_id tiene varias versiones append-only."
  - "03 §4 list_versions habla de 'ciclo o entidad de consulta' sin definir la clave de agrupación (solo trace_id, o también planta/periodo/pregunta)."
  - "03 invariantes: hay dos ítems numerados '6' (materialidad y Sin LLM). El significado de ambos es legible; no se reinterpretó ni se corrigió el contrato."
deviations_from_current_task: []
next_task_proposed: "IMPL-EKS-001: implementar runtime EKS (validate_structure, append_snapshot, get_snapshot, list_versions) contra fixtures 03B, solo después de las decisiones humanas listadas abajo. Esta línea no autoriza trabajo."
secrets_check: "none — no se copiaron valores de .env; solo nombres de variables en .env.example"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED. Este reporte no autoriza IMPL-EKS-001 ni otra tarea."
  - "Decisión de motor de persistencia (reutilizar el existente u otro). El implementador no eligió."
  - "Decisión de representación física del Snapshot (documento JSON/JSONB, relacional normalizado, híbrido, u objeto + índice)."
  - "Decisión de colocalización: mismo proceso/pool/esquema vs almacén aislado."
  - "Decisión de herramienta de migraciones y de estrategia de concurrencia para versión monotónica."
  - "Aclarar get_snapshot(trace_id) con múltiples versiones y la clave de list_versions."
```

## Ejecución

- Rama al ejecutar: `implementation/eks-readiness-001` (no `main`; no se cambió de rama).
- Referencia integrada: `origin/main` en `93e751a3`. `git diff --name-only origin/main...HEAD` vacío: el código auditado coincide con `origin/main`.
- G1 leído en archivo: `authorized_by`, `authorized_at` y `human_authorization` presentes; no creados ni modificados por el implementador. `G1_task_authorization: AUTHORIZED`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin runtime. Sin modificación de contratos ni código productivo.
- Sin commit. Sin push. Sin merge. Sin encadenar tarea.

Leyenda de este reporte:

- **Hecho:** observado en el repositorio / `origin/main`.
- **Contrato:** exigido por `03` / `03B` / índice / Constitución; no redefinido.
- **Inferencia:** lectura de compatibilidad; no es decisión.
- **Alternativa:** opción comparativa; no adoptada.

---

## 1. Inventario de persistencia realmente encontrada (hechos)

No existe runtime de Executive Knowledge Store. Búsqueda de `knowledge bundle`, `knowledge snapshot`, `snapshot_id`, `bundle_id`, `validate_structure`, `append_snapshot`, `list_versions`, `eks_` en `*.js`/`*.sql`/`*.json`: **cero coincidencias**.

El índice (`DIRECTOR_IA_ARCHITECTURE_INDEX.md` §3) declara: Executive Knowledge Store (03) — «Ninguno (runtime pendiente)» / **No** implementa Constitución, EKE ni Evidence Builder. Evidence Builder también «Ninguno (runtime pendiente)».

### 1.1 Dependencias y configuración

| Hallazgo | Evidencia |
|----------|-----------|
| Dependencia `pg` `^8.13.1` | `package.json` raíz |
| Descripción del producto menciona PostgreSQL (Render) y S3 (AWS) | `package.json` |
| Frontend Next.js **sin** driver de base de datos | `frontend-dashboard/package.json` |
| Variable `DATABASE_URL` documentada con esquema `postgresql://...` | `.env.example` (placeholder; no se copió secreto) |
| `DATABASE_SSL` opcional | `.env.example`, `server.js` |
| Pool: `PG_POOL_MAX` (default 20), `PG_CONNECTION_TIMEOUT_MS` (default 15000) | `server.js` |
| SSL pg activo salvo `DATABASE_SSL=false` | `server.js` (`rejectUnauthorized: false` si SSL) |
| S3 opcional (PDFs/objetos de producto, no conocimiento ejecutivo) | `.env.example`, `server.js` (`@aws-sdk/client-s3`) |
| `ENABLE_DIRECTOR_IA` opt-in | `.env.example`, `lib/director-ia.js` |
| Sin `docker-compose`, `render.yaml`, SQLite, MySQL, Mongo, Redis, Prisma, Knex, Drizzle, Sequelize, Flyway, Liquibase, `node-pg-migrate` | búsqueda en repo |

### 1.2 Cómo se usa `pg` hoy

- Un `Pool` global en `server.js` (líneas ~175–183) compartido por el bot/dashboard backend.
- Scripts one-shot crean `Client` o `Pool` propios: `scripts/apply-*-schema.js`, `scripts/apply-director-ia-bitacora-planta-migrate.js`, `scripts/upload-arr-puebla.js`, `scripts/homologar-unidad-taller.js`, `scripts/audit-director-ia-tema-details.js`.
- `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` embebidos en runtime (`server.js`, `lib/director-ia-bitacora.js`, `lib/delta-ingreso-ai-db.js`).
- `JSONB` ya usado en tablas **de producto**, no de EKS: `usuarios.permisos_json`, `folios.detalle_lineas`, `arr.director_ia_bitacora.metadata`, payloads de Delta Ingreso AI.
- Upserts `ON CONFLICT ... DO UPDATE` en ARR, forecast, SEH, Delta Ingreso AI: persistencia **mutable** de dominio operacional.
- `crypto` ya importado en `server.js` (no implica algoritmo de integridad EKS).

### 1.3 SQL y “migraciones”

Directorio `sql/` con scripts numerados de dominio (IGF meta, bitácora Director IA, comercial entidad, ARR forecast). Aplicación: scripts Node que leen el `.sql` y ejecutan `client.query`. No hay runner de migraciones versionado ni tabla de historial de migraciones observada.

Único archivo con “migrate” en el nombre: `scripts/apply-director-ia-bitacora-planta-migrate.js` (ajuste de bitácora de campo, no EKS).

### 1.4 Qué no es EKS (hecho + contrato)

`arr.director_ia_bitacora` (`sql/014_director_ia_bitacora.sql`, `lib/director-ia-bitacora.js`): notas de campo (Plaud, visitas, juntas), con `updated_at`, `is_active` y `resumen_ia`. Es mutable y admite texto generado por IA. **No** es Knowledge Snapshot. Reutilizarla como EKS violaría `03` (append-only, sin LLM, sin transformar Bundle).

Tablas ARR/IGF/folios/usuarios son fuentes operacionales. El IES/EKS **no** las consume como verdad (`03` §5; `03B` invariante 9). Fases 1–3 (`lib/director-ia-capabilities.js`, planner, tools) son entrada parcial, no almacén N1–N4 (índice §3).

---

## 2. Requisitos contractuales (sin redefinir)

Fuente: `03-EXECUTIVE-KNOWLEDGE-STORE.md` v1.1 (CONTRATO APROBADO TRAS AUDITORÍA E2E; implementación PENDIENTE).

- Recibe Knowledge Bundle N1–N4 (+ estados), no “solo observaciones”.
- Produce Knowledge Snapshot versionado, inmutable tras persistir.
- Operaciones: `validate_structure`, `append_snapshot`, `get_snapshot`, `list_versions`.
- Append-only; no editar Snapshot persistido; no fusionar Bundles en silencio.
- No calcula hechos/evidencias/diagnósticos; no clasifica conflictos; no muta `resolution_status`; no recalcula confianza; no reinterpreta coverage, AcquisitionStatus, ausencias ni materiality; no llama LLM; no lee fuentes operacionales para inventar conocimiento.
- Snapshot sin diagnósticos permitido bajo `NO_CONOZCO` / `SOURCE_NOT_INTEGRATED` / `SOURCE_RESTRICTED` / `TOOL_ERROR`.
- Bundle persistido bit-a-bit el del Evidence Builder, más metadatos de almacén (`snapshot_id`, `version`, `persisted_at`, `integrity`).
- `03` no fija motor, esquema SQL, JSONB, librería de migraciones ni algoritmo concreto de `integrity` (“sello/hash o equivalente conceptual”).

`03B` Casos A/B (ilustrativos, cifras ficticias): EKS valida, persiste sin modificar Bundle; Caso B persiste desconocimiento sin diagnósticos y no convierte `SOURCE_NOT_INTEGRATED` en hecho.

---

## 3. Qué infraestructura existente podría reutilizarse (inferencia; condiciones)

Ningún componente actual **es** el EKS. Reutilización posible **solo si** un humano lo autoriza después, y sin mezclar tablas operacionales:

| Activo existente | Condición de reutilización | Riesgo si se reutiliza mal |
|------------------|----------------------------|----------------------------|
| Dependencia `pg` + `DATABASE_URL` + patrón `Pool`/`Client` | Solo si se decide colocalizar EKS en el mismo motor ya usado por el producto | Contención de pool; mezcla accidental con tablas ARR/folios |
| Patrón `sql/NNN_*.sql` + `scripts/apply-*.js` | Solo para **crear** un esquema/tablas **nuevas** de EKS, no para alterar tablas de producto | Seguir sin historial de migraciones |
| Uso previo de `JSONB` en otras tablas | Experiencia de equipo; no obliga a JSONB para el Bundle | Confundir `permisos_json` / bitácora con Snapshot |
| `crypto` en `server.js` | Candidato a huella de `integrity` si se elige un digest; `03` no nombra algoritmo | Afirmar “firma” (`04` distingue huella vs firma) |
| S3 ya cableado | Candidato a blob del Bundle + índice; `03` no exige object storage | El EKS no debe leer S3 operacional de cotizaciones como conocimiento |
| Fixtures conceptuales de `03B` A.10–A.12 y B.8–B.9 | Base de pruebas **sin** Evidence Builder runtime | Tratar cifras ilustrativas como datos reales (prohibido por `03B`) |

No reutilizable como EKS: `director_ia_bitacora`, tablas ARR/IGF/folios, chat legado, Fases 1–3, Delta Ingreso AI.

---

## 4. Alternativas de persistencia física (sin elección)

`03` es tecnológicamente invariante en el sentido constitucional (no nombra motor). Lo siguiente **no** es arquitectura aprobada.

| ID | Alternativa | Encaje contractual | Trade-off observado vs repo |
|----|-------------|--------------------|-----------------------------|
| P1 | Colocalizar en el motor ya usado por el producto (`pg` + `DATABASE_URL`), esquema/tablas **nuevas** | Compatible con append-only si no hay UPDATE/DELETE de Snapshots | Reutiliza ops actuales; comparte fallos y pool |
| P2 | Misma familia de motor, **base o instancia dedicada** | Igual de válido contractualmente | Aísla conocimiento; nueva operación/secretos |
| P3 | Otro motor (no presente en dependencias) | `03` no lo prohíbe | Nueva dependencia, ops y migraciones; no hay evidencia de uso actual |
| P4 | Solo archivos (JSON en disco) | Append-only posible | No hay patrón de despliegue de FS durable en el producto; Render/stateless |
| P5 | Objetos S3 + índice mínimo | Bundle inmutable como objeto | S3 hoy es de PDFs de negocio; hay que no colapsar buckets/roles |

Ninguna de P1–P5 queda seleccionada.

---

## 5. Alternativas para representar Snapshots append-only (sin elección)

Campos contractuales del Snapshot (`03` §3): `snapshot_id`, `bundle_id`, `version`, `persisted_at`, `bundle` íntegro, `integrity`.

| ID | Representación | Pros respecto a `03` | Contras |
|----|----------------|----------------------|---------|
| R1 | Un documento por Snapshot (p. ej. JSON/JSONB del Bundle + columnas de metadatos) | Facilita copia bit-a-bit; `validate_structure` sobre el documento | Consultas internas al Bundle más pesadas; JSONB es un detalle de un motor, no un requisito |
| R2 | Tablas relacionales N2–N4 + cabecera Snapshot | Consulta SQL por tipo | Riesgo de “mejorar” o no copiar bit-a-bit; EKS no debe normalizar semántica |
| R3 | Híbrido: metadatos + `trace_id`/`version` indexados y Bundle opaco | Lectura `get_snapshot`/`list_versions` sin proyectar N2–N4 | Sigue siendo decisión de almacenamiento, no de epistemología |
| R4 | Objeto inmutable (S3 u homólogo) + fila índice | Inmutabilidad natural del objeto | Dos fallos de consistencia índice/blob; `integrity` debe cubrir ambos |

Regla común a todas (contrato, no diseño): **INSERT only**; prohibido UPDATE/DELETE del Snapshot; prohibido upsert estilo `ON CONFLICT DO UPDATE` usado hoy en ARR.

Versionado monotónico:

| ID | Estrategia | Trade-off |
|----|------------|-----------|
| V1 | `UNIQUE(clave_ciclo, version)` + INSERT; fallo si se reutiliza versión | Simple; requiere definir `clave_ciclo` |
| V2 | Transacción que calcula `max(version)+1` bajo bloqueo (fila semáforo / `FOR UPDATE` / advisory lock) | Evita huecos/carreras; elige un mecanismo de concurrencia |
| V3 | Identificadores opacos no monotónicos en `snapshot_id` + `version` entero aparte | `snapshot_id` inmutable vs `version` de ciclo; `03` pide ambos |

`03` exige versión monotónica append-only; no elige V1–V3.

---

## 6. Interfaces técnicas no vinculantes (contrato 03 §4)

Propuesta de forma, **no implementada**, **no aprobada**:

| Operación | Entrada conceptual | Salida conceptual | Rechazos contractuales |
|-----------|--------------------|-------------------|------------------------|
| `validate_structure` | Knowledge Bundle | ok / errores estructurales | Falta de campos de §2; ingreso “solo observaciones”; contenedor no-Bundle |
| `append_snapshot` | Bundle ya válido | Snapshot (`snapshot_id`, `version`, `persisted_at`, `bundle` idéntico, `integrity`) | Cualquier mutación del Bundle; overwrite |
| `get_snapshot` | `snapshot_id` o `trace_id` | Snapshot o no encontrado | No recalcular; no fusionar |
| `list_versions` | ciclo o entidad (clave a definir por humano) | Historial ordenado append-only | No editar historial |

Hueco: si `get_snapshot(trace_id)` y existen v1..vn, `03` no dice si es la última, todas, o error. Debe decidirlo un humano antes del runtime.

---

## 7. Alternativas de migraciones (si hacen falta)

Hace falta **algún** mecanismo para crear el almacén; `03` no nombra herramienta.

| ID | Alternativa | Encaje con el repo |
|----|-------------|--------------------|
| M1 | Continuar `sql/` + `scripts/apply-*.js` + `CREATE IF NOT EXISTS` | Consistente con bitácora/IGF; sin ledger de migraciones |
| M2 | Introducir runner (p. ej. migraciones numeradas con tabla de control) | No existe hoy; es decisión humana |
| M3 | DDL solo en bootstrap de proceso (como bitácora/`delta-ingreso-ai-db`) | Evita script aparte; mezcla esquema con runtime |

Ninguna adoptada. EKS no debe crear/alterar tablas de folios, ARR, IGF ni bitácora de campo.

---

## 8. Plan inicial de pruebas (soportado por 03B)

Datos: **solo** fixtures ilustrativos de `03B` (cifras ficticias). No usar DB operacional ni tools.

| # | Caso | Dado | Esperado |
|---|------|------|----------|
| T1 | A.11–A.12 | Bundle `kb_caseA_ilustrativo`, `trace_id` `tr_caseA_puebla_ilustrativo`, cobertura `CONOZCO_PARCIALMENTE`, diagnósticos presentes | `validate_structure` ok; `append_snapshot` → p. ej. `snap_caseA_v1` version 1; `bundle` idéntico; sin recálculo |
| T2 | B.8–B.9 | Bundle `kb_caseB_ilustrativo`, listas vacías, `NO_CONOZCO`, `SOURCE_NOT_INTEGRATED` | Snapshot **sin** diagnósticos; no convierte AcquisitionStatus en hecho de etapa |
| T3 | Rechazo de recepción | Payload solo-observaciones / sin estructura Bundle | Rechazo; no Snapshot |
| T4 | Append-only | Segundo append del mismo ciclo | Nueva `version`; el Snapshot v1 intacto; no UPDATE |
| T5 | `get_snapshot` / `list_versions` | Tras T1/T4 | Lectura por `snapshot_id`; historial ordenado; **pendiente** semántica de `get_snapshot(trace_id)` |
| T6 | Prohibiciones | Intentos de recalcular confianza, llamar LLM, fusionar A+B, promover AcquisitionStatus | Rechazo / no efecto |
| T7 | Integridad | Tras persistir | `integrity` presente y estable si se relee el mismo Snapshot |

El Evidence Builder no está implementado: las pruebas de EKS deben inyectar Bundles-fixture, no producirlos.

No se prueban Fases 1–3 ni chat legado como EKS.

---

## 9. Decisiones que requieren humano antes de IMPL-EKS-001

Determinadas por contrato (no se reabren aquí): rol mecánico append-only; operaciones de §4; prohibición de LLM/confianza/materiality/coverage/facts/evidence/diagnosis **dentro** del EKS; entrada = Bundle; salida = Snapshot; Casos A/B de `03B` como referencia de prueba.

Requieren HUMAN_APPROVER (tecnología / huecos de `03`, no G8 de `k`/`wi`):

1. Motor y colocalización (P1–P5).
2. Representación R1–R4.
3. Versionado/concurrencia V1–V3 y clave de `list_versions`.
4. Semántica de `get_snapshot(trace_id)` con varias versiones.
5. Migraciones M1–M3.
6. Algoritmo o equivalente de `integrity` (huella vs “firma”; no contradecir `04` si se cita).
7. Si el EKS comparte el `Pool` de `server.js` o usa cliente propio.
8. Orden respecto al Evidence Builder: ¿EKS contra fixtures 03B primero, o esperar runtime EB?

Este reporte **no** selecciona ninguna.

---

## 10. Riesgos, gaps, información faltante

- Runtime EKS y EB ausentes: la primera implementación no puede “conectarse” a un productor real.
- Pool único de producto: un EKS colocalizado puede competir con WhatsApp/dashboard (hecho de saturación ya mencionado en `server.js` para menú de ayuda).
- DDL en caliente y `ON CONFLICT DO UPDATE` son el hábito del repo; copiarlos al EKS rompería append-only.
- `director_ia_bitacora.resumen_ia` es un imán de diseño incorrecto (LLM en persistencia de campo ≠ EKS).
- `03` no especifica retención, borrado legal, ni multi-tenant más allá de `trace_id`.
- No se inspeccionó una base en vivo ni `.env` real (prohibido / secretos). El inventario es de **código y docs** en `origin/main`.
- Neutralidad: la presencia de `pg` en el producto **no** equivale a decisión arquitectónica de EKS.

---

## 11. Recomendación de siguiente tarea (no autorizada)

Propuesta: **IMPL-EKS-001** — runtime mínimo de EKS que cumpla `03` §4 contra fixtures `03B` A y B, en tablas/esquema **nuevos**, sin LLM y sin tocar contratos. Solo tras las decisiones de la §9.

Un `DONE` de este reporte **no** es G5. **No** abre IMPL-EKS-001.

## Verificaciones

- `git diff --check`: sin errores en los archivos de esta tarea.
- `docs/director-ia/` no modificado.
- Código runtime no modificado.
- No se eligió PostgreSQL, JSONB, migrador ni concurrencia como decisión.
