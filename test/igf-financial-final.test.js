"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  FINANCIAL_STATES,
  MIGRATION_SQL_PATH,
  IMMUTABILITY_SQL_PATH,
  canFinalizeOrSupersede,
  finalizedByFromAuth,
  finalizeFinancialVersion,
  supersedeFinancialVersion,
  assertCompromisoLinesMutable,
  mutationGuardForState,
  updateCompromisoLinesHgIfForecast,
} = require("../lib/igf-financial-final");

const ROOT = path.join(__dirname, "..");
const SQL = fs.readFileSync(MIGRATION_SQL_PATH, "utf8");
const IMMUTABILITY_SQL = fs.readFileSync(IMMUTABILITY_SQL_PATH, "utf8");
const DELETE_V5_SQL = fs.readFileSync(path.join(ROOT, "delete_igf_version_5.sql"), "utf8");
const SERVER_SRC = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const LIB_SRC = fs.readFileSync(path.join(ROOT, "lib", "igf-financial-final.js"), "utf8");
const MONTH_CLOSE_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-month-close-result.js"), "utf8");
const PRE_MEETING_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-pre-meeting.js"), "utf8");
const ARR_IGF_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-igf-arr.js"), "utf8");

function auth(role, actorId = 7, extra = {}) {
  return { role, actor_id: actorId, ...extra };
}

function seedVersion(over = {}) {
  return {
    id: 1,
    plant_code: "GLOBAL",
    year: 2026,
    month: 8,
    version_number: 1,
    financial_state: FINANCIAL_STATES.FORECAST,
    finalized_at: null,
    finalized_by: null,
    superseded_by_version_id: null,
    ...over,
  };
}

function seedLine(over = {}) {
  return {
    version_id: 1,
    empresa: "Acapulco",
    hg_pct: 0.1,
    hg_kg: 1,
    util_oper_kg: 0,
    util_oper_importe: 0,
    resultado_final_kg: 0,
    resultado_final_importe: 0,
    ...over,
  };
}

function createSharedState(seed, lines) {
  return {
    versions: (seed || []).map((v) => ({ ...v })),
    lines: (lines || []).map((l) => ({ ...l })),
    locks: new Map(),
    waiters: new Map(),
    nextClientId: 1,
  };
}

function hgFields(over = {}) {
  return {
    hg_pct: 0.5,
    hg_kg: 9,
    util_oper_kg: 1,
    util_oper_importe: 2,
    resultado_final_kg: 3,
    resultado_final_importe: 4,
    ...over,
  };
}

function historyImmutableError(message) {
  const err = new Error(message);
  err.code = "23514";
  return err;
}

function rejectIfHistoricalVersion(row) {
  const state = String((row && row.financial_state) || "");
  if (state === FINANCIAL_STATES.FINAL || state === FINANCIAL_STATES.SUPERSEDED) {
    throw historyImmutableError("IGF_FINAL_HISTORY_IMMUTABLE: cannot DELETE igf.versions");
  }
}

function rejectIfHistoricalLines(shared, versionId) {
  const row = shared.versions.find((v) => Number(v.id) === Number(versionId));
  const state = String((row && row.financial_state) || "");
  if (state === FINANCIAL_STATES.FINAL || state === FINANCIAL_STATES.SUPERSEDED) {
    throw historyImmutableError("IGF_FINAL_HISTORY_IMMUTABLE: cannot DELETE igf.compromiso_lines");
  }
}

