import { useMemo } from 'react';
import { useModelStore } from '../store/model-store';
import { LAYER_COLORS, LAYER_LABELS } from '../constants';
import type { MemoModelDTO } from '@memo/core';

// ─── Dashboard — Home View (#36 + #131) ────────────────────────────────────
//
// Default landing view shown after the model loads.
// Replaces the minimal WelcomeCanvas for populated models.
//
// Sections:
//   1. Headline stat cards (elements, relationships, completeness, violations)
//   2. CoSMA coverage tiles (risk / requirements / architecture)
//   3. Quick-action buttons (navigates to relevant views)
//   4. NextActionPanel — contextual "what to do next" (#131)
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
        // All ontology requirement defs: Requirement, SystemRequirement,
        // SoftwareRequirement, HardwareRequirement, SecurityRequirement
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

// ─── Main Dashboard component ─────────────────────────────────────────────────

export function Dashboard() {
    const model = useModelStore(s => s.model);
    const validation = useModelStore(s => s.validation);
    const completeness = useModelStore(s => s.completeness);
    const setActiveView = useModelStore(s => s.setActiveView);
    const setExplorerTab = useModelStore(s => s.setExplorerTab);
    const toggleGapBar = useModelStore(s => s.toggleGapBar);

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

    const nextAction = useMemo(() => stats ? computeNextAction(stats) : null, [stats]);

    if (!stats || !model) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F7F5' }}>
                <div style={{ fontSize: '13px', color: '#9CA3AF' }}>Loading dashboard…</div>
            </div>
        );
    }

    const GRADIENT = 'linear-gradient(135deg, #EEF7F3 0%, #EAF2F8 55%, #F2EEF8 100%)';

    return (
        <div style={{ flex: 1, overflowY: 'auto', background: GRADIENT, padding: '32px 40px' }}>
            <div style={{ maxWidth: '960px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ marginBottom: '28px' }}>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#1B3A4B', margin: '0 0 4px 0' }}>
                        {stats.projectName}
                    </h1>
                    <p style={{ fontSize: '13px', color: '#4B6E80', margin: 0 }}>
                        Model dashboard · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>

                {/* Stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
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

                {/* CoSMA coverage tiles */}
                <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7A9BAA', margin: '0 0 12px 0' }}>
                        Layer Coverage
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
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

                {/* Two-column: next action + quick actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>

                    {/* Next action panel (#131) */}
                    {nextAction && (
                        <div style={{
                            background: nextAction.urgency === 'high'
                                ? 'rgba(231,76,60,0.06)'
                                : nextAction.urgency === 'medium'
                                    ? 'rgba(243,156,18,0.06)'
                                    : 'rgba(46,204,113,0.06)',
                            border: `1px solid ${nextAction.urgency === 'high' ? '#E74C3C30' : nextAction.urgency === 'medium' ? '#F39C1230' : '#2ECC7130'}`,
                            borderRadius: '12px', padding: '20px',
                        }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7A9BAA', marginBottom: '10px' }}>
                                💡 Suggested Next Step
                            </div>
                            <div style={{ fontSize: '16px', marginBottom: '6px' }}>{nextAction.icon}</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1B3A4B', marginBottom: '6px' }}>
                                {nextAction.title}
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
                    )}

                    {/* Quick actions */}
                    <div style={{
                        background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.9)',
                        borderRadius: '12px', padding: '20px', backdropFilter: 'blur(4px)',
                    }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7A9BAA', marginBottom: '14px' }}>
                            Quick Actions
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <QuickActionButton icon="🗂️" label="Browse Model" onClick={() => { setExplorerTab('model'); }} />
                            <QuickActionButton icon="📊" label="View Diagrams" onClick={() => setExplorerTab('views')} />
                            <QuickActionButton icon="↔️" label="Traceability Matrix" onClick={() => setActiveView({ type: 'traceability' })} />
                            <QuickActionButton icon="📋" label="First Review Dashboard" onClick={() => setActiveView({ type: 'review-dashboard' })} />
                            <QuickActionButton icon="✅" label="Check Completeness" onClick={() => toggleGapBar()} />
                            <QuickActionButton icon="📈" label="Full Statistics" onClick={() => setActiveView({ type: 'statistics' })} />
                        </div>
                    </div>
                </div>

                {/* Diagrams row */}
                {stats.diagramCount > 0 && (
                    <div style={{
                        background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.9)',
                        borderRadius: '12px', padding: '16px 20px', backdropFilter: 'blur(4px)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                                {stats.diagramCount} diagram{stats.diagramCount !== 1 ? 's' : ''} in this project
                            </div>
                            <button
                                onClick={() => setExplorerTab('views')}
                                style={{
                                    fontSize: '12px', color: '#4A90D9', background: 'none', border: 'none',
                                    cursor: 'pointer', fontWeight: 600,
                                }}
                            >
                                Browse diagrams →
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
