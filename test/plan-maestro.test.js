"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const pm = require("../lib/plan-maestro");

const ROOT = path.join(__dirname, "..");

describe("plan-maestro catalogo y permisos", () => {
  it("expone los dos documentos canónicos", () => {
    assert.equal(pm.DOCUMENTS.length, 3);
    assert.ok(pm.documentBySlug("corporativo_2026"));
    assert.ok(pm.documentBySlug("tomza_en_accion"));
    assert.ok(pm.documentBySlug("eslabones_venta"));
    assert.equal(pm.documentBySlug("otro"), null);
    assert.equal(pm.DOCUMENTS[0].title, "PLAN MAESTRO CORPORATIVO 2026 TOMZA");
    assert.equal(pm.DOCUMENTS[1].title, "TOMZA EN ACCION LIBRO COMPLETO");
    assert.equal(pm.DOCUMENTS[2].title, "LOS 14 ESLABONES DE LA VENTA EFECTIVA TOMZA");
    assert.equal(pm.DOCUMENTS[2].expected_size_label, "80 KB");
  });

  it("solo ZP/AD/GG pueden subir", () => {
    assert.equal(pm.canUpload({ role: "ZP" }), true);
    assert.equal(pm.canUpload({ role: "AD" }), true);
    assert.equal(pm.canUpload({ role: "GG" }), true);
    assert.equal(pm.canUpload({ role: "GA" }), false);
    assert.equal(pm.canUpload({ role: "GV" }), false);
    assert.equal(pm.canUpload({}), false);
  });

  it("actorLabel usa nombre de persona y no inventa", () => {
    assert.equal(pm.actorLabel({ actor_nombre: "Luis Zaragoza" }), "Luis Zaragoza");
    assert.equal(pm.actorLabel({ actor_nombre: "Luis", actor_telefono: "555" }), "Luis (555)");
    assert.equal(pm.actorLabel({ actor_id: 9 }), "Usuario #9");
    assert.equal(pm.actorLabel({ role: "ZP" }), "ZP");
  });

  it("sanitizeComment recorta y rechaza vacío", () => {
    assert.equal(pm.sanitizeComment("  hola  ", 10), "hola");
    assert.equal(pm.sanitizeComment("   ", 10), null);
    assert.equal(pm.sanitizeComment("x".repeat(20), 8).length, 8);
  });

  it("buildS3Key queda bajo plan-maestro/slug", () => {
    const key = pm.buildS3Key("corporativo_2026", "PLAN MAESTRO.PDF");
    assert.match(key, /^plan-maestro\/corporativo_2026\//);
  });
});

describe("plan-maestro persistencia de notas", () => {
  it("addNote / listNotes con cliente inyectado", async () => {
    const rows = [];
    const client = {
      query: async (sql, params) => {
        if (/INSERT INTO public\.plan_maestro_notas/.test(sql)) {
          const row = {
            id: 1,
            usuario_nombre: params[0],
            comentario: params[2],
            created_at: "2026-09-11T12:00:00.000Z",
          };
          rows.unshift(row);
          return { rows: [row] };
        }
        return { rows };
      },
    };
    const note = await pm.addNote(client, {
      usuarioNombre: "Luis Zaragoza",
      usuarioId: 1,
      comentario: "Revisar hoja 12",
    });
    assert.equal(note.usuario_nombre, "Luis Zaragoza");
    assert.equal(note.comentario, "Revisar hoja 12");
    const listed = await pm.listNotes(client, 10);
    assert.equal(listed.length, 1);
    assert.equal(listed[0].comentario, "Revisar hoja 12");
  });

  it("addNote vacío falla cerrado", async () => {
    await assert.rejects(
      () => pm.addNote({ query: async () => ({ rows: [] }) }, { usuarioNombre: "X", comentario: "   " }),
      /Escribe un comentario/
    );
  });
});

describe("plan-maestro alcance de archivos", () => {
  it("no toca Director IA ni planner", () => {
    const src = fs.readFileSync(path.join(ROOT, "lib/plan-maestro.js"), "utf8");
    assert.doesNotMatch(src, /director-ia-planner|director-ia-chat/);
  });

  it("el botón PLAN MAESTRO está en IGF Forecast", () => {
    const ui = fs.readFileSync(path.join(ROOT, "frontend-dashboard/components/IgfForecastClient.tsx"), "utf8");
    assert.match(ui, /PLAN MAESTRO/);
    assert.match(ui, /PlanMaestroModal/);
  });
});
