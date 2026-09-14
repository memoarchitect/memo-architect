// ─── Diagram embed context ───────────────────────────────────────────────────
//
// The diagram canvas is driven by the store's `selectedDiagramId`, so on its
// own it can show exactly one diagram. A dashboard or document shows several,
// each live. This context overrides the diagram id for its subtree and marks
// the canvas read-only: no palette, no tools, no drag or connect, and every
// layout or model write inside the canvas becomes a no-op.
//
// Liveness needs nothing extra — the canvas already re-renders from the
// `model:update` and `diagram:layout` pushes the store receives.
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext } from 'react';

export interface DiagramEmbed {
    diagramId: string;
    readOnly: true;
}

export const DiagramEmbedContext = createContext<DiagramEmbed | null>(null);

export function useDiagramEmbed(): DiagramEmbed | null {
    return useContext(DiagramEmbedContext);
}
