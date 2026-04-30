// MEMO INCOSE deck v2 — adds real ontology depth + customization story
const pptxgen = require("pptxgenjs");
const path = require("path");

const IMG = (f) => path.join("/Users/someshkashyap/Downloads/MEMO_INCOSE/images", f);

const C = {
  ink: "071F35", ink2: "0A2540", inkLight: "1E293B",
  teal: "2DD4AA", tealDeep: "0D8B6F", tealSoft: "E6FAF3",
  bg: "F5F7FA", card: "FFFFFF", border: "DBE2E8", borderLight: "EEF2F5",
  gray: "475569", gray2: "64748B", grayLight: "94A3B8",
  amber: "F59E0B", red: "DC2626", redSoft: "FFF5F5",
  violet: "8B5CF6", violetSoft: "EDE9FE",
  blue: "3B82F6", blueSoft: "DBEAFE",
  green: "10B981", yellow: "EAB308", coral: "EF6C5A",
  white: "FFFFFF",
  // Layer colors (from memo.rendering.yaml)
  L_operational: "C0392B", L_behavioral: "E74C3C", L_functional: "E67E22",
  L_logical: "7B68EE", L_software: "F39C12", L_softwareExt: "D4AC0D",
  L_hardware: "95A5A6", L_safety: "E74C3C", L_security: "2C3E50",
  L_privacy: "8E44AD", L_verification: "2ECC71",
  codeBg: "0F172A", codeFg: "E2E8F0", codeKey: "7DD3C0", codeStr: "FBBF24", codeNum: "F472B6",
};

const FONT = "Calibri", FONT_HEAD = "Calibri", FONT_MONO = "Consolas";
const W = 13.33, H = 7.5;
const TOTAL = 28;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.title = "MEMO — INCOSE 2026";
pres.author = "MEMO";

// ============= helpers =============

function badge(s, num, label) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.55, y: 0.4, w: 0.42, h: 0.42,
    fill: { color: C.tealDeep }, line: { color: C.tealDeep }, rectRadius: 0.06,
  });
  s.addText(num, { x: 0.55, y: 0.4, w: 0.42, h: 0.42, margin: 0, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT });
  s.addText(label, { x: 1.07, y: 0.4, w: 8, h: 0.42, margin: 0, fontSize: 11, bold: true, color: C.tealDeep, charSpacing: 4, valign: "middle", fontFace: FONT });
}

function badgeDark(s, num, label) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.55, y: 0.4, w: 0.42, h: 0.42,
    fill: { color: C.teal, transparency: 75 }, line: { color: C.teal, width: 1.5 }, rectRadius: 0.06,
  });
  s.addText(num, { x: 0.55, y: 0.4, w: 0.42, h: 0.42, margin: 0, fontSize: 14, bold: true, color: "7CE5C2", align: "center", valign: "middle", fontFace: FONT });
  s.addText(label, { x: 1.07, y: 0.4, w: 8, h: 0.42, margin: 0, fontSize: 11, bold: true, color: "7CE5C2", charSpacing: 4, valign: "middle", fontFace: FONT });
}

function footer(s, n) {
  s.addText("MEMO ONTOLOGY · INCOSE 2026", { x: 0.55, y: 7.05, w: 6, h: 0.3, margin: 0, fontSize: 9, color: C.grayLight, charSpacing: 3, fontFace: FONT });
  s.addText(String(n).padStart(2,"0") + " / " + String(TOTAL).padStart(2,"0"), { x: 11.78, y: 7.05, w: 1, h: 0.3, margin: 0, fontSize: 9, color: C.gray, bold: true, align: "right", charSpacing: 2, fontFace: FONT });
}

function title(s, t, sub) {
  s.addText(t, { x: 0.55, y: 1.0, w: 12.2, h: 0.9, margin: 0, fontSize: 36, bold: true, color: C.ink, fontFace: FONT_HEAD, charSpacing: -1 });
  if (sub) s.addText(sub, { x: 0.55, y: 1.92, w: 12.2, h: 0.55, margin: 0, fontSize: 15, color: C.gray, fontFace: FONT });
}

function callout(s, x, y, w, h, label, body, kind = "ok") {
  const bg = kind === "warn" ? C.redSoft : C.tealSoft;
  const bar = kind === "warn" ? C.red : C.tealDeep;
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: bg }, line: { color: bg } });
  s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.08, h, fill: { color: bar }, line: { color: bar } });
  s.addText([
    { text: label, options: { bold: true, color: bar } },
    { text: "  " + body, options: { color: C.ink } },
  ], { x: x + 0.22, y, w: w - 0.4, h, margin: 0, fontSize: 12.5, valign: "middle", fontFace: FONT });
}

function chip(s, x, y, w, h, label, accent) {
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: C.card }, line: { color: C.border, width: 1 } });
  s.addShape(pres.shapes.RECTANGLE, { x: x + 0.16, y, w: w - 0.32, h: 0.05, fill: { color: accent }, line: { color: accent } });
  s.addText(label, { x, y, w, h, margin: 0, fontSize: 12, bold: true, color: C.ink, align: "center", valign: "middle", fontFace: FONT });
}

function arrow(s, x, y, w, h) {
  s.addText("→", { x, y, w, h, margin: 0, fontSize: 18, color: C.grayLight, align: "center", valign: "middle", fontFace: FONT });
}

function panel(s, opts) {
  const { x, y, w, h, accent = C.teal, t, items } = opts;
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: C.card }, line: { color: C.border, width: 1 } });
  s.addShape(pres.shapes.RECTANGLE, { x: x + 0.18, y, w: w - 0.36, h: 0.06, fill: { color: accent }, line: { color: accent } });
  s.addText(t, { x: x + 0.25, y: y + 0.16, w: w - 0.5, h: 0.4, margin: 0, fontSize: 14, bold: true, color: C.ink, fontFace: FONT_HEAD });
  s.addText(items.map((tt, i) => ({ text: tt, options: { bullet: true, breakLine: i < items.length - 1 } })), {
    x: x + 0.25, y: y + 0.66, w: w - 0.5, h: h - 0.8, margin: 0, fontSize: 11.5, color: C.gray, fontFace: FONT, paraSpaceAfter: 4,
  });
}

function card4(s, x, y, w, h, opts) {
  const { accent, t, body, iconText, iconBg } = opts;
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
  s.addShape(pres.shapes.RECTANGLE, { x: x + 0.18, y, w: w - 0.36, h: 0.06, fill: { color: accent }, line: { color: accent } });
  if (iconText) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.22, y: y + 0.25, w: 0.5, h: 0.5, fill: { color: iconBg }, line: { color: iconBg }, rectRadius: 0.08 });
    s.addText(iconText, { x: x + 0.22, y: y + 0.25, w: 0.5, h: 0.5, margin: 0, fontSize: 11, bold: true, color: accent, align: "center", valign: "middle", fontFace: FONT });
  }
  s.addText(t, { x: x + 0.22, y: y + (iconText ? 0.85 : 0.32), w: w - 0.44, h: 0.4, margin: 0, fontSize: 14, bold: true, color: C.ink, fontFace: FONT_HEAD });
  s.addText(body, { x: x + 0.22, y: y + (iconText ? 1.25 : 0.75), w: w - 0.44, h: h - (iconText ? 1.4 : 0.85), margin: 0, fontSize: 11.5, color: C.gray, fontFace: FONT });
}

// Code block — colored runs to imitate syntax highlighting
function codeBlock(s, x, y, w, h, runs) {
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: C.codeBg }, line: { color: C.codeBg } });
  s.addText(runs, { x: x + 0.25, y: y + 0.15, w: w - 0.5, h: h - 0.3, margin: 0, fontSize: 12, color: C.codeFg, fontFace: FONT_MONO, valign: "top" });
}

// ===========================================================================
// SLIDE 1 — Cover
// ===========================================================================
{ const s = pres.addSlide(); s.addImage({ path: IMG("01_MEMO_Ontology_Cover.png"), x: 0, y: 0, w: W, h: H }); }

// ===========================================================================
// SLIDE 2 — Story
// ===========================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.ink };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: H, fill: { color: "0A3550", transparency: 60 }, line: { color: "0A3550" } });
  badgeDark(s, "02", "STORY");
  s.addText([
    { text: "It is ", options: { color: "FFFFFF" } },
    { text: "11 p.m. before an audit.", options: { color: C.teal, bold: true } },
    { text: "  An engineer changes one line in ", options: { color: "FFFFFF" } },
    { text: "REQ-145", options: { color: C.teal, bold: true } },
    { text: ". The next morning, no one in the room can answer the question that follows: ", options: { color: "FFFFFF" } },
    { text: "\"What evidence is still valid?\"", options: { color: C.teal, bold: true } },
  ], { x: 0.9, y: 1.6, w: 11.5, h: 3.8, margin: 0, fontSize: 32, fontFace: FONT_HEAD, charSpacing: -0.5, paraSpaceAfter: 6 });
  s.addText("A small change. A clean diff. And a safety case that quietly stopped meaning what it said.", { x: 0.9, y: 5.6, w: 11.5, h: 0.6, margin: 0, fontSize: 16, color: "B8D4E3", fontFace: FONT, italic: true });
  s.addText("— A familiar story across regulated medical engineering", { x: 0.9, y: 6.4, w: 11.5, h: 0.4, margin: 0, fontSize: 11, color: "7CE5C2", charSpacing: 4, fontFace: FONT, bold: true });
}

