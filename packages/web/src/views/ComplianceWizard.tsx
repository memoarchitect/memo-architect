import { useState, useMemo, useCallback } from 'react';
import { useModelStore } from '../store/model-store';
import { sendElementUpdate, sendAddRelationship } from '../store/ws-client';
import { LAYER_COLORS } from '../constants';
import type { MemoElement, OntologyPackageInfo } from '@memo/tools/browser';

// ─── Compliance Wizard Steps ────────────────────────────────────────────────

type WizardStep = 'select-standard' | 'hazard-identification' | 'risk-estimation' | 'control-measures' | 'verification' | 'summary';

interface ComplianceStandard {
    id: string;
    name: string;
    description: string;
    steps: { id: WizardStep; label: string; description: string }[];
    requiredKinds: string[];
    requiredRelationships: string[];
}

const STANDARDS: ComplianceStandard[] = [
    {
        id: 'iso-14971',
        name: 'ISO 14971',
        description: 'Risk Management for Medical Devices',
        steps: [
            { id: 'hazard-identification', label: 'Hazard Identification', description: 'Identify hazards and hazardous situations' },
            { id: 'risk-estimation', label: 'Risk Estimation', description: 'Estimate severity and probability for each hazardous situation' },
            { id: 'control-measures', label: 'Risk Controls', description: 'Define risk control measures and link to hazards' },
            { id: 'verification', label: 'Verification', description: 'Verify risk control effectiveness' },
            { id: 'summary', label: 'Summary', description: 'Review compliance status' },
        ],
        requiredKinds: ['Hazard', 'HazardousSituation', 'Harm', 'RiskControl'],
        requiredRelationships: ['causes', 'leadsTo', 'mitigates'],
    },
    {
        id: 'iec-62304',
        name: 'IEC 62304',
        description: 'Software Lifecycle for Medical Devices',
        steps: [
            { id: 'hazard-identification', label: 'Software Items', description: 'Identify software items and their safety classification' },
            { id: 'risk-estimation', label: 'Architecture', description: 'Review software architecture decomposition' },
            { id: 'control-measures', label: 'Requirements Tracing', description: 'Trace software requirements to system requirements' },
            { id: 'verification', label: 'Verification', description: 'Verify test coverage for software items' },
            { id: 'summary', label: 'Summary', description: 'Review compliance status' },
        ],
        requiredKinds: ['SoftwareComponent', 'SoftwareModule', 'Requirement', 'Test'],
        requiredRelationships: ['decomposedBy', 'traceTo', 'verify'],
    },
];

// ─── Compliance Status Helpers ──────────────────────────────────────────────

interface ComplianceCheck {
    label: string;
    status: 'pass' | 'warning' | 'fail';
    detail: string;
    elementIds?: string[];
}

function checkISO14971(model: ReturnType<typeof useModelStore.getState>['model']): ComplianceCheck[] {
    if (!model) return [];
    const elements = Object.values(model.elements);
    const checks: ComplianceCheck[] = [];

    const hazards = elements.filter(e => e.kind === 'Hazard');
    const hazSits = elements.filter(e => e.kind === 'HazardousSituation');
    const harms = elements.filter(e => e.kind === 'Harm');
    const controls = elements.filter(e => e.kind === 'RiskControl');

    checks.push({
        label: 'Hazards identified',
        status: hazards.length > 0 ? 'pass' : 'fail',
        detail: `${hazards.length} hazards found`,
        elementIds: hazards.map(e => e.id),
    });

    checks.push({
        label: 'Hazardous situations linked',
        status: hazSits.length > 0 ? 'pass' : 'warning',
        detail: `${hazSits.length} hazardous situations`,
        elementIds: hazSits.map(e => e.id),
    });

    checks.push({
        label: 'Harms documented',
        status: harms.length > 0 ? 'pass' : 'warning',
        detail: `${harms.length} harms identified`,
        elementIds: harms.map(e => e.id),
    });

    // Check that every hazard has at least one mitigates relationship
    const mitigatedHazards = new Set(
        model.relationships.filter(r => r.type === 'mitigates').map(r => r.targetId)
    );
    const unmitigated = hazards.filter(h => !mitigatedHazards.has(h.id));
    checks.push({
        label: 'Risk controls applied',
        status: unmitigated.length === 0 && hazards.length > 0 ? 'pass' : unmitigated.length > 0 ? 'fail' : 'warning',
        detail: unmitigated.length > 0 ? `${unmitigated.length} hazards without controls` : `${controls.length} controls applied`,
        elementIds: unmitigated.map(e => e.id),
    });

    // Check verification
    const verifiedControls = new Set(
        model.relationships.filter(r => r.type === 'verify').map(r => r.targetId)
    );
    const unverified = controls.filter(c => !verifiedControls.has(c.id));
    checks.push({
        label: 'Controls verified',
        status: unverified.length === 0 && controls.length > 0 ? 'pass' : unverified.length > 0 ? 'warning' : 'fail',
        detail: unverified.length > 0 ? `${unverified.length} controls not verified` : `All ${controls.length} controls verified`,
        elementIds: unverified.map(e => e.id),
    });

    return checks;
}

