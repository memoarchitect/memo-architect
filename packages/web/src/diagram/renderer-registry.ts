import {
    DEFAULT_RENDERER_ID,
    type DiagramCanvasComponent,
    type DiagramRendererProvider,
    type RendererCapability,
    type RendererDescriptor,
} from './renderer-provider';

export class RendererRegistry {
    private readonly providers = new Map<string, DiagramRendererProvider>();
    private readonly components = new Map<string, Promise<DiagramCanvasComponent>>();

    register(provider: DiagramRendererProvider): void {
        const existing = this.providers.get(provider.descriptor.id);
        if (existing && existing !== provider) {
            throw new Error(`Renderer provider already registered: ${provider.descriptor.id}`);
        }
        this.providers.set(provider.descriptor.id, provider);
    }

    unregister(id: string): boolean {
        this.components.delete(id);
        return this.providers.delete(id);
    }

    get(id: string): DiagramRendererProvider | undefined {
        return this.providers.get(id);
    }

    has(id: string): boolean {
        return this.providers.has(id);
    }

    list(required: readonly RendererCapability[] = []): RendererDescriptor[] {
        return [...this.providers.values()]
            .map(provider => provider.descriptor)
            .filter(descriptor => required.every(capability => descriptor.capabilities.includes(capability)))
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Resolve a renderer id to a canvas component, falling back to the default
     * renderer when the requested id is unknown (e.g. a stale feature flag).
     * Component loads are memoized so switching back is instant.
     */
    loadComponent(id: string): Promise<DiagramCanvasComponent> {
        const provider = this.providers.get(id) ?? this.providers.get(DEFAULT_RENDERER_ID);
        if (!provider) throw new Error(`Renderer provider not found: ${id} (no default registered)`);
        const key = provider.descriptor.id;
        let loading = this.components.get(key);
        if (!loading) {
            loading = provider.loadComponent();
            this.components.set(key, loading);
        }
        return loading;
    }
}
