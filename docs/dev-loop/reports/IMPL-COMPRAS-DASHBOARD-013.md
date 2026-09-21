# IMPL-COMPRAS-DASHBOARD-013

## Identidad

| Campo | Valor |
|---|---|
| task_id | IMPL-COMPRAS-DASHBOARD-013 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 97ae487d2c36df6eaa88d010b45f62e4c6ec6bdc |
| branch | implementation/compras-dashboard-013 |
| schema_changes | true |
| data_mutation | true |
| merge | false |
| deploy | false |
| PR | no |

## Arquitectura

Módulo nuevo del dashboard: **Compras**.

- Botón `Compras` en la cabecera de IGF Forecast (junto a Usuarios).
- Ruta propia `/compras` (mismo patrón que `/acciones` y `/arr`). No modal de módulo.
- Cada combinación `planta + año + mes` es independiente.
- Proveedores se configuran por planta (listar / crear / activar-desactivar / ordenar).
- Captura transaccional: cada compra es un registro. Se permiten N compras el mismo día y proveedor.
- La cuadrícula muestra agregados derivados. El detalle (click en celda) permite CRUD + factura.
- Director IA no se tocó (planner/intents). El modelo queda consultable después.

## Schema

Esquema `arr`.

### `arr.compras_proveedores`

- `id`, `planta_id` → `public.plantas(id)`, `nombre`, `activo`, `orden`, `created_at`, `updated_at`
- Unique: `(planta_id, lower(btrim(nombre)))`
- Índice: `(planta_id, activo, orden)`

### `arr.compras`

- `id`, `planta_id`, `proveedor_id`, `fecha`, `kg NUMERIC(14,3) CHECK (kg > 0)`, `importe NUMERIC(14,2) CHECK (importe >= 0)`
- `created_by_usuario_id`, `updated_by_usuario_id`, `created_at`, `updated_at`
- **Sin** unique `(planta_id, proveedor_id, fecha)`
- Índices: `(planta_id, fecha)`, `(proveedor_id, fecha)`
- No se persistió `costo_kg` ni agregados semanales/mensuales/consolidados

### `arr.compras_documentos`

- `id`, `compra_id` ON DELETE CASCADE, `nombre_archivo`, `storage_key`, `mime_type`, `size_bytes`, `data BYTEA` (fallback), `uploaded_by_usuario_id`, `created_at`
- Índice: `(compra_id)`

## Migración

- Documento: `sql/021_compras_dashboard.sql`
- Aplicación en runtime: `ensureComprasTables` desde `ensureSchema()` (mismo patrón que SEH / bitácora)
- **No ejecutada** contra producción

## Endpoints

Autenticación: `dashboardAuthMiddleware`.
Planta: `assertDashboardPlantaAccessForActionRegister` (ZP/AD/CF_CDMX global; resto `plantas_permitidas`).

| Método | Ruta |
|---|---|
| GET | `/api/compras?planta_id=&year=&month=` |
| GET | `/api/compras/proveedores?planta_id=` |
| POST | `/api/compras/proveedores` |
| PATCH | `/api/compras/proveedores/:id` |
| POST | `/api/compras` |
| PATCH | `/api/compras/:id` |
| DELETE | `/api/compras/:id` |
| POST | `/api/compras/:id/factura` |
| GET | `/api/compras/:id/factura/:documento_id/download` |
| DELETE | `/api/compras/:id/factura/:documento_id` |

GET mensual devuelve `{ plant, year, month, providers, all_providers, purchases, documents, grid }` en una sola query set (sin N+1). El frontend usa `grid` como fuente de verdad de día/semana/mes/consolidado.

## Storage de facturas

Auditoría previa: el repo ya tiene storage persistente de producción.

- Primario: S3 (`uploadPdfToS3` / `getBufferFromS3`), mismo que pólizas / Action Register / plan maestro.
- Fallback: BYTEA en `arr.compras_documentos.data` si S3 no está configurado o falla el upload (mismo patrón que Action Register).
- Solo PDF. Validación de magic `%PDF`, MIME y extensión. Máx. 10 MB.
- Descarga siempre por API autenticada + autorización de planta. No se expone URL pública de S3.

No se inventó un segundo sistema de storage.

