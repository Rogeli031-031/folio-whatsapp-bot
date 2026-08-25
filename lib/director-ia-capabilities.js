"use strict";

/**
 * Director IA v2 — Fase 1: catálogo central de capacidades y veracidad.
 * Solo lectura / declaración. No integra fuentes nuevas.
 */

/** Estados de veracidad (Fase 1: solo SOURCE_NOT_INTEGRATED altera el chat). */
const DIRECTOR_IA_VERACITY = Object.freeze({
  SOURCE_AVAILABLE: "SOURCE_AVAILABLE",
  SOURCE_PARTIAL: "SOURCE_PARTIAL",
  SOURCE_NOT_INTEGRATED: "SOURCE_NOT_INTEGRATED",
  SOURCE_RESTRICTED: "SOURCE_RESTRICTED",
  SOURCE_ERROR: "SOURCE_ERROR",
  DATA_NOT_FOUND: "DATA_NOT_FOUND",
});

const COVERAGE = Object.freeze({
  complete: "complete",
  partial: "partial",
  indirect: "indirect",
  none: "none",
  unknown: "unknown",
});

const ACCESS_MODE = Object.freeze({
  always: "always",
  on_demand: "on_demand",
  related_data_only: "related_data_only",
  not_integrated: "not_integrated",
  restricted: "restricted",
});

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   coverage: string,
 *   accessMode: string,
 *   canRead: boolean,
 *   canWrite: boolean,
 *   description: string,
 *   limitations: string,
 *   relatedReadable?: string[],
 * }} DirectorIaCapability
 */