// ===========================================================================
// SLIDES 3, 4 — Problem + Drift (images)
// ===========================================================================
{ const s = pres.addSlide(); s.addImage({ path: IMG("02_Problem_Evidence_Not_Stable.png"), x: 0, y: 0, w: W, h: H }); }
{ const s = pres.addSlide(); s.addImage({ path: IMG("03_Evidence_Drift.png"), x: 0, y: 0, w: W, h: H }); }

// ===========================================================================
// SLIDE 5 — Cost
// ===========================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "05", "WHY IT MATTERS");
  title(s, "Drift is expensive — and quiet", "Unverified change is the silent driver of recalls, rework, and audit findings.");
  const cards = [
    { t: "FDA recalls", body: "Software & traceability flagged in roughly one-fifth of Class II/III recalls (FDA MAUDE, 2023).", iconText: "21%", iconBg: C.tealSoft, accent: C.teal },
    { t: "Rework cost", body: "Late-stage requirement and risk rework absorbs 30–45% of typical V&V budgets.", iconText: "~40%", iconBg: "FEF3C7", accent: C.amber },
    { t: "Audit time", body: "Reconstructing a single broken trace before audit: days, not minutes.", iconText: "DAYS", iconBg: C.redSoft, accent: C.red },
    { t: "Lost confidence", body: "Each silent break weakens the safety case the next reviewer reads.", iconText: "↻", iconBg: C.violetSoft, accent: C.violet },
  ];
  const cw = 2.95, ch = 3.4, gap = 0.18;
  const sx = (W - cw * 4 - gap * 3) / 2;
  cards.forEach((c, i) => card4(s, sx + i * (cw + gap), 2.85, cw, ch, c));
  callout(s, 0.55, 6.45, 12.2, 0.55, "The cost is not the link.", "It is the doubt every broken link injects into the case.", "warn");
  footer(s, 5);
}

// ===========================================================================
// SLIDES 6,7,8 — Industry / Insight / Solution (images)
// ===========================================================================
{ const s = pres.addSlide(); s.addImage({ path: IMG("04_Industry_Context.png"), x: 0, y: 0, w: W, h: H }); }
{ const s = pres.addSlide(); s.addImage({ path: IMG("05_Key_Insight.png"), x: 0, y: 0, w: W, h: H }); }
{ const s = pres.addSlide(); s.addImage({ path: IMG("06_Our_Solution.png"), x: 0, y: 0, w: W, h: H }); }

// ===========================================================================
// SLIDE 9 — INCOSE framing
// ===========================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "09", "FRAMING · INCOSE");
  title(s, "Built on what you already practice", "MEMO is not a new methodology. It is a semantic layer underneath the methodologies your teams use.");
  const cards = [
    { t: "ISO/IEC/IEEE 42010", body: "Concerns → Viewpoints → Views → Models. MEMO supplies the typed elements that views reference.", iconText: "ISO", iconBg: C.tealSoft, accent: C.teal },
    { t: "Arcadia / MBSE", body: "Operational → System → Logical → Physical. MEMO names the layers, links them, and keeps them consistent.", iconText: "SE", iconBg: C.violetSoft, accent: C.violet },
    { t: "SysML v2", body: "Kinds and links live in SysML v2 source — parsed, version-controlled, diffable. The model is the artifact.", iconText: "v2", iconBg: C.blueSoft, accent: C.blue },
  ];
  const cw = 4.0, ch = 3.5, gap = 0.22;
  const sx = (W - cw * 3 - gap * 2) / 2;
  cards.forEach((c, i) => card4(s, sx + i * (cw + gap), 2.8, cw, ch, c));
  callout(s, 0.55, 6.45, 12.2, 0.55, "Position.", "MEMO sits between the standards (ISO 14971, IEC 62304) and the modeling tools — a domain ontology, not a new tool stack.");
  footer(s, 9);
}

// ===========================================================================
// SLIDE 10 — Loop
// ===========================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "10", "STORYLINE");
  title(s, "Architecture-centered MEMO loop", "Use MEMO as an iterative engineering loop — not a one-way checklist.");

  s.addText("CONTEXT", { x: 0.55, y: 3.2, w: 2.4, h: 0.3, margin: 0, fontSize: 11, bold: true, color: C.tealDeep, charSpacing: 3, fontFace: FONT });
  s.addText("stakeholders, care setting, intended use", { x: 0.55, y: 3.55, w: 2.4, h: 0.7, margin: 0, fontSize: 13, color: C.gray, fontFace: FONT });
  s.addText("VIEWS / DOCUMENTS", { x: 10.4, y: 3.2, w: 2.4, h: 0.3, margin: 0, fontSize: 11, bold: true, color: C.amber, charSpacing: 3, fontFace: FONT });
  s.addText("RMF · SDD · V&V · compiled views", { x: 10.4, y: 3.55, w: 2.4, h: 0.7, margin: 0, fontSize: 13, color: C.gray, fontFace: FONT });

  const cx = 6.65, cy = 4.2, nodeR = 0.85;
  s.addShape(pres.shapes.OVAL, { x: cx - 1.0, y: cy - 1.0, w: 2.0, h: 2.0, fill: { color: C.blue }, line: { color: C.blue } });
  s.addText([{ text: "Architecture", options: { bold: true, breakLine: true, fontSize: 16 } }, { text: "stable design backbone", options: { fontSize: 10, color: "DBEAFE" } }], { x: cx - 1.0, y: cy - 1.0, w: 2.0, h: 2.0, margin: 0, color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT });
  s.addShape(pres.shapes.OVAL, { x: cx - nodeR, y: cy - 3.05, w: nodeR * 2, h: nodeR * 2, fill: { color: C.violet }, line: { color: C.violet } });
  s.addText([{ text: "Behavior", options: { bold: true, breakLine: true, fontSize: 13 } }, { text: "+ scenarios", options: { bold: true, breakLine: true, fontSize: 13 } }, { text: "modes, contracts", options: { fontSize: 9, color: "EDE9FE" } }], { x: cx - nodeR, y: cy - 3.05, w: nodeR * 2, h: nodeR * 2, margin: 0, color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT });
  s.addShape(pres.shapes.OVAL, { x: cx - nodeR, y: cy + 1.35, w: nodeR * 2, h: nodeR * 2, fill: { color: "5B9BD5" }, line: { color: "5B9BD5" } });
  s.addText([{ text: "Requirements", options: { bold: true, breakLine: true, fontSize: 13 } }, { text: "needs + obligations", options: { fontSize: 9, color: "DBEAFE" } }], { x: cx - nodeR, y: cy + 1.35, w: nodeR * 2, h: nodeR * 2, margin: 0, color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT });
  s.addShape(pres.shapes.OVAL, { x: cx + 1.6, y: cy - nodeR, w: nodeR * 2, h: nodeR * 2, fill: { color: C.coral }, line: { color: C.coral } });
  s.addText([{ text: "Risk", options: { bold: true, breakLine: true, fontSize: 14 } }, { text: "hazard chains", options: { fontSize: 9, color: "FFE0DC" } }], { x: cx + 1.6, y: cy - nodeR, w: nodeR * 2, h: nodeR * 2, margin: 0, color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT });
  s.addShape(pres.shapes.OVAL, { x: cx - 3.3, y: cy - nodeR, w: nodeR * 2, h: nodeR * 2, fill: { color: C.green }, line: { color: C.green } });
  s.addText([{ text: "Assurance", options: { bold: true, breakLine: true, fontSize: 13 } }, { text: "verification", options: { fontSize: 9, color: "D1FAE5" } }], { x: cx - 3.3, y: cy - nodeR, w: nodeR * 2, h: nodeR * 2, margin: 0, color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT });

  callout(s, 0.55, 6.45, 12.2, 0.55, "Practitioner sequence.", "Architecture → behavior/scenarios → risk → requirements + assurance, then iterate back through architecture.");
  footer(s, 10);
}