function checkIEC62304(model: ReturnType<typeof useModelStore.getState>['model']): ComplianceCheck[] {
    if (!model) return [];
    const elements = Object.values(model.elements);
    const checks: ComplianceCheck[] = [];

    const swComponents = elements.filter(e => e.kind === 'SoftwareComponent' || e.kind === 'SoftwareModule');
    const swReqs = elements.filter(e => e.kind === 'Requirement');
    const tests = elements.filter(e => e.kind === 'Test');

    checks.push({
        label: 'Software items identified',
        status: swComponents.length > 0 ? 'pass' : 'fail',
        detail: `${swComponents.length} software items`,
        elementIds: swComponents.map(e => e.id),
    });

    checks.push({
        label: 'Software requirements defined',
        status: swReqs.length > 0 ? 'pass' : 'fail',
        detail: `${swReqs.length} software requirements`,
        elementIds: swReqs.map(e => e.id),
    });

    // Check traceability
    const tracedReqs = new Set(
        model.relationships.filter(r => r.type === 'traceTo').map(r => r.sourceId)
    );
    const untracedReqs = swReqs.filter(r => !tracedReqs.has(r.id));
    checks.push({
        label: 'Requirements traced',
        status: untracedReqs.length === 0 && swReqs.length > 0 ? 'pass' : untracedReqs.length > 0 ? 'warning' : 'fail',
        detail: untracedReqs.length > 0 ? `${untracedReqs.length} requirements not traced` : 'All requirements traced',
        elementIds: untracedReqs.map(e => e.id),
    });

    checks.push({
        label: 'Test coverage',
        status: tests.length > 0 ? 'pass' : 'warning',
        detail: `${tests.length} tests defined`,
        elementIds: tests.map(e => e.id),
    });

    return checks;
}

// ─── Wizard Component ───────────────────────────────────────────────────────

/** Extract discovered compliance standard groups from ontology package data. */
function useDiscoveredStandards(): { standard: string; label: string; kindCount: number }[] {
    const ontologies = useModelStore(s => s.availableOntologies);
    return useMemo(() => {
        const groups = new Map<string, number>();
        for (const pkg of ontologies) {
            for (const layer of pkg.layers) {
                for (const kind of layer.kinds) {
                    if (kind.standard) {
                        groups.set(kind.standard, (groups.get(kind.standard) ?? 0) + 1);
                    }
                }
            }
        }
        return Array.from(groups.entries())
            .map(([standard, kindCount]) => ({
                standard,
                label: standard.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                kindCount,
            }))
            .sort((a, b) => a.standard.localeCompare(b.standard));
    }, [ontologies]);
}

