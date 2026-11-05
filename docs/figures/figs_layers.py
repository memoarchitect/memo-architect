"""Figures for the Modeling overview and the per-layer pages."""
from svgkit import Fig, PALETTE, INK, MUTED, FAINT, ACCENT

FIGS = {}


def fig(name):
    def deco(fn):
        FIGS[name] = fn
        return fn
    return deco


def rel(f, a, b, label, cat="neutral", dash="6 4", at=0.5, end="open", label_dy=0, sw=1.5):
    """A typed MEMO relationship drawn as a dashed, labelled dependency."""
    color = PALETTE[cat][0]
    f.line([a, b] if not isinstance(a, list) else a, color=color, dash=dash, end=end, label=label, at=at,
           label_dy=label_dy, label_size=10.5, label_italic=True, sw=sw)


@fig("modeling-overview")
def overview():
    f = Fig(1000, 560, "One model, many layers, many views",
            "Layers organize what you model; extensions add domain vocabulary; views select what a reviewer sees")
    layers = [
        ("Context and operational", "who, where, what for", "operational"),
        ("Requirements", "needs and shall-statements", "requirements"),
        ("Functional", "what the system does", "functional"),
        ("Logical", "implementation-neutral structure", "logical"),
        ("Software · hardware · physical", "what realizes the design", "software"),
        ("Deployment and realization", "what runs where", "deployment"),
    ]
    x, w, h, gap = 250, 400, 52, 10
    y0 = 92
    f.text(x + w / 2, 80, "ARCHITECTURE LAYERS", size=11, weight=700, color=MUTED)
    for i, (name, q, cat) in enumerate(layers):
        y = y0 + 8 + i * (h + gap)
        stroke, fill, _ = PALETTE[cat]
        if cat == "software":
            # split band: software / hardware & physical
            f.rect(x, y, w / 2 - 4, h, fill=PALETTE["software"][1], stroke=PALETTE["software"][0], sw=1.4, rx=8)
            f.rect(x + w / 2 + 4, y, w / 2 - 4, h, fill=PALETTE["physical"][1], stroke=PALETTE["physical"][0], sw=1.4, rx=8)
            f.text(x + w / 4, y + h / 2 - 8, "Software", size=13, weight=700)
            f.text(x + w / 4, y + h / 2 + 10, "modules, SOUP, runtime", size=11, color=MUTED)
            f.text(x + 3 * w / 4, y + h / 2 - 8, "Hardware and physical", size=13, weight=700)
            f.text(x + 3 * w / 4, y + h / 2 + 10, "assemblies, nodes, ports", size=11, color=MUTED)
        else:
            f.rect(x, y, w, h, fill=fill, stroke=stroke, sw=1.4, rx=8)
            f.text(x + w / 2, y + h / 2 - 8, name, size=13, weight=700)
            f.text(x + w / 2, y + h / 2 + 10, q, size=11, color=MUTED)
    # assurance column
    ax, aw = 680, 150
    f.text(ax + aw / 2, 80, "ASSURANCE (CROSS-CUTTING)", size=11, weight=700, color=MUTED)
    ass = [("Risk", "risk"), ("Cybersecurity", "cyber"), ("Human factors", "human"), ("Verification\nand validation", "verification")]
    total = 6 * (h + gap) - gap
    ah = (total - 3 * gap) / 4
    for i, (name, cat) in enumerate(ass):
        y = y0 + 8 + i * (ah + gap)
        stroke, fill, _ = PALETTE[cat]
        f.rect(ax, y, aw, ah, fill=fill, stroke=stroke, sw=1.4, rx=8)
        f.text(ax + aw / 2, y + ah / 2, name, size=13, weight=700)
    # trace arrows
    for i in range(4):
        y = y0 + 8 + i * (ah + gap) + ah / 2
        f.line([(ax - 4, y), (x + w + 6, y)], color=FAINT, sw=1.3, dash="4 4", end="open", start="open")
    # variability band
    vy = y0 + 8 + 6 * (h + gap)
    f.rect(x, vy, aw + (ax - x), 36, fill=PALETTE["variability"][1], stroke=PALETTE["variability"][0], sw=1.4, rx=8)
    f.text(x + (aw + ax - x) / 2, vy + 18, "Variability — features, variation points and variants span every layer", size=12, weight=600)
    # views on the left (lenses)
    f.text(120, 80, "VIEWS", size=11, weight=700, color=MUTED)
    views = ["General", "Interconnection", "Action flow", "State transition", "Sequence", "Grid", "Browser"]
    for i, v in enumerate(views):
        y = y0 + 14 + i * 50
        f.rect(40, y, 160, 36, fill="#ffffff", stroke=ACCENT, sw=1.3, rx=18)
        f.text(120, y + 18, v, size=12.5, weight=600, color=ACCENT)
        f.line([(202, y + 18), (244, y + 18)], color=ACCENT, sw=1.1, end="arrow", opacity=0.5)
    f.text(120, y0 + 14 + 7 * 50 + 6, "each view selects\na slice of the model", size=11, color=MUTED, italic=True)
    # extensions at right edge
    ex = 860
    f.text(ex + 60, 80, "EXTENSIONS", size=11, weight=700, color=MUTED)
    exts = ["clinical", "anatomy", "aadl", "cloud", "container", "messaging", "ros"]
    for i, e in enumerate(exts):
        y = y0 + 14 + i * 50
        f.rect(ex, y, 120, 36, fill=PALETTE["extension"][2], stroke=PALETTE["extension"][0], sw=1.3, rx=6, dash="5 3")
        f.text(ex + 60, y + 18, e, size=12.5, weight=600, color=PALETTE["extension"][0])
    f.text(ex + 60, y0 + 14 + 7 * 50 + 6, "specialize base kinds;\nimported by a project", size=11, color=MUTED, italic=True)
    return f


