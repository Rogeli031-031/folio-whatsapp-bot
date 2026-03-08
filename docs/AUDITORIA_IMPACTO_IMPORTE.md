# Auditoría: fila "Impacto (Importe)" — Comparación IGF Forecast vs mes anterior

**Alcance:** Solo la lógica de cálculo de la fila "Impacto (Importe)" en la tabla "Comparación IGF Forecast vs última versión del mes anterior". Sin modificaciones ni refactor.

---

## Paso 1. Ubicación exacta del código

| Elemento | Ubicación |
|----------|------------|
| **Archivo** | `frontend-dashboard/app/page.tsx` |
| **Sección** | Bloque condicional `{plantaFilter && igfForecast && ( ... )}` (aprox. líneas 328-447) |
| **Fila Forecast** | Construida por `cellVal(rowF, c)` en un `<tr>` (líneas 404-411) |
| **Fila Mes anterior** | Construida por `cellVal(rowA, c)` en un `<tr>` (líneas 412-419) |
| **Fila Cambio** | `cellDeltaNum(c)` para cada columna (líneas 420-428) |
| **Fila Impacto (Importe)** | `cellImpacto(c)` para cada columna (líneas 429-438) |

**Flujo de datos:**
1. **API:** `fetchIgfForecast(token)` y `fetchIgfForecast(token, { year: prevYear, month: prevMonth })` → respuestas tipo `IgfForecastResponse` con `{ year, month, version_id, version_number, rows, totales }`.
2. **Estado:** `igfForecast`, `igfMesAnterior` (y `plantaFilter`) en `KpiContent` (líneas 65-69, 94-108).
3. **Filas por planta:** `rowF = findRowByPlanta(igfForecast.rows, plantaFilter)`, `rowA = findRowByPlanta(igfMesAnterior.rows, plantaFilter)` (líneas 333-334).
4. **Cálculos locales:** `n`, `delta`, `ventaKgA`, `cellVal`, `cellDeltaNum`, `cellImpacto` definidos dentro del IIFE (líneas 336-388).
5. **Render:** tabla con 4 filas de datos; ninguna suma de la fila Impacto se calcula ni se muestra en el front (no hay celda "Total" para Impacto).

**Backend (solo referencia):**
- `server.js`: `buildIgfForecastPayload` (aprox. 5218+) arma cada fila; `recalcularUtilYResultado` (5505-5530) calcula `util_oper_kg` y `util_oper_importe`.
- Fórmula Util. Oper. ($/kg):  
  `util_oper_kg = margen - comDesc - impuesto + |hg_kg| - bancosPlanta - provisionPlanta - presupuesto - foliosZP - foliosCarro + depositoCierreKg`.  
  En la tabla se expone `gasto_kg = presupuesto_kg + folios_aprob_zp_kg + folios_carro_kg + deposito_cierre_kg` (depósito en negativo), por lo que conceptualmente:  
  `util_oper_kg = margen - com_desc - impuesto + hg_kg - bancos_planta - provision_planta - gasto_kg`.

---

## Paso 2. Fórmula real por columna (fila Impacto (Importe))

Base usada en casi todo: **Venta A** = venta del mes anterior en kg.  
`ventaKgA = rowA ? n(rowA.venta_ton) * 1000 : 0` (línea 372).  
`delta(vF, vA)` = `n(vF) - n(vA)` = valor forecast − valor mes anterior.

