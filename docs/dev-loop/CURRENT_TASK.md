task_id: FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-M9-GROSS-BUCKET-LABELS-001

task_type: FIX
mode: REGRESSION_FIRST

status: DONE_PENDING_REVIEW

authorized_by: "Human Approver"
authorized_at: "2026-09-08T15:42:36-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN - FIX M9 GROSS BUCKET SEMANTIC LABELS ONLY; NO NEW NET DELTA; NO M9 SQL/LOADERS; NO ARR; NO BUILDALIGNMENT; NO POST-GENERATION VALIDATOR; NO LIVE_DB; NO MERGE; NO DEPLOY"

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: b99ca2f8fc1638a8763edcdd5058d5bb9168ab37
result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-M9-GROSS-BUCKET-LABELS-001.md

## Problema probado

LIVE financial_diagnosis presentó:

Delta Venta: Disminución de 1059160.26 kg

La auditoría física demostró:

1059160.26 kg = datos.disminuyeron.totalDeltaKg

y significa:

M9_GROSS_DECREASE_BUCKET

NO significa:

PLANT_NET_DELTA
IGF_ARR_GAP
ARR_FORECAST_DELTA

## Invariantes

M9_GROSS_DECREASE_BUCKET != PLANT_NET_DELTA

M9_GROSS_INCREASE_BUCKET != PLANT_NET_DELTA

M9_STOPPED_BUYING_BUCKET != PLANT_NET_DELTA

IGF_ARR_GAP != M9_DELTA

PLANT_NET_MOM_DELTA = NOT_AVAILABLE en Financial Diagnosis actual.

No reconstruirlo.

No inventar:

mas - disminuyeron - dejaron

aunque matemáticamente pudiera derivarse.

## Semántica requerida

Para delta_venta:

### disminuyeron

datos.disminuyeron.totalDeltaKg

debe exponerse conceptualmente como:

GROSS_DECREASE_MAGNITUDE_KG

Ejemplo LIVE:

1059160.26 kg

significa:

"suma bruta de las reducciones de clientes del bucket disminuyeron"

NO:

"la venta de la planta disminuyó 1059160.26 kg"

### mas

totalDeltaKg debe etiquetarse como:

GROSS_INCREASE_MAGNITUDE_KG

Incluye clientes nuevos según la semántica física actual.

NO es delta neto planta.

### dejaron

totalDeltaKg debe etiquetarse como:

GROSS_STOPPED_BUYING_MAGNITUDE_KG

NO es delta neto planta.

## Contrato de prompt requerido

Debe quedar explícito:

M9_PLANT_NET_DELTA_STATUS=NOT_AVAILABLE

FORBIDDEN:

- "Delta Venta disminuyó X" usando solo disminuyeron.totalDeltaKg
- "la planta cayó X" usando un bucket M9
- "la venta neta cayó X" usando un bucket M9
- equiparar M9 bucket con IGF-ARR gap

REQUIRED:

si se menciona 1059160.26:

"reducción bruta acumulada del bucket de clientes que disminuyeron"

o equivalente.

Debe aclararse que otros buckets pueden compensar esa magnitud.

No afirmar el resultado neto sin fuente física.

## IGF vs ARR

Preservar separación:

IGF venta = compromiso/objeto IGF

ARR projected_venta_ton = forecast cierre ARR

Su diferencia:

NO es M9 Delta Venta.

Este FIX no necesita calcular ni mostrar automáticamente la brecha.

## No tocar

lib/director-ia-m9-deltas.js
lib/director-ia-igf-arr.js
server.js
planner
routing
SQL
schema
dependencies
DICF
commercial_state

No modificar:

buildAlignment()
assembleFinancialDiagnosisEvidence()
loadFinancialDiagnosisForChat()

No crear plant net delta.

No post-generation validator.

## Archivos producto permitidos

lib/director-ia-financial-diagnosis.js

Cambios permitidos únicamente en:

formatM9Bucket()
formatM9Family()
buildFinancialDiagnosisPromptControl()
buildFinancialDiagnosisPrompt()

o helper local estrictamente semántico.

Preservar:

pretruncate counts
SOURCE_PARTIAL
MISSING != ZERO
alignment contract
causality contract

## Regresiones mínimas

001 1059160.26 se etiqueta gross decrease bucket
002 no se etiqueta plant net delta
003 no se etiqueta IGF/ARR gap
004 disminuyeron magnitude positiva mantiene dirección DECREASE
005 mas se etiqueta gross increase
006 mas no es net delta
007 dejaron se etiqueta gross stopped buying
008 dejaron no es net delta
009 M9 plant net delta status = NOT_AVAILABLE
010 no fórmula net reconstruida
011 prompt prohíbe "Delta Venta disminuyó X" desde bucket
012 prompt prohíbe "planta cayó X" desde bucket
013 prompt permite "reducción bruta acumulada"
014 prompt declara posible compensación por otros buckets
015 IGF/ARR distinto de M9
016 alignment comparable intacto
017 causality NONE intacto
018 pretruncate 17/3 intacto
019 null != zero intacto
020 SOURCE_PARTIAL intacto
021 numeric zero intacto
022 formatter no inventa signo
023 no SQL
024 no loaders
025 no ARR
026 no buildAlignment
027 no post validator
028 no retry OpenAI
029 no planner
030 no routing
031 no server
032 no schema
033 no dependencies
034 FD tests pass
035 M9 tests pass
036 ARR tests pass
037 prompt status/alignment tests pass
038 Tier1 pass
039 pre-deploy gate pass
040 NEW FAILURE=0

## North Star

La respuesta LIVE NO debe decir:

"Delta Venta: Disminución de 1059160.26 kg"

Debe decir algo equivalente a:

"En M9, los clientes del bucket 'disminuyeron' acumulan
1,059,160.26 kg de reducción bruta entre agosto y septiembre.
Esta cifra no es el delta neto de venta de la planta."

Si se habla de IGF 1506.3507 vs ARR 1469.36:

deben permanecer como objetos diferentes.

No denominar su diferencia M9.

## Completion

Si PASS:

CURRENT_TASK -> DONE_PENDING_REVIEW
commit en rama FIX
STOP

No merge.
No push main.
No deploy.
No LIVE_DB.
No siguiente tarea.
