import { useMemo } from 'react';
import { useModelStore } from '../store/model-store';
import { LAYER_COLORS } from '../constants';
import type { MemoModelDTO } from '@memo/tools/browser';

// ─── First-Review Dashboard (#132) ─────────────────────────────────────────
//
// "Money shot" view: architecture + requirements + risk + verification in one screen.
// Purpose: what a founder shows an advisor or a team lead shows in a design review.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Section: Architecture Overview ─────────────────────────────────────────

function ArchitectureSection({ model }: { model: MemoModelDTO }) {
    const setActiveView = useModelStore(s => s.setActiveView);
    const setExplorerTab = useModelStore(s => s.setExplorerTab);

    const systemElements = useMemo(() => {
        return Object.values(model.elements)
            .filter(el => ['system', 'subsystem', 'logicalcomponent', 'softwarecomponent', 'physicalcomponent']
                .includes(el.kind.toLowerCase()))
            .slice(0, 8);
    }, [model]);

    const layerCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const el of Object.values(model.elements)) {
            counts[el.layer] = (counts[el.layer] || 0) + 1;
        }
        return counts;
    }, [model]);

    // Top 5 layers by count
    const topLayers = Object.entries(layerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const totalElements = Object.keys(model.elements).length;

    return (
        <div style={sectionStyle}>
            <SectionHeader
                icon="🏗️"
                title="System Architecture"
                badge={`${totalElements} elements`}
                onExpand={() => { setExplorerTab('model'); }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                    <div style={subLabelStyle}>Layer distribution</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {topLayers.map(([layer, count]) => (
                            <div key={layer} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    width: '8px', height: '8px', borderRadius: '50%',
                                    background: LAYER_COLORS[layer] || '#95A5A6', flexShrink: 0,
                                }} />
                                <span style={{ fontSize: '12px', color: '#374151', flex: 1, textTransform: 'capitalize' }}>{layer}</span>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>{count}</span>
                                <div style={{ width: '60px', height: '4px', background: '#F3F4F6', borderRadius: '2px' }}>
                                    <div style={{
                                        height: '100%', borderRadius: '2px',
                                        background: LAYER_COLORS[layer] || '#95A5A6',
                                        width: `${Math.round((count / totalElements) * 100)}%`,
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <div style={subLabelStyle}>Key components</div>
                    {systemElements.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {systemElements.map(el => (
                                <button
                                    key={el.id}
                                    onClick={() => setActiveView({ type: 'element-detail', elementId: el.id })}
                                    style={{
                                        textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                                        padding: '3px 0', display: 'flex', alignItems: 'center', gap: '6px',
                                    }}
                                >
                                    <span style={{ fontSize: '10px', color: '#9CA3AF', fontFamily: 'monospace' }}>{el.kind}</span>
                                    <span style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>{el.name}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <EmptyHint text="No System or Subsystem elements yet" />
                    )}
                </div>
            </div>

            {model.diagrams && model.diagrams.length > 0 && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {model.diagrams.slice(0, 4).map(d => (
                        <button
                            key={d.id}
                            onClick={() => setActiveView({ type: 'diagram', diagramId: d.id })}
                            style={diagramChipStyle}
                            onMouseEnter={e => e.currentTarget.style.background = '#E5E5E0'}
                            onMouseLeave={e => e.currentTarget.style.background = '#F3F4F6'}
                        >
                            ⊟ {d.name}
                        </button>
                    ))}
                    {model.diagrams.length > 4 && (
                        <span style={{ fontSize: '11px', color: '#9CA3AF', alignSelf: 'center' }}>
                            +{model.diagrams.length - 4} more
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Section: Requirements Coverage ─────────────────────────────────────────

function RequirementsSection({ model }: { model: MemoModelDTO }) {
    const setActiveView = useModelStore(s => s.setActiveView);

    const { reqs, withTestLink, withArchLink } = useMemo(() => {
        const elements = Object.values(model.elements);
        const reqs = elements.filter(el =>
            ['systemrequirement', 'requirement', 'userneed'].includes(el.kind.toLowerCase())
        );
        const connectedIds = new Set<string>();
        for (const rel of model.relationships) {
            connectedIds.add(rel.sourceId);
            connectedIds.add(rel.targetId);
        }
        const testKinds = new Set(['test', 'verification', 'validationtest']);
        const archKinds = new Set(['system', 'subsystem', 'logicalcomponent', 'softwarecomponent']);

        const testIds = new Set(
            elements.filter(el => testKinds.has(el.kind.toLowerCase())).map(el => el.id)
        );
        const archIds = new Set(
            elements.filter(el => archKinds.has(el.kind.toLowerCase())).map(el => el.id)
        );

        let withTestLink = 0, withArchLink = 0;
        for (const req of reqs) {
            const linkedIds = model.relationships
                .filter(r => r.sourceId === req.id || r.targetId === req.id)
                .flatMap(r => [r.sourceId, r.targetId]);
            if (linkedIds.some(id => testIds.has(id))) withTestLink++;
            if (linkedIds.some(id => archIds.has(id))) withArchLink++;
        }
        return { reqs, withTestLink, withArchLink };
    }, [model]);

    const testCoverage = reqs.length > 0 ? Math.round((withTestLink / reqs.length) * 100) : 0;
    const archCoverage = reqs.length > 0 ? Math.round((withArchLink / reqs.length) * 100) : 0;

    return (
        <div style={sectionStyle}>
            <SectionHeader
                icon="📋"
                title="Requirements"
                badge={`${reqs.length} total`}
                onExpand={() => setActiveView({ type: 'traceability' })}
            />
            {reqs.length === 0 ? (
                <EmptyHint text="No requirements found. Add Requirement elements to your model." />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <CoverageBar label="Verified by tests" percent={testCoverage} count={withTestLink} total={reqs.length} color="#2DD4A8" />
                    <CoverageBar label="Linked to architecture" percent={archCoverage} count={withArchLink} total={reqs.length} color="#4A90D9" />
                </div>
            )}
        </div>
    );
}

// ─── Section: Risk Chain ─────────────────────────────────────────────────────

function RiskSection({ model }: { model: MemoModelDTO }) {
    const setActiveView = useModelStore(s => s.setActiveView);

    const { hazards, riskControls, mitigatesCount, residualRiskCount } = useMemo(() => {
        const elements = Object.values(model.elements);
        const hazards = elements.filter(el => el.kind.toLowerCase() === 'hazard');
        const riskControls = elements.filter(el => el.kind.toLowerCase() === 'riskcontrol');
        const mitigatesRels = model.relationships.filter(r => r.type.toLowerCase() === 'mitigates');
        const mitigatesCount = mitigatesRels.length;
        // Hazards with at least one Mitigates relation
        const mitigatedHazardIds = new Set(mitigatesRels.map(r => r.targetId));
        const residualRiskCount = hazards.filter(h => !mitigatedHazardIds.has(h.id)).length;
        return { hazards, riskControls, mitigatesCount, residualRiskCount };
    }, [model]);

    const mitigatedPercent = hazards.length > 0
        ? Math.round(((hazards.length - residualRiskCount) / hazards.length) * 100)
        : 0;

    return (
        <div style={sectionStyle}>
            <SectionHeader
                icon="⚠️"
                title="Risk Chain (ISO 14971)"
                badge={`${hazards.length} hazards`}
                onExpand={() => setActiveView({ type: 'traceability' })}
                badgeColor={residualRiskCount > 0 ? '#E74C3C' : '#2ECC71'}
            />
            {hazards.length === 0 ? (
                <EmptyHint text="No hazards found. Add Hazard elements to start your ISO 14971 risk analysis." />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <CoverageBar
                        label="Hazards mitigated"
                        percent={mitigatedPercent}
                        count={hazards.length - residualRiskCount}
                        total={hazards.length}
                        color="#2ECC71"
                        warningThreshold={80}
                    />
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <MetricPill label="Risk controls" value={riskControls.length} />
                        <MetricPill label="Mitigates links" value={mitigatesCount} />
                        {residualRiskCount > 0 && (
                            <MetricPill label="Unmitigated hazards" value={residualRiskCount} alert />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Section: Verification Progress ─────────────────────────────────────────

function VerificationSection({ model }: { model: MemoModelDTO }) {
    const setActiveView = useModelStore(s => s.setActiveView);

    const { tests, passing, withReqLink } = useMemo(() => {
        const elements = Object.values(model.elements);
        const tests = elements.filter(el => el.kind.toLowerCase() === 'test');
        const withinReqs = elements.filter(el =>
            ['systemrequirement', 'requirement'].includes(el.kind.toLowerCase())
        );
        const reqIds = new Set(withinReqs.map(el => el.id));

        let withReqLink = 0;
        for (const test of tests) {
            const linked = model.relationships
                .filter(r => r.sourceId === test.id || r.targetId === test.id)
                .flatMap(r => [r.sourceId, r.targetId]);
            if (linked.some(id => reqIds.has(id))) withReqLink++;
        }

        // Check test status attribute
        const passing = tests.filter(t =>
            (t.attributes['status'] || '').toLowerCase() === 'pass'
        ).length;

        return { tests, passing, withReqLink };
    }, [model]);

    const linkedPercent = tests.length > 0 ? Math.round((withReqLink / tests.length) * 100) : 0;

    return (
        <div style={sectionStyle}>
            <SectionHeader
                icon="🧪"
                title="Verification"
                badge={`${tests.length} tests`}
                onExpand={() => setActiveView({ type: 'traceability' })}
            />
            {tests.length === 0 ? (
                <EmptyHint text="No tests found. Add Test elements and link them to requirements." />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <CoverageBar
                        label="Tests linked to requirements"
                        percent={linkedPercent}
                        count={withReqLink}
                        total={tests.length}
                        color="#2DD4A8"
                    />
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <MetricPill label="Tests" value={tests.length} />
                        {passing > 0 && <MetricPill label="Passing" value={passing} />}
                        {tests.length - passing > 0 && (
                            <MetricPill label="Unverified" value={tests.length - passing} alert={tests.length - passing > 0 && passing > 0} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function SectionHeader({ icon, title, badge, onExpand, badgeColor }: {
    icon: string; title: string; badge: string; onExpand: () => void; badgeColor?: string;
}) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>{icon}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#1B3A4B' }}>{title}</span>
                <span style={{
                    fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                    background: badgeColor ? badgeColor + '20' : '#F3F4F6',
                    color: badgeColor || '#6B7280',
                }}>
                    {badge}
                </span>
            </div>
            <button
                onClick={onExpand}
                style={{ fontSize: '11px', color: '#4A90D9', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
                Expand →
            </button>
        </div>
    );
}

function CoverageBar({ label, percent, count, total, color, warningThreshold = 100 }: {
    label: string; percent: number; count: number; total: number; color: string; warningThreshold?: number;
}) {
    const barColor = percent >= warningThreshold ? color : percent >= 50 ? '#F39C12' : '#E74C3C';
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: '#374151' }}>{label}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: percent >= 80 ? '#2ECC71' : '#374151' }}>
                    {count}/{total} ({percent}%)
                </span>
            </div>
            <div style={{ height: '6px', background: '#F3F4F6', borderRadius: '3px' }}>
                <div style={{
                    height: '100%', borderRadius: '3px', background: barColor,
                    width: `${percent}%`, transition: 'width 0.4s ease',
                }} />
            </div>
        </div>
    );
}

function MetricPill({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
    return (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'baseline' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: alert ? '#E74C3C' : '#1B3A4B' }}>{value}</span>
            <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{label}</span>
        </div>
    );
}

function EmptyHint({ text }: { text: string }) {
    return (
        <div style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic', padding: '8px 0' }}>{text}</div>
    );
}

// ─── Shared styles ───────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid #E5E5E0',
    borderRadius: '12px',
    padding: '20px',
};

const subLabelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.06em', color: '#9CA3AF', marginBottom: '8px',
};

const diagramChipStyle: React.CSSProperties = {
    fontSize: '11px', color: '#374151', background: '#F3F4F6',
    border: '1px solid #E5E5E0', borderRadius: '6px',
    padding: '4px 10px', cursor: 'pointer', transition: 'background 0.1s',
    fontWeight: 500,
};

// ─── Main ReviewDashboard component ─────────────────────────────────────────

export function ReviewDashboard() {
    const model = useModelStore(s => s.model);
    const setActiveView = useModelStore(s => s.setActiveView);

    if (!model) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F7F5' }}>
                <div style={{ fontSize: '13px', color: '#9CA3AF' }}>No model data</div>
            </div>
        );
    }

    return (
        <div style={{ flex: 1, overflowY: 'auto', background: '#F7F7F5', padding: '28px 40px' }}>
            <div style={{ maxWidth: '960px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#1B3A4B', margin: '0 0 4px 0' }}>
                            Design Review Dashboard
                        </h1>
                        <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                            Architecture · Requirements · Risk · Verification — in one view
                        </p>
                    </div>
                    <button
                        onClick={() => setActiveView({ type: 'dashboard' })}
                        style={{
                            fontSize: '12px', color: '#6B7280', background: '#F3F4F6',
                            border: '1px solid #E5E5E0', borderRadius: '6px',
                            padding: '6px 12px', cursor: 'pointer', fontWeight: 500,
                        }}
                    >
                        ← Back to Dashboard
                    </button>
                </div>

                {/* 2×2 grid of sections */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <ArchitectureSection model={model} />
                    <RequirementsSection model={model} />
                    <RiskSection model={model} />
                    <VerificationSection model={model} />
                </div>

            </div>
        </div>
    );
}