@fig("layer-trace")
def trace():
    f = Fig(1000, 390, "Following one concern across layers",
            "Investigating over-infusion in the GPCA pump: each step is a typed relationship in the model")
    items = [
        ("RiskControlMeasure", "lockoutControl", "risk", "risk"),
        ("Hazard", "overdoseHazard", "risk", "risk"),
        ("Requirement", "reqCs25", "requirements", "requirements"),
        ("SoftwareModule", "infusionMgr", "software", "software"),
        ("SystemFunction", "fnEnforceLimits", "functional", "functional"),
    ]
    xs = [30, 225, 420, 615, 810]
    boxes = []
    for (st, name, cat, lay), x in zip(items, xs):
        boxes.append(f.block(x, 120, 160, 64, name, st, cat=cat, name_size=12.5))
        f.chip(x + 80, 92, f"{lay} layer", cat=cat, size=10.5, anchor="middle")
    def edge(a, b, label, rev=False):
        p, q = (a.right(), b.left()) if not rev else (b.left(), a.right())
        f.line([p, q], color=MUTED, sw=1.5, dash="6 4", end="open")
        f.pill((a.r + b.x) / 2, 206, label, color=MUTED, size=10.5, italic=True)
    edge(boxes[0], boxes[1], "Mitigates")
    edge(boxes[1], boxes[2], "DerivesFrom")
    edge(boxes[2], boxes[3], "satisfy … by")
    edge(boxes[3], boxes[4], "allocate", rev=True)
    vc = f.block(420, 260, 160, 64, "vcLockout", "VerificationCase", cat="verification", name_size=12.5)
    f.chip(500, 344, "verification layer", cat="verification", size=10.5, anchor="middle")
    f.line([vc.top(), boxes[2].bottom()], color=MUTED, sw=1.5, end="open")
    f.pill(540, 240, "verify", color=MUTED, size=10.5, italic=True)
    f.line([(vc.x, vc.cy), (boxes[0].cx, vc.cy), boxes[0].bottom()], color=MUTED, sw=1.3, dash="3 3", end="open")
    f.pill(250, vc.cy, "subject", color=MUTED, size=10.5, italic=True)
    f.text(820, 292, "Each arrow points from the\nrelationship's source to its target.", size=11.5, color=MUTED, italic=True)
    return f


@fig("relationships-map")
def relationships_map():
    f = Fig(1000, 520, "The core traceability argument",
            "Native SysML relationships (solid) and MEMO typed connections (dashed) between the main kinds")
    need = f.block(40, 100, 170, 60, "Need", "requirement def", cat="requirements")
    req = f.block(330, 100, 170, 60, "Requirement", "requirement def", cat="requirements")
    design = f.block(610, 100, 190, 60, "design element", "part / port / item", cat="logical")
    func = f.block(610, 250, 190, 60, "SystemFunction", "action def", cat="functional")
    haz = f.block(40, 250, 170, 60, "Hazard", "item def", cat="risk")
    ctl = f.block(330, 250, 170, 60, "RiskControlMeasure", "part def", cat="risk")
    vc = f.block(330, 400, 170, 60, "VerificationCase", "verification def", cat="verification")
    ev = f.block(610, 400, 190, 60, "MemoEvidence", "part def", cat="verification")
    rel(f, need.right(), req.left(), "DerivesFrom", "requirements")
    f.line([req.right(), design.left()], color=INK, end="open", label="satisfy … by", at=0.5, label_size=10.5)
    f.line([func.top(), design.bottom()], color=INK, end="open", label="allocate … to", at=0.5, label_size=10.5)
    rel(f, ctl.left(), haz.right(), "Mitigates", "risk")
    rel(f, ctl.top(), req.bottom(), "DerivesFrom", "risk", at=0.5)
    f.line([vc.top(), ctl.bottom()], color=INK, dash="3 3", end="open", label="subject", at=0.5, label_size=10.5)
    f.line([(vc.x + 20, vc.y), (vc.x + 20, 330), (req.x - 30, 330), (req.x - 30, 190), (req.x + 20, 190), (req.x + 20, req.b)],
           color=INK, end="open")
    f.pill(req.x - 30, 260, "verify", color=INK, size=10.5)
    rel(f, vc.right(), ev.left(), "ProducesEvidence", "verification")
    f.legend(840, 110, [("line", INK, "native SysML"), ("dash", "neutral", "MEMO connection")])
    f.text(910, 200, "satisfy, allocate and\nverify are SysML's own\nkeywords; MEMO adds\ntyped connections for\nwhat SysML has no\nword for.", size=11, color=MUTED, anchor="middle")
    return f


