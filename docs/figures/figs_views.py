"""Figures for the Views pages: one illustration per SysML v2 view kind."""
from svgkit import Fig, PALETTE, INK, MUTED, FAINT

FIGS = {}


def fig(name):
    def deco(fn):
        FIGS[name] = fn
        return fn
    return deco


@fig("view-ibd-physical")
def ibd_physical():
    f = Fig(980, 600, "Physical interconnection view (IBD)",
            "ibd  gpcaDevice : HardwareAssembly — parts, ports, connectors and the flows they carry")
    P = "physical"
    C = PALETTE[P][0]
    fr = f.frame(24, 70, 932, 500, "ibd  gpcaDevice", cat=P)

    sensor = f.block(60, 130, 165, 76, "occlusionSensor", "Sensor", cat=P)
    button = f.block(60, 330, 165, 76, "bolusButton", "HardwareComponent", cat=P)
    mcu = f.block(400, 130, 230, 240, "mainController", "ProcessingNode", cat=P,
                  attrs=["nodeKind = microcontroller", "memory = 1 MB", "safetyPartition = true"])
    motor = f.block(800, 224, 140, 100, "pumpMotor", "Actuator", cat=P, title_top=True)
    psu = f.block(425, 450, 210, 70, "powerSupply", "PowerSupply", cat=P)

    s_out = f.port(sensor, "right", 0.5, "out", P)
    b_out = f.port(button, "right", 0.5, "out", P)
    m_in1 = f.port(mcu, "left", 0.55, "in", P, label="sensorHarness")
    m_in2 = f.port(mcu, "left", 0.82, "in", P, label="patientPendant")
    m_out = f.port(mcu, "right", 0.6, "out", P, label="motorDrive")
    m_pwr = f.port(mcu, "bottom", 0.565, "in", P, label="powerIn")
    mo_in = f.port(motor, "left", 0.5, "in", P, label="flowCmdIn")
    p_out = f.port(psu, "top", 0.5, "out", P)
    p_in = f.port(psu, "left", 0.5, "in", P)
    edge = f.port(fr, "left", 0.83, "in", P)

    f.line([s_out, (330, s_out[1]), (330, m_in1[1]), m_in1], color=C, sw=2)
    f.line([b_out, (330, b_out[1]), (330, m_in2[1]), m_in2], color=C, sw=2)
    f.line([m_out, mo_in], color=C, sw=2)
    f.line([p_out, m_pwr], color=C, sw=2)
    f.line([edge, p_in], color=C, sw=2)

    f.flow(282, s_out[1], "pressure signal", "right", P)
    f.flow(282, b_out[1], "bolus request", "right", P, label_pos="below")
    f.flow(715, m_out[1], "step / dir pulses", "right", P)
    f.flow(530, 412, "3.3 V DC", "up", P, label_pos="right")
    f.flow(200, edge[1], "mains AC", "right", P)

    f.text(715, m_out[1] + 30, "pumpMotorDrive\n: PhysicalInterface", size=10.5, color=MUTED, italic=True)

    f.callout(400, 130, 1)
    f.callout(652, m_out[1] - 22, 2)
    f.callout(330, 215, 3)
    f.callout(715, m_out[1] - 46, 4)
    f.callout(24, edge[1] - 28, 5)
    f.callout(630, 188, 6)
    return f



