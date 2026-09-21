"use strict";

const HG_SAVE_ERROR = "No se pudo guardar HG.";

async function commitHgWrite(opts) {
  const write = opts && opts.write;
  const reload = opts && opts.reload;
  const onError = opts && opts.onError;
  const confirmed = opts && Object.prototype.hasOwnProperty.call(opts, "confirmed") ? opts.confirmed : null;
  const next = opts && Object.prototype.hasOwnProperty.call(opts, "next") ? opts.next : null;
  try {
    await write(next);
    await reload();
    if (typeof onError === "function") onError(null);
    return { ok: true, restore: next };
  } catch (_e) {
    if (typeof onError === "function") onError(HG_SAVE_ERROR);
    return { ok: false, restore: confirmed };
  }
}

module.exports = { HG_SAVE_ERROR, commitHgWrite };
