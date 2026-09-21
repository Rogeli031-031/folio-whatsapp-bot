"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  FAMILY_IDS,
  classify011Family,
  listInactiveClients,
  buildInactiveClientsAnswer,
  buildDirectLastPurchaseAnswer,
  buildDirectClientAnswer,
  resolveClientInCatalog,
  buildOpenClientUiAction,
  answerHasForbiddenExpansion,
  activeEntitiesForInactiveList,
  resolveOpenClientTarget,
  UI_ACTION,
} = require("../lib/director-ia-client-inactivity-direct-answers-ui-011");
const {
  FAMILY_IDS: FIX_FAMILIES,
  INACTIVE_CLIENTS,
  LAST_PURCHASE_DIRECT,
  DIRECT_ANSWER_COMPRESSION,
  OPEN_CLIENT_DELTA_FORECAST,
  ANTI_COLLISIONS,
  MULTI_TURN,
  FORBIDDEN_BLOCKS,
} = require("./fixtures/director-ia-client-inactivity-direct-answers-ui-011");

const NOW = new Date("2026-09-20T12:00:00-06:00");
const AUTH = { role: "ADMIN", plantaIds: [1] };

const BY_FAMILY = {
  INACTIVE_CLIENTS,
  LAST_PURCHASE_DIRECT,
  DIRECT_ANSWER_COMPRESSION,
  OPEN_CLIENT_DELTA_FORECAST,
};

const DICF_ROWS = [
  {
    cliente: "BAYAM RESIDENCES",
    lastPurchaseDate: "2026-08-01",
    freqDays: 12,
    estatus: "Inactivo",
  },
  {
    cliente: "TORTILLERIA ERICK",
    lastPurchaseDate: "2026-09-17",
    freqDays: 11,
    estatus: "Activo",
  },
  {
    cliente: "CLIENTE ACTIVO",
    lastPurchaseDate: "2026-09-19",
    freqDays: 20,
    estatus: "Activo",
  },
];

describe("011 cobertura de fixtures", () => {
  it("define 4 familias y >=200 utterances", () => {
    assert.deepEqual([...FAMILY_IDS], [...FIX_FAMILIES]);
    let total = 0;
    for (const fam of FAMILY_IDS) {
      assert.ok(BY_FAMILY[fam].length >= 50, `${fam} ${BY_FAMILY[fam].length}`);
      total += BY_FAMILY[fam].length;
    }
    assert.ok(total >= 200, String(total));
    assert.ok(ANTI_COLLISIONS.length >= 150, String(ANTI_COLLISIONS.length));
    assert.ok(MULTI_TURN.length >= 100, String(MULTI_TURN.length));
  });

  it("cada utterance clasifica a su familia", () => {
    const misses = [];
    for (const fam of FAMILY_IDS) {
      for (const q of BY_FAMILY[fam]) {
        const prior = { canonical_name: "BAYAM RESIDENCES", active_entities: [{ kind: "CLIENT", canonical_name: "BAYAM RESIDENCES", display: "BAYAM RESIDENCES" }] };
        const got = classify011Family(q, prior);
        if (got !== fam) misses.push(`${fam}: ${q} → ${got}`);
      }
    }
    assert.equal(misses.length, 0, misses.slice(0, 20).join("\n"));
  });

  it("anti-collisions no caen en la familia prohibida", () => {
    for (const row of ANTI_COLLISIONS) {
      const got = classify011Family(row.q, { canonical_name: "BAYAM RESIDENCES" });
      assert.notEqual(got, row.not_family, `${row.q} → ${got}`);
    }
  });

  it("multi-turn conserva familia o permite null", () => {
    for (const seq of MULTI_TURN) {
      let prior = { canonical_name: "BAYAM RESIDENCES", active_entities: [{ kind: "CLIENT", canonical_name: "BAYAM RESIDENCES", display: "BAYAM RESIDENCES" }] };
      seq.turns.forEach((q, i) => {
        if (/\bERICK\b/i.test(q)) {
          prior = { canonical_name: "TORTILLERIA ERICK", active_entities: [{ kind: "CLIENT", canonical_name: "TORTILLERIA ERICK", display: "TORTILLERIA ERICK" }] };
        }
        const got = classify011Family(q, prior);
        const expect = seq.families && seq.families[i];
        if (expect) assert.equal(got, expect, `${q} → ${got}`);
        if (seq.not_families && seq.not_families[i]) {
          assert.notEqual(got, seq.not_families[i], q);
        }
      });
    }
  });
});