@fig("view-general")
def general():
    f = Fig(980, 600, "General view (block definition)",
            "bdd  GPCA structure — definitions, composition, multiplicity and specialization")
    L, P, F = "logical", "physical", "functional"
    fr = f.frame(24, 70, 932, 506, "bdd  GPCA structure", cat="neutral")
    root = f.block(380, 96, 220, 66, "GpcaSystem", "System", cat=L)
    inf = f.block(70, 230, 230, 110, "InfusionSubsystem", "Subsystem", cat=L,
                  attrs=["basalRate : VolumeFlowRate", "lockout : DurationValue"])
    alm = f.block(375, 230, 230, 66, "AlarmSubsystem", "Subsystem", cat=L)
    dev = f.block(680, 230, 230, 66, "GpcaDevice", "HardwareAssembly", cat=P)
    occ = f.block(600, 380, 170, 66, "OcclusionSensor", "part def", cat=P)
    mot = f.block(790, 380, 140, 66, "PumpMotor", "part def", cat=P)
    lib = f.block(600, 492, 170, 56, "Sensor", "MEMO kind", cat="neutral", dash="5 4", soft=True)

    C = "#334155"
    for child, role in ((inf, "infusion"), (alm, "alarms"), (dev, "device")):
        f.line([root.bottom(), (root.cx, 196), (child.cx, 196), child.top()], color=C, start="diamond" if child is inf else None)
        f.text(child.cx + 8, child.y - 12, f"{role} [1]", size=11, color=MUTED, anchor="start")
    f.line([dev.bottom(), (dev.cx, 350), (occ.cx, 350), occ.top()], color=C, start="diamond")
    f.line([(dev.cx, 350), (mot.cx, 350), mot.top()], color=C)
    f.text(occ.cx + 8, occ.y - 12, "occlusion [1]", size=11, color=MUTED, anchor="start")
    f.text(mot.cx + 8, mot.y - 12, "motor [1]", size=11, color=MUTED, anchor="start")
    f.line([occ.bottom(), lib.top()], color=C, end="triangle")
    f.text(occ.cx + 10, 470, ":>  specializes", size=11, color=MUTED, anchor="start", italic=True)

    f.callout(380, 96, 1)
    f.callout(root.cx - 18, 182, 2)
    f.callout(occ.cx - 18, 470, 3)
    f.callout(300, 280, 4)
    return f


@fig("view-usecase-context")
def usecase_context():
    f = Fig(1000, 520, "Use case and context views",
            "Left: what actors want from the system.  Right: the black-box system in its surroundings.")
    O, CX = "operational", "context"
    # use case panel
    f.frame(24, 70, 470, 426, "uc  PCA therapy", cat="neutral")
    sb = f.block(150, 110, 220, 360, "GPCA pump", None, cat="neutral", soft=True, title_top=True)
    f.ellipse(260, 190, 92, 30, "Deliver PCA therapy", O)
    f.ellipse(260, 290, 80, 28, "Request bolus", O)
    f.ellipse(260, 380, 92, 28, "Program prescription", O)
    f.ellipse(260, 445, 76, 20, "Respond to alarm", O, size=11.5)
    f.actor(70, 230, "Patient")
    f.actor(70, 390, "Nurse")
    f.actor(440, 300, "Prescriber")
    for (ax, ay), (ux, uy) in (((84, 225), (170, 200)), ((84, 232), (182, 288)), ((84, 385), (170, 380)),
                               ((84, 395), (186, 445)), ((426, 300), (350, 380))):
        f.line([(ax, ay), (ux, uy)], color=INK, sw=1.3)
    f.line([(260, 220), (260, 262)], color=PALETTE[O][0], dash="5 4", end="open", label="«include»", at=0.5, label_size=10.5)
    f.callout(150, 110, 1)
    f.callout(352, 168, 2)
    f.callout(42, 205, 3)
    # context panel
    f.frame(510, 70, 466, 426, "context  GPCA in the ward", cat=CX)
    soi = f.block(670, 236, 150, 90, "GPCA pump", "system of interest", cat=CX, fill="#0f766e")
    # repaint label in white
    f.rect(670, 236, 150, 90, fill="#0f766e", stroke="#0f766e", sw=1.6, rx=7)
    f.text(745, 268, "«system of interest»", size=10.5, color="#ccfbf1", italic=True)
    f.text(745, 290, "GPCA pump", size=14, weight=700, color="#ffffff")
    f.actor(575, 140, "Patient")
    f.actor(900, 160, "Nurse")
    ext = f.block(560, 400, 160, 56, "Drug library server", "external system", cat="neutral")
    iv = f.block(780, 400, 160, 56, "IV administration set", "external device", cat="neutral")
    C = PALETTE[CX][0]
    f.line([(600, 170), (680, 236)], color=C, label="bolus request", at=0.62, label_size=10.5)
    f.line([(884, 165), (810, 236)], color=C, label="prescription, alarms", at=0.42, label_size=10.5)
    f.line([(640, 400), (700, 326)], color=C, label="drug library", at=0.5, label_size=10.5)
    f.line([(860, 400), (790, 326)], color=C, label="infusate", at=0.5, label_size=10.5)
    f.callout(670, 236, 4)
    f.callout(838, 218, 5)
    f.rect(536, 108, 418, 372, fill="none", stroke=C, sw=1, rx=10, dash="3 4")
    f.text(944, 120, "use context: hospital ward", size=10.5, color=C, anchor="end", italic=True)
    f.callout(536, 108, 6)
    return f


