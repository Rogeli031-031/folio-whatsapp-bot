# Reporte — AUDIT-DIRECTOR-IA-PERSISTENT-MEMORY-EKE-GATE-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-PERSISTENT-MEMORY-EKE-GATE-001"
outcome: "DONE_PENDING_REVIEW"
mode: "CONTRACT_AUDIT_ONLY"
determination: "ALLOWED"
g5_contract_conformance: "APPROVED"
g2: "N/A"
g3: "N/A"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Contract gate is not module coverage."
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PERSISTENT-MEMORY-EKE-GATE-001.md"
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
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-001"
secrets_check: "none"
human_decision_needed:
  - "G5 de LOOP_PROTOCOL (cerrar esta tarea y autorizar la siguiente) permanece humano. Esta auditoría no autoriza ni ejecuta NEXT_TASK."
  - "g5_contract_conformance=APPROVED es el dictamen de conformidad del first slice, no un G1 nuevo."
```

## Resumen ejecutivo

**ALLOWED.**

`pending_work_items_only`, persistido como memoria **operativa** del chat legado (`arr`), fuera de EKS / IES / N5, **no está prohibido** por los contratos congelados. No requiere modificar contratos.

EKE §15 prohíbe memoria conversacional persistente a **la primera versión del Motor**, no al chat legado. El mismo §15 distingue el Motor del «routing actual del chat».

El work item («quedó pendiente investigar X») no es evidencia, Observation, IES, Recommendation N5 ni conclusión factual vigente. Al recuperarlo: authz + entidad + planta + requery.

**G5_contract_conformance = APPROVED** (dictamen de esta auditoría).  
G2/G3 = **N/A**.  
Baseline: **10.5 / 20 = 52.5%**, **0.0 pp**.

NEXT_TASK (no autorizada, no ejecutada): `IMPL-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-001`.

---

## Ejecución

- Rama: `architecture/director-ia-persistent-conversational-memory-readiness-001` (≠ `main`).
- HEAD de partida: `44ff6b1d`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Transición `AUTHORIZED` → `IN_PROGRESS` solo cambió `status`.
- Transición final: `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación, SQL, tablas, cambios de contrato, matriz, commit, push, merge.
- No se reabrió la readiness. No se rediseñó la memoria.

Objeto evaluado (fijo, de la readiness previa):

> Puebla → Arturo → `expediente_comercial` → quedó pendiente conocer el motivo documentado → `active`

Significa: «quedó pendiente investigar X».  
No significa: «X sigue siendo verdad hoy».

---

## 1. Método

Por cada restricción relevante: sujeto, objeto, scope, a qué capa aplica, y si el first slice cae **materialmente** dentro.

Texto contractual vs interpretación se marcan. No se usa una frase aislada. No se inventan excepciones.

Reglas de decisión (CURRENT_TASK):

| Veredicto | Condición |
|---|---|
| ALLOWED | Los contratos no prohíben el store operativo y el slice se implementa sin modificar contratos |
| NOT_ALLOWED | Prohibición explícita aplicable al slice |
| REQUIRES_CONTRACT_CHANGE | El slice necesita una capacidad que los contratos reservan, excluyen o no permiten sin modificarlos |

---

## 2. EKE §15 — texto completo y contexto

### Texto (§15, íntegro)

> La primera versión del Motor **no** hará:
>
> - Ejecución transaccional (mutaciones de folio, presupuesto, permisos, ARR load, etc.).
> - Memoria conversacional persistente (solo `history` efímero del request, si existe).
> - Voz.
> - Integración completa de folios/kanban/historial/documentos/cheques/pólizas.
> - Análisis documental (PDF/medios).
> - Causalidad automática acción→ARR o ingreso.
> - Aprendizaje autónomo de reglas o pesos.
> - Modificación automática de pesos de confianza.
> - Sustitución del routing actual del chat hasta que se decida gobernarlo explícitamente.
> - Uso de endpoints Delta UI o Excel Taller/GASTOS/INVERSIONES como si estuvieran integrados.

Fuente: `docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md`, §15.

### Sujeto / objeto / scope

| Campo | Valor contractual |
|---|---|
| Sujeto | «La primera versión del **Motor**» |
| Objeto (viñeta 2) | «Memoria conversacional persistente» |
| Atenuante en la misma viñeta | El Motor, en v1, solo puede usar «`history` efímero del request, si existe» |
| Scope del §15 | «Límites de la Primera Versión» del Motor, no de Director IA entero |
| Viñeta 9 (mismo §) | El Motor v1 **no** hará «Sustitución del routing actual del chat…» |

