import { useState, useMemo } from 'react';
import { useModelStore } from '../store/model-store';
import type { MemoModelDTO } from '@memo/tools/browser';

// ─── WorkflowWizard (#40) ───────────────────────────────────────────────────
//
// Guided multi-step workflow for the ISO 14971 / IEC 62304 device model path.
// Each step shows the current model state for that domain and what to do next.
//
// Steps:
//   1. Set up your device  (project / intended use)
//   2. Import requirements (SystemRequirements / UserNeeds)
//   3. Add hazards         (Hazard identification)
//   4. Connect risk chain  (Mitigates relationships)
//   5. Define architecture (System / Subsystem)
//   6. Link verification   (Tests + traceability)
// ─────────────────────────────────────────────────────────────────────────────

interface WizardStep {
    id: string;
    icon: string;
    title: string;
    description: string;
    standard: string;
    getCount: (model: MemoModelDTO) => number;
    getTarget: () => number;  // recommended minimum
    actionLabel: string;
    actionView: 'model' | 'traceability' | 'statistics' | 'catalog';
    getDetails: (model: MemoModelDTO) => string;
}

const STEPS: WizardStep[] = [
    {
        id: 'setup',
        icon: '🎯',
        title: 'Set Up Your Device',
        description: 'Define who your device is for, what it does, and who uses it. Start with actors and intended use.',
        standard: 'IEC 62366 · ISO 14971 §4',
        getCount: (m) => Object.values(m.elements)
            .filter(el => ['actor', 'stakeholder', 'usecase', 'goal'].includes(el.kind.toLowerCase())).length,
        getTarget: () => 3,
        actionLabel: 'Browse Model',
        actionView: 'model',
        getDetails: (m) => {
            const actors = Object.values(m.elements).filter(el => el.kind.toLowerCase() === 'actor').length;
            const usecases = Object.values(m.elements).filter(el => el.kind.toLowerCase() === 'usecase').length;
            return `${actors} actor(s) · ${usecases} use case(s)`;
        },
    },
    {
        id: 'requirements',
        icon: '📋',
        title: 'Define Requirements',
        description: 'Capture user needs and system requirements. These form the basis of your V&V plan.',
        standard: 'IEC 62304 §5.2 · 21 CFR 820.30(c)',
        getCount: (m) => Object.values(m.elements)
            .filter(el => ['systemrequirement', 'requirement', 'userneed'].includes(el.kind.toLowerCase())).length,
        getTarget: () => 5,
        actionLabel: 'View Catalog',
        actionView: 'catalog',
        getDetails: (m) => {
            const userNeeds = Object.values(m.elements).filter(el => el.kind.toLowerCase() === 'userneed').length;
            const sysReqs = Object.values(m.elements)
                .filter(el => ['systemrequirement', 'requirement'].includes(el.kind.toLowerCase())).length;
            return `${userNeeds} user need(s) · ${sysReqs} system requirement(s)`;
        },
    },
    {
        id: 'hazards',
        icon: '⚠️',
        title: 'Identify Hazards',
        description: 'List all hazards your device could cause. Add hazardous situations and potential harms.',
        standard: 'ISO 14971 §5–6',
        getCount: (m) => Object.values(m.elements)
            .filter(el => ['hazard', 'hazardoussituation', 'harm'].includes(el.kind.toLowerCase())).length,
        getTarget: () => 3,
        actionLabel: 'Browse Risk Layer',
        actionView: 'model',
        getDetails: (m) => {
            const hazards = Object.values(m.elements).filter(el => el.kind.toLowerCase() === 'hazard').length;
            const harms = Object.values(m.elements).filter(el => el.kind.toLowerCase() === 'harm').length;
            return `${hazards} hazard(s) · ${harms} harm(s)`;
        },
    },
    {
        id: 'risk-controls',
        icon: '🔗',
        title: 'Connect Risk Chain',
        description: 'Add risk controls and connect them to hazards with Mitigates relationships. Verify the ISO 14971 chain.',
        standard: 'ISO 14971 §7–8',
        getCount: (m) => m.relationships.filter(r => r.type.toLowerCase() === 'mitigates').length,
        getTarget: () => 2,
        actionLabel: 'Traceability Matrix',
        actionView: 'traceability',
        getDetails: (m) => {
            const controls = Object.values(m.elements).filter(el => el.kind.toLowerCase() === 'riskcontrol').length;
            const mitigates = m.relationships.filter(r => r.type.toLowerCase() === 'mitigates').length;
            return `${controls} risk control(s) · ${mitigates} mitigates link(s)`;
        },
    },
    {
        id: 'architecture',
        icon: '🏗️',
        title: 'Define Architecture',
        description: 'Add system and subsystem elements. This grounds requirements to real components.',
        standard: 'IEC 62304 §5.3 · ISO 14971 §9',
        getCount: (m) => Object.values(m.elements)
            .filter(el => ['system', 'subsystem', 'logicalcomponent', 'softwarecomponent'].includes(el.kind.toLowerCase())).length,
        getTarget: () => 3,
        actionLabel: 'Browse Model',
        actionView: 'model',
        getDetails: (m) => {
            const systems = Object.values(m.elements).filter(el => ['system', 'subsystem'].includes(el.kind.toLowerCase())).length;
            const sw = Object.values(m.elements).filter(el => el.kind.toLowerCase() === 'softwarecomponent').length;
            return `${systems} system/subsystem · ${sw} software component(s)`;
        },
    },
    {
        id: 'verification',
        icon: '🧪',
        title: 'Link Verification',
        description: 'Add tests and link them to requirements. This closes the V&V loop and prepares your design review package.',
        standard: 'IEC 62304 §5.7–5.8 · 21 CFR 820.30(g)',
        getCount: (m) => Object.values(m.elements).filter(el => el.kind.toLowerCase() === 'test').length,
        getTarget: () => 3,
        actionLabel: 'Traceability Matrix',
        actionView: 'traceability',
        getDetails: (m) => {
            const tests = Object.values(m.elements).filter(el => el.kind.toLowerCase() === 'test').length;
            const tracesLinks = m.relationships.filter(r =>
                ['satisfies', 'refines', 'traces', 'verifies'].includes(r.type.toLowerCase())
            ).length;
            return `${tests} test(s) · ${tracesLinks} traceability link(s)`;
        },
    },
];