function createMemoryClient(seed, opts = {}) {
  const shared = opts.shared || createSharedState(seed, opts.lines);
  if (!opts.shared && seed) {
    shared.versions = seed.map((v) => ({ ...v }));
  }
  const versions = shared.versions;
  const clientId = shared.nextClientId++;
  let snapshot = null;
  let mutated = false;
  let failOn = opts.failOn || null;
  let queryCount = 0;
  let afterLockRemaining = typeof opts.afterLock === "function" ? 1 : 0;

  function failIf(label) {
    if (failOn === label) throw new Error("injected failure: " + label);
  }

  function oneFinalCount(year, month) {
    return versions.filter(
      (v) =>
        v.plant_code === "GLOBAL" &&
        Number(v.year) === Number(year) &&
        Number(v.month) === Number(month) &&
        v.financial_state === FINANCIAL_STATES.FINAL
    ).length;
  }

  function copySnapshot() {
    return {
      versions: versions.map((v) => ({ ...v })),
      lines: shared.lines.map((l) => ({ ...l })),
    };
  }

  function restoreSnapshot() {
    versions.splice(0, versions.length, ...snapshot.versions.map((v) => ({ ...v })));
    shared.lines.splice(0, shared.lines.length, ...snapshot.lines.map((l) => ({ ...l })));
  }

  async function acquireRow(versionId) {
    const key = "igf.versions:" + Number(versionId);
    while (shared.locks.has(key) && shared.locks.get(key) !== clientId) {
      await new Promise((resolve) => {
        if (!shared.waiters.has(key)) shared.waiters.set(key, []);
        shared.waiters.get(key).push(resolve);
      });
    }
    shared.locks.set(key, clientId);
    if (afterLockRemaining > 0) {
      afterLockRemaining -= 1;
      await opts.afterLock();
    }
  }

  function releaseLocks() {
    const mine = [];
    for (const [key, owner] of shared.locks) {
      if (owner === clientId) mine.push(key);
    }
    for (const key of mine) {
      shared.locks.delete(key);
      const queued = shared.waiters.get(key) || [];
      shared.waiters.set(key, []);
      for (const resolve of queued) resolve();
    }
  }

  return {
    versions: () => versions,
    lines: () => shared.lines,
    shared,
    queryCount: () => queryCount,
    async query(sql, params = []) {
      queryCount += 1;
      const s = String(sql).replace(/\s+/g, " ").trim();
      if (/^BEGIN/i.test(s)) {
        snapshot = copySnapshot();
        mutated = false;
        return { rows: [] };
      }
      if (/^COMMIT/i.test(s)) {
        snapshot = null;
        mutated = false;
        releaseLocks();
        return { rows: [] };
      }
      if (/^ROLLBACK/i.test(s)) {
        if (mutated && snapshot) restoreSnapshot();
        snapshot = null;
        mutated = false;
        releaseLocks();
        return { rows: [] };
      }
      if (/FROM igf\.versions\s+WHERE id = \$1::int\s+FOR UPDATE/i.test(s)) {
        const row = versions.find((v) => Number(v.id) === Number(params[0]));
        if (row) await acquireRow(row.id);
        return { rows: row ? [{ ...row }] : [] };
      }
      if (/FROM igf\.versions\s+WHERE plant_code = 'GLOBAL' AND year = \$1::int AND month = \$2::int\s+AND version_number = \$3::int\s+FOR UPDATE/i.test(s)) {
        const row = versions.find(
          (v) =>
            v.plant_code === "GLOBAL" &&
            Number(v.year) === Number(params[0]) &&
            Number(v.month) === Number(params[1]) &&
            Number(v.version_number) === Number(params[2])
        );
        if (row) await acquireRow(row.id);
        return { rows: row ? [{ ...row }] : [] };
      }
      if (/financial_state = 'FINAL'\s+FOR UPDATE/i.test(s)) {
        const rows = versions.filter(
          (v) =>
            v.plant_code === "GLOBAL" &&
            Number(v.year) === Number(params[0]) &&
            Number(v.month) === Number(params[1]) &&
            v.financial_state === FINANCIAL_STATES.FINAL
        );
        for (const row of rows) await acquireRow(row.id);
        return { rows: rows.map((v) => ({ ...v })) };
      }
      if (/SELECT financial_state FROM igf\.versions WHERE id = \$1::int/i.test(s)) {
        const row = versions.find((v) => Number(v.id) === Number(params[0]));
        return { rows: row ? [{ financial_state: row.financial_state }] : [] };
      }
      if (/UPDATE igf\.compromiso_lines SET/i.test(s)) {
        mutated = true;
        const versionId = Number(params[6]);
        const empresa = String(params[7] || "").trim();
        const line = shared.lines.find(
          (l) => Number(l.version_id) === versionId && String(l.empresa || "").trim() === empresa
        );
        if (line) {
          line.hg_pct = params[0];
          line.hg_kg = params[1];
          line.util_oper_kg = params[2];
          line.util_oper_importe = params[3];
          line.resultado_final_kg = params[4];
          line.resultado_final_importe = params[5];
        }
        return { rows: line ? [{ ...line }] : [] };
      }
      if (/^DELETE FROM igf\.compromiso_lines/i.test(s)) {
        const versionId = params[0] != null ? Number(params[0]) : null;
        const targets = shared.lines.filter((l) => versionId == null || Number(l.version_id) === versionId);
        for (const line of targets) rejectIfHistoricalLines(shared, line.version_id);
        mutated = true;
        shared.lines.splice(
          0,
          shared.lines.length,
          ...shared.lines.filter((l) => versionId != null && Number(l.version_id) !== versionId)
        );
        return { rows: [] };
      }
      if (/^DELETE FROM igf\.versions/i.test(s)) {
        const id = params[0] != null ? Number(params[0]) : null;
        const targets = versions.filter((v) => id == null || Number(v.id) === id);
        for (const row of targets) rejectIfHistoricalVersion(row);
        mutated = true;
        versions.splice(0, versions.length, ...versions.filter((v) => id != null && Number(v.id) !== id));
        return { rows: [] };
      }
      if (/SET financial_state = 'FINAL'/i.test(s)) {
        failIf("markFinal");
        mutated = true;
        const finalizedBy = params[0];
        const id = Number(params[1]);
        const row = versions.find((v) => Number(v.id) === id);
        if (!row) return { rows: [] };
        row.financial_state = FINANCIAL_STATES.FINAL;
        row.finalized_at = new Date("2026-08-25T18:00:00.000Z");
        row.finalized_by = finalizedBy;
        row.superseded_by_version_id = null;
        if (oneFinalCount(row.year, row.month) > 1) {
          throw new Error("unique FINAL violated");
        }
        return { rows: [{ ...row }] };
      }
      if (/SET financial_state = 'SUPERSEDED'/i.test(s)) {
        failIf("markSuperseded");
        mutated = true;
        const newId = Number(params[0]);
        const oldId = Number(params[1]);
        const row = versions.find((v) => Number(v.id) === oldId);
        if (!row) return { rows: [] };
        row.financial_state = FINANCIAL_STATES.SUPERSEDED;
        row.superseded_by_version_id = newId;
        return { rows: [{ ...row }] };
      }
      throw new Error("unexpected sql: " + s.slice(0, 180));
    },
  };
}

