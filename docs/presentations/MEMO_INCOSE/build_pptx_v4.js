// MEMO INCOSE deck v4 — uses feedback/ ontology (md:: namespace)
// Real elements from md::core, md::architecture, md::methodology,
// md::viewpoints, md::views, md::compliance, md::examples::gpca

const pptxgen = require("pptxgenjs");
const path = require("path");
const IMG = (f) => path.join(__dirname, "images", f);

const C = {
  ink: "071F35", inkLight: "1E293B",
  teal: "2DD4AA", tealDeep: "0D8B6F", tealSoft: "E6FAF3",
  bg: "F5F7FA", card: "FFFFFF", border: "DBE2E8",
  gray: "475569", grayLight: "94A3B8",
  amber: "F59E0B", red: "DC2626", redSoft: "FFF5F5",
  violet: "8B5CF6", violetSoft: "EDE9FE",
  blue: "3B82F6", blueSoft: "DBEAFE",
  green: "10B981", yellow: "EAB308", coral: "EF6C5A",
  white: "FFFFFF",
  L_context: "0EA5E9", L_req: "5B9BD5", L_func: "E67E22", L_logical: "7B68EE",
  L_behavior: "8B5CF6", L_software: "F39C12", L_hardware: "95A5A6",
  L_iface: "06B6D4", L_constr: "64748B", L_risk: "E74C3C",
  L_cyber: "2C3E50", L_assurance: "2ECC71",
  codeBg: "0F172A", codeFg: "E2E8F0", codeKey: "7DD3C0",
  codeStr: "FBBF24", codeNum: "F472B6", codeCmt: "94A3B8", codeAttr: "C4B5FD",
};

const FONT = "Calibri", FONT_HEAD = "Calibri", FONT_MONO = "Consolas";
const W = 13.33, H = 7.5;
const TOTAL = 27;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.title = "MEMO — INCOSE 2026 (v4)";
pres.author = "MEMO";

// =========== helpers (same as v3) ===========
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
  s.addText(String(n).padStart(2, "0") + " / " + String(TOTAL).padStart(2, "0"), { x: 11.78, y: 7.05, w: 1, h: 0.3, margin: 0, fontSize: 9, color: C.gray, bold: true, align: "right", charSpacing: 2, fontFace: FONT });
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
// SLIDES 3,4 — Problem + Drift
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
// SLIDES 6,7,8 — Industry / Insight / Solution
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
  title(s, "Built on what you already practice", "MEMO is not a new methodology. It is a SysML v2 ontology underneath the methodologies your teams use.");
  const cards = [
    { t: "ISO/IEC/IEEE 42010", body: "Concerns → Viewpoints → Views → Models. md::viewpoints + md::views supply the typed elements that views reference.", iconText: "ISO", iconBg: C.tealSoft, accent: C.teal },
    { t: "Arcadia-inspired layering", body: "Operational → Logical → Physical → Behavior, with risk and assurance as peers — not after-thoughts.", iconText: "MBSE", iconBg: C.violetSoft, accent: C.violet },
    { t: "SysML v2 source", body: "All kinds, links, viewpoints, methodology in SysML v2. Single coherent namespace md::. Single release version.", iconText: "v2", iconBg: C.blueSoft, accent: C.blue },
  ];
  const cw = 4.0, ch = 3.5, gap = 0.22;
  const sx = (W - cw * 3 - gap * 2) / 2;
  cards.forEach((c, i) => card4(s, sx + i * (cw + gap), 2.8, cw, ch, c));
  callout(s, 0.55, 6.45, 12.2, 0.55, "Position.", "MEMO sits between the standards (ISO 14971, IEC 62304, IEC 81001-5-1) and the modeling tools — a domain ontology, not a tool stack.");
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
  s.addText([{ text: "Behavior", options: { bold: true, breakLine: true, fontSize: 13 } }, { text: "+ contracts", options: { bold: true, breakLine: true, fontSize: 13 } }, { text: "modes, properties", options: { fontSize: 9, color: "EDE9FE" } }], { x: cx - nodeR, y: cy - 3.05, w: nodeR * 2, h: nodeR * 2, margin: 0, color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT });
  s.addShape(pres.shapes.OVAL, { x: cx - nodeR, y: cy + 1.35, w: nodeR * 2, h: nodeR * 2, fill: { color: "5B9BD5" }, line: { color: "5B9BD5" } });
  s.addText([{ text: "Requirements", options: { bold: true, breakLine: true, fontSize: 13 } }, { text: "needs + obligations", options: { fontSize: 9, color: "DBEAFE" } }], { x: cx - nodeR, y: cy + 1.35, w: nodeR * 2, h: nodeR * 2, margin: 0, color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT });
  s.addShape(pres.shapes.OVAL, { x: cx + 1.6, y: cy - nodeR, w: nodeR * 2, h: nodeR * 2, fill: { color: C.coral }, line: { color: C.coral } });
  s.addText([{ text: "Risk", options: { bold: true, breakLine: true, fontSize: 14 } }, { text: "hazard chains", options: { fontSize: 9, color: "FFE0DC" } }], { x: cx + 1.6, y: cy - nodeR, w: nodeR * 2, h: nodeR * 2, margin: 0, color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT });
  s.addShape(pres.shapes.OVAL, { x: cx - 3.3, y: cy - nodeR, w: nodeR * 2, h: nodeR * 2, fill: { color: C.green }, line: { color: C.green } });
  s.addText([{ text: "Assurance", options: { bold: true, breakLine: true, fontSize: 13 } }, { text: "verification", options: { fontSize: 9, color: "D1FAE5" } }], { x: cx - 3.3, y: cy - nodeR, w: nodeR * 2, h: nodeR * 2, margin: 0, color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT });

  callout(s, 0.55, 6.45, 12.2, 0.55, "Practitioner sequence.", "Architecture → behavior/contracts → risk → requirements + assurance, iterate back through architecture.");
  footer(s, 10);
}

