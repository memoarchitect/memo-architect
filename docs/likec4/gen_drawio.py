#!/usr/bin/env python3
"""
Generate draw.io XML for the MEMO Ontology Architecture.
Produces one large page with all packages, layers, and kinds.
No overlapping — computed grid layout throughout.
"""
from math import ceil

# ─── Layout constants ─────────────────────────────────────────────────────────
KW, KH       = 164, 22        # kind cell width / height
KGX, KGY     = 8,   5         # kind gap x / y
LP           = 10             # layer padding (all sides)
LH           = 24             # layer header height
PH           = 36             # package header height
PP           = 14             # package inner padding
LGAP         = 14             # gap between layers inside a package
PGAP         = 26             # gap between packages

def lw(cols):
    return LP*2 + cols*KW + (cols-1)*KGX

def lh(n, cols):
    r = ceil(n / cols) if n else 1
    return LH + LP + r*KH + max(0, r-1)*KGY + LP

# ─── Kind coordinate within a layer (relative to layer top-left) ──────────────
def kind_xy(i, cols):
    c, r = i % cols, i // cols
    x = LP + c*(KW+KGX)
    y = LH + LP + r*(KH+KGY)
    return x, y

# ─── Ontology data ─────────────────────────────────────────────────────────────
# Tuple: (layer_id, label, cols, [kinds], fill_hex, stroke_hex)
CORE_LAYERS = [
    # Row 1
    ('purpose','Purpose',4,
     ['Program','Actor','Stakeholder','Goal','Concern','Capability'],
     '#EBF5FB','#5DADE2'),
    ('operational','Operational',4,
     ['OperationalActor','OperationalEntity','OperationalEnvironment','Resource',
      'OperationalActivity','Operation','Procedure'],
     '#F5EEF8','#8E44AD'),
    ('requirements','Requirements',4,
     ['Requirement','StakeholderNeed','SystemRequirement','FunctionalRequirement',
      'TechnicalRequirement','InterfaceRequirement','Specification'],
     '#FDECEA','#E53935'),
    ('functional','Functional',4,
     ['Function','MissionFunction','SystemFunction','ComponentFunction','Scenario','UseCase'],
     '#FEF9E7','#F4A623'),
    ('logical','Logical',4,
     ['System','Subsystem','LogicalComponent','ArchitectureDecision','QualityAttribute'],
     '#E8F8F5','#1ABC9C'),
    # Row 2
    ('physical','Physical',4,
     ['PhysicalComponent','ElectricalComponent','MechanicalComponent'],
     '#E9F7EF','#27AE60'),
    ('software','Software',4,
     ['Software','SoftwareComponent','SoftwareModule','SoftwareLayer','Firmware'],
     '#E8F4FD','#2980B9'),
    ('interfaces','Interfaces',4,
     ['Port','DataEndpoint','Interface','DataInterface',
      'InterfaceContract','ExchangeItem','Message','DataType'],
     '#E0F7FA','#00897B'),
    ('analysis','Analysis',4,
     ['Constraint','Assumption','Measure'],
     '#FEF5E7','#E67E22'),
    ('verification','Verification',4,
     ['Test','VerificationCase','ValidationCase','Evidence'],
     '#EAFAF1','#1E8449'),
]

QMS_LAYERS = [
    ('qms','QMS (ISO 13485)',3,
     ['QMSRecord','QMSProcess','QMSProcedure','ComplianceEvidence',
      'RegulatoryRequirement','CEMark','FDAClearance'],
     '#EFF9EE','#2D9B5A'),
    ('design-control','Design Control',3,
     ['DesignAndDevelopmentPlan','DesignInput','DesignOutput','DesignReview',
      'DesignVerification','DesignValidation','DesignTransfer','DesignChange','DHFArtifact'],
     '#F4ECF7','#7D3C98'),
]

