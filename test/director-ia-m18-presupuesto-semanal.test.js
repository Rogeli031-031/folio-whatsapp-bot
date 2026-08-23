"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  detectUnsupportedDirectorIaDomain,
  isDirectorIaDomainReadable,
  SOURCE_NOT_INTEGRATED,
  SOURCE_RESTRICTED,
  SOURCE_ERROR,
  DATA_NOT_FOUND,
} = require("../lib/director-ia-capabilities");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  getDirectorIaTool,
  isDirectorIaToolExecutable,
  validateDirectorIaToolRegistry,
} = require("../lib/director-ia-tools");
const {
  PRESUPUESTO_SEMANAL_SEMANTIC_CLASS,
  SOURCE,
  getCurrentWeekMexico,
  dateToPg,
  resolveWeek,
  isCurrentWeekTrigger,
  isUrgentePrioridad,
  computeResumen,
  loadPresupuestoSemanalForChat,
  buildPresupuestoSemanalChatResult,
} = require("../lib/director-ia-m18-presupuesto-semanal");

const LIB_DIR = path.join(__dirname, "..", "lib");
const M18_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-m18-presupuesto-semanal.js"), "utf8");
const CHAT_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-chat.js"), "utf8");

function headerRow(over = {}) {
  return {
    id: 44,
    planta_id: 1,
    semana_inicio: "2026-08-17",
    semana_fin: "2026-08-23",
    monto_asignado: 10000,
    estatus: "ABIERTO",
    ...over,
  };
}

function folioRow(over = {}) {
  return {
    id: 1,
    folio_id: 10,
    numero_folio: "F-202608-010",
    importe: 1500,
    prioridad: "NORMAL",
    ligado_por: "gg",
    ligado_en: "2026-08-18T10:00:00.000Z",
    ...over,
  };
}

function injectOpts(header, folios, extras = {}) {
  return {
    resolvePlanta: extras.resolvePlanta || (async () => ({ id: 1, nombre: "Puebla", clave: "E7" })),
    queryPresupuestoSemanal: extras.queryPresupuestoSemanal || (async () => header),
    queryPresupuestoFolios: extras.queryPresupuestoFolios || (async () => folios || []),
    question: extras.question,
    auth: extras.auth,
    now: extras.now,
  };
}

function zpReq() {
  return { dashboardAuth: { role: "ZP" } };
}

function gaReq(plantas = [1]) {
  return { dashboardAuth: { role: "GA", plantas_permitidas: plantas } };
}

function gvReq() {
  return { dashboardAuth: { role: "GV", plantas_permitidas: [1] } };
}

function ggReq(plantas) {
  return { dashboardAuth: { role: "GG", plantas_permitidas: plantas } };
}

describe("M18 intent, capability y tools", () => {
  it("presupuesto semanal deja de ser SOURCE_NOT_INTEGRATED", () => {
    assert.equal(planDirectorIaQuestion("¿Cómo va el presupuesto semanal?").intent, "budget_status");
    assert.equal(planDirectorIaQuestion("mi presupuesto").intent, "budget_status");
    assert.equal(planDirectorIaQuestion("cómo va el carro de presupuesto").intent, "budget_status");
    assert.equal(detectUnsupportedDirectorIaDomain("¿Cómo va el presupuesto semanal?"), null);
    assert.equal(detectUnsupportedDirectorIaDomain("mi presupuesto"), null);
    assert.equal(isDirectorIaDomainReadable("presupuestos"), true);
  });

  it("writes y cheques siguen bloqueados", () => {
    const assign = detectUnsupportedDirectorIaDomain("asignar presupuesto");
    assert.ok(assign);
    assert.equal(assign.id, "presupuestos");
    const select = detectUnsupportedDirectorIaDomain("seleccionar folios del presupuesto semanal");
    assert.ok(select);
    assert.equal(select.id, "presupuestos");
    const send = detectUnsupportedDirectorIaDomain("enviar presupuesto a cheques");
    assert.ok(send);
    assert.equal(send.id, "presupuestos");
    const cheque = detectUnsupportedDirectorIaDomain("¿Tiene cheque o depósito?");
    assert.ok(cheque);
    assert.equal(cheque.id, "cheques");
  });

  it("tool tiene executor read-only", () => {
    const t = getDirectorIaTool("get_budget_status");
    assert.equal(t.executor, "loadPresupuestoSemanalForChat");
    assert.equal(t.readOnly, true);
    assert.equal(t.status, "available_on_demand");
    assert.equal(isDirectorIaToolExecutable("get_budget_status"), true);
    const reg = validateDirectorIaToolRegistry();
    assert.equal(reg.ok, true, reg.errors && reg.errors.join(", "));
  });
});

