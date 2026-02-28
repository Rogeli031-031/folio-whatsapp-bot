# PRESUPUESTO — Diseño e implementación (solicitudes GA → aprobación GG)

Documento de diseño validado, plan por fases y entregables. Sin código; solo especificación para implementar en el bot actual.

---

## 1. Diseño final validado (flujo + estados + reglas)

### 1.1 Roles y permisos

| Rol   | Crear solicitud | Aprobar/Rechazar | Ver saldo | Ver historial | Ver pendientes |
|-------|------------------|------------------|-----------|---------------|----------------|
| **GA** | Sí               | No               | Sí (su planta) | Sí (su planta) | Sí (borradores y rechazados) |
| **GG** | No               | Sí               | Sí (su planta) | Sí (su planta) | Sí (pendientes de aprobar)   |
| **CDMX** | No            | No               | Sí (todas)     | Sí (todas)     | No (solo lectura)             |
| **ZP**  | No            | No               | Sí (todas)     | Sí (todas) + comparativos | No (solo lectura) |

- Solo **GA** puede iniciar "solicitar presupuesto".
- Solo **GG** puede ejecutar "aprobar presupuesto PRE-…" y "rechazar presupuesto PRE-… motivo: …".
- **CDMX** y **ZP**: solo consulta (saldo, historial, resumen); no crean ni aprueban.

### 1.2 Estados de una solicitud

```
BORRADOR → PENDIENTE_APROBACION_GG → APROBADO
                ↓
            RECHAZADO
                ↓
            (GA puede corregir y reenviar = nueva solicitud o flujo de "reintento" según regla de negocio)

Cualquier estado → CANCELADO (por GA o por regla; opcional)
```

- **BORRADOR**: GA está llenando datos o no ha adjuntado PDF válido. No genera PRE aún (o se genera al confirmar si ya hay PDF).
- **PENDIENTE_APROBACION_GG**: GA confirmó; tiene PDF; ya tiene numero_pre. No descuenta saldo.
- **APROBADO**: GG aprobó; descuenta del saldo; se registra saldo_antes y saldo_despues.
- **RECHAZADO**: GG rechazó con motivo; no descuenta.
- **CANCELADO**: Solicitud anulada (no descuenta si no estaba APROBADO).

Regla crítica: el descuento al presupuesto ocurre **solo** al pasar a APROBADO. BORRADOR y PENDIENTE_APROBACION_GG no reducen disponible.

### 1.3 Flujo resumido

**GA — Solicitar presupuesto**

1. Comando `presupuesto` → menú → opción 2 "Solicitar presupuesto".
2. Paso 1: Categoría (desde catálogo existente por planta).
3. Paso 2: Subcategoría (filtrada por categoría, desde catálogo).
4. Paso 3: Monto (numérico, > 0).
5. Paso 4: Concepto (texto libre).
6. Paso 5: Prioridad (Normal / Urgente).
7. Paso 6: Adjuntar PDF obligatorio (cotización o vale firmado). Mientras no haya PDF válido, no se asigna PRE.
8. Paso 7: Confirmación ("CONFIRMAR" / "CANCELAR"). Al confirmar: si hay PDF → estado PENDIENTE_APROBACION_GG y se asigna PRE-YYYYMM-XX (idempotente por dedupe_key). Si abandona → queda BORRADOR y aparece en "Mis pendientes presupuesto".

**GG — Aprobar**

1. Comando "aprobar presupuesto PRE-202602-01" (o desde menú / pendientes).
2. Mostrar resumen: monto, concepto, categoría/subcategoría, prioridad, enlace(s) PDF.
3. Doble confirmación: "CONFIRMAR APROBACIÓN" → luego "APROBAR DEFINITIVO".
4. Validar saldo disponible (planta + periodo + categoria + subcategoria). Si monto > disponible → bloquear y avisar.
5. Si aprueba: estatus=APROBADO, saldo_antes/saldo_despues, historial, notificar a GA.

**GG — Rechazar**

1. "rechazar presupuesto PRE-202602-01 motivo: no hay partida".
2. Motivo obligatorio. estatus=RECHAZADO, historial, notificar a GA.

**Saldo e historial**