MEDICAL_LAYERS = [
    ('design-control','Design Control (IEC 62366)',3,
     ['IntendedUse','UseError','UserInterfaceRequirement','UseSpecification',
      'UseErrorAnalysis','UsabilitySpecification','FormativeEvaluation','SummativeEvaluation'],
     '#F4ECF7','#7D3C98'),
    ('risk','Risk (ISO 14971)',3,
     ['Hazard','HazardousSituation','Harm','Risk','RiskControl',
      'SequenceOfEvents','ClinicalBenefit','BenefitRiskAssessment',
      'RiskManagementPlan','RiskManagementReport','ResidualRiskEvaluation',
      'ProductionPostProductionSignal'],
     '#FDEDEC','#C0392B'),
    ('risk-analysis','Risk Analysis (FMEA/FTA)',3,
     ['FailureModesAndEffectsAnalysis','FaultTreeAnalysis','FailureMode',
      'FailureCause','FailureEffect','TopEvent','FaultTreeContributor','FaultTreeGate'],
     '#FDECEA','#A93226'),
    ('safety','Safety (IEC 60601)',3,
     ['SafetyGoal','EssentialPerformance','BasicSafety','PrimaryOperatingFunction',
      'SafetyFunction','ProtectiveMeasure','CollateralStandardRequirement',
      'ParticularStandardRequirement','EssentialPerformanceLossCondition'],
     '#FEF9E7','#D68910'),
    ('operations','Operations & Service',3,
     ['UserNeed','SoftwareRequirement','HardwareRequirement','UserActivity',
      'Component','ManufacturingProcedure','ServiceProcedure',
      'ManufacturingRecord','ServiceReport','CalibrationRecord'],
     '#E8F8F5','#148F77'),
    ('ui','UI (IEC 62366)',3,
     ['UIFunction','UIElement','UIScreen','UIPanel'],
     '#FDF2F8','#AF7AC5'),
]

IEC_LAYERS = [
    ('software-lifecycle','Software Lifecycle (IEC 62304)',3,
     ['SoftwareSystem','SoftwareItem','SoftwareUnit','SOUPItem',
      'SoftwareAnomaly','SoftwareLifecycleProcess','SoftwareLifecycleActivity',
      'SoftwareWorkProduct','SoftwareDevelopmentPlan','SOUPEvaluation',
      'SoftwareProblemReport','ChangeImpactAssessment'],
     '#EDE7F6','#7B1FA2'),
]

CYBER_LAYERS = [
    ('cybersecurity','Cybersecurity (IEC 81001-5-1)',3,
     ['CybersecurityRequirement','AuthenticationRequirement','AuthorizationRequirement',
      'AuditLogRequirement','CyberAsset','ThreatModel','ThreatScenario','Vulnerability',
      'SecurityControl','SBOMArtifact','SecureUpdateCapability','PenetrationTestReport'],
     '#FFEBEE','#C62828'),
    ('privacy','Privacy (GDPR/MDR)',3,
     ['PersonalDataCategory','DataProcessingActivity','DataSubjectRequest',
      'PrivacyImpactAssessment','PrivacyNotice','DataRetentionPolicy','DataBreachRecord'],
     '#EDE7F6','#4527A0'),
]

ROS_LAYERS = [
    ('middleware','Middleware (ROS 2)',4,
     ['RosNode','RosNodelet','RosPackage','RosMessageSchema',
      'RosTopic','RosService','RosAction','RosPublication',
      'RosSubscription','RosServiceCall','RosServiceServer','RosActionClient',
      'RosActionServer','RosMessage','RosEventMessage','RosStateMessage',
      'RosCommandMessage','RosRequest','RosResponse','RosActionGoal',
      'RosActionResult','RosActionFeedback','RosMessageField'],
     '#E1F5FE','#0277BD'),
]

# ─── Package configs (fill, stroke, font_color) ─────────────────────────────
PKG_STYLE = {
    'core':    ('#DAE8FC','#6C8EBF','#1B3A4B'),
    'qms':     ('#D5E8D4','#82B366','#1B3A4B'),
    'medical': ('#FFE6CC','#D6B656','#1B3A4B'),
    'iec':     ('#E1D5E7','#9673A6','#1B3A4B'),
    'cyber':   ('#F8CECC','#B85450','#1B3A4B'),
    'ros':     ('#DAF5FF','#007CBE','#1B3A4B'),
}

