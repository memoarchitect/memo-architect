import {
    DEFAULT_LAYOUT_PROVIDER_ID,
    assertValidLayoutResult,
    type LayoutCapability,
    type LayoutGraph,
    type LayoutProvider,
    type LayoutProviderDescriptor,
    type LayoutRunOptions,
} from './layout-provider';

export class LayoutProviderRegistry {
    private readonly providers = new Map<string, LayoutProvider>();

    register(provider: LayoutProvider): void {
        const existing = this.providers.get(provider.descriptor.id);
        if (existing && existing !== provider) {
            throw new Error(`Layout provider already registered: ${provider.descriptor.id}`);
        }
        this.providers.set(provider.descriptor.id, provider);
    }

    unregister(id: string): boolean {
        return this.providers.delete(id);
    }

    get(id: string): LayoutProvider | undefined {
        return this.providers.get(id);
    }

    list(required: readonly LayoutCapability[] = []): LayoutProviderDescriptor[] {
        return [...this.providers.values()]
            .map(provider => provider.descriptor)
            .filter(descriptor => required.every(capability => descriptor.capabilities.includes(capability)))
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    async layout(graph: Readonly<LayoutGraph>, options: LayoutRunOptions = {}): Promise<LayoutGraph> {
        const id = options.providerId ?? DEFAULT_LAYOUT_PROVIDER_ID;
        const provider = this.providers.get(id);
        if (!provider) throw new Error(`Layout provider not found: ${id}`);

        const support = provider.supports(graph);
        if (!support.supported) {
            throw new Error(`${provider.descriptor.name} cannot layout this diagram${support.reason ? `: ${support.reason}` : ''}`);
        }

        if (options.signal?.aborted) throw options.signal.reason ?? new DOMException('Layout aborted', 'AbortError');
        const output = await provider.layout(graph, options);
        assertValidLayoutResult(graph, output);
        return output;
    }

    async dispose(): Promise<void> {
        await Promise.all([...this.providers.values()].map(provider => provider.dispose?.()));
        this.providers.clear();
    }
}