@fig("layer-context")
def layer_context():
    f = Fig(1000, 500, "Context layer — the device in its world",
            "Intended use, users and external systems, and the use context the device operates in")
    CX = "context"
    C = PALETTE[CX][0]
    f.rect(220, 90, 560, 380, fill=PALETTE[CX][2], stroke=C, sw=1.3, rx=12, dash="5 4")
    f.text(236, 106, "UseContext: hospital ward   ·   UseEnvironment: 20–30 °C, alarms audible over ward noise", size=11, color=C, anchor="start", italic=True)
    soi = f.block(410, 220, 180, 90, "GPCA pump", "System (system of interest)", cat=CX)
    f.actor(290, 200, "Patient")
    f.actor(290, 360, "Nurse")
    f.actor(710, 200, "Prescriber")
    ext = f.block(640, 360, 120, 60, "Pharmacy\nsystem", None, cat="neutral")
    f.text(700, 345, "«external system»", size=10.5, color=MUTED, italic=True)
    for a, b, lab in (((306, 205), (410, 245), "requests bolus"), ((306, 365), (410, 290), "programs, responds"),
                      ((694, 205), (590, 245), "prescribes"), ((640, 380), (590, 300), "drug library")):
        f.line([a, b], color=C, sw=1.4, label=lab, at=0.5, label_size=10.5)
    iu = f.note(30, 110, 170, 110, "«IntendedUse»\nDeliver opioid analgesia\nwith patient-requested\nboluses within limits")
    st = f.note(30, 250, 170, 76, "«MemoStakeholder»\nhospital, regulator,\nmanufacturer")
    f.note(800, 110, 180, 90, "User: actorKind,\ntraining, impairments,\npopulation")
    f.callout(590, 220, 1)
    f.callout(262, 160, 2)
    f.callout(760, 360, 3)
    f.callout(220, 90, 4)
    f.callout(30, 110, 5)
    return f


@fig("layer-operational")
def layer_operational():
    f = Fig(1000, 520, "Operational layer — goals, workflows and scenarios",
            "A use case is realized by workflows; a workflow owns scenarios; scenarios are ordered operative actions")
    O = "operational"
    C = PALETTE[O][0]
    uc = f.ellipse(170, 150, 130, 40, "Deliver PCA therapy", O, stereo="SystemUseCase")
    cap = f.block(30, 270, 220, 60, "TitratedAnalgesia", "OperationalCapability", cat=O, soft=True)
    wf = f.block(390, 115, 220, 70, "PcaTherapyWorkflow", "SystemWorkflow", cat=O)
    sc1 = f.block(390, 250, 220, 56, "Patient requests bolus", "OperativeScenario", cat=O, soft=True)
    sc2 = f.block(390, 330, 220, 56, "Occlusion during basal", "OperativeScenario", cat=O, soft=True)
    sc3 = f.block(390, 410, 220, 56, "Lockout rejects request", "OperativeScenario", cat=O, soft=True)
    rel(f, wf.left(), (300, 150), "RealizesUseCase", O)
    rel(f, (170, 190), cap.top(), "RequiresCapability", O, at=0.5)
    for sc in (sc1, sc2, sc3):
        f.line([wf.left(0.85), (360, wf.y + 0.85 * wf.h), (360, sc.cy), sc.left()], color=INK, start="diamond" if sc is sc1 else None)
    # actions of scenario 1
    ax = 690
    acts = ["Press bolus button", "Check lockout", "Deliver bolus", "Log outcome"]
    f.text(840, 110, "OperativeActions of the selected scenario", size=11.5, weight=600, color=MUTED)
    for i, a in enumerate(acts):
        y = 130 + i * 78
        b = f.action(ax, y, 200, 46, a, O)
        if i:
            f.line([(ax + 100, y - 32), (ax + 100, y)], color=INK, end="arrow")
        f.text(ax + 210, y + 23, ["Patient", "pump", "pump", "pump"][i], size=10.5, color=MUTED, anchor="start", italic=True)
    f.line([sc1.right(), (650, sc1.cy), (650, 153), (ax, 153)], color=FAINT, dash="3 4", end="open")
    f.text(840, 450, "demand level, cost, duration and success\nprobability roll up from actions to scenarios", size=11, color=MUTED, italic=True)
    f.callout(40, 150, 1)
    f.callout(390, 115, 2)
    f.callout(390, 250, 3)
    f.callout(ax, 130, 4)
    f.callout(30, 270, 5)
    return f


