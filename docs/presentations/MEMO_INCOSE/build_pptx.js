// MEMO INCOSE deck — pptxgenjs build
const pptxgen = require("pptxgenjs");
const path = require("path");

const IMG = (f) => path.join("/Users/someshkashyap/Downloads/MEMO_INCOSE/images", f);

// Palette
const C = {
  ink: "071F35",
  ink2: "0A2540",
  inkLight: "1E293B",
  teal: "2DD4AA",
  tealDeep: "0D8B6F",
  tealSoft: "E6FAF3",
  bg: "F5F7FA",
  card: "FFFFFF",
  border: "DBE2E8",
  borderLight: "EEF2F5",
  gray: "475569",
  gray2: "64748B",
  grayLight: "94A3B8",
  amber: "F59E0B",
  red: "DC2626",
  redSoft: "FFF5F5",
  violet: "8B5CF6",
  violetSoft: "EDE9FE",
  blue: "3B82F6",
  blueSoft: "DBEAFE",
  green: "10B981",
  yellow: "EAB308",
  coral: "EF6C5A",
  white: "FFFFFF",
};

const FONT = "Calibri";
const FONT_HEAD = "Calibri";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";  // 13.33 x 7.5
pres.title = "MEMO — Medical Engineering Modeling Ontology";
pres.author = "MEMO";

const W = 13.33, H = 7.5;

// Helper: badge
function addBadge(slide, num, label, dark = false) {
  const bg = dark ? "0D8B6F" : C.tealDeep;
  const txt = dark ? "7CE5C2" : C.tealDeep;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.55, y: 0.4, w: 0.42, h: 0.42,
    fill: { color: bg }, line: { color: bg }, rectRadius: 0.06,
  });
  slide.addText(num, {
    x: 0.55, y: 0.4, w: 0.42, h: 0.42, margin: 0,
    fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT,
  });
  slide.addText(label, {
    x: 1.07, y: 0.4, w: 6, h: 0.42, margin: 0,
    fontSize: 11, bold: true, color: txt, charSpacing: 4,
    valign: "middle", fontFace: FONT,
  });
}

// Helper: footer
function addFooter(slide, num, total) {
  slide.addText("MEMO ONTOLOGY · INCOSE 2026", {
    x: 0.55, y: 7.05, w: 6, h: 0.3, margin: 0,
    fontSize: 9, color: C.grayLight, charSpacing: 3, fontFace: FONT,
  });
  slide.addText(String(num).padStart(2, "0") + " / " + String(total).padStart(2, "0"), {
    x: 11.78, y: 7.05, w: 1, h: 0.3, margin: 0,
    fontSize: 9, color: C.gray, bold: true, align: "right", charSpacing: 2, fontFace: FONT,
  });
}

// Helper: title block
function addTitle(slide, title, subtitle) {
  slide.addText(title, {
    x: 0.55, y: 1.05, w: 12.2, h: 0.95, margin: 0,
    fontSize: 38, bold: true, color: C.ink, fontFace: FONT_HEAD,
    charSpacing: -1,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.55, y: 2.0, w: 12.2, h: 0.55, margin: 0,
      fontSize: 16, color: C.gray, fontFace: FONT,
    });
  }
}

// Helper: card
function addCard(slide, opts) {
  const { x, y, w, h, accent = C.teal, title, body, iconText, iconBg } = opts;
  // Card body
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: C.bg }, line: { color: C.border, width: 1 },
  });
  // Top accent bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: x + 0.18, y: y, w: w - 0.36, h: 0.06,
    fill: { color: accent }, line: { color: accent },
  });
  // Icon chip
  if (iconText) {
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.22, y: y + 0.25, w: 0.5, h: 0.5,
      fill: { color: iconBg || C.tealSoft }, line: { color: iconBg || C.tealSoft }, rectRadius: 0.08,
    });
    slide.addText(iconText, {
      x: x + 0.22, y: y + 0.25, w: 0.5, h: 0.5, margin: 0,
      fontSize: 11, bold: true, color: accent, align: "center", valign: "middle", fontFace: FONT,
    });
  }
  // Title
  slide.addText(title, {
    x: x + 0.22, y: y + (iconText ? 0.85 : 0.32), w: w - 0.44, h: 0.4, margin: 0,
    fontSize: 15, bold: true, color: C.ink, fontFace: FONT_HEAD,
  });
  // Body
  slide.addText(body, {
    x: x + 0.22, y: y + (iconText ? 1.25 : 0.75), w: w - 0.44, h: h - (iconText ? 1.4 : 0.85), margin: 0,
    fontSize: 12, color: C.gray, fontFace: FONT, paraSpaceAfter: 2,
  });
}

// Helper: callout strip
function addCallout(slide, x, y, w, h, label, body, kind = "ok") {
  const bg = kind === "warn" ? C.redSoft : C.tealSoft;
  const bar = kind === "warn" ? C.red : C.tealDeep;
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h, fill: { color: bg }, line: { color: bg },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w: 0.08, h, fill: { color: bar }, line: { color: bar },
  });
  slide.addText([
    { text: label, options: { bold: true, color: bar } },
    { text: "  " + body, options: { color: C.ink } },
  ], {
    x: x + 0.22, y: y, w: w - 0.4, h, margin: 0, fontSize: 13, valign: "middle", fontFace: FONT,
  });
}

// Helper: flow chip
function addChip(slide, x, y, w, h, label, accent) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h, fill: { color: C.card }, line: { color: C.border, width: 1 },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: x + 0.16, y, w: w - 0.32, h: 0.05, fill: { color: accent }, line: { color: accent },
  });
  slide.addText(label, {
    x, y, w, h, margin: 0,
    fontSize: 12, bold: true, color: C.ink, align: "center", valign: "middle", fontFace: FONT,
  });
}

