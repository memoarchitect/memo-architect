// MEMO INCOSE deck v3 — concrete MEMO content
// Drops counts/generic walkthroughs. Adds: 2-package intro, real SysML elements,
// SysML v2 idioms, profile extension framework, GPCA worked examples.

const pptxgen = require("pptxgenjs");
const path = require("path");

const IMG = (f) => path.join("/Users/someshkashyap/Downloads/MEMO_INCOSE/images", f);

const C = {
  ink: "071F35", ink2: "0A2540", inkLight: "1E293B",
  teal: "2DD4AA", tealDeep: "0D8B6F", tealSoft: "E6FAF3",
  bg: "F5F7FA", card: "FFFFFF", border: "DBE2E8",
  gray: "475569", gray2: "64748B", grayLight: "94A3B8",
  amber: "F59E0B", red: "DC2626", redSoft: "FFF5F5",
  violet: "8B5CF6", violetSoft: "EDE9FE",
  blue: "3B82F6", blueSoft: "DBEAFE",
  green: "10B981", yellow: "EAB308", coral: "EF6C5A",
  white: "FFFFFF",
  L_operational: "C0392B", L_behavioral: "E74C3C", L_functional: "E67E22",
  L_logical: "7B68EE", L_software: "F39C12", L_softwareExt: "D4AC0D",
  L_hardware: "95A5A6", L_safety: "E74C3C", L_security: "2C3E50",
  L_privacy: "8E44AD", L_verification: "2ECC71",
  codeBg: "0F172A", codeFg: "E2E8F0", codeKey: "7DD3C0",
  codeStr: "FBBF24", codeNum: "F472B6", codeCmt: "94A3B8",
};

const FONT = "Calibri", FONT_HEAD = "Calibri", FONT_MONO = "Consolas";
const W = 13.33, H = 7.5;
const TOTAL = 26;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.title = "MEMO — INCOSE 2026";
pres.author = "MEMO";

// =========== helpers ===========
function badge(s, num, label) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.55, y: 0.4, w: 0.42, h: 0.42, fill: { color: C.tealDeep }, line: { color: C.tealDeep }, rectRadius: 0.06 });
  s.addText(num, { x: 0.55, y: 0.4, w: 0.42, h: 0.42, margin: 0, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT });
  s.addText(label, { x: 1.07, y: 0.4, w: 8, h: 0.42, margin: 0, fontSize: 11, bold: true, color: C.tealDeep, charSpacing: 4, valign: "middle", fontFace: FONT });
}
function badgeDark(s, num, label) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.55, y: 0.4, w: 0.42, h: 0.42, fill: { color: C.teal, transparency: 75 }, line: { color: C.teal, width: 1.5 }, rectRadius: 0.06 });
  s.addText(num, { x: 0.55, y: 0.4, w: 0.42, h: 0.42, margin: 0, fontSize: 14, bold: true, color: "7CE5C2", align: "center", valign: "middle", fontFace: FONT });
  s.addText(label, { x: 1.07, y: 0.4, w: 8, h: 0.42, margin: 0, fontSize: 11, bold: true, color: "7CE5C2", charSpacing: 4, valign: "middle", fontFace: FONT });
}
function footer(s, n) {
  s.addText("MEMO ONTOLOGY · INCOSE 2026", { x: 0.55, y: 7.05, w: 6, h: 0.3, margin: 0, fontSize: 9, color: C.grayLight, charSpacing: 3, fontFace: FONT });
  s.addText(String(n).padStart(2,"0") + " / " + String(TOTAL).padStart(2,"0"), { x: 11.78, y: 7.05, w: 1, h: 0.3, margin: 0, fontSize: 9, color: C.gray, bold: true, align: "right", charSpacing: 2, fontFace: FONT });
}
function title(s, t, sub) {
  s.addText(t, { x: 0.55, y: 1.0, w: 12.2, h: 0.9, margin: 0, fontSize: 34, bold: true, color: C.ink, fontFace: FONT_HEAD, charSpacing: -1 });
  if (sub) s.addText(sub, { x: 0.55, y: 1.92, w: 12.2, h: 0.55, margin: 0, fontSize: 15, color: C.gray, fontFace: FONT });
}
function callout(s, x, y, w, h, label, body, kind = "ok") {
  const bg = kind === "warn" ? C.redSoft : C.tealSoft;
  const bar = kind === "warn" ? C.red : C.tealDeep;
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: bg }, line: { color: bg } });
  s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.08, h, fill: { color: bar }, line: { color: bar } });
  s.addText([{ text: label, options: { bold: true, color: bar } }, { text: "  " + body, options: { color: C.ink } }],
    { x: x + 0.22, y, w: w - 0.4, h, margin: 0, fontSize: 12.5, valign: "middle", fontFace: FONT });
}
function chip(s, x, y, w, h, label, accent) {
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: C.card }, line: { color: C.border, width: 1 } });
  s.addShape(pres.shapes.RECTANGLE, { x: x + 0.16, y, w: w - 0.32, h: 0.05, fill: { color: accent }, line: { color: accent } });
  s.addText(label, { x, y, w, h, margin: 0, fontSize: 12, bold: true, color: C.ink, align: "center", valign: "middle", fontFace: FONT });
}
function arrow(s, x, y, w, h) {
  s.addText("→", { x, y, w, h, margin: 0, fontSize: 18, color: C.grayLight, align: "center", valign: "middle", fontFace: FONT });
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
function codePanel(s, x, y, w, h, fileLabel, runs) {
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: C.codeBg }, line: { color: C.codeBg } });
  s.addText(fileLabel, { x: x + 0.05, y, w: w - 0.1, h: 0.34, margin: 0, fontSize: 10, color: "7CE5C2", charSpacing: 2, fontFace: FONT_MONO, bold: true, valign: "middle" });
  s.addShape(pres.shapes.LINE, { x, y: y + 0.34, w, h: 0, line: { color: "1E293B", width: 0.5 } });
  s.addText(runs, { x: x + 0.25, y: y + 0.42, w: w - 0.5, h: h - 0.55, margin: 0, fontSize: 10.5, fontFace: FONT_MONO, valign: "top" });
}

// ============================================================================
// SLIDE 1 — Cover
// ============================================================================
{ const s = pres.addSlide(); s.addImage({ path: IMG("01_MEMO_Ontology_Cover.png"), x: 0, y: 0, w: W, h: H }); }

// ============================================================================
// SLIDE 2 — Story
// ============================================================================
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

// ============================================================================
// SLIDES 3,4 — Problem + Drift (images)
// ============================================================================
{ const s = pres.addSlide(); s.addImage({ path: IMG("02_Problem_Evidence_Not_Stable.png"), x: 0, y: 0, w: W, h: H }); }
{ const s = pres.addSlide(); s.addImage({ path: IMG("03_Evidence_Drift.png"), x: 0, y: 0, w: W, h: H }); }

// ============================================================================
// SLIDE 5 — Cost
// ============================================================================
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

// ============================================================================
// SLIDES 6,7,8 — Industry / Insight / Solution (images)
// ============================================================================
{ const s = pres.addSlide(); s.addImage({ path: IMG("04_Industry_Context.png"), x: 0, y: 0, w: W, h: H }); }
{ const s = pres.addSlide(); s.addImage({ path: IMG("05_Key_Insight.png"), x: 0, y: 0, w: W, h: H }); }
{ const s = pres.addSlide(); s.addImage({ path: IMG("06_Our_Solution.png"), x: 0, y: 0, w: W, h: H }); }

