"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const SRC = fs.readFileSync(
  path.join(__dirname, "..", "frontend-dashboard", "components", "IgfForecastClient.tsx"),
  "utf8"
);

function firstIndex(re) {
  const m = SRC.match(re);
  return m ? SRC.indexOf(m[0]) : -1;
}

describe("FIX-IGF-FORECAST-HOOK-ORDER-OPEN-PRONOSTICO-001", () => {
  it("decideOpenPronosticoFromQuery effect aparece antes del early return unauthorized", () => {
    const effectIdx = SRC.indexOf("decideOpenPronosticoFromQuery");
    const unauthorizedReturnIdx = firstIndex(/if \(unauthorized\) \{/);
    assert.notEqual(effectIdx, -1);
    assert.notEqual(unauthorizedReturnIdx, -1);
    assert.ok(
      effectIdx < unauthorizedReturnIdx,
      "el useEffect de OPEN_PRONOSTICO no puede quedar bajo if (unauthorized)"
    );
  });
});
