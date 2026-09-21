"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  FAMILY_IDS,
  classify012Family,
  analyzeChannelSales,
  buildChannelSalesAnswer,
  extractDejaronDims,
  buildCommentsAnswer,
  filterComments,
  buildActionDirectAnswer,
  buildActionRecentAnswer,
  searchBitacoraTopic,
  buildBitacoraTopicAnswer,
} = require("../lib/director-ia-routing-precedence-dimensions-012");
const {
  FAMILY_IDS: FIX_FAMILIES,
  CHANNEL_SALES_STATUS,
  CLIENT_MOVEMENT_DEJARON,
  CLIENT_COMMENTS_PERIOD,
  ACTION_REGISTER_DIRECT,
  ACTION_REGISTER_RECENT,
  BITACORA_TOPIC_LOOKUP,
  ANTI_COLLISIONS,
  MULTI_TURN,
} = require("./fixtures/director-ia-routing-precedence-dimensions-012");

const NOW = new Date("2026-09-20T12:00:00-06:00");
const AUTH = { role: "ADMIN", plantaIds: [1] };

const BY_FAMILY = {
  CHANNEL_SALES_STATUS,
  CLIENT_MOVEMENT_DEJARON,
  CLIENT_COMMENTS_PERIOD,
  ACTION_REGISTER_DIRECT,
  ACTION_REGISTER_RECENT,
  BITACORA_TOPIC_LOOKUP,
};

const SALES_ROWS = [
  { fecha: "2026-09-10", kg: 5000, canal: "Casa", subcategoria: "Autotanque" },
  { fecha: "2026-09-10", kg: 2000, canal: "Casa", subcategoria: "Carburación" },
  { fecha: "2026-09-11", kg: 1000, canal: "Comisionista", subcategoria: "Portátil" },
  { fecha: "2026-08-15", kg: 8000, canal: "Casa", subcategoria: "Autotanque" },
];

describe("012 cobertura de fixtures", () => {
  it("define 6 familias y >=300 utterances", () => {
    assert.deepEqual([...FAMILY_IDS], [...FIX_FAMILIES]);
    let total = 0;
    for (const fam of FAMILY_IDS) {
      assert.ok(BY_FAMILY[fam].length >= 50, `${fam} ${BY_FAMILY[fam].length}`);
      total += BY_FAMILY[fam].length;
    }
    assert.ok(total >= 300, String(total));
    assert.ok(ANTI_COLLISIONS.length >= 300, String(ANTI_COLLISIONS.length));
    assert.ok(MULTI_TURN.length >= 150, String(MULTI_TURN.length));
  });

  it("cada utterance clasifica a su familia", () => {
    const misses = [];
    for (const fam of FAMILY_IDS) {
      for (const q of BY_FAMILY[fam]) {
        const prior = { family: fam, channel: "CASA" };
        const got = classify012Family(q, prior);
        if (got !== fam) misses.push(`${fam}: ${q} → ${got}`);
      }
    }
    assert.equal(misses.length, 0, misses.slice(0, 25).join("\n"));
  });

  it("anti-collisions no caen en la familia prohibida", () => {
    for (const row of ANTI_COLLISIONS) {
      const got = classify012Family(row.q, { channel: "CASA" });
      assert.notEqual(got, row.not_family, `${row.q} → ${got}`);
    }
  });

  it("multi-turn conserva familia o permite null", () => {
    for (const seq of MULTI_TURN) {
      let prior = { family: seq.families && seq.families[0], channel: "CASA" };
      seq.turns.forEach((q, i) => {
        const got = classify012Family(q, prior);
        const expect = seq.families && seq.families[i];
        if (expect) assert.equal(got, expect, `${q} → ${got}`);
        if (seq.not_families && seq.not_families[i]) assert.notEqual(got, seq.not_families[i], q);
        if (got) prior = { family: got, channel: /comisionista/i.test(q) ? "COMISIONISTA" : prior.channel };
      });
    }
  });
});