describe("011 inactivos y última compra", () => {
  it("lista inactivos corta sin materialidad", () => {
    const list = listInactiveClients(DICF_ROWS, { now: NOW, source: "computeDicf" });
    assert.ok(list.some((r) => r.cliente === "BAYAM RESIDENCES"));
    assert.ok(!list.some((r) => r.cliente === "CLIENTE ACTIVO"));
    const answer = buildInactiveClientsAnswer(list);
    assert.match(answer, /BAYAM RESIDENCES/);
    assert.match(answer, /última compra/);
    assert.equal(answerHasForbiddenExpansion(answer), false);
    FORBIDDEN_BLOCKS.forEach((tok) => assert.doesNotMatch(answer, new RegExp(tok)));
  });

  it("no confunde compraron poco con no compraron", () => {
    assert.equal(classify011Family("¿Qué clientes compraron poco?"), null);
    assert.equal(classify011Family("¿Quiénes disminuyeron?"), null);
    assert.equal(planDirectorIaQuestion("¿Qué clientes no han comprado?").intent, "client_inactivity");
  });

  it("última compra directa usa fecha enriquecida y es corta", () => {
    const answer = buildDirectLastPurchaseAnswer(DICF_ROWS[0], NOW);
    assert.match(answer, /BAYAM RESIDENCES compró por última vez el 01\/08\/2026/);
    assert.doesNotMatch(answer, /MATERIALIDAD/);
    assert.doesNotMatch(answer, /Action Register/);
  });
});

describe("011 UI action y herencia", () => {
  it("abre cliente único y no fuzzy-match silencioso", () => {
    const ok = resolveClientInCatalog("BAYAM RESIDENCES", DICF_ROWS);
    assert.equal(ok.status, "unique");
    const miss = resolveClientInCatalog("CLIENTE INEXISTENTE", DICF_ROWS);
    assert.equal(miss.status, "not_found");
    const action = buildOpenClientUiAction({
      client: ok.cliente,
      plant: "Acapulco",
      plant_id: 1,
      period: "2026-09",
    });
    assert.equal(action.type, UI_ACTION);
    assert.equal(action.client, "BAYAM RESIDENCES");
    assert.equal(planDirectorIaQuestion("abre la información de BAYAM RESIDENCES").intent, "open_client_delta_forecast");
    assert.notEqual(planDirectorIaQuestion("abre la venta diaria").intent, "open_client_delta_forecast");
    assert.notEqual(planDirectorIaQuestion("abre el movimiento por categoría").intent, "open_client_delta_forecast");
  });
});

describe("011 E2E askDirectorIa", () => {
  it("no han comprado no dispara materialidad; última compra de BAYAM es directa; abre UI", async () => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");
    configureDirectorIaChat({
      pool: {},
      now: NOW,
      predictiveDicfRows: DICF_ROWS,
      predictivePlantCodes: ["ACA"],
    });
    const inactive = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH },
      1,
      "¿Qué clientes no han comprado?"
    );
    assert.equal(inactive.ok, true);
    assert.match(inactive.answer, /BAYAM RESIDENCES/);
    assert.doesNotMatch(inactive.answer, /MATERIALIDAD COMERCIAL/);
    assert.doesNotMatch(inactive.answer, /Action Register/);
    assert.doesNotMatch(inactive.answer, /kg_mes_real/);

    const last = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH },
      1,
      "¿Cuándo fue la última vez que compró BAYAM RESIDENCES?"
    );
    assert.match(last.answer, /BAYAM RESIDENCES compró por última vez/);
    assert.doesNotMatch(last.answer, /MATERIALIDAD COMERCIAL/);
    assert.doesNotMatch(last.answer, /164 ZAPATA/);

    const follow = await askDirectorIa(
      {
        body: {
          planta_nombre: "Acapulco",
          conversation_state: last.context_meta.conversation_state,
        },
        dashboardAuth: AUTH,
      },
      1,
      "¿Cuál fue su última compra?"
    );
    assert.match(follow.answer, /BAYAM RESIDENCES/);
    assert.doesNotMatch(follow.answer, /164 ZAPATA/);

    const open = await askDirectorIa(
      {
        body: {
          planta_nombre: "Acapulco",
          conversation_state: follow.context_meta.conversation_state,
        },
        dashboardAuth: AUTH,
      },
      1,
      "abre su información"
    );
    assert.equal(open.ui_action.type, UI_ACTION);
    assert.equal(open.ui_action.client, "BAYAM RESIDENCES");
    assert.match(open.answer, /Delta Ingreso Cliente Forecast/);

    const switchClient = await askDirectorIa(
      {
        body: {
          planta_nombre: "Acapulco",
          conversation_state: {
            ...open.context_meta.conversation_state,
            active_entities: [{ kind: "CLIENT", canonical_name: "TORTILLERIA ERICK", display: "TORTILLERIA ERICK" }],
          },
        },
        dashboardAuth: AUTH,
      },
      1,
      "abre su información"
    );
    assert.equal(switchClient.ui_action.client, "TORTILLERIA ERICK");
  });
});

const MULTI_INACTIVE_ROWS = [
  {
    cliente: "BAYAM RESIDENCES",
    lastPurchaseDate: "2026-08-01",
    freqDays: 12,
    estatus: "Inactivo",
  },
  {
    cliente: "TORTILLERIA ERICK",
    lastPurchaseDate: "2026-07-10",
    freqDays: 11,
    estatus: "Inactivo",
  },
  {
    cliente: "CLIENTE INACTIVO C",
    lastPurchaseDate: "2026-06-01",
    freqDays: 10,
    estatus: "Inactivo",
  },
];