@fig("view-ibd-logical")
def ibd_logical():
    f = Fig(980, 560, "Logical interconnection view (IBD)",
            "ibd  gpcaLogical : System — logical components exchange items over typed interfaces")
    L = "logical"
    C = PALETTE[L][0]
    fr = f.frame(24, 70, 932, 466, "ibd  gpcaLogical", cat=L)
    cfg = f.block(70, 130, 200, 90, "PrescriptionConfig", "LogicalComponent", cat=L, title_top=True)
    inf = f.block(390, 130, 210, 120, "InfusionControl", "LogicalComponent", cat=L, title_top=True)
    alm = f.block(390, 340, 210, 90, "AlarmManagement", "LogicalComponent", cat=L, title_top=True)
    iso = f.rect(686, 300, 230, 150, fill="none", stroke=C, sw=1.3, rx=10, dash="6 5")
    f.text(900, 314, "«IsolationBoundary»", size=10.5, color=C, anchor="end", italic=True)
    mon = f.block(712, 340, 180, 90, "SafetyMonitor", "LogicalComponent", cat=L, title_top=True)

    c_out = f.port(cfg, "right", 0.7, "out", L, label="params")
    i_in = f.port(inf, "left", 0.62, "in", L, label="params")
    i_out = f.port(inf, "right", 0.62, "out", L, label="cmd")
    i_st = f.port(inf, "bottom", 0.5, "out", L, label="status")
    a_in = f.port(alm, "top", 0.5, "in", L)
    m_out = f.port(mon, "left", 0.7, "out", L, label="fault")
    a_in2 = f.port(alm, "right", 0.7, "in", L, label="fault")
    edge = f.port(fr, "right", (i_out[1] - 70) / 466, "out", L)

    f.line([c_out, (330, c_out[1]), (330, i_in[1]), i_in], color=C, sw=2)
    f.line([i_out, (edge[0], i_out[1])], color=C, sw=2)
    f.line([i_st, a_in], color=C, sw=2)
    f.line([m_out, a_in2], color=C, sw=2)
    f.flow(300, c_out[1], "infusion parameters", "right", L)
    f.flow(780, i_out[1], "flow command", "right", L)
    f.flow(i_st[0], 298, "therapy status", "down", L, label_pos="right")
    f.flow(660, m_out[1], "fault", "left", L, label_pos="below")
    f.text(780, i_out[1] + 22, "delivery : LogicalInterface", size=10.5, color=MUTED, italic=True)

    f.callout(390, 130, 1)
    f.callout(i_out[0] + 4, i_out[1] - 22, 2)
    f.callout(700, i_out[1] - 24, 3)
    f.callout(780, i_out[1] - 44, 4)
    f.callout(686, 300, 5)
    f.callout(956, edge[1] - 26, 6)
    return f


