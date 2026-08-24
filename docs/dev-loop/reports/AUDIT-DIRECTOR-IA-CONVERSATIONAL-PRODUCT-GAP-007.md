# Reporte — AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-007

```yaml
task_id: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-007"
outcome: "DONE_PENDING_REVIEW"
mode: "INTEGRATED_CONVERSATIONAL_PRODUCT_AUDIT"
north_star_met: false
compared_to:
  - "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-002"
  - "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-003"
  - "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-004"
  - "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-005"
  - "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-006"
gap002: "FIXED (not re-selected; no regression)"
gap003: "FIXED (not re-selected; no regression)"
gap004: "FIXED (not re-selected; no regression)"
gap005: "FIXED (not re-selected; no regression)"
gap006: "FIXED (not re-selected; no regression)"
single_bottleneck: "daily_followup_keeps_prior_metric_pack"
failure_class: "OVERPROGRAMMING"
one_previous_frame: "ACCEPTABLE_FIRST_SLICE"
sql017_selected: false
tradeoff_selected: false
phrasebook_proposed: false
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-007.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "test/"
  - "sql/"
  - "server.js"
  - "frontend-dashboard/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-006.md"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-persistent-memory.js"
  - "lib/director-ia-daily-deviation.js"
  - "lib/director-ia-daily-discount.js"
  - "lib/director-ia-plant-diagnosis.js"
  - "lib/director-ia-action-person.js"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001"
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp). Esta auditoría no mide módulos."
```

## Resumen ejecutivo

El north star **aún no** se cumple. Ya no es porque el runtime tire un standalone válido, ni porque falte el pack de venta, descuento/kg, planta o Action Register.

Director IA **sí** puede empezar en Puebla, seguir el hilo, nombrar a Arturo, ir a la venta de ayer, volver a Arturo y volver a la venta **si el turno nombra el dominio**. Eso es GAP-006 cerrado.

Lo que **rompe la sensación de “alguien que conoce la empresa”** en la conversación ejecutiva obligatoria es más simple y más grave:

Tras «¿Cómo estuvo la venta ayer?» el usuario dice **«¿Y el descuento?»**.

Hecho físico:

- planner aislado = `unknown` 0.35
- `classifyTurnKind` = `pronoun` (el token `el`)
- `inherit` = `daily_sales_deviation`
- `askDirectorIa` L2895–2896 **`forceIntent = daily_sales_deviation`**
- se recarga el pack de **kg de venta**
- **no** se llama `loadDailyDiscountDeviationForChat`

Los tres turnos siguientes («¿Quién lo movió más?», «¿Tenemos explicación?») siguen analizando **venta**, mientras el ejecutivo cree que ya cambió a **descuento/kg**. Eso no es un hueco de modelo: el pack correcto existe (GAP-005) y la fecha ya está en el hilo (`active_date`). El runtime **impide** usarlo.

No se eligió topic stack. Un `previous_frame` alcanza los retornos inmediatos de esta conversación. No se eligió SQL 017 (deployment ≠ arquitectura). No se eligió trade-off económico (no hay que inventar margen; GPT ya puede decir que ese dato no está). No se propone phrasebook.

**NEXT_TASK** (no autorizada, no ejecutada): `ARCH-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001`.

---

## Ejecución