/** @type {DirectorIaCapability[]} */
const CAPABILITIES = [
  {
    id: "action_register",
    label: "Action Register",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.always,
    canRead: true,
    canWrite: false,
    description: "Resumen de acciones, temas, responsables y vencidas por planta.",
    limitations:
      "Top N; notas de revisión excluidas del context always-on (van on-demand por loader dedicado); sin CRUD desde el chat.",
  },
  {
    id: "revision_notes",
    label: "Notas de revisión Action Register",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.on_demand,
    canRead: true,
    canWrite: false,
    description: "Notas de una revisión del Action Register (texto, autor almacenado, fecha).",
    limitations:
      "1 revisión; máx. 8 notas; 500 caracteres; truncation explícito. No ítem, no Plaud, no M2, no comentarios de folio, no binarios, no CRUD.",
    relatedReadable: ["action_register"],
  },
  {
    id: "dicf",
    label: "DICF",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.always,
    canRead: true,
    canWrite: false,
    description: "Acciones e historial DICF por cliente (resumen limitado).",
    limitations: "Máx. ~40 detalles; sin attachments; ventana temporal en modos de chat.",
  },
  {
    id: "bitacora",
    label: "Bitácora IA",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.always,
    canRead: true,
    canWrite: false,
    description: "Notas de campo / visitas asociadas a la planta.",
    limitations: "Límite de sesiones en chat; ventana típica de últimos meses.",
  },
  {
    id: "mejora_continua",
    label: "Mejora Continua",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.on_demand,
    canRead: true,
    canWrite: false,
    description: "Vista de mejora continua sobre Action Register por mes.",
    limitations: "Activación por tipo de pregunta; áreas según foco.",
  },
  {
    id: "cliente_comentarios",
    label: "Comentarios de cliente",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.always,
    canRead: true,
    canWrite: false,
    description: "Comentarios comerciales por cliente/planta.",
    limitations: "Últimos N comentarios; sin crear desde el chat.",
  },
  {
    id: "folio_comentarios",
    label: "Comentarios de folio",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.always,
    canRead: true,
    canWrite: false,
    description: "Comentarios asociados a folios de la planta.",
    limitations: "No incluye etapa, historial operativo ni documentos del folio.",
  },
  {
    id: "entidades_comerciales",
    label: "Entidades comerciales",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.on_demand,
    canRead: true,
    canWrite: false,
    description: "Resolución de nombre canónico y alias comerciales.",
    limitations: "Depende del catálogo cargado; sin mutación desde el chat.",
  },
  {
    id: "arr",
    label: "ARR",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.on_demand,
    canRead: true,
    canWrite: false,
    description: "Proyección / KPIs ARR bajo demanda en el chat.",
    limitations: "No aparece en GET context sources; depende del wording; no carga ARR.",
  },
  {
    id: "igf",
    label: "IGF Forecast",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.on_demand,
    canRead: true,
    canWrite: false,
    description:
      "Compromiso / KPIs IGF bajo demanda en el chat, incluida composición observada de una fila de compromiso_lines.",
    limitations:
      "No aparece en GET context sources; snapshot único; *_kg = $/kg; sin recálculo ni overlay; sin causalidad; sin deltas IGF (M9).",
  },
  {
    id: "commercial_state",
    label: "Estado comercial",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.on_demand,
    canRead: true,
    canWrite: false,
    description: "Listas dejaron/disminuyeron/aumentaron/nuevos (compute DICF).",
    limitations: "On-demand; límite de clientes; GA restringido; no en GET sources.",
  },
  {
    id: "commercial_dossier",
    label: "Expediente comercial",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.on_demand,
    canRead: true,
    canWrite: false,
    description: "Expediente factual por cliente: estado materializado, comentarios con clave, acciones DICF e historial.",
    limitations:
      "1 cliente; 8 comentarios / 500 chars; 8 acciones; 8 eventos. SELECT-only. Sin causalidad. Sin bitácora. Sin comentarios sin cliente_key.",
    relatedReadable: ["dicf", "commercial_state", "cliente_comentarios", "entidades_comerciales"],
  },
  {
    id: "folios",
    label: "Folios operativos",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.on_demand,
    canRead: true,
    canWrite: false,
    description: "Estatus observado y etapa derivada de un folio; listado por planta/etapa.",
    limitations:
      "Solo estatus/etapa. No historial, documentos, cheque, póliza ni mutaciones. La etapa no es columna de DB.",
    relatedReadable: ["folio_comentarios", "kanban"],
  },
  {
    id: "kanban",
    label: "Kanban / etapa de folio",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.on_demand,
    canRead: true,
    canWrite: false,
    description: "Etapa visual derivada del estatus de folios (listado por planta/etapa).",
    limitations:
      "Solo lectura de etapa/estatus. No es el GET /kanban. No autoavanza. No historial ni documentos.",
    relatedReadable: ["folios", "folio_comentarios"],
  },
  {
    id: "folio_historial",
    label: "Historial de folios",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.on_demand,
    canRead: true,
    canWrite: false,
    description: "Eventos registrados en public.folio_historial (read-only, on-demand).",
    limitations:
      "Solo eventos crudos observados. No transiciones inventadas. No documents, cheque ni póliza. No dedupe por etapa. Actor null no es sistema.",
    relatedReadable: ["folios", "folio_comentarios"],
  },
  {
    id: "documentos",
    label: "Documentos y medios de folio",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.on_demand,
    canRead: true,
    canWrite: false,
    description: "Metadata de registros en public.folio_archivos (read-only, on-demand).",
    limitations:
      "Solo lista registros existentes (tipo, status, file_name, subido_en). No contenido, PDF, URLs ni S3. No afirma documentos obligatorios ni cumplimiento.",
    relatedReadable: ["folios", "folio_comentarios"],
  },
  {
    id: "cheques",
    label: "Cheques / depósito de folio",
    coverage: COVERAGE.none,
    accessMode: ACCESS_MODE.not_integrated,
    canRead: false,
    canWrite: false,
    description: "Número de cheque, etapa cheque o depósito de cierre.",
    limitations: "No integrado.",
    relatedReadable: ["folio_comentarios"],
  },
  {
    id: "polizas",
    label: "Pólizas",
    coverage: COVERAGE.none,
    accessMode: ACCESS_MODE.not_integrated,
    canRead: false,
    canWrite: false,
    description: "Póliza asociada al folio.",
    limitations: "No integrado.",
    relatedReadable: ["folio_comentarios"],
  },
  {
    id: "presupuestos",
    label: "Presupuestos semanales",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.on_demand,
    canRead: true,
    canWrite: false,
    description: "Consulta read-only del carro / presupuesto semanal por planta.",
    limitations:
      "Query JSON parcial (asignado/seleccionado/disponible/folios). Writes, cheques y WhatsApp no están integrados. Distinto de presupuesto_asignacion_detalle.",
    relatedReadable: ["folios"],
  },
  {
    id: "proyectos",
    label: "Proyectos",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.on_demand,
    canRead: true,
    canWrite: false,
    description: "Proyectos EN_CURSO por planta (public.proyectos).",
    limitations:
      "Listado read-only; no crea/edita/elimina; no es Action Register; 'retrasado' no es estatus almacenado.",
    relatedReadable: ["action_register", "mejora_continua"],
  },
  {
    id: "dashboard_kpis",
    label: "KPIs de dashboard",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.on_demand,
    canRead: true,
    canWrite: false,
    description: "Agregados de folios de GET /api/dashboard/kpis.",
    limitations:
      "No IGF/ARR; no afirma salud ni causalidad; GA/GV bloqueados; ventana default del dashboard.",
    relatedReadable: [],
  },
  {
    id: "clasificacion_apoyos",
    label: "Clasificación de apoyos",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.on_demand,
    canRead: true,
    canWrite: false,
    description: "Consulta JSON read-only de la matriz comparativa mes_a vs mes_b por planta y familia.",
    limitations:
      "Query JSON parcial. COMPARAR y Excel/xlsx no están integrados. No fallback global de plantas. No afirma causa ni desviación presupuestal.",
    relatedReadable: [],
  },
  {
    id: "taller_at",
    label: "Taller por AT",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.on_demand,
    canRead: true,
    canWrite: false,
    description: "Consulta JSON read-only de folios TALLER por token de public.folios.unidad.",
    limitations:
      "Query JSON parcial. Excel/workbook y duplicados no están integrados. Distinto de GASTOS, INVERSIONES, M4 y Action Register. No hay at_id ni catálogo.",
    relatedReadable: ["action_register", "mejora_continua"],
  },
  {
    id: "gastos",
    label: "Gastos (folios / Excel)",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.on_demand,
    canRead: true,
    canWrite: false,
    description: "Consulta read-only de folios categoría GASTOS por planta y YYYY-MM.",
    limitations:
      "Query JSON parcial. Export/xlsx no está integrado. Distinto de IGF (margen/gasto financiero) y de Taller AT.",
    relatedReadable: ["igf", "arr"],
  },
  {
    id: "inversiones",
    label: "Inversiones (folios / Excel)",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.on_demand,
    canRead: true,
    canWrite: false,
    description: "Consulta read-only de folios categoría INVERSIONES por planta y YYYY-MM.",
    limitations: "Query JSON parcial. Export/xlsx no está integrado. No afirma 'pendiente' como etapa.",
    relatedReadable: [],
  },
  {
    id: "delta_venta",
    label: "Delta Venta",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.on_demand,
    canRead: true,
    canWrite: false,
    description: "Comparación de kg por cliente entre dos YYYY-MM (modal Delta Venta).",
    limitations:
      "Read-only; 80/20 de esta muestra; no es descuento/ingreso; no IGF/ARR snapshot ni KPIs M3.",
    relatedReadable: [],
  },
  {
    id: "delta_descuento",
    label: "Delta Descuento",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.on_demand,
    canRead: true,
    canWrite: false,
    description: "Comparación de descuento $/kg entre dos YYYY-MM (modal Delta Descuento).",
    limitations: "Read-only; kg=0 → ratio 0 en la fuente; no es weekly LD ni venta.",
    relatedReadable: [],
  },
  {
    id: "delta_ingreso",
    label: "Delta Ingreso",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.on_demand,
    canRead: true,
    canWrite: false,
    description: "Comparación de ingreso del modal (kg × (margen − |desc|)) entre dos YYYY-MM.",
    limitations:
      "Margen IGF es insumo de fórmula, no anexo; no forecast con escritura; no M19.",
    relatedReadable: [],
  },
  {
    id: "duplicados",
    label: "Duplicados de folios",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.on_demand,
    canRead: true,
    canWrite: false,
    description: "Análisis heurístico de posibles pares de folios (importe + concepto).",
    limitations:
      "Candidatos a posible duplicidad; no confirma duplicados ni fraude; no cancela folios.",
    relatedReadable: [],
  },
  {
    id: "usuarios_admin",
    label: "Usuarios y permisos admin",
    coverage: COVERAGE.none,
    accessMode: ACCESS_MODE.not_integrated,
    canRead: false,
    canWrite: false,
    description: "Administración de usuarios, roles y permisos.",
    limitations: "No integrado.",
    relatedReadable: [],
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    coverage: COVERAGE.partial,
    accessMode: ACCESS_MODE.restricted,
    canRead: false,
    canWrite: false,
    description: "Canal de acceso (enlace firmado); no es fuente de datos del chat.",
    limitations: "No consulta historial ni mensajes de WhatsApp como contexto.",
  },
];