# ─── Compute CORE package dimensions ─────────────────────────────────────────
CORE_LAYER_W = lw(4)   # 4 cols → 10+4*164+3*8+10 = 20+656+24 = 700
CORE_LAYER_H = lh(8, 4)  # worst case 8 kinds → 2 rows → 24+10+2*22+5+10 = 93; use uniform 93
# Force uniform height for visual consistency
CORE_LH = max(lh(n, 4) for _, _, _, kinds, _, _ in CORE_LAYERS for n in [len(kinds)])

CORE_W = PP + 5*(CORE_LAYER_W + LGAP) - LGAP + PP
# Row 1 y (relative to pkg top): PH + PP
# Row 2 y: PH + PP + CORE_LH + LGAP
CORE_H = PH + PP + CORE_LH + LGAP + CORE_LH + PP

# Layer x positions in core (relative to core left, 5 per row)
core_lx = [PP + i*(CORE_LAYER_W + LGAP) for i in range(5)]
core_ly = [PH + PP, PH + PP + CORE_LH + LGAP]

# ─── Compute child package dimensions ────────────────────────────────────────
CHILD_LW = lw(3)   # 3 cols → 10+3*164+2*8+10 = 20+492+16 = 528
# Compute per-layer heights
def pkg_dims_2col(layers):
    """2-column layout, layers go left-right then down in pairs."""
    max_per_row_h = []
    for i in range(0, len(layers), 2):
        pair = layers[i:i+2]
        h = max(lh(len(l[3]), l[2]) for l in pair)
        max_per_row_h.append(h)
    rows = len(max_per_row_h)
    w = PP + 2*(CHILD_LW + LGAP) - LGAP + PP
    h = PH + PP + sum(max_per_row_h) + max(0, rows-1)*LGAP + PP
    return w, h, max_per_row_h

def pkg_dims_1col(layers):
    """Single column (one layer, or stacked)."""
    cols = layers[0][2]
    lw_ = lw(cols)
    total_h = sum(lh(len(l[3]), l[2]) for l in layers)
    n = len(layers)
    return (PP + lw_ + PP,
            PH + PP + total_h + max(0, n-1)*LGAP + PP,
            [lh(len(l[3]), l[2]) for l in layers])

# QMS: 2 layers side by side
QMS_W, QMS_H, QMS_ROW_H = pkg_dims_2col(QMS_LAYERS)
# IEC: 1 layer
IEC_LW = lw(3)
IEC_LH = lh(len(IEC_LAYERS[0][3]), 3)
IEC_W = PP + IEC_LW + PP
IEC_H = PH + PP + IEC_LH + PP
# CYBER: 2 layers side by side
CYBER_W, CYBER_H, CYBER_ROW_H = pkg_dims_2col(CYBER_LAYERS)
# ROS: 1 layer (4 cols, wide)
ROS_LW = lw(4)
ROS_LH = lh(len(ROS_LAYERS[0][3]), 4)
ROS_W = PP + ROS_LW + PP
ROS_H = PH + PP + ROS_LH + PP
# MEDICAL: 2-col, 3 rows (6 layers)
MED_W, MED_H, MED_ROW_H = pkg_dims_2col(MEDICAL_LAYERS)

# ─── Package positions ────────────────────────────────────────────────────────
START_X, START_Y = 40, 40

# CORE at top, spanning full width
# Make core width match total width of middle row + spacing
MID_TOTAL_W = QMS_W + PGAP + IEC_W + PGAP + CYBER_W + PGAP + ROS_W
CORE_W_FINAL = MID_TOTAL_W
# Recalculate core layer width to fill
# 5 layers per row with LGAP between, PP on each side
CORE_LW_FINAL = (CORE_W_FINAL - 2*PP - 4*LGAP) // 5
CORE_H_FINAL  = PH + PP + CORE_LH + LGAP + CORE_LH + PP
core_lx_final = [PP + i*(CORE_LW_FINAL + LGAP) for i in range(5)]

