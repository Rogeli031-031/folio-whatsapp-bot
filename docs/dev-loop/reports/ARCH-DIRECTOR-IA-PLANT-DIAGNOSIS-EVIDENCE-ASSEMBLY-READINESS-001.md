# Reporte — ARCH-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
determination: "READY"
slice: >
  wiring in-process en askDirectorIa para intent plant_diagnosis:
  cargar AR + DICF + bitácora + ARR + IGF + commercial_state en una corrida;
  provenance de seis bloques; periodos visibles; authz por fuente;
  commercial_state SELECT-only (no computeDicf); sin M9; sin IES; sin N5;
  financial_diagnosis intacto; una llamada OpenAI
destination: "chat legado (OpenAI existente), NO Reasoning Engine oficial N5"
g2: "N/A"
g3: "N/A"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001.md"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-009.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "lib/director-ia-planner.js (lectura)"
  - "lib/director-ia-tools.js / director-ia-tool-orchestrator.js (lectura)"
  - "lib/director-ia-chat.js / director-ia-context.js (lectura)"
  - "lib/director-ia-action-register.js / action-register-board.js (lectura)"
  - "lib/director-ia-bitacora.js (lectura)"
  - "lib/director-ia-igf-arr.js (lectura)"
  - "lib/director-ia-commercial-state.js / dicf.js (lectura)"
  - "lib/director-ia-financial-diagnosis.js (lectura)"
  - "lib/director-ia-m11-commercial-dossier.js (lectura SELECT-only)"
  - "lib/director-ia-capabilities.js (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-001"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A. No se editan contratos. El slice no es IES ni RE."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "52.5% no cambia. Tras IMPL futuro: 10.5/20 = 52.5% (0.0 pp)."
  - "Ningún módulo cambia de estado. Capacidad transversal; no puntúa M7/M8/M11/M12."
```

## Resumen ejecutivo

**READY.** El contrato vigente **ya permite** evidencia multi-fuente. El gap es **wiring de chat legado**, no un IES nuevo ni un Reasoning Engine.

El planner de `plant_diagnosis` declara seis dominios:

```text
action_register, dicf, bitacora, arr, igf, commercial_state
```

El tool plan lista seis tools ejecutables. El orchestrator **no ejecuta** (Fase 3). El chat **no tiene** `if (intent === "plant_diagnosis")`. Cae a OpenAI con el GET context (AR + DICF + bitácora + comentarios) serializado a JSON. IGF/ARR y listas `commercial_state` **no** se cargan para «cómo va la planta». M9 **no** está en el mapa y **no** debe entrar.

`financial_diagnosis` ya ensambla IGF + ARR + M9. Ese path **se preserva**. Este slice es otro intent, otro pack, sin M9.

**IES:** permite varios hechos/evidencias y `source_health[]` por dominio. Este slice **no** proyecta IES.

**Reasoning Engine:** consume un IES válido; **prohíbe** loaders y payloads crudos. Runtime **pendiente**. Este slice **no** entrega al RE oficial.

**G2 = N/A. G3 = N/A.**

Path de IMPL (no se implementa aquí):

```text
plant_diagnosis
  → planner (ya)
  → tool plan debug (ya; orchestrator sigue sin ejecutar)
  → askDirectorIa rama in-process
      AR (board, includeNotes: false)
      DICF (summarizeDicfContext)
      bitácora (loadBitacoraForChat)
      IGF + ARR (loadIgfArrSourceBlocksForChat)
      commercial_state SELECT-only (arr.dicf_cliente_mes; NO computeDicf)
  → assemblePlantDiagnosisEvidence (seis bloques)
  → provenance / status / periodo por fuente
  → OpenAI chat legado (no N5), una llamada
  → respuesta