const CAPABILITIES_BY_ID = Object.freeze(
  CAPABILITIES.reduce((acc, c) => {
    acc[c.id] = Object.freeze({ ...c });
    return acc;
  }, /** @type {Record<string, DirectorIaCapability>} */ ({}))
);

function normalizeQuestion(raw) {
  return String(raw || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Preguntas claramente permitidas aunque compartan vocabulario con dominios no integrados.
 * Conservador: solo patrones explícitos de dominios ya legibles.
 */
function isPreMeetingQuery(raw) {
  const q = normalizeQuestion(raw);
  if (!q) return false;
  if (/\bpre-?cierre\b/.test(q) || /\bprecierre\b/.test(q)) return true;
  const meeting = /\bjunta\b/.test(q) || /\breunion\b/.test(q);
  if (
    meeting &&
    (/\bprepar/.test(q) ||
      /\bantes\b/.test(q) ||
      /\bcierre\b/.test(q) ||
      /\bhuecos?\b/.test(q) ||
      /\bejecutiv/.test(q) ||
      /\bbriefing\b/.test(q) ||
      /\barmar\b/.test(q) ||
      /\barmame\b/.test(q) ||
      /\bpanorama\b/.test(q) ||
      /\bpuntos?\b/.test(q))
  ) {
    return true;
  }
  if (/\bantes de entrar\b/.test(q) && /\brevis/.test(q)) return true;
  return false;
}

function isMonthCloseQuery(raw) {
  const q = normalizeQuestion(raw);
  if (!q) return false;
  if (/\bcerramos\b/.test(q) || /\bcomo cerr/.test(q) || /\bcontra la meta\b/.test(q)) return true;
  if (/\bporcentaje\b/.test(q) && /\bcumpl/.test(q)) return true;
  if (/\bmeta\b/.test(q) && (/\bfalto\b/.test(q) || /\bcumpl/.test(q) || /\bporcentaje\b/.test(q))) return true;
  if (/\bcierre\b/.test(q) && (/\bmes\b/.test(q) || /\bventa\b/.test(q)) && !/\bjunta\b/.test(q) && !/\breunion\b/.test(q)) {
    return true;
  }
  return false;
}

function matchesAllowedReadableIntent(q) {
  if (isMonthCloseQuery(q)) return true;
  if (isPreMeetingQuery(q)) return true;
  // Comentarios de folio (no etapa/historial)
  if (
    /\bcomentarios?\b/.test(q) &&
    /\bfolio/.test(q) &&
    !/\b(etapa|estatus|estado|historial|movimiento|documento|poliza|cheque|deposito)\b/.test(q)
  ) {
    return true;
  }
  // Comentarios de cliente
  if (/\bcomentarios?\b/.test(q) && /\bclientes?\b/.test(q)) {
    return true;
  }
  // Action Register / vencidas
  if (
    /\bacciones?\b/.test(q) &&
    /\b(vencid|atrasad|overdue|abiert|pendient|responsable)/.test(q)
  ) {
    return true;
  }
  if (/\bcomo\s+va\s+(mantenimiento|seguridad|calidad|taller|mejora)\b/.test(q)) {
    return true;
  }
  // ARR / IGF (on-demand existentes)
  if (/\barr\b/.test(q) && !/\bduplicad/.test(q)) {
    return true;
  }
  if (/\bigf\b/.test(q)) {
    return true;
  }
  if (/\bcomposicion\b/.test(q) && /\b(igf|compromiso|utilidad|resultado)\b/.test(q)) {
    return true;
  }
  // Estado comercial
  if (
    /\bdejaron\s+de\s+comprar\b/.test(q) ||
    /\bdisminuyeron\b/.test(q) ||
    /\baumentaron\b/.test(q) ||
    /\bclientes?\s+nuev/.test(q) ||
    /\bnuev[oa]s?\s+clientes?\b/.test(q)
  ) {
    return true;
  }
  // Bitácora
  if (/\bbitacora\b/.test(q) || /\bvisita\b/.test(q) && /\b(campo|planta|cliente)\b/.test(q)) {
    return true;
  }
  if (
    (/\b(cambio|cambi[oó]|vario|variacion|delta)\b/.test(q) || /\bcomo\s+cambi/.test(q)) &&
    /\b(venta|descuento|ingreso)\b/.test(q)
  ) {
    return true;
  }
  if (
    (/\b(etapa|estatus)\b/.test(q) && /\bfolio/.test(q)) ||
    /\ben\s+que\s+(etapa|estatus|estado)\s+(esta|se\s+encuentra)\b/.test(q) ||
    /\bestado\s+(del|de\s+el)\s+folio\b/.test(q) ||
    (/\bfolios?\b/.test(q) &&
      /\b(tablero|kanban|listar|listado)\b/.test(q) &&
      !/\b(historial|documentos?|poliza|cheque|presupuesto)\b/.test(q))
  ) {
    return true;
  }
  if (
    (/\b(ultimo|ultimos)\s+movimientos?\b/.test(q) && (/\bfolio/.test(q) || /\bhistorial\b/.test(q))) ||
    (/\bhistorial\b/.test(q) && /\bfolio/.test(q)) ||
    /\bquien\s+(movio|aprobo|avanzo|cambio)\s+(el\s+)?folio\b/.test(q)
  ) {
    return true;
  }
  if (
    (/\bdocumentos?\b/.test(q) || /\bdocumentales?\b/.test(q)) &&
    (/\b(listar|listado|tiene|tienen|asociad|registros?)\b/.test(q) || /\bfolio/.test(q)) &&
    !/\b(falt|pdf|contenido|descarg|ocr|deberia)/.test(q)
  ) {
    return true;
  }
  if (
    isM6GastosFoliosQuery(q) ||
    isM6InversionesFoliosQuery(q) ||
    isM4ClasificacionQuery(q) ||
    isM18PresupuestoQuery(q) ||
    isM5TallerAtQuery(q) ||
    isTallerMayorQuery(q)
  ) {
    return true;
  }
  if (
    /\bexpediente comercial\b/.test(q) ||
    (/\bexpediente\b/.test(q) && /\b(cliente|comercial)\b/.test(q)) ||
    (/\bestado\b/.test(q) && /\bcomentarios?\b/.test(q) && /\bacciones?\b/.test(q)) ||
    /\bque\s+sabemos\s+comercialmente\b/.test(q)
  ) {
    return true;
  }
  return false;
}

function isM6ExportQuestion(q) {
  return /\b(excel|xlsx|export|descarg)\b/.test(q);
}

function isM6FinancialCollision(q) {
  return /\b(igf|margen|rentabilidad)\b/.test(q);
}

function isM5ExcelOrDupQuestion(q) {
  return /\b(excel|xlsx|export|descarg|duplicad)\b/.test(q);
}

function isM5ActionRegisterCollision(q) {
  return /\bacciones?\b/.test(q) || /\bresponsable\b/.test(q) || /\bvencid/.test(q);
}

function isM5M4Collision(q) {
  return /\b(compara|comparar|comparativo|clasificacion)\b/.test(q);
}

function isM5TallerAtQuery(q) {
  if (isM5ExcelOrDupQuestion(q) || isM5ActionRegisterCollision(q) || isM5M4Collision(q)) return false;
  if (/\binversiones?\b/.test(q)) return false;
  if (/\bgastos?\b/.test(q) && !/\btaller\b/.test(q)) return false;
  const hasTaller = /\btaller\b/.test(q);
  const hasUnitToken = /\b(?:at|pt|s|c|u|t)[-\s]?\d{1,4}\b/i.test(q) || /\bunidad\b/i.test(q);
  return hasTaller && hasUnitToken;
}

function isTallerMayorQuery(raw) {
  const q = normalizeQuestion(raw);
  if (isM5ExcelOrDupQuestion(q) || isM5ActionRegisterCollision(q) || isM5M4Collision(q)) return false;
  if (/\binversiones?\b/.test(q)) return false;
  if (/\bclasificacion\b/.test(q)) return false;
  if (/\bgastos?\b/.test(q) && !/\btaller\b/.test(q)) return false;
  const hasTaller = /\btaller\b/.test(q);
  const hasMayor = /\bmayor\b/.test(q);
  const hasReparacionMayor = /\breparacion\s+mayor\b/.test(q);
  if (hasTaller && hasMayor) return true;
  return Boolean(
    hasReparacionMayor &&
      (/\bunidades?\b/.test(q) || /\bapoyos?\b/.test(q) || /\bfolios?\b/.test(q) || /\bat\b/.test(q))
  );
}

function isM6GastosFoliosQuery(q) {
  if (isM6ExportQuestion(q) || isM6FinancialCollision(q)) return false;
  return (
    (/\bgastos?\b/.test(q) && /\b(folio|categoria|listad|rango\s+de\s+meses)\b/.test(q)) ||
    /\bgastos?\s+(de\s+)?folios?\b/.test(q) ||
    /\bfolios?\s+de\s+gastos?\b/.test(q)
  );
}

function isM6InversionesFoliosQuery(q) {
  if (isM6ExportQuestion(q) || isM6FinancialCollision(q)) return false;
  return (
    /\binversiones?\b/.test(q) &&
    (/\b(pendient|folio|categoria|listad|hay|existen|estan)\b/.test(q) || /\bque\s+inversiones?\b/.test(q))
  );
}

function isM4CompararOrExcelQuestion(q) {
  return (
    /\b(excel|xlsx|export|descarg|workbook)\b/.test(q) ||
    /\breconcili/.test(q) ||
    (/\bcomparar\b/.test(q) && /\b(excel|archivo|xlsx)\b/.test(q)) ||
    ((/\b(agregar|rechazar|inspeccionar)\b/.test(q) && /\b(folio|clasificacion)\b/.test(q)))
  );
}

function isM4ClasificacionQuery(q) {
  if (isM4CompararOrExcelQuestion(q)) return false;
  return (
    /\bclasificacion\s+(de\s+)?apoyos?\b/.test(q) ||
    (/\bclasificacion\b/.test(q) && /\bapoyos?\b/.test(q)) ||
    /\bcomparar\s+clasificacion\b/.test(q) ||
    /\bcomparativo\s+(de\s+)?(clasificacion|apoyos)\b/.test(q) ||
    (/\bmatriz\b/.test(q) && /\bclasificacion\b/.test(q))
  );
}

function isM18WriteOrChequeQuestion(q) {
  return (
    /\basignar\s+presupuesto\b/.test(q) ||
    /\benviar\s+(el\s+)?presupuesto\s+a\s+cheques?\b/.test(q) ||
    (/\bpresupuesto\b/.test(q) && /\b(asignar|reemplazar|modificar)\b/.test(q)) ||
    (/\b(carro|carrito|presupuesto)\b/.test(q) &&
      /\b(seleccionar|quitar|agregar)\b/.test(q) &&
      /\bfolios?\b/.test(q)) ||
    (/\bpresupuesto\b/.test(q) && /\bnotificar\b/.test(q)) ||
    /\bcheque\b/.test(q)
  );
}

function isM18PresupuestoQuery(q) {
  if (isM18WriteOrChequeQuestion(q)) return false;
  return (
    /\bpresupuesto\s+semanal\b/.test(q) ||
    /\bmi\s+presupuesto\b/.test(q) ||
    (/\bpresupuesto\b/.test(q) && /\b(semana|semanal|carro|carrito)\b/.test(q))
  );
}

/**
 * Reglas explícitas de dominios no integrados (orden = prioridad de detección).
 * @type {{ id: string, test: (q: string) => boolean }[]}
 */
const UNSUPPORTED_RULES = [
  {
    id: "documentos",
    test: (q) =>
      (/\bdocumentos?\b/.test(q) && /\b(falt|deberia)/.test(q)) ||
      (/\b(pdf|contenido|ocr|descarg)\b/.test(q) &&
        /\b(documentos?|folio|adjunt|media|cotizacion|factura)\b/.test(q)),
  },
  {
    id: "polizas",
    test: (q) => /\bpoliza\b/.test(q) || /\bpolizas\b/.test(q),
  },
  {
    id: "cheques",
    test: (q) =>
      /\bcheque\b/.test(q) ||
      (/\bdeposito\b/.test(q) && (/\bfolio/.test(q) || /\bcheque\b/.test(q) || /\btiene\b/.test(q) || /\bcierre\b/.test(q))),
  },
  {
    id: "presupuestos",
    test: (q) => isM18WriteOrChequeQuestion(q) && !/\bcheque\b/.test(q),
  },
  {
    id: "taller_at",
    test: (q) =>
      !isTallerMayorQuery(q) &&
      (/\btaller\s+por\s+at\b/.test(q) ||
        /\btaller\s+at\b/.test(q) ||
        (/\btaller\b/.test(q) && /\b(unidad|at-\d|por\s+at|excel\s+taller)\b/.test(q))),
  },
  {
    id: "inversiones",
    test: (q) =>
      /\binversiones?\b/.test(q) &&
      (/\b(pendient|folio|excel|categoria|export|listad|hay|existen|estan)\b/.test(q) ||
        /\bque\s+inversiones?\b/.test(q)),
  },
  {
    id: "gastos",
    test: (q) =>
      (/\bgastos?\b/.test(q) &&
        /\b(folio|excel|categoria|export|listad|rango\s+de\s+meses)\b/.test(q)) ||
      /\bgastos?\s+(de\s+)?folios?\b/.test(q) ||
      /\bfolios?\s+de\s+gastos?\b/.test(q),
  },
  {
    id: "clasificacion_apoyos",
    test: (q) =>
      /\bclasificacion\s+(de\s+)?apoyos?\b/.test(q) ||
      (/\bclasificacion\b/.test(q) && /\bapoyos?\b/.test(q)) ||
      /\bcomparar\s+clasificacion\b/.test(q),
  },
  {
    id: "usuarios_admin",
    test: (q) =>
      (/\busuarios?\b/.test(q) && /\b(admin|permisos?|roles?)\b/.test(q)) ||
      /\bpermisos?\s+(de\s+)?usuarios?\b/.test(q) ||
      /\bcambiar\s+permisos?\b/.test(q) ||
      /\badministracion\s+de\s+usuarios?\b/.test(q),
  },
];

/**
 * @param {string} domainId
 * @returns {DirectorIaCapability | null}
 */
function getDirectorIaCapability(domainId) {
  if (!domainId) return null;
  return CAPABILITIES_BY_ID[String(domainId)] || null;
}

/**
 * @returns {DirectorIaCapability[]}
 */
function listDirectorIaCapabilities() {
  return CAPABILITIES.map((c) => ({ ...c }));
}

/**
 * @param {string} domainId
 * @returns {boolean}
 */
function isDirectorIaDomainReadable(domainId) {
  const cap = getDirectorIaCapability(domainId);
  return Boolean(cap && cap.canRead === true);
}

/**
 * @returns {{ readable: object[], not_integrated: object[], summary_text: string }}
 */
function buildDirectorIaCapabilitiesSummary() {
  const readable = CAPABILITIES.filter((c) => c.canRead).map((c) => ({
    id: c.id,
    label: c.label,
    coverage: c.coverage,
    accessMode: c.accessMode,
  }));
  const not_integrated = CAPABILITIES.filter(
    (c) => c.coverage === COVERAGE.none || c.accessMode === ACCESS_MODE.not_integrated
  ).map((c) => ({
    id: c.id,
    label: c.label,
    coverage: c.coverage,
    accessMode: c.accessMode,
  }));
  const readableLabels = readable.map((c) => c.label).join(", ");
  const blockedLabels = not_integrated.map((c) => c.label).join(", ");
  const summary_text =
    `Director IA puede consultar (parcial o bajo demanda): ${readableLabels}. ` +
    `Todavía no integra: ${blockedLabels}.`;
  return { readable, not_integrated, summary_text };
}

/**
 * Detección conservadora por reglas explícitas (sin OpenAI).
 * @param {string} question
 * @returns {DirectorIaCapability | null} capability del dominio no integrado, o null
 */
function detectUnsupportedDirectorIaDomain(question) {
  const q = normalizeQuestion(question);
  if (!q) return null;

  if (matchesAllowedReadableIntent(q)) {
    return null;
  }

  for (const rule of UNSUPPORTED_RULES) {
    if (rule.test(q)) {
      return getDirectorIaCapability(rule.id);
    }
  }
  return null;
}

/**
 * Texto honesto cuando la fuente no está integrada.
 * @param {DirectorIaCapability} capability
 * @returns {string}
 */
function buildUnsupportedDomainAnswer(capability) {
  const related = Array.isArray(capability.relatedReadable) ? capability.relatedReadable : [];
  const relatedLabels = related
    .map((id) => getDirectorIaCapability(id))
    .filter((c) => c && c.canRead)
    .map((c) => c.label);

  let answer = `${capability.label} todavía no está integrado con Director IA.`;
  if (relatedLabels.length > 0) {
    answer += ` Puedo consultar ${relatedLabels.join(", ")}, pero no la información operativa completa de este dominio.`;
  } else {
    answer += ` No puedo confirmar esos datos desde las fuentes actualmente conectadas.`;
  }
  if (capability.limitations) {
    answer += ` ${capability.limitations}`;
  }
  return answer;
}

/**
 * Respuesta de chat Fase 1 (sin OpenAI, sin cargar contextos).
 * @param {DirectorIaCapability} capability
 * @param {{ planta_id?: number }} [opts]
 */
function buildUnsupportedDomainChatResult(capability, opts = {}) {
  const answer = buildUnsupportedDomainAnswer(capability);
  return {
    ok: true,
    answer,
    sources: [],
    context_meta: {
      mode: "capability_limitation",
      requested_domain: capability.id,
      coverage: capability.coverage,
      access_mode: capability.accessMode,
      openai_called: false,
      veracity: DIRECTOR_IA_VERACITY.SOURCE_NOT_INTEGRATED,
      planta_id: opts.planta_id != null ? opts.planta_id : undefined,
      timestamp: new Date().toISOString(),
    },
    limitation: {
      code: DIRECTOR_IA_VERACITY.SOURCE_NOT_INTEGRATED,
      domain: capability.id,
      label: capability.label,
    },
  };
}

module.exports = {
  DIRECTOR_IA_VERACITY,
  SOURCE_AVAILABLE: DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE,
  SOURCE_PARTIAL: DIRECTOR_IA_VERACITY.SOURCE_PARTIAL,
  SOURCE_NOT_INTEGRATED: DIRECTOR_IA_VERACITY.SOURCE_NOT_INTEGRATED,
  SOURCE_RESTRICTED: DIRECTOR_IA_VERACITY.SOURCE_RESTRICTED,
  SOURCE_ERROR: DIRECTOR_IA_VERACITY.SOURCE_ERROR,
  DATA_NOT_FOUND: DIRECTOR_IA_VERACITY.DATA_NOT_FOUND,
  COVERAGE,
  ACCESS_MODE,
  getDirectorIaCapability,
  listDirectorIaCapabilities,
  isDirectorIaDomainReadable,
  buildDirectorIaCapabilitiesSummary,
  detectUnsupportedDirectorIaDomain,
  buildUnsupportedDomainAnswer,
  buildUnsupportedDomainChatResult,
  isM4ClasificacionQuery,
  isM4CompararOrExcelQuestion,
  isM5TallerAtQuery,
  isTallerMayorQuery,
  isPreMeetingQuery,
  isMonthCloseQuery,
  isM5ExcelOrDupQuestion,
  isM18PresupuestoQuery,
  isM18WriteOrChequeQuestion,
  normalizeQuestionForCapabilities: normalizeQuestion,
};
