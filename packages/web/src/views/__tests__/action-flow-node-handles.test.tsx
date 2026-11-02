// @vitest-environment jsdom
//
// ─── Parameter pins are real handles ────────────────────────────────────────
//
// Regression guard. `actionflow-view.ts` addresses item-flow edges to
// `out:<parameter>` / `in:<parameter>`, and ReactFlow silently drops an edge
// naming a handle that does not exist. The node used to draw its pins as
// decorative spans with only two unnamed handles on the card, so every object
// flow vanished — and since a succession is suppressed when a flow already
// connects the same pair, the actions were left joined by nothing at all.
//
// This renders the node for real rather than asserting on the layout data,
// because the data was never wrong: the handles were missing from the DOM.

import { describe, it, expect } from 'vitest';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { act } from 'react-dom/test-utils';
import { ReactFlowProvider } from '@xyflow/react';
import { ActionFlowNode } from '../ActionFlowNode';

function renderNode(data: Record<string, unknown>): HTMLElement {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
        root.render(createElement(ReactFlowProvider, null,
            createElement(ActionFlowNode as never, {
                id: 'n1', type: 'action', data, selected: false,
                zIndex: 0, isConnectable: true, xPos: 0, yPos: 0, dragging: false,
            } as never)));
    });
    return container;
}

describe('ActionFlowNode parameter pins', () => {
    it('renders one addressable handle per declared port', () => {
        const container = renderNode({
            label: 'validate', nodeType: 'action',
            laneColor: '#000000', layerColor: '#000000',
            inPorts: ['received'], outPorts: ['validated'],
            flowDirection: 'horizontal',
        });

        const handleIds = [...container.querySelectorAll('[data-handleid]')]
            .map(node => node.getAttribute('data-handleid'));

        expect(handleIds).toContain('in:received');
        expect(handleIds).toContain('out:validated');
    });
});

describe('ActionFlowNode title', () => {
    const title = (flowDirection: string) => {
        const container = renderNode({
            label: 'Establish pneumoperitoneum and access', nodeType: 'action',
            laneColor: '#000000', layerColor: '#000000', inPorts: [], outPorts: [], flowDirection,
        });
        // the span that holds the text itself, and the white-space it ends up with
        const text = [...container.querySelectorAll('span')]
            .find(span => span.textContent === 'Establish pneumoperitoneum and access' && !span.querySelector('span'))!;
        let node: HTMLElement | null = text;
        while (node) {
            const value = node.style.whiteSpace;
            if (value && value !== 'inherit') return value;
            node = node.parentElement;
        }
        return 'normal';
    };

    it('wraps a long name when reading left to right, so the card does not clip it', () => {
        expect(title('horizontal')).not.toBe('nowrap');
    });

    it('keeps one line when reading top to bottom, where the name widens its card', () => {
        expect(title('vertical')).toBe('nowrap');
    });
});