### Contexto que fija qué es «el Motor»

EKE título: «Arquitectura conceptual del Motor de Conocimiento Ejecutivo».  
EKE §1 propósito: convierte resultados de herramientas en conocimiento estructurado apto para IES.  
EKE §1 «Qué produce»: N1–N4, cobertura, conflictos, preguntas abiertas, IES.  
EKE §1 «No posee»: Interfaces; implementación.  
EKE pipeline: Constitution → Motor → Evidence Builder → IES → Reasoning Engine → Interfaces.  
EKE apéndice: «Las Fases 1–3 son productores de entrada al Motor; no son el Motor».

Índice (`DIRECTOR_IA_ARCHITECTURE_INDEX.md` §3): «Chat / UI legado … **no** es el pipeline N1–N4→IES».

**Interpretación (no texto):** el chat legado y el Motor son capas distintas. §15 limita al Motor. La viñeta 9 lo confirma: existe un routing de chat que el Motor v1 no sustituye.

### ¿El first slice cae en §15?

| Pregunta | Respuesta |
|---|---|
| ¿El slice implementa la primera versión del Motor? | No. Owner = chat legado operativo. |
| ¿Persiste memoria **dentro del Motor** / como entrada de conocimiento del Motor? | No. No es Bundle, IES ni observación. |
| ¿Sustituye el routing del chat por el Motor? | No. |
| ¿Alimenta el Motor con memoria persistente como si fuera evidencia? | Prohibido por el slice (requery). Eso **sí** violaría EKE §2 si se hiciera. El slice no lo hace. |

**Dictamen §15:** la viñeta 2 **no** es una prohibición de producto sobre el chat legado. Aplicarla a `pending_work_items_only` sería extraer la frase «Memoria conversacional persistente» sin su sujeto.

### EKE §2 (entrada del Motor) — no se usa aislada

Texto:

> `question` | Pregunta original (o expandida por historial efímero de la solicitud, **sin memoria persistente**).

| Campo | Valor |
|---|---|
| Sujeto | Contrato de **entrada del Motor** |
| Objeto | Cómo se forma el campo `question` que el Motor recibe |
| Scope | Motor, no tablas operativas del chat |
| ¿Cae el slice? | No, si el work item no se inyecta al Motor como `question` persistida ni como hecho |

**Interpretación:** si un IMPL futuro mete el pendiente en el Motor como conocimiento, viola §2. El slice auditado no lo hace: el pendiente guía retoma + requery en el chat legado.

### EKE §10 — `open_questions`

Sujeto: Motor. Objeto: preguntas abiertas del IES (huecos para cerrar el IES). Scope: ciclo N1–N4 / IES.

`pending_information_gap` del chat **no** es `open_question` del Motor. No se persiste en EKS. No es hipótesis (EKE §10 + invariante 11).

**No aplica** al slice.

### EKE §1 / §14 — escritura y conocimiento

El Motor no ejecuta escrituras transaccionales (§1, §14.9, §15 viñeta 1, §16.9). Una tabla `arr` de work items del chat no es mutación de folio/presupuesto/permisos ni escritura del Motor.

Invariantes §14 gobiernan evidencia/hechos/diagnóstico/IES del Motor. Un work item que no afirma verdad empresarial no entra en esos invariantes.

---

## 3. Constitución

Texto (I, líneas rojas):

> Director IA: no es un chatbot; … nunca alterar silenciosamente el estado institucional del conocimiento.

Texto (III): N1 observaciones = datos crudos de herramientas; N2 hechos; N3 evidencias; N4 diagnóstico; N5 hipótesis. N1–N4 pertenecen al Motor. N5 es exclusiva del Reasoning Engine.

Texto (X): Interfaces = canales de consumo (chat, …). «Ninguna interfaz reescribe hechos, evidencias, diagnósticos ni el IES.»

