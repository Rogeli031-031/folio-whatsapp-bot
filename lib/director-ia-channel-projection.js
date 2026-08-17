/**
 * Channel Projection — runtime mínimo (06 v1.0, ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-002 D1–D20).
 * Determinístico, in-memory, fail-closed. Sin LLM, networking, tools ni autoridad epistemológica.
 */
"use strict";

const ENGINE_VERSION = "channel-projection-physical-v1";
const POLICY_VERSION = "06-v1.0-physical-d1-d20";
const PROJECTION_MODEL_VERSION = "SERIALIZED_PROJECTION_MODEL_V1";
const OUTPUT_ENVELOPE_VERSION = "CHANNEL_OUTPUT_ENVELOPE_V1";

const CHANNELS = Object.freeze([
  "CHAT",
  "VOICE",
  "WHATSAPP",
  "DASHBOARD",
  "REPORT",
  "PRESENTATION",
]);

const DEPTHS = Object.freeze(["L0_FLASH", "L1_EXECUTIVE", "L2_SUPPORT", "L3_AUDIT"]);

const SEMANTIC_TYPES = Object.freeze([
  "COVERAGE",
  "FACT",
  "EVIDENCE",
  "DIAGNOSIS",
  "CONFLICT",
  "OPEN_QUESTION",
  "SOURCE_HEALTH",
  "LIMITATION",
  "ABSTENTION",
  "INTERPRETATION_KNOWN",
  "INTERPRETATION_INFERRED",
  "INTERPRETATION_NOT_CONCLUDED",
  "HYPOTHESIS",
  "RECOMMENDATION",
  "NEXT_VERIFICATION",
  "DECISION_OPTION",
  "CLARIFICATION_REQUEST",
  "AUDIT_REFERENCE",
]);

const CONTENT_CLASSES = Object.freeze([
  "IRRENUNCIABLE",
  "OBLIGATORIO_RESUMIBLE",
  "DIFERIBLE_BAJO_DEMANDA",
  "ESPECIFICO_DE_CANAL",
]);

const PRIORITIES = Object.freeze(["P0_CRITICAL", "P1_HIGH", "P2_NORMAL", "P3_DETAIL"]);

const CLASS_RANK = Object.freeze({
  IRRENUNCIABLE: 0,
  OBLIGATORIO_RESUMIBLE: 1,
  DIFERIBLE_BAJO_DEMANDA: 2,
  ESPECIFICO_DE_CANAL: 3,
});

const CLASS_BY_KEY = Object.freeze({
  NO_KNOWLEDGE: "IRRENUNCIABLE",
  TYPE_E_CONFLICT: "IRRENUNCIABLE",
  BLOCKING_LIMITATION: "IRRENUNCIABLE",
  CRITICAL_CONTRADICTION: "IRRENUNCIABLE",
  DIAGNOSIS: "OBLIGATORIO_RESUMIBLE",
  PRIMARY_EVIDENCE: "OBLIGATORIO_RESUMIBLE",
  LEGITIMATE_HYPOTHESIS: "OBLIGATORIO_RESUMIBLE",
  RECOMMENDATION: "OBLIGATORIO_RESUMIBLE",
  FACT_DETAIL: "DIFERIBLE_BAJO_DEMANDA",
  EVIDENCE_DETAIL: "DIFERIBLE_BAJO_DEMANDA",
  AUDIT_REFERENCE: "DIFERIBLE_BAJO_DEMANDA",
  PRESENTATION_FORMAT: "ESPECIFICO_DE_CANAL",
});

const PRESENTABLE_STATUS = Object.freeze(["VALIDATED", "PARTIAL", "CONFLICTED", "NO_KNOWLEDGE"]);
const UNPRESENTABLE_STATUS = Object.freeze(["BUILDING", "INVALID"]);
const LIFECYCLE_HISTORICAL = Object.freeze(["EXPIRED", "SUPERSEDED"]);

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function structuralError(code, message) {
  const err = new Error(message || code);
  err.code = code;
  return err;
}

function statementOf(obj, fallback) {
  if (!obj || typeof obj !== "object") return fallback;
  if (typeof obj.statement === "string") return obj.statement;
  if (typeof obj.statement_token === "string") return obj.statement_token;
  if (typeof obj.statement_or_reference === "string") return obj.statement_or_reference;
  if (typeof obj.message_semantic === "string") return obj.message_semantic;
  if (typeof obj.message === "string") return obj.message;
  if (typeof obj.question_token === "string") return obj.question_token;
  if (typeof obj.question === "string") return obj.question;
  if (typeof obj.reason_token === "string") return obj.reason_token;
  if (typeof obj.coverage_token === "string") return obj.coverage_token;
  if (typeof obj.coverage_state === "string") return obj.coverage_state;
  return fallback;
}