| Columna | Fuente de datos | Fórmula actual en Impacto (Importe) | Base | Unidad | Driver vs subtotal |
|---------|-----------------|--------------------------------------|------|--------|---------------------|
| **Empresa** | — | No aplica (no hay impacto) | — | — | — |
| **Venta (ton)** | rowF, rowA | `(margen_kg_F + com_desc_kg_F) * (venta_ton_F - venta_ton_A) * 1000` | — | Importe | Efecto volumen (aproximado) |
| **Margen ($/kg)** | rowF, rowA | `(margen_kg_F - margen_kg_A) * ventaKgA` = (B−A)×Venta A kg | Venta A kg | $/kg → $ | Driver |
| **Com. y Desc. ($/kg)** | rowF, rowA | `(com_desc_kg_F - com_desc_kg_A) * ventaKgA` = (B−A)×Venta A kg | Venta A kg | $/kg → $ | Driver |
| **Gasto ($/kg)** | rowF, rowA | `(gasto_kg_A - gasto_kg_F) * ventaKgA` = (A−B)×Venta A kg | Venta A kg | $/kg → $ | Driver (agregado) |
| **Impuesto ($/kg)** | rowF, rowA | `(impuesto_kg_A - impuesto_kg_F) * ventaKgA` = (A−B)×Venta A kg | Venta A kg | $/kg → $ | Driver |
| **HG (%)** | — | `null` → se muestra "—" | — | % | Solo informativo |
| **HG ($/kg)** | rowF, rowA | `(hg_kg_F - hg_kg_A) * ventaKgA` = (B−A)×Venta A kg | Venta A kg | $/kg → $ | Driver |
| **Bancos Planta** | rowF, rowA | `(bancos_planta_F - bancos_planta_A) * ventaKgA` = (B−A)×Venta A kg | Venta A kg | $/kg → $ | Driver |
| **Prov. Planta** | rowF, rowA | `(prov_F - prov_A) * ventaKgA` = (B−A)×Venta A kg | Venta A kg | $/kg → $ | Driver |
| **Util. Oper. ($/kg)** | rowF, rowA | `(util_oper_kg_F - util_oper_kg_A) * ventaKgA` = Δ Util.Oper × Venta A kg | Venta A kg | $/kg → $ | **Subtotal derivado** |
| **Util. Oper. (Importe)** | rowF, rowA | `util_oper_importe_F - util_oper_importe_A` = cambio total en $ | — | Importe | Total real |
| **Gtos/Apoyos Corp** | rowF, rowA | `(gtos_F - gtos_A) * ventaKgA` = (B−A)×Venta A kg | Venta A kg | $/kg → $ | Driver (debajo de Util. Oper.) |
| **Bancos Corp.** | rowF, rowA | (B−A)×Venta A kg | Venta A kg | $/kg → $ | Driver |
| **Otros Programas** | rowF, rowA | (B−A)×Venta A kg | Venta A kg | $/kg → $ | Driver |
| **Inversiones** | rowF, rowA | (B−A)×Venta A kg | Venta A kg | $/kg → $ | Driver |
| **Resultado ($/kg)** | rowF, rowA | (B−A)×Venta A kg | Venta A kg | $/kg → $ | Subtotal derivado |
| **Resultado (Importe)** | rowF, rowA | `resultado_final_importe_F - resultado_final_importe_A` | — | Importe | Total real |

**Signos en backend (Util. Oper.):**  
`util_oper_kg = margen - com_desc - impuesto + hg_kg - bancos_planta - provision_planta - gasto_kg`.  
Por tanto:
- Aumento de margen → aumento Util. Oper. → impacto = (B−A)×Venta A ✓  
- Aumento de com_desc (menos negativo) → disminución Util. Oper. → contribución = −(B−A)×Venta A; el código muestra (B−A)×Venta A (mismo número, signo según datos).  
- Aumento de gasto/impuesto → disminución Util. Oper. → impacto = (A−B)×Venta A ✓  
- Aumento de hg_kg → aumento Util. Oper. → impacto = (B−A)×Venta A ✓  
- Aumento de bancos_planta/provision_planta → disminución Util. Oper. → contribución = −(B−A)×Venta A; el código muestra (B−A)×Venta A (para que la suma cierre, habría que restar estos o usar (A−B)).

---

## Paso 3. Dónde se rompe el puente

### 3.1 Base de volumen
- **Venta (ton), Margen, Com. y Desc., Gasto, Impuesto, HG ($/kg), Bancos Planta, Prov. Planta, Util. Oper. ($/kg), Gtos/Apoyos Corp, etc.** usan **Venta A kg** (`ventaKgA`) para pasar de $/kg a importe.  
- **Util. Oper. (Importe)** y **Resultado (Importe)** usan el delta directo (sin multiplicar por base).  
- No hay mezcla con venta forecast en los impactos de tasa; la base es coherente.

### 3.2 HG (%)
- No participa en impacto en dinero (retorno `null`); solo informativo. Correcto.

