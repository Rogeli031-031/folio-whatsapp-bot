# Reporte — AUDIT-DIRECTOR-IA-CONVERSATIONAL-INTELLIGENCE-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-INTELLIGENCE-001"
outcome: "DONE_PENDING_REVIEW"
mode: "AUDIT_ONLY"
determination: "OBJECTIVE_NOT_MET"
uncomfortable_conclusion: >
  Hay más confiabilidad y cobertura funcional que inteligencia conversacional nueva.
  52.5% no mide conversación. El primer turno de plant_diagnosis es una capacidad
  real de acceso/veracidad; el hilo conversacional posterior no existe como runtime.
g2: "N/A"
g3: "N/A"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-INTELLIGENCE-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "test/"
  - "scripts/"
  - "server.js"
  - "frontend-dashboard/"
  - "sql/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-tool-orchestrator.js"
  - "lib/director-ia-plant-diagnosis.js"
  - "lib/director-ia-m11-commercial-dossier.js"
  - "lib/director-ia-m9-deltas.js"
  - "lib/director-ia-ies-builder.js"
  - "lib/director-ia-reasoning-engine.js"
  - "frontend-dashboard/modules/director-ia/lib/api.ts"
  - "frontend-dashboard/modules/director-ia/components/DirectorIaChatPanel.tsx"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-READINESS-001"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

El objetivo original **no se cumple** como producto conversacional.

Director IA puede, en **un turno aislado y con wording canónico**, entregar evidencia más honesta que el dump de Action Register (pack `plant_diagnosis`, provenance, `null ≠ 0`, `SOURCE_RESTRICTED`, materialidad `kg_mes_real`, cobertura por `cliente_key`). Eso es infraestructura de **acceso y veracidad**.

No puede mantener un hilo: el frontend envía hasta 8 mensajes de `history`; OpenAI recibe **solo** `{system, user}` del turno actual; el planner reclasifica cada frase; 24 de 26 turnos de las conversaciones maestras caen en `intent: unknown`; el chat **ignora** `requires_clarification` salvo `project_status` y cae al contexto AR legado.

La frase canónica del system prompt AR:

> «No existe evidencia suficiente en Action Register para responder esa pregunta.»

es el opuesto del comportamiento deseado (qué sabe / qué no / qué falta / por qué / dónde / quién si hay vínculo físico / qué desbloquearía).

**52.5% mide cobertura funcional de la matriz, no inteligencia.**

NEXT_TASK (no autorizada): `ARCH-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-READINESS-001`.

---

## Ejecución