describe("011 no first-result silencioso", () => {
  it("nunca first-result fallback silencioso en lista múltiple", () => {
    const list = listInactiveClients(MULTI_INACTIVE_ROWS, { now: NOW, source: "computeDicf" });
    assert.ok(list.length > 1);
    const ents = activeEntitiesForInactiveList(list);
    assert.ok(!ents.some((e) => e.kind === "CLIENT" || e.kind === "client"));
    assert.ok((ents[0].result_set || []).length > 1);
    const target = resolveOpenClientTarget("abre su información", { active_entities: ents }, MULTI_INACTIVE_ROWS);
    assert.equal(target.status, "ambiguous");
    assert.equal(target.cliente, undefined);
  });

  it("lista múltiple + abre su información pide cuál y no emite ui_action", async () => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");
    configureDirectorIaChat({
      pool: {},
      now: NOW,
      predictiveDicfRows: MULTI_INACTIVE_ROWS,
      predictivePlantCodes: ["ACA"],
    });
    const list = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH },
      1,
      "¿Qué clientes no han comprado?"
    );
    const ents = (list.context_meta.conversation_state.active_entities || []).filter(
      (e) => e && (e.kind === "CLIENT" || e.kind === "client")
    );
    assert.equal(ents.length, 0);
    const open = await askDirectorIa(
      {
        body: {
          planta_nombre: "Acapulco",
          conversation_state: list.context_meta.conversation_state,
        },
        dashboardAuth: AUTH,
      },
      1,
      "abre su información"
    );
    assert.equal(open.ui_action == null, true);
    assert.match(open.answer, /cuál/i);
    assert.doesNotMatch(String(open.answer || ""), /Abro Delta Ingreso Cliente Forecast de BAYAM RESIDENCES/);
  });

  it("lista múltiple + nombre explícito + abre su información abre el nombrado", async () => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");
    configureDirectorIaChat({
      pool: {},
      now: NOW,
      predictiveDicfRows: MULTI_INACTIVE_ROWS,
      predictivePlantCodes: ["ACA"],
    });
    const list = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH },
      1,
      "¿Qué clientes no han comprado?"
    );
    const named = await askDirectorIa(
      {
        body: {
          planta_nombre: "Acapulco",
          conversation_state: list.context_meta.conversation_state,
        },
        dashboardAuth: AUTH,
      },
      1,
      "BAYAM RESIDENCES"
    );
    const active = (named.context_meta.conversation_state.active_entities || []).find(
      (e) => e && (e.kind === "CLIENT" || e.kind === "client")
    );
    assert.equal(active && active.canonical_name, "BAYAM RESIDENCES");
    const open = await askDirectorIa(
      {
        body: {
          planta_nombre: "Acapulco",
          conversation_state: named.context_meta.conversation_state,
        },
        dashboardAuth: AUTH,
      },
      1,
      "abre su información"
    );
    assert.equal(open.ui_action && open.ui_action.type, UI_ACTION);
    assert.equal(open.ui_action.client, "BAYAM RESIDENCES");
  });

  it("cambio explícito a otro cliente abre el nuevo", async () => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");
    configureDirectorIaChat({
      pool: {},
      now: NOW,
      predictiveDicfRows: MULTI_INACTIVE_ROWS,
      predictivePlantCodes: ["ACA"],
    });
    const list = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH },
      1,
      "¿Qué clientes no han comprado?"
    );
    const named = await askDirectorIa(
      {
        body: {
          planta_nombre: "Acapulco",
          conversation_state: list.context_meta.conversation_state,
        },
        dashboardAuth: AUTH,
      },
      1,
      "BAYAM RESIDENCES"
    );
    const switched = await askDirectorIa(
      {
        body: {
          planta_nombre: "Acapulco",
          conversation_state: named.context_meta.conversation_state,
        },
        dashboardAuth: AUTH,
      },
      1,
      "¿y TORTILLERIA ERICK?"
    );
    const open = await askDirectorIa(
      {
        body: {
          planta_nombre: "Acapulco",
          conversation_state: switched.context_meta.conversation_state,
        },
        dashboardAuth: AUTH,
      },
      1,
      "abre su información"
    );
    assert.equal(open.ui_action && open.ui_action.client, "TORTILLERIA ERICK");
  });

  it("lista de un solo resultado permite abrir ese único cliente", async () => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    const { askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat");
    configureDirectorIaChat({
      pool: {},
      now: NOW,
      predictiveDicfRows: [DICF_ROWS[0]],
      predictivePlantCodes: ["ACA"],
    });
    const list = await askDirectorIa(
      { body: { planta_nombre: "Acapulco" }, dashboardAuth: AUTH },
      1,
      "¿Qué clientes no han comprado?"
    );
    const open = await askDirectorIa(
      {
        body: {
          planta_nombre: "Acapulco",
          conversation_state: list.context_meta.conversation_state,
        },
        dashboardAuth: AUTH,
      },
      1,
      "abre su información"
    );
    assert.equal(open.ui_action && open.ui_action.client, "BAYAM RESIDENCES");
  });
});