@fig("view-action-flow")
def action_flow():
    f = Fig(980, 600, "Action flow view",
            "act  patientBolus — actions, pins and item flows, control successions, decisions and swimlanes")
    Fn = "functional"
    C = PALETTE[Fn][0]
    fr = f.frame(24, 70, 932, 506, "act  patientBolus", cat="neutral")
    # swimlanes
    f.rect(50, 104, 880, 110, fill="#fbfcfe", stroke=FAINT, sw=1, rx=4)
    f.rect(50, 214, 880, 340, fill="#ffffff", stroke=FAINT, sw=1, rx=4)
    f.text(60, 118, "Patient", size=12, weight=700, color=MUTED, anchor="start")
    f.text(60, 228, "GPCA pump", size=12, weight=700, color=MUTED, anchor="start")
    f.initial(110, 160)
    req = f.action(150, 136, 160, 48, "Request bolus", Fn)
    chk = f.action(150, 280, 160, 52, "Check lockout\nand dose limits", Fn)
    d = f.diamond(420, 306, 18)
    dlv = f.action(510, 252, 170, 46, "Deliver bolus", Fn)
    rej = f.action(510, 352, 170, 46, "Reject request", Fn)
    m = f.diamond(760, 330, 16)
    log = f.action(700, 440, 150, 46, "Log outcome", Fn)
    f.final(890, 463)

    f.line([(118, 160), req.left()], color=INK, end="arrow")
    p1 = f.pin(req, "bottom", 0.5, Fn, "out")
    p2 = f.pin(chk, "top", 0.5, Fn, "in")
    f.line([p1, p2], color=C, sw=2, dash="7 4", end="arrow")
    f.pill(300, 240, "bolusRequest : BolusRequest", color=C, size=10.5)
    f.line([chk.right(), (402, 306)], color=INK, end="arrow")
    f.line([(420, 288), (420, 275), dlv.left()], color=INK, end="arrow", label="[limits ok]", at=0.35, label_size=10.5)
    f.line([(420, 324), (420, 375), rej.left()], color=INK, end="arrow", label="[locked out]", at=0.3, label_size=10.5)
    f.line([dlv.right(), (760, 275), (760, 314)], color=INK, end="arrow")
    f.line([rej.right(), (760, 375), (760, 346)], color=INK, end="arrow")
    f.line([(776, 330), (800, 330), (800, 400), (775, 400), (775, 440)], color=INK, end="arrow")
    f.line([log.right(), (878, 463)], color=INK, end="arrow")

    f.callout(150, 136, 1)
    f.callout(252, 200, 2)
    f.callout(352, 306, 3)
    f.callout(452, 244, 4)
    f.callout(50, 214, 5)
    f.callout(110, 136, 6)
    return f


@fig("view-state")
def state():
    f = Fig(980, 540, "State transition view",
            "stm  infusionModes — states, transitions with trigger [guard] / effect, and composite states")
    Fn = "functional"
    C = PALETTE[Fn][0]
    f.frame(24, 70, 932, 446, "stm  infusionModes", cat="neutral")
    f.initial(80, 160)
    idle = f.action(120, 136, 150, 48, "Idle", Fn)
    act = f.block(360, 110, 400, 270, "Active", None, cat=Fn, soft=True, title_top=True, rx=18)
    f.initial(400, 190, r=7)
    bas = f.action(440, 166, 130, 48, "Basal", Fn)
    bol = f.action(600, 166, 130, 48, "PatientBolus", Fn)
    sq = f.action(440, 290, 130, 48, "SquareBolus", Fn)
    alm = f.action(800, 300, 130, 52, "Alarm", "risk")
    stp = f.action(120, 400, 150, 48, "Stopped", Fn)

    f.line([(88, 160), idle.left()], color=INK, end="arrow")
    f.line([idle.right(), (360, 160)], color=INK, end="arrow", label="start [prescription valid]", at=0.5, label_dy=-16, label_size=10.5)
    f.line([(407, 190), bas.left()], color=INK, end="arrow")
    f.line([bas.right(0.35), (600, 183)], color=INK, end="arrow")
    f.line([(600, 199), bas.right(0.7)], color=INK, end="arrow")
    f.pill(585, 146, "bolusRequest [lockout clear] / startBolus", color=C, size=10.5)
    f.pill(585, 232, "bolusDone", color=C, size=10.5)
    f.line([bas.bottom(0.5), sq.top(0.5)], color=INK, end="arrow", label="squareBolus", at=0.5, label_size=10.5)
    f.line([(760, 250), (865, 250), (865, 300)], color=PALETTE["risk"][0], end="arrow", label="alarmRaised / stopInfusion", at=0.35, label_dy=-16, label_size=10.5)
    f.line([alm.bottom(), (865, 424), stp.right()], color=INK, end="arrow", label="clear [clinician ack]", at=0.6, label_dy=-15, label_size=10.5)
    f.line([stp.top(), idle.bottom()], color=INK, end="arrow", label="reset", at=0.5, label_size=10.5)

    f.callout(120, 136, 1)
    f.callout(316, 178, 2)
    f.callout(360, 110, 3)
    f.callout(80, 136, 4)
    return f


