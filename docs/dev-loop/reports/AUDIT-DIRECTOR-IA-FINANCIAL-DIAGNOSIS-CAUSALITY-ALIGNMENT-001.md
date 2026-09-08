# AUDIT-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-CAUSALITY-ALIGNMENT-001

AUDIT_RESULT: DONE_PENDING_REVIEW

BASE_MAIN_SHA: c554c2742a83d222c2c38dd1fb33347d16e26b8d

LIVE_SYMPTOMS:
1. «Delta venta, descuento e ingreso presentan cambios» sin cifras exactas.
2. «la caída podría estar relacionada con…» pese a prohibición de causalidad / hipótesis.
3. «M9 2026-08 vs 2026-09 limita la comparación» aunque IGF y ARR son 2026-09 y `buildAlignment` marca comparable.
4. «ausencia de clientes en el mes disponible» (frase LIVE; no existe literal en producto).
5. Tensión IGF 1506.3507 vs ARR proyectada 1469.36 usada como causa de caída de ingreso.

PHYSICAL_CHAIN:
pregunta
→ handlePostChat
→ askDirectorIa
→ planDirectorIaQuestion (intent financial_diagnosis / caida_ingreso_financiera)
→ rama chat financial_diagnosis (NO snapshot de rentabilidad; NO orchestrator HTTP)
→ loadFinancialDiagnosisForChat
→ loadIgfArrSourceBlocksForChat + loadDeltaVenta/Descuento/IngresoForChat
→ assembleFinancialDiagnosisEvidence
→ mapM9Family ×3 → aggregateM9 → buildAlignment
→ formatFinancialDiagnosisContext / formatM9Family
→ buildFinancialDiagnosisPrompt
→ openaiDirectorIaChat
→ texto crudo
→ buildFinancialDiagnosisChatResult (passthrough)
→ res.json(result)

S1_CAUSALITY: la frase causal no está en evidence ni en context; aparece en la generación OpenAI y no se filtra.
FIRST_DIVERGENCE: D — openaiDirectorIaChat (generación). Habilitadores: C prompt («tensiones») y E ausencia de validator.
ROOT_CLASS: LLM_NONCOMPLIANCE + POST_VALIDATION_ABSENT + PROMPT_AMBIGUOUS

S2_M9_CHANGE_CLAIM: «presentan cambios» no está en el contexto. El formatter imprime «dejaron/mas/disminuyeron presentes» para toda familia SOURCE_AVAILABLE, con buckets vacíos o llenos, sin magnitudes.
FIRST_DIVERGENCE: C — formatM9Family (BUCKET_EXISTS ≡ «presentes»; omite cifras / emptiness). El literal LIVE se genera en D.
ROOT_CLASS: FORMATTER_BUG + EVIDENCE_AMBIGUOUS + LLM_NONCOMPLIANCE

S3_ABSENCE_OF_CLIENTS:
SOURCE: no hay literal «ausencia de clientes en el mes disponible». Si la familia es AVAILABLE, el contexto pega `source_coercion` de M9 (venta: «Cliente ausente en un mes = 0 kg (COALESCE de la fuente).»; ingreso: «cliente ausente en mes disponible = 0 kg.»). El modelo parafrasea esa regla estructural.
SUPPORTED: NO como prueba de «no hay clientes / no hay cifras». SÍ como nota KNOWN_ZERO de COALESCE si AVAILABLE. Si las tres familias son DATA_NOT_FOUND, esa coercion no llega al contexto (probe A).
ROOT_CLASS: EVIDENCE_AMBIGUOUS + LLM_NONCOMPLIANCE

S4_ALIGNMENT:
PHYSICAL_STATUS: comparable
CONTEXT_STATUS: comparable
MODEL_STATEMENT: IGF/ARR comparables, pero M9 2026-08 vs 2026-09 «limita la comparación directa»
FIRST_DIVERGENCE: D — OpenAI contradice `alignment.status=comparable`. El user tail invita a «declara period mismatch si existen» aunque el status no sea mismatch.
ROOT_CLASS: LLM_NONCOMPLIANCE + PROMPT_AMBIGUOUS
NOT ALIGNMENT_BUG