- "saldo presupuesto" / "ver saldo": por categoría y/o subcategoría (GA/GG su planta; CDMX/ZP todas si aplica).
- "historial presupuesto" [YYYY-MM]: listado FIFO del periodo (por defecto mes actual).
- "mis pendientes presupuesto": GA = BORRADOR + RECHAZADO (urgentes primero, luego FIFO); GG = PENDIENTE_APROBACION_GG (urgentes primero, luego FIFO).

### 1.4 Consecutivo PRE-YYYYMM-XX

- **Formato**: `PRE-YYYYMM-XX` (ej. PRE-202602-01, PRE-202602-02).
- **YYYYMM**: fecha actual zona México (mismo criterio que folios: año y mes).
- **XX**: consecutivo **por planta y por mes** (reinicia cada mes por planta). Dos dígitos mínimo (01..99); si se requiere más, usar 3 dígitos (001..999).
- **Idempotencia**: el número PRE se asigna en un único punto (al confirmar solicitud con PDF). Usar `dedupe_key` en la solicitud (p. ej. messageSid + from + "solicitud_presupuesto" + timestamp redondeado a 60s) para ignorar reintentos del webhook y no crear dos PRE ni dos registros.

### 1.5 PDF obligatorio y archivos

- Tipos aceptados: **COTIZACION** | **VALE** (y opcional **OTRO** para futuro).
- Solo PDF (validar content-type / extensión).
- Guardar en **S3** (mismo bucket y patrón que folios): `s3_key`, `url` (firmada o pública según patrón actual), `hash` (sha256, como en `folio_archivos.sha256`).
- No generar PRE hasta que exista al menos un PDF válido asociado a la solicitud (en BORRADOR o al confirmar).
- **Dedupe por hash**: si el mismo hash ya existe para esa solicitud (activo), no crear otro registro de archivo.
- **Reemplazo**: no borrar. Marcar anterior `activo=false`, insertar nuevo con `activo=true` y `reemplaza_archivo_id` apuntando al anterior (patrón igual que `folio_archivos.replace_of_id` / `replaced_by_id`).

### 1.6 Cómo reutilizar el catálogo (sin duplicar)

- **Hoy en el sistema**:
  - **Folios**: `folios.categoria` y `folios.subcategoria` son texto libre; no hay tabla de catálogo para folios.
  - **Presupuesto consulta actual**: existe `presupuesto_catalogo` (planta_id, categoria, subcategoria) y constantes `CATEGORIAS_ACAPULCO` (las 7 categorías). Las subcategorías vienen de los seeds por planta (arrays en server.js que insertan en `presupuesto_catalogo` y `presupuesto_asignacion_detalle`).

- **Propuesta**:
  - **Única fuente de verdad para categorías/subcategorías de PRESUPUESTO**: tabla **`presupuesto_catalogo`** ya existente (planta_id, categoria, subcategoria).
  - Los comandos de "solicitar presupuesto" deben:
    - Listar categorías desde `presupuesto_catalogo` para la planta del GA (DISTINCT categoria).
    - Listar subcategorías desde `presupuesto_catalogo` para esa planta y la categoría elegida.
  - Si una planta no tiene filas en `presupuesto_catalogo`, no puede usar solicitudes de presupuesto hasta que se cargue el catálogo (mismo seed o proceso que hoy).
  - **No** crear tablas ni constantes nuevas de catálogo "solo para presupuesto solicitudes"; reutilizar `presupuesto_catalogo`. Las 7 categorías (NOMINA, RENTAS, SERVICIOS, TALLER, MANTENIMIENTO, GASTOS GENERALES, IMPUESTOS PLANTA) ya están ahí por planta.

### 1.7 Saldo disponible y descuento

- **Fórmula** (por planta_id, periodo YYYY-MM, categoria, subcategoria):

  `disponible = SUM(presupuesto_asignacion_detalle.monto_aprobado) - SUM(presupuesto_solicitudes.monto WHERE estatus = 'APROBADO')`

  (Mismas planta, periodo, categoria, subcategoria en ambos lados.)