@fig("view-sequence")
def sequence():
    f = Fig(980, 600, "Sequence view",
            "seq  bolusRequest — lifelines exchange ordered messages; fragments show alternatives")
    S = "software"
    C = PALETTE[S][0]
    f.frame(24, 70, 932, 506, "seq  bolusRequest", cat="neutral")
    heads = [("patient", "User", 110, "context"), ("pendant", "HardwareComponent", 290, "physical"),
             ("infusionMgr", "SoftwareModule", 490, S), ("alarm", "SoftwareModule", 690, S), ("pumpMotor", "Actuator", 870, "physical")]
    xs = {}
    for name, st, x, cat in heads:
        f.block(x - 70, 100, 140, 52, name, st, cat=cat, name_size=12.5)
        f.add(f'<path d="M{x},152 V548" stroke="{FAINT}" stroke-width="1.4" stroke-dasharray="6 5"/>')
        xs[name] = x
    # activations
    for x, y0, y1 in ((xs["pendant"], 190, 230), (xs["infusionMgr"], 222, 520), (xs["pumpMotor"], 380, 430), (xs["alarm"], 470, 505)):
        f.rect(x - 6, y0, 12, y1 - y0, fill="#ffffff", stroke=INK, sw=1.2, rx=1)
    def msg(x1, x2, y, label, ret=False):
        f.line([(x1, y), (x2, y)], color=INK if not ret else MUTED, dash="5 4" if ret else None,
               end="open" if ret else "arrow", sw=1.4)
        f.text((x1 + x2) / 2, y - 11, label, size=11, color=INK if not ret else MUTED)
    msg(xs["patient"], xs["pendant"] - 6, 196, "press()")
    msg(xs["pendant"] + 6, xs["infusionMgr"] - 6, 228, "bolusRequest")
    # self call
    f.line([(xs["infusionMgr"] + 6, 262), (xs["infusionMgr"] + 46, 262), (xs["infusionMgr"] + 46, 284), (xs["infusionMgr"] + 6, 284)], color=INK, end="arrow", sw=1.4)
    f.text(xs["infusionMgr"] + 54, 273, "checkLockout()", size=11, anchor="start")
    # alt fragment
    f.rect(390, 320, 540, 210, fill="none", stroke=C, sw=1.3, rx=4)
    f.add(f'<path d="M390,320 h46 v14 l-8,8 h-38 z" fill="{C}"/>')
    f.text(400, 332, "alt", size=11.5, weight=700, color="#ffffff", anchor="start")
    f.text(446, 336, "[lockout clear]", size=11, color=C, anchor="start")
    f.add(f'<path d="M390,446 H930" stroke="{C}" stroke-width="1.1" stroke-dasharray="6 4"/>')
    f.text(400, 460, "[else]", size=11, color=C, anchor="start")
    msg(xs["infusionMgr"] + 6, xs["pumpMotor"] - 6, 384, "startBolus(volume)")
    msg(xs["pumpMotor"] - 6, xs["infusionMgr"] + 6, 426, "bolusDone", ret=True)
    msg(xs["infusionMgr"] + 6, xs["alarm"] - 6, 476, "notify(rejected)")
    f.callout(xs["infusionMgr"] - 70, 100, 1)
    f.callout(392, 248, 2)
    f.callout(xs["infusionMgr"] - 20, 300, 3)
    f.callout(390, 320, 4)
    return f


