# Reporte — IMPL-DIRECTOR-IA-REAL-INPUT-ARR-001

```yaml
task_id: "IMPL-DIRECTOR-IA-REAL-INPUT-ARR-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-REAL-INPUT-ARR-001.md"
  - "lib/director-ia-real-input-arr.js"
  - "test/director-ia-real-input-arr.test.js"
  - "fixtures/director-ia/real-input-arr/arr-success-one-record.json"
  - "fixtures/director-ia/real-input-arr/arr-success-multiple-records.json"
  - "fixtures/director-ia/real-input-arr/arr-empty.json"
  - "fixtures/director-ia/real-input-arr/arr-tool-error.json"
  - "fixtures/director-ia/real-input-arr/arr-entity-unresolved.json"
  - "fixtures/director-ia/real-input-arr/arr-scope-incomplete.json"
files_not_touched:
  - "docs/director-ia/"
  - "lib/director-ia-observation-pipeline.js"
  - "lib/director-ia-evidence-builder.js"
  - "lib/director-ia-eks.js"
  - "lib/director-ia-op-eb-eks-integration.js"
  - "lib/director-ia-ies-builder.js"
  - "lib/director-ia-reasoning-engine.js"
  - "lib/director-ia-channel-projection.js"
  - "lib/director-ia-e2e.js"
  - "lib/director-ia-igf-arr.js"
  - "lib/dashboard-arr-forecast.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-tools.js"
  - "server.js"
  - "package.json"
  - ".env"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-REAL-INPUT-INTEGRATION-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "Ninguna autorizada. Este reporte no es G5. No se encadena otra tarea."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8 permanecen N/A."
```

## Ejecución

- Rama: `implementation/director-ia-real-input-arr-001` (≠ `main`; no se cambió de rama).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-17T22:27:00-06:00` / `AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17`.
- G2/G3/G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin commit, push, merge. Sin siguiente tarea. Sin invocar RE/CP. Sin chat/Twilio/WhatsApp. Sin cambios a OP/EB/EKS/IES ni a `docs/director-ia/`.

No se requirió cambiar contratos. No se exportó ni modificó `lib/director-ia-igf-arr.js`: la fuente se consume por inyección con la firma física existente.

---

## 1. Fuente ARR usada físicamente

| Campo | Valor físico |
|-------|----------------|
| Tool id | `get_arr_snapshot` |
| Dominio | `arr` |
| Función numérica | `loadArrProyForPlant(client, year, month, plantCode)` en `lib/director-ia-igf-arr.js` |
| Retorno físico | `{ venta_ton, desc_kg }` |
| Métrica del slice | `venta_ton` |
| Motor aguas abajo | `dashboardArrForecast.computePronosticoProyByPlant` / `resolveProyFromPlantMap` |
| **No usada** | `loadIgfArrAnnexForChat` (`{ ok, text, meta }` prosa LLM) |

`loadArrProyForPlant` **no está en `module.exports`**. No se modificó el runtime ARR. El adapter invoca una abstracción inyectada con esa misma firma (o `arrSource.execute({ client, year, month, plant_code })`).

El registry (`lib/director-ia-tools.js`) sigue apuntando `get_arr_snapshot.executor` a `loadIgfArrAnnexForChat`. Este slice **no** usa el executor de registry ni cambia su semántica.

---

## 2. Forma de invocación

```text
authenticated input { planta_id, plant_code?, year?, month?, triggered_by?, ... }
  → createDirectorIaArrInput({ arrSource, observationPipeline, evidenceBuilder, eks, idFactory, clock }).run(input)
      1. valida planta_id (fail-closed; no ARR)
      2. idFactory("trace") exactamente una vez; idFactory("execution")
      3. si no hay plant_code → ENTITY_UNRESOLVED (no ARR)
      4. si year/month no son year>0 y month 1–12 → QUERY_SCOPE_INCOMPLETE (no ARR)
      5. arrSource(client, year, month, plant_code)  // firma loadArrProyForPlant
         o arrSource.execute({ client, year, month, plant_code })
      6. mapping → MINIMAL_EXECUTION_ENVELOPE[]
      7. observationPipeline.process(envelopes)
      8. evidenceBuilder.assemble({ trace_id, acquisition_statuses, observation_records, ... })
      9. eks.validate_structure(bundle); si !ok → throw INVALID_BUNDLE
     10. eks.append_snapshot(bundle)
```

`client` se reenvía a la fuente y **nunca** entra al envelope, ObservationRecord ni Bundle.

---

## 3. Mapping exacto a MINIMAL_EXECUTION_ENVELOPE

Campos comunes (todos los statuses emitidos):

| Campo | Valor |
|-------|--------|
| `trace_id` | el de la fachada (`idFactory("trace")`) |
| `tool_id` | `get_arr_snapshot` |
| `domain` | `arr` |
| `status` / `technical_state` | enum 03A del mapping |
| `execution_id` | `idFactory("execution")` |
| `extracted_by` | `get_arr_snapshot` |
| `triggered_by` | input o `"undeclared"` |
| `source.system` | `arr` |
| `source.source_family` | `arr_snapshot` |
| `source.source_instance_id` | `arr:{plant_code\|planta_id}:{execution_id}` |
| `source.content_author_id` | **siempre `null`** |
| `raw_payload_reference` | `raw://{trace_id}/get_arr_snapshot/{execution_id}/0` |