describe("M18 week semantics", () => {
  it("esta semana y presupuesto semanal usan getCurrentWeekMexico", () => {
    assert.equal(isCurrentWeekTrigger("esta semana el presupuesto"), true);
    assert.equal(isCurrentWeekTrigger("¿Cómo va el presupuesto semanal?"), true);
    assert.equal(isCurrentWeekTrigger("mi presupuesto"), true);
    const now = () => new Date("2026-08-19T15:00:00.000Z");
    const week = getCurrentWeekMexico(now());
    const resolved = resolveWeek("¿Cómo va el presupuesto semanal?", { now });
    assert.equal(resolved.ok, true);
    assert.equal(resolved.week_source, "current_week_rule");
    assert.equal(resolved.semana_inicio, dateToPg(week.lunes));
    assert.equal(resolved.semana_fin, dateToPg(week.domingo));
    assert.equal(resolved.semana_inicio, "2026-08-17");
    assert.equal(resolved.semana_fin, "2026-08-23");
  });

  it("semana explícita YYYY-MM-DD no inventa otra", () => {
    const resolved = resolveWeek("presupuesto del carro 2026-08-17");
    assert.equal(resolved.ok, true);
    assert.equal(resolved.semana_inicio, "2026-08-17");
    assert.equal(resolved.semana_fin, "2026-08-23");
    assert.equal(resolved.week_source, "explicit_date");
  });

  it("semana ausente sin trigger pide clarificación", () => {
    const resolved = resolveWeek("cómo va el carro de presupuesto");
    assert.equal(resolved.ok, false);
    assert.equal(resolved.code, "missing_week");
    assert.match(resolved.error, /No invento la semana/);
  });

  it("semana inválida no se acepta", () => {
    const resolved = resolveWeek("presupuesto semanal 2026-13-40");
    assert.equal(resolved.ok, false);
    assert.equal(resolved.code, "invalid_week");
  });
});

describe("M18 fórmulas físicas", () => {
  it("asignado / seleccionado / disponible / urgentes", () => {
    const resumen = computeResumen(headerRow({ monto_asignado: 10000 }), [
      folioRow({ importe: 3000, prioridad: "URGENTE" }),
      folioRow({ folio_id: 11, importe: 2500, prioridad: "NORMAL" }),
    ]);
    assert.equal(resumen.asignado, 10000);
    assert.equal(resumen.seleccionado, 5500);
    assert.equal(resumen.disponible, 4500);
    assert.equal(resumen.urgentes, 1);
    assert.equal(resumen.numFolios, 2);
    assert.equal(resumen.folios[0].folio_id, 10);
    assert.equal(resumen.folios[0].urgente, true);
    assert.equal(resumen.folios[1].urgente, false);
  });

  it("disponible nunca negativo", () => {
    const resumen = computeResumen(headerRow({ monto_asignado: 100 }), [
      folioRow({ importe: 400 }),
    ]);
    assert.equal(resumen.disponible, 0);
  });

  it("0 folios / 0 asignado / nulls", () => {
    const empty = computeResumen(headerRow({ monto_asignado: 0 }), []);
    assert.equal(empty.asignado, 0);
    assert.equal(empty.seleccionado, 0);
    assert.equal(empty.disponible, 0);
    assert.equal(empty.numFolios, 0);
    assert.equal(empty.urgentes, 0);
    const nulls = computeResumen(headerRow({ monto_asignado: null }), [
      folioRow({ importe: null, prioridad: null }),
    ]);
    assert.equal(nulls.asignado, 0);
    assert.equal(nulls.seleccionado, 0);
    assert.equal(nulls.folios[0].urgente, false);
  });

  it("no infiere urgencia por monto o estatus", () => {
    assert.equal(isUrgentePrioridad("NORMAL"), false);
    assert.equal(isUrgentePrioridad("ALTA"), false);
    assert.equal(isUrgentePrioridad(""), false);
    assert.equal(isUrgentePrioridad("muy urgente pipa"), true);
    const resumen = computeResumen(headerRow(), [folioRow({ importe: 999999, prioridad: "ALTA" })]);
    assert.equal(resumen.urgentes, 0);
    assert.equal(resumen.folios[0].urgente, false);
  });
});