```

Un IMPL futuro **no cambia** 10.5 / 20 = **52.5%** (0.0 pp).

NEXT_TASK (no autorizada): `IMPL-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-001`.

---

## Ejecución

- Rama: `architecture/director-ia-plant-diagnosis-evidence-assembly-readiness-001` (≠ `main`).
- HEAD: `5d8b516c Merge branch 'architecture/director-ia-global-next-module-prioritization-009'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. En `CURRENT_TASK.md` solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin código, matriz, contratos, commit, push, merge.

---

## Baseline

| Campo | Valor |
|---|---|
| Priorización | `ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-009` |
| Capacidad | transversal `plant_diagnosis` evidence assembly |
| Global ahora | **10.5 / 20 = 52.5%** |
| Tras IMPL futuro | **10.5 / 20 = 52.5%** (**0.0 pp**) |
| Módulos | ninguno cambia de estado |
| Recién cerrado | `financial_diagnosis` = IGF + ARR + M9 (no repetir; no meter M9 aquí) |

Esta tarea **no cambia estados ni porcentaje**.

---

## Physical runtime gap

Punto exacto: `lib/director-ia-chat.js` `askDirectorIa`.

| Paso | Qué hace hoy | Efecto |
|---|---|---|
| Planner L64 | `plant_diagnosis` → 6 dominios | Plan **sí** |
| Tools | 6 tools `available` / `available_on_demand`, `readOnly: true` | Plan de tools **sí** |
| Orchestrator | declara; `can_execute` no despacha | Loaders **no** corren por el plan |
| Chat L2517–2518 | plan + tool plan solo `directorIaDebug` | Intent **no gobierna** routing |
| **No hay** `if (intent === "plant_diagnosis")` | Cae al path OpenAI genérico | |
| L2633 | `financial_diagnosis` in-process | Path hermano **preservado** |
| L2745 | `buildDirectorIaContextPayload` | AR + DICF + bitácora + comentarios |
| L1911 | `extractChatContextFromPayload` exige `action_register.ok` | Si AR falla, aborta **todo** |
| `isPlantDiagnosticQuestion` | regex distinta del planner | «cómo va la planta» **no** entra al prefijo de diagnóstico |
| L2897–2904 | si el regex sí pega: prefijo AR + JSON completo | Sigue siendo dump AR |
| `shouldAttachIgfArrAnnex("cómo va la planta")` | **false** (no hay keyword IGF/ARR/margen) | IGF/ARR ausentes |
| `isCommercialStateListQuestion` | **false** (no «dejaron…») | Listas CS ausentes |
| L2041–2058 | `JSON.stringify(context)` al user | Mega-dump AR/DICF/bitácora/comentarios |
| Comentarios annex | se adjunta si hay filas | **No** está en el mapa del intent |

Síntoma: el ejecutivo pregunta «cómo va la planta»; el planner pide seis fuentes; el modelo ve un JSON de Action Register (y a veces DICF/bitácora/comentarios). No ve IGF, ARR ni listas comerciales.

**Cambio mínimo:** rama in-process `directorIaPlan.intent === "plant_diagnosis"` (mismo patrón que `financial_diagnosis`). **No** convertir el orchestrator en ejecutor genérico. **No** basar el slice en `isPlantDiagnosticQuestion` (desalineado del planner).

---

## Planner

Archivo: `lib/director-ia-planner.js`.

| Campo | Hecho |
|---|---|
| Intent | `plant_diagnosis` — «Diagnóstico de planta» |
| Confianza | 0.84 (regla `plant_diagnosis`) |
| Clarification | no (0.84 ≥ 0.55) |
| Evidence | `[{ type: "rule", value: "plant_diagnosis" }]` |
| Dominios | **todos requeridos de intento**: AR, DICF, bitácora, arr, igf, commercial_state |
| Opcionales en el mapa | **ninguno** |
| M9 | **no** está en el mapa (sí está en `financial_diagnosis`) |
| `revision_notes` | **no** está en el mapa |
| Periodo pedido | el planner **no** fija YYYY-MM; solo dominios |
| Scope | implícito: pregunta + `planta_id` del request |
| Comentario L5 | el planner **no gobierna** el routing del chat |