- **Fuente de asignado**: tabla actual **`presupuesto_asignacion_detalle`** (planta_id, periodo, categoria, subcategoria, monto_aprobado). No mezclar con folios.
- Al aprobar (GG):
  - Calcular `saldo_antes` = disponible actual de esa (planta, periodo, categoria, subcategoria).
  - Si `monto > saldo_antes` → no aprobar; mensaje "Saldo insuficiente en [categoria] / [subcategoria]. Disponible: $X."
  - Si aprueba: guardar en la solicitud `saldo_antes` y `saldo_despues = saldo_antes - monto`; insertar en `presupuesto_historial`; notificar a GA.

---

## 2. Tablas y columnas (nuevas o ampliadas)

Solo tablas nuevas o columnas añadidas; no se modifican `folios`, `folio_archivos`, `folio_historial`.

### 2.1 presupuesto_counters

Consecutivo mensual por planta para PRE-YYYYMM-XX.

| Columna         | Tipo           | Restricciones |
|-----------------|----------------|---------------|
| planta_id       | INT            | NOT NULL, REFERENCES plantas(id) |
| periodo_yyyymm  | VARCHAR(6)     | NOT NULL (formato YYYYMM) |
| last_seq        | INT            | NOT NULL DEFAULT 0 |
| UNIQUE(planta_id, periodo_yyyymm) | | |

### 2.2 presupuesto_asignacion_detalle (existente — uso sin cambiar nombre)

Ya existe. Contiene el “techo” por subcategoría. Opcional: agregar columnas de auditoría de carga (si se cargan desde Excel más adelante):

- `cargado_en` TIMESTAMPTZ NULL  
- `cargado_por` VARCHAR(120) NULL  
- `hash_carga` VARCHAR(64) NULL  

No obligatorio para Fase 1; se puede dejar como está y que el saldo siga usando `monto_aprobado`.

### 2.3 presupuesto_solicitudes

| Columna          | Tipo            | Restricciones |
|------------------|-----------------|---------------|
| id               | SERIAL          | PRIMARY KEY |
| numero_pre       | VARCHAR(20)     | UNIQUE NOT NULL (PRE-YYYYMM-XX) |
| planta_id        | INT             | NOT NULL, REFERENCES plantas(id) |
| periodo          | VARCHAR(7)      | NOT NULL (YYYY-MM) |
| categoria        | VARCHAR(120)    | NOT NULL |
| subcategoria     | VARCHAR(255)    | NOT NULL |
| monto            | NUMERIC(18,2)   | NOT NULL |
| concepto         | TEXT            | |
| prioridad        | VARCHAR(20)     | DEFAULT 'NORMAL' (NORMAL / URGENTE) |
| estatus          | VARCHAR(40)     | NOT NULL (BORRADOR, PENDIENTE_APROBACION_GG, APROBADO, RECHAZADO, CANCELADO) |
| creado_por       | VARCHAR(120)    | (teléfono o user_id según sistema) |
| creado_en        | TIMESTAMPTZ     | DEFAULT NOW() |
| aprobado_por     | VARCHAR(120)    | NULL |
| aprobado_en      | TIMESTAMPTZ     | NULL |
| motivo_rechazo   | TEXT            | NULL |
| saldo_antes      | NUMERIC(18,2)   | NULL (al aprobar) |
| saldo_despues    | NUMERIC(18,2)   | NULL (al aprobar) |
| dedupe_key       | VARCHAR(255)    | NULL UNIQUE (para reintentos webhook) |

Índices sugeridos:

- INDEX(planta_id, periodo, estatus)  
- INDEX(periodo, estatus)  
- INDEX(creado_en)  
- UNIQUE(dedupe_key) WHERE dedupe_key IS NOT NULL  

### 2.4 presupuesto_archivos

Múltiples PDF por solicitud; patrón análogo a `folio_archivos`.

