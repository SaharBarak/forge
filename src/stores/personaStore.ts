/**
 * Persona Store - Zustand state for Persona Marketplace
 * 
 * Manages marketplace state: browsing, filtering, installed personas,
 * and active persona selection.
 */

import { create } from 'zustand';
import type { CustomPersona, PersonaFilter } from '../lib/personas/types';

type MarketplaceTab = 'browse' | 'installed' | 'create' | 'sandbox';

interface PersonaStore {
  // State
  marketplaceOpen: boolean;
  activeTab: MarketplaceTab;
  allPersonas: CustomPersona[];
  installedIds: Set<string>;
  activeIds: Set<string>;
  selectedPersona: CustomPersona | null;
  previewOpen: boolean;
  filter: PersonaFilter;
  loading: boolean;
  error: string | null;

  // Actions
  setMarketplaceOpen: (open: boolean) => void;
  toggleMarketplace: () => void;
  setActiveTab: (tab: MarketplaceTab) => void;
  setAllPersonas: (personas: CustomPersona[]) => void;
  setInstalledIds: (ids: Set<string>) => void;
  installPersona: (id: string) => void;
  uninstallPersona: (id: string) => void;
  activatePersona: (id: string) => void;
  deactivatePersona: (id: string) => void;
  setSelectedPersona: (persona: CustomPersona | null) => void;
  setPreviewOpen: (open: boolean) => void;
  setFilter: (filter: Partial<PersonaFilter>) => void;
  clearFilter: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePersonaStore = create<PersonaStore>((set) => ({
  marketplaceOpen: false,
  activeTab: 'browse',
  allPersonas: [],
  installedIds: new Set(),
  activeIds: new Set(),
  selectedPersona: null,
  previewOpen: false,
  filter: {},
  loading: false,
  error: null,

  setMarketplaceOpen: (open) => set({ marketplaceOpen: open }),
  toggleMarketplace: () => set((s) => ({ marketplaceOpen: !s.marketplaceOpen })),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setAllPersonas: (personas) => set({ allPersonas: personas }),
  setInstalledIds: (ids) => set({ installedIds: ids }),
  installPersona: (id) => set((s) => {
    const next = new Set(s.installedIds);
    next.add(id);
    return { installedIds: next };
  }),
  uninstallPersona: (id) => set((s) => {
    const next = new Set(s.installedIds);
    next.delete(id);
    const activeNext = new Set(s.activeIds);
    activeNext.delete(id);
    return { installedIds: next, activeIds: activeNext };
  }),
  activatePersona: (id) => set((s) => {
    const next = new Set(s.activeIds);
    next.add(id);
    // Auto-install if not installed
    const installed = new Set(s.installedIds);
    installed.add(id);
    return { activeIds: next, installedIds: installed };
  }),
  deactivatePersona: (id) => set((s) => {
    const next = new Set(s.activeIds);
    next.delete(id);
    return { activeIds: next };
  }),
  setSelectedPersona: (persona) => set({ selectedPersona: persona }),
  setPreviewOpen: (open) => set({ previewOpen: open }),
  setFilter: (filter) => set((s) => ({ filter: { ...s.filter, ...filter } })),
  clearFilter: () => set({ filter: {} }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