Reglas que disparan el intent (después de financieros y listas comerciales):

- `como va (la )planta`
- `diagnostico (de )(la )planta`
- `riesgos (tiene\|de\|en) (la )planta`
- `como estamos (en )(la )planta`
- `como va <palabra>` si no es tema AR ni arr/igf/presupuesto/venta/descuento/ingreso/folio/cliente/accion

Prioridad: `financial_diagnosis` y `commercial_state` se detectan **antes**. «cómo va el margen de la planta» sigue siendo financiero. «dejaron de comprar» sigue siendo lista comercial. El IMPL **no** debe interceptar esos intents.

---

## Chat runtime

`askDirectorIa` ya ramifica por intent para M3/M5/M9/`financial_diagnosis`/etc. Para `plant_diagnosis` **no**.

Dos detectores distintos:

| Detector | Cubre «cómo va la planta» | Cubre «diagnóstico de la planta» |
|---|---|---|
| Planner `plant_diagnosis` | **sí** | **sí** |
| `isPlantDiagnosticQuestion` | **no** (falta en `PLANT_DIAGNOSTIC_SIGNAL_RE`) | **sí** (`diagnóstico`) |

Por eso el síntoma canónico termina en modo `full` + JSON, no en el prefijo de vencidas.

`buildPlantDiagnosticUserPrefix` = resumen AR + top 5 vencidas. No IGF, no ARR, no commercial_state.

Una sola llamada OpenAI ya ocurre en ese path. El IMPL debe **mantener** `openai_call_count = 1` y **no** early-return de Action Register.

---

## Action Register evidence

| Campo | Hecho físico |
|---|---|
| Fuente | `arr.action_register_revisions` / `entries` / `items` vía `buildActionRegisterBoardPayload` |
| Helper | `summarizeActionRegisterBoard`, `summarizeTopOverdueActions`, `summarizeActionRegisterResponsables`, `buildExecutiveSummary` |
| Planta | `WHERE planta_id = $1` |
| Periodo/snapshot | `revision_date` más reciente; conteos al **día CDMX** (`todayYmdMexicoCity`) |
| Acciones | abiertas / cerradas / vencidas válidas |
| Responsables | nombres + rol (`loadUsuarioRolesByIds`) |
| Riesgos/vencidas | `top_overdue` (default 10); `invalid_overdue` separado |
| Notas M12 | `includeNotes: false` en context. **Fuera** de este intent |
| Authz | `assertPlantaAccess(req, planta_id)` en GET context |
| Provenance | hoy embebida en JSON; IMPL debe bloquear `action_register` |
| Read-only | **sí** (SELECT board) |
| Límite IMPL | summary + top 5 vencidas + responsables top; **no** `tema_details` completo |

---

## DICF evidence

| Campo | Hecho físico |
|---|---|
| Fuente | `arr.dicf_acciones` (+ historial por `accion_id`) |
| Helper | `summarizeDicfContext(client, planta_id)` |
| Planta | `getPlantaIdsEquivalentes(planta_id)` — IDs canónicos, **no** join por nombre |
| Periodo | no es mes único; filas con `fecha_compromiso` / `created_at` / `cerrado_at` |
| Acciones/comentarios | descripción, estado, responsable, resultado_cierre, historial. **No** attachments |
| Límite actual | 40 detalles (`DEFAULT_DICF_DETAILS_LIMIT`) — demasiado para el pack |
| Authz | misma planta del context (`assertPlantaAccess`) |
| Provenance | hoy dentro de `action_register.dicf_details` — IMPL **separa** bloque `dicf` |
| Read-only | **sí** |
| Límite IMPL | máx. 8 acciones (abiertas primero); sin historial completo |

No confundir con `commercial_state` (listas forecast). DICF aquí = **acciones de seguimiento**.

---

## Bitácora evidence