S5_IGF_ARR_TENSION:
SUPPORTED_DIFFERENCE: SÍ (objetos distintos; cifras de bloque se imprimen)
SUPPORTED_CAUSALITY: NO

POST_GENERATION_GUARD_PRESENT: NO

Q1: Después de OpenAI.
Q2: NO. El contexto prohíbe causa; no afirma causa.
Q3: NO. «presentes» ≠ cambio numérico. Vacío y no-vacío producen la misma frase.
Q4: NO como ausencia de clientes/cifras. Paráfrasis de `source_coercion` COALESCE si AVAILABLE.
Q5: comparable
Q6: SÍ
Q7: NO
Q8: S1=D; S2=C luego D; S3=C (`source_coercion`) luego D; S4=D; S5=prompt blando luego D.
Q9: Roots distintos. El habilitador común es POST_VALIDATION_ABSENT, no un solo bug de evidencia.
Q10: Formatter M9 + aclaración de prompt + validator post-generación determinista. No tocar loaders/SQL/planner/`buildAlignment` para el caso LIVE.

MINIMAL_FIX_BOUNDARY: combinación 1 (formatter) + 2 (prompt) + 3 (validator post-gen). No 4 (answer builder) como primer corte. No mega-fix.

SPLIT_RECOMMENDATION: tres FIX futuros separados (formatter / prompt / validator). No unificar. No autorizados.

FILES_INSPECTED:
- AGENTS.md
- docs/dev-loop/LOOP_PROTOCOL.md
- docs/dev-loop/CURRENT_TASK.md
- lib/director-ia-financial-diagnosis.js
- lib/director-ia-chat.js
- lib/director-ia-planner.js
- lib/director-ia-m9-deltas.js
- lib/director-ia-tool-orchestrator.js
- lib/director-ia-igf-arr.js (solo imports / hop de carga; no LIVE_DB)
- docs/dev-loop/reports/README.md

FUNCTIONS_INSPECTED:
- planDirectorIaQuestion / detectDirectorIaIntent (caida_ingreso_financiera)
- isRentabilidadDeterioroSnapshotQuestion
- askDirectorIa (rama financial_diagnosis)
- handlePostChat
- openaiDirectorIaChat
- loadFinancialDiagnosisForChat
- assembleFinancialDiagnosisEvidence
- mapIgfBlock / mapArrBlock / mapM9Family / truncateM9Datos
- aggregateM9
- buildAlignment
- collectLimitations
- formatM9Family / formatIgfPayload / formatArrPayload
- formatFinancialDiagnosisContext
- buildFinancialDiagnosisPrompt
- buildFinancialDiagnosisChatResult
- loadDeltaVentaForChat / loadDeltaDescuentoForChat / loadDeltaIngresoForChat (source_coercion literals)
- buildDirectorIaToolPlan (no está en el path de chat de este intent)

PROBES: A, B, C, C2, D, E — funciones puras + fixtures. Sonda temporal `tmp-fd-causality-audit-probe.js` ejecutada y eliminada. No commiteada.

TESTS:
- test/director-ia-financial-diagnosis.test.js
- test/director-ia-m9-deltas.test.js
- test/director-ia-arr-projection-cutoff-label.test.js
- combinado: 84 pass, 0 fail. Tests de producto no alterados.

ARR_ROOT1_CHANGED: NO
M9_ROOT2_CHANGED: NO
PLANNER_CHANGED: NO
ROUTING_CHANGED: NO
SQL_CHANGED: NO
SCHEMA_CHANGED: NO
DEPENDENCY_CHANGED: NO
LIVE_DB_USED: NO

FINAL: DONE_PENDING_REVIEW

```yaml
task_id: "AUDIT-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-CAUSALITY-ALIGNMENT-001"
outcome: "DONE_PENDING_REVIEW"
mode: "READ_ONLY_AUDIT"
implementation: false
product_changed: false
tests_changed: false
docs_director_ia_changed: false
live_db: false
live_db_authorized: false
selects_executed: 0
writes_executed: 0
ddl_executed: 0
implementation_sha_touched: false
head_at_audit: "0a2fa363c0ed87bccbdff731de4e9f78852b1bd7"
base_main_sha: "c554c2742a83d222c2c38dd1fb33347d16e26b8d"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```