describe("012 channel y dejaron", () => {
  it("venta Casa no es total de planta y conserva canal", () => {
    assert.equal(classify012Family("¿Cómo va la venta Casa?"), "CHANNEL_SALES_STATUS");
    assert.equal(classify012Family("¿Cómo va la venta?"), null);
    assert.equal(planDirectorIaQuestion("¿Cómo va la venta Casa?").intent, "executive_sales_context");
    assert.equal(planDirectorIaQuestion("¿Cómo va la venta Casa?").evidence[0].value, "CHANNEL_SALES_STATUS");
    const payload = analyzeChannelSales("¿Cómo va la venta Casa?", { salesRows: SALES_ROWS, now: NOW, plant_label: "Acapulco" });
    assert.equal(payload.dims.channel, "CASA");
    assert.ok(payload.scopedKg > 0);
    assert.ok(payload.scopedKg < payload.casaKg + payload.comiKg || payload.comiKg === 0 || payload.scopedKg === payload.casaKg);
    const answer = buildChannelSalesAnswer(payload);
    assert.match(answer, /CASA/);
    assert.doesNotMatch(answer, /Venta observada: 0\.0 t/);
  });

  it("follow-up cambia canal o subcategoría y conserva planta", () => {
    const first = analyzeChannelSales("¿Cómo va la venta Casa?", { salesRows: SALES_ROWS, now: NOW, plant_label: "Acapulco" });
    const comi = analyzeChannelSales("¿Y Comisionista?", {
      salesRows: SALES_ROWS,
      now: NOW,
      plant_label: "Acapulco",
      prior: first.dims,
    });
    assert.equal(comi.dims.channel, "COMISIONISTA");
    const auto = analyzeChannelSales("¿Y Autotanque?", {
      salesRows: SALES_ROWS,
      now: NOW,
      plant_label: "Acapulco",
      prior: first.dims,
    });
    assert.equal(auto.dims.subcategory, "Autotanque");
    const ago = analyzeChannelSales("¿Y en agosto?", {
      salesRows: SALES_ROWS,
      now: NOW,
      plant_label: "Acapulco",
      prior: first.dims,
    });
    assert.equal(ago.dims.channel, "CASA");
    assert.equal(ago.dims.period, "2026-08");
  });

  it("dejaron de comprar gana a ranking y conserva frame", () => {
    assert.equal(classify012Family("Top 10 clientes que dejaron de comprar"), "CLIENT_MOVEMENT_DEJARON");
    assert.equal(planDirectorIaQuestion("Top 10 clientes que dejaron de comprar").intent, "client_movement");
    assert.notEqual(planDirectorIaQuestion("Top 10 clientes que dejaron de comprar").intent, "client_ranking");
    const dims = extractDejaronDims("Top 10 clientes que dejaron de comprar", null, NOW);
    assert.equal(dims.movement, "DEJARON_DE_COMPRAR");
    assert.equal(dims.operation, "RANK");
    assert.equal(dims.limit, 10);
    const done = extractDejaronDims("septiembre", dims, NOW);
    assert.equal(done.period, "2026-09");
    assert.equal(done.movement, "DEJARON_DE_COMPRAR");
    assert.equal(done.limit, 10);
  });
});