| Campo | Hecho físico |
|---|---|
| Fuente | `arr.director_ia_bitacora` |
| Helper | `loadBitacoraForChat` |
| Planta | `planta_id` FK a `public.plantas` |
| Periodo | ventana **3 meses** desde `MAX(fecha)` (`CHAT_CONTEXT_MONTH_WINDOW`) |
| Campos | fecha, tipo, título, `resumen_ia`, contenido recortado, created_at, planta_nombre |
| Authz | misma planta del context |
| Provenance | array en payload; IMPL bloque `bitacora` |
| Read-only | **sí** en chat (el módulo también tiene soft-delete; **no** usarlo) |
| Límite actual | 30 sesiones — recortar |
| Límite IMPL | 5 más recientes; preferir `resumen_ia`; no volcar `contenido` |

---

## ARR evidence

| Campo | Hecho físico |
|---|---|
| Fuente | proyección planta (`loadArrProyForPlant`) — mismas tablas ARR que el annex |
| Helper IMPL | `loadIgfArrSourceBlocksForChat` → bloque `arr` **separado** (no annex fusionado) |
| Planta | `planta_id` → `public.plantas` → `plant_code` ARR |
| Periodo | `resolveYearMonthFromQuestion` o mes CDMX actual (`YYYY-MM`) |
| Shape | `{ venta_ton, desc_kg }` ; null permitido |
| Nulls | null ≠ 0; parcial si falta uno de los dos |
| Authz | **GA 403** `SOURCE_RESTRICTED`; GV `assertGVPlantaNombreAccess` |
| Provenance | reutilizar mapeo tipo `mapArrBlock` de financial_diagnosis **sin** M9 |
| Read-only | **sí** |
| No usar | `loadIgfArrAnnexForChat` (fusiona texto; a veces mete commercial_state) |

---

## IGF evidence

| Campo | Hecho físico |
|---|---|
| Fuente | `igf.versions` + `igf.compromiso_lines` (`loadIgfCommitSnapshot`) |
| Helper IMPL | mismo `loadIgfArrSourceBlocksForChat` → bloque `igf` |
| Planta | `plant_code` / nombre de planta desde `planta_id` |
| Periodo | mismo YYYY-MM resuelto que ARR (declararlo; no fingir igualdad con AR) |
| Versión | `version_id` / `version_number` más reciente del mes |
| Snapshot/composición | `extractIgfComposition` si hay fila |
| Nulls | `omitted_null_keys`; null ≠ 0; sin recálculo ni overlay |
| Authz | **GA 403**; GV planta |
| Provenance | mapeo tipo `mapIgfBlock` |
| Read-only | **sí** |
| No es | M9; no es causa de AR |

---

## commercial_state evidence

| Campo | Hecho físico |
|---|---|
| Loader actual | `loadCommercialStateForChat` → `dicf.computeDicf` |
| **Write** | `computeDicf` hace **DELETE + INSERT** en `arr.dicf_cliente_mes` |
| Planta | `planta_id` → nombre → `plant_code` |
| Periodo (live) | `periodoMes` / `last_date` / `window_days` del compute |
| Estado | grupos dejaron / disminuyeron / aumentaron / nuevos |
| Authz | **GA 403** (KPI financiero); GV planta |
| Tool | `get_commercial_state` declara `readOnly: true` — **el executor real escribe caché** |

**Path read-only seguro (obligatorio en IMPL):** SELECT `arr.dicf_cliente_mes` por `plant_code` + último `year`/`month` (mismo patrón M11), agrupar por `estado` almacenado. **No** llamar `computeDicf`. **No** llamar `loadCommercialStateForChat`.

Si no hay filas de caché: `DATA_NOT_FOUND`, no recalcular. Limitación visible: el corte es el **materializado**, no un recálculo live.

Límite IMPL: conteos por categoría + top 5 de «Dejaron de comprar» (y opcional 3 de otras). No 20×4 clientes.

