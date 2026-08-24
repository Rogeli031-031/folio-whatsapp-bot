# Reporte — ARCH-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001"
outcome: "DONE_PENDING_REVIEW"
mode: "READINESS_ONLY"
implementation: false
determination: "READY_WITH_LIMITS"
selected_solution: "C"
reviewability_model: "B_runtime_cancellable"
counterfactual: "YES_IF_LIVE_OVERLAY"
north_star_met_today: false
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
expected_impl_effect: "0.0 pp (PARTIAL se profundiza; no COMPLETE)"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001.md"
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
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-EXECUTIVE-CROSS-DOMAIN-IGF-FOLIOS-001.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "server.js (cancelar, overlay IGF, recalcularUtilYResultado)"
  - "lib/usuario-permisos.js"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-igf-arr.js"
  - "lib/director-ia-m2-folio-status.js"
  - "lib/director-ia-m4-clasificacion-query.js"
  - "lib/director-ia-m6-gastos-inversiones.js"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
sql_executed: false
g2: "N/A"
g3: "N/A"
next_task_proposed: "IMPL-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

**READY_WITH_LIMITS.** First slice **C**: read model de Folios REVIEWABLE según las reglas reales de cancelación **más** un contrafactual IGF read-only que reutiliza **exactamente** el overlay live del GET dashboard.

Se puede definir REVIEWABLE **sin** «no depositado = recortable».

Regla operativa física (estatus):

- **No cancelable:** `PAGADO`, `CERRADO`, `COMPROBACIONES`, `EVIDENCIAS`
- **Ya terminal:** `CANCELADO` (idempotente en dashboard)
- **Cancelable bajo reglas actuales:** todos los demás, incluidos `CHEQUE_GENERADO`, `CUENTA_FONDOS`, `SOLICITANDO_PAGO`, `CANCELACION_SOLICITADA`, etapas de planta y carro

El rol **no** cambia ese conjunto de estatus. Cambia **quién** puede invocar qué camino (dashboard directo vs WhatsApp solicitud→ZP).

Si un folio que **hoy entra** al overlay IGF pasa a `CANCELADO`, **la siguiente consulta del GET dashboard deja de sumarlo**. Eso está demostrado en el SQL (`estatus = ANY(...)` no incluye `CANCELADO`; inversiones excluye `CANCELADO` explícitamente). El chat de Director IA **hoy no corre ese overlay**; lee snapshot almacenado.

El contrafactual es lícito solo si:

1. el «antes» y el «después» usan la **misma** matemática live del overlay;
2. se etiqueta como escenario hipotético, no forecast oficial ni ahorro realizado;
3. no se afirma impacto de caja;
4. los cancelables que **no** entran al overlay se listan como reviewable operativo con efecto IGF fórmula = 0.

Director IA **no cancela**. No recomienda. No habilita cheques.

## Ejecución