## 1. Alcance y método

AUDIT ONLY. READ ONLY. Sin implementación. Sin LIVE_DB.

No se modificaron `lib/director-ia-m9-deltas.js`, `lib/director-ia-financial-diagnosis.js`, `lib/director-ia-igf-arr.js`, `server.js`, planner, routing, SQL, schema, dependencies, DICF ni `commercial_state`.

Root 1 ARR y Root 2 M9 MISSING≠ZERO no se reabren. COALESCE cliente-ausente = KNOWN_ZERO estructural (preservado). Esta auditoría no discute cambiar esa semántica de fuente.

Reproducción: fixtures + funciones exportadas puras (`assembleFinancialDiagnosisEvidence`, `formatFinancialDiagnosisContext`, `buildFinancialDiagnosisPrompt`, `buildFinancialDiagnosisChatResult`, `planDirectorIaQuestion`).

## 2. Cadena física por hop

El chat de este intent **no** ejecuta el tool orchestrator. `buildDirectorIaToolPlan` mapearía `get_arr_snapshot` / `get_igf_snapshot` / `get_delta_*`, pero `askDirectorIa` entra in-process a `loadFinancialDiagnosisForChat`.

### Hop 1 — pregunta HTTP

FILE: `lib/director-ia-chat.js`  
FUNCTION: `handlePostChat` L6185-6209  
INPUT: `{ planta_id, question: "¿Por qué cayó el ingreso?" }`  
OUTPUT: llama `askDirectorIa`; `res.status(status).json(result)`  
CAN_INTRODUCE_CAUSALITY: NO  
CAN_OVERRIDE_ALIGNMENT: NO  
CAN_INVENT_M9_CHANGE: NO  
POST_VALIDATION_PRESENT: NO

### Hop 2 — planner

FILE: `lib/director-ia-planner.js`  
FUNCTION: regla L631-636  
INPUT: pregunta normalizada con `por que/porque` + `cayo/caida/bajo/disminuy` + `ingreso/venta/margen/utilidad`  
OUTPUT: `intent=financial_diagnosis`, evidence `caida_ingreso_financiera`, conf 0.9, domains `arr, igf, delta_venta, delta_descuento, delta_ingreso`  
CAN_INTRODUCE_CAUSALITY: NO (el intent nombra el tema; no escribe causa)  
CAN_OVERRIDE_ALIGNMENT: NO  
CAN_INVENT_M9_CHANGE: NO  
POST_VALIDATION_PRESENT: NO

`isRentabilidadDeterioroSnapshotQuestion` (L247-254) exige `rentabilidad` + (`deterioro`|`provocando`). «¿Por qué cayó el ingreso?» no matchea.

### Hop 3 — route chat

FILE: `lib/director-ia-chat.js`  
FUNCTION: `askDirectorIa` L5491-5606  
INPUT: `directorIaPlan.intent === "financial_diagnosis"`  
OUTPUT: si evidence/pregunta es snapshot de rentabilidad → otro pack; si no → `loadFinancialDiagnosisForChat`  
CAN_INTRODUCE_CAUSALITY: NO  
CAN_OVERRIDE_ALIGNMENT: NO  
CAN_INVENT_M9_CHANGE: NO  
POST_VALIDATION_PRESENT: NO

### Hop 4 — loadFinancialDiagnosisForChat

FILE: `lib/director-ia-financial-diagnosis.js`  
FUNCTION: `loadFinancialDiagnosisForChat` L425-493  
INPUT: pool, plantaId, req, question  
OUTPUT: objeto `assembled` o abort 403  
CAN_INTRODUCE_CAUSALITY: NO  
CAN_OVERRIDE_ALIGNMENT: NO  
CAN_INVENT_M9_CHANGE: NO  
POST_VALIDATION_PRESENT: NO  

No se ejecutó contra LIVE_DB. Los loaders se inspeccionaron por código y se sustituyeron por fixtures en assemble.