PKG_POS = {}
PKG_POS['core']    = (START_X, START_Y, CORE_W_FINAL, CORE_H_FINAL)
mid_y              = START_Y + CORE_H_FINAL + PGAP
PKG_POS['qms']     = (START_X, mid_y, QMS_W, QMS_H)
PKG_POS['iec']     = (START_X + QMS_W + PGAP, mid_y, IEC_W, IEC_H)
PKG_POS['cyber']   = (START_X + QMS_W + PGAP + IEC_W + PGAP, mid_y, CYBER_W, CYBER_H)
PKG_POS['ros']     = (START_X + QMS_W + PGAP + IEC_W + PGAP + CYBER_W + PGAP, mid_y, ROS_W, ROS_H)
bot_y              = mid_y + max(QMS_H, IEC_H, CYBER_H, ROS_H) + PGAP
PKG_POS['medical'] = (START_X, bot_y, MED_W, MED_H)

# ─── ID management ───────────────────────────────────────────────────────────
_id = [10]
def nid():
    _id[0] += 1
    return str(_id[0])

cells = []       # list of (id, dict_of_attrs, geometry_dict)
# id → absolute centre for arrow routing
centres = {}

def add_cell(cid, attrs, geo):
    cells.append((cid, attrs, geo))

def abs_centre(px, py, rx, ry, w, h, pkg_includes_header=False):
    """Absolute centre of a cell at relative pos (rx,ry) in package at (px,py)."""
    ax = px + rx + w/2
    ay = py + ry + h/2
    return ax, ay

# ─── Cell builders ───────────────────────────────────────────────────────────
def pkg_style(fill, stroke, fc):
    return (f'swimlane;fontStyle=1;fontSize=13;fillColor={fill};strokeColor={stroke};'
            f'fontColor={fc};startSize={PH};rounded=1;arcSize=3;'
            f'shadow=0;swimlaneLine=1;align=left;spacingLeft=8;')

def layer_style(fill, stroke):
    return (f'swimlane;fontSize=10;fillColor={fill};strokeColor={stroke};'
            f'fontColor=#333333;startSize={LH};rounded=1;arcSize=3;'
            f'swimlaneLine=1;fontStyle=1;')

def kind_style(stroke):
    return (f'rounded=1;whiteSpace=wrap;html=1;fontSize=9;fillColor=#FFFFFF;'
            f'strokeColor={stroke};fontColor=#1a1a1a;arcSize=20;shadow=0;')

def arr_style(color='#888888', dashed=0, w=1.5):
    return (f'endArrow=open;endFill=0;edgeStyle=orthogonalEdgeStyle;'
            f'strokeColor={color};strokeWidth={w};dashed={dashed};'
            f'exitX=0.5;exitY=0;exitDx=0;exitDy=0;'
            f'entryX=0.5;entryY=1;entryDx=0;entryDy=0;')

def pkg_arr_style():
    return ('endArrow=open;endFill=0;edgeStyle=elbowEdgeStyle;elbowStyle=orthogonal;'
            'strokeColor=#666666;strokeWidth=2.5;dashed=1;dashPattern=8 4;fontSize=9;')

# ─── Build CORE cells ────────────────────────────────────────────────────────
px, py, pw, ph = PKG_POS['core']
fill, stroke, fc = PKG_STYLE['core']
core_id = nid()
add_cell(core_id, {'value':'@memo/ontology-core','style':pkg_style(fill,stroke,fc),'vertex':'1','parent':'1'},
         {'x':px,'y':py,'width':pw,'height':ph})
centres['pkg_core'] = (px+pw/2, py+ph/2)

kind_ids = {}   # kind_name → cell_id (last occurrence wins for cross-pkg arrows; use pkg_layer_kind)
kind_ids_full = {}  # (pkg, layer, kind) → cell_id

