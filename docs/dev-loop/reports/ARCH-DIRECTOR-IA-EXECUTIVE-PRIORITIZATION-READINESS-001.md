# Reporte — ARCH-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
determination: "READY_WITH_LIMITS"
first_slice: "commercial_materiality_and_coverage"
destination: "chat legado (OpenAI existente), NO Reasoning Engine oficial N5"
g2: "N/A"
g3: "N/A"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-READINESS-001.md"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-010.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "lib/director-ia-plant-diagnosis.js (lectura)"
  - "lib/director-ia-chat.js / planner.js (lectura)"
  - "lib/dicf.js / dicf-acciones.js (lectura)"
  - "lib/director-ia-m11-commercial-dossier.js (lectura)"
  - "lib/director-ia-commercial-state.js (lectura)"
  - "lib/director-ia-action-register.js (lectura)"
  - "lib/director-ia-igf-arr.js (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-001"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8 = N/A. El slice no reabre 04/05 ni calibra MAT_*."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "52.5% no cambia. Tras IMPL futuro: 0.0 pp. Ningún módulo cambia."
```

## Resumen ejecutivo

**READY_WITH_LIMITS.** El primer slice seguro es **`commercial_materiality_and_coverage`** dentro de `plant_diagnosis` (chat legado).

Hoy el pack enumera fuentes. El SELECT de `arr.dicf_cliente_mes` **ya lee** kg/ingreso y el summarizer **los descarta**. No hay orden intra-kg. No hay cobertura DICF por `cliente_key`. El prompt no pide «qué revisar primero».

Eso **sí** se puede cerrar sin score, sin IES, sin Recommendation N5 y sin `MAT_*`: exponer magnitudes homogéneas, concentrar top-N, cruzar cobertura con el patrón M11 (`buildClienteKey`), y pedir al modelo una agenda comercial corta con siguiente paso humano e incertidumbre.

**No** está listo como primer slice: trade-off económico recuperar vs no recuperar, agenda heterogénea AR+IGF+CS, antes→acción→después causal, persistir recomendaciones.

Caso competencia/margen: el comentario es **declaración almacenada**, no hecho externo. No hay campo de oferta del competidor ni margen incremental de cliente. La respuesta correcta del slice **no** es «hay que recuperarlo»; es «es material / está desatendido / falta X para decidir».

NEXT_TASK (no autorizada): `IMPL-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-001`.

---

## Ejecución

- Rama: `architecture/director-ia-executive-prioritization-readiness-001` (≠ `main`).
- HEAD: `16772ead Merge branch 'architecture/director-ia-global-next-module-prioritization-010'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin código, matriz, contratos, persistencia, commit, push, merge.

---

## Baseline

| Campo | Valor |
|---|---|
| Global | **10.5 / 20 = 52.5%** |
| Runtime | `plant_diagnosis`: 6 fuentes; SELECT CS; sin M9; 1 OpenAI |
| Gap | evidencia reunida ≠ prioridad ejecutiva |
| Tras este readiness | **52.5%** (0.0 pp) |
| Tras IMPL esperado | **52.5%** (inteligencia transversal; no suma 0.5) |

---

## Contract audit

| Contrato | Qué permite | Qué no |
|---|---|---|
| Constitución V.14 | Recomendaciones específicas, condicionadas, trazables | Acusar intención; conciliar sin evidencia |
| Constitución V.15 | Estructura: conclusión, evidencia, diagnóstico, límites, hipótesis si procede, acción siguiente | Tratar el chat legado como IES oficial |
| EKE §7A | Catálogo `MAT_*`; sin ruleset → `MATERIALITY_NOT_ASSESSED` | Inventar `MAT_*` en chat |
| 04 IES | Proyecta materiality; no la calcula | Chat legado no emite IES |
| 05 §12 / D9 | Recommendation N5 anclada a IES; fail-closed | Chat legado **no** crea esos objetos |
| 05 §13 | Next Verification ≠ Recommendation; RE no ejecuta | No tools/writes desde N5 |
| 05 §14 | Decision Option; el RE no elige | Mandato automático |