### Hop 5 — source blocks IGF/ARR

FILE: `lib/director-ia-igf-arr.js`  
FUNCTION: `loadIgfArrSourceBlocksForChat` (inyectable)  
OUTPUT: `{ plant, year, month, igf, arr }`  
CAN_INTRODUCE_CAUSALITY: NO  
CAN_OVERRIDE_ALIGNMENT: NO  
CAN_INVENT_M9_CHANGE: NO  
POST_VALIDATION_PRESENT: NO  

`year`/`month` de este bloque alimentan `toYyyyMm` de IGF/ARR en assemble. El periodo M9 sale de `periodoA`/`periodoB` del payload M9, no de IGF.

### Hop 6 — M9 loaders

FILE: `lib/director-ia-m9-deltas.js`  
FUNCTION: `loadDeltaVentaForChat` L802 / `loadDeltaDescuentoForChat` L822 / `loadDeltaIngresoForChat` L842  
OUTPUT: payload familia + `source_coercion` fijo:

- venta: `Cliente ausente en un mes = 0 kg (COALESCE de la fuente).` (L817)
- descuento: `kg=0 → ratio 0 en la fuente; no es un porcentaje inventado.` (L837)
- ingreso: `margen IGF ausente → no se calcula ingreso exacto; cliente ausente en mes disponible = 0 kg.` (L854)

CAN_INTRODUCE_CAUSALITY: NO  
CAN_OVERRIDE_ALIGNMENT: NO  
CAN_INVENT_M9_CHANGE: NO (los buckets son datos; la coercion es regla estructural, no recuento)  
POST_VALIDATION_PRESENT: NO

### Hop 7 — assemble / map / aggregate / align

FILE: `lib/director-ia-financial-diagnosis.js`  
FUNCTIONS: `assembleFinancialDiagnosisEvidence` L378; `mapM9Family` L241; `truncateM9Datos` L217; `aggregateM9` L309; `buildAlignment` L343; `collectLimitations` L364  

`truncateM9Datos` recorta `clientes` a 3 y escribe `clientes_shown`. `formatM9Family` **ignora** esos campos.

`buildAlignment` (probado, no asumido):

```
sameIgfArr = igf.period === arr.period
igfInM9    = igfPeriod === periodA OR periodB
comparable = sameIgfArr && igfInM9
```

Caso LIVE IGF=2026-09, ARR=2026-09, M9=2026-08 vs 2026-09 → `sameIgfArr=true`, `igfInM9=true` → **status=comparable**.  
Note comparable: `El YYYY-MM de IGF/ARR aparece en el par M9. Siguen siendo objetos distintos.`  
`period_mismatch` entra a limitations **solo** si status es mismatch.

CAN_INTRODUCE_CAUSALITY: NO  
CAN_OVERRIDE_ALIGNMENT: esta función **es** la fuente de alignment; el caso LIVE no está mal calculado  
CAN_INVENT_M9_CHANGE: NO  
POST_VALIDATION_PRESENT: NO

### Hop 8 — format context

FILE: `lib/director-ia-financial-diagnosis.js`  
FUNCTION: `formatFinancialDiagnosisContext` L573; `formatM9Family` L540; `formatIgfPayload` L503; `formatArrPayload` L526  

IGF imprime líneas numéricas y `COMPOSICIÓN != CAUSALIDAD. No es M9.`  
ARR imprime observed/projected y `ARR observed != projected != IGF commitment.`  
M9 AVAILABLE:

```
dejaron/mas/disminuyeron presentes. unit=…. {source_coercion}
```

No imprime recuento de clientes, `totalDeltaKg`, emptiness, ni `clientes_shown`.  
PARTIAL: `NO DISPONIBLE exacto (faltan: …)` — **no** pega `source_coercion`.  
NOT_FOUND/ERROR/RESTRICTED: `NO DISPONIBLE. null no es 0. No afirma causalidad.`

Cierre: `Fin de bloques. No inventes cifras. No afirmes causa.`

