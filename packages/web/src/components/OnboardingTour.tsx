import { useState, useEffect, useCallback } from 'react';

// ─── Onboarding Tour ────────────────────────────────────────────────────────
//
// First-run interactive tour that highlights key areas of the workbench.
// Shown once; dismissed state persisted to localStorage.
// ─────────────────────────────────────────────────────────────────────────────

const TOUR_STORAGE_KEY = 'memo-onboarding-completed';

interface TourStep {
    title: string;
    description: string;
    target: string;  // human-readable area description
    position: 'center' | 'left' | 'right' | 'bottom';
}

const TOUR_STEPS: TourStep[] = [
    {
        title: 'Welcome to MEMO Architect',
        description: 'MEMO is a model-based systems engineering tool for medical devices. You\'ll land on the Dashboard — it shows your model health and suggests the next action. Let\'s take a quick tour.',
        target: 'center',
        position: 'center',
    },
    {
        title: 'Model Explorer',
        description: 'Browse your model elements organized by architecture layer. Switch to Views tab to see diagrams grouped by viewpoint.',
        target: 'left panel',
        position: 'left',
    },
    {
        title: 'Unified Canvas',
        description: 'The center area renders your selected view — diagrams, action flows, DSM matrices, and more.',
        target: 'center canvas',
        position: 'center',
    },
    {
        title: 'Properties Panel',
        description: 'View and edit element properties, relationships, and attributes. Select any element to see its details.',
        target: 'right panel',
        position: 'right',
    },
    {
        title: 'Tools Menu',
        description: 'Access analysis tools from the toolbar: DSM, Trace Matrix, Action Flow, Ontology, Scenarios, Diff, Compliance, and Stats.',
        target: 'toolbar',
        position: 'center',
    },
    {
        title: 'Command Palette',
        description: 'Press Cmd+K (or Ctrl+K) to quickly search elements, diagrams, viewpoints, and tools.',
        target: 'keyboard shortcut',
        position: 'center',
    },
    {
        title: 'Working Sets',
        description: 'Save and restore your workspace layout using the Sets tab in the Explorer panel. Great for switching between review contexts.',
        target: 'explorer sets tab',
        position: 'left',
    },
    {
        title: 'You\'re all set!',
        description: 'Start from the Dashboard — it shows your model status and suggests the next step. Use the Workflow Wizard (Tools menu) for a guided path through requirements, risk, and verification.',
        target: 'center',
        position: 'center',
    },
];

export function OnboardingTour() {
    const [visible, setVisible] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);

    useEffect(() => {
        try {
            const completed = localStorage.getItem(TOUR_STORAGE_KEY);
            if (!completed) {
                // Show tour after a brief delay
                const timer = setTimeout(() => setVisible(true), 800);
                return () => clearTimeout(timer);
            }
        } catch {
            // localStorage unavailable
        }
    }, []);

    const dismiss = useCallback(() => {
        setVisible(false);
        try {
            localStorage.setItem(TOUR_STORAGE_KEY, 'true');
        } catch {
            // ignore
        }
    }, []);

    const next = useCallback(() => {
        if (stepIndex >= TOUR_STEPS.length - 1) {
            dismiss();
        } else {
            setStepIndex(stepIndex + 1);
        }
    }, [stepIndex, dismiss]);

    const prev = useCallback(() => {
        if (stepIndex > 0) setStepIndex(stepIndex - 1);
    }, [stepIndex]);

    if (!visible) return null;

    const step = TOUR_STEPS[stepIndex];
    const isLast = stepIndex === TOUR_STEPS.length - 1;
    const isFirst = stepIndex === 0;

    // Position styling based on step target area
    const positionStyle = (): React.CSSProperties => {
        switch (step.position) {
            case 'left':
                return { left: '300px', top: '50%', transform: 'translateY(-50%)' };
            case 'right':
                return { right: '300px', top: '50%', transform: 'translateY(-50%)' };
            case 'bottom':
                return { left: '50%', bottom: '80px', transform: 'translateX(-50%)' };
            case 'center':
            default:
                return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
        }
    };

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 z-50"
                style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
                onClick={dismiss}
            />

            {/* Tour card */}
            <div
                className="fixed z-50 rounded-xl p-5 max-w-sm"
                style={{
                    ...positionStyle(),
                    background: '#FFFFFF',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    border: '1px solid #E5E5E0',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Step indicator */}
                <div className="flex items-center gap-1 mb-3">
                    {TOUR_STEPS.map((_, i) => (
                        <div
                            key={i}
                            className="h-1 rounded-full transition-all"
                            style={{
                                width: i === stepIndex ? '20px' : '8px',
                                background: i === stepIndex ? '#2DD4A8' : i < stepIndex ? '#2DD4A880' : '#E5E5E0',
                            }}
                        />
                    ))}
                </div>

                <h3 className="text-sm font-semibold mb-1.5" style={{ color: '#1B3A4B' }}>
                    {step.title}
                </h3>
                <p className="text-xs leading-relaxed mb-4" style={{ color: '#6B7280' }}>
                    {step.description}
                </p>

                <div className="flex items-center gap-2">
                    {!isFirst && (
                        <button
                            onClick={prev}
                            className="px-3 py-1.5 text-xs rounded-lg"
                            style={{ background: '#F3F4F6', color: '#6B7280' }}
                        >
                            Back
                        </button>
                    )}
                    <div className="flex-1" />
                    <button
                        onClick={dismiss}
                        className="px-3 py-1.5 text-xs rounded-lg"
                        style={{ color: '#9CA3AF' }}
                    >
                        Skip tour
                    </button>
                    <button
                        onClick={next}
                        className="px-4 py-1.5 text-xs font-medium rounded-lg"
                        style={{ background: '#2DD4A8', color: '#FFFFFF' }}
                    >
                        {isLast ? 'Get started' : 'Next'}
                    </button>
                </div>

                <div className="text-center mt-2" style={{ color: '#D1D5DB', fontSize: '10px' }}>
                    {stepIndex + 1} of {TOUR_STEPS.length}
                </div>
            </div>
        </>
    );
}

/** Hook to reset tour (for testing) */
export function resetOnboardingTour(): void {
    try {
        localStorage.removeItem(TOUR_STORAGE_KEY);
    } catch {
        // ignore
    }
}