// ===========================================================================
// SLIDE 11 — Hierarchy mental model
// ===========================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "11", "ONTOLOGY HIERARCHY");
  title(s, "Keep the mental model small", "A stable core. Architecture, process, extensions, and examples around it.");
  const rows = [
    { name: "Core",         meaning: "traceable elements + typed links",                      pill: "stable semantics",   color: C.teal },
    { name: "Architecture", meaning: "context, behavior, risk, requirements, assurance",      pill: "model the system",   color: C.blue },
    { name: "Process",      meaning: "viewpoints, rules, gates, document views",              pill: "apply the method",   color: C.violet },
    { name: "Extensions",   meaning: "cybersecurity, usability, AI/ML, device-specific",      pill: "add domain depth",   color: C.amber },
    { name: "Examples",     meaning: "GPCA-style worked trace threads",                       pill: "learn by reference", color: C.green },
  ];
  const rh = 0.7, gap = 0.12;
  rows.forEach((r, i) => {
    const y = 2.85 + i * (rh + gap);
    s.addShape(pres.shapes.RECTANGLE, { x: 0.85, y, w: 11.6, h: rh, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.85, y: y + 0.1, w: 0.1, h: rh - 0.2, fill: { color: r.color }, line: { color: r.color } });
    s.addText(r.name, { x: 1.15, y, w: 2.3, h: rh, margin: 0, fontSize: 18, bold: true, color: C.ink, valign: "middle", fontFace: FONT_HEAD });
    s.addText(r.meaning, { x: 3.5, y, w: 6.1, h: rh, margin: 0, fontSize: 13, color: C.gray, valign: "middle", fontFace: FONT });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 9.85, y: y + 0.13, w: 2.45, h: 0.44, fill: { color: C.white }, line: { color: C.border, width: 1 }, rectRadius: 0.22 });
    s.addText(r.pill, { x: 9.85, y: y + 0.13, w: 2.45, h: 0.44, margin: 0, fontSize: 10, bold: true, color: C.inkLight, align: "center", valign: "middle", fontFace: FONT });
  });
  callout(s, 0.55, 6.85, 12.2, 0.45, "Rule.", "Extend by packages and profiles. Do not keep expanding the core vocabulary.");
  footer(s, 11);
}

// ===========================================================================
// SLIDE 12 — BY THE NUMBERS (NEW)
// ===========================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "12", "ONTOLOGY DEPTH");
  title(s, "MEMO ontology — by the numbers", "What the open-source release ships today. Real, parseable, version-controlled.");

  const stats = [
    { v: "11", k: "ARCHITECTURE LAYERS", d: "Operational → Verification, Apollo-11 pattern",  c: C.teal },
    { v: "56", k: "TYPED KINDS",          d: "part def in ontology-arch SysML packages",       c: C.blue },
    { v: "42", k: "TYPED RELATIONSHIPS",  d: "connection def — structural + traceability + safety", c: C.violet },
    { v: "8",  k: "PROCESS STANDARDS",    d: "ISO 14971 · IEC 62304 · ISO 13485 · 14155 · 60601 · 27001/27701 · FDA · MDR", c: C.amber },
    { v: "9",  k: "VIEWPOINTS",           d: "risk · safety · software · security · privacy · clinical · hardware · ROS · QMS", c: C.coral },
    { v: "35", k: "CLOSURE RULES",        d: "Declarative validation; ISO 14971 + IEC 62304 baked in",  c: C.green },
    { v: "5",  k: "DEVICE TEMPLATES",     d: "infusion-pump · ventilator · monitoring · SaMD · connected", c: "5B9BD5" },
    { v: "3",  k: "PROFILE SIZES",        d: "minimal · standard · full — pick scope for class",       c: C.tealDeep },
  ];

  const cw = 2.95, ch = 1.95, gap = 0.18;
  const sx = (W - cw * 4 - gap * 3) / 2;
  stats.forEach((st, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = sx + col * (cw + gap), y = 2.85 + row * (ch + gap);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: cw, h: ch, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.18, y, w: cw - 0.36, h: 0.06, fill: { color: st.c }, line: { color: st.c } });
    s.addText(st.v, { x: x + 0.22, y: y + 0.18, w: cw - 0.44, h: 0.85, margin: 0, fontSize: 54, bold: true, color: st.c, fontFace: FONT_HEAD, charSpacing: -1 });
    s.addText(st.k, { x: x + 0.22, y: y + 1.05, w: cw - 0.44, h: 0.32, margin: 0, fontSize: 9.5, bold: true, color: C.ink, charSpacing: 3, fontFace: FONT });
    s.addText(st.d, { x: x + 0.22, y: y + 1.4, w: cw - 0.44, h: 0.5, margin: 0, fontSize: 9.5, color: C.gray, fontFace: FONT });
  });

  callout(s, 0.55, 7.0, 12.2, 0.0, "", "");  // skip — no callout, just footer below
  footer(s, 12);
}

// ===========================================================================
// SLIDE 13 — 11 ARCHITECTURE LAYERS (NEW)
// ===========================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "13", "ARCHITECTURE ONTOLOGY");
  title(s, "Eleven layers, one Apollo-11 pattern", "Directory = layer. Drop a .sysml file under sysml/<layer>/ and the architecture layer is derived from its path.");

  const layers = [
    { name: "Operational",          defs: 5, color: C.L_operational,  blurb: "Actor, UseContext, OperationalActivity" },
    { name: "Behavioral",           defs: 7, color: C.L_behavioral,   blurb: "BehaviorMachine, ModeState, Transition" },
    { name: "Functional",           defs: 3, color: C.L_functional,   blurb: "LogicalFunction, LogicalFlow" },
    { name: "Logical",              defs: 3, color: C.L_logical,      blurb: "LogicalComponent, Interface" },
    { name: "Software",             defs: 4, color: C.L_software,     blurb: "SoftwareComponent, SoftwareInterface" },
    { name: "Software-Ext (ROS)",   defs: 5, color: C.L_softwareExt,  blurb: "Node, Topic, Service — ROS 2 middleware" },
    { name: "Hardware",             defs: 5, color: C.L_hardware,     blurb: "HardwareAssembly, Sensor, Actuator" },
    { name: "Safety",               defs: 7, color: C.L_safety,       blurb: "Hazard, Harm, Risk, Mitigation (ISO 14971)" },
    { name: "Security",             defs: 4, color: C.L_security,     blurb: "ThreatModel, SecurityControl" },
    { name: "Privacy",              defs: 5, color: C.L_privacy,      blurb: "PersonalData, ProcessingActivity" },
    { name: "Verification",         defs: 5, color: C.L_verification, blurb: "VerificationCase, TestArtifact, Evidence" },
  ];

  // 2 columns × 6 rows
  const rh = 0.55, gap = 0.07;
  const colW = 6.0;
  layers.forEach((l, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.55 + col * (colW + 0.3);
    const y = 2.75 + row * (rh + gap);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: colW, h: rh, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.16, h: rh, fill: { color: l.color }, line: { color: l.color } });
    s.addText(l.name, { x: x + 0.3, y, w: 2.4, h: rh, margin: 0, fontSize: 13, bold: true, color: C.ink, valign: "middle", fontFace: FONT_HEAD });
    s.addText(String(l.defs) + " kinds", { x: x + 2.7, y, w: 1.2, h: rh, margin: 0, fontSize: 11, bold: true, color: l.color, valign: "middle", fontFace: FONT });
    s.addText(l.blurb, { x: x + 3.9, y, w: colW - 4.0, h: rh, margin: 0, fontSize: 10.5, color: C.gray, valign: "middle", fontFace: FONT });
  });

  // Plus relationships row
  const x = 0.55, y = 2.75 + 6 * (rh + gap);
  s.addShape(pres.shapes.RECTANGLE, { x, y, w: 12.25, h: rh, fill: { color: C.tealSoft }, line: { color: C.tealDeep, width: 1 } });
  s.addText("+ Relationships", { x: x + 0.3, y, w: 2.4, h: rh, margin: 0, fontSize: 13, bold: true, color: C.tealDeep, valign: "middle", fontFace: FONT_HEAD });
  s.addText("42 connection defs", { x: x + 2.7, y, w: 2.0, h: rh, margin: 0, fontSize: 11, bold: true, color: C.tealDeep, valign: "middle", fontFace: FONT });
  s.addText("Composition, Dependency, Realization, TraceTo, Refines, Allocates, Mitigates, Causes, Verifies, …", { x: x + 4.7, y, w: 7.5, h: rh, margin: 0, fontSize: 10.5, color: C.ink, valign: "middle", fontFace: FONT });

  footer(s, 13);
}

