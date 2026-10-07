# G4-PREP-IGF-DIARIO-FOLIOS-DEPOSITO-MATRIX-068

outcome: DONE_PENDING_REVIEW
main: `c4f2db88784642433008b8b313ad2d60e17d896a`
producto: `3c31b205db5a800f06e5b2d62175a6c816074679`
source: `61c2fa899df6783142d19776c33c525b96c7a690`
rama: `implementation/igf-diario-folios-deposito-matrix-068`
ahead / behind antes de este commit: 2 / 0
PR: https://github.com/Rogeli031-031/folio-whatsapp-bot/pull/112
base: `main`
head: `implementation/igf-diario-folios-deposito-matrix-068`
merge: no
deploy: no

## Etapa y umbral

`estatusToEtapaVisual` vive en `lib/folio-etapa-visual.js` y el dashboard delega ahí. `PAGADO` y `CERRADO` son Depósito y cierre. Comprobaciones y evidencias califican. Cheque generado y las etapas anteriores no. Cancelado no califica y, si es el estado efectivo al corte, el folio queda fuera.

## Fecha, corte y deduplicación

El día es la primera transición de `public.folio_historial` cuyo estatus ya alcanza el umbral. La fecha es `folio_historial.creado_en` en `America/Mexico_City`. No se usa la fecha de creación del folio ni `mes_cargo`. Un evento posterior al corte no entra. Avanzar a comprobaciones o evidencias no mueve ni duplica el folio.

## Importe, descripción y totales

El único monto es `folios.importe`. No se usan facturas ni comprobado. Null cuenta el folio y no suma. Cero explícito sí suma. La descripción corta usa descripción o concepto, y `Sin descripción` si faltan. Con varios folios se toma el de mayor importe y se añade `+N`. El empate lo resuelve el id menor.

En el fixture: Tehuacán el 03/10 muestra $590,000, 4 folios y `Mantenimiento tanque +3`. El modal lista folio, estado, monto y descripción; el primero es F-4, `DEPOSITO_CIERRE`, $250,000. Total mes de esa planta: $590,000 y 4 folios. Total del 03/10: $590,005 y 5 folios. Total del 04/10: $7 y 1 folio. Total general: $590,012 y 6 folios. Las dos rutas de suma coinciden.

## Permisos y consultas

La ruta usa `dashboardAuthMiddleware` y `dashboardBlockGVForbidden`. `buildDashboardWhere` con `ventanaDefault: false` conserva `solo_zp_ad` y las plantas de GG/GA, sin la ventana por fecha de creación. Las plantas salen de las equivalencias IGF, sin ids fijos.

`query_count` = 3: dos lecturas del resolver de plantas y una del lote de historial. No hay consulta por planta, día, celda ni folio. El modal usa los folios ya cargados.

## Frontend

Con Todas e IGF Diario se oculta la tabla inferior legacy y se muestra la matriz. La tabla superior permanece. Con una planta sigue el panel semanal 067. Forecast conserva su tabla y su comparación.

## Pruebas

068: 8/8. Regresión 067, 066-R1, 066, 065-R1, 064-R1 y 064: 61/61. Build del dashboard correcto. `node --check server.js` correcto. `git diff --check` sin errores de contenido.

## PR

Número 112. https://github.com/Rogeli031-031/folio-whatsapp-bot/pull/112

El merge y el deploy no se ejecutan aquí.
