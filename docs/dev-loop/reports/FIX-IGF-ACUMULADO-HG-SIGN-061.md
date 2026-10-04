# FIX-IGF-ACUMULADO-HG-SIGN-061

task_id: FIX-IGF-ACUMULADO-HG-SIGN-061

outcome: DONE

status: DONE_PENDING_REVIEW

base_sha: 330d4b115a43eda1010237cdaa1b9d58f84fc4a4

branch: fix/igf-acumulado-hg-sign-061

## Cambio

`totalMesMarginAndHg` devolvía `hg: -y` y volvía a invertir Y de TOTAL MES. Ahora devuelve `hg: y`. No usa `Math.abs`. El comentario deja de decir que el HG del forecast es −Y.

`applyIgfDiarioAcumuladoMini` ya tomaba `hit.hg` sin otro cambio de signo. INGRESO sigue siendo `(margen + comDesc - hgKg) * venta * 1000`. Forecast, Margen, Venta, Com. y Desc., Impuestos, Operativos y Corporativos no se editaron.

## Caso tipo Puebla

Con venta 1,198.48 ton, margen 6.29 y Y −1.1257, el HG acumulado queda negativo y el Resultado Final cae entre 1.28 y 1.29 millones. El 1,287,771 productivo no está escrito en la lógica.

## Pruebas

059: PASS.

059-R1: PASS.

061: PASS (3).

054-R3: PASS (8).

`frontend-dashboard` `npm run build`: PASS.

`git diff --check`: limpio.

## Protocolo

- archivos tocados: `lib/igf-diario-puebla.js`, el test 059, el test 061, este reporte y `CURRENT_TASK.md` solo `status`
- Forecast: sin cambios de fórmula
- contratos modificados: ninguno en `docs/director-ia/`
- next_task_proposed: no autorizado
- secrets_check: sin secretos
- human_decision_needed: merge y deploy, si el humano los ejecuta
- merge: no
- deploy: no