describe("018 migration / backfill", () => {
  it("añade estado y provenance en igf.versions; default FORECAST", () => {
    assert.match(SQL, /ADD COLUMN IF NOT EXISTS financial_state TEXT NOT NULL DEFAULT 'FORECAST'/);
    assert.match(SQL, /ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ NULL/);
    assert.match(SQL, /ADD COLUMN IF NOT EXISTS finalized_by TEXT NULL/);
    assert.match(SQL, /ADD COLUMN IF NOT EXISTS superseded_by_version_id INT NULL/);
    assert.match(SQL, /CHECK \(financial_state IN \('FORECAST', 'FINAL', 'SUPERSEDED'\)\)/);
    assert.match(SQL, /financial_state = 'FORECAST'/);
    assert.match(SQL, /UNIQUE INDEX igf_versions_one_final_global_ym/);
    assert.match(SQL, /plant_code = 'GLOBAL' AND financial_state = 'FINAL'/);
  });

  it("no toca compromiso_lines, no usa is_final boolean, no infiere FINAL histórico", () => {
    assert.equal(/ALTER TABLE\s+igf\.compromiso_lines/i.test(SQL), false);
    assert.equal(/ADD COLUMN IF NOT EXISTS is_final/i.test(SQL), false);
    assert.equal(/SET financial_state\s*=\s*'FINAL'/i.test(SQL), false);
    assert.equal(/\bUPDATE\s+igf\./i.test(SQL), false);
    assert.equal(/\bDELETE\b/i.test(SQL), false);
    assert.equal(/\bDROP\b/i.test(SQL), false);
  });
});

describe("AUTHZ finalize/supersede", () => {
  it("ZP, alias ZP y AD pueden; GG y el resto no", () => {
    assert.equal(canFinalizeOrSupersede(auth("ZP")), true);
    assert.equal(canFinalizeOrSupersede(auth("DIR_ZP")), true);
    assert.equal(canFinalizeOrSupersede(auth("DIRECTOR_ZP")), true);
    assert.equal(canFinalizeOrSupersede(auth("DZP")), true);
    assert.equal(canFinalizeOrSupersede(auth("AD")), true);
    assert.equal(canFinalizeOrSupersede(auth("GG")), false);
    assert.equal(canFinalizeOrSupersede(auth("GA")), false);
    assert.equal(canFinalizeOrSupersede(auth("GV")), false);
    assert.equal(canFinalizeOrSupersede(auth("CF_CDMX")), false);
    assert.equal(canFinalizeOrSupersede(auth("CDMX")), false);
    assert.equal(canFinalizeOrSupersede(auth("ZC")), false);
    assert.equal(canFinalizeOrSupersede(auth("GO")), false);
    assert.equal(canFinalizeOrSupersede(auth("SG")), false);
    assert.equal(canFinalizeOrSupersede(auth("SEH")), false);
    assert.equal(canFinalizeOrSupersede(auth("OTRA_CLAVE")), false);
    assert.equal(canFinalizeOrSupersede(null), false);
  });

  it("finalized_by sale del actor autenticado, no del body", () => {
    assert.equal(finalizedByFromAuth(auth("ZP", 12)), "usuario:12|role:ZP");
    assert.equal(finalizedByFromAuth(auth("DIR_ZP", 3)), "usuario:3|role:ZP");
    assert.equal(finalizedByFromAuth(auth("AD", 9)), "usuario:9|role:AD");
    assert.equal(finalizedByFromAuth({ role: "ZP" }), null);
    assert.equal(/req\.body.*finalized_by/.test(LIB_SRC), false);
    assert.equal(/input\.finalized_by/.test(LIB_SRC), false);
  });
});

