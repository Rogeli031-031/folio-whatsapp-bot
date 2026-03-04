# Prompt: Cómo funciona Delta Ingreso (para usar en ChatGPT / OpenAI)

Usa este texto como contexto o instrucción cuando pidas a un asistente (ChatGPT, OpenAI, etc.) que trabaje **solo en la sección Delta Ingreso** del proyecto. No modifiques el resto del sistema.

---

## 1. Qué es Delta Ingreso

**Delta Ingreso** es un reporte del dashboard que compara el **ingreso** por cliente entre dos periodos mensuales (A y B) para una planta. El ingreso no es la venta en pesos, sino un indicador que considera venta en kg, margen por kg y descuento por kg.

- **Objetivo:** Ver qué clientes “dejaron” de generar ingreso, cuáles “aumentaron” (+Ingreso), cuáles “disminuyeron” (−Ingreso), cuáles son **nuevos** (solo compraron en B) y el resto en “Otros”.
- **Alcance:** Solo esta funcionalidad (backend: `getDeltaIngresoClientes`, rutas delta-ingreso-*, y frontend: `DeltaIngresoModal`, API `postDeltaIngresoDatos` / `fetchDeltaIngresoPeriodos`). No tocar Delta Venta, Delta Descuento, folios, etc.

---

## 2. Fórmula del ingreso

Para cada cliente y cada periodo:

- **Ingreso = venta_kg × (margen_$/kg − |descuento_$/kg|)**

Donde:

- **venta_kg:** suma de kg vendidos al cliente en ese mes (tabla `arr.ventas_diarias_cliente`, agrupado por planta, año, mes, `cliente_norm`).
- **descuento_$/kg:** para ese mismo cliente y mes, total de descuento en pesos entre total de kg vendidos. Viene de `arr.descuentos_diarios_cliente` (monto por cliente/mes); se divide por los kg del periodo para obtener $/kg. Si no hay kg, se usa 0.
- **margen_$/kg:** no es por cliente. Es un **margen promedio por planta y mes** que sale del módulo IGF (ver más abajo).

Se calculan:

- `ingresoA` = ingreso en periodo A  
- `ingresoB` = ingreso en periodo B  
- `deltaIngreso` = ingresoB − ingresoA  

El ingreso puede ser negativo en A si el descuento $/kg es mayor que el margen $/kg (la fórmula lo permite).

---

## 3. Origen de los datos

- **Ventas y descuentos:** esquema `arr`: `ventas_diarias_cliente`, `descuentos_diarios_cliente`. La planta se cruza con `arr.provincia_plants` vía `plant_code` (nombre o clave de la planta). Los periodos son año-mes (YYYY-MM).
- **Margen por periodo:** función `getMargenKgPorPeriodo(plantaNombre, year, month)`:
  - Usa la **última versión del mes** en `igf.versions` (plant_code = 'GLOBAL', ordenar por `version_number DESC`).
  - Con ese `version_id` se consulta `igf.compromiso_lines`: se toma el promedio ponderado de `margen_kg` por `venta_ton` donde `empresa` coincida con la planta (búsqueda con y sin tildes, ej. Tehuacán / Tehuacan).
  - Si no hay versión o no hay líneas, el margen se considera 0 (o null y se usa 0 en la fórmula).

---

## 4. Las cinco categorías (listas)

Cada cliente entra en **una sola** categoría, en este orden lógico:

1. **No compran (dejaron)**  
   - Condición: `ingresoA > 0` y `ingresoB <= 0`.  
   - Son los que generaban ingreso en A y en B ya no (dejaron de comprar o su ingreso cayó a cero).  
   - En la tabla se muestra ingreso A, venta ton A, margen y desc $/kg A; B se muestra como $0.

2. **− Ingreso (disminuyeron)**  
   - Condición: `ingresoA > 0`, `ingresoB > 0` y `deltaIngreso < 0`.  
   - Compraban en ambos periodos pero el ingreso bajó de A a B.

3. **Nuevos**  
   - Condición: `kgA <= 0` y `kgB > 0`.  
   - No compraron (o 0 kg) en A y sí compraron en B. **No** deben aparecer en “+Ingreso”.

4. **+ Ingreso (más)**  
   - Condición: `deltaIngreso > 0` **y** `kgA > 0`.  
   - Ya compraban en A y aumentaron ingreso en B. Excluye expresamente a los “Nuevos”.

5. **Otros clientes**  
   - Condición: no cumplen ninguna de las cuatro anteriores (ej. compraron en A y B con mismo ingreso, o solo en A, etc.).  
   - Sirve para que la suma de las cinco listas sea el total de clientes/ventas considerados.

Reglas importantes:

- **Nuevos** y **+Ingreso** son disjuntos: un cliente con `kgA = 0` y `kgB > 0` solo va en “Nuevos”, nunca en “+Ingreso”.
- Los totales (ton A/B, ingreso) se calculan **por categoría** y también hay un **total general** (suma de todos los clientes en A y en B).

---

## 5. Regla 80/20

- Por defecto, en cada lista solo se muestran el **top 20%** de clientes (ordenados según la categoría: por ingresoA en “No compran”, por delta en “−Ingreso” y “+Ingreso”, por kgB en “Nuevos”, etc.).
- Si el frontend envía `sinRegla8020: true`, se devuelven **todos** los clientes de cada categoría (sin recorte).
- El 80/20 se aplica **solo sobre la muestra de Delta Ingreso** (no se mezcla con Delta Venta ni Delta Descuento).

---

## 6. API (backend)

- **GET** `/api/dashboard/delta-ingreso-periodos?planta=NombrePlanta`  
  - Requiere token dashboard.  
  - Devuelve `{ periodos: string[] }` en formato YYYY-MM (mismos periodos que Delta Venta para esa planta).

- **POST** `/api/dashboard/delta-ingreso-datos`  
  - Body: `{ planta: string, periodoA: string, periodoB: string, sinRegla8020?: boolean }`.  
  - periodoA y periodoB en YYYY-MM y distintos.  
  - Respuesta incluye: `planta`, `periodoA`, `periodoB`, `margenAStr`, `margenBStr`, `totalTonAGeneralStr`, `totalTonBGeneralStr`, y para cada categoría (`dejaron`, `disminuyeron`, `clientesNuevos`, `mas`, `otrosClientes`):  
    - `totalDeltaIngreso`, `totalDeltaIngresoStr`, `signPositive`, `clientes[]`, `totalTonA`, `totalTonB`, `totalTonAStr`, `totalTonBStr`.  
  - Cada cliente en `clientes` tiene: `cliente`, `ingresoA`, `ingresoB`, `deltaIngreso`, strings formateados (`ingresoAStr`, etc.), `kgA`, `kgB`, `kgAStr`, `kgBStr`, `descKgAStr`, `descKgBStr`, `margenAStr`, `margenBStr`.

---

## 7. Frontend (Delta Ingreso)

- **Flujo:** Elegir planta → elegir periodo A y periodo B → enviar POST → mostrar resultado.
- **Encabezado del resultado:**  
  - **Negativo (1+2):** suma de “No compran” y “−Ingreso”: ton A, ton B, suma ingreso (en MXN).  
  - **Positivo (3+4):** suma de “Nuevos” y “+Ingreso”: ton A, ton B, suma ingreso (en MXN).  
  - Total general: ton A y ton B de todos los clientes.
- **Tablas en pantalla (orden):**  
  1. No compran  
  2. − Ingreso (icono “menos” destacado)  
  3. Nuevos  
  4. + Ingreso (icono “más” destacado)  
  5. Otros clientes  
- **Botón “Ver todos los clientes” / “Ver top 20% (80/20)”:** alterna `sinRegla8020` y vuelve a llamar al POST.
- **Descarga Excel:** genera un .xlsx con el resumen (Negativo/Positivo), total general y las cinco tablas con sus columnas (cliente, A/B MXN, venta ton, margen, desc $/kg, delta).

---

## 8. Detalles técnicos útiles

- **Planta:** se identifica por nombre (y opcionalmente clave) contra `arr.provincia_plants`; el margen IGF se matchea por nombre de empresa con y sin tildes.
- **Unidades:** ventas en kg en BD; en la UI se muestran en toneladas (kg/1000). Los totales por categoría y general están en ton.
- **Ingreso negativo en A:** posible cuando `descuento_$/kg > margen_$/kg`; no es error, es consecuencia de la fórmula.
- **Orden de las listas y nombres:** debe mantenerse exactamente 1–5 y los nombres “No compran”, “− Ingreso”, “Nuevos”, “+ Ingreso”, “Otros clientes” para no romper el encabezado Negativo (1+2) y Positivo (3+4).

---

## 9. Resumen para el asistente

Cuando pidas cambios **solo en Delta Ingreso**, indica:

- “Trabaja únicamente en la funcionalidad Delta Ingreso: backend (getDeltaIngresoClientes, getMargenKgPorPeriodo, rutas delta-ingreso-periodos y delta-ingreso-datos) y frontend (DeltaIngresoModal, API de Delta Ingreso). No modifiques otras partes del proyecto.”
- Adjunta o referencia este documento como especificación de cómo funciona Delta Ingreso (fórmula, categorías, 80/20, API y pantalla).

Con esto el asistente tendrá el contexto necesario para mantener coherencia en fórmulas, categorías y UI sin tocar el resto del código.