// Helper: arrow
function addArrow(slide, x, y, w, h) {
  slide.addText("→", {
    x, y, w, h, margin: 0,
    fontSize: 18, color: C.grayLight, align: "center", valign: "middle", fontFace: FONT,
  });
}

// Helper: panel (used in tri-column slides)
function addPanel(slide, opts) {
  const { x, y, w, h, accent = C.teal, title, items } = opts;
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h, fill: { color: C.card }, line: { color: C.border, width: 1 },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: x + 0.18, y, w: w - 0.36, h: 0.06, fill: { color: accent }, line: { color: accent },
  });
  slide.addText(title, {
    x: x + 0.25, y: y + 0.18, w: w - 0.5, h: 0.4, margin: 0,
    fontSize: 14, bold: true, color: C.ink, fontFace: FONT_HEAD,
  });
  const bullets = items.map((t, i) => ({
    text: t, options: { bullet: true, breakLine: i < items.length - 1 },
  }));
  slide.addText(bullets, {
    x: x + 0.25, y: y + 0.7, w: w - 0.5, h: h - 0.85, margin: 0,
    fontSize: 12, color: C.gray, fontFace: FONT, paraSpaceAfter: 4,
  });
}

const TOTAL = 20;

// =====================================================================
// SLIDE 1 — COVER
// =====================================================================
{
  const s = pres.addSlide();
  s.addImage({ path: IMG("01_MEMO_Ontology_Cover.png"), x: 0, y: 0, w: W, h: H });
}

// =====================================================================
// SLIDE 2 — STORY OPEN (dark)
// =====================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.ink };
  // Subtle gradient effect via overlay rectangles (gradients not native — use single tone)
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: W, h: H, fill: { color: "0A3550", transparency: 60 }, line: { color: "0A3550" },
  });
  // Badge (dark style)
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.55, y: 0.4, w: 0.42, h: 0.42,
    fill: { color: C.teal, transparency: 75 }, line: { color: C.teal, width: 1.5 }, rectRadius: 0.06,
  });
  s.addText("02", {
    x: 0.55, y: 0.4, w: 0.42, h: 0.42, margin: 0,
    fontSize: 14, bold: true, color: "7CE5C2", align: "center", valign: "middle", fontFace: FONT,
  });
  s.addText("STORY", {
    x: 1.07, y: 0.4, w: 6, h: 0.42, margin: 0,
    fontSize: 11, bold: true, color: "7CE5C2", charSpacing: 4, valign: "middle", fontFace: FONT,
  });

  // Big quote
  s.addText([
    { text: "It is ", options: { color: "FFFFFF" } },
    { text: "11 p.m. before an audit.", options: { color: C.teal, bold: true } },
    { text: "  An engineer changes one line in ", options: { color: "FFFFFF", breakLine: false } },
    { text: "REQ-145", options: { color: C.teal, bold: true } },
    { text: ". The next morning, no one in the room can answer the question that follows: ", options: { color: "FFFFFF" } },
    { text: "\"What evidence is still valid?\"", options: { color: C.teal, bold: true } },
  ], {
    x: 0.9, y: 1.6, w: 11.5, h: 3.8, margin: 0,
    fontSize: 32, fontFace: FONT_HEAD, charSpacing: -0.5,
    paraSpaceAfter: 6,
  });

  s.addText("A small change. A clean diff. And a safety case that quietly stopped meaning what it said.", {
    x: 0.9, y: 5.6, w: 11.5, h: 0.6, margin: 0,
    fontSize: 16, color: "B8D4E3", fontFace: FONT, italic: true,
  });

  s.addText("— A familiar story across regulated medical engineering", {
    x: 0.9, y: 6.4, w: 11.5, h: 0.4, margin: 0,
    fontSize: 11, color: "7CE5C2", charSpacing: 4, fontFace: FONT, bold: true,
  });
}

// =====================================================================
// SLIDE 3 — Problem (image)
// =====================================================================
{
  const s = pres.addSlide();
  s.addImage({ path: IMG("02_Problem_Evidence_Not_Stable.png"), x: 0, y: 0, w: W, h: H });
}

// =====================================================================
// SLIDE 4 — Drift (image)
// =====================================================================
{
  const s = pres.addSlide();
  s.addImage({ path: IMG("03_Evidence_Drift.png"), x: 0, y: 0, w: W, h: H });
}

// =====================================================================
// SLIDE 5 — Cost of drift
// =====================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  addBadge(s, "05", "WHY IT MATTERS");
  addTitle(s, "Drift is expensive — and quiet",
    "Unverified change is the silent driver of recalls, rework, and audit findings.");

  const cards = [
    { title: "FDA recalls", body: "Software & traceability flagged in roughly one-fifth of Class II/III recalls (FDA MAUDE, 2023).", iconText: "21%", iconBg: C.tealSoft, accent: C.teal },
    { title: "Rework cost", body: "Late-stage requirement and risk rework absorbs 30–45% of typical V&V budgets.", iconText: "~40%", iconBg: "FEF3C7", accent: C.amber },
    { title: "Audit time", body: "Reconstructing a single broken trace before audit: days, not minutes.", iconText: "DAYS", iconBg: C.redSoft, accent: C.red },
    { title: "Lost confidence", body: "Each silent break weakens the safety case the next reviewer reads.", iconText: "↻", iconBg: C.violetSoft, accent: C.violet },
  ];

  const cardW = 2.95, cardH = 3.4, gap = 0.18;
  const startX = (W - cardW * 4 - gap * 3) / 2;
  cards.forEach((c, i) => {
    addCard(s, { x: startX + i * (cardW + gap), y: 2.85, w: cardW, h: cardH, ...c });
  });

  addCallout(s, 0.55, 6.45, 12.2, 0.55,
    "The cost is not the link.",
    "It is the doubt every broken link injects into the case.",
    "warn");

  addFooter(s, 5, TOTAL);
}

