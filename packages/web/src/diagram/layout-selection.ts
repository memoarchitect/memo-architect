import type { DiagramLayout } from '@memoarchitect/tools/browser';
import { DEFAULT_LAYOUT_PROVIDER_ID, type LayoutProviderDescriptor } from './layout-provider';

export interface SavedLayoutProviderSelection {
    provider: string;
    providerVersion?: string;
    contractVersion?: string;
    preset?: string;
    seed?: number;
    options?: Record<string, unknown>;
}

type DiagramLayoutCanvas = NonNullable<DiagramLayout['canvas']> & {
    layout?: SavedLayoutProviderSelection;
};

export type ProviderAwareDiagramLayout = Omit<DiagramLayout, 'canvas'> & {
    canvas?: DiagramLayoutCanvas;
};

export function asProviderAwareLayout(layout?: DiagramLayout): ProviderAwareDiagramLayout | undefined {
    return layout as ProviderAwareDiagramLayout | undefined;
}

export function selectedLayoutProviderId(layout?: DiagramLayout): string {
    return asProviderAwareLayout(layout)?.canvas?.layout?.provider ?? DEFAULT_LAYOUT_PROVIDER_ID;
}

export function withLayoutProvider(
    layout: DiagramLayout | undefined,
    descriptor: Pick<LayoutProviderDescriptor, 'id' | 'version' | 'contractVersion'>,
): DiagramLayout {
    const current = asProviderAwareLayout(layout) ?? { nodes: {}, edges: {} };
    return {
        ...current,
        canvas: {
            ...current.canvas,
            layout: {
                ...current.canvas?.layout,
                provider: descriptor.id,
                providerVersion: descriptor.version,
                contractVersion: descriptor.contractVersion,
            },
        },
    } as DiagramLayout;
}