// ============================================================================
// SLIDE 11 — md:: namespace + single release
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "11", "MEMO PACKAGE");
  title(s, "One namespace. One release. md:: ", "MEMO ships as a single SysML v2 package — md::library — versioned 1.0.0. Layers are sub-packages, not separate libraries.");

  // Top-level structure visual
  const codeRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " md::library {\n  ", options: { color: C.codeFg } },
    { text: "public import", options: { color: C.codeKey, bold: true } },
    { text: " md::core::*;                 ", options: { color: C.codeFg } },
    { text: "// abstract bases, enums, links\n  ", options: { color: C.codeCmt, italic: true } },
    { text: "public import", options: { color: C.codeKey, bold: true } },
    { text: " md::manifest::release::*;    ", options: { color: C.codeFg } },
    { text: "// version, changelog\n\n  ", options: { color: C.codeCmt, italic: true } },
    { text: "public import", options: { color: C.codeKey, bold: true } },
    { text: " md::architecture::context::*;\n  ", options: { color: C.codeFg } },
    { text: "public import", options: { color: C.codeKey, bold: true } },
    { text: " md::architecture::requirements::*;\n  ", options: { color: C.codeFg } },
    { text: "public import", options: { color: C.codeKey, bold: true } },
    { text: " md::architecture::functions::*;\n  ", options: { color: C.codeFg } },
    { text: "public import", options: { color: C.codeKey, bold: true } },
    { text: " md::architecture::behavior::*;\n  ", options: { color: C.codeFg } },
    { text: "public import", options: { color: C.codeKey, bold: true } },
    { text: " md::architecture::logical_structure::*;\n  ", options: { color: C.codeFg } },
    { text: "public import", options: { color: C.codeKey, bold: true } },
    { text: " md::architecture::software_structure::*;\n  ", options: { color: C.codeFg } },
    { text: "public import", options: { color: C.codeKey, bold: true } },
    { text: " md::architecture::hardware_structure::*;\n  ", options: { color: C.codeFg } },
    { text: "public import", options: { color: C.codeKey, bold: true } },
    { text: " md::architecture::risk::*;\n  ", options: { color: C.codeFg } },
    { text: "public import", options: { color: C.codeKey, bold: true } },
    { text: " md::architecture::cybersecurity::*;\n  ", options: { color: C.codeFg } },
    { text: "public import", options: { color: C.codeKey, bold: true } },
    { text: " md::architecture::assurance::*;\n\n  ", options: { color: C.codeFg } },
    { text: "public import", options: { color: C.codeKey, bold: true } },
    { text: " md::viewpoints::*;           ", options: { color: C.codeFg } },
    { text: "// reusable selection intent\n  ", options: { color: C.codeCmt, italic: true } },
    { text: "public import", options: { color: C.codeKey, bold: true } },
    { text: " md::views::*;                ", options: { color: C.codeFg } },
    { text: "// model-driven content\n  ", options: { color: C.codeCmt, italic: true } },
    { text: "public import", options: { color: C.codeKey, bold: true } },
    { text: " md::compliance::artifacts::*;\n  ", options: { color: C.codeFg } },
    { text: "public import", options: { color: C.codeKey, bold: true } },
    { text: " md::methodology::*;          ", options: { color: C.codeFg } },
    { text: "// profiles, rules, gates\n}", options: { color: C.codeCmt, italic: true } },
  ];
  codePanel(s, 0.55, 2.75, 7.7, 4.05, "medical_device_library.sysml", codeRuns);

  // Right principles
  const rx = 8.5, rw = 4.3;
  const principles = [
    { h: "Single namespace", b: "md:: spans every layer. No MEMO_Ontology_*. Imports are short and predictable." },
    { h: "Single release version", b: "1.0.0 covers core, architecture, methodology, viewpoints, views, compliance, examples." },
    { h: "Layers ≠ libraries", b: "Architecture sub-packages are layers. Viewpoints + views are first-class libraries." },
    { h: "Source-of-truth", b: "Ontology stays the source of truth; methodology guides without owning viewpoints." },
  ];
  principles.forEach((p, i) => {
    const y = 2.75 + i * 1.05;
    s.addShape(pres.shapes.RECTANGLE, { x: rx, y, w: rw, h: 0.95, fill: { color: C.tealSoft }, line: { color: C.tealSoft } });
    s.addShape(pres.shapes.RECTANGLE, { x: rx, y, w: 0.06, h: 0.95, fill: { color: C.tealDeep }, line: { color: C.tealDeep } });
    s.addText(p.h, { x: rx + 0.18, y: y + 0.08, w: rw - 0.25, h: 0.32, margin: 0, fontSize: 13, bold: true, color: C.ink, fontFace: FONT_HEAD });
    s.addText(p.b, { x: rx + 0.18, y: y + 0.4, w: rw - 0.25, h: 0.55, margin: 0, fontSize: 10.5, color: C.gray, fontFace: FONT });
  });
  footer(s, 11);
}

// ============================================================================
// SLIDE 12 — Top-level structure map
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "12", "TOP-LEVEL STRUCTURE");
  title(s, "Seven sub-packages under md::", "Each sub-package is a focused library. Architecture is decomposed into 13 ontology layers.");

  const blocks = [
    { id: "md::core",         desc: "abstract bases · enumerations · semantic links",   c: C.teal,    sub: "common · enumerations · relationships" },
    { id: "md::architecture", desc: "13 ontology layers — what the device is",           c: C.blue,    sub: "context · requirements · functions · behavior · logical_structure · logical_interfaces · software_structure · hardware_structure · physical_interfaces · constraints · risk · cybersecurity · assurance" },
    { id: "md::methodology",  desc: "how to apply the ontology",                          c: C.violet,  sub: "core · profiles · viewpoints · rules · patterns · workflow · gates" },
    { id: "md::viewpoints",   desc: "reusable selection intent",                          c: C.amber,   sub: "core · default_viewpoints" },
    { id: "md::views",        desc: "model-driven content + presentation",                c: C.coral,   sub: "core · document_views" },
    { id: "md::compliance",   desc: "controlled artifacts + document views",              c: C.green,   sub: "artifacts · document_views" },
    { id: "md::examples::gpca", desc: "worked example — GPCA infusion pump",              c: C.tealDeep,sub: "architecture · behavior_modes · behavior_subsystems · interfaces · requirements · risk · cybersecurity · verification · formal_behavior · methodology · trace · views · document_views" },
  ];

  const rh = 0.55, gap = 0.06;
  blocks.forEach((b, i) => {
    const y = 2.75 + i * (rh + gap);
    s.addShape(pres.shapes.RECTANGLE, { x: 0.55, y, w: 12.25, h: rh, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.55, y, w: 0.16, h: rh, fill: { color: b.c }, line: { color: b.c } });
    s.addText(b.id, { x: 0.85, y, w: 3.0, h: rh, margin: 0, fontSize: 13, bold: true, color: C.ink, valign: "middle", fontFace: FONT_MONO });
    s.addText(b.desc, { x: 3.95, y, w: 3.4, h: rh, margin: 0, fontSize: 11, color: b.c, valign: "middle", fontFace: FONT, italic: true });
    s.addText(b.sub, { x: 7.45, y, w: 5.3, h: rh, margin: 0, fontSize: 9.5, color: C.gray, valign: "middle", fontFace: FONT_MONO });
  });
  footer(s, 12);
}