// ============================================================================
// SLIDE 9 — INCOSE framing
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "09", "FRAMING · INCOSE");
  title(s, "Built on what you already practice", "MEMO is not a new methodology. It is a semantic layer underneath the methodologies your teams use.");
  const cards = [
    { t: "ISO/IEC/IEEE 42010", body: "Concerns → Viewpoints → Views → Models. MEMO supplies the typed elements that views reference.", iconText: "ISO", iconBg: C.tealSoft, accent: C.teal },
    { t: "Arcadia-inspired", body: "Operational → System → Logical → Physical. MEMO names the layers; SysML v2 expresses them.", iconText: "MBSE", iconBg: C.violetSoft, accent: C.violet },
    { t: "SysML v2", body: "Kinds and links live in SysML v2 source — parsed, version-controlled, diffable. The model is the artifact.", iconText: "v2", iconBg: C.blueSoft, accent: C.blue },
  ];
  const cw = 4.0, ch = 3.5, gap = 0.22;
  const sx = (W - cw * 3 - gap * 2) / 2;
  cards.forEach((c, i) => card4(s, sx + i * (cw + gap), 2.8, cw, ch, c));
  callout(s, 0.55, 6.45, 12.2, 0.55, "Position.", "MEMO sits between the standards (ISO 14971, IEC 62304) and the modeling tools — a domain ontology, not a new tool stack.");
  footer(s, 9);
}

// ============================================================================
// SLIDE 10 — Architecture-centered loop
// ============================================================================
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

// ============================================================================
// SLIDE 11 — Two ontology packages (NEW — core MEMO intro)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "11", "MEMO PACKAGES");
  title(s, "MEMO ships two ontology packages", "One for what the device is. One for what the regulator demands. They are decoupled by design.");

  // Big two-card layout
  const archX = 0.7, procX = 6.95, cardW = 5.7, cardY = 2.8, cardH = 3.7;

  // Arch card
  s.addShape(pres.shapes.RECTANGLE, { x: archX, y: cardY, w: cardW, h: cardH, fill: { color: C.bg }, line: { color: C.blue, width: 2 } });
  s.addShape(pres.shapes.RECTANGLE, { x: archX, y: cardY, w: cardW, h: 0.5, fill: { color: C.blue }, line: { color: C.blue } });
  s.addText("@memo/ontology-arch", { x: archX + 0.25, y: cardY, w: cardW - 0.5, h: 0.5, margin: 0, fontSize: 14, bold: true, color: "FFFFFF", valign: "middle", fontFace: FONT_MONO });
  s.addText("THE SYSTEM YOU'RE BUILDING", { x: archX + 0.3, y: cardY + 0.62, w: cardW - 0.6, h: 0.3, margin: 0, fontSize: 11, bold: true, color: C.blue, charSpacing: 3, fontFace: FONT });
  s.addText("Architecture vocabulary", { x: archX + 0.3, y: cardY + 0.95, w: cardW - 0.6, h: 0.4, margin: 0, fontSize: 18, bold: true, color: C.ink, fontFace: FONT_HEAD });
  s.addText("System, Function, Component, Interface, State, Hazard, Risk, Requirement, VerificationCase, Evidence — and the typed relationships that connect them.", { x: archX + 0.3, y: cardY + 1.4, w: cardW - 0.6, h: 1.0, margin: 0, fontSize: 12, color: C.gray, fontFace: FONT });
  s.addText("11 LAYERS", { x: archX + 0.3, y: cardY + 2.55, w: cardW - 0.6, h: 0.3, margin: 0, fontSize: 10, bold: true, color: C.blue, charSpacing: 2.5, fontFace: FONT });
  s.addText("operational · functional · logical · behavioral · software · hardware · safety · security · privacy · verification (+ ROS extension)", { x: archX + 0.3, y: cardY + 2.85, w: cardW - 0.6, h: 0.7, margin: 0, fontSize: 11, color: C.ink, fontFace: FONT });

  // Process card
  s.addShape(pres.shapes.RECTANGLE, { x: procX, y: cardY, w: cardW, h: cardH, fill: { color: C.bg }, line: { color: C.violet, width: 2 } });
  s.addShape(pres.shapes.RECTANGLE, { x: procX, y: cardY, w: cardW, h: 0.5, fill: { color: C.violet }, line: { color: C.violet } });
  s.addText("@memo/ontology-process", { x: procX + 0.25, y: cardY, w: cardW - 0.5, h: 0.5, margin: 0, fontSize: 14, bold: true, color: "FFFFFF", valign: "middle", fontFace: FONT_MONO });
  s.addText("THE OBLIGATIONS YOU MUST MEET", { x: procX + 0.3, y: cardY + 0.62, w: cardW - 0.6, h: 0.3, margin: 0, fontSize: 11, bold: true, color: C.violet, charSpacing: 3, fontFace: FONT });
  s.addText("Regulatory vocabulary", { x: procX + 0.3, y: cardY + 0.95, w: cardW - 0.6, h: 0.4, margin: 0, fontSize: 18, bold: true, color: C.ink, fontFace: FONT_HEAD });
  s.addText("Plans, activities, work products, and records demanded by each standard — modeled as first-class kinds, not buried in templates.", { x: procX + 0.3, y: cardY + 1.4, w: cardW - 0.6, h: 1.0, margin: 0, fontSize: 12, color: C.gray, fontFace: FONT });
  s.addText("8 STANDARDS", { x: procX + 0.3, y: cardY + 2.55, w: cardW - 0.6, h: 0.3, margin: 0, fontSize: 10, bold: true, color: C.violet, charSpacing: 2.5, fontFace: FONT });
  s.addText("ISO 14971 · IEC 62304 · ISO 13485 · ISO 14155 · IEC 60601 · ISO 27001/27701 · FDA 21 CFR 820 · EU MDR", { x: procX + 0.3, y: cardY + 2.85, w: cardW - 0.6, h: 0.7, margin: 0, fontSize: 11, color: C.ink, fontFace: FONT });

  callout(s, 0.55, 6.7, 12.25, 0.5, "Why split.", "Architecture evolves with the device. Standards evolve on their own clock. Decoupling lets either change without rewriting the other.");
  footer(s, 11);
}

// ============================================================================
// SLIDE 12 — ontology-arch layer map (NEW)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "12", "ONTOLOGY-ARCH · LAYERS");
  title(s, "Architecture ontology: 11 layers from intent to evidence", "Layers progress from problem space to solution space. Each layer has its own kinds; relationships span layers.");

  // Visual layer column
  const layers = [
    { name: "Operational",    blurb: "System, Actor, IntendedUse, UserNeed",                color: C.L_operational, group: "intent" },
    { name: "Functional",     blurb: "Function, DataObject, ConstraintDefinition",          color: C.L_functional,  group: "intent" },
    { name: "Behavioral",     blurb: "Scenario, StateMachine, State, Action, Event, Transition", color: C.L_behavioral, group: "behavior" },
    { name: "Logical",        blurb: "LogicalComponent, Interface, Port",                   color: C.L_logical,     group: "structure" },
    { name: "Software",       blurb: "SoftwareComponent, SoftwareModule, ExecutionThread",  color: C.L_software,    group: "realize" },
    { name: "Software-Ext",   blurb: "ROS Node, Topic, Service (middleware)",               color: C.L_softwareExt, group: "realize" },
    { name: "Hardware",       blurb: "HardwareAssembly, Sensor, Actuator, Microcontroller", color: C.L_hardware,    group: "realize" },
    { name: "Safety",         blurb: "Hazard, HazardousSituation, Harm, Risk, Mitigation",  color: C.L_safety,      group: "concern" },
    { name: "Security",       blurb: "ThreatModel, ThreatScenario, SecurityControl",        color: C.L_security,    group: "concern" },
    { name: "Privacy",        blurb: "PersonalData, ProcessingActivity, DataSubjectRight",  color: C.L_privacy,     group: "concern" },
    { name: "Verification",   blurb: "Requirement, VerificationCase, TestArtifact, Evidence", color: C.L_verification, group: "evidence" },
  ];
  // 2 columns × 6 rows
  const colW = 6.0, rh = 0.55, gap = 0.07;
  layers.forEach((l, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.55 + col * (colW + 0.3);
    const y = 2.75 + row * (rh + gap);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: colW, h: rh, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.16, h: rh, fill: { color: l.color }, line: { color: l.color } });
    s.addText(l.name, { x: x + 0.3, y, w: 1.85, h: rh, margin: 0, fontSize: 13, bold: true, color: C.ink, valign: "middle", fontFace: FONT_HEAD });
    s.addText(l.blurb, { x: x + 2.2, y, w: colW - 2.3, h: rh, margin: 0, fontSize: 10.5, color: C.gray, valign: "middle", fontFace: FONT });
  });

  callout(s, 0.55, 6.85, 12.25, 0.45, "Reading.", "Operational + Functional describe intent. Logical + Software + Hardware describe solution. Safety/Security/Privacy/Verification describe concerns and evidence that span both.");
  footer(s, 12);
}