| Restricción | Sujeto | Objeto | Scope | ¿Cae el slice? |
|---|---|---|---|---|
| «no es un chatbot» | Director IA | Identidad | Todo Director IA | No. Persistencia operativa de retoma no convierte al sistema en chatbot ni en Motor |
| «nunca alterar silenciosamente el estado institucional del conocimiento» | Director IA | Conocimiento institucional (N1–N5 / IES) | Todo Director IA | No, **si** el work item no se presenta como hecho/IES/Snapshot |
| Taxonomía N1–N5 | Motor / RE | Conocimiento por niveles | Pipeline constitucional | No. El pendiente no es Observation, hecho, evidencia, diagnóstico ni hipótesis |
| Interfaces no reescriben IES | Chat como interfaz | IES / N1–N4 | Canal | No. El slice no escribe IES ni EKS |

**Interpretación:** la línea roja **sí** prohibiría tratar el pendiente como verdad vigente («Arturo sigue sin comprar»). El slice + requery son precisamente la salvaguarda que la Constitución exige. No es una veda de persistir «quedó pendiente investigar X».

---

## 4. EKS (`03`)

Texto §1: EKS recibe un Knowledge Bundle N1–N4 y produce Knowledge Snapshot. No llama LLM. No lee fuentes operacionales para inventar conocimiento. Rol único: persistir el Bundle append-only.

| Campo | Valor |
|---|---|
| Sujeto | EKS |
| Objeto | Bundles / Snapshots |
| Scope | Almacén de conocimiento ejecutivo, no todo `arr` |
| ¿Cae el slice? | **No**, porque el owner propuesto es chat legado / `arr`, `EKS: false` |

Meter work items en `eks.snapshots` **sí** violaría `03`. El slice no lo hace.

EKS no declara ser el único almacén de cualquier fila Director IA. No reserva «toda persistencia» ni prohíbe tablas operativas de producto.

**No hay prohibición EKS aplicable al slice.** No hay reserva que obligue contrato nuevo para un store que **no** es conocimiento N1–N4.

---

## 5. IES (`04`)

Texto §1: el IES es proyección oficial de un Knowledge Snapshot. «El IES no es … Un mensaje de chat». El IES Builder no recibe chat/request runtime como segunda entrada.

| Campo | Valor |
|---|---|
| Sujeto | IES Builder / producto IES |
| Objeto | Proyección desde Snapshot |
| Scope | Pipeline Snapshot → IES → RE / Interfaces |
| ¿Cae el slice? | No. Un work item no es IES ni entra al IES Builder |

**No aplica.** G2/G3 sobre `04` no se activan.

---

## 6. Reasoning Engine (`05`)

Texto §18 regla 6:

> La futura memoria conversacional **no** puede tratar Reasoning Run como verdad institucional **sin** un contrato explícito distinto (fuera de v1.0 de este documento).

Texto §24.2 (riesgo pendiente, no cláusula de veda):

> Contrato futuro de memoria conversacional vs Run (no tratar Run como verdad).

| Campo | Valor |
|---|---|
| Sujeto | Futura memoria conversacional **respecto de Reasoning Run** |
| Objeto | Tratar el Run como verdad institucional |
| Scope | Relación memoria ↔ N5 / Run |
| ¿Cae el slice? | No. El slice no persiste Run, hipótesis N5 ni recommendations |

**Texto vs interpretación:** `05` **reconoce** que puede existir memoria conversacional futura y le pone un límite (no usar Run como verdad). El «contrato futuro vs Run» es riesgo/diferido de **esa** relación, no un prerequisite para work items del chat legado que no tocan N5.

Leer §24.2 como «ninguna memoria sin contrato nuevo» extrae el título y abandona el objeto (vs Run).

---

## 7. Architecture Index

Texto: EKE = gobernanza del Motor. EKS = persistencia del Bundle. Chat legado = soporte parcial de producto; **no** es el pipeline N1–N4→IES. Capabilities/Planner/Orchestrator no implementan Constitución/EKE/EB.

El índice **no redefine** (norma de jerarquía). Confirma la separación Motor ≠ chat legado usada en §15.

No exige un contrato `06+` para estado operativo del chat. `06-CHANNEL-PROJECTION` es proyección de IES a canal; no es inbox de pendientes.

---

## 8. Boundary tests del slice

### Test 1 — `pending_information_gap`

¿Es contexto operativo, conocimiento ejecutivo, evidencia, Observation, IES o Reasoning Run?

**Contexto operativo de conversación.** Describe un hueco de trabajo («falta conocer motivo documentado»). No es Observation (no es dato de tool). No es hecho N2. No es evidencia N3. No es `open_question` del IES. No es Run.