@fig("view-grid")
def grid():
    f = Fig(980, 520, "Grid views",
            "Left: a traceability matrix.  Right: a design structure matrix (DSM).")
    V, R = "verification", "requirements"
    f.frame(24, 70, 560, 426, "grid  Requirement → VerificationCase", cat="neutral")
    cols = ["VER-001", "VER-002", "VER-003", "VER-004"]
    rows = ["REQ-CS-01", "REQ-CS-19", "REQ-CS-25", "REQ-CS-59", "REQ-OCCL"]
    cells = {(0, 0), (1, 2), (2, 1), (3, 2), (3, 3)}
    x0, y0, cw, ch = 190, 180, 80, 44
    for j, c in enumerate(cols):
        f.rect(x0 + j * cw, y0 - 50, cw, 50, fill=PALETTE[V][1], stroke="#ffffff", sw=2, rx=3)
        f.text(x0 + j * cw + cw / 2, y0 - 25, c, size=11.5, weight=600)
    for i, r in enumerate(rows):
        gap = i == 4
        f.rect(50, y0 + i * ch, 140, ch, fill=PALETTE["risk"][1] if gap else PALETTE[R][1], stroke="#ffffff", sw=2, rx=3)
        f.text(120, y0 + i * ch + ch / 2, r, size=11.5, weight=600)
        for j in range(len(cols)):
            fill = "#fff5f5" if gap else ("#f8fafc" if (i + j) % 2 else "#ffffff")
            f.rect(x0 + j * cw, y0 + i * ch, cw, ch, fill=fill, stroke="#e4e7eb", sw=1, rx=0)
            if (i, j) in cells:
                f.add(f'<circle cx="{x0 + j * cw + cw / 2}" cy="{y0 + i * ch + ch / 2}" r="11" fill="{PALETTE[V][0]}"/>')
                f.text(x0 + j * cw + cw / 2, y0 + i * ch + ch / 2, "✓", size=12, weight=700, color="#ffffff")
    f.text(x0 + 2 * cw, y0 + 4 * ch + ch / 2, "no verification — a gap", size=11.5, color=PALETTE["risk"][0], italic=True)
    f.text(120, y0 - 25, "verify ▸", size=11, color=MUTED)
    f.callout(x0, y0 - 50, 1)
    f.callout(x0 + cw + cw / 2 + 26, y0 + 2 * ch + ch / 2, 2)
    f.callout(50, y0 + 4 * ch, 3)
    # DSM
    f.frame(600, 70, 356, 426, "grid  DSM", cat="neutral")
    names = ["Config", "Infusion", "Alarm", "Monitor", "Motor"]
    marks = {(1, 0), (2, 1), (3, 1), (2, 3), (4, 1), (0, 2)}
    gx, gy, s = 720, 150, 44
    for i, n in enumerate(names):
        f.text(gx - 10, gy + i * s + s / 2, n, size=11.5, anchor="end", weight=600)
        f.text(gx + i * s + s / 2, gy - 14, str(i + 1), size=11.5, weight=600, color=MUTED)
        f.text(gx - 82, gy + i * s + s / 2, str(i + 1), size=11, color=MUTED)
    f.rect(gx + s, gy + s, 3 * s, 3 * s, fill=PALETTE["logical"][2], stroke=PALETTE["logical"][0], sw=1.6, rx=3)
    for i in range(5):
        for j in range(5):
            if i == j:
                f.rect(gx + j * s, gy + i * s, s, s, fill="#cbd2d9", stroke="#ffffff", sw=1, rx=0)
            else:
                f.rect(gx + j * s, gy + i * s, s, s, fill="none", stroke="#e4e7eb", sw=1, rx=0)
            if (i, j) in marks:
                f.add(f'<circle cx="{gx + j * s + s / 2}" cy="{gy + i * s + s / 2}" r="8" fill="{PALETTE["logical"][0]}"/>')
    f.text(778, 400, "row depends on column", size=11, color=MUTED, italic=True)
    f.text(778, 420, "shaded block: a tightly coupled cluster", size=11, color=MUTED, italic=True)
    f.callout(gx + s, gy + s, 4)
    return f


