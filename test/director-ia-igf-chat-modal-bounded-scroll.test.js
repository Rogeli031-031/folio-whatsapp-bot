"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MODAL_SRC = fs.readFileSync(
  path.join(ROOT, "frontend-dashboard", "modules", "director-ia", "components", "DirectorIaChatModal.tsx"),
  "utf8"
);
const PANEL_SRC = fs.readFileSync(
  path.join(ROOT, "frontend-dashboard", "modules", "director-ia", "components", "DirectorIaChatPanel.tsx"),
  "utf8"
);
const IGF_SRC = fs.readFileSync(
  path.join(ROOT, "frontend-dashboard", "components", "IgfForecastClient.tsx"),
  "utf8"
);
const ACCIONES_SRC = fs.readFileSync(
  path.join(ROOT, "frontend-dashboard", "app", "acciones", "page.tsx"),
  "utf8"
);

describe("FIX-IGF-DIRECTOR-IA-MODAL-BOUNDED-SCROLL-001 — large acotado", () => {
  it("modal large usa 900×560 con overflow-hidden y no reabre 620", () => {
    assert.match(MODAL_SRC, /w-\[min\(900px,calc\(100vw-48px\)\)\]/);
    assert.match(MODAL_SRC, /h-\[min\(560px,calc\(100vh-64px\)\)\]/);
    assert.match(MODAL_SRC, /flex flex-col overflow-hidden min-h-0 w-\[min\(900px/);
    assert.doesNotMatch(MODAL_SRC, /620px|100vh-48px|1024px|780px/);
  });

  it("modal default conserva max-w-lg / max-h-85vh / min-h-320", () => {
    assert.match(MODAL_SRC, /flex flex-col w-full max-w-lg max-h-\[85vh\]/);
    assert.match(MODAL_SRC, /className=\{isLarge \? "flex-1 h-full min-h-0" : "flex-1 min-h-\[320px\]"\}/);
  });

  it("Action Register sigue en default; IGF sigue en large+select", () => {
    assert.match(ACCIONES_SRC, /<DirectorIaChatModal/);
    assert.doesNotMatch(ACCIONES_SRC, /size="large"/);
    assert.doesNotMatch(ACCIONES_SRC, /plantMode="select"/);
    assert.match(IGF_SRC, /size="large"/);
    assert.match(IGF_SRC, /plantMode="select"/);
  });
});

describe("FIX-IGF-DIRECTOR-IA-MODAL-BOUNDED-SCROLL-001 — panel fillAvailable", () => {
  it("chatMode+fillAvailable acota el shell y deja solo mensajes con scroll", () => {
    assert.match(PANEL_SRC, /const fillChat = Boolean\(chatMode && fillAvailable\)/);
    assert.match(PANEL_SRC, /h-full flex flex-col min-h-0 overflow-hidden/);
    assert.match(PANEL_SRC, /flex-1 min-h-0 overflow-y-auto space-y-3 px-1 py-2/);
    assert.match(PANEL_SRC, /<div className="shrink-0">/);
  });

  it("default chatMode conserva tope 50vh y no hereda h-full overflow-hidden", () => {
    assert.match(PANEL_SRC, /min-h-\[200px\] max-h-\[50vh\]/);
    assert.match(PANEL_SRC, /px-4 py-8 text-center/);
    const fillShell = PANEL_SRC.match(
      /fillChat\s*\?\s*`h-full flex flex-col min-h-0 overflow-hidden \$\{className\}`\s*:\s*`flex flex-col min-h-0 \$\{className\}`/
    );
    assert.ok(fillShell, "el shell overflow-hidden debe estar condicionado a fillChat");
  });

  it("error en fillChat queda acotado junto al composer", () => {
    assert.match(PANEL_SRC, /fillChat \? "text-sm text-red-300\/90 px-1 pt-1 max-h-16 overflow-y-auto"/);
    assert.match(PANEL_SRC, /\{errorNode\}\s*\{composerRow\}/);
  });
});