| Columna             | Tipo            | Restricciones |
|---------------------|-----------------|---------------|
| id                  | SERIAL          | PRIMARY KEY |
| solicitud_id        | INT             | NOT NULL, REFERENCES presupuesto_solicitudes(id) ON DELETE CASCADE |
| tipo_documento      | VARCHAR(30)     | NOT NULL (COTIZACION / VALE / OTRO) |
| s3_key              | TEXT            | NOT NULL |
| url                 | TEXT            | NULL |
| hash                | VARCHAR(64)     | NULL (sha256) |
| file_name           | TEXT            | NULL |
| file_size_bytes     | BIGINT          | NULL |
| mime_type           | TEXT            | DEFAULT 'application/pdf' |
| subido_en           | TIMESTAMPTZ     | DEFAULT NOW() |
| subido_por          | VARCHAR(120)    | NULL |
| activo              | BOOLEAN         | DEFAULT true |
| reemplaza_archivo_id| INT             | NULL, REFERENCES presupuesto_archivos(id) |

Índices:

- INDEX(solicitud_id, activo)  
- UNIQUE(solicitud_id, hash) WHERE hash IS NOT NULL (evitar mismo PDF duplicado por solicitud)  

### 2.5 presupuesto_historial

| Columna       | Tipo         | Restricciones |
|---------------|--------------|---------------|
| id            | SERIAL       | PRIMARY KEY |
| solicitud_id  | INT          | NULL, REFERENCES presupuesto_solicitudes(id) |
| numero_pre    | VARCHAR(20)  | NULL (por si se borra solicitud) |
| evento        | VARCHAR(60)  | NOT NULL |
| detalle       | TEXT         | NULL |
| actor         | VARCHAR(120) | NULL |
| creado_en     | TIMESTAMPTZ  | DEFAULT NOW() |

Índice: INDEX(solicitud_id), INDEX(numero_pre), INDEX(creado_en).

### 2.6 Relaciones resumidas

- `presupuesto_counters`: por planta y YYYYMM.  
- `presupuesto_solicitudes`: planta_id → plantas; no toca folios.  
- `presupuesto_archivos`: solicitud_id → presupuesto_solicitudes.  
- `presupuesto_historial`: solicitud_id / numero_pre → presupuesto_solicitudes.  
- Saldo: lectura de `presupuesto_asignacion_detalle` + suma de `presupuesto_solicitudes` con estatus APROBADO.

---

## 3. Plan de implementación por fases

### Fase 1 — Base y flujo GA (solicitar)

- Crear tablas: `presupuesto_counters`, `presupuesto_solicitudes`, `presupuesto_archivos`, `presupuesto_historial` (sin tocar folios ni presupuestos_semanales).
- Implementar consecutivo PRE-YYYYMM-XX por (planta_id, periodo_yyyymm), idempotente con dedupe_key.
- Comando `presupuesto` → menú (1–5). Opción 2 "Solicitar presupuesto" (solo GA).
- Flujo guiado: categoría → subcategoría (desde `presupuesto_catalogo`) → monto → concepto → prioridad → adjuntar PDF → confirmar. Sesión tipo `sess.presupuestoSolicitud` con paso y datos.
- Subida PDF a S3 (reutilizar lógica existente de folios); hash sha256; dedupe por (solicitud_id, hash). No asignar PRE hasta haber al menos un PDF válido y confirmación.
- "Mis pendientes presupuesto" para GA (BORRADOR y RECHAZADO).
- Alcance: una planta (ej. Puebla) o todas las que tengan `presupuesto_catalogo`; framework listo por planta.

### Fase 2 — Aprobación GG y saldos

- "aprobar presupuesto PRE-…" (solo GG): resumen, doble confirmación, validación de saldo (planta + periodo + categoria + subcategoria). Si alcanza: estatus=APROBADO, saldo_antes/saldo_despues, historial, notificación a GA.
- "rechazar presupuesto PRE-… motivo: …" (solo GG): motivo obligatorio, estatus=RECHAZADO, historial, notificación a GA.
- Cálculo de disponible y validación antes de aprobar (usar `presupuesto_asignacion_detalle` y suma de solicitudes APROBADAS).
- "Mis pendientes presupuesto" para GG (PENDIENTE_APROBACION_GG; orden: urgentes primero, luego FIFO).
- "saldo presupuesto" / "ver saldo": por categoría y/o subcategoría (GA/GG su planta; CDMX/ZP todas si se implementa en esta fase).

### Fase 3 — Consultas, historial, CDMX/ZP y robustez