**G2 = N/A. G3 = N/A.** No hay contradicción que obligue a reabrir 04/05. El slice es wiring + campos ya persistidos + prompt.

---

## Legacy chat vs N5

| Chat legado puede | Chat legado no puede |
|---|---|
| Sugerencia **textual** condicionada (revisar, validar, contactar, pedir resultado, obtener dato, escalar para decisión humana) | Objeto `Recommendation` N5 / `recommendation_id` |
| Citar bloques de provenance (`commercial_state`, `dicf`) | `supporting_evidence_ids` IES |
| Explicar materialidad con **unidad + periodo + denominador** | Token `MAT_*` |
| Declarar unknown | Completar vacíos; fingir IES |

`plant_diagnosis` ya declara: «no es IES; no es Reasoning Engine N5». El IMPL debe conservar esa frontera.

---

## Physical data inventory

### `arr.dicf_cliente_mes` (caché; SELECT-only)

Persistido (INSERT `lib/dicf.js`): `plant_code`, `year`, `month`, `cliente_norm`, `canal`, `subcanal`, `estado`, `window_days`, `last_date`, `freq_days`, `days_since_last`, `kg_hist`, `desc_hist`, `desc_kg_hist`, `kg_mes_real`, `kg_mes_forecast`, `margen_mes_kg`, `ingreso_forecast`, `es_nuevo`, `es_recuperable`.

**No persistidos** (solo en memoria de `computeDicf`): `kg_mes_anterior`, `ingreso_anterior`, `delta_kg`, `delta_ingreso`.

`plant_diagnosis` SELECT actual: `cliente_norm`, `canal`, `subcanal`, `estado`, `window_days`, `last_date`, `kg_mes_real`, `kg_mes_forecast`, `ingreso_forecast`, `es_nuevo`, `es_recuperable`. **El summarizer descarta kg/ingreso/fecha.**

Identidad de fila: `plant_code` + `year`/`month` + `cliente_norm` + `canal` + `subcanal`. **No** hay `cliente_key` persistido.

### Semántica peligrosa

| Campo | Semántica real |
|---|---|
| `es_recuperable` | Se escribe con `es_dejaron`. **No** es recuperabilidad económica. |
| `margen_mes_kg` | Margen IGF **de planta**, copiado a cada fila. Si IGF falta, `computeDicf` usa **1**. No es contribución del cliente. |
| `kg_hist` | Suma de kg en `window_days` hasta `last_date`. **No** es mes anterior. |
| `kg_mes_forecast` | Proyección a cierre de mes. **No** es pérdida real. |
| `ingreso_forecast` | `kg_mes_forecast * (margen_planta - \|desc_kg_hist\|)`. Unidad MXN. Contaminable si margen=1. |

### DICF acciones

`arr.dicf_acciones`: `cliente_key`, `grupo_tipo`, `estado`, `fecha_compromiso`, `resultado_cierre`, `cerrado_at`, `created_at`, `responsable_usuario_id`.

`summarizeDicfContext` (pack actual) **no selecciona** `cliente_key`. M11 `queryActionsByKeys` sí.

Cerrada: `cerrado_at` o `estado = 'hecho'`. Vencida: `fecha_compromiso` vs hoy (misma precaución que AR: no inferir miles de días si fecha inválida).

### Join físico de cobertura

`buildClienteKey(planta_id canónico, grupo_tipo, canal, subcanal, cliente_nombre)` — patrón M11.

**Prohibido** copiar el fallback por nombre de `injectAccionesAbiertas` (`lib/director-ia-commercial-state.js`). Nombre ≠ `cliente_key`.

0 acciones para las keys derivadas ≠ «no hay seguimiento en la empresa» (M11 vigente).

