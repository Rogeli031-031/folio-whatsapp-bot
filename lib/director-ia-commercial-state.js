"use strict";

const dicf = require("./dicf");
const dicfAccionesLib = require("./dicf-acciones");

function normalizeSearchText(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function textMatchesCommercialTokens(text, searchTokens) {
  if (!searchTokens || searchTokens.length === 0) return false;
  const norm = normalizeSearchText(text);
  if (!norm) return false;
  return searchTokens.some((tok) => {
    const t = normalizeSearchText(tok);
    if (!t) return false;
    if (norm.includes(t) || t.includes(norm)) return true;
    const parts = t.split(" ").filter((p) => p.length > 2);
    if (parts.length >= 2) {
      const hits = parts.filter((p) => norm.includes(p)).length;
      return hits >= Math.min(2, parts.length);
    }
    return parts.some((p) => norm.includes(p));
  });
}

const COMMERCIAL_STATE_CLIENT_LIMIT = 20;

const CATEGORY_META = {
  dejaron: { label: "DEJARON DE COMPRAR", grupoLista: "Dejaron de comprar" },
  disminuyeron: { label: "DISMINUYERON", grupoLista: "Disminuyeron" },
  aumentaron: { label: "AUMENTARON", grupoLista: "Aumentaron" },
  nuevos: { label: "NUEVOS", grupoLista: "Nuevo" },
};

/** @type {{ getPlantCodeArrFromPlantaNombre?: Function, getMargenKgPorPeriodo?: Function, assertGVPlantaNombreAccess?: Function }} */
let deps = {};

function configureDirectorIaCommercialState(injected) {
  deps = { ...deps, ...injected };
}

function normalizeQuestionText(question) {
  return String(question || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Preguntas de lista comercial actual (computeDicf), no acciones/historial.
 * @param {string} question
 */
function isCommercialStateListQuestion(question) {
  const raw = String(question || "").trim();
  if (!raw) return false;

  if (
    /\b(acciones?|historial|cierre|cerrad|cerraron|resultado|aprendimos|compromiso)\b/i.test(raw) ||
    /\bqu[eé]\s+(se\s+)?(hizo|hicieron|concluy[oó]|aprendi[oó]|aprendimos)\b/i.test(raw) ||
    /\bqu[eé]\s+pas[oó]\s+con\b/i.test(raw) ||
    /\b(seguimiento|expediente)\b/i.test(raw)
  ) {
    return false;
  }

  return resolveCommercialStateCategory(raw) != null;
}

/**
 * @param {string} question
 * @returns {"dejaron"|"disminuyeron"|"aumentaron"|"nuevos"|null}
 */
function resolveCommercialStateCategory(question) {
  const q = normalizeQuestionText(question);

  if (
    /\bdejaron\s+de\s+comprar\b/.test(q) ||
    /\bdej[oó]\s+de\s+comprar\b/.test(q) ||
    /\bquien\s+dej[oó]\b/.test(q) ||
    /\bqui[eé]n\s+dej[oó]\b/.test(q) ||
    /\bno\s+compran\b/.test(q) ||
    (/\bdejaron\b/.test(q) && /\bclientes?\b/.test(q))
  ) {
    return "dejaron";
  }
  if (
    /\bclientes?\s+nuev[oa]s?\b/.test(q) ||
    /\bnuev[oa]s?\s+clientes?\b/.test(q) ||
    /\bnuevos\s+tenemos\b/.test(q) ||
    (/\bnuev[oa]s?\b/.test(q) && /\bclientes?\b/.test(q))
  ) {
    return "nuevos";
  }
  if (
    /\bclientes?\s+(han\s+)?disminuy/.test(q) ||
    /\bdisminuyeron\b/.test(q) ||
    (/\bdisminuy/.test(q) && /\bclientes?\b/.test(q))
  ) {
    return "disminuyeron";
  }
  if (
    /\bclientes?\s+aumentaron\b/.test(q) ||
    /\baumentaron\b/.test(q) ||
    (/\baument/.test(q) && /\bclientes?\b/.test(q)) ||
    /\bcompraron\s+m[aá]s\b/.test(q)
  ) {
    return "aumentaron";
  }

  return null;
}

/**
 * Acciones DICF / historial (arr.dicf_acciones). Excluye listas commercial_state.
 * @param {string} question
 * @param {boolean} [isDicfContextQuestionFn]
 */
function isDicfActionQuestion(question, isDicfContextQuestionFn) {
  const q = String(question || "").trim();
  if (!q) return false;
  if (isCommercialStateListQuestion(q)) return false;
  if (typeof isDicfContextQuestionFn === "function") {
    return isDicfContextQuestionFn(q);
  }
  return false;
}

function injectAccionesAbiertas(client, rest, plantaNombre) {
  const { dicfRowsByCliente: _ignore, excelData: _excel, ...base } = rest || {};

  return (async () => {
    const plantaIdRaw = await dicfAccionesLib.resolvePlantaId(client, plantaNombre);
    const canonPlantaId = Number.isFinite(plantaIdRaw) ? dicfAccionesLib.getCanonicalPlantaId(plantaIdRaw) : null;
    const plantaIdsEquiv =
      Number.isFinite(canonPlantaId) && canonPlantaId != null
        ? dicfAccionesLib.getPlantaIdsEquivalentes(canonPlantaId)
        : [];

    const accionesAbiertasByKey = new Map();
    const accionesAbiertasByNombre = new Map();

    if (plantaIdsEquiv.length) {
      const arKey = await client.query(
        `SELECT cliente_key, COUNT(*)::int AS c
           FROM arr.dicf_acciones
          WHERE planta_id = ANY($1::int[])
            AND (cerrado_at IS NULL)
            AND (estado IS NULL OR estado <> 'hecho')
          GROUP BY cliente_key`,
        [plantaIdsEquiv]
      );
      for (const row of arKey.rows || []) {
        if (row.cliente_key) accionesAbiertasByKey.set(String(row.cliente_key), Number(row.c) || 0);
      }
      const arNom = await client.query(
        `SELECT cliente_nombre, COUNT(*)::int AS c
           FROM arr.dicf_acciones
          WHERE planta_id = ANY($1::int[])
            AND (cerrado_at IS NULL)
            AND (estado IS NULL OR estado <> 'hecho')
          GROUP BY cliente_nombre`,
        [plantaIdsEquiv]
      );
      for (const row of arNom.rows || []) {
        const k = dicfAccionesLib.normalizeKeyPart(row.cliente_nombre);
        accionesAbiertasByNombre.set(k, (accionesAbiertasByNombre.get(k) || 0) + (Number(row.c) || 0));
      }
    }

    const inject = (grp, grupoLista) => {
      if (!grp || !Array.isArray(grp.clientes)) return grp;
      return {
        ...grp,
        clientes: grp.clientes.map((c) => {
          const canal = (c.canal != null && String(c.canal).trim()) || "";
          const subcanal = (c.subcanal != null && String(c.subcanal).trim()) || "";
          const cli = (c.cliente != null && String(c.cliente).trim()) || "";
          const gruposTry = new Set(
            [String(c.estado || "").trim(), typeof grupoLista === "string" ? grupoLista.trim() : ""].filter(
              (x) => x && x.length
            )
          );
          let n = 0;
          if (canonPlantaId != null && Number.isFinite(canonPlantaId)) {
            for (const g of gruposTry) {
              const ck = dicfAccionesLib.buildClienteKey(canonPlantaId, g, canal, subcanal, cli);
              n = Math.max(n, accionesAbiertasByKey.get(ck) || 0);
            }
          }
          if (!n) {
            const nk = dicfAccionesLib.normalizeKeyPart(c && c.cliente != null ? c.cliente : "");
            n = accionesAbiertasByNombre.get(nk) || 0;
          }
          return { ...c, acciones_abiertas: n };
        }),
      };
    };

    return {
      ...base,
      dejaron: inject(base.dejaron, "Dejaron de comprar"),
      disminuyeron: inject(base.disminuyeron, "Disminuyeron"),
      aumentaron: inject(base.aumentaron, "Aumentaron"),
      nuevos: inject(base.nuevos, "Nuevo"),
    };
  })();
}

async function resolvePlantaNombre(client, plantaId) {
  const r = await client.query(`SELECT nombre, clave FROM public.plantas WHERE id = $1 LIMIT 1`, [plantaId]);
  const row = r.rows && r.rows[0];
  if (!row) return null;
  return String(row.nombre || row.clave || "").trim() || null;
}

function dashboardAuthRoleNorm(auth) {
  if (!auth || auth.role == null || auth.role === "") return "";
  return String(auth.role).replace(/\s/g, "").toUpperCase();
}

/**
 * Lazy load — mismo motor que POST /api/dashboard/dicf-datos (sin HTTP).
 * @param {import("pg").Pool} pool
 * @param {number} plantaId
 * @param {import("express").Request} req
 */
async function loadCommercialStateForChat(pool, plantaId, req) {
  if (!pool) {
    return { ok: false, error: "Pool no configurado para commercial_state", status: 500 };
  }
  if (!deps.getPlantCodeArrFromPlantaNombre || !deps.getMargenKgPorPeriodo) {
    return { ok: false, error: "commercial_state no configurado en servidor", status: 500 };
  }

  const auth = req?.dashboardAuth;
  if (dashboardAuthRoleNorm(auth) === "GA") {
    return { ok: false, error: "GA no tiene acceso a KPIs financieros.", status: 403 };
  }

  const client = await pool.connect();
  try {
    const plantaNombre = await resolvePlantaNombre(client, plantaId);
    if (!plantaNombre) {
      return { ok: false, error: "Planta no encontrada", status: 400 };
    }

    if (deps.assertGVPlantaNombreAccess) {
      const gvChk = await deps.assertGVPlantaNombreAccess(client, auth, plantaNombre);
      if (!gvChk.ok) {
        return { ok: false, error: gvChk.error || "Sin acceso a esta planta", status: gvChk.status || 403 };
      }
    }

    const plantCode = await deps.getPlantCodeArrFromPlantaNombre(client, plantaNombre);
    const raw = await dicf.computeDicf(client, plantCode, plantaNombre, deps.getMargenKgPorPeriodo);
    const data = await injectAccionesAbiertas(client, raw, plantaNombre);

    return {
      ok: true,
      planta_id: plantaId,
      planta_nombre: plantaNombre,
      data,
    };
  } catch (e) {
    console.error("[Director IA commercial_state]", e);
    return { ok: false, error: e.message || "Error al cargar estado comercial", status: 500 };
  } finally {
    client.release();
  }
}

/**
 * @param {Array<{ cliente: string }>} clientes
 * @param {{ search_tokens?: string[] } | null | undefined} commercialResolution
 */
function filterClientsByCommercialResolution(clientes, commercialResolution) {
  const tokens = commercialResolution?.search_tokens || [];
  if (!tokens.length) return clientes || [];
  const filtered = (clientes || []).filter((c) =>
    textMatchesCommercialTokens(String(c.cliente || ""), tokens)
  );
  return filtered.length > 0 ? filtered : clientes || [];
}

/**
 * @param {object} commercialPayload
 * @param {string} question
 * @param {"dejaron"|"disminuyeron"|"aumentaron"|"nuevos"} category
 * @param {{ search_tokens?: string[]; entidades?: object[] } | null | undefined} [commercialResolution]
 */
function buildCommercialStateFocusedContext(commercialPayload, question, category, commercialResolution = null) {
  const data = commercialPayload?.data || commercialPayload;
  const meta = CATEGORY_META[category] || CATEGORY_META.dejaron;
  const group = data?.[category] || { clientes: [], totalDeltaIngresoStr: "$0" };
  let clientes = filterClientsByCommercialResolution(group.clientes || [], commercialResolution);
  clientes = clientes.slice(0, COMMERCIAL_STATE_CLIENT_LIMIT);

  const lines = [
    "ESTADO COMERCIAL ACTUAL — Delta Ingreso Cliente Forecast (dicf.computeDicf)",
    "Esta lista refleja la clasificación comercial vigente a cierre de mes (misma lógica que el dashboard).",
    "No confundir con acciones DICF cerradas ni historial de seguimiento.",
    "",
    `Planta: ${data.planta || commercialPayload.planta_nombre || "—"}`,
    `Mes: ${data.periodoMes || "—"} | Datos hasta: ${data.last_date || "—"} | Ventana: ${data.window_days ?? "—"} días`,
    `Margen: ${data.margenStr || "—"}`,
    `Categoría consultada: ${meta.label}`,
    `Total categoría (ingreso): ${group.totalDeltaIngresoStr || "$0"}${group.totalDeltaKgStr ? ` | Total ton: ${group.totalDeltaKgStr}` : ""}`,
    "",
    `CLIENTES — ${meta.label} (top ${clientes.length}):`,
    "",
  ];

  if (clientes.length === 0) {
    lines.push("(sin clientes en esta categoría para la planta y filtros aplicados)");
  } else {
    clientes.forEach((c, i) => {
      const parts = [
        `${i + 1}. ${c.cliente}`,
        c.canal ? `Canal: ${c.canal}` : null,
        c.subcanal ? `Sub: ${c.subcanal}` : null,
        c.deltaIngresoStr ? `Δ ingreso: ${c.deltaIngresoStr}` : null,
        c.deltaKgStr ? `Δ ton: ${c.deltaKgStr}` : null,
        c.kgAStr != null ? `Ton A: ${c.kgAStr}` : null,
        c.kgBStr != null ? `Ton proy: ${c.kgBStr}` : null,
        c.lastPurchaseDate ? `Última compra: ${c.lastPurchaseDate}` : null,
        (c.acciones_abiertas || 0) > 0 ? `Acciones DICF abiertas: ${c.acciones_abiertas}` : null,
      ].filter(Boolean);
      lines.push(parts.join(" | "));
    });
  }

  return {
    text: lines.join("\n").trimEnd(),
    meta: {
      mode: "commercial_state",
      focus: category,
      focus_type: category,
      category,
      client_count: clientes.length,
      periodoMes: data.periodoMes || null,
    },
  };
}

module.exports = {
  configureDirectorIaCommercialState,
  isCommercialStateListQuestion,
  isDicfActionQuestion,
  resolveCommercialStateCategory,
  loadCommercialStateForChat,
  buildCommercialStateFocusedContext,
  filterClientsByCommercialResolution,
  COMMERCIAL_STATE_CLIENT_LIMIT,
  CATEGORY_META,
};