function strictestClass(keys) {
  let best = null;
  let rank = Infinity;
  for (const key of keys) {
    const cls = CLASS_BY_KEY[key];
    if (!cls) continue;
    const r = CLASS_RANK[cls];
    if (r < rank) {
      rank = r;
      best = cls;
    }
  }
  return best;
}

function priorityFor(contentClass) {
  if (contentClass === "IRRENUNCIABLE") return "P0_CRITICAL";
  if (contentClass === "OBLIGATORIO_RESUMIBLE") return "P1_HIGH";
  if (contentClass === "DIFERIBLE_BAJO_DEMANDA") return "P3_DETAIL";
  return "P3_DETAIL";
}

function isTypeE(conflict) {
  if (!conflict) return false;
  if (conflict.primary_type === "CONF_TYPE_E_GOVERNANCE" || conflict.primary_type === "E") return true;
  return asArray(conflict.secondary_types).some(
    (t) => t === "CONF_TYPE_E_GOVERNANCE" || t === "E"
  );
}

function isOpenConflict(conflict) {
  return conflict && (conflict.resolution_status === "OPEN" || conflict.resolution_status === "UNDER_REVIEW");
}

function blockingLimitationIds(ies) {
  return new Set(asArray(ies.knowledge_coverage && ies.knowledge_coverage.blocking_limitations).filter(Boolean));
}

function coverageToken(ies) {
  return (ies.knowledge_coverage && ies.knowledge_coverage.coverage_token) || null;
}

function isNoKnowledge(ies) {
  return ies.status === "NO_KNOWLEDGE" || coverageToken(ies) === "COV_NO_KNOWLEDGE";
}

function isPartialNeverOmit(ies) {
  return coverageToken(ies) === "COV_PARTIAL_KNOWLEDGE";
}

function makeItem(idFactory, spec) {
  const contentClass = spec.content_class;
  const mayDefer = contentClass === "DIFERIBLE_BAJO_DEMANDA";
  return {
    item_id: idFactory("item"),
    source_type: spec.source_type,
    source_id: spec.source_id,
    semantic_type: spec.semantic_type,
    content_class: contentClass,
    priority: priorityFor(contentClass),
    statement_or_reference: spec.statement_or_reference,
    supporting_references: asArray(spec.supporting_references),
    must_preserve: contentClass === "IRRENUNCIABLE",
    may_summarize: contentClass !== "IRRENUNCIABLE",
    may_defer: mayDefer,
  };
}