describe("FINALIZE FORECAST -> FINAL", () => {
  it("ZP finaliza, setea provenance y no usa latest/is_current/ARR", async () => {
    const client = createMemoryClient([seedVersion()]);
    const out = await finalizeFinancialVersion(client, { year: 2026, month: 8, version_id: 1 }, auth("ZP", 12));
    assert.equal(out.ok, true);
    assert.equal(out.version.financial_state, FINANCIAL_STATES.FINAL);
    assert.equal(out.version.finalized_by, "usuario:12|role:ZP");
    assert.ok(out.version.finalized_at);
    assert.equal(out.version.superseded_by_version_id, null);
    assert.equal(/is_current/.test(LIB_SRC), false);
    assert.equal(/ARR_COMPLETE|getVentaReal|isIgfMesCerrado/.test(LIB_SRC), false);
  });

  it("alias ZP y AD finalizan; GG y otros fallan 403", async () => {
    const aliasClient = createMemoryClient([seedVersion()]);
    const aliasOut = await finalizeFinancialVersion(
      aliasClient,
      { year: 2026, month: 8, version_number: 1 },
      auth("DIR_ZP", 4)
    );
    assert.equal(aliasOut.version.finalized_by, "usuario:4|role:ZP");

    const adClient = createMemoryClient([seedVersion({ id: 2, version_number: 2 })]);
    const adOut = await finalizeFinancialVersion(adClient, { year: 2026, month: 8, version_id: 2 }, auth("AD", 8));
    assert.equal(adOut.version.finalized_by, "usuario:8|role:AD");

    await assert.rejects(
      () => finalizeFinancialVersion(createMemoryClient([seedVersion()]), { year: 2026, month: 8, version_id: 1 }, auth("GG", 1)),
      (e) => e.status === 403
    );
    await assert.rejects(
      () => finalizeFinancialVersion(createMemoryClient([seedVersion()]), { year: 2026, month: 8, version_id: 1 }, auth("GA", 1)),
      (e) => e.status === 403
    );
    await assert.rejects(
      () => finalizeFinancialVersion(createMemoryClient([seedVersion()]), { year: 2026, month: 8, version_id: 1 }, { role: "ZP" }),
      (e) => e.status === 403
    );
  });

  it("exige versión exacta del YYYY-MM; no reemplaza FINAL en silencio", async () => {
    await assert.rejects(
      () =>
        finalizeFinancialVersion(
          createMemoryClient([seedVersion({ year: 2026, month: 7 })]),
          { year: 2026, month: 8, version_id: 1 },
          auth("ZP", 1)
        ),
      (e) => e.status === 409 && /no corresponde al periodo/i.test(e.message)
    );

    const client = createMemoryClient([
      seedVersion({
        id: 10,
        version_number: 1,
        financial_state: FINANCIAL_STATES.FINAL,
        finalized_at: new Date(),
        finalized_by: "usuario:1|role:ZP",
      }),
      seedVersion({ id: 11, version_number: 2 }),
    ]);
    await assert.rejects(
      () => finalizeFinancialVersion(client, { year: 2026, month: 8, version_id: 11 }, auth("ZP", 1)),
      (e) => e.status === 409 && e.body && e.body.require_supersede === true
    );
    assert.equal(client.versions().find((v) => v.id === 11).financial_state, FINANCIAL_STATES.FORECAST);
    assert.equal(client.versions().find((v) => v.id === 10).financial_state, FINANCIAL_STATES.FINAL);
  });
});