@fig("layer-requirements")
def layer_requirements():
    f = Fig(1000, 500, "Requirements layer — from needs to verifiable obligations",
            "Needs capture stakeholder outcomes; requirements are bounded, measurable claims that design satisfies")
    R = "requirements"
    need = f.block(40, 100, 230, 100, "needSafeTherapy", "Need", cat=R,
                   attrs=["needKind = stakeholder", "priority = high"])
    sys = f.block(380, 100, 260, 118, "reqCs25", "Requirement", cat=R,
                  attrs=["requirementType = system", "concernKind = safety", "statement = \"…shall ignore…\""])
    sw = f.block(380, 300, 260, 70, "reqLockoutTimer", "Requirement · software", cat=R)
    hw = f.block(380, 400, 260, 70, "reqButtonDebounce", "Requirement · hardware", cat=R)
    tc = f.block(720, 100, 240, 64, "tcBolusResponse", "TimingConstraint", cat=R, soft=True)
    des = f.block(720, 300, 240, 64, "gpcaSoftware.infusionMgr", "design element", cat="software")
    vc = f.block(720, 400, 240, 64, "vcLockout", "VerificationCase", cat="verification")
    rel(f, need.right(), sys.left(), "DerivesFrom", R)
    f.line([sys.left(0.85), (350, sys.y + 0.85 * sys.h), (350, sw.cy), sw.left()], color=PALETTE[R][0], dash="6 4", end="open")
    f.line([(350, sw.cy), (350, hw.cy), hw.left()], color=PALETTE[R][0], dash="6 4", end="open")
    f.pill(350, 262, "DerivesFrom", color=PALETTE[R][0], size=10.5, italic=True)
    f.line([sys.right(0.3), tc.left()], color=INK, end="open", label="refines", at=0.5, label_size=10.5)
    f.line([sw.right(), des.left()], color=INK, end="open", label="satisfy … by", at=0.5, label_size=10.5)
    f.line([vc.left(), hw.right()], color=INK, end="open", label="verify", at=0.5, label_size=10.5)
    f.text(70, 280, "Notation can be plain text,\nEARS (when / while / if)\nor SOPHIST; obligation is\nshall / should / will.", size=11.5, color=MUTED, anchor="start")
    f.callout(40, 100, 1)
    f.callout(380, 100, 2)
    f.callout(300, 262, 3)
    f.callout(720, 100, 4)
    f.callout(680, 312, 5)
    return f


@fig("layer-functional")
def layer_functional():
    f = Fig(1000, 470, "Functional layer — what the system does",
            "System functions exchange items; a functional flow orders them; allocation gives each a responsible owner")
    Fn = "functional"
    C = PALETTE[Fn][0]
    f.frame(24, 70, 700, 380, "FunctionalFlow  infusionDeliveryFlow", cat=Fn)
    a = f.action(60, 140, 170, 56, "Acquire sensors", Fn, stereo="SystemFunction")
    b = f.action(300, 140, 170, 56, "Enforce limits", Fn, stereo="SystemFunction")
    c = f.action(540, 140, 160, 56, "Command pump", Fn, stereo="SystemFunction")
    d = f.action(300, 300, 170, 56, "Monitor alarms", Fn, stereo="SystemFunction")
    for x1, x2 in ((a, b), (b, c)):
        p1 = f.pin(x1, "right", 0.5, Fn, "out")
        p2 = f.pin(x2, "left", 0.5, Fn, "in")
        f.line([p1, p2], color=C, sw=2, end=None)
    f.flow(265, 168, "sensor status", "right", Fn)
    f.flow(505, 168, "flow rate", "right", Fn)
    p3 = f.pin(a, "bottom", 0.5, Fn, "out")
    p4 = f.pin(d, "left", 0.5, Fn, "in")
    f.line([p3, (145, 328), p4], color=C, sw=2)
    f.flow(220, 328, "fault flags", "right", Fn, label_pos="below")
    p5 = f.pin(d, "right", 0.5, Fn, "out")
    p6 = f.pin(c, "bottom", 0.5, Fn, "in")
    f.line([p5, (620, 328), p6], color=C, sw=2)
    f.flow(560, 328, "stop", "right", Fn, label_pos="below")
    # allocation targets
    comp1 = f.block(770, 120, 200, 60, "infusionMgr", "SoftwareModule", cat="software")
    comp2 = f.block(770, 280, 200, 60, "alarm", "SoftwareModule", cat="software")
    f.line([c.right(0.3), comp1.left(0.6)], color=INK, dash="6 4", end="open", label="allocate", at=0.5, label_size=10.5)
    f.line([d.bottom(), (d.cx, 368), (870, 368), comp2.bottom()], color=INK, dash="6 4", end="open", label="allocate", at=0.55, label_size=10.5)
    f.note(770, 380, 200, 60, "states, modes and\ncontracts refine the\nbehaviour (see State view)")
    f.callout(60, 140, 1)
    f.callout(265, 205, 2)
    f.callout(24, 70, 3)
    f.callout(770, 120, 4)
    return f


