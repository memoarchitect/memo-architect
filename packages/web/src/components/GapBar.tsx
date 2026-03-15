import { useModelStore } from '../store/model-store';

const SEVERITY_STYLES: Record<string, { color: string; bg: string; icon: string }> = {
    error: { color: '#DC2626', bg: '#FEF2F2', icon: '✖' },
    warning: { color: '#D97706', bg: '#FFFBEB', icon: '⚠' },
    info: { color: '#2563EB', bg: '#EFF6FF', icon: 'ℹ' },
};

export function GapBar() {
    const validation = useModelStore(s => s.validation);
    const selectElement = useModelStore(s => s.selectElement);

    if (!validation || validation.violations.length === 0) {
        return (
            <div className="h-8 flex items-center px-4" style={{ background: '#FFFFFF', borderTop: '1px solid #E5E5E0' }}>
                <span className="text-xs" style={{ color: '#10B981' }}>
                    {validation ? '✓ No violations' : 'Waiting for validation...'}
                </span>
            </div>
        );
    }

    const errors = validation.violations.filter(v => v.severity === 'error');
    const warnings = validation.violations.filter(v => v.severity === 'warning');

    return (
        <div style={{ background: '#FFFFFF', borderTop: '1px solid #E5E5E0' }}>
            {/* Summary bar */}
            <div className="h-8 flex items-center px-4 gap-3 text-xs">
                {errors.length > 0 && (
                    <span style={{ color: '#DC2626' }}>{errors.length} errors</span>
                )}
                {warnings.length > 0 && (
                    <span style={{ color: '#D97706' }}>{warnings.length} warnings</span>
                )}
                <span className="ml-auto" style={{ color: '#9CA3AF' }}>
                    {validation.rulesEvaluated} rules | {validation.rulesPassed} passed
                </span>
            </div>

            {/* Scrollable violation list */}
            <div className="max-h-28 overflow-y-auto" style={{ borderTop: '1px solid #EDEDEA' }}>
                {validation.violations.map((v, i) => {
                    const sev = SEVERITY_STYLES[v.severity] || SEVERITY_STYLES.info;
                    return (
                        <div
                            key={`${v.ruleId}-${v.elementId}-${i}`}
                            className="flex items-center gap-2 px-4 py-1.5 text-xs cursor-pointer transition-colors"
                            style={{ color: sev.color }}
                            onMouseEnter={e => (e.currentTarget.style.background = sev.bg)}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            onClick={() => selectElement(v.elementId)}
                        >
                            <span>{sev.icon}</span>
                            <span style={{ color: '#9CA3AF' }}>[{v.ruleId}]</span>
                            <span className="font-medium">{v.elementKind}/{v.elementName}</span>
                            <span className="truncate flex-1" style={{ color: '#6B7280' }}>{v.description}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