describe("SUPERSEDE atómico", () => {
  it("vieja FINAL -> SUPERSEDED, nueva FINAL, link, un solo FINAL vivo", async () => {
    const client = createMemoryClient([
      seedVersion({
        id: 10,
        version_number: 1,
        financial_state: FINANCIAL_STATES.FINAL,
        finalized_at: new Date("2026-08-20T00:00:00.000Z"),
        finalized_by: "usuario:1|role:ZP",
      }),
      seedVersion({ id: 11, version_number: 2 }),
    ]);
    const out = await supersedeFinancialVersion(client, { year: 2026, month: 8, version_id: 11 }, auth("AD", 2));
    assert.equal(out.superseded.financial_state, FINANCIAL_STATES.SUPERSEDED);
    assert.equal(out.superseded.superseded_by_version_id, 11);
    assert.equal(out.superseded.finalized_by, "usuario:1|role:ZP");
    assert.equal(out.version.financial_state, FINANCIAL_STATES.FINAL);
    assert.equal(out.version.finalized_by, "usuario:2|role:AD");
    const live = client.versions().filter((v) => v.financial_state === FINANCIAL_STATES.FINAL);
    assert.equal(live.length, 1);
    assert.equal(live[0].id, 11);
  });

  it("no puede supersederse a sí misma; GG denegado", async () => {
    const same = createMemoryClient([
      seedVersion({
        id: 10,
        financial_state: FINANCIAL_STATES.FINAL,
        finalized_at: new Date(),
        finalized_by: "usuario:1|role:ZP",
      }),
    ]);
    await assert.rejects(
      () => supersedeFinancialVersion(same, { year: 2026, month: 8, version_id: 10 }, auth("ZP", 1)),
      (e) => e.status === 409 && /distinta/i.test(e.message)
    );
    await assert.rejects(
      () =>
        supersedeFinancialVersion(
          createMemoryClient([
            seedVersion({
              id: 10,
              financial_state: FINANCIAL_STATES.FINAL,
              finalized_at: new Date(),
              finalized_by: "usuario:1|role:ZP",
            }),
            seedVersion({ id: 11, version_number: 2 }),
          ]),
          { year: 2026, month: 8, version_id: 11 },
          auth("GG", 1)
        ),
      (e) => e.status === 403
    );
  });

  it("rollback si falla marcar FINAL: la vieja no queda SUPERSEDED a medias", async () => {
    const client = createMemoryClient(
      [
        seedVersion({
          id: 10,
          financial_state: FINANCIAL_STATES.FINAL,
          finalized_at: new Date(),
          finalized_by: "usuario:1|role:ZP",
        }),
        seedVersion({ id: 11, version_number: 2 }),
      ],
      { failOn: "markFinal" }
    );
    await assert.rejects(() => supersedeFinancialVersion(client, { year: 2026, month: 8, version_id: 11 }, auth("ZP", 1)));
    const old = client.versions().find((v) => v.id === 10);
    const neu = client.versions().find((v) => v.id === 11);
    assert.equal(old.financial_state, FINANCIAL_STATES.FINAL);
    assert.equal(old.superseded_by_version_id, null);
    assert.equal(neu.financial_state, FINANCIAL_STATES.FORECAST);
  });
});

describe("HG PATCH guards", () => {
  it("FORECAST permite; FINAL y SUPERSEDED niegan", () => {
    assert.equal(mutationGuardForState(FINANCIAL_STATES.FORECAST).ok, true);
    assert.equal(mutationGuardForState(FINANCIAL_STATES.FINAL).ok, false);
    assert.equal(mutationGuardForState(FINANCIAL_STATES.FINAL).status, 409);
    assert.equal(mutationGuardForState(FINANCIAL_STATES.SUPERSEDED).ok, false);
    assert.equal(mutationGuardForState(FINANCIAL_STATES.SUPERSEDED).status, 409);
  });

  it("assertCompromisoLinesMutable respeta el estado persistido", async () => {
    const forecast = createMemoryClient([seedVersion()]);
    const ok = await assertCompromisoLinesMutable(forecast, 1);
    assert.equal(ok.ok, true);

    const fin = createMemoryClient([
      seedVersion({
        financial_state: FINANCIAL_STATES.FINAL,
        finalized_at: new Date(),
        finalized_by: "usuario:1|role:ZP",
      }),
    ]);
    const denied = await assertCompromisoLinesMutable(fin, 1);
    assert.equal(denied.ok, false);
    assert.equal(denied.status, 409);

    const sup = createMemoryClient([
      seedVersion({
        financial_state: FINANCIAL_STATES.SUPERSEDED,
        finalized_at: new Date(),
        finalized_by: "usuario:1|role:ZP",
        superseded_by_version_id: 9,
      }),
    ]);
    assert.equal((await assertCompromisoLinesMutable(sup, 1)).ok, false);
  });

  it("PATCH de server.js escribe HG solo vía updateCompromisoLinesHgIfForecast", () => {
    const patchStart = SERVER_SRC.indexOf("app.patch(\"/api/dashboard/igf-forecast\"");
    const patchEnd = SERVER_SRC.indexOf("app.post(\"/api/dashboard/igf-forecast/finalize\"", patchStart);
    const patchFn = SERVER_SRC.slice(patchStart, patchEnd);
    assert.ok(patchStart > 0);
    assert.match(patchFn, /updateCompromisoLinesHgIfForecast/);
    assert.equal(/assertCompromisoLinesMutable/.test(patchFn), false);
    assert.equal(/UPDATE igf\.compromiso_lines/.test(patchFn), false);
    assert.equal(SERVER_SRC.split("UPDATE igf.compromiso_lines").length - 1, 0);
    assert.match(LIB_SRC, /SELECT financial_state FROM igf\.versions WHERE id = \$1::int FOR UPDATE/);
    assert.match(LIB_SRC, /UPDATE igf\.compromiso_lines SET/);
  });
});