`injectAccionesAbiertas` junta conteos DICF por `cliente_key` / nombre. **No** usarlo en este slice: mezclaría bloque CS con DICF y reintroduciría join por nombre. Las acciones DICF ya van en el bloque `dicf`.

---

## Plant key

Clave común: **`planta_id` del request**.

| Fuente | Cómo acota planta | ¿Join por nombre? |
|---|---|---|
| AR | `revisions.planta_id` | no |
| DICF | `getPlantaIdsEquivalentes(planta_id)` | no |
| Bitácora | `bitacora.planta_id` | no |
| ARR / IGF | id → `public.plantas` → `plant_code` | lookup de código, no join entre fuentes |
| CS | id → nombre → `plant_code` → `dicf_cliente_mes.plant_code` | igual |

No combinar plantas distintas. No unir clientes AR ↔ CS por nombre. No meter M3 KPIs.

---

## Period alignment

| Fuente | Ventana real | ¿Alineable a un YYYY-MM único? |
|---|---|---|
| AR | snapshot del board + «hoy» CDMX | no (no es mes) |
| DICF | fechas por acción | no |
| Bitácora | 3 meses desde última nota | no |
| ARR | YYYY-MM (pregunta o mes actual) | sí, entre sí con IGF |
| IGF | YYYY-MM de la versión | sí, con ARR |
| CS | year/month materializado en caché | independiente |

**Regla:** no alinear silenciosamente. Cada bloque declara `period` / `window`. `alignment` solo compara IGF vs ARR vs CS si hay YYYY-MM; AR/DICF/bitácora se etiquetan como `snapshot` / `action_dates` / `bitacora_window`.

«Cómo va la planta» **no** exige el mismo corte. Si el usuario pide un mes concreto, IGF/ARR/CS intentan ese mes; AR/bitácora muestran limitación.

Mismatch IGF↔ARR (mismo helper, mismo mes pedido, dato distinto): visible, no rellenar.

---

## Authz intersection

| Fuente | Regla |
|---|---|
| AR / DICF / bitácora | `assertPlantaAccess` — planta del JWT |
| IGF / ARR / CS | GA **SOURCE_RESTRICTED**; GV planta por nombre |

**Planta:** una sola `planta_id` autorizada. Nunca ampliar a otras plantas para «completar» el pack. Cross-planta bloqueado.

**Por fuente (no abortar el pack entero por GA):**

- GA **sí** puede ver AR/DICF/bitácora.
- GA **no** ve IGF/ARR/CS (bloques `SOURCE_RESTRICTED`). **No** abortar `plant_diagnosis` completo (eso quitaría el diagnóstico operativo que GA ya tiene). **No** rellenar KPIs con AR.
- Esto **no** relaja authz financiera: GA sigue sin cifras IGF/ARR/CS.
- Si `assertPlantaAccess` falla: abort 403 (planta inaccesible).
- Si GV falla IGF/ARR/CS pero pasa AR: igual que GA — bloques financieros restricted; resto sigue.
- `financial_diagnosis` **conserva** su abort GA (allí todas las fuentes son financieras). No copiar ese abort a este intent.

Unauthorized ≠ missing.

---

## Provenance

Seis bloques, nunca fusionados:

```text
action_register | dicf | bitacora | arr | igf | commercial_state
```

Cada uno:

| Campo | Contenido |
|---|---|
| `source` | tabla/helper canónico |
| `plant` | `{ planta_id, planta_nombre, plant_code? }` |
| `period` / `window` | corte real o null explícito |
| `status` | `SOURCE_AVAILABLE` / `SOURCE_PARTIAL` / `DATA_NOT_FOUND` / `SOURCE_RESTRICTED` / `SOURCE_ERROR` |
| `payload` | recorte del slice |
| `absence` / `error` | separados; `error_kind` si TOOL_ERROR |

Una fuente no sustituye otra. No un solo blob «diagnóstico de planta».

---

## Absence / error

