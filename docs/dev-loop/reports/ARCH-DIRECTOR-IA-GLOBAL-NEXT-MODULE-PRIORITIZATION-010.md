# Reporte — ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-010

```yaml
task_id: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-010"
outcome: "DONE_PENDING_REVIEW"
winner: "TRANSVERSAL — executive_prioritization_and_recommendation (chat legado sobre plant_diagnosis)"
winner_type: "transversal"
winner_scope: >
  Convertir evidencia ya ensamblada en prioridades de revisión accionables:
  magnitudes comparables intra-fuente, cobertura de seguimiento observable,
  siguientes pasos humanos (revisar/validar/contactar) con incertidumbre;
  sin MAT_* ; sin score compuesto; sin N5 Recommendation; sin IES; sin writes
second_place: "M10"
second_type: "módulo"
second_scope: "narrativa weekly discount LD read-only; no scheduler; no Twilio/WhatsApp; no COMPLETE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-010.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "server.js"
  - "frontend-dashboard/"
  - "test/"
  - "scripts/"
  - "sql/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md (materiality; lectura)"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_2_PLANNER.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-001.md … 009.md"
  - "lib/director-ia-plant-diagnosis.js / financial-diagnosis.js / chat.js / planner.js (lectura)"
  - "lib/director-ia-m11-commercial-dossier.js / weekly-discount-narrative.js (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-READINESS-001"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A para el slice ganador (chat legado; no reabre 04/05; no calibra MAT_*)."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "52.5% no cambia en esta tarea ni tras el slice futuro."
  - "Recommendation N5 no se implementa. El slice no emite objetos IES."
```

## Resumen ejecutivo

**Ganador (transversal): priorización ejecutiva y recomendación accionable sobre el pack ya ensamblado de `plant_diagnosis`.**

Director IA **ya reúne** Action Register, DICF, bitácora, ARR, IGF y commercial_state. Eso **no** produce aún:

«Estas son las 3 cosas que debes revisar primero, por esta evidencia, con este siguiente paso y esta incertidumbre.»

Hoy el prompt pide resumir bloques. El SELECT de `arr.dicf_cliente_mes` **trae** `kg_mes_real`, `kg_mes_forecast`, `ingreso_forecast` y `last_date` y el summarizer **los descarta**. No hay orden intra-fuente por magnitud. No hay cobertura DICF por `cliente_key`. No hay estructura de siguiente paso humano.

**No se asume** que ya esté permitido como Recommendation N5. **No se asume** contrato nuevo.

Auditoría: Recommendation **ya existe** en `05` §12 / D9, anclada a IES. El chat legado **no** es N5 y **no** puede emitir esos objetos sin IES. El slice ganador es **wiring/prompt + campos físicos ya consultados**, no un contrato 06 ni runtime IES/RE.

**Segundo: M10** — reevaluado desde cero. Grano intra-mes real. Duplica tablas ARR/M9. Actionability canónica = Twilio (penalizado).

Esta tarea **no cambia** 10.5 / 20 = **52.5%**.

NEXT_TASK (no autorizada): `ARCH-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-READINESS-001`.

---

## Ejecución

