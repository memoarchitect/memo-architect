import type {
    DiagramTemplateDescriptor,
    DiagramTemplateProvider,
    TemplateSelectionContext,
} from './template-provider';

/**
 * Ordered template registry: registration order encodes selection precedence
 * (first match wins), so built-ins reproduce the dispatch order they replaced
 * and a plug-in registered later can only claim contexts no built-in matches —
 * or be registered via `registerBefore` to take precedence deliberately.
 */
export class TemplateRegistry {
    private readonly providers: DiagramTemplateProvider[] = [];
    private readonly byId = new Map<string, DiagramTemplateProvider>();

    register(provider: DiagramTemplateProvider, beforeId?: string): void {
        const existing = this.byId.get(provider.descriptor.id);
        if (existing && existing !== provider) {
            throw new Error(`Template provider already registered: ${provider.descriptor.id}`);
        }
        if (existing) return;
        this.byId.set(provider.descriptor.id, provider);
        const at = beforeId ? this.providers.findIndex(p => p.descriptor.id === beforeId) : -1;
        if (at >= 0) this.providers.splice(at, 0, provider);
        else this.providers.push(provider);
    }

    unregister(id: string): boolean {
        const provider = this.byId.get(id);
        if (!provider) return false;
        this.byId.delete(id);
        this.providers.splice(this.providers.indexOf(provider), 1);
        return true;
    }

    get(id: string): DiagramTemplateProvider | undefined {
        return this.byId.get(id);
    }

    has(id: string): boolean {
        return this.byId.has(id);
    }

    /** Descriptors in precedence order (never sorted — order is meaning). */
    list(): DiagramTemplateDescriptor[] {
        return this.providers.map(provider => provider.descriptor);
    }

    /** First registered provider whose predicate accepts the context. */
    select(context: TemplateSelectionContext): DiagramTemplateProvider {
        const provider = this.providers.find(p => p.matches(context));
        if (!provider) {
            throw new Error('No diagram template matches this view — register a catch-all provider');
        }
        return provider;
    }
}