// ============================================================================
// SLIDE 13 — Architecture elements: real SysML (NEW)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "13", "ARCH ELEMENTS · STRUCTURE");
  title(s, "Real elements from operational, functional, logical layers", "Each layer is a SysML v2 package. Drop a .sysml in sysml/<layer>/ and you have added kinds.");

  // Two side-by-side code panels
  const leftRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " MEMO_Ontology_Arch_Operational {\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "Actor", options: { color: C.codeStr, bold: true } },
    { text: " {\n    attribute name : ", options: { color: C.codeFg } },
    { text: "String", options: { color: C.codeNum } },
    { text: ";\n    attribute role : ", options: { color: C.codeFg } },
    { text: "String", options: { color: C.codeNum } },
    { text: ";\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "IntendedUse", options: { color: C.codeStr, bold: true } },
    { text: " {\n    attribute statement       : String;\n    attribute patientPopulation: String;\n    attribute useEnvironment   : String;\n    attribute indications      : String;\n    attribute contraindications: String;\n  }\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 0.55, 2.75, 6.05, 4.0, "sysml/operational/operational.sysml", leftRuns);

  const rightRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " MEMO_Ontology_Arch_Functional {\n\n  ", options: { color: C.codeFg } },
    { text: "// SysML v2 idiom: Function = action def\n  ", options: { color: C.codeCmt, italic: true } },
    { text: "action def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "Function", options: { color: C.codeStr, bold: true } },
    { text: " {\n    attribute functionId : ", options: { color: C.codeFg } },
    { text: "String", options: { color: C.codeNum } },
    { text: ";\n    attribute safetyClass: ", options: { color: C.codeFg } },
    { text: "String", options: { color: C.codeNum } },
    { text: ";\n  }\n}\n\n", options: { color: C.codeFg } },
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " MEMO_Ontology_Arch_Logical {\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " LogicalComponent { … }\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " Interface { … }\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " Port { protocol, direction }\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 6.75, 2.75, 6.05, 4.0, "sysml/functional/ + sysml/logical/", rightRuns);

  callout(s, 0.55, 6.85, 12.25, 0.45, "SysML v2 idiom.", "Structure → part def. Function → action def. Both inherit attributes; both compose via connection def.");
  footer(s, 13);
}