- Rama: `architecture/director-ia-global-next-module-prioritization-010` (≠ `main`).
- HEAD: `517484c1 Merge branch 'docs/director-ia-plant-diagnosis-evidence-assembly-sync-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. En `CURRENT_TASK.md` solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación, matriz, código, contratos, commit, push, merge.

---

## Baseline

| Campo | Valor |
|---|---|
| M0–M20 | **10.5 / 20 = 52.5%** |
| COMPLETE | M3, M9, M13, M16 (4.0) |
| PARTIAL | M0, M1, M2, M4, M5, M6, M7, M8, M11, M12, M17, M18 (6.0) |
| INDIRECTA | M20 (0.5) |
| NO INTEGRADA | M10, M14, M15, M19 (0.0) |

Fórmula: COMPLETE=1.0, PARCIAL/INDIRECTA=0.5, NO INTEGRADA=0.0. Esta tarea **no cambia** estados ni porcentaje.

Recién cerrado (no repetir): `plant_diagnosis` evidence assembly (seis fuentes, 1 OpenAI, 0.0 pp).

Profundidad reciente (no inercia): M5, M7, M11, M12, M18, `financial_diagnosis`, `plant_diagnosis`.

---

## Current capability map

| Pregunta tipo | Qué entra hoy | Qué sale |
|---|---|---|
| «cómo va / diagnóstico de planta» | seis bloques `plant_diagnosis` | resumen por bloque; tensiones; **sin ranking** |
| «por qué cayó el ingreso» | IGF + ARR + M9 | coincidencias; **sin causa**; **sin 3 next steps** |
| «dejaron de comprar» | `computeDicf` listas | top-N por categoría, no pack de planta |
| expediente de un cliente | M11 `cliente_key` | factual 1 cliente; no ranking de planta |
| descuento esta semana | **nada** en Director IA | M10 dashboard/scheduler |

Cuello de botella actual: **no** falta de cobertura ni de ensamblaje. Falta **convertir evidencia reunida en prioridades de revisión defendibles**.

---

## Recommendation contract audit

| Pregunta | Hallazgo físico |
|---|---|
| ¿Recommendation existe? | **Sí.** Constitución V.14 (específicas, condicionadas, trazables). `05` §12 + D9 `SUPPORTED_CONDITIONAL_RECOMMENDATION_V1`. |
| ¿Exige evidence anchors? | **Sí.** ≥1 `supporting_diagnosis_id` o `supporting_evidence_id` en IES. Campos físicos: `supporting_fact_ids`, `supporting_evidence_ids`, `supporting_hypothesis_ids`, `conditions`, `limitations`, `ies_id`, `ies_version`. Fail-closed sin evidence / `NO_KNOWLEDGE`. |
| ¿Hypothesis vs recommendation? | **Separadas.** Hypothesis §4–5. Recommendation §12. Next Verification §13 ≠ Recommendation. Decision Option §14: el RE **no elige**. |
| ¿Human control? | **Sí.** Recommendation nunca es mandato automático. Next Verification no ejecuta ni invoca tools. Writes de AR/DICF/WhatsApp siguen fuera (C). |
| ¿Materiality/prioritization ya permitida en IES? | Catálogo `MAT_*` existe en EKE §7A. **Sin ruleset G8** el ensamblaje debe emitir `MATERIALITY_NOT_ASSESSED`. IES/RE **no calculan** materiality. `priority` de open questions ≠ materiality. |
| ¿Hace falta G2/G3 para el ganador? | **No**, si el slice permanece en chat legado, **no** emite objetos IES/N5 y **no** asigna `MAT_*`. |
| ¿El chat legado ya es Recommendation N5? | **No.** `plant_diagnosis` declara «no es IES; no es Reasoning Engine N5». Tratar Fases 1–3 o el chat como N1–N5 está prohibido. |

Mapeo de la forma de runtime (hipótesis, **no** contrato nuevo) a Recommendation vigente:

| Campo runtime propuesto | ¿Es Recommendation N5? |
|---|---|
| `finding` | No. Hecho/observación de bloque legado. |
| `materiality_basis` | No es `MAT_*`. Base física citada (kg, días, ausencia de fila). |
| `evidence_refs` | No son `evidence_id` IES. Son bloques de provenance (`commercial_state`, `dicf`, …). |
| `recommended_next_step` | Análogo **narrativo** a `statement` + `conditions`. No es `recommendation_id`. |
| `uncertainty` / `limitations` | Análogo a `limitations`. |

**Conclusión:** Recommendation **permite** sugerir una acción de negocio condicionada y anclada. El chat **no puede** materializar ese objeto hoy. El gap se cierra **sin contrato nuevo** si se mantiene la frontera: chat legado + evidencia física + control humano + no N5 + no `MAT_*`.

---

## Materiality audit

Bases físicas **existentes** (no inventadas):

| Base | Dónde está | ¿Llega al modelo en `plant_diagnosis`? |
|---|---|---|
| Magnitud kg / ingreso cliente | SELECT `kg_mes_real`, `kg_mes_forecast`, `ingreso_forecast` en `defaultLoadCommercialStateSelect` | **No.** `summarizeCommercialStateRows` los descarta. El prompt solo ve nombre + estado. |
| Concentración | Misma tabla; se puede ordenar intra `kg` o intra `ingreso` (familias distintas; **no mezclar**) | **No** hay orden. El corte es `cliente_norm ASC` + slice 5/3. |
| Impacto económico planta | IGF composición (intra `$/kg`); ARR `venta_ton` / `desc_kg` | Sí, a nivel planta. **No** identifica cliente. |
| Volumen perdido | Diferencia observable `kg_mes_forecast` vs `kg_mes_real` **si ambos finitos** (null ≠ 0) | Campo leído, no expuesto. |
| Acciones vencidas | AR `dias_vencido` (fecha vs hoy CDMX) | Sí (top 5). `prioridad` AR es **derivada** de días, no columna almacenada. |
| Ausencia de acción DICF | M11 ya observa 0 acciones por `planta_id` + `cliente_key` (clave **derivada**, no persistida en `dicf_cliente_mes`) | **No** en el pack. DICF del pack mapea nombre/estado **sin** `cliente_key`. Join por nombre = prohibido. |
| Fecha | AR snapshot `as_of`; CS `last_date` (consultada, no mostrada); DICF `fecha_compromiso` (mapeada, poco usada para orden) | Parcial. |
| Prioridad almacenada | M18 `folios.prioridad` (urgente). AR board **no** tiene columna `prioridad`. | No aplica al pack de planta. |
| Cobertura de seguimiento | Presencia/ausencia de fila `arr.dicf_acciones` por `cliente_key` | Existe en expediente; **no** en `plant_diagnosis`. |

No comparable (no score, no mezcla):

- `dias_vencido` vs `kg` vs `$/kg` IGF vs `venta_ton`
- IGF planta vs cliente CS
- AR tema vs cliente `cliente_norm`

Ejemplo **permitido** (dos hechos, una unidad + una ausencia):

«Cliente A concentra la mayor pérdida observable de kg en `dicf_cliente_mes` y no tiene acción DICF con `cliente_key`; conviene **revisarlo** primero.»

Ejemplo **prohibido**:

«Cliente A causó el mal resultado de la planta.»

---

## Actionability audit

Sin writes, el contrato y el runtime permiten **sugerir** (no ejecutar):

| Siguiente paso | ¿Permitido sin write? | Ancla típica |
|---|---|---|
| Revisar | Sí | bloque + magnitud o vencimiento |
| Validar | Sí (Next Verification conceptual; en chat: pedir confirmación humana) | dato missing / mismatch de periodo |
| Contactar | Sí como sugerencia humana; **no** enviar WhatsApp | responsable AR/DICF observado |
| Pedir resultado | Sí | acción abierta / `resultado_cierre` null |
| Escalar para revisión | Sí como sugerencia | vencida + responsable |
| Asignar seguimiento | **Solo sugerir** que un humano asigne. **No** crear/editar acción | — |

Cada ítem, si el slice lo implementa, debe llevar: finding, materiality_basis física, evidence (bloque), recommended_next_step, uncertainty/limitation.

---

## plant_diagnosis — ¿datos suficientes?

**Parcialmente.** El pack tiene las **tablas** y parte del SELECT; **no** entrega al razonamiento lo necesario para priorizar.

Huecos físicos:

1. Magnitudes CS consultadas y **omitidas**.
2. Sin `cliente_key` en CS ni en DICF del pack → no se puede afirmar ausencia de acción sin el derivado ya usado en M11.
3. Prompt: «Resume hechos por bloque» — no pide top-3 ni next step.
4. `formatArPayload` no incluye ni la `prioridad` derivada ni un recuento de cobertura DICF.
5. GA: IGF/ARR/CS = `SOURCE_RESTRICTED`; un ranking que dependa de kg **no** puede presentarse como completo para GA.

Conclusión: **no** puede hoy el comportamiento objetivo. **Sí** puede un slice de chat legado si se exponen campos ya leídos, se ordena **intra-unidad** y se observa cobertura con `buildClienteKey` (mismo patrón M11, no join por nombre).

---

## financial_diagnosis — señales de impacto

Aporta: composición IGF (ranking ya intra `$/kg`), ARR planta, deltas M9 `period_a`/`period_b`.

No aporta: clientes, acciones, cobertura DICF.

Puede decir «la línea IGF de mayor magnitud observada es X» **sin** convertirla en causa. **No** sustituye el ranking ejecutivo de planta. Meter M9 en priorización de planta repetiría inercia 009.

---

## Reasoning gaps

| Gap | Estado |
|---|---|
| Ensamblaje planta | Cerrado (IMPL plant_diagnosis) |
| Ensamblaje financiero | Cerrado (IMPL financial_diagnosis) |
| Hipótesis N5 / IES | Contratos congelados; runtime pendiente; **no candidato** (reabrir 04/05 penalizado) |
| Priorizar revisión con evidencia | **Abierto** — ganador |
| Score cross-domain | **Rechazado** (inventar score, mezclar unidades) |

---

## Module gaps (rechecks, no COMPLETE)

| Módulo | Resto | ¿Hueco nuevo material para el ejecutivo de planta? |
|---|---|---|
| M1 | `/health` producto | No |
| M2 resto | cheque/póliza/kanban HTTP/PDF | Side effects / S3. No |
| M4 resto | COMPARAR/xlsx | Writes/Excel. No |
| M5 resto | Excel/duplicados | Inercia. No |
| M6 resto | Export/xlsx | No |
| M7 resto | UI/PATCH/overlay | Lectura ya profundizada. No |
| M8 | UI/carga ARR | Nada oculto para chat. No |
| M10 | weekly LD | Sí como **dominio nuevo**; ver recheck. **Segundo** |
| M11 resto | attachments/Excel/bitácora en expediente | Join bitácora prohibido. `cliente_key` **sí** sirve al ganador (reuso, no COMPLETE M11) |
| M12 resto | CRUD/S3 | No |
| M14 | admin | ALTO. No |
| M15 | PDF/S3 | S3. No |
| M17 | canal WhatsApp | No es fuente. No |
| M18 resto | writes/cheques/WhatsApp | C. No |
| M19 | test sin auth | C. No |
| M20 | home KPI | INDIRECTA. No |
| M0 | catálogo permisos LLM | No |

`plant_diagnosis` / `financial_diagnosis` assembly: **no** candidatos (recién cerrados).

---

## M10 — reevaluación desde cero

Definición canónica (matriz): narrativa semanal de descuento **+** envío WhatsApp programado.

| Pregunta | Hecho físico |
|---|---|
| Fuente | `arr.descuentos_diarios_cliente` + kg `arr.ventas_diarias_cliente` + proyección mes; ventana **fecha a fecha** |
| Helper | `buildWeeklyDiscountNarrative` — ya calcula `cliente_mayor_impacto_negativo` / positivo |
| Endpoint RO | `POST /api/dashboard/weekly-discount-lectura` |
| vs ARR/M9 | **Mismas tablas.** M9 = dos YYYY-MM. Annex/financial_diagnosis = mes. M10 = **intra-mes / semana** |
| vs ganador | Otra pregunta («descuento esta semana»), no «qué revisar de la planta con AR+DICF+CS» |
| Twilio | Scheduler envía WhatsApp. Producto canónico = canal. **Fuera** del slice RO |
| Planner/tool | No existe intent |
| Pregunta nueva | «¿Cómo va el descuento esta semana vs proyección? ¿Qué cliente pesa más en la mezcla?» |
| Actionability | Media sin envío; alta solo con Twilio (penalizado) |
| State after slice RO | PARTIAL; **no** COMPLETE |
| % luego | +2.5 (LOW; no decide) |

No se eligió por ser segundo en 007–009. Sigue siendo el único módulo **silencioso** con helper SELECT-ready y pregunta concreta. Pierde el oro porque no desbloquea la decisión «qué revisar primero» sobre evidencia **ya** cargada.

---

## Candidates

### T1 — executive_prioritization_and_recommendation — **ganador**

| Campo | Contenido |
|---|---|
| Pregunta nueva | ¿Cuáles son las 3 cosas a **revisar primero** en esta planta, con qué evidencia, qué paso humano y qué no puedo afirmar? |
| Decisión que mejora | Atención del director: dónde mirar hoy, no un dump de fuentes |
| Acción que sugiere | Revisar / validar / contactar / pedir resultado / escalar — **sin** write |
| Materialidad | Intra-fuente: kg o ingreso CS; días vencidos AR; ausencia DICF por `cliente_key`. **Sin** score compuesto |
| Evidencia de la prioridad | Campos ya SELECT + provenance de bloques + cobertura M11-style |
| No puede afirmar | Causa; «AR causó IGF»; cliente causó el KPI de planta; `MAT_*`; Recommendation N5 |
| Ya cubierto | Ensamblaje de seis fuentes; tensiones etiquetadas sin ranking |
| Duplica | Si se fusionan unidades o se reabre IES. El slice **no** debe |

### M10 — **segundo**

Ver tabla M10. Pregunta nueva intra-mes. No cubre AR/DICF/cobertura.

### Rechazados

IES+RE runtime (G2/G3/G8). Score cross-domain. Repetir plant/financial assembly. M8 resto. M5/M7/M11/M12/M18 resto. M14/M15/M17/M20/M1/M2 resto/M4 resto/M6 resto/M19. Join bitácora+CS por nombre.

---

## Ranking

Ponderación 010: **executive + actionability + materiality + reasoning + evidence connectivity** (CRITICAL) > new_domain / incremental (VERY_HIGH) > frequency (HIGH) > source_readiness / cost / risk (MEDIUM) > **percentage (LOW)**.

No % . No facilidad. No ranking 009. No inercia plant_diagnosis assembly. No elegir M10 por segundo previo. No elegir prioritization solo por conversación: hay gap **físico** (campos leídos y omitidos + prompt descriptivo).

| rank | candidate | type | current_state | new_questions | executive_value | actionability | materiality_value | reasoning_value | evidence_connectivity | new_domain_value | source_ready | wiring_ready | contract_impact | risk | first_slice | state_after_slice | percentage_effect | decision |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | executive prioritization + recommendation | transversal | n/a (pack P en M7/M8/M11/M12) | 3 revisiones primero + next step | **5** | **5** | **5** | **5** | **5** | 1 | SELECT ya trae kg; M11 trae key | pack sí / ranking no | **ninguno** si no N5/MAT_* | semántica; GA partial; no mezclar unidades | exponer magnitudes + cobertura + prompt estructurado | sin cambio de módulo | **0.0** | **ganador** |
| 2 | M10 Weekly LD | módulo | NO INTEGRADA | descuento esta semana | 3 | 2 | 4 | 3 | 2 | **4** | narrativa sí | no | N/A | duplica ARR/M9; Twilio | narrativa RO | PARTIAL | +2.5 luego | **segundo** |
| 3 | IES+RE runtime | transversal | runtime pendiente | hipótesis/Recommendation N5 | 4 | 1 | 2 | 5 | 4 | 0 | contrato sí | **no** | **G2/G3/G8** | capa nueva; G8 MAT_* | no | n/a | 0 | rechazado |
| 4 | financial_diagnosis next-steps | transversal | assembly hecho | 3 pasos financieros | 3 | 3 | 3 | 3 | 3 | 0 | sí | sí | ninguno | inercia M9; no clientes | no | — | 0 | no (subsumible) |
| 5 | M8 resto | módulo | PARTIAL | UI/carga | 1 | 1 | 1 | 1 | 1 | 1 | annex/FD | sí | N/A | bajo | nada oculto | PARTIAL | 0 | no |
| 6 | M15 | módulo | NO INTEGRADA | PDF/S3 | 2 | 1 | 1 | 1 | 1 | 2 | `/media` | M2 metadata | N/A | **S3** | no | PARTIAL | +2.5 | no |
| 7 | M5/M7/M11/M12/M18 resto | módulo | PARTIAL | Excel/CRUD/canal | 1 | C | 1 | 0–1 | 1 | 0 | slices hechos | sí | N/A | inercia | no | PARTIAL | 0 | no |
| 8 | score cross-domain | transversal | — | un ranking único | 2 | 1 | 0 | 1 | 0 | 0 | no | no | G8 de facto | score arbitrario | no | — | 0 | rechazado |
| 9 | M14 / M17 / M20 / M1 / M19 | módulo | NI/P/I | admin/canal/home | 0–1 | C | 0 | 0 | 0 | 0–1 | varios | no | N/A | alto/nulo | no | — | 0/+2.5 | no |
| 10 | M2/M4/M6 resto | módulo | PARTIAL | cheque/Excel | 1–2 | C | 1 | 0 | 1 | 0 | query hecha | sí | N/A | HTTP/Excel | no | PARTIAL | 0 | no |

---

## Winner

**`executive_prioritization_and_recommendation`** (transversal, chat legado, sobre `plant_diagnosis`).

Tipo: transversal (no módulo M0–M20).

Por qué gana:

1. El cuello de botella declarado — evidencia reunida que **no** prioriza — está verificado en código: kg leídos y omitidos; prompt descriptivo.
2. Executive + actionability + materiality físicas alineadas. El ejemplo permitido es realizable **sin** causa.
3. Recommendation vigente **cubre el tipo de acto** (sugerir, anclar, condicionar, limitar) **sin** exigir un contrato nuevo si no se finge N5.
4. No es inercia de assembly: el assembly **cerró** la reunión de fuentes; este slice cierra la **conversión** a atención ejecutiva.
5. 04/05 intactos. 0.0 pp.

## Runner-up

**M10 weekly discount LD read-only.**

Por qué pierde: no usa el pack ya pagado; duplica ARR/M9 a otro grano; actionability fuerte = Twilio. Gana el segundo porque es el único dominio silencioso con helper listo y pregunta intra-mes **distinta**.

## First slice / state after / percentage / contract

```text
plant_diagnosis (ya)
  → exponer kg/ingreso/fecha CS (ya SELECT)
  → orden intra-unidad (no score cruzado)
  → cobertura DICF vía cliente_key derivado (patrón M11)
  → AR vencidas como pista de fecha (no mezclar con kg)
  → IGF/ARR como impacto de planta (no causa)
  → 3 findings: basis + evidence + next step humano + uncertainty
  → 1 OpenAI
  → respuesta