CAN_INTRODUCE_CAUSALITY: NO (prohíbe causa; no la afirma)  
CAN_OVERRIDE_ALIGNMENT: NO (imprime el status calculado)  
CAN_INVENT_M9_CHANGE: SÍ, por ambigüedad — «presentes» no distingue BUCKET_EXISTS / BUCKET_NONEMPTY / NUMERIC_DELTA / EXACT_DELTA  
POST_VALIDATION_PRESENT: NO

### Hop 9 — prompt

FILE: `lib/director-ia-financial-diagnosis.js`  
FUNCTION: `buildFinancialDiagnosisPrompt` L603  

SYSTEM:

1. `Eres Director IA. Responde en español, breve y ejecutivo.`
2. Addendum L21-29: bloques separados; null≠0; si `alignment.status` es mismatch, no tratar cortes como el mismo mes; **Permitido: coincidencias, tensiones** y comparación solo con cortes alineados; **Prohibido: causalidad**; no hipótesis N5; no completar vacíos.

USER = context + pregunta +  
`Resume hechos por bloque. Señala coincidencias o tensiones sin causalidad. Declara limitaciones y period mismatch si existen.`

No define DIFFERENCE vs TENSION vs CAUSE vs DRIVER vs HYPOTHESIS.  
«tensiones» y «period mismatch si existen» son blandos: el modelo puede inventar mismatch al ver `M9=2026-08 vs 2026-09` aunque status=comparable, y puede usar una diferencia IGF/ARR como «relación» de la caída.

CAN_INTRODUCE_CAUSALITY: no escribe causa; **ablanda** la frontera  
CAN_OVERRIDE_ALIGNMENT: no cambia el status; invita a declarar mismatch sin anclarlo a `alignment.status`  
CAN_INVENT_M9_CHANGE: NO  
POST_VALIDATION_PRESENT: NO

### Hop 10 — OpenAI

FILE: `lib/director-ia-chat.js`  
FUNCTION: `openaiDirectorIaChat` L2802  
INPUT: system + user  
OUTPUT: `choices[0].message.content` trimmeado; temperature 0.2; max_tokens 1000  
CAN_INTRODUCE_CAUSALITY: SÍ  
CAN_OVERRIDE_ALIGNMENT: SÍ  
CAN_INVENT_M9_CHANGE: SÍ  
POST_VALIDATION_PRESENT: NO

### Hop 11 — post-generation / HTTP

FILE: `lib/director-ia-financial-diagnosis.js` `buildFinancialDiagnosisChatResult` L624  
INPUT: `opts.answer` crudo  
OUTPUT: `{ ok, answer, sources, context_meta, financial_diagnosis }` — `answer` sin filtro  

FILE: `lib/director-ia-chat.js` L5593-5606 / `handlePostChat` L6209  
OUTPUT: JSON del result  

CAN_INTRODUCE_CAUSALITY: NO (no añade texto; tampoco lo quita)  
CAN_OVERRIDE_ALIGNMENT: NO  
CAN_INVENT_M9_CHANGE: NO  
POST_VALIDATION_PRESENT: NO

No hay grep de validator/sanitize/causal-language-filter en el path FD. `buildFinancialDiagnosisChatResult` adjunta `alignment` y `limitations` en meta; **no** las usa para bloquear el texto.

## 3. Probes (fixtures; no LIVE_DB)

Fixture IGF: version presente, `venta_ton=1506.3507`.  
Fixture ARR: `observed_venta_ton=302`, `projected_venta_ton=1469.36`.  
year=2026, month=9 → IGF/ARR period `2026-09`.

Planner probe: intent `financial_diagnosis`, evidence `caida_ingreso_financiera`.

### A — las tres familias DATA_NOT_FOUND

alignment.status=**mismatch** (M9 period_a/b null).  
limitations incluyen `period_mismatch`, `m9_DATA_NOT_FOUND`.  
Contexto M9: cada familia `NO DISPONIBLE. null no es 0. No afirma causalidad.`  
`causalInCtx=false`. `presentChangesInCtx=false`. `ausenciaLiteral=false`. `presentes=false`.  
No aparece `source_coercion`.

### B — venta/desc AVAILABLE (buckets vacíos), ingreso PARTIAL (`exact_ingreso=false`)