// ===========================================================================
// SLIDE 14 — 8 PROCESS STANDARDS (NEW)
// ===========================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "14", "PROCESS ONTOLOGY");
  title(s, "Eight regulatory standards as first-class kinds", "Process artifacts (plans, reports, activities) live next to the architecture they govern.");

  const standards = [
    { name: "ISO 14971",           topic: "Risk management",         defs: 7,  c: C.coral,   k: "RiskManagementPlan, HazardAnalysisActivity, ResidualRiskEvaluation, BenefitRiskAssessment …" },
    { name: "IEC 62304",           topic: "Software lifecycle",      defs: 12, c: C.amber,   k: "SoftwarePlan, SoftwareSafetyClass, ProblemReport, AnomalyResolution, ChangeRequest …" },
    { name: "ISO 13485",           topic: "Quality management",      defs: 13, c: C.violet,  k: "QualityPolicy, ManagementReview, DesignReview, CAPAActivity, DesignHistoryFile …" },
    { name: "ISO 14155",           topic: "Clinical investigation",  defs: 7,  c: C.blue,    k: "ClinicalInvestigationPlan, InvestigatorBrochure, CRF, AdverseEvent …" },
    { name: "IEC 60601",           topic: "Electrical safety",       defs: 4,  c: C.green,   k: "EssentialPerformance, BasicSafetyTest, ElectromagneticTest …" },
    { name: "ISO 27001 / 27701",   topic: "Security & privacy",      defs: 6,  c: C.L_security, k: "ISMSScope, RiskTreatmentPlan, PIMSPolicy, DataSubjectRequest …" },
    { name: "FDA 21 CFR 820",      topic: "QSR",                     defs: 5,  c: C.tealDeep,k: "DesignControlActivity, DeviceMasterRecord, DesignHistoryFile (US) …" },
    { name: "EU MDR",              topic: "Conformity",              defs: 5,  c: "5B9BD5",  k: "TechnicalDocumentation, ClinicalEvaluation, PMSPlan, DeclarationOfConformity …" },
  ];

  const cw = 6.0, ch = 0.95, gap = 0.12;
  standards.forEach((st, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.55 + col * (cw + 0.3);
    const y = 2.75 + row * (ch + gap);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: cw, h: ch, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.18, h: ch, fill: { color: st.c }, line: { color: st.c } });
    s.addText(st.name, { x: x + 0.32, y: y + 0.08, w: 2.5, h: 0.32, margin: 0, fontSize: 14, bold: true, color: C.ink, fontFace: FONT_HEAD });
    s.addText(st.topic, { x: x + 0.32, y: y + 0.42, w: 2.5, h: 0.3, margin: 0, fontSize: 10.5, color: st.c, charSpacing: 2, bold: true, fontFace: FONT });
    s.addText(String(st.defs) + " kinds", { x: x + 2.85, y: y + 0.08, w: 1.0, h: 0.32, margin: 0, fontSize: 11, bold: true, color: st.c, fontFace: FONT });
    s.addText(st.k, { x: x + 2.85, y: y + 0.42, w: cw - 3.0, h: 0.5, margin: 0, fontSize: 9.5, color: C.gray, fontFace: FONT, italic: true });
  });
  footer(s, 14);
}

// ===========================================================================
// SLIDE 15 — Architecture layer detail
// ===========================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "15", "ARCHITECTURE LAYER");
  title(s, "Start with architecture viewpoints", "Arcadia-inspired flow: separate need from solution; then context → functions → logical → realization.");
  const panels = [
    { t: "Viewpoints",          accent: C.green, items: ["context and operational intent","functional chains and flows","logical structure and interfaces","software / hardware realization","constraint definitions"] },
    { t: "MEMO elements",       accent: C.blue,  items: ["Actor, UseContext","LogicalFunction, LogicalFlow","LogicalComponent, Interface","SoftwareComponent, HardwareAssembly","constraints & allocations"] },
    { t: "Architect questions", accent: C.green, items: ["who owns each responsibility?","where do interfaces and timing matter?","which elements implement safety controls?","what changes when a design decision changes?"] },
  ];
  const pw = 4.0, ph = 3.55, gap = 0.22;
  const sx = (W - pw * 3 - gap * 2) / 2;
  panels.forEach((p, i) => panel(s, { x: sx + i * (pw + gap), y: 2.8, w: pw, h: ph, ...p }));
  callout(s, 0.55, 6.55, 12.2, 0.45, "Takeaway.", "Architecture is the backbone that behavior, risk, requirements, and evidence attach to.");
  footer(s, 15);
}

// ===========================================================================
// SLIDE 16 — Behavior + scenarios
// ===========================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "16", "BEHAVIOR + SCENARIOS");
  title(s, "Walk scenarios before formalizing behavior", "Scenario analysis turns abstract architecture into observable system behavior.");
  const panels = [
    { t: "Scenario view",        accent: C.violet, items: ["actor + stimulus","system response","environment / assumptions","response measure"] },
    { t: "Behavior model",       accent: C.blue,   items: ["BehaviorMachine","ModeState, Transition","behavior properties","contracts"] },
    { t: "Architectural value",  accent: C.amber,  items: ["reveals missing interactions","surfaces timing assumptions","feeds hazard analysis","creates verification anchors"] },
  ];
  const pw = 4.0, ph = 2.9, gap = 0.22;
  const sx = (W - pw * 3 - gap * 2) / 2;
  panels.forEach((p, i) => panel(s, { x: sx + i * (pw + gap), y: 2.8, w: pw, h: ph, ...p }));

  const flowY = 6.05;
  const fc = [
    { l: "Normal scenario", c: C.violet }, { l: "Alternate flow", c: C.blue },
    { l: "Off-nominal behavior", c: C.coral }, { l: "Behavior property", c: C.green },
  ];
  const cw = 2.6, aw = 0.4;
  let xx = (W - (cw * 4 + aw * 3)) / 2;
  fc.forEach((c, i) => { chip(s, xx, flowY, cw, 0.75, c.l, c.c); xx += cw; if (i < fc.length - 1) { arrow(s, xx, flowY, aw, 0.75); xx += aw; } });
  footer(s, 16);
}

// ===========================================================================
// SLIDE 17 — Risk
// ===========================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "17", "RISK LAYER · ISO 14971");
  title(s, "Analyze risk from behavior and architecture", "Risk is most useful when the hazard chain points to scenarios, interfaces, allocations, and controls.");

  const flowY = 2.85;
  const fc = [
    { l: "Hazard", c: C.coral }, { l: "Sequence", c: C.amber }, { l: "Situation", c: C.yellow },
    { l: "Harm", c: C.blue }, { l: "Control", c: C.green }, { l: "Residual", c: C.violet },
  ];
  const cw = 1.65, aw = 0.28;
  let xx = (W - (cw * 6 + aw * 5)) / 2;
  fc.forEach((c, i) => { chip(s, xx, flowY, cw, 0.7, c.l, c.c); xx += cw; if (i < fc.length - 1) { arrow(s, xx, flowY, aw, 0.7); xx += aw; } });

  const panels = [
    { t: "Risk elements",       accent: C.coral, items: ["Hazard, Harm","SequenceOfEvents","HazardousSituation","RiskBefore / RiskAfter","RiskControl"] },
    { t: "Architect questions", accent: C.blue,  items: ["which scenario creates exposure?","which element implements the control?","what must be segregated?","what must be verified?"] },
    { t: "GPCA example",        accent: C.green, items: ["overdose hazard","frequent bolus sequence","excess infusion situation","lockout control"] },
  ];
  const pw = 4.0, ph = 2.9, gap = 0.22;
  const sx = (W - pw * 3 - gap * 2) / 2;
  panels.forEach((p, i) => panel(s, { x: sx + i * (pw + gap), y: 3.85, w: pw, h: ph, ...p }));
  footer(s, 17);
}

// ===========================================================================
// SLIDE 18 — Requirements
// ===========================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "18", "REQUIREMENTS LAYER");
  title(s, "Stabilize intent after design and risk insight", "Requirements capture agreed obligations — quality depends on architecture, behavior, and risk analysis.");
  const panels = [
    { t: "Inputs",            accent: C.blue,   items: ["stakeholder needs","scenario findings","risk controls","architecture decisions"] },
    { t: "Requirement model", accent: C.violet, items: ["Requirement","SystemRequirement","SoftwareRequirement","HardwareRequirement","acceptance criteria"] },
    { t: "Typed links",       accent: C.green,  items: ["source link","satisfaction link","allocation link","verification link"] },
  ];
  const pw = 4.0, ph = 2.9, gap = 0.22;
  const sx = (W - pw * 3 - gap * 2) / 2;
  panels.forEach((p, i) => panel(s, { x: sx + i * (pw + gap), y: 2.8, w: pw, h: ph, ...p }));

  const flowY = 6.05;
  const fc = [
    { l: "Need", c: C.teal }, { l: "Design insight", c: C.blue },
    { l: "Risk driver", c: C.coral }, { l: "Requirement", c: C.violet },
    { l: "Verification intent", c: C.green },
  ];
  const cw = 2.05, aw = 0.3;
  let xx = (W - (cw * 5 + aw * 4)) / 2;
  fc.forEach((c, i) => { chip(s, xx, flowY, cw, 0.75, c.l, c.c); xx += cw; if (i < fc.length - 1) { arrow(s, xx, flowY, aw, 0.75); xx += aw; } });
  footer(s, 18);
}

