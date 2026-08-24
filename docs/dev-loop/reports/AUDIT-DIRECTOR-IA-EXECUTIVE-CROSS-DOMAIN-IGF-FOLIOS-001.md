# Reporte — AUDIT-DIRECTOR-IA-EXECUTIVE-CROSS-DOMAIN-IGF-FOLIOS-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-EXECUTIVE-CROSS-DOMAIN-IGF-FOLIOS-001"
outcome: "DONE_PENDING_REVIEW"
mode: "EXECUTIVE_CROSS_DOMAIN_AUDIT_ONLY"
implementation: false
north_star_met: false
single_bottleneck: "no_igf_to_reviewable_apoyos_path"
failure_class: "MISSING_INFRASTRUCTURE"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-EXECUTIVE-CROSS-DOMAIN-IGF-FOLIOS-001.md"
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
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-igf-arr.js"
  - "lib/director-ia-m2-folio-status.js"
  - "lib/director-ia-m4-clasificacion-query.js"
  - "lib/director-ia-m6-gastos-inversiones.js"
  - "lib/dashboard-arr-forecast.js"
  - "server.js (solo lectura: IGF folio buckets / mes cerrado)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
sql_executed: false
next_task_proposed: "ARCH-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp). Esta auditoría no mide módulos."
```

## Resumen ejecutivo

El north star **no** se cumple.

Director IA **puede** abrir el IGF de Puebla del mes actual (agosto 2026 en esta corrida) y **puede** cargar el snapshot de mayo 2026 si la pregunta nombra `IGF`. Eso no es una conversación ejecutiva de palancas.

La secuencia crítica IGF → «¿Qué podemos recortar de apoyos?» **no cambia a Folios**. Tampoco se queda en IGF. **Muere en aclaración `unknown`**. No hay lista de apoyos, no hay depósito/cierre operativo, no hay totales YA MATERIALIZADO vs TODAVÍA REVIEWABLE, no hay ranking defendible, no hay riesgo comercial físico, no hay efecto IGF calculable.

Hecho físico del hop:

- planner aislado = `unknown` 0.35 (`no_rule_matched`)
- `igf_status` **no** está en `INHERITABLE_INTENTS`
- el path IGF **no escribe** `conversation_state`
- `askDirectorIa` L2935–2944: `unknown` sin inherit → `buildUnknownClarificationResult`
- GPT = no
- Folios requery = no
- Action Register = no (la aclaración dice explícitamente que no consulta AR a ciegas)

«Apoyos» no es un subconjunto de Folios en el runtime. M4 exige «clasificación/comparativo/matriz». El tema AR «Apoyos» (`director-ia-chat.js` L192) **no se alcanza** en este hop. La línea IGF `gtos_apoyos_corp_kg` es un total corporativo en $/kg, no una lista de folios.

**No se puede** llamar ahorro a un folio abierto. **No se puede** separar YA MATERIALIZADO vs TODAVÍA REVIEWABLE en Director IA. El tablero sí agrupa folios para el IGF; el chat no carga esas listas y, además, estar fuera de depósito **no** implica recortable: carro y ZP ya entran al forecast como $/kg.

## Método

Auditoría read-only. Invocación local de planner, capabilities, period resolver y continuidad (estado vacío, que es el estado real tras un turno IGF: el fallback GPT no persiste `conversation_state`).

Fecha de corrida: 2026-08-24. Fallback de periodo = mes CDMX actual (2026-08). No se ejecutó SQL. No se llamó GPT de producto. No se reconstruyó forecast histórico.

## Campos físicos observados (Folios)

| Dato pedido | ¿Existe en Director IA? | Dónde | Qué es realmente |
|---|---|---|---|
| Estatus de folio | Sí, si entra M2/M6 | `public.folios.estatus` | Workflow (GENERADO…PAGADO, CERRADO, COMPROBACIONES, EVIDENCIAS, CANCELADO, …) |
| Etapa «Depósito y cierre» | Solo display M2 | `estatusToEtapaVisual` | Agrupa **PAGADO + CERRADO**. No es columna de depósito |
| Depósito (cheque / fecha / hecho) | No | capability `cheques` = `none` | «No integrado» |
| Cierre operativo | Parcial | `estatus = CERRADO` | Distinto de la partida IGF `deposito_cierre_kg` |
| Monto | Sí, si entra M2/M6 | `public.folios.importe` | Importe almacenado. El chat **no** etiqueta bruto/neto/autorizado/pagado |
| Clasificación de apoyo | No como «apoyos» | M4 = matriz GASTOS/INVERSIONES/TALLER; M6 = categoría GASTOS/INVERSIONES | M4 pide dos `YYYY-MM`. No es lista recortable |
| Planta | Sí | `planta_id` del request + join `plantas` | «Puebla» en el texto **no** resuelve planta |
| Reversibilidad / evitabilidad | No | — | No hay flag físico |
| Cliente comercial | No | M6 tiene `beneficiario` | No hay join folio → entidad comercial → venta/DICF/acciones |
| Comentarios de folio | Path AR/GPT | `folio_comentarios` | No se carga en IGF ni en el hop de apoyos |

**«No depositado» ≠ recortable.** Demostración:

1. Capability `cheques` no lee depósito. Preguntar «depósito/cierre» dispara `detectUnsupportedDirectorIaDomain` **antes** del planner (`askDirectorIa` L2890–2894).
2. En el tablero (`server.js` `fetchIgfFoliosDetalleList`), `deposito_cierre` = PAGADO + CERRADO + COMPROBACIONES + EVIDENCIAS. Carro y aprobación ZP son **otros** cubos, también sumados al IGF como `folios_carro_kg` / `folios_aprob_zp_kg`.
3. Esos cubos ya están en el gasto/forecast. No son «ahorro potencial» por seguir abiertos.
4. `CHEQUE_GENERADO` / `SOLICITANDO_PAGO` no son «libres». No hay reversibilidad.
5. M6 excluye `CANCELADO` y no clasifica el resto como evitable.

Director IA **no debe** emitir las categorías YA MATERIALIZADO / TODAVÍA REVIEWABLE: los datos físicos del chat no lo permiten. El tablero tiene cubos de estatus para el IGF; eso tampoco autoriza llamar «reviewable» a lo que no está en depósito.

## IGF: mes abierto vs mes cerrado vs forecast histórico

`resolveYearMonthFromQuestion` (`lib/director-ia-igf-arr.js` L160–181):

- Sin mes en el texto → fallback CDMX (aquí **2026-08**). «Este mes» no se parsea; coincide por fallback.
- «mayo» → month=5. El año **no** baja por «pasado». En agosto 2026 eso cae en mayo 2026.
- No hay flag `abierto` / `cerrado` en el anexo.

`loadIgfCommitSnapshot` toma `igf.versions` GLOBAL del `year/month` con `ORDER BY version_number DESC LIMIT 1`. Una fila de `igf.compromiso_lines`. El anexo dice «COMPROMISO / MARGEN (versión más reciente del mes)» y el header habla de «IGF Forecast ARR». ARR: «proyección o real según corte». **No** llama `isIgfMesCerradoPorCorte` (`server.js` L11387–11390).

Qué puede responder hoy:

| Pregunta | Qué hay físicamente | Qué falta |
|---|---|---|
| Mes actual abierto | Snapshot latest 08/2026 + margen vs mes previo + composición $/kg (si hay versión) | Distinción real acumulado vs proyección de cierre; listas de folios que alimentan las partidas |
| Mes cerrado (mayo) | Mismo loader, latest 05/2026 | Etiqueta «ya cerró; esto no es forecast actual»; oferta explícita de resultado real vs proyección |
| «Proyección final» | **Latest version_number** de ese mes. No hay campo «proyección final» | Semántica de cierre vs forecast |
| Forecast histórico («qué proyectábamos durante mayo») | Pueden existir versiones anteriores en `igf.versions` | El chat **no** las lee. No hay as-of. **Prohibido reconstruir** con el cierre |

Pregunta obligatoria: «¿Cuál es la proyección final del IGF de Puebla de mayo pasado?»

Respuesta conceptualmente correcta: mayo ya cerró; la proyección actual no aplica; ofrecer resultado real.

Runtime: planner `igf_status` 0.9, periodo 2026-05, anexo + GPT. **No** dice que mayo cerró. Ofrece el latest snapshot con lenguaje de forecast/compromiso. Eso no es la respuesta correcta.

«¿Entonces cómo cerró mayo realmente?» y «¿Y qué proyectábamos durante mayo?» → `unknown` + aclaración. El segundo, aunque heredara IGF, seguiría viendo solo el latest: no es forecast intra-mes almacenado y expuesto.

## Mapping IGF ↔ Folios (impacto)

El tablero, al servir IGF, **recalcula en memoria**:

- `folios_aprob_zp_kg` = suma importe estatus ZP / ventaKg
- `folios_carro_kg` = suma cubo carro / ventaKg
- `deposito_cierre_kg` = −(PAGADO+CERRADO+COMPROBACIONES+EVIDENCIAS) / ventaKg
- `inversiones_kg` live **solo mes actual**; meses pasados dejan el valor IGF almacenado
- `gtos_apoyos_corp_kg` = cifra **subida** en compromiso; **no** sale de folios de planta
- Resultado = utilidad operación − gtos corp − bancos corp − otros − inversiones (`recalcularUtilYResultado`)

Director IA **no** ejecuta ese recálculo ni `fetchIgfFoliosDetalleList`. Lee la fila almacenada. Composición observada ≠ causalidad. `*_kg` es $/kg, no pesos del folio.

Por tanto **no** existe mapping físico en el chat para afirmar:

- cortar $X en folios ⇒ IGF mejora $X
- accrual vs cash vs reconocimiento vs forecast
- si el gasto ya está provisionado
- si cancelar cambia el forecast

Lo que falta, en palabras que Director IA debería poder decir:

> Puedo (si hubiera path) identificar importes de folios por estatus y planta. No puedo afirmar que el IGF mejore $X: no cargo el cubo live del tablero, las partidas IGF están en $/kg sobre venta, `Gtos/Apoyos corp` no es la lista de folios de planta, y no tengo tratamiento contable (accrual/caja/reconocimiento) de cada folio.

## Riesgo comercial

No inventado. Hecho: no hay join folio → cliente canónico → venta/DICF/comentarios/acciones en ningún path de esta conversación. `beneficiario` ≠ entidad comercial. Expediente comercial es otro intent, 1 cliente, no se dispara. Sin esa evidencia, «riesgo de quitarlos» es **información faltante**, no un claim.

## Ranking

«¿Cuáles revisarías primero?» es `unknown`. Aunque hubiera lista, el runtime no tiene regla que combine monto + estatus + edad + depósito + categoría + cliente. Recomendar recorte solo por monto está prohibido y hoy **ni siquiera hay candidatos**.

## Cruce de dominio

| Paso | Qué ocurre |
|---|---|
| IGF mes actual | `igf_status` → **no** hay handler in-process → cae a GPT + anexo IGF (`isPlantFinancialKpiQuestion`) |
| «recortar de apoyos» | `unknown` → aclaración. **No** Folios. **No** se queda en IGF. **No** AR |
| IGF context | Explica el *por qué* solo si el usuario ya vio el anexo. El estado **no** lo transporta |
| Folios evidence | No se carga. El *qué* reviewable no se contesta |
| «efecto sobre el IGF» | Vuelve a `igf_status` por la palabra IGF. **Se queda pegado a IGF**. Requery Folios = no |

## Traza por turno

Convención: planta = `planta_id` del request (Puebla solo si esa es la planta abierta). `previous_frame` = null (path IGF no setea estado). Periodo = `resolveYearMonthFromQuestion`. Requery Folios = sí solo si hay loader M2/M4/M6.

### T1 — ¿Cómo proyectamos cerrar el IGF de Puebla este mes?

| Campo | Valor |
|---|---|
| planner aislado | `igf_status` 0.9 (`igf_keyword`) |
| intent efectivo | `igf_status` (standalone); ejecución = fallback GPT + anexo IGF, no handler dedicado |
| parent_intent | null (`igf_status` no inheritable; fallback no escribe estado) |
| previous_frame | null |
| planta | `planta_id` request → nombre → código ARR. Token «Puebla» no resuelve planta |
| periodo | 2026-08 (fallback; «este mes» no se parsea) |
| sources | `igf.compromiso_lines` latest + margen + ARR si aplica. También se carga Action Register en el fallback aunque el foco sea IGF |
| requery | IGF sí. Folios no |
| evidence | Snapshot compromiso/margen/composición $/kg. Header «IGF Forecast ARR» |
| limitations | Sin abierto/cerrado; sin real vs proyección de cierre; COMPOSICIÓN ≠ CAUSALIDAD; sin lista de folios |
| GPT | sí |
| determinista | no (salvo 403 GA) |
| failure | Path IGF existe para el número agregado. No inicia palancas |

### T2 — ¿Qué está afectando más el resultado?

| Campo | Valor |
|---|---|
| planner aislado | `unknown` 0.35 |
| intent efectivo | aclaración unknown |
| parent / previous_frame | null / null |
| planta | se preserva en clarify si había estado; aquí estado vacío |
| periodo | 2026-08 (no usado) |
| sources / requery | ninguno / no |
| evidence | ninguna. El anexo T1 ya tiene `magnitude_usd_per_kg` (top 3 líneas $/kg, **no** causa) pero **no se reconsulta** |
| limitations | «resultado» ≠ `resultado final` / `igf` / composición |
| GPT | no |
| determinista | sí, clarify |
| failure | Follow-up IGF no ancla. No es inherit (correcto: inherit pegaría a IGF). Tampoco es composición |

### T3 — ¿Qué podemos recortar de apoyos?  ← hop crítico

| Campo | Valor |
|---|---|
| planner aislado | `unknown` 0.35 |
| intent efectivo | aclaración unknown |
| parent / previous_frame | null / null |
| planta | request |
| periodo | 2026-08 (no usado) |
| sources / requery | ninguno / **no Folios** |
| evidence | ninguna |
| limitations | «apoyos» ≠ M4, ≠ M6, ≠ `gtos_apoyos_corp_kg`, ≠ tema AR (AR no se alcanza) |
| GPT | no |
| determinista | sí, clarify |
| failure | **No hay path IGF→Folios/apoyos.** Cuello |

### T4 — ¿Cuáles todavía no están en depósito/cierre?

| Campo | Valor |
|---|---|
| planner aislado | `folio_financial_status` 0.75 (`capabilities_unsupported:cheques`) — **no corre** |
| intent efectivo | `capability_limitation` / `cheques` (L2890–2894, antes del planner) |
| parent / previous_frame | no se actualiza a Folios |
| planta | request |
| periodo | no usado |
| sources / requery | ninguno / no |
| evidence | texto honesto: cheques/depósito no integrado |
| limitations | La pregunta operativa choca con capability `cheques`. El tablero ya lista cubo `deposito_cierre` por **estatus**, no por cheque |
| GPT | no |
| determinista | sí |
| failure | OVERPROGRAMMING colateral (vocabulario depósito/cierre). No es el cuello: T3 ya cortó el hop |

### T5 — ¿Cuánto suman?

`unknown` 0.35 → clarify. Sin lista previa. GPT no. Failure: no hay conjunto que sumar.

### T6 — ¿Cuáles ya se depositaron?

`unknown` 0.35 → clarify. «depositaron» **no** dispara `\bdeposito\b`. Tampoco M2. No hay hecho de depósito. GPT no.

### T7 — ¿Cuánto representan?

`unknown` 0.35 → clarify. Sin universo ni denominador (¿vs IGF, vs venta, vs apoyos?).

### T8 — ¿Cuáles revisarías primero?

`unknown` 0.35 → clarify. Sin candidatos. No debe recomendar recorte.

### T9 — ¿Por qué esos?

`unknown` 0.35. `classifyTurnKind` = `other` (no es `^por que$`). Sin «esos».

### T10 — ¿Qué riesgo comercial tendría quitarlos?

`unknown` 0.35 → clarify. Sin folio, sin cliente, sin venta/comentarios/acciones. No inventar riesgo.

### T11 — Si quitamos esos apoyos, ¿qué efecto tendría sobre el IGF?

| Campo | Valor |
|---|---|
| planner aislado | `igf_status` 0.9 |
| intent efectivo | otra vez IGF (standalone) + GPT + anexo |
| parent / previous_frame | null / null |
| planta | request |
| periodo | 2026-08 |
| sources | snapshot IGF. **Folios no** |
| requery | IGF sí. Folios no |
| evidence | composición $/kg, incluida `gtos_apoyos_corp_kg` si no es null. Sin IDs de folio |
| limitations | No hay mapping $ folio → $ IGF. GPT puede narrar impacto sin base |
| GPT | sí |
| determinista | no |
| failure | **Se queda pegado a IGF.** Cruce inverso del hop T3 |

### T12 — ¿Cuál es la proyección final del IGF de Puebla de mayo pasado?

| Campo | Valor |
|---|---|
| planner | `igf_status` 0.9 |
| efectivo | GPT + anexo IGF |
| periodo | **2026-05** |
| evidence | latest `igf.versions` de mayo |
| limitations | No marca mes cerrado. Lenguaje forecast/compromiso. «pasado» no resta año |
| GPT | sí |
| failure | No ofrece «mayo cerró; esto es resultado/cierre, no proyección actual» |

### T13 — ¿Entonces cómo cerró mayo realmente?

`unknown` 0.35 → clarify. Periodo resolver vería mayo **si** cargara IGF; no carga. Failure: cierre real no es intent.

### T14 — ¿Y qué proyectábamos durante mayo?

`unknown` 0.35 → clarify. Forecast intra-mayo **no** está expuesto. Si se forzara IGF, sería latest de mayo (probable cierre), no reconstrucción permitida.

## YA MATERIALIZADO vs TODAVÍA REVIEWABLE

**No emitir esas dos bolsas.** Falta:

- definición de «apoyos» (corp IGF vs clasificación Folios vs AR)
- depósito físico (capability none)
- reversibilidad
- path que liste folios tras IGF
- regla que **no** trate carro/ZP/abierto como ahorro

El tablero puede listar cubos de estatus para el IGF. Eso es evidencia de producto **fuera** del chat. Esos cubos ya están en el forecast: no son «reviewable = ahorro».

## Lo que Director IA sí puede decir hoy (si el turno llega)

- T1/T12: números del snapshot latest del mes resuelto, planta del request, composición $/kg con disclaimer de no-causalidad.
- T4 (si se formula depósito/cierre): «Cheques / depósito de folio todavía no está integrado».
- T2–T3, T5–T10, T13–T14: pedir anclaje (planta / cliente / otro tema). No inventa.

No puede: recortar, rankear, riesgo comercial, efecto 1:1, forecast intra-mes, abierto vs cerrado.

## KEEP_DETERMINISTIC vs GPT

Determinista hoy: periodo numérico, capability cheques, unknown clarify, estatus M2 si se invocara, authz GA.

GPT hoy: síntesis IGF en T1/T11/T12 **sin** guarda de mes cerrado, **sin** veto de impacto 1:1.

Prohibido y no implementado (correcto): recorte automático, impacto IGF automático, riesgo comercial automático.

## Cuello único

```yaml
name: "no_igf_to_reviewable_apoyos_path"
failure_class: "MISSING_INFRASTRUCTURE"
physical_location:
  - "lib/director-ia-planner.js: no hay regla 'apoyos'→Folios; M4 solo clasificación/comparativo/matriz"
  - "lib/director-ia-conversation-state.js INHERITABLE_INTENTS: igf_status ausente (no habilita hop de dominio)"
  - "lib/director-ia-chat.js L2935-2944: unknown sin inherit → clarify; L3721-3737: IGF annex sin Folios"
  - "lib/director-ia-igf-arr.js: gtos_apoyos_corp_kg y deposito_cierre_kg son $/kg de snapshot, no lista reviewable"
  - "server.js fetchIgfFoliosDetalleList existe en tablero y no es path Director IA; no define 'apoyos' ni evitabilidad"