describe("FIX MAJOR 1 TOCTOU PATCH HG", () => {
  it("1 PATCH HG sobre FORECAST funciona", async () => {
    const client = createMemoryClient([seedVersion()], { lines: [seedLine()] });
    const out = await updateCompromisoLinesHgIfForecast(client, 1, "Acapulco", hgFields());
    assert.equal(out.ok, true);
    assert.equal(client.lines()[0].hg_pct, 0.5);
    assert.equal(client.lines()[0].hg_kg, 9);
    assert.equal(client.versions()[0].financial_state, FINANCIAL_STATES.FORECAST);
  });

  it("2 PATCH HG sobre FINAL falla 409 y no escribe", async () => {
    const client = createMemoryClient(
      [
        seedVersion({
          financial_state: FINANCIAL_STATES.FINAL,
          finalized_at: new Date(),
          finalized_by: "usuario:1|role:ZP",
        }),
      ],
      { lines: [seedLine()] }
    );
    const out = await updateCompromisoLinesHgIfForecast(client, 1, "Acapulco", hgFields());
    assert.equal(out.ok, false);
    assert.equal(out.status, 409);
    assert.equal(client.lines()[0].hg_pct, 0.1);
  });

  it("3 PATCH HG sobre SUPERSEDED falla 409 y no escribe", async () => {
    const client = createMemoryClient(
      [
        seedVersion({
          financial_state: FINANCIAL_STATES.SUPERSEDED,
          finalized_at: new Date(),
          finalized_by: "usuario:1|role:ZP",
          superseded_by_version_id: 9,
        }),
      ],
      { lines: [seedLine()] }
    );
    const out = await updateCompromisoLinesHgIfForecast(client, 1, "Acapulco", hgFields());
    assert.equal(out.ok, false);
    assert.equal(out.status, 409);
    assert.equal(client.lines()[0].hg_pct, 0.1);
  });

  it("4a PATCH obtiene lock; FINALIZE espera; PATCH escribe FORECAST; FINALIZE sella", async () => {
    const shared = createSharedState([seedVersion()], [seedLine()]);
    let releasePatch;
    const hold = new Promise((resolve) => {
      releasePatch = resolve;
    });
    let locked = false;
    const patchClient = createMemoryClient(null, {
      shared,
      afterLock: async () => {
        locked = true;
        await hold;
      },
    });
    const finClient = createMemoryClient(null, { shared });
    const pPatch = updateCompromisoLinesHgIfForecast(patchClient, 1, "Acapulco", hgFields());
    while (!locked) await new Promise((r) => setImmediate(r));
    const pFin = finalizeFinancialVersion(finClient, { year: 2026, month: 8, version_id: 1 }, auth("ZP", 12));
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(shared.versions[0].financial_state, FINANCIAL_STATES.FORECAST);
    assert.equal(shared.lines[0].hg_pct, 0.1);
    releasePatch();
    const [patchOut, finOut] = await Promise.all([pPatch, pFin]);
    assert.equal(patchOut.ok, true);
    assert.equal(finOut.ok, true);
    assert.equal(shared.versions[0].financial_state, FINANCIAL_STATES.FINAL);
    assert.equal(shared.lines[0].hg_pct, 0.5);
  });

  it("4b FINALIZE obtiene lock; PATCH espera; FINALIZE sella; PATCH 409 sin escribir", async () => {
    const shared = createSharedState([seedVersion()], [seedLine()]);
    let releaseFin;
    const hold = new Promise((resolve) => {
      releaseFin = resolve;
    });
    let locked = false;
    const finClient = createMemoryClient(null, {
      shared,
      afterLock: async () => {
        locked = true;
        await hold;
      },
    });
    const patchClient = createMemoryClient(null, { shared });
    const pFin = finalizeFinancialVersion(finClient, { year: 2026, month: 8, version_id: 1 }, auth("ZP", 12));
    while (!locked) await new Promise((r) => setImmediate(r));
    const pPatch = updateCompromisoLinesHgIfForecast(patchClient, 1, "Acapulco", hgFields());
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(shared.lines[0].hg_pct, 0.1);
    assert.equal(shared.versions[0].financial_state, FINANCIAL_STATES.FORECAST);
    releaseFin();
    const [finOut, patchOut] = await Promise.all([pFin, pPatch]);
    assert.equal(finOut.ok, true);
    assert.equal(patchOut.ok, false);
    assert.equal(patchOut.status, 409);
    assert.equal(shared.versions[0].financial_state, FINANCIAL_STATES.FINAL);
    assert.equal(shared.lines[0].hg_pct, 0.1);
  });

  it("5 FINALIZE después de PATCH ya completado funciona", async () => {
    const client = createMemoryClient([seedVersion()], { lines: [seedLine()] });
    const patchOut = await updateCompromisoLinesHgIfForecast(client, 1, "Acapulco", hgFields());
    assert.equal(patchOut.ok, true);
    const fin = await finalizeFinancialVersion(client, { year: 2026, month: 8, version_id: 1 }, auth("ZP", 12));
    assert.equal(fin.ok, true);
    assert.equal(client.versions()[0].financial_state, FINANCIAL_STATES.FINAL);
    assert.equal(client.lines()[0].hg_pct, 0.5);
  });

  it("6 PATCH después de FINALIZE completado falla", async () => {
    const client = createMemoryClient([seedVersion()], { lines: [seedLine()] });
    await finalizeFinancialVersion(client, { year: 2026, month: 8, version_id: 1 }, auth("ZP", 12));
    const patchOut = await updateCompromisoLinesHgIfForecast(client, 1, "Acapulco", hgFields());
    assert.equal(patchOut.ok, false);
    assert.equal(patchOut.status, 409);
    assert.equal(client.lines()[0].hg_pct, 0.1);
  });
});