| Código | Significa | No significa |
|---|---|---|
| `null` en cifra | valor no almacenado | cero |
| `0` | cero observado | ausencia |
| `DATA_NOT_FOUND` | búsqueda OK, sin filas | «todo bien» |
| `ABSENCE_CONFIRMED` | no forzar; IES no se proyecta | — |
| `SOURCE_RESTRICTED` | permiso | missing |
| `SOURCE_ERROR` / `TOOL_ERROR` | fallo | vacío |
| `SOURCE_PARTIAL` | parte del payload falta | diagnóstico completo |

---

## Failure matrix

| Caso | Responder | Provenance |
|---|---|---|
| Seis OK | sí, pack completo etiquetado | 6 AVAILABLE/PARTIAL |
| AR missing (`DATA_NOT_FOUND`) | sí, limitado; no fingir «sin riesgos» | AR NOT_FOUND; resto intacto |
| AR TOOL_ERROR | sí si hay otras fuentes; limitación `ar_SOURCE_ERROR` | error en AR |
| AR unauthorized (sin planta) | **abort 403** | no OpenAI |
| DICF missing | sí | dicf NOT_FOUND |
| Bitácora missing | sí | bitacora NOT_FOUND |
| ARR missing | sí | arr NOT_FOUND; no copiar venta IGF |
| IGF missing | sí | igf NOT_FOUND; no copiar ARR |
| CS missing (caché vacía) | sí | cs NOT_FOUND; **no** computeDicf |
| Una fuente TOOL_ERROR | sí, parcial; no presentar completo | error en ese bloque |
| Una fuente unauthorized (GA en IGF/ARR/CS) | sí, parcial; bloques restricted | no abort pack |
| Period mismatch IGF/ARR/CS | sí; `alignment.status=mismatch` | periodos crudos |
| Todas sin datos | sí, limitado: «no hay evidencia cargada»; no normalidad | 6 NOT_FOUND |
| Seis restricted (no esperado) | abort 403 | no OpenAI |

Nunca presentar parcial como completo (`assembly_status: complete | partial`).

---

## Reasoning semantics

**Permitido:** riesgos observables (vencidas AR); acciones/responsables registrados; listas CS como estado forecast materializado; coincidencias/tensiones **etiquetadas por bloque**; comparar hechos solo si el periodo es el declarado.

**Prohibido:** correlación = causalidad; «AR causó IGF»; comentario/acción DICF prueba causa; un KPI identifica responsable; ausencia = normalidad; hipótesis N5; completar vacíos.

No es IES. No es Reasoning Run.

---

## M9 boundary

`INTENT_DOMAIN_MAP.plant_diagnosis` **no** incluye `delta_*`. La definición canónica de «cómo va la planta / qué riesgos hay» no exige deltas mensuales.

**M9 queda fuera.** No por inercia de `financial_diagnosis`. Ese intent permanece intacto.

---

## Plant diagnosis scope / context policy

Responde: **«¿cómo va la planta?»** y **«¿qué riesgos observables hay?»**

Entra: 6 bloques recortados.

Fuera: M9; M12 notas; comentarios cliente/folio (hoy se cuelan en el JSON; **excluir**); expediente M11; M3 KPIs; M5/M18; IES/N5; `tema_details` completo; 40 DICF; 30 bitácoras; computeDicf live.

Orden determinista:

1. limitaciones / assembly_status  
2. action_register  
3. dicf  
4. bitacora  
5. commercial_state  
6. arr  
7. igf  

Prioridad ejecutiva: riesgos AR y CS «dejaron»; IGF/ARR como snapshot, no como explicación.

---

## Contract check

### 04-IES-STANDARD.md

IES admite `facts[]` / `evidence[]` / `source_health[]` multi-dominio; `SOURCE_RESTRICTED` ≠ missing; `TOOL_ERROR` ≠ vacío. El IES **no** consulta fuentes ni ejecuta tools.

Este slice **no** construye IES. Chat legado con bloques etiquetados. **No** reabre 04.

### 05-REASONING-ENGINE.md