@fig("layer-logical")
def layer_logical():
    f = Fig(1000, 470, "Logical layer — implementation-neutral structure",
            "Decompose the system into logical components, give them ports and interfaces, and mark independence")
    L = "logical"
    C = PALETTE[L][0]
    sys = f.block(330, 90, 200, 56, "GpcaSystem", "System", cat=L)
    s1 = f.block(120, 210, 200, 56, "Delivery", "Subsystem", cat=L)
    s2 = f.block(540, 210, 200, 56, "Safety", "Subsystem", cat=L)
    c1 = f.block(40, 340, 150, 56, "InfusionControl", "LogicalComponent", cat=L, name_size=12.5)
    c2 = f.block(220, 340, 150, 56, "PrescriptionConfig", "LogicalComponent", cat=L, name_size=12.5)
    c3 = f.block(470, 340, 150, 56, "AlarmManagement", "LogicalComponent", cat=L, name_size=12.5)
    c4 = f.block(660, 340, 150, 56, "SafetyMonitor", "LogicalComponent", cat=L, name_size=12.5)
    for parent, kids in ((sys, (s1, s2)), (s1, (c1, c2)), (s2, (c3, c4))):
        yb = parent.b + 26
        f.line([parent.bottom(), (parent.cx, yb)], color=INK, start="diamond")
        for k in kids:
            f.line([(parent.cx, yb), (k.cx, yb), k.top()], color=INK)
    f.rect(645, 326, 180, 84, fill="none", stroke=C, sw=1.3, rx=10, dash="6 5")
    f.text(735, 424, "«IsolationBoundary»", size=10.5, color=C, italic=True)
    f.line([(c4.cx, c4.b), (c4.cx, 448), (c1.cx, 448), (c1.cx, c1.b)], color=C, dash="6 4", end="open", start="open")
    f.pill(430, 448, "IndependentOf", color=C, size=10.5, italic=True)
    # right: what a logical component carries
    f.rect(835, 90, 155, 300, fill=PALETTE[L][2], stroke=C, sw=1.1, rx=8)
    f.text(912, 108, "each component", size=11.5, weight=700, color=C)
    items = ["LogicalPort", "LogicalInterface", "LogicalExchange\nItem", "LogicalTransfer", "ComponentRole", "FaultContainment\nRegion"]
    for i, it in enumerate(items):
        f.chip(912, 140 + i * 42, it.replace("\n", ""), cat=L, size=10, anchor="middle")
    f.callout(330, 90, 1)
    f.callout(40, 340, 2)
    f.callout(645, 326, 3)
    f.callout(430, 430, 4)
    f.callout(835, 90, 5)
    return f


@fig("layer-software")
def layer_software():
    f = Fig(1000, 480, "Software layer — IEC 62304 structure and runtime",
            "A software system decomposes into modules; SOUP and an SBOM record third-party code; runtime components execute")
    S = "software"
    C = PALETTE[S][0]
    root = f.block(330, 90, 230, 72, "gpcaSoftware", "SoftwareSystem", cat=S, attrs=None)
    f.chip(572, 126, "safetyClass = C", cat=S, size=10.5)
    mods = [("infusionMgr", "SoftwareModule · unit"), ("alarm", "SoftwareModule · unit"), ("config", "SoftwareModule · item")]
    boxes = []
    for i, (n, st) in enumerate(mods):
        boxes.append(f.block(150 + i * 200, 240, 180, 60, n, st, cat=S, name_size=12.5))
    for b in boxes:
        f.line([(445, 162), (445, 215), (b.cx, 215), b.top()], color=INK, start="diamond" if b is boxes[0] else None)
    soup = f.block(150, 370, 180, 60, "FreeRTOS kernel", "SOUPSoftwareModule", cat=S, soft=True, name_size=12.5)
    sbom = f.block(390, 370, 200, 60, "pumpSbom", "SoftwareBillOfMaterials", cat=S, soft=True, name_size=12.5)
    rel(f, (boxes[0].cx, boxes[0].b), soup.top(), "DependsOnSoup", S)
    f.line([sbom.left(), soup.right()], color=INK, end="open", label="SBOMEntry", at=0.5, label_size=10.5)
    # runtime component and ports
    rt = f.block(700, 340, 250, 100, "infusionTask", "SoftwareComponent", cat=S,
                 attrs=["runtimeKind = thread", "periodMs = 20 ms", "wcetMs = 4 ms"])
    f.line([(boxes[2].r, boxes[2].cy), (720, 270), (720, rt.y)], color=FAINT, dash="3 4", end="open")
    f.text(735, 290, "#refinement", size=10.5, color=MUTED, anchor="start", italic=True)
    f.chip(700, 128, "SoftwarePort · DataInterface · ComponentExchange", cat=S, size=10.5)
    f.chip(700, 160, "Algorithm · DataModel · ConfigurationArtifact", cat=S, size=10.5)
    f.chip(700, 192, "UserInterface · UIElement · UIState", cat=S, size=10.5)
    f.text(700, 100, "also modeled here", size=11.5, weight=700, color=C, anchor="start")
    f.callout(330, 90, 1)
    f.callout(150, 240, 2)
    f.callout(150, 370, 3)
    f.callout(700, 340, 4)
    return f