// =====================================================================
// SLIDE 6 — Industry context (image)
// =====================================================================
{
  const s = pres.addSlide();
  s.addImage({ path: IMG("04_Industry_Context.png"), x: 0, y: 0, w: W, h: H });
}

// =====================================================================
// SLIDE 7 — Key insight (image)
// =====================================================================
{
  const s = pres.addSlide();
  s.addImage({ path: IMG("05_Key_Insight.png"), x: 0, y: 0, w: W, h: H });
}

// =====================================================================
// SLIDE 8 — Solution (image)
// =====================================================================
{
  const s = pres.addSlide();
  s.addImage({ path: IMG("06_Our_Solution.png"), x: 0, y: 0, w: W, h: H });
}

// =====================================================================
// SLIDE 9 — ISO 42010 / Arcadia / SysML v2
// =====================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  addBadge(s, "09", "FRAMING · INCOSE");
  addTitle(s, "Built on what you already practice",
    "MEMO is not a new methodology. It is a semantic layer underneath the methodologies your teams already use.");

  const cards = [
    { title: "ISO/IEC/IEEE 42010", body: "Concerns → Viewpoints → Views → Models. MEMO supplies the typed elements that views reference.", iconText: "ISO", iconBg: C.tealSoft, accent: C.teal },
    { title: "Arcadia / MBSE", body: "Operational → System → Logical → Physical. MEMO names the layers, links them, and keeps them consistent.", iconText: "SE", iconBg: C.violetSoft, accent: C.violet },
    { title: "SysML v2", body: "Kinds and links live in SysML v2 source — parsed, version-controlled, diffable. The model is the artifact.", iconText: "v2", iconBg: C.blueSoft, accent: C.blue },
  ];

  const cardW = 4.0, cardH = 3.5, gap = 0.22;
  const startX = (W - cardW * 3 - gap * 2) / 2;
  cards.forEach((c, i) => {
    addCard(s, { x: startX + i * (cardW + gap), y: 2.8, w: cardW, h: cardH, ...c });
  });

  addCallout(s, 0.55, 6.45, 12.2, 0.55,
    "Position.",
    "MEMO sits between the standards (ISO 14971, IEC 62304) and the modeling tools — a domain ontology, not a new tool stack.");

  addFooter(s, 9, TOTAL);
}

// =====================================================================
// SLIDE 10 — Architecture-centered loop
// =====================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  addBadge(s, "10", "STORYLINE");
  addTitle(s, "Architecture-centered MEMO loop",
    "Use MEMO as an iterative engineering loop — not a one-way checklist.");

  // Left context box
  s.addText("CONTEXT", {
    x: 0.55, y: 3.2, w: 2.4, h: 0.3, margin: 0,
    fontSize: 11, bold: true, color: C.tealDeep, charSpacing: 3, fontFace: FONT,
  });
  s.addText("stakeholders, care setting, intended use", {
    x: 0.55, y: 3.55, w: 2.4, h: 0.7, margin: 0,
    fontSize: 13, color: C.gray, fontFace: FONT,
  });

  // Right views box
  s.addText("VIEWS / DOCUMENTS", {
    x: 10.4, y: 3.2, w: 2.4, h: 0.3, margin: 0,
    fontSize: 11, bold: true, color: C.amber, charSpacing: 3, fontFace: FONT,
  });
  s.addText("RMF · SDD · V&V · compiled views", {
    x: 10.4, y: 3.55, w: 2.4, h: 0.7, margin: 0,
    fontSize: 13, color: C.gray, fontFace: FONT,
  });

  // Center loop nodes — positioned around (6.65, 4.1)
  const cx = 6.65, cy = 4.2;
  const nodeR = 0.85;

  // Architecture (center)
  s.addShape(pres.shapes.OVAL, {
    x: cx - 1.0, y: cy - 1.0, w: 2.0, h: 2.0,
    fill: { color: C.blue }, line: { color: C.blue },
  });
  s.addText([
    { text: "Architecture", options: { bold: true, breakLine: true, fontSize: 16 } },
    { text: "stable design backbone", options: { fontSize: 10, color: "DBEAFE" } },
  ], {
    x: cx - 1.0, y: cy - 1.0, w: 2.0, h: 2.0, margin: 0,
    color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT,
  });

  // Behavior (top)
  s.addShape(pres.shapes.OVAL, {
    x: cx - nodeR, y: cy - 3.05, w: nodeR * 2, h: nodeR * 2,
    fill: { color: C.violet }, line: { color: C.violet },
  });
  s.addText([
    { text: "Behavior", options: { bold: true, breakLine: true, fontSize: 13 } },
    { text: "+ scenarios", options: { bold: true, breakLine: true, fontSize: 13 } },
    { text: "modes, contracts", options: { fontSize: 9, color: "EDE9FE" } },
  ], {
    x: cx - nodeR, y: cy - 3.05, w: nodeR * 2, h: nodeR * 2, margin: 0,
    color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT,
  });

  // Requirements (bottom)
  s.addShape(pres.shapes.OVAL, {
    x: cx - nodeR, y: cy + 1.35, w: nodeR * 2, h: nodeR * 2,
    fill: { color: "5B9BD5" }, line: { color: "5B9BD5" },
  });
  s.addText([
    { text: "Requirements", options: { bold: true, breakLine: true, fontSize: 13 } },
    { text: "needs + obligations", options: { fontSize: 9, color: "DBEAFE" } },
  ], {
    x: cx - nodeR, y: cy + 1.35, w: nodeR * 2, h: nodeR * 2, margin: 0,
    color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT,
  });

  // Risk (right)
  s.addShape(pres.shapes.OVAL, {
    x: cx + 1.6, y: cy - nodeR, w: nodeR * 2, h: nodeR * 2,
    fill: { color: C.coral }, line: { color: C.coral },
  });
  s.addText([
    { text: "Risk", options: { bold: true, breakLine: true, fontSize: 14 } },
    { text: "hazard chains", options: { fontSize: 9, color: "FFE0DC" } },
  ], {
    x: cx + 1.6, y: cy - nodeR, w: nodeR * 2, h: nodeR * 2, margin: 0,
    color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT,
  });

  // Assurance (left)
  s.addShape(pres.shapes.OVAL, {
    x: cx - 3.3, y: cy - nodeR, w: nodeR * 2, h: nodeR * 2,
    fill: { color: C.green }, line: { color: C.green },
  });
  s.addText([
    { text: "Assurance", options: { bold: true, breakLine: true, fontSize: 13 } },
    { text: "verification", options: { fontSize: 9, color: "D1FAE5" } },
  ], {
    x: cx - 3.3, y: cy - nodeR, w: nodeR * 2, h: nodeR * 2, margin: 0,
    color: "FFFFFF", align: "center", valign: "middle", fontFace: FONT,
  });

  addCallout(s, 0.55, 6.45, 12.2, 0.55,
    "Practitioner sequence.",
    "Architecture → behavior/scenarios → risk → requirements + assurance, then iterate back through architecture.");

  addFooter(s, 10, TOTAL);
}