// ============================================================================
// SLIDE 14 — Behavioral layer (NEW)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "14", "ARCH ELEMENTS · BEHAVIOR");
  title(s, "Behavior is first-class — scenarios, states, transitions", "State machines compose. Transitions are typed connections between states, with trigger / guard / effect.");

  const codeRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " MEMO_Ontology_Arch_Behavioral {\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "Scenario", options: { color: C.codeStr, bold: true } },
    { text: " {\n    attribute scenarioId   : String;\n    attribute precondition : String;\n    attribute postcondition: String;\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "action def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "Action", options: { color: C.codeStr, bold: true } },
    { text: " { attribute duration : String; }\n\n  ", options: { color: C.codeFg } },
    { text: "action def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "ClinicalAction", options: { color: C.codeStr, bold: true } },
    { text: " :> ", options: { color: C.codeFg } },
    { text: "Action", options: { color: C.codeStr } },
    { text: " {\n    attribute clinicalContext : String;\n    attribute appliedPartType : String;\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "State", options: { color: C.codeStr, bold: true } },
    { text: " {\n    attribute name      : String;\n    attribute isInitial : Boolean;\n    attribute invariant : String;\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "// Transition is a typed connection\n  ", options: { color: C.codeCmt, italic: true } },
    { text: "connection def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "Transition", options: { color: C.codeStr, bold: true } },
    { text: " {\n    end source : State [1];\n    end target : State [1];\n    attribute trigger : String;\n    attribute guard   : String;\n    attribute effect  : String;\n  }\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 0.55, 2.75, 7.5, 4.0, "sysml/behavioral/behavioral.sysml", codeRuns);

  // Right side commentary
  const cardX = 8.25, cardW = 4.55;
  const items = [
    { h: "Scenario = part def", b: "A named slice of behavior with pre/post conditions. Compose with action sequences." },
    { h: "Action = action def", b: "Inheritance built in: ClinicalAction :> Action picks up duration; adds clinical context." },
    { h: "State = part def", b: "States carry invariants. Hierarchical machines compose by part containment." },
    { h: "Transition = connection def", b: "Trigger/guard/effect on the relationship — not buried in a state body." },
  ];
  items.forEach((it, i) => {
    const y = 2.75 + i * 1.05;
    s.addShape(pres.shapes.RECTANGLE, { x: cardX, y, w: cardW, h: 0.95, fill: { color: C.violetSoft }, line: { color: C.violetSoft } });
    s.addShape(pres.shapes.RECTANGLE, { x: cardX, y, w: 0.06, h: 0.95, fill: { color: C.violet }, line: { color: C.violet } });
    s.addText(it.h, { x: cardX + 0.18, y: y + 0.08, w: cardW - 0.3, h: 0.32, margin: 0, fontSize: 13, bold: true, color: C.ink, fontFace: FONT_HEAD });
    s.addText(it.b, { x: cardX + 0.18, y: y + 0.4, w: cardW - 0.3, h: 0.55, margin: 0, fontSize: 10.5, color: C.gray, fontFace: FONT });
  });

  footer(s, 14);
}

// ============================================================================
// SLIDE 15 — Safety + Verification (NEW)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "15", "ARCH ELEMENTS · SAFETY + EVIDENCE");
  title(s, "Hazard chain and verification chain are typed kinds", "Severity / probability / acceptability are enums. Audit columns compile from these attributes.");

  const leftRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " MEMO_Ontology_Arch_Safety {\n\n  ", options: { color: C.codeFg } },
    { text: "enum def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "SeverityLevel", options: { color: C.codeStr, bold: true } },
    { text: " {\n    enum Negligible; enum Minor;\n    enum Serious;    enum Critical;\n    enum Catastrophic;\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "Hazard", options: { color: C.codeStr, bold: true } },
    { text: " {\n    attribute hazardId : String;\n    attribute category : String;\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "Risk", options: { color: C.codeStr, bold: true } },
    { text: " {\n    attribute initialSeverity   : SeverityLevel;\n    attribute initialProbability: ProbabilityLevel;\n    attribute residualSeverity  : SeverityLevel;\n    attribute acceptability     : RiskAcceptability;\n  }\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 0.55, 2.75, 6.05, 4.0, "sysml/safety/safety.sysml", leftRuns);

  const rightRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " MEMO_Ontology_Arch_Verification {\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "Requirement", options: { color: C.codeStr, bold: true } },
    { text: " {\n    attribute reqId              : String;\n    attribute statement          : String;\n    attribute verificationMethod : String;\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "VerificationCase", options: { color: C.codeStr, bold: true } },
    { text: " {\n    attribute method : String;\n    attribute status : String;\n    attribute result : String;\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "Evidence", options: { color: C.codeStr, bold: true } },
    { text: " {\n    attribute artifactType : String;\n    attribute version      : String;\n    attribute location     : String;\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "// Inheritance: Security/PrivacyRequirement :> Requirement\n}", options: { color: C.codeCmt, italic: true } },
  ];
  codePanel(s, 6.75, 2.75, 6.05, 4.0, "sysml/verification/verification.sysml", rightRuns);

  callout(s, 0.55, 6.85, 12.25, 0.45, "Why kinds, not strings.", "Severity = enum, not free-text. Validators check it. RMF view groups by it. Auditors trust it.");
  footer(s, 15);
}

// ============================================================================
// SLIDE 16 — Typed relationships (NEW)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "16", "TYPED RELATIONSHIPS");
  title(s, "Links carry meaning — not just direction", "Every relationship is a connection def with named ends. Tools enforce kind on each side.");

  // Left: code panel
  const codeRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " MEMO_Ontology_Arch_Relationships {\n\n  ", options: { color: C.codeFg } },
    { text: "// ── Structural ──────────────\n  ", options: { color: C.codeCmt, italic: true } },
    { text: "connection def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "ComposedOf", options: { color: C.codeStr, bold: true } },
    { text: " {\n    end whole[1]; end part[0..*];\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "// ── Traceability ────────────\n  ", options: { color: C.codeCmt, italic: true } },
    { text: "connection def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "Satisfies", options: { color: C.codeStr, bold: true } },
    { text: " {\n    end satisfiedBy[1];\n    end req : ", options: { color: C.codeFg } },
    { text: "Requirement", options: { color: C.codeStr } },
    { text: " [1];\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "connection def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "Verifies", options: { color: C.codeStr, bold: true } },
    { text: " {\n    end verificationCase: ", options: { color: C.codeFg } },
    { text: "VerificationCase", options: { color: C.codeStr } },
    { text: ";\n    end subject[1];\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "// ── Allocation ──────────────\n  ", options: { color: C.codeCmt, italic: true } },
    { text: "connection def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "AllocatedTo", options: { color: C.codeStr, bold: true } },
    { text: " {\n    end function : ", options: { color: C.codeFg } },
    { text: "Function", options: { color: C.codeStr } },
    { text: ";\n    end structure[1];\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "connection def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "DeployedOn", options: { color: C.codeStr, bold: true } },
    { text: " {\n    end software : ", options: { color: C.codeFg } },
    { text: "SoftwareComponent", options: { color: C.codeStr } },
    { text: ";\n    end hardware : ", options: { color: C.codeFg } },
    { text: "HardwareComponent", options: { color: C.codeStr } },
    { text: ";\n  }\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 0.55, 2.75, 6.5, 4.05, "sysml/relationships/relationships.sysml", codeRuns);

  // Right: relationship taxonomy
  const cardX = 7.2, cardW = 5.6;
  const groups = [
    { name: "Structural",   color: C.blue,  rels: "ComposedOf · DecomposedBy · Aggregation · Realization" },
    { name: "Traceability", color: C.green, rels: "TraceTo · Refines · Derives · Satisfies · Verifies · ProducesEvidence" },
    { name: "Allocation",   color: C.amber, rels: "AllocatedTo (function→structure) · DeployedOn (sw→hw)" },
    { name: "Safety",       color: C.coral, rels: "Mitigates · Causes · LeadsTo · IdentifiesRisk · ContributesTo" },
    { name: "Interface",    color: C.violet,rels: "ConnectsTo · DataFlow · Sends · Receives" },
  ];
  groups.forEach((g, i) => {
    const y = 2.75 + i * 0.78;
    s.addShape(pres.shapes.RECTANGLE, { x: cardX, y, w: cardW, h: 0.7, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addShape(pres.shapes.RECTANGLE, { x: cardX, y, w: 0.1, h: 0.7, fill: { color: g.color }, line: { color: g.color } });
    s.addText(g.name, { x: cardX + 0.22, y: y + 0.05, w: 1.6, h: 0.32, margin: 0, fontSize: 13, bold: true, color: C.ink, fontFace: FONT_HEAD });
    s.addText(g.rels, { x: cardX + 0.22, y: y + 0.36, w: cardW - 0.32, h: 0.32, margin: 0, fontSize: 10.5, color: C.gray, fontFace: FONT_MONO });
  });
  footer(s, 16);
}

// ============================================================================
// SLIDE 17 — ontology-process: standards as kinds (NEW)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "17", "ONTOLOGY-PROCESS");
  title(s, "Each standard is a SysML package", "Plans, activities, work products are first-class — not buried in a Word template. They specialize a common base.");

  // Left: code panel for ISO 14971 + IEC 62304
  const codeRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " MEMO_Ontology_Process_ISO14971 {\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "RiskManagementPlan", options: { color: C.codeStr, bold: true } },
    { text: " :> ", options: { color: C.codeFg } },
    { text: "WorkProduct", options: { color: C.codeStr } },
    { text: " {\n    attribute scope        : String;\n    attribute riskPolicy   : String;\n    attribute reviewFreq   : String;\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "BenefitRiskAssessment", options: { color: C.codeStr, bold: true } },
    { text: " :> ", options: { color: C.codeFg } },
    { text: "WorkProduct", options: { color: C.codeStr } },
    { text: " {\n    attribute clinicalBenefit : String;\n    attribute residualRiskLevel: String;\n    attribute conclusion       : String;\n  }\n}\n\n", options: { color: C.codeFg } },
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " MEMO_Ontology_Process_IEC62304 {\n  ", options: { color: C.codeFg } },
    { text: "enum def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "SoftwareSafetyClass", options: { color: C.codeStr, bold: true } },
    { text: " { enum A; enum B; enum C; }\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "SoftwareItem", options: { color: C.codeStr, bold: true } },
    { text: " :> ", options: { color: C.codeFg } },
    { text: "WorkProduct", options: { color: C.codeStr } },
    { text: " {\n    attribute safetyClass : SoftwareSafetyClass;\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "SOUPItem", options: { color: C.codeStr, bold: true } },
    { text: " :> ", options: { color: C.codeFg } },
    { text: "WorkProduct", options: { color: C.codeStr } },
    { text: " {\n    attribute soupId  : String;\n    attribute supplier: String;\n  }\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 0.55, 2.75, 6.7, 4.0, "sysml/iso-14971/  +  sysml/iec-62304/", codeRuns);

  // Right: standards tile
  const cardX = 7.4, cardW = 5.4;
  const standards = [
    { id: "ISO 14971",       topic: "Risk management",       c: C.coral },
    { id: "IEC 62304",       topic: "Software lifecycle",    c: C.amber },
    { id: "ISO 13485",       topic: "Quality system",        c: C.violet },
    { id: "ISO 14155",       topic: "Clinical investigation",c: C.blue },
    { id: "IEC 60601",       topic: "Electrical safety",     c: C.green },
    { id: "ISO 27001/27701", topic: "Security & privacy",    c: C.L_security },
    { id: "FDA 21 CFR 820",  topic: "Quality system regulation", c: C.tealDeep },
    { id: "EU MDR",          topic: "Conformity",            c: "5B9BD5" },
  ];
  standards.forEach((st, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = cardX + col * (cardW / 2 + 0.05);
    const y = 2.75 + row * 0.55;
    const w = cardW / 2 - 0.05;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h: 0.5, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.1, h: 0.5, fill: { color: st.c }, line: { color: st.c } });
    s.addText(st.id, { x: x + 0.2, y, w: w - 0.25, h: 0.28, margin: 0, fontSize: 11, bold: true, color: C.ink, valign: "middle", fontFace: FONT });
    s.addText(st.topic, { x: x + 0.2, y: y + 0.24, w: w - 0.25, h: 0.24, margin: 0, fontSize: 9, color: st.c, valign: "middle", fontFace: FONT });
  });

  callout(s, 0.55, 6.85, 12.25, 0.45,
    ":> WorkProduct.",
    "Process kinds inherit a common base in process-common — so all RM plans, software plans, design reviews share a uniform contract.");
  footer(s, 17);
}

// ============================================================================
// SLIDE 18 — SysML v2 modeling idioms (NEW)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "18", "SYSML V2 IDIOMS");
  title(s, "How MEMO maps engineering concepts to SysML v2", "Picking the right v2 construct matters — it determines what a parser, validator, and view can compute.");

  const idioms = [
    { what: "Component / Subsystem",  v2: "part def",       why: "structural decomposition; instances composed via :>" },
    { what: "Function / Behavior",    v2: "action def",     why: "first-class action — composes, decomposes, allocates" },
    { what: "Scenario",               v2: "action",         why: "concrete action sequence over the architecture" },
    { what: "State machine state",    v2: "part def",       why: "carries invariants; nests via composition" },
    { what: "Transition",             v2: "connection def", why: "trigger / guard / effect on the link, not in state body" },
    { what: "Hazard / Risk / Harm",   v2: "part def",       why: "carry severity / probability / acceptability enums" },
    { what: "Requirement",            v2: "part def",       why: "id, statement, verificationMethod — extensible by :>" },
    { what: "Trace / Allocation",     v2: "connection def", why: "named ends with kind constraints — typed semantics" },
    { what: "Severity / Class enums", v2: "enum def",       why: "validators check membership; UIs render dropdowns" },
  ];

  // Table-style layout: 2 columns × 5 rows (ish)
  const rh = 0.42, gap = 0.06;
  // Header row
  s.addShape(pres.shapes.RECTANGLE, { x: 0.55, y: 2.7, w: 12.25, h: rh, fill: { color: C.ink }, line: { color: C.ink } });
  s.addText("ENGINEERING CONCEPT", { x: 0.7, y: 2.7, w: 3.5, h: rh, margin: 0, fontSize: 10, bold: true, color: "FFFFFF", charSpacing: 3, valign: "middle", fontFace: FONT });
  s.addText("SYSML V2 CONSTRUCT", { x: 4.4, y: 2.7, w: 3.5, h: rh, margin: 0, fontSize: 10, bold: true, color: "7CE5C2", charSpacing: 3, valign: "middle", fontFace: FONT });
  s.addText("WHY THIS CHOICE", { x: 8.1, y: 2.7, w: 4.7, h: rh, margin: 0, fontSize: 10, bold: true, color: "FFFFFF", charSpacing: 3, valign: "middle", fontFace: FONT });

  idioms.forEach((idi, i) => {
    const y = 2.7 + (i + 1) * (rh + gap);
    const altBg = i % 2 === 0 ? C.bg : C.white;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.55, y, w: 12.25, h: rh, fill: { color: altBg }, line: { color: C.border, width: 0.5 } });
    s.addText(idi.what, { x: 0.7, y, w: 3.5, h: rh, margin: 0, fontSize: 11.5, color: C.ink, valign: "middle", fontFace: FONT });
    s.addText(idi.v2, { x: 4.4, y, w: 3.5, h: rh, margin: 0, fontSize: 11.5, color: C.tealDeep, bold: true, valign: "middle", fontFace: FONT_MONO });
    s.addText(idi.why, { x: 8.1, y, w: 4.7, h: rh, margin: 0, fontSize: 10.5, color: C.gray, valign: "middle", fontFace: FONT });
  });

  footer(s, 18);
}

// ============================================================================
// SLIDE 19 — Extension framework (NEW)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "19", "EXTENSION FRAMEWORK");
  title(s, "Extend with a profile package — never edit the core", "Profiles add domain depth above ontology-arch + ontology-process. Core stays tiny; profiles carry your specifics.");

  // Three-tier diagram
  const tiers = [
    { name: "Layer 1 · Core",     pkg: "@memo/ontology-arch", desc: "system, function, hazard, requirement, evidence",          c: C.blue,    y: 2.75 },
    { name: "Layer 2 · Standards",pkg: "@memo/ontology-process", desc: "RM plan, software safety class, design review, DHF",  c: C.violet,  y: 3.5 },
    { name: "Layer 3 · Profile",  pkg: "@memo/medical-modeling-profile", desc: "viewpoints, closure rules, device templates, your kinds", c: C.tealDeep, y: 4.25 },
  ];
  tiers.forEach((t, i) => {
    s.addShape(pres.shapes.RECTANGLE, { x: 0.55, y: t.y, w: 7.5, h: 0.65, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.55, y: t.y, w: 0.16, h: 0.65, fill: { color: t.c }, line: { color: t.c } });
    s.addText(t.name, { x: 0.85, y: t.y, w: 1.85, h: 0.3, margin: 0, fontSize: 12, bold: true, color: C.ink, valign: "top", fontFace: FONT_HEAD });
    s.addText(t.desc, { x: 0.85, y: t.y + 0.32, w: 6.5, h: 0.3, margin: 0, fontSize: 10, color: C.gray, fontFace: FONT });
    s.addText(t.pkg, { x: 2.7, y: t.y, w: 5.3, h: 0.3, margin: 0, fontSize: 10.5, color: t.c, valign: "top", fontFace: FONT_MONO, bold: true });
  });
  // Arrows between tiers
  for (let i = 0; i < 2; i++) {
    s.addShape(pres.shapes.LINE, { x: 4.3, y: 3.42 + i * 0.75, w: 0, h: 0.07, line: { color: C.grayLight, width: 1 } });
    s.addText("extends", { x: 3.6, y: 3.42 + i * 0.75, w: 1.4, h: 0.07, margin: 0, fontSize: 8, color: C.grayLight, italic: true, align: "center", fontFace: FONT });
  }

  // Right side — what a profile contains
  const rx = 8.4, rw = 4.4;
  s.addText("WHAT A PROFILE CONTAINS", { x: rx, y: 2.75, w: rw, h: 0.3, margin: 0, fontSize: 11, bold: true, color: C.tealDeep, charSpacing: 3, fontFace: FONT });
  const contents = [
    { f: "memo.package.yaml",     d: "identity (name, version, license)" },
    { f: "memo.viewpoints.yaml",  d: "declarative views over kinds" },
    { f: "memo.rules.yaml",       d: "closure rules — validation policy" },
    { f: "templates/<device>/",   d: "starter SysML for device archetypes" },
    { f: "profiles/<size>.yaml",  d: "minimal · standard · full bundles" },
    { f: "sysml/<your-pkg>/",     d: "your own kinds (Apollo-11 path = layer)" },
  ];
  contents.forEach((c, i) => {
    const y = 3.1 + i * 0.55;
    s.addShape(pres.shapes.RECTANGLE, { x: rx, y, w: rw, h: 0.5, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addText(c.f, { x: rx + 0.15, y, w: 2.0, h: 0.5, margin: 0, fontSize: 10, color: C.tealDeep, bold: true, valign: "middle", fontFace: FONT_MONO });
    s.addText(c.d, { x: rx + 2.2, y, w: rw - 2.3, h: 0.5, margin: 0, fontSize: 10, color: C.gray, valign: "middle", fontFace: FONT });
  });

  callout(s, 0.55, 6.6, 12.25, 0.5,
    "Rule of extension.",
    "Add packages and profiles. Do not edit the core. The medical-modeling-profile package is itself the reference implementation of this rule.");
  footer(s, 19);
}

// ============================================================================
// SLIDE 20 — Customization recipe (NEW)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "20", "CUSTOMIZATION RECIPE");
  title(s, "Five places to extend — from light-touch to deep", "Pick the layer that fits the customization. Smaller change = closer to YAML; deeper change = own SysML package.");

  const ways = [
    { num: "1", t: "Pick a profile size",           file: "memo.config.yaml",          ex: "extends: profiles/standard.yaml",            depth: "LIGHT", c: C.green },
    { num: "2", t: "Start from a device template",  file: "memo init --template …",    ex: "infusion-pump · ventilator · samd · monitoring · connected", depth: "LIGHT", c: C.green },
    { num: "3", t: "Author a viewpoint",            file: "memo.viewpoints.yaml",      ex: "id: my-cyber-view\nvisibleKinds: [ThreatModel, …]",          depth: "MEDIUM", c: C.amber },
    { num: "4", t: "Author closure rules",          file: "memo.rules.yaml",           ex: "id: CR-CO-001\ntype: requireRelationship\n…",              depth: "MEDIUM", c: C.amber },
    { num: "5", t: "Add your own kinds in SysML",   file: "sysml/<your-layer>/*.sysml",ex: "part def InfusionMode :> State { … }",                     depth: "DEEP",  c: C.coral },
  ];

  const rh = 0.74, gap = 0.07;
  ways.forEach((w, i) => {
    const y = 2.75 + i * (rh + gap);
    s.addShape(pres.shapes.RECTANGLE, { x: 0.55, y, w: 12.25, h: rh, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    // Step number
    s.addShape(pres.shapes.OVAL, { x: 0.7, y: y + (rh - 0.5) / 2, w: 0.5, h: 0.5, fill: { color: w.c }, line: { color: w.c } });
    s.addText(w.num, { x: 0.7, y: y + (rh - 0.5) / 2, w: 0.5, h: 0.5, margin: 0, fontSize: 18, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT_HEAD });
    // Title + file
    s.addText(w.t, { x: 1.4, y: y + 0.06, w: 3.6, h: 0.32, margin: 0, fontSize: 13, bold: true, color: C.ink, fontFace: FONT_HEAD });
    s.addText(w.file, { x: 1.4, y: y + 0.4, w: 3.6, h: 0.3, margin: 0, fontSize: 10, color: w.c, bold: true, fontFace: FONT_MONO });
    // Example
    s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: y + 0.08, w: 5.6, h: rh - 0.16, fill: { color: C.codeBg }, line: { color: C.codeBg } });
    s.addText(w.ex, { x: 5.35, y: y + 0.08, w: 5.4, h: rh - 0.16, margin: 0, fontSize: 10, color: "7CE5C2", valign: "middle", fontFace: FONT_MONO });
    // Depth badge
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 11.0, y: y + 0.18, w: 1.6, h: 0.38, fill: { color: w.c, transparency: 80 }, line: { color: w.c }, rectRadius: 0.06 });
    s.addText(w.depth, { x: 11.0, y: y + 0.18, w: 1.6, h: 0.38, margin: 0, fontSize: 10, bold: true, color: w.c, charSpacing: 3, align: "center", valign: "middle", fontFace: FONT });
  });

  footer(s, 20);
}

// ============================================================================
// SLIDE 21 — GPCA introduction (NEW)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "21", "WORKED EXAMPLE · GPCA");
  title(s, "Meet GPCA — the reference model", "Generic Patient-Controlled Analgesia infusion pump. Standardized public-domain target for medical-device safety research.");

  // Left intro
  s.addShape(pres.shapes.RECTANGLE, { x: 0.55, y: 2.75, w: 5.7, h: 4.05, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
  s.addText("WHY GPCA", { x: 0.75, y: 2.9, w: 5.3, h: 0.3, margin: 0, fontSize: 11, bold: true, color: C.tealDeep, charSpacing: 3, fontFace: FONT });
  s.addText([
    { text: "U. Minnesota CriSys benchmark", options: { bullet: true, breakLine: true, bold: true, color: C.ink } },
    { text: "Public REQ catalogue (REQ 1–86)", options: { bullet: true, breakLine: true, color: C.ink } },
    { text: "IEC 62304 Class C software", options: { bullet: true, breakLine: true, color: C.ink } },
    { text: "Full ISO 14971 hazard chain published", options: { bullet: true, breakLine: true, color: C.ink } },
    { text: "Cited across FDA, NIH, INCOSE literature", options: { bullet: true, color: C.ink } },
  ], { x: 0.75, y: 3.25, w: 5.3, h: 1.8, margin: 0, fontSize: 12, fontFace: FONT, paraSpaceAfter: 4 });

  s.addText("WHAT WE MODELED", { x: 0.75, y: 5.15, w: 5.3, h: 0.3, margin: 0, fontSize: 11, bold: true, color: C.tealDeep, charSpacing: 3, fontFace: FONT });
  s.addText([
    { text: "Stakeholders, intended use, 10+ user needs", options: { bullet: true, breakLine: true } },
    { text: "40+ system + 20+ software requirements", options: { bullet: true, breakLine: true } },
    { text: "16-state hierarchical state machine", options: { bullet: true, breakLine: true } },
    { text: "10+ harms, 30+ risk controls, FMEA + FTA", options: { bullet: true, breakLine: true } },
    { text: "Threat model + 8+ cybersecurity controls", options: { bullet: true } },
  ], { x: 0.75, y: 5.5, w: 5.3, h: 1.3, margin: 0, fontSize: 11.5, color: C.gray, fontFace: FONT, paraSpaceAfter: 3 });

  // Right packages map
  s.addText("GPCA-PUMP/MODEL/", { x: 6.5, y: 2.75, w: 6.3, h: 0.3, margin: 0, fontSize: 11, bold: true, color: C.tealDeep, charSpacing: 3, fontFace: FONT });
  const pkgs = [
    { f: "requirements/",    d: "stakeholders, intended use, REQ tree",     c: "5B9BD5" },
    { f: "architecture/",    d: "system, subsystems, hardware, software items",c: C.blue },
    { f: "behavior/",        d: "functions, state machine, action flows",   c: C.violet },
    { f: "risk/",            d: "harms, hazards, risk controls, FMEA, FTA", c: C.coral },
    { f: "cybersecurity/",   d: "threat model, scenarios, controls, SBOM", c: C.L_security },
    { f: "clinical/",        d: "clinical evaluation, PMS feedback",        c: C.green },
    { f: "compliance/",      d: "RMF, SDD, V&V views — compiled outputs",   c: C.amber },
  ];
  pkgs.forEach((p, i) => {
    const y = 3.1 + i * 0.5;
    s.addShape(pres.shapes.RECTANGLE, { x: 6.5, y, w: 6.3, h: 0.45, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addShape(pres.shapes.RECTANGLE, { x: 6.5, y, w: 0.12, h: 0.45, fill: { color: p.c }, line: { color: p.c } });
    s.addText(p.f, { x: 6.74, y, w: 1.7, h: 0.45, margin: 0, fontSize: 11, bold: true, color: C.ink, valign: "middle", fontFace: FONT_MONO });
    s.addText(p.d, { x: 8.5, y, w: 4.3, h: 0.45, margin: 0, fontSize: 10.5, color: C.gray, valign: "middle", fontFace: FONT });
  });
  footer(s, 21);
}

// ============================================================================
// SLIDE 22 — GPCA architecture excerpt (NEW)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "22", "GPCA · ARCHITECTURE");
  title(s, "GPCA architecture — System decomposed by ComposedOf", "System → 6 subsystems → hardware components. Composition is a typed connection — not a tree string.");

  const codeRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " GPCA_Architecture {\n  ", options: { color: C.codeFg } },
    { text: "import", options: { color: C.codeKey } },
    { text: " MEMO_Ontology_Arch::*;\n\n  ", options: { color: C.codeFg } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "gpcaSystem", options: { color: C.codeStr, bold: true } },
    { text: " : ", options: { color: C.codeFg } },
    { text: "System", options: { color: C.codeStr } },
    { text: " {\n    attribute redefines name = ", options: { color: C.codeFg } },
    { text: "\"GPCA Infusion Pump System\"", options: { color: C.codeNum } },
    { text: ";\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " controlSubsystem    : Subsystem;\n  ", options: { color: C.codeFg } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " fluidicsSubsystem   : Subsystem;\n  ", options: { color: C.codeFg } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " sensorSubsystem     : Subsystem;\n  ", options: { color: C.codeFg } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " uiSubsystem         : Subsystem;\n  ", options: { color: C.codeFg } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " powerSubsystem      : Subsystem;\n  ", options: { color: C.codeFg } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " networkSubsystem    : Subsystem;\n\n  ", options: { color: C.codeFg } },
    { text: "// Typed composition — not implicit tree\n  ", options: { color: C.codeCmt, italic: true } },
    { text: "connection", options: { color: C.codeKey, bold: true } },
    { text: " : ", options: { color: C.codeFg } },
    { text: "ComposedOf", options: { color: C.codeStr } },
    { text: " connect whole ::> gpcaSystem\n                            to part  ::> controlSubsystem;\n  ", options: { color: C.codeFg } },
    { text: "// ... 5 more ComposedOf connections\n\n  ", options: { color: C.codeCmt, italic: true } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " mainProcessor   : ", options: { color: C.codeFg } },
    { text: "Microcontroller", options: { color: C.codeStr } },
    { text: " {\n    attribute redefines ram = ", options: { color: C.codeFg } },
    { text: "512", options: { color: C.codeNum } },
    { text: ";\n  }\n  ", options: { color: C.codeFg } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " safetyProcessor : ", options: { color: C.codeFg } },
    { text: "Microcontroller", options: { color: C.codeStr } },
    { text: ";  // Cortex-M0 watchdog\n}", options: { color: C.codeCmt, italic: true } },
  ];
  codePanel(s, 0.55, 2.75, 8.0, 4.05, "examples/gpca-pump/model/architecture/architecture.sysml", codeRuns);

  // Right callouts
  const rx = 8.75, rw = 4.05;
  const items = [
    { h: "Imports the core",    b: "import MEMO_Ontology_Arch::* — pulls Subsystem, Microcontroller, ComposedOf into scope." },
    { h: "Instances, not types", b: "part declarations create instances; redefines overrides inherited attribute defaults." },
    { h: "Typed composition",   b: "ComposedOf has named ends — every link is checkable by validators." },
    { h: "Two processors",      b: "Main + safety co-processor pattern modeled explicitly — not buried in a Word section." },
  ];
  items.forEach((it, i) => {
    const y = 2.75 + i * 1.05;
    s.addShape(pres.shapes.RECTANGLE, { x: rx, y, w: rw, h: 0.95, fill: { color: C.blueSoft }, line: { color: C.blueSoft } });
    s.addShape(pres.shapes.RECTANGLE, { x: rx, y, w: 0.06, h: 0.95, fill: { color: C.blue }, line: { color: C.blue } });
    s.addText(it.h, { x: rx + 0.16, y: y + 0.08, w: rw - 0.25, h: 0.32, margin: 0, fontSize: 12, bold: true, color: C.ink, fontFace: FONT_HEAD });
    s.addText(it.b, { x: rx + 0.16, y: y + 0.4, w: rw - 0.25, h: 0.55, margin: 0, fontSize: 10, color: C.gray, fontFace: FONT });
  });

  footer(s, 22);
}

// ============================================================================
// SLIDE 23 — GPCA behavior excerpt (NEW)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "23", "GPCA · BEHAVIOR");
  title(s, "Functions as action def — decomposed and allocated", "Top-level system function regulateFlow decomposes into component actions and is allocated to a SoftwareItem.");

  const codeRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " GPCA_Behavior {\n\n  ", options: { color: C.codeFg } },
    { text: "// SYSTEM FUNCTIONS — top of decomposition\n  ", options: { color: C.codeCmt, italic: true } },
    { text: "action def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "sfRegulateFlow", options: { color: C.codeStr, bold: true } },
    { text: " :> Function {\n    attribute redefines scope = FunctionScope::System;\n    attribute redefines name  = ", options: { color: C.codeFg } },
    { text: "\"Regulate Drug Flow\"", options: { color: C.codeNum } },
    { text: ";\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "action def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "sfDetectSafetyCondition", options: { color: C.codeStr, bold: true } },
    { text: " :> Function;\n  ", options: { color: C.codeFg } },
    { text: "action def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "sfManageAlarms", options: { color: C.codeStr, bold: true } },
    { text: "          :> Function;\n\n  ", options: { color: C.codeFg } },
    { text: "// COMPONENT FUNCTIONS\n  ", options: { color: C.codeCmt, italic: true } },
    { text: "action def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "cfCalculateFlowRate", options: { color: C.codeStr, bold: true } },
    { text: " :> Function;\n  ", options: { color: C.codeFg } },
    { text: "action def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "cfManageLockout", options: { color: C.codeStr, bold: true } },
    { text: "     :> Function;\n\n  ", options: { color: C.codeFg } },
    { text: "// DECOMPOSITION\n  ", options: { color: C.codeCmt, italic: true } },
    { text: "connection", options: { color: C.codeKey, bold: true } },
    { text: " : ", options: { color: C.codeFg } },
    { text: "DecomposedBy", options: { color: C.codeStr } },
    { text: " connect parent ::> sfRegulateFlow\n                              to child  ::> cfCalculateFlowRate;\n  ", options: { color: C.codeFg } },
    { text: "connection", options: { color: C.codeKey, bold: true } },
    { text: " : ", options: { color: C.codeFg } },
    { text: "DecomposedBy", options: { color: C.codeStr } },
    { text: " connect parent ::> sfRegulateFlow\n                              to child  ::> cfManageLockout;\n\n  ", options: { color: C.codeFg } },
    { text: "// ALLOCATION — function → software item\n  ", options: { color: C.codeCmt, italic: true } },
    { text: "connection", options: { color: C.codeKey, bold: true } },
    { text: " : ", options: { color: C.codeFg } },
    { text: "AllocateTo", options: { color: C.codeStr } },
    { text: " connect function ::> sfRegulateFlow\n                            to structure ::> siInfusionManager;\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 0.55, 2.75, 8.0, 4.0, "examples/gpca-pump/model/behavior/behavior.sysml", codeRuns);

  // Right — visualization
  const rx = 8.75, rw = 4.05;
  s.addText("FUNCTION TREE", { x: rx, y: 2.75, w: rw, h: 0.3, margin: 0, fontSize: 11, bold: true, color: C.tealDeep, charSpacing: 3, fontFace: FONT });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: rx, y: 3.1, w: rw, h: 0.5, fill: { color: C.violet }, line: { color: C.violet }, rectRadius: 0.06 });
  s.addText("sfRegulateFlow  (system)", { x: rx, y: 3.1, w: rw, h: 0.5, margin: 0, fontSize: 11, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT_MONO });
  s.addText("↓ DecomposedBy", { x: rx, y: 3.65, w: rw, h: 0.25, margin: 0, fontSize: 9, color: C.grayLight, align: "center", italic: true, fontFace: FONT });

  ["cfCalculateFlowRate", "cfDriveMotor", "cfManageLockout"].forEach((f, i) => {
    const y = 3.95 + i * 0.42;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: rx + 0.4, y, w: rw - 0.4, h: 0.36, fill: { color: C.violetSoft }, line: { color: C.violet, width: 1 }, rectRadius: 0.05 });
    s.addText(f, { x: rx + 0.4, y, w: rw - 0.4, h: 0.36, margin: 0, fontSize: 10, color: C.violet, bold: true, align: "center", valign: "middle", fontFace: FONT_MONO });
  });

  s.addText("↓ AllocateTo", { x: rx, y: 5.25, w: rw, h: 0.25, margin: 0, fontSize: 9, color: C.grayLight, align: "center", italic: true, fontFace: FONT });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: rx, y: 5.55, w: rw, h: 0.5, fill: { color: C.amber }, line: { color: C.amber }, rectRadius: 0.06 });
  s.addText("siInfusionManager (Class C)", { x: rx, y: 5.55, w: rw, h: 0.5, margin: 0, fontSize: 11, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT_MONO });

  callout(s, 0.55, 6.85, 12.25, 0.45, "16-state hierarchical machine.", "OFF → ON → IDLE → THERAPY → ACTIVE → BASAL / SQUARE_BOLUS / PATIENT_BOLUS / PAUSED — full transitions in behavior.sysml.");
  footer(s, 23);
}

// ============================================================================
// SLIDE 24 — GPCA risk excerpt (NEW)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "24", "GPCA · RISK");
  title(s, "Harms with severity — straight from the SysML", "Each harm is a typed instance of Harm with a SeverityLevel enum. Validators check the chain. RMF compiles from this.");

  // Code panel left
  const codeRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " GPCA_Risk {\n  ", options: { color: C.codeFg } },
    { text: "import", options: { color: C.codeKey } },
    { text: " MEMO_Ontology_Arch::*;\n\n  ", options: { color: C.codeFg } },
    { text: "// HARM-001 ─ patient death\n  ", options: { color: C.codeCmt, italic: true } },
    { text: "requirement", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "harmDeath", options: { color: C.codeStr, bold: true } },
    { text: " : ", options: { color: C.codeFg } },
    { text: "Harm", options: { color: C.codeStr } },
    { text: " {\n    attribute redefines title    = ", options: { color: C.codeFg } },
    { text: "\"Patient Death\"", options: { color: C.codeNum } },
    { text: ";\n    attribute redefines severity = ", options: { color: C.codeFg } },
    { text: "SeverityLevel::Catastrophic", options: { color: "F87171", bold: true } },
    { text: ";\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "requirement", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "harmRespiratoryDepression", options: { color: C.codeStr, bold: true } },
    { text: " : Harm {\n    attribute redefines severity = ", options: { color: C.codeFg } },
    { text: "SeverityLevel::Critical", options: { color: "F87171", bold: true } },
    { text: ";\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "requirement", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "harmTissueDamage", options: { color: C.codeStr, bold: true } },
    { text: "         : Harm {\n    attribute redefines severity = ", options: { color: C.codeFg } },
    { text: "SeverityLevel::Serious", options: { color: C.codeStr, bold: true } },
    { text: ";\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "requirement", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "harmSepsis", options: { color: C.codeStr, bold: true } },
    { text: "                : Harm {\n    attribute redefines severity = ", options: { color: C.codeFg } },
    { text: "SeverityLevel::Critical", options: { color: "F87171", bold: true } },
    { text: ";\n  }\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 0.55, 2.75, 7.5, 4.05, "examples/gpca-pump/model/risk/risk.sysml", codeRuns);

  // Right — Harm severity table
  const rx = 8.25, rw = 4.55;
  s.addText("HARM TAXONOMY (extract)", { x: rx, y: 2.75, w: rw, h: 0.3, margin: 0, fontSize: 11, bold: true, color: C.tealDeep, charSpacing: 3, fontFace: FONT });

  const harms = [
    { id: "HARM-001", t: "Patient Death",         sev: "Catastrophic", c: "991B1B" },
    { id: "HARM-002", t: "Respiratory Depression",sev: "Critical",     c: C.red },
    { id: "HARM-003", t: "Tissue Damage",         sev: "Serious",      c: C.amber },
    { id: "HARM-004", t: "Sepsis / Infection",    sev: "Critical",     c: C.red },
    { id: "HARM-005", t: "Inadequate Pain Relief",sev: "Serious",      c: C.amber },
    { id: "HARM-006", t: "Air Embolism",          sev: "Critical",     c: C.red },
  ];
  harms.forEach((h, i) => {
    const y = 3.1 + i * 0.55;
    s.addShape(pres.shapes.RECTANGLE, { x: rx, y, w: rw, h: 0.5, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addShape(pres.shapes.RECTANGLE, { x: rx, y, w: 0.1, h: 0.5, fill: { color: h.c }, line: { color: h.c } });
    s.addText(h.id, { x: rx + 0.18, y, w: 1.05, h: 0.5, margin: 0, fontSize: 10, color: C.ink, bold: true, valign: "middle", fontFace: FONT_MONO });
    s.addText(h.t, { x: rx + 1.3, y, w: 2.1, h: 0.5, margin: 0, fontSize: 11, color: C.ink, valign: "middle", fontFace: FONT });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: rx + 3.45, y: y + 0.12, w: 1.0, h: 0.26, fill: { color: h.c }, line: { color: h.c }, rectRadius: 0.05 });
    s.addText(h.sev, { x: rx + 3.45, y: y + 0.12, w: 1.0, h: 0.26, margin: 0, fontSize: 8.5, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT });
  });
  footer(s, 24);
}

// ============================================================================
// SLIDE 25 — Strategy 3 horizons
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "25", "ADOPTION STRATEGY");
  title(s, "Three horizons, one trajectory", "An adoption-first roadmap that earns trust before it grows scope.");

  const horizons = [
    { num: "H1", when: "NOW · 2026", t: "Prove the backbone", items: [
      "open ontology-arch + ontology-process + medical-modeling-profile",
      "GPCA + 4 device templates as worked references",
      "SysML v2 source-of-truth, CLI + viewer",
      "seed adoption with one design partner per modality",
    ]},
    { num: "H2", when: "2026–2027", t: "Compile compliance", items: [
      "auto-compiled RMF, SDD, V&V views from one model",
      "typed-link impact analysis & stale-evidence detection",
      "profiles: cybersecurity, usability, AI/ML, alarms",
      "PLM & ALM export adapters",
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
  footer(s, 25);
}

// ============================================================================
// SLIDE 26 — Call to action
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.ink };
  s.addShape(pres.shapes.OVAL, { x: W - 4, y: -2, w: 8, h: 8, fill: { color: C.teal, transparency: 88 }, line: { color: C.ink } });
  badgeDark(s, "26", "NEXT STEP");
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

pres.writeFile({ fileName: "/Users/someshkashyap/Downloads/MEMO_INCOSE/MEMO_INCOSE_v3.pptx" })
  .then(f => console.log("Wrote: " + f));
