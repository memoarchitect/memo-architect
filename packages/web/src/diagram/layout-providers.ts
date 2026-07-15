import type { LayoutCapability, LayoutGraph, LayoutProvider, LayoutRunOptions } from './layout-provider';
import { LayoutProviderRegistry } from './layout-provider-registry';
import { DagreLayoutProvider } from './providers/dagre-layout-provider';
import { ElkLayoutProvider } from './providers/elk-layout-provider';
import { FixedLayoutProvider } from './providers/fixed-layout-provider';

export const layoutProviderRegistry = new LayoutProviderRegistry();
layoutProviderRegistry.register(new ElkLayoutProvider());
layoutProviderRegistry.register(new DagreLayoutProvider());
layoutProviderRegistry.register(new FixedLayoutProvider());

export function registerLayoutProvider(provider: LayoutProvider): void {
    layoutProviderRegistry.register(provider);
}

export function listLayoutProviders(required: readonly LayoutCapability[] = []) {
    return layoutProviderRegistry.list(required);
}

export function runLayoutProvider(graph: Readonly<LayoutGraph>, options?: LayoutRunOptions) {
    return layoutProviderRegistry.layout(graph, options);
}