### 3.3 Util. Oper. ($/kg) tratada como driver
- **Problema:** La columna **Util. Oper. ($/kg)** tiene impacto = `(util_oper_kg_F - util_oper_kg_A) * ventaKgA`.  
- Eso es **el cambio de utilidad operativa en $ suponiendo volumen constante en Venta A**, es decir, el **efecto tasa** (o “puente” de tasas).  
- La suma de los impactos de los **drivers de tasa** (margen, com. y desc., gasto, impuesto, HG $/kg, bancos planta, prov. planta) **debería dar exactamente ese número**.  
- Si no da, o bien las fórmulas por driver no son las correctas (signos o qué se considera “contribución a Util. Oper.”), o bien falta/sobra algún concepto.

### 3.4 Util. Oper. (Importe) — cambio total
- **Util. Oper. (Importe)** en Impacto = `util_oper_importe_F - util_oper_importe_A` = cambio total real (util_B × VentaB_kg − util_A × VentaA_kg).  
- Eso **no** es igual a `(util_oper_kg_F - util_oper_kg_A) * ventaKgA` salvo que VentaB = VentaA.  
- Relación correcta:  
  `cambio_total_Util_Oper_Importe = efecto_tasa + efecto_volumen`  
  `efecto_tasa = (util_oper_kg_F - util_oper_kg_A) * ventaKgA`  
  `efecto_volumen = util_oper_kg_F * (venta_kg_F - venta_kg_A)` (u otra convención equivalente).  
- Por tanto, **la suma de impactos de la fila (solo tasas + efecto volumen) debe igualar al cambio total de Util. Oper. (Importe)** solo si:
  1. Los impactos de tasa están bien definidos y suman exactamente `efecto_tasa`.
  2. El impacto de **Venta (ton)** representa exactamente `efecto_volumen`.

### 3.5 Efecto volumen (Venta (ton))
- Fórmula actual: `(margen_kg_F + com_desc_kg_F) * (venta_ton_F - venta_ton_A) * 1000`.  
- Eso es **una** aproximación al efecto volumen (precio/contribución marginal por kg del forecast × Δ volumen).  
- La descomposición estándar sería:  
  `efecto_volumen = util_oper_kg_F * (venta_kg_F - venta_kg_A)`  
  (o con util_oper_kg_A según convención).  
- Por tanto, **el impacto por Venta (ton) no es coherente con un efecto volumen “Util. Oper. × ΔVenta”**: usa (Margen + Com.Desc)_F en lugar de Util. Oper._F (o A), por eso **no puede cuadrar** en general con el cambio total de Util. Oper. (Importe).

### 3.6 Signos y convención “contribución a Util. Oper.”
- En el backend, Util. Oper. = margen − com_desc − impuesto + hg − bancos_planta − provision_planta − gasto.  
- Para que la **suma** de impactos sea igual a **efecto_tasa**:
  - Margen: (B−A)×Venta A → correcto (margen sube, util sube).  
  - Com. y Desc.: contribución a util = **−(B−A)**×Venta A; el código muestra **(B−A)**×Venta A → **signo opuesto al que necesita el puente**.  
  - Gasto: (A−B)×Venta A → correcto (gasto sube, util baja).  
  - Impuesto: (A−B)×Venta A → correcto.  
  - HG ($/kg): (B−A)×Venta A → correcto.  
  - Bancos Planta, Prov. Planta: contribución a util = **−(B−A)**×Venta A; el código usa **(B−A)**×Venta A → **signo opuesto** para el puente.  
- Por tanto, si se suman todos los impactos mostrados (incluido Util. Oper. ($/kg)), se mezcla:
  - Drivers con signo “correcto” para contribución a Util. Oper. (margen, gasto, impuesto, hg).
  - Drivers con signo “invertido” (com. y desc., bancos planta, prov. planta).
  - Un efecto volumen (Venta (ton)) que no es Util. Oper. × ΔVenta.
  - Una columna Util. Oper. ($/kg) que sí es el efecto tasa puro.
- Resultado: **la suma de los impactos por columna (en rojo) no puede cuadrar ni con Util. Oper. ($/kg) en importe ni con Util. Oper. (Importe) cambio total**.

