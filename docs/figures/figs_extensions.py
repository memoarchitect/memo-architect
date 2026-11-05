"""Figures for the Extensions pages."""
from svgkit import Fig, PALETTE, INK, MUTED, FAINT, ACCENT

FIGS = {}


def fig(name):
    def deco(fn):
        FIGS[name] = fn
        return fn
    return deco


E = "extension"


def ext_box(f, x, y, w, h, name, sub=None):
    stroke, f1, f2 = PALETTE[E]
    f.rect(x, y, w, h, fill=f2, stroke=stroke, sw=1.5, rx=8, dash="6 3")
    if sub:
        f.text(x + w / 2, y + h / 2 - 8, name, size=13, weight=700, color=stroke)
        f.text(x + w / 2, y + h / 2 + 10, sub, size=11, color=MUTED)
    else:
        f.text(x + w / 2, y + h / 2, name, size=13, weight=700, color=stroke)


@fig("ext-overview")
def overview():
    f = Fig(1000, 470, "How extensions relate to the base ontology",
            "An extension specializes base kinds and is brought in by one public import of its facade package")
    base = f.rect(230, 330, 540, 100, fill="#f1f5f9", stroke="#52606d", sw=1.5, rx=10)
    f.text(500, 352, "MEMO base ontology  (memo::*)", size=13, weight=700)
    for i, k in enumerate(["SoftwareComponent", "SoftwarePort", "ClinicalWorkflow", "SoftwareDeploymentUnit", "RuntimeEnvironment", "MemoPart"]):
        f.chip(330 + (i % 3) * 170, 385 + (i // 3) * 28, k, size=10, anchor="middle")
    exts = [
        ("ros", "nodes, topics, QoS", 40, 110), ("messaging", "pub/sub, brokers", 250, 200), ("container", "images, runtimes", 40, 260),
        ("aadl", "process, thread, partition", 420, 110), ("cloud", "services, data stores", 600, 200),
        ("clinical", "procedure workflows", 790, 110), ("anatomy", "FMA-based anatomy", 790, 230),
    ]
    pos = {}
    for name, sub, x, y in exts:
        ext_box(f, x, y, 170, 56, f"memo_extension_{name}" if False else name, sub)
        pos[name] = (x, y)
    def mid(n, side="bottom"):
        x, y = pos[n]
        return {"bottom": (x + 85, y + 56), "top": (x + 85, y), "left": (x, y + 28), "right": (x + 170, y + 28)}[side]
    C = PALETTE[E][0]
    # imports between extensions
    f.line([mid("ros", "right"), (230, 138), (230, 228), mid("messaging", "left")], color=C, end="open", label="public import", at=0.5, label_size=10)
    f.line([mid("ros", "bottom"), mid("container", "top")], color=C, end="open")
    f.line([mid("clinical", "bottom"), mid("anatomy", "top")], color=C, end="open")
    # specialize the base
    for n in ("messaging", "container", "aadl", "cloud", "anatomy"):
        x, y = mid(n)
        f.line([(x, y), (max(340, min(660, x)), 330)], color=INK, end="triangle", sw=1.2, opacity=0.8)
    f.line([mid("clinical", "left"), (700, 138), (660, 330)], color=INK, end="triangle", sw=1.2, opacity=0.8)
    f.legend(40, 400, [("arrow", C, "a facade publicly imports another extension"), ("line", INK, "specializes a base kind (:>)")])
    f.text(170, 440 + 6, "", size=1)
    return f


@fig("ext-ros")
def ros():
    f = Fig(1000, 540, "ROS 2 extension in use",
            "Nodes publish and subscribe through directional ports; a topic is an item; images deploy with base relations")
    S = "software"
    C = PALETTE[S][0]
    f.frame(24, 70, 952, 300, "interconnection  robot software", cat=S)
    lidar = f.block(60, 130, 170, 90, "nodeLidar", "RosNode", cat=S, title_top=True)
    nav = f.block(400, 130, 210, 150, "nodeNavigation", "RosNode", cat=S, title_top=True)
    safe = f.block(740, 130, 210, 150, "nodeSafetyMonitor", "RosNode", cat=S, title_top=True)
    p_scan = f.port(lidar, "right", 0.65, "out", S, label="scan pub")
    n_scan = f.port(nav, "left", 0.4, "in", S, label="scan sub")
    n_cmd = f.port(nav, "right", 0.4, "out", S, label="cmd_vel pub")
    s_cmd = f.port(safe, "left", 0.4, "in", S, label="cmd_vel sub")
    s_scan = f.port(safe, "left", 0.75, "in", S, label="scan sub")
    s_estop = f.port(safe, "bottom", 0.5, "out", S, label="estop pub")
    n_estop = f.port(nav, "bottom", 0.5, "in", S, label="estop sub")
    f.line([p_scan, (345, p_scan[1]), (345, n_scan[1]), n_scan], color=C, sw=2)
    f.line([(345, p_scan[1]), (345, 335), (690, 335), (690, s_scan[1]), s_scan], color=C, sw=2)
    f.line([n_cmd, s_cmd], color=C, sw=2)
    f.line([s_estop, (s_estop[0], 350), (n_estop[0], 350), n_estop], color=C, sw=2, opacity=0.9)
    f.flow(292, p_scan[1], "/scan", "right", S)
    f.flow(675, n_cmd[1], "/cmd_vel", "right", S)
    f.flow(700, 350, "/estop", "left", S, label_pos="below")
    f.text(675, n_cmd[1] + 22, "RosTopicInterface", size=10.5, color=MUTED, italic=True)
    f.chip(70, 250, "QoS: volatile · deadline 60 ms", cat=S, size=10)
    # deployment
    D = "deployment"
    img1 = f.block(60, 420, 230, 64, "imageRuntime", "RosContainerImage", cat=D)
    img2 = f.block(320, 420, 230, 64, "imageSafety", "RosContainerImage", cat=D)
    node = f.block(620, 400, 190, 100, "nodeComputeUnit", "ProcessingNode", cat="physical")
    rt = f.block(830, 410, 145, 64, "rosRuntime", "RosContainerRuntime", cat=D, name_size=12)
    f.line([img2.right(), (node.x, img2.cy)], color=INK, dash="6 4", end="open", label="DeploysTo", at=0.5, label_size=10.5, label_italic=True)
    f.line([(img1.cx, img1.b), (img1.cx, 512), (node.cx - 30, 512), (node.cx - 30, node.b)], color=INK, dash="6 4", end="open")
    f.line([node.right(), rt.left()], color=INK, dash="6 4", end="open")
    f.callout(60, 130, 1)
    f.callout(p_scan[0], p_scan[1] + 26, 2)
    f.callout(292, p_scan[1] - 42, 3)
    f.callout(675, n_cmd[1] - 42, 4)
    f.callout(60, 420, 5)
    return f


@fig("ext-messaging")
def messaging():
    f = Fig(1000, 360, "Messaging extension — technology-neutral publish/subscribe",
            "Delivery semantics live on the endpoint ports; a broker is a software component")
    S = "software"
    C = PALETTE[S][0]
    pub = f.block(40, 130, 220, 110, "alarmService", "SoftwareComponent", cat=S, title_top=True)
    brk = f.block(390, 120, 220, 130, "mqttBroker", "MessagingBroker", cat=S,
                  attrs=["brokerProduct = Mosquitto", "persistenceEnabled = true"])
    sub = f.block(740, 130, 220, 110, "nurseStation", "SoftwareComponent", cat=S, title_top=True)
    p1 = f.port(pub, "right", 0.65, "out", S, label="MessagingPublisher")
    p2 = f.port(sub, "left", 0.65, "in", S, label="MessagingSubscriber")
    b1 = f.port(brk, "left", 0.65, "in", S)
    b2 = f.port(brk, "right", 0.65, "out", S)
    f.line([p1, b1], color=C, sw=2)
    f.line([b2, p2], color=C, sw=2)
    f.flow(325, p1[1], "alarm", "right", S)
    f.flow(675, p2[1], "alarm", "right", S)
    f.chip(40, 290, "deliverySemantics = atLeastOnce", cat=S, size=10.5)
    f.chip(40, 320, "publishRateHz = 1 Hz", cat=S, size=10.5)
    f.chip(740, 290, "deliverySemantics = atLeastOnce", cat=S, size=10.5)
    f.chip(740, 320, "lossBehaviour = escalate locally", cat=S, size=10.5)
    f.text(500, 300, "MessagingTopicInterface connects a publisher\nport to a subscriber port and carries the flow",
           size=11.5, color=MUTED, italic=True)
    f.callout(p1[0], p1[1] + 26, 1)
    f.callout(325, p1[1] - 42, 2)
    f.callout(390, 120, 3)
    return f


@fig("ext-aadl")
def aadl():
    f = Fig(1000, 440, "AADL extension — runtime families and correspondence",
            "Process, thread and virtual processor as typed software components; correspondence rules map MEMO to AADL")
    S = "software"
    C = PALETTE[S][0]
    vp = f.frame(40, 90, 470, 300, "AadlVirtualProcessor  safetyPartition", cat=S)
    f.text(60, 128, "partitionBudget = 2 ms / 10 ms   ·   isolationMechanism = MPU", size=11, color=MUTED, anchor="start", mono=True)
    proc = f.frame(70, 150, 410, 200, "AadlProcess  monitorProcess", cat=S, dash="6 4")
    f.text(90, 186, "addressSpaceIsolated = true", size=11, color=MUTED, anchor="start", mono=True)
    t1 = f.block(100, 220, 160, 90, "checkFlow", "AadlThread", cat=S, attrs=None)
    t2 = f.block(290, 220, 160, 90, "watchdog", "AadlThread", cat=S)
    f.text(180, 300, "period 20 ms", size=10.5, color=MUTED)
    f.text(370, 300, "period 100 ms", size=10.5, color=MUTED)
    # correspondence table
    rows = [("AadlProcess", "process"), ("AadlThread", "thread"), ("AadlVirtualProcessor", "virtual processor"),
            ("ProcessingNode", "processor"), ("MemoryDevice", "memory"), ("NetworkMedium", "bus"), ("System", "system")]
    x0, y0 = 560, 110
    f.rect(x0, y0, 400, 30, fill=PALETTE[E][1], stroke=PALETTE[E][0], sw=1, rx=4)
    f.text(x0 + 100, y0 + 15, "MEMO kind", size=12, weight=700)
    f.text(x0 + 300, y0 + 15, "AADL category", size=12, weight=700)
    for i, (m, a) in enumerate(rows):
        y = y0 + 30 + i * 36
        f.rect(x0, y, 400, 36, fill="#ffffff" if i % 2 else "#f8fafc", stroke="#e4e7eb", sw=1, rx=0)
        f.text(x0 + 100, y + 18, m, size=11.5, mono=True)
        f.text(x0 + 200, y + 18, "↔", size=13, color=MUTED)
        f.text(x0 + 300, y + 18, a, size=11.5)
    f.text(x0 + 200, y0 + 30 + 7 * 36 + 18, "each row is a CorrespondenceRule (ISO/IEC/IEEE 42010)", size=11, color=MUTED, italic=True)
    f.callout(40, 90, 1)
    f.callout(70, 150, 2)
    f.callout(100, 220, 3)
    f.callout(560, 110, 4)
    return f


@fig("ext-cloud-container")
def cloud_container():
    f = Fig(1000, 440, "Cloud and container extensions",
            "Networked services and managed stores for SaMD; OCI images and runtimes that reuse base deployment relations")
    S, D = "software", "deployment"
    C = PALETTE["cyber"][0]
    f.rect(330, 90, 640, 200, fill=PALETTE["cyber"][2], stroke=C, sw=1.2, rx=12, dash="7 5")
    f.text(958, 106, "«TrustBoundary»  manufacturer cloud", size=11, color=C, anchor="end", italic=True)
    app = f.block(40, 140, 200, 80, "mobileApp", "SoftwareComponent", cat=S)
    svc = f.block(370, 130, 240, 120, "readingService", "CloudService", cat=S,
                  attrs=["serviceContract = HTTPS/JSON", "discovery = DNS"])
    db = f.block(680, 130, 260, 120, "readingsStore", "CloudDataStore", cat=S,
                 attrs=["storageKind = timeSeries", "retentionPolicy = 10 years"])
    a1 = f.port(app, "right", 0.5, "out", S)
    s1 = f.port(svc, "left", 0.55, "in", S)
    s2 = f.port(svc, "right", 0.55, "out", S)
    d1 = f.port(db, "left", 0.55, "in", S)
    f.line([a1, (300, a1[1]), (300, s1[1]), s1], color=PALETTE[S][0], sw=2)
    f.line([s2, d1], color=PALETTE[S][0], sw=2)
    f.flow(285, a1[1], "readings", "right", S)
    f.flow(645, d1[1], "", "right", S)
    # container row
    mod = f.block(40, 330, 180, 64, "readingApi", "SoftwareModule", cat=S)
    img = f.block(330, 330, 230, 80, "readingImage", "ContainerImage", cat=D,
                  attrs=["digest = sha256:…"])
    rt = f.block(700, 330, 260, 80, "k8sCluster", "ContainerRuntime", cat=D,
                 attrs=["orchestrationPlatform = Kubernetes"])
    f.line([mod.right(), img.left(0.4)], color=INK, dash="6 4", end="open", label="BuildsInto", at=0.5, label_size=10.5, label_italic=True)
    f.line([img.right(0.4), rt.left(0.4)], color=INK, dash="6 4", end="open", label="DeploysTo", at=0.5, label_size=10.5, label_italic=True)
    f.callout(370, 130, 1)
    f.callout(680, 130, 2)
    f.callout(330, 330, 3)
    f.callout(700, 330, 4)
    return f


@fig("ext-clinical-anatomy")
def clinical_anatomy():
    f = Fig(1000, 470, "Clinical and anatomy extensions",
            "A clinical procedure workflow whose steps target generated anatomy parts")
    O = "operational"
    C = PALETTE[O][0]
    wf = f.frame(24, 70, 560, 370, "ClinicalProcedureWorkflow  rouxEnYGastricBypass", cat=O)
    f.text(44, 108, "procedureCode = SNOMED 442338001  ·  anesthesia = general", size=11, color=MUTED, anchor="start", mono=True)
    lanes = ["Surgeon", "Anesthetist"]
    for i, l in enumerate(lanes):
        f.rect(44, 126 + i * 150, 520, 146, fill="#ffffff", stroke=FAINT, sw=1, rx=4)
        f.text(56, 140 + i * 150, l, size=11.5, weight=700, color=MUTED, anchor="start")
    a1 = f.action(80, 170, 140, 48, "Create gastric pouch", O)
    a2 = f.action(250, 170, 140, 48, "Divide jejunum", O)
    a3 = f.action(420, 170, 130, 48, "Anastomose", O)
    a0 = f.action(80, 320, 140, 48, "Induce anesthesia", O)
    f.line([a0.top(), a1.bottom()], color=INK, end="arrow")
    f.line([a1.right(), a2.left()], color=INK, end="arrow")
    f.line([a2.right(), a3.left()], color=INK, end="arrow")
    f.text(310, 330, "OperativeActions carry targets,\ntechnique, resources, duration", size=11, color=MUTED, italic=True)
    # anatomy tree
    x = 640
    f.text(x, 96, "generated anatomy package", size=12, weight=700, color=PALETTE[E][0], anchor="start")
    tree = [(0, "AnatomyEntity"), (1, "Alimentary system"), (2, "Stomach"), (3, "Fundus"), (3, "Body of stomach"),
            (2, "Small intestine"), (3, "Duodenum"), (3, "Jejunum")]
    ys = {}
    for i, (lvl, name) in enumerate(tree):
        y = 128 + i * 34
        b = f.chip(x + lvl * 24, y, name, cat=E if lvl else "neutral", size=11)
        ys[name] = (b.r, y, b.x)
    for name in ("Stomach", "Jejunum"):
        r, y, xx = ys[name]
    f.line([a1.top(), (a1.cx, 150), (600, 150), (600, ys["Stomach"][1]), (ys["Stomach"][2] - 4, ys["Stomach"][1])],
           color=PALETTE[E][0], dash="5 4", end="open", label="targets", at=0.3, label_size=10.5)
    f.line([(a2.cx, a2.b), (a2.cx, 240), (610, 240), (610, ys["Jejunum"][1]), (ys["Jejunum"][2] - 4, ys["Jejunum"][1])],
           color=PALETTE[E][0], dash="5 4", end="open")
    sel = f.block(640, 400, 330, 56, "upperGi :> upperGastrointestinal", "AnatomySelector", cat=E, soft=True, name_size=12)
    f.callout(24, 70, 1)
    f.callout(80, 170, 2)
    f.callout(626, 110, 3)
    f.callout(640, 400, 4)
    return f