function collectFromIes(ies, idFactory) {
  const items = [];
  const blocking = blockingLimitationIds(ies);
  const cov = ies.knowledge_coverage || {};
  const covKeys = [];
  if (isNoKnowledge(ies)) covKeys.push("NO_KNOWLEDGE");
  let covClass = strictestClass(covKeys) || "OBLIGATORIO_RESUMIBLE";
  if (isPartialNeverOmit(ies)) covClass = "IRRENUNCIABLE";
  items.push(
    makeItem(idFactory, {
      source_type: "ies",
      source_id: `coverage:${cov.coverage_token || ies.status || "unknown"}`,
      semantic_type: "COVERAGE",
      content_class: covClass,
      statement_or_reference: cov.coverage_token || cov.coverage_state || ies.status,
      supporting_references: [],
    })
  );

  for (const row of asArray(ies.executive_summary_facts)) {
    items.push(
      makeItem(idFactory, {
        source_type: "ies",
        source_id: `exec_summary:${row.statement_reference || items.length}`,
        semantic_type: "FACT",
        content_class: "OBLIGATORIO_RESUMIBLE",
        statement_or_reference: statementOf(row, "executive_summary_fact"),
        supporting_references: [
          ...asArray(row.supporting_fact_ids),
          ...asArray(row.supporting_evidence_ids),
        ].filter(Boolean),
      })
    );
  }

  for (const fact of asArray(ies.facts)) {
    if (!fact || !fact.fact_id) continue;
    items.push(
      makeItem(idFactory, {
        source_type: "ies",
        source_id: fact.fact_id,
        semantic_type: "FACT",
        content_class: strictestClass(["FACT_DETAIL"]),
        statement_or_reference: statementOf(fact, fact.fact_id),
        supporting_references: asArray(fact.supporting_observation_ids),
      })
    );
  }

  asArray(ies.evidence).forEach((ev, idx) => {
    if (!ev || !ev.evidence_id) return;
    const key = idx === 0 ? "PRIMARY_EVIDENCE" : "EVIDENCE_DETAIL";
    items.push(
      makeItem(idFactory, {
        source_type: "ies",
        source_id: ev.evidence_id,
        semantic_type: "EVIDENCE",
        content_class: strictestClass([key]),
        statement_or_reference: statementOf(ev, ev.evidence_id),
        supporting_references: asArray(ev.supporting_fact_ids),
      })
    );
  });

  for (const d of asArray(ies.diagnoses)) {
    if (!d || !d.diagnosis_id) continue;
    items.push(
      makeItem(idFactory, {
        source_type: "ies",
        source_id: d.diagnosis_id,
        semantic_type: "DIAGNOSIS",
        content_class: strictestClass(["DIAGNOSIS"]),
        statement_or_reference: statementOf(d, d.diagnosis_id),
        supporting_references: asArray(d.supporting_evidence_ids),
      })
    );
  }

  for (const c of asArray(ies.conflicts)) {
    if (!c || !c.conflict_id) continue;
    const keys = [];
    if (isTypeE(c) && isOpenConflict(c)) {
      keys.push("TYPE_E_CONFLICT");
      keys.push("CRITICAL_CONTRADICTION");
    } else if (isOpenConflict(c) && c.governance_escalation === true) {
      keys.push("CRITICAL_CONTRADICTION");
    }
    const cls = strictestClass(keys) || "OBLIGATORIO_RESUMIBLE";
    items.push(
      makeItem(idFactory, {
        source_type: "ies",
        source_id: c.conflict_id,
        semantic_type: "CONFLICT",
        content_class: cls,
        statement_or_reference: c.primary_type || c.conflict_id,
        supporting_references: asArray(c.facts_in_tension),
      })
    );
  }

  for (const q of asArray(ies.open_questions)) {
    if (!q || !q.open_question_id) continue;
    items.push(
      makeItem(idFactory, {
        source_type: "ies",
        source_id: q.open_question_id,
        semantic_type: "OPEN_QUESTION",
        content_class: "DIFERIBLE_BAJO_DEMANDA",
        statement_or_reference: statementOf(q, q.open_question_id),
        supporting_references: [],
      })
    );
  }

  asArray(ies.source_health).forEach((h, idx) => {
    if (!h) return;
    const sid = h.tool_id || h.domain || `source_health:${idx}`;
    items.push(
      makeItem(idFactory, {
        source_type: "ies",
        source_id: String(sid),
        semantic_type: "SOURCE_HEALTH",
        content_class: "DIFERIBLE_BAJO_DEMANDA",
        statement_or_reference: h.execution_status || statementOf(h, sid),
        supporting_references: h.domain ? [h.domain] : [],
      })
    );
  });

  for (const lim of asArray(ies.limitations)) {
    if (!lim || !lim.limitation_id) continue;
    const keys = blocking.has(lim.limitation_id) ? ["BLOCKING_LIMITATION"] : [];
    const cls = strictestClass(keys) || "OBLIGATORIO_RESUMIBLE";
    items.push(
      makeItem(idFactory, {
        source_type: "ies",
        source_id: lim.limitation_id,
        semantic_type: "LIMITATION",
        content_class: cls,
        statement_or_reference: statementOf(lim, lim.limitation_id),
        supporting_references: lim.statement_reference ? [lim.statement_reference] : [],
      })
    );
  }

  if (ies.audit) {
    items.push(
      makeItem(idFactory, {
        source_type: "ies",
        source_id: `audit:${ies.ies_id}`,
        semantic_type: "AUDIT_REFERENCE",
        content_class: strictestClass(["AUDIT_REFERENCE"]),
        statement_or_reference: (ies.audit && ies.audit.generated_by) || "audit",
        supporting_references: ies.audit.engine_version ? [ies.audit.engine_version] : [],
      })
    );
  }

  return items;
}

