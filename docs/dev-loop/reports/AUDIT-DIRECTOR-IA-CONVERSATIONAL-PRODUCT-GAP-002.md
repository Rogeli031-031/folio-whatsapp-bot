# Reporte — AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-002

```yaml
task_id: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-002"
outcome: "DONE_PENDING_REVIEW"
mode: "PRODUCT_AUDIT_ONLY"
north_star_met: false
single_bottleneck: "daily_question_answered_with_monthly_pack"
failure_class: "MISSING_INFRASTRUCTURE"
next_task_proposed: "ARCH-DIRECTOR-IA-DAILY-DEVIATION-READINESS-001"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-002.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "test/"
  - "sql/"
  - "server.js"
  - "frontend-dashboard/"
  - "package.json"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-plant-diagnosis.js"
  - "lib/director-ia-financial-diagnosis.js"
  - "lib/director-ia-m9-deltas.js"
  - "lib/director-ia-persistent-memory.js"
  - "sql/arr_forecast_schema.sql"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp). Esta auditoría no mide módulos."
```

## Resumen ejecutivo

El north star **no** se cumple todavía.

Lo que **sí** mejoró: «¿Cómo va Puebla?» y sus follow-ups canónicos ya son una conversación real (pack fresco + hilo efímero + GPT). Eso no existía en `AUDIT-DIRECTOR-IA-CONVERSATIONAL-INTELLIGENCE-001`.

Lo que **rompe hoy** la experiencia: si el ejecutivo pregunta **«¿Por qué bajó la venta ayer?»**, el runtime **sí responde**, pero con IGF/ARR/M9 **mensual**. Las tablas diarias existen (`arr.ventas_diarias_cliente`, `arr.descuentos_diarios_cliente`); nadie las consulta a grano de día. GPT razona sobre el pack equivocado. Eso no es un fallo del modelo.

**Cuello de botella único:** la pregunta diaria se intercepta (o se pierde) en un camino mensual.

**NEXT_TASK** (no autorizada, no ejecutada): `ARCH-DIRECTOR-IA-DAILY-DEVIATION-READINESS-001`.

---

## Ejecución

