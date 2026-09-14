import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModelStore } from '../store/model-store';
import { LAYER_COLORS, LAYER_LABELS } from '../constants';
import type { MemoModelDTO, DashboardScope } from '@memoarchitect/tools/browser';
import { DashboardPage } from './DashboardPage';
import { HOME_DASHBOARD_ID, viewpointDashboardId } from '../dashboard/dashboards';

// ─── Dashboard — Home View (#36 + #131) ────────────────────────────────────
//
// Default landing view shown after the model loads. The page itself is a
// markdown dashboard (id `home`) — built-in unless the project or the user has
// customized it — and the sections below are its widgets:
//
//   {{widget:header}}      project name and date
//   {{widget:stats}}       headline stat cards (elements, relationships, …)
//   {{widget:coverage}}    CoSMA coverage tiles (risk / requirements / …)
//   {{widget:next-action}} NextActionPanel (#131)
//   {{widget:next-steps}}  NextActionPanel beside the quick-action buttons
//   {{widget:viewpoint-dashboards}}  a link to every viewpoint's dashboard
//   {{widget:diagrams}}    model view count
//
// Any dashboard or document can use them. See plans/memo-custom-dashboards.md.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Stats computation ───────────────────────────────────────────────────────

interface DashboardStats {
    totalElements: number;
    totalRelationships: number;
    violations: number;
    completenessPercent: number;
    // Layer counts
    riskCount: number;
    requirementsCount: number;
    architectureCount: number;
    verificationCount: number;
    // Specific kind counts for NextAction
    hazardCount: number;
    requirementCount: number;
    riskControlCount: number;
    systemCount: number;
    testCount: number;
    mitigatesCount: number;
    verificationLinkCount: number;
    // Diagrams
    diagramCount: number;
    // Project name
    projectName: string;
}

function computeDashboardStats(model: MemoModelDTO, violations: number, completenessPercent: number): DashboardStats {
    const elements = Object.values(model.elements);

    const layerCounts: Record<string, number> = {};
    const kindLower: Record<string, number> = {};
    for (const el of elements) {
        layerCounts[el.layer] = (layerCounts[el.layer] || 0) + 1;
        kindLower[el.kind.toLowerCase()] = (kindLower[el.kind.toLowerCase()] || 0) + 1;
    }

    const relTypeCounts: Record<string, number> = {};
    for (const rel of model.relationships) {
        relTypeCounts[rel.type.toLowerCase()] = (relTypeCounts[rel.type.toLowerCase()] || 0) + 1;
    }

    return {
        totalElements: elements.length,
        totalRelationships: model.relationships.length,
        violations,
        completenessPercent,
        riskCount: (layerCounts['risk'] || 0) + (layerCounts['analysis'] || 0),
        requirementsCount: layerCounts['requirements'] || 0,
        // Architecture spans both the legacy Apollo-11 layer names and the
        // memo ontology layer directories (src/architecture/<layer>/)
        architectureCount: [
            'logical', 'physical', 'functional',
            'logical_structure', 'software_structure', 'hardware_structure',
            'functions', 'interfaces', 'system', 'context', 'operational', 'behavior',
        ].reduce((sum, l) => sum + (layerCounts[l] || 0), 0),
        verificationCount: (layerCounts['verification'] || 0) + (layerCounts['assurance'] || 0),
        hazardCount: kindLower['hazard'] || 0,
        // All ontology requirement defs: Requirement (requirementType:
        // system/software/hardware/…), SecurityRequirement
        requirementCount: Object.entries(kindLower)
            .filter(([k]) => k.endsWith('requirement'))
            .reduce((sum, [, n]) => sum + n, 0),
        riskControlCount: kindLower['riskcontrol'] || 0,
        systemCount: (kindLower['system'] || 0) + (kindLower['subsystem'] || 0)
            + (kindLower['softwaresystem'] || 0) + (kindLower['logicalcomponent'] || 0)
            + (kindLower['hardwareassembly'] || 0) + (kindLower['softwarecomponent'] || 0)
            + (kindLower['processingnode'] || 0),
        // Ontology verification kinds (VerificationCase, ValidationCase,
        // TestArtifact) plus the legacy "Test" kind
        testCount: (kindLower['verificationcase'] || 0) + (kindLower['validationcase'] || 0)
            + (kindLower['testartifact'] || 0) + (kindLower['test'] || 0),
        // Relationship names vary between legacy ("mitigates") and ontology
        // ("MitigatesHazard", "MitigatedByControl") conventions
        mitigatesCount: Object.entries(relTypeCounts)
            .filter(([t]) => t.startsWith('mitigat'))
            .reduce((sum, [, n]) => sum + n, 0),
        // Verification traceability: VerifiedBy, Validates, TestedByUsability
        // (ontology) or legacy "verifies"
        verificationLinkCount: Object.entries(relTypeCounts)
            .filter(([t]) => t.startsWith('verif') || t.startsWith('validate') || t === 'testedbyusability')
            .reduce((sum, [, n]) => sum + n, 0),
        diagramCount: model.diagrams?.length ?? 0,
        projectName: model.metadata?.projectName || (model as any).projectName || (model as any).name || 'My Device Project',
    };
}

