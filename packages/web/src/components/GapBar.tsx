import { useState, useRef, useCallback, useEffect } from 'react';
import { useModelStore } from '../store/model-store';
import { LAYER_LABELS } from '../constants';
import { FONT, COLOR } from '../styles/tokens';

// Inject keyframes for pulse animation once
const PULSE_STYLE_ID = 'memo-gapbar-pulse';
if (typeof document !== 'undefined' && !document.getElementById(PULSE_STYLE_ID)) {
    const s = document.createElement('style');
    s.id = PULSE_STYLE_ID;
    s.textContent = `
        @keyframes memo-pulse-red {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.35; }
        }
    `;
    document.head.appendChild(s);
}

const SEVERITY_STYLES: Record<string, { color: string; bg: string; icon: string }> = {
    error: { color: '#DC2626', bg: '#FEF2F2', icon: '✖' },
    warning: { color: '#D97706', bg: '#FFFBEB', icon: '⚠' },
    info: { color: '#2563EB', bg: '#EFF6FF', icon: 'ℹ' },
};

type BottomTab = 'problems' | 'completeness';

export function GapBar() {
    const validation = useModelStore(s => s.validation);
    const analysisIssues = useModelStore(s => s.analysisIssues);
    const selectElement = useModelStore(s => s.selectElement);
    const model = useModelStore(s => s.model);
    const completeness = useModelStore(s => s.completeness);
    const gapBarExpanded = useModelStore(s => s.gapBarExpanded);
    const toggleGapBar = useModelStore(s => s.toggleGapBar);
    const gapBarHeight = useModelStore(s => s.gapBarHeight);
    const setGapBarHeight = useModelStore(s => s.setGapBarHeight);

    const [activeTab, setActiveTab] = useState<BottomTab>('problems');
    const isDragging = useRef(false);
    const dragStartY = useRef(0);
    const dragStartHeight = useRef(0);

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
    const analysisWarnings = analysisIssues.filter(i => i.severity === 'warning').length;
    const hasAnyIssues = totalViolations > 0 || analysisIssues.length > 0;
    const hasCompleteness = !!completeness;
    const hasBothTabs = hasAnyIssues && hasCompleteness;

    // Completeness visible layers
    const visibleLayers = completeness?.layers.filter(l => l.totalElements > 0) ?? [];

    // Resize handle
    const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        dragStartY.current = e.clientY;
        dragStartHeight.current = gapBarHeight;

        const onMouseMove = (ev: MouseEvent) => {
            if (!isDragging.current) return;
            const delta = dragStartY.current - ev.clientY;
            setGapBarHeight(dragStartHeight.current + delta);
        };
        const onMouseUp = () => {
            isDragging.current = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [gapBarHeight, setGapBarHeight]);

    return (
        <div style={{ background: COLOR.surface, borderTop: `1px solid ${COLOR.border}`, flexShrink: 0 }}>
            {/* ── Resize handle (only when expanded) ── */}
            {gapBarExpanded && (
                <div
                    style={{
                        height: '4px', cursor: 'row-resize',
                        background: 'transparent', flexShrink: 0,
                    }}
                    onMouseDown={handleResizeMouseDown}
                    onMouseEnter={e => { e.currentTarget.style.background = COLOR.accent + '40'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                />
            )}

            {/* ── Status bar (always visible) ── */}
            <div
                className="flex items-center px-4 gap-3 cursor-pointer select-none"
                style={{ height: '32px', fontSize: FONT.sm }}
                onClick={toggleGapBar}
            >
                {/* Toggle chevron */}
                <span style={{
                    color: COLOR.faint, fontSize: '10px',
                    transition: 'transform 150ms ease',
                    transform: gapBarExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                    display: 'inline-block',
                }}>▼</span>

                {/* Problems label + counts */}
                <span style={{ color: COLOR.secondary, fontWeight: 600, fontSize: FONT.xs }}>Problems</span>
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
                {analysisWarnings > 0 && (
                    <span className="flex items-center gap-1" style={{ color: '#D97706', fontSize: FONT.xs }}>
                        <span style={{ fontSize: '9px', opacity: 0.7 }}>DSM</span>
                        <span style={{ fontSize: '10px' }}>⚠</span> {analysisWarnings}
                    </span>
                )}
                {!hasAnyIssues && validation && (
                    <span style={{ color: '#10B981', fontSize: FONT.xs }}>✓ No problems</span>
                )}
                {!validation && (
                    <span style={{ color: COLOR.faint, fontSize: FONT.xs }}>Waiting for validation…</span>
                )}

                {/* Completeness inline summary (#20) */}
                {hasCompleteness && (
                    <>
                        <div style={{ width: '1px', height: '14px', background: COLOR.border, flexShrink: 0 }} />
                        <span style={{ color: COLOR.secondary, fontWeight: 600, fontSize: FONT.xs }}>Completeness</span>
                        <span style={{ color: completeness!.overall >= 80 ? '#10B981' : completeness!.overall >= 50 ? '#D97706' : '#DC2626', fontSize: FONT.xs, fontWeight: 600 }}>
                            {completeness!.overall}%
                        </span>
                        {/* Layer dots — 8px squares, opacity = completeness% */}
                        <div className="flex items-center gap-0.5">
                            {visibleLayers.map(layer => {
                                const isLow = layer.percentage < 40;
                                return (
                                    <div
                                        key={layer.layerId}
                                        title={`${LAYER_LABELS[layer.layerId] || layer.layerLabel}: ${layer.percentage}%`}
                                        style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: '2px',
                                            background: layer.layerColor,
                                            opacity: Math.max(layer.percentage / 100, 0.12),
                                            flexShrink: 0,
                                            animation: isLow ? 'memo-pulse-red 1.4s ease-in-out infinite' : 'none',
                                            cursor: 'default',
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Right-aligned metadata */}
                <span className="ml-auto flex items-center gap-1" style={{ fontSize: FONT.xs }}>
                    {validation && (
                        <span style={{ color: COLOR.faint }}>
                            {validation.rulesEvaluated} rules | {validation.rulesPassed} passed |{' '}
                        </span>
                    )}
                    <strong style={{ color: COLOR.secondary, fontWeight: 700 }}>{count} elements</strong>
                    {model && (
                        <>
                            <span style={{ color: COLOR.faint }}> · </span>
                            <strong style={{ color: COLOR.secondary, fontWeight: 700 }}>{model.relationships.length} rels</strong>
                        </>
                    )}
                    {gitInfo && <span style={{ color: COLOR.faint }}> | {gitInfo}</span>}
                </span>
            </div>

            {/* ── Expanded panel ── */}
            {gapBarExpanded && (
                <div style={{ borderTop: `1px solid ${COLOR.borderLight}` }}>
                    {/* Tab bar — only shown when both Problems and Completeness have content */}
                    {hasBothTabs && (
                        <div className="flex" style={{ borderBottom: `1px solid ${COLOR.border}`, background: '#FAFAF8' }}>
                            {(['problems', 'completeness'] as BottomTab[]).map(tab => (
                                <button
                                    key={tab}
                                    onClick={e => { e.stopPropagation(); setActiveTab(tab); }}
                                    className="px-4 py-1.5 font-medium transition-colors"
                                    style={{
                                        fontSize: FONT.xs,
                                        borderBottom: activeTab === tab ? `2px solid ${COLOR.accent}` : '2px solid transparent',
                                        color: activeTab === tab ? COLOR.accentDark : COLOR.faint,
                                        background: 'transparent',
                                    }}
                                >
                                    {tab === 'problems'
                                        ? `Problems (${totalViolations + analysisIssues.length})`
                                        : `Completeness ${completeness!.overall}%`}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* ── Problems content ── */}
                    {(activeTab === 'problems' || !hasBothTabs) && (
                        <div className="overflow-y-auto" style={{ maxHeight: `${gapBarHeight}px` }}>
                            {hasAnyIssues ? (
                                <>
                                    {/* Validation violations */}
                                    {totalViolations > 0 && validation?.violations.map((v, i) => {
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
                                    {/* Analysis issues */}
                                    {analysisIssues.length > 0 && (
                                        <>
                                            {totalViolations > 0 && (
                                                <div style={{ padding: '4px 16px', fontSize: '10px', fontWeight: 600, color: COLOR.faint, background: COLOR.surfaceAlt, borderTop: `1px solid ${COLOR.border}`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                    DSM Analysis
                                                </div>
                                            )}
                                            {analysisIssues.map(issue => {
                                                const sev = SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.info;
                                                return (
                                                    <div
                                                        key={issue.id}
                                                        className="flex items-center gap-2 px-4 py-1.5 cursor-pointer transition-colors"
                                                        style={{ color: sev.color, fontSize: FONT.xs }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = sev.bg)}
                                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                        onClick={() => selectElement(issue.elementId)}
                                                    >
                                                        <span>{sev.icon}</span>
                                                        <span style={{ color: COLOR.faint }}>[{issue.source}]</span>
                                                        <span className="font-medium">{issue.elementName}</span>
                                                        <span className="truncate flex-1" style={{ color: COLOR.muted }}>{issue.message}</span>
                                                        {issue.tag && (
                                                            <span style={{ flexShrink: 0, fontSize: '9px', padding: '1px 5px', borderRadius: '4px', background: '#E5E7EB', color: '#374151' }}>
                                                                {issue.tag}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                </>
                            ) : (
                                <div className="px-4 py-3" style={{ color: COLOR.faint, fontSize: FONT.xs }}>
                                    {validation ? '✓ No problems found' : 'Waiting for validation…'}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Completeness content ── */}
                    {(activeTab === 'completeness' || !hasBothTabs) && hasCompleteness && (
                        <div className="overflow-y-auto" style={{ maxHeight: `${gapBarHeight}px` }}>
                            {/* Overall progress bar */}
                            <div className="px-4 py-2 flex items-center gap-3" style={{ borderBottom: `1px solid ${COLOR.borderLight}` }}>
                                <span style={{ fontWeight: 700, fontSize: '18px', color: completeness!.overall >= 80 ? '#10B981' : completeness!.overall >= 50 ? '#D97706' : '#DC2626' }}>
                                    {completeness!.overall}%
                                </span>
                                <div className="flex-1 flex items-center gap-0.5" style={{ height: '8px' }}>
                                    {visibleLayers.map(layer => {
                                        const w = Math.max((layer.totalElements / completeness!.totalElements) * 100, 2);
                                        return (
                                            <div key={layer.layerId} style={{ width: `${w}%`, height: '100%', background: layer.layerColor + '30', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{ width: `${layer.percentage}%`, height: '100%', background: layer.layerColor, borderRadius: '4px' }} />
                                            </div>
                                        );
                                    })}
                                </div>
                                <span style={{ color: COLOR.faint, fontSize: FONT.xs }}>
                                    {completeness!.completeElements}/{completeness!.totalElements}
                                </span>
                            </div>
                            {/* Per-layer grid */}
                            <div className="px-4 py-2 grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                                {visibleLayers.map(layer => (
                                    <div key={layer.layerId} className="flex items-center gap-2" style={{ fontSize: FONT.xs }}>
                                        <span className="w-2.5 h-2.5 rounded flex-shrink-0" style={{ backgroundColor: layer.layerColor }} />
                                        <span className="flex-1 truncate" style={{ color: '#374151' }}>
                                            {LAYER_LABELS[layer.layerId] || layer.layerLabel}
                                        </span>
                                        <span style={{ color: '#6B7280' }}>{layer.percentage}%</span>
                                        <span style={{ color: '#9CA3AF' }}>({layer.completeElements}/{layer.totalElements})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