// =====================================================================
// SLIDE 11 — Ontology hierarchy (5 stacked rows)
// =====================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  addBadge(s, "11", "ONTOLOGY HIERARCHY");
  addTitle(s, "Keep the mental model small",
    "A stable core. Architecture, process, extensions, and examples around it.");

  const rows = [
    { name: "Core",         meaning: "traceable elements + typed links",                      pill: "stable semantics",  color: C.teal },
    { name: "Architecture", meaning: "context, behavior, risk, requirements, assurance",      pill: "model the system",  color: C.blue },
    { name: "Process",      meaning: "viewpoints, rules, gates, document views",              pill: "apply the method",  color: C.violet },
    { name: "Extensions",   meaning: "cybersecurity, usability, AI/ML, device-specific",      pill: "add domain depth",  color: C.amber },
    { name: "Examples",     meaning: "GPCA-style worked trace threads",                       pill: "learn by reference",color: C.green },
  ];

  const rowH = 0.7, gap = 0.12;
  const startY = 2.85;
  rows.forEach((r, i) => {
    const y = startY + i * (rowH + gap);
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.85, y, w: 11.6, h: rowH,
      fill: { color: C.bg }, line: { color: C.border, width: 1 },
    });
    // Left color bar
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.85, y: y + 0.1, w: 0.1, h: rowH - 0.2, fill: { color: r.color }, line: { color: r.color },
    });
    s.addText(r.name, {
      x: 1.15, y, w: 2.3, h: rowH, margin: 0,
      fontSize: 18, bold: true, color: C.ink, valign: "middle", fontFace: FONT_HEAD,
    });
    s.addText(r.meaning, {
      x: 3.5, y, w: 6.1, h: rowH, margin: 0,
      fontSize: 13, color: C.gray, valign: "middle", fontFace: FONT,
    });
    // Pill
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 9.85, y: y + 0.13, w: 2.45, h: 0.44,
      fill: { color: C.white }, line: { color: C.border, width: 1 }, rectRadius: 0.22,
    });
    s.addText(r.pill, {
      x: 9.85, y: y + 0.13, w: 2.45, h: 0.44, margin: 0,
      fontSize: 10, bold: true, color: C.inkLight, align: "center", valign: "middle", fontFace: FONT,
    });
  });

  addCallout(s, 0.55, 6.85, 12.2, 0.45,
    "Rule.",
    "Extend by packages and profiles. Do not keep expanding the core vocabulary.");

  addFooter(s, 11, TOTAL);
}

// =====================================================================
// SLIDE 12 — Architecture layer
// =====================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  addBadge(s, "12", "ARCHITECTURE LAYER");
  addTitle(s, "Start with architecture viewpoints",
    "Arcadia-inspired flow: separate need from solution, then move from context to functions, logical architecture, and realization.");

  const panels = [
    { title: "Viewpoints", accent: C.green, items: [
      "context and operational intent",
      "functional chains and flows",
      "logical structure and interfaces",
      "software / hardware realization",
      "constraint definitions",
    ]},
    { title: "MEMO elements", accent: C.blue, items: [
      "Actor, UseContext",
      "LogicalFunction, LogicalFlow",
      "LogicalComponent, Interface",
      "SoftwareComponent, HardwareAssembly",
      "constraints & allocations",
    ]},
    { title: "Architect questions", accent: C.green, items: [
      "who owns each responsibility?",
      "where do interfaces and timing matter?",
      "which elements implement safety controls?",
      "what changes when a design decision changes?",
    ]},
  ];

  const pW = 4.0, pH = 3.55, gap = 0.22;
  const startX = (W - pW * 3 - gap * 2) / 2;
  panels.forEach((p, i) => {
    addPanel(s, { x: startX + i * (pW + gap), y: 2.8, w: pW, h: pH, ...p });
  });

  addCallout(s, 0.55, 6.55, 12.2, 0.45,
    "Takeaway.",
    "Architecture is the backbone that behavior, risk, requirements, and evidence attach to.");

  addFooter(s, 12, TOTAL);
}