```

- State after: **ningún módulo cambia**.
- Percentage: **0.0** (52.5% intacto).
- G2/G3: **N/A**.
- G8: **N/A** (no `MAT_*`, no `k`/`wi`).
- Risks: presentar el output como Recommendation N5; mezclar kg con días; join por nombre; tratar `SOURCE_RESTRICTED` como missing; GA viendo ranking kg incompleto como completo; writes disfrazados («asignar» ejecutado).
- Dependencies: pack `plant_diagnosis`; `buildClienteKey` / patrón M11; JWT/`planta_id`. No Twilio/S3/Excel/IES.

## NEXT_TASK

Propuesta exacta (no autoriza G1; no encadena; no ejecutar):

**ARCH-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-READINESS-001**

Readiness debe fijar: campos comparables, regla de orden intra-unidad, tratamiento de null, cobertura `cliente_key`, forma de salida (finding / basis / evidence / next step / uncertainty), frontera N5/MAT_*, comportamiento GA.

## Acciones no realizadas

No código, runtime, matriz, contratos, IES, RE, tests, frontend, SQL, writes, commit, push, merge. NEXT_TASK no ejecutada.

## Gates

G1 intacto. G2/G3/G8 N/A para el ganador. Solo CURRENT_TASK + este reporte.

## secrets_check

none

## git diff --check

Se confirma al cerrar.

## git status

Se confirma al cerrar (solo los dos archivos autorizados).