## Permisos

- Catálogo de plantas: `GET /api/dashboard/plantas` (ya filtrado por JWT).
- Backend no confía en `planta_id` del frontend: valida acceso y que `proveedor.planta_id === compra.planta_id`.
- Documento solo se sirve si pertenece a la compra y la planta es accesible.
- Mensajes de usuario: acceso a planta / proveedor / factura / guardar. Sin stack traces.

## Frontend

- `frontend-dashboard/app/compras/page.tsx`
- `frontend-dashboard/components/ComprasClient.tsx`
- Botón en `IgfForecastClient`
- Helpers en `frontend-dashboard/lib/api.ts` y `compras-format.ts`

Pantalla:

- Título CONTROL DE COMPRAS
- Selectores Planta / Año / Mes
- Tabla estilo Excel: encabezados oscuros, cuerpo blanco/gris, bloques por proveedor, consolidado a la derecha, Semana N, TOTAL MES
- Fecha ámbar (`compras-fecha-capturada`) si hay al menos una compra ese día
- Click en celda de proveedor → detalle con N compras, agregar/editar/eliminar, subir/ver/descargar/eliminar PDF
- Guardar deshabilitado mientras escribe
- Scroll horizontal en pantallas chicas; fecha y header sticky cuando es viable
- Administración mínima de proveedores dentro de Compras

## Cálculos

Única fórmula en todos los niveles (día, semana, mes, consolidado, celda agregada):

`costo_kg = SUM(importe) / SUM(kg)`

Si `kg <= 0`: blank (nunca Infinity/NaN).

Semanas: domingo–sábado, como el Excel de septiembre 2026 (Semana 1 = 01–05). Calendario real 28/29/30/31.

UI: KG con miles, costo 3 decimales, importe 2 decimales.

## Tests

`node --test test/compras-dashboard-013.test.js` → 17/17.

Backend: proveedores por planta, 2 compras mismo día, edit/delete, auth cruzada, PDF magic, agregados diarios/semanales/mensuales, costo ponderado vs suma de costos, febrero bisiesto, download 403 sin planta.

Frontend (asserción de fuente + selectores): botón Compras, `/compras`, selectores, fecha capturada, detalle multi-compra, formatos.

## Build

`frontend-dashboard`: `npm run build` **verde**. Ruta `/compras` en el manifiesto.

## Archivos tocados

- `lib/compras-dashboard.js` (nuevo)
- `sql/021_compras_dashboard.sql` (nuevo)
- `server.js` (require + ensureSchema + registerComprasRoutes)
- `test/compras-dashboard-013.test.js` (nuevo)
- `frontend-dashboard/app/compras/page.tsx` (nuevo)
- `frontend-dashboard/components/ComprasClient.tsx` (nuevo)
- `frontend-dashboard/lib/compras-format.ts` (nuevo)
- `frontend-dashboard/lib/api.ts`
- `frontend-dashboard/components/IgfForecastClient.tsx`
- `docs/dev-loop/reports/IMPL-COMPRAS-DASHBOARD-013.md`
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)

No se commitean `.next` ni reportes OPS-VERIFY ajenos.

## Riesgos

- `ensureComprasTables` corre al boot; si `public.plantas` / `public.usuarios` no existen en un entorno vacío, el ensure se registra como warning (mismo patrón que otros módulos).
- Fallback BYTEA crece si S3 está caído de forma prolongada.
- Semanas siguen domingo–sábado del Excel de referencia; no se copió el bug `SUM(costo_kg)` de algunas filas semanales del archivo.

## Desvíos

- Namespace REST `/api/compras` (no `/api/dashboard/compras`): no existía namespace de compras; se evitó mezclar con IGF.
- `data BYTEA` opcional: el patrón Action Register ya lo usa como fallback de S3; no se usa como storage primario cuando S3 está habilitado.
- No se sembraron proveedores ni cifras históricas de Morelos (el Excel es referencia, no migración).
- Director IA no integrado.
- Migración no aplicada a producción.

## Cierre

- CURRENT_TASK → `DONE_PENDING_REVIEW`
- Commit + push solo a `implementation/compras-dashboard-013`
- NO PR / NO merge / NO deploy / NO siguiente tarea
