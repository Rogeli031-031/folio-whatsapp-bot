"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const SERVER_SRC = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");

describe("folios.concepto migration", () => {
  it("ensureSchema convierte folios.concepto VARCHAR a TEXT de forma idempotente", () => {
    assert.match(SERVER_SRC, /\[migracion folios\.concepto TEXT\]/);
    assert.match(
      SERVER_SRC,
      /column_name = 'concepto'\s+AND data_type = 'character varying'/
    );
    assert.match(SERVER_SRC, /ALTER TABLE public\.folios ALTER COLUMN concepto TYPE TEXT/);
  });
});