describe("FIX MAJOR 2 DELETE histórico", () => {
  it("019 trigger y script v5 prohíben DELETE FINAL/SUPERSEDED de forma física", () => {
    assert.match(IMMUTABILITY_SQL, /BEFORE DELETE ON igf\.versions/);
    assert.match(IMMUTABILITY_SQL, /BEFORE DELETE ON igf\.compromiso_lines/);
    assert.match(IMMUTABILITY_SQL, /OLD\.financial_state IN \('FINAL', 'SUPERSEDED'\)/);
    assert.match(IMMUTABILITY_SQL, /IGF_FINAL_HISTORY_IMMUTABLE/);
    assert.match(IMMUTABILITY_SQL, /igf_versions_reject_delete_final_superseded/);
    assert.match(IMMUTABILITY_SQL, /igf_compromiso_lines_reject_delete_final_superseded/);
    assert.match(SERVER_SRC, /applyIgfFinancialFinalImmutabilityMigration/);
    assert.match(DELETE_V5_SQL, /RAISE EXCEPTION 'IGF_FINAL_HISTORY_IMMUTABLE/);
    assert.match(DELETE_V5_SQL, /financial_state IN \('FINAL', 'SUPERSEDED'\)/);
    assert.match(DELETE_V5_SQL, /AND financial_state = 'FORECAST'/);
  });

  it("7 delete FORECAST de versión y líneas permanece permitido", async () => {
    const client = createMemoryClient([seedVersion()], { lines: [seedLine()] });
    await client.query("BEGIN");
    await client.query("DELETE FROM igf.compromiso_lines WHERE version_id = $1", [1]);
    await client.query("DELETE FROM igf.versions WHERE id = $1", [1]);
    await client.query("COMMIT");
    assert.equal(client.versions().length, 0);
    assert.equal(client.lines().length, 0);
  });

  it("8 delete FINAL falla y no borra versión ni líneas", async () => {
    const client = createMemoryClient(
      [
        seedVersion({
          financial_state: FINANCIAL_STATES.FINAL,
          finalized_at: new Date(),
          finalized_by: "usuario:1|role:ZP",
        }),
      ],
      { lines: [seedLine()] }
    );
    await assert.rejects(
      () => client.query("DELETE FROM igf.versions WHERE id = $1", [1]),
      (e) => /IGF_FINAL_HISTORY_IMMUTABLE/.test(e.message)
    );
    await assert.rejects(
      () => client.query("DELETE FROM igf.compromiso_lines WHERE version_id = $1", [1]),
      (e) => /IGF_FINAL_HISTORY_IMMUTABLE/.test(e.message)
    );
    assert.equal(client.versions().length, 1);
    assert.equal(client.lines().length, 1);
  });

  it("9 delete SUPERSEDED falla y no borra versión ni líneas", async () => {
    const client = createMemoryClient(
      [
        seedVersion({
          financial_state: FINANCIAL_STATES.SUPERSEDED,
          finalized_at: new Date(),
          finalized_by: "usuario:1|role:ZP",
          superseded_by_version_id: 2,
        }),
      ],
      { lines: [seedLine()] }
    );
    await assert.rejects(
      () => client.query("DELETE FROM igf.versions WHERE id = $1", [1]),
      (e) => /IGF_FINAL_HISTORY_IMMUTABLE/.test(e.message)
    );
    await assert.rejects(
      () => client.query("DELETE FROM igf.compromiso_lines WHERE version_id = $1", [1]),
      (e) => /IGF_FINAL_HISTORY_IMMUTABLE/.test(e.message)
    );
    assert.equal(client.versions().length, 1);
    assert.equal(client.lines().length, 1);
  });

  it("10 no cascade destructivo: borrar FORECAST no toca líneas FINAL", async () => {
    const client = createMemoryClient(
      [
        seedVersion({ id: 1, version_number: 1 }),
        seedVersion({
          id: 2,
          version_number: 2,
          financial_state: FINANCIAL_STATES.FINAL,
          finalized_at: new Date(),
          finalized_by: "usuario:1|role:ZP",
        }),
      ],
      { lines: [seedLine({ version_id: 1 }), seedLine({ version_id: 2, empresa: "Merida" })] }
    );
    await client.query("DELETE FROM igf.compromiso_lines WHERE version_id = $1", [1]);
    await client.query("DELETE FROM igf.versions WHERE id = $1", [1]);
    await assert.rejects(() => client.query("DELETE FROM igf.compromiso_lines WHERE version_id = $1", [2]));
    await assert.rejects(() => client.query("DELETE FROM igf.versions WHERE id = $1", [2]));
    assert.equal(client.versions().some((v) => v.id === 2), true);
    assert.equal(client.lines().some((l) => l.version_id === 2), true);
    assert.equal(client.versions().some((v) => v.id === 1), false);
  });
});

describe("wiring y no exposición ACTUAL_FINANCIAL", () => {
  it("expone POST finalize y supersede; GET no relabela actual", () => {
    assert.match(SERVER_SRC, /app\.post\("\/api\/dashboard\/igf-forecast\/finalize"/);
    assert.match(SERVER_SRC, /app\.post\("\/api\/dashboard\/igf-forecast\/supersede"/);
    const getFn = SERVER_SRC.slice(
      SERVER_SRC.indexOf("app.get(\"/api/dashboard/igf-forecast\""),
      SERVER_SRC.indexOf("app.get(\"/api/dashboard/igf-forecast-mini\"")
    );
    assert.equal(/ACTUAL_FINANCIAL/.test(getFn), false);
    assert.equal(/truth_class:\s*["']ACTUAL_FINANCIAL["']/.test(LIB_SRC), false);
    assert.equal(/loadFinancialActual/.test(LIB_SRC), false);
    assert.equal(/loadFinancialActual/.test(getFn), false);
    assert.equal(/financial_state/.test(getFn), false);
  });

  it("16-20 GET / Excel / ARR / month_close / pre_meeting sin cambio de contrato", () => {
    const getFn = SERVER_SRC.slice(
      SERVER_SRC.indexOf("app.get(\"/api/dashboard/igf-forecast\""),
      SERVER_SRC.indexOf("app.get(\"/api/dashboard/igf-forecast-mini\"")
    );
    assert.match(getFn, /buildIgfForecastPayload/);
    assert.equal(/updateCompromisoLinesHgIfForecast/.test(getFn), false);
    assert.equal(/ACTUAL_FINANCIAL/.test(ARR_IGF_SRC), false);
    assert.equal(/igf-financial-final/.test(ARR_IGF_SRC), false);
    assert.equal(/finalizeFinancialVersion|igf-financial-final/.test(MONTH_CLOSE_SRC), false);
    assert.equal(/finalizeFinancialVersion|igf-financial-final/.test(PRE_MEETING_SRC), false);
    assert.match(SQL, /UNIQUE INDEX igf_versions_one_final_global_ym/);
  });

  it("month_close_result y pre_meeting no ganan financial.actual en este slice", () => {
    assert.equal(/finalizeFinancialVersion|igf-financial-final/.test(MONTH_CLOSE_SRC), false);
    assert.equal(/finalizeFinancialVersion|igf-financial-final/.test(PRE_MEETING_SRC), false);
  });
});