// ===========================================================================
// SLIDE 19 — Assurance
// ===========================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "19", "ASSURANCE + CLOSURE");
  title(s, "Close the safety thread with current evidence", "Goal: a checkable path from claim to current evidence — not more links.");

  const flowY = 2.85;
  const fc = [
    { l: "Claim", c: C.blue }, { l: "Realization", c: C.violet },
    { l: "VerificationCase", c: C.green }, { l: "Evidence", c: C.amber },
    { l: "Document view", c: C.teal },
  ];
  const cw = 2.05, aw = 0.3;
  let xx = (W - (cw * 5 + aw * 4)) / 2;
  fc.forEach((c, i) => { chip(s, xx, flowY, cw, 0.7, c.l, c.c); xx += cw; if (i < fc.length - 1) { arrow(s, xx, flowY, aw, 0.7); xx += aw; } });

  const panels = [
    { t: "Assurance elements",   accent: C.green, items: ["VerificationCase","TestArtifact","Evidence","VerificationLink","EvidenceProductionLink"] },
    { t: "Closure check",        accent: C.teal,  items: ["claim is allocated","control is realized","case is defined","evidence is current"] },
    { t: "Architectural value",  accent: C.blue,  items: ["impact analysis","stale evidence detection","audit-ready reasoning"] },
  ];
  const pw = 4.0, ph = 2.9, gap = 0.22;
  const sx = (W - pw * 3 - gap * 2) / 2;
  panels.forEach((p, i) => panel(s, { x: sx + i * (pw + gap), y: 3.85, w: pw, h: ph, ...p }));
  footer(s, 19);
}

// ===========================================================================
// SLIDE 20 — SysML kind anatomy (NEW — code excerpt)
// ===========================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "20", "ANATOMY OF A KIND");
  title(s, "A kind is just SysML v2 — diffable, parseable, owned", "Apollo-11 pattern: file path determines layer. Attributes define what the audit asks for.");

  // Code panel left
  const codeRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " MEMO_Ontology_Arch_Safety {\n\n  ", options: { color: C.codeFg } },
    { text: "// path = sysml/safety/safety.sysml\n  // → layer derived = safety\n\n  ", options: { color: "94A3B8", italic: true } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "Hazard", options: { color: C.codeStr, bold: true } },
    { text: " {\n    ", options: { color: C.codeFg } },
    { text: "attribute", options: { color: C.codeKey } },
    { text: " hazardId : ", options: { color: C.codeFg } },
    { text: "String", options: { color: C.codeNum } },
    { text: ";\n    ", options: { color: C.codeFg } },
    { text: "attribute", options: { color: C.codeKey } },
    { text: " title : ", options: { color: C.codeFg } },
    { text: "String", options: { color: C.codeNum } },
    { text: ";\n    ", options: { color: C.codeFg } },
    { text: "attribute", options: { color: C.codeKey } },
    { text: " category : ", options: { color: C.codeFg } },
    { text: "String", options: { color: C.codeNum } },
    { text: ";\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "Risk", options: { color: C.codeStr, bold: true } },
    { text: " {\n    ", options: { color: C.codeFg } },
    { text: "attribute", options: { color: C.codeKey } },
    { text: " initialSeverity   : SeverityLevel;\n    ", options: { color: C.codeFg } },
    { text: "attribute", options: { color: C.codeKey } },
    { text: " initialProbability: ProbabilityLevel;\n    ", options: { color: C.codeFg } },
    { text: "attribute", options: { color: C.codeKey } },
    { text: " residualSeverity  : SeverityLevel;\n    ", options: { color: C.codeFg } },
    { text: "attribute", options: { color: C.codeKey } },
    { text: " acceptability     : RiskAcceptability;\n  }\n}", options: { color: C.codeFg } },
  ];
  s.addShape(pres.shapes.RECTANGLE, { x: 0.55, y: 2.75, w: 7.6, h: 4.0, fill: { color: C.codeBg }, line: { color: C.codeBg } });
  s.addText("sysml/safety/safety.sysml", { x: 0.55, y: 2.75, w: 7.6, h: 0.34, margin: 0, fontSize: 10.5, color: "7CE5C2", charSpacing: 2, fontFace: FONT_MONO, valign: "middle", bold: true, align: "left" });
  s.addShape(pres.shapes.LINE, { x: 0.55, y: 3.1, w: 7.6, h: 0, line: { color: "1E293B", width: 0.5 } });
  s.addText(codeRuns, { x: 0.85, y: 3.18, w: 7.0, h: 3.5, margin: 0, fontSize: 11, fontFace: FONT_MONO, valign: "top" });

  // Right side — explanation
  const cardX = 8.4, cardW = 4.4;
  const items = [
    { h: "Path = layer", b: "sysml/safety/ → layer:safety. No layer field needed; the directory says it." },
    { h: "Attributes drive views", b: "severity, probability, acceptability — the columns the RMF view compiles from." },
    { h: "SysML v2, not YAML", b: "Diffable in git. Works with any v2 parser. The model is the source of truth." },
    { h: "Inheritance built in", b: ":> SuperType to refine kinds. Profiles extend Hazard with cybersecurity, usability, etc." },
  ];
  items.forEach((it, i) => {
    const y = 2.75 + i * 1.05;
    s.addShape(pres.shapes.RECTANGLE, { x: cardX, y, w: cardW, h: 0.9, fill: { color: C.tealSoft }, line: { color: C.tealSoft } });
    s.addShape(pres.shapes.RECTANGLE, { x: cardX, y, w: 0.06, h: 0.9, fill: { color: C.tealDeep }, line: { color: C.tealDeep } });
    s.addText(it.h, { x: cardX + 0.18, y: y + 0.08, w: cardW - 0.3, h: 0.32, margin: 0, fontSize: 13, bold: true, color: C.ink, fontFace: FONT_HEAD });
    s.addText(it.b, { x: cardX + 0.18, y: y + 0.4, w: cardW - 0.3, h: 0.5, margin: 0, fontSize: 10.5, color: C.gray, fontFace: FONT });
  });

  footer(s, 20);
}

