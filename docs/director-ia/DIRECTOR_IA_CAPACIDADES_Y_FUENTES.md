# DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md

**Tipo:** Mapa de capacidades y fuentes (solo lectura del repositorio)  
**Fecha:** 2026-08-04  
**Documento base verificado:** [`docs/ARQUITECTURA_DASHBOARD_FOLIOS.md`](../ARQUITECTURA_DASHBOARD_FOLIOS.md)  
*(La ruta `docs/director-ia/ARQUITECTURA_DASHBOARD_FOLIOS.md` no existe en el repositorio; se usa la ubicación real del archivo.)*  
**Evidencia de código adicional:** `lib/director-ia-*.js`, `lib/cliente-comentarios.js`, `lib/comercial-entidad.js`, `lib/usuario-permisos.js`, `server.js` (rutas `/api/director-ia/*`).

**Límites de este documento**

- No modifica código, configuración ni DDL.
- No propone implementaciones ni calendarios.
- Toda capacidad afirmada cita archivo, función, endpoint o tabla existente.
- Donde el repositorio no confirma algo, se marca **DESCONOCIDA** o se lista en «preguntas pendientes».

---

## Índice navegable

1. [Parte 1 — Definiciones](#parte-1--definiciones) (incluye [continuidad conversacional efímera](#continuidad-conversacional-efímera-no-es-módulo-m0m20), [herencia natural de follow-up estrategia B](#herencia-natural-de-follow-up-estrategia-b-no-es-módulo-m0m20), [retorno de tema intra-sesión previous_frame](#retorno-de-tema-intra-sesión-previous_frame-no-es-módulo-m0m20), [memoria persistente pending_work_items_only](#memoria-persistente-pending_work_items_only-no-es-módulo-m0m20), [desviación diaria de venta daily_sales_deviation](#desviación-diaria-de-venta-daily_sales_deviation-no-es-módulo-m0m20), [desviación diaria de descuento/kg daily_discount_deviation](#desviación-diaria-de-descuento/kg-daily_discount_deviation-no-es-módulo-m0m20), [brief ejecutivo diario daily_executive_brief](#brief-ejecutivo-diario-daily_executive_brief-no-es-módulo-m0m20), [cross-metric follow-up diario](#cross-metric-follow-up-diario-no-es-módulo-m0m20), [tendencia comercial de gráfica commercial_trend](#tendencia-comercial-de-gráfica-commercial_trend-no-es-módulo-m0m20), [perfil longitudinal de cliente client_profile](#perfil-longitudinal-de-cliente-client_profile-no-es-módulo-m0m20), [consultas Action Register por responsable/acción](#consultas-action-register-por-responsable--acción-no-es-módulo-m0m20) y [apoyos reviewable / contrafactual IGF](#apoyos-reviewable--contrafactual-igf-igf_reviewable_supports-no-es-módulo-m0m20))
2. [Parte 2 — Matriz maestra M0–M20](#parte-2--matriz-maestra-m0m20)
3. [Parte 3 — Catálogo de fuentes](#parte-3--catálogo-de-fuentes)
4. [Parte 4 — Capacidades de negocio (preguntas)](#parte-4--capacidades-de-negocio-preguntas)
5. [Parte 5 — Matriz de veracidad](#parte-5--matriz-de-veracidad)
6. [Parte 6 — Lectura contra ejecución](#parte-6--lectura-contra-ejecución)
7. [Parte 7 — Prioridad de integración](#parte-7--prioridad-de-integración)
8. [Parte 8 — Hallazgos críticos](#parte-8--hallazgos-críticos)
9. [Parte 9 — Resultado final](#parte-9--resultado-final)

---

## Parte 1 — Definiciones

### Cobertura actual

| Etiqueta | Significado operativo |
|----------|----------------------|
| **COMPLETA** | Director IA consulta directamente la fuente y puede responder de forma consistente dentro del alcance de esa fuente. |
| **PARCIAL** | Consulta solo una parte del dominio, un resumen, filas limitadas o únicamente bajo demanda (p. ej. regex de chat). |
| **INDIRECTA** | Conoce datos relacionados, pero no consulta el módulo real (endpoints/UI del dominio). |
| **NO INTEGRADA** | El dominio existe en el dashboard/API, pero Director IA no lo consulta. |
| **DESCONOCIDA** | El repositorio no permite confirmar la integración. |

### Tipos de capacidad

`CONSULTAR` · `BUSCAR` · `RESUMIR` · `COMPARAR` · `EXPLICAR` · `DETECTAR RIESGOS` · `RECOMENDAR` · `CREAR` · `EDITAR` · `APROBAR` · `CANCELAR` · `ENVIAR` · `DESCARGAR DOCUMENTO`

### Nivel de riesgo

| Nivel | Criterio |
|-------|----------|
| **BAJO** | Solo lectura sin datos especialmente sensibles. |
| **MEDIO** | Información financiera, comercial, personal o documental. |
| **ALTO** | Cambia estados, dinero, autorizaciones, documentos o historial operativo. |

### Superficie actual de Director IA (evidencia)

| Pieza | Evidencia |
|-------|-----------|
| Flag | `ENABLE_DIRECTOR_IA` (`lib/director-ia.js`); chat también `AI_ENABLED` + `OPENAI_API_KEY` |
| Auth | `dashboardAuthMiddleware` en todas las rutas `/api/director-ia/*` |
| GET contexto | `GET /api/director-ia/context` → `buildDirectorIaContextPayload` (`lib/director-ia-context.js`) |
| Chat | `POST /api/director-ia/chat` → `askDirectorIa` (`lib/director-ia-chat.js`) |
| Routing chat | Planner (`planDirectorIaQuestion`) + ramas in-process en `askDirectorIa`; **continuidad efímera** (`lib/director-ia-conversation-state.js`) con **estrategia B**: si el planner aislado da `unknown` y el `structured_conversation_state` es válido, se hereda `parent_intent` (`inheritParentIntent` / `forceIntent` diario); standalone reconocido **siempre gana** (también con «volvamos» / «retomemos»); `unknown` sin estado válido **clarifica** y **no** cae al dump de Action Register. **Brief ejecutivo diario** (`daily_executive_brief`; first slice **B**): petición abierta de panorama del día **sin** nombrar venta ni descuento → compone packs frescos de `daily_sales_deviation` + `daily_discount_deviation`, misma planta/fecha; provenance y gaps **separados**; partial-data; GPT sintetiza; **no** phrasebook; **no** causalidad; venta o descuento explícitos conservan sus intents. **Cross-metric diario** (estrategia **B** post-planner): parent diario (incl. brief) + `active_date` válida + turno `unknown` que nombra inequívocamente la **otra** métrica diaria (`venta`/`descuento`) → cambia el intent efectivo, **conserva/revalida la fecha**, requery del pack destino; **conservar fecha ≠ conservar métrica**; **no** phrasebook. **Retorno de tema intra-sesión** (first slice **B**): exactamente un `previous_frame` efímero; no topic stack; restore ≠ fact; requery. Consultas naturales de **acción/responsable** → intent existente `action_status` (estrategia **C**; `lib/director-ia-action-person.js`): resolución física en el board; 0/1/N; `action_status` **inheritable**. Un intent AR específico gana sobre resume genérico de memoria. **No** phrasebook nuevo. **No** intent nuevo. **Hop IGF → apoyos reviewable** (`igf_reviewable_supports`; first slice **C**): IGF mes actual → recortar/detener apoyos → same plant + same `mes_cargo` + Folios fresco; no se pega a `igf_status`; depósito/cierre de **este** slice no cae a cheques `coverage:none`. Intent **inheritable**. Read-only. **Tendencia comercial de gráfica** (`commercial_trend`; arquitectura **B**; first slice **B**): motor compartido `lib/commercial-trend-engine.js` consumido por `GET /api/arr/venta-serie` y por el chat; serie diaria + OLS + top-6 movers; 30/90 trailing anclados a `MAX(fecha)`; CASA / COMISIONISTA (`LIKE '%comisionista%'`; alias COMISIONISTAS); **no** HTTP interno; **no** comments en el pack de chat; mover ≠ causa; slots `range_days` / `channel` / `plant`. **Perfil longitudinal de cliente** (`client_profile`; source **B**; routing **B**): padre canónico; `cliente_key` obligatorio; 3 meses calendario (actual CDMX PARTIAL + 2 previos COMPLETE); kg `SUM` y descuento/kg `SUM(monto)/SUM(kg)` alineados **antes** de GPT; comments/DICF solo por `cliente_key`; ingreso actual `UNSUPPORTED_METRIC`; Action Register **sin** `cliente_key` (no join inventado); handoff desde `commercial_trend` + `active_entity` → requery fresco (no reusa evidencia de trend). Regex/heurísticas residuales de intents standalone en `director-ia-chat.js`, `director-ia-igf-arr.js`, `director-ia-commercial-state.js` |
| Fuentes en GET `sources` | `action_register`, `dicf`, `bitacora_ia`, `cliente_comentarios`, `folio_comentarios` pueden pasar a `true`; `igf`, `arr`, `commercial_state` permanecen `false` en `EMPTY_SOURCES` |
| Fuentes solo en chat | Anexo IGF/ARR (`loadIgfArrAnnexForChat` + `extractIgfComposition` sobre 1 fila de `igf.compromiso_lines`; no recálculo; no overlay) para `igf_status` / KPI annex; **diagnóstico financiero multi-fuente** (`financial_diagnosis` → `loadFinancialDiagnosisForChat` / `assembleFinancialDiagnosisEvidence`: bloques IGF + ARR + M9 separados; una llamada OpenAI; no IES; no N5); **diagnóstico de planta multi-fuente** (`plant_diagnosis` → `loadPlantDiagnosisForChat` / `assemblePlantDiagnosisEvidence`: bloques action_register + dicf + bitacora + arr + igf + commercial_state; SELECT-only `arr.dicf_cliente_mes`; slice `commercial_materiality_and_coverage`: magnitud `kg_mes_real` = kg observados del mes de la fila, concentración top-5, cobertura DICF por `cliente_key`; **no** `kg_mes_forecast − kg_mes_real` como venta perdida; **sin M9**; **sin** `computeDicf`; una llamada OpenAI; GA partial `SOURCE_RESTRICTED`; no IES; no N5; no Recommendation N5; no MAT_*); **desviación diaria de venta** (`daily_sales_deviation` → `loadDailySalesDeviationForChat` / `assembleDailySalesDeviationEvidence`: ayer CDMX; kg observados; referencia same-weekday 14 días; delta kg/%; contribución cliente y canal; DICF + comments **solo** `cliente_key`; information gaps; HILO; una llamada OpenAI; contribución ≠ causa; descuento/kg es otro intent; no IES; no N5); **desviación diaria de descuento/kg** (`daily_discount_deviation` → `loadDailyDiscountDeviationForChat` / `assembleDailyDiscountDeviationEvidence`: ayer CDMX; `arr.descuentos_diarios_cliente` + `arr.ventas_diarias_cliente`; `SUM(monto)/SUM(kg)`; referencia pooled same-weekday 14d `SUM(monto_ref)/SUM(kg_ref)`; contribución reconciliada por cliente; DICF + comments **solo** `cliente_key`; information gaps; HILO; una llamada OpenAI; contribución ≠ causa; **sin canal**; no average-of-averages; no M9; no IES; no N5); **brief ejecutivo diario** (`daily_executive_brief` → `loadDailyExecutiveBriefForChat`: reutiliza los dos loaders diarios; misma planta/fecha; bloques venta + descuento/kg; provenance/limitations/gaps **separados**; partial-data; missing ≠ 0; HILO; una llamada OpenAI; GPT sintetiza; no buen/mal día programado; no causalidad; no ingreso diario; no IES; no N5); **Action Register por responsable/acción** (`action_status` → `loadActionPersonBoardForChat` / `resolveActionPersonFocus`: board de la planta; 0/1/N; status/fecha/vencimiento; historial/`resultado_cierre` solo si el ítem los trae; limitations + provenance; HILO; GPT; no culpa; no scoring de personas); estado comercial de listas (`loadCommercialStateForChat` → `computeDicf`); expediente comercial factual (`loadCommercialDossierForChat`; SELECT-only; no `computeDicf`); Mejora Continua (`loadMejoraContinuaForChat`); M6 GASTOS/INVERSIONES (`loadGastosInversionesForChat`); M5 Taller por AT (`loadTallerAtForChat`; SELECT `public.folios.unidad`; no Excel; no duplicados); M4 clasificación query (`loadClasificacionApoyosForChat`); M18 presupuesto semanal (`loadPresupuestoSemanalForChat`); **apoyos reviewable / contrafactual IGF** (`igf_reviewable_supports` → `loadIgfReviewableSupportsForChat`: reglas reales de cancelación; list/totals; overlay live **en memoria**; etiqueta ESCENARIO HIPOTÉTICO; no writes; no ahorro; no cheques; `igf_status` sigue sin overlay); **tendencia comercial de gráfica** (`commercial_trend` → `loadCommercialTrendForChat` / `loadCommercialTrend`: mismo motor que `GET /api/arr/venta-serie`; serie + OLS + top-6; 30/90 trailing; `MAX(fecha)`; CASA/COMISIONISTA; sin comments; sin HTTP interno; una llamada OpenAI; no IES; no N5); **perfil longitudinal de cliente** (`client_profile` → `loadClientProfileForChat` / `assembleClientProfilePack`: 3 meses calendario CDMX; `SUM(kg)` y `SUM(monto)/SUM(kg)` por mes; comments/DICF por `cliente_key`; ingreso actual no soportado; AR sin join; una llamada OpenAI; no IES; no N5) |
| Persistencia de chat | **No hay tabla de historial/transcript.** El FE puede reenviar `req.body.history` (hasta 8) y/o `conversation_state`. Eso **no** es evidencia. Continuidad **efímera** por request: `structured_conversation_state` + exactamente un `previous_frame` (navegación intra-sesión; no evidencia). First slice persistente **en repo**: `arr.director_ia_pending_work_items` (`sql/017_director_ia_pending_work_items.sql`; `lib/director-ia-persistent-memory.js`). Recuerda **trabajo pendiente**, no hechos. **No** navega temas intra-sesión. OpenAI recibe `HILO` + (si hay retoma cross-session) bloque `PENDIENTE DE TRABAJO`; no history crudo. **Capacidad en repositorio = IMPLEMENTED. Activación en un entorno = PENDING until SQL 017 applied.** |
| Escritura propia del módulo | Bitácora y entidades comerciales vía API CRUD (no vía chat) |

### Continuidad conversacional efímera (no es módulo M0–M20)

**Implementado** (`IMPL-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-001`; herencia natural `IMPL-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-001`, estrategia **B**; retorno de tema `IMPL-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001`, first slice **B**; cross-metric diario `IMPL-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001`, estrategia **B**). Continuidad **dentro de la sesión/request**. Esta pieza **no** es la memoria persistente (esa es `pending_work_items_only`, abajo). **No** cambia cobertura de ningún módulo ni el 52.5%.

Path (estrategia B):

```text
turno actual
  → planner aislado
  → intent explícito reconocido? sí: standalone gana
  → no: unknown
  → structured_conversation_state válido?
  → parent_intent inheritable?
  → misma planta/scope?
  → sin topic/plant switch?
  → sin conflicto de entidad?
  → sí
  → heredar parent_intent
      (si parent diario + active_date válida + turno nombra la otra métrica diaria:
       cambiar intent efectivo; conservar/revalidar fecha; ver cross-metric)
  → requery
  → HILO + evidencia fresca
  → GPT
  → respuesta natural
```

| Campo | Runtime |
|-------|---------|
| `parent_intent` | **Unknown + estado válido → inherit.** Intents inheritable: `plant_diagnosis`, `expediente_comercial`, `daily_sales_deviation`, `daily_discount_deviation`, `daily_executive_brief`, `commercial_trend`, `client_profile`, `action_status`, `igf_reviewable_supports`. `igf_status` **no** es inheritable (el hop a apoyos no se pega a IGF). Standalone ≥ 0.55 **siempre gana** (presupuesto, Taller AT-15, Querétaro/planta nueva, venta ayer, descuento/kg ayer, IGF, recortar apoyos, acciones vencidas, acción + responsable, y los demás intents existentes). `financial_diagnosis` / presupuesto / Taller no se pisan ni reabren Puebla por history. Tras `commercial_trend` + `active_entity` con `cliente_key`, una pregunta de perfil/acciones de **ese** cliente **no** rehereda trend: `forceIntent client_profile` + requery. |
| `planta_id` | Siempre el del request autorizado. Nunca del texto ni del history. |
| `active_entities` | Máximo 1. Única en la planta actual (palabra completa / nombre exacto sobre el pack fresco). Ambiguo o ausente → clarifica. Sin fuzzy silencioso. En hilos `action_status` puede ecoar `ar_responsable` / `ar_action` (no como cliente). |
| `active_date` | En hilos `daily_sales_deviation`, `daily_discount_deviation` y `daily_executive_brief`: YYYY-MM-DD **efímero** del día objetivo. El brief **establece** esta fecha. Se reusa para requery del mismo hilo **y** puede conservarse al cambiar de métrica diaria (cross-metric). **No** se inventa ayer si falta. Fecha explícita del turno gana. Hoy no se trata silenciosamente como día cerrado. Señal mensual **no** reusa esta fecha. **No** es memoria persistente de periodos. No sobrevive un chat nuevo. |
| `active_range_days` | En hilos `commercial_trend`: 30 o 90. Contexto de **routing**. La evidencia se reconsulta. No es mes calendario. **No** es el periodo de `client_profile`. |
| `active_channel` | En hilos `commercial_trend`: `casa` / `comisionista` / `both`. En `client_profile` puede heredarse como filtro de fuente si es `casa`/`comisionista`. Contexto de **routing**. Alias COMISIONISTAS → `comisionista`. |
| `active_period_months` | En hilos `client_profile`: lista YYYY-MM de meses calendario alineados. Contexto de **routing**. La evidencia se reconsulta. **No** son 90 días trailing. |
| `last_evidence_bundle_type` | Recuerda el tipo de pack; **no** cachea el payload. |
| `pending_information_gap` | Derivado del pack **requery** (`limitations`, cobertura, `SOURCE_RESTRICTED`). Persona solo si hay responsable de **acción** con vínculo físico. No se deriva de la prosa del assistant. |
| `previous_frame` | **Exactamente uno.** Efímero. Intra-sesión. Copia mínima del current al cambiar a un standalone distinto. Cada switch **reemplaza** el prior. **No** topic stack. **No** evidencia. Ver [retorno de tema](#retorno-de-tema-intra-sesión-previous_frame-no-es-módulo-m0m20). |

### Herencia natural de follow-up, estrategia B (no es módulo M0–M20)

**Unknown con estado válido:** inherit `parent_intent` → requery → GPT.

**Unknown sin estado válido:** clarificar. **No** fallback ciego a Action Register. **No** fallback ciego a `plant_diagnosis`.

**STANDALONE siempre gana** sobre la herencia.

**Cross-metric diario (B):** si el parent es diario, hay `active_date` válida y el turno `unknown` nombra inequívocamente la **otra** métrica diaria, el inherit apunta al destino (no al parent). Conservar fecha ≠ conservar métrica. Si el turno **no** nombra la otra métrica, la herencia same-metric de estrategia B se preserva.

**NO PHRASEBOOK NUEVO.** El inherit **no** depende de listas de frases, sinónimos, «menos de N palabras», score de anáforas ni de reconocer el wording exacto. El follow-up funciona porque existe contexto válido. El switch de métrica reconoce **tokens** de venta/descuento ya existentes, no frases completas.

Identidad (no catálogo de follow-ups):

- Demostrativos `eso` / `esto` / `aquello` **no** son clientes.
- Pronombres `él` / `ella` / `ese cliente` solo pueden usar `active_entity` ya validada.
- Entidad nominal nueva: resolver físicamente en la planta actual. Única → válida. Ambigua → clarificar. No fuzzy.
- Plant switch invalida entidad y pending gap incompatibles.

**CONTEXT INHERIT ≠ EVIDENCE REUSE.** `history != evidence`. Claim previo del assistant ≠ hecho. Claim previo del user ≠ hecho de DB. Requery cada turno. Authz actual. `SOURCE_RESTRICTED` actual. Provenance actual.

El **runtime** conserva: authz, planta, entidad, fechas, matemáticas, joins, provenance, limitations.

**GPT** interpreta el follow-up abierto: explicación, «qué más», consecuencias, wording de gaps, ampliación, respuesta natural. El código **no** programa esas expresiones.

Generalización hold-out (**solo tests**, no routing de producción): `No te seguí`, `¿En qué sentido?`, `¿O sea?`, `¿Me explicas mejor?`, `¿Qué otra cosa ves?`, `¿Y después?`. Esas frases heredan por estado/contexto, no porque estén codificadas en `lib/`.

Evidencia y veracidad:

- Requery cada turno. Authz cada turno.
- Cambio de planta (request ≠ estado eco, o «Ahora …») invalida entidad y gap. Sin fuga cross-planta.
- History no puede promoverse a instrucción `system`.
- OpenAI recibe `HILO` + pack fresco + limitations. No history crudo.

**Principio rector:** la arquitectura da a GPT evidencia, memoria, contexto, permisos y provenance. GPT conserva el razonamiento conversacional. No se convierten en reglas determinísticas las cosas que el modelo ya puede razonar, salvo necesidad concreta de seguridad, exactitud, autorización, reproducibilidad o cálculo.

**Frontera de memoria (obligatoria):**

| | Qué es | Qué no es |
|---|---|---|
| **EFÍMERO (sesión)** | `structured_conversation_state` por request (current + **un** `previous_frame`). Sin DB. Mantiene el hilo y el tema inmediatamente anterior **dentro** de la conversación. | No sobrevive un chat nuevo. No es stack. |
| **PERSISTENTE (repo)** | `pending_work_items_only`: pending gap + planta + entidad + intent + status. Tabla `arr.director_ia_pending_work_items`. | No es history, transcript, evidencia, IES, EKS ni N5. **No** navega temas intra-sesión. |
| **NO IMPLEMENTADO** | Full history memory; summaries; preferencias; decisiones persistidas; semantic memory; topic stack (más de un prior); memoria en EKS/IES/N5. | — |

**MEMORY ≠ CURRENT EVIDENCE.** La memoria recuerda *qué trabajo quedó pendiente*. La evidencia fresca dice *qué es verdad hoy*. No se afirma «Arturo sigue sin comprar» solo porque quedó un pendiente.

Fuera de este slice de continuidad genérica: topic stack (más de un `previous_frame`); «¿Y ayer?» como switch de periodo **sin** hilo diario; semana anterior; varias entidades activas; history selectivo al LLM; workflow de notificaciones. El first slice de **retorno de tema** es un `previous_frame` (abajo). El first slice diario de **venta** es `daily_sales_deviation` (abajo). El first slice diario de **descuento/kg** es `daily_discount_deviation` (abajo). El first slice de **brief ejecutivo diario** es `daily_executive_brief` (abajo). El first slice de **cross-metric diario** (conservar fecha ≠ conservar métrica) está abajo. El first slice de **tendencia comercial de gráfica** es `commercial_trend` (abajo). El first slice de **perfil longitudinal de cliente** es `client_profile` (abajo). El first slice de consultas Action Register por responsable/acción es `action_status` (abajo). Trade-off económico por cliente **sigue diferido**.

### Retorno de tema intra-sesión `previous_frame` (no es módulo M0–M20)

**Implementado** (`IMPL-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001`; first slice **B** — precedencia standalone + exactamente un `previous_frame`). Chat legado. **No** IES. **No** Reasoning Engine N5. **No** topic stack. **No** cambia cobertura de ningún módulo ni el 52.5%.

Path:

```text
current topic
  → standalone switch
  → current mínimo pasa a previous_frame
  → nuevo current
  → return
  → revalidate
  → requery
  → HILO + fresh evidence
  → GPT
```

**STANDALONE PRECEDENCE.** Un standalone intent válido no se descarta por lenguaje de navegación («volvamos», «retomemos»). Caso canónico: «Volvamos a la venta de ayer.» → planner `daily_sales_deviation` 0.92 → **se ejecuta**. No entra a `topic_return → out_of_slice_clarify`.

**SELF-CONTAINED RETURN.** Si el turno actual nombra el dominio (venta + ayer; acción + nombre y apellido), no depende de `previous_frame`.

**IMPLICIT RETURN.** «Volvamos a Arturo.», «Retomemos la acción.», «Volvamos a Puebla.» pueden restaurar un `previous_frame` **compatible y suficiente**. Sin frame seguro: clarifica. No adivina un tema más antiguo.

| Campo permitido | Prohibido en el frame |
|-----------------|------------------------|
| `parent_intent` | raw evidence / payload |
| entity ref/key (`kind`, `display`, `cliente_key` / `usuario_id` / `action_id` si ya era único) | DB rows |
| `active_date` | transcript / user prose como fact |
| `last_evidence_bundle_type` | assistant claims / OpenAI response |
| `pending_information_gap` | authz snapshot |
| plant scope ref (`planta_id`) | topic stack / lista de temas |

**EXACTAMENTE UNO.** Cada standalone switch **reemplaza** el prior. Profundidad = 1.

**RESTORE ≠ FACT.** Restaurar contexto no restaura hechos. Siempre: authz actual; plant scope del request; revalidación de entidad/fecha; **requery**; current evidence wins. Planta incompatible anula el frame. Entidad ambigua o no encontrada → clarifica. `ayer` del turno actual gana. Acción: 0/1/N intacto; **no silent pick**; no motivo inventado.

Tras el restore, la **estrategia B** sigue: unknown + estado restaurado válido → inherit → requery → GPT.

**HISTORY ≠ EVIDENCE.** History es señal conversacional. No truth store. No se reconstruyen hechos de negocio desde conversaciones previas.

**Memoria persistente ≠ navegación.** `pending_work_items_only` sigue siendo trabajo pendiente **entre sesiones**. `volvamos` no es resume. No se usa SQL 017 para cambiar de tema.

Limitación (READY_WITH_LIMITS): un retorno implícito que pida un tema **más antiguo** que `previous_frame` **no** se recupera en silencio. Clarifica. Un tercer standalone inheritable distinto evicta el único prior.

Ejemplos de hilo (**no** phrasebook de producción):

```text
¿Por qué bajó la venta ayer?
  → Ahora dime el descuento/kg.
  → Volvamos a la venta de ayer.
  → ¿Quién explicó más?

¿Cómo va Puebla?
  → ¿Y Arturo?
  → ¿Cómo estuvo la venta ayer?
  → Volvamos a Arturo.
  → ¿Qué faltaba saber?

¿Qué pasó con la acción de Julio Pérez?
  → Ahora dime Puebla.
  → Retomemos la acción.
  → ¿Por qué seguía abierta?

¿Cómo va Puebla?
  → Ahora dime el presupuesto.
  → ¿Y eso?
  → Volvamos a Puebla.
  → ¿Qué más?
```

El **runtime** conserva: precedencia standalone, captura/restore de un frame, scope, identidad, fecha, authz, requery, provenance.

**GPT** conserva: interpretación del tema restaurado, explicación, síntesis, follow-up, wording de gaps. El código **no** programa una respuesta enlatada por frase de retorno.

Preserva: `daily_sales_deviation`, `daily_discount_deviation`, `daily_executive_brief`, action-person routing, herencia natural (estrategia B), `structured_conversation_state`, `pending_work_items_only`, `plant_diagnosis`, `financial_diagnosis`, M9.

No implementado: topic stack; más de un previous frame; persistent topic memory; semantic conversational memory; history como evidencia.

Archivos: `lib/director-ia-conversation-state.js`, `lib/director-ia-chat.js`. Planner **sin** wording nuevo de M18.

Evidencia de tests (IMPL; no reejecutados aquí): focal 19/19; suite `test/director-ia-*.test.js` **854/854**; planner 58/58; capabilities 56/56; orchestrator 28/28; `git diff --check` limpio.

---

### Memoria persistente `pending_work_items_only` (no es módulo M0–M20)

**Implementado en repositorio** (`IMPL-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-001`; gate `AUDIT-DIRECTOR-IA-PERSISTENT-MEMORY-EKE-GATE-001` = **ALLOWED**, G5 **APPROVED**). **No** cambia cobertura de ningún módulo ni el 52.5%.

**Activación de entorno:** el archivo `sql/017_director_ia_pending_work_items.sql` está en el repo. **No** afirmar que la persistencia está habilitada físicamente en un entorno hasta confirmar que SQL 017 fue aplicado allí. `repository capability = IMPLEMENTED`. `environment activation = PENDING UNTIL SQL 017 APPLIED`. Esta sync **no** ejecuta SQL.

Owner: chat legado operativo (`arr`). **No EKS. No IES. No N5.** No es Bundle, Observation, IES ni Reasoning Run.

Relación con lo efímero: la persistencia puede rehidratar contexto mínimo **después** de revalidación. **No** sustituye `structured_conversation_state` ni los loaders. **No** es `previous_frame`. `previous_frame` navega el tema inmediatamente anterior **dentro** de la sesión. Persistent memory recuerda trabajo pendiente **entre** sesiones.

Path real:

```text
sesión A
  → structured_conversation_state (efímero)
  → pending_information_gap objetivo (pack fresco)
  → persist pending work item
  → arr.director_ia_pending_work_items
  → cerrar conversación

sesión B (chat nuevo)
  → «¿Qué pasó con Arturo?» (u otra retoma)
  → recuperar pending work item (máx. 3 active; user + planta)
  → authz actual
  → planta actual (del request)
  → entidad re-resuelta
  → requery de fuentes actuales
  → structured_conversation_state efímero hidratado
  → HILO + PENDIENTE DE TRABAJO (no evidencia) + pack fresco
  → OpenAI (razonamiento)
  → respuesta con dato actual
```

No se persiste: raw history; transcript; respuestas del assistant; claims del user como hechos; hipótesis; evidence payloads; snapshot de authz; SOURCE_RESTRICTED como dato factual; prompts.

Lifecycle del **pendiente** (`status` ≠ estado del cliente): `active` · `resolved` · `superseded` · `stale` · `dismissed`.

Al recuperar: authz actual; planta actual; entidad actual; requery. **Current evidence gana.** SOURCE_RESTRICTED actual prevalece. Memory **no** concede acceso. No cross-user. No cross-plant.

Ejemplo correcto: «La última vez dejamos pendiente conocer el motivo documentado de Arturo. Revisé nuevamente…»
Ejemplo incorrecto: «Arturo sigue sin comprar» solo porque se recordó.

`daily_sales_deviation`, `daily_discount_deviation` y `daily_executive_brief` **no** persisten la fecha objetivo ni el pack diario como work item. `active_date` es efímero. SQL 017 **no** se ejecuta en esta sync; la nota operativa de activación de entorno se conserva.

**Precedencia (obligatoria):** un intent empresarial específico de Action Register **gana** sobre el resume genérico de memoria. Un standalone de negocio (venta ayer, acción + responsable) **gana** sobre resume. «¿Qué pasó con» **no** se apaga. «Volvamos» **no** es resume.

- «¿Qué pasó con la acción de Julio Pérez?» → planner `action_status` → Action Register.
- «¿Qué pasó con Arturo?» → el planner no reconoce un intent AR más específico (`unknown`); persistent memory **puede** participar como resume si hay work item activo.

Principio: *business intent específico > generic memory resume.* La memoria permanece activa para casos reales de resume.

---

### Desviación diaria de venta `daily_sales_deviation` (no es módulo M0–M20)

**Implementado** (`IMPL-DIRECTOR-IA-DAILY-DEVIATION-001`; first slice `daily_sales_plus_business_evidence`). Chat legado. **No** IES. **No** Reasoning Engine N5. **No** cambia cobertura de ningún módulo ni el 52.5%.

**No** es `financial_diagnosis` mensual. **No** es `delta_sales` / M9 mensual. Preguntas de venta + **ayer** ganan este intent. Una petición abierta de panorama **sin** nombrar venta es **otro** intent (`daily_executive_brief`, abajo).

Path:

```text
pregunta de venta diaria
  → daily_sales_deviation
  → ayer calendario completo America/Mexico_City
  → venta observada kg
  → referencia same-weekday / ventana 14 días (N observaciones)
  → delta kg / delta %
  → contribución por cliente
  → contribución por canal
  → DICF + comments por cliente_key
  → information gaps
  → evidence pack
  → HILO
  → una llamada OpenAI
  → respuesta conversacional (GPT)
```

| Pieza | Runtime |
|-------|---------|
| Fecha | Ayer = día calendario completo en `America/Mexico_City`. Hoy **no** es día cerrado. `target_date` queda explícito. |
| Venta | kg observados de `arr.ventas_diarias_cliente`. Día sin filas **≠** venta 0. `null` ≠ 0. |
| Referencia | `same_weekday_recent_average`: mismo ISODOW en ventana de 14 días cerrados; solo días **con filas**; N explícito. **No** día anterior por default. Siempre se declara contra qué se comparó. |
| Detección | `target_date`, `target_sales_kg`, `reference_type`, `reference_sales_kg`, `reference_observation_count`, `deviation_kg`, `deviation_pct`. |
| Matemática | Contribución por cliente (`cliente_key`) y por canal al delta vs la referencia comparable; top contributors; reconciliación con el total. |
| Evidencia de negocio | DICF + comentarios comerciales **solo** por `cliente_key`. **No** join por nombre. |
| Huecos | Contribuidores materiales sin evidencia suficiente para explicar empresarialmente el movimiento. Acción sí/no. Comentario sí/no. Responsable **solo** si está ligado físicamente a una acción. |
| Continuidad | `parent_intent = daily_sales_deviation`. Estrategia B: unknown + estado válido hereda **la métrica actual**. Un turno unknown que nombra inequívocamente descuento, con `active_date` válida, **cambia** a `daily_discount_deviation` y conserva/revalida la fecha (cross-metric B; ver abajo). Standalone gana, **también** con «Volvamos a la venta de ayer.» (0.92; no se tira por `topic_return`). `active_date` efímero; `ayer` del turno actual gana. Requery cada turno. Una llamada OpenAI por turno. HILO ≠ evidence. Hold-outs (`¿O sea?`, `¿Y después?`, etc.) viven en **tests**, no en routing de producción. |

**CONTRIBUCIÓN MATEMÁTICA ≠ CAUSA.** Un cliente o canal que explica matemáticamente parte del delta **no** queda demostrado como causa empresarial. No documentar «Arturo causó la caída» solo porque concentre kg.

Comentario almacenado (incluida «competencia») = declaración, **no** causa probada. Acción DICF ≠ causa. Responsable de una acción ≠ responsable de la caída.

El **runtime** conserva: fecha, timezone, referencia, matemáticas, joins, authz, provenance, absence/error.

**GPT** conserva: síntesis, explicación narrativa, qué llama la atención, qué sabemos, qué no sabemos, qué información falta, consecuencias, follow-ups abiertos. El código **no** programa una respuesta final rígida ni causalidad. Los hold-out de tests (`¿O sea?`, `¿Qué otra cosa ves?`, `¿Y después?`) no están en el routing de producción.

Conversación canónica (ejemplos de hilo, **no** phrasebook de producción):

```text
¿Por qué bajó la venta ayer?
  → ¿Contra qué la comparas?
  → ¿Qué clientes explican más?
  → ¿Y por canal?
  → ¿Sabemos por qué?
  → ¿Qué falta investigar?
  → ¿Quién puede aclararlo?
```

Un follow-up abierto con estado diario válido (p. ej. hold-out de test `¿O sea?`) hereda por estrategia B, no porque la frase esté codificada.

Authz: planta actual, rol actual, `plantas_permitidas`, no cross-plant, fail-closed. El pack diario **no** amplía permisos de M9. GA/GV `SOURCE_RESTRICTED`.

Ausencia / error: distinguir 0 real, `null`, día sin filas, referencia insuficiente, `DATA_NOT_FOUND`, `SOURCE_RESTRICTED`, `TOOL_ERROR`. Día sin filas ≠ 0. Error ≠ ausencia. Restricted ≠ missing.

**Descuento/kg diario:** otro intent (`daily_discount_deviation`, abajo). Este slice de **venta** **no** calcula descuento/kg. Un follow-up que nombra descuento **dentro del mismo día** no recarga el pack de venta: ver [cross-metric](#cross-metric-follow-up-diario-no-es-módulo-m0m20).

Preserva: M9 mensual, `financial_diagnosis`, `plant_diagnosis`, `structured_conversation_state`, `pending_work_items_only`, `daily_discount_deviation`, `daily_executive_brief`. SQL 017 no se ejecuta aquí; sigue siendo requisito operativo separado de memoria persistente.

Archivos: `lib/director-ia-daily-deviation.js`; wiring `lib/director-ia-chat.js`, `lib/director-ia-planner.js`, `lib/director-ia-tools.js`, `lib/director-ia-conversation-state.js`. Tool de registry `get_daily_sales_deviation` (no contamina `arr_status` / M9).

---

### Desviación diaria de descuento/kg `daily_discount_deviation` (no es módulo M0–M20)

**Implementado** (`IMPL-DIRECTOR-IA-DAILY-DISCOUNT-KG-001`; first slice **D** — ratio + contribución reconciliada + evidencia/gaps). Chat legado. **No** IES. **No** Reasoning Engine N5. **No** cambia cobertura de ningún módulo ni el 52.5%.

**No** es `delta_discount` / M9 mensual. **No** es `financial_diagnosis` mensual. Preguntas de descuento + **ayer** ganan este intent. Venta + descuento en la misma frase **no** se fusiona: se preserva `daily_sales_deviation` para la venta. Una petición abierta de panorama **sin** nombrar descuento es **otro** intent (`daily_executive_brief`, abajo).

Path:

```text
pregunta diaria de descuento/kg
  → daily_discount_deviation
  → ayer calendario completo America/Mexico_City
  → arr.descuentos_diarios_cliente
  + arr.ventas_diarias_cliente
  → SUM(monto) / SUM(kg)
  → referencia pooled same-weekday / 14 días
  → contribución reconciliada por cliente
  → DICF + comments por cliente_key
  → information gaps
  → evidence pack
  → HILO
  → una llamada OpenAI
  → respuesta conversacional (GPT)
```

| Pieza | Runtime |
|-------|---------|
| Fecha | Ayer = día calendario completo en `America/Mexico_City`. Hoy **no** es día cerrado. `target_date` queda explícito. `active_date` efímero. |
| Fuentes | Monto: `arr.descuentos_diarios_cliente` (`fecha`, `plant_code`, `cliente_norm`, `monto`). Kg: `arr.ventas_diarias_cliente` → `SUM(kg)` al mismo grano cliente/día/planta. Join con claves físicas compatibles. **No** `planta_id` ni `cliente_key` ni canal en la fuente de descuento. |
| Canal | **NO DISPONIBLE.** La fuente de descuento no tiene canal. **No** prorratear monto. **No** inventar contribución por canal. Canal de venta, si aparece, solo sirve para derivar `cliente_key`; no entra al ratio. |
| Fórmula planta | `R_target = SUM(monto_target) / SUM(kg_target)`. `R_ref = SUM(monto_ref) / SUM(kg_ref)`. **No** AVG de ratios. **No** average-of-averages. kg = denominador. monto = numerador. kg=0 → ratio **indefinido**, no 0. `null` ≠ 0. Día sin filas ≠ ratio 0. |
| Referencia | `same_weekday_14d_pooled`: mismo ISODOW, ventana 14 días, solo días completos/con filas, misma planta, N observaciones explícito. Pooled: `SUM(monto_ref)/SUM(kg_ref)`. **No** promedio de ratios diarios. **No** día anterior por default. **No** fórmula mensual M9. |
| Contribución | `contrib_i = monto_i_target / K_target − monto_i_ref / K_ref`. `K_target` = kg total planta target. `K_ref` = kg total planta referencia. `SUM(contrib_i)` reconcilia `R_target − R_ref` (tolerancia numérica). **Ratio más alto ≠ mayor mover.** Mayor mover = mayor contribución matemática al delta del ponderado. Mix/rate **diferido**. |
| Evidencia de negocio | Comments + DICF **solo** por `cliente_key` canónico. **No** join por nombre. Comment ≠ cause. Action ≠ cause. Responsible ≠ cause. |
| Huecos | Contribuidores materiales sin evidencia suficiente en el pack. Gap = el pack no alcanza para explicar empresarialmente el movimiento. Gap ≠ «no existe causa». |
| Continuidad | `parent_intent = daily_discount_deviation`. Estrategia B: unknown + estado válido hereda **la métrica actual**. Un turno unknown que nombra inequívocamente venta, con `active_date` válida, **cambia** a `daily_sales_deviation` y conserva/revalida la fecha (cross-metric B; ver abajo). Requery cada turno. Pack fresco + HILO. Una llamada OpenAI por turno. Hold-outs viven en **tests**, no en routing de producción. |

**CONTRIBUCIÓN MATEMÁTICA ≠ CAUSA.** El cliente que más mueve el ponderado **no** queda demostrado como causa empresarial. No documentar «el cliente X causó el aumento».

El **runtime** conserva: fecha, timezone, monto, kg, ratio, referencia, contribución, reconciliación, identity/join, authz, provenance, absence/error.

**GPT** conserva: explicación, síntesis, qué destaca, quién movió matemáticamente el ponderado, qué evidencia existe, qué no está explicado, qué información falta, follow-ups. El código **no** programa una respuesta final rígida ni causalidad.

Conversación canónica (ejemplos de hilo, **no** phrasebook de producción):

```text
¿Por qué subió el descuento/kg ayer?
  → ¿Contra qué lo estás comparando?
  → ¿Quién movió más el promedio?
  → ¿Fue general?
  → ¿Sabemos por qué?
  → ¿Qué falta?
  → ¿Quién puede aclararlo?
```

Authz: planta actual, rol actual, `plantas_permitidas`, no cross-plant, fail-closed. GA/GV `SOURCE_RESTRICTED`. No amplía M9.

Ausencia / error: distinguir 0 real, `null`, kg=0, día sin filas, referencia insuficiente, `DATA_NOT_FOUND`, `SOURCE_RESTRICTED`, `TOOL_ERROR`.

**M9 UNCHANGED.** El path mensual no se usó como fórmula diaria. No documentar que M9 fue corregido. M9 puede seguir promediando ratios en su slice mensual; eso **no** se copia aquí.

Preserva: `daily_sales_deviation`, `daily_executive_brief`, action-person routing, herencia natural de follow-up, `structured_conversation_state`, `pending_work_items_only`, `plant_diagnosis`, `financial_diagnosis`, M9 mensual, M5/M6/M11/M12/M18.

Diferido: mix/rate; análisis de canal para descuento; trade-off económico por cliente; oferta estructurada de competencia; SQL 017 en entorno; topic stack (más de un `previous_frame`). El first slice de retorno intra-sesión (un prior) **ya está** documentado arriba.

Archivos: `lib/director-ia-daily-discount.js`; wiring `lib/director-ia-chat.js`, `lib/director-ia-planner.js`, `lib/director-ia-tools.js`, `lib/director-ia-conversation-state.js`. Tool de registry `get_daily_discount_deviation` (dominio `arr`; no contamina `delta_discount` / M9).

---

### Cross-metric follow-up diario (no es módulo M0–M20)

**Implementado** (`IMPL-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001`; estrategia **B** — switch contextual post-planner). Chat legado. **No** IES. **No** Reasoning Engine N5. **No** intent nuevo. **No** phrasebook. **No** cambia cobertura de ningún módulo ni el 52.5%.

**Principio:** conservar fecha ≠ conservar métrica.

Métricas soportadas: `daily_sales_deviation` ↔ `daily_discount_deviation`. El parent `daily_executive_brief` también es diario: un follow-up que nombra venta o descuento **reutiliza** este switch y conserva `active_date`. El planner aislado **sigue** exigiendo `ayer` para formar el intent standalone de métrica. El switch contextual reutiliza los tokens ya existentes de venta/descuento **sin** exigir que el follow-up repita la fecha. Brief → métrica **captura** el brief en `previous_frame`; sales ↔ discount posterior **conserva** ese prior.

Path:

```text
parent diario + active_date válida
  → planner aislado = unknown
  → el turno nombra inequívocamente la otra métrica diaria
  → no hay señal mensual
  → no hay fecha explícita incompatible
  → effective intent = destino
  → conservar / revalidar active_date
  → requery loader destino
  → parent_intent + bundle type = destino
  → pending_information_gap fresco del pack destino
  → HILO + evidencia fresca
  → GPT
```

| Pieza | Runtime |
|-------|---------|
| Reconocimiento | Tokens/lemas ya usados por `isDailySalesDeviationQuestion` / `isDailyDiscountDeviationQuestion` (`venta`/`ventas`/`vendi*`, `descuento`/`descuentos`). **No** frases completas. Hold-outs viven en **tests**. |
| Fecha heredada | Solo si el parent es diario, `active_date` existe y sigue válida, y el turno no trae otra fecha. **No** se inventa ayer. |
| Fecha explícita | Gana sobre `active_date` heredada (`hoy` no reusa el día viejo; `YYYY-MM-DD` distinta prevalece). Weekday de usuario sin parser → clarifica; no adivina. |
| Sin `active_date` | No fuerza path diario. Clarifica o hereda el parent no-diario. |
| Mensual | Señal `mes` / `mensual` **bloquea** el switch diario. No reutiliza `active_date` de ayer. Este slice **no** construye el path mensual. |
| Same-metric | Si el turno no nombra la otra métrica, estrategia B hereda el parent actual. |
| Evidencia | Loader destino fresco. Authz/provenance/ausencia actuales. Fecha compartida ≠ evidencia compartida. |
| Gap | El gap de venta **no** se convierte en gap de descuento ni viceversa. Se deriva del pack requery. |
| `previous_frame` | **No** decide el switch. Un switch contextual **no** evicta el prior de planta. Un standalone con `ayer` sí captura (semántica de topic return intacta). |
| Memoria persistente | **No** participa. `pending_work_items_only` se preserva. |
| GPT | Recibe el pack correcto + HILO. Interpreta, sintetiza, explica. **No** repara un routing incorrecto. |

Conversaciones canónicas (ejemplos de hilo, **no** phrasebook de producción):

```text
venta + ayer  →  turno unknown que nombra descuento
  → daily_sales_deviation
  → daily_discount_deviation
  → misma active_date
  → pack fresco de descuento/kg
  → follow-ups abiertos heredan descuento

descuento/kg + ayer  →  turno unknown que nombra venta
  → daily_discount_deviation
  → daily_sales_deviation
  → misma active_date
  → pack fresco de venta
```

Preserva: `daily_sales_deviation` standalone, `daily_discount_deviation` standalone, `daily_executive_brief`, herencia natural same-metric, `previous_frame`, action-person, `pending_work_items_only`, `plant_diagnosis`, `financial_diagnosis`, M9 mensual.

Diferido: terceras métricas diarias; parser de weekday; path mensual de «descuento este mes»; topic stack; SQL 017 en entorno. El hop IGF → Folios/apoyos reviewable es **otra** capacidad (`igf_reviewable_supports`, abajo); no es este switch diario.

Archivos: `lib/director-ia-conversation-state.js` (`namedDailyMetricSignal`, `resolveConversationTurn`); wiring `lib/director-ia-chat.js` (`forceIntent` del destino, `keepIncomingPreviousFrame`); helpers `lib/director-ia-planner.js` (`namesDailySalesMetric` / `namesDailyDiscountMetric`). Tests: `test/director-ia-daily-cross-metric-followup.test.js`.

---

### Brief ejecutivo diario `daily_executive_brief` (no es módulo M0–M20)

**Implementado** (`IMPL-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001`; first slice **B** — venta diaria + descuento/kg diario). Chat legado. **No** IES. **No** Reasoning Engine N5. **No** phrasebook. **No** cambia cobertura de ningún módulo ni el 52.5%.

**Significado:** petición abierta de panorama/resumen ejecutivo de un día **sin** exigir que el usuario nombre venta o descuento. **No** sobrecarga `plant_diagnosis`.

Ejemplos de **intención** (no reglas literales de routing): «¿Cómo nos fue ayer?», «¿Qué tal estuvo ayer?», «Dame el resumen de ayer.», «¿Qué panorama tuvimos ayer?». Hold-outs viven en **tests**. El detector usa tokens semánticos de día + overview; **no** switch por frase exacta.

**Precedencia:** «¿Cómo estuvo la venta ayer?» → `daily_sales_deviation`. «¿Cómo estuvo el descuento/kg ayer?» → `daily_discount_deviation`. Brief **solo** cuando pide panorama sin elegir métrica.

Path:

```text
pregunta abierta de panorama diario
  → daily_executive_brief
  → resolver planta / fecha
  → pack fresco daily_sales_deviation
  → pack fresco daily_discount_deviation
  → misma planta + misma fecha
  → bloques + provenance + limitations/gaps separados
  → HILO
  → una llamada OpenAI
  → síntesis ejecutiva (GPT)
```

| Pieza | Runtime |
|-------|---------|
| Fecha | Timezone `America/Mexico_City`. Ayer = día calendario completo. Fecha explícita gana. Hoy **no** se trata silenciosamente como día cerrado. 0 filas ≠ 0. `active_date` lo **establece** el brief. |
| Composición | Reutiliza `loadDailySalesDeviationForChat` + `loadDailyDiscountDeviationForChat`. **No** SQL paralelo. **No** ingreso diario. **No** registry genérico de KPIs. |
| Pack | `plant`, `target_date`, bloque venta, bloque descuento/kg, provenance **separado**, limitations/gaps **separados**, `partial`. Componer evidencia ≠ componer causa. |
| Partial-data | Venta OK + descuento missing → responde venta + limitation. Inverso simétrico. Ambas missing → no inventa resumen. missing ≠ zero. |
| Materialidad | Runtime aporta valor, referencia, delta, contribuidores, evidencia, limitations. GPT decide qué destaca, si hay tensión, qué revisar y qué sigue sin explicación. **No** umbrales. **No** «buen día» / «mal día» programado. |
| Causalidad | Movimiento conjunto no implica causa. Seguro: declarar ambos movimientos y qué conviene revisar. Prohibido: «el descuento provocó la venta»; «vendimos más gracias al descuento». |
| Continuidad | `parent_intent = daily_executive_brief`. Open followups (atención / qué más / qué revisar / qué sigue sin explicación) heredan brief y llegan a GPT. «¿Y la venta?» / «¿Y el descuento?» reutilizan cross-metric B con la misma `active_date`. Brief → métrica captura brief en `previous_frame`. |
| Memoria persistente | **No** navega el día. El pack diario no es work item. |

Conversación canónica (ejemplos de hilo, **no** phrasebook de producción):

```text
¿Cómo nos fue ayer?
  → ¿Qué te llama la atención?
  → ¿Y la venta?
  → ¿Y el descuento?
  → ¿Quién lo movió más?
  → ¿Sabemos por qué?
  → ¿Qué sigue sin explicación?
```

Authz: planta actual, rol actual, `plantas_permitidas`, no cross-plant, fail-closed.

Preserva: `daily_sales_deviation`, `daily_discount_deviation`, cross-metric B, herencia natural, `previous_frame`, action-person, `igf_reviewable_supports`, `pending_work_items_only`, M9.

Diferido desde el brief: ingreso diario; brief matutino programado; saludo personalizado; directorio SEH; Taller Mayor por unidad; closed-month IGF. La tendencia 30/90 CASA/COMISIONISTA es **otro intent** (`commercial_trend`, abajo). El perfil longitudinal 3M es **otro intent** (`client_profile`, abajo).

Archivos: `lib/director-ia-daily-executive-brief.js`; wiring `lib/director-ia-chat.js`, `lib/director-ia-planner.js`, `lib/director-ia-tools.js`, `lib/director-ia-conversation-state.js`. Tool de registry `get_daily_executive_brief` (read-only; no contamina `arr_status` / M9). Tests: `test/director-ia-daily-executive-brief.test.js`.

---

### Tendencia comercial de gráfica `commercial_trend` (no es módulo M0–M20)

**Implementado** (`IMPL-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001`; arquitectura **B** — shared backend engine; first slice **B** — serie + OLS + top-6 movers). Chat legado + dashboard. **No** IES. **No** Reasoning Engine N5. **No** phrasebook. **No** HTTP interno. **No** cambia cobertura de ningún módulo ni el 52.5%.

**Principio:** dashboard y chat hablan de la **misma verdad**. Motor canónico: `lib/commercial-trend-engine.js`. Consumidores: `GET /api/arr/venta-serie` y `commercial_trend`. Prohibido: SQL paralelo de chat; copiar OLS solo a Director IA; segunda matemática.

**No** es `daily_executive_brief`. **No** es `daily_sales_deviation` (ayer). **No** es `commercial_state` DICF. **No** es M9 mensual. Un solo intent; no hay intents separados por canal ni por 30/90.

Slots: `range_days`, `channel`, `plant`.

Path:

```text
pregunta de tendencia / rango / canal
  → commercial_trend
  → resolver planta / rango / canal
  → loadCommercialTrend (motor compartido)
  → serie diaria + OLS + top-6
  → HILO
  → una llamada OpenAI
  → síntesis ejecutiva (GPT)
```

| Pieza | Runtime |
|-------|---------|
| Rango | `1m` = 30 días trailing (`end−29`). `3m` = 90 (`end−89`). Ancla = `MAX(fecha)` disponible. **No** hoy. **No** mes calendario. Inclusive el último día disponible. Default 30 si el turno no nombra rango. |
| Canal | `LIKE '%comisionista%'` → COMISIONISTA. Resto → CASA. Alias COMISIONISTA / COMISIONISTAS. Canal no especificado → `both` (dos llamadas independientes; **no** usar `ambos` sumado como comparación). |
| Serie | Grano diario. Mismos puntos, planta, filtro de canal y semántica de días omitidos que el dashboard. Día omitido ≠ venta 0. |
| OLS | `x` = índice de puntos ya filtrados. `y` = `venta_ton`. `n < 2` → null / `INSUFFICIENT_DATA`. Signo: UP / DOWN / FLAT. **No** first-vs-last. **No** lectura visual. |
| Top-6 | Mismo delta vs periodo previo de igual duración y misma selección que el dashboard. Mover / contributor ≠ causa. |
| Comments | **Fuera** del first slice de chat. El wrapper HTTP del dashboard puede seguir adjuntando comments; el motor y el pack de chat **no**. Sin join por `cliente_nombre` en Director IA. |
| Comparación | CASA vs COMISIONISTAS = dos consultas al mismo motor, mismo rango, misma planta. Dos pendientes. Totales y movers por canal si existen. |
| Continuidad | `parent_intent = commercial_trend`. Estado guarda `active_range_days` / `active_channel` / planta. **Routing, no evidencia.** Requery cada turno. |
| Handoff | «Háblame del primero» puede resolver el mover seleccionado con `cliente_key` canónico si es único. El turno siguiente de perfil («qué sabemos de él», compras/descuento/acciones de **ese** cliente) es `client_profile` + requery fresco. **No** reusa points/OLS/movers como evidencia de cliente. |
| Partial-data | 0 filas; n insuficiente; un canal ausente; error de fuente. missing ≠ zero salvo semántica existente de la gráfica. |

Conversación canónica (ejemplos de hilo, **no** phrasebook de producción):

```text
¿Cómo vamos en CASA los últimos 3 meses?
  → CASA 90d
¿Y COMISIONISTAS?
  → COMISIONISTA 90d; fresh requery
Compáralos.
  → mismo rango; dos llamadas al motor; dos pendientes
¿Quién explica más la caída?
  → mayor contributor/mover matemático; NO causa
Háblame del primero.
  → handoff canónico si es seguro
```

Si GPT usa «explica», aclara: contribuye al movimiento ≠ causa.

Authz: planta actual, `plantas_permitidas`, no cross-plant, fail-closed. GA/GV `SOURCE_RESTRICTED`.

Preserva: `daily_executive_brief`, `daily_sales_deviation`, `daily_discount_deviation`, cross-metric B, `commercial_state`, natural followup, `previous_frame`, action-person, `igf_reviewable_supports`, `pending_work_items_only`.

Diferido desde trend: comments de gráfica; Taller Mayor; SEH; saludo personalizado; closed-month IGF. El perfil 3M calendario es `client_profile` (abajo), no este intent.

Archivos: `lib/commercial-trend-engine.js`; `lib/director-ia-commercial-trend.js`; wiring `lib/director-ia-chat.js`, `lib/director-ia-planner.js`, `lib/director-ia-conversation-state.js`, `lib/director-ia-tools.js`; delegación `server.js` `GET /api/arr/venta-serie`. Tool `get_commercial_trend` (read-only; sin comments; no contamina `arr_status` / M9). Tests: `test/director-ia-commercial-trend.test.js`.

---

### Perfil longitudinal de cliente `client_profile` (no es módulo M0–M20)

**Implementado** (`IMPL-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001`; source **B** — reusable longitudinal client read model; routing **B** — canonical `client_profile` parent). Chat legado. **No** IES. **No** Reasoning Engine N5. **No** phrasebook. **No** segundo router LLM. **No** persistencia. **No** HTTP interno. **No** cambia cobertura de ningún módulo ni el 52.5%.

**Principio:** una vez hay `cliente_key`, hablar de ese cliente **no** depende del módulo de origen.

**No** es `commercial_trend` (90d trailing + OLS). **No** es `expediente_comercial` (1 mes latest). **No** es `client_analysis` (dump sin alineación mensual). Periodo = slot, no intent.

Identidad: `cliente_key` **obligatorio**. Prohibido join por `cliente_nombre`, fuzzy y merge silencioso de homónimos. Ventas/descuento viven en `(cliente_norm, canal, subcanal)`; las keys se derivan después (`buildClienteKey` + grupos DICF). Misma planta. Authz fail-closed.

Periodo default: mes calendario actual en `America/Mexico_City` + 2 meses previos. Actual = **PARTIAL**. Previos = **COMPLETE** si la fuente de planta cubre el mes. **3 meses calendario ≠ 90 días trailing** de `commercial_trend`. Meses explícitos sustituyen el default si se soportan.

Path:

```text
pregunta de perfil / top volumen / follow-up de cliente activo
  → client_profile
  → resolver cliente_key + planta + meses
  → loadClientProfileForChat
  → alinear kg / descuento/kg / comments / DICF por mes
  → HILO
  → una llamada OpenAI
  → síntesis ejecutiva (GPT)
```

Handoff desde tendencia:

```text
¿Cómo vamos en CASA los últimos 3 meses?
  → commercial_trend
¿Quién está moviendo la caída?
  → movers
Háblame del primero.
  → active_entity + cliente_key
¿Qué sabemos de él?
  → client_profile (fresh requery; no reusa evidencia de trend)
```

| Pieza | Runtime |
|-------|---------|
| kg/mes | `SUM(kg)` de `arr.ventas_diarias_cliente` por mes calendario, misma planta, canal heredado si aplica. |
| descuento/kg/mes | `SUM(monto)/SUM(kg)` de `arr.descuentos_diarios_cliente` + kg del **mismo** mes. **No** AVG de ratios. Denominador ausente → null. |
| Ingreso | Actual mensual cliente = **UNSUPPORTED_METRIC**. La fórmula DICF `kg_forecast × (margen − \|descuento\|)` **no** es actual. No se pone 0. No se disfraza forecast. Ante «¿Cuánto ingreso generó?» → limitation explícita. |
| Comments | `arr.cliente_comentarios` solo por `cliente_key`. Comentario ≠ causa. |
| DICF | `arr.dicf_acciones` + historial solo por `cliente_key`. Acción ≠ resultado. |
| Action Register | `arr.action_register_items` **no** tiene `cliente_key`. No join inventado. Acciones de cliente = DICF keyed. |
| Top client | Mayor `SUM(kg)` en la misma ventana de 3 meses, misma planta, mismo canal si se hereda. Empate → clarificar. |
| Continuidad | `parent_intent = client_profile`. Estado: `cliente_key`, planta, `active_period_months`, canal opcional. **Routing, no evidencia.** Requery cada turno. |
| Tendencia mensual | MoM y first-vs-last sobre buckets mensuales. **No** OLS de `commercial_trend`. |
| Correlación | Coincidencia temporal ≠ causalidad. descuento↑ + volumen↑ ≠ el descuento causó el volumen. |
| Partial-data | El perfil sigue útil si faltan comments, DICF, un mes, descuento o ingreso. missing ≠ zero. |

Follow-ups (ejemplos de hilo, **no** phrasebook): conservan `cliente_key` / planta / periodo y requery.

```text
¿Cómo ha comprado estos tres meses?
¿Qué descuento tuvo cada mes?
¿En qué mes compró más?
¿En qué mes tuvo más descuento?
¿Ese mes también compró más?
¿Qué comentarios tenemos?
¿Tiene acciones?
¿Qué pasó con esas acciones?
¿Cuánto ingreso generó?
```

Runtime owns: identidad, periodo, alineación, matemáticas, retrieval, authz, provenance, ausencia. GPT owns: síntesis, qué destaca, wording de correlación con caveats, qué queda sin explicar.

Authz: planta actual, `plantas_permitidas`, no cross-plant, fail-closed. GA/GV `SOURCE_RESTRICTED` (misma familia ARR).

Preserva: `commercial_trend`, `daily_executive_brief`, daily sales/discount, cross-metric B, action-person, topic return, `igf_reviewable_supports`, persistent memory.

Diferido: fuente de ingreso mensual actual; Taller Mayor; SEH; saludo personalizado; closed-month IGF.

Archivos: `lib/director-ia-client-profile.js`; wiring `lib/director-ia-chat.js`, `lib/director-ia-planner.js`, `lib/director-ia-conversation-state.js`, `lib/director-ia-tools.js`. Tool `get_client_profile` (read-only; no contamina `arr_status` / M9 / M11 COMPLETE). Tests: `test/director-ia-client-profile.test.js`. Suite Director IA citada: **947/947**.

---

### Consultas Action Register por responsable / acción (no es módulo M0–M20)

**Implementado** (`IMPL-DIRECTOR-IA-ACTION-PERSON-ROUTING-001`; estrategia **C** — fortalecer intents AR existentes). Chat legado. **No** IES. **No** Reasoning Engine N5. **No** intent nuevo. **No** phrasebook nuevo. **No** hardcode de Julio ni de «qué pasó con la acción de». **No** cambia cobertura de ningún módulo ni el 52.5%.

Parent canónico: `action_status` (ya existía). `accion` singular y `acciones` plural ya rutean (`/\baccion(es)?\b/` sobre texto normalizado). `action_status` es **inheritable** (estrategia B preservada).

Path:

```text
pregunta natural sobre acción/responsable
  → planner
  → action_status
  → resolución física del responsable (board de la planta)
  → Action Register
  → 0 / 1 / N acciones
  → status / fecha / vencimiento / historial-resultado SI existe
  → limitations + provenance
  → HILO
  → GPT
```

| Pieza | Runtime |
|-------|---------|
| Routing | Token estructural `accion` \| `acciones`. Acción + span de nombre propio → `action_status`. `vencid` + nombre propio → `action_status` (no listado de planta). `overdue_actions` sigue siendo vencidas **de planta** (sin span de nombre). `responsible_lookup` y `como_va_tema_ar` («cómo va mantenimiento») se preservan. |
| Precedencia vs memoria | Intent AR específico **gana** sobre resume genérico. «¿Qué pasó con la acción de Julio Pérez?» → AR. «¿Qué pasó con Arturo?» → persistent memory puede aplicar si no hay intent más específico. «qué pasó con» no se apaga. |
| Responsable | Se resuelve **físicamente** en el board/scope actual. Authz `assertActionRegisterAccess`. Sin fuzzy silencioso. Ambiguo → clarificar. Julio (ejemplo) = responsable **REGISTRADO de la acción**. **No** culpable. **No** responsable del problema. **No** causa del vencimiento. |
| 0 / 1 / N | **0** → informar que no hay acciones asociadas en el scope. **1** → carga directa. **N** → listar / acotar / clarificar. **No silent pick.** `action_id` solo si esa persona tiene **una** acción. |
| Evidencia física | `action_id`, título/tema, status, responsable, fecha de compromiso, vencida sí/no, última actualización. Historial / `resultado_cierre` **solo si el ítem ya los trae** (p. ej. fila DICF inyectada; no mix por nombre). |
| Continuidad | `parent_intent = action_status`. Estrategia B: unknown + estado válido hereda. Standalone gana (p. ej. «Retomemos la acción de Julio Pérez.»). Retorno implícito («Retomemos la acción.») puede restaurar `previous_frame` si es `action_status` compatible; requery AR; 0/1/N; **no silent pick**. Hold-outs viven en **tests**, no en routing de producción. |
| Fallo histórico | `action_id=0` vs `null` en el caso de N acciones: **CORREGIDO**. Suite vigente **814/814**. No queda pendiente. |

**RESPONSABLE REGISTRADO ≠ CULPABLE.** El vencimiento/estado son evidencia del registro. El motivo del retraso requiere evidencia adicional. No documentar «Julio no la cerró porque no dio seguimiento», «Julio incumplió» o «Julio causó el atraso» sin ese hecho registrado.

Si preguntan «¿Por qué no la cerró?» y **no** existe motivo registrado: GPT recibe status, fecha, vencimiento, responsable, actualización disponible y **limitation** explícita. Puede decir que no hay explicación registrada y qué actualización hace falta. **No inventar motivo.**

Lenguaje seguro (GPT formula; **no** es phrasebook de producción): no encuentro una explicación registrada del retraso; falta una actualización de la acción; falta saber si existe un bloqueo; falta resultado/fecha actualizada si corresponde. El responsable puede mencionarse como fuente de actualización **únicamente** porque está físicamente ligado a la acción.

Conversación canónica (ejemplos de hilo, **no** phrasebook de producción):

```text
¿Qué pasó con la acción de Julio Pérez?
  → ¿Está vencida?
  → ¿Por qué no la cerró?
  → ¿Lo sabemos?
  → ¿Qué información falta?
  → ¿Qué necesitas de Julio?
```

Un follow-up abierto con `parent_intent = action_status` válido hereda por estrategia B, no porque la frase esté codificada.

Authz: planta actual, gate AR, no cross-plant, fail-closed.

Preserva: `responsible_lookup`, `overdue_actions`, dump AR de planta, herencia natural, `pending_work_items_only`, `daily_sales_deviation`, `daily_discount_deviation`, `plant_diagnosis`, `financial_diagnosis`, M5, M6, M11, M12, M18.

Diferido: SQL 017 en entorno; scoring de desempeño de personas; trade-off económico por cliente; efectividad/causalidad before→action→after.

Archivos: `lib/director-ia-action-person.js`; wiring `lib/director-ia-chat.js` (`handleActionStatusPersonChat`), `lib/director-ia-planner.js`, `lib/director-ia-conversation-state.js`. Board existente (`buildActionRegisterBoardPayload`). **No** puntúa M12 a COMPLETE.

---

### Apoyos reviewable / contrafactual IGF `igf_reviewable_supports` (no es módulo M0–M20)

**Implementado** (`IMPL-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001`; first slice **C** — read model de Folios reviewable + contrafactual IGF). Chat legado. **No** IES. **No** Reasoning Engine N5. **No** Recommendation N5. **No** cambia cobertura de M2 ni de M7 ni el 52.5%.

**Principio:** REVIEWABLE = cancelable operacionalmente bajo las reglas **reales** actuales. **No** «no depositado = recortable».

cancelable operacional ≠ materializado contable ≠ ahorro realizado.

Director IA es **read-only**: no cancela, no solicita cancelación, no mueve etapas, no aprueba, no edita, no persiste el escenario, no modifica IGF.

Regla operativa de estatus (misma semántica de bloqueo que la cancelación directa del dashboard):

| Grupo | Estados | En el pack |
|-------|---------|------------|
| No cancelable | `PAGADO`, `CERRADO`, `COMPROBACIONES`, `EVIDENCIAS` | `not_cancellable` |
| Fuera | `CANCELADO` | excluded (no lista) |
| Reviewable | Todo el resto que la operación actual acepta (incl. `CHEQUE_GENERADO`, `CUENTA_FONDOS`, `SOLICITANDO_PAGO`, `CANCELACION_SOLICITADA`, etapas de planta/carro) | `reviewable` |

No documentar lo no cancelable como «ya gastado» o «materializado contablemente» sin evidencia contable adicional. Etiqueta preferida: «ya no cancelable bajo reglas actuales».

Path:

```text
IGF Puebla mes actual
  → “¿Qué podemos recortar de apoyos?”
  → same plant (equivalentes M3; Puebla 2 → [2, 14])
  → same mes_cargo
  → Folios fresco (SELECT public.folios)
  → clasificación según reglas reales de cancelación
  → reviewable / not_cancellable / excluded
  → counts + totals + detalle (estatus, categoría, importe, limitations, provenance)
  → ESCENARIO HIPOTÉTICO IGF (overlay live en memoria; no DB write)
  → HILO + evidencia fresca
  → GPT
```

| Pieza | Runtime |
|-------|---------|
| Intent | `igf_reviewable_supports` (dominios `folios` + `igf`). Planner **antes** de documentos / cheques / `igf_status`. No captura cheque/póliza ni clasificación/comparativo M4. |
| Scope | Misma planta que el IGF y mismo `mes_cargo`. Categorías que físicamente alimentan el overlay IGF de apoyos. `solo_zp_ad` respeta permiso. Authz folios fail-closed (GV no lista; GA puede listar y no ver contrafactual IGF). |
| Pack | id/código, importe, estatus, categoria/subcategoria, planta, `mes_cargo`, flag reviewable, limitations, provenance. Agregados: reviewable count/total y not-cancellable count/total. |
| Contrafactual | Overlay live del GET dashboard **en memoria** sobre la fila snapshot (`loadIgfArrSourceBlocksForChat`). Simula que los reviewable dejan de entrar. `recalcularUtilYResultado` + cubos ZP / carro / depósito-cierre / inversiones mes actual. `ventaKg = venta_ton * 1000`. Sin `venta_ton` no se inventa overlay cero. GA 403 → lista sí, contrafactual no. `presupuesto_kg` y campos no-folio salen del snapshot; no se reconsulta el GET. `gtos_apoyos_corp_kg` no sale de esta lista. |
| Etiqueta | **ESCENARIO HIPOTÉTICO** obligatoria. Lenguaje seguro: «Si estos folios dejaran de formar parte del cálculo bajo las mismas reglas actuales, el escenario matemático sería…». |
| Prohibido afirmar | ahorro realizado; cash; el IGF real mejorará; reversión contable garantizada; «debes cancelarlos». |
| Continuidad | `parent_intent = igf_reviewable_supports` (**inheritable**). «¿Cuánto suman?» hereda el pack. `igf_status` **no** se hereda: el hop no se pega a IGF. Evidence IGF previa **no** se reusa como Folios. |
| Guard cheques | Excepción mínima en `askDirectorIa` si el turno es este slice y el bloqueo es `cheques`. **No** habilita el módulo cheques. «¿Tiene cheque o depósito el folio?» sigue `SOURCE_NOT_INTEGRATED`. |
| Ranking | Ordenar por importe/materialidad objetiva = «para revisión». **No** recomendación de cancelar. |
| Riesgo comercial | Si falta join físico folio → cliente canónico → venta/DICF/comentarios/acciones, el pack declara exactamente qué falta. **No** inventa riesgo. |
| GPT | Síntesis ejecutiva, explicación, qué merece revisión, limitations, qué falta, follow-ups. **No** decide cancelar. **No** repara un routing incorrecto. |

Conversación canónica (ejemplos de hilo, **no** phrasebook de producción):

```text
¿Cómo proyectamos cerrar el IGF de Puebla este mes?
  → ¿Qué podemos recortar de apoyos?
  → ¿Cuáles todavía podemos detener?
  → ¿Cuánto suman?
  → ¿Cuáles ya no puedo cancelar?
  → ¿Cuáles ya están depositados/cerrados?
  → Si canceláramos los reviewable, ¿cómo quedaría el IGF?
  → ¿Cuáles revisarías primero?
  → ¿Qué riesgo tendría cancelar esos?
```

«Depositados/cerrados» en **este** hilo = estatus operativo (`PAGADO`/`CERRADO`/…). **No** es el dominio cheques.

Preserva: `igf_status` (snapshot sin overlay), workflow Folios M2, daily sales, daily discount, cross-metric, topic return, action-person, persistent memory, M9.

Diferido: closed-month IGF semantics; historical forecast; motor de riesgo comercial; ranking automático por ROI; writes / solicitud de cancelación.

Archivos: `lib/director-ia-igf-reviewable-supports.js`; wiring `lib/director-ia-chat.js`, `lib/director-ia-planner.js`, `lib/director-ia-tools.js` (`get_igf_reviewable_supports`), `lib/director-ia-conversation-state.js`. Reusa `loadIgfArrSourceBlocksForChat`, `assertFolioStatusAccess`, equivalentes M3. **No** extrae helper de `server.js`. Tests: `test/director-ia-igf-reviewable-supports.test.js` (26/26). Suite Director IA **897/897**. `git diff --check` clean.

---

## Parte 2 — Matriz maestra M0–M20

### M0 — Auth / permisos transversales

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M0 |
| **Módulo** | Auth / sesión dashboard |
| **Propósito empresarial** | Autenticar al usuario del dashboard y aplicar permisos/roles por planta. |
| **Cobertura actual de Director IA** | PARCIAL |
| **Información exacta que sí consulta** | JWT vía `req.dashboardAuth`; acceso a planta (`assertPlantaAccess` / helpers inyectados); rol GA bloqueado en commercial_state (`dashboardAuthRoleNorm === "GA"`). |
| **Información que no consulta** | Catálogo completo de permisos como dominio de respuesta; CRUD usuarios; unlock admin. |
| **Archivos actuales relacionados** | `lib/dashboard-auth.js`, `lib/usuario-permisos.js`, `frontend-dashboard/lib/auth.ts`, guards en `server.js` |
| **Endpoints actuales relacionados** | Middleware en `/api/director-ia/*`; no hay endpoint Director IA de «listar permisos». |
| **Tablas o vistas relacionadas** | `public.usuarios`, `public.roles` (lectura incidental de roles en Action Register). Vistas: no encontradas en repo. |
| **Funciones existentes reutilizables** | `authHasPermiso`, `dashboardAuthMiddleware`, `assertPlantaPermitidaDashboard` (server) |
| **Capacidades de lectura posibles** | CONSULTAR (quién está autenticado / si tiene acceso a planta) — solo a nivel de gate, no como respuesta de negocio. |
| **Capacidades de escritura posibles** | Ninguna vía Director IA chat. Cambiar permisos existe en `/api/usuarios-admin*` (fuera de Director IA). |
| **Permisos aplicables** | Token JWT; `acceso_acciones_dicf` / `acceso_consola_whatsapp_ar` catalogados; enforcement WhatsApp nivel 6 (GO/SG/SEH) limitado a `AR` y `DirectorIA`. |
| **Nivel de riesgo** | ALTO (si se usara para mutar permisos); lectura de gates = MEDIO. |
| **Dependencias** | Todos los módulos dashboard. |
| **Observaciones verificadas** | Director IA no expone el catálogo `PERMISO_CLAVES` al LLM; solo aplica auth de entrada. |

### M1 — Health

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M1 |
| **Módulo** | Health |
| **Propósito empresarial** | Monitoreo de servicio y DB. |
| **Cobertura actual de Director IA** | PARCIAL |
| **Información exacta que sí consulta** | Readiness técnica de Director IA vía `GET /health-director-ia` (`enabled` / `ready`) en el header de `DirectorIaShell`. Estados UI: `loading`, `ready`, `disabled`, `unavailable`, `transport_error`. One-shot al entrar al módulo + refresh manual. Sin polling. Sin retry automático. Request sin `Authorization`. Desacoplado de `DirectorIaCyclePanel`. |
| **Información que no consulta** | `GET /health`, `GET /health-db`, `GET /health-proyectos`. No hay herramienta de chat/LLM. `ready=true` no significa datos disponibles, operación saludable, `ACQUIRED_OK` ni conclusión de negocio. |
| **Archivos actuales relacionados** | `server.js` (ruta existente), `lib/director-ia-dashboard-cycle-transport.js` (`handleGetDirectorIaReadiness`), `frontend-dashboard/modules/director-ia/lib/api.ts` (`fetchDirectorIaHealth`), `frontend-dashboard/modules/director-ia/lib/health-client-core.js`, `frontend-dashboard/modules/director-ia/components/DirectorIaShell.tsx`, `test/director-ia-dashboard-health-client.test.js`. `frontend-dashboard/app/health/route.ts` permanece ajeno (health del frontend Next). |
| **Endpoints actuales relacionados** | Integrado: `GET /health-director-ia`. Existentes y no consultados por este slice: `GET /health`, `GET /health-db`, `GET /health-proyectos`. |
| **Tablas o vistas relacionadas** | Ninguna propia. |
| **Funciones existentes reutilizables** | `fetchDirectorIaHealth` / `interpretDirectorIaHealthResponse`; handler `handleGetDirectorIaReadiness`. Handlers `/health`, `/health-db`, `/health-proyectos` no usados por Director IA. |
| **Capacidades de lectura posibles** | CONSULTAR readiness técnica del servicio Director IA en dashboard. No CONSULTAR liveness/DB/proyectos. No tool conversacional. |
| **Capacidades de escritura posibles** | N/A |
| **Permisos aplicables** | Sin auth en `GET /health-director-ia`. El módulo de página sigue exigiendo token para ver el shell. |
| **Nivel de riesgo** | BAJO |
| **Dependencias** | Ninguna de negocio. |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M1-HEALTH-DASHBOARD-001` (integrado en main). Tests focales 14/14; suite `test/director-ia-*.test.js` 399/399 según el reporte IMPL. No se declara COMPLETA: el dominio Health de producto (`/health`, `/health-db`, `/health-proyectos`) sigue fuera. |

### M2 — Kanban / Folios

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M2 |
| **Módulo** | Kanban / Folios |
| **Propósito empresarial** | Flujo operativo de folios por etapas (aprobación, carro, cheque, depósito, comprobaciones, evidencias). |
| **Cobertura actual de Director IA** | PARCIAL (comentarios de folio + slice read-only `folio_status` + slice read-only `folio_history` + slice read-only `folio_documents` metadata-only). **No** es COMPLETE: no cubre el kanban HTTP, contenido PDF/S3, documentos faltantes, cumplimiento documental, cheque/póliza, `kanban_flow` inferencial ni mutaciones. |
| **Información exacta que sí consulta** | Comentarios: `loadFolioComentariosForDirectorIa` (límite 80) → `public.comentarios` ⋈ `public.folios`. Estatus/etapa on-demand: intent `folio_status` → tool `get_folio_status` → `loadFolioStatusForChat` → SELECT-only (`getFolioById` / `getFolioByNumero` / `getManyFoliosStatus` / `listFoliosByPlanta` + `buildDashboardWhere` con `ventana: "0"`). Consulta por id, por `numero_folio`, varios folios, listado por planta y filtro/listado por etapa. `estatus` = columna observada `public.folios.estatus`. `etapa` = derivada con `estatusToEtapaVisual` (no hay columna DB `etapa`). Historial on-demand: intent `folio_history` → tool `get_folio_history` → `loadFolioHistoryForChat` → resolver/autorizar folio → SELECT-only `public.folio_historial` (`listHistorialForFolio`). History por id o por `numero_folio`. Campos observados del evento: `estatus`, `comentario`, `actor_telefono`, `actor_rol`, `creado_en`. `etapa` del evento = derivada con `estatusToEtapaVisual` **solo** si el `estatus` del evento existe y mapea. Eventos no deduplicados; misma etapa repetida se preserva. Metadata documental on-demand: intent `folio_documents` → tool `get_folio_documents` → `loadFolioDocumentsMetadataForChat` → resolver/autorizar folio → SELECT-only `public.folio_archivos` (`listDocumentsMetadataForFolio`) → `projectDocument` (allowlist). Metadata por id o por `numero_folio`. Campos seguros: `document_id`, `tipo`, `status`, `file_name`, `subido_en` + identidad mínima del folio. Semántica: «Estos son los registros documentales que existen para este folio.» Cero filas: «no hay registros documentales encontrados» (**no** «faltan documentos»). Evidencia status: `folio_id`, `numero_folio`, `estatus`, `etapa`, `planta_id`, `planta_nombre`, `source`, `retrieved_at`. Evidencia history: esos identificadores + eventos crudos (`event_id` solo si `id` físico existe). Evidencia documents: esos identificadores + registros proyectados (`source` = `public.folio_archivos`). |
| **Información que no consulta** | `GET /api/dashboard/kanban` (excluido: puede autoavanzar). `GET /api/folios/:id` (excluido: puede autoavanzar). `GET /api/folios/:id/timeline` (excluido como transporte interno; no autoavanza, pero no es fuente de Director IA y su `dedupeHistorialByStage` no se copia). `maybeAdvanceFolioToComprobaciones`. `dedupeHistorialByStage`. Contenido PDF, S3, signed URLs, descarga, OCR. `s3_key`, URL, bucket, raw path, `sha256`, bytes. Documentos faltantes / cumplimiento documental. Cheque, póliza, presupuesto. `kanban_flow` inferencial. `estatus_anterior` / `estatus_nuevo` / `event_type` del evento (no existen en la fila). Actor sistema inferido (actor null **no** significa sistema). Crear/editar/aprobar/cancelar. Cualquier UPDATE/INSERT/DELETE. |
| **Archivos actuales relacionados** | `lib/director-ia-m2-folio-status.js`; `lib/director-ia-m2-history.js`; `lib/director-ia-m2-documents-metadata.js`; wiring en `lib/director-ia-chat.js`, `lib/director-ia-tools.js`, `lib/director-ia-capabilities.js`, `lib/director-ia-planner.js`; comentarios: `lib/cliente-comentarios.js`. `server.js` handlers kanban/`/folios/:id`/`/timeline`/`/media` **no** usados por Director IA. |
| **Endpoints actuales relacionados** | Lectura integrada in-process (no HTTP interno). Folios HTTP existentes y **no** usados como fuente: `/api/dashboard/kanban`, `/api/folios/:id` (pueden llamar `maybeAdvanceFolioToComprobaciones`); `/api/folios/:id/timeline` (no autoavanza; excluido por HTTP interno + dedupe); `/api/folios/:id/media*`, `/cotizacion`, `documento-*` (excluidos: pueden exponer `s3_key` o contenido). |
| **Tablas o vistas relacionadas** | `public.folios` (estatus observado), `public.plantas`, `public.comentarios`, `public.folio_historial` (eventos observados del slice history), `public.folio_archivos` (solo metadata del slice documents; SELECT sin `s3_key`/`url`/`sha256`). |
| **Funciones existentes reutilizables** | `loadFolioStatusForChat`, `getFolioById`, `getFolioByNumero`, `getManyFoliosStatus`, `listFoliosByPlanta`, `estatusToEtapaVisual`, `etapaVisualToEstatusTecnicos`, `buildDashboardWhere`, `loadFolioHistoryForChat`, `listHistorialForFolio`, `loadFolioDocumentsMetadataForChat`, `listDocumentsMetadataForFolio`, `projectDocument`, `assertFolioStatusAccess`, `folioVisibleToAuth`, `folioInPlantScope`, `loadFolioComentariosForDirectorIa`. |
| **Capacidades de lectura posibles** | CONSULTAR/RESUMIR comentarios; CONSULTAR estatus observado; CONSULTAR etapa derivada; BUSCAR por id/`numero_folio`; LISTAR por planta/etapa; CONSULTAR historial de eventos observados (sin dedupe); CONSULTAR metadata documental registrada (sin contenido). CONSULTAR PDF/S3/faltantes/cheque/póliza **no** integrados. |
| **Capacidades de escritura posibles** | CREAR/EDITAR/APROBAR/CANCELAR folio existen en API folios; **no** conectadas a Director IA. No autoavance. No uploads/deletes de media. |
| **Permisos aplicables** | JWT/`req.dashboardAuth`; rol; `planta_id`; `plantas_permitidas` (GG/GA/AD fail-closed). GV = 403. GA solo en planta autorizada. Folio cross-planta = 403. Not found = 404. History y metadata: resolver folio y autorizar **antes** de consultar `public.folio_historial` / `public.folio_archivos`. |
| **Nivel de riesgo** | Lectura estatus/etapa/historial/comentarios/metadata: MEDIO. Mutaciones folio / exposición S3: ALTO (fuera de Director IA). |
| **Dependencias** | Plantas; equivalentes M3; contenido M15, presupuestos (carro) y proyectos siguen fuera de este slice. |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001` (main `e5bd3a05`) + `IMPL-DIRECTOR-IA-M2-HISTORY-001` (main `368394f7`) + `IMPL-DIRECTOR-IA-M2-DOCUMENTS-METADATA-001` (main `243d7e91`). Tests metadata: focales 24/24; capabilities 33/33; planner 36/36; orchestrator 24/24; suite `test/director-ia-*.test.js` 533/533; `git diff --check` limpio. **Sync transversal** `IMPL-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001`: el intent `igf_reviewable_supports` lee `public.folios` (same plant / `mes_cargo`) para clasificar cancelabilidad operativa; **no** cancela; **no** es `folio_status`; **no** habilita cheques. M2 **sigue PARCIAL**. Scoring M0–M20 **sin cambio**: 10.5/20 = **52.5%** (PARTIAL ya valía 0.5; no se suma módulo). |

### M3 — Plantas / KPIs / Proyectos

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M3 |
| **Módulo** | Plantas / KPIs / Proyectos |
| **Propósito empresarial** | Catálogo de plantas, KPIs de dashboard, proyectos por planta. |
| **Cobertura actual de Director IA** | COMPLETA (respecto a la consulta canónica de las tres familias: planta del scope, KPIs de dashboard y proyectos por planta; no implica catálogo global, estatus «retrasado» almacenado ni creación de proyectos). |
| **Información exacta que sí consulta** | `planta_id` obligatorio + `nombre`/`clave` de la planta del scope; KPIs de folios vía `get_dashboard_kpis` / `loadDashboardKpisForChat` / `queryDashboardKpis` (misma semántica que `GET /api/dashboard/kpis`: `total_activos`, `total_mxn`, `pendientes_zp`, `avg_aging`, `oldest`, `top_planta`, `top_categoria`, ventana default); listado `public.proyectos` EN_CURSO vía `get_project_status` / `loadProyectosForChat`. |
| **Información que no consulta** | Catálogo global de plantas; crear/editar/eliminar proyecto (`POST /api/proyectos`); estatus almacenado «retrasado»; IGF/ARR/commercial_state como sustituto de estos KPIs. |
| **Archivos actuales relacionados** | `lib/director-ia-m3-plantas-kpis-proyectos.js`; wiring en `lib/director-ia-chat.js`, `lib/director-ia-tools.js`, `lib/director-ia-capabilities.js`, `lib/director-ia-planner.js`; `server.js` reutiliza helpers extraídos. UI `CrearProyectoModal` sigue fuera de Director IA. |
| **Endpoints actuales relacionados** | Lectura integrada in-process (no HTTP interno): lógica de `GET /api/dashboard/kpis` y helpers de `GET /api/dashboard/proyectos`. Escritura existente y no integrada: `POST /api/proyectos`. `GET /api/proyectos` no existe. |
| **Tablas o vistas relacionadas** | `public.plantas`, `public.folios` (KPIs), `public.proyectos`, `proyecto_*` (no requisito de COMPLETE) |
| **Funciones existentes reutilizables** | `loadDashboardKpisForChat`, `queryDashboardKpis`, `parseDashboardFilters`, `buildDashboardWhere`, `loadProyectosForChat`, `listarProyectosPorPlantaOEquivalentes`; identidad de planta en anexos IGF/ARR / commercial_state. |
| **Capacidades de lectura posibles** | CONSULTAR identidad de planta del scope; CONSULTAR KPIs dashboard; CONSULTAR proyectos por planta. |
| **Capacidades de escritura posibles** | CREAR proyecto (`POST /api/proyectos`) — **no** en Director IA. |
| **Permisos aplicables** | JWT + `planta_id`; `plantas_permitidas` (GG/GA/AD); GA bloqueado en KPIs; GV bloqueado en KPIs y proyectos. |
| **Nivel de riesgo** | Lectura planta: BAJO. KPIs financieros (monto): MEDIO. |
| **Dependencias** | Base de casi todos los módulos. |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-001` (integrado en main, `b4761802`). Tests focales 20/20; suite `test/director-ia-*.test.js` 436/436; scripts capabilities 22/22, planner 30/30, orchestrator 21/21. COMPLETE = consulta autorizada de las tres familias; no catálogo global; no mutaciones; no cycle. Scoring M0–M20 del loop (COMPLETE=1.0, PARCIAL=0.5, INDIRECTA=0.5, NOT_STARTED=0.0): 7.5/20 = 37.5% → **8.0/20 = 40.0%**. |

### M4 — Clasificación de apoyos + COMPARAR

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M4 |
| **Módulo** | Clasificación de apoyos + COMPARAR |
| **Propósito empresarial** | Comparativo mensual por planta/categoría; reconciliación Excel. |
| **Cobertura actual de Director IA** | PARCIAL (query JSON read-only de matriz comparativa `mes_a` vs `mes_b` por planta y familia). **No** es COMPLETE: el propósito canónico incluye COMPARAR y reconciliación Excel, que permanecen fuera. |
| **Información exacta que sí consulta** | Matriz agregada de `public.folios` vía `buildClasificacionMatrix`: GASTOS, INVERSIONES y TALLER separados; `valor_a`, `valor_b`, `delta` absoluto; `%` solo si la base (`valor_b`) ≠ 0. `mes_a` y `mes_b` obligatorios, formato `YYYY-MM`, A ≠ B; no se inventan periodos. 0 filas = matriz de ceros (respuesta válida). El delta es factual: aumento/disminución observada; no implica causa, problema, mejora, cumplimiento, desviación presupuestal ni responsable. |
| **Información que no consulta** | COMPARAR (inspección/agregar/rechazar/confirmar); `insertFolio`; `UPDATE mes_cargo`; Excel/xlsx; `buildClasificacionApoyosWorkbook`; GET `/clasificacion-apoyos-excel`; detalle de celda HTTP; fallback a 6 plantas. No es listado M6 (`expandCategoriaRows`). Celda TALLER ≠ M5 Taller por AT. No IGF. |
| **Archivos actuales relacionados** | `lib/director-ia-m4-clasificacion-query.js`; `lib/clasificacion-apoyos-excel.js` (`buildClasificacionMatrix`, `PLANTAS_COMPARATIVO` únicamente); wiring en `lib/director-ia-chat.js`, `lib/director-ia-tools.js`, `lib/director-ia-capabilities.js`, `lib/director-ia-planner.js`. `lib/clasificacion-comparar.js` **no** usado. |
| **Endpoints actuales relacionados** | Chat: `POST /api/director-ia/chat` (in-process). GET `/api/dashboard/clasificacion-apoyos*` y POST `/clasificacion-comparar*` **no** se usan como transporte interno. |
| **Tablas o vistas relacionadas** | Lectura `public.folios` (sin tablas `clasificacion_*`). Escritura de COMPARAR existe en producto y **sigue fuera**. |
| **Funciones existentes reutilizables** | `loadClasificacionApoyosForChat` → SELECT + `buildClasificacionMatrix`. **No** `resolvePlantasComparativo` (evita fallback global). **No** `buildClasificacionApoyosWorkbook`. Authz: `requirePlantaId` + `assertFolioStatusAccess` + grupo canónico ∩ `plantas_permitidas`. |
| **Capacidades de lectura posibles** | CONSULTAR/COMPARAR (tipo lectura: diffs A vs B) / RESUMIR matriz. DESCARGAR DOCUMENTO / reconciliación Excel **no** cableados. |
| **Capacidades de escritura posibles** | Actualizar/agregar folios vía COMPARAR — ALTO; **no** en Director IA. |
| **Permisos aplicables** | JWT/contexto; rol; `planta_id` obligatorio; `plantas_permitidas`; GV 403; GA permitido solo si el grupo comparativo completo está autorizado; cross-planta 403; planta fuera de `PLANTAS_COMPARATIVO` = fail-closed (no 6 provincias); privados excluidos (sin `priv_clave` de chat). |
| **Nivel de riesgo** | MEDIO (lectura); ALTO (actualizar vía COMPARAR — fuera). |
| **Dependencias** | Folios, plantas. Distinto de M5, M6 y M7. |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M4-CLASIFICACION-QUERY-001` (integrado en main, `2c240407`). Tests: focales 18/18; capabilities 42/42; planner 39/39; orchestrator 24/24; suite `test/director-ia-*.test.js` 575/575; `git diff --check` limpio. COMPARAR/Excel **siguen fuera**. Scoring M0–M20 del loop (COMPLETE=1.0, PARCIAL=0.5, INDIRECTA=0.5, NOT_STARTED/NO INTEGRADA=0.0): 9.0/20 = 45.0% → **9.5/20 = 47.5%**. |

### M5 — Taller por AT

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M5 |
| **Módulo** | Taller por AT |
| **Propósito empresarial** | Excel de gasto taller por unidad AT, con hoja de duplicados. |
| **Cobertura actual de Director IA** | PARCIAL (query JSON read-only de folios TALLER por token de `public.folios.unidad`, planta y `YYYY-MM`). **No** es COMPLETE: el propósito canónico incluye Excel/workbook y hoja de duplicados, que permanecen fuera. |
| **Información exacta que sí consulta** | Slice on-demand `taller_at` → `get_taller_at` → `loadTallerAtForChat` → SELECT `public.folios` (`categoria LIKE '%TALLER%'`; `estatus <> 'CANCELADO'`) + `expandTallerRows`. Unidad = token físico de `public.folios.unidad` homologado con `unidad-taller` (ej. `AT-15`, `PT-03`). **No** existe `at_id`. **No** existe catálogo AT. Unidad ≠ responsable. Periodo `YYYY-MM` obligatorio (un mes o rango de dos); si falta, clarifica; no inventa mes. Campos observados: unidad, folio, periodo, concepto, importe, estatus; count/total del conjunto consultado. 0 filas: «No se encontraron registros TALLER para esa planta/unidad/periodo.» Authz folios **antes** del SELECT (`assertFolioStatusAccess`). In-process. Sin HTTP interno. |
| **Información que no consulta** | Excel/workbook (`buildTallerAtWorkbook`); GET `/api/dashboard/taller-at-excel`; hoja de duplicados de taller (detector ≠ M16); writes; `priv_clave`. No es listado M6 GASTOS/INVERSIONES. No es familia agregada M4. No es «cómo va Taller» (Action Register). No afirma causa, responsable, atraso, urgencia, desviación. |
| **Archivos actuales relacionados** | `lib/director-ia-m5-taller-at.js`; `lib/taller-at-excel.js` (`expandTallerRows` únicamente); `lib/unidad-taller.js`; wiring en `lib/director-ia-chat.js`, `lib/director-ia-tools.js`, `lib/director-ia-capabilities.js`, `lib/director-ia-planner.js` |
| **Endpoints actuales relacionados** | Chat: `POST /api/director-ia/chat` (in-process). El GET `/api/dashboard/taller-at-excel` **no** se usa como transporte interno. |
| **Tablas o vistas relacionadas** | `public.folios` ⋈ `public.plantas`. Campo de unidad: `public.folios.unidad`. |
| **Funciones existentes reutilizables** | `loadTallerAtForChat` → SELECT + `expandTallerRows` + `parseUnidadesList`. **No** `buildTallerAtWorkbook`. Authz: `assertFolioStatusAccess` (no el bloqueo GA de KPIs IGF). |
| **Capacidades de lectura posibles** | CONSULTAR/RESUMIR gasto TALLER por unidad. DESCARGAR DOCUMENTO / Excel / duplicados taller **no** cableados. |
| **Capacidades de escritura posibles** | DESCARGAR xlsx en API dashboard; no vía chat Director IA. |
| **Permisos aplicables** | JWT/contexto; rol; `planta_id`; `plantas_permitidas`; GV 403; GA en planta autorizada; cross-planta 403; fail-closed. Privados excluidos (sin `priv_clave`). |
| **Nivel de riesgo** | MEDIO (lectura); ALTO si se lee como AR, M4, M6, causa o Excel. |
| **Dependencias** | Folios. Distinto de M4, M6, M7 y Action Register. |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M5-TALLER-AT-001` (integrado, merge `848d3eb1`). Tests: focales 16/16; capabilities 56/56; planner 49/49; orchestrator 26/26; suite `test/director-ia-*.test.js` 673/673; `git diff --check` limpio. TALLER ≠ GASTOS ≠ INVERSIONES. M4 familia TALLER ≠ detalle por unidad. «cómo va Taller» / acciones AT-15 siguen AR. Excel/duplicados **siguen fuera**. M5 = **PARCIAL**. **No** COMPLETE. Scoring M0–M20 del loop (COMPLETE=1.0, PARCIAL/INDIRECTA=0.5, NO INTEGRADA=0.0): 10.0/20 = 50.0% → **10.5/20 = 52.5%**. |

### M6 — GASTOS / INVERSIONES (rango Excel)

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M6 |
| **Módulo** | GASTOS / INVERSIONES Excel |
| **Propósito empresarial** | Export por categoría y ventana de meses. |
| **Cobertura actual de Director IA** | PARCIAL (query JSON read-only de folios GASTOS e INVERSIONES por planta y `YYYY-MM`). **No** es COMPLETE: el propósito canónico incluye Export/xlsx, que permanece fuera. |
| **Información exacta que sí consulta** | Listados estructurados de `public.folios` categoría GASTOS xor INVERSIONES (predicados físicos distintos; no se mezclan). Campos observados tras `expandCategoriaRows`: folio, partida/subcategoría, concepto, importe, estatus, beneficiario, `mes_cargo`. Conteos/totales solo del conjunto consultado. Periodo `YYYY-MM` obligatorio (un mes o rango de dos; no se inventa mes). 0 filas es respuesta válida. |
| **Información que no consulta** | Export/xlsx; `buildCategoriaRangoWorkbook`; GET `/categoria-rango-excel`; Taller AT (M5); IGF/ARR (M7/M8). No afirma desviación, causa, comparación ni «pendiente» como etapa. |
| **Archivos actuales relacionados** | `lib/director-ia-m6-gastos-inversiones.js`; `lib/categoria-rango-excel.js` (`expandCategoriaRows` únicamente); wiring en `lib/director-ia-chat.js`, `lib/director-ia-tools.js`, `lib/director-ia-capabilities.js`, `lib/director-ia-planner.js` |
| **Endpoints actuales relacionados** | Chat: `POST /api/director-ia/chat` (in-process). El GET `/api/dashboard/categoria-rango-excel` **no** se usa como transporte interno. |
| **Tablas o vistas relacionadas** | `public.folios` ⋈ `public.plantas` |
| **Funciones existentes reutilizables** | `loadGastosInversionesForChat` → SELECT + `expandCategoriaRows`. **No** `buildCategoriaRangoWorkbook`. Authz: `assertFolioStatusAccess` (no el bloqueo GA de KPIs IGF). |
| **Capacidades de lectura posibles** | CONSULTAR/RESUMIR listados GASTOS e INVERSIONES de folios. DESCARGAR DOCUMENTO / Export **no** cableado. |
| **Capacidades de escritura posibles** | N/A en este módulo. |
| **Permisos aplicables** | JWT/contexto; rol; `planta_id`; `plantas_permitidas`; GV 403; GA permitido en planta autorizada; cross-planta 403; fail-closed. Privados excluidos (equivalente a GET sin `priv_clave`). |
| **Nivel de riesgo** | MEDIO |
| **Dependencias** | Folios. Distinto de IGF (M7). |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M6-GASTOS-INVERSIONES-001` (integrado en main, `7b8e8bdf` / `2d145056`). Tests: focales 24/24; capabilities 38/38; planner 37/37; orchestrator 24/24; suite `test/director-ia-*.test.js` 557/557; `git diff --check` limpio. GASTOS ≠ INVERSIONES ≠ IGF. «cómo van los gastos» / margen / rentabilidad siguen M7. Export/xlsx **sigue fuera**. Scoring M0–M20 del loop (COMPLETE=1.0, PARCIAL=0.5, INDIRECTA=0.5, NOT_STARTED/NO INTEGRADA=0.0): 8.5/20 = 42.5% → **9.0/20 = 45.0%**. |

### M7 — IGF Forecast

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M7 |
| **Módulo** | IGF Forecast |
| **Propósito empresarial** | Forecast financiero por planta/empresa, compromiso, HG, pronóstico. |
| **Cobertura actual de Director IA** | PARCIAL (chat on-demand + slice de composición observada de **una** fila). `sources.igf` siempre false en GET context. **No** es COMPLETE: UI IGF, PATCH HG, meta Excel, versiones UI, overlay de folios, recálculo y causalidad permanecen fuera. |
| **Información exacta que sí consulta** | Anexo IGF on-demand: `igf_status` / KPI annex → `get_igf_snapshot` → `loadIgfArrAnnexForChat` → `loadIgfCommitSnapshot` (`SELECT id, version_number` de `igf.versions` GLOBAL del mes, `ORDER BY version_number DESC LIMIT 1`; `SELECT *` de `igf.compromiso_lines`; `findIgfRowForPlant` → **una** fila: planta + versión + mes) → `extractIgfComposition` (allowlist `IGF_COMPOSITION_CATALOG`; omite null/`""`/no finito; `omitted_null_keys`; ranking de magnitud solo intra `$/kg` de roles `add`/`subtract`) → `formatIgfCompositionBlock` (bloque «COMPOSICIÓN IGF (snapshot, no tendencia)») → evidencia en annex. Margen vía `getMargenKgPorPeriodo` (inyectado). Activado por `shouldAttachIgfArrAnnex` / `isPlantFinancialKpiQuestion` / `isIgfCompositionQuestion` / `isIgfForecastQuestion`. Fuente de líneas: `igf.compromiso_lines`. Unidades: `*_kg` = **$/kg**, no kilogramos; `ton` ≠ `$/kg` ≠ `%` ≠ `MXN`; no se mezclan. Null ≠ 0 (null se omite, no se emite como cero). Signo físico preservado; `hg_kg` **no** invertido. `gasto_kg` tiene `formula_role: none` (aparece en el snapshot; no entra a la fórmula de utilidad/resultado). `recalcularUtilYResultado` es **referencia semántica** de roles (`add`/`subtract`/`stored_*`); **no** se ejecuta. Sin overlay de folios. `ORDER_DELTAS` es presentación UI; **no** se importa ni entra a fórmula. Snapshot ≠ tendencia: `isIgfCompositionQuestion` es false ante «cómo cambió venta/descuento/ingreso» (M9). Composición ≠ causalidad; magnitud ≠ importancia operacional; línea ≠ responsable; signo ≠ juicio empresarial. En intent `financial_diagnosis` el bloque IGF entra por `loadIgfArrSourceBlocksForChat` (mismo snapshot/composición; periodo real YYYY-MM; provenance propia; no annex híbrido; no fusiona ARR ni M9). En intent `plant_diagnosis` el mismo loader aporta el bloque IGF junto a AR/DICF/bitácora/ARR/CS; **sin M9**; provenance propia; GA → `SOURCE_RESTRICTED` (no aborta el pack). |
| **Información que no consulta** | UI completa IGF, PATCH HG, meta Excel, metahg completo, `igf-folios-detalle`, presupuesto-detalle UI, versiones UI. Recálculo de utilidad/resultado. Overlay de folios/presupuesto del GET dashboard. Deltas temporales de líneas IGF (dominio M9). Causalidad / problema / responsable / prioridad. GET `sources.igf`. |
| **Archivos actuales relacionados** | `lib/director-ia-igf-arr.js` (`extractIgfComposition`, `formatIgfCompositionBlock`, `loadIgfCommitSnapshot`, `loadIgfArrAnnexForChat`, `loadIgfArrSourceBlocksForChat`); `lib/director-ia-financial-diagnosis.js` (ensamblaje transversal financiero; no cambia cobertura M7); `lib/director-ia-plant-diagnosis.js` (ensamblaje transversal de planta; no cambia cobertura M7); wiring existente `lib/director-ia-tools.js` (`get_igf_snapshot`), `lib/director-ia-planner.js` (`igf_status` / `financial_diagnosis` / `plant_diagnosis`), `lib/director-ia-capabilities.js`; `igf-handler.js`, `lib/dashboard-arr-forecast.js` (referencia de producto; no transporte del slice). |
| **Endpoints actuales relacionados** | Chat: `POST /api/director-ia/chat` (in-process; sin HTTP interno). Dashboard (no usados por IA): `/api/dashboard/igf-*`. |
| **Tablas o vistas relacionadas** | `igf.versions`, `igf.compromiso_lines`. Schemas `igf_meta` / `igf_metahg` (UI; no en el bloque de composición). |
| **Funciones existentes reutilizables** | `loadIgfArrAnnexForChat`, `loadIgfArrSourceBlocksForChat`, `loadIgfCommitSnapshot`, `extractIgfComposition`, `formatIgfCompositionBlock`, `isIgfCompositionQuestion`, `buildIgfForecastPayload` (handler/server). **No** `recalcularUtilYResultado`. **No** `ORDER_DELTAS`. |
| **Capacidades de lectura posibles** | CONSULTAR/COMPARAR/RESUMIR/EXPLICAR KPIs bajo demanda. CONSULTAR composición observada de un snapshot IGF (1 fila; read-only; sin causalidad; sin tendencia). |
| **Capacidades de escritura posibles** | PATCH IGF existe en dashboard; no en Director IA. Slice read-only; sin writes. |
| **Permisos aplicables** | Authz IGF vigente del annex: JWT/contexto; GA → 403 («GA no tiene acceso a KPIs financieros.»); GV vía `assertGVPlantaNombreAccess`; planta del scope; cross-planta bloqueado; fail-closed. `acceso_igf_forecast_kpis` en UI. |
| **Nivel de riesgo** | MEDIO (lectura); ALTO si se lee composición como causa, problema, responsable o tendencia. |
| **Dependencias** | ARR (proyección en el mismo annex), folios KPI, plantas. Distinto de M6 (folios GASTOS/INVERSIONES) y de M9 (deltas de periodos reales). |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M7-IGF-COMPOSITION-001` (integrado, merge `05eb54c4`). Tests: focales 13/13; capabilities 52/52; planner 46/46; orchestrator 26/26; suite `test/director-ia-*.test.js` 657/657; `git diff --check` limpio. Runtime: read-only, in-process, sin HTTP interno, sin writes. Chat no se tocó en ese slice: el annex ya entra al prompt. **Sync transversal** `IMPL-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-001` (merge `f7f90270`): el intent `financial_diagnosis` carga el bloque IGF vía `loadIgfArrSourceBlocksForChat` junto a ARR y M9; `igf_status` sigue el annex. **Sync transversal** `IMPL-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-001` (merge `7faa3ead`): el intent `plant_diagnosis` carga el bloque IGF junto a AR/DICF/bitácora/ARR/CS; **sin M9**; GA `SOURCE_RESTRICTED` no aborta el pack. **Sync transversal** `IMPL-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001`: el contrafactual IGF vive en `igf_reviewable_supports` (overlay live **en memoria**; no DB write; etiqueta ESCENARIO HIPOTÉTICO). `igf_status` **sigue sin overlay** y **no** se hereda en el hop. Eso **no** completa M7. M7 **sigue PARCIAL**. **No** COMPLETE. Scoring M0–M20 **sin cambio**: 10.5/20 = **52.5%** (0.0 pp; no se suma módulo). Diferencia GET context vs chat sigue siendo hallazgo (Parte 8). |

### M8 — ARR / Forecast provincia

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M8 |
| **Módulo** | ARR |
| **Propósito empresarial** | Carga y forecast de ventas/descuentos por cliente y provincia. |
| **Cobertura actual de Director IA** | PARCIAL (anexo chat + motor DICF/commercial_state que lee ARR) |
| **Información exacta que sí consulta** | `loadArrProyForPlant`, top clientes (`loadTopClientesDescBrief`), `dashboard-arr-forecast` helpers; `dicf.computeDicf` lee datos ARR (solo intent `commercial_state` de listas). En `financial_diagnosis`: bloque ARR separado vía `loadIgfArrSourceBlocksForChat` (`venta_ton` / `desc_kg`; periodo real; no se copia venta IGF). En `plant_diagnosis`: el mismo bloque ARR (sin M9; no se copia venta IGF). |
| **Información que no consulta** | UI `/arr`, `POST /api/arr/load`, Excel dashboard ARR completo, refresh provincia como herramienta IA. |
| **Archivos actuales relacionados** | `lib/director-ia-igf-arr.js`, `lib/arr-load.js`, `lib/dashboard-arr-forecast.js`, `lib/dicf.js`; `lib/director-ia-financial-diagnosis.js` y `lib/director-ia-plant-diagnosis.js` (ensamblajes transversales; no cambian cobertura M8); `lib/commercial-trend-engine.js` / `lib/director-ia-commercial-trend.js` (tendencia de gráfica; no cambian cobertura M8); `lib/director-ia-client-profile.js` (perfil 3M calendario; no cambia cobertura M8) |
| **Endpoints actuales relacionados** | `/api/arr/*` (no invocados por chat HTTP); chat usa libs directamente. |
| **Tablas o vistas relacionadas** | `arr.ventas_diarias_cliente`, `arr.descuentos_*`, `arr.forecast_mensual`, `arr.hg_diario`, etc. |
| **Funciones existentes reutilizables** | `loadIgfArrAnnexForChat`, `loadIgfArrSourceBlocksForChat`, `loadCommercialStateForChat` → `dicf.computeDicf`, `dashboardArrForecast.*` |
| **Capacidades de lectura posibles** | CONSULTAR/COMPARAR/RESUMIR proyección y listas comerciales. |
| **Capacidades de escritura posibles** | Carga ARR (`POST /api/arr/load`) — ALTO; no en Director IA. |
| **Permisos aplicables** | Auth dashboard; GA bloqueado en commercial_state. |
| **Nivel de riesgo** | MEDIO (lectura); ALTO (carga). |
| **Dependencias** | Upload ARR, feriados, provincia_plants. |
| **Observaciones verificadas** | `sources.arr = false` fijo en context GET. **Sync transversal** `IMPL-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-001` (merge `f7f90270`): ARR entra como bloque propio en `financial_diagnosis`; `arr_status` se preserva. **Sync transversal** `IMPL-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-001` (merge `7faa3ead`): ARR entra como bloque propio en `plant_diagnosis` (sin M9). **Sync transversal** `IMPL-DIRECTOR-IA-DAILY-DEVIATION-001`: `daily_sales_deviation` lee `arr.ventas_diarias_cliente` a granularidad de **un día** (ayer CDMX); **no** es anexo ARR mensual ni M8 COMPLETE. **Sync transversal** `IMPL-DIRECTOR-IA-DAILY-DISCOUNT-KG-001`: `daily_discount_deviation` une `arr.descuentos_diarios_cliente` + `arr.ventas_diarias_cliente` al grano diario; **no** es M8 COMPLETE. **Sync transversal** `IMPL-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001`: `daily_executive_brief` reutiliza ambos packs diarios; **no** es M8 COMPLETE. **Sync transversal** `IMPL-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001`: `commercial_trend` lee `arr.ventas_diarias_cliente` vía motor compartido (`lib/commercial-trend-engine.js`; también `GET /api/arr/venta-serie`); 30/90 trailing; **no** es anexo ARR mensual ni M8 COMPLETE. **Sync transversal** `IMPL-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001`: `client_profile` lee las mismas tablas ARR al grano **mes calendario** (`SUM(kg)` / `SUM(monto)/SUM(kg)`); **no** es 90d trailing; **no** es M8 COMPLETE. M8 **sigue PARCIAL**. Scoring M0–M20 **sin cambio**: 10.5/20 = **52.5%**. |

### M9 — Delta Venta / Descuento / Ingreso

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M9 |
| **Módulo** | Deltas UI |
| **Propósito empresarial** | Comparar periodos de venta, descuento e ingreso en modales dashboard. |
| **Cobertura actual de Director IA** | COMPLETA (respecto a la consulta canónica read-only de las tres familias de periodos reales: Delta Venta, Delta Descuento y Delta Ingreso; no implica forecast con escritura, M19, causalidad ni weekly LD). |
| **Información exacta que sí consulta** | Comparación in-process de dos YYYY-MM por planta del scope: Delta Venta (kg, `arr.ventas_diarias_cliente`) vía `delta_sales` → `get_delta_sales` → `loadDeltaVentaForChat`; Delta Descuento ($/kg, descuentos + kg) vía `delta_discount` → `get_delta_discount` → `loadDeltaDescuentoForChat`; Delta Ingreso (MXN, `kg × (margen_$/kg − \|desc_$/kg\|)`) vía `delta_income` → `get_delta_income` → `loadDeltaIngresoForChat`. Periodos A≠B; default = los dos YYYY-MM más recientes con datos; no se inventan. Los mismos loaders se reutilizan en `financial_diagnosis` como bloque M9 (`period_a` / `period_b`); ese intent **no** hace early-return de un solo delta. |
| **Información que no consulta** | Forecast de ingreso con `DELETE`/`INSERT` (`lib/delta-ingreso-forecast.js`); M19 `/api/ai/delta-ingreso/test/*`; weekly LD (M10); IGF/ARR snapshot o KPIs M3 como sustituto; causalidad de una diferencia; desviación **diaria** de un día calendario (`daily_sales_deviation` / `daily_discount_deviation` / `daily_executive_brief` son otros intents; no degradan M9); tendencia 30/90 de gráfica (`commercial_trend` es otro intent; no degrada M9); perfil 3M calendario (`client_profile` es otro intent; no degrada M9; ingreso mensual actual de cliente **no** usa la fórmula M9). |
| **Archivos actuales relacionados** | `lib/director-ia-m9-deltas.js`; `lib/director-ia-financial-diagnosis.js` (reutiliza loaders M9; no cambia COMPLETE); wiring en `lib/director-ia-chat.js`, `lib/director-ia-tools.js`, `lib/director-ia-capabilities.js`, `lib/director-ia-planner.js`; `server.js` reutiliza helpers extraídos (contrato HTTP `delta-*` intacto). UI `Delta*Modal.tsx` y `lib/delta-ingreso-forecast.js` siguen fuera de este COMPLETE. |
| **Endpoints actuales relacionados** | Lectura integrada in-process (no HTTP interno): semántica de `POST /api/dashboard/delta-venta-datos`, `delta-descuento-datos`, `delta-ingreso-datos` y periodos asociados. Escritura existente y no integrada: `POST /api/dashboard/delta-ingreso-forecast-datos`. M19 no es Director IA. |
| **Tablas o vistas relacionadas** | `arr.ventas_diarias_cliente`, `arr.descuentos_diarios_cliente`, `arr.provincia_plants`, `public.plantas`; margen IGF (`igf.versions` + `igf.compromiso_lines`) solo como insumo de la fórmula de ingreso, no como anexo. `arr.delta_ingreso_forecast_cliente` queda fuera (forecast mutante). |
| **Funciones existentes reutilizables** | `loadDeltaVentaForChat`, `loadDeltaDescuentoForChat`, `loadDeltaIngresoForChat`, `getPeriodosDeltaVenta`, `getPeriodosDeltaDescuento`, `getDeltaVentaClientes`, `getDeltaDescuentoClientes`, `getDeltaIngresoDatosInternal`, `assertM9DeltasAccess`, `resolvePeriodPair`, `percentChangeOrUnknown`. |
| **Capacidades de lectura posibles** | COMPARAR/CONSULTAR las tres familias de periodos reales, read-only, on-demand. |
| **Capacidades de escritura posibles** | Forecast ingreso (`DELETE`/`INSERT` de cache) — **no** en Director IA. M19 envío test — **no** en Director IA. |
| **Permisos aplicables** | JWT + `planta_id`; GA 403; GV 403; `plantas_permitidas` (GG/AD); fail-closed cross-planta. Equivalente o más restrictivo que dashboard. |
| **Nivel de riesgo** | MEDIO (lectura financiera). Escritura forecast/M19: ALTO y fuera de este módulo. |
| **Dependencias** | ARR diario (venta/descuento); IGF solo como insumo de margen en la fórmula de ingreso. |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M9-DELTAS-001` (integrado en main, `7b3e5a98`). Tests focales 23/23; suite `test/director-ia-*.test.js` 459/459; scripts capabilities 25/25, planner 30/30, orchestrator 24/24. COMPLETE = consulta autorizada de las tres familias de periodos reales; no forecast mutante; no M19; no causalidad. **Sync transversal** `IMPL-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-001` (merge `f7f90270`): M9 entra junto a IGF/ARR en `financial_diagnosis`; intents `delta_sales` / `delta_discount` / `delta_income` se preservan in-process. **Sync transversal** `IMPL-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-001` (merge `7faa3ead`): `plant_diagnosis` **no** incluye M9. **Sync transversal** `IMPL-DIRECTOR-IA-DAILY-DEVIATION-001`: «¿Por qué bajó la venta ayer?» **no** degrada a `delta_sales` / M9 mensual; M9 **sigue COMPLETA**. **Sync transversal** `IMPL-DIRECTOR-IA-DAILY-DISCOUNT-KG-001`: «¿Por qué subió el descuento/kg ayer?» **no** degrada a `delta_discount` / M9 mensual. **Sync transversal** `IMPL-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001`: el overview diario **no** degrada a M9. **Sync transversal** `IMPL-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001`: `client_profile` **no** degrada a `delta_*` / M9; el ingreso mensual actual de cliente es `UNSUPPORTED_METRIC` (la fórmula DICF **no** es actual). M9 **UNCHANGED** (no se documenta corrección de su fórmula mensual). Scoring M0–M20 **sin cambio**: 10.5/20 = **52.5%**. |

### M10 — Weekly discount LD

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M10 |
| **Módulo** | Weekly discount LD |
| **Propósito empresarial** | Narrativa semanal de descuento + envío WhatsApp programado. |
| **Cobertura actual de Director IA** | NO INTEGRADA |
| **Información exacta que sí consulta** | Ninguna. |
| **Información que no consulta** | `POST /api/dashboard/weekly-discount-lectura`, scheduler LD. |
| **Archivos actuales relacionados** | `lib/weekly-discount-narrative.js`, `weekly-discount-ld-config.js`, `weekly-discount-ld-scheduler.js` |
| **Endpoints actuales relacionados** | `/api/dashboard/weekly-discount-lectura` |
| **Tablas o vistas relacionadas** | Lectura ARR. |
| **Funciones existentes reutilizables** | Narrativa weekly-discount-* |
| **Capacidades de lectura posibles** | RESUMIR/EXPLICAR — no cableado. |
| **Capacidades de escritura posibles** | ENVIAR WhatsApp (scheduler) — no vía Director IA. |
| **Permisos aplicables** | Auth dashboard en endpoint. |
| **Nivel de riesgo** | MEDIO (lectura); ALTO (enviar). |
| **Dependencias** | ARR, Twilio. |
| **Observaciones verificadas** | Auditoría §M10 §7: No lo usa. |

### M11 — DICF + acciones + comentarios cliente

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M11 |
| **Módulo** | DICF + Acciones DICF + Comentarios cliente |
| **Propósito empresarial** | Oportunidades/proyección por cliente; compromisos DICF; comentarios. |
| **Cobertura actual de Director IA** | PARCIAL (context/listas + slice on-demand de expediente comercial factual). **No** es COMPLETE: attachments, Excel/UI DICF, bitácora dentro del expediente, causalidad y writes permanecen fuera. |
| **Información exacta que sí consulta** | Context: `summarizeDicfContext` (máx. 40 detalles); chat enfocado DICF (`buildFocusedDicfContext`); comentarios always-on `loadClienteComentariosForDirectorIa` (80). Listas commercial_state on-demand vía `loadCommercialStateForChat` → `dicf.computeDicf` (path distinto del expediente y de `plant_diagnosis`). En intent `plant_diagnosis` el bloque DICF es recorte de `arr.dicf_acciones` (máx. 8; sin historial) y el bloque `commercial_state` es SELECT-only `arr.dicf_cliente_mes` a nivel planta (**no** `loadCommercialStateForChat`; **no** `computeDicf`; **no** write/cache; GA → `SOURCE_RESTRICTED` sin abortar el pack). El mismo pack deriva materialidad comercial (`kg_mes_real` observado; kg homogéneos; `null` ≠ `0`; periodo y denominador explícitos; top-N=5 determinístico) y cobertura DICF por `cliente_key` con el patrón canónico M11/`buildClienteKey` (**no** join por nombre; **no** `injectAccionesAbiertas`). Slice on-demand de **expediente comercial factual**: `expediente_comercial` → `get_commercial_dossier` → `loadCommercialDossierForChat` → autorizar planta (`assertCommercialDossierAccess`) → resolver **cliente único** → SELECT `arr.dicf_cliente_mes` (último year/month del `plant_code`; **no** `loadCommercialStateForChat`; **no** `computeDicf`; **no** write/cache) → comentarios solo con `cliente_key` coincidente (`IS NOT NULL` / no vacío) → acciones `arr.dicf_acciones` por `planta_id` + `cliente_key` → historial `arr.dicf_accion_historial` y `resultado_cierre` **por action id** → recorte 1 cliente / 8 comentarios / 500 caracteres / 8 acciones / 8 eventos; truncation explícito → evidencia con procedencia separada (`commercial_state`, `comments`, `dicf_actions`, `action_history`, `close_result`). Identidad runtime: `planta_id` + `cliente_key`. `cliente_key` de estado comercial **no está persistido**; se deriva con `buildClienteKey` + grupos de `injectAccionesAbiertas`. Ambigüedad → clarificación; no selección silenciosa. Comentario con `cliente_key` null **no se une**; **no** join por nombre. |
| **Información que no consulta** | Bitácora/Plaud dentro del expediente. Attachments DICF binarios. UI completa dicf-accion. Excel DICF. Universo de clientes sin límite. Causalidad / motivo / solución / efectividad / responsable del desempeño. Comentarios sin `cliente_key`. Listas «dejaron/aumentaron» (siguen el intent `commercial_state`). |
| **Archivos actuales relacionados** | `lib/director-ia-m11-commercial-dossier.js`; `lib/dicf.js`; `lib/dicf-acciones.js`; `lib/cliente-comentarios.js`; `lib/director-ia-action-register.js`; `lib/director-ia-commercial-state.js`; `lib/director-ia-plant-diagnosis.js` (pack transversal; no cambia cobertura M11); wiring en `lib/director-ia-chat.js`, `lib/director-ia-planner.js`, `lib/director-ia-tools.js`, `lib/director-ia-capabilities.js` |
| **Endpoints actuales relacionados** | Chat: `POST /api/director-ia/chat` (in-process). `GET /api/director-ia/context` (DICF/comentarios always-on; expediente no entra al GET). Dashboard `/api/dashboard/dicf-*`, `/api/dicf-*` (**no** transporte interno del slice). |
| **Tablas o vistas relacionadas** | Expediente: `arr.dicf_cliente_mes`, `arr.cliente_comentarios`, `arr.dicf_acciones`, `arr.dicf_accion_historial`. Resolución: `public.plantas`, `arr.comercial_entidad` / alias (no son clave de join). Context: `arr.dicf_config`. `arr.dicf_acciones_attachments` **fuera**. |
| **Funciones existentes reutilizables** | `loadCommercialDossierForChat` (SELECT-only; authz antes de datos). `buildClienteKey` / `getCanonicalPlantaId` / `getPlantaIdsEquivalentes`. `summarizeDicfContext`, `dicf.computeDicf` (solo listas commercial_state, no expediente), `loadCommercialStateForChat`, `buildFocusedDicfContext`, `buildComentariosAnnexText`. |
| **Capacidades de lectura posibles** | CONSULTAR/BUSCAR/RESUMIR/COMPARAR/EXPLICAR/DETECTAR RIESGOS (acciones abiertas). CONSULTAR expediente factual de un cliente (on-demand, recortado, sin causalidad). |
| **Capacidades de escritura posibles** | CRUD DICF acciones en dashboard API — no vía chat Director IA. Comentario cliente: `createClienteComentario` existe en lib; no expuesto como tool de chat. |
| **Permisos aplicables** | JWT/contexto; rol; `planta_id`; `plantas_permitidas`; cross-planta 403; fail-closed. GA 403 (regla commercial_state: KPIs financieros). ZP/AD globales. Authz **antes** de consultar el expediente. `acceso_acciones_dicf` / `dashboardBlockDicfAccionesRole` siguen en el dominio DICF de dashboard. |
| **Nivel de riesgo** | MEDIO (lectura); ALTO (mutar acciones/attachments — fuera). |
| **Dependencias** | ARR (listas commercial_state / compute); plantas. Distinto de bitácora/Plaud, M2 y Action Register. |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-001` (integrado en main, merge `a5fdea23` / `e3529599`). Tests: focales 19/19; capabilities 50/50; planner 46/46; orchestrator 26/26; suite `test/director-ia-*.test.js` 644/644; `git diff --check` limpio. Routing `commercial_state` / `dicf_focused` / `client_analysis` / Action Register / listas **preservado**. **Sync transversal** `IMPL-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-001` (merge `7faa3ead`): DICF y CS SELECT-only entran como bloques del pack `plant_diagnosis`; el intent `commercial_state` de listas **sigue** `computeDicf`. **Sync transversal** `IMPL-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-001` (merge `0bfe5474`): el pack añade `commercial_materiality_and_coverage` (`kg_mes_real` observado; concentración top-5; cobertura por `cliente_key`; sin join por nombre). **Sync transversal** `IMPL-DIRECTOR-IA-DAILY-DEVIATION-001`: el pack diario une DICF + comments **solo** por `cliente_key` (comentario ≠ causa; acción ≠ causa). **Sync transversal** `IMPL-DIRECTOR-IA-DAILY-DISCOUNT-KG-001`: el pack diario de descuento/kg une comments + DICF **solo** por `cliente_key` canónico. **Sync transversal** `IMPL-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001`: `client_profile` une comments + DICF **solo** por `cliente_key` (comentario ≠ causa; acción ≠ resultado); **no** es expediente de 1 mes latest; **no** completa M11. M11 **sigue PARCIAL**. **No** COMPLETE. Scoring M0–M20 vigente **sin cambio**: 10.5/20 = **52.5%**. `sources.dicf` true solo si hay filas; `sources.commercial_state` nunca true en GET. |

### M12 — Action Register

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M12 |
| **Módulo** | Action Register |
| **Propósito empresarial** | Tablero de temas, ítems, revisiones, notas y evidencias por planta. |
| **Cobertura actual de Director IA** | PARCIAL (tablero/resumen con límites + slice on-demand de notas de revisión). **No** es COMPLETE: evidencias/binarios y CRUD de ítems permanecen fuera. |
| **Información exacta que sí consulta** | Board vía `buildActionRegisterBoardPayload` → summarizers: summary, responsables (10), temas, top_overdue (10), invalid_overdue, tema_details (5 temas × 10 acciones), executive_summary; Mejora Continua (`buildMejoraContinuaPayload`). En intent `plant_diagnosis` el board entra con `includeNotes: false`, top 5 vencidas y 5 responsables (recorte del pack; no notas). Slice on-demand de **notas de revisión**: `revision_notes` → `get_action_register_revision_notes` → `loadActionRegisterRevisionNotesForChat` → resolver revisión → SELECT `arr.action_register_revision_notes` ⋈ `arr.action_register_revisions` (`revision_id` only) → recorte (1 revisión; máx. 8 notas; 500 caracteres; truncation explícito) → evidencia separada. Campos: `body` (texto almacenado), `author_name` (vacío se preserva; no se inventa autor), `created_at`, `revision_id`, `revision_date`. Última revisión = `ORDER BY revision_date DESC, id DESC`. Sin revisión identificada ni «última»/«más reciente»: clarifica. Consultas naturales de **acción/responsable** (intent existente `action_status`; estrategia C; no es módulo nuevo): resolución física en el board de la planta; 0/1/N; status/fecha/vencimiento; historial/`resultado_cierre` solo si el ítem los trae. |
| **Información que no consulta** | Context always-on sigue con `includeNotes: false` (las notas no entran al board/summarizers de ítems). Attachments/binarios/S3/PDF. Export Excel/PDF evidencias. CRUD de ítems. No atribuye nota a action item (no hay `item_id`). No trata el texto como acuerdo formal, transición de estatus, history M2, comentario de folio ni Plaud. No scoring de desempeño de personas. No culpa / causa del vencimiento / responsable del problema. No inventa motivo de no-cierre. |
| **Archivos actuales relacionados** | `lib/director-ia-m12-revision-notes.js`; `lib/action-register-board.js`; `lib/director-ia-action-register.js`; `lib/director-ia-action-person.js` (routing/resolución 0/1/N; no cambia cobertura M12); `lib/director-ia-mejora-continua.js`; `lib/director-ia-plant-diagnosis.js` (pack transversal; no cambia cobertura M12); wiring en `lib/director-ia-chat.js`, `lib/director-ia-planner.js`, `lib/director-ia-tools.js`, `lib/director-ia-capabilities.js` |
| **Endpoints actuales relacionados** | Chat: `POST /api/director-ia/chat` (in-process). `GET /api/director-ia/context` y `GET /api/director-ia/mejora-continua` (board sin notas). CRUD `/api/action-register/*` (UI Acciones; **no** transporte interno del slice). |
| **Tablas o vistas relacionadas** | Lectura de notas: `arr.action_register_revision_notes`, `arr.action_register_revisions`. Board: `arr.action_register_*`. `arr.action_register_revision_note_attachments` **fuera**. |
| **Funciones existentes reutilizables** | `loadActionRegisterRevisionNotesForChat` (SELECT-only; authz `assertActionRegisterAccess` = gate AR vigente, no M2). `resolveActionPersonFocus` / `loadActionPersonBoardForChat` (board existente; 0/1/N; no silent pick). `summarizeTopOverdueActions`, `buildExecutiveSummary`, `buildMejoraContinuaPayload`, `buildFocusedNarrativeContext`. |
| **Capacidades de lectura posibles** | CONSULTAR/BUSCAR/RESUMIR/EXPLICAR/DETECTAR RIESGOS/RECOMENDAR (narrativo). CONSULTAR notas de una revisión (on-demand, recortadas). CONSULTAR Action Register por responsable/acción registrado (`action_status`; 0/1/N; no culpa). |
| **Capacidades de escritura posibles** | CRUD Action Register en `/api/action-register/*` — no expuesto como tool de chat. |
| **Permisos aplicables** | JWT/contexto; rol; `planta_id`; `plantas_permitidas`; gate AR (`ZP`/`AD`/`CF_CDMX` globales; resto por lista); cross-planta 403; fail-closed. GA/GV según reglas vigentes de AR (no `assertFolioStatusAccess`). |
| **Nivel de riesgo** | MEDIO (lectura); ALTO (mutar ítems/evidencias — fuera). |
| **Dependencias** | Plantas, usuarios responsables, DICF inyectado en board. Distinto de M2 history, comentarios de folio y bitácora/Plaud. |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M12-NOTAS-REVISION-001` (integrado, merge `776df919`). Tests: focales 26/26; capabilities 48/48; planner 42/42; orchestrator 25/25; suite `test/director-ia-*.test.js` 625/625; `git diff --check` limpio. `includeNotes` del context **sigue false**. **Sync transversal** `IMPL-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-001` (merge `7faa3ead`): AR entra como bloque del pack `plant_diagnosis` (`includeNotes: false`; top 5). **Sync transversal** `IMPL-DIRECTOR-IA-ACTION-PERSON-ROUTING-001`: consultas naturales acción/responsable rutean al intent existente `action_status` (estrategia C; `lib/director-ia-action-person.js`; 0/1/N; inheritable; AR > resume genérico de memoria; responsable registrado ≠ culpable). Fallo histórico `action_id=0` vs `null`: **CORREGIDO**. Tests citados (IMPL; no reejecutados aquí): focal 19/19; planner 57/57; capabilities 56/56; orchestrator 27/27; suite `test/director-ia-*.test.js` **814/814**. **Sync transversal** `IMPL-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001`: `arr.action_register_items` **no** tiene `cliente_key`; el perfil **no** inventa join; acciones de cliente = DICF keyed. M12 **sigue PARCIAL**. **No** COMPLETE. Scoring M0–M20 vigente **sin cambio**: 10.5/20 = **52.5%**. |

### M13 — Director IA (módulo propio)

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M13 |
| **Módulo** | Director IA |
| **Propósito empresarial** | Bitácora, entidades comerciales, mejora continua y chat ejecutivo. |
| **Cobertura actual de Director IA** | COMPLETA (respecto a su propio módulo) |
| **Información exacta que sí consulta** | Bitácora (chat hasta 30; UI list hasta 100), entidades/alias, mejora continua, contexto AR/DICF/comentarios, anexos on-demand. En `plant_diagnosis` la bitácora entra como bloque del pack (5 sesiones; sin contenido crudo; ventana 3 meses). Continuidad conversacional **efímera** del chat (`structured_conversation_state` por request; no es fuente de negocio; `active_date` efímero en hilos diarios; exactamente un `previous_frame` para retorno intra-sesión). First slice persistente `pending_work_items_only` (trabajo pendiente; no es evidencia; no navega temas). Pack diario `daily_sales_deviation` (venta de ayer; no es fuente mensual). Pack diario `daily_discount_deviation` (descuento/kg de ayer; `SUM(monto)/SUM(kg)`; no es M9 mensual). Cross-metric diario: misma `active_date`, pack destino fresco (venta ↔ descuento/kg; también desde brief). Brief ejecutivo diario `daily_executive_brief` (venta + descuento/kg; panorama abierto; provenance/gaps separados; partial-data). Tendencia comercial de gráfica `commercial_trend` (motor compartido con `GET /api/arr/venta-serie`; 30/90 trailing; CASA/COMISIONISTA; OLS + top-6; comments fuera). Perfil longitudinal de cliente `client_profile` (3 meses calendario CDMX; actual PARTIAL; kg `SUM` y descuento/kg `SUM(monto)/SUM(kg)`; comments/DICF por `cliente_key`; ingreso actual `UNSUPPORTED_METRIC`; AR sin join). Consultas Action Register por responsable/acción (`action_status` inheritable; 0/1/N; no culpa). Hop IGF → apoyos reviewable (`igf_reviewable_supports` inheritable; Folios fresco; contrafactual en memoria; no writes). |
| **Información que no consulta** | History/transcript como hecho de DB. Authz cacheada. Payloads de evidencia guardados. El `history` del request no es evidencia. |
| **Archivos actuales relacionados** | `lib/director-ia.js`, `director-ia-context.js`, `director-ia-chat.js`, `director-ia-conversation-state.js`, `director-ia-persistent-memory.js`, `director-ia-daily-deviation.js`, `director-ia-daily-discount.js`, `director-ia-daily-executive-brief.js`, `commercial-trend-engine.js`, `director-ia-commercial-trend.js`, `director-ia-client-profile.js`, `director-ia-action-person.js`, `director-ia-igf-reviewable-supports.js`, `director-ia-bitacora.js`, `comercial-entidad.js`, `sql/017_director_ia_pending_work_items.sql`, `frontend-dashboard/modules/director-ia/*` |
| **Endpoints actuales relacionados** | `/api/director-ia/context`, `/mejora-continua`, `/bitacora*`, `/comercial-entidades*`, `/comercial-entidad-alias*`, `/chat` |
| **Tablas o vistas relacionadas** | `arr.director_ia_bitacora`, `arr.comercial_entidad`, `arr.comercial_entidad_alias`, `arr.director_ia_pending_work_items` (DDL en repo; **habilitada en un entorno solo si SQL 017 fue aplicado allí**) |
| **Funciones existentes reutilizables** | `askDirectorIa`, `buildDirectorIaContextPayload`, CRUD bitácora/entidades |
| **Capacidades de lectura posibles** | CONSULTAR/BUSCAR/RESUMIR/EXPLICAR/COMPARAR/DETECTAR RIESGOS/RECOMENDAR |
| **Capacidades de escritura posibles** | CREAR/EDITAR/CANCELAR (soft delete) bitácora y entidades vía API UI — no como acciones del chat LLM. |
| **Permisos aplicables** | `ENABLE_DIRECTOR_IA`; JWT; acceso planta. |
| **Nivel de riesgo** | MEDIO (chat + bitácora); mutaciones entidades MEDIO. |
| **Dependencias** | Action Register, DICF, ARR/IGF on-demand, OpenAI. |
| **Observaciones verificadas** | Flag FE `is-enabled.ts` vs BE `isDirectorIaEnabled()` pueden diverger. **Sync transversal** `IMPL-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-001` (merge `7faa3ead`): bitácora entra en el pack `plant_diagnosis`. **Sync transversal** `IMPL-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-001`: `structured_conversation_state` efímero. **Sync transversal** `IMPL-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-001`: `pending_work_items_only` (MEMORY ≠ EVIDENCE; requery+authz al retomar; no EKS/IES/N5). **Sync transversal** `IMPL-DIRECTOR-IA-DAILY-DEVIATION-001`: rama `daily_sales_deviation` en el chat legado (pack diario; HILO; una llamada OpenAI; `active_date` efímero; no memoria de fecha). **Sync transversal** `IMPL-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-001`: estrategia B (unknown + estado válido → inherit; standalone gana; sin phrasebook nuevo; hold-outs en tests; no fallback ciego a AR). **Sync transversal** `IMPL-DIRECTOR-IA-ACTION-PERSON-ROUTING-001`: `action_status` inheritable; AR específico gana sobre resume genérico; «¿Qué pasó con Arturo?» puede seguir memoria. **Sync transversal** `IMPL-DIRECTOR-IA-DAILY-DISCOUNT-KG-001`: rama `daily_discount_deviation` (pack diario ponderado; HILO; una llamada OpenAI; `active_date` efímero; contribución ≠ causa; M9 unchanged). **Sync transversal** `IMPL-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001`: first slice B (standalone precedence + un `previous_frame` efímero; no stack; restore ≠ fact; requery; `volvamos` ≠ resume). **Sync transversal** `IMPL-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001`: estrategia B post-planner (conservar fecha ≠ conservar métrica; venta ↔ descuento/kg; misma `active_date`; requery pack destino; gap fresco; sin phrasebook; `previous_frame` no decide; memoria persistente no participa). **Sync transversal** `IMPL-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001`: hop IGF → Folios reviewable (`igf_reviewable_supports`; first slice C; reglas reales de cancelación; contrafactual en memoria; ESCENARIO HIPOTÉTICO; no writes; no cheques; no ahorro). **Sync transversal** `IMPL-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001`: `daily_executive_brief` (first slice B; venta + descuento/kg; panorama abierto; provenance/gaps separados; partial-data; GPT sintetiza; no phrasebook; no causalidad). **Sync transversal** `IMPL-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001`: `commercial_trend` (arquitectura B; first slice B; motor compartido `lib/commercial-trend-engine.js`; dashboard + chat; 30/90; `MAX(fecha)`; CASA/COMISIONISTA; OLS; top-6; comments fuera; mover ≠ causa). **Sync transversal** `IMPL-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001`: `client_profile` (source B; routing B; `cliente_key` obligatorio; 3 meses calendario ≠ 90d trailing; actual PARTIAL; kg `SUM`; descuento `SUM(monto)/SUM(kg)`; ingreso actual `UNSUPPORTED_METRIC`; comments/DICF keyed; AR sin join; handoff trend→perfil + requery). Tests citados (IMPL; no reejecutados aquí): focal client_profile 14/14; suite `test/director-ia-*.test.js` **947/947**. M13 **sigue COMPLETA**. Scoring M0–M20 vigente **sin cambio**: 10.5/20 = **52.5%**. |

### M14 — Usuarios admin

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M14 |
| **Módulo** | Usuarios admin |
| **Propósito empresarial** | Administrar usuarios, roles, permisos y plantas. |
| **Cobertura actual de Director IA** | NO INTEGRADA (lectura incidental de `public.usuarios` para roles de responsables AR) |
| **Información exacta que sí consulta** | Roles de responsables AR (`loadUsuarioRolesByIds`). |
| **Información que no consulta** | Unlock, listado admin, Excel usuarios, permisos_json como dominio. |
| **Archivos actuales relacionados** | `lib/usuario-permisos.js`, `UsuariosAdminModal.tsx` |
| **Endpoints actuales relacionados** | `/api/usuarios-admin*` |
| **Tablas o vistas relacionadas** | `public.usuarios`, `public.roles` |
| **Funciones existentes reutilizables** | Handlers usuarios-admin; `authHasPermiso` |
| **Capacidades de lectura posibles** | CONSULTAR usuarios — no cableado a chat. |
| **Capacidades de escritura posibles** | EDITAR permisos — ALTO; no en Director IA. |
| **Permisos aplicables** | Clave `USUARIOS_ADMIN_CLAVE` / unlock. |
| **Nivel de riesgo** | ALTO |
| **Dependencias** | Auth de todo el sistema. |
| **Observaciones verificadas** | Auditoría §M14 §7. |

### M15 — Documentos PDF / medios de folio

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M15 |
| **Módulo** | Documentos / media folio |
| **Propósito empresarial** | Cotización, facturas, gastos, póliza, paquete completo, adjuntos. |
| **Cobertura actual de Director IA** | NO INTEGRADA |
| **Información exacta que sí consulta** | Ninguna de M15 (no lista media, no genera PDF, no accede S3). La metadata DB de `public.folio_archivos` es un slice **M2** distinto; no integra este módulo. |
| **Información que no consulta** | `/api/folios/:id/documento*`, `/media`, póliza, S3, signed URLs, contenido, OCR, documentos faltantes. |
| **Archivos actuales relacionados** | Handlers en `server.js`; `ImprimirGastosModal.tsx` |
| **Endpoints actuales relacionados** | Documentales y media bajo `/api/folios/:id/...` |
| **Tablas o vistas relacionadas** | `public.folio_archivos`, campos en `public.folios` |
| **Funciones existentes reutilizables** | Endpoints documento/media existentes. |
| **Capacidades de lectura posibles** | CONSULTAR existencia / DESCARGAR DOCUMENTO — requeriría herramienta nueva. |
| **Capacidades de escritura posibles** | Subir póliza/media — ALTO. |
| **Permisos aplicables** | `acceso_ver_imprimir_folios`, `acceso_subir_poliza` |
| **Nivel de riesgo** | MEDIO (lectura docs); ALTO (subir). |
| **Dependencias** | Folios, S3. |
| **Observaciones verificadas** | Auditoría §M15 §7. M2 documenta metadata-only de `folio_archivos` (`IMPL-DIRECTOR-IA-M2-DOCUMENTS-METADATA-001`); M15 (contenido/S3/PDF) **sigue NO INTEGRADA**. |

### M16 — Análisis duplicados de folios

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M16 |
| **Módulo** | Análisis duplicados |
| **Propósito empresarial** | Detectar parejas de folios similares y opcionalmente cancelar. |
| **Cobertura actual de Director IA** | COMPLETA (respecto a la capacidad canónica de análisis/consulta; no implica confirmación determinística de cada par ni cancelación). |
| **Información exacta que sí consulta** | Pares candidatos a posible duplicidad en `public.folios` (planta + equivalentes, no CANCELADO, ventana de `creado_en`, `LIMIT 1500`) vía `loadFoliosParaDuplicados` + `findDuplicatePairs` (mismo importe redondeado a 2 decimales + similitud de concepto ≥ 0.72). Intent `duplicate_folios` → tool `get_duplicate_folios` → executor `loadDuplicateFoliosForChat`. Evidencia estructurada (`semantic_class: possible_duplicate_heuristic`, IDs, importe, concepto, score, umbral, `scanned`, `truncated`). Happy / empty / error fail-safe. Sin OpenAI en este camino. |
| **Información que no consulta** | `POST /api/folios/duplicados/check` (`findSimilarTo`, alarma al crear). No cancela, no edita, no fusiona, no confirma duplicidad humana. No usa duplicados Excel Taller (M5). No afirma fraude. |
| **Archivos actuales relacionados** | `lib/folio-duplicados.js`, `lib/folio-duplicados-load.js`, `lib/director-ia-duplicados.js`, `lib/director-ia-chat.js`, `lib/director-ia-tools.js`, `lib/director-ia-capabilities.js`, `test/director-ia-duplicados.test.js` |
| **Endpoints actuales relacionados** | Superficie Director IA: `POST /api/director-ia/chat`. Dashboard (no HTTP interno desde el tool): `GET /api/folios/duplicados/analisis`. Escritura ajena a esta capacidad: `POST /api/folios/:id/cancelar`. |
| **Tablas o vistas relacionadas** | `public.folios` |
| **Funciones existentes reutilizables** | `findDuplicatePairs` (reutilizado, umbral 0.72 sin recalibrar), `loadFoliosParaDuplicados`, `loadDuplicateFoliosForChat`, `buildDuplicateFoliosChatResult`. `findSimilarTo` sigue en el check de creación, no en el chat. |
| **Capacidades de lectura posibles** | DETECTAR RIESGOS/CONSULTAR — integrada (posibles duplicados / candidatos heurísticos). |
| **Capacidades de escritura posibles** | CANCELAR folio desde UI análisis — ALTO; **no integrada** en Director IA (clase C). |
| **Permisos aplicables** | Auth dashboard + bloqueo GV folios + `assertPlantaPermitidaDashboard` (GG/GA/AD con `plantas_permitidas`). |
| **Nivel de riesgo** | MEDIO (lectura heurística); ALTO (cancelar, fuera de esta capacidad). |
| **Dependencias** | Folios. |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M16-DUPLICADOS-001` (integrado en main). Tests focales 17/17; suite `test/director-ia-*.test.js` 416/416; scripts capabilities 20/20, planner 28/28, orchestrator 19/19. Independiente de duplicados Excel Taller. COMPLETE = integración de la consulta canónica, no certeza de cada par. Scoring M0–M20 del loop (COMPLETE=1.0, PARCIAL=0.5, NOT_STARTED=0.0): 6.5/20 = 32.5% → **7.5/20 = 37.5%**. |

### M17 — WhatsApp → Dashboard

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M17 |
| **Módulo** | WhatsApp bridge |
| **Propósito empresarial** | Comandos de negocio y URLs firmadas al dashboard. |
| **Cobertura actual de Director IA** | PARCIAL (genera link a `/director-ia`; no consulta Twilio como fuente de datos) |
| **Información exacta que sí consulta** | N/A como fuente; comando `DirectorIA` genera JWT + URL. |
| **Información que no consulta** | Historial de mensajes WhatsApp, outbox Delta Ingreso AI, carrito como dominio de respuesta. |
| **Archivos actuales relacionados** | `server.js` (comando DirectorIA ~línea 16684+), `createDashboardToken` |
| **Endpoints actuales relacionados** | `POST /twilio/whatsapp` |
| **Tablas o vistas relacionadas** | `public.usuarios`, `public.notificaciones_log` |
| **Funciones existentes reutilizables** | `createDashboardToken`, `buildActionRegisterUrl`, encode URL WhatsApp |
| **Capacidades de lectura posibles** | N/A (es canal de entrada). |
| **Capacidades de escritura posibles** | ENVIAR mensajes (bot) — fuera del chat Director IA. |
| **Permisos aplicables** | Nivel 6 solo AR/DirectorIA; `acceso_consola_whatsapp_ar` catalogado. |
| **Nivel de riesgo** | MEDIO (tokens en URL); ALTO (acciones bot sobre folios). |
| **Dependencias** | Twilio, DASHBOARD_URL. |
| **Observaciones verificadas** | Tokens en query string (hallazgo crítico). |

### M18 — Presupuestos semanales

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M18 |
| **Módulo** | Presupuestos semanales |
| **Propósito empresarial** | Solicitudes/asignación semanal de presupuesto (carro). |
| **Cobertura actual de Director IA** | PARCIAL (query JSON read-only del carro semanal por planta). **No** es COMPLETE: el propósito canónico incluye operación del carro, envío a cheques y canal WhatsApp, que permanecen fuera. |
| **Información exacta que sí consulta** | Carro de `public.presupuestos_semanales` + `public.presupuesto_folios` por `planta_id` y semana. Asignado = `monto_asignado`. Seleccionado = `SUM(presupuesto_folios.importe)`. Disponible = `max(0, asignado - seleccionado)`. Folios: `folio_id`, `numero_folio`, `importe`, `prioridad`; urgente solo si `prioridad` coincide `/urgente/i`. `estatus` del carro si existe. Lookup **sin** filtrar solo `ABIERTO` (un carro enviado/cerrado sigue consultable). Semana: fechas explícitas `YYYY-MM-DD` / `DD/MM/AAAA`; `getCurrentWeekMexico()` solo con «esta semana», «semana actual», «mi presupuesto» o pregunta #17 (`presupuesto semanal`); si no hay fecha ni trigger, clarifica (no inventa semana). 0 filas = `DATA_NOT_FOUND` (no INSERT). Seleccionado ≠ pagado; presupuesto ≠ cheque; asignado ≠ aprobado. |
| **Información que no consulta** | `presupuesto_asignacion_detalle` (asignación mensual; otro dominio). Asignar/reemplazar monto. Seleccionar/quitar folios. `enviarPresupuestoACheques`. Crear cheque. Twilio/WhatsApp/notificaciones. Solicitudes PRE-YYYYMM, archivos S3, catálogo, línea detalle. No afirma pagado, cheque emitido, desviación ni causa. |
| **Archivos actuales relacionados** | `lib/director-ia-m18-presupuesto-semanal.js`; wiring en `lib/director-ia-chat.js`, `lib/director-ia-tools.js`, `lib/director-ia-capabilities.js`, `lib/director-ia-planner.js`. DDL/writes/bot en `server.js` **no** usados como transporte. |
| **Endpoints actuales relacionados** | Chat: `POST /api/director-ia/chat` (in-process). Sin grupo REST `/api/presupuesto*` como transporte interno. WhatsApp carrito **no** se usa. |
| **Tablas o vistas relacionadas** | Lectura: `public.presupuestos_semanales`, `public.presupuesto_folios`. El resto de `presupuesto_*` (asignación mensual, solicitudes, archivos) **sigue fuera**. |
| **Funciones existentes reutilizables** | `loadPresupuestoSemanalForChat` → SELECT (equivalente a `getPresupuestoResumen`) + `assertFolioStatusAccess`. **No** `linkFoliosToPresupuesto`. **No** `enviarPresupuestoACheques`. **No** `sendWhatsApp`. |
| **Capacidades de lectura posibles** | CONSULTAR/RESUMIR carro semanal. |
| **Capacidades de escritura posibles** | Modificar presupuesto / enviar a cheques — ALTO; **no** en Director IA. |
| **Permisos aplicables** | JWT/contexto; rol; `planta_id` obligatorio; `plantas_permitidas`; `assertFolioStatusAccess`; GV 403; GA solo en planta autorizada; cross-planta 403; fail-closed. |
| **Nivel de riesgo** | MEDIO (lectura); ALTO (writes/cheques — fuera). |
| **Dependencias** | Folios. WhatsApp/Twilio **no** son dependencia de este slice. Distinto de M4, M6, M7 e IGF. |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-001` (integrado en main, `719b3eaa`). Tests: focales 24/24; capabilities 46/46; planner 40/40; orchestrator 24/24; suite `test/director-ia-*.test.js` 599/599; `git diff --check` limpio. Cheques/Twilio/WhatsApp/writes **siguen fuera**. Scoring M0–M20 del loop (COMPLETE=1.0, PARCIAL/INDIRECTA=0.5, NO INTEGRADA=0.0): 9.5/20 = 47.5% → **10.0/20 = 50.0%**. |

### M19 — Delta Ingreso AI (test)

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M19 |
| **Módulo** | Delta Ingreso AI (test HTTP) |
| **Propósito empresarial** | Otro subsistema de IA para preguntas/resúmenes de delta ingreso vía WhatsApp. |
| **Cobertura actual de Director IA** | NO INTEGRADA (sistema paralelo) |
| **Información exacta que sí consulta** | Ninguna de Director IA sobre este stack. |
| **Información que no consulta** | Outbox/inbox/actions de delta ingreso AI. |
| **Archivos actuales relacionados** | `lib/delta-ingreso-ai.js`, `delta-ingreso-ai-db.js`, `delta-ingreso-commands.js` |
| **Endpoints actuales relacionados** | `/api/ai/delta-ingreso/test/*` (sin `dashboardAuthMiddleware` según inventario) |
| **Tablas o vistas relacionadas** | `public.delta_ingreso_ai_*` |
| **Funciones existentes reutilizables** | Stack delta-ingreso-ai (paralelo, no Director IA). |
| **Capacidades de lectura posibles** | N/A para Director IA. |
| **Capacidades de escritura posibles** | ENVIAR mensajes test — ALTO / fuera de alcance. |
| **Permisos aplicables** | No hay middleware dashboard en rutas test inventariadas. |
| **Nivel de riesgo** | ALTO (endpoints abiertos + envío). |
| **Dependencias** | OpenAI, WhatsApp, ARR. |
| **Observaciones verificadas** | Dos sistemas de IA en el mismo proceso Node. |

### M20 — Home KPI / Inicio

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M20 |
| **Módulo** | Home KPI |
| **Propósito empresarial** | Vista financiera de inicio (IGF mini, DICF, comentarios). |
| **Cobertura actual de Director IA** | INDIRECTA |
| **Información exacta que sí consulta** | No renderiza ni llama la página `/`; comparte fuentes subyacentes (DICF, comentarios, IGF/ARR on-demand) cuando el chat las activa. |
| **Información que no consulta** | Composición exacta de `app/page.tsx` ni `igf-forecast-mini` como endpoint dedicado del context. |
| **Archivos actuales relacionados** | `frontend-dashboard/app/page.tsx` |
| **Endpoints actuales relacionados** | Reutiliza M7/M11. |
| **Tablas o vistas relacionadas** | Igual que IGF/DICF/ARR. |
| **Funciones existentes reutilizables** | Mismas que M7/M11. |
| **Capacidades de lectura posibles** | Las de fuentes compartidas, no las de la página Home. |
| **Capacidades de escritura posibles** | Ninguna propia. |
| **Permisos aplicables** | Bloqueo GA en página según auditoría. |
| **Nivel de riesgo** | MEDIO |
| **Dependencias** | M7, M11, M8. |
| **Observaciones verificadas** | Anexo C auditoría: «No (datos compartidos indirectos)». |

---

## Parte 3 — Catálogo de fuentes

### Fuente: Action Register

- **Dominio:** Acciones / temas / responsables / vencidas (M12); notas de revisión on-demand; consultas por responsable/acción (`action_status`)
- **Cobertura actual:** PARCIAL
- **Archivo de acceso:** `lib/director-ia-context.js`, `lib/director-ia-action-register.js`, `lib/action-register-board.js`, `lib/director-ia-m12-revision-notes.js`, `lib/director-ia-action-person.js`
- **Función de acceso:** `buildActionRegisterBoardPayload` → summarizers de ítems. Notas: `loadActionRegisterRevisionNotesForChat` (loader dedicado; no voltea `includeNotes`). Por responsable/acción: `loadActionPersonBoardForChat` / `resolveActionPersonFocus` (0/1/N; board de la planta; authz AR)
- **Endpoint relacionado:** `GET /api/director-ia/context` (board **sin** notas); chat `POST /api/director-ia/chat` (intents `revision_notes` / `action_status` / `overdue_actions` / `responsible_lookup`); board UI `/api/action-register/*` no es transporte interno
- **Tablas consultadas:** Board: `arr.action_register_revisions`, `items`, `entries`, `attachments`. Notas on-demand: `arr.action_register_revision_notes` ⋈ `revisions` por `revision_id`. Context always-on: `includeNotes: false`
- **Filtros disponibles:** `planta_id`; notas: `revision_id` / `revision_date` / última (`revision_date DESC`); persona: nombre propio estructural resuelto **físicamente** en el board (no lista hardcoded)
- **Alcance por planta:** Sí (obligatorio)
- **Alcance por periodo:** Ítems: implícito vía fechas/overdue. Notas: una revisión (fecha o última)
- **Límites de filas:** responsables 10; top_overdue 10; findings 5; tema_details 5×10; narrativa chat máx. 10 acciones. Notas: 1 revisión; 8 notas; 500 caracteres; truncation explícito. Por persona: 0 / 1 / N sin silent pick
- **Permisos:** JWT + acceso planta; gate AR vigente (`assertActionRegisterAccess`); no authz M2
- **Información sensible:** Responsables, títulos de acción, estatus; texto/autor de notas de revisión
- **Estado de actualización:** Context en cada GET; notas solo si el intent `revision_notes` se activa; pack de persona en cada turno `action_status` (requery)
- **Posibles errores:** `planta_id requerido`, `Sin acceso a esta planta`, revisión no identificada (clarifica), revisión inexistente, persona ambigua (clarifica), 0 acciones asociadas (informa ausencia)
- **Evidencia de integración actual:** `sources.action_register = true` tras carga OK del board; slice notas = `context_meta.mode = revision_notes`; bloque AR en `plant_diagnosis` (`assemblePlantDiagnosisEvidence.sources.action_register`; `includeNotes: false`); rama persona = `context_meta.mode = action_status` (`handleActionStatusPersonChat`)
- **Información que no puede concluirse con esta fuente:** Estado de kanban/folios, IGF completo, attachments binarios, atribución nota→ítem, acuerdo formal, Plaud, history M2, comentario de folio, culpa del responsable registrado, causa del vencimiento, motivo de no-cierre si no está registrado, scoring de personas

### Fuente: DICF

- **Dominio:** Acciones e historial DICF por cliente (M11)
- **Cobertura actual:** PARCIAL
- **Archivo de acceso:** `lib/director-ia-action-register.js` (`summarizeDicfContext`), `lib/director-ia-chat.js` (contextos enfocados), `lib/director-ia-m11-commercial-dossier.js` (expediente)
- **Función de acceso:** `summarizeDicfContext`; filtros chat `filterDicfDetailsByQuestion`, `buildFocusedDicfContext`; expediente: `loadCommercialDossierForChat` (acciones/historial por `cliente_key` / `accion_id`)
- **Endpoint relacionado:** `GET /api/director-ia/context`; `POST /api/director-ia/chat` (intent `expediente_comercial`); dashboard `/api/dashboard/dicf-*` (no transporte interno del expediente)
- **Tablas consultadas:** `arr.dicf_acciones`; historial context según summarizer; expediente: `arr.dicf_accion_historial` por `accion_id`
- **Filtros disponibles:** planta; chat: tokens comerciales / nombre cliente; ventana 3 meses en chat mensual; expediente: `planta_id` + `cliente_key` (acciones) / `accion_id` (historial)
- **Alcance por planta:** Sí (+ equivalentes canónicos en expediente y commercial_state)
- **Alcance por periodo:** Ventana `BITACORA_CHAT_MONTH_WINDOW = 3` en modos mensuales de chat; expediente no usa esa ventana
- **Límites de filas:** `DEFAULT_DICF_DETAILS_LIMIT = 40` (context). Expediente: 8 acciones; 8 eventos de historial por acción
- **Permisos:** JWT; bloqueos DICF role; GA sin KPIs financieros; expediente: `assertCommercialDossierAccess` antes de datos
- **Información sensible:** Clientes, compromisos, resultados de cierre
- **Estado de actualización:** Por request
- **Posibles errores:** Sin filas → `sources.dicf` false aunque AR cargue; expediente ambiguo/missing → clarificación
- **Evidencia de integración actual:** `sources.dicf` si `dicf_details.length > 0`; expediente = `context_meta.mode = expediente_comercial`; bloque DICF en `plant_diagnosis` (`assemblePlantDiagnosisEvidence.sources.dicf`; máx. 8; sin historial); cobertura de materialidad comercial en el mismo pack por `cliente_key` (no por nombre)
- **Información que no puede concluirse con esta fuente:** Listas «dejaron/aumentaron» completas sin commercial_state; attachments; causalidad; acción cerrada = exitosa; `resultado_cierre` = impacto; responsable de acción = responsable del desempeño

### Fuente: Expediente comercial

- **Dominio:** Expediente factual por un cliente (M11)
- **Cobertura actual:** PARCIAL (on-demand; no COMPLETE del módulo)
- **Archivo de acceso:** `lib/director-ia-m11-commercial-dossier.js`
- **Función de acceso:** `loadCommercialDossierForChat` → `get_commercial_dossier`
- **Endpoint relacionado:** `POST /api/director-ia/chat` (intent `expediente_comercial`; in-process). No HTTP interno.
- **Tablas consultadas:** `arr.dicf_cliente_mes` (SELECT-only, último year/month); `arr.cliente_comentarios`; `arr.dicf_acciones`; `arr.dicf_accion_historial`. Resolución: `public.plantas`, `arr.comercial_entidad` / alias
- **Filtros disponibles:** `planta_id` autorizado; cliente único (`planta_id` + `cliente_key`). `cliente_key` de estado **derivado** con `buildClienteKey` (no persistido en `dicf_cliente_mes`)
- **Alcance por planta:** Sí; authz **antes** de datos; cross-planta 403; GA 403; ZP/AD globales; resto `plantas_permitidas`; fail-closed
- **Alcance por periodo:** Periodo materializado más reciente del `plant_code` en `arr.dicf_cliente_mes`
- **Límites de filas:** 1 cliente; 8 comentarios / 500 caracteres; 8 acciones; 8 eventos de historial; truncation explícito
- **Permisos:** `assertCommercialDossierAccess` (intersección DICF / commercial_state vigente)
- **Información sensible:** Estado comercial, comentarios, acciones, responsables de acción, `resultado_cierre`
- **Estado de actualización:** Por request; no escribe caché; no llama `computeDicf` ni `loadCommercialStateForChat`
- **Posibles errores:** `planta_id` obligatorio; 403 GA / planta no autorizada; `ambiguous_client` / `missing_client` (clarifica; no selecciona en silencio)
- **Evidencia de integración actual:** `context_meta.mode = expediente_comercial`; bloques `commercial_state` / `comments` / `dicf_actions` / historial / `resultado_cierre` separados
- **Información que no puede concluirse con esta fuente:** Causa del estado; motivo/diagnóstico del comentario; acción = solución; cerrada = exitosa; `resultado_cierre` = impacto causal; responsable de acción = dueño del desempeño; cronología = causalidad; correlación = causalidad; 0 comentarios = nadie comentó jamás; 0 acciones DICF = no hay seguimiento fuera de DICF; sin estado = inactivo; sin `resultado_cierre` = fracaso; bitácora/Plaud; listas comerciales

### Fuente: Bitácora IA

- **Dominio:** Notas de campo / visitas (M13)
- **Cobertura actual:** PARCIAL
- **Archivo de acceso:** `lib/director-ia-bitacora.js`, uso en context/chat
- **Función de acceso:** `loadBitacoraForChat`, `createBitacoraEntry`, `extractBitacoraExcerptForSearch`
- **Endpoint relacionado:** `/api/director-ia/bitacora*`
- **Tablas consultadas:** `arr.director_ia_bitacora`
- **Filtros disponibles:** planta; búsqueda por tokens/cliente en chat; ventana 3 meses
- **Alcance por planta:** Sí
- **Alcance por periodo:** Últimos 3 meses en formatos mensuales de chat
- **Límites de filas:** `CHAT_CONTEXT_LIMIT = 30` (chat); list UI hasta 100
- **Permisos:** JWT + planta; flag `ENABLE_DIRECTOR_IA`
- **Información sensible:** Contenido de visitas / nombres
- **Estado de actualización:** CRUD soft-delete; chat lee snapshot
- **Posibles errores:** Tabla no asegurada; planta sin acceso
- **Evidencia de integración actual:** `sources.bitacora_ia` si hay sesiones; bloque bitácora en `plant_diagnosis` (`assemblePlantDiagnosisEvidence.sources.bitacora`; 5 sesiones; sin contenido crudo)
- **Información que no puede concluirse con esta fuente:** KPIs financieros; estado de folio

### Fuente: Comentarios de cliente

- **Dominio:** Comentarios comerciales de cliente (M11)
- **Cobertura actual:** PARCIAL
- **Archivo de acceso:** `lib/cliente-comentarios.js`; expediente: `lib/director-ia-m11-commercial-dossier.js`
- **Función de acceso:** `loadClienteComentariosForDirectorIa`, `buildComentariosAnnexText`; expediente: comentarios solo si `cliente_key` válido y coincidente
- **Endpoint relacionado:** Context/chat; dashboard cliente-comentarios; expediente in-process en chat
- **Tablas consultadas:** `arr.cliente_comentarios`
- **Filtros disponibles:** Context: `planta_id`. Expediente: `planta_id` + `cliente_key IS NOT NULL AND TRIM(cliente_key) <> '' AND cliente_key = ANY(keys)`
- **Alcance por planta:** Sí
- **Alcance por periodo:** Orden por fecha desc; sin selector de meses en loader IA
- **Límites de filas:** Context: 80. Expediente: 8 comentarios; 500 caracteres; truncation explícito (`truncated` + `original_length`)
- **Permisos:** JWT + planta; expediente usa `assertCommercialDossierAccess`
- **Información sensible:** Comentarios comerciales
- **Estado de actualización:** Por request
- **Posibles errores:** Fallos de query logueados; comentario sin `cliente_key` **no se une** (tampoco por nombre)
- **Evidencia de integración actual:** `sources.cliente_comentarios`; expediente incluye bloque `comments` separado
- **Información que no puede concluirse con esta fuente:** Historial DICF completo; ARR toneladas; comentario = motivo/diagnóstico; 0 comentarios enlazables = nadie comentó jamás

### Fuente: Comentarios de folio

- **Dominio:** Comentarios operativos de folio (M2 parcial)
- **Cobertura actual:** PARCIAL
- **Archivo de acceso:** `lib/cliente-comentarios.js`
- **Función de acceso:** `loadFolioComentariosForDirectorIa`
- **Endpoint relacionado:** Context/chat; folios comentarios en dashboard
- **Tablas consultadas:** `public.comentarios` ⋈ `public.folios`
- **Filtros disponibles:** `planta_id`
- **Alcance por planta:** Sí
- **Alcance por periodo:** Últimos N por fecha
- **Límites de filas:** 80
- **Permisos:** JWT + planta
- **Información sensible:** Texto de comentarios, referencia a folio
- **Estado de actualización:** Por request
- **Evidencia de integración actual:** `sources.folio_comentarios`
- **Información que no puede concluirse con esta fuente:** Etapa kanban, timeline completo, documentos adjuntos, estatus técnico del folio

### Fuente: Entidades comerciales

- **Dominio:** Alias / identidad de cliente (M13)
- **Cobertura actual:** PARCIAL (CRUD vía API; resolución en chat)
- **Archivo de acceso:** `lib/comercial-entidad.js`
- **Función de acceso:** `resolveCommercialEntitiesForQuestion`, `findCommercialAliases`, CRUD handlers
- **Endpoint relacionado:** `/api/director-ia/comercial-entidades*`, `/comercial-entidad-alias*`
- **Tablas consultadas:** `arr.comercial_entidad`, `arr.comercial_entidad_alias`
- **Filtros disponibles:** planta; búsqueda de alias
- **Alcance por planta:** Sí
- **Alcance por periodo:** N/A (catálogo)
- **Límites de filas:** Según list/search del lib
- **Permisos:** JWT + planta
- **Información sensible:** Nombres comerciales / alias
- **Estado de actualización:** CRUD soft-delete
- **Evidencia de integración actual:** Bloque de entidades en prompt de chat cuando hay match
- **Información que no puede concluirse con esta fuente:** Toneladas/ingreso sin cruzar ARR/DICF

### Fuente: ARR

- **Dominio:** Ventas/descuentos forecast (M8)
- **Cobertura actual:** PARCIAL (chat on-demand; no en GET `sources`)
- **Archivo de acceso:** `lib/director-ia-igf-arr.js`, `lib/dashboard-arr-forecast.js`, `lib/dicf.js`
- **Función de acceso:** `loadIgfArrAnnexForChat`, `loadIgfArrSourceBlocksForChat`, `loadArrProyForPlant`, `loadTopClientesDescBrief`; indirecto `dicf.computeDicf`
- **Endpoint relacionado:** `POST /api/director-ia/chat` (no marca `sources.arr` en GET)
- **Tablas consultadas:** tablas `arr.*` de ventas/descuentos/forecast según helpers
- **Filtros disponibles:** planta → plant code; año/mes parseado de pregunta o mes CDMX actual
- **Alcance por planta:** Sí
- **Alcance por periodo:** Mes resuelto desde pregunta / fallback
- **Límites de filas:** top clientes brief default 8
- **Permisos:** Auth; GA bloqueado en caminos financieros
- **Información sensible:** Venta, descuento, clientes
- **Estado de actualización:** Datos ARR cargados externamente (`arr-load`)
- **Evidencia de integración actual:** `shouldAttachIgfArrAnnex` + sources de prompt `igf.forecast` / `arr.forecast` en modos focused; bloque ARR separado en `financial_diagnosis` (`assembleFinancialDiagnosisEvidence.sources.arr`); bloque ARR en `plant_diagnosis` (`assemblePlantDiagnosisEvidence.sources.arr`; sin M9)
- **Información que no puede concluirse con esta fuente:** UI ARR completa; carga; Excel dashboard

### Fuente: IGF

- **Dominio:** Compromiso / forecast financiero (M7)
- **Cobertura actual:** PARCIAL (chat on-demand + composición observada de 1 fila; `sources.igf` siempre false en GET)
- **Archivo de acceso:** `lib/director-ia-igf-arr.js`
- **Función de acceso:** `loadIgfCommitSnapshot`, `extractIgfComposition`, `formatIgfCompositionBlock`, `loadIgfArrAnnexForChat`, `loadIgfArrSourceBlocksForChat`, `getMargenKgPorPeriodo` (inyectado desde server)
- **Endpoint relacionado:** `POST /api/director-ia/chat` (in-process; tool `get_igf_snapshot`)
- **Tablas consultadas:** `igf.versions` (1 versión GLOBAL del mes), `igf.compromiso_lines` (fuente de líneas; 1 fila planta + versión + mes vía `findIgfRowForPlant`)
- **Filtros disponibles:** planta, year/month
- **Alcance por planta:** Sí (una fila; no combina plantas)
- **Alcance por periodo:** Mes de pregunta / actual (snapshot; no tendencia)
- **Límites de filas:** Versión más reciente (`ORDER BY version_number DESC LIMIT 1`); composición = allowlist de esa fila; máx. 18 líneas `*_kg` (`IGF_COMPOSITION_MAX_USD_KG`)
- **Unidades:** `*_kg` = **$/kg**, no kilogramos. Familias distintas: `ton` ≠ `$/kg` ≠ `%` ≠ `MXN`. No mezclar ni sumar unidades incompatibles. Ranking de magnitud solo intra `$/kg` de roles `add`/`subtract`.
- **Null:** `null` ≠ `0`. Null/`""`/no finito se omite (`omitted_null_keys`); no se emite como cero.
- **Signos:** Signo físico almacenado; `hg_kg` no se invierte.
- **Fórmula:** En `igf_status` / composición: `recalcularUtilYResultado` es referencia semántica de `formula_role`; **no** se ejecuta. `gasto_kg` no participa. Sin overlay de folios. El overlay live **en memoria** vive solo en `igf_reviewable_supports` (fuente transversal aparte); no persiste ni completa M7.
- **ORDER_DELTAS:** Presentación UI; no se importa; no es fórmula.
- **Permisos:** Authz IGF vigente: GA 403; GV planta; cross-planta bloqueado; fail-closed. `acceso_igf_forecast_kpis` en UI.
- **Información sensible:** Compromiso, margen, utilidad, resultado, HG
- **Estado de actualización:** Según versiones IGF cargadas (snapshot ≠ tendencia)
- **Evidencia de integración actual:** `shouldAttachIgfArrAnnex` / `isIgfCompositionQuestion` / `extractIgfComposition`; regex IGF/margen/rentabilidad; bloque IGF separado en `financial_diagnosis` (`assembleFinancialDiagnosisEvidence.sources.igf`); bloque IGF en `plant_diagnosis` (`assemblePlantDiagnosisEvidence.sources.igf`; sin M9). Semántica: composición ≠ causalidad; magnitud ≠ importancia operacional; línea ≠ responsable; signo ≠ juicio empresarial. M9 conserva deltas temporales.
- **Información que no puede concluirse con esta fuente:** Meta HG completa UI, folios detalle IGF, PATCH, causalidad, tendencia, overlay persistente del GET dashboard, recálculo escrito. El contrafactual read-only es **otra** fuente (`igf_reviewable_supports`); no es ahorro realizado ni cambio real del IGF.

### Fuente: Margen o estado comercial

- **Dominio:** Listas dejaron/disminuyeron/aumentaron/nuevos + margen $/kg (M8/M11/M7)
- **Cobertura actual:** PARCIAL (solo chat on-demand; `sources.commercial_state` siempre false en GET)
- **Archivo de acceso:** `lib/director-ia-commercial-state.js`, margen en `director-ia-igf-arr.js`; pack de planta: `lib/director-ia-plant-diagnosis.js`
- **Función de acceso:** Intent `commercial_state` (listas): `loadCommercialStateForChat` → `dicf.computeDicf` + `injectAccionesAbiertas`. Intent `plant_diagnosis`: SELECT-only `arr.dicf_cliente_mes` (conteos + top acotado + `commercial_materiality_and_coverage`; **no** `loadCommercialStateForChat`; **no** `computeDicf`; **no** cache writes). Margen: `getMargenKgPorPeriodo`
- **Endpoint relacionado:** Equivalente lógico a motor de `POST /api/dashboard/dicf-datos` (sin HTTP desde chat) **solo** en el intent de listas. El pack de planta no ejecuta ese motor.
- **Tablas consultadas:** Listas: ARR + `arr.dicf_acciones` (conteos abiertos). Pack `plant_diagnosis`: `arr.dicf_cliente_mes` (materializado; `kg_mes_real` del mes de la fila) + `arr.dicf_acciones` por `cliente_key` (cobertura; no join por nombre)
- **Filtros disponibles:** planta; categoría por regex de pregunta (listas); límite clientes `COMMERCIAL_STATE_CLIENT_LIMIT = 20` (listas); pack: conteos + top acotado (dejaron 5 / otras 3)
- **Alcance por planta:** Sí (`planta_id` común; no cross-planta)
- **Alcance por periodo:** Listas: periodo del compute DICF (mes de negocio del motor). Pack: year/month materializado en caché
- **Límites de filas:** 20 clientes por categoría en formateo chat (listas)
- **Permisos:** Listas: GA → 403; assert GV planta. Pack: GA → `SOURCE_RESTRICTED` (no aborta el pack)
- **Información sensible:** Clientes e ingreso/ton
- **Estado de actualización:** Listas: cálculo on-demand. Pack: lectura de caché materializada (sin writes)
- **Evidencia de integración actual:** `isCommercialStateListQuestion` / prompt mode `commercial_state`; bloque CS en `plant_diagnosis` (`assemblePlantDiagnosisEvidence.sources.commercial_state`; SELECT-only; `payload.commercial_materiality`: `kg_mes_real`, top-N=5, denominador/periodo explícitos, cobertura `cliente_key`)
- **Información que no puede concluirse con esta fuente:** Endpoints Delta UI; weekly LD; expediente de un cliente (es otro intent: `expediente_comercial`, SELECT `arr.dicf_cliente_mes`, sin `computeDicf`); que el pack de planta recálcule DICF (no lo hace); que `kg_mes_forecast − kg_mes_real` sea venta perdida (no lo es); concentración = causa; join por nombre; responsable de acción DICF = responsable de la caída; acción vencida = negligencia; acción cerrada = éxito; 0 acciones = nadie trabaja el caso

### Fuente: Folios

- **Dominio:** Entidad operativa folio (M2)
- **Cobertura actual:** PARCIAL (estatus/etapa read-only; comentarios en fuente aparte)
- **Archivo de acceso:** `lib/director-ia-m2-folio-status.js`
- **Función de acceso:** `loadFolioStatusForChat` → `getFolioById` / `getFolioByNumero` / `getManyFoliosStatus` / `listFoliosByPlanta`
- **Endpoint relacionado:** semántica SELECT-only in-process. **No** usa `GET /api/folios/:id` ni `GET /api/dashboard/kanban`
- **Tablas consultadas:** `public.folios` ⋈ `public.plantas` (`f.estatus` observado)
- **Filtros disponibles:** id, `numero_folio`, planta/equivalentes, etapa visual (`etapaVisualToEstatusTecnicos`)
- **Alcance por planta / periodo:** `planta_id` + equivalentes; listado con `ventana: "0"` (sin recorte de 2 meses de KPIs)
- **Límites de filas:** listado truncado (límite 40)
- **Permisos:** JWT/contexto; rol; `plantas_permitidas`; GV 403; GA solo planta autorizada; cross-planta 403; not found 404
- **Información sensible:** Importes, estatus, identidad de folio
- **Estado de actualización:** Por request (`retrieved_at`)
- **Evidencia de integración actual:** Intent `folio_status` + tool `get_folio_status` + rama en `askDirectorIa`. El listado reviewable de apoyos IGF es **otra** fuente (`igf_reviewable_supports`); no sustituye `folio_status`.
- **Información que no puede concluirse con esta fuente:** Historial (fuente aparte), contenido PDF/S3, documentos faltantes, cheque, póliza, presupuesto, tablero HTTP kanban, mutaciones, que «no depositado» sea recortable

### Fuente: Historial de folios

- **Dominio:** Timeline / `folio_historial` (M2)
- **Cobertura actual:** PARCIAL (eventos crudos read-only; **no** es GET `/timeline` ni timeline HTTP deduplicado)
- **Archivo de acceso:** `lib/director-ia-m2-history.js`
- **Función de acceso:** `loadFolioHistoryForChat` → resolver/autorizar folio (`getFolioById` / `getFolioByNumero` + authz de `folio_status`) → `listHistorialForFolio` (SELECT-only)
- **Endpoint relacionado:** semántica SELECT-only in-process. **No** usa `GET /api/folios/:id/timeline`, `GET /api/folios/:id` ni `GET /api/dashboard/kanban`
- **Tablas consultadas:** `public.folio_historial` (después de resolver el folio en `public.folios`)
- **Filtros disponibles:** un folio por id o por `numero_folio`
- **Alcance por planta / periodo:** `planta_id` + equivalentes; historial solo del folio autorizado
- **Límites de filas:** 80 + `truncated`
- **Permisos:** JWT/contexto; rol; `plantas_permitidas`; GV 403; GA solo planta autorizada; cross-planta 403; not found 404; fail-closed. Orden: resolver folio → autorizar → **luego** SELECT historial
- **Información sensible:** `actor_telefono`, `actor_rol`, comentario, estatus observado del evento
- **Estado de actualización:** Por request (`retrieved_at`)
- **Evidencia de integración actual:** Intent `folio_history` + tool `get_folio_history` + rama en `askDirectorIa`
- **Campos observados del evento:** `estatus`, `comentario`, `actor_telefono`, `actor_rol`, `creado_en`. `id` físico como `event_id` si existe
- **Campos derivados:** `etapa` solo si `estatus` existe y mapea (`estatusToEtapaVisual`). Si `estatus` es null/vacío/no mapeable → sin etapa derivada; el evento no se oculta
- **Campos que no existen en el evento:** `estatus_anterior`, `estatus_nuevo`, `event_type`. `folios.estatus_anterior` no es el estatus anterior de cada evento
- **Nulls:** se preservan. Actor null **no** significa sistema. Estatus null no convierte el evento en transición
- **Orden / preservación:** `creado_en ASC` (desempate `id`). Eventos no deduplicados. Misma etapa repetida se preserva. **No** `dedupeHistorialByStage`
- **Información que no puede concluirse con esta fuente:** Contenido PDF/S3, documentos faltantes, cheque, póliza, presupuesto, `kanban_flow`, transiciones inventadas, causa, retraso, responsabilidad, actor sistema, tablero HTTP

### Fuente: Kanban

- **Dominio:** Tablero por etapa visual (M2)
- **Cobertura actual:** PARCIAL (listado/filtro por etapa derivada; **no** es el GET kanban)
- **Archivo de acceso:** `lib/director-ia-m2-folio-status.js` (no `server.js` handler kanban)
- **Función de acceso:** `listFoliosByPlanta` + `estatusToEtapaVisual` / `etapaVisualToEstatusTecnicos`. **No** llama `maybeAdvanceFolioToComprobaciones`
- **Endpoint relacionado:** **excluido** `GET /api/dashboard/kanban` (puede autoavanzar con UPDATE + historial)
- **Tablas consultadas:** `public.folios` (+ `public.plantas`)
- **Evidencia de integración actual:** mismo path `folio_status` / `get_folio_status` / `loadFolioStatusForChat`
- **Información que no puede concluirse con esta fuente:** Tablero HTTP completo, autoavance, historial, contenido PDF/S3, documentos faltantes, cheque/póliza

### Fuente: Metadata documental de folio

- **Dominio:** Registros de `folio_archivos` (M2; **no** es M15)
- **Cobertura actual:** PARCIAL (metadata DB read-only; **no** es contenido, PDF ni S3)
- **Archivo de acceso:** `lib/director-ia-m2-documents-metadata.js`
- **Función de acceso:** `loadFolioDocumentsMetadataForChat` → resolver/autorizar folio (`getFolioById` / `getFolioByNumero` + authz de `folio_status`) → `listDocumentsMetadataForFolio` (SELECT-only) → `projectDocument` (allowlist)
- **Endpoint relacionado:** semántica SELECT-only in-process. **No** usa `GET /api/folios/:id/media`, `/media/:id/url`, `/cotizacion`, `documento-*`, `GET /api/folios/:id` ni `GET /api/dashboard/kanban`
- **Tablas consultadas:** `public.folio_archivos` (después de resolver el folio en `public.folios`)
- **Filtros disponibles:** un folio por id o por `numero_folio`
- **Alcance por planta / periodo:** `planta_id` + equivalentes; metadata solo del folio autorizado
- **Límites de filas:** 50 + `truncated`
- **Permisos:** JWT/contexto; rol; `plantas_permitidas`; GV 403; GA solo planta autorizada; cross-planta 403; not found 404; fail-closed. Orden: resolver folio → autorizar → **luego** SELECT metadata
- **Información sensible:** `file_name` (nombre observado, no contenido). **Nunca** `s3_key`, URL, signed URL, bucket, raw path, `sha256`, bytes, contenido
- **Estado de actualización:** Por request (`retrieved_at`)
- **Evidencia de integración actual:** Intent `folio_documents` + tool `get_folio_documents` + rama en `askDirectorIa` (después de `detectUnsupported`)
- **Campos seguros:** `document_id`, `tipo`, `status`, `file_name`, `subido_en` + identidad mínima del folio (`folio_id`, `numero_folio`, `planta_id`, `planta_nombre`)
- **Campos que nunca se exponen:** `s3_key`, `url`, signed URL, `bucket`, raw path, `sha256`, bytes, contenido
- **Semántica:** «Estos son los registros documentales que existen para este folio.»
- **Cero filas:** «no hay registros documentales encontrados». **No** «faltan documentos». No implica set esperado, documentación completa/incompleta ni cumplimiento
- **Guardrail:** preguntas de faltantes / PDF / contenido / descarga / OCR / «debería tener» siguen `SOURCE_NOT_INTEGRATED`
- **Información que no puede concluirse con esta fuente:** Contenido PDF, S3, signed URLs, descarga, OCR, documentos faltantes, cumplimiento documental, póliza operativa, cheque, `kanban_flow`, writes

### Fuente: Documentos y medios

- **Dominio:** PDF/media (M15)
- **Cobertura actual:** NO INTEGRADA
- **Archivo de acceso:** Handlers documento/media en `server.js`
- **Función de acceso:** Endpoints documento/media (no IA)
- **Endpoint relacionado:** `/api/folios/:id/documento*`, `/media*`
- **Tablas consultadas:** `public.folio_archivos` (contenido/S3; **no** es el SELECT de metadata M2)
- **Evidencia de integración actual:** No integrada
- **Información que no puede concluirse con esta fuente:** Documentos faltantes, URLs firmadas, contenido PDF, S3

### Fuente: KPIs de dashboard

- **Dominio:** Agregados de folios del header/dashboard (M3)
- **Cobertura actual:** COMPLETA (consulta on-demand; no IGF/ARR)
- **Archivo de acceso:** `lib/director-ia-m3-plantas-kpis-proyectos.js`; `server.js` `GET /api/dashboard/kpis`
- **Función de acceso:** `loadDashboardKpisForChat` → `queryDashboardKpis`
- **Endpoint relacionado:** semántica de `GET /api/dashboard/kpis` (sin HTTP interno)
- **Tablas consultadas:** `public.folios` ⋈ `public.plantas`
- **Evidencia de integración actual:** Intent `dashboard_kpis` + tool `get_dashboard_kpis` + rama en `askDirectorIa`
- **Información que no puede concluirse con esta fuente:** Salud, desempeño o causalidad; IGF/ARR; KPIs para roles GA/GV

### Fuente: Proyectos

- **Dominio:** Proyectos por planta (M3)
- **Cobertura actual:** COMPLETA (listado read-only EN_CURSO; no Action Register; no escritura)
- **Archivo de acceso:** `lib/director-ia-m3-plantas-kpis-proyectos.js`; helpers reutilizados por `server.js`
- **Función de acceso:** `loadProyectosForChat` → `listarProyectosPorPlantaOEquivalentes`
- **Endpoint relacionado:** semántica de `GET /api/dashboard/proyectos` (campos de helper, no POST)
- **Tablas consultadas:** `public.proyectos`
- **Evidencia de integración actual:** Intent `project_status` + tool `get_project_status` + rama en `askDirectorIa`; clarificación si wording choca con Action Register
- **Información que no puede concluirse con esta fuente:** Estatus almacenado «retrasado»; creación/edición/eliminación de proyecto

### Fuente: Presupuestos semanales

- **Dominio:** Presupuesto / carro (M18)
- **Cobertura actual:** PARCIAL (query JSON del carro semanal; writes/cheques/WhatsApp no integrados)
- **Archivo de acceso:** `lib/director-ia-m18-presupuesto-semanal.js`
- **Función de acceso:** `loadPresupuestoSemanalForChat` (in-process)
- **Endpoint relacionado:** Chat `POST /api/director-ia/chat`. Bot WhatsApp y writes de `server.js` **no** usados
- **Tablas consultadas:** `public.presupuestos_semanales`, `public.presupuesto_folios`
- **Evidencia de integración actual:** Intent `budget_status` → tool `get_budget_status` → SELECT + fórmulas de `getPresupuestoResumen`
- **Información que no puede concluirse con esta fuente:** Pagado; cheque emitido; aprobado IGF; `presupuesto_asignacion_detalle`; asignación/selección/envío a cheques; Twilio/WhatsApp

### Fuente: Cheques o datos equivalentes

- **Dominio:** Etapa cheque / número de cheque en folio (M2)
- **Cobertura actual:** NO INTEGRADA
- **Archivo de acceso:** Folios en `server.js` (`numero-cheque`, etapa `CHEQUE_GENERADO`)
- **Función de acceso:** Endpoints folio (no IA)
- **Endpoint relacionado:** `/api/folios/:id` patches relacionados
- **Tablas consultadas:** campos en `public.folios`
- **Evidencia de integración actual:** No integrada. El hop `igf_reviewable_supports` usa «depósito/cierre» como **estatus de folio**, no como esta fuente. La excepción del guard en `askDirectorIa` **no** habilita cheques.
- **Información que no puede concluirse con esta fuente:** Si un folio «tiene cheque». Un folio reviewable con `CHEQUE_GENERADO` no implica cheque consultable ni ahorro.

### Fuente: Pólizas

- **Dominio:** Póliza de folio (M15/M2)
- **Cobertura actual:** NO INTEGRADA
- **Archivo de acceso:** `POST /api/folios/:id/poliza`, documento póliza
- **Función de acceso:** Handlers póliza (no IA)
- **Endpoint relacionado:** citados; permiso `acceso_subir_poliza`
- **Tablas consultadas:** `public.folios` / `folio_archivos`
- **Evidencia de integración actual:** No integrada
- **Información que no puede concluirse con esta fuente:** Existencia/contenido de póliza

### Fuente: Clasificación de apoyos

- **Dominio:** M4
- **Cobertura actual:** PARCIAL (query JSON `mes_a` vs `mes_b`; COMPARAR/Excel no integrados)
- **Archivo de acceso:** `lib/director-ia-m4-clasificacion-query.js`; `buildClasificacionMatrix` en `lib/clasificacion-apoyos-excel.js`
- **Función de acceso:** `loadClasificacionApoyosForChat` (in-process)
- **Endpoint relacionado:** Chat `POST /api/director-ia/chat`. GET `/clasificacion-apoyos*` y POSTs COMPARAR **no** usados
- **Tablas consultadas:** `public.folios`
- **Evidencia de integración actual:** Intent `clasificacion_apoyos_query` → tool `get_clasificacion_apoyos_query` → SELECT + `buildClasificacionMatrix`
- **Información que no puede concluirse con esta fuente:** Causa del delta; desviación presupuestal; COMPARAR/reconciliación Excel; Taller por AT (M5); listado M6

### Fuente: Taller por AT

- **Dominio:** M5. Distinto de familia TALLER en M4, de GASTOS/INVERSIONES (M6) y de tema «Taller» en Action Register
- **Cobertura actual:** PARCIAL (query JSON on-demand por unidad; Excel/workbook/duplicados no integrados)
- **Archivo de acceso:** `lib/director-ia-m5-taller-at.js`; `expandTallerRows` en `lib/taller-at-excel.js`; `lib/unidad-taller.js`
- **Función de acceso:** `loadTallerAtForChat` (in-process)
- **Endpoint relacionado:** Chat `POST /api/director-ia/chat`. GET `/taller-at-excel` **no** usado
- **Tablas consultadas:** `public.folios` ⋈ `public.plantas`. Campo de unidad: `public.folios.unidad` (tokens `AT-15` / `PT-03`; **no** `at_id`; **no** catálogo)
- **Filtros disponibles:** `planta_id` obligatorio; `YYYY-MM` obligatorio; unidad opcional si aparece en la pregunta (helper físico `unidad-taller`)
- **Permisos:** JWT/contexto; rol; `plantas_permitidas`; GV 403; GA en planta autorizada; cross-planta 403; fail-closed
- **Evidencia de integración actual:** Intent `taller_at` → tool `get_taller_at` → SELECT + `expandTallerRows`
- **Información que no puede concluirse con esta fuente:** Excel/workbook; duplicados taller; causa; responsable; atraso; mes inventado; igualdad con M4/M6/AR

### Fuente: Gastos

- **Dominio:** Folios categoría GASTOS (M6 query JSON). Distinto de IGF «gasto» (M7) y de Taller AT (M5)
- **Cobertura actual:** PARCIAL (consulta on-demand; Export/xlsx no integrado)
- **Archivo de acceso:** `lib/director-ia-m6-gastos-inversiones.js`; `expandCategoriaRows` en `lib/categoria-rango-excel.js`
- **Función de acceso:** `loadGastosInversionesForChat("GASTOS")` → SELECT `public.folios` + `expandCategoriaRows`
- **Endpoint relacionado:** Chat `POST /api/director-ia/chat` (in-process). **No** usa `GET /api/dashboard/categoria-rango-excel`
- **Tablas consultadas:** `public.folios` ⋈ `public.plantas`
- **Filtros disponibles:** `planta_id` obligatorio; `YYYY-MM` obligatorio (un mes o rango); partida/concepto opcional si aparece en la pregunta
- **Permisos:** JWT/contexto; rol; `plantas_permitidas`; GV 403; GA en planta autorizada; cross-planta 403; fail-closed
- **Evidencia de integración actual:** Intent `expense_analysis` + tool `get_expense_analysis` + rama en `askDirectorIa` (después de `detectUnsupported`, antes de OpenAI/IGF)
- **Información que no puede concluirse con esta fuente:** Export/xlsx; IGF/margen/rentabilidad; Taller AT; desviación; causa; mes inventado

### Fuente: Inversiones

- **Dominio:** Folios categoría INVERSIONES (M6 query JSON)
- **Cobertura actual:** PARCIAL (consulta on-demand; Export/xlsx no integrado)
- **Archivo de acceso:** `lib/director-ia-m6-gastos-inversiones.js`; `expandCategoriaRows` en `lib/categoria-rango-excel.js`
- **Función de acceso:** `loadGastosInversionesForChat("INVERSIONES")` → SELECT `public.folios` + `expandCategoriaRows`
- **Endpoint relacionado:** Chat `POST /api/director-ia/chat` (in-process). **No** usa `GET /api/dashboard/categoria-rango-excel`
- **Tablas consultadas:** `public.folios` ⋈ `public.plantas`
- **Filtros disponibles:** `planta_id` obligatorio; `YYYY-MM` obligatorio; partida/concepto opcional
- **Permisos:** mismos que Gastos (authz de folios, no bloqueo GA de KPIs IGF)
- **Evidencia de integración actual:** Intent `investment_analysis` + tool `get_investment_analysis` + rama en `askDirectorIa`
- **Información que no puede concluirse con esta fuente:** Export/xlsx; «pendiente» como etapa almacenada; IGF; desviación; causa; mes inventado

### Fuente: Delta Venta

- **Dominio:** M9
- **Cobertura actual:** COMPLETA (consulta canónica read-only; no es descuento/ingreso)
- **Archivo de acceso:** `lib/director-ia-m9-deltas.js`
- **Función de acceso:** `loadDeltaVentaForChat` → `getPeriodosDeltaVenta` / `getDeltaVentaClientes` / `buildDeltaVentaDatosPayload`
- **Endpoint relacionado:** Chat `POST /api/director-ia/chat`; semántica de `POST /api/dashboard/delta-venta-datos` (sin HTTP interno)
- **Tablas consultadas:** `arr.ventas_diarias_cliente`
- **Evidencia de integración actual:** Intent `delta_sales`; tool `get_delta_sales` con executor real; rama in-process en `askDirectorIa`; también bloque M9.venta en `financial_diagnosis` (sin early-return)
- **Información que no puede concluirse con esta fuente:** Causalidad; Delta Descuento; Delta Ingreso; ARR snapshot general; desviación **diaria** de un día calendario (intents `daily_sales_deviation` / `daily_discount_deviation` / `daily_executive_brief`; no es M9 mensual)

### Fuente: Delta Descuento

- **Dominio:** M9
- **Cobertura actual:** COMPLETA (consulta canónica read-only; no es weekly LD ni venta)
- **Archivo de acceso:** `lib/director-ia-m9-deltas.js`
- **Función de acceso:** `loadDeltaDescuentoForChat` → `getPeriodosDeltaDescuento` / `getDeltaDescuentoClientes` / `buildDeltaDescuentoDatosPayload`
- **Endpoint relacionado:** Chat `POST /api/director-ia/chat`; semántica de `POST /api/dashboard/delta-descuento-datos` (sin HTTP interno)
- **Tablas consultadas:** `arr.descuentos_diarios_cliente` + kg de `arr.ventas_diarias_cliente`
- **Evidencia de integración actual:** Intent `delta_discount`; tool `get_delta_discount` con executor real; rama in-process en `askDirectorIa`; también bloque M9.descuento en `financial_diagnosis`
- **Información que no puede concluirse con esta fuente:** Weekly LD (M10); causalidad; Delta Venta; Delta Ingreso; desviación **diaria** de descuento/kg (otro intent: `daily_discount_deviation`; no copia la fórmula mensual)

### Fuente: Delta Ingreso

- **Dominio:** M9 (periodos reales; forecast y M19 fuera)
- **Cobertura actual:** COMPLETA para el modal de periodos reales. Forecast con `DELETE`/`INSERT` y M19 permanecen NO INTEGRADOS.
- **Archivo de acceso:** `lib/director-ia-m9-deltas.js`
- **Función de acceso:** `loadDeltaIngresoForChat` → `getPeriodosDeltaVenta` / `getDeltaIngresoDatosInternal` (margen IGF solo como insumo de fórmula)
- **Endpoint relacionado:** Chat `POST /api/director-ia/chat`; semántica de `POST /api/dashboard/delta-ingreso-datos` (sin HTTP interno)
- **Tablas consultadas:** ventas + descuentos ARR; `igf.versions` / `igf.compromiso_lines` como insumo de margen. No `arr.delta_ingreso_forecast_cliente`.
- **Evidencia de integración actual:** Intent `delta_income`; tool `get_delta_income` con executor real; no importa `delta-ingreso-forecast` ni `delta-ingreso-ai*`; también bloque M9.ingreso en `financial_diagnosis`
- **Información que no puede concluirse con esta fuente:** Forecast de ingreso; M19; causalidad; anexo IGF/ARR como sustituto; Delta Venta; Delta Descuento

### Fuente: Diagnóstico financiero multi-fuente (transversal)

- **Dominio:** Chat legado `financial_diagnosis` (no es un módulo M0–M20; no puntúa)
- **Cobertura actual:** PARCIAL respecto a «por qué» (hechos ensamblados; **no** causa). No cambia M7 PARCIAL, M8 PARCIAL ni M9 COMPLETA.
- **Archivo de acceso:** `lib/director-ia-financial-diagnosis.js`; loaders `lib/director-ia-igf-arr.js`, `lib/director-ia-m9-deltas.js`; rama `askDirectorIa` en `lib/director-ia-chat.js`
- **Función de acceso:** `loadFinancialDiagnosisForChat` → `loadIgfArrSourceBlocksForChat` + `loadDeltaVentaForChat` / `loadDeltaDescuentoForChat` / `loadDeltaIngresoForChat` → `assembleFinancialDiagnosisEvidence` → `buildFinancialDiagnosisPrompt` → **una** llamada `openaiDirectorIaChat` (`openai_call_count = 1`)
- **Endpoint relacionado:** `POST /api/director-ia/chat` (in-process; sin HTTP interno; sin writes)
- **Provenance:** tres bloques separados `igf` / `arr` / `m9`. Cada uno conserva `status`, `plant`, `period`, `payload`, `source`/`evidence`, `absence`/`error`. No fusionar procedencia. Una fuente no se presenta como otra.
- **Periodos:** IGF periodo real; ARR periodo real; M9 `period_a` / `period_b`. `alignment.status` = `comparable` o `mismatch` visible. **No** alineación silenciosa.
- **Authz:** cada fuente conserva la suya; el diagnóstico usa el alcance **más restrictivo**; GA aborta (403, sin OpenAI); GV limita M9; cross-planta bloqueado; fail-closed. Unauthorized ≠ missing.
- **Ausencia / error:** distinguir `null`, `0`, `DATA_NOT_FOUND`, `SOURCE_*`, `TOOL_ERROR` (`error_kind`). `ABSENCE_CONFIRMED` **no** se emite en este path (Evidence Builder / chat legado). `null` ≠ `0`; ausencia ≠ `0`; error ≠ ausencia.
- **Partial failure:** fuentes OK se conservan; missing/error se marca; no se presenta evidencia parcial como diagnóstico completo; no se fabrica evidencia.
- **Semántica:** puede señalar coincidencias, tensiones y limitaciones. **No** correlación = causalidad; **no** «IGF causó ARR»; **no** «el delta prueba la causa». No IES runtime. No Reasoning Engine N5.
- **Routing preservado:** `igf_status`, `arr_status`, `delta_sales`, `delta_discount`, `delta_income`, M6, M11, M12, M18, `plant_diagnosis` (otro intent; no fusiona M9 en el pack de planta), `daily_sales_deviation` / `daily_discount_deviation` / `daily_executive_brief` (otros intents; granularidad diaria; no degradan este path mensual).
- **Información que no puede concluirse con esta fuente:** causa confirmada; responsable; impacto causal; runtime IES/N5; GET `sources.igf|arr`; diagnóstico de planta (es otro intent: `plant_diagnosis`); desviación diaria de venta o de descuento/kg (otros intents: `daily_sales_deviation` / `daily_discount_deviation`); brief ejecutivo diario (otro intent: `daily_executive_brief`)

### Fuente: Diagnóstico de planta multi-fuente (transversal)

- **Dominio:** Chat legado `plant_diagnosis` (no es un módulo M0–M20; no puntúa)
- **Cobertura actual:** PARCIAL respecto a «cómo va la planta» (hechos ensamblados + materialidad/cobertura comercial; **no** causa; **no** mandato). No cambia M7 PARCIAL, M8 PARCIAL, M9 COMPLETA, M11 PARCIAL, M12 PARCIAL ni M13 COMPLETA.
- **Archivo de acceso:** `lib/director-ia-plant-diagnosis.js`; loaders AR/DICF/bitácora + `loadIgfArrSourceBlocksForChat`; SELECT `arr.dicf_cliente_mes`; cobertura `arr.dicf_acciones` por `cliente_key`; rama `askDirectorIa` en `lib/director-ia-chat.js`
- **Función de acceso:** `loadPlantDiagnosisForChat` → Action Register + DICF + bitácora + ARR + IGF + commercial_state SELECT-only → `buildCommercialMateriality` / `applyDicfCoverageToMateriality` → `assemblePlantDiagnosisEvidence` → `buildPlantDiagnosisPrompt` → **una** llamada `openaiDirectorIaChat` (`openai_call_count = 1`)
- **Endpoint relacionado:** `POST /api/director-ia/chat` (in-process; sin HTTP interno; sin writes)
- **Fuentes incluidas:** `action_register`, `dicf`, `bitacora`, `arr`, `igf`, `commercial_state`
- **Fuentes excluidas:** M9 (no `loadDelta*`; `m9_included: false`; `sources.m9` no existe)
- **commercial_state:** SELECT-only `arr.dicf_cliente_mes`. **No** `loadCommercialStateForChat`. **No** `computeDicf`. **No** cache writes. El intent de listas `commercial_state` se preserva y sigue `computeDicf`.
- **Path documentado:** `plant_diagnosis` → commercial_state SELECT-only → `kg_mes_real` observado → concentración top-5 → cobertura DICF por `cliente_key` → evidencia → una llamada OpenAI
- **Materialidad comercial (`commercial_materiality_and_coverage`):** magnitud homogénea en **kg**; campo `kg_mes_real` = kg observados del **mes de la fila**. `null` ≠ `0` (null no entra al ranking ni al denominador). Periodo explícito (dejaron: mes previo; disminuyeron: mes vigente). Denominador explícito (suma de `kg_mes_real` finitos de la categoría). Top-N=5 determinístico (kg desc, empate por nombre/canal/subcanal). `kg_mes_forecast` es proyección a cierre; **no** se documenta ni se usa `kg_mes_forecast − kg_mes_real` como venta perdida. Concentración matemática ≠ causalidad: identifica **dónde** está la magnitud, no **por qué** ocurrió. Sin score compuesto. Sin mezclar kg con MXN ni con días vencidos.
- **Cobertura DICF:** join `cliente_key` con patrón canónico M11/`buildClienteKey` (labels `Dejaron de comprar` / `Disminuyeron` / `Aumentaron` / `Nuevo` + `estado` almacenado). **No** join por nombre libre. Acción DICF asociada = cobertura registrada. Sin acción ≠ prueba de que nadie trabaje el caso. Responsable de acción ≠ responsable de la caída. Acción vencida ≠ negligencia. Acción cerrada ≠ éxito. Sin `cliente_key` derivable: cobertura desconocida (no se afirma ausencia).
- **Sugerencia textual (chat legado):** el modelo puede señalar qué casos conviene revisar primero (magnitud/concentración y cobertura como razones **separadas**). **No** es Recommendation N5. **No** es MAT_*. **No** es IES. **No** es causalidad. **No** es mandato. **No** writes.
- **Diferido (no integrado en este slice de planta):** trade-offs económicos (recuperar vs no recuperar; margen por cliente; oferta estructurada de competencia); before → action → after; agenda del Director; seguimiento/repriorización; persistir recomendaciones. La desviación **diaria de venta** («¿por qué bajó la venta ayer?») es **otro intent**: `daily_sales_deviation`. La desviación **diaria de descuento/kg** («¿por qué subió el descuento/kg ayer?») es **otro intent**: `daily_discount_deviation`. El **brief ejecutivo diario** (panorama abierto sin nombrar métrica) es **otro intent**: `daily_executive_brief`. Ninguno forma parte de este pack mensual de planta.
- **Provenance:** seis bloques separados. Cada uno conserva `status`, `plant`, `period`/`window`, `payload`, `source`/`evidence`, `absence`/`error`. La materialidad preserva `cliente_key`, magnitud, unidad, periodo, denominador, provenance. No fusionar procedencia.
- **Planta:** `planta_id` común; cross-planta bloqueado; una fuente no amplía scope.
- **Periodos:** cada fuente conserva su corte real (AR snapshot; DICF fechas de acción; bitácora 3 meses; ARR/IGF YYYY-MM; CS year/month materializado). `alignment.silently_aligned = false`. `heterogeneous_windows = true`. Mismatch YYYY-MM IGF/ARR/CS visible. **No** alineación silenciosa.
- **Authz:** cada fuente conserva la suya; intersección restrictiva. GA: AR/DICF/bitácora visibles; IGF/ARR/CS = `SOURCE_RESTRICTED` **sin abortar el pack**; OpenAI sí. Abort 403 solo si no hay acceso a la planta operativa. `SOURCE_RESTRICTED` ≠ missing (`absence = null`). Unauthorized ≠ missing. Fail-closed.
- **Partial failure:** `assembly_status` = `complete` | `partial` | `empty`. Fuentes OK se conservan. Restriction/missing/error visibles. No presentar parcial como completo. No fabricar evidencia.
- **Ausencia / error:** distinguir `null`, `0`, `DATA_NOT_FOUND`, `SOURCE_RESTRICTED`, `SOURCE_*`, `TOOL_ERROR`, unauthorized. `null` ≠ `0`; ausencia ≠ `0`; error ≠ ausencia; `SOURCE_RESTRICTED` ≠ missing.
- **Semántica:** puede señalar riesgos observables, acciones/responsables registrados, coincidencias, tensiones, limitaciones, concentración de kg y cobertura DICF. **No** correlación = causalidad; **no** «AR causó IGF»; **no** «comentario DICF prueba causa»; **no** «KPI identifica responsable»; **no** «Julio es responsable de la caída».
- **OpenAI:** una llamada final. No una llamada por fuente.
- **Routing preservado:** `financial_diagnosis`, `igf_status` / `arr_status`, `commercial_state` (listas), DICF focused, bitácora, AR (`action_status` / `overdue_actions` / `responsible_lookup`), `delta_*`, M5/M6/M11/M12/M18, `daily_sales_deviation`, `daily_discount_deviation`, `daily_executive_brief`.
- **Información que no puede concluirse con esta fuente:** causa confirmada; responsable del desempeño; impacto causal; runtime IES/N5; Recommendation N5; MAT_*; M9; GET `sources.igf|arr|commercial_state`; recálculo DICF; venta perdida = forecast−real; trade-off económico; agenda del Director; pack diario de venta (es otro intent: `daily_sales_deviation`); pack diario de descuento/kg (es otro intent: `daily_discount_deviation`); brief ejecutivo diario (otro intent: `daily_executive_brief`); consultas AR por persona (otro path: `action_status`)

### Fuente: Desviación diaria de venta (transversal)

- **Dominio:** Chat legado `daily_sales_deviation` (no es un módulo M0–M20; no puntúa). First slice `daily_sales_plus_business_evidence`.
- **Cobertura actual:** PARCIAL respecto a «por qué bajó la venta ayer» (hechos + matemáticas + evidencia relacionada + huecos; **no** causa). No cambia M8 PARCIAL, M9 COMPLETA, M11 PARCIAL ni M13 COMPLETA.
- **Archivo de acceso:** `lib/director-ia-daily-deviation.js`; rama `askDirectorIa` en `lib/director-ia-chat.js`; planner `isDailySalesDeviationQuestion` **antes** de `financial_diagnosis` / `delta_sales`.
- **Función de acceso:** `loadDailySalesDeviationForChat` → `assembleDailySalesDeviationEvidence` → prompt con detección / matemática / evidencia / huecos + `HILO` → **una** llamada `openaiDirectorIaChat` por turno.
- **Endpoint relacionado:** `POST /api/director-ia/chat` (in-process; sin HTTP interno; sin writes)
- **Tablas consultadas:** `arr.ventas_diarias_cliente` (kg, fecha, cliente, canal); `arr.dicf_acciones` y `arr.cliente_comentarios` **solo** por `cliente_key`. No join por nombre. **No** `arr.descuentos_diarios_cliente` en este slice.
- **Fecha:** timezone `America/Mexico_City`. Ayer = día calendario completo. Hoy no entra. Día sin filas ≠ 0. `target_date` explícito. `active_date` efímero en el hilo; requery cada turno; no memoria persistente de fecha.
- **Referencia:** `same_weekday_recent_average`, ventana 14 días, mismo ISODOW, solo días con filas, N observaciones explícito. Siempre se declara contra qué se comparó. **No** día anterior por default.
- **Detección:** `target_date`, kg observados, tipo de referencia, kg de referencia, N, delta kg, delta %.
- **Matemática:** contribución por cliente y por canal al delta vs la referencia; top contributors; reconciliación con el total. **Contribución matemática ≠ causa.**
- **Evidencia de negocio:** DICF + comments por `cliente_key`. Comentario ≠ causa probada. Acción ≠ causa. Responsable de acción ≠ responsable de la caída.
- **Huecos:** contribuidores materiales sin evidencia suficiente. Gap ≠ «no existe causa». Gap = el pack actual no alcanza para explicar empresarialmente el movimiento.
- **Authz:** planta actual, rol actual, `plantas_permitidas`, no cross-plant, fail-closed. No amplía M9. GA/GV `SOURCE_RESTRICTED`.
- **Ausencia / error:** 0 real ≠ `null` ≠ día sin filas ≠ referencia insuficiente ≠ `DATA_NOT_FOUND` ≠ `SOURCE_RESTRICTED` ≠ `TOOL_ERROR`.
- **OpenAI:** una llamada por turno. GPT conserva síntesis, explicación, qué llama la atención, qué sabemos / no sabemos, qué falta, follow-ups. El runtime **no** programa una respuesta final rígida.
- **Routing:** gana sobre `financial_diagnosis` y `delta_sales` cuando hay venta + **ayer**. También gana si el turno es standalone con lenguaje de retorno («Volvamos a la venta de ayer.»). Paths mensuales se preservan.
- **Descuento/kg:** otro intent (`daily_discount_deviation`). Este slice de venta **no** calcula descuento/kg.
- **Brief ejecutivo:** otro intent (`daily_executive_brief`) cuando el usuario pide panorama sin nombrar venta.
- **Información que no puede concluirse con esta fuente:** causa empresarial; «Arturo causó la caída»; competencia como prueba; acción como causa; responsable de la caída; descuento/kg diario (otro intent); brief ejecutivo (otro intent); M9 mensual; IES/N5

### Fuente: Desviación diaria de descuento/kg (transversal)

- **Dominio:** Chat legado `daily_discount_deviation` (no es un módulo M0–M20; no puntúa). First slice **D**.
- **Cobertura actual:** PARCIAL respecto a «por qué subió el descuento/kg ayer» (ratio ponderado + contribución reconciliada + evidencia relacionada + huecos; **no** causa). No cambia M8 PARCIAL, M9 COMPLETA, M11 PARCIAL ni M13 COMPLETA.
- **Archivo de acceso:** `lib/director-ia-daily-discount.js`; rama `askDirectorIa` en `lib/director-ia-chat.js`; planner `isDailyDiscountDeviationQuestion` **después** de venta diaria y **antes** de `delta_discount` / `financial_diagnosis`.
- **Función de acceso:** `loadDailyDiscountDeviationForChat` → `assembleDailyDiscountDeviationEvidence` → prompt (summary / reference / customer contributors / business evidence / information gaps / limitations / provenance) + `HILO` → **una** llamada `openaiDirectorIaChat` por turno.
- **Endpoint relacionado:** `POST /api/director-ia/chat` (in-process; sin HTTP interno; sin writes)
- **Tablas consultadas:** `arr.descuentos_diarios_cliente` (fecha, plant_code, cliente_norm, monto); `arr.ventas_diarias_cliente` (`SUM(kg)` al mismo grano cliente/día/planta); `arr.dicf_acciones` y `arr.cliente_comentarios` **solo** por `cliente_key` canónico. No join por nombre. **No** prorrateo por canal.
- **Fecha:** timezone `America/Mexico_City`. Ayer = día calendario completo. Hoy no entra. Día sin filas ≠ ratio 0. kg=0 → ratio indefinido, no 0. `target_date` explícito. `active_date` efímero; requery cada turno; no memoria persistente de fecha.
- **Fórmula planta:** `SUM(monto)/SUM(kg)`. **No** AVG de ratios. **No** average-of-averages. **No** fórmula mensual M9.
- **Referencia:** `same_weekday_14d_pooled`. Mismo ISODOW, ventana 14 días, días completos, misma planta, N explícito. `R_ref = SUM(monto_ref)/SUM(kg_ref)`. **No** promedio de ratios diarios. **No** día anterior por default.
- **Contribución:** `contrib_i = monto_i_target / K_target − monto_i_ref / K_ref`. `SUM(contrib_i)` reconcilia `R_target − R_ref`. **Ratio más alto ≠ mayor mover.** Mayor mover = mayor contribución matemática al delta. **Contribución ≠ causa.** Mix/rate diferido.
- **Canal:** **NOT AVAILABLE.** La fuente de descuento no tiene canal. No prorratear. No inventar.
- **Evidencia de negocio:** comments + DICF por `cliente_key`. Comment ≠ cause. Action ≠ cause. Responsible ≠ cause.
- **Huecos:** contribuidores materiales sin evidencia suficiente. Gap ≠ «no existe causa».
- **Authz:** planta actual, rol actual, `plantas_permitidas`, no cross-plant, fail-closed. GA/GV `SOURCE_RESTRICTED`.
- **OpenAI:** una llamada por turno. GPT explica, sintetiza, identifica qué no sabemos y qué información falta. El runtime conserva fecha, math, joins, authz y provenance.
- **Routing:** gana sobre `delta_discount` y `financial_diagnosis` cuando hay descuento + **ayer**. «cómo cambió el descuento» (sin ayer) sigue `delta_discount`. Venta+descuento en la misma frase no se fusiona (`daily_sales_deviation` se preserva para venta).
- **M9:** **UNCHANGED.** No se documenta que M9 fue corregido.
- **Brief ejecutivo:** otro intent (`daily_executive_brief`) cuando el usuario pide panorama sin nombrar descuento.
- **Información que no puede concluirse con esta fuente:** causa empresarial; «el cliente X causó el aumento»; canal; mix/rate; trade-off económico; M9 mensual como fórmula diaria; IES/N5

### Fuente: Action Register por responsable/acción (transversal)

- **Dominio:** Chat legado `action_status` (no es un módulo M0–M20; no puntúa). Estrategia **C**. Parent canónico existente.
- **Cobertura actual:** PARCIAL respecto a «qué pasó con la acción de [responsable registrado]» (hechos del board + 0/1/N + limitations; **no** culpa; **no** motivo inventado). M12 **sigue PARCIAL**.
- **Archivo de acceso:** `lib/director-ia-action-person.js`; rama `handleActionStatusPersonChat` en `lib/director-ia-chat.js`; planner `ACCION_TOKEN_RE` + `hasProperPersonSpan`.
- **Función de acceso:** `loadActionPersonBoardForChat` → `resolveActionPersonFocus` → pack (status/fecha/vencimiento; historial/`resultado_cierre` solo si existe) + limitations + provenance + `HILO` → GPT.
- **Endpoint relacionado:** `POST /api/director-ia/chat` (in-process; sin HTTP interno; sin writes)
- **Tablas consultadas:** Board AR de la planta (`arr.action_register_*` vía `buildActionRegisterBoardPayload`). Historial DICF **solo** si el ítem ya trae `dicf_id`; no mix por nombre.
- **Resolución:** responsable físico en el board/scope actual; sin fuzzy; ambiguo → clarificar. 0 = no encontradas; 1 = carga directa; N = listar/acotar/clarificar; **no silent pick**.
- **Precedencia:** intent AR específico gana sobre resume genérico de memoria. «¿Qué pasó con Arturo?» puede seguir memoria si no hay intent más específico.
- **Semántica:** responsable registrado de la acción ≠ culpable ≠ responsable del problema ≠ causa del vencimiento.
- **Authz:** `assertActionRegisterAccess`; planta actual; no cross-plant; fail-closed.
- **OpenAI:** GPT formula respuesta. Si no hay motivo de no-cierre, recibe limitation y puede decir que no hay explicación registrada y qué actualización falta.
- **Continuidad:** `action_status` inheritable (estrategia B). Requery cada turno.
- **Información que no puede concluirse con esta fuente:** culpa; incumplimiento; causa del atraso; scoring de personas; motivo no registrado; dump de planta como si fuera consulta por persona

### Fuente: Retorno de tema intra-sesión (transversal)

- **Dominio:** Chat legado `previous_frame` (no es un módulo M0–M20; no puntúa). First slice **B**.
- **Cobertura actual:** PARCIAL respecto a «cambiar de tema y volver al anterior en la misma sesión» (un prior; precedencia standalone; requery). **No** stack. **No** cambia ningún módulo ni el 52.5%.
- **Archivo de acceso:** `lib/director-ia-conversation-state.js`; wiring `askDirectorIa` en `lib/director-ia-chat.js`.
- **Función de acceso:** captura mínima del current al switch standalone; restore compatible → revalidar → requery del intent restaurado → `HILO` + pack fresco → GPT.
- **Endpoint relacionado:** `POST /api/director-ia/chat` (in-process; sin HTTP interno; sin writes)
- **Qué guarda:** `parent_intent`, entity ref/key, `active_date`, `last_evidence_bundle_type`, `pending_information_gap`, plant scope. **Exactamente uno.**
- **Qué no guarda:** raw evidence, DB rows, transcript, claims del assistant, prosa del user como fact, authz snapshot.
- **Precedencia:** standalone válido gana sobre `topic_return`. «Volvamos a la venta de ayer.» = `daily_sales_deviation` 0.92 ejecutado.
- **Restore ≠ fact:** authz actual; planta del request; entidad/fecha revalidadas; current evidence wins. 0/1/N de acciones intacto.
- **Frontera:** `previous_frame` = intra-sesión. `pending_work_items_only` = cross-session pending work. History ≠ evidence.
- **Límite:** un tema implícito más antiguo que `previous_frame` no se recupera en silencio (clarifica). El cambio de métrica diaria **dentro del mismo día** no usa este frame (ver fuente cross-metric).

### Fuente: Cross-metric follow-up diario (transversal)

- **Dominio:** Chat legado (no es un módulo M0–M20; no puntúa). Estrategia **B** post-planner. `IMPL-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001`.
- **Cobertura actual:** PARCIAL respecto a «cambiar de métrica diaria conservando la fecha» (venta ↔ descuento/kg; misma `active_date`; requery). **No** terceras métricas. **No** cambia ningún módulo ni el 52.5%.
- **Archivo de acceso:** `lib/director-ia-conversation-state.js`; helpers `lib/director-ia-planner.js`; wiring `askDirectorIa` en `lib/director-ia-chat.js`.
- **Función de acceso:** `namedDailyMetricSignal` + `resolveConversationTurn` (`cross_metric_switch`); `forceIntent` del destino; loaders `loadDailySalesDeviationForChat` / `loadDailyDiscountDeviationForChat`.
- **Endpoint relacionado:** `POST /api/director-ia/chat` (in-process; sin HTTP interno; sin writes)
- **Qué conserva:** `active_date` del hilo diario cuando sigue válida.
- **Qué cambia:** `parent_intent`, `last_evidence_bundle_type`, `pending_information_gap` (fresco del pack destino).
- **Qué no hace:** inventar ayer; phrasebook; intent nuevo; reutilizar evidencia del pack origen; usar `previous_frame` para decidir; usar memoria persistente.
- **Precedencia:** standalone con `ayer` gana. Fecha explícita del turno gana sobre la heredada. Señal mensual bloquea el switch diario.
- **Same-metric:** unknown que no nombra la otra métrica hereda el parent (estrategia B).
- **GPT:** pack correcto + HILO. No repara routing.
- **Información que no puede concluirse con esta fuente:** causa; margen diario; path mensual; weekday de usuario no parseado; stack de temas
- **Información que no puede concluirse con esta fuente:** hechos del tema previo sin requery; stack de temas; memoria semántica; navegación vía SQL 017
- **Parent brief:** un hilo `daily_executive_brief` con `active_date` válida también abre este switch («¿Y la venta?» / «¿Y el descuento?»).
- **Tendencia de gráfica:** otro intent (`commercial_trend`); no usa `active_date` diaria.

### Fuente: Brief ejecutivo diario (transversal)

- **Dominio:** Chat legado `daily_executive_brief` (no es un módulo M0–M20; no puntúa). First slice **B**. `IMPL-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001`.
- **Cobertura actual:** PARCIAL respecto a «cómo nos fue ayer» / panorama diario **sin** nombrar métrica (venta + descuento/kg; GPT sintetiza; **no** causa). No cambia M8 PARCIAL, M9 COMPLETA, M11 PARCIAL ni M13 COMPLETA.
- **Archivo de acceso:** `lib/director-ia-daily-executive-brief.js`; rama `askDirectorIa` en `lib/director-ia-chat.js`; planner `isDailyExecutiveBriefQuestion` **después** de venta/descuento explícitos.
- **Función de acceso:** `loadDailyExecutiveBriefForChat` (compone `loadDailySalesDeviationForChat` + `loadDailyDiscountDeviationForChat`) → prompt con bloques separados + `HILO` → **una** llamada `openaiDirectorIaChat` por turno.
- **Endpoint relacionado:** `POST /api/director-ia/chat` (in-process; sin HTTP interno; sin writes)
- **Tablas consultadas:** las de los packs diarios existentes. **No** ingreso diario. **No** SQL nuevo.
- **Fecha:** timezone `America/Mexico_City`. Ayer = día calendario completo. Fecha explícita gana. Hoy no se cierra en silencio. 0 filas ≠ 0. `active_date` lo establece el brief.
- **Pack:** planta, `target_date`, bloque venta, bloque descuento/kg, provenance separado, limitations/gaps separados, partial-data. Componer evidencia ≠ componer causa.
- **Partial-data:** una métrica puede vivir aunque la otra falte. Ambas missing → no inventa. missing ≠ zero.
- **Materialidad:** runtime aporta valor/referencia/delta/contribuidores/evidencia/limitations. GPT decide qué destaca, tensión, qué revisar, qué sigue sin explicación. **No** buen/mal día programado.
- **Causalidad:** coincidencia de movimientos ≠ causa. Prohibido atribuir venta al descuento.
- **Routing:** brief solo si pide panorama sin elegir métrica. Venta explícita y descuento explícito conservan sus intents. **No** phrasebook.
- **Follow-ups:** open followups heredan brief y llegan a GPT. «¿Y la venta?» / «¿Y el descuento?» → intents de métrica, misma `active_date`, cross-metric B, `previous_frame` preservado.
- **Información que no puede concluirse con esta fuente:** buen/mal día hardcoded; «el descuento provocó la venta»; ingreso diario; tendencia 30/90 CASA/COMISIONISTA (otro intent: `commercial_trend`); perfil longitudinal 3M (otro intent: `client_profile`); saludo personalizado; SEH; Taller Mayor; closed-month IGF; IES/N5

### Fuente: Tendencia comercial de gráfica (transversal)

- **Dominio:** Chat legado `commercial_trend` + dashboard `GET /api/arr/venta-serie` (no es un módulo M0–M20; no puntúa). Arquitectura **B**. First slice **B**. `IMPL-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001`.
- **Cobertura actual:** PARCIAL respecto a «cómo vamos en CASA/COMISIONISTAS el último mes / últimos 3 meses» (serie + OLS + top-6; **no** causa; **no** comments). No cambia M8 PARCIAL, M9 COMPLETA, M11 PARCIAL ni M13 COMPLETA.
- **Archivo de acceso:** `lib/commercial-trend-engine.js` (motor compartido); `lib/director-ia-commercial-trend.js`; rama `askDirectorIa` en `lib/director-ia-chat.js`; planner `isCommercialTrendQuestion` **después** de brief/desviaciones diarias y **antes** de `arr_status`.
- **Función de acceso:** `loadCommercialTrend` → `loadCommercialTrendForChat` / `projectEngineChannel` → prompt (serie / OLS / movers / limitations / provenance) + `HILO` → **una** llamada `openaiDirectorIaChat` por turno.
- **Endpoints relacionados:** `POST /api/director-ia/chat` (in-process; sin HTTP interno). `GET /api/arr/venta-serie` **delega** al mismo motor (comments solo en el wrapper HTTP).
- **Tablas consultadas:** `arr.ventas_diarias_cliente`; `arr.descuentos_diarios_cliente` (para omitir días 0/0 como el dashboard); `arr.cliente_categoria_mes` (canal). **No** `arr.cliente_comentarios` en el pack de chat. **No** join por `cliente_nombre`.
- **Rango:** 30 o 90 días trailing. Ancla `MAX(fecha)`. No hoy. No mes calendario.
- **Canal:** `LIKE '%comisionista%'` → COMISIONISTA; resto → CASA. Alias COMISIONISTAS. Comparar = dos llamadas, mismo rango. No `ambos` agregado.
- **OLS:** `x` = índice; `y` = `venta_ton`; `n < 2` → null / `INSUFFICIENT_DATA`. UP/DOWN/FLAT. No first-vs-last.
- **Top-6:** mismo delta y selección que el dashboard. **Mover ≠ causa.**
- **Paridad:** mismo fixture/planta/rango/canal → mismas fechas, `venta_ton`, slope, top-6, rango y `n`.
- **Estado:** `active_range_days` / `active_channel` / planta = routing. Requery cada turno.
- **Partial-data:** 0 filas; n insuficiente; un canal ausente; error. missing ≠ zero salvo semántica existente.
- **Authz:** planta actual; `plantas_permitidas`; no cross-plant; fail-closed. GA/GV `SOURCE_RESTRICTED`.
- **OpenAI:** una llamada por turno. GPT sintetiza, compara wording, qué destaca y qué investigar. Si dice «explica», aclara contribuye ≠ causa. El runtime conserva rango, canal, serie, OLS, movers, authz y provenance.
- **Routing:** un intent. Venta + **ayer** sigue `daily_sales_deviation`. Panorama de **ayer** sin métrica sigue `daily_executive_brief`. Listas DICF siguen `commercial_state`.
- **Información que no puede concluirse con esta fuente:** causa empresarial; comments de gráfica; perfil 3M calendario (otro intent: `client_profile`; no reusa points/OLS/movers); ingreso diario; IES/N5

### Fuente: Perfil longitudinal de cliente (transversal)

- **Dominio:** Chat legado `client_profile` (no es un módulo M0–M20; no puntúa). Source **B**. Routing **B**. `IMPL-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001`.
- **Cobertura actual:** PARCIAL respecto a «qué sabemos de este cliente en estos tres meses» (kg/mes + descuento/kg/mes + comments/DICF keyed; **no** causa; **no** ingreso actual). No cambia M8 PARCIAL, M9 COMPLETA, M11 PARCIAL, M12 PARCIAL ni M13 COMPLETA.
- **Archivo de acceso:** `lib/director-ia-client-profile.js`; rama `askDirectorIa` en `lib/director-ia-chat.js`; planner + `forceIntent` + `INHERITABLE_INTENTS`.
- **Función de acceso:** `loadClientProfileForChat` → `assembleClientProfilePack` → prompt (meses alineados / kg / descuento/kg / comments / DICF / limitations / provenance) + `HILO` → **una** llamada `openaiDirectorIaChat` por turno.
- **Endpoint relacionado:** `POST /api/director-ia/chat` (in-process; sin HTTP interno; sin writes)
- **Tablas consultadas:** `arr.ventas_diarias_cliente` (`SUM(kg)` por mes); `arr.descuentos_diarios_cliente` (`SUM(monto)/SUM(kg)` del **mismo** mes); `arr.cliente_comentarios` y `arr.dicf_acciones` (+ historial) **solo** por `cliente_key`. **No** `arr.action_register_items` (sin `cliente_key`; no join inventado). **No** join por `cliente_nombre`. **No** fuzzy.
- **Identidad:** `cliente_key` obligatorio. Misma planta. Authz fail-closed. Homónimos no se fusionan.
- **Periodo:** mes calendario actual `America/Mexico_City` + 2 previos. Actual = **PARTIAL**. Previos = **COMPLETE** si la fuente cubre el mes. **3 meses calendario ≠ 90 días trailing** de `commercial_trend`. `active_period_months` = routing; evidencia se reconsulta.
- **Venta:** `SUM(kg)` por mes. **Descuento:** `SUM(monto)/SUM(kg)` por mes. **No** AVG de ratios. Denominador ausente → null. missing ≠ 0.
- **Ingreso:** actual mensual cliente = **UNSUPPORTED_METRIC**. La fórmula DICF `kg_forecast × (margen − |descuento|)` **no** es actual. No se pone 0. No se disfraza forecast.
- **Comments / DICF:** comentario ≠ causa. Acción ≠ resultado.
- **Handoff:** `commercial_trend` → mover → `active_entity` + `cliente_key` → «¿Qué sabemos de él?» → `client_profile` + requery fresco. **No** reutilizar evidencia de trend.
- **Follow-ups:** conservan `cliente_key` / planta / `active_period_months` y requery. Ejemplos de hilo (no phrasebook): cómo ha comprado; descuento por mes; mes de más kg; mes de más descuento; ¿ese mes también compró más?; comentarios; acciones; qué pasó con esas acciones; cuánto ingreso generó.
- **Correlación:** coincidencia temporal ≠ causalidad.
- **Partial-data:** el perfil sigue útil si faltan comments, DICF, un mes, descuento o ingreso. missing ≠ zero.
- **Authz:** planta actual; `plantas_permitidas`; no cross-plant; fail-closed. GA/GV `SOURCE_RESTRICTED`.
- **OpenAI:** una llamada por turno. GPT sintetiza, destaca, wordinea correlación con caveats y qué queda sin explicar. El runtime conserva identidad, periodo, alineación, matemáticas, retrieval, authz, provenance y ausencia.
- **Routing:** un intent padre. `expediente_comercial` sigue siendo 1 mes latest. `commercial_trend` sigue 90d + OLS. `action_status` no se pisa.
- **Información que no puede concluirse con esta fuente:** ingreso mensual actual; causalidad; Action Register de cliente; join por nombre; 90d trailing como si fueran 3 meses calendario; IES/N5

### Fuente: Apoyos reviewable / contrafactual IGF (transversal)

- **Dominio:** Chat legado (no es un módulo M0–M20; no puntúa). First slice **C**. `IMPL-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001`.
- **Cobertura actual:** PARCIAL respecto a «qué se puede recortar de apoyos» + escenario IGF hipotético del mes abierto. **No** closed-month. **No** forecast histórico. **No** cambia M2/M7 ni el 52.5%.
- **Archivo de acceso:** `lib/director-ia-igf-reviewable-supports.js`; wiring `lib/director-ia-chat.js`, `lib/director-ia-planner.js`, `lib/director-ia-tools.js`, `lib/director-ia-conversation-state.js`.
- **Función de acceso:** `loadIgfReviewableSupportsForChat` / `buildIgfReviewableSupportsPack` / `classifyCancellationEligibility`; IGF vía `loadIgfArrSourceBlocksForChat`; tool `get_igf_reviewable_supports`.
- **Endpoint relacionado:** `POST /api/director-ia/chat` (in-process; SELECT `public.folios`; sin HTTP interno; sin writes)
- **Tablas consultadas:** `public.folios` ⋈ `public.plantas` (listado). Snapshot IGF: `igf.versions` + `igf.compromiso_lines` (fila; no se escribe).
- **Filtros disponibles:** planta + equivalentes M3; `mes_cargo`; exclusión `CANCELADO`; categorías que alimentan el overlay IGF.
- **Clasificación:** REVIEWABLE = cancelable operacionalmente. No cancelable: `PAGADO`, `CERRADO`, `COMPROBACIONES`, `EVIDENCIAS`. `CANCELADO` fuera. **No** «no depositado = recortable».
- **Contrafactual:** overlay live en memoria; IGF actual / hipotético / delta / folios incluidos. Etiqueta **ESCENARIO HIPOTÉTICO**.
- **Qué conserva el hop:** planta y periodo del IGF. **Qué cambia:** parent a `igf_reviewable_supports`; Folios fresco. **Qué no hace:** pegarse a `igf_status`; caer a cheques; persistir escenario; afirmar ahorro/cash.
- **GPT:** pack + HILO. No recomienda cancelar. Ranking por importe = para revisión. Riesgo comercial: si falta el join, dice qué falta.
- **Información que no puede concluirse con esta fuente:** ahorro realizado; cash; mejora real del IGF; materialización contable de lo no cancelable; que el Director IA cancele o solicite cancelación; cheque operativo; closed-month; riesgo comercial inventado

### Fuente: Duplicados

- **Dominio:** M16 (+ hoja Taller M5, no cableada)
- **Cobertura actual:** COMPLETA para el análisis de **posibles** pares de folios (M16). La hoja de duplicados Excel Taller (M5) permanece NO INTEGRADA.
- **Archivo de acceso:** `lib/folio-duplicados.js`, `lib/folio-duplicados-load.js`, `lib/director-ia-duplicados.js`
- **Función de acceso:** `loadDuplicateFoliosForChat` → `loadFoliosParaDuplicados` → `findDuplicatePairs`
- **Endpoint relacionado:** Chat `POST /api/director-ia/chat`; dashboard `GET /api/folios/duplicados/analisis` (misma lógica de carga; el tool no hace HTTP interno)
- **Tablas consultadas:** `public.folios`
- **Evidencia de integración actual:** Intent `duplicate_folios`; tool `get_duplicate_folios` con executor real; `SOURCE_NOT_INTEGRATED` retirado solo para este dominio
- **Información que no puede concluirse con esta fuente:** Duplicado confirmado, fraude, obligación de cancelar, pares fuera de ventana/`LIMIT`, duplicados Excel Taller, alarma `findSimilarTo` al crear

### Fuente: Usuarios y permisos

- **Dominio:** M0/M14
- **Cobertura actual:** INDIRECTA / NO INTEGRADA como dominio de respuesta
- **Archivo de acceso:** `lib/usuario-permisos.js`, `lib/dashboard-auth.js`
- **Función de acceso:** `authHasPermiso`, gates; `loadUsuarioRolesByIds` (roles de responsables)
- **Endpoint relacionado:** `/api/usuarios-admin*` (no IA)
- **Tablas consultadas:** `public.usuarios`, `public.roles`
- **Evidencia de integración actual:** Auth gate + roles en AR; no consulta admin
- **Información que no puede concluirse con esta fuente:** Matriz completa de permisos de un usuario arbitrario

### Fuente: WhatsApp

- **Dominio:** M17
- **Cobertura actual:** PARCIAL (canal de acceso, no fuente de datos del chat)
- **Archivo de acceso:** `server.js` Twilio handler
- **Función de acceso:** comando `DirectorIA` → URL firmada
- **Endpoint relacionado:** `POST /twilio/whatsapp`
- **Tablas consultadas:** usuarios / notificaciones según comando
- **Evidencia de integración actual:** Generación de link si `ENABLE_DIRECTOR_IA`
- **Información que no puede concluirse con esta fuente:** Contenido de chats WhatsApp previos como contexto Director IA

### Fuente: Mejora Continua (complemento AR)

- **Dominio:** Vista MC sobre Action Register (M12/M13)
- **Cobertura actual:** PARCIAL
- **Archivo de acceso:** `lib/director-ia-mejora-continua.js`
- **Función de acceso:** `buildMejoraContinuaPayload`, `loadMejoraContinuaForChat`
- **Endpoint relacionado:** `GET /api/director-ia/mejora-continua`
- **Tablas consultadas:** Action Register (vía board)
- **Filtros:** planta, year, month
- **Evidencia de integración actual:** Preguntas MC en chat (`isMejoraContinuaQuestion`)
- **Información que no puede concluirse con esta fuente:** Folios operativos; Excel Taller

---

## Parte 4 — Capacidades de negocio (preguntas)

| # | Pregunta | ¿Puede responderla hoy? | Cobertura | Fuente necesaria | Función/endpoint existente | Información faltante | Riesgo de respuesta incorrecta |
|---|----------|-------------------------|-----------|------------------|----------------------------|----------------------|--------------------------------|
| 1 | ¿Cómo va una planta? | Parcialmente (seis fuentes + materialidad kg / cobertura DICF; **no** causa; **no** M9; **no** N5) | PARCIAL | AR + DICF + bitácora + ARR + IGF + commercial_state SELECT-only | `loadPlantDiagnosisForChat` / `assemblePlantDiagnosisEvidence` → una llamada OpenAI | Causalidad; M9; IES/N5; Recommendation N5; MAT_*; desviaciones diarias; trade-off económico; GA ve IGF/ARR/CS como `SOURCE_RESTRICTED` | Alto si se interpreta como KPI completo, como causa, como mandato o como dump AR |
| 2 | ¿Qué acciones están vencidas? | Sí (limitado) | PARCIAL | Action Register | `summarizeTopOverdueActions` / context; si hay nombre propio → `action_status` (no listado de planta) | Acciones fuera del top 10; notas de revisión son otro intent (no se mezclan con vencidas) | Medio (omisión por límite); alto si se lee el vencimiento como culpa |
| 3 | ¿Quién es responsable de una acción? | Sí (limitado) | PARCIAL | Action Register | `summarizeActionRegisterResponsables`; consulta por persona: `resolveActionPersonFocus` (responsable **registrado**; 0/1/N) | Responsables fuera del top 10; motivo de no-cierre si no está registrado | Medio; alto si se lee como culpable o como causa del vencimiento |
| 4 | ¿Por qué cayó el ingreso? | Parcialmente (hechos IGF+ARR+M9 ensamblados; **no** causa) | PARCIAL | Bloques separados IGF, ARR y M9 | `loadFinancialDiagnosisForChat` / `assembleFinancialDiagnosisEvidence` → una llamada OpenAI | Causalidad estructurada; IES/N5; hipótesis etiquetadas | Alto si se lee como causa raíz |
| 5 | ¿La caída proviene de venta o descuento? | Parcialmente (puede señalar tensiones entre bloques; no atribución causal) | PARCIAL | Mismos bloques `financial_diagnosis`; `delta_*` si el wording es «cómo cambió venta/descuento/ingreso» | `assembleFinancialDiagnosisEvidence`; loaders M9 si intent `delta_*` | Atribución automática venta vs descuento como causa | Alto |
| 6 | ¿Cómo va ARR contra la meta? | Parcialmente | PARCIAL | ARR annex | `loadArrProyForPlant` | Meta/UI completa ARR; depende de wording regex | Medio |
| 7 | ¿Cómo va IGF contra el compromiso? | Parcialmente | PARCIAL | IGF annex + composición de 1 fila | `loadIgfCommitSnapshot` / `extractIgfComposition` / `get_igf_snapshot` | Versiones/HG UI; `sources.igf` no en GET; no es tendencia (M9) ni causa | Medio |
| 8 | ¿Qué clientes explican la desviación? | Parcialmente (mensual: commercial_state/top. Si es **venta ayer**, es `daily_sales_deviation`. Si es **descuento/kg ayer**, es `daily_discount_deviation`. Si es tendencia 30/90 de gráfica, es `commercial_trend` top-6; mover ≠ causa. Si es **top volumen 3M calendario** / perfil de un cliente, es `client_profile`) | PARCIAL | commercial_state / top clientes IGF-ARR / DICF; pack diario si ayer; motor de gráfica si 30/90; perfil 3M si `cliente_key` | `loadCommercialStateForChat` (20 clientes), `loadTopClientesDescBrief` (8); `loadDailySalesDeviationForChat` si venta+ayer; `loadDailyDiscountDeviationForChat` si descuento+ayer; `loadCommercialTrendForChat` si `commercial_trend`; `loadClientProfileForChat` si `client_profile` | Universo completo; causa empresarial; comments de gráfica; mix/rate; ingreso mensual actual | Medio (top-N); alto si contribución = causa |
| 9 | ¿En qué etapa está un folio? | Sí (estatus observado + etapa derivada; no es historial ni tablero HTTP) | PARCIAL | Folios (`public.folios.estatus`) | `loadFolioStatusForChat` / `get_folio_status` (SELECT-only; **no** `GET /kanban` ni `GET /folios/:id`) | Contenido PDF/S3, cheque/póliza, autoavance, tablero HTTP | Alto si se lee como columna DB `etapa` o como kanban mutante |
| 10 | ¿Por qué está detenido un folio? | No de forma fiable | INDIRECTA máx. | Comentarios folio | `loadFolioComentariosForDirectorIa` | Estatus, timeline, permisos de avance | Alto |
| 11 | ¿Cuál fue el último movimiento del folio? | Sí (eventos observados de `public.folio_historial`; no es GET `/timeline` ni tablero HTTP) | PARCIAL | Historial (`public.folio_historial`) | `loadFolioHistoryForChat` / `get_folio_history` (SELECT-only; **no** `GET /timeline`; **no** `dedupeHistorialByStage`) | Contenido PDF/S3, cheque/póliza, transiciones inventadas, actor sistema, tablero HTTP | Alto si se lee como transición, como GET `/timeline` o como historial deduplicado |
| 12 | ¿Qué documentos le faltan? | No | NO INTEGRADA | Documentos/medios (faltantes / set esperado) | Guardrail `UNSUPPORTED_RULES.documentos` (`SOURCE_NOT_INTEGRATED`) | Set esperado canónico; cumplimiento; contenido | Alto si se lee la metadata M2 como «faltan documentos» |
| 13 | ¿Tiene cheque, depósito o póliza? | No (cheque/póliza operativa). El hop IGF→apoyos «depositados/cerrados» es **estatus** reviewable, no esta fuente | NO INTEGRADA (cheques/póliza) | Folios/pólizas | Campos folio + endpoints póliza/cheque. `igf_reviewable_supports` no consulta cheque | Toda la fuente de cheques/póliza | Alto si se lee el pack reviewable como «tiene cheque» |
| 14 | ¿Existen posibles folios duplicados? | Sí (heurístico; candidatos, no confirmación) | COMPLETA | Duplicados | `loadDuplicateFoliosForChat` / `findDuplicatePairs` | Confirmación humana; cancelación; `/check` al crear; pares fuera de ventana o `LIMIT 1500` | Alto si se lee como duplicado confirmado o fraude |
| 15 | ¿Qué gastos existen por planta? | Parcialmente (listado folios GASTOS si wording es categoría/folios + `YYYY-MM`; no Excel) | PARCIAL | Folios categoría GASTOS (`public.folios` + `expandCategoriaRows`) | `loadGastosInversionesForChat("GASTOS")` / `get_expense_analysis` | Export/xlsx; «cómo van los gastos» / margen / rentabilidad siguen IGF (M7) | Alto si se lee como IGF o como Export |
| 16 | ¿Qué inversiones están pendientes? | Parcialmente (listado folios INVERSIONES no cancelados si hay `YYYY-MM`; «pendiente» no es etapa almacenada) | PARCIAL | Folios categoría INVERSIONES | `loadGastosInversionesForChat("INVERSIONES")` / `get_investment_analysis` | Export/xlsx; etapa «pendiente»; mes inventado | Alto si se afirma pendiente como estatus |
| 17 | ¿Cómo va el presupuesto semanal? | Sí (carro read-only por planta/semana; no writes ni cheques) | PARCIAL | Presupuestos (`presupuestos_semanales` + `presupuesto_folios`) | `loadPresupuestoSemanalForChat` / `get_budget_status` (SELECT-only; no solo `ABIERTO`) | Asignar/seleccionar; cheques; WhatsApp; `presupuesto_asignacion_detalle`; semana inventada | Alto si se lee como pagado, cheque o asignación mensual |
| 18 | ¿Qué proyectos están retrasados? | Sí (listado EN_CURSO; «retrasado» no es estatus almacenado) | COMPLETA (consulta del módulo; el retraso solo puede declararse como derivado de `fecha_cierre_estimada`) | Proyectos | `loadProyectosForChat` / `get_project_status` | Estatus oficial de retraso; crear/editar/eliminar | Alto si se lee como estatus almacenado o como Action Register |
| 19 | ¿Qué usuario realizó un movimiento? | Parcialmente (folios: `actor_telefono`/`actor_rol` observados si existen; null ≠ sistema); parcial en AR/DICF | PARCIAL | Historial folio vs historial DICF/AR | `loadFolioHistoryForChat` (actor observado) vs detalles DICF/AR summarizers | Responsabilidad inferida; actor sistema; usuario canónico si actor es null | Alto si se atribuye mal |
| 20 | ¿Qué información no puede consultar Director IA? | Sí (meta) | COMPLETA (esta pregunta de catálogo) | Este documento + `EMPTY_SOURCES` | N/A | — | Bajo si se responde con catálogo |

### Preguntas adicionales respaldadas por el sistema

| Pregunta | ¿Hoy? | Cobertura | Fuente | Función/endpoint | Faltante | Riesgo |
|----------|-------|-----------|--------|------------------|----------|--------|
| ¿Qué hay en bitácora de un cliente? | Parcial | PARCIAL | Bitácora + entidades | `filterBitacoraByQuestion`, `resolveCommercialEntitiesForQuestion` | Fuera de 3 meses / 30 sesiones | Medio |
| ¿Cómo va Mejora Continua del mes? | Parcial | PARCIAL | MC | `loadMejoraContinuaForChat` / `GET /api/director-ia/mejora-continua` | Áreas no enfocadas por regex | Medio |
| ¿Qué clientes dejaron de comprar? | Parcial | PARCIAL | commercial_state | `loadCommercialStateForChat` | >20 clientes; GA bloqueado; **no** es expediente_comercial | Medio |
| ¿Qué sabemos comercialmente / expediente de Cliente X? | Sí (factual; un cliente; no causa) | PARCIAL | Expediente comercial | `loadCommercialDossierForChat` / `get_commercial_dossier` (SELECT-only) | Cliente ambiguo (clarifica); comentarios sin `cliente_key`; overflow 8/500/8/8; bitácora; causalidad | Alto si se lee como causa, solución, bitácora o lista de clientes |
| ¿Qué alias tiene una entidad? | Sí (API/UI) | PARCIAL | Entidades | `/api/director-ia/comercial-entidades*` | Si no está en catálogo | Bajo-Medio |
| ¿Qué documentos tiene / listar registros documentales de un folio? | Sí (solo metadata DB; no PDF/S3; no faltantes) | PARCIAL | Metadata `public.folio_archivos` | `loadFolioDocumentsMetadataForChat` / `get_folio_documents` (SELECT-only; **no** `/media`; **no** S3) | Contenido, URLs, documentos faltantes, cumplimiento | Alto si se lee como documentación completa o como «faltan documentos» |
| ¿Cómo cambió la clasificación de apoyos entre mes_a y mes_b? | Sí (matriz agregada; no Excel; no COMPARAR) | PARCIAL | Folios + `buildClasificacionMatrix` | `loadClasificacionApoyosForChat` / `get_clasificacion_apoyos_query` | COMPARAR; Excel; causa del delta; igualdad con totales M6 | Alto si se lee como desviación presupuestal o como M6/M5 |
| ¿Qué dicen las notas de la última revisión / de una revisión? | Sí (texto/autor/`created_at` de una revisión; no ítem) | PARCIAL | `arr.action_register_revision_notes` | `loadActionRegisterRevisionNotesForChat` / `get_action_register_revision_notes` | Revisión no identificada (clarifica); overflow >8; body >500 truncado; attachments | Alto si se lee como nota de ítem, acuerdo formal, Plaud, history M2 o comentario de folio |
| ¿De qué se compone la utilidad / resultado / compromiso IGF? | Sí (snapshot de 1 fila; hechos observados; no causa) | PARCIAL | `igf.compromiso_lines` | `extractIgfComposition` / `get_igf_snapshot` / `loadIgfCommitSnapshot` | UI/PATCH/versiones; recálculo; overlay; «cómo cambió venta/descuento/ingreso» es M9 | Alto si se lee como causa, problema, responsable, prioridad o tendencia |
| ¿Diagnóstico financiero de la planta / por qué cayó ingreso o margen? | Parcialmente (IGF+ARR+M9 juntos; una llamada OpenAI; no causa) | PARCIAL | Bloques `igf` / `arr` / `m9` | `loadFinancialDiagnosisForChat` / `assembleFinancialDiagnosisEvidence` | Causa confirmada; IES/N5; mismatch oculto; fuente faltante como resultado neutral | Alto si se lee como causalidad o como COMPLETE de M7/M8 |
| ¿Cómo va / diagnóstico de la planta (AR, DICF, bitácora, ARR, IGF, estado comercial)? | Parcialmente (seis fuentes; materialidad `kg_mes_real` + cobertura `cliente_key`; una llamada OpenAI; no causa; no M9; no N5) | PARCIAL | Bloques `action_register` / `dicf` / `bitacora` / `arr` / `igf` / `commercial_state` | `loadPlantDiagnosisForChat` / `assemblePlantDiagnosisEvidence` (SELECT-only CS; top-5; GA partial) | Causa confirmada; M9; IES/N5; MAT_*; parcial como completo; `SOURCE_RESTRICTED` como missing; forecast−real como pérdida | Alto si se lee como causalidad, dump AR, mandato o COMPLETE de módulos |
| ¿Qué clientes requieren mi atención primero? | Parcialmente (concentración kg + cobertura DICF; razones separadas; no causa) | PARCIAL | `arr.dicf_cliente_mes` (`kg_mes_real`) + `arr.dicf_acciones` (`cliente_key`) | `buildCommercialMateriality` / `applyDicfCoverageToMateriality` dentro de `plant_diagnosis` | Causalidad; join por nombre; responsable de caída; trade-off económico; desviación diaria; quién debe aportar dato si no hay vínculo físico | Alto si se lee como causa, como culpa, como N5 o como «forecast−real = pérdida» |
| ¿Cuánto hay de Taller en AT-15 / PT-03 en YYYY-MM? | Sí (detalle por unidad; no Excel; no duplicados) | PARCIAL | `public.folios.unidad` + categoría TALLER | `loadTallerAtForChat` / `get_taller_at` (SELECT-only) | Periodo ausente (clarifica); Excel; duplicados; «cómo va Taller» es AR; familia M4 | Alto si se lee como GASTOS, M4, Action Register, causa o responsable |
| ¿Qué te llama la atención? / ¿Por qué? (tras diagnóstico de planta) | Sí si hay `parent_intent` válido; requery; no dump AR | PARCIAL (continuidad efímera; no módulo) | Pack fresco `plant_diagnosis` + `HILO` | `resolveConversationTurn` / `inheritParentIntent` / `loadPlantDiagnosisForChat` | Sin estado válido clarifica; no hereda periodo ni tema apilado | Alto si se lee el HILO como hecho de DB |
| ¿Y Arturo? / ¿Qué sabemos de él? / ¿Tiene alguna acción? | Sí si la entidad es **única** en la planta actual; ambiguo → clarifica | PARCIAL | Pack fresco + resolución de palabra completa | `resolveUniqueEntity` / `collectEntityCandidatesFromEvidence` | Fuzzy; Arturo de otra planta; varias coincidencias | Alto si se reutiliza entidad de planta anterior |
| ¿Qué falta saber? / ¿Quién puede darnos eso? / ¿Para qué lo necesitas? | Sí en la sesión: gap derivado del pack fresco; persona solo con vínculo físico. El gap objetivo puede persistirse como work item | PARCIAL | `pending_information_gap` del requery; opcional `arr.director_ia_pending_work_items` | `derivePendingInformationGap` / `upsertActiveWorkItem` | Inventar responsable; tratar el pendiente como hecho actual | Alto si se nombra persona sin acción ligada |
| ¿Qué pasó con Arturo? / ¿En qué quedó? / ¿Seguimos con…? (sesión nueva) | Sí si hay work item `active` del usuario+planta y SQL 017 está aplicado en ese entorno; requery+authz; memory ≠ evidence. Si la pregunta es **acción + responsable**, gana AR (`action_status`), no el resume genérico | PARCIAL (no módulo) | Work item + pack fresco; o board AR si hay intent específico | `classifyPersistentMemoryTurn` / `retrieveActiveWorkItems` / loaders; `handleActionStatusPersonChat` si `action_status` | Afirmar «sigue sin comprar» solo por memoria; cross-user/plant; entorno sin SQL 017; silent pick de acción | Alto si se lee el pendiente como estado del cliente o como culpa |
| ¿Recuerdas lo de ayer / de la otra sesión? (history completo / semantic memory) | No como transcript ni long-term semántico. Sí el **pendiente de trabajo** del first slice | PARCIAL / diferido | Solo `pending_work_items_only` | `lib/director-ia-persistent-memory.js` | Full history; summaries; preferencias; conclusiones validadas | Alto si se afirma memoria long-term de conversación |
| ¿Qué pasó con la acción de Julio Pérez? / ¿Qué acciones tiene [responsable registrado]? | Sí (board de la planta; 0/1/N; no culpa) | PARCIAL (transversal; M12 sigue PARCIAL) | Action Register board | `loadActionPersonBoardForChat` / `resolveActionPersonFocus` / `handleActionStatusPersonChat` | Motivo de retraso no registrado; scoring de personas; silent pick | Alto si se lee como culpable o se elige una acción en silencio |
| ¿Está vencida? / ¿Por qué no la cerró? / ¿Lo sabemos? / ¿Qué información falta? / ¿Qué necesitas de Julio? (tras acción/responsable) | Sí si `parent_intent = action_status`; requery; GPT formula. Sin motivo registrado: limitation + pedir actualización | PARCIAL (continuidad efímera) | Pack fresco AR + `HILO` | `inheritParentIntent` / `handleActionStatusPersonChat` | Inventar motivo; tratar responsable registrado como causa | Alto si se afirma culpa o se reusa evidencia del turno anterior |
| ¿Por qué bajó la venta ayer? / ¿Qué pasó ayer con la venta? / ¿Por qué vendimos menos ayer? | Sí (pack diario; no causa; no M9 mensual) | PARCIAL (transversal; no módulo) | `arr.ventas_diarias_cliente` + DICF/comments por `cliente_key` | `loadDailySalesDeviationForChat` / `assembleDailySalesDeviationEvidence` | Causa; día anterior como referencia; join por nombre | Alto si se lee contribución como causa o como `financial_diagnosis`/`delta_sales` |
| ¿Contra qué la comparas? / ¿Qué clientes explican más? / ¿Y por canal? (tras venta ayer) | Sí si `parent_intent = daily_sales_deviation`; requery; `active_date` efímero | PARCIAL (continuidad efímera) | Pack fresco diario + `HILO` | `resolveConversationTurn` / `inheritParentIntent` / loader diario | Tratar `active_date` como memoria persistente; HILO como hecho | Alto si se afirma causa o se reusa fecha cross-session |
| ¿Sabemos por qué? / ¿Qué falta investigar? / ¿Quién puede aclararlo? (tras venta ayer) | Sí: huecos del pack fresco; persona solo con vínculo físico a acción | PARCIAL | `information_gaps` del requery | `derivePendingInformationGap` / pack diario | Inventar responsable de la caída; persistir la fecha diaria | Alto si se nombra culpa o se trata el gap como «no hay causa» |
| ¿Por qué subió el descuento/kg ayer? / ¿Cómo estuvo el descuento por kg ayer? / ¿Qué pasó ayer con el descuento? / ¿Quién movió más el descuento/kg ayer? | Sí (pack diario ponderado; no causa; no M9 mensual; no canal) | PARCIAL (transversal; no módulo) | `arr.descuentos_diarios_cliente` + `arr.ventas_diarias_cliente` + DICF/comments por `cliente_key` | `loadDailyDiscountDeviationForChat` / `assembleDailyDiscountDeviationEvidence` | Causa; canal; mix/rate; average-of-averages; join por nombre | Alto si se lee contribución como causa o como `delta_discount`/`financial_diagnosis` |
| ¿Contra qué lo estás comparando? / ¿Quién movió más el promedio? / ¿Fue general? (tras descuento/kg ayer) | Sí si `parent_intent = daily_discount_deviation`; requery; `active_date` efímero | PARCIAL (continuidad efímera) | Pack fresco diario + `HILO` | `resolveConversationTurn` / `forceIntent` diario / loader diario | Tratar `active_date` como memoria persistente; HILO como hecho; ratio alto como mayor mover | Alto si se afirma causa o se reusa fecha cross-session |
| ¿Sabemos por qué? / ¿Qué falta? / ¿Quién puede aclararlo? (tras descuento/kg ayer) | Sí: huecos del pack fresco; persona solo con vínculo físico a acción | PARCIAL | `information_gaps` del requery | `derivePendingInformationGap` / pack diario | Inventar causa; persistir la fecha diaria; culpar al responsable de una acción | Alto si se nombra culpa o se trata el gap como «no hay causa» |
| ¿Cómo nos fue ayer? / ¿Qué tal estuvo ayer? / Dame el resumen de ayer. / ¿Qué panorama tuvimos ayer? (ejemplos de intención, no phrasebook) | Sí (`daily_executive_brief`; venta + descuento/kg; no exige nombrar métrica) | PARCIAL (transversal; no módulo) | Packs diarios compuestos, misma planta/fecha | `loadDailyExecutiveBriefForChat` / `isDailyExecutiveBriefQuestion` | Causa; buen/mal día programado; ingreso diario | Alto si se fusionan gaps o se afirma causalidad |
| ¿Qué te llama la atención? / ¿Qué más ves? / ¿Qué debería revisar? / ¿Qué sigue sin explicación? (tras brief) | Sí si `parent_intent = daily_executive_brief`; requery; GPT | PARCIAL (continuidad efímera) | Pack fresco del brief + `HILO` | `inheritParentIntent` / loader brief | Degradar a una sola métrica; clarificar de más | Alto si se trata el HILO como hecho |
| ¿Y la venta? / ¿Y el descuento? (tras brief) | Sí: cross-metric B; misma `active_date`; pack destino fresco | PARCIAL | Loader de la métrica nombrada | `namedDailyMetricSignal` / `forceIntent` destino | Inventar ayer; evictir `previous_frame` del brief | Alto si se pierde la fecha o se reusa evidencia del brief |
| ¿Cómo vamos en CASA los últimos 3 meses? / ¿Cómo van los COMISIONISTAS? / ¿Qué tendencia trae CASA? (ejemplos de intención, no phrasebook) | Sí (`commercial_trend`; motor compartido con la gráfica; 30/90; OLS + top-6; no causa) | PARCIAL (transversal; no módulo) | `lib/commercial-trend-engine.js` | `loadCommercialTrendForChat` / `loadCommercialTrend` | Comments; causa; mes calendario; first-vs-last | Alto si se lee mover como causa o como M9 mensual |
| ¿Y COMISIONISTAS? (tras CASA 90d) | Sí: hereda 90; canal COMISIONISTA; fresh requery | PARCIAL (continuidad efímera) | Mismo motor, otro canal | `active_range_days` + `channel_switch` | Reusar la respuesta anterior como evidencia; cambiar a mes calendario | Alto si se mezcla CASA+COMISIONISTA en `ambos` |
| Compáralos. (tras CASA y COMISIONISTA) | Sí: dos llamadas; mismo rango; dos pendientes | PARCIAL | Dos `loadCommercialTrend` | `comparison` / `channel=both` | Usar agregado `ambos` como veredicto; afirmar por qué un canal se movió | Alto si se afirma causalidad entre canales |
| ¿Quién explica más la caída? / Háblame del primero. (tras tendencia) | Sí: mayor mover matemático; handoff canónico si es único | PARCIAL | Top-6 del motor + `cliente_key` si existe | `pickFirstMover` / resolución canónica | Causa; join por `cliente_nombre`; reusar points/OLS como perfil | Alto si «explica» se lee como causa |
| ¿Qué sabemos de él? (tras mover + `cliente_key`) | Sí (`client_profile`; requery fresco; no reusa evidencia de trend) | PARCIAL (transversal; no módulo) | Ventas/descuento mensuales + comments/DICF keyed | `loadClientProfileForChat` / `assembleClientProfilePack` | Ingreso actual; causalidad; Action Register de cliente | Alto si se reusa trend como evidencia de cliente |
| ¿Cómo ha comprado estos tres meses? / ¿Qué descuento tuvo cada mes? / ¿En qué mes compró más? / ¿En qué mes tuvo más descuento? / ¿Ese mes también compró más? (tras perfil) | Sí: conservan `cliente_key` / planta / `active_period_months`; requery; kg=`SUM`; descuento=`SUM(monto)/SUM(kg)` | PARCIAL (continuidad efímera) | Mismos meses alineados | `inheritParentIntent` / loader perfil | 90d trailing; AVG de ratios; causalidad temporal | Alto si coincidencia = causa o si mes PARTIAL se lee COMPLETE |
| ¿Qué comentarios tenemos? / ¿Tiene acciones? / ¿Qué pasó con esas acciones? (tras perfil) | Sí: comments/DICF **solo** `cliente_key`. Comentario ≠ causa. Acción ≠ resultado. AR **sin** join | PARCIAL | `arr.cliente_comentarios` + `arr.dicf_acciones` | same loader; `supported: false` en AR | Join por nombre; Action Register de cliente; causa/resultado | Alto si comentario = causa o acción = resultado |
| ¿Cuánto ingreso generó? (tras perfil) | Limitation explícita: actual monthly client income = **UNSUPPORTED_METRIC**. No 0. No disfrazar forecast DICF | PARCIAL (limitación documentada) | Ninguna fuente de ingreso mensual actual | flag `UNSUPPORTED_METRIC` | Fórmula `kg_forecast × (margen − \|descuento\|)` como actual | Alto si se etiqueta forecast como ingreso generado |
| ¿Qué podemos recortar de apoyos? / ¿Cuáles todavía podemos detener? (tras IGF mes actual) | Sí (read-only; same plant/`mes_cargo`; Folios fresco; reglas reales de cancelación) | PARCIAL (transversal; M2/M7 siguen PARCIAL) | `public.folios` + snapshot IGF | `loadIgfReviewableSupportsForChat` / `get_igf_reviewable_supports` | Closed-month; writes; que no depositado = recortable | Alto si se lee como orden de cancelar o como ahorro |
| ¿Cuánto suman? / ¿Cuáles ya no puedo cancelar? / ¿Cuáles ya están depositados/cerrados? (tras apoyos reviewable) | Sí si `parent_intent = igf_reviewable_supports`; requery; depósito/cierre = estatus, no cheques | PARCIAL (continuidad efímera) | Pack fresco reviewable + `HILO` | `inheritParentIntent` / loader reviewable | Caer a cheques; reusar evidencia IGF como Folios | Alto si se afirma cheque emitido o materialización contable |
| Si canceláramos los reviewable, ¿cómo quedaría el IGF? | Sí como **ESCENARIO HIPOTÉTICO** (overlay live en memoria; no DB write) | PARCIAL (transversal) | Snapshot IGF + cubos de Folios reviewable | `loadIgfReviewableSupportsForChat` (`recalcularUtilYResultado` en memoria) | Ahorro realizado; cash; mejora real garantizada; persistir escenario | Alto si se lee como forecast oficial o como cambio real |
| ¿Cuáles revisarías primero? / ¿Qué riesgo tendría cancelar esos? | Ranking por importe = para revisión. Riesgo: si falta join folio→cliente→venta, dice qué falta | PARCIAL | Pack fresco + limitations | GPT sobre pack; no motor de riesgo | Recomendar cancelar; inventar riesgo comercial; ROI automático | Alto si se convierte el ranking en mandato de cancelación |

---

## Parte 5 — Matriz de veracidad

| # | Caso | Estado interno sugerido | Texto de respuesta permitido | Texto de respuesta prohibido | Acción siguiente recomendada |
|---|------|-------------------------|------------------------------|------------------------------|------------------------------|
| 1 | Fuente integrada y dato encontrado | `OK_CON_EVIDENCIA` | Citar hechos del contexto (tema, responsable, cliente, mes) y la fuente usada (AR/DICF/bitácora/IGF…). | Afirmar cobertura de módulos no presentes en `sources`/anexos. | Ofrecer detalle del mismo dominio. |
| 2 | Fuente integrada y dato no encontrado | `OK_SIN_DATOS` | «No encuentro [X] en [fuente] para esta planta/periodo.» | «No existe en la empresa» / inventar valores. | Pedir otro identificador o ampliar periodo. |
| 3 | Fuente parcialmente integrada | `PARCIAL` | «Puedo ver un resumen limitado (p. ej. top N / últimos 3 meses / on-demand).» | Presentar el resumen como inventario completo. | Indicar límite (10 overdue, 40 DICF, 80 comentarios, etc.). |
| 4 | Fuente no integrada | `NO_DISPONIBLE` | «Esa información está en el dashboard ([módulo]) pero no forma parte de las fuentes de Director IA.» | Contestar con conjeturas desde comentarios u otras fuentes. | Remitir a pantalla/endpoint humano. |
| 5 | Usuario sin permiso | `FORBIDDEN` | «No tienes acceso a esta planta/KPI.» (como ya hacen gates 403) | Filtrar datos de otra planta «por ayudar». | Usar token/planta autorizada. |
| 6 | Error de consulta | `ERROR_FUENTE` | «No pude cargar [fuente]: [error seguro].» | Inventar KPIs «aproximados». | Reintentar; revisar logs `[Director IA …]`. |
| 7 | Datos contradictorios | `CONFLICTO` | Exponer ambas evidencias (p. ej. bitácora más reciente vs DICF) y pedir criterio. | Elegir una sin declarar el conflicto. | Priorizar regla ya existente (`shouldPrioritizeBitacoraOverDicf`) y declararla. |
| 8 | Periodo no especificado | `PERIODO_IMPLICITO` | Declarar el periodo usado (mes CDMX / ventana 3 meses). | Hablar de «este año» sin anclar. | Confirmar mes con el usuario. |
| 9 | Planta no especificada | `PLANTA_REQUERIDA` | «Necesito la planta (`planta_id`).» | Responder con datos de otra planta. | Exigir planta (como context). |
| 10 | Entidad ambigua | `AMBIGUO` | Listar candidatos de `comercial_entidad` / alias y pedir desambiguación. | Asumir el primer match sin decirlo. | Usar `resolveCommercialEntity` / search alias. |
| 11 | Datos desactualizados | `STALE_POSIBLE` | Advertir que ARR/IGF dependen de última carga/versión. | Garantizar «tiempo real absoluto». | Indicar revisar `arr.upload_log` / versión IGF en UI. |
| 12 | Resultado calculado | `CALCULADO` | Marcar como cálculo (`computeDicf`, margen $/kg, deltas). | Presentarlo como campo crudo de tabla. | Mostrar insumos (venta vs descuento) si están en anexo. |
| 13 | Hipótesis sin evidencia suficiente | `HIPOTESIS` | «Con el contexto disponible no hay evidencia suficiente; hipótesis: …» | Afirmar causa raíz. | Pedir bitácora/DICF/periodo o abrir módulo no integrado. |
| 14 | History / HILO / claim previo | `CONVERSACION_NO_EVIDENCIA` | Usar el HILO solo para anclar el follow-up. Hechos = requery del turno. | Tratar un mensaje anterior (user o assistant) como fila de DB o como evidencia. | Revalidar authz/planta/entidad; requery. |
| 15 | Motivo de no-cierre AR ausente | `OK_SIN_DATOS` / limitation | Decir que no hay explicación registrada del retraso; citar status/fecha/vencimiento/responsable si existen; pedir la actualización que falta. | «Julio no la cerró porque no dio seguimiento»; incumplió; causó el atraso o el problema. | Pedir actualización al responsable **registrado** de la acción (vínculo físico; no culpa). |

---

## Parte 6 — Lectura contra ejecución

Leyenda: **A** lectura inicial · **B** con confirmación humana · **C** no permitida para Director IA · **D** decisión de negocio pendiente

| Operación | Clase | Permiso(s) en `usuario-permisos.js` | Evidencia / nota |
|-----------|-------|-------------------------------------|------------------|
| Crear folio | C (hoy); B si algún día se expone | `acceso_crear_folios` | API `POST /api/folios` existe; no tool IA |
| Editar folio | C / B futuro | `acceso_editar_folio` | `PATCH /api/folios/:id` |
| Mover etapa | C / B futuro | `acceso_mover_folio_arrastre`, `acceso_avanzar_etapa` | mover/avanzar endpoints |
| Aprobar folio | C / B futuro | `acceso_aprobar_folios` | `POST .../aprobar` |
| Aprobar comprobaciones | C / B futuro | `acceso_aprobar_comprobaciones` | `POST .../aprobar-comprobaciones` |
| Cancelar folio | C / B futuro | `acceso_cancelar_folio_dashboard`, `acceso_solicitar_cancelacion`, `acceso_aprobar_cancelacion` | cancelar + duplicados UI |
| Marcar prioridad | C / B futuro | `acceso_marcar_urgente` | `PATCH .../prioridad` |
| Asignar mes de cargo | C / B futuro | `acceso_asignar_mes_cargo` | campos mes en folio |
| Subir póliza | C / B futuro | `acceso_subir_poliza` | `POST .../poliza` |
| Crear comentario | D (cliente/folio); B si vía IA | (dashboard comentarios; no clave específica listada como `acceso_comentario`) | `createClienteComentario` / comentarios folio API; chat hoy no crea |
| Crear proyecto | C / B futuro | (no hay clave dedicada en catálogo listado) | `POST /api/proyectos` |
| Modificar presupuesto | C / D | (roles GG / flujos bot) | tablas `presupuesto_*` |
| Enviar solicitud a cheques | C / D | `acceso_avanzar_etapa` (avance a cheque) | flujo etapas + WhatsApp |
| Cambiar permisos de usuario | C | unlock admin + `/api/usuarios-admin*` | Fuera de Director IA; riesgo ALTO |
| Descargar o mostrar documentos | A (lectura metadatos) futuro; B (exponer URL); C (exfiltrar masivo) | `acceso_ver_imprimir_folios` | Endpoints documento/media no cableados |
| Consultar Action Register / DICF / bitácora | A | `acceso_acciones_dicf` + planta | Ya existe |
| Consultar IGF/ARR on-demand | A | gates financieros / no GA en commercial_state | Ya existe en chat |
| Crear/editar bitácora o entidad | B (UI humana ya lo hace vía API); C desde chat autónomo sin confirmación | Flag Director IA + JWT | Endpoints `/api/director-ia/bitacora`, `/comercial-entidades` |
| Enviar WhatsApp masivo / test Delta AI | C | N/A (rutas test) | `/api/ai/delta-ingreso/test/*` |
| Cargar ARR / COMPARAR actualizar folios | C / D | Auth + claves privadas | Mutación masiva |

### Nunca debería ejecutar sin confirmación humana

Cualquier operación de clase **B** o **C** que cambie dinero, estatus de folio, presupuesto, permisos, envíos WhatsApp o documentos. El chat actual (`askDirectorIa`) es de **lectura/síntesis**; las escrituras del módulo se hacen por API UI explícita (bitácora/entidades), no como tool autónomo del LLM.

---

## Parte 7 — Prioridad de integración

Escala 1–5. Prioridad derivada de: valor ejecutivo × disponibilidad de funciones existentes ÷ (complejidad × riesgo), según auditoría.

### Integraciones de lectura

| Módulo / fuente | Valor ejecutivo | Calidad/disponibilidad datos | Complejidad técnica | Riesgo seguridad | Dependencias previas | Prioridad sugerida |
|-----------------|-----------------|------------------------------|---------------------|------------------|----------------------|--------------------|
| Folios/Kanban (lectura estatus) | 5 | 5 (API kanban/folios) | 3 (`server.js` monolítico) | 3 | Auth planta, permisos ver | **Alta** |
| Historial folio | 4 | 5 (timeline) | 2 | 3 | Folios | **Alta** |
| Documentos/medios (metadatos) | 4 | 4 | 3 (S3 URLs) | 4 | Folios, `acceso_ver_imprimir_folios` | **Media-Alta** |
| IGF/ARR en GET context (no solo regex) | 5 | 4 (ya hay annex) | 2 | 3 | Igualar sources chat/context | **Alta** |
| commercial_state en GET context | 5 | 4 | 2 | 3 | GA/GV gates | **Alta** |
| Delta Venta/Descuento/Ingreso | 4 | 4 (endpoints) | 3 | 3 | ARR | **Media** |
| GASTOS/INVERSIONES (query, no solo xlsx) | 4 | 4 | 3 | 3 | Folios; query JSON ya en PARCIAL M6 | **Hecha (PARTIAL)**; Export/xlsx sigue fuera |
| Taller por AT (query JSON por unidad) | 3 | 4 | 3 | 3 | Folios; query JSON ya en PARCIAL M5 | **Hecha (PARTIAL)**; Excel/workbook/duplicados siguen fuera |
| Duplicados (`folio-duplicados`) | 3 | 4 | 2 | 3 | Folios | **Media** |
| Presupuesto semanal | 4 | 4 | 3 | 3 | Folios; query JSON ya en PARCIAL M18 | **Hecha (PARTIAL)**; writes/cheques/WhatsApp siguen fuera |
| Proyectos | 3 | 4 | 2 | 2 | Plantas | **Media-Baja** |
| Clasificación de apoyos (solo lectura matriz) | 3 | 4 | 3 | 3 | Folios; query JSON ya en PARCIAL M4 | **Hecha (PARTIAL)**; COMPARAR/Excel siguen fuera |
| Weekly discount LD | 2 | 3 | 2 | 2 | ARR, Twilio | **Baja** |
| Health | 1 | 5 | 1 | 1 | Ninguna | **Baja** |
| Usuarios admin (lectura) | 2 | 5 | 2 | 5 | Unlock/clave | **Baja** (riesgo alto) |
| Delta Ingreso AI test | 1 | 2 | 2 | 5 | Sistema paralelo | **No priorizar** (C) |
| Home KPI como página | 2 | 3 | 1 | 2 | Ya cubierto por M7/M11 | **Baja** (INDIRECTA) |

### Integraciones analíticas

| Capacidad analítica | Valor | Datos | Complejidad | Riesgo | Dependencias | Prioridad sugerida |
|---------------------|-------|-------|-------------|--------|--------------|--------------------|
| Unificar sources GET context = chat (IGF/ARR/commercial_state) | 5 | 4 | 2 | 2 | `EMPTY_SOURCES`, `askDirectorIa` | **Alta** |
| Diagnóstico planta multi-fuente con límites declarados | 5 | 4 | 3 | 3 | AR+DICF+IGF+ARR | **Alta** |
| Descomposición venta vs descuento vs ingreso | 5 | 4 | 3 | 3 | Reutilizar delta-* o annex | **Alta** |
| Detección duplicados on-demand en chat | 3 | 4 | 2 | 3 | `folio-duplicados.js` | **Media** |
| Narrativa weekly discount bajo demanda | 2 | 3 | 2 | 2 | weekly-discount-* | **Baja** |
| Cruzar bitácora + DICF + commercial_state (ya parcial) | 4 | 4 | 2 | 2 | Routing regex actual | **Media** (mejorar veracidad) |

### Integraciones transaccionales

| Operación | Valor | Datos | Complejidad | Riesgo | Dependencias | Prioridad sugerida |
|-----------|-------|-------|-------------|--------|--------------|--------------------|
| Crear comentario (con confirmación) | 3 | 4 | 2 | 3 | APIs comentarios | **Media** (solo B) |
| Mutar Action Register / DICF desde chat | 3 | 4 | 4 | 5 | Permisos + confirmación | **Baja** hasta marco B |
| Aprobar/mover/cancelar folio desde chat | 4 | 5 | 4 | 5 | Permisos folios | **No sin decisión D + B** |
| Modificar presupuesto / cheques | 4 | 3 | 5 | 5 | Bot + tablas | **No sin decisión D** |
| Cambiar permisos usuario | 1 | 5 | 2 | 5 | usuarios-admin | **C — no integrar** |
| Enviar WhatsApp / test Delta AI | 1 | 2 | 2 | 5 | Twilio | **C — no integrar a Director IA** |

**Nota:** No se genera calendario. La prioridad refleja reutilización de código existente y riesgo observado en la auditoría, no preferencias de producto nuevas.

---

## Parte 8 — Hallazgos críticos

### 1. `server.js` monolítico

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | Auditoría: lógica de folios, kanban, ARR, IGF, WhatsApp y registro de ~100+ rutas Express en un solo archivo `server.js` (~20k líneas). |
| **Impacto posible** | Expansión de Director IA requiere tocar un archivo de alto acoplamiento; mayor riesgo de regresiones. |
| **Dominios afectados** | M2–M20 prácticamente todos. |
| **¿Bloquea expansión de Director IA?** | No bloquea lectura vía nuevos libs; sí encarece wrappers seguros. |
| **Información adicional para confirmar** | Mapa exacto de qué handlers ya exportan helpers inyectables vs lógica inline. |

### 2. Routing de Director IA por regex

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | `lib/director-ia-chat.js`, `lib/director-ia-planner.js`, `lib/director-ia-conversation-state.js`, `lib/director-ia-daily-deviation.js`, `lib/director-ia-daily-discount.js`, `lib/director-ia-daily-executive-brief.js`, `lib/director-ia-action-person.js`, `lib/director-ia-igf-arr.js` (`IGF_SIGNAL_RE`, `ARR_SIGNAL_RE`, `PLANT_FINANCIAL_KPI_RE`), `isCommercialStateListQuestion`, etc. El intent `daily_sales_deviation` gana para venta + **ayer** y **no** cae a `financial_diagnosis` ni a `delta_sales` mensuales. El intent `daily_discount_deviation` gana para descuento/kg + **ayer** y **no** cae a `delta_discount` ni a `financial_diagnosis` mensuales. El intent `daily_executive_brief` gana para panorama diario **sin** métrica nombrada (first slice B; no phrasebook; no `plant_diagnosis`). El intent `financial_diagnosis` ya no cae a un solo `delta_*` ni al annex IGF/ARR exclusivo: ensambla IGF+ARR+M9. El intent `plant_diagnosis` ya no cae al dump JSON de Action Register: ensambla AR+DICF+bitácora+ARR+IGF+CS SELECT-only (**sin M9**) y, sobre ese pack, materialidad `kg_mes_real` + concentración top-5 + cobertura DICF por `cliente_key`. Consultas naturales de **acción/responsable** rutean al intent existente `action_status` (estrategia **C**; `accion`/`acciones`; resolución física 0/1/N; inheritable; AR específico gana sobre resume genérico de memoria). **Estrategia B:** `unknown` + estado válido hereda `parent_intent` (requery + GPT); standalone **siempre gana**; `unknown` sin estado válido clarifica; **no** cae al dump AR. **No** phrasebook nuevo. **No** intent nuevo. Hold-outs de follow-up viven en tests. `igf_status` / `arr_status` / `delta_*` / `financial_diagnosis` / `plant_diagnosis` / `daily_sales_deviation` / `daily_discount_deviation` / `daily_executive_brief` / `action_status` / `commercial_state` (listas) / M6 / M11 / M12 / M18 se preservan. |
| **Impacto posible** | Preguntas legítimas pueden no activar la fuente correcta fuera de `financial_diagnosis` / `plant_diagnosis` si no hay hilo heredable. El listado de folios GASTOS/INVERSIONES ya va a M6; «cómo van los gastos» / margen / rentabilidad pueden ir a `financial_diagnosis` o al annex IGF según wording. Export/xlsx sigue fuera. |
| **Dominios afectados** | M6, M7, M8, M9, M11, M12, M13. |
| **¿Bloquea expansión?** | No; aumenta riesgo de veracidad al añadir fuentes. |
| **Información adicional** | Cobertura de tests de routing (no inventariados como suite dedicada en esta auditoría). |

### 3. Historial de chat no persistente (continuidad efímera + pending work items)

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | Continuidad **efímera**: `askDirectorIa` reconstruye `structured_conversation_state` (`lib/director-ia-conversation-state.js`), incluido `active_date` efímero en hilos `daily_sales_deviation` y `daily_discount_deviation` y entidades `ar_responsable` / `ar_action` en hilos `action_status`. **Estrategia B:** unknown + estado válido hereda; standalone gana; unknown sin estado clarifica. **No hay tabla de transcript.** **No** hay memoria persistente de fecha diaria. First slice persistente: `arr.director_ia_pending_work_items` + `lib/director-ia-persistent-memory.js`. Un intent AR específico gana sobre resume genérico («¿Qué pasó con la acción de Julio Pérez?» → AR; «¿Qué pasó con Arturo?» puede retomar memoria). OpenAI recibe `HILO` y, en retoma, `PENDIENTE DE TRABAJO`; no history crudo. Hold-outs de follow-up están en tests, no en routing. |
| **Impacto posible** | Hilo dentro de la sesión. Entre sesiones solo se recuerda **trabajo pendiente** (si SQL 017 está aplicado en el entorno). No hay auditoría persistente de respuestas. |
| **Dominios afectados** | M13 (chat). **No** cambia etiqueta de módulo. |
| **¿Bloquea expansión?** | No para lectura de negocio. Full history / semantic memory siguen diferidos. |
| **Información adicional** | El FE envía `history.slice(-8)`. Eso no autoriza tratar history como hecho de DB. `repository capability = IMPLEMENTED`; `environment activation = PENDING UNTIL SQL 017 APPLIED`. |

### 4. Diferencia entre fuentes del GET context y del chat

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | `EMPTY_SOURCES`: `igf`, `arr`, `commercial_state` inician y permanecen `false` en `buildDirectorIaContextPayload`; chat llama `loadIgfArrAnnexForChat` / `loadCommercialStateForChat` on-demand. Los packs `financial_diagnosis` y `plant_diagnosis` tampoco marcan GET `sources.igf` / `sources.arr` / `sources.commercial_state`. |
| **Impacto posible** | UI/context reporta fuentes incompletas respecto a lo que el chat realmente usa. |
| **Dominios afectados** | M7, M8, M11, M13. |
| **¿Bloquea expansión?** | No; genera inconsistencia de contrato. |
| **Información adicional** | Consumidores FE de `sources.*` en `modules/director-ia`. |

### 5. DDL disperso entre `server.js`, `sql/` y `lib/`

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | Auditoría Anexo A: CREATE en server, `sql/012+`, `lib/dicf-acciones.js`, `lib/cliente-comentarios.js`, `lib/delta-ingreso-ai-db.js`. |
| **Impacto posible** | Dificulta saber qué tablas existen en un entorno dado. |
| **Dominios afectados** | M11, M13, M19, ARR, IGF. |
| **¿Bloquea expansión?** | Parcialmente (ambigüedad de esquema). |
| **Información adicional** | Inventario runtime vs migraciones aplicadas en cada ambiente. |

### 6. Endpoints Delta Ingreso AI de prueba aparentemente sin middleware

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | Auditoría M19; rutas `/api/ai/delta-ingreso/test/*` registradas sin `dashboardAuthMiddleware` en el inventario. |
| **Impacto posible** | Envío de mensajes / exposición de estado sin auth dashboard. |
| **Dominios afectados** | M19; reputación del proceso Node compartido con Director IA. |
| **¿Bloquea expansión?** | No de lectura Director IA; sí es riesgo de seguridad del host. |
| **Información adicional** | Controles de red / secretos adicionales no visibles en repo. |

### 7. Claves privadas en query string

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | Auditoría M4/M5/M6/M14: `priv_clave`, `USUARIOS_ADMIN_CLAVE` / `Tomza-Priv` en flujos Excel/admin. |
| **Impacto posible** | Fuga en logs, historial de navegador, proxies. |
| **Dominios afectados** | Clasificación, Taller, GASTOS/INVERSIONES, usuarios admin. |
| **¿Bloquea expansión?** | No; condiciona cómo una herramienta IA podría pedir privados (no debería reenviar claves). |
| **Información adicional** | Si hay rotación/telemetría de query strings. |

### 8. Tokens JWT en URL

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | `dashboardAuthMiddleware` acepta `?t=`; WhatsApp genera links con token; `createDashboardToken`. |
| **Impacto posible** | Tokens compartibles / filtrables. |
| **Dominios afectados** | M0, M17, todo dashboard. |
| **¿Bloquea expansión?** | No. |
| **Información adicional** | TTL exacto y revocación (auditoría menciona ~20h en mensajes WhatsApp). |

### 9. Dos sistemas de IA paralelos

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | Director IA (`lib/director-ia-*.js`) vs Delta Ingreso AI (`lib/delta-ingreso-ai*.js`) en el mismo proceso. |
| **Impacto posible** | Respuestas divergentes sobre ingreso; costos OpenAI duplicados; confusión operativa. |
| **Dominios afectados** | M13, M19, M9. |
| **¿Bloquea expansión?** | No técnicamente; sí conceptualmente si no se delimita. |
| **Información adicional** | Si Delta Ingreso AI está activo en producción (`AI_ENABLED` / schedulers). |

### 10. Presupuestos con modelo de datos amplio pero UI limitada

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | Query read-only M18 integrada (`loadPresupuestoSemanalForChat` sobre `presupuestos_semanales` + `presupuesto_folios`). Siguen existiendo otras tablas `presupuesto_*` (asignación mensual, solicitudes) y el bot WhatsApp. |
| **Impacto posible** | Confundir el carro semanal con `presupuesto_asignacion_detalle`, cheques o el canal WhatsApp. |
| **Dominios afectados** | M18, M2 (carro). |
| **¿Bloquea expansión?** | No para la query del carro. Sí para writes, cheques y Twilio/WhatsApp (fuera de PARTIAL). |
| **Información adicional** | Flujos WhatsApp carrito y estados canónicos siguen fuera de Director IA. |

### 11. Tres mecanismos distintos para detectar duplicados

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | Auditoría M5/M16: check al crear, análisis modal (`folio-duplicados.js`), hoja Excel Taller. El chat M16 declara el detector del modal: `findDuplicatePairs` (umbral 0.72). |
| **Impacto posible** | Respuestas IA inconsistentes si se envolviera otro detector (check al crear o Excel Taller). |
| **Dominios afectados** | M5, M16, M2. |
| **¿Bloquea expansión?** | No; el detector de M16 chat ya está declarado. |
| **Información adicional** | Paridad de umbrales entre los tres (pendiente). |

### 12. Ausencia de hooks, providers o estado global compartido

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | Auditoría Anexo D: sin `hooks/`, `context/`, `createContext`. |
| **Impacto posible** | FE Director IA y dashboard no comparten cache de fuentes; más llamadas repetidas. |
| **Dominios afectados** | Frontend M13 y resto. |
| **¿Bloquea expansión?** | No (backend-first). |
| **Información adicional** | N/A. |

### 13. Flags frontend y backend potencialmente desalineados

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | FE `modules/director-ia/lib/is-enabled.ts` (build) vs BE `isDirectorIaEnabled()` / `ENABLE_DIRECTOR_IA`; chat también `AI_ENABLED` + `OPENAI_API_KEY`. |
| **Impacto posible** | UI visible con API 200 `{enabled:false}` o chat fallido. |
| **Dominios afectados** | M13, M17. |
| **¿Bloquea expansión?** | Operativamente sí hasta alinear flags. |
| **Información adicional** | Valores reales de entorno por deployment (no están en repo). |

---

## Parte 9 — Resultado final

### 1. Resumen de cobertura real actual

Director IA hoy es un **asistente de lectura/síntesis** centrado en **Action Register**, **DICF**, **bitácora**, **comentarios** (cliente y folio) y **entidades comerciales**, con **anexos financieros on-demand** (IGF/ARR/margen/estado comercial) activados por **regex** en el chat, **diagnóstico financiero multi-fuente** en el chat legado (`financial_diagnosis` → `loadFinancialDiagnosisForChat` / `assembleFinancialDiagnosisEvidence`: bloques IGF + ARR + M9 con provenance separada; periodos reales; mismatch visible; authz más restrictiva; una llamada OpenAI; `openai_call_count = 1`; GA puede abortar sin llamar; no causalidad; no IES; no Reasoning Engine N5; no puntúa módulos), **diagnóstico de planta multi-fuente** en el chat legado (`plant_diagnosis` → `loadPlantDiagnosisForChat` / `assemblePlantDiagnosisEvidence`: bloques action_register + dicf + bitacora + arr + igf + commercial_state SELECT-only `arr.dicf_cliente_mes`; slice `commercial_materiality_and_coverage`: `kg_mes_real` = kg observados del mes de la fila; concentración top-5 con denominador/periodo explícitos; cobertura DICF por `cliente_key` (patrón M11; no join por nombre); el chat legado puede sugerir textualmente qué revisar primero; **no** `kg_mes_forecast − kg_mes_real` como venta perdida; **sin M9**; **sin** `computeDicf`; provenance de seis bloques; `assembly_status` explícito; GA partial `SOURCE_RESTRICTED` en IGF/ARR/CS sin abortar el pack; mismatch de periodos visible; una llamada OpenAI; no causalidad; no IES; no N5; no Recommendation N5; no MAT_*; no mandato; no puntúa módulos), incluida la **composición observada de un snapshot IGF** (M7 slice: `get_igf_snapshot` / `loadIgfCommitSnapshot` / `extractIgfComposition`; 1 fila de `igf.compromiso_lines`; `*_kg` = $/kg; null ≠ 0; `hg_kg` no invertido; `gasto_kg` fuera de fórmula; no se ejecuta `recalcularUtilYResultado`; no overlay; no deltas — M9; composición ≠ causalidad), **análisis on-demand de posibles duplicados de folios** (M16: `findDuplicatePairs`, no confirmación), **consulta on-demand de KPIs de dashboard y proyectos por planta** (M3: `get_dashboard_kpis` / `get_project_status`; no catálogo global; no creación de proyectos), **consulta on-demand de Delta Venta / Descuento / Ingreso de periodos reales** (M9: `get_delta_sales` / `get_delta_discount` / `get_delta_income`; no forecast con escritura; no M19), **consulta on-demand de estatus/etapa de folio** (M2 slice `folio_status`: `get_folio_status` / `loadFolioStatusForChat`; SELECT-only; no GET kanban; no GET `/folios/:id`; no autoavance), **consulta on-demand del historial de folio** (M2 slice `folio_history`: `get_folio_history` / `loadFolioHistoryForChat`; SELECT-only de `public.folio_historial`; no GET `/timeline`; no `dedupeHistorialByStage`; no autoavance), **consulta on-demand de metadata documental de folio** (M2 slice `folio_documents`: `get_folio_documents` / `loadFolioDocumentsMetadataForChat`; SELECT-only de `public.folio_archivos` con proyección segura; no S3; no PDF; no `s3_key`; no «faltan documentos»), y **consulta on-demand de GASTOS e INVERSIONES de folios** (M6 slice query JSON: `get_expense_analysis` / `get_investment_analysis` / `loadGastosInversionesForChat`; SELECT `public.folios` + `expandCategoriaRows`; `YYYY-MM` obligatorio; no Excel; no Export; no IGF), y **consulta on-demand de Taller por AT** (M5 slice query JSON: `get_taller_at` / `loadTallerAtForChat`; SELECT `public.folios` con `categoria LIKE '%TALLER%'` + `expandTallerRows`; unidad = token de `public.folios.unidad` (`AT-15` / `PT-03`); **no** `at_id`; **no** catálogo; `YYYY-MM` obligatorio; no Excel; no workbook; no duplicados taller; no writes; «cómo va Taller» sigue Action Register; familia TALLER de M4 ≠ detalle por unidad), y **consulta on-demand de la matriz comparativa de clasificación de apoyos** (M4 slice query JSON: `get_clasificacion_apoyos_query` / `loadClasificacionApoyosForChat`; SELECT `public.folios` + `buildClasificacionMatrix`; `mes_a` vs `mes_b` obligatorios y distintos; GASTOS / INVERSIONES / TALLER separados; sin fallback a 6 plantas; no COMPARAR; no Excel), y **consulta on-demand del carro presupuestal semanal** (M18 slice query JSON: `get_budget_status` / `loadPresupuestoSemanalForChat`; SELECT `presupuestos_semanales` + `presupuesto_folios`; no inventa semana; no filtra solo `ABIERTO`; no writes; no cheques; no WhatsApp; no `presupuesto_asignacion_detalle`), y **consulta on-demand de notas de revisión del Action Register** (M12 slice: `get_action_register_revision_notes` / `loadActionRegisterRevisionNotesForChat`; SELECT `arr.action_register_revision_notes` por `revision_id`; 1 revisión / 8 notas / 500 caracteres; última = `revision_date DESC`; `includeNotes` del context sigue `false`; no ítem; no Plaud; no M2; no binarios), y **consulta on-demand del expediente comercial factual** (M11 slice: `get_commercial_dossier` / `loadCommercialDossierForChat`; authz planta antes de datos; cliente único; SELECT `arr.dicf_cliente_mes` sin `computeDicf`; comentarios solo con `cliente_key`; acciones por `planta_id` + `cliente_key`; historial/cierre por `accion_id`; 1/8/500/8/8; procedencia separada; sin causalidad; sin bitácora). **No** opera el kanban HTTP, **no** usa `/timeline` como transporte interno, **no** lee contenido PDF/S3/pólizas/cheques/COMPARAR-Excel de clasificación/taller/Export xlsx GASTOS-INVERSIONES ni el forecast mutante de ingreso. Las escrituras propias (bitácora/entidades) existen por **API UI**, no como tools autónomos del LLM. El GET `/api/director-ia/context` **subdeclara** IGF/ARR/commercial_state respecto al chat.

El chat legado mantiene **continuidad conversacional efímera** (`structured_conversation_state`) con **estrategia B**: planner aislado `unknown` + estado válido → hereda `parent_intent` → requery → HILO + evidencia fresca → GPT. Standalone siempre gana (también con «volvamos» / «retomemos»). Unknown sin estado válido clarifica; **no** fallback ciego a Action Register. **No** phrasebook nuevo. Hold-outs (`No te seguí`, `¿En qué sentido?`, `¿O sea?`, etc.) viven en **tests**, no en routing de producción. Demostrativos ≠ clientes. Pronombres solo con `active_entity` validada. Entidad nueva: resolución física; ambigua: clarificar; no fuzzy. `history != evidence`. OpenAI recibe `HILO`, no history crudo. GPT interpreta explicación, «qué más», consecuencias y gaps.

El chat legado integra **retorno de tema intra-sesión** (first slice **B**: exactamente un `previous_frame` efímero). Switch standalone → current mínimo pasa a previous → nuevo current. Retorno autocontenido: el turno basta («Volvamos a la venta de ayer.» = `daily_sales_deviation` 0.92). Retorno implícito: restaura prior compatible («Volvamos a Arturo.», «Retomemos la acción.», «Volvamos a Puebla.»). Restore ≠ fact: authz, planta, revalidación, **requery**, current evidence wins. Estrategia B sigue tras el restore. Persistent memory **no** navega temas. Un tema más antiguo que el único prior **no** se recupera en silencio. **No** topic stack. No puntúa módulos.

Además, el repositorio integra **memoria persistente `pending_work_items_only`**: pending gap + planta + entidad + intent + status en `arr.director_ia_pending_work_items`. **MEMORY ≠ CURRENT EVIDENCE.** Al retomar («¿Qué pasó con Arturo?») se revalida authz/planta/entidad y se hace requery. El `status` es del pendiente, no del cliente. No EKS / IES / N5. **Capacidad en repo = IMPLEMENTED. Activación de entorno = PENDING until SQL 017 applied.** Esta sync **no** ejecuta SQL 017. Las fechas diarias de `daily_sales_deviation`, `daily_discount_deviation` y `daily_executive_brief` **no** se persisten.

El chat legado integra **desviación diaria de venta** (`daily_sales_deviation` → `loadDailySalesDeviationForChat`: ayer `America/Mexico_City`; kg observados; referencia same-weekday 14 días con N explícito; delta kg/%; contribución cliente y canal; DICF + comments **solo** `cliente_key`; information gaps; HILO; una llamada OpenAI). **Contribución matemática ≠ causa.** Comentario ≠ prueba. Acción ≠ causa. Responsable de acción ≠ responsable de la caída. GPT conserva síntesis, explicación, qué llama la atención, qué sabemos / no sabemos, qué falta y follow-ups. Este slice de **venta** **no** calcula descuento/kg. No degrada M9 / `financial_diagnosis` / `plant_diagnosis`. No puntúa módulos.

El chat legado integra **desviación diaria de descuento/kg** (`daily_discount_deviation` → `loadDailyDiscountDeviationForChat`: ayer `America/Mexico_City`; `arr.descuentos_diarios_cliente` + `arr.ventas_diarias_cliente`; `SUM(monto)/SUM(kg)` — **no** average-of-averages; referencia pooled same-weekday 14 días `SUM(monto_ref)/SUM(kg_ref)` con N explícito; `contrib_i = monto_i_t/K_t − monto_i_r/K_r`; `SUM(contrib_i)` reconcilia `R_target − R_ref`; ratio alto ≠ mayor mover; **sin canal** / sin prorrateo; DICF + comments **solo** `cliente_key`; information gaps; HILO; una llamada OpenAI). **Contribución matemática ≠ causa.** Comentario ≠ causa. Acción ≠ causa. Responsable de acción ≠ responsable del alza. GPT interpreta; el runtime calcula fecha, math, joins, authz y provenance. No degrada M9 (`delta_discount` mensual **UNCHANGED**) / `financial_diagnosis` / `plant_diagnosis`. Mix/rate **diferido**. No puntúa módulos.

El chat legado integra **consultas Action Register por responsable/acción** (`action_status` → `loadActionPersonBoardForChat` / `resolveActionPersonFocus`: token `accion`/`acciones`; resolución física en el board; 0/1/N; status/fecha/vencimiento; historial-resultado si existe; limitations + provenance; HILO; GPT). Estrategia **C**. **No** intent nuevo. **No** phrasebook. `action_status` **inheritable**. AR específico gana sobre resume genérico de memoria. Responsable registrado ≠ culpable. Sin motivo registrado: GPT recibe limitation y no inventa. Fallo histórico `action_id=0` vs `null`: **CORREGIDO**. Suite vigente **814/814**. M12 **sigue PARCIAL**. No puntúa módulos.

El chat legado integra **brief ejecutivo diario** (`daily_executive_brief` → `loadDailyExecutiveBriefForChat`; first slice **B**): panorama abierto del día **sin** exigir venta o descuento; compone packs frescos de venta + descuento/kg, misma planta/fecha; provenance y gaps **separados**; partial-data (missing ≠ 0); una llamada OpenAI. Runtime aporta valores/referencias/deltas/contribuidores/evidencia/limitations. GPT decide qué destaca, si hay tensión, qué revisar y qué sigue sin explicación. **No** phrasebook. **No** buen/mal día programado. **No** causalidad. Precedencia: venta explícita y descuento explícito conservan sus intents. Open followups heredan brief. «¿Y la venta?» / «¿Y el descuento?» reutilizan cross-metric B. No puntúa módulos.

El chat legado integra **cross-metric follow-up diario** (`IMPL-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001`; estrategia **B** post-planner): parent diario + `active_date` válida + planner `unknown` + turno que nombra inequívocamente la otra métrica (`venta`/`descuento`) → intent destino, misma fecha revalidada, requery del pack destino, gap fresco. **Conservar fecha ≠ conservar métrica.** Sin `active_date` no se inventa ayer. Señal mensual no reusa la fecha diaria. Same-metric sigue estrategia B. `previous_frame` no decide el switch. Memoria persistente no participa. **No** phrasebook. **No** intent nuevo. GPT recibe el pack correcto + HILO. No puntúa módulos.

El chat legado integra **tendencia comercial de gráfica** (`commercial_trend` → `loadCommercialTrendForChat` / `loadCommercialTrend`; arquitectura **B**; first slice **B**): motor compartido `lib/commercial-trend-engine.js` también usado por `GET /api/arr/venta-serie`. Serie diaria + OLS (`x` = índice, `y` = `venta_ton`, `n<2` → null) + top-6 movers. Rangos 30/90 trailing anclados a `MAX(fecha)` (no hoy; no mes calendario). Canal: `LIKE '%comisionista%'` → COMISIONISTA; resto → CASA; alias COMISIONISTAS. Comparar = dos llamadas, mismo rango. Comments **fuera** del pack de chat. **Mover ≠ causa.** Estado = routing (`active_range_days` / `active_channel`); evidencia se requery. Handoff del primero si la resolución canónica es segura. **No** HTTP interno. **No** phrasebook. No puntúa módulos.

El chat legado integra **perfil longitudinal de cliente** (`client_profile` → `loadClientProfileForChat` / `assembleClientProfilePack`; source **B**; routing **B**): `cliente_key` obligatorio; mes calendario actual CDMX + 2 previos (actual **PARTIAL**; previos **COMPLETE**); **3 meses calendario ≠ 90d trailing**. kg = `SUM(kg)` por mes; descuento/kg = `SUM(monto)/SUM(kg)` del mismo mes (**no** AVG de ratios). Comments/DICF solo por `cliente_key`. Comentario ≠ causa. Acción ≠ resultado. `arr.action_register_items` **sin** `cliente_key` (no join inventado). Ingreso mensual actual = **UNSUPPORTED_METRIC** (la fórmula DICF **no** es actual; no 0; no disfrazar forecast). Handoff: `commercial_trend` → mover → `active_entity` → «¿Qué sabemos de él?» → requery fresco (no reusa evidencia de trend). Follow-ups conservan keys/planta/`active_period_months`. Coincidencia temporal ≠ causalidad. Partial-data: missing ≠ 0. **No** HTTP interno. **No** phrasebook. No puntúa módulos.

El chat legado integra **apoyos reviewable / contrafactual IGF** (`igf_reviewable_supports` → `loadIgfReviewableSupportsForChat`; first slice **C**): IGF mes actual → recortar apoyos → same plant + same `mes_cargo` + Folios fresco; clasificación por reglas reales de cancelación (no «no depositado = recortable»); list/totals; overlay live **en memoria**; etiqueta **ESCENARIO HIPOTÉTICO**; no writes; no ahorro/cash; no se pega a `igf_status`; depósito/cierre de este slice no cae a cheques. Intent inheritable. GPT sintetiza; no recomienda cancelar. No puntúa módulos.

**Scoring M0–M20 tras `DOCS-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-SYNC-001`:** ningún módulo cambia de etiqueta. Global permanece **10.5 / 20 = 52.5%** (0.0 pp). Ni la continuidad efímera, ni la herencia natural de follow-up, ni el retorno intra-sesión (`previous_frame`), ni la memoria persistente, ni `daily_sales_deviation`, ni `daily_discount_deviation`, ni `daily_executive_brief`, ni el cross-metric diario, ni `commercial_trend`, ni `client_profile`, ni el routing AR por responsable/acción, ni `igf_reviewable_supports` suman 0.5. El perfil longitudinal **no** suma módulo.

### 2. Dominios completos (COMPLETA)

- **M3 Plantas / KPIs / Proyectos** (consulta canónica de la planta del scope, KPIs de `GET /api/dashboard/kpis` y `public.proyectos` por planta. COMPLETE no implica catálogo global, estatus «retrasado» almacenado ni `POST /api/proyectos`).
- **M9 Delta Venta / Descuento / Ingreso** (consulta canónica read-only de las tres familias de periodos reales vía `get_delta_sales` / `get_delta_discount` / `get_delta_income`. COMPLETE no implica forecast con `DELETE`/`INSERT`, M19, weekly LD ni causalidad).
- **M13 Director IA** (respecto a su propio módulo: bitácora, entidades, chat, mejora continua como parte del producto).
- **M16 Duplicados** (consulta canónica de **posibles** pares vía `get_duplicate_folios` / `findDuplicatePairs`. COMPLETE significa integración de esa capacidad de análisis, no confirmación determinística de cada duplicado ni cancelación).

### 3. Dominios parciales (PARCIAL)

- M0 Auth (gates, no catálogo)
- M1 Health (readiness técnica `GET /health-director-ia` en header de DirectorIaShell; no `/health` `/health-db` `/health-proyectos`)
- M2 Folios (comentarios + slice `folio_status` estatus/etapa + slice `folio_history` eventos crudos + slice `folio_documents` metadata-only; el listado reviewable IGF es transversal y **no** completa M2; no contenido PDF/S3, no faltantes, no cheque/póliza, no `kanban_flow` ni kanban HTTP)
- M4 Clasificación de apoyos (query JSON `mes_a` vs `mes_b` por planta y familia; no COMPARAR; no Excel/xlsx; no COMPLETE)
- M5 Taller por AT (query JSON de folios TALLER por token de `public.folios.unidad` y `YYYY-MM`; no `at_id`; no catálogo; no Excel/workbook; no duplicados; no COMPLETE)
- M6 GASTOS / INVERSIONES (query JSON de folios por planta y `YYYY-MM`; GASTOS ≠ INVERSIONES ≠ IGF; no Export/xlsx; no COMPLETE)
- M7 IGF (chat on-demand + slice de composición observada de 1 fila de `igf.compromiso_lines`; `*_kg` = $/kg; null ≠ 0; `igf_status` sin recálculo y sin overlay; el contrafactual en memoria es transversal y **no** completa M7; sin deltas; sin causalidad; no COMPLETE)
- M8 ARR (chat on-demand / motor DICF)
- M11 DICF + comentarios cliente (+ slice expediente comercial factual on-demand; SELECT-only; sin `computeDicf`; sin causalidad; no COMPLETE)
- M12 Action Register (+ Mejora Continua; slice notas de revisión on-demand; consultas por responsable/acción vía `action_status` transversal; `includeNotes` always-on sigue false; no COMPLETE)
- M17 WhatsApp (solo link de acceso)
- M18 Presupuestos semanales (query JSON del carro; no writes; no cheques; no WhatsApp; no COMPLETE)

### 4. Dominios indirectos (INDIRECTA)

- M20 Home KPI (comparte fuentes, no la página)
- Colisión lingüística: «cómo van los gastos» / margen / rentabilidad siguen el anexo IGF (M7). Eso **no** puntúa a M6; M6 es PARCIAL por el listado de folios.
- Colisión lingüística: «cómo va Taller» / acciones de AT-15 siguen Action Register (M12). Eso **no** puntúa a M5; M5 es PARCIAL por el detalle TALLER por unidad.
- Capacidad transversal `financial_diagnosis` (IGF+ARR+M9 ensamblados en chat legado): **no** es un módulo M0–M20; **no** cambia M7/M8/M9 ni el 52.5%.
- Capacidad transversal `plant_diagnosis` (AR+DICF+bitácora+ARR+IGF+CS SELECT-only; `kg_mes_real` + top-5 + cobertura `cliente_key`; sin M9; sin N5): **no** es un módulo M0–M20; **no** cambia ningún módulo ni el 52.5%.
- Capacidad transversal `structured_conversation_state` (continuidad **efímera**; estrategia B: unknown + estado válido → inherit; standalone gana; no phrasebook; HILO ≠ evidence; requery+authz; 0\|1 entidad; gap fresco; un `previous_frame`): **no** es un módulo M0–M20; **no** cambia ningún módulo ni el 52.5%.
- Capacidad transversal `intra_session_topic_return` (first slice B: standalone precedence + exactamente un `previous_frame`; restore ≠ fact; requery; no stack; `volvamos` ≠ resume): **no** es un módulo M0–M20; **no** cambia ningún módulo ni el 52.5%.
- Capacidad transversal `pending_work_items_only` (memoria persistente de **trabajo pendiente**; MEMORY ≠ EVIDENCE; requery+authz al retomar; **no** navegación de temas; no EKS/IES/N5): **no** es un módulo M0–M20; **no** cambia ningún módulo ni el 52.5%. En un entorno concreto permanece inactiva hasta aplicar SQL 017.
- Capacidad transversal `daily_sales_deviation` (venta de ayer CDMX; referencia same-weekday 14 días; contribución cliente/canal; DICF+comments por `cliente_key`; gaps; HILO; una llamada OpenAI; contribución ≠ causa; descuento/kg es **otro intent**): **no** es un módulo M0–M20; **no** cambia M8/M9/M11/M13 ni el 52.5%.
- Capacidad transversal `daily_discount_deviation` (descuento/kg de ayer CDMX; `SUM(monto)/SUM(kg)`; referencia pooled same-weekday 14d; contribución reconciliada por cliente; **sin canal**; DICF+comments por `cliente_key`; gaps; HILO; una llamada OpenAI; ratio alto ≠ mayor mover; contribución ≠ causa; M9 UNCHANGED): **no** es un módulo M0–M20; **no** cambia M8/M9/M11/M13 ni el 52.5%.
- Capacidad transversal `daily_executive_brief` (first slice B: panorama diario abierto; venta + descuento/kg; misma planta/fecha; provenance/gaps separados; partial-data; GPT sintetiza; no phrasebook; no causalidad; no ingreso diario): **no** es un módulo M0–M20; **no** cambia M8/M9/M11/M13 ni el 52.5%.
- Capacidad transversal `daily_cross_metric_followup` (estrategia B: conservar fecha ≠ conservar métrica; venta ↔ descuento/kg; también desde brief; `active_date` heredada/revalidada; requery pack destino; gap fresco; sin phrasebook; `previous_frame` no decide; memoria persistente no participa): **no** es un módulo M0–M20; **no** cambia M8/M9/M13 ni el 52.5%.
- Capacidad transversal `commercial_trend` (arquitectura B: motor compartido `lib/commercial-trend-engine.js`; dashboard + chat; 30/90 trailing; `MAX(fecha)`; CASA/COMISIONISTA; OLS; top-6; comments fuera; mover ≠ causa; requery): **no** es un módulo M0–M20; **no** cambia M8/M9/M13 ni el 52.5%.
- Capacidad transversal `client_profile` (source B; routing B: `cliente_key` obligatorio; 3 meses calendario CDMX; actual PARTIAL; kg `SUM`; descuento `SUM(monto)/SUM(kg)`; ingreso actual `UNSUPPORTED_METRIC`; comments/DICF keyed; AR sin join; handoff trend→perfil + requery; coincidencia ≠ causalidad): **no** es un módulo M0–M20; **no** cambia M8/M9/M11/M12/M13 ni el 52.5%.
- Capacidad transversal `action_status` por responsable/acción (estrategia C; `accion`/`acciones`; resolución física 0/1/N; inheritable; AR > resume genérico; responsable registrado ≠ culpable; no motivo inventado): **no** es un módulo M0–M20; **no** cambia M12 PARCIAL ni el 52.5%.
- Capacidad transversal `igf_reviewable_supports` (first slice C: Folios reviewable por reglas reales de cancelación + contrafactual IGF en memoria; ESCENARIO HIPOTÉTICO; no writes; no ahorro; no cheques; `igf_status` no inheritable en el hop): **no** es un módulo M0–M20; **no** cambia M2/M7 PARCIAL ni el 52.5%.

### 5. Dominios no integrados (NO INTEGRADA)

- M4 COMPARAR / Excel/xlsx (el query JSON ya está en PARCIAL M4; COMPLETE de M4 sigue fuera)
- M5 Excel / workbook / duplicados taller (el query JSON ya está en PARCIAL M5; COMPLETE de M5 sigue fuera)
- M6 Export/xlsx (el query JSON ya está en PARCIAL M6; COMPLETE de M6 sigue fuera)
- M7 UI / PATCH HG / meta Excel / versiones / overlay persistente / recálculo escrito (el slice de composición snapshot ya está en PARCIAL M7; el contrafactual read-only es transversal; COMPLETE de M7 sigue fuera)
- M10 Weekly discount LD  
- M14 Usuarios admin (como dominio)  
- M15 Documentos/medios  
- M11 attachments / Excel DICF / bitácora en el expediente / causalidad / writes (el slice de expediente factual ya está en PARCIAL M11; COMPLETE de M11 sigue fuera)
- M12 evidencias / CRUD / binarios (el slice de notas de revisión ya está en PARCIAL M12; COMPLETE de M12 sigue fuera)
- M18 writes / cheques / WhatsApp (el query JSON ya está en PARCIAL M18; COMPLETE de M18 sigue fuera)
- M19 Delta Ingreso AI test
- Full conversation history / summaries / semantic long-term memory / preferencias / decisiones persistidas / memoria en EKS-IES-N5 / topic stack / más de un `previous_frame` (el first slice B de retorno intra-sesión — un prior — ya está en el repo; `pending_work_items_only` no es transcript ni navegación de temas)
- Mix/rate del descuento/kg diario (el first slice **D** de `daily_discount_deviation` ya está integrado; no descompone mix vs rate)
- Canal del descuento/kg diario (NOT AVAILABLE: no hay canal físico en `arr.descuentos_diarios_cliente`; no se prorratea)
- Ingreso diario / brief matutino programado / saludo personalizado / directorio SEH / Taller Mayor por unidad / closed-month IGF / comments de gráfica vía `cliente_key` / **ingreso mensual actual de cliente** (el first slice **B** de `daily_executive_brief`, el first slice **B** de `commercial_trend` y el perfil `client_profile` ya están integrados; `commercial_trend` cubre 30/90 CASA/COMISIONISTA + OLS + top-6 **sin** comments; `client_profile` cubre 3M calendario keyed **sin** ingreso actual ni join AR)
- Trade-off económico por cliente / oferta estructurada de competencia
- Scoring de desempeño de personas / culpa como causa del vencimiento (el path `action_status` consulta el responsable **registrado**; no evalúa personas)
- Kanban HTTP / GET `/timeline` (excluido) / contenido PDF / S3 / documentos faltantes / cheque / póliza / `kanban_flow` (estatus/etapa, historial crudo y metadata documental ya están en PARCIAL M2; proyectos de `public.proyectos` ya están en COMPLETA M3)

### 6. Capacidades de lectura listas para reutilizar

| Capacidad | Respaldo |
|-----------|----------|
| RESUMIR Action Register / vencidas / responsables | `summarize*` en `director-ia-action-register.js` + `buildActionRegisterBoardPayload` |
| CONSULTAR Action Register por responsable/acción (read-only; 0/1/N; no culpa) | `loadActionPersonBoardForChat` / `resolveActionPersonFocus` (`lib/director-ia-action-person.js`) |
| CONSULTAR notas de revisión Action Register (read-only) | `loadActionRegisterRevisionNotesForChat` → SELECT `arr.action_register_revision_notes` (`revision_id`; no ítem) |
| CONSULTAR/BUSCAR DICF | `summarizeDicfContext`, filtros chat |
| CONSULTAR expediente comercial factual (read-only, un cliente) | `loadCommercialDossierForChat` → SELECT `arr.dicf_cliente_mes` + comentarios con `cliente_key` + `arr.dicf_acciones` + historial por `accion_id` |
| CONSULTAR bitácora | `loadBitacoraForChat` |
| CONSULTAR comentarios | `loadClienteComentariosForDirectorIa`, `loadFolioComentariosForDirectorIa` |
| CONSULTAR estatus/etapa de folio (read-only) | `loadFolioStatusForChat` → `getFolioById` / `getFolioByNumero` / `listFoliosByPlanta` |
| CONSULTAR historial de folio (eventos crudos, read-only) | `loadFolioHistoryForChat` → resolver/autorizar → `listHistorialForFolio` (`public.folio_historial`) |
| CONSULTAR metadata documental de folio (read-only) | `loadFolioDocumentsMetadataForChat` → resolver/autorizar → `listDocumentsMetadataForFolio` → `projectDocument` (`public.folio_archivos`; sin `s3_key`) |
| RESOLVER entidad/alias | `resolveCommercialEntitiesForQuestion` |
| COMPARAR/CONSULTAR margen e IGF/ARR (on-demand) | `loadIgfArrAnnexForChat`, `getMargenKgPorPeriodo` |
| CONSULTAR diagnóstico financiero multi-fuente (IGF+ARR+M9; una llamada OpenAI; no causa) | `loadFinancialDiagnosisForChat` / `assembleFinancialDiagnosisEvidence` |
| CONSULTAR diagnóstico de planta multi-fuente (AR+DICF+bitácora+ARR+IGF+CS SELECT-only; `kg_mes_real` + top-5 + cobertura `cliente_key`; una llamada OpenAI; no M9; no causa; no N5) | `loadPlantDiagnosisForChat` / `assemblePlantDiagnosisEvidence` / `buildCommercialMateriality` / `applyDicfCoverageToMateriality` |
| CONSULTAR desviación diaria de venta (ayer CDMX; kg; same-weekday 14 días; contribución cliente/canal; DICF+comments por `cliente_key`; gaps; una llamada OpenAI; no causa; descuento/kg es otro intent) | `loadDailySalesDeviationForChat` / `assembleDailySalesDeviationEvidence` (`lib/director-ia-daily-deviation.js`) |
| CONSULTAR desviación diaria de descuento/kg (ayer CDMX; `SUM(monto)/SUM(kg)`; referencia pooled same-weekday 14d; contribución reconciliada; sin canal; DICF+comments por `cliente_key`; gaps; una llamada OpenAI; no causa; M9 UNCHANGED) | `loadDailyDiscountDeviationForChat` / `assembleDailyDiscountDeviationEvidence` (`lib/director-ia-daily-discount.js`) |
| CONSULTAR brief ejecutivo diario (panorama abierto; venta + descuento/kg; misma planta/fecha; provenance/gaps separados; partial-data; una llamada OpenAI; no causa; no phrasebook) | `loadDailyExecutiveBriefForChat` (`lib/director-ia-daily-executive-brief.js`) |
| CONSULTAR tendencia comercial de gráfica (30/90 trailing; `MAX(fecha)`; CASA/COMISIONISTA; OLS; top-6; misma verdad que el dashboard; una llamada OpenAI; no causa; no comments) | `loadCommercialTrend` / `loadCommercialTrendForChat` (`lib/commercial-trend-engine.js`, `lib/director-ia-commercial-trend.js`) |
| CONSULTAR perfil longitudinal de cliente (3 meses calendario CDMX; actual PARTIAL; `SUM(kg)` / `SUM(monto)/SUM(kg)`; comments/DICF por `cliente_key`; ingreso actual unsupported; AR sin join; una llamada OpenAI; no causa) | `loadClientProfileForChat` / `assembleClientProfilePack` (`lib/director-ia-client-profile.js`) |
| Conservar hilo conversacional efímero (parent_intent / 0\|1 entidad / gap; HILO ≠ evidence; requery) | `resolveConversationTurn` / `buildConversationState` / `formatConversationHiloForModel` (`lib/director-ia-conversation-state.js`) |
| Retomar pending work item entre sesiones (memory ≠ evidence; requery+authz; si SQL 017 aplicado) | `classifyPersistentMemoryTurn` / `retrieveActiveWorkItems` / `upsertActiveWorkItem` (`lib/director-ia-persistent-memory.js`; tabla `arr.director_ia_pending_work_items`) |
| CONSULTAR composición IGF (snapshot de 1 fila; read-only; no causa; no tendencia) | `extractIgfComposition` → `formatIgfCompositionBlock` vía `get_igf_snapshot` / `loadIgfCommitSnapshot` (`igf.compromiso_lines`) |
| CONSULTAR apoyos reviewable + contrafactual IGF (read-only; reglas reales de cancelación; ESCENARIO HIPOTÉTICO; no writes; no ahorro) | `loadIgfReviewableSupportsForChat` / `get_igf_reviewable_supports` (`lib/director-ia-igf-reviewable-supports.js`) |
| LISTAR estado comercial | Intent `commercial_state`: `loadCommercialStateForChat` → `dicf.computeDicf`. Pack `plant_diagnosis`: SELECT-only `arr.dicf_cliente_mes` (no compute; materialidad `kg_mes_real`; cobertura por `cliente_key`, no por nombre) |
| RESUMIR Mejora Continua | `buildMejoraContinuaPayload` / `GET /api/director-ia/mejora-continua` |
| DETECTAR RIESGOS / CONSULTAR posibles duplicados de folios | `loadDuplicateFoliosForChat` → `findDuplicatePairs` |
| CONSULTAR KPIs de dashboard (folios) | `loadDashboardKpisForChat` → `queryDashboardKpis` |
| CONSULTAR proyectos por planta | `loadProyectosForChat` → `listarProyectosPorPlantaOEquivalentes` |
| COMPARAR Delta Venta / Descuento / Ingreso (periodos reales) | `loadDeltaVentaForChat` / `loadDeltaDescuentoForChat` / `loadDeltaIngresoForChat` |
| CONSULTAR GASTOS de folios (read-only, `YYYY-MM`) | `loadGastosInversionesForChat("GASTOS")` → SELECT + `expandCategoriaRows` |
| CONSULTAR INVERSIONES de folios (read-only, `YYYY-MM`) | `loadGastosInversionesForChat("INVERSIONES")` → SELECT + `expandCategoriaRows` |
| CONSULTAR Taller por AT (read-only, `YYYY-MM`, token `public.folios.unidad`) | `loadTallerAtForChat` → SELECT + `expandTallerRows` + `parseUnidadesList` |
| COMPARAR matriz de clasificación (`mes_a` vs `mes_b`, read-only) | `loadClasificacionApoyosForChat` → SELECT + `buildClasificacionMatrix` |
| CONSULTAR presupuesto semanal / carro (read-only) | `loadPresupuestoSemanalForChat` → SELECT `presupuestos_semanales` + `presupuesto_folios` |

### 7. Capacidades que requieren herramientas nuevas (aunque exista API/lib)

| Capacidad deseada | Existe en repo | Falta para Director IA |
|-------------------|----------------|------------------------|
| Etapa/estatus de folio / kanban HTTP | Slice `folio_status` ya integrado (SELECT-only). GET `/kanban` y GET `/folios/:id` siguen existiendo y **siguen excluidos** (autoavance) | Tablero HTTP, contenido PDF/S3, cheque/póliza, `kanban_flow`; no reutilizar handlers mutantes |
| Timeline / último movimiento | Slice `folio_history` ya integrado (SELECT-only de `public.folio_historial`). GET `/timeline` existe y **sigue excluido** (HTTP interno + `dedupeHistorialByStage`) | Transiciones inventadas, actor sistema, contenido/financial; no copiar dedupe |
| Metadatos documentos / póliza / cheque | Metadata de `folio_archivos` ya integrada (M2 SELECT-only, sin `s3_key`). Endpoints `/media` y póliza/cheque existen y **siguen excluidos** | Contenido PDF, S3, signed URLs, faltantes, póliza operativa, cheque |
| Duplicados (cancelar / `findSimilarTo` al crear / Excel Taller) | Sí (cancelar UI, `POST /check`, Excel M5) | Escritura y detectores ajenos al análisis M16 ya integrado |
| Excel/agregados Taller, GASTOS, INVERSIONES | Query JSON M6 ya integrado (SELECT + `expandCategoriaRows`). Query JSON M5 ya integrado (SELECT + `expandTallerRows`; token `public.folios.unidad`). Libs Excel Taller/GASTOS/INVERSIONES siguen existiendo | Export/xlsx M6; Excel/workbook/duplicados M5; no usar workbook como transporte |
| Clasificación COMPARAR / Excel | Query JSON M4 ya integrado (SELECT + `buildClasificacionMatrix`). POSTs COMPARAR y workbook siguen existiendo | COMPARAR writes (`insertFolio` / `UPDATE mes_cargo`); Excel/xlsx; no COMPLETE |
| Deltas UI (forecast con escritura / M19) | Sí (`delta-ingreso-forecast`, `/api/ai/delta-ingreso/test/*`) | La lectura de periodos reales ya está en COMPLETA M9; faltan forecast mutante y M19, a propósito fuera |
| Presupuesto semanal (writes / cheques / WhatsApp) | Query JSON M18 ya integrado (SELECT + `getPresupuestoResumen`). Writes y bot existen en `server.js` | Asignar/seleccionar; enviar a cheques; Twilio/WhatsApp; no COMPLETE |
| Action Register notas / evidencias / CRUD | Slice notas de revisión ya integrado (`loadActionRegisterRevisionNotesForChat`; `includeNotes` always-on sigue false). Consultas por responsable/acción ya integradas (`action_status`; no intent nuevo) | Attachments/S3/PDF; CRUD ítems; scoring de personas; causalidad before→action→after; no COMPLETE; no atribuir nota a ítem; no silent pick |
| DICF expediente / attachments / writes | Slice expediente factual ya integrado (`loadCommercialDossierForChat`; SELECT-only; sin `computeDicf`) | Attachments; Excel/UI; bitácora en el expediente; causalidad; CRUD acciones; no COMPLETE |
| IGF composición / UI / PATCH / recálculo | Slice composición snapshot ya integrado (`extractIgfComposition`; 1 fila; `*_kg` = $/kg; no se ejecuta `recalcularUtilYResultado`; no overlay en `igf_status`). Contrafactual read-only ya integrado en `igf_reviewable_supports` (overlay **en memoria**; no DB write) | UI IGF; PATCH HG; meta Excel; versiones UI; overlay persistente del GET dashboard; closed-month; causalidad; no COMPLETE |
| Proyectos (crear/editar/eliminar) | Sí (`POST /api/proyectos`) | Escritura; la lectura M3 ya está integrada |
| KPIs dashboard (lectura) | Sí (integrado M3) | — |
| Weekly LD | Sí | Tool |
| Persistir/auditar chat / memoria entre sesiones | Continuidad **efímera** + first slice `pending_work_items_only` en repo (`arr.director_ia_pending_work_items`). **No** transcript. Entorno: PENDING until SQL 017 | Full history; summaries; semantic memory; decisiones; EKS/IES/N5 |
| Igualar `sources` GET vs chat | Parcial | Cambio de contrato context (no implementado aquí) |
| Explicación causal / mix-rate / canal de desviaciones diarias | First slices diarios ya integrados: venta (`daily_sales_deviation`) y descuento/kg (`daily_discount_deviation`; `SUM(monto)/SUM(kg)`; contribución reconciliada; **no** canal). M9 mensual intacto (UNCHANGED). `plant_diagnosis` no carga M9 ni packs diarios | Mix/rate; canal en descuento; atribución causal; average-of-averages; **diferido** |
| Cierre de brechas de evidencia (qué falta / quién puede aportarla como workflow) | En la **sesión**: gap fresco. Entre sesiones: work item del pendiente (si SQL 017 aplicado). «quién» solo con vínculo físico | Workflow, notificaciones, asignar responsable; **diferido** |
| Trade-offs económicos / before→action→after / agenda del Director / seguimiento | No | Recuperar vs no recuperar; margen por cliente; oferta competencia; asociación temporal; agenda heterogénea; repriorización; **diferido** |

### 8. Operaciones que requieren confirmación (B)

- Cualquier mutación de bitácora/entidad disparada desde el chat (hoy es UI explícita).
- Crear comentarios.
- Futuras mutaciones de Action Register / DICF desde IA.
- Exponer o descargar documentos con URL firmada.
- Cualquier avance de flujo de folio si algún día se expone.

### 9. Operaciones que Director IA no debería ejecutar (C)

- Aprobar / mover / cancelar / editar folios de forma autónoma.
- Subir póliza o borrar media.
- Modificar presupuestos o enviar a cheques sin marco humano.
- Cambiar permisos de usuario.
- Cargar ARR destructivo / COMPARAR que escribe folios.
- Disparar endpoints `/api/ai/delta-ingreso/test/*` o envíos WhatsApp masivos.
- Hablar en nombre de fuentes no integradas como si estuvieran conectadas.

### 10. Preguntas pendientes que el repositorio no permite contestar

1. ¿Qué flags (`ENABLE_DIRECTOR_IA`, `AI_ENABLED`, secretos) están activos en cada ambiente de producción?  
2. ¿El frontend reenvía `conversation_state` además de `history.slice(-8)`, o solo history? (hoy el BE reconstruye estado; el FE no se tocó en el slice de continuidad.)
2b. ¿En qué entornos se aplicó `sql/017_director_ia_pending_work_items.sql`? Hasta confirmarlo, la persistencia allí es PENDING.
3. ¿Qué consumidores FE leen `sources.igf|arr|commercial_state` esperando `true`?  
4. ¿Existe DDL de creación de `igf.compromiso_lines` / `igf.versions` fuera del repo?  
5. ¿Hay controles de red que mitiguen las rutas test sin `dashboardAuthMiddleware`?  
6. ¿Cuál es la definición operativa canónica de «presupuesto semanal» en los flujos WhatsApp?  
7. ¿Los tres detectores de duplicados están calibrados al mismo umbral en producción?  
8. ¿`acceso_consola_whatsapp_ar` se enforcea en todos los comandos Twilio o solo está catalogado?  
9. ¿Hay vistas/materializaciones ARR/IGF en la base real no versionadas en `sql/`?  
10. ¿Se debe unificar o aislar formalmente Director IA vs Delta Ingreso AI a nivel de producto?

---

## Apéndice — Índice rápido de evidencia de código

| Pieza | Ruta |
|-------|------|
| Documento base | `docs/ARQUITECTURA_DASHBOARD_FOLIOS.md` |
| Context | `lib/director-ia-context.js` |
| Chat | `lib/director-ia-chat.js` |
| Continuidad conversacional efímera | `lib/director-ia-conversation-state.js` |
| Herencia natural de follow-up (estrategia B; tests hold-out) | `lib/director-ia-conversation-state.js`, `test/director-ia-natural-followup.test.js` |
| Action Register por responsable/acción (estrategia C) | `lib/director-ia-action-person.js`, `test/director-ia-action-person-routing.test.js` |
| Memoria persistente pending work items | `lib/director-ia-persistent-memory.js`, `sql/017_director_ia_pending_work_items.sql` |
| Duplicados M16 | `lib/director-ia-duplicados.js`, `lib/folio-duplicados-load.js`, `lib/folio-duplicados.js` |
| M2 Folios / estatus-etapa | `lib/director-ia-m2-folio-status.js` |
| M2 Folios / historial | `lib/director-ia-m2-history.js` |
| M2 Folios / metadata documental | `lib/director-ia-m2-documents-metadata.js` |
| M3 Plantas / KPIs / Proyectos | `lib/director-ia-m3-plantas-kpis-proyectos.js` |
| M4 Clasificación (query JSON) | `lib/director-ia-m4-clasificacion-query.js` |
| M5 Taller por AT (query JSON) | `lib/director-ia-m5-taller-at.js` |
| M6 GASTOS / INVERSIONES (query JSON) | `lib/director-ia-m6-gastos-inversiones.js` |
| M9 Delta Venta / Descuento / Ingreso | `lib/director-ia-m9-deltas.js` |
| AR summarizers | `lib/director-ia-action-register.js` |
| IGF/ARR annex | `lib/director-ia-igf-arr.js` |
| Diagnóstico financiero multi-fuente | `lib/director-ia-financial-diagnosis.js` |
| Diagnóstico de planta multi-fuente | `lib/director-ia-plant-diagnosis.js` |
| Desviación diaria de venta | `lib/director-ia-daily-deviation.js` |
| Desviación diaria de descuento/kg | `lib/director-ia-daily-discount.js` |
| Brief ejecutivo diario | `lib/director-ia-daily-executive-brief.js` |
| Tendencia comercial de gráfica (motor compartido) | `lib/commercial-trend-engine.js`, `lib/director-ia-commercial-trend.js`, `test/director-ia-commercial-trend.test.js` |
| Perfil longitudinal de cliente | `lib/director-ia-client-profile.js`, `test/director-ia-client-profile.test.js` |
| Apoyos reviewable / contrafactual IGF | `lib/director-ia-igf-reviewable-supports.js`, `test/director-ia-igf-reviewable-supports.test.js` |
| Commercial state | `lib/director-ia-commercial-state.js` |
| Bitácora | `lib/director-ia-bitacora.js` |
| Mejora continua | `lib/director-ia-mejora-continua.js` |
| Comentarios | `lib/cliente-comentarios.js` |
| Entidades | `lib/comercial-entidad.js` |
| Permisos | `lib/usuario-permisos.js` |
| Flag | `lib/director-ia.js` |
| FE módulo | `frontend-dashboard/modules/director-ia/` |

---

*Fin del mapa de capacidades. No se modificó código de aplicación. No se propuso implementación.*
 