- Rama: `architecture/director-ia-igf-reviewable-supports-001` (≠ `main`).
- HEAD al arrancar: `78ed5cce Merge branch 'audit/director-ia-executive-cross-domain-igf-folios-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación, SQL, contratos, commit, push, merge.

## 1. Cancelación — confirmado, no asumido

### Endpoint dashboard (cancelación directa)

`POST /api/folios/:id/cancelar` — `server.js` L10718–10779.

| Condición | Hecho físico |
|---|---|
| Auth | `dashboardAuthMiddleware` + `dashboardBlockGVFoliosMiddleware` (GV 403 folios) |
| Permiso | `acceso_cancelar_folio_dashboard`. Fallback de rol si no hay objeto permisos: `GA`, `GG`, `AD`, `ZP` |
| Default por rol | AD/ZP/GG/GA = true. CDMX/CF_CDMX = false. GV = false |
| Planta | `assertPlantaPermitidaDashboard`: solo `GG`/`GA`/`AD` contra `plantas_permitidas`. **ZP no se filtra ahí** |
| Extra CDMX | Si rol `CF_CDMX` y no hay objeto permisos → 403 |
| Folio | debe existir |
| `CANCELADO` | 200 `{ already: true }` |
| Bloqueo estatus | `PAGADO`, `CERRADO`, `COMPROBACIONES`, `EVIDENCIAS` → 400 |
| Destino | `updateFolioEstatus(..., CANCELADO)` **directo** |
| Historial | `insertHistorial` con motivo (default: duplicados dashboard) |
| Notificación | WhatsApp planta GG/GA si `!solo_zp_ad` |
| Otras condiciones | **No** hay chequeo de cheque emitido, póliza, presupuesto ni reversibilidad |

UI que llama este endpoint: `AnalisisDuplicadosModal` → `postCancelarFolio`. El drawer **no** cancela por HTTP: ofrece WhatsApp `cancelar F-… motivo:`.

### WhatsApp (solicitud, no CANCELADO inmediato)

Comando `cancelar F-YYYYMM-XXX` — `server.js` L20623–20666. Requiere `FLAGS.APPROVALS`.

| Condición | Hecho físico |
|---|---|
| Quién solicita | AD, GA, GG, CDMX (`puedeSolicitar`) |
| Destino | `CANCELACION_SOLICITADA` (no `CANCELADO`) |
| Bloqueo | mismos 4 estatus + ya `CANCELADO` + ya `CANCELACION_SOLICITADA` |
| Extra | **motivo obligatorio** |
| Planta | **no** hay `assertPlantaPermitida` en este comando (busca por número) |
| Autorizar | solo Director ZP; folio debe estar en `CANCELACION_SOLICITADA` → `updateFolioCancelado` → `CANCELADO` + historial |
| Rechazar | ZP; debe estar en `CANCELACION_SOLICITADA` |

### Permisos (catálogo, no inferidos)

`lib/usuario-permisos.js`:

| Rol | solicitar | aprobar | cancelar dashboard | IGF KPIs |
|---|---|---|---|---|
| AD | sí | sí | sí | sí |
| ZP | no | sí | sí | sí |
| GG | sí | no | sí | sí |
| GA | sí | no | sí | **no** |
| CDMX | sí | no | **no** | sí |
| GV | no | no | no | sí |

### Estados puntuales pedidos

| Estado | ¿Dashboard → CANCELADO? | ¿WhatsApp solicitud? | ¿Entra overlay IGF? |
|---|---|---|---|
| GENERADO / PENDIENTE_APROB_PLANTA / APROB_PLANTA | sí | sí | **no** |
| PENDIENTE_APROB_ZP | sí | sí | `folios_aprob_zp_kg` |
| CANCELACION_SOLICITADA | sí (directo) | no (ya pendiente) | `folios_aprob_zp_kg` |
| APROBADO_ZP / LISTO_PARA_PROGRAMACION / SELECCIONADO_SEMANA | sí | sí | `folios_carro_kg` |
| CUENTA_FONDOS | sí | sí | `folios_carro_kg` |
| CHEQUE_GENERADO / SOLICITANDO_PAGO | **sí** | **sí** | `folios_carro_kg` |
| PAGADO | no | no | parte de `deposito_cierre_kg` |
| CERRADO | no | no | parte de `deposito_cierre_kg` |
| COMPROBACIONES | no | no | parte de `deposito_cierre_kg` |
| EVIDENCIAS | no | no | parte de `deposito_cierre_kg` |
| CANCELADO | already | already | **no** |

**REVIEWABLE = B_runtime_cancellable:** estatus ∉ {PAGADO, CERRADO, COMPROBACIONES, EVIDENCIAS, CANCELADO}.

No es A (todo lo anterior a PAGADO/CERRADO): A omitiría que COMPROBACIONES/EVIDENCIAS también bloquean, y llamaría «pre-depósito» a CHEQUE_GENERADO.

No es C extra de negocio: no hay flag físico adicional.

No es D: el runtime alcanza.

Etiqueta obligatoria: **cancelable operacional ≠ materializado contable ≠ no depositado ≠ ahorro**.

## 2. IGF — cómo se calculan las partidas de folios

Fuente: `buildIgfForecastPayload` en `server.js` (overlay **en memoria** sobre la fila de `igf.compromiso_lines`). **No** se persiste el overlay al recargar el GET. El PATCH HG sí escribe utilidad/resultado, no los cubos de folios.

Filtro común de categoría (`SQL_WHERE_IGF_EXCLUYE_FOLIOS_CATEGORIA`):

- excluye `INVERSIONES`, `DYO`, `COMISIONES`
- excluye categoría LIKE derechos/obligaciones
- excluye `subcategoria = COMISIONES`
- **TALLER no está excluido** → si su estatus cae en un cubo, **sí suma**

Periodo: `mes_cargo = YYYY-MM` del mes IGF.  
Scope planta: IDs de la empresa (`GT - Puebla` → keys `E7` + `Puebla`).  
Denominador: `ventaKg = venta_ton * 1000`. Si `ventaKg <= 0` o no hay plantas, los `*_kg` de folios quedan `null`.

### `folios_aprob_zp_kg`

`SUM(importe)` donde `estatus IN (PENDIENTE_APROB_ZP, CANCELACION_SOLICITADA)` + exclusión de categoría.  
`$/kg = round(total / ventaKg, 2)`.

### `folios_carro_kg`

`SUM(importe)` donde `estatus IN ESTADOS_HASTA_CHEQUE`:

- APROBADO_ZP, LISTO_PARA_PROGRAMACION, SELECCIONADO_SEMANA
- CUENTA_FONDOS
- CHEQUE_GENERADO, SOLICITANDO_PAGO

### `deposito_cierre_kg`

Cuatro SUMAS separadas: PAGADO, CERRADO, COMPROBACIONES, EVIDENCIAS.  
`totalDepositoCierre = suma de las cuatro`.  
`deposito_cierre_kg = round(−total / ventaKg, 2)` **solo si total > 0**.  
En `recalcularUtilYResultado` esa línea **se suma** (ya viene negativa).

### `gasto_kg`

```
gasto_kg = round(presupuesto_kg + folios_aprob_zp_kg + folios_carro_kg + deposito_cierre_kg, 2)
```

(`deposito_cierre_kg` negativo reduce el gasto numérico.)

### `resultado_final`

`recalcularUtilYResultado` (L12271–12304):

```
util_oper_kg = margen + com_desc + deposito_cierre
             − presupuesto − folios_aprob_zp − folios_carro
             − impuesto − hg − bancos_planta − provision_planta