@fig("layer-physical")
def layer_physical():
    f = Fig(1000, 500, "Hardware and physical layer — what you can touch",
            "Assemblies own components by discipline; processing nodes run software; physical ports and interfaces join them")
    P = "physical"
    C = PALETTE[P][0]
    asm = f.frame(24, 70, 640, 400, "HardwareAssembly  gpcaDevice", cat=P)
    groups = [
        ("Electrical", ["PowerSupply", "Battery", "Cable"], 50, 110),
        ("Sensing", ["Sensor", "Actuator"], 252, 110),
        ("Mechanical", ["Enclosure", "MechanicalPart"], 454, 110),
        ("Fluidic · optical · thermal", ["FluidicComponent", "OpticalComponent"], 50, 280),
    ]
    for title, kinds, x, y in groups:
        w = 185
        f.rect(x, y, w, 140, fill="#ffffff", stroke=C, sw=1, rx=8)
        f.text(x + 12, y + 18, title, size=12, weight=700, color=C, anchor="start")
        for i, k in enumerate(kinds):
            f.chip(x + 14, y + 50 + i * 30, k, cat=P, size=11)
    mcu = f.block(270, 290, 180, 100, "mainController", "ProcessingNode", cat=P)
    mem = f.block(470, 300, 160, 60, "flashMemory", "MemoryDevice", cat=P, name_size=12.5)
    p1 = f.port(mcu, "left", 0.6, "in", P)
    f.port(mcu, "right", 0.4, "out", P)
    f.port(asm, "right", 0.85, "inout", P, label="service port", label_side="inside-right")
    # right column
    pi = f.block(720, 110, 250, 110, "pumpMotorDrive", "PhysicalInterface", cat=P,
                 attrs=["mediumKind = electrical", "signalingKind = pulse", "nominalVoltageV = 3.3 V"])
    pp = f.block(720, 260, 250, 90, "MotorDriveConnector", "PhysicalPort", cat=P,
                 attrs=["direction = out", "connectorType = 6-pin"])
    f.block(720, 390, 250, 60, "step pulses", "PhysicalTransfer (flow)", cat=P, soft=True)
    f.callout(24, 70, 1)
    f.callout(50, 110, 2)
    f.callout(270, 290, 3)
    f.callout(720, 260, 4)
    f.callout(720, 110, 5)
    f.callout(720, 390, 6)
    return f


@fig("layer-deployment")
def layer_deployment():
    f = Fig(1000, 470, "Deployment and realization — what runs where",
            "Code builds into deployment units, units deploy to processing nodes, and designs are realized by implementations")
    D = "deployment"
    C = PALETTE[D][0]
    mod = f.block(40, 110, 190, 60, "infusionMgr", "SoftwareModule", cat="software")
    mod2 = f.block(40, 200, 190, 60, "alarm", "SoftwareModule", cat="software")
    du = f.block(320, 150, 210, 70, "pumpFirmware.bin", "SoftwareDeploymentUnit", cat=D)
    node = f.block(640, 120, 210, 130, "mainController", "ProcessingNode", cat="physical",
                   attrs=["nodeKind = microcontroller", "operatingSystem = bare-metal"])
    rte = f.block(640, 300, 210, 60, "cyclicExecutive", "RuntimeEnvironment", cat=D)
    mem = f.block(880, 140, 100, 60, "flash", "MemoryDevice", cat="physical", name_size=12)
    for m in (mod, mod2):
        f.line([m.right(), (275, m.cy), (275, du.cy), du.left()], color=INK, dash="6 4", end="open")
    f.pill(275, 230, "BuildsInto", color=INK, size=10.5, italic=True)
    f.line([du.right(), (node.x, du.cy)], color=INK, dash="6 4", end="open", label="DeploysTo", at=0.5, label_size=10.5, label_italic=True)
    rel(f, node.bottom(), rte.top(), "ProvidesEnvironment", D)
    f.line([(node.r, 170), mem.left()], color=INK, dash="6 4", end="open")
    f.text(865, 222, "MemoryBinding", size=10.5, color=MUTED, italic=True)
    # realization band
    f.rect(40, 390, 920, 56, fill=PALETTE["logical"][2], stroke=PALETTE["logical"][0], sw=1, rx=8)
    lg = f.chip(60, 418, "logical: gpcaPump", cat="logical", size=11)
    sw = f.chip(420, 418, "software: gpcaSoftware", cat="software", size=11)
    hw = f.chip(760, 418, "hardware: gpcaDevice", cat="physical", size=11)
    f.line([(lg.r, 418), (sw.x, 418)], color=INK, dash="6 4", end="open", label="RealizedBy", at=0.5, label_size=10.5, label_italic=True)
    f.line([(sw.r, 418), (hw.x, 418)], color=INK, dash="6 4", end="open", label="RealizedBy", at=0.5, label_size=10.5, label_italic=True)
    f.callout(320, 150, 1)
    f.callout(580, 160, 2)
    f.callout(640, 300, 3)
    f.callout(40, 390, 4)
    return f


@fig("layer-risk")
def layer_risk():
    f = Fig(1000, 470, "Risk layer — the ISO 14971 chain",
            "Causes lead to a hazard, a sequence of events to a hazardous situation, and that to harm; controls reduce the risk")
    R = "risk"
    C = PALETTE[R][0]
    y = 150
    chain = [("HazardCause", "miscalibration"), ("Hazard", "over-infusion"), ("SequenceOfEvents", "frequent bolus"),
             ("HazardousSituation", "excess opioid"), ("Harm", "resp. depression")]
    boxes = []
    for i, (st, name) in enumerate(chain):
        boxes.append(f.block(30 + i * 192, y, 160, 74, name, st, cat=R, name_size=12.5))
    for a, b in zip(boxes, boxes[1:]):
        f.line([a.right(), b.left()], color=C, dash="6 4", end="open")
    f.pill(500, y - 20, "TracesRisk / Causes", color=C, size=10.5, italic=True)
    ctl = f.block(40, 310, 230, 70, "lockoutControl", "RiskControlMeasure", cat=R)
    risk = f.block(400, 310, 160, 70, "riskBefore", "Risk", cat=R)
    res = f.block(620, 310, 160, 70, "riskAfter", "ResidualRisk", cat=R, soft=True)
    mat = f.block(830, 315, 140, 60, "riskMatrix", "RiskMatrix", cat="neutral")
    f.line([risk.top(), (risk.cx, 270), (boxes[4].cx, 270), (boxes[4].cx, boxes[4].b)], color=C, dash="6 4", end="open")
    f.pill(700, 270, "EstimatedFor", color=C, size=10.5, italic=True)
    f.line([risk.right(), res.left()], color=MUTED, sw=1.3, end="arrow")
    rel(f, res.right(), mat.left(), "AssessedAgainst", R, label_dy=-22)
    f.line([(res.cx, res.b), (res.cx, 430), (ctl.cx + 40, 430), (ctl.cx + 40, ctl.b)], color=C, dash="6 4", end="open")
    f.pill(450, 430, "ReducedBy", color=C, size=10.5, italic=True)
    f.line([(ctl.cx - 40, ctl.y), (ctl.cx - 40, 270), (boxes[1].cx, 270), (boxes[1].cx, boxes[1].b)], color=C, dash="6 4", end="open")
    f.pill(190, 270, "Mitigates", color=C, size=10.5, italic=True)
    f.callout(222, 150, 1)
    f.callout(606, 150, 2)
    f.callout(400, 310, 3)
    f.callout(40, 310, 4)
    f.callout(620, 310, 5)
    return f