// ─── Next-action logic (#131) ─────────────────────────────────────────────────

interface NextAction {
    icon: string;
    title: string;
    description: string;
    urgency: 'high' | 'medium' | 'low';
}

function computeNextAction(stats: DashboardStats): NextAction {
    if (stats.totalElements === 0) {
        return {
            icon: '🚀',
            title: 'Add your first model elements',
            description: 'Start with intended use, actors, and a system requirement. Or use the Workflow Wizard to guide you step by step.',
            urgency: 'high',
        };
    }
    if (stats.requirementCount === 0) {
        return {
            icon: '📋',
            title: 'Define your first requirement',
            description: 'Your model has elements but no system requirements yet. Add a Requirement in the Model Explorer.',
            urgency: 'high',
        };
    }
    if (stats.hazardCount === 0) {
        return {
            icon: '⚠️',
            title: 'Add your first hazard',
            description: `You have ${stats.requirementCount} requirement(s) but no hazard analysis yet. ISO 14971 requires hazard identification early.`,
            urgency: 'high',
        };
    }
    if (stats.hazardCount > 0 && stats.mitigatesCount === 0) {
        return {
            icon: '🔗',
            title: 'Connect hazards to risk controls',
            description: `You have ${stats.hazardCount} hazard(s) but no MitigatesHazard relationships. Connect hazards to risk controls to complete the ISO 14971 chain.`,
            urgency: 'high',
        };
    }
    if (stats.systemCount === 0) {
        return {
            icon: '🏗️',
            title: 'Define your system architecture',
            description: 'No architecture components found (SoftwareSystem, LogicalComponent, HardwareAssembly, …). Add an architecture layer to ground your requirements and risk analysis.',
            urgency: 'medium',
        };
    }
    if (stats.testCount === 0) {
        return {
            icon: '🧪',
            title: 'Add verification tests',
            description: `${stats.requirementCount} requirement(s) have no verification tests yet. Add VerificationCases and link them to requirements with VerifiedBy.`,
            urgency: 'medium',
        };
    }
    if (stats.verificationLinkCount === 0 && stats.testCount > 0) {
        return {
            icon: '↔️',
            title: 'Link tests to requirements',
            description: 'Verification cases exist but no VerifiedBy links found. Open the Traceability Matrix to connect tests to their requirements.',
            urgency: 'medium',
        };
    }
    return {
        icon: '✅',
        title: 'Good coverage so far',
        description: `Requirements, hazards, and risk controls are in place. Check the GapBar (⌘⇧P) for completeness gaps before your review.`,
        urgency: 'low',
    };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, color, subtitle }: { label: string; value: number | string; color: string; subtitle?: string }) {
    return (
        <div style={{
            background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: '12px',
            padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '4px',
        }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{label}</div>
            {subtitle && <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{subtitle}</div>}
        </div>
    );
}

function CoverageTile({ layer, label, count, color, onClick }: {
    layer: string; label: string; count: number; color: string; onClick: () => void;
}) {
    const hasContent = count > 0;
    return (
        <button
            onClick={onClick}
            style={{
                background: hasContent ? `${color}12` : '#F9FAFB',
                border: `1px solid ${hasContent ? color + '30' : '#E5E5E0'}`,
                borderRadius: '12px', padding: '16px', cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.background = hasContent ? `${color}20` : '#F3F4F6';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.background = hasContent ? `${color}12` : '#F9FAFB';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: hasContent ? color : '#9CA3AF' }}>
                    {label}
                </span>
                <span style={{
                    fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                    background: hasContent ? color + '20' : '#F3F4F6',
                    color: hasContent ? color : '#9CA3AF',
                }}>
                    {count} elements
                </span>
            </div>
            <div style={{ width: '100%', height: '4px', background: '#F3F4F6', borderRadius: '2px' }}>
                <div style={{
                    height: '100%', borderRadius: '2px', background: hasContent ? color : 'transparent',
                    width: hasContent ? `${Math.min(100, (count / 10) * 100)}%` : '0',
                    transition: 'width 0.4s ease',
                }} />
            </div>
            <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '8px' }}>
                {hasContent ? 'Click to explore →' : 'Not started'}
            </div>
        </button>
    );
}