// ─── Step card ───────────────────────────────────────────────────────────────

function StepCard({
    step,
    index,
    isActive,
    model,
    onSelect,
    onAction,
}: {
    step: WizardStep;
    index: number;
    isActive: boolean;
    model: MemoModelDTO;
    onSelect: () => void;
    onAction: (view: WizardStep['actionView']) => void;
}) {
    const count = step.getCount(model);
    const target = step.getTarget();
    const done = count >= target;
    const percent = Math.min(100, Math.round((count / target) * 100));
    const details = step.getDetails(model);

    const statusColor = done ? '#2ECC71' : count > 0 ? '#F39C12' : '#E5E5E0';

    return (
        <button
            onClick={onSelect}
            style={{
                textAlign: 'left',
                background: isActive ? '#FFFFFF' : 'transparent',
                border: `1px solid ${isActive ? '#1B3A4B20' : 'transparent'}`,
                borderRadius: '10px',
                padding: '14px 16px',
                cursor: 'pointer',
                width: '100%',
                transition: 'all 0.15s',
                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Step indicator */}
                <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                    background: done ? '#2ECC71' : isActive ? '#1B3A4B' : '#F3F4F6',
                    color: done || isActive ? '#FFFFFF' : '#6B7280',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: done ? '14px' : '12px', fontWeight: 700,
                }}>
                    {done ? '✓' : index + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: isActive ? '#1B3A4B' : '#374151' }}>
                            {step.icon} {step.title}
                        </span>
                        {count > 0 && (
                            <span style={{
                                fontSize: '10px', fontWeight: 600,
                                padding: '1px 6px', borderRadius: '999px',
                                background: statusColor + '20', color: statusColor,
                            }}>
                                {count}
                            </span>
                        )}
                    </div>
                    {details && <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{details}</div>}
                </div>

                {/* Mini progress */}
                <div style={{ width: '40px', textAlign: 'right', fontSize: '10px', color: '#9CA3AF', flexShrink: 0 }}>
                    {percent}%
                </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: '8px', height: '3px', background: '#F3F4F6', borderRadius: '2px', marginLeft: '38px' }}>
                <div style={{
                    height: '100%', borderRadius: '2px', background: statusColor,
                    width: `${percent}%`, transition: 'width 0.4s ease',
                }} />
            </div>
        </button>
    );
}