@fig("layer-cyber")
def layer_cyber():
    f = Fig(1000, 500, "Cybersecurity layer — assets, threats and mitigations",
            "Threat modeling per FDA premarket guidance and IEC 81001-5-1, tied back to safety")
    Y = "cyber"
    C = PALETTE[Y][0]
    f.rect(530, 90, 445, 250, fill=PALETTE[Y][2], stroke=C, sw=1.3, rx=12, dash="7 5")
    f.text(962, 106, "«TrustBoundary»  pump firmware", size=11, color=C, anchor="end", italic=True)
    actor = f.block(40, 110, 180, 64, "malicious insider", "ThreatActor", cat=Y, soft=True)
    tech = f.block(40, 250, 180, 64, "service-port access", "AttackTechnique", cat=Y, soft=True, name_size=12)
    thr = f.block(300, 180, 180, 64, "config tampering", "Threat", cat=Y, name_size=12.5)
    asset = f.block(560, 125, 180, 64, "drug library", "CybersecurityAsset", cat=Y)
    surf = f.block(785, 125, 170, 64, "service port", "AttackSurface", cat=Y, soft=True)
    vul = f.block(560, 255, 180, 64, "weak service auth", "Vulnerability", cat=Y, soft=True)
    risk = f.block(785, 255, 170, 64, "tampering risk", "CyberRisk", cat=Y)
    mit = f.block(560, 405, 180, 64, "strong service auth", "CyberMitigation", cat=Y)
    sreq = f.block(290, 405, 210, 64, "reqAuthenticatedService", "SecurityRequirement", cat="requirements", name_size=12)
    haz = f.block(785, 405, 170, 64, "overdoseHazard", "Hazard", cat="risk", name_size=12.5)
    rel(f, thr.left(0.3), actor.right(), "AttributedToThreatActor", Y, at=0.38, label_dy=-16)
    rel(f, thr.left(0.7), tech.right(), "UsesAttackTechnique", Y, at=0.5, label_dy=14)
    rel(f, asset.left(), (thr.r, thr.y + 16), "ThreatenedBy", Y)
    rel(f, (thr.r, thr.y + 48), vul.left(), "Exploits", Y)
    rel(f, surf.left(), asset.right(), "ExposesAsset", Y, at=0.5, label_dy=-14)
    rel(f, mit.top(), vul.bottom(), "Mitigates", Y)
    rel(f, thr.bottom(), (thr.cx, sreq.y), "DerivesCyberRequirement", Y)
    rel(f, risk.bottom(), haz.top(), "ImpactsSafety", Y)
    f.callout(560, 125, 1)
    f.callout(530, 90, 2)
    f.callout(300, 180, 3)
    f.callout(560, 405, 4)
    f.callout(785, 405, 5)
    return f


@fig("layer-human")
def layer_human():
    f = Fig(1000, 450, "Human factors — users, tasks, use errors and the UI",
            "IEC 62366-1 usability engineering connected to the operational and risk layers")
    H = "human"
    C = PALETTE[H][0]
    f.actor(80, 170, "Nurse")
    task = f.action(150, 140, 200, 56, "Program VTBI", "operational", stereo="OperativeAction")
    tda = f.block(150, 260, 200, 60, "difficulty: high", "TaskDifficultyAssessment", cat=H, soft=True, name_size=12.5)
    ue = f.block(430, 140, 200, 64, "decimal-point slip", "UseError", cat=H)
    haz = f.block(720, 140, 220, 64, "wrong dose programmed", "Hazard", cat="risk", name_size=12.5)
    ui = f.block(430, 280, 200, 64, "dose entry keypad", "UIElement", cat="software", name_size=12.5)
    vc = f.block(720, 280, 220, 64, "summative usability test", "ValidationCase", cat="verification", name_size=12.5)
    rel(f, tda.top(), (task.cx, task.b), "AssessesDifficulty", H)
    rel(f, task.right(), ue.left(), "CommitsUseError", H)
    rel(f, ue.right(), haz.left(), "Causes", "risk")
    rel(f, (ue.cx, ue.b), ui.top(), "ErrorAtElement", H)
    rel(f, ui.right(), vc.left(), "TestedByUsability", H)
    f.chip(430, 395, "UIState · UIEvent · UIAction · InteractionFlow · ScreenCapture", cat="software", size=10.5)
    f.callout(150, 140, 1)
    f.callout(430, 140, 2)
    f.callout(430, 280, 3)
    f.callout(720, 280, 4)
    return f