- "historial presupuesto" [YYYY-MM]: listado FIFO del periodo con paginación.
- Roles CDMX y ZP: solo lectura (saldo, historial, comparativos si aplica). No botones de aprobar/rechazar.
- Comandos "adjuntar presupuesto PRE-…" y "reemplazar pdf presupuesto PRE-…" (múltiples PDF; reemplazo con activo=false y reemplaza_archivo_id).
- Revisión de dedupe (reintentos Twilio, doble aprobación, historial sin duplicar etapas).
- Paginación de respuestas largas (ver sección 7).
- Pruebas de reintentos y edge cases (ver sección 5).

---

## 4. Validaciones críticas y mensajes UX (WhatsApp)

- **Solo GA puede solicitar**: si GG/CDMX/ZP intentan "Solicitar presupuesto" → "Solo el rol GA puede crear solicitudes de presupuesto."
- **Solo GG puede aprobar/rechazar**: si GA/CDMX/ZP intentan aprobar/rechazar → "Solo el rol GG puede aprobar o rechazar solicitudes."
- **PDF obligatorio**: si confirma sin PDF → "Debes adjuntar al menos un PDF (cotización o vale firmado) antes de confirmar."
- **Monto > 0**: "Indica un monto mayor a 0."
- **Categoría/subcategoría válidas**: deben existir en `presupuesto_catalogo` para la planta del usuario; si no → "Categoría o subcategoría no válida para tu planta."
- **Saldo insuficiente al aprobar**: "Saldo insuficiente en [categoria] / [subcategoría]. Disponible: $X. No se puede aprobar esta solicitud."
- **Rechazo sin motivo**: "Indica el motivo de rechazo. Ejemplo: rechazar presupuesto PRE-202602-01 motivo: no hay partida."
- **PRE no encontrado**: "No existe una solicitud con número PRE-…" o "PRE-… no encontrado o no está pendiente de aprobación."
- **Confirmaciones**: "Responde CONFIRMAR para enviar la solicitud o CANCELAR para salir." / "Responde APROBAR DEFINITIVO para aprobar o CANCELAR."
- **Límite de caracteres**: mensajes largos paginados o resumidos (ver sección 7).

---

## 5. Casos de prueba (happy path + edge + reintentos)

**Happy path**

- GA (planta Puebla) abre "presupuesto" → Solicitar presupuesto → elige categoría y subcategoría → monto → concepto → Urgente → adjunta PDF → CONFIRMAR → se crea solicitud con PRE-YYYYMM-01 y estado PENDIENTE_APROBACION_GG; GA recibe confirmación con número PRE.
- GG abre "mis pendientes presupuesto" → ve PRE-… → "aprobar presupuesto PRE-…" → ve resumen → CONFIRMAR APROBACIÓN → APROBAR DEFINITIVO → estado APROBADO; saldo descontado; GA recibe notificación.
- GG rechaza con motivo → estado RECHAZADO; GA recibe notificación con motivo.

**Edge cases**

- Monto mayor al disponible → aprobación bloqueada; mensaje de saldo insuficiente.
- GA sin catálogo para su planta → mensaje "Tu planta no tiene catálogo de presupuesto configurado."
- Periodo sin asignación (sin filas en presupuesto_asignacion_detalle) → disponible = 0; no se puede aprobar monto > 0.
- Consecutivo XX > 99 en un mes/planta → definir si se usa 3 dígitos (001–999) o mensaje de límite.

**Reintentos Twilio**

- Mismo mensaje "CONFIRMAR" dos veces (doble POST): dedupe_key igual → no crear segunda solicitud ni segundo PRE; responder mismo mensaje de éxito.
- Doble "APROBAR DEFINITIVO": tras primera aprobación, estatus ya APROBADO; segunda petición debe detectar estado y responder "Esta solicitud ya fue aprobada" sin volver a descontar ni duplicar historial.
- Historial: al imprimir, no duplicar líneas (por ejemplo dedupe por último evento por etapa o por (solicitud_id, evento, creado_en) redondeado).

---

## 6. Checklist "no romper folios"

