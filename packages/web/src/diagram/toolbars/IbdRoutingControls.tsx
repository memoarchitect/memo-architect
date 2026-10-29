import { useState, type ReactNode } from 'react';
import { IBD_ROUTING_TYPES, type IbdRoutingMode, type IbdRoutingType } from '../ibd-routing';
import { Icon, IconToggle } from '../../views/DiagramToolbarControls';

const label = (type: IbdRoutingType) => type[0].toUpperCase() + type.slice(1);

const ROUTE_ICONS: Record<IbdRoutingType, ReactNode> = {
    manhattan: <Icon.routeManhattan />, orthogonal: <Icon.routeOrthogonal />, straight: <Icon.routeStraight />,
    elbow: <Icon.routeElbow />, rounded: <Icon.routeRounded />, curved: <Icon.routeCurved />, arc: <Icon.routeArc />,
};

const COMPACT_KEY = 'memo.ibd.controls.compact';
const readCompact = () => { try { return localStorage.getItem(COMPACT_KEY) === 'true'; } catch { return false; } };

/** One icon tile per choice, so the controls read in the toolbar dock's own idiom: groups under captions, labels in tooltips. */
export function IbdRoutingControls({ type, mode, onTypeChange, onModeChange, onShortenPorts, onPlaceAllPorts,
    selectedConnectors = 0, selectedRouting = 'diagram', onSelectedRoutingChange, onAutoRoute, onSpacing }: {
    onShortenPorts?: () => void;
    onPlaceAllPorts?: () => void;
    type: IbdRoutingType; mode: IbdRoutingMode;
    onTypeChange: (type: IbdRoutingType) => void;
    onModeChange: (mode: IbdRoutingMode) => void;
    /** How many connectors are selected, and the routing they share. */
    selectedConnectors?: number;
    selectedRouting?: IbdRoutingType | 'diagram' | 'mixed';
    /** Undefined clears the selected connectors' own type. */
    onSelectedRoutingChange?: (type: IbdRoutingType | undefined) => void;
    onAutoRoute?: () => void;
    /** Add (more) or remove space between parts, or between ports. */
    onSpacing?: (target: 'parts' | 'ports', more: boolean) => void;
}) {
    const automatic = mode === 'automatic';
    // Compact drops the group captions, leaving one run of icon tiles in the same order in the dock and the strip.
    const [compact, setCompact] = useState(readCompact);
    const toggleCompact = () => setCompact(value => {
        try { localStorage.setItem(COMPACT_KEY, String(!value)); } catch { /* the choice just won't be remembered */ }
        return !value;
    });
    const caption = (text: string) => compact ? null : <div className="memo-diagram-tools__caption">{text}</div>;
    return <>
        {caption('Routing')}
        {IBD_ROUTING_TYPES.map(value => <IconToggle key={value} icon={ROUTE_ICONS[value]} active={type === value}
            title={`${label(value)} connectors`} onClick={() => onTypeChange(value)} />)}
        {caption('Placement')}
        <IconToggle icon={<Icon.automatic />} active={automatic} title="Automatic routing" onClick={() => onModeChange('automatic')} />
        <IconToggle icon={<Icon.manual />} active={!automatic} onClick={() => onModeChange('manual')}
            title="Manual routing. Select a connector, double-click its line to add a breakpoint, drag a breakpoint to move it, double-click a breakpoint to remove it." />
        {onSelectedRoutingChange && selectedConnectors > 0 && <label style={{ gridColumn: '1 / -1', fontSize: 11 }}
            title={selectedConnectors === 1 ? 'Selected connector' : `${selectedConnectors} selected connectors`}>
            {selectedConnectors === 1 ? 'Selected' : `${selectedConnectors} selected`}
            <select aria-label="Selected connector routing" value={selectedRouting}
                onChange={event => onSelectedRoutingChange(event.target.value === 'diagram' ? undefined : event.target.value as IbdRoutingType)}
                className="w-full rounded border bg-white px-1 py-1">
                {selectedRouting === 'mixed' && <option value="mixed" disabled>Mixed</option>}
                <option value="diagram">As diagram</option>
                {IBD_ROUTING_TYPES.map(value => <option key={value} value={value}>{label(value)}</option>)}
            </select>
        </label>}
        {(onAutoRoute || onShortenPorts || onPlaceAllPorts) && caption('Tidy')}
        {onAutoRoute && <IconToggle icon={<Icon.tidy />} onClick={onAutoRoute}
            title={selectedConnectors ? 'Auto-route selected connectors, replacing hand-drawn bends; Undo restores them'
                : 'Auto-route every connector, replacing hand-drawn bends; Undo restores them'} />}
        {onShortenPorts && <IconToggle icon={<Icon.shorten />} onClick={automatic ? onShortenPorts : () => undefined}
            title={automatic ? 'Shorten routes by moving unsaved ports around their owners; saved positions stay fixed'
                : 'Shorten automatic port routes (switch to automatic routing first)'} />}
        {onPlaceAllPorts && <IconToggle icon={<Icon.ports />} onClick={automatic ? onPlaceAllPorts : () => undefined}
            title={automatic ? 'Place all ports automatically, replacing saved positions and wall choices; part geometry stays fixed'
                : 'Place all ports automatically (switch to automatic routing first)'} />}
        {onSpacing && <>
            {caption('Spacing')}
            {(['parts', 'ports'] as const).map(target => <div key={target} className="memo-ibd-spacing" style={{ gridColumn: '1 / -1' }}>
                <span style={{ fontSize: 11, color: '#5B6470' }}>{target === 'parts' ? 'Parts' : 'Ports'}</span>
                <div className="memo-ibd-spacing__steps">
                    {([false, true] as const).map(more => <IconToggle key={String(more)} fullWidth
                        icon={more ? <Icon.plus /> : <Icon.minus />} onClick={() => onSpacing(target, more)}
                        title={`${more ? 'Add' : 'Remove'} space between ${target === 'parts' ? 'the selected parts, their neighbours and their contents' : 'the ports on the selected parts'} (everywhere when nothing is selected)`} />)}
                </div>
            </div>)}
        </>}
        <IconToggle icon={<Icon.captions />} active={compact} onClick={toggleCompact}
            title={compact ? 'Show group labels' : 'Hide group labels: one compact run of icons'} />
    </>;
}