for idx, (lid, llabel, cols, kinds, lfill, lstroke) in enumerate(CORE_LAYERS):
    row   = idx // 5
    col   = idx % 5
    lx_r  = core_lx_final[col]
    ly_r  = core_ly[row]
    lw_   = CORE_LW_FINAL
    lh_   = CORE_LH
    layer_id = nid()
    add_cell(layer_id,
             {'value':llabel,'style':layer_style(lfill,lstroke),'vertex':'1','parent':core_id},
             {'x':lx_r,'y':ly_r,'width':lw_,'height':lh_})
    abs_lx = px + lx_r
    abs_ly = py + ly_r
    for ki, kname in enumerate(kinds):
        kx, ky = kind_xy(ki, cols)
        # Scale kx proportionally for wider layers
        # For 4 cols: using same KW so x = LP + col*(KW+KGX)
        kid = nid()
        add_cell(kid,
                 {'value':kname,'style':kind_style(lstroke),'vertex':'1','parent':layer_id},
                 {'x':kx,'y':ky,'width':KW,'height':KH})
        abs_kx = abs_lx + kx
        abs_ky = abs_ly + ky
        centres[f'core_{lid}_{kname}'] = (abs_kx + KW/2, abs_ky + KH/2)
        kind_ids_full[('core', lid, kname)] = kid

# ─── Build other package cells ────────────────────────────────────────────────
def build_pkg(pkg_key, layers, x, y, w, h, layout='2col'):
    """Build a package and its layers/kinds."""
    fill, stroke, fc = PKG_STYLE[pkg_key]
    pid = nid()
    add_cell(pid,
             {'value': f'@memo/ontology-{pkg_key.replace("iec","iec62304").replace("cyber","cybersecurity").replace("ros","middleware-ros").replace("medical","medical").replace("qms","qms")}',
              'style': pkg_style(fill, stroke, fc), 'vertex':'1','parent':'1'},
             {'x':x,'y':y,'width':w,'height':h})
    centres[f'pkg_{pkg_key}'] = (x+w/2, y+h/2)

    if layout == '2col':
        for row_i, (i0, i1) in enumerate(zip(range(0,len(layers),2), range(1,len(layers)+1,2))):
            row_layers = layers[i0:min(i1+1, len(layers))]
            # compute row height = max of pair
            row_h = max(lh(len(l[3]), l[2]) for l in row_layers) if row_layers else 0
            prev_rows_h = sum(
                max(lh(len(ll[3]), ll[2]) for ll in layers[j:j+2])
                for j in range(0, i0, 2)
            ) + row_i * LGAP if row_i > 0 else 0
            ly_r = PH + PP + prev_rows_h
            for col_i, layer_data in enumerate(row_layers):
                lid, llabel, cols, kinds, lfill, lstroke = layer_data
                lx_r = PP + col_i * (CHILD_LW + LGAP)
                lh_  = lh(len(kinds), cols)
                layer_id = nid()
                add_cell(layer_id,
                         {'value':llabel,'style':layer_style(lfill,lstroke),'vertex':'1','parent':pid},
                         {'x':lx_r,'y':ly_r,'width':CHILD_LW,'height':lh_})
                abs_lx = x + lx_r
                abs_ly = y + ly_r
                for ki, kname in enumerate(kinds):
                    kx, ky = kind_xy(ki, cols)
                    kid = nid()
                    add_cell(kid,
                             {'value':kname,'style':kind_style(lstroke),'vertex':'1','parent':layer_id},
                             {'x':kx,'y':ky,'width':KW,'height':KH})
                    centres[f'{pkg_key}_{lid}_{kname}'] = (abs_lx+kx+KW/2, abs_ly+ky+KH/2)
                    kind_ids_full[(pkg_key, lid, kname)] = kid
    elif layout == '1col':
        cum_y = PH + PP
        for lid, llabel, cols, kinds, lfill, lstroke in layers:
            lw_ = lw(cols)
            lh_ = lh(len(kinds), cols)
            layer_id = nid()
            add_cell(layer_id,
                     {'value':llabel,'style':layer_style(lfill,lstroke),'vertex':'1','parent':pid},
                     {'x':PP,'y':cum_y,'width':lw_,'height':lh_})
            abs_lx = x + PP
            abs_ly = y + cum_y
            for ki, kname in enumerate(kinds):
                kx, ky = kind_xy(ki, cols)
                kid = nid()
                add_cell(kid,
                         {'value':kname,'style':kind_style(lstroke),'vertex':'1','parent':layer_id},
                         {'x':kx,'y':ky,'width':KW,'height':KH})
                centres[f'{pkg_key}_{lid}_{kname}'] = (abs_lx+kx+KW/2, abs_ly+ky+KH/2)
                kind_ids_full[(pkg_key, lid, kname)] = kid
            cum_y += lh_ + LGAP
    return pid