- Rama: `audit/director-ia-conversational-product-gap-007` (≠ `main`).
- HEAD: `e5276039 Merge branch 'docs/director-ia-intra-session-topic-return-sync-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin código, tests, contratos, SQL, matriz, commit, push, merge.
- Invocación read-only de `detectDirectorIaIntent`, `classifyTurnKind`, `resolveConversationTurn`, `classifyPersistentMemoryTurn` sobre la conversación obligatoria y el hold-out.

---

## ¿Ya se siente como conversar con alguien que conoce la empresa?

**No.**

Sí se siente como un tablero que **recuerda el último intent inheritable** y recarga su pack. Eso basta para follow-ups abiertos («¿Qué te preocupa?», «¿Qué fue lo más importante?»). No basta cuando el ejecutivo cambia de **métrica** en el mismo día sin repetir «ayer» ni el nombre canónico del intent.

Un colega que conoce la empresa, oyendo «venta ayer» y luego «¿y el descuento?», no volvería a explicar kilogramos.

---

## Traza — conversación ejecutiva obligatoria

Planta del request = 1. Authz vigente cada turno. History ≠ evidencia. Memoria persistente `kind=none` en todos estos turnos (`volvamos` no es resume).

| # | Turno | Planner aislado | Intent efectivo | Inherit | parent | previous_frame | Entidad | Fecha | Sources / requery | GPT | Det. | Soporta el siguiente |
|---|--------|-----------------|-----------------|---------|--------|----------------|---------|-------|-------------------|-----|------|----------------------|
| 1 | ¿Cómo va Puebla? | `plant_diagnosis` 0.84 | plant | no | plant | — | — | — | plant pack, requery | sí | no | sí |
| 2 | ¿Qué te preocupa? | unknown 0.35 | plant (B) | sí | plant | — | — | — | plant, requery | sí | no | sí |
| 3 | ¿Y Arturo? | unknown | plant | sí | plant | — | Arturo | — | plant, re-resolve | sí | no* | sí |
| 4 | ¿Qué sabes realmente de él? | unknown | plant | sí | plant | — | eco Arturo | — | plant, requery | sí | no | sí |
| 5 | ¿Qué te falta saber? | unknown / `gap_what` | plant | sí | plant | — | Arturo | — | plant + HILO gap | sí | no | sí |
| 6 | ¿Para qué necesitas ese dato? | unknown / `gap_why_need` | plant | sí | plant | — | Arturo | — | plant + HILO gap | sí | no | sí |
| 7 | ¿Cómo estuvo la venta ayer? | `daily_sales_deviation` 0.92 | daily sales | no | sales | **plant+Arturo** | se suelta | `ayer` | **sales pack** | sí | no | sí |
| 8 | ¿Qué fue lo más importante? | unknown | sales | sí | sales | plant+Arturo | — | 2026-08-19† | sales requery | sí | no | sí |
| 9 | ¿Quién explica más la caída? | unknown | sales | sí | sales | plant+Arturo | — | eco | sales requery | sí | no | sí |
| 10 | ¿Sabemos por qué? | unknown / `why_know` | sales | sí | sales | plant+Arturo | — | eco | sales + gaps | sí | no | sí |
| **11** | **¿Y el descuento?** | **unknown 0.35** | **sales** | **sí** | **sales** | plant+Arturo | — | eco | **sales, NO discount** | sí | no | **no (dominio falso)** |
| **12** | **¿Quién lo movió más?** | unknown | **sales** | sí | **sales** | plant+Arturo | — | eco | **sales kg** | sí | no | no |
| **13** | **¿Tenemos explicación?** | unknown | **sales** | sí | **sales** | plant+Arturo | — | eco | **sales** | sí | no | no |
| 14 | Volvamos a Arturo. | unknown / `topic_return` | plant | restore | **plant** | **sales** | Arturo revalidado | — | plant requery | sí | no | sí |
| 15 | ¿Qué era lo que faltaba? | unknown | plant | sí | plant | sales | Arturo | — | plant + gap | sí | no | sí |
| 16 | ¿Tiene alguna acción? | unknown / kind `action` | **plant** | sí | plant | sales | Arturo | — | **plant, no AR board** | sí | no | parcial |
| 17 | ¿Está vencida? | unknown | plant | sí | plant | sales | eco | — | plant | sí | no | parcial |
| 18 | ¿Por qué sigue abierta? | unknown | plant | sí | plant | sales | eco | — | plant | sí | no | parcial |
| 19 | Retomemos la venta de ayer. | `daily_sales_deviation` 0.92 | sales | **standalone gana** | sales | plant+Arturo | se suelta | `ayer` | sales requery | sí | no | sí |
| 20 | ¿Qué sigue sin explicación? | unknown | sales | sí | sales | plant+Arturo | — | eco | sales | sí | no | sí |
| 21 | ¿Quién podría aclararlo? | unknown | sales | sí | sales | plant+Arturo | — | eco | sales; who solo si `physical_person` | sí | no | sí |
| 22 | ¿Para qué necesitamos preguntárselo? | unknown | sales | sí | sales | plant+Arturo | — | eco | sales | sí | no | sí |
| 23 | Ahora dime el presupuesto. | unknown / `plant_switch` | **clarify** | no | **null** (park) | plant se **conserva** | — | — | **ninguno** | **no** | **sí** | no |
| 24 | ¿Qué te llama la atención? | unknown / `attention` | **clarify** | no | null | plant | — | — | ninguno | **no** | **sí** | no |
| 25 | Volvamos a Puebla. | unknown / `topic_return` | plant | restore | plant | (swap) | Arturo del prior | — | plant requery | sí | no | sí |
| 26 | ¿Qué revisarías primero? | unknown | plant | sí | plant | — | — | — | plant requery | sí | no | sí |

\* T3 clarifica solo si Arturo no es único en el pack fresco.  
† `active_date` sale del pack/estado, no del texto del follow-up.

**GAP-006 verificado en esta traza:** T7 y T19 standalone 0.92 **no** van a `out_of_slice_clarify`. T14 restore Arturo. T25 restore Puebla. `volvamos` = memoria `none`.

---

## Hold-out (wording no de tests)

No se hardcodea. Invocación aislada + herencia si hay estado.

| Texto | Planner | kind | Con estado plant/sales | Notas |
|-------|---------|------|------------------------|-------|
| ¿Qué ves raro? | unknown | other | hereda | Strategy B. No está en routing. |
| ¿Y él qué? | unknown | pronoun | hereda entity eco | No inventa nombre. |
| ¿Qué me falta entender? | unknown | other | hereda | No es `gap_what` canónico; igual llega a GPT. |
| ¿De dónde sale eso? | unknown | other | hereda | — |
| ¿Qué otro foco ves? | unknown | other | hereda | — |
| **Regresemos a lo anterior.** | unknown | **other** (no `topic_return`) | **hereda current**, no restaura prior | No se propone añadir el verbo. |
| ¿Qué quedaba pendiente ahí? | unknown | other | hereda | `qué quedó pendiente` sería resume de memoria; este wording no. |
| ¿Quién tendría que explicarnos eso? | unknown | other | hereda | No es `gap_who` (`^quien puede aclarar`). |
| ¿Qué podríamos concluir si tuviéramos ese dato? | unknown | other | hereda | LET_GPT_REASON. |

El hold-out confirma GAP-003: follow-ups abiertos no necesitan phrasebook. «Regresemos» no restaura prior; no se elige como cuello (sería phrasebook).

---

## Regresión GAP-002 … GAP-006

| GAP | Estado físico ahora | ¿Regresión? |
|-----|---------------------|-------------|
| 002 venta diaria | T7/T19 = `daily_sales_deviation` 0.92; no `financial_diagnosis` / `delta_sales` | **No** |
| 003 follow-up phrasebook | T2/T8/T9/hold-out = unknown + inherit; no catálogo | **No** |
| 004 action/person | «acción de Julio Pérez» sigue `action_status` 0.86; 0/1/N | **No**. T16 no es ese caso (cliente Arturo, sin span de responsable). |
| 005 descuento/kg | Pack existe si hay descuento + **ayer**. No se fusiona con venta | **No**. El fallo T11 es otro: el pack **no se pide**. |
| 006 topic return | Standalone no se tira; un `previous_frame`; restore + requery | **No** |

Sin fallback ciego a Action Register (T2/T24 clarifican o heredan plant/sales). Memoria no se usa como topic stack.

---

## Information gap — stress

`buildGapWhatAnswer` / `buildGapWhoAnswer` / `buildGapWhyNeedAnswer` **existen y no se llaman** desde `askDirectorIa`. Las preguntas de hueco van a GPT (LET_GPT_REASON). Bien: no hay respuesta enlatada.

Lo que GPT recibe:

- Pack fresco + `limitations`.
- HILO: `pending_information_gap.missing` = limitaciones copiadas (`derivePendingInformationGap`).
- `why_blocks` genérico: «Sin un hecho adicional…» o «Hay contribuidores matemáticos sin evidencia…».
- `physical_person` solo con vínculo DICF/acción.

Prompt planta: «Si no hay explicación: dilo y sugiere validar el motivo. **No inventes quién debe responder.**»  
Prompt venta: «Si un contribuidor material no tiene evidencia suficiente, dilo y señala qué falta saber.»

| Caso | ¿Puede decir qué sí/no sabe? | ¿Dato exacto? | ¿Por qué? | ¿Quién? | ¿Qué desbloquearía? |
|------|------------------------------|---------------|-----------|---------|---------------------|
| Contribuidor venta sin explicación | Sí (pack + gaps) | Parcial (comentario/DICF por `cliente_key` están en el pack) | Parcial (why genérico en HILO) | Solo si `physical_person` | Débil en el contrato a GPT |
| Contribuidor descuento sin explicación | **No en T11–T13** | Pack de descuento **no cargado** | — | — | — |
| Acción vencida sin motivo | En path Julio Pérez: sí + limitation. En T16–T18: solo cobertura DICF del **cliente** | Motivo de retraso no está en plant pack | Prompt prohíbe inventar | No inventar quién | Parcial |
| Trade-off Arturo | Sí puede negar la cuenta | Margen / condición / oferta **no existen** en fuentes | Sí (faltan) | No aplica | Sí, si GPT lista el dato (no hay early-return que lo prohíba) |

El stress del hueco **con pack correcto** es imperfecto pero no es el cuello: GPT ya ve evidencia y limitations. El stress **con pack incorrecto** (T11–T13) es el que destruye la conversación.

---

## Trade-off Arturo

```text
Arturo dejó de comprar y dicen que la competencia le ofrece más.  → plant_diagnosis 0.84
¿Conviene recuperarlo?                                          → unknown, hereda plant
¿Y si igualar la condición nos destruye margen?                 → unknown, hereda plant
¿Qué necesitas para poder decidir?                              → unknown, hereda plant
¿Qué calcularías con ese dato?                                  → unknown, hereda plant
```

No hay fuente de margen de cliente, condición ofrecida ni precio de competencia. **No debe inventar margen.** Eso es correcto.

Prompt planta: «Un comentario que mencione competencia es declaración, no prueba causal.» «**No recomiendes recuperar por volumen.** No autorizes descuento.»

GPT **puede** decir qué dato económico falta. No se elige trade-off como cuello: no hay que construir un motor de margen para que la conversación sea honesta. MISSING_DATA de economía de cliente **existe**; no es el mayor bloqueo de *esta* conversación larga (el ejecutivo ya recibió kg de venta cuando preguntó descuento).

`extractEntityHint` sobre la frase de competencia captura basura («y dicen que la competencia…»). Se anota; no se elige (no hardcode).

---

## Previous_frame

| Caso | Resultado |
|------|-----------|
| Retorno inmediato T14 «Volvamos a Arturo.» | Restore plant+Arturo. Requery. Revalida. **Funciona.** |
| Retorno autocontenido T19 «Retomemos la venta de ayer.» | Standalone 0.92. **No necesita** prior. **Funciona.** |
| Más antiguo que el prior | Tras T19 el prior es plant. Un «Retomemos la acción» implícito **no** recupera Julio en silencio (clarifica). Tras T23 el prior **sigue** plant (park no reemplaza); la venta estacionada se pierde. **No** se sirve el tema equivocado. |

**Veredicto:** la limitación de un frame es **aceptable** como first slice. No es el cuello principal. Los retornos que esta conversación necesita o son inmediatos o son autocontenidos.

---

## Memoria persistente

- Repo: `IMPLEMENTED` (`pending_work_items_only`).
- SQL 017 en entorno: **UNCONFIRMED**. No hay evidencia física de aplicación en este audit.
- `volvamos` / `retomemos` = `none`. No navega temas.
- No bloquea la conversación intra-sesión de 26 turnos.
- **No se elige.** Deployment ≠ arquitectura.

---

## Frontera de razonamiento

| Pieza | Clase | Notas |
|-------|--------|-------|
| Authz, planta, 0/1/N, joins `cliente_key`, `ayer` CDMX, contribución≠causa | **KEEP_DETERMINISTIC** | Conservar. |
| Follow-up unknown + estado válido → GPT | **LET_GPT_REASON** | GAP-003 intacto. |
| Preguntas de hueco → GPT (templates muertos) | **LET_GPT_REASON** | No reactivar templates. |
| `forceIntent` diario al heredar | **MIXED** | Correcto para «¿O sea?». **Daño** cuando el usuario nombra otra métrica diaria. |
| `out_of_slice` / park de `Ahora dime…` sin standalone | **KEEP_DETERMINISTIC** | T23–T24 duelen (presupuesto sin semana). No se elige: inventar M18 está fuera. |
| Prompt «no recomiendes recuperar» | **KEEP_DETERMINISTIC** | Evita mandato. No impide listar el dato que falta. |

Early return que **sí** impide GPT con evidencia ya disponible: **ninguno en T11**. Peor: GPT **sí** corre, pero con **evidencia del dominio anterior**. Eso es más peligroso que un clarify.

---

## Un cuello

```yaml
name: "daily_followup_keeps_prior_metric_pack"
failure_class: "OVERPROGRAMMING"
physical_location: >
  lib/director-ia-planner.js isDailyDiscountDeviationQuestion exige /ayer/;
  lib/director-ia-conversation-state.js inherit + isDailyFollowUpKind(pronoun);
  lib/director-ia-chat.js L2895-2896 forceIntent = parent diario actual.