function collectFromReasoning(result, idFactory, ies) {
  const items = [];
  if (!isPlainObject(result)) return items;
  const interp = result.interpretation || {};

  if (interp.what_is_known) {
    items.push(
      makeItem(idFactory, {
        source_type: "reasoning_result",
        source_id: "interpretation.what_is_known",
        semantic_type: "INTERPRETATION_KNOWN",
        content_class: "OBLIGATORIO_RESUMIBLE",
        statement_or_reference: "what_is_known",
        supporting_references: asArray(interp.what_is_known.references),
      })
    );
  }
  if (interp.what_can_be_inferred) {
    items.push(
      makeItem(idFactory, {
        source_type: "reasoning_result",
        source_id: "interpretation.what_can_be_inferred",
        semantic_type: "INTERPRETATION_INFERRED",
        content_class: "OBLIGATORIO_RESUMIBLE",
        statement_or_reference: "what_can_be_inferred",
        supporting_references: asArray(interp.what_can_be_inferred.references),
      })
    );
  }
  if (interp.what_cannot_be_concluded) {
    items.push(
      makeItem(idFactory, {
        source_type: "reasoning_result",
        source_id: "interpretation.what_cannot_be_concluded",
        semantic_type: "INTERPRETATION_NOT_CONCLUDED",
        content_class: "OBLIGATORIO_RESUMIBLE",
        statement_or_reference: "what_cannot_be_concluded",
        supporting_references: asArray(interp.what_cannot_be_concluded.references),
      })
    );
  }

  for (const h of asArray(result.hypotheses)) {
    if (!h || !h.hypothesis_id) continue;
    items.push(
      makeItem(idFactory, {
        source_type: "reasoning_result",
        source_id: h.hypothesis_id,
        semantic_type: "HYPOTHESIS",
        content_class: strictestClass(["LEGITIMATE_HYPOTHESIS"]),
        statement_or_reference: statementOf(h, h.hypothesis_id),
        supporting_references: [
          ...asArray(h.supporting_fact_ids),
          ...asArray(h.supporting_evidence_ids),
        ].filter(Boolean),
      })
    );
  }

  for (const rec of asArray(result.recommendations)) {
    if (!rec || !rec.recommendation_id) continue;
    items.push(
      makeItem(idFactory, {
        source_type: "reasoning_result",
        source_id: rec.recommendation_id,
        semantic_type: "RECOMMENDATION",
        content_class: strictestClass(["RECOMMENDATION"]),
        statement_or_reference: statementOf(rec, rec.recommendation_id),
        supporting_references: asArray(rec.conditions),
      })
    );
  }

  for (const nv of asArray(result.next_verifications)) {
    const id = nv && (nv.verification_id || nv.next_verification_id);
    if (!id) continue;
    items.push(
      makeItem(idFactory, {
        source_type: "reasoning_result",
        source_id: id,
        semantic_type: "NEXT_VERIFICATION",
        content_class: "DIFERIBLE_BAJO_DEMANDA",
        statement_or_reference: statementOf(nv, nv.question_or_check || id),
        supporting_references: asArray(nv.related_open_question_ids),
      })
    );
  }

  for (const opt of asArray(result.decision_options)) {
    if (!opt || !opt.decision_option_id) continue;
    items.push(
      makeItem(idFactory, {
        source_type: "reasoning_result",
        source_id: opt.decision_option_id,
        semantic_type: "DECISION_OPTION",
        content_class: "OBLIGATORIO_RESUMIBLE",
        statement_or_reference: statementOf(opt, opt.decision_option_id),
        supporting_references: ["NOT_EXECUTED"],
      })
    );
  }

  for (const a of asArray(result.abstentions)) {
    if (!a || !a.abstention_id) continue;
    const keys = [];
    if (isNoKnowledge(ies) || a.kind === "NO_KNOWLEDGE" || a.abstention_kind === "NO_KNOWLEDGE") {
      keys.push("NO_KNOWLEDGE");
    }
    const cls = strictestClass(keys) || "OBLIGATORIO_RESUMIBLE";
    items.push(
      makeItem(idFactory, {
        source_type: "reasoning_result",
        source_id: a.abstention_id,
        semantic_type: "ABSTENTION",
        content_class: cls,
        statement_or_reference: statementOf(a, a.message || a.abstention_id),
        supporting_references: a.primary_anchor_ref
          ? [String(a.primary_anchor_ref)]
          : a.anchor_ref
            ? [String(a.anchor_ref)]
            : [],
      })
    );
  }

  for (const cl of asArray(result.clarification_requests)) {
    const id = cl && cl.clarification_id;
    if (!id) continue;
    items.push(
      makeItem(idFactory, {
        source_type: "reasoning_result",
        source_id: id,
        semantic_type: "CLARIFICATION_REQUEST",
        content_class: "DIFERIBLE_BAJO_DEMANDA",
        statement_or_reference: statementOf(cl, cl.question || id),
        supporting_references: asArray(cl.related_open_question_ids),
      })
    );
  }

  if (isPlainObject(result.reasoning_limits) && Object.keys(result.reasoning_limits).length > 0) {
    items.push(
      makeItem(idFactory, {
        source_type: "reasoning_result",
        source_id: "reasoning_limits",
        semantic_type: "LIMITATION",
        content_class: "OBLIGATORIO_RESUMIBLE",
        statement_or_reference: "reasoning_limits",
        supporting_references: Object.keys(result.reasoning_limits),
      })
    );
  }

  return items;
}