### 3.7 Resumen de causas
1. **Efecto volumen:** Fórmula Venta (ton) usa (Margen_F + Com.Desc_F) × ΔVenta_kg en lugar de Util. Oper._F (o A) × ΔVenta_kg.  
2. **Signos:** Com. y Desc., Bancos Planta y Prov. Planta muestran (B−A)×Venta A; para el puente de Util. Oper. su contribución es −(B−A)×Venta A.  
3. **Util. Oper. ($/kg)** y **Util. Oper. (Importe):** La primera es efecto tasa; la segunda es cambio total. No se calcula ni se muestra en ninguna parte la suma de impactos que debería igualar a una u otra, pero aunque se sumara, no cuadra por (1) y (2).  
4. **Doble papel de Util. Oper. ($/kg):** Se trata como una columna más de impacto, cuando es el **subtotal** al que deberían sumar los drivers; incluirla en una “suma de impactos” duplica conceptualmente el efecto tasa.

---

## Paso 4. Prueba numérica (ejemplo Acapulco)

Datos de referencia (ejemplo típico):
- Venta A = 1 463.99 ton → ventaKgA = 1 463 990 kg  
- Venta B = 1 522.05 ton  
- Margen A = 7.32, B = 7.49 → (B−A)×VentaA = 0.17 × 1 463 990 = 248 878  
- Com. y Desc. A = −0.28, B = −0.30 → (B−A)×VentaA = −0.02 × 1 463 990 = −29 279 (lo que muestra el código). Contribución a util = −(−0.02)×VentaA = +29 279.  
- Gasto A = 4.03, B = 4.19 → (A−B)×VentaA = −0.16 × 1 463 990 = −234 238 ✓  
- Impuesto A = 0.75, B = 0.59 → (A−B)×VentaA = 0.16 × 1 463 990 = 234 238 ✓  

**Efecto tasa (lo que debería ser la suma de drivers de Util. Oper.):**  
`(util_oper_B - util_oper_A) * ventaKgA` = valor de la columna Impacto en **Util. Oper. ($/kg)**.

**Cambio total (referencia):**  
`util_oper_importe_B - util_oper_importe_A` = valor de la columna Impacto en **Util. Oper. (Importe)**.

**Suma actual de impactos (drivers de Util. Oper. solo):**  
Margen + Com.Desc + Gasto + Impuesto + HG $/kg + Bancos Planta + Prov. Planta (cada uno con la fórmula actual).  
- Si se usa Com.Desc como (B−A)×VentaA (negativo), la suma no coincide con efecto_tasa porque Com.Desc y Bancos/Prov aportan con signo “invertido” respecto a la definición Util. Oper.  
- Si se corrigieran signos (Com.Desc, Bancos, Prov como contribución a util), entonces suma_drivers = efecto_tasa.  
- Aún así, **efecto_tasa + efecto_volumen** debe ser **cambio_total_Util_Oper_Importe**.  
- Efecto volumen correcto: `util_oper_kg_F * (venta_kg_F - venta_kg_A)` (o convención con util_A).  
- Efecto volumen actual (Venta (ton)): `(7.49 - 0.30) * 58 060 = 417 451` (aprox.).  
- Con util_oper por ejemplo ~3 $/kg: efecto volumen “estándar” ≈ 3 × 58 060 = 174 180, distinto de 417 451.  
Por tanto, **la suma de impactos mostrados (incluido Venta (ton)) no puede coincidir con el cambio total de Util. Oper. (Importe)**.

---

## Paso 5. Diagnóstico final y corrección sugerida

### Diagnóstico