@fig("layer-verification")
def layer_verification():
    f = Fig(1000, 450, "Verification and validation — claims, checks and evidence",
            "A verification case states what it verifies and the subject it exercises; evidence records the result")
    V = "verification"
    C = PALETTE[V][0]
    req = f.block(40, 110, 200, 60, "reqCs25", "Requirement", cat="requirements")
    ctl = f.block(40, 200, 200, 60, "lockoutControl", "RiskControlMeasure", cat="risk", name_size=12.5)
    sub = f.block(40, 290, 200, 60, "infusionMgr", "subject", cat="software")
    vc = f.block(330, 150, 250, 150, "vcLockout", "VerificationCase", cat=V,
                 attrs=["methodKind = test", "acceptanceCriteria = …", "objective { verify reqCs25; }", "subject verified = (…)"])
    f.line([vc.left(0.25), (290, vc.y + 0.25 * vc.h), (290, req.cy), req.right()], color=INK, end="open")
    f.pill(290, 132, "verify", color=INK, size=10.5)
    f.line([vc.left(0.55), (270, vc.y + 0.55 * vc.h), (270, ctl.cy), ctl.right()], color=INK, dash="3 3", end="open")
    f.line([vc.left(0.8), (290, vc.y + 0.8 * vc.h), (290, sub.cy), sub.right()], color=INK, dash="3 3", end="open")
    f.text(296, 330, "subject", size=10.5, color=MUTED, anchor="start", italic=True)
    steps = f.block(330, 350, 250, 60, "step 1 … step n", "TestStep", cat=V, soft=True)
    f.line([(vc.cx, vc.b), steps.top()], color=INK, start="diamond")
    run = f.block(660, 150, 140, 70, "run 2026-10-02", "TestRun", cat=V, soft=True, name_size=12)
    ev = f.block(830, 150, 140, 70, "evidenceLockout", "MemoEvidence", cat=V, name_size=12)
    f.line([vc.right(0.3), run.left()], color=INK, dash="6 4", end="open")
    rel(f, (vc.r, vc.y + 0.7 * vc.h), (ev.cx, ev.b), "ProducesEvidence", V, at=0.5)
    f.line([run.right(), ev.left()], color=FAINT, sw=1.2)
    vcase = f.block(660, 320, 310, 70, "summative clinical use", "ValidationCase  (validates a Need)", cat=V, soft=True, name_size=12.5)
    f.callout(330, 150, 1)
    f.callout(290, 214, 2)
    f.callout(330, 350, 3)
    f.callout(830, 150, 4)
    f.callout(660, 320, 5)
    return f


@fig("layer-variability")
def layer_variability():
    f = Fig(1000, 440, "Variability — features, variation points and variants",
            "A feature says why a variant exists; a release record selects features, and with them the variants it ships")
    V = "variability"
    C = PALETTE[V][0]
    vp = f.frame(330, 100, 330, 220, "variation part  outputStage", cat=V)
    v1 = f.block(360, 150, 270, 60, "euOutput", "variant part", cat="logical")
    v2 = f.block(360, 240, 270, 60, "usOutput", "variant part", cat="logical")
    fe = f.block(40, 130, 210, 56, "featEuMarket", "ProductFeature", cat=V)
    fu = f.block(40, 250, 210, 56, "featUsMarket", "ProductFeature", cat=V)
    rel(f, v1.left(), fe.right(), "#RealizesFeature", V)
    rel(f, v2.left(), fu.right(), "#RealizesFeature", V)
    f.line([(fe.cx, fe.b), (fu.cx, fu.y)], color=C, dash="6 4", end="open", start="open")
    f.pill(145, 218, "ExcludesFeature", color=C, size=10.5, italic=True)
    rr = f.block(740, 120, 230, 70, "release 2.0 EU", "release record", cat="neutral")
    dd = f.block(740, 250, 230, 70, "output stage choice", "DesignDecision", cat="neutral")
    f.line([(rr.x, rr.cy), (680, rr.cy), (680, 92), (145, 92), (fe.cx, fe.y)], color=C, dash="6 4", end="open")
    f.pill(420, 92, "#SelectsFeature", color=C, size=10.5, italic=True)
    rel(f, dd.left(), (v2.r, v2.cy), "#Alternative", "neutral")
    f.line([(dd.x, dd.y + 12), (v1.r, v1.cy)], color=INK, dash="6 4", end="open")
    f.text(690, 214, "#Selected", size=10.5, color=MUTED, italic=True)
    f.text(500, 380, "Advanced › Variability shows releases, variation points and features together,\nand flags a release that selects excluded features or two variants of one point.",
           size=11.5, color=MUTED, italic=True)
    f.callout(330, 100, 1)
    f.callout(40, 130, 2)
    f.callout(740, 120, 3)
    f.callout(740, 250, 4)
    return f