# Correct package labels
PKG_LABELS = {
    'qms':     '@memo/ontology-qms',
    'iec':     '@memo/ontology-iec62304',
    'cyber':   '@memo/ontology-cybersecurity',
    'ros':     '@memo/ontology-middleware-ros',
    'medical': '@memo/ontology-medical',
}

def build_pkg2(pkg_key, label, layers, layout='2col'):
    x, y, w, h = PKG_POS[pkg_key]
    fill, stroke, fc = PKG_STYLE[pkg_key]
    pid = nid()
    add_cell(pid,
             {'value': label, 'style': pkg_style(fill, stroke, fc), 'vertex':'1','parent':'1'},
             {'x':x,'y':y,'width':w,'height':h})
    centres[f'pkg_{pkg_key}'] = (x+w/2, y+h/2)

    if layout == '2col':
        row_i = 0
        cum_y = PH + PP
        i = 0
        while i < len(layers):
            pair = layers[i:i+2]
            row_h = max(lh(len(l[3]), l[2]) for l in pair)
            for col_i, layer_data in enumerate(pair):
                lid, llabel, cols, kinds, lfill, lstroke = layer_data
                lx_r = PP + col_i * (CHILD_LW + LGAP)
                lh_  = lh(len(kinds), cols)
                layer_id = nid()
                add_cell(layer_id,
                         {'value':llabel,'style':layer_style(lfill,lstroke),'vertex':'1','parent':pid},
                         {'x':lx_r,'y':cum_y,'width':CHILD_LW,'height':lh_})
                abs_lx = x + lx_r
                abs_ly = y + cum_y
                for ki, kname in enumerate(kinds):
                    kx, ky = kind_xy(ki, cols)
                    kid = nid()
                    add_cell(kid,
                             {'value':kname,'style':kind_style(lstroke),'vertex':'1','parent':layer_id},
                             {'x':kx,'y':ky,'width':KW,'height':KH})
                    centres[f'{pkg_key}_{lid}_{kname}'] = (abs_lx+kx+KW/2, abs_ly+ky+KH/2)
                    kind_ids_full[(pkg_key, lid, kname)] = kid
            cum_y += row_h + LGAP
            i += 2
    elif layout == '1col':
        cum_y = PH + PP
        for lid, llabel, cols, kinds, lfill, lstroke in layers:
            lw_ = lw(cols)
            lh_ = lh(len(kinds), cols)
            layer_id = nid()
            add_cell(layer_id,
                     {'value':llabel,'style':layer_style(lfill,lstroke),'vertex':'1','parent':pid},
                     {'x':PP,'y':cum_y,'width':lw_,'height':lh_})
            abs_lx = x + PP
            abs_ly = y + cum_y
            for ki, kname in enumerate(kinds):
                kx, ky = kind_xy(ki, cols)
                kid = nid()
                add_cell(kid,
                         {'value':kname,'style':kind_style(lstroke),'vertex':'1','parent':layer_id},
                         {'x':kx,'y':ky,'width':KW,'height':KH})
                centres[f'{pkg_key}_{lid}_{kname}'] = (abs_lx+kx+KW/2, abs_ly+ky+KH/2)
                kind_ids_full[(pkg_key, lid, kname)] = kid
            cum_y += lh_ + LGAP
    return pid