alignment.status=**comparable**.  
m9_status=SOURCE_PARTIAL.  
venta/desc: `dejaron/mas/disminuyeron presentes` + coercion.  
ingreso: `NO DISPONIBLE exacto (faltan: margenA)`. Sin coercion en esa línea.  
Sin «presentan cambios». Sin literal de ausencia de clientes.

### C — tres AVAILABLE, buckets vacíos (`clientes=[]`)

alignment.status=**comparable**.  
Texto M9 (venta):  
`dejaron/mas/disminuyeron presentes. unit=kg. Cliente ausente en un mes = 0 kg (COALESCE de la fuente).`  
ingreso AVAILABLE pega: `cliente ausente en mes disponible = 0 kg.`  
Sin cifras. Sin `clientes_shown`. Sin «presentan cambios».

### C2 — venta AVAILABLE con bucket no vacío; desc/ingreso vacíos

`presentes=true` igual que C. El formatter **no** diferencia emptiness. La única diferencia de texto viene de `source_coercion` / unit, no de si hubo clientes.

Conclusión física: **«presentes» = BUCKET_EXISTS (existen las claves dejaron/mas/disminuyeron en `datos`)**. No es BUCKET_NONEMPTY. No es NUMERIC_DELTA_AVAILABLE. No es EXACT_DELTA_AVAILABLE.

### D — caso LIVE de alignment

IGF=2026-09, ARR=2026-09, M9=2026-08 vs 2026-09.

```
alignment.status=comparable
alignment.note: El YYYY-MM de IGF/ARR aparece en el par M9. Siguen siendo objetos distintos.
limitations: no_causalidad, no_fusion_entre_fuentes, null_no_es_cero, chat_legado_no_ies_no_n5
```

**No** incluye `period_mismatch`.  
Línea de contexto: `alignment.status=comparable | IGF=2026-09 | ARR=2026-09 | M9=2026-08 vs 2026-09`

El modelo LIVE dijo que IGF/ARR son comparables **y** que M9 08 vs 09 limita la comparación. Eso contradice un único `comparable`. Primera divergencia: generación OpenAI, no `buildAlignment`.

### E — mismatch real (M9 2026-06 vs 2026-07; IGF/ARR 2026-09)

```
alignment.status=mismatch
note: Los cortes no coinciden. No se alinearon en silencio. No los trates como el mismo mes.
limitations: … period_mismatch
```

El texto de mismatch es distinto del comparable. El caso LIVE **no** es este.

`buildFinancialDiagnosisChatResult` con answer placeholder devolvió el placeholder intacto (passthrough demostrado).

## 4. Auditoría del prompt (orden real)

SYSTEM:

1. Rol ejecutivo breve.
2. Addendum multi-fuente: no fusionar; null≠0; mismatch → no mismo mes; permitido tensiones; prohibido causalidad / hipótesis N5 / completar vacíos.

USER:

1. Context (alignment + limitations + tres bloques + «No inventes cifras. No afirmes causa.»).
2. Pregunta del ejecutivo (causal en boca del usuario).
3. «Resume hechos… Señala coincidencias o tensiones sin causalidad. Declara limitaciones y period mismatch si existen.»

Contradicción blanda (no causa numérica):

- «Permitido: tensiones» vs «Prohibido: causalidad» sin definición.
- «Declara period mismatch si existen» no está anclado a `alignment.status === mismatch`.
- La nota comparable («objetos distintos») + la línea `M9=2026-08 vs 2026-09` se pueden leer como «periodos distintos = no comparable».
- La pregunta del usuario pide causa; el sistema prohíbe causa; no hay guard posterior.

## 5. Síntomas → primera divergencia

### S1 — causalidad

Evidence/context: `causalInCtx=false` en A–E. Limitations siempre incluyen `no_causalidad`.  
«podría estar relacionada con» **no existe** antes de OpenAI.  
No hay validator. El result pasa `answer` tal cual.

FIRST_DIVERGENCE: D.  
ROOT: LLM_NONCOMPLIANCE + POST_VALIDATION_ABSENT + PROMPT_AMBIGUOUS.

### S2 — «presentan cambios»