Condición de validez: no afirmar que el hueco **sigue** siendo verdad empresarial sin requery.

### Test 2 — `planta_id` + `entity_key`

¿Guardar identificadores para reanudar viola alguna boundary?

**No.** EKE §2 ya contempla `planta_id` y `entity` como entrada del Motor (sesión). El chat legado ya los usa por request. Persistirlos como **punteros de retoma** no es un hecho de negocio. Deben revalidarse (authz, planta, entidad). No son permiso cacheado.

### Test 3 — descripción mínima del pendiente

¿Puede persistirse sin convertirla en hecho?

**Sí**, si el texto es «quedó pendiente conocer el motivo documentado» y no «Arturo abandonó porque…». Resumen tipo B (claims del assistant) está fuera del slice. La descripción nombra el trabajo, no el estado del cliente.

### Test 4 — `status` active/resolved

¿Describe el work item o el negocio?

**El work item.** `active` = el pendiente de investigación sigue abierto como tarea de conversación. `resolved` = ese pendiente de trabajo se cerró (gap cubierto por evidencia fresca, o el usuario lo cerró). No es estatus de compra, acción AR ni cobertura `CONOZCO`.

### Test 5 — revalidation

¿El requery mantiene MEMORY ≠ EVIDENCE?

**Sí, y es la condición de conformidad.** Constitución (no alucinar / no rellenar / atribución) + EKE (no afirmar tools no consultadas) exigen que lo mutable se vuelva a consultar. El slice declara authz + entidad + planta + requery al recuperar. Sin eso, el mismo store **dejaría** de ser ALLOWED (pasaría a afirmar verdad stale).

---

## 9. ¿Nueva tabla operativa exige G2/G3?

| Pregunta | Evidencia | Conclusión |
|---|---|---|
| ¿Modificar `docs/director-ia/`? | El slice no toca contratos | G2 no se activa |
| ¿Crear contrato de arquitectura nuevo? | Work item ≠ Bundle/IES/Run; no hay hueco normativo que deba definirse para permitir el store | G3 no se activa |
| ¿EKS/IES/05 reservan este almacén? | No. Reservan conocimiento N1–N5 y Run | N/A |
| ¿Toda tabla `arr` requiere contrato? | Los contratos no lo dicen. EKS prohíbe meter no-Bundles **en EKS**, no prohíbe `arr` operativo | No |

G2 = **N/A**. G3 = **N/A**. Sin cambio respecto a la readiness. Esta auditoría no reabre el diseño; solo confirma que el ownership propuesto no choca con contratos.

---

## 10. Veredicto

| Candidato | ¿Por qué no? |
|---|---|
| NOT_ALLOWED | No hay prohibición explícita cuyo sujeto+objeto cubran work items del chat legado fuera de EKS/IES/N5 |
| REQUIRES_CONTRACT_CHANGE | Nada vigente reserva esta capacidad al Motor, al EKS o a un contrato futuro **salvo** el caso (fuera de slice) memoria-vs-Run |

**ALLOWED.**

Los contratos no prohíben este store operativo. El first slice puede implementarse sin modificar contratos congelados.

Condiciones de conformidad que el IMPL no puede romper (si las rompe, deja de ser este slice y este dictamen no aplica):

1. Owner = chat legado / `arr`. Cero writes a EKS, IES, Motor, Run.
2. El registro significa «quedó pendiente investigar X», no «X es verdad hoy».
3. No transcript, no Observation, no IES, no N5, no conclusión factual vigente.
4. Recuperación: authz + planta + entidad + requery. Evidencia actual gana.
5. No inyectar el work item como `question` persistida ni como hecho al Motor (EKE §2 / §15).

---

## 11. Gates y porcentaje

| Gate | Valor | Nota |
|---|---|---|
| G1 | AUTHORIZED (humano, intacto) | No tocado |
| G2 | N/A | Sin cambio de `docs/director-ia/` |
| G3 | N/A | Sin contrato nuevo |
| G5_contract_conformance | **APPROVED** | Dictamen de esta tarea. No es G1 de NEXT_TASK. No abre el G5 de LOOP_PROTOCOL |
| G8 | N/A | |

Porcentaje: **10.5 / 20 = 52.5%** antes y después. **0.0 pp**. Esta gate no es cobertura de módulo.

---

## NEXT_TASK (no autorizada, no ejecutada)

Exactamente una:

`IMPL-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-001`

STOP.