Payload de éxito (un registro físico):

```json
{
  "metric_or_event": "venta_ton",
  "value": 95,
  "unit": "t",
  "period": "2026-07"
}
```

`desc_kg` se ignora (fuera del slice). `period` sale del year/month del request cuando la fuente no trae `period`.

Varios registros transportables (solo fuente inyectada `{ rows: [...] }`):

```json
{ "rows": [ { "metric_or_event": "venta_ton", "value": 95, "unit": "t", "period": "2026-06" }, ... ] }
```

Vacío: `payload: {}` + `metric_or_event = venta_ton`. Error: `error: { code }` sin payload de negocio.

---

## 4. Statuses realmente observables

| Status | Condición física en este slice | ¿Invoca ARR? |
|--------|--------------------------------|--------------|
| throw `INVALID_INPUT` / `planta_id_required` | `planta_id` missing/invalid | No |
| `ENTITY_UNRESOLVED` | `planta_id` ok, sin `plant_code` | No |
| `QUERY_SCOPE_INCOMPLETE` | `plant_code` ok; year/month no completos (year>0, month 1–12). Demostrable por la firma de `loadArrProyForPlant`. | No |
| `ACQUIRED_OK` | ARR OK y al menos un `venta_ton` finito | Sí |
| `ACQUIRED_EMPTY` | ARR OK sin `venta_ton` transportable (`null`/no finito). **≠** ausencia de negocio, **≠** `venta_ton = 0`, **≠** `ABSENCE_CONFIRMED` | Sí |
| `TOOL_ERROR` | throw/timeout/resultado no objeto | Sí (intento) |

`venta_ton = 0` finito es `ACQUIRED_OK` (dato transportable), no empty.

---

## 5. Statuses no demostrables (no inventados)

| Status | Por qué no se emite |
|--------|---------------------|
| `SOURCE_RESTRICTED` | `loadArrProyForPlant` no distingue 403/GA. Esa distinción vive en el anexo chat (`assertGVPlantaNombreAccess`), que este slice no usa. |
| `SOURCE_NOT_INTEGRATED` | ARR está integrado. |
| `ABSENCE_CONFIRMED` | Prohibido; empty no es ausencia. |

---

## 6. Provenance / trace

- `trace_id` nace **una vez** en la fachada. Adapter, OP y EB no lo regeneran.
- El mismo `trace_id` entra al envelope, `AcquisitionStatus`, `ObservationRecord`, Bundle y Snapshot EKS.
- `content_author_id` permanece `null`.
- `extracted_by` es extractor técnico, no autor.
- `triggered_by` es identidad del trigger.
- `client` / secretos no viajan a envelope / N1 / Bundle.

---

## 7. Tests

| Suite | Comando | Resultado |
|-------|---------|-----------|
| Focal ARR | `node --test test/director-ia-real-input-arr.test.js` | **24 pass / 0 fail** |
| Regresión Director IA | `node --test test/director-ia-*.test.js` | **292 pass / 0 fail** (24 nuevos + 268 previos) |
| Whitespace | `git diff --check` | limpio |

Cubre: factory/deps; `planta_id`; un `trace_id`; success 1/N; empty; tool error; entity unresolved; scope incomplete; provenance; `content_author_id = null`; no mutación; adapter≠ObservationRecord; OP owner de status/records; EB no recibe raw ARR; Bundle válido a EKS; `trace_id` hasta snapshot; no RE/CP/chat/Twilio; runtime sin SDK LLM/Twilio; sin SQL propio; sin credenciales.

---

## 8. Gaps reales encontrados (no bloqueantes de este slice)

1. **`loadArrProyForPlant` no está exportado.** Consumo por inyección. Exportar exigiría tocar ARR sin cambio de semántica; no se hizo.
2. **Registry executor sigue siendo el anexo chat.** Fuera de alcance. El slice no pasa por `loadIgfArrAnnexForChat`.
3. **`plant_code` debe venir en el contexto de ejecución.** No se reutilizó `getPlantCodeArrFromPlantaNombre` ni SQL a `public.plantas` (chat/fuzzy). Sin `plant_code` → `ENTITY_UNRESOLVED`.
4. **Multi-registro no es la forma física de `loadArrProyForPlant`** (un objeto). El fixture `arr-success-multiple-records.json` usa fuente inyectada `{ rows }` solo para cubrir el mapping OP de varias filas, sin cambiar la consulta ARR.
5. **`QUERY_SCOPE_INCOMPLETE` se demuestra por firma (year/month), no por metadata post-query.** La fuente no expone cobertura parcial del dominio ARR. No se llama ARR con periodo inventado.
6. **`server.js` no cablea la fachada.** Autorizado como no-touch. El trigger dashboard autenticado queda para una tarea futura.
7. **`desc_kg` no se proyecta.** Slice = `venta_ton`.
8. **Credenciales/pool reales** siguen en la capa ARR existente; los tests usan fuente sintética. No se tocó `.env`.

Ningún gap exige G2/G3 ni cambio de query/OP/EB/EKS.

---

## 9. STOP

Sin commit. Sin push. Sin merge. Sin siguiente tarea.