qms_pid     = build_pkg2('qms',     '@memo/ontology-qms',             QMS_LAYERS,     '2col')
iec_pid     = build_pkg2('iec',     '@memo/ontology-iec62304',         IEC_LAYERS,     '1col')
cyber_pid   = build_pkg2('cyber',   '@memo/ontology-cybersecurity',    CYBER_LAYERS,   '2col')
ros_pid     = build_pkg2('ros',     '@memo/ontology-middleware-ros',   ROS_LAYERS,     '1col')
medical_pid = build_pkg2('medical', '@memo/ontology-medical',          MEDICAL_LAYERS, '2col')

# ─── Cross-package inheritance arrows ────────────────────────────────────────
# (src_pkg, src_layer, src_kind) → (dst_pkg, dst_layer, dst_kind), label
INHERIT_ARROWS = [
    # core → iec62304
    (('core','software','SoftwareModule'),  ('iec','software-lifecycle','SoftwareSystem'), 'extends'),
    (('core','software','SoftwareModule'),  ('iec','software-lifecycle','SoftwareItem'),   'extends'),
    (('core','software','SoftwareComponent'),('iec','software-lifecycle','SoftwareUnit'), 'extends'),
    (('core','software','SoftwareModule'),  ('iec','software-lifecycle','SOUPItem'),       'extends'),
    # core → ros
    (('core','software','SoftwareComponent'),('ros','middleware','RosNode'),     'extends'),
    (('core','software','SoftwareComponent'),('ros','middleware','RosNodelet'),  'extends'),
    (('core','software','SoftwareModule'),   ('ros','middleware','RosPackage'),  'extends'),
    # core → cyber
    (('core','requirements','TechnicalRequirement'),('cyber','cybersecurity','CybersecurityRequirement'),'extends'),
    (('core','requirements','Requirement'),          ('cyber','cybersecurity','CybersecurityRequirement'),'via TechnicalReq'),
    # qms → medical
    (('qms','design-control','DesignValidation'),('medical','design-control','FormativeEvaluation'),'extends'),
    (('qms','design-control','DesignValidation'),('medical','design-control','SummativeEvaluation'),'extends'),
    (('qms','qms','RegulatoryRequirement'),       ('medical','design-control','IntendedUse'),       'extends'),
    (('qms','qms','QMSRecord'),                   ('medical','design-control','UseSpecification'),  'extends'),
    (('qms','qms','QMSRecord'),                   ('medical','risk','RiskManagementPlan'),          'extends'),
    (('qms','qms','ComplianceEvidence'),          ('medical','risk','ProductionPostProductionSignal'),'extends'),
    # medical → cyber (cross, RiskControl ← SecurityControl)
    (('medical','risk','RiskControl'),            ('cyber','cybersecurity','SecurityControl'),       'extends'),
]

# Package extends arrows (pkg-level, drawn between package containers)
PKG_EXTENDS = [
    ('qms',     'core',    'extends @memo/ontology-core'),
    ('iec',     'core',    'extends @memo/ontology-core'),
    ('cyber',   'core',    'extends @memo/ontology-core'),
    ('ros',     'core',    'extends @memo/ontology-core'),
    ('medical', 'qms',     'extends @memo/ontology-qms'),
]

# Package IDs mapping
pkg_cell_map = {
    'core': core_id, 'qms': qms_pid, 'iec': iec_pid,
    'cyber': cyber_pid, 'ros': ros_pid, 'medical': medical_pid,
}