// ===========================================================================
// SLIDE 21 — Closure rules YAML (NEW)
// ===========================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "21", "CLOSURE RULES");
  title(s, "Encode the standard, not the prose", "35 declarative rules. ISO 14971 + IEC 62304 obligations enforced on every build — no manual checklists.");

  // Code excerpt
  s.addShape(pres.shapes.RECTANGLE, { x: 0.55, y: 2.75, w: 7.6, h: 4.0, fill: { color: C.codeBg }, line: { color: C.codeBg } });
  s.addText("memo.rules.yaml", { x: 0.55, y: 2.75, w: 7.6, h: 0.34, margin: 0, fontSize: 10.5, color: "7CE5C2", charSpacing: 2, fontFace: FONT_MONO, bold: true, valign: "middle" });
  s.addShape(pres.shapes.LINE, { x: 0.55, y: 3.1, w: 7.6, h: 0, line: { color: "1E293B", width: 0.5 } });
  const yamlRuns = [
    { text: "closureRules:\n", options: { color: C.codeKey, bold: true } },
    { text: "  - id: ", options: { color: C.codeFg } },
    { text: "CR-MED-001\n", options: { color: C.codeStr } },
    { text: "    description: ", options: { color: C.codeFg } },
    { text: "\"Every Hazard must have at least one\n                  mitigates relationship (ISO 14971 §6)\"\n", options: { color: C.codeNum } },
    { text: "    entity: ", options: { color: C.codeFg } },
    { text: "Hazard\n", options: { color: C.codeStr } },
    { text: "    rule:\n", options: { color: C.codeFg } },
    { text: "      type: ", options: { color: C.codeFg } },
    { text: "requireRelationship\n", options: { color: C.codeStr } },
    { text: "      relationship: ", options: { color: C.codeFg } },
    { text: "mitigates\n", options: { color: C.codeStr } },
    { text: "      direction: ", options: { color: C.codeFg } },
    { text: "incoming\n", options: { color: C.codeStr } },
    { text: "      relatedKinds: [", options: { color: C.codeFg } },
    { text: "Mitigation", options: { color: C.codeStr } },
    { text: "]\n", options: { color: C.codeFg } },
    { text: "      min: ", options: { color: C.codeFg } },
    { text: "1\n", options: { color: C.codeNum } },
    { text: "    severity: ", options: { color: C.codeFg } },
    { text: "error\n\n", options: { color: "F87171", bold: true } },
    { text: "  - id: ", options: { color: C.codeFg } },
    { text: "CR-MED-004\n", options: { color: C.codeStr } },
    { text: "    description: ", options: { color: C.codeFg } },
    { text: "\"Every Risk must identify ≥1 Hazard\"", options: { color: C.codeNum } },
  ];
  s.addText(yamlRuns, { x: 0.85, y: 3.18, w: 7.0, h: 3.5, margin: 0, fontSize: 11, fontFace: FONT_MONO, valign: "top" });

  // Right column — rule taxonomy
  const cardX = 8.4, cardW = 4.4;
  s.addText("RULE TYPES", { x: cardX, y: 2.75, w: cardW, h: 0.3, margin: 0, fontSize: 10.5, bold: true, color: C.tealDeep, charSpacing: 3, fontFace: FONT });
  const ruleTypes = [
    { k: "requireRelationship", b: "minimum incoming/outgoing connections of a given kind" },
    { k: "requireAttribute",    b: "attribute is present and within enum/range" },
    { k: "forbidRelationship",  b: "specific connection types must not exist" },
    { k: "uniqueness",          b: "id or pair must be unique within scope" },
    { k: "transitiveClosure",   b: "trace must reach a target kind via N hops" },
  ];
  ruleTypes.forEach((rt, i) => {
    const y = 3.15 + i * 0.7;
    s.addShape(pres.shapes.RECTANGLE, { x: cardX, y, w: cardW, h: 0.6, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addText(rt.k, { x: cardX + 0.18, y: y + 0.05, w: cardW - 0.3, h: 0.28, margin: 0, fontSize: 11.5, bold: true, color: C.ink, fontFace: FONT_MONO });
    s.addText(rt.b, { x: cardX + 0.18, y: y + 0.32, w: cardW - 0.3, h: 0.28, margin: 0, fontSize: 9.5, color: C.gray, fontFace: FONT });
  });

  callout(s, 0.55, 6.85, 12.25, 0.45, "Why YAML.", "Lawyers, auditors, and engineers can all read the rules. Diff the file → diff the policy.");
  footer(s, 21);
}

// ===========================================================================
// SLIDE 22 — Viewpoints YAML (NEW)
// ===========================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "22", "VIEWPOINTS");
  title(s, "Viewpoints: declarative views over the same model", "9 ships in the box. Each viewpoint is a YAML document — visible kinds, relationships, layers, diagrams.");

  // Code left
  s.addShape(pres.shapes.RECTANGLE, { x: 0.55, y: 2.75, w: 7.6, h: 4.0, fill: { color: C.codeBg }, line: { color: C.codeBg } });
  s.addText("memo.viewpoints.yaml", { x: 0.55, y: 2.75, w: 7.6, h: 0.34, margin: 0, fontSize: 10.5, color: "7CE5C2", charSpacing: 2, fontFace: FONT_MONO, bold: true, valign: "middle" });
  s.addShape(pres.shapes.LINE, { x: 0.55, y: 3.1, w: 7.6, h: 0, line: { color: "1E293B", width: 0.5 } });
  const yamlRuns = [
    { text: "viewpoints:\n", options: { color: C.codeKey, bold: true } },
    { text: "  - id: ", options: { color: C.codeFg } },
    { text: "risk-overview\n", options: { color: C.codeStr } },
    { text: "    label: ", options: { color: C.codeFg } },
    { text: "Risk Overview (ISO 14971)\n", options: { color: C.codeNum } },
    { text: "    supportedDiagramTypes: [", options: { color: C.codeFg } },
    { text: "risk, req, pkg", options: { color: C.codeStr } },
    { text: "]\n", options: { color: C.codeFg } },
    { text: "    visibleKinds:\n", options: { color: C.codeFg } },
    { text: "      - Hazard\n      - HazardousSituation\n      - Harm\n      - Risk\n      - Mitigation\n      - VerificationCase\n      - Evidence\n", options: { color: C.codeStr } },
    { text: "    visibleRelationships:\n", options: { color: C.codeFg } },
    { text: "      - mitigates\n      - causes\n      - leadsTo\n      - identifiesRisk\n      - verifies\n      - producesEvidence\n", options: { color: C.codeStr } },
    { text: "    visibleLayers: [", options: { color: C.codeFg } },
    { text: "safety, verification", options: { color: C.codeStr } },
    { text: "]", options: { color: C.codeFg } },
  ];
  s.addText(yamlRuns, { x: 0.85, y: 3.18, w: 7.0, h: 3.5, margin: 0, fontSize: 10.5, fontFace: FONT_MONO, valign: "top" });

  // Right — list of shipped viewpoints
  const cardX = 8.4, cardW = 4.4;
  s.addText("SHIPS WITH MEMO", { x: cardX, y: 2.75, w: cardW, h: 0.3, margin: 0, fontSize: 10.5, bold: true, color: C.tealDeep, charSpacing: 3, fontFace: FONT });
  const vps = [
    { id: "risk-overview",         std: "ISO 14971" },
    { id: "safety-view",           std: "ISO 14971 + 60601" },
    { id: "software-view",         std: "IEC 62304" },
    { id: "security-view",         std: "ISO 27001 / 81001-5-1" },
    { id: "privacy-view",          std: "ISO 27701 / GDPR" },
    { id: "clinical-evidence-view",std: "ISO 14155 / MDR" },
    { id: "hardware-view",         std: "IEC 60601" },
    { id: "ros-view",              std: "Software-extension (ROS)" },
    { id: "qms-dhf-view",          std: "ISO 13485 / 21 CFR 820" },
  ];
  vps.forEach((v, i) => {
    const y = 3.15 + i * 0.4;
    s.addShape(pres.shapes.RECTANGLE, { x: cardX, y, w: cardW, h: 0.34, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addText(v.id, { x: cardX + 0.15, y, w: 2.0, h: 0.34, margin: 0, fontSize: 10.5, bold: true, color: C.ink, valign: "middle", fontFace: FONT_MONO });
    s.addText(v.std, { x: cardX + 2.2, y, w: cardW - 2.3, h: 0.34, margin: 0, fontSize: 9.5, color: C.gray, valign: "middle", fontFace: FONT });
  });

  footer(s, 22);
}

// ===========================================================================
// SLIDE 23 — GPCA worked thread
// ===========================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "23", "ONTOLOGY IN ACTION");
  title(s, "One GPCA-style closed thread", "Small enough to follow. Complete enough to prove the semantic backbone.");

  const steps = [
    { tag: "Need",          val: "needSafeTherapy",                color: C.green },
    { tag: "Requirement",   val: "reqLockout",                      color: "5B9BD5" },
    { tag: "Architecture",  val: "infusionMgr",                     color: C.violet },
    { tag: "Behavior",      val: "guaranteeLockoutPreventsBolus",   color: C.amber },
    { tag: "Risk control",  val: "prevent overdose during lockout", color: C.coral },
    { tag: "Verification",  val: "vcLockout",                       color: C.green },
    { tag: "Evidence",      val: "evidenceLockout",                 color: C.teal },
    { tag: "Document view", val: "rmfView",                         color: C.yellow },
  ];
  const stepX = 0.65, tagW = 1.6, valX = 2.35, valW = 3.4, stepH = 0.42, stepGap = 0.07, startY = 2.85;
  steps.forEach((st, i) => {
    const y = startY + i * (stepH + stepGap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: stepX, y, w: tagW, h: stepH, fill: { color: st.color }, line: { color: st.color }, rectRadius: 0.06 });
    s.addText(st.tag, { x: stepX, y, w: tagW, h: stepH, margin: 0, fontSize: 11, bold: true, color: C.white, align: "center", valign: "middle", fontFace: FONT });
    s.addText(st.val, { x: valX, y, w: valW, h: stepH, margin: 0, fontSize: 12, bold: true, color: C.ink, valign: "middle", fontFace: FONT_MONO });
    if (i < steps.length - 1) s.addText("↓", { x: stepX + tagW / 2 - 0.15, y: y + stepH - 0.02, w: 0.3, h: stepGap + 0.04, margin: 0, fontSize: 10, color: C.grayLight, align: "center", valign: "middle", fontFace: FONT });
  });

  const rightX = 6.4, rightW = 6.4;
  s.addShape(pres.shapes.RECTANGLE, { x: rightX, y: 2.85, w: rightW, h: 2.0, fill: { color: C.white }, line: { color: C.teal, width: 2 } });
  s.addText("Why this works", { x: rightX + 0.25, y: 2.95, w: rightW - 0.5, h: 0.4, margin: 0, fontSize: 16, bold: true, color: C.ink, fontFace: FONT_HEAD });
  s.addText([
    { text: "Path crosses architecture, behavior, risk, and evidence.", options: { bullet: true, breakLine: true } },
    { text: "Change impact is computed — not reconstructed.", options: { bullet: true, breakLine: true } },
    { text: "Document views compile from the same baseline.", options: { bullet: true } },
  ], { x: rightX + 0.25, y: 3.35, w: rightW - 0.5, h: 1.4, margin: 0, fontSize: 12.5, color: C.gray, fontFace: FONT, paraSpaceAfter: 4 });
  callout(s, rightX, 5.0, rightW, 1.4, "Slide takeaway.", "MEMO becomes useful when the safety argument and the architecture model live in the same semantic system.");
  footer(s, 23);
}

