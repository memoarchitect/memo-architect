import type { CSSProperties, ReactNode } from 'react';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { LAYER_COLORS, normalizeLayerId } from '../constants';
import { typeLabel } from '../lib/ontology-labels';
import { ControlIcon } from './TraceControls';
import './element-chip.css';

type Element = MemoModelDTO['elements'][string];

/** The colour a diagram gives the element's kind: the colour of the layer it belongs to. */
export function elementColor(element: Element): string {
    return LAYER_COLORS[normalizeLayerId(element.layer ?? '')] ?? '#6B7280';
}

const projectDefinitions = new WeakMap<object, Set<string>>();
/**
 * The ontology kind a chip names as its stereotype. A usage typed by one of the project's own definitions
 * (`part nurse : NurseActor`) is shown by the ontology kind that definition specializes («User»),
 * found by walking the kind registry's supertypes past the project's definitions.
 */
export function stereotypeOf(model: MemoModelDTO, element: Element): string {
    let names = projectDefinitions.get(model);
    if (!names) {
        names = new Set(Object.values(model.elements).filter(item => item.isDefinition).flatMap(item => [item.shortName, item.id.split('::').pop()].filter((name): name is string => !!name)));
        projectDefinitions.set(model, names);
    }
    const kinds = new Map((model.registries?.kinds ?? []).map(kind => [kind.name, kind]));
    let kind = element.kind.split('::').pop() ?? element.kind;
    for (const seen = new Set<string>(); names.has(kind) && !seen.has(kind);) {
        seen.add(kind);
        const parent = kinds.get(kind)?.superType?.split('::').pop();
        if (!parent) break;
        kind = parent;
    }
    return typeLabel(model, kind);
}

/**
 * One model element in a list: a rounded rectangle in its kind's colour, with its stereotype
 * («System function») above its name, as a diagram shows it. Clickable when `onClick` is given,
 * and removable when `onRemove` is.
 */
export function ElementChip({ model, element, onClick, onRemove, removeDisabled, title, children }: {
    model: MemoModelDTO;
    element: Element;
    onClick?: () => void;
    onRemove?: () => void;
    removeDisabled?: boolean;
    title?: string;
    /** Extra text after the name, such as the scenario a step belongs to. */
    children?: ReactNode;
}) {
    const style = { '--chip-color': elementColor(element) } as CSSProperties;
    const body = <>
        <small className="memo-element-chip-stereotype">«{stereotypeOf(model, element)}»</small>
        <span className="memo-element-chip-name">{element.name}</span>
        {children && <small className="memo-element-chip-note">{children}</small>}
    </>;
    return <span className="memo-element-chip" style={style} title={title}>
        {onClick ? <button type="button" className="memo-element-chip-body" onClick={onClick}>{body}</button> : <span className="memo-element-chip-body">{body}</span>}
        {onRemove && <button type="button" className="memo-element-chip-remove" aria-label={`Remove ${element.name}`} disabled={removeDisabled} onClick={onRemove}>{ControlIcon.close}</button>}
    </span>;
}