affected_turns:
  - "¿Y el descuento?"
  - "¿Quién lo movió más?"
  - "¿Tenemos explicación?"
evidence: >
  Planner unknown 0.35. inherit daily_sales_deviation. forceIntent sales.
  loadDailyDiscountDeviationForChat no corre. active_date del hilo ya existe.
  GAP-005 no regresó: «descuento + ayer» sigue siendo daily_discount_deviation 0.92.
why_largest: >
  Después de GAP-002–006 el usuario ya puede entrar, seguir y volver.
  El primer cambio natural de métrica en el mismo día produce un análisis
  seguro-en-apariencia del pack equivocado. Eso no se siente como alguien
  que conoce la empresa; se siente como un intent pegajoso.
unlocks: >
  «venta ayer → ¿y el descuento?» puede requeryar descuento/kg del active_date
  del hilo, sin phrasebook y sin inventar fecha.
does_not_solve: >
  Topic stack; SQL 017; wording de presupuesto sin semana; salto cliente→AR
  board; motor de margen/trade-off; calidad de prosa del hueco.
```

No es MISSING_DATA (el pack de descuento existe).  
No es DEPLOYMENT_GAP.  
No es CONTRACT_OR_AUTHZ_LIMIT.  
No es MODEL_REASONING_LIMIT (esta auditoría no ejecutó el modelo; el fallo es anterior: no recibe el pack).

---

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`ARCH-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001`

Readiness: si el hilo diario ya tiene `active_date` y el turno nombra la **otra** métrica diaria (descuento ↔ venta) sin repetir «ayer», ¿debe ejecutarse el pack de esa métrica con la fecha del hilo, revalidada, con requery? Sin phrasebook. Sin inventar fecha. Sin stack.

STOP.