| Campo | Detalle |
|-------|---------|
| **Archivo** | `frontend-dashboard/app/page.tsx` |
| **Función** | IIFE dentro del JSX (líneas ~332-446); funciones clave: `cellImpacto` (373-388), uso de `ventaKgA` (372). |
| **Problema exacto** | (1) El impacto por **Venta (ton)** usa (Margen_F + Com.Desc_F)×ΔVenta_kg en lugar de un efecto volumen alineado con Util. Oper. (p. ej. Util. Oper._F × ΔVenta_kg). (2) **Com. y Desc.**, **Bancos Planta** y **Prov. Planta** usan (B−A)×Venta A; para que la suma de impactos sea el efecto tasa de Util. Oper., su contribución debe ser −(B−A)×Venta A, es decir (A−B)×Venta A en la convención “contribución a util”. (3) No se exige ni se muestra en UI que “suma de impactos = Util. Oper. (Importe)”, pero la intención de “puente” implica que eso debería cumplirse. |
| **Columnas afectadas** | Venta (ton), Com. y Desc. ($/kg), Bancos Planta, Prov. Planta; conceptualmente también Util. Oper. ($/kg) (es subtotal, no un driver más). |
| **Razón financiera** | Util. Oper. = margen − com_desc − impuesto + hg − bancos_planta − provision_planta − gasto. El efecto en $ de cada driver debe ser su derivada respecto al driver × Venta A, con el signo que tiene en esa ecuación. Com.Desc, Bancos y Prov restan en la ecuación, luego su impacto en util es el opuesto del “delta del renglón”. |
| **Razón técnica** | `cellImpacto` aplica (B−A)×Venta A a todos los $/kg que no tienen caso especial; los casos especiales (gasto, impuesto) usan (A−B)×Venta A. No hay caso especial para com_desc ni para bancos_planta/provision_planta, y el efecto volumen no sigue la convención Util. Oper. × ΔVenta. |
| **Tipo de error** | Fórmula (efecto volumen), signo (contribución a util en 3 columnas), y doble conteo conceptual si se suma Util. Oper. ($/kg) como un driver más. |

### Riesgo

- El usuario (director ZP / GG) ve números en rojo/verde que **no suman** al cambio total de Util. Oper. (Importe) ni al efecto tasa de Util. Oper. ($/kg).  
- Puede atribuir el “hueco” a errores de datos o del modelo, cuando en realidad es una mezcla de convención de signos y de definición del efecto volumen.  
- Riesgo de **confusión en el análisis** y pérdida de confianza en el reporte.

### Corrección sugerida (solo descripción, no implementada)

1. **Efecto volumen (Venta (ton)):**  
   Calcular el impacto como **efecto_volumen = util_oper_kg_F × (venta_kg_F − venta_kg_A)** (o documentar y usar de forma consistente util_oper_kg_A). Así:  
   `impacto_venta_ton = n(rowF.util_oper_kg) * (n(rowF.venta_ton) - n(rowA.venta_ton)) * 1000`.

2. **Contribución a Util. Oper. (signos):**  
   Para que la suma de impactos de los drivers sea igual al efecto tasa `(util_oper_kg_F - util_oper_kg_A) * ventaKgA`:  
   - **Com. y Desc.:** impacto = **(com_desc_A − com_desc_B) × ventaKgA** (contribución a util = −(B−A)×Venta A).  
   - **Bancos Planta:** impacto = **(bancos_planta_A − bancos_planta_B) × ventaKgA**.  
   - **Prov. Planta:** impacto = **(provision_planta_A − provision_planta_B) × ventaKgA**.  
   Mantener margen, gasto, impuesto y HG ($/kg) como están (ya coherentes con la ecuación).

3. **Util. Oper. ($/kg) y Util. Oper. (Importe):**  
   - Dejar **Util. Oper. ($/kg)** como efecto tasa en $ (no cambiar fórmula).  
   - Opcional: añadir una nota o tooltip indicando que “Suma de impactos (drivers + volumen) = Cambio Util. Oper. (Importe)” y, si se desea validar en UI, una fila o celda que muestre esa suma y el cambio total (solo si el producto lo requiere).

4. **Mínimo de cambios:**  
   - En `cellImpacto`, añadir casos para `com_desc_kg`, `bancos_planta_kg`, `provision_planta_kg` con (A−B)×ventaKgA.  
   - Reemplazar el bloque `c.key === "venta_ton"` por el nuevo efecto_volumen con `util_oper_kg_F`.  
   - No tocar estilos, rutas, nombres de columnas ni otras pantallas.

### Archivos a editar después (cuando se decida implementar)

- **Único archivo:** `frontend-dashboard/app/page.tsx`  
  - Función/lógica: la IIFE que construye la tabla de comparación y, dentro de ella, `cellImpacto` y el cálculo de `ventaKgA` (y opcionalmente el uso de `rowF.util_oper_kg` para Venta (ton)).

---

*Auditoría solo de lógica; no se ha modificado código.*