// =====================================================================
// SLIDE 13 — Behavior + scenarios
// =====================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  addBadge(s, "13", "BEHAVIOR + SCENARIOS");
  addTitle(s, "Walk scenarios before formalizing behavior",
    "Scenario analysis turns abstract architecture into observable system behavior.");

  const panels = [
    { title: "Scenario view", accent: C.violet, items: [
      "actor + stimulus",
      "system response",
      "environment / assumptions",
      "response measure",
    ]},
    { title: "Behavior model", accent: C.blue, items: [
      "BehaviorMachine",
      "ModeState, Transition",
      "behavior properties",
      "contracts",
    ]},
    { title: "Architectural value", accent: C.amber, items: [
      "reveals missing interactions",
      "surfaces timing assumptions",
      "feeds hazard analysis",
      "creates verification anchors",
    ]},
  ];

  const pW = 4.0, pH = 2.9, gap = 0.22;
  const startX = (W - pW * 3 - gap * 2) / 2;
  panels.forEach((p, i) => {
    addPanel(s, { x: startX + i * (pW + gap), y: 2.8, w: pW, h: pH, ...p });
  });

  // Flow at bottom
  const flowY = 6.05;
  const flowChips = [
    { label: "Normal scenario", color: C.violet },
    { label: "Alternate flow", color: C.blue },
    { label: "Off-nominal behavior", color: C.coral },
    { label: "Behavior property", color: C.green },
  ];
  const chipW = 2.6, arrW = 0.4;
  const totalW = chipW * 4 + arrW * 3;
  let xCur = (W - totalW) / 2;
  flowChips.forEach((c, i) => {
    addChip(s, xCur, flowY, chipW, 0.75, c.label, c.color);
    xCur += chipW;
    if (i < flowChips.length - 1) {
      addArrow(s, xCur, flowY, arrW, 0.75);
      xCur += arrW;
    }
  });

  addFooter(s, 13, TOTAL);
}

// =====================================================================
// SLIDE 14 — Risk layer
// =====================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  addBadge(s, "14", "RISK LAYER · ISO 14971");
  addTitle(s, "Analyze risk from behavior and architecture",
    "Risk is most useful when the hazard chain points to scenarios, interfaces, allocations, and controls.");

  // Top hazard chain flow
  const flowY = 2.85;
  const flowChips = [
    { label: "Hazard", color: C.coral },
    { label: "Sequence", color: C.amber },
    { label: "Situation", color: C.yellow },
    { label: "Harm", color: C.blue },
    { label: "Control", color: C.green },
    { label: "Residual", color: C.violet },
  ];
  const chipW = 1.65, arrW = 0.28;
  const totalW = chipW * 6 + arrW * 5;
  let xCur = (W - totalW) / 2;
  flowChips.forEach((c, i) => {
    addChip(s, xCur, flowY, chipW, 0.7, c.label, c.color);
    xCur += chipW;
    if (i < flowChips.length - 1) {
      addArrow(s, xCur, flowY, arrW, 0.7);
      xCur += arrW;
    }
  });

  const panels = [
    { title: "Risk elements", accent: C.coral, items: [
      "Hazard, Harm",
      "SequenceOfEvents",
      "HazardousSituation",
      "RiskBefore / RiskAfter",
      "RiskControl",
    ]},
    { title: "Architect questions", accent: C.blue, items: [
      "which scenario creates exposure?",
      "which element implements the control?",
      "what must be segregated?",
      "what must be verified?",
    ]},
    { title: "GPCA example", accent: C.green, items: [
      "overdose hazard",
      "frequent bolus sequence",
      "excess infusion situation",
      "lockout control",
    ]},
  ];
  const pW = 4.0, pH = 2.9, gap = 0.22;
  const startX = (W - pW * 3 - gap * 2) / 2;
  panels.forEach((p, i) => {
    addPanel(s, { x: startX + i * (pW + gap), y: 3.85, w: pW, h: pH, ...p });
  });

  addFooter(s, 14, TOTAL);
}

// =====================================================================
// SLIDE 15 — Requirements
// =====================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  addBadge(s, "15", "REQUIREMENTS LAYER");
  addTitle(s, "Stabilize intent after design and risk insight",
    "Requirements capture agreed obligations — but their quality depends on architecture, behavior, and risk analysis.");

  const panels = [
    { title: "Inputs", accent: C.blue, items: [
      "stakeholder needs",
      "scenario findings",
      "risk controls",
      "architecture decisions",
    ]},
    { title: "Requirement model", accent: C.violet, items: [
      "Requirement",
      "SystemRequirement",
      "SoftwareRequirement",
      "HardwareRequirement",
      "acceptance criteria",
    ]},
    { title: "Typed links", accent: C.green, items: [
      "source link",
      "satisfaction link",
      "allocation link",
      "verification link",
    ]},
  ];
  const pW = 4.0, pH = 2.9, gap = 0.22;
  const startX = (W - pW * 3 - gap * 2) / 2;
  panels.forEach((p, i) => {
    addPanel(s, { x: startX + i * (pW + gap), y: 2.8, w: pW, h: pH, ...p });
  });

  // Flow at bottom
  const flowY = 6.05;
  const flowChips = [
    { label: "Need", color: C.teal },
    { label: "Design insight", color: C.blue },
    { label: "Risk driver", color: C.coral },
    { label: "Requirement", color: C.violet },
    { label: "Verification intent", color: C.green },
  ];
  const chipW = 2.05, arrW = 0.3;
  const totalW = chipW * 5 + arrW * 4;
  let xCur = (W - totalW) / 2;
  flowChips.forEach((c, i) => {
    addChip(s, xCur, flowY, chipW, 0.75, c.label, c.color);
    xCur += chipW;
    if (i < flowChips.length - 1) {
      addArrow(s, xCur, flowY, arrW, 0.75);
      xCur += arrW;
    }
  });

  addFooter(s, 15, TOTAL);
}