- [ ] No modificar tablas: `folios`, `folio_archivos`, `folio_historial`, `folio_counters`, `notificaciones_log`, `comentarios`.
- [ ] No cambiar la generación de `numero_folio` / `folio_codigo` (F-YYYYMM-XXX).
- [ ] No reutilizar `folio_counters` para PRE; usar tabla nueva `presupuesto_counters` (planta_id + periodo_yyyymm).
- [ ] No mezclar rutas: el router debe distinguir comando "presupuesto" / "solicitar presupuesto" / "aprobar presupuesto PRE-…" del flujo de folios (crear folio, adjuntar cotización, aprobar folio, etc.).
- [ ] Sesiones: añadir solo `sess.presupuestoSolicitud` (y las que hagan falta para aprobar/rechazar); no sobrescribir `sess.dd`, `sess.pendingCotizacion`, etc., con datos de presupuesto.
- [ ] Adjuntos: si el usuario envía PDF en contexto de presupuesto (sess.presupuestoSolicitud.paso = adjuntar PDF), tratar como presupuesto_archivos; si está en contexto de cotización de folio, tratar como folio_archivos (comportamiento actual).
- [ ] S3: mismo bucket y convención de keys; prefijo o path distinto para presupuesto (ej. `presupuesto/PRE-YYYYMM-XX/archivo_id.pdf`) para no pisar keys de folios.
- [ ] Roles: comprobar rol antes de cada acción (GA/GG/CDMX/ZP) sin alterar la lógica de roles de folios (getActorByPhone, etc.).

---

## 7. Paginación de respuestas largas (Twilio)

- **Límite útil**: ~1500 caracteres por mensaje (Twilio ~1600; dejar margen). Si la respuesta supera el límite:
  - **Saldo por categoría/subcategoría**: enviar por categorías (ej. "Categoría NOMINA: …" en un mensaje; "Categoría RENTAS: …" en el siguiente) o ofrecer "Ver más: responde 1) NOMINA 2) RENTAS …" para desglose bajo demanda.
  - **Historial presupuesto**: enviar los últimos N (ej. 5 o 10) con "Para ver más: hist presupuesto 2026-02 página 2" (si se implementa paginación por página).
  - **Listado de pendientes**: máx. 10 ítems por mensaje; si hay más, "Responde PAGINA 2 para ver más" o listar solo PRE y resumen en una línea cada uno.
- Evitar un solo mensaje de miles de caracteres; dividir en bloques claros con títulos (ej. "📊 Saldo 2026-02 — NOMINA", "📊 Saldo 2026-02 — RENTAS").

---

## 8. Reutilización del catálogo (resumen)

- **Fuente única**: tabla **`presupuesto_catalogo`** (planta_id, categoria, subcategoria), ya poblada por seeds por planta.
- **Solicitudes**: al "solicitar presupuesto", listar categorías con `SELECT DISTINCT categoria FROM presupuesto_catalogo WHERE planta_id = $1 ORDER BY categoria`. Luego subcategorías con `SELECT subcategoria FROM presupuesto_catalogo WHERE planta_id = $1 AND categoria = $2 ORDER BY subcategoria`.
- **Folios**: siguen usando categoria/subcategoria en texto libre en `folios`; no es necesario un catálogo para folios en este alcance. Presupuesto solicitudes no leen de folios para catálogo.
- **Asignación (saldo)**: seguir usando `presupuesto_asignacion_detalle` (planta_id, periodo, categoria, subcategoria, monto_aprobado). No duplicar en otra tabla salvo que se quiera auditoría de cargas (columnas opcionales o tabla `presupuesto_cargas_log` en fases posteriores).

---

## 9. Alcance inicial (Puebla y extensión)

- Implementar primero para **una planta** (ej. Puebla) si el producto lo requiere: filtrar por `actor.planta_id` en "solicitar presupuesto", "mis pendientes", "saldo", "historial". GG solo ve solicitudes de su planta; GA solo crea en su planta.
- Dejar el **framework** listo para todas las plantas: todas las consultas ya filtran por planta_id; solo hay que asegurar que cada planta tenga `presupuesto_catalogo` y, si aplica, `presupuesto_asignacion_detalle` para los periodos usados.
- CDMX/ZP: en Fase 3, si se implementan, pueden ver todas las plantas (omitir filtro por planta_id o usar lista de plantas permitidas por rol).

---

*Documento listo para usar como especificación de implementación en Cursor; sin código, solo diseño y plan.*