### Comentarios

`arr.cliente_comentarios.body` texto libre + `cliente_key`. **No** hay campo «oferta competencia» / «condición».

### ARR / IGF

Planta: `venta_ton`, `desc_kg`, composición `$/kg`. No identifican cliente. Útiles como contexto de planta, **no** como ranking de clientes.

### Action Register

`dias_vencido` (fecha). `prioridad` AR es **derivada** de días, no columna almacenada. Sin `cliente_key`. No entra al ranking kg del first slice.

### Bitácora / revision notes

Sin `cliente_key`. Fuera del first slice de cobertura comercial.

---

## Materiality audit (campo por campo)

| Campo | Fuente | Unidad | Periodo | Denominador | null | ¿Comparable para prioridad? |
|---|---|---|---|---|---|---|
| `kg_mes_real` | caché mes vigente | kg | YYYY-MM de la fila | mes calendario | null ≠ 0; 0 es conteo | Sí **dentro del mismo mes y estado**. En «dejaron» suele ser 0 → **no** rankea pérdida. |
| `kg_mes_forecast` | caché | kg proyectados | mismo mes | proyección a cierre | null ≠ 0 | Sí intra-mes entre filas con valor finito. **No** es pérdida. |
| `kg_mes_real` mes **previo** (otra fila caché) | mismo table, YYYY-MM-1 | kg | mes anterior | mes calendario | ausente ≠ 0 | Sí, **si existe fila**. Proxy SELECT-only de volumen previo. Periodo debe declararse. |
| `kg_hist` | caché | kg | `window_days` / `last_date` | ventana móvil | null ≠ 0 | Solo intra `window_days`. **No** mezclar con mes calendario. |
| `ingreso_forecast` | caché | MXN | mes vigente proyectado | usa margen planta | null ≠ 0 | Intra MXN si margen no es el fallback 1. **No** sumar con kg. |
| `margen_mes_kg` | IGF planta copiado | $/kg | mes IGF | planta, no cliente | fallback 1 en compute | **No** para ranking de clientes ni costo de recuperación. |
| `desc_kg_hist` | caché | $/kg | ventana hist | kg_hist>0 | 0 si sin kg | Condición **histórica** del cliente, no oferta competencia. |
| `dias_vencido` AR | board | días | snapshot `as_of` | fecha compromiso | inválida ≠ vencida | Pista **separada**. No sumar a kg. |
| `fecha_compromiso` DICF | acciones | fecha | acción | — | null ≠ vencida | Estado de cobertura, no magnitud. |

**Prohibido:** score 0–100; kg + MXN + días; tratar forecast como pérdida real; tratar margen=1 como margen observado.

---

## Concentration audit

**Permitido:** dentro de una categoría (`dejaron` / `disminuyeron`) y **una** unidad:

```text
concentración = suma(top-N kg_finitos) / suma(kg_finitos de la categoría en el mismo periodo)
```

Denominador explícito. Si el denominador es 0 o hay nulls, no fabricar %. Truncar top-N; declarar omitidos.

Para `dejaron`, el numerador/denominador debe ser **kg del mes previo** (caché anterior) cuando exista, no `kg_mes_real` vigente ≈ 0.

---

## Coverage / unattended audit

Hipótesis de runtime (no taxonomía contractual):

| Categoría | Hecho físico |
|---|---|
| `material_without_action` | Magnitud finita en CS **y** 0 filas `dicf_acciones` para las `cliente_key` derivadas |
| `material_with_open_action` | Magnitud + acción no cerrada |
| `material_with_overdue_action` | Acción abierta con `fecha_compromiso` válida < hoy |
| `material_with_closed_action` | `cerrado_at` o `estado=hecho` |
| `material_with_unknown_outcome` | Cerrada o abierta **sin** `resultado_cierre` (null ≠ fracaso) |
| `coverage_unknown` | Keys ambiguas / no derivables; **no** afirmar ausencia |