@fig("view-browser")
def browser():
    f = Fig(980, 470, "Browser view",
            "A tree of the model: packages, definitions and usages, as the model owns them")
    f.frame(24, 70, 560, 376, "browser  GPCA model", cat="neutral")
    rows = [
        (0, "▾", "📦", "gpca_pump", "package", "neutral"),
        (1, "▾", "📦", "catalog", "package", "neutral"),
        (2, "▾", "▣", "gpcaSoftware", "SoftwareSystem", "software"),
        (3, " ", "▢", "infusionMgr", "SoftwareModule", "software"),
        (3, " ", "▢", "alarm", "SoftwareModule", "software"),
        (2, "▸", "▣", "gpcaDevice", "HardwareAssembly", "physical"),
        (2, "▾", "◆", "overdoseHazard", "Hazard", "risk"),
        (3, " ", "↳", "lockoutControl", "mitigates", "risk"),
        (2, "▸", "✓", "vcLockout", "VerificationCase", "verification"),
        (1, "▸", "📦", "viewpoints", "package", "neutral"),
    ]
    for i, (lvl, tw, ic, name, kind, cat) in enumerate(rows):
        y = 112 + i * 31
        x = 50 + lvl * 26
        if i == 2:
            f.rect(40, y - 13, 530, 26, fill=PALETTE["logical"][2], stroke="none", sw=0, rx=4)
        f.text(x, y, tw, size=12, color=MUTED, anchor="start")
        f.text(x + 16, y, ic, size=12, color=PALETTE[cat][0], anchor="start")
        f.text(x + 36, y, name, size=12.5, weight=600, anchor="start")
        f.chip(400, y, kind, cat=cat, size=10.5)
    f.callout(40, 99, 1)
    f.callout(40, 174, 2)
    f.callout(112, 329, 3)
    # side: properties
    f.frame(600, 70, 356, 376, "selection", cat="neutral")
    f.text(620, 116, "gpcaSoftware", size=14, weight=700, anchor="start")
    f.chip(620, 142, "SoftwareSystem", cat="software", size=10.5)
    props = [("id", "SW-SYS-001"), ("safetyClass", "C"), ("owns", "8 modules"), ("satisfies", "REQ-CS-01, REQ-CS-18 …"),
             ("realizes", "gpcaPump"), ("appears in", "3 views")]
    for i, (k, v) in enumerate(props):
        y = 182 + i * 30
        f.text(620, y, k, size=11.5, color=MUTED, anchor="start")
        f.text(720, y, v, size=11.5, anchor="start", mono=True)
    f.callout(600, 162, 4)
    return f