function isEssentialConclusion(item) {
  return (
    item.semantic_type === "DIAGNOSIS" ||
    item.semantic_type === "INTERPRETATION_KNOWN" ||
    item.semantic_type === "COVERAGE" ||
    (item.semantic_type === "FACT" && item.content_class === "OBLIGATORIO_RESUMIBLE")
  );
}

function splitByDepth(allItems, depth) {
  const items = [];
  const deferred = [];
  let recsAtL0 = 0;
  for (const item of allItems) {
    if (item.content_class === "IRRENUNCIABLE") {
      items.push(item);
      continue;
    }
    if (depth === "L3_AUDIT") {
      items.push(item);
      continue;
    }
    if (depth === "L2_SUPPORT") {
      if (item.semantic_type === "AUDIT_REFERENCE") {
        deferred.push(item);
      } else {
        items.push(item);
      }
      continue;
    }
    if (depth === "L1_EXECUTIVE") {
      if (item.content_class === "OBLIGATORIO_RESUMIBLE" || item.semantic_type === "ABSTENTION") {
        items.push(item);
      } else if (item.may_defer) {
        deferred.push(item);
      }
      continue;
    }
    // L0_FLASH
    if (isEssentialConclusion(item)) {
      items.push(item);
      continue;
    }
    if (item.semantic_type === "RECOMMENDATION" && recsAtL0 < 1) {
      items.push(item);
      recsAtL0 += 1;
      continue;
    }
    if (item.may_defer) {
      deferred.push(item);
    }
  }
  return { items, deferred_items: deferred };
}

function expectedMustPreserve(ies, reasoningResult, depth) {
  const expected = [];
  const cov = ies.knowledge_coverage || {};
  if (isNoKnowledge(ies) || isPartialNeverOmit(ies)) {
    expected.push({
      kind: isNoKnowledge(ies) ? "NO_KNOWLEDGE" : "COV_PARTIAL_KNOWLEDGE",
      source_id: `coverage:${cov.coverage_token || ies.status || "unknown"}`,
    });
  }
  for (const c of asArray(ies.conflicts)) {
    if (c && isTypeE(c) && isOpenConflict(c)) {
      expected.push({ kind: "TYPE_E", source_id: c.conflict_id });
    } else if (c && isOpenConflict(c) && c.governance_escalation === true) {
      expected.push({ kind: "CRITICAL_CONTRADICTION", source_id: c.conflict_id });
    }
  }
  const blocking = blockingLimitationIds(ies);
  for (const lim of asArray(ies.limitations)) {
    if (lim && blocking.has(lim.limitation_id)) {
      expected.push({ kind: "BLOCKING_LIMITATION", source_id: lim.limitation_id });
    }
  }
  if (isPlainObject(reasoningResult)) {
    for (const a of asArray(reasoningResult.abstentions)) {
      if (!a || !a.abstention_id) continue;
      const relevant =
        isNoKnowledge(ies) || a.kind === "NO_KNOWLEDGE" || a.abstention_kind === "NO_KNOWLEDGE";
      if (relevant) expected.push({ kind: "ABSTENTION", source_id: a.abstention_id });
      else if (depth === "L1_EXECUTIVE" || depth === "L2_SUPPORT" || depth === "L3_AUDIT") {
        expected.push({ kind: "ABSTENTION", source_id: a.abstention_id });
      }
    }
  }
  return expected;
}