// =====================================================================
// SLIDE 16 — Assurance + closure
// =====================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  addBadge(s, "16", "ASSURANCE + CLOSURE");
  addTitle(s, "Close the safety thread with current evidence",
    "The goal is not more links. The goal is a checkable path from claim to current evidence.");

  const flowY = 2.85;
  const flowChips = [
    { label: "Claim", color: C.blue },
    { label: "Realization", color: C.violet },
    { label: "VerificationCase", color: C.green },
    { label: "Evidence", color: C.amber },
    { label: "Document view", color: C.teal },
  ];
  const chipW = 2.05, arrW = 0.3;
  const totalW = chipW * 5 + arrW * 4;
  let xCur = (W - totalW) / 2;
  flowChips.forEach((c, i) => {
    addChip(s, xCur, flowY, chipW, 0.7, c.label, c.color);
    xCur += chipW;
    if (i < flowChips.length - 1) {
      addArrow(s, xCur, flowY, arrW, 0.7);
      xCur += arrW;
    }
  });

  const panels = [
    { title: "Assurance elements", accent: C.green, items: [
      "VerificationCase",
      "TestArtifact",
      "Evidence",
      "VerificationLink",
      "EvidenceProductionLink",
    ]},
    { title: "Closure check", accent: C.teal, items: [
      "claim is allocated",
      "control is realized",
      "case is defined",
      "evidence is current",
    ]},
    { title: "Architectural value", accent: C.blue, items: [
      "impact analysis",
      "stale evidence detection",
      "audit-ready reasoning",
    ]},
  ];
  const pW = 4.0, pH = 2.9, gap = 0.22;
  const startX = (W - pW * 3 - gap * 2) / 2;
  panels.forEach((p, i) => {
    addPanel(s, { x: startX + i * (pW + gap), y: 3.85, w: pW, h: pH, ...p });
  });

  addFooter(s, 16, TOTAL);
}

// =====================================================================
// SLIDE 17 — GPCA worked thread
// =====================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  addBadge(s, "17", "ONTOLOGY IN ACTION");
  addTitle(s, "One GPCA-style closed thread",
    "Small enough to follow. Complete enough to prove the semantic backbone.");

  // Left column: 8 thread steps
  const steps = [
    { tag: "Need",         val: "needSafeTherapy",            color: C.green },
    { tag: "Requirement",  val: "reqLockout",                  color: "5B9BD5" },
    { tag: "Architecture", val: "infusionMgr",                 color: C.violet },
    { tag: "Behavior",     val: "guaranteeLockoutPreventsBolus",color: C.amber },
    { tag: "Risk control", val: "prevent overdose during lockout", color: C.coral },
    { tag: "Verification", val: "vcLockout",                   color: C.green },
    { tag: "Evidence",     val: "evidenceLockout",             color: C.teal },
    { tag: "Document view",val: "rmfView",                     color: C.yellow },
  ];

  const stepX = 0.65, tagW = 1.6, valX = 2.35, valW = 3.4;
  const stepH = 0.42, stepGap = 0.07;
  const startY = 2.85;
  steps.forEach((st, i) => {
    const y = startY + i * (stepH + stepGap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: stepX, y, w: tagW, h: stepH,
      fill: { color: st.color }, line: { color: st.color }, rectRadius: 0.06,
    });
    s.addText(st.tag, {
      x: stepX, y, w: tagW, h: stepH, margin: 0,
      fontSize: 11, bold: true, color: C.white, align: "center", valign: "middle", fontFace: FONT,
    });
    s.addText(st.val, {
      x: valX, y, w: valW, h: stepH, margin: 0,
      fontSize: 12, bold: true, color: C.ink, valign: "middle", fontFace: "Consolas",
    });
    if (i < steps.length - 1) {
      s.addText("↓", {
        x: stepX + tagW / 2 - 0.15, y: y + stepH - 0.02, w: 0.3, h: stepGap + 0.04, margin: 0,
        fontSize: 10, color: C.grayLight, align: "center", valign: "middle", fontFace: FONT,
      });
    }
  });

  // Right column: why this works + takeaway
  const rightX = 6.4, rightW = 6.4;

  // Why-this-works card (accent style)
  s.addShape(pres.shapes.RECTANGLE, {
    x: rightX, y: 2.85, w: rightW, h: 2.0,
    fill: { color: C.white }, line: { color: C.teal, width: 2 },
  });
  s.addText("Why this works", {
    x: rightX + 0.25, y: 2.95, w: rightW - 0.5, h: 0.4, margin: 0,
    fontSize: 16, bold: true, color: C.ink, fontFace: FONT_HEAD,
  });
  s.addText([
    { text: "Path crosses architecture, behavior, risk, and evidence.", options: { bullet: true, breakLine: true } },
    { text: "Change impact is computed — not reconstructed.", options: { bullet: true, breakLine: true } },
    { text: "Document views compile from the same baseline.", options: { bullet: true } },
  ], {
    x: rightX + 0.25, y: 3.35, w: rightW - 0.5, h: 1.4, margin: 0,
    fontSize: 12.5, color: C.gray, fontFace: FONT, paraSpaceAfter: 4,
  });

  // Callout below
  addCallout(s, rightX, 5.0, rightW, 1.4,
    "Slide takeaway.",
    "MEMO becomes useful when the safety argument and the architecture model live in the same semantic system.");

  addFooter(s, 17, TOTAL);
}