@fig("view-kinds")
def kinds():
    f = Fig(1000, 520, "The eight SysML v2 view kinds", "Every view in MEMO resolves to one of these presentations")
    tiles = [
        ("General", "structure, definitions,\nrequirement and risk graphs"),
        ("Interconnection", "parts, ports, connectors\nand flows (IBD)"),
        ("Action flow", "actions, item flows,\nsuccessions, swimlanes"),
        ("State transition", "states, transitions,\nmodes"),
        ("Sequence", "lifelines and\nordered messages"),
        ("Grid", "matrices, DSM,\ntables"),
        ("Browser", "model tree and\ndocument browsing"),
        ("Geometry", "reserved —\nrenderer deferred"),
    ]
    W, H = 220, 196
    for k, (name, desc) in enumerate(tiles):
        col, row = k % 4, k // 4
        x, y = 30 + col * (W + 22), 76 + row * (H + 20)
        grey = name == "Geometry"
        f.rect(x, y, W, H, fill="#f8fafc", stroke="#d9e2ec", sw=1.2, rx=10, opacity=0.6 if grey else None)
        cx, cy = x + W / 2, y + 66
        c = PALETTE["logical"][0]
        if name == "General":
            f.rect(cx - 30, cy - 40, 60, 22, fill="#dbeafe", stroke=c, sw=1.2, rx=3)
            for dx in (-60, 0, 60):
                f.rect(cx + dx - 26, cy + 12, 52, 22, fill="#dbeafe", stroke=c, sw=1.2, rx=3)
                f.add(f'<path d="M{cx},{cy - 18} V{cy - 4} H{cx + dx} V{cy + 12}" fill="none" stroke="{c}" stroke-width="1.2"/>')
        elif name == "Interconnection":
            f.rect(cx - 80, cy - 30, 60, 50, fill="#e2e8f0", stroke="#475569", sw=1.2, rx=3)
            f.rect(cx + 20, cy - 30, 60, 50, fill="#e2e8f0", stroke="#475569", sw=1.2, rx=3)
            f.rect(cx - 25, cy - 10, 10, 10, fill="#fff", stroke="#475569", sw=1.2, rx=0)
            f.rect(cx + 15, cy - 10, 10, 10, fill="#fff", stroke="#475569", sw=1.2, rx=0)
            f.line([(cx - 15, cy - 5), (cx + 15, cy - 5)], color="#475569", end="arrow", sw=1.4)
        elif name == "Action flow":
            f.add(f'<circle cx="{cx - 85}" cy="{cy}" r="6" fill="{INK}"/>')
            f.rect(cx - 70, cy - 14, 54, 28, fill="#fef3c7", stroke="#b45309", sw=1.2, rx=12)
            f.diamond(cx + 5, cy, 10)
            f.rect(cx + 28, cy - 34, 54, 26, fill="#fef3c7", stroke="#b45309", sw=1.2, rx=12)
            f.rect(cx + 28, cy + 8, 54, 26, fill="#fef3c7", stroke="#b45309", sw=1.2, rx=12)
            f.line([(cx - 79, cy), (cx - 70, cy)], sw=1.2)
            f.line([(cx - 16, cy), (cx - 5, cy)], sw=1.2, end="arrow")
            f.line([(cx + 5, cy - 10), (cx + 5, cy - 21), (cx + 28, cy - 21)], sw=1.2, end="arrow")
            f.line([(cx + 5, cy + 10), (cx + 5, cy + 21), (cx + 28, cy + 21)], sw=1.2, end="arrow")
        elif name == "State transition":
            f.rect(cx - 80, cy - 16, 56, 32, fill="#fef3c7", stroke="#b45309", sw=1.2, rx=14)
            f.rect(cx + 24, cy - 16, 56, 32, fill="#fef3c7", stroke="#b45309", sw=1.2, rx=14)
            f.line([(cx - 24, cy - 6), (cx + 24, cy - 6)], sw=1.2, end="arrow")
            f.line([(cx + 24, cy + 6), (cx - 24, cy + 6)], sw=1.2, end="arrow")
        elif name == "Sequence":
            for dx in (-60, 0, 60):
                f.rect(cx + dx - 22, cy - 40, 44, 16, fill="#ede9fe", stroke="#6d28d9", sw=1.1, rx=2)
                f.add(f'<path d="M{cx + dx},{cy - 24} V{cy + 34}" stroke="{FAINT}" stroke-dasharray="4 3"/>')
            f.line([(cx - 60, cy - 8), (cx, cy - 8)], sw=1.2, end="arrow")
            f.line([(cx, cy + 8), (cx + 60, cy + 8)], sw=1.2, end="arrow")
            f.line([(cx + 60, cy + 24), (cx - 60, cy + 24)], sw=1.1, end="open", dash="4 3", color=MUTED)
        elif name == "Grid":
            for i in range(4):
                for j in range(5):
                    f.rect(cx - 70 + j * 28, cy - 36 + i * 18, 28, 18, fill="#f0fdf4" if (i + j) % 3 else "#ffffff", stroke="#d9e2ec", sw=1, rx=0)
            for i, j in ((0, 1), (1, 3), (2, 2), (3, 4)):
                f.add(f'<circle cx="{cx - 56 + j * 28}" cy="{cy - 27 + i * 18}" r="5" fill="#15803d"/>')
        elif name == "Browser":
            for i, (lvl, w) in enumerate(((0, 90), (1, 80), (2, 70), (2, 60), (1, 76))):
                f.rect(cx - 70 + lvl * 16, cy - 38 + i * 16, 8, 8, fill="#cbd2d9", stroke="none", sw=0, rx=1)
                f.rect(cx - 56 + lvl * 16, cy - 37 + i * 16, w, 6, fill="#cbd2d9", stroke="none", sw=0, rx=3)
        else:
            f.add(f'<path d="M{cx - 40},{cy + 20} L{cx},{cy - 30} L{cx + 40},{cy + 20} z" fill="none" stroke="{FAINT}" stroke-width="1.4"/>')
            f.add(f'<ellipse cx="{cx}" cy="{cy + 20}" rx="40" ry="10" fill="none" stroke="{FAINT}" stroke-width="1.4"/>')
        f.text(cx, y + 136, name, size=14, weight=700, color=MUTED if grey else INK)
        f.text(cx, y + 167, desc, size=11.5, color=MUTED)
    return f


def build(out_dir):
    for name, fn in FIGS.items():
        fn().save(f"{out_dir}/{name}.svg")
    return list(FIGS)