describe("M18 loader authz y lookup", () => {
  it("planta autorizada consulta ABIERTO y no ABIERTO", async () => {
    const abierto = await loadPresupuestoSemanalForChat(null, 1, zpReq(), injectOpts(
      headerRow({ estatus: "ABIERTO" }),
      [folioRow()],
      { question: "¿Cómo va el presupuesto semanal?" }
    ));
    assert.equal(abierto.ok, true);
    assert.equal(abierto.found, true);
    assert.equal(abierto.estatus, "ABIERTO");
    assert.equal(abierto.asignado, 10000);
    assert.equal(abierto.seleccionado, 1500);
    assert.equal(abierto.disponible, 8500);

    const enviado = await loadPresupuestoSemanalForChat(null, 1, zpReq(), injectOpts(
      headerRow({ estatus: "EN_PROCESO_CHEQUE" }),
      [folioRow({ importe: 2000 })],
      { question: "presupuesto semanal 2026-08-17" }
    ));
    assert.equal(enviado.ok, true);
    assert.equal(enviado.found, true);
    assert.equal(enviado.estatus, "EN_PROCESO_CHEQUE");
    assert.equal(enviado.seleccionado, 2000);
  });

  it("sin fila no inventa montos", async () => {
    const payload = await loadPresupuestoSemanalForChat(null, 1, zpReq(), injectOpts(null, [], {
      question: "¿Cómo va el presupuesto semanal?",
    }));
    assert.equal(payload.ok, true);
    assert.equal(payload.found, false);
    assert.equal(payload.asignado, null);
    assert.equal(payload.folios.length, 0);
  });

  it("semana ausente sin trigger no usa semana actual", async () => {
    const payload = await loadPresupuestoSemanalForChat(null, 1, zpReq(), injectOpts(
      headerRow(),
      [folioRow()],
      { question: "cómo va el carro de presupuesto" }
    ));
    assert.equal(payload.ok, false);
    assert.equal(payload.week_code, "missing_week");
  });

  it("GV 403 y GA/GG respetan plantas_permitidas", async () => {
    const gv = await loadPresupuestoSemanalForChat(null, 1, gvReq(), injectOpts(headerRow(), [], {
      question: "¿Cómo va el presupuesto semanal?",
    }));
    assert.equal(gv.ok, false);
    assert.equal(gv.code, SOURCE_RESTRICTED);
    assert.equal(gv.status, 403);

    const gaOk = await loadPresupuestoSemanalForChat(null, 1, gaReq([1]), injectOpts(headerRow(), [folioRow()], {
      question: "¿Cómo va el presupuesto semanal?",
    }));
    assert.equal(gaOk.ok, true);
    assert.equal(gaOk.found, true);

    const gaDeny = await loadPresupuestoSemanalForChat(null, 2, gaReq([1]), injectOpts(headerRow(), [], {
      question: "¿Cómo va el presupuesto semanal?",
    }));
    assert.equal(gaDeny.ok, false);
    assert.equal(gaDeny.status, 403);

    const ggCross = await loadPresupuestoSemanalForChat(null, 9, ggReq([1]), injectOpts(headerRow(), [], {
      question: "¿Cómo va el presupuesto semanal?",
    }));
    assert.equal(ggCross.ok, false);
    assert.equal(ggCross.status, 403);
  });

  it("planta inválida fail-closed", async () => {
    const missing = await loadPresupuestoSemanalForChat(null, null, zpReq(), injectOpts(headerRow(), [], {
      question: "¿Cómo va el presupuesto semanal?",
    }));
    assert.equal(missing.ok, false);
  });
});

describe("M18 chat result", () => {
  it("respuesta factual no afirma pagado/cheque/desviación", () => {
    const payload = {
      ok: true,
      found: true,
      planta_id: 1,
      planta_nombre: "Puebla",
      presupuesto_semana_id: 44,
      semana_inicio: "2026-08-17",
      semana_fin: "2026-08-23",
      estatus: "ABIERTO",
      asignado: 10000,
      seleccionado: 1500,
      disponible: 8500,
      numFolios: 1,
      urgentes: 0,
      folios: [folioRow()],
      source: SOURCE,
      semantic_class: PRESUPUESTO_SEMANAL_SEMANTIC_CLASS,
    };
    const result = buildPresupuestoSemanalChatResult(payload, { planta_id: 1 });
    assert.equal(result.ok, true);
    assert.equal(result.context_meta.openai_called, false);
    assert.equal(result.context_meta.mode, "presupuesto_semanal");
    assert.match(result.answer, /Asignado 10000.00/);
    assert.match(result.answer, /seleccionado 1500.00/);
    assert.match(result.answer, /disponible 8500.00/);
    assert.doesNotMatch(result.answer, /está pagado|cheque emitido|hay desviaci|la causa es/i);
    assert.equal(result.presupuesto_semanal.folios[0].folio_id, 10);
  });

  it("not found usa DATA_NOT_FOUND", () => {
    const result = buildPresupuestoSemanalChatResult({
      ok: true,
      found: false,
      planta_id: 1,
      planta_nombre: "Puebla",
      semana_inicio: "2026-08-17",
      semana_fin: "2026-08-23",
      folios: [],
      source: SOURCE,
    });
    assert.equal(result.context_meta.veracity, DATA_NOT_FOUND);
    assert.match(result.answer, /No hay presupuesto semanal registrado/);
  });

  it("authz restringida", () => {
    const result = buildPresupuestoSemanalChatResult({
      ok: false,
      code: SOURCE_RESTRICTED,
      status: 403,
      error: "Sin permiso para esta planta",
    });
    assert.equal(result.context_meta.veracity, SOURCE_RESTRICTED);
    assert.equal(result.limitation.code, SOURCE_RESTRICTED);
  });

  it("clarificación de semana", () => {
    const result = buildPresupuestoSemanalChatResult({
      ok: false,
      code: SOURCE_ERROR,
      status: 400,
      week_code: "missing_week",
      error: "Indica la semana. No invento la semana.",
    });
    assert.match(result.answer, /No invento la semana/);
  });
});

