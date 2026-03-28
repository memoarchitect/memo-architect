import { useModelStore } from '../store/model-store';
import { FONT, COLOR } from '../styles/tokens';

const SEVERITY_STYLES: Record<string, { color: string; bg: string; icon: string }> = {
    error: { color: '#DC2626', bg: '#FEF2F2', icon: '✖' },
    warning: { color: '#D97706', bg: '#FFFBEB', icon: '⚠' },
    info: { color: '#2563EB', bg: '#EFF6FF', icon: 'ℹ' },
};

export function GapBar() {
    const validation = useModelStore(s => s.validation);
    const selectElement = useModelStore(s => s.selectElement);
    const model = useModelStore(s => s.model);
    const gapBarExpanded = useModelStore(s => s.gapBarExpanded);
    const toggleGapBar = useModelStore(s => s.toggleGapBar);
    const gapBarHeight = useModelStore(s => s.gapBarHeight);
    const metadata = model?.metadata;
    const count = model ? Object.keys(model.elements).length : 0;

    const gitInfo = metadata?.gitUser ? (
        <>
            @{metadata.gitUser}
            {metadata.gitBranch && <> &middot; {metadata.gitBranch}</>}
            {metadata.gitCommitShort && (
                <span style={{ marginLeft: '4px', fontFamily: 'monospace', fontSize: FONT.badge }}>
                    {metadata.gitCommitShort}
                </span>
            )}
        </>
    ) : null;

    const errors = validation?.violations.filter(v => v.severity === 'error') ?? [];
    const warnings = validation?.violations.filter(v => v.severity === 'warning') ?? [];
    const totalViolations = validation?.violations.length ?? 0;

    return (
        <div style={{ background: COLOR.surface, borderTop: `1px solid ${COLOR.border}`, flexShrink: 0 }}>
            {/* ── Summary bar (always visible) ── */}
            <div
                className="flex items-center px-4 gap-3 cursor-pointer select-none"
                style={{ height: '32px', fontSize: FONT.sm }}
                onClick={toggleGapBar}
            >
                {/* Toggle icon */}
                <span
                    style={{
                        color: COLOR.faint,
                        fontSize: '10px',
                        transition: 'transform 150ms ease',
                        transform: gapBarExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                        display: 'inline-block',
                    }}
                >
                    ▼
                </span>

                {/* Tab label */}
                <span style={{ color: COLOR.secondary, fontWeight: 600, fontSize: FONT.xs }}>
                    Problems
                </span>

                {/* Violation counts */}
                {errors.length > 0 && (
                    <span className="flex items-center gap-1" style={{ color: '#DC2626', fontSize: FONT.xs }}>
                        <span style={{ fontSize: '10px' }}>✖</span> {errors.length}
                    </span>
                )}
                {warnings.length > 0 && (
                    <span className="flex items-center gap-1" style={{ color: '#D97706', fontSize: FONT.xs }}>
                        <span style={{ fontSize: '10px' }}>⚠</span> {warnings.length}
                    </span>
                )}
                {totalViolations === 0 && validation && (
                    <span style={{ color: '#10B981', fontSize: FONT.xs }}>✓ No violations</span>
                )}
                {!validation && (
                    <span style={{ color: COLOR.faint, fontSize: FONT.xs }}>Waiting for validation...</span>
                )}

                {/* Right-aligned metadata */}
                <span className="ml-auto" style={{ color: COLOR.faint, fontSize: FONT.xs }}>
                    {validation && <>{validation.rulesEvaluated} rules | {validation.rulesPassed} passed | </>}
                    {count} elements
                    {gitInfo && <> | {gitInfo}</>}
                </span>
            </div>

            {/* ── Expanded violation list ── */}
            {gapBarExpanded && totalViolations > 0 && (
                <div
                    className="overflow-y-auto"
                    style={{
                        maxHeight: `${gapBarHeight}px`,
                        borderTop: `1px solid ${COLOR.borderLight}`,
                    }}
                >
                    {validation!.violations.map((v, i) => {
                        const sev = SEVERITY_STYLES[v.severity] || SEVERITY_STYLES.info;
                        return (
                            <div
                                key={`${v.ruleId}-${v.elementId}-${i}`}
                                className="flex items-center gap-2 px-4 py-1.5 cursor-pointer transition-colors"
                                style={{ color: sev.color, fontSize: FONT.xs }}
                                onMouseEnter={e => (e.currentTarget.style.background = sev.bg)}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                onClick={() => selectElement(v.elementId)}
                            >
                                <span>{sev.icon}</span>
                                <span style={{ color: COLOR.faint }}>[{v.ruleId}]</span>
                                <span className="font-medium">{v.elementKind}/{v.elementName}</span>
                                <span className="truncate flex-1" style={{ color: COLOR.muted }}>{v.description}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
