# IMPL-IGF-DIARIO-FOLIOS-DEPOSITO-MATRIX-068

Producto: `3c31b205db5a800f06e5b2d62175a6c816074679`
Base: `c4f2db88784642433008b8b313ad2d60e17d896a`
Rama: `implementation/igf-diario-folios-deposito-matrix-068`
outcome: DONE_PENDING_REVIEW

## Fuente de estado

`estatusToEtapaVisual` quedó extraída a `lib/folio-etapa-visual.js` y `server.js` delega en ella. El orden visual es el del kanban. Depósito y cierre sigue siendo `PAGADO` y `CERRADO`. Comprobaciones y evidencias conservan su estatus. Cheque generado, cuenta de fondos y carro quedan antes del umbral. Cancelado queda fuera.

## Fecha de transición

La fecha del día es `public.folio_historial.creado_en`, convertida a fecha de `America/Mexico_City`. Ese campo se escribe con `NOW()` en `insertHistorial` junto con el estatus de la transición. No se usa `folios.creado_en` ni `created_at`. El corte descarta eventos posteriores. El folio se coloca en la primera transición cuyo estatus ya mapea a Depósito y cierre o adelante. Avanzar después no lo mueve ni lo duplica. Un salto directo a comprobaciones o evidencias usa esa primera fecha. Si el último estatus vigente al corte es cancelado, el folio no entra.

## Monto y descripción

El monto es `folios.importe`. No se suman facturas ni comprobado. Null cuenta el folio y no suma dinero. Cero explícito sí suma. La descripción sale de `COALESCE(descripcion, concepto)` y, si falta, de `Sin descripción`. Con varios folios se muestra la del mayor importe y `+N`. El empate lo gana el id menor. El texto largo se recorta en la celda; el detalle conserva el original.

## Totales

En el fixture de la prueba, Tehuacán el 03/10 muestra $590,000, 4 folios y `Mantenimiento tanque +3`. El detalle abre con F-4, estado `DEPOSITO_CIERRE`, $250,000 y `Mantenimiento tanque`. Total mes de Tehuacán: $590,000 y 4 folios. Total del 03/10: $590,005 y 5 folios. Total del 04/10: $7 y 1 folio. Total general: $590,012 y 6 folios. La suma por planta y la suma por día coinciden con el total general.

## Endpoint y permisos

`GET /api/dashboard/igf-diario-folios-deposito` usa `dashboardAuthMiddleware` y bloquea GV. La visibilidad sale de `buildDashboardWhere` con `ventanaDefault: false`: respeta `solo_zp_ad` y las plantas permitidas de GG/GA, y no aplica la ventana por fecha de creación. Las plantas y sus equivalencias salen de `EMPRESA_IGF_A_PLANTA_KEYS` y `loadIgfEmpresaPlantaResolver`. No hay ids fijos.

Consultas constantes: 2 del resolver de plantas y 1 del lote de historial. `query_count` = 3. No hay consulta por planta, día, celda ni folio. El click usa los folios ya recibidos.

## Frontend

Con IGF Diario y Planta Todas se oculta la tabla inferior de presupuesto, folios, depósito, impuesto, HG, bancos y resultado, y se muestra la matriz. La tabla superior de IGF Diario permanece. Con una planta se conserva el panel semanal 067. Forecast conserva su tabla y su comparación.

## Pruebas

068: 8/8. Regresión 067, 066-R1, 066, 065-R1, 064-R1 y 064: 61/61. `node --check server.js` correcto. Build del dashboard correcto. `git diff --check` sin errores de contenido.

## Archivos

- `lib/folio-etapa-visual.js`
- `lib/igf-diario-folios-deposito-matrix.js`
- `server.js`
- `frontend-dashboard/lib/api.ts`
- `frontend-dashboard/components/IgfDiarioFoliosDepositoMatrix.tsx`
- `frontend-dashboard/components/IgfForecastClient.tsx`
- `test/igf-diario-folios-deposito-matrix-068.test.js`
- `docs/dev-loop/CURRENT_TASK.md`
- `docs/dev-loop/reports/IMPL-IGF-DIARIO-FOLIOS-DEPOSITO-MATRIX-068.md`
