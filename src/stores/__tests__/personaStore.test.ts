/**
 * PersonaStore Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { usePersonaStore } from '../personaStore';

describe('PersonaStore', () => {
  beforeEach(() => {
    const { getState } = usePersonaStore;
    // Reset state
    getState().setMarketplaceOpen(false);
    getState().setActiveTab('browse');
    getState().setInstalledIds(new Set());
    getState().setAllPersonas([]);
    getState().setSelectedPersona(null);
    getState().setPreviewOpen(false);
    getState().clearFilter();
  });

  it('toggles marketplace open state', () => {
    const store = usePersonaStore.getState();
    expect(store.marketplaceOpen).toBe(false);
    store.toggleMarketplace();
    expect(usePersonaStore.getState().marketplaceOpen).toBe(true);
    store.toggleMarketplace();
    expect(usePersonaStore.getState().marketplaceOpen).toBe(false);
  });

  it('installs and uninstalls personas', () => {
    const store = usePersonaStore.getState();
    store.installPersona('persona-1');
    expect(usePersonaStore.getState().installedIds.has('persona-1')).toBe(true);

    store.uninstallPersona('persona-1');
    expect(usePersonaStore.getState().installedIds.has('persona-1')).toBe(false);
  });

  it('activates persona and auto-installs', () => {
    const store = usePersonaStore.getState();
    store.activatePersona('persona-2');
    const state = usePersonaStore.getState();
    expect(state.activeIds.has('persona-2')).toBe(true);
    expect(state.installedIds.has('persona-2')).toBe(true);
  });

  it('deactivates persona', () => {
    const store = usePersonaStore.getState();
    store.activatePersona('persona-3');
    store.deactivatePersona('persona-3');
    expect(usePersonaStore.getState().activeIds.has('persona-3')).toBe(false);
  });

  it('uninstall also deactivates', () => {
    const store = usePersonaStore.getState();
    store.activatePersona('persona-4');
    store.uninstallPersona('persona-4');
    const state = usePersonaStore.getState();
    expect(state.installedIds.has('persona-4')).toBe(false);
    expect(state.activeIds.has('persona-4')).toBe(false);
  });

  it('sets filter and clears filter', () => {
    const store = usePersonaStore.getState();
    store.setFilter({ industry: 'healthcare', search: 'doctor' });
    expect(usePersonaStore.getState().filter.industry).toBe('healthcare');
    expect(usePersonaStore.getState().filter.search).toBe('doctor');

    store.clearFilter();
    expect(usePersonaStore.getState().filter).toEqual({});
  });

  it('sets active tab', () => {
    const store = usePersonaStore.getState();
    store.setActiveTab('create');
    expect(usePersonaStore.getState().activeTab).toBe('create');
  });
});