// =====================================================================
// SLIDE 18 — Strategy: 3 horizons
// =====================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  addBadge(s, "18", "ADOPTION STRATEGY");
  addTitle(s, "Three horizons, one trajectory",
    "An adoption-first roadmap that earns trust before it grows scope.");

  const horizons = [
    { num: "H1", when: "NOW · 2026", title: "Prove the backbone", items: [
      "open-source ontology + reference models (GPCA, infusion pump)",
      "SysML v2 source-of-truth, CLI + viewer",
      "worked safety threads as proof artifacts",
      "seed adoption with one design partner per modality",
    ]},
    { num: "H2", when: "2026–2027", title: "Compile compliance", items: [
      "auto-compiled RMF, SDD, V&V views from one model",
      "typed-link impact analysis & stale-evidence detection",
      "profiles: cybersecurity, usability, AI/ML, alarms",
      "integrate with existing PLM & ALM via export adapters",
    ]},
    { num: "H3", when: "2027+", title: "Ecosystem & assurance", items: [
      "device-specific profile registry",
      "auditor-readable assurance cases",
      "cross-domain bridges to ARP4761 / ISO 26262 patterns",
      "community-governed ontology evolution",
    ]},
  ];

  const hW = 4.0, hH = 3.7, gap = 0.22;
  const startX = (W - hW * 3 - gap * 2) / 2;
  horizons.forEach((h, i) => {
    const x = startX + i * (hW + gap);
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 2.85, w: hW, h: hH,
      fill: { color: C.bg }, line: { color: C.border, width: 1 },
    });
    // Horizon number badge top-right
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + hW - 0.6, y: 3.0, w: 0.42, h: 0.42,
      fill: { color: C.tealSoft }, line: { color: C.tealSoft }, rectRadius: 0.06,
    });
    s.addText(h.num, {
      x: x + hW - 0.6, y: 3.0, w: 0.42, h: 0.42, margin: 0,
      fontSize: 12, bold: true, color: C.tealDeep, align: "center", valign: "middle", fontFace: FONT,
    });
    // When label
    s.addText(h.when, {
      x: x + 0.3, y: 3.0, w: hW - 1.0, h: 0.32, margin: 0,
      fontSize: 10, bold: true, color: C.tealDeep, charSpacing: 4, fontFace: FONT,
    });
    // Title
    s.addText(h.title, {
      x: x + 0.3, y: 3.4, w: hW - 0.6, h: 0.55, margin: 0,
      fontSize: 18, bold: true, color: C.ink, fontFace: FONT_HEAD,
    });
    // Items
    s.addText(h.items.map((t, k) => ({
      text: t, options: { bullet: true, breakLine: k < h.items.length - 1 },
    })), {
      x: x + 0.3, y: 4.05, w: hW - 0.6, h: hH - 1.3, margin: 0,
      fontSize: 11.5, color: C.gray, fontFace: FONT, paraSpaceAfter: 4,
    });
  });

  addCallout(s, 0.55, 6.7, 12.2, 0.45,
    "Sequence.",
    "Unified model first, then compliance outputs, then ecosystem — never the other way around.");

  addFooter(s, 18, TOTAL);
}

// =====================================================================
// SLIDE 19 — Documents → Models comparison
// =====================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  addBadge(s, "19", "WHAT CHANGES");
  addTitle(s, "Documents → Models → Computable evidence",
    "Same regulations. Same engineers. A different substrate underneath them.");

  // Two columns
  const colW = 5.95, colH = 3.85, gap = 0.3;
  const startX = (W - colW * 2 - gap) / 2;

  // Before
  s.addShape(pres.shapes.RECTANGLE, {
    x: startX, y: 2.85, w: colW, h: colH,
    fill: { color: "FFF5F0" }, line: { color: C.coral, width: 1 },
  });
  // Dot
  s.addShape(pres.shapes.OVAL, {
    x: startX + 0.3, y: 3.05, w: 0.22, h: 0.22, fill: { color: C.coral }, line: { color: C.coral },
  });
  s.addText("Today: documents drift", {
    x: startX + 0.6, y: 2.95, w: colW - 0.8, h: 0.42, margin: 0,
    fontSize: 16, bold: true, color: C.ink, fontFace: FONT_HEAD,
  });
  const beforeItems = [
    "Word, Excel, DOORS, Polarion — links across silos",
    "Trace meaning is implicit, owned by individuals",
    "Change impact is reconstructed by hand, before audit",
    "RMF, SDD, V&V evolve in parallel — and disagree",
    "Evidence is \"true\" only at submission time",
  ];
  beforeItems.forEach((t, i) => {
    const y = 3.55 + i * 0.6;
    if (i > 0) {
      s.addShape(pres.shapes.LINE, {
        x: startX + 0.3, y, w: colW - 0.6, h: 0,
        line: { color: C.border, width: 0.5 },
      });
    }
    s.addText(t, {
      x: startX + 0.3, y: y + 0.05, w: colW - 0.6, h: 0.5, margin: 0,
      fontSize: 12.5, color: C.inkLight, fontFace: FONT,
    });
  });

  // After
  const afterX = startX + colW + gap;
  s.addShape(pres.shapes.RECTANGLE, {
    x: afterX, y: 2.85, w: colW, h: colH,
    fill: { color: C.tealSoft }, line: { color: C.tealDeep, width: 1 },
  });
  s.addShape(pres.shapes.OVAL, {
    x: afterX + 0.3, y: 3.05, w: 0.22, h: 0.22, fill: { color: C.tealDeep }, line: { color: C.tealDeep },
  });
  s.addText("With MEMO: a semantic backbone", {
    x: afterX + 0.6, y: 2.95, w: colW - 0.8, h: 0.42, margin: 0,
    fontSize: 16, bold: true, color: C.ink, fontFace: FONT_HEAD,
  });
  const afterItems = [
    "SysML v2 source — diffable, versioned, machine-checkable",
    "Typed links carry intent — satisfaction, allocation, verification",
    "Closure rules compute impact & flag stale evidence on every change",
    "RMF, SDD, V&V compile from one model — they cannot disagree",
    "Evidence currency is a property, not a snapshot",
  ];
  afterItems.forEach((t, i) => {
    const y = 3.55 + i * 0.6;
    if (i > 0) {
      s.addShape(pres.shapes.LINE, {
        x: afterX + 0.3, y, w: colW - 0.6, h: 0,
        line: { color: "B8E5D5", width: 0.5 },
      });
    }
    s.addText(t, {
      x: afterX + 0.3, y: y + 0.05, w: colW - 0.6, h: 0.5, margin: 0,
      fontSize: 12.5, color: C.inkLight, fontFace: FONT,
    });
  });

  addFooter(s, 19, TOTAL);
}