// ===========================================================================
// SLIDE 24 — CUSTOMIZATION: 4 EXTENSION PATHS (NEW)
// ===========================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "24", "CUSTOMIZATION");
  title(s, "Four ways to make MEMO yours", "Touch the layer that fits your need. The core stays stable; depth lives outside it.");

  const paths = [
    { num: "01", t: "Pick a profile size",     accent: C.teal,
      what: "minimal · standard · full",
      how:  "Set extends in memo.config.yaml. Selects which ontology packages get pulled in.",
      who:  "Class I prototype → Class III combination product." },
    { num: "02", t: "Start from a device template", accent: C.blue,
      what: "5 starter SysML packages",
      how:  "memo init --template ventilator. Drops a working architecture, scenarios, and risk skeleton.",
      who:  "Teams shipping infusion pumps, ventilators, monitors, SaMD, connected devices." },
    { num: "03", t: "Author a viewpoint",      accent: C.violet,
      what: "YAML — kinds, relations, layers",
      how:  "Add to memo.viewpoints.yaml. Compiler renders a new diagram type and document view.",
      who:  "Reviewers who need a custom slice (e.g. cybersecurity-only DHF)." },
    { num: "04", t: "Author closure rules",    accent: C.amber,
      what: "YAML — declarative validation",
      how:  "Add to memo.rules.yaml. Run on every build; CI fails if policy is violated.",
      who:  "Quality leads encoding company-specific gates." },
  ];

  const cw = 2.95, ch = 3.6, gap = 0.18;
  const sx = (W - cw * 4 - gap * 3) / 2;
  paths.forEach((p, i) => {
    const x = sx + i * (cw + gap), y = 2.8;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: cw, h: ch, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.18, y, w: cw - 0.36, h: 0.06, fill: { color: p.accent }, line: { color: p.accent } });
    // Big number
    s.addText(p.num, { x: x + 0.22, y: y + 0.2, w: 1.0, h: 0.5, margin: 0, fontSize: 24, bold: true, color: p.accent, fontFace: FONT_HEAD });
    s.addText(p.t, { x: x + 0.22, y: y + 0.7, w: cw - 0.44, h: 0.6, margin: 0, fontSize: 15, bold: true, color: C.ink, fontFace: FONT_HEAD });
    // What
    s.addText("WHAT", { x: x + 0.22, y: y + 1.45, w: cw - 0.44, h: 0.22, margin: 0, fontSize: 9, bold: true, color: p.accent, charSpacing: 2.5, fontFace: FONT });
    s.addText(p.what, { x: x + 0.22, y: y + 1.63, w: cw - 0.44, h: 0.3, margin: 0, fontSize: 11, color: C.ink, fontFace: FONT_MONO });
    // How
    s.addText("HOW", { x: x + 0.22, y: y + 2.0, w: cw - 0.44, h: 0.22, margin: 0, fontSize: 9, bold: true, color: p.accent, charSpacing: 2.5, fontFace: FONT });
    s.addText(p.how, { x: x + 0.22, y: y + 2.18, w: cw - 0.44, h: 0.7, margin: 0, fontSize: 10, color: C.gray, fontFace: FONT });
    // Who
    s.addText("WHO", { x: x + 0.22, y: y + 2.92, w: cw - 0.44, h: 0.22, margin: 0, fontSize: 9, bold: true, color: p.accent, charSpacing: 2.5, fontFace: FONT });
    s.addText(p.who, { x: x + 0.22, y: y + 3.1, w: cw - 0.44, h: 0.45, margin: 0, fontSize: 10, color: C.gray, fontFace: FONT, italic: true });
  });

  // Plus a 5th — extending kinds via SysML
  callout(s, 0.55, 6.55, 12.2, 0.55,
    "Plus.",
    "Add new kinds — drop a .sysml in your own package; Apollo-11 path determines layer; importable as a profile.");
  footer(s, 24);
}

// ===========================================================================
// SLIDE 25 — Profiles + device templates (NEW)
// ===========================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "25", "PROFILES + TEMPLATES");
  title(s, "Pick the scope. Pick the device. Start modeling.", "Profile size selects the regulatory surface. Device template seeds the model.");

  // Profile sizes — left
  s.addText("PROFILE SIZES", { x: 0.55, y: 2.75, w: 5.5, h: 0.3, margin: 0, fontSize: 11, bold: true, color: C.tealDeep, charSpacing: 3, fontFace: FONT });
  const profiles = [
    { name: "Minimal",  kinds: "~53 kinds",  use: "Class I, prototypes",      pkgs: "ontology-arch only", c: C.green },
    { name: "Standard", kinds: "~120 kinds", use: "Class II, regulated SW",   pkgs: "+ process + IEC 62304", c: C.blue },
    { name: "Full",     kinds: "200+ kinds", use: "Class III, combination",   pkgs: "+ cybersecurity + clinical", c: C.violet },
  ];
  profiles.forEach((p, i) => {
    const y = 3.1 + i * 1.05;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.55, y, w: 5.7, h: 0.95, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.55, y, w: 0.16, h: 0.95, fill: { color: p.c }, line: { color: p.c } });
    s.addText(p.name, { x: 0.85, y: y + 0.1, w: 1.6, h: 0.34, margin: 0, fontSize: 16, bold: true, color: C.ink, fontFace: FONT_HEAD });
    s.addText(p.kinds, { x: 0.85, y: y + 0.46, w: 1.6, h: 0.32, margin: 0, fontSize: 11, bold: true, color: p.c, fontFace: FONT });
    s.addText("FOR", { x: 2.55, y: y + 0.1, w: 0.5, h: 0.28, margin: 0, fontSize: 8.5, bold: true, color: C.grayLight, charSpacing: 2, fontFace: FONT });
    s.addText(p.use, { x: 2.55, y: y + 0.32, w: 1.5, h: 0.28, margin: 0, fontSize: 11, color: C.ink, fontFace: FONT });
    s.addText("PACKAGES", { x: 2.55, y: y + 0.56, w: 1.0, h: 0.28, margin: 0, fontSize: 8.5, bold: true, color: C.grayLight, charSpacing: 2, fontFace: FONT });
    s.addText(p.pkgs, { x: 2.55, y: y + 0.73, w: 3.5, h: 0.22, margin: 0, fontSize: 10, color: C.gray, fontFace: FONT_MONO });
  });

  // Device templates — right
  s.addText("DEVICE TEMPLATES", { x: 6.5, y: 2.75, w: 5.5, h: 0.3, margin: 0, fontSize: 11, bold: true, color: C.tealDeep, charSpacing: 3, fontFace: FONT });
  const templates = [
    { name: "infusion-pump",     blurb: "GPCA-style; bolus modes, lockout safety", c: C.coral },
    { name: "ventilator",        blurb: "ventilation modes, alarm priorities",      c: C.blue },
    { name: "monitoring-device", blurb: "physiological sensing, alarm chains",      c: C.green },
    { name: "samd",              blurb: "Software as a Medical Device, no hardware",c: C.violet },
    { name: "connected-device",  blurb: "BLE/Wi-Fi, MDS², cybersecurity baseline",  c: C.tealDeep },
  ];
  templates.forEach((t, i) => {
    const y = 3.1 + i * 0.62;
    s.addShape(pres.shapes.RECTANGLE, { x: 6.5, y, w: 6.3, h: 0.55, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addShape(pres.shapes.RECTANGLE, { x: 6.5, y, w: 0.16, h: 0.55, fill: { color: t.c }, line: { color: t.c } });
    s.addText(t.name, { x: 6.8, y, w: 2.2, h: 0.55, margin: 0, fontSize: 12, bold: true, color: C.ink, valign: "middle", fontFace: FONT_MONO });
    s.addText(t.blurb, { x: 9.05, y, w: 3.7, h: 0.55, margin: 0, fontSize: 10.5, color: C.gray, valign: "middle", fontFace: FONT });
  });

  callout(s, 0.55, 6.5, 12.25, 0.5, "memo init --profile standard --template ventilator", "→ working SysML model + risk skeleton + viewpoints + closure rules in seconds.");
  footer(s, 25);
}

// ===========================================================================
// SLIDE 26 — WORKED CUSTOMIZATION (NEW)
// ===========================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "26", "WORKED CUSTOMIZATION");
  title(s, "Adding a ventilator-modes viewpoint", "Four steps. No tool plugin. Pure YAML + SysML.");

  const steps = [
    { num: "1", t: "Choose template",
      cmd: "memo init --template ventilator",
      blurb: "Seeds ventilation modes, alarm chains, safety classes." },
    { num: "2", t: "Add a kind (SysML)",
      cmd: "sysml/behavioral/ventilation_modes.sysml",
      blurb: "part def VentilationMode :> BehaviorMachine { … }" },
    { num: "3", t: "Author a closure rule",
      cmd: "memo.rules.yaml",
      blurb: "Every VentilationMode must have ≥1 SafetyAlarm via raisesAlarm." },
    { num: "4", t: "Define the viewpoint",
      cmd: "memo.viewpoints.yaml",
      blurb: "id: ventilator-modes-view → visibleKinds: [VentilationMode, SafetyAlarm, …]" },
  ];

  const cw = 2.95, ch = 3.5, gap = 0.18;
  const sx = (W - cw * 4 - gap * 3) / 2;
  steps.forEach((st, i) => {
    const x = sx + i * (cw + gap), y = 2.8;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: cw, h: ch, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addShape(pres.shapes.OVAL, { x: x + cw / 2 - 0.35, y: y + 0.28, w: 0.7, h: 0.7, fill: { color: C.tealDeep }, line: { color: C.tealDeep } });
    s.addText(st.num, { x: x + cw / 2 - 0.35, y: y + 0.28, w: 0.7, h: 0.7, margin: 0, fontSize: 24, bold: true, color: C.white, align: "center", valign: "middle", fontFace: FONT_HEAD });
    s.addText(st.t, { x: x + 0.22, y: y + 1.1, w: cw - 0.44, h: 0.6, margin: 0, fontSize: 16, bold: true, color: C.ink, align: "center", fontFace: FONT_HEAD });
    // Code line
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.22, y: y + 1.78, w: cw - 0.44, h: 0.55, fill: { color: C.codeBg }, line: { color: C.codeBg } });
    s.addText(st.cmd, { x: x + 0.32, y: y + 1.78, w: cw - 0.64, h: 0.55, margin: 0, fontSize: 10, color: "7CE5C2", valign: "middle", fontFace: FONT_MONO });
    // Blurb
    s.addText(st.blurb, { x: x + 0.22, y: y + 2.45, w: cw - 0.44, h: 0.95, margin: 0, fontSize: 11, color: C.gray, fontFace: FONT, align: "center" });
  });

  callout(s, 0.55, 6.55, 12.2, 0.5,
    "Result.",
    "memo dev compiles the viewpoint, validates closure rules, and renders the new diagram type. No code change in MEMO core.");
  footer(s, 26);
}