AR/bitácora no cierran «sin acción» DICF. No join por nombre.

---

## Uncertainty reduction

Cuando falte causa o dato: sugerir **obtener** (validar motivo, pedir resultado, confirmar si existe caché del mes previo, abrir expediente M11). Prohibido: inventar motivo; comentario = causa; hipótesis = hecho.

Esto entra al first slice **como wording**, no como fuente nueva.

---

## Economic trade-off audit

| Pregunta | Determinación |
|---|---|
| ¿Costo de recuperación calculable? | **No.** No hay condición comercial objetivo (oferta competencia) estructurada. |
| ¿Margen incremental de cliente? | **No.** `margen_mes_kg` es planta; fallback 1. |
| ¿Límite comercial almacenado? | **No** como campo. |
| ¿Comparar recuperar vs no recuperar con cifras? | **No** en este slice. |
| ¿Qué falta? | Condición a igualar (dato humano o comentario **como texto**, no como hecho); margen/contribución de cliente; descuento nuevo propuesto. |
| ¿Unidades? | kg, MXN, $/kg planta — incompatibles para un trade-off inventado. |

**Diferido** (candidato B).

---

## Competition / margin case (obligatorio)

Escenario: cliente importante dejó de comprar; comentario sugiere que la competencia dio mejor condición; igualarla podría destruir margen.

| Tipo | Qué hay |
|---|---|
| Hecho | `estado` caché (p. ej. dejaron); kg/ingreso **si finitos y con periodo**; planta/mes |
| Stored statement | `cliente_comentarios.body` si hay `cliente_key` (M11). «Sugiere competencia» es texto, no hecho de mercado |
| Hipótesis | «Hay que igualar»; «la competencia causó la salida»; «recuperar destruye margen» — **no afirmables** sin cálculo |
| Volumen en juego | Mes previo `kg_mes_real` si existe fila; si no, **unknown** (no usar 0 vigente como «mayor pérdida») |
| Margen/contribución | Planta IGF, no cliente. Insuficiente |
| Condición para recuperar | No estructurada |
| Costo de recuperación | No calculable |
| Recuperar vs no | No comparable numéricamente |
| Dato faltante | Condición a igualar; margen de cliente; descuento propuesto |
| Qué puede recomendar | Revisar primero **si** es material y/o desatendido; **no** autorizar concesión; obtener X; calcular Y con un humano. **No** «es el de mayor volumen, hay que recuperarlo» |

El first slice cubre la parte **material + desatendido + no conceder**. El expediente M11 ya puede **mostrar** el comentario si el usuario pregunta por ese cliente; no convierte el texto en oferta.

---

## Alternative comparison

Sin cifras de beneficio/costo, las opciones A/B económicas **no** se emiten como comparables. Sí: opción C textual «obtener evidencia adicional» (reduce incertidumbre). Simulador financiero **fuera**.

---

## Before-action-after audit

Existe: `created_at` / historial DICF (M11); `last_date` CS; posiblemente dos meses de caché.

**Puede** (slice futuro): mostrar fechas en orden y decir «asociación temporal».

**No puede:** «funcionó»; «la acción causó la recuperación».

M9 no se mete por inercia. **Diferido** (candidato D).

---

## Director agenda audit

Agenda **heterogénea** (vencidas AR en días + clientes en kg + línea IGF en $/kg) exigiría ranking cruzado → **prohibido**.

El first slice produce una **agenda comercial corta** (hasta ~3 ítems de la misma familia kg), no la agenda total del Director. Escala operativa vs Director: vencidas AR siguen visibles en el pack actual como bloque aparte, **sin** mezclarse en el top kg.

**Diferido** el candidato C pleno.

---

## Follow-up / reprioritization audit

Reconsultar DICF+CS en cada pregunta: se puede ver «ahora hay acción». **No** requiere persistir recomendaciones.

