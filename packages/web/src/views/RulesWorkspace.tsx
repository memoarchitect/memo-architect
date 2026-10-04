import { RulesEditor } from '../components/RulesEditor';
import { COLOR, FONT } from '../styles/tokens';

/**
 * The rules a project is checked against, on a page of their own.
 *
 * Part of the regulated workspace, not an advanced surface: each rule says why
 * it exists and which clause of a standard or guidance it enforces, any rule
 * may be tailored on the record, and a project's own rules are written here.
 */
export function RulesWorkspace() {
    return (
        <div className="flex-1 overflow-y-auto" style={{ background: COLOR.surfaceAlt }}>
            <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: COLOR.primary, margin: '0 0 4px' }}>Rules</h1>
                <p style={{ fontSize: FONT.sm, color: COLOR.secondary, margin: '0 0 16px' }}>
                    What this project is checked against, and the clause each rule enforces. You may switch off,
                    downgrade or replace any rule; the record of who decided and why is kept.
                </p>
                <div style={{ background: COLOR.surface, border: `1px solid ${COLOR.border}`, borderRadius: 8 }}>
                    <RulesEditor />
                </div>
            </div>
        </div>
    );
}
