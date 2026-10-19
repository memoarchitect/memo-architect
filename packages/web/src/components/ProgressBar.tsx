// A labelled progress bar for work that takes visible time: counting a large
// query, or building a matrix. `step` of `steps` fills the bar; the label says what is happening.

import { COLOR, FONT } from '../styles/tokens';

export interface ProgressState {
    label: string;
    step: number;
    steps: number;
}

export function ProgressBar({ progress }: { progress: ProgressState }) {
    const percent = Math.max(4, Math.min(100, Math.round((progress.step / progress.steps) * 100)));
    return (
        <div role="progressbar" aria-valuemin={0} aria-valuemax={progress.steps} aria-valuenow={progress.step} aria-label={progress.label}
            style={{ display: 'grid', gap: '4px', width: '100%', maxWidth: '360px' }}>
            <div style={{ fontSize: FONT.xs, color: COLOR.muted }}>{progress.label} ({progress.step} of {progress.steps})</div>
            <div style={{ height: '6px', borderRadius: '3px', background: COLOR.border, overflow: 'hidden' }}>
                <div style={{ width: `${percent}%`, height: '100%', background: COLOR.accent, transition: 'width 160ms ease' }} />
            </div>
        </div>
    );
}