affected_turns:
  - "T3 (hop crítico)"
  - "T4-T10 (sin universo de apoyos)"
  - "T11 (vuelve a IGF sin Folios)"
evidence: >
  Invocación 2026-08-24: T3 planner=unknown 0.35, inherit=false, unsupported=null, m4=false,
  kpi=false, Folios requery=false, GPT=false. T11 planner=igf_status y no carga folios.
why_largest: >
  El north star es pasar de 'cómo va el IGF' a 'qué palancas de apoyos todavía se pueden
  revisar' sin inventar ahorro. Sin este path no hay evidencia Folios que conteste el WHAT.
  Los demás fallos (unknown T2, cheques T4, mes cerrado T12, 1:1 T11) son reales y menores:
  no desbloquean el hop.
what_fixing_unlocks: >
  Un contrato de hop IGF(WHY)→Folios(WHAT): qué es 'apoyos', qué estados son hechos,
  qué se puede listar sin llamar ahorro, qué hay que pedir antes de rankear o hablar
  de IGF/riesgo.
what_it_does_not_solve: >
  Integrar cheques; persistir/exponer forecast intra-mes; mapping 1:1 folio→IGF;
  join comercial folio→cliente; heredar igf_status (eso pegaría T3 al IGF, peor).
not_selected:
  - "sql017 / topic stack / daily cross-metric (fuera de esta conversación)"
  - "OVERPROGRAMMING T4 cheques: bloquea depósito/cierre pero el hop ya murió en T3"
  - "DEPLOYMENT_GAP tablero: cablear fetchIgfFoliosDetalleList sin contrato llamaría
     'recortable' a carro/ZP, que ya está en el forecast"
```

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

**ARCH-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001**

Arquitectura (no implementación) del hop ejecutivo IGF → apoyos/folios reviewable. Debe fijar, sin suavizar contratos:

1. Semántica física de «apoyos» (no mezclar `gtos_apoyos_corp_kg`, M4, M6 y AR).
2. Hechos de estatus/depósito/cierre/monto/planta vs lo que falta (reversibilidad, cheque).
3. Prohibición: abierto o no depositado ≠ ahorro; cortar $X ≠ IGF +$X salvo mapping físico.
4. Routing: IGF explica WHY; Folios contesta WHAT; T11 no puede quedarse ciego en IGF.
5. Mes abierto vs cerrado vs forecast histórico solo si está persistido y se lee (mayo: resultado, no proyección actual).
6. Ranking y riesgo comercial: solo con evidencia; si no, pedir el dato exacto.

No autorizar. No ejecutar. Este reporte no es G1.

## Porcentaje

Antes: 10.5 / 20 = 52.5%  
Después: 10.5 / 20 = 52.5%  
Delta: 0.0 pp

## STOP

Auditoría cerrada. Sin código, tests, contratos, SQL, commit, push ni merge. NEXT_TASK no ejecutada.