// ============================================================================
// SLIDE 13 — md::core (abstract bases, enums, semantic links)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "13", "md::core");
  title(s, "Abstract bases, enumerations, semantic links", "The whole ontology specializes a small set of bases. Enums encode categorical attributes. Links carry typed semantics.");

  // Left: abstract bases
  const baseRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " md::core::common {\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "IdentifiedElement", options: { color: C.codeStr, bold: true } },
    { text: " {\n    attribute id : String;\n    attribute name : String;\n    attribute description : String;\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "TraceableElement", options: { color: C.codeStr, bold: true } },
    { text: " :> ", options: { color: C.codeFg } },
    { text: "IdentifiedElement", options: { color: C.codeStr } },
    { text: " {\n    attribute rationale       : String;\n    attribute sourceReference : String;\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "ArchitectureElement", options: { color: C.codeStr, bold: true } },
    { text: " :> TraceableElement;\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "VerifiableElement", options: { color: C.codeStr, bold: true } },
    { text: "   :> TraceableElement;\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "EvidenceElement", options: { color: C.codeStr, bold: true } },
    { text: "     :> TraceableElement;\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "InterfaceElement", options: { color: C.codeStr, bold: true } },
    { text: "    :> TraceableElement;\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "RequirementDriver", options: { color: C.codeStr, bold: true } },
    { text: "   :> TraceableElement;\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 0.55, 2.75, 6.4, 4.05, "core/md_common.sysml", baseRuns);

  // Right: enumerations + relationships
  const enumRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " md::core::enumerations {\n  ", options: { color: C.codeFg } },
    { text: "enum def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "ConcernKind", options: { color: C.codeStr, bold: true } },
    { text: " { safety; usability; cybersecurity;\n                          performance; privacy; regulatory; }\n  ", options: { color: C.codeFg } },
    { text: "enum def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "SafetyClassKind", options: { color: C.codeStr, bold: true } },
    { text: " { none; A; B; C; }\n  ", options: { color: C.codeFg } },
    { text: "enum def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "HazardTypeKind", options: { color: C.codeStr, bold: true } },
    { text: " { overdose; underdose; occlusion;\n                          freeFlow; airInLine; reverseDelivery; … }\n  ", options: { color: C.codeFg } },
    { text: "enum def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "ThreatCategoryKind", options: { color: C.codeStr, bold: true } },
    { text: " { spoofing; tampering; …;\n                          informationDisclosure; elevationOfPrivilege; }\n}\n\n", options: { color: C.codeFg } },
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " md::core::relationships {\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "SemanticLink", options: { color: C.codeStr, bold: true } },
    { text: "  :> TraceableElement;\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "RequirementSatisfactionLink", options: { color: C.codeStr, bold: true } },
    { text: " :> SemanticLink;\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "VerificationLink", options: { color: C.codeStr, bold: true } },
    { text: "  :> SemanticLink;\n  …\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 7.05, 2.75, 5.75, 4.05, "core/md_enumerations.sysml + md_relationships.sysml", enumRuns);

  callout(s, 0.55, 6.85, 12.25, 0.45, "28+ enums.", "ConcernKind · CriticalityKind · SafetyClassKind · HazardTypeKind · RiskControlKind · ThreatCategoryKind · CyberControlKind · AudienceKind · WorkflowStageKind · DocumentViewKind …");
  footer(s, 13);
}

// ============================================================================
// SLIDE 14 — md::architecture · 13 layers
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "14", "md::architecture · LAYERS");
  title(s, "Thirteen ontology layers under md::architecture", "Each layer is a sub-package. Layers progress from intent and need to solution and evidence; risk and cybersecurity are peers.");

  const layers = [
    { name: "context",            blurb: "Actor, UseContext",                               c: C.L_context },
    { name: "requirements",       blurb: "StakeholderNeed, Requirement, SystemRequirement, SoftwareRequirement, HardwareRequirement", c: C.L_req },
    { name: "functions",          blurb: "LogicalFunction, LogicalFlow, DataDefinition, ControlDefinition", c: C.L_func },
    { name: "behavior",           blurb: "BehaviorMachine, ModeState, Transition, Contract, AssumeProperty, GuaranteeProperty", c: C.L_behavior },
    { name: "logical_structure",  blurb: "LogicalComponent",                                c: C.L_logical },
    { name: "logical_interfaces", blurb: "LogicalInterface (domain · kind · pattern)",     c: C.L_iface },
    { name: "software_structure", blurb: "SoftwareSystem, SoftwareComponent (period, deadline, WCET, scheduling)", c: C.L_software },
    { name: "hardware_structure", blurb: "HardwareAssembly",                                c: C.L_hardware },
    { name: "physical_interfaces",blurb: "PhysicalInterface, PortBinding",                  c: C.L_iface },
    { name: "constraints",        blurb: "ConstraintDefinition (timing, resource, env)",    c: C.L_constr },
    { name: "risk",               blurb: "Hazard, RiskBeforeMitigation, RiskAfterMitigation, RiskMatrix, RiskControl", c: C.L_risk },
    { name: "cybersecurity",      blurb: "CybersecurityAsset, AttackSurface, Threat, Vulnerability, Mitigation", c: C.L_cyber },
    { name: "assurance",          blurb: "VerificationCase, TestArtifact, Evidence",        c: C.L_assurance },
  ];

  // 2 columns × 7 rows
  const colW = 6.0, rh = 0.46, gap = 0.07;
  layers.forEach((l, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.55 + col * (colW + 0.3);
    const y = 2.7 + row * (rh + gap);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: colW, h: rh, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.14, h: rh, fill: { color: l.c }, line: { color: l.c } });
    s.addText(l.name, { x: x + 0.25, y, w: 1.85, h: rh, margin: 0, fontSize: 11.5, bold: true, color: C.ink, valign: "middle", fontFace: FONT_MONO });
    s.addText(l.blurb, { x: x + 2.15, y, w: colW - 2.25, h: rh, margin: 0, fontSize: 9.5, color: C.gray, valign: "middle", fontFace: FONT });
  });

  callout(s, 0.55, 6.7, 12.25, 0.45, "Reading.", "Cybersecurity is a peer to safety/software/hardware/assurance — modeled as ontology layer, not bolted on later.");
  footer(s, 14);
}

// ============================================================================
// SLIDE 15 — context + requirements (real SysML)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "15", "ARCH · CONTEXT + REQUIREMENTS");
  title(s, "Stakeholders, intended use, requirements as kinds", "Specialize abstract bases. Attributes carry the regulator-relevant fields.");

  const ctxRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " md::architecture::context {\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "Actor", options: { color: C.codeStr, bold: true } },
    { text: " :> ", options: { color: C.codeFg } },
    { text: "TraceableElement", options: { color: C.codeStr } },
    { text: " {\n    attribute actorKind     : String;\n    attribute trainingLevel : String;\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "UseContext", options: { color: C.codeStr, bold: true } },
    { text: " :> ", options: { color: C.codeFg } },
    { text: "TraceableElement", options: { color: C.codeStr } },
    { text: " {\n    attribute careSetting   : String;\n    attribute environment   : String;\n    attribute jurisdiction  : String;\n    attribute connectedUse  : Boolean;\n  }\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 0.55, 2.75, 6.0, 4.05, "architecture/md_context.sysml", ctxRuns);

  const reqRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " md::architecture::requirements {\n  ", options: { color: C.codeFg } },
    { text: "requirement def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "StakeholderNeed", options: { color: C.codeStr, bold: true } },
    { text: " :> ", options: { color: C.codeFg } },
    { text: "RequirementDriver", options: { color: C.codeStr } },
    { text: " {\n    attribute statement : String;\n    attribute priority  : String;\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "requirement def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "Requirement", options: { color: C.codeStr, bold: true } },
    { text: " :> ", options: { color: C.codeFg } },
    { text: "VerifiableElement", options: { color: C.codeStr } },
    { text: " {\n    attribute statement          : String;\n    attribute sourceKind         : ", options: { color: C.codeFg } },
    { text: "RequirementSourceKind", options: { color: "C4B5FD" } },
    { text: ";\n    attribute concernKind        : ", options: { color: C.codeFg } },
    { text: "ConcernKind", options: { color: "C4B5FD" } },
    { text: ";\n    attribute status             : ", options: { color: C.codeFg } },
    { text: "RequirementStatusKind", options: { color: "C4B5FD" } },
    { text: ";\n    attribute acceptanceCriteria : String;\n    attribute assumptionSummary  : String;\n    attribute guaranteeSummary   : String;\n  }\n  ", options: { color: C.codeFg } },
    { text: "requirement def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "SoftwareRequirement", options: { color: C.codeStr, bold: true } },
    { text: " :> ", options: { color: C.codeFg } },
    { text: "Requirement", options: { color: C.codeStr } },
    { text: " {\n    attribute safetyClass : ", options: { color: C.codeFg } },
    { text: "SafetyClassKind", options: { color: "C4B5FD" } },
    { text: ";\n  }\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 6.65, 2.75, 6.15, 4.05, "architecture/md_requirements.sysml", reqRuns);

  callout(s, 0.55, 6.85, 12.25, 0.45, "SysML idiom.", "Requirements use SysML v2 requirement def — they are first-class verifiable elements, not docstring fields on parts.");
  footer(s, 15);
}

// ============================================================================
// SLIDE 16 — functions + behavior (real SysML)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "16", "ARCH · FUNCTIONS + BEHAVIOR");
  title(s, "Functions, modes, contracts — assume / guarantee built in", "Behavior carries formal properties. Contracts attach to architecture elements and feed model checking.");

  const fnRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " md::architecture::functions {\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "LogicalFunction", options: { color: C.codeStr, bold: true } },
    { text: " :> ", options: { color: C.codeFg } },
    { text: "ArchitectureElement", options: { color: C.codeStr } },
    { text: " {\n    attribute functionCategory : String;\n    attribute trigger          : String;\n    attribute concernKind      : ", options: { color: C.codeFg } },
    { text: "ConcernKind", options: { color: "C4B5FD" } },
    { text: ";\n    attribute criticality      : ", options: { color: C.codeFg } },
    { text: "CriticalityKind", options: { color: "C4B5FD" } },
    { text: ";\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "LogicalFlow", options: { color: C.codeStr, bold: true } },
    { text: " :> ArchitectureElement {\n    attribute flowKind        : ", options: { color: C.codeFg } },
    { text: "FlowKind", options: { color: "C4B5FD" } },
    { text: ";\n    attribute direction       : ", options: { color: C.codeFg } },
    { text: "DirectionKind", options: { color: "C4B5FD" } },
    { text: ";\n    attribute latencyBudgetMs : Real;\n    attribute integrityLevel  : String;\n  }\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 0.55, 2.75, 6.05, 4.05, "architecture/md_functions.sysml", fnRuns);

  const behRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " md::architecture::behavior {\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "BehaviorMachine", options: { color: C.codeStr, bold: true } },
    { text: " :> ArchitectureElement;\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "ModeState", options: { color: C.codeStr, bold: true } },
    { text: "      :> ArchitectureElement;\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "Transition", options: { color: C.codeStr, bold: true } },
    { text: "     :> ArchitectureElement {\n    attribute trigger         : String;\n    attribute guardSummary    : String;\n    attribute effectSummary   : String;\n    attribute sameStepCritical: Boolean;\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "BehaviorProperty", options: { color: C.codeStr, bold: true } },
    { text: " :> ", options: { color: C.codeFg } },
    { text: "VerifiableElement", options: { color: C.codeStr } },
    { text: " {\n    attribute propertyKind     : ", options: { color: C.codeFg } },
    { text: "BehaviorPropertyKind", options: { color: "C4B5FD" } },
    { text: ";\n    attribute languageKind     : ", options: { color: C.codeFg } },
    { text: "PropertyLanguageKind", options: { color: "C4B5FD" } },
    { text: ";\n    attribute formalExpression : String;\n  }\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "AssumeProperty", options: { color: C.codeStr, bold: true } },
    { text: "    :> BehaviorProperty;\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "GuaranteeProperty", options: { color: C.codeStr, bold: true } },
    { text: " :> BehaviorProperty;\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "Contract", options: { color: C.codeStr, bold: true } },
    { text: "          :> VerifiableElement;\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 6.7, 2.75, 6.1, 4.05, "architecture/md_behavior.sysml", behRuns);

  callout(s, 0.55, 6.85, 12.25, 0.45, "Properties carry language.", "AGREE-like, LTL-like, CTL-like — property language is captured, so model checkers can target the right ones.");
  footer(s, 16);
}

// ============================================================================
// SLIDE 17 — risk + cybersecurity (real SysML)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "17", "ARCH · RISK + CYBERSECURITY");
  title(s, "Safety and security as peer ontology layers", "Hazard chain on one side, threat chain on the other — both feed the same RequirementDriver / VerifiableElement contract.");

  const riskRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " md::architecture::risk {\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "Hazard", options: { color: C.codeStr, bold: true } },
    { text: " :> TraceableElement {\n    attribute hazardType  : ", options: { color: C.codeFg } },
    { text: "HazardTypeKind", options: { color: "C4B5FD" } },
    { text: ";\n    attribute foreseeable : Boolean;\n  }\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "RiskBeforeMitigation", options: { color: C.codeStr, bold: true } },
    { text: " :> Risk {\n    attribute foreseeableMisuseIncluded : Boolean;\n  }\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "RiskAfterMitigation", options: { color: C.codeStr, bold: true } },
    { text: "  :> Risk {\n    attribute residualAcceptability : String;\n    attribute benefitRiskRequired   : Boolean;\n  }\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "RiskControl", options: { color: C.codeStr, bold: true } },
    { text: " :> ", options: { color: C.codeFg } },
    { text: "VerifiableElement", options: { color: C.codeStr } },
    { text: " {\n    attribute controlKind : ", options: { color: C.codeFg } },
    { text: "RiskControlKind", options: { color: "C4B5FD" } },
    { text: ";\n  }\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 0.55, 2.75, 6.05, 4.05, "architecture/md_risk.sysml", riskRuns);

  const cyberRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " md::architecture::cybersecurity {\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "CybersecurityAsset", options: { color: C.codeStr, bold: true } },
    { text: " :> ArchitectureElement {\n    attribute assetKind            : ", options: { color: C.codeFg } },
    { text: "AssetKind", options: { color: "C4B5FD" } },
    { text: ";\n    attribute confidentialityNeed  : String;\n    attribute integrityNeed        : String;\n    attribute availabilityNeed     : String;\n    attribute safetyRelevant       : Boolean;\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "AttackSurface", options: { color: C.codeStr, bold: true } },
    { text: " :> TraceableElement {\n    attribute entryPointKind          : ", options: { color: C.codeFg } },
    { text: "InterfaceKind", options: { color: "C4B5FD" } },
    { text: ";\n    attribute exposureLevel           : String;\n    attribute authenticationExpected  : Boolean;\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "Threat", options: { color: C.codeStr, bold: true } },
    { text: " :> ", options: { color: C.codeFg } },
    { text: "RequirementDriver", options: { color: C.codeStr } },
    { text: " {\n    attribute threatCategory : ", options: { color: C.codeFg } },
    { text: "ThreatCategoryKind", options: { color: "C4B5FD" } },
    { text: ";\n    attribute attackVector   : String;\n    attribute strideCategory : ", options: { color: C.codeFg } },
    { text: "ThreatCategoryKind", options: { color: "C4B5FD" } },
    { text: ";\n  }\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 6.7, 2.75, 6.1, 4.05, "architecture/md_cybersecurity.sysml", cyberRuns);

  callout(s, 0.55, 6.85, 12.25, 0.45, "Why peers.", "Threat :> RequirementDriver — exactly like Risk. Same downstream machinery generates security requirements and verification.");
  footer(s, 17);
}

// ============================================================================
// SLIDE 18 — typed semantic links (real SysML)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "18", "TYPED SEMANTIC LINKS");
  title(s, "Links carry roles — not just direction", "Every link is a SemanticLink subtype with named part roles. Linker checks kind on each end.");

  const linkRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " md::core::relationships {\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "SemanticLink", options: { color: C.codeStr, bold: true } },
    { text: " :> TraceableElement {\n    attribute linkStatus : ", options: { color: C.codeFg } },
    { text: "LinkStatusKind", options: { color: "C4B5FD" } },
    { text: ";\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "RequirementSourceLink", options: { color: C.codeStr, bold: true } },
    { text: " :> SemanticLink {\n    attribute sourceRole       : String;\n    part      sourceDriver     : ", options: { color: C.codeFg } },
    { text: "RequirementDriver", options: { color: C.codeStr } },
    { text: ";\n    part      targetRequirement: ", options: { color: C.codeFg } },
    { text: "VerifiableElement", options: { color: C.codeStr } },
    { text: ";\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "FunctionAllocationLink", options: { color: C.codeStr, bold: true } },
    { text: " :> SemanticLink {\n    part function          : ", options: { color: C.codeFg } },
    { text: "ArchitectureElement", options: { color: C.codeStr } },
    { text: ";\n    part allocatedElement  : ", options: { color: C.codeFg } },
    { text: "ArchitectureElement", options: { color: C.codeStr } },
    { text: ";\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "VerificationLink", options: { color: C.codeStr, bold: true } },
    { text: " :> SemanticLink {\n    part verificationTarget : ", options: { color: C.codeFg } },
    { text: "VerifiableElement", options: { color: C.codeStr } },
    { text: ";\n    part verificationCase   : ", options: { color: C.codeFg } },
    { text: "VerifiableElement", options: { color: C.codeStr } },
    { text: ";\n  }\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 0.55, 2.75, 7.0, 4.05, "core/md_relationships.sysml", linkRuns);

  // Right: link taxonomy
  const rx = 7.7, rw = 5.1;
  const groups = [
    { name: "Requirement", c: C.L_req,        rels: "RequirementSourceLink · RequirementSatisfactionLink" },
    { name: "Function",    c: C.L_func,       rels: "FunctionAllocationLink" },
    { name: "Interface",   c: C.L_iface,      rels: "InterfaceRealizationLink · TrustBoundaryCrossingLink" },
    { name: "Verification",c: C.L_assurance,  rels: "VerificationLink · EvidenceProductionLink · DocumentInclusionLink" },
    { name: "Risk",        c: C.L_risk,       rels: "RiskTraceLink (initiates · leadsTo · canCause · resultsIn · aggregates …)" },
    { name: "Cyber",       c: C.L_cyber,      rels: "AssetThreatLink · ThreatVulnerabilityLink · CyberSafetyTraceLink" },
    { name: "Execution",   c: C.violet,       rels: "ExecutionOrderLink (sameStepRequired)" },
    { name: "Methodology", c: C.tealDeep,     rels: "MethodologyBindingLink" },
  ];
  groups.forEach((g, i) => {
    const y = 2.75 + i * 0.51;
    s.addShape(pres.shapes.RECTANGLE, { x: rx, y, w: rw, h: 0.45, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addShape(pres.shapes.RECTANGLE, { x: rx, y, w: 0.1, h: 0.45, fill: { color: g.c }, line: { color: g.c } });
    s.addText(g.name, { x: rx + 0.18, y, w: 1.3, h: 0.45, margin: 0, fontSize: 11, bold: true, color: C.ink, valign: "middle", fontFace: FONT_HEAD });
    s.addText(g.rels, { x: rx + 1.5, y, w: rw - 1.6, h: 0.45, margin: 0, fontSize: 9.5, color: C.gray, valign: "middle", fontFace: FONT_MONO });
  });
  footer(s, 18);
}

// ============================================================================
// SLIDE 19 — md::methodology
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "19", "md::methodology");
  title(s, "Methodology shapes how the ontology is applied", "Definitions select rigor, viewpoints, rules, patterns, gates. Resolved methodologies bind to a project.");

  // Code excerpt
  const codeRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " md::methodology::profiles {\n\n  ", options: { color: C.codeFg } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "mdCoreLibrary", options: { color: C.codeStr, bold: true } },
    { text: " : ", options: { color: C.codeFg } },
    { text: "MethodologyLibrary", options: { color: C.codeStr } },
    { text: " {\n    attribute id      = ", options: { color: C.codeFg } },
    { text: "\"METHLIB-001\"", options: { color: C.codeNum } },
    { text: ";\n    attribute name    = ", options: { color: C.codeFg } },
    { text: "\"MedicalDeviceMethodologyLibrary\"", options: { color: C.codeNum } },
    { text: ";\n    attribute version = ", options: { color: C.codeFg } },
    { text: "\"0.1\"", options: { color: C.codeNum } },
    { text: ";\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "mdLightDefaultDefinition", options: { color: C.codeStr, bold: true } },
    { text: " : ", options: { color: C.codeFg } },
    { text: "MethodologyDefinition", options: { color: C.codeStr } },
    { text: " {\n    attribute description = ", options: { color: C.codeFg } },
    { text: "\"Light default methodology around the\n     ontology for smaller or early project use.\"", options: { color: C.codeNum } },
    { text: ";\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "mdLightDefaultResolved", options: { color: C.codeStr, bold: true } },
    { text: " : ", options: { color: C.codeFg } },
    { text: "ResolvedMethodology", options: { color: C.codeStr } },
    { text: " {\n    attribute rigor = ", options: { color: C.codeFg } },
    { text: "MethodRigorKind::lightweight", options: { color: "F87171", bold: true } },
    { text: ";\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "riskView", options: { color: C.codeStr, bold: true } },
    { text: " : ", options: { color: C.codeFg } },
    { text: "Viewpoint", options: { color: C.codeStr } },
    { text: " {\n    attribute purpose  = ", options: { color: C.codeFg } },
    { text: "\"Focus on risk chain, controls,\n                          verification, residual risk.\"", options: { color: C.codeNum } },
    { text: ";\n    attribute audience = ", options: { color: C.codeFg } },
    { text: "AudienceKind::safetyEngineer", options: { color: "F87171", bold: true } },
    { text: ";\n    attribute stage    = ", options: { color: C.codeFg } },
    { text: "WorkflowStageKind::risk", options: { color: "F87171", bold: true } },
    { text: ";\n  }\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 0.55, 2.75, 7.5, 4.05, "methodology/md_profiles.sysml", codeRuns);

  // Right: method package map
  const rx = 8.25, rw = 4.55;
  const items = [
    { f: "core",      d: "MethodologyDefinition · ResolvedMethodology · ProjectMethodBinding" },
    { f: "profiles",  d: "instances: light, balanced, formal" },
    { f: "viewpoints",d: "default viewpoints per audience/stage" },
    { f: "rules",     d: "ViewRule (required · recommended · forbidden)" },
    { f: "patterns",  d: "ModelingPattern — recurring shapes" },
    { f: "workflow",  d: "WorkflowStage sequencing" },
    { f: "gates",     d: "ReviewGate, exit criteria" },
  ];
  items.forEach((it, i) => {
    const y = 2.75 + i * 0.55;
    s.addShape(pres.shapes.RECTANGLE, { x: rx, y, w: rw, h: 0.5, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addText(it.f, { x: rx + 0.15, y, w: 1.4, h: 0.5, margin: 0, fontSize: 11, bold: true, color: C.violet, valign: "middle", fontFace: FONT_MONO });
    s.addText(it.d, { x: rx + 1.6, y, w: rw - 1.7, h: 0.5, margin: 0, fontSize: 9.5, color: C.gray, valign: "middle", fontFace: FONT });
  });
  footer(s, 19);
}

// ============================================================================
// SLIDE 20 — md::viewpoints + md::views
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "20", "md::viewpoints + md::views");
  title(s, "Viewpoints declare intent. Views bind it to content.", "First-class libraries — not buried under methodology or compliance. Selection queries are explicit.");

  const vpRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " md::viewpoints::core {\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "Viewpoint", options: { color: C.codeStr, bold: true } },
    { text: " :> ", options: { color: C.codeFg } },
    { text: "DocumentedElement", options: { color: C.codeStr } },
    { text: " {\n    attribute purpose                  : String;\n    attribute audience                 : ", options: { color: C.codeFg } },
    { text: "AudienceKind", options: { color: "C4B5FD" } },
    { text: "[*];\n    attribute stage                    : ", options: { color: C.codeFg } },
    { text: "WorkflowStageKind", options: { color: "C4B5FD" } },
    { text: ";\n    attribute outputKind               : ", options: { color: C.codeFg } },
    { text: "ViewOutputKind", options: { color: "C4B5FD" } },
    { text: "[*];\n    attribute presentationKind         : ", options: { color: C.codeFg } },
    { text: "PresentationKind", options: { color: "C4B5FD" } },
    { text: "[*];\n    attribute concern                  : ", options: { color: C.codeFg } },
    { text: "ConcernKind", options: { color: "C4B5FD" } },
    { text: "[*];\n    attribute includedLayers           : String[*];\n    attribute allowedElementKinds      : String[*];\n    attribute allowedRelationshipKinds : String[*];\n    attribute filterExpression         : String;\n  }\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 0.55, 2.75, 6.15, 4.05, "viewpoints/md_viewpoint_core.sysml", vpRuns);

  const viewRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " md::views::core {\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "ViewSelectionQuery", options: { color: C.codeStr, bold: true } },
    { text: " :> TraceableElement {\n    attribute includeElementKinds      : String[*];\n    attribute includeRelationshipKinds : String[*];\n    attribute includeLayers            : String[*];\n    attribute includeConcerns          : ", options: { color: C.codeFg } },
    { text: "ConcernKind", options: { color: "C4B5FD" } },
    { text: "[*];\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "View", options: { color: C.codeStr, bold: true } },
    { text: " :> ", options: { color: C.codeFg } },
    { text: "DocumentedElement", options: { color: C.codeStr } },
    { text: " {\n    part viewpoint            : ", options: { color: C.codeFg } },
    { text: "Viewpoint", options: { color: C.codeStr } },
    { text: ";\n    ref  exposesElement       : ", options: { color: C.codeFg } },
    { text: "TraceableElement", options: { color: C.codeStr } },
    { text: "[*];\n    ref  exposesRelationship  : ", options: { color: C.codeFg } },
    { text: "SemanticLink", options: { color: C.codeStr } },
    { text: "[*];\n    part selectionQuery       : ViewSelectionQuery[*];\n  }\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "DiagramView", options: { color: C.codeStr, bold: true } },
    { text: "         :> View;\n  ", options: { color: C.codeFg } },
    { text: "part def", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "DocumentBackedView", options: { color: C.codeStr, bold: true } },
    { text: " :> View {\n    attribute version : String;\n    attribute lifecycleState : ", options: { color: C.codeFg } },
    { text: "LifecycleStateKind", options: { color: "C4B5FD" } },
    { text: ";\n  }\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 6.85, 2.75, 5.95, 4.05, "views/md_view_core.sysml", viewRuns);

  callout(s, 0.55, 6.85, 12.25, 0.45, "Separation.", "Viewpoint = intent (audience, stage, allowed kinds). View = bound content (selection query, exposed elements, presentation).");
  footer(s, 20);
}

// ============================================================================
// SLIDE 21 — Extension framework (methodology profiles)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "21", "EXTENSION");
  title(s, "Extend through methodology profiles", "Pick rigor. Pick viewpoints. Pick rules. Bind to project. The ontology stays unchanged.");

  // Five steps
  const steps = [
    { num: "1", t: "Pick rigor",         file: "MethodRigorKind",          ex: "rigor = lightweight\n     | balanced\n     | formal",        c: C.green },
    { num: "2", t: "Pick viewpoints",    file: "Viewpoint instances",      ex: "audience = safetyEngineer\nstage    = risk",                c: C.amber },
    { num: "3", t: "Author rules",       file: "ViewRule instances",       ex: "elementTypeName = \"Hazard\"\nrelationTypeName = \"RiskTrace\"\nstrength = required", c: C.amber },
    { num: "4", t: "Bind to project",    file: "ProjectMethodBinding",     ex: "projectName = \"GPCA Pump\"\nresolvedMethodology = ...",    c: C.coral },
    { num: "5", t: "Add domain kinds",   file: "your own md::*  package",  ex: "part def InfusionMode :>\n     ModeState { ... }",            c: C.red },
  ];

  const rh = 0.74, gap = 0.07;
  steps.forEach((w, i) => {
    const y = 2.75 + i * (rh + gap);
    s.addShape(pres.shapes.RECTANGLE, { x: 0.55, y, w: 12.25, h: rh, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addShape(pres.shapes.OVAL, { x: 0.7, y: y + (rh - 0.5) / 2, w: 0.5, h: 0.5, fill: { color: w.c }, line: { color: w.c } });
    s.addText(w.num, { x: 0.7, y: y + (rh - 0.5) / 2, w: 0.5, h: 0.5, margin: 0, fontSize: 18, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT_HEAD });
    s.addText(w.t, { x: 1.4, y: y + 0.06, w: 3.6, h: 0.32, margin: 0, fontSize: 13, bold: true, color: C.ink, fontFace: FONT_HEAD });
    s.addText(w.file, { x: 1.4, y: y + 0.4, w: 3.6, h: 0.3, margin: 0, fontSize: 10, color: w.c, bold: true, fontFace: FONT_MONO });
    s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: y + 0.08, w: 7.4, h: rh - 0.16, fill: { color: C.codeBg }, line: { color: C.codeBg } });
    s.addText(w.ex, { x: 5.35, y: y + 0.08, w: 7.2, h: rh - 0.16, margin: 0, fontSize: 10, color: "7CE5C2", valign: "middle", fontFace: FONT_MONO });
  });

  callout(s, 0.55, 6.85, 12.25, 0.45, "Rule.", "Add packages and methodology profiles. Don't edit core. Methodology guides without owning viewpoints.");
  footer(s, 21);
}

// ============================================================================
// SLIDE 22 — GPCA introduction
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "22", "WORKED EXAMPLE · GPCA");
  title(s, "Meet GPCA — md::examples::gpca", "Generic Patient-Controlled Analgesia infusion pump. Public-domain U. Minnesota CriSys benchmark, IEC 62304 Class C.");

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
    { text: "Stakeholders, intended use, user needs", options: { bullet: true, breakLine: true } },
    { text: "Hierarchical mode machine OFF/IDLE/PAUSED/BASAL/SQUARE/PATIENT_BOLUS", options: { bullet: true, breakLine: true } },
    { text: "Software components TLM · Alarm · InfusionMgr · 5+ more", options: { bullet: true, breakLine: true } },
    { text: "Hazard chain + lockout RiskControl + benefit-risk eval", options: { bullet: true, breakLine: true } },
    { text: "AGREE-like guarantees + LTL temporal properties", options: { bullet: true } },
  ], { x: 0.75, y: 5.5, w: 5.3, h: 1.3, margin: 0, fontSize: 11.5, color: C.gray, fontFace: FONT, paraSpaceAfter: 3 });

  // Right packages
  s.addText("md::examples::gpca::*", { x: 6.5, y: 2.75, w: 6.3, h: 0.3, margin: 0, fontSize: 11, bold: true, color: C.tealDeep, charSpacing: 3, fontFace: FONT_MONO });
  const pkgs = [
    { f: "requirements",      d: "needs · system & software requirements",     c: C.L_req },
    { f: "architecture",      d: "hardware assemblies + software components",   c: C.blue },
    { f: "interfaces",        d: "logical + physical interfaces",               c: C.L_iface },
    { f: "behavior_modes",    d: "16-state hierarchical mode machine",          c: C.L_behavior },
    { f: "behavior_subsystems",d: "function decomposition per subsystem",       c: C.L_behavior },
    { f: "formal_behavior",   d: "Contracts · AGREE-like · LTL properties",     c: C.violet },
    { f: "risk",              d: "hazard chain + RiskControl + residual eval",  c: C.L_risk },
    { f: "cybersecurity",     d: "threat model + STRIDE scenarios + controls", c: C.L_cyber },
    { f: "verification",      d: "VerificationCase · TestArtifact · Evidence", c: C.L_assurance },
    { f: "trace",             d: "all SemanticLink instances across layers",    c: C.tealDeep },
    { f: "views, document_views", d: "DiagramView + DocumentBackedView (RMF, SDD, V&V)", c: C.amber },
    { f: "methodology",       d: "ProjectMethodBinding for GPCA",              c: C.green },
  ];
  pkgs.forEach((p, i) => {
    const y = 3.1 + i * 0.31;
    s.addShape(pres.shapes.RECTANGLE, { x: 6.5, y, w: 6.3, h: 0.27, fill: { color: C.bg }, line: { color: C.border, width: 1 } });
    s.addShape(pres.shapes.RECTANGLE, { x: 6.5, y, w: 0.1, h: 0.27, fill: { color: p.c }, line: { color: p.c } });
    s.addText(p.f, { x: 6.7, y, w: 2.0, h: 0.27, margin: 0, fontSize: 10, bold: true, color: C.ink, valign: "middle", fontFace: FONT_MONO });
    s.addText(p.d, { x: 8.75, y, w: 4.05, h: 0.27, margin: 0, fontSize: 9.5, color: C.gray, valign: "middle", fontFace: FONT });
  });
  footer(s, 22);
}

// ============================================================================
// SLIDE 23 — GPCA architecture + requirements
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "23", "GPCA · ARCHITECTURE + REQUIREMENTS");
  title(s, "Software components and the requirements they satisfy", "Real instances — not pseudo-code. SafetyClassKind::C is an enum; periodMs / WCET are typed; statements are full SysML.");

  const archRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " md::examples::gpca::architecture {\n\n  ", options: { color: C.codeFg } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "tlm", options: { color: C.codeStr, bold: true } },
    { text: " : ", options: { color: C.codeFg } },
    { text: "SoftwareComponent", options: { color: C.codeStr } },
    { text: " {\n    attribute id              = ", options: { color: C.codeFg } },
    { text: "\"SW-001\"", options: { color: C.codeNum } },
    { text: ";\n    attribute name            = ", options: { color: C.codeFg } },
    { text: "\"Top_Level_Mode\"", options: { color: C.codeNum } },
    { text: ";\n    attribute responsibility  = ", options: { color: C.codeFg } },
    { text: "\"Ensure ON/OFF, startup/shutdown checks\"", options: { color: C.codeNum } },
    { text: ";\n    attribute safetyClass     = ", options: { color: C.codeFg } },
    { text: "SafetyClassKind::C", options: { color: "F87171", bold: true } },
    { text: ";\n    attribute periodMs        = ", options: { color: C.codeFg } },
    { text: "20.0", options: { color: C.codeNum } },
    { text: ";\n    attribute deadlineMs      = ", options: { color: C.codeFg } },
    { text: "20.0", options: { color: C.codeNum } },
    { text: ";\n    attribute wcetMs          = ", options: { color: C.codeFg } },
    { text: "2.0", options: { color: C.codeNum } },
    { text: ";\n    attribute schedulingPolicy = ", options: { color: C.codeFg } },
    { text: "fixedPriorityPreemptive", options: { color: "F87171", bold: true } },
    { text: ";\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "alarm", options: { color: C.codeStr, bold: true } },
    { text: "      : SoftwareComponent { /* SW-003 · Class C */ }\n  ", options: { color: C.codeFg } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "infusionMgr", options: { color: C.codeStr, bold: true } },
    { text: ": SoftwareComponent { /* SW-005 · Class C */ }\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 0.55, 2.75, 6.4, 4.05, "examples/gpca/gpca_architecture.sysml", archRuns);

  const reqRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " md::examples::gpca::requirements {\n\n  ", options: { color: C.codeFg } },
    { text: "requirement", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "needSafeTherapy", options: { color: C.codeStr, bold: true } },
    { text: " : ", options: { color: C.codeFg } },
    { text: "StakeholderNeed", options: { color: C.codeStr } },
    { text: " {\n    attribute id        = ", options: { color: C.codeFg } },
    { text: "\"NEED-001\"", options: { color: C.codeNum } },
    { text: ";\n    attribute statement = ", options: { color: C.codeFg } },
    { text: "\"Support safe patient-controlled\n                            analgesic infusion therapy.\"", options: { color: C.codeNum } },
    { text: ";\n    attribute priority  = ", options: { color: C.codeFg } },
    { text: "\"high\"", options: { color: C.codeNum } },
    { text: ";\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "requirement", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "reqLockout", options: { color: C.codeStr, bold: true } },
    { text: " : ", options: { color: C.codeFg } },
    { text: "SoftwareRequirement", options: { color: C.codeStr } },
    { text: " {\n    attribute id           = ", options: { color: C.codeFg } },
    { text: "\"REQ-025\"", options: { color: C.codeNum } },
    { text: ";\n    attribute statement    = ", options: { color: C.codeFg } },
    { text: "\"Ignore patient bolus requests that\n                            violate lockout or max bolus.\"", options: { color: C.codeNum } },
    { text: ";\n    attribute sourceKind   = ", options: { color: C.codeFg } },
    { text: "RequirementSourceKind::risk", options: { color: "F87171", bold: true } },
    { text: ";\n    attribute concernKind  = ", options: { color: C.codeFg } },
    { text: "ConcernKind::safety", options: { color: "F87171", bold: true } },
    { text: ";\n    attribute safetyClass  = ", options: { color: C.codeFg } },
    { text: "SafetyClassKind::C", options: { color: "F87171", bold: true } },
    { text: ";\n  }\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 7.05, 2.75, 5.75, 4.05, "examples/gpca/gpca_requirements.sysml", reqRuns);
  footer(s, 23);
}

// ============================================================================
// SLIDE 24 — GPCA risk
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "24", "GPCA · RISK");
  title(s, "Hazard → Sequence → Situation → Harm → Risk → Control → Residual", "Six-link chain expressed as RiskTraceLink instances. Each node is typed; severity, probability, acceptability are enums.");

  const riskRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " md::examples::gpca::risk {\n\n  ", options: { color: C.codeFg } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "overdoseHazard", options: { color: C.codeStr, bold: true } },
    { text: " : ", options: { color: C.codeFg } },
    { text: "Hazard", options: { color: C.codeStr } },
    { text: " {\n    attribute hazardType  = ", options: { color: C.codeFg } },
    { text: "HazardTypeKind::overdose", options: { color: "F87171", bold: true } },
    { text: ";\n    attribute foreseeable = ", options: { color: C.codeFg } },
    { text: "true", options: { color: C.codeNum } },
    { text: ";\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "seqFrequentBolus", options: { color: C.codeStr, bold: true } },
    { text: "        : SequenceOfEvents;\n  ", options: { color: C.codeFg } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "hsExcessInfusion", options: { color: C.codeStr, bold: true } },
    { text: "        : HazardousSituation;\n  ", options: { color: C.codeFg } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "harmRespiratoryDepression", options: { color: C.codeStr, bold: true } },
    { text: " : ", options: { color: C.codeFg } },
    { text: "Harm", options: { color: C.codeStr } },
    { text: " {\n    attribute criticality = ", options: { color: C.codeFg } },
    { text: "CriticalityKind::catastrophic", options: { color: "F87171", bold: true } },
    { text: ";\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "lockoutControl", options: { color: C.codeStr, bold: true } },
    { text: " : ", options: { color: C.codeFg } },
    { text: "RiskControl", options: { color: C.codeStr } },
    { text: " {\n    attribute controlKind = ", options: { color: C.codeFg } },
    { text: "RiskControlKind::inherentSafeDesign", options: { color: "F87171", bold: true } },
    { text: ";\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "riskBefore", options: { color: C.codeStr, bold: true } },
    { text: " : ", options: { color: C.codeFg } },
    { text: "RiskBeforeMitigation", options: { color: C.codeStr } },
    { text: " {\n    attribute riskLevel     = ", options: { color: C.codeFg } },
    { text: "\"High\"", options: { color: C.codeNum } },
    { text: ";\n    attribute acceptability = ", options: { color: C.codeFg } },
    { text: "\"Unacceptable\"", options: { color: C.codeNum } },
    { text: ";\n  }\n  ", options: { color: C.codeFg } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "riskAfter", options: { color: C.codeStr, bold: true } },
    { text: "  : ", options: { color: C.codeFg } },
    { text: "RiskAfterMitigation", options: { color: C.codeStr } },
    { text: ";\n  ", options: { color: C.codeFg } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " ", options: { color: C.codeFg } },
    { text: "residualEval", options: { color: C.codeStr, bold: true } },
    { text: ": OverallResidualRiskEvaluation;\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 0.55, 2.75, 7.5, 4.0, "examples/gpca/gpca_risk.sysml", riskRuns);

  // Right: chain visualization
  const rx = 8.25, rw = 4.55;
  s.addText("CHAIN", { x: rx, y: 2.75, w: rw, h: 0.3, margin: 0, fontSize: 11, bold: true, color: C.tealDeep, charSpacing: 3, fontFace: FONT });
  const chain = [
    { tag: "Hazard",      val: "overdoseHazard",            c: C.coral },
    { tag: "Sequence",    val: "seqFrequentBolus",          c: C.amber },
    { tag: "Situation",   val: "hsExcessInfusion",          c: C.yellow },
    { tag: "Harm",        val: "harmRespiratoryDepression", c: C.blue },
    { tag: "Control",     val: "lockoutControl",            c: C.green },
    { tag: "Residual",    val: "riskAfter / residualEval",  c: C.violet },
  ];
  chain.forEach((c, i) => {
    const y = 3.1 + i * 0.55;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: rx, y, w: 1.45, h: 0.45, fill: { color: c.c }, line: { color: c.c }, rectRadius: 0.05 });
    s.addText(c.tag, { x: rx, y, w: 1.45, h: 0.45, margin: 0, fontSize: 10.5, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT });
    s.addText(c.val, { x: rx + 1.55, y, w: rw - 1.6, h: 0.45, margin: 0, fontSize: 10, bold: true, color: C.ink, valign: "middle", fontFace: FONT_MONO });
    if (i < chain.length - 1) {
      s.addText("↓", { x: rx + 0.6, y: y + 0.45, w: 0.3, h: 0.1, margin: 0, fontSize: 10, color: C.grayLight, align: "center", fontFace: FONT });
    }
  });
  footer(s, 24);
}

// ============================================================================
// SLIDE 25 — GPCA trace (cross-layer SemanticLink instances)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "25", "GPCA · TRACE");
  title(s, "Traceability is data — not a matrix", "Every link is a typed instance with status. The RMF view, V&V matrix, and impact analysis all read the same SemanticLink instances.");

  const traceRuns = [
    { text: "package", options: { color: C.codeKey, bold: true } },
    { text: " md::examples::gpca::trace {\n\n  ", options: { color: C.codeFg } },
    { text: "// Need → Requirement\n  ", options: { color: C.codeCmt, italic: true } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " linkNeedToModeReq : ", options: { color: C.codeFg } },
    { text: "RequirementSourceLink", options: { color: C.codeStr, bold: true } },
    { text: " {\n    attribute sourceRole       = ", options: { color: C.codeFg } },
    { text: "\"stakeholder need\"", options: { color: C.codeNum } },
    { text: ";\n    part      sourceDriver     = needSafeTherapy;\n    part      targetRequirement= reqSingleMode;\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "// Risk → Software Requirement\n  ", options: { color: C.codeCmt, italic: true } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " linkRiskToLockoutReq : ", options: { color: C.codeFg } },
    { text: "RequirementSourceLink", options: { color: C.codeStr, bold: true } },
    { text: " {\n    attribute sourceRole       = ", options: { color: C.codeFg } },
    { text: "\"risk driver\"", options: { color: C.codeNum } },
    { text: ";\n    part      sourceDriver     = riskBefore;\n    part      targetRequirement= reqLockout;\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "// Requirement → Component\n  ", options: { color: C.codeCmt, italic: true } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " linkReqToIM : ", options: { color: C.codeFg } },
    { text: "RequirementSatisfactionLink", options: { color: C.codeStr, bold: true } },
    { text: " {\n    part requirement       = reqLockout;\n    part satisfyingElement = infusionMgr;\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "// Requirement → VerificationCase\n  ", options: { color: C.codeCmt, italic: true } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " linkVerifyLockoutReq : ", options: { color: C.codeFg } },
    { text: "VerificationLink", options: { color: C.codeStr, bold: true } },
    { text: " {\n    part verificationTarget = reqLockout;\n    part verificationCase   = vcLockout;\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "// VerificationCase → Evidence\n  ", options: { color: C.codeCmt, italic: true } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " linkEvidenceProduction : ", options: { color: C.codeFg } },
    { text: "EvidenceProductionLink", options: { color: C.codeStr, bold: true } },
    { text: " {\n    part producer        = vcLockout;\n    part producedEvidence= evidenceLockout;\n  }\n\n  ", options: { color: C.codeFg } },
    { text: "// Same-step execution constraint\n  ", options: { color: C.codeCmt, italic: true } },
    { text: "part", options: { color: C.codeKey, bold: true } },
    { text: " orderAlarmBeforeIM : ", options: { color: C.codeFg } },
    { text: "ExecutionOrderLink", options: { color: C.codeStr, bold: true } },
    { text: " {\n    attribute sameStepRequired = true;\n    part predecessor = alarm;\n    part successor   = infusionMgr;\n  }\n}", options: { color: C.codeFg } },
  ];
  codePanel(s, 0.55, 2.75, 8.0, 4.05, "examples/gpca/gpca_trace.sysml", traceRuns);

  // Right thread chain
  const rx = 8.75, rw = 4.05;
  s.addText("ONE CLOSED THREAD", { x: rx, y: 2.75, w: rw, h: 0.3, margin: 0, fontSize: 11, bold: true, color: C.tealDeep, charSpacing: 3, fontFace: FONT });
  const thread = [
    { tag: "Need",         val: "needSafeTherapy",     c: C.green },
    { tag: "Requirement",  val: "reqLockout",          c: C.L_req },
    { tag: "Component",    val: "infusionMgr",         c: C.violet },
    { tag: "Risk control", val: "lockoutControl",      c: C.coral },
    { tag: "Verification", val: "vcLockout",           c: C.green },
    { tag: "Evidence",     val: "evidenceLockout",     c: C.teal },
    { tag: "Document",     val: "rmfView",             c: C.amber },
  ];
  thread.forEach((t, i) => {
    const y = 3.1 + i * 0.5;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: rx, y, w: 1.4, h: 0.4, fill: { color: t.c }, line: { color: t.c }, rectRadius: 0.05 });
    s.addText(t.tag, { x: rx, y, w: 1.4, h: 0.4, margin: 0, fontSize: 10, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT });
    s.addText(t.val, { x: rx + 1.5, y, w: rw - 1.55, h: 0.4, margin: 0, fontSize: 10, bold: true, color: C.ink, valign: "middle", fontFace: FONT_MONO });
    if (i < thread.length - 1) {
      s.addText("↓", { x: rx + 0.55, y: y + 0.4, w: 0.3, h: 0.1, margin: 0, fontSize: 9, color: C.grayLight, align: "center", fontFace: FONT });
    }
  });
  footer(s, 25);
}

// ============================================================================
// SLIDE 26 — Strategy 3 horizons
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  badge(s, "26", "ADOPTION STRATEGY");
  title(s, "Three horizons, one trajectory", "Adoption-first roadmap. Earn trust, then grow scope.");

  const horizons = [
    { num: "H1", when: "NOW · 2026", t: "Prove the backbone", items: [
      "open md:: package 1.0.0 (core, architecture, methodology, viewpoints, views, compliance)",
      "GPCA worked example as proof artifact",
      "SysML v2 source, CLI + viewer",
      "seed adoption with one design partner per modality",
    ]},
    { num: "H2", when: "2026–2027", t: "Compile compliance", items: [
      "auto-compiled DocumentBackedView (RMF, SDD, V&V) from one model",
      "typed-link impact analysis & stale-evidence detection",
      "extra layers: AI/ML, alarms, usability",
      "PLM & ALM export adapters",
    ]},
    { num: "H3", when: "2027+", t: "Ecosystem & assurance", items: [
      "device-specific methodology profiles",
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
  footer(s, 26);
}

// ============================================================================
// SLIDE 27 — Call to action
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.ink };
  s.addShape(pres.shapes.OVAL, { x: W - 4, y: -2, w: 8, h: 8, fill: { color: C.teal, transparency: 88 }, line: { color: C.ink } });
  badgeDark(s, "27", "NEXT STEP");
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
  s.addText("md:: 1.0.0 · Open source · SysML v2 · ISO 42010 aligned · INCOSE Medical SE WG",
    { x: 0.7, y: 6.78, w: 9, h: 0.4, margin: 0, fontSize: 13, color: "FFFFFF", fontFace: FONT });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 11.2, y: 6.6, w: 0.5, h: 0.5, fill: { color: C.teal }, line: { color: C.teal }, rectRadius: 0.08 });
  s.addText("M", { x: 11.2, y: 6.6, w: 0.5, h: 0.5, margin: 0, fontSize: 22, bold: true, color: "04101E", align: "center", valign: "middle", fontFace: FONT_HEAD });
  s.addText("MEMO", { x: 11.78, y: 6.6, w: 1.5, h: 0.5, margin: 0, fontSize: 22, bold: true, color: "FFFFFF", valign: "middle", fontFace: FONT_HEAD });
}

pres.writeFile({ fileName: "/Users/someshkashyap/sandbox/memo/docs/presentations/MEMO_INCOSE/MEMO_INCOSE_v4.pptx" })
  .then(f => console.log("Wrote: " + f));