- Rama: `audit/director-ia-conversational-product-gap-002` (≠ `main`).
- HEAD: `58bd1cb9`.
- G1 intacto. `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- Sin código, matriz, contratos, SQL, tests, commit, push, merge.
- Trazas: planner (`detectDirectorIaIntent` / `inheritParentIntent`), `classifyTurnKind`, `askDirectorIa`, loaders M9/financial/plant, memoria persistente, DDL diario.

---

## Qué sí mejoró (honesto)

| Capacidad | Etiqueta | Prueba física |
|---|---|---|
| Diagnóstico de planta multi-fuente | NEW_DATA_ACCESS + NEW_TRUST_GUARANTEE | `loadPlantDiagnosisForChat` / seis bloques; null≠0; SOURCE_RESTRICTED ≠ missing |
| Continuidad efímera C1 | NEW_CONVERSATIONAL_INFRASTRUCTURE | `inheritParentIntent` + `HILO`; tests continuidad 20/20 |
| Pending work items | NEW_PERSISTENT_CONTEXT (repo) | `arr.director_ia_pending_work_items`; **DEPLOYMENT_PENDING** hasta SQL 017 |
| Materialidad kg | NEW_TRUST_GUARANTEE | `kg_mes_real`; no forecast−real como pérdida |

El Director IA **anterior** (dump AR + OpenAI) era más charlatán y menos falso-cerrado: un «qué pasó con Julio» podía caer al dump y mencionar un overdue. El **actual** es más confiable en C1 y más rígido fuera del phrasebook. Eso es un avance de verdad, no de cobertura 52.5%.

---

## Trazas — seis conversaciones

### C1 — planta (phrasebook canónico)

| Turno | Intent detectado | Runtime | GPT | Hechos |
|---|---|---|---|---|
| ¿Cómo va Puebla? | `plant_diagnosis` 0.84 | pack 6 fuentes del **mes comercial**, no «hoy» | sí + HILO | kg, AR, DICF, bitácora, IGF/ARR, limitaciones |
| ¿Qué te llama la atención? | unknown → hereda `plant_diagnosis` (`attention`) | requery | sí | mismo pack fresco |
| ¿Por qué? | unknown → hereda (`why`) | requery | sí | se le pide no afirmar causa |
| ¿Y Arturo? | unknown → hereda (`entity_intro`) | entidad única o clarifica | sí si única | Arturo del pack, no de otra planta |
| ¿Qué sabemos de él? | hereda (`pronoun`) | requery | sí | |
| ¿Tiene alguna acción? | hereda (`action`) | requery | sí | acción DICF si `cliente_key` |
| ¿Qué falta saber? | hereda (`gap_what`) | **early return** `buildGapWhatAnswer` | **no** | lista `missing_fields` |
| ¿Quién puede darnos esa información? | hereda (`gap_who`) | **early return** | **no** | persona solo con vínculo físico |
| ¿Para qué la necesitas? | hereda (`gap_why_need`) | **early return** | **no** | `why_blocks` |

**Resultado C1:** la conversación **sí se sostiene** si el usuario usa esas frases. Clase del hilo: infraestructura **nueva que funciona**. Clase de los tres últimos turnos: **OVERPROGRAMMING** (GPT podría redactar el hueco con el mismo gap estructurado). No es el cuello único: el phrasebook de C1 cumple el north star **en ese guion**.

Variante que **sí rompe** C1: «¿Qué información falta?» no coincide con `^que falta saber` / `^que (informacion )?te falta`. `kind=other` → no hereda → clarificación. Eso es phrasebook, no falta de datos.

### C2 — «¿Por qué bajó la venta ayer?»

| Capa | ¿Existe? | Qué hace hoy |
|---|---|---|
| 1 Detección (ayer vs referencia) | Tablas diarias **sí** (`arr.ventas_diarias_cliente.fecha`) | **No.** M9 agrupa `DATE_PART year/month`. IGF/ARR son snapshot mensual. |
| 2 Contribución matemática | Cliente-mes en M9 (top 20% de la muestra; **sin canal**) | Mensual, no diaria. Canal existe en DDL (`canal`/`subcanal`) y **no** sale en `getDeltaVentaClientes`. |
| 3 Explicación comercial | Comentarios/AR/bitácora están en `plant_diagnosis`, **no** en `financial_diagnosis` | El pack de C2 no trae bitácora ni DICF. |
| 4 Hueco | limitations del pack mensual | El modelo no puede decir «falta el corte de ayer» porque nadie le marca que pidieron un día. |

**Turno 1:** `porque` + `bajo` + `venta` → `financial_diagnosis` 0.9 (`lib/director-ia-planner.js` ~390–395). Confirmado en `test/director-ia-conversational-continuity.test.js`. `ayer` **no** cambia el intent. GPT recibe IGF+ARR+M9 YYYY-MM→YYYY-MM y la pregunta «ayer». Prompt: «Resume hechos por bloque… Declara period mismatch» — **no** dice «esto no es el día de ayer».

**Follow-ups:**

- «¿Contra qué la estás comparando?» / «¿Dónde estuvo la caída?» → `kind=other`, no defensible → **clarificación**. El hilo financiero **no** existe.
- «¿Y ayer?» aislado → `period_switch` → clarificación explícita (fuera de slice).
- «¿Qué clientes explican más?» → standalone `client_analysis` 0.8 (`clientes`+`explica`) → **DICF/listas**, no M9. Pack equivocado otra vez.

**¿Puede responder venta ayer?** No de forma fundamentada. Puede **parecer** que sí.

Clase: **MISSING_INFRASTRUCTURE** (el diario está en DB; no se entrega). No es MODEL_REASONING_LIMIT. No es DEPLOYMENT_GAP.

### C3 — «¿Por qué subió el descuento/kg ayer?»

`financial_diagnosis` exige caída de ingreso/venta/margen, no «subió descuento». `delta_discount` exige `cambio|variacion|delta` + `descuento`. Esta frase **no** entra a ninguno.

Denominador ponderado **mensual** sí existe en M9 (`monto/kg` por cliente-mes en `getDeltaDescuentoClientes`). No hay corte `fecha = ayer`. No hay descomposición canal en ese SELECT.

**¿Puede responder descuento/kg ayer?** No. Peor que C2: ni siquiera monta el pack financiero.

Clase: **MISSING_INFRASTRUCTURE** (routing + grano).

### C4 — cross-session Arturo

Día 1 «¿Por qué dejó de comprar Arturo?» → `plant_diagnosis` (regla `dejo_de_comprar` singular). Crea work item si hay entidad única + gap + store + `actor_id`.

«¿Qué información falta?» → no es `gap_what` → riesgo de clarificación (phrasebook).

Día 2 «¿Qué pasó con Arturo?» → `classifyPersistentMemoryTurn` = `resume`. En **repo** funciona (tests 19/19). En **entorno** hace falta SQL 017. Sin tabla: retrieve vacío → unknown → clarificación.

«¿Ya sabemos por qué?» no es phrasebook de inherit ni resume obvio.

Clase: **DEPLOYMENT_GAP** (SQL 017), no fallo de arquitectura. Separado del cuello único.

### C5 — acción de Julio Pérez

«¿Qué pasó con la acción de Julio Pérez?» dispara **resume de memoria** (`que paso con`) **antes** del planner. Si no hay work item cuyo `entity_display` coincida, `resumeItems=[]`. Planner: no es `action_status` (falta vencid/abiert/register) ni `responsible_lookup` (eso es «quién es el responsable»). → **unknown → clarificación**.

El dump legado habría podido citar a Julio si estaba en `top_overdue`. Hoy, más honesto y menos útil.

Clase: **MISSING_INFRASTRUCTURE** (lookup acción/persona). **No** es el cuello único: es un hilo distinto.

### C6 — trade-off competencia / margen

«Arturo dejó de comprar…» → `plant_diagnosis`. Comentario de competencia = declaración almacenada (prompt lo dice). No hay margen-por-cliente ni «igualar oferta». GPT **sí** puede listar qué falta **si** llega al modelo con el pack (primer turno sí llama OpenAI). No puede calcular el trade-off.

Clase: **MISSING_DATA** (cálculo económico cliente) + **CONTRACT_OR_AUTHZ_LIMIT** (no Recommendation N5; no autorizar descuento). Fuera del cuello único.

---

## Libertad de razonamiento

| Área | Veredicto | Por qué |
|---|---|---|
| Authz, planta, `cliente_key`, null≠0, SOURCE_RESTRICTED | **KEEP_DETERMINISTIC** | Verdad / acceso |
| Joins, unidades kg vs MXN, periodos YYYY-MM vs día | **KEEP_DETERMINISTIC** | El fallo C2/C3 nace de no hacerlo |
| Provenance por bloque, memory ≠ evidence | **KEEP_DETERMINISTIC** | |
| Ranking top-N / 80-20 M9 | **MIXED** | El corte es cálculo; la narrativa puede ser GPT |
| «¿Qué te llama la atención?» / «¿Por qué?» sobre pack planta | **LET_GPT_REASON** | Ya es así; aporta valor |
| `buildGapWhatAnswer` / Who / WhyNeed | **LET_GPT_REASON** (redacción) + **KEEP** (persona solo con vínculo) | Early return evita GPT con gap ya estructurado |
| Phrasebook de inherit | **MIXED** | Evita dump AR (valor). Ahoga frases naturales (coste) |
| Causalidad / N5 | **KEEP_DETERMINISTIC** (prohibir causa sin hecho) | Contrato; no es sobreprogramación |

No es dogma: C1 demuestra que GPT sintetiza bien cuando el pack es el correcto. C2 demuestra que GPT no puede salvar un pack del mes equivocado.

---

## Memoria persistente

- Repo: IMPLEMENTED.
- Entorno: **PENDING UNTIL SQL 017 APPLIED**. El repositorio no prueba aplicación en ningún ambiente. No se etiqueta como fallo arquitectónico.

---

## Cuello de botella — exactamente uno

**Nombre:** La pregunta de **movimiento diario** («ayer») no tiene camino de evidencia a grano de día; el planner la manda (venta) a un pack **mensual** o (descuento) a **unknown**.

**Clase:** `MISSING_INFRASTRUCTURE`

**Dónde (físico):**

1. `lib/director-ia-planner.js` ~390–395: `porque`+`bajó`+`venta` → `financial_diagnosis` sin mirar `ayer`.
2. `lib/director-ia-financial-diagnosis.js`: ensambla IGF + ARR + M9; prompt no desmiente el día.
3. `lib/director-ia-m9-deltas.js` `getDeltaVentaClientes` / `getDeltaDescuentoClientes`: `GROUP BY year, month` sobre tablas **diarias**.
4. `sql/arr_forecast_schema.sql`: `arr.ventas_diarias_cliente` y `arr.descuentos_diarios_cliente` tienen `fecha`, `canal`, `subcanal`.
5. `classifyTurnKind` `period_switch` (`^y ayer`) corta el hilo en vez de pedir un pack diario.

**Por qué bloquea el north star:** el ejecutivo habla del día; el sistema o bien **inventa el marco temporal** (contesta el mes) o **no monta evidencia**. GPT recibe datos y razona; el fallo es de adquisición/periodo, no de elocuencia. Identificar «qué falta» también sale mal: falta el corte de ayer, y ese corte **sí vive en ARR**.

**Qué desbloquearía arreglarlo:** capas 1–2 (detectar delta del día vs una referencia declarada; contribución por cliente; eventualmente canal). Conversación C2/C3 con requery honesto. Dejar de vender IGF mensual como «ayer».

**Qué NO resolvería:** causalidad comercial (capa 3); trade-off de descuento vs margen (C6); lookup «acción de Julio»; SQL 017; phrasebook de C1; N5.

No es OVERPROGRAMMING del prompt de planta. No es MODEL_REASONING_LIMIT. No es que «falte un módulo M0–M20» en el 52.5%.

---

## NEXT_TASK (no autorizada, no ejecutada)

Exactamente una, contra ese cuello:

`ARCH-DIRECTOR-IA-DAILY-DEVIATION-READINESS-001`

Readiness (no IMPL todavía): grano día vs mes; referencia comparable (día previo / promedio / mismo día semana); contribución matemática ≠ causa; denominador ponderado descuento/kg; canal si el DDL lo soporta; no mezclar IGF mensual; qué va KEEP_DETERMINISTIC vs GPT.

STOP.