// ─── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ step, model, onAction }: {
    step: WizardStep; model: MemoModelDTO; onAction: (view: WizardStep['actionView']) => void;
}) {
    const count = step.getCount(model);
    const target = step.getTarget();
    const done = count >= target;

    return (
        <div style={{
            background: '#FFFFFF', border: '1px solid #E5E5E0',
            borderRadius: '12px', padding: '24px',
        }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>{step.icon}</div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1B3A4B', margin: '0 0 6px 0' }}>
                {step.title}
            </h2>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', marginBottom: '12px', fontFamily: 'monospace' }}>
                {step.standard}
            </div>
            <p style={{ fontSize: '13px', color: '#4B6E80', lineHeight: '1.7', margin: '0 0 20px 0' }}>
                {step.description}
            </p>

            {/* Count status */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 16px', borderRadius: '8px',
                background: done ? '#2ECC7110' : count > 0 ? '#F39C1210' : '#F3F4F6',
                marginBottom: '20px',
            }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: done ? '#2ECC71' : count > 0 ? '#F39C12' : '#9CA3AF' }}>
                    {count}
                </div>
                <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                        {done ? `✓ Target reached (${target}+ recommended)` : `${target - count} more recommended`}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{step.getDetails(model)}</div>
                </div>
            </div>

            <button
                onClick={() => onAction(step.actionView)}
                style={{
                    width: '100%', padding: '12px', borderRadius: '8px',
                    background: '#1B3A4B', color: '#FFFFFF', border: 'none',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#244D63'}
                onMouseLeave={e => e.currentTarget.style.background = '#1B3A4B'}
            >
                {step.actionLabel} →
            </button>
        </div>
    );
}

// ─── Overall progress bar ─────────────────────────────────────────────────────

function OverallProgress({ model }: { model: MemoModelDTO }) {
    const stepsCompleted = STEPS.filter(s => s.getCount(model) >= s.getTarget()).length;
    const percent = Math.round((stepsCompleted / STEPS.length) * 100);

    return (
        <div style={{ padding: '16px 20px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E5E0', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1B3A4B' }}>Golden Path Progress</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1B3A4B' }}>{stepsCompleted}/{STEPS.length} steps</span>
            </div>
            <div style={{ height: '6px', background: '#F3F4F6', borderRadius: '3px' }}>
                <div style={{
                    height: '100%', borderRadius: '3px',
                    background: percent >= 100 ? '#2ECC71' : '#2DD4A8',
                    width: `${percent}%`, transition: 'width 0.4s ease',
                }} />
            </div>
        </div>
    );
}

// ─── Main WorkflowWizard ──────────────────────────────────────────────────────

export function WorkflowWizard() {
    const model = useModelStore(s => s.model);
    const setActiveView = useModelStore(s => s.setActiveView);
    const setExplorerTab = useModelStore(s => s.setExplorerTab);

    // Auto-select the first incomplete step
    const defaultStep = useMemo(() => {
        if (!model) return 0;
        for (let i = 0; i < STEPS.length; i++) {
            if (STEPS[i].getCount(model) < STEPS[i].getTarget()) return i;
        }
        return STEPS.length - 1; // all done — show last step
    }, [model]);

    const [activeStep, setActiveStep] = useState(defaultStep);

    if (!model) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F7F5' }}>
                <div style={{ fontSize: '13px', color: '#9CA3AF' }}>No model data</div>
            </div>
        );
    }

    function handleAction(view: WizardStep['actionView']) {
        switch (view) {
            case 'model':
                setExplorerTab('model');
                setActiveView({ type: 'dashboard' });
                break;
            case 'traceability':
                setActiveView({ type: 'traceability' });
                break;
            case 'statistics':
                setActiveView({ type: 'statistics' });
                break;
            case 'catalog':
                setExplorerTab('model');
                setActiveView({ type: 'dashboard' });
                break;
        }
    }

    return (
        <div style={{ flex: 1, overflowY: 'auto', background: '#F7F7F5', padding: '28px 40px' }}>
            <div style={{ maxWidth: '960px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div>
                        <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#1B3A4B', margin: '0 0 4px 0' }}>
                            Workflow Wizard
                        </h1>
                        <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                            Follow the golden path to a complete, review-ready device model
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

                {/* Overall progress */}
                <OverallProgress model={model} />

                {/* Two-column: step list + detail */}
                <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '16px' }}>

                    {/* Step list */}
                    <div style={{
                        background: '#F9FAFB', border: '1px solid #E5E5E0',
                        borderRadius: '12px', padding: '8px',
                        display: 'flex', flexDirection: 'column', gap: '2px',
                    }}>
                        {STEPS.map((step, i) => (
                            <StepCard
                                key={step.id}
                                step={step}
                                index={i}
                                isActive={i === activeStep}
                                model={model}
                                onSelect={() => setActiveStep(i)}
                                onAction={handleAction}
                            />
                        ))}
                    </div>

                    {/* Detail panel */}
                    <DetailPanel
                        step={STEPS[activeStep]}
                        model={model}
                        onAction={handleAction}
                    />
                </div>

            </div>
        </div>
    );
}