function validateCriticalEquivalence(model, ies, reasoningResult, contentBlocks) {
  const errors = [];
  const immediateIds = new Set(asArray(model.items).map((i) => i.source_id));
  const deferredIds = new Set(asArray(model.deferred_items).map((i) => i.source_id));

  for (const item of asArray(model.items).concat(asArray(model.deferred_items))) {
    if (item.content_class === "IRRENUNCIABLE" && item.may_defer) {
      errors.push("irrenunciable_may_defer");
    }
    if (item.content_class === "IRRENUNCIABLE" && deferredIds.has(item.source_id)) {
      errors.push("irrenunciable_deferred");
    }
    if (!SEMANTIC_TYPES.includes(item.semantic_type)) errors.push("semantic_type_invalid");
    if (!CONTENT_CLASSES.includes(item.content_class)) errors.push("content_class_invalid");
    if (!PRIORITIES.includes(item.priority)) errors.push("priority_invalid");
    if (item.semantic_type === "DECISION_OPTION" && !item.supporting_references.includes("NOT_EXECUTED")) {
      errors.push("decision_option_not_executed_missing");
    }
    if (item.semantic_type === "RECOMMENDATION") {
      const joined = `${item.statement_or_reference} ${item.supporting_references.join(" ")}`;
      if (/\bEXECUTED\b/.test(joined) && !joined.includes("NOT_EXECUTED")) {
        errors.push("recommendation_presented_as_executed");
      }
    }
  }

  for (const exp of expectedMustPreserve(ies, reasoningResult, model.projection_depth)) {
    if (!immediateIds.has(exp.source_id)) {
      errors.push(`missing_irrenunciable:${exp.kind}:${exp.source_id}`);
    }
    if (deferredIds.has(exp.source_id)) {
      errors.push(`deferred_irrenunciable:${exp.kind}:${exp.source_id}`);
    }
  }

  const blockItemIds = new Set(
    asArray(contentBlocks)
      .map((b) => b && b.item_id)
      .filter(Boolean)
  );
  for (const item of asArray(model.items)) {
    if (item.content_class === "IRRENUNCIABLE" && !blockItemIds.has(item.item_id)) {
      errors.push(`render_omitted_irrenunciable:${item.source_id}`);
    }
  }

  for (const block of asArray(contentBlocks)) {
    if (!block) continue;
    const src = asArray(model.items).find((i) => i.item_id === block.item_id);
    if (src && block.statement_or_reference !== src.statement_or_reference) {
      errors.push("tone_altered_statement");
    }
    if (block.execution_status && block.execution_status !== "NOT_EXECUTED") {
      errors.push("decision_option_presented_as_executed");
    }
  }

  return { ok: errors.length === 0, errors };
}

function sortForChannel(items, channel) {
  const copy = items.slice();
  const rank = (item) => {
    if (item.content_class === "IRRENUNCIABLE") return 0;
    if (channel === "PRESENTATION" && item.semantic_type === "RECOMMENDATION") return 4;
    if (channel === "PRESENTATION" && item.semantic_type === "DECISION_OPTION") return 5;
    if (item.priority === "P0_CRITICAL") return 0;
    if (item.priority === "P1_HIGH") return 1;
    if (item.priority === "P2_NORMAL") return 2;
    return 3;
  };
  copy.sort((a, b) => rank(a) - rank(b));
  return copy;
}

function blockFromItem(idFactory, item, kind, sequence, extras) {
  const block = {
    block_id: idFactory("block"),
    block_kind: kind,
    sequence,
    item_id: item.item_id,
    source_id: item.source_id,
    semantic_type: item.semantic_type,
    content_class: item.content_class,
    statement_or_reference: item.statement_or_reference,
    visible_without_disclosure: item.content_class === "IRRENUNCIABLE" || !item.may_defer,
  };
  if (item.semantic_type === "DECISION_OPTION") {
    block.execution_status = "NOT_EXECUTED";
  }
  if (extras) Object.assign(block, extras);
  return block;
}

function deferredFromItems(items) {
  return items.map((item) => ({
    item_id: item.item_id,
    source_id: item.source_id,
    semantic_type: item.semantic_type,
    content_class: item.content_class,
    statement_or_reference: item.statement_or_reference,
    disclosure: "DEFERRED",
  }));
}

function renderChat(model, idFactory) {
  const ordered = sortForChannel(model.items, "CHAT");
  const blocks = ordered.map((item, i) =>
    blockFromItem(idFactory, item, "paragraph", i, {
      offer_deepening: model.deferred_items.length > 0,
      epistemic_lane: item.semantic_type,
    })
  );
  return { content_blocks: blocks, deferred_content: deferredFromItems(model.deferred_items), limitations: [] };
}

function renderVoice(model, idFactory) {
  const ordered = sortForChannel(model.items, "VOICE");
  const blocks = [];
  let seq = 0;
  for (const item of ordered) {
    blocks.push(blockFromItem(idFactory, item, "linear_utterance", seq, { density: "low" }));
    seq += 1;
  }
  const limitations = [];
  if (model.deferred_items.length > 0) {
    limitations.push({
      code: "VOICE_DEFERRED_DETAIL",
      statement_or_reference: "detalle diferible resumido y ofrecido bajo demanda",
    });
  }
  return {
    content_blocks: blocks,
    deferred_content: deferredFromItems(model.deferred_items),
    limitations,
  };
}

function renderWhatsapp(model, idFactory) {
  const ordered = sortForChannel(model.items, "WHATSAPP");
  const irren = ordered.filter((i) => i.content_class === "IRRENUNCIABLE");
  const rest = ordered.filter((i) => i.content_class !== "IRRENUNCIABLE");
  const blocks = [];
  let seq = 0;
  for (const item of irren) {
    blocks.push(blockFromItem(idFactory, item, "compact_message", seq, { first_block_group: true }));
    seq += 1;
  }
  for (const item of rest) {
    blocks.push(blockFromItem(idFactory, item, "compact_message", seq, { fragmented: true }));
    seq += 1;
  }
  return {
    content_blocks: blocks,
    deferred_content: deferredFromItems(model.deferred_items),
    limitations: [],
  };
}

