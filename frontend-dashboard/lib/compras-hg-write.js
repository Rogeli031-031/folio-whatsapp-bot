"use strict";

const HG_SAVE_ERROR = "No se pudo guardar HG.";
const HG_RELOAD_ERROR = "HG guardado, pero no se pudo actualizar la vista.";

async function commitHgWrite(opts) {
  const write = opts && opts.write;
  const reload = opts && opts.reload;
  const onError = opts && opts.onError;
  const confirmed = opts && Object.prototype.hasOwnProperty.call(opts, "confirmed") ? opts.confirmed : null;
  const next = opts && Object.prototype.hasOwnProperty.call(opts, "next") ? opts.next : null;
  try {
    await write(next);
  } catch (_writeErr) {
    if (typeof onError === "function") onError(HG_SAVE_ERROR);
    return { ok: false, persisted: false, reloadOk: false, restore: confirmed };
  }
  try {
    await reload();
  } catch (_reloadErr) {
    if (typeof onError === "function") onError(HG_RELOAD_ERROR);
    return { ok: true, persisted: true, reloadOk: false, restore: next };
  }
  if (typeof onError === "function") onError(null);
  return { ok: true, persisted: true, reloadOk: true, restore: next };
}

module.exports = { HG_SAVE_ERROR, HG_RELOAD_ERROR, commitHgWrite };