«El lunes recomendamos X» **sí** exigiría memoria nueva → **no** en este slice.

---

## Truth boundaries

fact ≠ stored_statement ≠ relationship ≠ hypothesis ≠ calculation ≠ suggested_next_step ≠ unknown.

comentario ≠ hecho externo; coincidencia ≠ causalidad; posterioridad ≠ eficacia; materialidad ≠ causa; recomendación ≠ mandato.

---

## Human control

No modificar descuento. No abandonar/recuperar automáticamente. No asignar responsable. No writes. No WhatsApp. No decisión irreversible. Escalar = pedir revisión humana.

---

## Candidate first slices

| ID | Nombre | ¿Listo? | Por qué |
|---|---|---|---|
| A | `commercial_materiality_and_coverage` | **Sí, con límites** | Campos en caché; join M11; concentración intra-kg; gap de prompt/summarizer es físico |
| B | `economic_recovery_tradeoff` | No | Faltan condición, margen de cliente, costo |
| C | `director_agenda` | No como mix | Unidades heterogéneas |
| D | `before_action_after` | No como slice 1 | Causalidad fácil de fingir; historial no está en el pack recortado |

No se eligió A por facilidad: es el único que cierra el gap 010 (evidencia reunida → atención) **sin** inventar economía ni score cruzado. B sería más «inteligente» y está **bloqueado por datos**.

---

## Selected first slice

**`commercial_materiality_and_coverage`**

### Comportamiento

Dentro de `plant_diagnosis`:

1. Conservar provenance de seis bloques y 1 OpenAI.
2. Exponer kg (y, si se usa, MXN) con unidad/periodo/null.
3. Para `dejaron` / `disminuyeron`: top-N por **una** magnitud homogénea; concentración con denominador.
4. Volumen previo: SELECT de la **misma** tabla, mes anterior, misma identidad de fila; si falta → magnitud unknown (no 0).
5. Cobertura: `buildClienteKey` + `dicf_acciones` (como M11). Sin fallback por nombre.
6. Clasificar desatención vs acción abierta/vencida/cerrada/`resultado_cierre` null.
7. Prompt: hasta ~3 hallazgos comerciales: finding, why_it_matters, materiality_basis, coverage, evidence, recommended_next_step, uncertainty. Prohibido causa y «hay que recuperarlo» solo por volumen.
8. GA: CS restricted → **no** ranking comercial; no presentar pack parcial como agenda completa.

### Fuentes exactas

- `arr.dicf_cliente_mes` (mes vigente + mes previo opcional)
- `arr.dicf_acciones` por `cliente_key`
- Pack existente AR/IGF/ARR/bitácora **sin** entrar al ranking kg

### Campos exactos (mínimo IMPL)

Vigente: `estado`, `cliente_norm`, `canal`, `subcanal`, `kg_mes_real`, `kg_mes_forecast`, `ingreso_forecast` (si se rankea MXN; documentar margen planta), `last_date`, `window_days`, `year`, `month`.

Previo: `kg_mes_real` (y opcionalmente `ingreso_forecast`) de YYYY-MM-1.

Acción: `cliente_key`, `public_code`, `estado`, `cerrado_at`, `fecha_compromiso`, `resultado_cierre`, `responsable`, `created_at`.

### Joins exactos

- Identidad caché: `plant_code+cliente_norm+canal+subcanal` entre dos meses.
- Cobertura: `planta_id` canónico + keys derivadas. Ambigüedad → `coverage_unknown`.

### Cálculos permitidos

- Orden `>` entre kg finitos del mismo periodo/categoría.
- Participación top-N / suma categoría (mismos kg).
- `cerrada` / vencida con fecha válida.
- **No:** deltas inventados; costo recuperación; score; kg+MXN; forecast como pérdida.

### Materiality basis

