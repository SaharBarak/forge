/**
 * ProviderRegistry — central lookup for chat-model providers.
 *
 * Constructed once in `cli/index.ts`, injected into the orchestrator.
 * Agents never import providers directly; they call
 * `registry.get(providerId).query(...)`. This keeps provider lifecycles
 * (auth, SDK clients) out of the hot agent path.
 */

import type { IProvider } from './IProvider';

export class ProviderRegistry {
  private readonly providers = new Map<string, IProvider>();
  private defaultId: string | null = null;

  register(provider: IProvider, opts: { asDefault?: boolean } = {}): void {
    this.providers.set(provider.id, provider);
    if (opts.asDefault || this.defaultId === null) {
      this.defaultId = provider.id;
    }
  }

  get(id: string): IProvider {
    const p = this.providers.get(id);
    if (!p) {
      throw new Error(
        `Unknown provider '${id}'. Available: ${Array.from(this.providers.keys()).join(', ') || 'none'}`
      );
    }
    return p;
  }

  tryGet(id: string): IProvider | undefined {
    return this.providers.get(id);
  }

  list(): ReadonlyArray<IProvider> {
    return Array.from(this.providers.values());
  }

  listAvailable(): ReadonlyArray<IProvider> {
    return this.list().filter((p) => p.isAvailable());
  }

  getDefault(): IProvider {
    if (!this.defaultId) {
      throw new Error('ProviderRegistry is empty — register at least one provider');
    }
    return this.get(this.defaultId);
  }

  has(id: string): boolean {
    return this.providers.has(id);
  }
}