resultado_final_kg = util_oper − gtos_apoyos_corp − bancos_corp − otros_programas − inversiones
```

Importes = `*_kg * ventaKg`.

`gtos_apoyos_corp_kg` **no** sale de folios de planta.  
`inversiones_kg` live **solo mes actual**, categoría `INVERSIONES`, `estatus IS NULL OR <> CANCELADO`. Meses pasados: valor almacenado IGF.

### ¿CANCELADO deja de entrar al recalcular?

**GET dashboard IGF: sí.** Las consultas son `estatus = ANY(lista)`. `CANCELADO` no está en ninguna lista de zp/carro/depósito/cierre/comprobaciones/evidencias. Inversiones lo excluyen. Reconsultar el forecast **después** de un cancel real cambia el overlay.

**Chat Director IA hoy: no automáticamente.** `loadIgfCommitSnapshot` lee la fila almacenada. Inventario M7: «sin overlay». Cancelar un folio **no** reescribe `compromiso_lines`.

**CANCELACION_SOLICITADA:** sigue en IGF, en el cubo ZP (no desaparece).

## 3. Contrafactual read-only — factible con límites

Pregunta: «si estos folios dejaran de entrar bajo las reglas actuales, el IGF matemático sería X».

**Sí**, reutilizando en-process (sin HTTP, sin UPDATE):

1. Resolver empresa/planta/mes iguales al overlay (`GT - Puebla` → IDs E7+Puebla; `mes_cargo` del mes IGF abierto).
2. Calcular **baseline live** = mismas SUMAS + `recalcularUtilYResultado` (no el snapshot crudo del annex).
3. Calcular **escenario** = las mismas SUMAS **excluyendo** folio IDs REVIEWABLE que **hoy están en un cubo IGF**.
4. Etiquetar: contrafactual, no forecast oficial, no ahorro realizado, no cash.
5. Si snapshot almacenado ≠ baseline live: **declarar la discrepancia** (Constitución: no ocultar).

No mutar. No PATCH. No llamar ahorro.

Folios REVIEWABLE en etapa de planta (fuera de cubos): se listan; contribución al contrafactual = 0 bajo la fórmula vigente.

## 4. Clasificación «apoyos»

| Familia M4 | ¿Alimenta overlay de folios IGF? |
|---|---|
| GASTOS (y resto no excluido, incl. TALLER) | Sí, si el estatus cae en zp/carro/deposito_cierre |
| INVERSIONES | No en zp/carro/depósito. Sí `inversiones_kg` en **mes actual** |
| DYO / COMISIONES / derechos-obligaciones | Excluidos de cubos de folios |
| `gtos_apoyos_corp_kg` | Cifra corporativa subida; **no** es lista de folios |
| Tema AR «Apoyos» | No es esta conversación; no alcanzarlo |

First slice «apoyos» = folios del scope planta+`mes_cargo` que **o bien** entran al overlay (mismas exclusiones SQL) **o bien** son INVERSIONES del mes actual. No todo folio del universo. No AR. No corp.

## 5. Cruce de dominio y guard cheques

Hecho previo (AUDIT-001) reconfirmado por lectura:

- T1 IGF → fallback GPT + annex snapshot; **no** escribe `conversation_state`
- «¿Qué podemos recortar de apoyos?» → `unknown` → clarify
- «depósito/cierre» → `detectUnsupportedDirectorIaDomain` **antes** del planner → `cheques` `coverage: none`

First slice de routing (dentro de C):

1. Precedencia **mínima** en capabilities: si el turno es este read model (apoyos/recortar/detener / depósito-cierre como **estatus de folio**, no número de cheque), `matchesAllowedReadableIntent` o regla anterior a `UNSUPPORTED_RULES.cheques`.
2. **No** integrar cheques, pólizas, fechas de depósito ni números de cheque.
3. Intent nuevo in-process (no reusar M4/M6: M4 pide dos `YYYY-MM`; M6 no clasifica cancelabilidad).
4. Planta = request revalidada (`assertFolioStatusAccess`). Periodo = mes IGF abierto ya resuelto (revalidar, no inventar).
5. Fresh SELECT `public.folios`. No reusar evidencia IGF como lista de folios.
6. Estado efímero: este intent **sí** debe poder heredar follow-ups («¿cuánto suman?», «¿cuáles?») — hoy `igf_status` no es inheritable; no heredar IGF para contestar Folios.
7. GA: puede leer Folios; IGF/contrafactual 403. Fail-closed. No cruzar planta.

## 6. Riesgo comercial

Sin join folio → `cliente_key` → venta/DICF/acciones. **DEFER.** No bloquea el first slice. Prohibido inventar riesgo.

## 7. Comparación A/B/C/D (solución)

| Opción | Qué da | Por qué no / sí |
|---|---|---|
| A routing only | Enseñar agregados de etapa ya existentes | No define REVIEWABLE; no responde «cuáles todavía se pueden detener» |
| B read model cancelable | Lista + totales + estatus + cubo IGF | Necesario y defendible; deja sin respuesta la pregunta de IGF si la matemática ya existe |
| **C = B + contrafactual** | B + escenario live overlay | **Máximo valor ejecutivo demostrable** sin inventar reversibilidad ni cash |
| D flag nuevo | Persistir «reviewable» | Innecesario: el runtime de cancelación alcanza |

**Seleccionado: C.**

No se eligió C a ciegas: el GET dashboard **ya** deja de incluir `CANCELADO` al reconsultar. El IMPL debe copiar esa matemática, no inventar otra, y usar overlay live como baseline.

## 8. First slice exacto (IMPL)

In-process, SELECT-only.

**Hacer**

- Intent + loader read-only: identidad, concepto, categoría/subcategoría, importe, estatus, etapa visual, `mes_cargo`, planta, `cancelable_under_current_rules`, cubo IGF o `none`, reason/limitation, provenance.
- Agregados: count y Σ importe REVIEWABLE vs no-cancelable vs cancelados excluidos.
- Contrafactual overlay + `recalcularUtilYResultado` + etiqueta hipotética.
- Routing IGF mes abierto → este modelo (misma planta, mismo periodo, requery fresco).
- Excepción mínima del guard cheques (solo este wording/intent).
- Authz fail-closed (GV folios; GA sin IGF; `plantas_permitidas`; equivalentes Puebla/E7 alineados al overlay).
- Tests: cada estatus; roles; misma planta/`mes_cargo`; CANCELADO fuera; contrafactual sin mutación; regresión IGF/Folios/budget/daily/suite.

**No hacer**

- Cancelar, aprobar, mover, PATCH IGF.
- Habilitar cheques.
- Recomendar recorte, ROI, riesgo.
- Llamar ahorro / cash / forecast oficial al escenario.
- Arreglar semántica de mes cerrado (fuera de slice).
- Phrasebook; heredar `igf_status` como Folios.
- Schema / flag persistido.

**Lenguaje permitido:** «cancelable bajo las reglas actuales»; «ya no se puede cancelar por estatus»; «si dejaran de entrar al cálculo overlay, el escenario matemático sería X».

**KEEP_DETERMINISTIC:** identidad, estatus, elegibilidad, importe, planta, mes, math, authz, provenance.  
**GPT:** síntesis y límites.  
**PROHIBIDO:** recomendación automática de cancelar; ahorro realizado; riesgo inventado.

## 9. Tests a diseñar (si se autoriza IMPL)

- Ciclo: cada estatus técnico → cancelable / bloqueado.
- Authz: GA/GG/AD/ZP/CDMX/GV/GA-sin-IGF.
- Query: misma planta (equivalentes), mismo `mes_cargo`, CANCELADO excluido, totales.
- Conversación: IGF → recortar apoyos; cuáles se pueden detener; cuáles ya no; cuánto suman.
- Guard: «depósito/cierre» no cae a cheques; «número de cheque» sigue bloqueado.
- Contrafactual: quitar un folio elegible y en cubo → overlay reconcilia; sin UPDATE.
- Regresión suite Director IA completa.

## 10. Contratos / G2 / G3

Constitución: no alucinar, no ocultar discrepancias (snapshot vs overlay), no mutar estado institucional.

EKE / inventario: folios PARTIAL (no cancela); IGF PARTIAL (hoy sin overlay). El slice **reusa** SQL/fórmula ya existentes en dashboard; no abre cheques; no escribe EKS.

04 IES / 05 RE: el contrafactual es escenario matemático etiquetado, **no** hipótesis causal N5 ni Recommendation N5. No IES oficial.

**G2: N/A** — no se reescribe Constitución, EKE, 04 ni 05.  
**G3: N/A** — no hay contrato N1–N5 nuevo. Inventario se sincroniza en DOCS posterior (no esta tarea). Overlay no convierte M7 en COMPLETE.

## 11. Readiness

| Ítem | Valor |
|---|---|
| Determinación | READY_WITH_LIMITS |
| A/B/C/D | **C** |
| Reviewability | B_runtime_cancellable |
| Authz | Lectura Folios ≠ permiso de cancelar. Director IA read-only |
| Apoyos | Overlay exclusions + INVERSIONES mes actual. No corp. No AR |
| CANCELADO | Sale del overlay en la siguiente consulta dashboard |
| Contrafactual | Sí, overlay live, hipotético |
| Routing | Intent nuevo + estado heredable de Folios, no de IGF |
| Cheques | Excepción mínima; cheques sigue `none` |
| Límites | snapshot≠overlay; etapa planta efecto 0; CHEQUE_GENERADO cancelable≠ahorro; riesgo comercial diferido; GA sin IGF |

## Porcentaje

Antes: 10.5 / 20 = 52.5%  
Después (esta readiness): 10.5 / 20 = 52.5%  
IMPL esperado: 0.0 pp (sigue PARTIAL)

## NEXT_TASK

**IMPL-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001**

No autorizada. No ejecutada. Este reporte no es G1.

## STOP

Readiness cerrada. Sin código. Sin mutación. Sin commit/push/merge.