export function ComplianceWizard() {
    const model = useModelStore(s => s.model);
    const selectElement = useModelStore(s => s.selectElement);
    const [selectedStandard, setSelectedStandard] = useState<string | null>(null);
    const [currentStepIdx, setCurrentStepIdx] = useState(0);
    const discoveredStandards = useDiscoveredStandards();

    const standard = STANDARDS.find(s => s.id === selectedStandard);
    const currentStep = standard?.steps[currentStepIdx];

    const checks = useMemo(() => {
        if (!selectedStandard || !model) return [];
        if (selectedStandard === 'iso-14971') return checkISO14971(model);
        if (selectedStandard === 'iec-62304') return checkIEC62304(model);
        return [];
    }, [selectedStandard, model]);

    const passCount = checks.filter(c => c.status === 'pass').length;
    const totalChecks = checks.length;
    const compliancePercent = totalChecks > 0 ? Math.round((passCount / totalChecks) * 100) : 0;

    const statusColors = { pass: '#2ECC71', warning: '#F39C12', fail: '#E74C3C' };
    const statusIcons = { pass: '\u2713', warning: '\u26A0', fail: '\u2717' };

    // Elements relevant to the current step
    const stepElements = useMemo(() => {
        if (!model || !currentStep) return [];
        const elements = Object.values(model.elements);
        switch (currentStep.id) {
            case 'hazard-identification':
                if (selectedStandard === 'iso-14971') return elements.filter(e => e.kind === 'Hazard' || e.kind === 'HazardousSituation');
                return elements.filter(e => e.kind === 'SoftwareComponent' || e.kind === 'SoftwareModule');
            case 'risk-estimation':
                if (selectedStandard === 'iso-14971') return elements.filter(e => e.kind === 'HazardousSituation' || e.kind === 'Harm');
                return elements.filter(e => e.kind === 'SoftwareComponent' || e.kind === 'Subsystem' || e.kind === 'Component');
            case 'control-measures':
                if (selectedStandard === 'iso-14971') return elements.filter(e => e.kind === 'RiskControl');
                return elements.filter(e => e.kind === 'Requirement' || e.kind === 'Requirement');
            case 'verification':
                return elements.filter(e => e.kind === 'Test');
            default:
                return [];
        }
    }, [model, currentStep, selectedStandard]);

    if (!selectedStandard) {
        return (
            <div className="flex-1 overflow-y-auto p-8" style={{ background: '#F7F7F5' }}>
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-lg font-semibold mb-1" style={{ color: '#374151' }}>Compliance Wizard</h2>
                    <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>
                        Select a standard to walk through compliance requirements step by step.
                    </p>
                    <div className="space-y-3">
                        {STANDARDS.map(std => (
                            <button
                                key={std.id}
                                onClick={() => { setSelectedStandard(std.id); setCurrentStepIdx(0); }}
                                className="w-full text-left p-4 rounded-lg transition-colors"
                                style={{ background: '#FFFFFF', border: '1px solid #E5E5E0' }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = '#2DD4A8')}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = '#E5E5E0')}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-semibold" style={{ color: '#1B3A4B' }}>{std.name}</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                                        {std.steps.length} steps
                                    </span>
                                </div>
                                <p className="text-xs mt-1" style={{ color: '#6B7280' }}>{std.description}</p>
                            </button>
                        ))}
                    </div>

                    {discoveredStandards.length > 0 && (
                        <>
                            <h3 className="text-xs font-semibold uppercase tracking-wider mt-8 mb-3" style={{ color: '#6B7280' }}>
                                Discovered Standards
                            </h3>
                            <div className="space-y-2">
                                {discoveredStandards.map(ds => (
                                    <div
                                        key={ds.standard}
                                        className="flex items-center gap-3 p-3 rounded-lg"
                                        style={{ background: '#FFFFFF', border: '1px solid #E5E5E0' }}
                                    >
                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#7C3AED' }} />
                                        <span className="text-sm font-medium flex-1" style={{ color: '#374151' }}>{ds.label}</span>
                                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                                            {ds.kindCount} {ds.kindCount === 1 ? 'kind' : 'kinds'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-1 overflow-hidden">
            {/* Left: Steps navigation */}
            <div className="w-64 flex flex-col overflow-hidden" style={{ background: '#FFFFFF', borderRight: '1px solid #E5E5E0' }}>
                <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #1B3A4B, #2D6A7A)' }}>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setSelectedStandard(null); setCurrentStepIdx(0); }}
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.1)' }}
                        >
                            {'\u2190'}
                        </button>
                        <h2 className="text-sm font-bold tracking-wide" style={{ color: '#2DD4A8' }}>
                            {standard!.name}
                        </h2>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {standard!.description}
                    </p>
                </div>

                {/* Compliance score */}
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #E5E5E0' }}>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium" style={{ color: '#374151' }}>Compliance</span>
                        <span className="text-xs font-bold" style={{ color: compliancePercent >= 80 ? '#2ECC71' : compliancePercent >= 50 ? '#F39C12' : '#E74C3C' }}>
                            {compliancePercent}%
                        </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full" style={{ background: '#F3F4F6' }}>
                        <div
                            className="h-full rounded-full transition-all"
                            style={{
                                width: `${compliancePercent}%`,
                                background: compliancePercent >= 80 ? '#2ECC71' : compliancePercent >= 50 ? '#F39C12' : '#E74C3C',
                            }}
                        />
                    </div>
                </div>

                {/* Steps */}
                <div className="flex-1 overflow-y-auto py-1">
                    {standard!.steps.map((step, idx) => {
                        const isActive = currentStepIdx === idx;
                        const isCompleted = idx < currentStepIdx;
                        return (
                            <div
                                key={step.id}
                                className="flex items-center gap-2 px-3 py-2 cursor-pointer mx-1 rounded-lg"
                                style={{
                                    background: isActive ? '#2DD4A818' : 'transparent',
                                    fontWeight: isActive ? 500 : 400,
                                }}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F0F0ED'; }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? '#2DD4A818' : 'transparent'; }}
                                onClick={() => setCurrentStepIdx(idx)}
                            >
                                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                                    style={{
                                        background: isActive ? '#2DD4A8' : isCompleted ? '#2ECC7130' : '#F3F4F6',
                                        color: isActive ? '#FFFFFF' : isCompleted ? '#2ECC71' : '#9CA3AF',
                                    }}>
                                    {isCompleted ? '\u2713' : idx + 1}
                                </span>
                                <span className="text-xs" style={{ color: isActive ? '#1B3A4B' : '#6B7280' }}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Center: Step content */}
            <div className="flex-1 overflow-y-auto p-6" style={{ background: '#F7F7F5' }}>
                <div className="max-w-3xl">
                    {currentStep && (
                        <>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-lg font-semibold" style={{ color: '#374151' }}>{currentStep.label}</h2>
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#F3F4F6', color: '#9CA3AF' }}>
                                    Step {currentStepIdx + 1} of {standard!.steps.length}
                                </span>
                            </div>
                            <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>{currentStep.description}</p>

                            {/* Step-specific checks */}
                            {currentStep.id === 'summary' ? (
                                <div className="space-y-2">
                                    {checks.map((check, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-3 p-3 rounded-lg"
                                            style={{ background: '#FFFFFF', border: `1px solid ${statusColors[check.status]}40` }}
                                        >
                                            <span className="text-sm font-bold" style={{ color: statusColors[check.status] }}>
                                                {statusIcons[check.status]}
                                            </span>
                                            <div className="flex-1">
                                                <div className="text-xs font-medium" style={{ color: '#374151' }}>{check.label}</div>
                                                <div className="text-xs" style={{ color: '#9CA3AF' }}>{check.detail}</div>
                                            </div>
                                            {check.elementIds && check.elementIds.length > 0 && check.status !== 'pass' && (
                                                <button
                                                    onClick={() => selectElement(check.elementIds![0])}
                                                    className="text-xs px-2 py-0.5 rounded"
                                                    style={{ background: '#4A90D915', color: '#4A90D9' }}
                                                >
                                                    View
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <>
                                    {/* Elements for this step */}
                                    <div className="mb-4">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
                                            Relevant Elements ({stepElements.length})
                                        </h3>
                                        {stepElements.length === 0 && (
                                            <div className="p-4 rounded-lg text-center text-xs" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#E74C3C' }}>
                                                No elements found for this step. Create the required element types in your .sysml files.
                                            </div>
                                        )}
                                        <div className="space-y-1">
                                            {stepElements.map(el => {
                                                const rels = model!.relationships.filter(r => r.sourceId === el.id || r.targetId === el.id);
                                                return (
                                                    <div
                                                        key={el.id}
                                                        className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs"
                                                        style={{ background: '#FFFFFF', border: '1px solid #E5E5E0' }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = '#F0F0ED')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
                                                        onClick={() => selectElement(el.id)}
                                                    >
                                                        <span className="w-2 h-2 rounded-full" style={{ background: LAYER_COLORS[el.layer] || '#95A5A6' }} />
                                                        <span className="font-medium flex-1 truncate" style={{ color: '#374151' }}>{el.name}</span>
                                                        <span className="px-1.5 py-0.5 rounded" style={{ background: (LAYER_COLORS[el.layer] || '#95A5A6') + '18', color: LAYER_COLORS[el.layer] || '#95A5A6' }}>
                                                            {el.kind}
                                                        </span>
                                                        <span style={{ color: '#9CA3AF' }}>{rels.length} rels</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Navigation */}
                            <div className="flex items-center gap-2 mt-6 pt-4" style={{ borderTop: '1px solid #E5E5E0' }}>
                                {currentStepIdx > 0 && (
                                    <button
                                        onClick={() => setCurrentStepIdx(currentStepIdx - 1)}
                                        className="px-4 py-2 text-xs rounded-lg"
                                        style={{ background: '#F3F4F6', color: '#6B7280' }}
                                    >
                                        {'\u2190'} Previous
                                    </button>
                                )}
                                <div className="flex-1" />
                                {currentStepIdx < standard!.steps.length - 1 && (
                                    <button
                                        onClick={() => setCurrentStepIdx(currentStepIdx + 1)}
                                        className="px-4 py-2 text-xs rounded-lg font-medium"
                                        style={{ background: '#2DD4A8', color: '#FFFFFF' }}
                                    >
                                        Next {'\u2192'}
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