function QuickActionButton({ icon, label, onClick, variant = 'secondary' }: {
    icon: string; label: string; onClick: () => void; variant?: 'primary' | 'secondary';
}) {
    const isPrimary = variant === 'primary';
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px', borderRadius: '8px', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600, border: 'none',
                background: isPrimary ? '#1B3A4B' : 'rgba(255,255,255,0.7)',
                color: isPrimary ? '#FFFFFF' : '#374151',
                backdropFilter: 'blur(4px)',
                transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.background = isPrimary ? '#244D63' : 'rgba(255,255,255,0.95)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.background = isPrimary ? '#1B3A4B' : 'rgba(255,255,255,0.7)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            <span>{icon}</span>
            <span>{label}</span>
        </button>
    );
}

// ─── Widget data ─────────────────────────────────────────────────────────────

function useDashboardData() {
    const model = useModelStore(s => s.model);
    const validation = useModelStore(s => s.validation);
    const completeness = useModelStore(s => s.completeness);

    const violationCount = validation?.violations?.length ?? 0;
    const completenessPercent = useMemo(() => {
        if (typeof completeness?.overall === 'number') return Math.round(completeness.overall);
        if (!completeness?.layers || completeness.layers.length === 0) return 0;
        const avg = completeness.layers.reduce((sum: number, l: any) => sum + (l.completeness || 0), 0) / completeness.layers.length;
        return Math.round(avg);
    }, [completeness]);

    const stats = useMemo(
        () => model ? computeDashboardStats(model, violationCount, completenessPercent) : null,
        [model, violationCount, completenessPercent]
    );
    return { stats, violationCount, completenessPercent };
}

const SECTION_HEADING: React.CSSProperties = {
    fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7A9BAA', margin: '0 0 12px 0',
};

// ─── Widgets ─────────────────────────────────────────────────────────────────