«Mayor kg observado en {periodo P, categoría C, denominador D}» + «sin acción DICF para keys K» como **segunda razón**, no sumada.

### Recommendation wording

Permitido: revisar, validar, contactar, pedir resultado, obtener dato, no autorizar concesión, escalar a humano.

Prohibido: Recommendation N5, `MAT_*`, writes, asignar, cambiar descuento.

### Authz

Igual que el pack: planta operativa; GA sin kg CS; fail-closed; `SOURCE_RESTRICTED` ≠ missing.

### Period semantics

Declarar YYYY-MM vigente vs previo. `heterogeneous_windows` / mismatch IGF-ARR-CS **siguen** visibles. No alinear en silencio.

### Provenance

Bloques CS y DICF separados. Un ranking no fusiona origen. Cálculo de concentración se etiqueta como cálculo.

### Truncation

Top-N + omitidos explícitos. Límite de acciones por cliente acotado (reuso M11: 8).

### Failure semantics

`assembly_status` parcial si CS restricted/error. Sin magnitud previa: ítem listable como estado sin rank. Sin keys: no afirmar `without_action`.

---

## Deferred capabilities

| Capacidad | Por qué se difiere |
|---|---|
| 4 Trade-off económico / recuperabilidad | Sin condición ni margen de cliente |
| 5 Comparar recuperar vs no con cifras | Depende de 4 |
| 6 Antes→acción→después | Historial no está en el pack; riesgo de «funcionó» |
| 7 Agenda heterogénea del Director | Unidades no comparables |
| 8 Persistencia de recomendaciones | No en este slice; reconsulta sí |
| Comentario competencia como hecho | Solo stored_statement (M11) |
| M9 en este intent | Inercia; no necesario |

Capacidades 1–3 (compresión, desatención, reducir incertidumbre) **entran** al slice con los límites de magnitud previa y cobertura DICF-only.

Escenarios de aceptación:

| # | Prompt | ¿First slice? |
|---|---|---|
| 1 | qué revisar primero | **Parcial:** agenda **comercial** material, no las seis fuentes mezcladas |
| 2 | clientes que dejaron/redujeron | **Sí** (núcleo) |
| 3 | competencia / margen / recuperar | **Parcial:** material+desatendido+«no conceder / falta X»; **no** trade-off numérico |
| 4 | ¿funcionó la acción? | **No** (D diferido); no inventar |
| 5 | qué necesita mi atención hoy | **Parcial:** comercial; AR vencidas siguen en su bloque sin ranking cruzado |

---

## Percentage effect

**0.0 pp.** 10.5/20 = 52.5%. Ningún módulo cambia. No sumar 0.5 por inteligencia transversal.

---

## Risks

- Rankear `dejaron` por kg vigente 0.
- Usar `es_recuperable` como semántica económica.
- Usar `margen_mes_kg` / fallback 1 como margen de cliente.
- Fallback por nombre (commercial_state).
- Presentar forecast como pérdida.
- Mezclar kg y MXN.
- Fingir N5 / `MAT_*`.
- GA viendo ranking kg.
- «Hay que recuperarlo» por volumen.

## Dependencies

Pack `plant_diagnosis`; `buildClienteKey` / `getCanonicalPlantaId` / `getPlantaIdsEquivalentes`; caché mes previo si existe; JWT/`planta_id`. No Twilio/S3/Excel/IES/`computeDicf`/writes.

---

## NEXT_TASK

Propuesta exacta (no autoriza G1; no encadena; no ejecutar):

**IMPL-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-001**

---

## Acciones no realizadas

No código, runtime, matriz, contratos, IES, RE, score, persistencia, writes, commit, push, merge. NEXT_TASK no ejecutada.

## Gates

G1 intacto. G2/G3/G8 N/A.

## secrets_check

none

## git diff --check

Se confirma al cerrar.

## git status

Se confirma al cerrar (solo los dos archivos autorizados).