function renderDashboard(model, idFactory) {
  const ordered = sortForChannel(model.items, "DASHBOARD");
  const blocks = ordered.map((item, i) =>
    blockFromItem(idFactory, item, "panel", i, {
      drill_down: false,
      visible_without_disclosure: true,
    })
  );
  const deferred = deferredFromItems(model.deferred_items).map((d) =>
    Object.assign(d, { drill_down: true })
  );
  return { content_blocks: blocks, deferred_content: deferred, limitations: [] };
}

function renderReport(model, idFactory) {
  const ordered = sortForChannel(model.items, "REPORT");
  const blocks = ordered.map((item, i) =>
    blockFromItem(idFactory, item, "persistent_section", i, { persistent: true })
  );
  const limitations = [];
  if (model.projection_depth === "L0_FLASH" || model.projection_depth === "L1_EXECUTIVE") {
    limitations.push({
      code: "REPORT_PREFERS_L2_L3",
      statement_or_reference: model.projection_depth,
    });
  }
  return {
    content_blocks: blocks,
    deferred_content: deferredFromItems(model.deferred_items),
    limitations,
  };
}

function renderPresentation(model, idFactory) {
  const ordered = sortForChannel(model.items, "PRESENTATION");
  const blocks = ordered.map((item, i) =>
    blockFromItem(idFactory, item, "guided_step", i, {
      decision_taken: false,
    })
  );
  return {
    content_blocks: blocks,
    deferred_content: deferredFromItems(model.deferred_items),
    limitations: [],
  };
}

const DEFAULT_RENDERERS = Object.freeze({
  CHAT: renderChat,
  VOICE: renderVoice,
  WHATSAPP: renderWhatsapp,
  DASHBOARD: renderDashboard,
  REPORT: renderReport,
  PRESENTATION: renderPresentation,
});

function createDefaultPolicyRegistry() {
  return {
    CHAT: { policy_id: "CHAT_POLICY_V1", render: renderChat },
    VOICE: { policy_id: "VOICE_POLICY_V1", render: renderVoice },
    WHATSAPP: { policy_id: "WHATSAPP_POLICY_V1", render: renderWhatsapp },
    DASHBOARD: { policy_id: "DASHBOARD_POLICY_V1", render: renderDashboard },
    REPORT: { policy_id: "REPORT_POLICY_V1", render: renderReport },
    PRESENTATION: { policy_id: "PRESENTATION_POLICY_V1", render: renderPresentation },
  };
}

function failClosedUnpresentable(ies, channel, projectionDepth, clock, idFactory, extraLimitation) {
  const projection_id = idFactory("proj");
  const generated_at = clock();
  const limitations = [
    {
      code: extraLimitation || "IES_NOT_PRESENTABLE",
      statement_or_reference: ies && ies.status ? ies.status : "missing_ies_status",
    },
  ];
  const audit = {
    generated_at,
    engine_version: ENGINE_VERSION,
    policy_version: POLICY_VERSION,
    projection_model_version: PROJECTION_MODEL_VERSION,
    output_envelope_version: OUTPUT_ENVELOPE_VERSION,
    fail_closed: true,
  };
  const model = {
    projection_id,
    ies_id: (ies && ies.ies_id) || null,
    ies_version: ies && ies.ies_version !== undefined ? ies.ies_version : null,
    reasoning_run_id: null,
    channel,
    projection_depth: projectionDepth,
    items: [],
    critical_invariants: [],
    deferred_items: [],
    limitations,
    audit,
  };
  const output = {
    projection_id,
    channel,
    projection_depth: projectionDepth,
    ies_id: model.ies_id,
    reasoning_run_id: null,
    content_blocks: [],
    deferred_content: [],
    critical_invariants: [],
    limitations,
    audit: Object.assign({}, audit),
  };
  return { projection_model: model, channel_output: output };
}