RE: única entrada de conocimiento = IES válido. **Prohíbe** loaders, SQL, payloads crudos. Runtime pendiente.

Este slice **no** llama a N5. OpenAI del chat legado, como `financial_diagnosis`. **No** reabre 05.

### G2 / G3

**N/A.** Wiring de tools ya declarados. Fase 3 sigue declarativa.

Si alguien exigiera runtime IES/N5 o hacer ejecutar el orchestrator genérico: **STOPPED**. Esta readiness **no** lo exige.

---

## Implementation hypothesis

```text
askDirectorIa
  if (directorIaPlan.intent === "plant_diagnosis")
    load AR, DICF, bitácora, IGF/ARR blocks, CS SELECT-only
      (independientes; fail por fuente)
    assemblePlantDiagnosisEvidence
    si abort planta → 403
    si AI off → 503
    buildPlantDiagnosisPrompt (6 bloques, semántica no causal)
    openaiDirectorIaChat  // una vez
    return result (sources, assembly_status, openai_call_count=1)
  financial_diagnosis y demás intents: intactos
```

In-process. Read-only. Sin HTTP interno. Sin writes. Sin IES. Sin RE. Sin M9.

**No** usar `loadCommercialStateForChat` / `computeDicf`.  
**No** usar `loadIgfArrAnnexForChat` como paquete único.  
**No** usar `isPlantDiagnosticQuestion` como llave de la rama.

---

## Tests (diseño; no se implementan)

- `plant_diagnosis` carga seis fuentes (intento + provenance)
- una sola llamada OpenAI
- no early-return Action Register
- no rama por `isPlantDiagnosticQuestion` sola
- provenance 6 bloques
- misma `planta_id`
- cross-planta bloqueado
- periodos visibles; mismatch IGF/ARR/CS visible
- AR / DICF / bitácora / ARR / IGF / CS missing
- TOOL_ERROR por fuente
- GA: IGF/ARR/CS restricted; AR sigue; no abort pack
- GA `financial_diagnosis` abort **preservado**
- partial success explícito
- null ≠ 0; absence ≠ 0; unauthorized ≠ missing
- prompt sin causalidad
- M9 no incluido (sin `delta_*` en el assembler)
- `financial_diagnosis` intacto (IGF+ARR+M9)
- otros intents intactos
- sin HTTP interno
- sin `computeDicf` / sin DELETE+INSERT caché
- contratos sin cambios

---

## Gates

| Gate | Estado |
|---|---|
| G1 | AUTHORIZED (humano); intacto |
| G2 | N/A |
| G3 | N/A |
| G8 | N/A |
| G4 / G5 | no ejecutados; G5 humano tras review |

---

## Percentage

**10.5 / 20 = 52.5%.** Gain **0.0 pp.** Tras IMPL futuro: igual.

---

## Risks

| Riesgo | Mitigación IMPL |
|---|---|
| Fusionar 6 bloques | provenance estricta |
| Meter M9 | fuera del mapa |
| `computeDicf` write | SELECT `dicf_cliente_mes` |
| Abort GA del pack entero | authz por fuente |
| `isPlantDiagnosticQuestion` como llave | usar `intent === "plant_diagnosis"` |
| Mega-dump JSON | límites por bloque |
| Causalidad modelo | addendum como financial_diagnosis |
| Join clientes por nombre | prohibido |
| Romper financial_diagnosis | rama hermana, tests de preservación |
| Caché CS stale | declarar periodo materializado |

---

## NEXT_TASK

Propuesta exacta (no autoriza G1; no encadena; no ejecutar):

**IMPL-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-001**

---

## Acciones no realizadas

No código, matriz, contratos, tests, frontend, SQL, writes, commit, push, merge. NEXT_TASK no ejecutada.

## secrets_check

none

## git diff --check

Limpio (se confirma al cerrar).

## git status

```text
On branch architecture/director-ia-plant-diagnosis-evidence-assembly-readiness-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md
Untracked:
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001.md
```