function HeaderWidget() {
    const { stats } = useDashboardData();
    if (!stats) return null;
    return (
        <div className="memo-widget" style={{ marginBottom: '28px' }}>
            <div style={{ position: 'relative', width: 260, height: 154, overflow: 'hidden', margin: '0 auto -10px', opacity: 0.62 }} title="MEMO Architect" aria-label="MEMO Architect">
                <img src="/logo.png" alt="" aria-hidden="true" style={{ width: 260, height: 260, objectFit: 'contain', transform: 'translateY(-32px)', mixBlendMode: 'multiply' }} />
                <span style={{ position: 'absolute', left: '59%', top: 115, color: '#8B949E', fontSize: 20, fontWeight: 600, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                    Architect
                </span>
            </div>
            <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#1B3A4B', margin: '0 0 4px 0' }}>
                    {stats.projectName}
                </h1>
                <p style={{ fontSize: '13px', color: '#4B6E80', margin: 0 }}>
                    Model dashboard · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
            </div>
        </div>
    );
}

function StatsWidget() {
    const { stats, violationCount, completenessPercent } = useDashboardData();
    if (!stats) return null;
    return (
        <div className="memo-widget" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <StatCard label="Elements" value={stats.totalElements} color="#1B3A4B" />
            <StatCard label="Relationships" value={stats.totalRelationships} color="#4A90D9" />
            <StatCard
                label="Completeness"
                value={`${completenessPercent}%`}
                color={completenessPercent >= 70 ? '#2ECC71' : completenessPercent >= 40 ? '#F39C12' : '#E74C3C'}
            />
            <StatCard
                label="Violations"
                value={violationCount}
                color={violationCount === 0 ? '#2ECC71' : '#E74C3C'}
                subtitle={violationCount === 0 ? 'All rules passing' : 'Open the GapBar'}
            />
        </div>
    );
}

function CoverageWidget() {
    const { stats } = useDashboardData();
    const setActiveView = useModelStore(s => s.setActiveView);
    const setExplorerTab = useModelStore(s => s.setExplorerTab);
    if (!stats) return null;
    return (
        <div className="memo-widget" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <CoverageTile
                    layer="requirements" label="Requirements"
                    count={stats.requirementsCount}
                    color={LAYER_COLORS['requirements'] || '#4A90D9'}
                    onClick={() => { setExplorerTab('model'); setActiveView({ type: 'welcome' }); }}
                />
                <CoverageTile
                    layer="risk" label="Risk"
                    count={stats.riskCount}
                    color={LAYER_COLORS['risk'] || '#E74C3C'}
                    onClick={() => { setExplorerTab('model'); setActiveView({ type: 'welcome' }); }}
                />
                <CoverageTile
                    layer="logical" label="Architecture"
                    count={stats.architectureCount}
                    color={LAYER_COLORS['logical'] || '#7B68EE'}
                    onClick={() => { setExplorerTab('views'); setActiveView({ type: 'welcome' }); }}
                />
                <CoverageTile
                    layer="verification" label="Verification"
                    count={stats.verificationCount}
                    color={LAYER_COLORS['verification'] || '#2DD4A8'}
                    onClick={() => setActiveView({ type: 'traceability' })}
                />
            </div>
        </div>
    );
}

function NextActionPanel({ stats, compact }: { stats: DashboardStats; compact?: boolean }) {
    const setActiveView = useModelStore(s => s.setActiveView);
    const nextAction = computeNextAction(stats);
    return (
        <div style={{
            background: nextAction.urgency === 'high'
                ? 'rgba(231,76,60,0.06)'
                : nextAction.urgency === 'medium'
                    ? 'rgba(243,156,18,0.06)'
                    : 'rgba(46,204,113,0.06)',
            border: `1px solid ${nextAction.urgency === 'high' ? '#E74C3C30' : nextAction.urgency === 'medium' ? '#F39C1230' : '#2ECC7130'}`,
            borderRadius: '12px', padding: '16px 20px',
        }}>
            {!compact && (
                <div style={{ ...SECTION_HEADING, marginBottom: '10px' }}>
                    💡 Suggested Next Step
                </div>
            )}
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1B3A4B', marginBottom: '6px' }}>
                <span style={{ marginRight: 8 }}>{nextAction.icon}</span>{nextAction.title}
            </div>
            <div style={{ fontSize: '12px', color: '#4B6E80', lineHeight: '1.6' }}>
                {nextAction.description}
            </div>
            {nextAction.urgency !== 'low' && (
                <button
                    onClick={() => setActiveView({ type: 'workflow-wizard' })}
                    style={{
                        marginTop: '14px', padding: '8px 14px', fontSize: '12px', fontWeight: 600,
                        background: '#1B3A4B', color: '#FFFFFF', border: 'none',
                        borderRadius: '6px', cursor: 'pointer',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#244D63'}
                    onMouseLeave={e => e.currentTarget.style.background = '#1B3A4B'}
                >
                    Open Workflow Wizard →
                </button>
            )}
        </div>
    );
}

/** The contextual "what to do next" card on its own; the heading lives in markdown. */
function NextActionWidget() {
    const { stats } = useDashboardData();
    if (!stats) return null;
    return <div className="memo-widget" style={{ marginBottom: '16px' }}><NextActionPanel stats={stats} compact /></div>;
}

/**
 * The original two-column card: next step beside quick actions.
 *
 * Kept for pages that already use it. The built-in home now writes the quick
 * actions as a markdown link list, which a user can read and edit.
 */
function NextStepsWidget() {
    const { stats } = useDashboardData();
    const setActiveView = useModelStore(s => s.setActiveView);
    const setExplorerTab = useModelStore(s => s.setExplorerTab);
    const toggleGapBar = useModelStore(s => s.toggleGapBar);
    const navigate = useNavigate();
    if (!stats) return null;

    return (
        <div className="memo-widget" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <NextActionPanel stats={stats} />

            {/* Quick actions */}
            <div style={{
                background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.9)',
                borderRadius: '12px', padding: '20px', backdropFilter: 'blur(4px)',
            }}>
                <div style={{ ...SECTION_HEADING, marginBottom: '14px' }}>
                    Quick Actions
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* The explorer is a side panel, and `showExplorer`
                        in App.tsx hides it on the dashboard — so
                        setting its tab without also leaving the
                        dashboard changes a tab on a panel that is not
                        mounted, which is why these two did nothing at
                        all. The layer-coverage cards above always got
                        this right; these did not. */}
                    <QuickActionButton icon="🗂️" label="Browse Model" onClick={() => { setExplorerTab('model'); navigate('/catalog'); }} />
                    <QuickActionButton icon="📊" label="Open Viewpoints" onClick={() => { setExplorerTab('views'); navigate('/diagrams'); }} />
                    <QuickActionButton icon="↔️" label="Traceability Matrix" onClick={() => setActiveView({ type: 'traceability' })} />
                    <QuickActionButton icon="📋" label="First Review Dashboard" onClick={() => setActiveView({ type: 'review-dashboard' })} />
                    <QuickActionButton icon="✅" label="Check Completeness" onClick={() => toggleGapBar()} />
                    <QuickActionButton icon="📈" label="Full Statistics" onClick={() => setActiveView({ type: 'statistics' })} />
                    <QuickActionButton icon="🧩" label="Custom Dashboards" onClick={() => setActiveView({ type: 'dashboards' })} />
                </div>
            </div>
        </div>
    );
}

/** One row per viewpoint, each linking to its dashboard — generated or customized. */
function ViewpointDashboardsWidget() {
    const model = useModelStore(s => s.model);
    const dashboards = useModelStore(s => s.dashboards);
    const setActiveView = useModelStore(s => s.setActiveView);
    const viewpoints = useMemo(
        () => (model?.viewpoints ?? []).filter(vp => !vp.id.startsWith('__'))
            .sort((a, b) => (a.explorerOrder ?? 999) - (b.explorerOrder ?? 999) || a.label.localeCompare(b.label)),
        [model?.viewpoints],
    );
    if (viewpoints.length === 0) {
        return <p className="memo-widget" style={{ fontSize: 12, color: '#6B7280' }}><em>This model declares no viewpoints yet.</em></p>;
    }
    return (
        <div className="memo-widget" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', marginBottom: '16px' }}>
            {viewpoints.map(vp => {
                const id = viewpointDashboardId(vp.id);
                const file = dashboards.find(d => d.id === id);
                const views = (model?.diagrams ?? []).filter(d => d.viewpointId === vp.id || d.viewpointIds?.includes(vp.id)).length;
                return (
                    <button key={vp.id} type="button" onClick={() => setActiveView({ type: 'custom-dashboard', dashboardId: id })} style={{
                        textAlign: 'left', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                        background: 'rgba(255,255,255,0.75)', border: '1px solid #E2E8F0',
                    }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1B3A4B' }}>{vp.label}</div>
                        <div style={{ fontSize: 11, color: '#6B7280' }}>
                            {views} view{views === 1 ? '' : 's'} · {file ? (file.scope === 'shared' ? 'written by the team' : 'your notes') : 'not written yet'}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

function DiagramsWidget() {
    const { stats } = useDashboardData();
    const setExplorerTab = useModelStore(s => s.setExplorerTab);
    const navigate = useNavigate();
    if (!stats || stats.diagramCount === 0) return null;
    return (
        <div className="memo-widget" style={{
            background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.9)',
            borderRadius: '12px', padding: '16px 20px', backdropFilter: 'blur(4px)', marginBottom: '24px',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                    {stats.diagramCount} model view{stats.diagramCount !== 1 ? 's' : ''} in this project
                </div>
                <button
                    onClick={() => { setExplorerTab('views'); navigate('/diagrams'); }}
                    style={{
                        fontSize: '12px', color: '#4A90D9', background: 'none', border: 'none',
                        cursor: 'pointer', fontWeight: 600,
                    }}
                >
                    Browse viewpoints →
                </button>
            </div>
        </div>
    );
}

/** Every `{{widget:name}}` a dashboard or document can use. */
export const DASHBOARD_WIDGETS: Record<string, () => ReactNode> = {
    header: () => <HeaderWidget />,
    stats: () => <StatsWidget />,
    coverage: () => <CoverageWidget />,
    'next-action': () => <NextActionWidget />,
    'next-steps': () => <NextStepsWidget />,
    'viewpoint-dashboards': () => <ViewpointDashboardsWidget />,
    diagrams: () => <DiagramsWidget />,
};

// ─── Home dashboard ──────────────────────────────────────────────────────────

export function Dashboard() {
    return <DashboardPage dashboardId={HOME_DASHBOARD_ID} widgets={DASHBOARD_WIDGETS} />;
}

/** Any custom dashboard, by id; `scope` pins a shadowed shared copy. */
export function CustomDashboard({ dashboardId, scope }: { dashboardId: string; scope?: DashboardScope }) {
    return <DashboardPage dashboardId={dashboardId} scope={scope} widgets={DASHBOARD_WIDGETS} />;
}
