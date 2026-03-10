import { useModelStore } from '../store/model-store';

const SEVERITY_COLORS = {
    error: 'text-red-400 bg-red-500/10',
    warning: 'text-amber-400 bg-amber-500/10',
    info: 'text-blue-400 bg-blue-500/10',
};

const SEVERITY_ICONS = {
    error: '✖',
    warning: '⚠',
    info: 'ℹ',
};

export function GapBar() {
    const validation = useModelStore(s => s.validation);
    const selectElement = useModelStore(s => s.selectElement);

    if (!validation || validation.violations.length === 0) {
        return (
            <div className="h-7 bg-slate-800 border-t border-slate-700 flex items-center px-4">
                <span className="text-xs text-emerald-400">
                    {validation ? '✓ No violations' : 'Waiting for validation...'}
                </span>
            </div>
        );
    }

    const errors = validation.violations.filter(v => v.severity === 'error');
    const warnings = validation.violations.filter(v => v.severity === 'warning');

    return (
        <div className="bg-slate-800 border-t border-slate-700">
            {/* Summary bar */}
            <div className="h-7 flex items-center px-4 gap-3 text-xs">
                {errors.length > 0 && (
                    <span className="text-red-400">{errors.length} errors</span>
                )}
                {warnings.length > 0 && (
                    <span className="text-amber-400">{warnings.length} warnings</span>
                )}
                <span className="text-slate-500 ml-auto">
                    {validation.rulesEvaluated} rules | {validation.rulesPassed} passed
                </span>
            </div>

            {/* Scrollable violation list (max 4 rows visible) */}
            <div className="max-h-28 overflow-y-auto border-t border-slate-700/50">
                {validation.violations.map((v, i) => (
                    <div
                        key={`${v.ruleId}-${v.elementId}-${i}`}
                        className={`flex items-center gap-2 px-4 py-1 text-xs cursor-pointer hover:bg-slate-700/30 ${
                            SEVERITY_COLORS[v.severity]
                        }`}
                        onClick={() => selectElement(v.elementId)}
                    >
                        <span>{SEVERITY_ICONS[v.severity]}</span>
                        <span className="text-slate-500">[{v.ruleId}]</span>
                        <span className="font-medium">{v.elementKind}/{v.elementName}</span>
                        <span className="text-slate-400 truncate flex-1">{v.description}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
