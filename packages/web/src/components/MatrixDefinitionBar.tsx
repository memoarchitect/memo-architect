// The strip above an open matrix: which definition it is, where it lives, and
// the actions that write it. Shared by the traceability and DSM screens.

import type { DiagramDTO } from '@memoarchitect/tools/browser';
import type { Notice } from '../lib/use-matrix-definition';
import { COLOR, FONT } from '../styles/tokens';

interface Props {
    definition: DiagramDTO;
    editing: boolean;
    onEditingChange: (editing: boolean) => void;
    dirty: boolean;
    connected: boolean;
    rendering: boolean;
    saving: boolean;
    onRender: () => void;
    onSave: () => void;
    notice: Notice;
}

const button = (primary: boolean, enabled: boolean): React.CSSProperties => ({
    padding: '3px 11px', borderRadius: '5px', fontSize: FONT.xs, fontWeight: 600,
    border: primary ? 'none' : `1px solid ${COLOR.border}`,
    background: primary && enabled ? COLOR.accent : COLOR.surface,
    color: primary && enabled ? '#fff' : enabled ? COLOR.primary : COLOR.faint,
    cursor: enabled ? 'pointer' : 'not-allowed',
});

export function MatrixDefinitionBar({
    definition, editing, onEditingChange, dirty, connected, rendering, saving, onRender, onSave, notice,
}: Props) {
    return (
        <div style={{ borderBottom: `1px solid ${COLOR.border}`, background: COLOR.surface }}>
            <div className="flex items-center gap-3 px-4 py-2" style={{ flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: FONT.sm, fontWeight: 700, color: COLOR.primary }}>
                        {definition.name}{dirty && <span title="Unsaved changes" style={{ color: '#B45309' }}> •</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: COLOR.faint }} title={definition.sourceFile}>
                        in {definition.package ?? 'no package'}
                    </div>
                </div>
                <span style={{ flex: 1 }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: FONT.xs, fontWeight: 600, color: COLOR.primary }}>
                    <input
                        type="checkbox" checked={editing} onChange={event => onEditingChange(event.target.checked)}
                        style={{ accentColor: COLOR.accent }}
                    />
                    Edit definition
                </label>
                <button type="button" onClick={onRender} disabled={rendering} style={button(false, !rendering)}
                    title="Evaluate both axes and draw the matrix from the definition as it stands now">
                    {rendering ? 'Rendering…' : 'Render'}
                </button>
                {editing && (
                    <button
                        type="button" onClick={onSave} disabled={!connected || !dirty || saving} style={button(true, connected && dirty && !saving)}
                        title={connected ? 'Write the definition into its package' : 'The dev server is unreachable, so nothing can be written to the model.'}
                    >{saving ? 'Saving…' : 'Save'}</button>
                )}
            </div>
            {notice && (
                <div role={notice.kind === 'error' ? 'alert' : 'status'} style={{
                    padding: '4px 16px', fontSize: '11px',
                    color: notice.kind === 'ok' ? '#0F766E' : '#B91C1C',
                    background: notice.kind === 'ok' ? '#ECFDF5' : '#FEF2F2',
                }}>{notice.message}</div>
            )}
        </div>
    );
}