describe("012 comentarios, acciones y bitácora", () => {
  it("comentarios no se convierten en movimiento", () => {
    assert.equal(classify012Family("¿Qué comentarios de clientes tenemos en septiembre?"), "CLIENT_COMMENTS_PERIOD");
    assert.equal(planDirectorIaQuestion("¿Qué comentarios de clientes tenemos en septiembre?").intent, "client_comments");
    const rows = [
      { cliente_nombre: "BAYAM RESIDENCES", created_at: "2026-09-05", body: "Sin pedido", canal: "Casa" },
      { cliente_nombre: "OTRO", created_at: "2026-08-01", body: "Viejo", canal: "Casa" },
    ];
    const filtered = filterComments(rows, "¿Qué comentarios de clientes tenemos en septiembre?", null, NOW);
    assert.equal(filtered.rows.length, 1);
    const answer = buildCommentsAnswer(filtered.rows, filtered);
    assert.match(answer, /BAYAM RESIDENCES/);
    assert.doesNotMatch(answer, /AUMENTÓ/);
    assert.doesNotMatch(answer, /Top 10 clientes por compra/);
  });

  it("acciones directas no son unknown ni diagnóstico", () => {
    assert.equal(classify012Family("¿Qué acciones tenemos?"), "ACTION_REGISTER_DIRECT");
    assert.equal(planDirectorIaQuestion("¿Qué acciones tenemos?").intent, "action_status");
    const answer = buildActionDirectAnswer(
      [
        { titulo: "Revisar tanque", responsable: "Juan Carlos", estatus: "abierta", created_at: "2026-09-18", dias_vencido: 0 },
        { titulo: "Cerrada", responsable: "Ana", estatus: "cerrada", created_at: "2026-09-01" },
      ],
      "Acapulco",
      "¿Qué acciones tenemos?"
    );
    assert.match(answer, /Abiertas: 1/);
    assert.doesNotMatch(answer, /recomendación/i);
    assert.doesNotMatch(answer, /Situación actual/);
  });

  it("últimas acciones ordenan por created_at no por vencido", () => {
    assert.equal(classify012Family("¿Qué acciones del Action Register son las últimas?"), "ACTION_REGISTER_RECENT");
    const answer = buildActionRecentAnswer(
      [
        { titulo: "Vieja vencida", responsable: "A", estatus: "abierta", created_at: "2026-01-01", dias_vencido: 194 },
        { titulo: "Nueva", responsable: "B", estatus: "abierta", created_at: "2026-09-19", dias_vencido: 0 },
      ],
      10
    );
    assert.match(answer, /Nueva/);
    assert.ok(answer.indexOf("Nueva") < answer.indexOf("Vieja vencida"));
    assert.doesNotMatch(answer, /194/);
  });

  it("Oaxaca es tema de bitácora, no cambio de planta", () => {
    assert.equal(classify012Family("¿Qué sabemos de Oaxaca?"), "BITACORA_TOPIC_LOOKUP");
    assert.equal(classify012Family("cambia a Oaxaca"), null);
    assert.equal(planDirectorIaQuestion("¿Qué sabemos de Oaxaca?").intent, "bitacora_topic_lookup");
    const hits = searchBitacoraTopic(
      [
        { fecha: "2026-09-12", titulo: "Reunión", resumen_ia: "Se habló de Gas de Oaxaca", contenido: "Oaxaca" },
        { fecha: "2026-09-01", titulo: "Otro", resumen_ia: "Sin tema", contenido: "local" },
      ],
      "Oaxaca"
    );
    assert.equal(hits.length, 1);
    const answer = buildBitacoraTopicAnswer(hits, "Oaxaca", "Acapulco");
    assert.match(answer, /bitácoras de Acapulco/);
    assert.match(answer, /Oaxaca/);
  });
});

describe("012 E2E askDirectorIa", () => {
  it("venta Casa, comentarios, acciones y bitácora no caen a genéricos", async () => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");
    configureDirectorIaChat({
      pool: {},
      now: NOW,
      executiveSalesRows: SALES_ROWS,
      predictiveSalesRows: SALES_ROWS,
      clienteComentariosRows: [
        { cliente_nombre: "BAYAM RESIDENCES", created_at: "2026-09-05", body: "Sin pedido", canal: "Casa" },
      ],
      actionRegisterItems: [
        { titulo: "Nueva", responsable: "B", estatus: "abierta", created_at: "2026-09-19", tema: "Mantenimiento" },
        { titulo: "Vieja vencida", responsable: "A", estatus: "abierta", created_at: "2026-01-01", dias_vencido: 194, tema: "Comercial" },
      ],
      bitacoraEntries: [
        { fecha: "2026-09-12", titulo: "Reunión Plaud", resumen_ia: "Gas de Oaxaca", contenido: "Oaxaca" },
      ],
    });
    const casa = await askDirectorIa({ body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH }, 1, "¿Cómo va la venta Casa?");
    assert.match(casa.answer, /CASA/i);
    assert.doesNotMatch(casa.answer, /Estado de venta de la planta/);
    assert.equal(casa.context_meta.source_mode, "injected_test_rows");

    const comments = await askDirectorIa(
      { body: { planta_nombre: "Acapulco", conversation_state: { parent_intent: "client_movement" } }, dashboardAuth: AUTH },
      1,
      "¿Qué comentarios de clientes tenemos en septiembre?"
    );
    assert.match(comments.answer, /Comentarios/);
    assert.doesNotMatch(comments.answer, /DEJÓ DE COMPRAR/);

    const actions = await askDirectorIa({ body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH }, 1, "¿Qué acciones tenemos?");
    assert.match(actions.answer, /Action Register/);
    assert.doesNotMatch(actions.answer, /No se pudo determinar una intención/);

    const recent = await askDirectorIa({ body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH }, 1, "¿Qué acciones del Action Register son las últimas?");
    assert.ok(recent.answer.indexOf("Nueva") < recent.answer.indexOf("Vieja vencida"));

    const bit = await askDirectorIa({ body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH }, 1, "¿Qué sabemos de Oaxaca?");
    assert.match(bit.answer, /Oaxaca/);
    assert.match(bit.answer, /Acapulco/);
  });
});

