# AUDIT-IGF-DIARIO-1010-RESULTADO-DELTA-078-R3

task_id: AUDIT-IGF-DIARIO-1010-RESULTADO-DELTA-078-R3
outcome: DONE
classification: A
regression: NO
recommendation: SAFE_FOR_PR

main_sha: d3a63cb96c4483a3caa3c85db5f5e6ee0fd4030c
product_sha_078_r2: eb03de9206508da33b7fcf3fc55d665508bdd37f
branch: audit/igf-diario-1010-resultado-delta-078-r3

Caso: San Luis, planta id 5, 2026-10-10, corte 2026-10-09. Misma lectura de producción, sin escrituras, con el loader semanal de cada SHA.

## Resultado

MAIN y 078-R2 producen el mismo día. 078-R2 no causa el cambio frente a la validación 077.

| Campo | MAIN | 078-R2 |
| --- | --- | --- |
| Estado | proyectada | proyectada |
| Venta KG | 29730 | 29730 |
| Precio | 21.34 | 21.34 |
| Costo | 12.897492 | 12.897492 |
| Flete | 1.1124577174057797 | 1.1124577174057797 |
| Margen bruto | 7.33005028259422 | 7.33005028259422 |
| HG MXN | 5128.441707355766 | 5128.441707355766 |
| HG $/kg | 0.17250056196958513 | 0.17250056196958513 |
| Sobrante antes HG | 3.4635147965531843 | 3.4635147965531843 |
| Sobrante con HG | 3.2910142345835993 | 3.2910142345835993 |
| com_desc_kg | -4.3 | -4.3 |
| Origen com_desc | forecast vigente; el SHA de main no publica metadata | FORECAST |
| resultado_kg | -1.0089857654164014 | -1.0089857654164014 |
| resultado_mxn | -29997.146805829616 | -29997.146805829616 |

LAST_REAL_FALLBACK no se ejecuta. El día cumple `fecha >= corte`, así que `materializePlantMonth` entra al ramo proyectado y llama `resolveComisionCd` (`lib/igf-diario-grafica.js`, rama `if (projected)`). La fuente publicada por 078-R2 es `FORECAST` y `source_date` es null.

## Primera diferencia contra la validación 077

La validación 077, con el mismo corte, dejó 2026-10-10 proyectado, venta 29730, com_desc -4.3, resultado_kg -0.42144170081199217 y resultado_mxn -12529.461765140528.

En la cadena Venta, Precio, Costo, Flete, HG, sobrante, com_desc y resultado, la primera variable que cambió es HG.

- Valor 077: no existía fila en `arr.compras_hg` para San Luis el 2026-10-10. El loader usaba el HG proyectado por ausencia de captura.
- Valor actual: `hg_kilos` -382, creado y actualizado el 2026-10-12T14:22:29.556Z. El importe HG del día es 5128.441707355766.
- Causa: dato de base. No es forecast de venta, no es forecast de comisión, no es el corte y no es el cálculo de 078-R2.

Precio 21.34 y costo 12.897492 están en `arr.igf_diario_margen_manual` desde 2026-10-09T14:12:55.829Z, antes de esa validación. Las tarifas de flete de la planta tienen su última actualización el 2026-10-02. Venta y comisión del sábado siguen iguales.

La cifra -30568.656805829625 fue la lectura de 078-R2 después de insertar ese HG y antes de otro cambio posterior. `arr.igf_diario_gastos_desglose` de San Luis, octubre 2026, se actualizó el 2026-10-12T15:01:37.414Z. Con ese desglose ya guardado, ambos SHA producen -29997.146805829616. Ese segundo movimiento tampoco distingue main de 078-R2.

## Diff de producto

`d3a63cb` a `eb03de92` toca `lib/igf-diario-grafica.js`, `lib/igf-diario-weekly-plant.js` y dos tests.

El fallback nuevo solo corre cuando el día no es proyectado. El ramo proyectado no lee `priorCdByFecha`. `lib/igf-diario-weekly-plant.js` agrega la carga del mes anterior y copia `cdSource`; no cambia `dayResultMxn`, `dayMetrics` ni `aggregateCovered`. No hay cambio de forecast, de HG, de sobrante ni de la fórmula de resultado.

## Cierre

Archivos de producto: no modificados en esta tarea.
Contratos de `docs/director-ia/`: no modificados.
next_task_proposed: ninguno.
secrets_check: sin secretos.
human_decision_needed: no. El candidato puede seguir a revisión de PR. Esta auditoría no abre el PR.