// =====================================================================
// SLIDE 20 — Call to action (dark)
// =====================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.ink };
  // Subtle highlight
  s.addShape(pres.shapes.OVAL, {
    x: W - 4, y: -2, w: 8, h: 8,
    fill: { color: C.teal, transparency: 88 }, line: { color: C.ink },
  });

  // Badge dark
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.55, y: 0.4, w: 0.42, h: 0.42,
    fill: { color: C.teal, transparency: 75 }, line: { color: C.teal, width: 1.5 }, rectRadius: 0.06,
  });
  s.addText("20", {
    x: 0.55, y: 0.4, w: 0.42, h: 0.42, margin: 0,
    fontSize: 14, bold: true, color: "7CE5C2", align: "center", valign: "middle", fontFace: FONT,
  });
  s.addText("NEXT STEP", {
    x: 1.07, y: 0.4, w: 6, h: 0.42, margin: 0,
    fontSize: 11, bold: true, color: "7CE5C2", charSpacing: 4, valign: "middle", fontFace: FONT,
  });

  // Big headline
  s.addText([
    { text: "Adopt the\n", options: { color: "FFFFFF" } },
    { text: "semantic backbone.", options: { color: C.teal } },
  ], {
    x: 0.7, y: 1.4, w: 11, h: 2.4, margin: 0,
    fontSize: 64, bold: true, fontFace: FONT_HEAD, charSpacing: -1.5,
  });

  s.addText("Build safer medical devices. Prove it with confidence.", {
    x: 0.7, y: 3.85, w: 11, h: 0.5, margin: 0,
    fontSize: 20, color: "B8D4E3", fontFace: FONT,
  });

  // Three stats
  const stats = [
    { k: "FASTER CHANGES", v: "with lower risk" },
    { k: "STRONGER CASES", v: "for regulators" },
    { k: "BETTER QUALITY", v: "less rework" },
  ];
  const sW = 3.7, sGap = 0.4;
  const sStartX = 0.7;
  stats.forEach((st, i) => {
    const x = sStartX + i * (sW + sGap);
    if (i > 0) {
      s.addShape(pres.shapes.LINE, {
        x: x - sGap / 2, y: 4.85, w: 0, h: 1.0,
        line: { color: "FFFFFF", width: 0.5, transparency: 70 },
      });
    }
    s.addText(st.k, {
      x, y: 4.85, w: sW, h: 0.3, margin: 0,
      fontSize: 11, bold: true, color: "8FB5C9", charSpacing: 4, fontFace: FONT,
    });
    s.addText([
      { text: "with ", options: { color: "FFFFFF" } },
      { text: st.v.replace("with ", ""), options: { color: C.teal, bold: true } },
    ], {
      x, y: 5.2, w: sW, h: 0.6, margin: 0,
      fontSize: 22, bold: true, fontFace: FONT_HEAD,
    });
  });

  // Footer info
  s.addText("GET INVOLVED", {
    x: 0.7, y: 6.45, w: 6, h: 0.3, margin: 0,
    fontSize: 11, bold: true, color: "8FB5C9", charSpacing: 4, fontFace: FONT,
  });
  s.addText("github.com/memo-ontology · INCOSE Medical SE WG · Open source · SysML v2 · ISO 42010 aligned", {
    x: 0.7, y: 6.78, w: 9, h: 0.4, margin: 0,
    fontSize: 13, color: "FFFFFF", fontFace: FONT,
  });

  // MEMO brand mark right
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 11.2, y: 6.6, w: 0.5, h: 0.5,
    fill: { color: C.teal }, line: { color: C.teal }, rectRadius: 0.08,
  });
  s.addText("M", {
    x: 11.2, y: 6.6, w: 0.5, h: 0.5, margin: 0,
    fontSize: 22, bold: true, color: "04101E", align: "center", valign: "middle", fontFace: FONT_HEAD,
  });
  s.addText("MEMO", {
    x: 11.78, y: 6.6, w: 1.5, h: 0.5, margin: 0,
    fontSize: 22, bold: true, color: "FFFFFF", valign: "middle", fontFace: FONT_HEAD,
  });
}

// Write
pres.writeFile({ fileName: "/Users/someshkashyap/Downloads/MEMO_INCOSE/MEMO_INCOSE_v1.pptx" })
  .then(f => console.log("Wrote: " + f));