function createChannelProjection(options) {
  const opts = options || {};
  if (!isPlainObject(opts.policyRegistry)) {
    throw structuralError("INVALID_DEPENDENCIES", "policyRegistry_required");
  }
  if (typeof opts.clock !== "function") {
    throw structuralError("INVALID_DEPENDENCIES", "clock_required");
  }
  if (typeof opts.idFactory !== "function") {
    throw structuralError("INVALID_DEPENDENCIES", "idFactory_required");
  }

  function project(input) {
    const args = isPlainObject(input) ? input : {};
    if (!isPlainObject(args.ies)) {
      throw structuralError("IES_REQUIRED", "ies_required");
    }
    if (args.snapshot || args.bundle || args.observationRecord) {
      throw structuralError("INVALID_IES", "snapshot_bundle_observation_bypass_forbidden");
    }
    if (!CHANNELS.includes(args.channel)) {
      throw structuralError("INVALID_CHANNEL", "channel_invalid");
    }
    if (!DEPTHS.includes(args.projectionDepth)) {
      throw structuralError("INVALID_DEPTH", "projectionDepth_invalid");
    }
    const policy = opts.policyRegistry[args.channel];
    if (!policy || typeof policy.render !== "function") {
      throw structuralError("INVALID_CHANNEL", "policy_missing");
    }

    const iesOriginal = args.ies;
    const reasoningOriginal = args.reasoningResult;
    const ies = cloneJson(iesOriginal);
    const reasoningResult =
      reasoningOriginal === undefined || reasoningOriginal === null ? null : cloneJson(reasoningOriginal);

    if (!ies.ies_id || ies.ies_version === undefined) {
      throw structuralError("INVALID_IES", "ies_identity");
    }

    if (UNPRESENTABLE_STATUS.includes(ies.status) || !PRESENTABLE_STATUS.concat(LIFECYCLE_HISTORICAL).includes(ies.status)) {
      return failClosedUnpresentable(ies, args.channel, args.projectionDepth, opts.clock, opts.idFactory);
    }

    const limitations = [];
    if (LIFECYCLE_HISTORICAL.includes(ies.status)) {
      limitations.push({
        code: "IES_LIFECYCLE_NOT_CURRENT",
        statement_or_reference: ies.status,
      });
    }

    const collected = collectFromIes(ies, opts.idFactory);
    if (reasoningResult) {
      collected.push(...collectFromReasoning(reasoningResult, opts.idFactory, ies));
    }

    const split = splitByDepth(collected, args.projectionDepth);
    const critical_invariants = split.items
      .filter((i) => i.content_class === "IRRENUNCIABLE")
      .map((i) => ({
        source_id: i.source_id,
        semantic_type: i.semantic_type,
        statement_or_reference: i.statement_or_reference,
        item_id: i.item_id,
      }));

    const reasoning_run_id = reasoningResult
      ? args.reasoningRunId === undefined || args.reasoningRunId === null
        ? null
        : args.reasoningRunId
      : null;

    const projection_id = opts.idFactory("proj");
    const generated_at = opts.clock();
    const audit = {
      generated_at,
      engine_version: ENGINE_VERSION,
      policy_version: POLICY_VERSION,
      projection_model_version: PROJECTION_MODEL_VERSION,
      output_envelope_version: OUTPUT_ENVELOPE_VERSION,
      channel_policy_id: policy.policy_id || `${args.channel}_POLICY_V1`,
      fail_closed: false,
      llm_renderer: false,
    };

    const model = {
      projection_id,
      ies_id: ies.ies_id,
      ies_version: ies.ies_version,
      reasoning_run_id,
      channel: args.channel,
      projection_depth: args.projectionDepth,
      items: split.items,
      critical_invariants,
      deferred_items: split.deferred_items,
      limitations: limitations.slice(),
      audit,
    };

    const rendered = policy.render(model, opts.idFactory);
    const content_blocks = asArray(rendered && rendered.content_blocks);
    const deferred_content = asArray(rendered && rendered.deferred_content);
    const renderLimitations = asArray(rendered && rendered.limitations);
    model.limitations = model.limitations.concat(renderLimitations);

    const equivalence = validateCriticalEquivalence(model, ies, reasoningResult, content_blocks);
    if (!equivalence.ok) {
      throw structuralError("CRITICAL_EQUIVALENCE_FAILED", equivalence.errors.join("|"));
    }

    const output = {
      projection_id,
      channel: args.channel,
      projection_depth: args.projectionDepth,
      ies_id: ies.ies_id,
      reasoning_run_id,
      content_blocks,
      deferred_content,
      critical_invariants: cloneJson(critical_invariants),
      limitations: cloneJson(model.limitations),
      audit: Object.assign({}, audit),
    };

    return { projection_model: model, channel_output: output };
  }

  return { project };
}

module.exports = {
  createChannelProjection,
  createDefaultPolicyRegistry,
  validateCriticalEquivalence,
  CHANNELS,
  DEPTHS,
  SEMANTIC_TYPES,
  CONTENT_CLASSES,
  PRIORITIES,
  ENGINE_VERSION,
  POLICY_VERSION,
  PROJECTION_MODEL_VERSION,
  OUTPUT_ENVELOPE_VERSION,
  DEFAULT_RENDERERS,
};
