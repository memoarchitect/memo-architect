import { IBD_ROUTING_TYPES, type IbdRoutingMode, type IbdRoutingType } from '../ibd-routing';

const label = (type: IbdRoutingType) => type[0].toUpperCase() + type.slice(1);

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
    return <div className="flex flex-wrap items-center gap-2 text-xs">
        <label>Routing type <select aria-label="IBD routing type" value={type}
            onChange={event => onTypeChange(event.target.value as IbdRoutingType)} className="rounded border bg-white px-1 py-1">
            {IBD_ROUTING_TYPES.map(value => <option key={value} value={value}>{label(value)}</option>)}
        </select></label>
        <label>Routing mode <select aria-label="IBD routing mode" value={mode}
            onChange={event => onModeChange(event.target.value as IbdRoutingMode)} className="rounded border bg-white px-1 py-1">
            <option value="automatic">Automatic</option><option value="manual">Manual</option>
        </select></label>
        {onSelectedRoutingChange && selectedConnectors > 0 && <label>
            {selectedConnectors === 1 ? 'Selected connector' : `${selectedConnectors} selected connectors`}{' '}
            <select aria-label="Selected connector routing" value={selectedRouting}
                onChange={event => onSelectedRoutingChange(event.target.value === 'diagram' ? undefined : event.target.value as IbdRoutingType)}
                className="rounded border bg-white px-1 py-1">
                {selectedRouting === 'mixed' && <option value="mixed" disabled>Mixed</option>}
                <option value="diagram">As diagram ({label(type)})</option>
                {IBD_ROUTING_TYPES.map(value => <option key={value} value={value}>{label(value)}</option>)}
            </select>
        </label>}
        {onAutoRoute && <button type="button" onClick={onAutoRoute}
            title={selectedConnectors ? 'Route the selected connectors automatically, replacing hand-drawn bends; Undo restores them'
                : 'Route every connector automatically, replacing hand-drawn bends; Undo restores them'}
            className="rounded border px-2 py-1">{selectedConnectors ? 'Auto-route selected' : 'Auto-route all'}</button>}
        {onSpacing && (['parts', 'ports'] as const).map(target => <span key={target} className="inline-flex items-center gap-1">
            {target === 'parts' ? 'Part spacing' : 'Port spacing'}
            {([false, true] as const).map(more => <button key={String(more)} type="button" onClick={() => onSpacing(target, more)}
                aria-label={`${more ? 'More' : 'Less'} space between ${target}`}
                title={`${more ? 'Add' : 'Remove'} space between ${target === 'parts' ? 'the selected parts, their neighbours and their contents' : 'the ports on the selected parts'} (everywhere when nothing is selected)`}
                className="rounded border px-2 py-1">{more ? '+' : '−'}</button>)}
        </span>)}
        {onShortenPorts && <button type="button" disabled={mode !== 'automatic'} onClick={onShortenPorts}
            title="Shorten routes by moving unsaved ordinary ports around their owner perimeters; saved positions stay fixed"
            className="rounded border px-2 py-1 disabled:opacity-40">Shorten automatic port routes</button>}
        {onPlaceAllPorts && <button type="button" disabled={mode !== 'automatic'} onClick={onPlaceAllPorts}
            title="Explicitly replace saved ordinary port positions and wall choices; part geometry stays fixed"
            className="rounded border px-2 py-1 disabled:opacity-40">Automatically place all ports</button>}
        {mode === 'manual'  && <span title="Select a connector. Double-click its line to add a breakpoint; drag a breakpoint to move it; double-click a breakpoint to remove it.">Breakpoints: double-click to add/remove</span>}
    </div>;
}