// ===========================================================================
// SLIDE 27 — Strategy 3 horizons
// ===========================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "27", "ADOPTION STRATEGY");
  title(s, "Three horizons, one trajectory", "An adoption-first roadmap that earns trust before it grows scope.");

  const horizons = [
    { num: "H1", when: "NOW · 2026", t: "Prove the backbone", items: [
      "open-source ontology + reference models (GPCA, infusion pump)",
      "SysML v2 source-of-truth, CLI + viewer",
      "worked safety threads as proof artifacts",
      "seed adoption with one design partner per modality",
    ]},
    { num: "H2", when: "2026–2027", t: "Compile compliance", items: [
      "auto-compiled RMF, SDD, V&V views from one model",
      "typed-link impact analysis & stale-evidence detection",
      "profiles: cybersecurity, usability, AI/ML, alarms",
      "integrate with existing PLM & ALM via export adapters",
    ]},
    { num: "H3", when: "2027+", t: "Ecosystem & assurance", items: [
      "device-specific profile registry",
      "auditor-readable assurance cases",
      "cross-domain bridges to ARP4761 / ISO 26262 patterns",
      "community-governed ontology evolution",
    ]},
  ];
  const hw = 4.0, hh = 3.7, gap = 0.22;
  const sx = (W - hw * 3 - gap * 2) / 2;
  horizons.forEach((h, i) => {
    const x = sx + i * (hw + gap);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.85, w: hw, h: hh, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + hw - 0.6, y: 3.0, w: 0.42, h: 0.42, fill: { color: C.tealSoft }, line: { color: C.tealSoft }, rectRadius: 0.06 });
    s.addText(h.num, { x: x + hw - 0.6, y: 3.0, w: 0.42, h: 0.42, margin: 0, fontSize: 12, bold: true, color: C.tealDeep, align: "center", valign: "middle", fontFace: FONT });
    s.addText(h.when, { x: x + 0.3, y: 3.0, w: hw - 1.0, h: 0.32, margin: 0, fontSize: 10, bold: true, color: C.tealDeep, charSpacing: 4, fontFace: FONT });
    s.addText(h.t, { x: x + 0.3, y: 3.4, w: hw - 0.6, h: 0.55, margin: 0, fontSize: 18, bold: true, color: C.ink, fontFace: FONT_HEAD });
    s.addText(h.items.map((tt, k) => ({ text: tt, options: { bullet: true, breakLine: k < h.items.length - 1 } })),
      { x: x + 0.3, y: 4.05, w: hw - 0.6, h: hh - 1.3, margin: 0, fontSize: 11.5, color: C.gray, fontFace: FONT, paraSpaceAfter: 4 });
  });
  callout(s, 0.55, 6.7, 12.2, 0.45, "Sequence.", "Unified model first, then compliance outputs, then ecosystem — never the other way around.");
  footer(s, 27);
}

// ===========================================================================
// SLIDE 28 — Call to action
// ===========================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.ink };
  s.addShape(pres.shapes.OVAL, { x: W - 4, y: -2, w: 8, h: 8, fill: { color: C.teal, transparency: 88 }, line: { color: C.ink } });
  badgeDark(s, "28", "NEXT STEP");
  s.addText([{ text: "Adopt the\n", options: { color: "FFFFFF" } }, { text: "semantic backbone.", options: { color: C.teal } }],
    { x: 0.7, y: 1.4, w: 11, h: 2.4, margin: 0, fontSize: 64, bold: true, fontFace: FONT_HEAD, charSpacing: -1.5 });
  s.addText("Build safer medical devices. Prove it with confidence.",
    { x: 0.7, y: 3.85, w: 11, h: 0.5, margin: 0, fontSize: 20, color: "B8D4E3", fontFace: FONT });

  const stats = [
    { k: "FASTER CHANGES", v: "with lower risk" },
    { k: "STRONGER CASES", v: "for regulators" },
    { k: "BETTER QUALITY", v: "less rework" },
  ];
  const sw = 3.7, sgap = 0.4, sxx = 0.7;
  stats.forEach((st, i) => {
    const x = sxx + i * (sw + sgap);
    if (i > 0) s.addShape(pres.shapes.LINE, { x: x - sgap / 2, y: 4.85, w: 0, h: 1.0, line: { color: "FFFFFF", width: 0.5, transparency: 70 } });
    s.addText(st.k, { x, y: 4.85, w: sw, h: 0.3, margin: 0, fontSize: 11, bold: true, color: "8FB5C9", charSpacing: 4, fontFace: FONT });
    s.addText([
      { text: "with ", options: { color: "FFFFFF" } },
      { text: st.v.replace("with ", ""), options: { color: C.teal, bold: true } },
    ], { x, y: 5.2, w: sw, h: 0.6, margin: 0, fontSize: 22, bold: true, fontFace: FONT_HEAD });
  });

  s.addText("GET INVOLVED", { x: 0.7, y: 6.45, w: 6, h: 0.3, margin: 0, fontSize: 11, bold: true, color: "8FB5C9", charSpacing: 4, fontFace: FONT });
  s.addText("github.com/memo-ontology · INCOSE Medical SE WG · Open source · SysML v2 · ISO 42010 aligned",
    { x: 0.7, y: 6.78, w: 9, h: 0.4, margin: 0, fontSize: 13, color: "FFFFFF", fontFace: FONT });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 11.2, y: 6.6, w: 0.5, h: 0.5, fill: { color: C.teal }, line: { color: C.teal }, rectRadius: 0.08 });
  s.addText("M", { x: 11.2, y: 6.6, w: 0.5, h: 0.5, margin: 0, fontSize: 22, bold: true, color: "04101E", align: "center", valign: "middle", fontFace: FONT_HEAD });
  s.addText("MEMO", { x: 11.78, y: 6.6, w: 1.5, h: 0.5, margin: 0, fontSize: 22, bold: true, color: "FFFFFF", valign: "middle", fontFace: FONT_HEAD });
}

pres.writeFile({ fileName: "/Users/someshkashyap/Downloads/MEMO_INCOSE/MEMO_INCOSE_v2.pptx" })
  .then(f => console.log("Wrote: " + f));