# Add package extends arrows
for src_pkg, dst_pkg, label in PKG_EXTENDS:
    aid = nid()
    cells.append((aid, {
        'value': label,
        'style': (f'endArrow=open;endFill=0;edgeStyle=orthogonalEdgeStyle;'
                  f'strokeColor=#666666;strokeWidth=2;dashed=1;dashPattern=6 3;'
                  f'fontSize=8;fontColor=#555555;fontStyle=2;'
                  f'exitX=0.5;exitY=0;exitDx=0;exitDy=0;'
                  f'entryX=0.5;entryY=1;entryDx=0;entryDy=0;'),
        'edge': '1', 'parent': '1',
        'source': pkg_cell_map[src_pkg],
        'target': pkg_cell_map[dst_pkg],
    }, None))

# Add cross-kind inheritance arrows
for (sp, sl, sk), (dp, dl, dk), label in INHERIT_ARROWS:
    src_cid = kind_ids_full.get((sp, sl, sk))
    dst_cid = kind_ids_full.get((dp, dl, dk))
    if src_cid and dst_cid:
        aid = nid()
        cells.append((aid, {
            'value': label,
            'style': (f'endArrow=open;endFill=0;edgeStyle=orthogonalEdgeStyle;'
                      f'strokeColor=#9E9E9E;strokeWidth=1.2;dashed=1;dashPattern=4 3;'
                      f'fontSize=7;fontColor=#888888;fontStyle=2;'),
            'edge': '1', 'parent': '1',
            'source': src_cid,
            'target': dst_cid,
        }, None))

# ─── Generate XML ─────────────────────────────────────────────────────────────
# Compute canvas size
all_x = [PKG_POS[k][0] + PKG_POS[k][2] for k in PKG_POS]
all_y = [PKG_POS[k][1] + PKG_POS[k][3] for k in PKG_POS]
canvas_w = max(all_x) + 60
canvas_h = max(all_y) + 60

lines = []
lines.append('<?xml version="1.0" encoding="UTF-8"?>')
lines.append(f'<mxGraphModel dx="1422" dy="762" grid="1" gridSize="4" guides="1" '
             f'tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" '
             f'pageWidth="{canvas_w}" pageHeight="{canvas_h}" math="0" shadow="0">')
lines.append('  <root>')
lines.append('    <mxCell id="0" />')
lines.append('    <mxCell id="1" parent="0" />')

def xe(s):
    return str(s).replace('&','&amp;').replace('"','&quot;').replace('<','&lt;').replace('>','&gt;')

for cid_str, attrs, geo in cells:
    # Hoist structural attrs; rest go into extra_str
    HOIST = ('vertex', 'edge', 'parent', 'source', 'target')
    extra = {k: v for k, v in attrs.items() if k not in HOIST}
    extra_str = ' '.join(f'{k}="{xe(v)}"' for k, v in extra.items())
    parent = attrs.get('parent', '1')
    if geo is None:
        is_edge = attrs.get('edge') == '1'
        src = attrs.get('source', '')
        tgt = attrs.get('target', '')
        src_tgt = f' source="{src}" target="{tgt}"' if src or tgt else ''
        lines.append(f'    <mxCell id="{cid_str}" parent="{parent}"{src_tgt} edge="1" {extra_str}>')
        lines.append(f'      <mxGeometry relative="1" as="geometry" />')
        lines.append(f'    </mxCell>')
    else:
        lines.append(f'    <mxCell id="{cid_str}" parent="{parent}" vertex="1" {extra_str}>')
        lines.append(f'      <mxGeometry x="{int(geo["x"])}" y="{int(geo["y"])}" '
                     f'width="{int(geo["width"])}" height="{int(geo["height"])}" as="geometry" />')
        lines.append(f'    </mxCell>')

lines.append('  </root>')
lines.append('</mxGraphModel>')

xml_out = '\n'.join(lines)
out_path = '/Users/someshkashyap/sandbox/memo/docs/likec4/memo-ontology-architecture.drawio'
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(xml_out)

print(f"Generated: {out_path}")
print(f"Canvas:    {canvas_w} × {canvas_h} px")
print(f"Done. {len(cells)} cells written to {out_path}")