El contexto nunca dice «presentan cambios» (`presentChangesInCtx=false`).  
AVAILABLE siempre dice «presentes» aunque `clientes=[]` y `totalDeltaKg=0`.  
El modelo convierte BUCKET_EXISTS → «hubo cambios» y explica la falta de cifras con S3.

FIRST_DIVERGENCE: C `formatM9Family`. El literal LIVE nace en D.  
ROOT: FORMATTER_BUG + EVIDENCE_AMBIGUOUS + LLM_NONCOMPLIANCE.

### S3 — «ausencia de clientes en el mes disponible»

Literal de producto: **ausente**.  
Origen más cercano: `source_coercion` de loaders M9, pegado **solo** si `formatM9Family` ve SOURCE_AVAILABLE.  
Esa frase describe COALESCE (cliente ausente en un mes del par = 0 kg), no «el mes no tiene clientes / no hay evidencia».  
Si LIVE fue AVAILABLE, el modelo parafraseó coercion. Si LIVE fue NOT_FOUND, el contexto no trae esa frase (probe A) y sería invención pura.

SUPPORTED: no como prueba de ausencia de clientes/cifras.  
ROOT: EVIDENCE_AMBIGUOUS + LLM_NONCOMPLIANCE.

### S4 — alignment

Físico D: **comparable**. Context D: **comparable**.  
Modelo LIVE: comparable IGF/ARR + M9 «periodo diferente» limita comparación.  
`buildAlignment` no está roto para este caso.  
FIRST_DIVERGENCE: D.  
ROOT: LLM_NONCOMPLIANCE + PROMPT_AMBIGUOUS. No ALIGNMENT_BUG.

### S5 — tensión IGF vs ARR

Diferencia 1506.3507 vs 1469.36: soportada como diferencia entre objetos (bloques distintos; ARR formatter lo declara).  
Usarla como causa de la caída de ingreso: no soportada; prohibida por addendum (`IGF causó ARR` / causalidad).  
La frontera DIFFERENCE/TENSION/CAUSE se pierde en el addendum («tensiones» permitido) y se rompe en D.

## 6. Frontera mínima futura (NO implementar)

No un solo root. No mega-fix. No cambiar Root 1/2, planner, routing, SQL, schema, COALESCE, ni `buildAlignment` para el caso 2026-09 / 2026-09 / 2026-08→2026-09.

Cortes recomendados, separados:

1. **Formatter M9** (`formatM9Family`): distinguir BUCKET_EXISTS / BUCKET_NONEMPTY / magnitudes; no equivaler vacío a «presentes = cambios»; no pegar `source_coercion` como si fuera «ausencia de evidencia».
2. **Prompt**: comparable ≠ mismatch; 08 vs 09 con IGF/ARR en el par **es** comparable; tensión ≠ causa; declarar mismatch solo si `alignment.status=mismatch`.
3. **Validator post-generación determinista**: lenguaje causal, contradicción de `alignment.status`, claims M9 de «cambios» sin cifras. Passthrough actual = hueco.

Tradeoff: no volver el tono robótico; no dejar al LLM como fuente de verdad de alignment/M9; preservar bloques IGF/ARR/M9 separados.

Un validator solo tapa S1/S4; sin formatter, S2/S3 siguen mal alimentados. Un formatter solo no impide «podría estar relacionada». Por eso la frontera mínima es **combinación**, pero en PRs partidos.

## 7. Suites

Ejecutadas sin alterar tests:

- `test/director-ia-financial-diagnosis.test.js`
- `test/director-ia-m9-deltas.test.js`
- `test/director-ia-arr-projection-cutoff-label.test.js`

Resultado: 84 pass, 0 fail.

## 8. Invariantes

ARR_ROOT1_CHANGED: NO  
M9_ROOT2_CHANGED: NO  
PLANNER_CHANGED: NO  
ROUTING_CHANGED: NO  
SQL_CHANGED: NO  
SCHEMA_CHANGED: NO  
DEPENDENCY_CHANGED: NO  
LIVE_DB_USED: NO  
implementation_authorized: NO  
merge: NO  
deploy: NO  
next_task: NO