describe("012 runtime físico sin arrays inyectados", () => {
  it("carga ventas, comentarios, Action Register y bitácora desde loaders de producción", async () => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");
    configureDirectorIaChat({
      pool: { query: async () => ({ rows: [] }) },
      now: NOW,
      predictiveSalesRows: undefined,
      clientRankingSalesRows: undefined,
      executiveSalesRows: undefined,
      clienteComentariosRows: undefined,
      actionRegisterItems: undefined,
      bitacoraEntries: undefined,
      resolveClientRankingPlantCodes: async () => ({ uniqueCodes: ["ACA"] }),
      queryMonthlySales: async () => ({
        rows: [
          { month: "2026-09", canal: "Casa", subcanal: "Autotanque", kg: 5000, cliente_norm: "CASA UNO" },
          { month: "2026-09", canal: "Comisionista", subcanal: "Portátil", kg: 1000, cliente_norm: "COMI UNO" },
        ],
      }),
      loadClienteComentariosForDirectorIa: async () => [
        { cliente_nombre: "BAYAM RESIDENCES", created_at: "2026-09-05", body: "Sin pedido", canal: "Casa" },
      ],
      loadActionPersonBoardForChat: async () => ({
        ok: true,
        items: [
          { title: "Nueva", responsable: "B", closed: false, created_at: "2026-09-19", creada_ymd: "2026-09-19", tema: "Mantenimiento" },
          { title: "Vieja vencida", responsable: "A", closed: false, created_at: "2026-01-01", creada_ymd: "2026-01-01", dias_vencido: 194, tema: "Comercial" },
        ],
      }),
      loadBitacoraForChat: async () => [
        { fecha: "2026-09-12", titulo: "Reunión Plaud", resumen_ia: "Gas de Oaxaca", contenido: "Oaxaca" },
      ],
    });

    const casa = await askDirectorIa({ body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH }, 1, "¿Cómo va la venta Casa?");
    assert.equal(casa.context_meta.source_mode, "arr.ventas_diarias_cliente");
    assert.deepEqual(casa.sources, ["arr.ventas_diarias_cliente"]);
    assert.match(casa.answer, /CASA/i);
    assert.doesNotMatch(casa.answer, /Venta observada: 0\.0 t/);
    assert.doesNotMatch(casa.answer, /Estado de venta de la planta/);

    const comments = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH },
      1,
      "¿Qué comentarios de clientes tenemos en septiembre?"
    );
    assert.equal(comments.context_meta.source_mode, "arr.cliente_comentarios");
    assert.deepEqual(comments.sources, ["arr.cliente_comentarios"]);
    assert.match(comments.answer, /BAYAM RESIDENCES/);
    assert.doesNotMatch(comments.answer, /AUMENTÓ|DEJÓ DE COMPRAR/);

    const actions = await askDirectorIa({ body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH }, 1, "¿Qué acciones tenemos?");
    assert.equal(actions.context_meta.source_mode, "arr.action_register_items");
    assert.deepEqual(actions.sources, ["arr.action_register_items"]);
    assert.match(actions.answer, /Action Register/);
    assert.match(actions.answer, /Abiertas: 2/);

    const recent = await askDirectorIa({ body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH }, 1, "¿Cuáles son las últimas acciones?");
    assert.equal(recent.context_meta.source_mode, "arr.action_register_items");
    assert.ok(recent.answer.indexOf("Nueva") < recent.answer.indexOf("Vieja vencida"));
    assert.doesNotMatch(recent.answer, /194/);

    const bit = await askDirectorIa({ body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH }, 1, "¿Qué sabemos de Oaxaca?");
    assert.equal(bit.context_meta.source_mode, "arr.director_ia_bitacora");
    assert.deepEqual(bit.sources, ["arr.director_ia_bitacora"]);
    assert.match(bit.answer, /Oaxaca/);
    assert.match(bit.answer, /Acapulco/);
  });
});