describe("M18 boundaries en fuente", () => {
  it("no usa asignacion_detalle, writes, cheques, Twilio ni HTTP", () => {
    assert.doesNotMatch(M18_SRC, /FROM public\.presupuesto_asignacion_detalle/);
    assert.doesNotMatch(M18_SRC, /\bINSERT INTO\b|\bUPDATE public\.|\bDELETE FROM\b/);
    assert.doesNotMatch(M18_SRC, /enviarPresupuestoACheques|sendWhatsApp/);
    assert.doesNotMatch(M18_SRC, /require\(["']twilio["']\)|new Twilio/i);
    assert.doesNotMatch(M18_SRC, /axios|http\.request|localhost:\d+/);
    assert.match(M18_SRC, /assertFolioStatusAccess/);
    assert.equal(/estatus = \$4/.test(M18_SRC), false);
    assert.doesNotMatch(M18_SRC, /AND estatus =/);
    assert.match(M18_SRC, /Math\.max\(0, asignado - seleccionado\)/);
    assert.match(CHAT_SRC, /loadPresupuestoSemanalForChat/);
    assert.match(CHAT_SRC, /budget_status/);
  });
});

describe("M18 chat wiring", () => {
  let askDirectorIa;
  let configureDirectorIaChat;

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  function poolWith(header, folios) {
    return {
      connect: async () => ({
        query: async (sql) => {
          if (/FROM public\.plantas/.test(sql)) {
            return { rows: [{ id: 1, nombre: "Puebla", clave: "E7" }] };
          }
          if (/FROM public\.presupuestos_semanales/.test(sql)) {
            return { rows: header ? [header] : [] };
          }
          if (/FROM public\.presupuesto_folios/.test(sql)) {
            return { rows: folios || [] };
          }
          if (/presupuesto_asignacion_detalle/.test(sql)) {
            throw new Error("no debe consultar presupuesto_asignacion_detalle");
          }
          return { rows: [] };
        },
        release() {},
      }),
    };
  }

  it("pregunta #17 llega al executor", async () => {
    configureDirectorIaChat({
      pool: poolWith(headerRow(), [folioRow({ prioridad: "URGENTE PIPA" })]),
    });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "¿Cómo va el presupuesto semanal?"
    );
    assert.equal(result.ok, true);
    assert.notEqual(result.limitation && result.limitation.code, SOURCE_NOT_INTEGRATED);
    assert.equal(result.context_meta.mode, "presupuesto_semanal");
    assert.equal(result.context_meta.openai_called, false);
    assert.equal(result.presupuesto_semanal.asignado, 10000);
    assert.equal(result.presupuesto_semanal.seleccionado, 1500);
    assert.equal(result.presupuesto_semanal.disponible, 8500);
    assert.equal(result.presupuesto_semanal.urgentes, 1);
    assert.equal(result.presupuesto_semanal.folios[0].folio_id, 10);
    assert.doesNotMatch(result.answer, /todavía no está integrado/i);
    assert.doesNotMatch(result.answer, /está pagado|cheque emitido|hay desviaci/i);
  });

  it("carro no ABIERTO sigue consultable", async () => {
    configureDirectorIaChat({
      pool: poolWith(headerRow({ estatus: "EN_PROCESO_CHEQUE" }), [folioRow()]),
    });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "presupuesto semanal 2026-08-17"
    );
    assert.equal(result.presupuesto_semanal.estatus, "EN_PROCESO_CHEQUE");
    assert.equal(result.context_meta.openai_called, false);
  });

  it("asignar presupuesto sigue bloqueado", async () => {
    configureDirectorIaChat({ pool: poolWith(headerRow(), []) });
    const result = await askDirectorIa({ body: {}, dashboardAuth: { role: "ZP" } }, 1, "asignar presupuesto");
    assert.equal(result.limitation && result.limitation.code, SOURCE_NOT_INTEGRATED);
    assert.equal(result.context_meta.requested_domain, "presupuestos");
    assert.equal(result.presupuesto_semanal, undefined);
  });
});