- Rama: `audit/director-ia-conversational-intelligence-001` (≠ `main`).
- HEAD: `4fe48221 Merge branch 'docs/director-ia-executive-prioritization-sync-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin código, tests, matriz, contratos, commit, push, merge.

Evidencia de routing (planner, preguntas literales de CURRENT_TASK):

| Turno | Intent | Confianza |
|---|---|---|
| ¿Cómo va Puebla? | `plant_diagnosis` | 0.84 |
| ¿Por qué bajó la venta ayer? | `financial_diagnosis` | 0.90 |
| Las otras 24 frases maestras | `unknown` + clarification ignorada | 0.35 |

---

## Objetivo original — veredicto

«Conversar naturalmente sobre la empresa con una IA que conoce los datos y, si no basta, identifica qué información necesita para continuar.»

| Parte | ¿Hoy? | Por qué |
|---|---|---|
| Conocer datos disponibles en un turno canónico | Parcial | Packs y loaders in-process; GET context subdeclara IGF/ARR/CS |
| Conversar naturalmente (elipsis, pronombres, «¿y Arturo?») | No | Historial no entra a OpenAI; planner por regex; packs no se reusan |
| Identificar brecha concreta cuando falta fundamento | No | Prompt AR cierra con frase fija; `plant_diagnosis` solo pide «validar el motivo»; no hay estructura de 7 campos |
| No inventar | Parcial (mejor que el legado ingenuo) | `NEW_TRUST_CAPABILITY` real en packs; el path `unknown` vuelve a AR+GPT |

No se diseñó solución. Solo se localizó el cuello.

---

## Legacy vs current

### Lo que OpenAI ya podía hacer con el contexto anterior

Con un blob de AR/DICF/bitácora en el user message, `gpt-4o-mini` ya podía:

- sintetizar un resumen ejecutivo;
- relacionar un cliente citado en DICF con una acción abierta si ambos textos estaban en el contexto;
- etiquetar incertidumbre en lenguaje natural;
- hacer preguntas de seguimiento **si el historial de chat se le enviaba**.

Hoy el historial **no se le envía**. El FE sí lo transporta (`history.slice(-8)`). El backend solo usa `history` en `expandQuestionFromChatHistory`, y únicamente si el regex de pronombres coincide **y** un mensaje **user** previo contiene un nombre de ≥3 tokens y ≥10 caracteres. «Arturo», «él», «¿Por qué?» y «¿Y Arturo?» **no** expanden.

Clasificación: síntesis/relación/hipótesis = `ALREADY_EXISTED`. Continuidad vía historial OpenAI = `POTENTIALLY_REGRESSED` respecto a un chat que reenvía mensajes.

### Capacidades nuevas reales (acceso / veracidad)

| Capacidad | Clase | Evidencia |
|---|---|---|
| Pack `plant_diagnosis` 6 fuentes, 1 OpenAI, sin M9 | `NEW_DATA_CAPABILITY` + `NEW_TRUST_CAPABILITY` | `loadPlantDiagnosisForChat` / `assemblePlantDiagnosisEvidence` |
| `kg_mes_real` como magnitud; no forecast−real | `NEW_TRUST_CAPABILITY` | `MAGNITUDE_FIELD`; addendum; SELECT mes previo |
| Concentración top-5 + denominador/periodo | `DETERMINIZED_EXISTING_REASONING` (ranking) + `NEW_TRUST_CAPABILITY` (null≠0, homogeneidad) | GPT podría ordenar kg si viera todas las filas; el runtime trunca y elige campo seguro |
| Cobertura DICF por `cliente_key` M11 | `NEW_DATA_CAPABILITY` + `NEW_TRUST_CAPABILITY` | Join determinístico; no nombre |
| `SOURCE_RESTRICTED` ≠ missing; GA partial | `NEW_TRUST_CAPABILITY` | Pack planta vs aborto financiero |
| Provenance por bloque | `NEW_TRUST_CAPABILITY` | |
| Slices M2–M18 query JSON | `NEW_DATA_CAPABILITY` | No son conversación |
| Expediente factual SELECT-only | `NEW_DATA_CAPABILITY` + `NEW_TRUST_CAPABILITY` | **Sin OpenAI** (`openai_called: false`) |
| M9 periodos YYYY-MM | `NEW_DATA_CAPABILITY` | **Sin OpenAI**; no es «ayer» |
| IES Builder / Reasoning Engine en `askDirectorIa` | `CURRENTLY_MISSING` (código existe, chat no lo llama) | Ningún `require` de IES/RE en `director-ia-chat.js` |

### Lo que se volvió determinístico de algo que GPT ya razonaba

- Ranking «quién concentra kg» si las filas ya están en contexto: `DETERMINIZED_EXISTING_REASONING`. Justificable por truncamiento y por no mezclar unidades.
- Respuesta del expediente como texto armado sin modelo: síntesis `DETERMINIZED_EXISTING_REASONING`; conversación `POTENTIALLY_REGRESSED`.
- Respuestas M9 numéricas sin modelo: cálculo exacto **debe** ser determinístico; «por qué» no sale de ahí.
- Planner regex: no es razonamiento nuevo; es un clasificador que **rompe** el hilo.

### Restricciones que reducen capacidad previa

1. System prompt AR obliga una frase fija de insuficiencia → mata la identificación de brecha.
2. `expediente_comercial` y `delta_*` no llaman OpenAI → no hay diálogo sobre esos hechos.
3. `plant_diagnosis` prohíbe causa (correcto) pero el follow-up no reusa el pack → el ejecutivo no puede preguntar «¿por qué?» sobre lo ya mostrado.
4. Orchestrator «no ejecuta tools» (`lib/director-ia-tool-orchestrator.js` L6). El plan se loguea; el chat ramifica a mano. Fase 2/3 no gobiernan la conversación.

No hay `NEW_REASONING_CAPABILITY` demostrable en el chat legado. IES/N5 no están en el path.

---

## Frontera determinístico vs LLM (auditada, no dogma)

| Debe ser determinístico | ¿Hoy lo es? | Tensión |
|---|---|---|
| Adquisición de datos | Sí, en intents in-process | Follow-up `unknown` re-adquiere AR, no el pack previo |
| Authz | Sí | |
| Identidad / joins | Sí en expediente y cobertura `cliente_key` | «Arturo» no entra al extractor de nombres (≥3 palabras, ≥10 chars) |
| Unidades / periodos | Sí en packs | «Ayer» se ignora; M9 es YYYY-MM |
| Cálculos exactos | Sí (top-N, shares, deltas mensuales) | Ranking podría ser LLM si no hubiera truncamiento |
| Provenance / absence / restricted | Sí en packs | No se reinyecta al turno 2 |

| LLM debería evaluar | ¿Hoy lo hace? | Tensión |
|---|---|---|
| Síntesis | Solo si el intent llama OpenAI | Expediente/M9/folios no |
| Relación de evidencias | Sí dentro de **un** userContent | No entre turnos |
| Explicación | Promptida; causa prohibida | Correcto como veracidad; el hilo no puede profundizar |
| Hipótesis etiquetadas | No hay objeto; a lo sumo texto | 04/05 no están en chat |
| Conversación / follow-up | No | History no es messages OpenAI |
| Identificar información faltante | Débil | Frase AR fija; plant_diagnosis: «validar el motivo» |

Tensión contractual: 04/05 definen un pipeline N1–N5 que el chat legado **no ejecuta**. Tratar el chat como N5 sería una mentira. La auditoría no modifica 04/05.

Sobreprogramación: no hace falta un score 0–100 ni Recommendation N5 para conversar. Sí hace falta no sustituir el hilo por regex. El join `cliente_key` **no** debe volver al LLM.

Qué **no** construir porque el LLM ya puede: re-rankings compuestos, «inteligencia» N5 de fachada, más addendums de estilo si la evidencia ya está etiquetada.

Qué **sí** debe seguir determinístico: authz, SELECT, joins, unidades, periodos, `null≠0`, restricted/error, `kg_mes_real` vs forecast.

Qué evidencia entregar al LLM para aprovecharlo: el pack del hilo vigente + historial reciente + huecos **ya marcados** (unknown kg, coverage_unknown, SOURCE_RESTRICTED), no un dump AR distinto en cada elipsis.

---

## Información insuficiente

Comportamiento deseado (7 campos): **no implementado**.

| Campo deseado | ¿Runtime hoy? |
|---|---|
| Qué sí sabe | Implícito si el pack/contexto está en el mismo turno |
| Qué no sabe | Parcial (`limitations`, `assembly_status`, coverage_unknown) |
| Qué dato falta | No estructurado |
| Por qué lo necesita | No |
| Dónde podría obtenerse | No (salvo que el modelo alucine un módulo) |
| Quién podría aportarlo | Solo si el pack ya trae responsable de **acción**; el prompt de planta lo permite. Sin vínculo físico: no hay mecanismo y el prompt prohíbe inventar (correcto) |
| Qué análisis/decisión desbloquearía | No |

`plant_diagnosis` llega a: «dilo y sugiere validar el motivo». Eso no es cierre de brecha. Es un tope honesto.

El path AR legado es peor: respuesta **exacta** de insuficiencia AR.

Prohibiciones (no inventar causa/responsable/fuente; comentario ≠ hecho; null ≠ 0; restricted ≠ not found): en packs, **sí** están. En `unknown`+AR, **no** hay esa disciplina de brecha.

---

## Continuidad multi-turn (física)

| Dimensión | Runtime |
|---|---|
| Entidad entre turnos | No. Extractor de nombres no cubre un token «Arturo». Pronombres cubren un subconjunto y solo miran `role=user` |
| Planta | `planta_id` del request/UI. «¿Cómo va Puebla?» **no** cambia de planta; si el selector no es Puebla, el pack es de otra planta. `UNKNOWN_REQUIRES_RUNTIME_TEST` en UI |
| Periodo | No hay hilo de periodo. «Ayer» no se persiste |
| Problema discutido | No hay session object |
| «él» / «ese cliente» | Regex estrecho; no usa respuestas assistant |
| «¿Y Arturo?» | `unknown` |
| «¿Y tiene acción?» / «¿Qué falta saber?» | `unknown` |
| Cambio de tema | De facto: cada turno es un tema nuevo clasificado por regex |
| Volver al tema | No, salvo que el usuario repita wording canónico |

`openaiDirectorIaChat`: `messages: [{role:system},{role:user}]`. Hecho físico.

---

## Cinco conversaciones maestras

No se afirma que «funcionen». Se sigue código + planner.

### 1. Diagnóstico comercial natural

1. «¿Cómo va Puebla?» → `plant_diagnosis` + 1 OpenAI + materialidad. **Único turno del suite que entra al pack nuevo.**
2. «¿Qué es lo que más te llama la atención?» → `unknown` → AR+GPT, **sin** pack previo. El modelo no ve su propia respuesta anterior.
3. «¿Por qué?» → `unknown`.
4. «¿Y Arturo?» → `unknown`. No expediente (`isExpedienteComercialQuestion` exige «expediente» / «qué sabemos comercialmente»).
5. «¿Qué sabemos de él?» → planner `unknown`. En el fallback, `isCommercialIdentityQuestion` puede ir a `dicf_focused` **sin resolver «él»**.
6. «¿Tiene alguna acción?» → `unknown`.
7. «¿Qué falta saber?» → `unknown` + probable frase AR de insuficiencia.

Veredicto: se rompe en el turno 2. El slice de materialidad no es conversación.

### 2. Información insuficiente

«¿Por qué dejó de comprar Arturo?» → `unknown` (no es `dejaron de comprar` plural; no es expediente; no es `client_analysis` porque no dice «cliente(s)»). No hay brecha de 7 campos. El resto del hilo también `unknown`.

Veredicto: no arranca.

### 3. Desviación diaria futura

«¿Por qué bajó la venta ayer?» → `financial_diagnosis` (regex por qué + bajó + venta). Carga IGF+ARR+**M9 mensual**. «Ayer» no existe como granularidad. M9 no está en `plant_diagnosis`. El pack financiero **prohíbe causa**.

Se rompe en **granularidad + misroute**. No exigir motor diario todavía; está `CURRENTLY_MISSING`. Los follow-ups son `unknown`.

### 4. Descuento diario futuro

«¿Por qué subió el descuento por kg ayer?» → `unknown` (M9 descuento exige «cambio/delta/variación», no «por qué subió»). Ni siquiera entra al delta mensual. `CURRENTLY_MISSING` dato diario + **hueco de routing** para descuento.

### 5. Acción y seguimiento

«¿Qué pasó con la acción de Julio Pérez?» → `unknown` (expediente quiere «qué está pasando con» + acciones; AR quiere «vencidas» o «abiertas/pendientes/tema»). Julio en cobertura de planta solo si cayó en top-5 del pack **de otro turno no reusado**. Follow-ups `unknown`.

Veredicto: no hay seguimiento de acción como hilo.

---

## Gaps

| Tipo | Gap | Dónde |
|---|---|---|
| Datos | Venta/descuento **ayer** (serie diaria causal) | No hay loader; M9 es YYYY-MM; `plant_diagnosis` sin M9 |
| Datos | Nombre corto de cliente → identidad | `extractLikelyClientNameTokensFromQuestion` |
| Conversación | History no es contexto OpenAI | `openaiDirectorIaChat`; FE `api.ts` L149 |
| Conversación | `unknown` no clarifica; cae a AR | `askDirectorIa` vs solo `project_status` |
| Conversación | Packs no se reusan | Sin session/evidence binding |
| Razonamiento | No hay razonamiento **nuevo**; hay menos hilo | Chat vs IES/RE desconectados |
| Evidence-gap | 7 campos ausentes | Prompts AR y planta |
| Regresión | Insuficiencia canónica AR; silos sin OpenAI (expediente/M9) | `DIRECTOR_IA_SYSTEM_PROMPT`; `openai_called: false` |

---

## Clasificación compacta

| Capacidad | Clase |
|---|---|
| Síntesis ejecutiva con evidencia en el mismo turno | `ALREADY_EXISTED` |
| Enviar historial al modelo | `POTENTIALLY_REGRESSED` |
| Pack planta 6 fuentes + provenance + GA partial | `NEW_DATA_CAPABILITY` / `NEW_TRUST_CAPABILITY` |
| Materialidad kg + cobertura `cliente_key` | `NEW_TRUST_CAPABILITY` + ranking `DETERMINIZED_EXISTING_REASONING` |
| «Qué revisar primero» como texto de prompt | `DETERMINIZED_EXISTING_REASONING` (GPT ya podía priorizar si veía kg+acciones) |
| Follow-up elíptico | `CURRENTLY_MISSING` |
| Brecha 7 campos | `CURRENTLY_MISSING` |
| Desviación / descuento de ayer | `CURRENTLY_MISSING` |
| IES/N5 en chat | `CURRENTLY_MISSING` |
| Recommendation N5 | `CURRENTLY_MISSING` (y no debe fingirse) |
| «¿Cómo va Puebla?» vs planta del selector | `UNKNOWN_REQUIRES_RUNTIME_TEST` |
| Julio Pérez en AR top-N del dump | `UNKNOWN_REQUIRES_RUNTIME_TEST` |

---

## Conclusión incómoda

Se construyó **mucha confiabilidad y poca inteligencia nueva**.

El porcentaje 10.5/20 = 52.5% cuenta módulos consultables. No cuenta si un Director puede hablar tres minutos sobre Puebla, Arturo y lo que falta.

El trabajo reciente (ensamblaje, materialidad, `cliente_key`) es real y debe conservarse como determinístico de **datos/verdad**. No es un cerebro conversacional. Parte de la lógica «ejecutiva» reimplementa lo que GPT ya hacía con evidencia etiquetada, y al mismo tiempo se le **quitó** el historial.

Si una restricción redujo capacidad: sí. La frase fija de insuficiencia AR y el aislamiento de turno.

Si algo sí es capacidad nueva: sí. Acceso honesto multi-fuente y cobertura por clave, **en un turno**.

---

## Cuello de botella único

**Aislamiento de turno:** cada enunciado se clasifica solo; el historial no llega a OpenAI; el pack de evidencia no se liga al hilo; `unknown` no continúa, vuelve a Action Register.

Sin eso no hay conversación natural ni brecha útil. Un motor de desviación diaria o un workflow de evidence-gap **antes** de ligar turnos repetiría el mismo corte en el turno 2.

No se diseña el mecanismo (¿history en messages? ¿reuso de pack? ¿ambos?). Eso es la siguiente tarea.

---

## Percentage

**10.5 / 20 = 52.5%.** Delta **0.0 pp.** Ningún módulo cambia. La auditoría no suma inteligencia.

## Acciones no realizadas

Sin implementación, código, tests, matriz, contratos, IES/RE, prompts nuevos, commit, push, merge. NEXT_TASK no autorizada ni ejecutada.

## Gates

G1 intacto. G2/G3/G8 N/A. G5 pendiente humano.

## secrets_check

none

## git diff --check

Se confirma al cerrar.

## git status

Se confirma al cerrar (solo los dos archivos autorizados).

## NEXT_TASK

Propuesta exacta (no autoriza G1; no encadena; no ejecutar):

**ARCH-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-READINESS-001**

Readiness del cuello demostrado: continuidad multi-turn en el chat legado (historial físico + ligadura de follow-up al pack de evidencia vigente), sin fingir N5, sin motor diario y sin workflow de brechas todavía.
