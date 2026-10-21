import { IBD_ROUTING_TYPES, type IbdRoutingMode, type IbdRoutingType } from '../ibd-routing';

export function IbdRoutingControls({ type, mode, onTypeChange, onModeChange, onShortenPorts, onPlaceAllPorts }: {
    onShortenPorts?: () => void;
    onPlaceAllPorts?: () => void;
    type: IbdRoutingType; mode: IbdRoutingMode;
    onTypeChange: (type: IbdRoutingType) => void;
    onModeChange: (mode: IbdRoutingMode) => void;
}) {
    return <div className="flex flex-wrap items-center gap-2 text-xs">
        <label>Routing type <select aria-label="IBD routing type" value={type}
            onChange={event => onTypeChange(event.target.value as IbdRoutingType)} className="rounded border bg-white px-1 py-1">
            {IBD_ROUTING_TYPES.map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
        </select></label>
        <label>Routing mode <select aria-label="IBD routing mode" value={mode}
            onChange={event => onModeChange(event.target.value as IbdRoutingMode)} className="rounded border bg-white px-1 py-1">
            <option value="automatic">Automatic</option><option value="manual">Manual</option>
        </select></label>
        {onShortenPorts && <button type="button" disabled={mode !== 'automatic'} onClick={onShortenPorts}
            title="Shorten routes by moving unsaved ordinary ports around their owner perimeters; saved positions stay fixed"
            className="rounded border px-2 py-1 disabled:opacity-40">Shorten automatic port routes</button>}
        {onPlaceAllPorts && <button type="button" disabled={mode !== 'automatic'} onClick={onPlaceAllPorts}
            title="Explicitly replace saved ordinary port positions and wall choices; part geometry stays fixed"
            className="rounded border px-2 py-1 disabled:opacity-40">Automatically place all ports</button>}
        {mode === 'manual'  && <span title="Select a connector. Double-click its line to add a breakpoint; drag a breakpoint to move it; double-click a breakpoint to remove it.">Breakpoints: double-click to add/remove</span>}
    </div>;
}
