/**
 * PersonaMarketplace - Full marketplace experience for browsing,
 * searching, previewing, installing, and activating personas.
 *
 * Integrates PersonaLibrary, PersonaCreatorWizard, and PersonaSandbox
 * into a unified marketplace UI.
 *
 * Part of Epic: Persona Marketplace (#3)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { usePersonaStore } from '../../stores/personaStore';
import { INDUSTRY_PERSONAS } from '../../lib/personas/industry-personas';
import { AGENT_PERSONAS } from '../../agents/personas';
import type { CustomPersona } from '../../lib/personas/types';
import type { AgentPersona } from '../../types';
import { PersonaCreatorWizard } from './PersonaCreatorWizard';
import { PersonaSandbox } from './PersonaSandbox';

// ============================================================================
// TYPES
// ============================================================================

type MarketplaceTab = 'browse' | 'installed' | 'create' | 'sandbox';

interface CategoryInfo {
  id: string;
  label: string;
  labelHe: string;
  icon: string;
  count: number;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Extract unique industries from personas */
function extractCategories(personas: CustomPersona[]): CategoryInfo[] {
  const industryMap = new Map<string, number>();
  personas.forEach((p) => {
    const ind = p.industry || 'general';
    industryMap.set(ind, (industryMap.get(ind) || 0) + 1);
  });

  const industryLabels: Record<string, { en: string; he: string; icon: string }> = {
    healthcare: { en: 'Healthcare', he: 'בריאות', icon: '🏥' },
    finance: { en: 'Finance', he: 'פיננסים', icon: '💰' },
    education: { en: 'Education', he: 'חינוך', icon: '📚' },
    retail: { en: 'Retail', he: 'קמעונאות', icon: '🛍️' },
    technology: { en: 'Technology', he: 'טכנולוגיה', icon: '💻' },
    legal: { en: 'Legal', he: 'משפטי', icon: '⚖️' },
    'real-estate': { en: 'Real Estate', he: 'נדל"ן', icon: '🏠' },
    hospitality: { en: 'Hospitality', he: 'אירוח', icon: '🏨' },
    nonprofit: { en: 'Nonprofit', he: 'מלכ"רים', icon: '🤝' },
    government: { en: 'Government', he: 'ממשל', icon: '🏛️' },
    general: { en: 'General', he: 'כללי', icon: '👤' },
  };

  return Array.from(industryMap.entries()).map(([id, count]) => {
    const info = industryLabels[id] || { en: id, he: id, icon: '📦' };
    return { id, label: info.en, labelHe: info.he, icon: info.icon, count };
  });
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Persona preview card for marketplace grid */
function PersonaCard({
  persona,
  isInstalled,
  isActive,
  onPreview,
  onInstall,
  onUninstall,
  onActivate,
  onDeactivate,
  hebrewMode,
}: {
  persona: CustomPersona;
  isInstalled: boolean;
  isActive: boolean;
  onPreview: () => void;
  onInstall: () => void;
  onUninstall: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  hebrewMode: boolean;
}) {
  const colorMap: Record<string, string> = {
    pink: '#ff79c6',
    green: '#50fa7b',
    purple: '#bd93f9',
    orange: '#ffb86c',
    blue: '#58a6ff',
    cyan: '#8be9fd',
    yellow: '#f1fa8c',
    red: '#ff5555',
    gray: '#6272a4',
  };
  const accentColor = colorMap[persona.color] || '#58a6ff';

  return (
    <div
      style={{
        background: '#161b22',
        border: `1px solid ${isActive ? accentColor : '#30363d'}`,
        borderRadius: '8px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
      onClick={onPreview}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = accentColor;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = isActive ? accentColor : '#30363d';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Status badges */}
      <div style={{ display: 'flex', gap: '6px', position: 'absolute', top: '8px', right: '8px' }}>
        {isActive && (
          <span
            style={{
              fontSize: '10px',
              background: '#238636',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: '10px',
            }}
          >
            Active
          </span>
        )}
        {isInstalled && !isActive && (
          <span
            style={{
              fontSize: '10px',
              background: '#30363d',
              color: '#8b949e',
              padding: '2px 6px',
              borderRadius: '10px',
            }}
          >
            Installed
          </span>
        )}
        {persona.isBuiltIn && (
          <span
            style={{
              fontSize: '10px',
              background: '#1f2937',
              color: '#58a6ff',
              padding: '2px 6px',
              borderRadius: '10px',
            }}
          >
            Built-in
          </span>
        )}
      </div>

      {/* Avatar + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: accentColor + '33',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            color: accentColor,
            fontWeight: 'bold',
            flexShrink: 0,
          }}
        >
          {persona.avatar || persona.name.charAt(0)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              color: '#e6edf3',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {hebrewMode ? persona.nameHe || persona.name : persona.name}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#8b949e',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {persona.role}
          </div>
        </div>
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: '12px',
          color: '#8b949e',
          lineHeight: '1.4',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {hebrewMode ? persona.descriptionHe || persona.description : persona.description}
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {persona.tags?.slice(0, 3).map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: '10px',
              background: '#21262d',
              color: '#8b949e',
              padding: '2px 6px',
              borderRadius: '10px',
            }}
          >
            {tag}
          </span>
        ))}
        {(persona.tags?.length || 0) > 3 && (
          <span style={{ fontSize: '10px', color: '#6e7681' }}>
            +{persona.tags!.length - 3}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div
        style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {!isInstalled ? (
          <button
            onClick={onInstall}
            style={{
              flex: 1,
              padding: '6px 12px',
              fontSize: '12px',
              background: '#238636',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {hebrewMode ? 'התקן' : 'Install'}
          </button>
        ) : isActive ? (
          <button
            onClick={onDeactivate}
            style={{
              flex: 1,
              padding: '6px 12px',
              fontSize: '12px',
              background: '#21262d',
              color: '#f85149',
              border: '1px solid #f85149',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {hebrewMode ? 'בטל הפעלה' : 'Deactivate'}
          </button>
        ) : (
          <>
            <button
              onClick={onActivate}
              style={{
                flex: 1,
                padding: '6px 12px',
                fontSize: '12px',
                background: '#238636',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {hebrewMode ? 'הפעל' : 'Activate'}
            </button>
            <button
              onClick={onUninstall}
              style={{
                padding: '6px 8px',
                fontSize: '12px',
                background: '#21262d',
                color: '#8b949e',
                border: '1px solid #30363d',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
              title={hebrewMode ? 'הסר' : 'Uninstall'}
            >
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Persona detail preview modal */
function PersonaPreview({
  persona,
  isInstalled,
  isActive,
  onClose,
  onInstall,
  onUninstall,
  onActivate,
  onDeactivate,
  onTestInSandbox,
  hebrewMode,
}: {
  persona: CustomPersona;
  isInstalled: boolean;
  isActive: boolean;
  onClose: () => void;
  onInstall: () => void;
  onUninstall: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onTestInSandbox: () => void;
  hebrewMode: boolean;
}) {
  const colorMap: Record<string, string> = {
    pink: '#ff79c6',
    green: '#50fa7b',
    purple: '#bd93f9',
    orange: '#ffb86c',
    blue: '#58a6ff',
    cyan: '#8be9fd',
    yellow: '#f1fa8c',
    red: '#ff5555',
    gray: '#6272a4',
  };
  const accent = colorMap[persona.color] || '#58a6ff';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0d1117',
          border: '1px solid #30363d',
          borderRadius: '12px',
          width: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          padding: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: accent + '33',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                color: accent,
                fontWeight: 'bold',
              }}
            >
              {persona.avatar || persona.name.charAt(0)}
            </div>
            <div>
              <h2 style={{ margin: 0, color: '#e6edf3', fontSize: '20px' }}>
                {hebrewMode ? persona.nameHe || persona.name : persona.name}
              </h2>
              <div style={{ color: accent, fontSize: '13px', marginTop: '2px' }}>{persona.role}</div>
              {persona.industry && (
                <div style={{ color: '#8b949e', fontSize: '12px', marginTop: '2px' }}>
                  {persona.industry} · v{persona.version}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#8b949e',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ color: '#e6edf3', fontSize: '13px', marginBottom: '6px' }}>
            {hebrewMode ? 'תיאור' : 'Description'}
          </h3>
          <p style={{ color: '#8b949e', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
            {hebrewMode ? persona.descriptionHe || persona.description : persona.description}
          </p>
        </div>

        {/* Background */}
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ color: '#e6edf3', fontSize: '13px', marginBottom: '6px' }}>
            {hebrewMode ? 'רקע' : 'Background'}
          </h3>
          <p style={{ color: '#8b949e', fontSize: '12px', lineHeight: '1.5', margin: 0 }}>
            {persona.background}
          </p>
        </div>

        {/* Traits grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h4 style={{ color: '#58a6ff', fontSize: '12px', marginBottom: '4px' }}>
              {hebrewMode ? 'חוזקות' : 'Strengths'}
            </h4>
            {persona.strengths.map((s, i) => (
              <div key={i} style={{ color: '#8b949e', fontSize: '11px', padding: '2px 0' }}>
                ✦ {s}
              </div>
            ))}
          </div>
          <div>
            <h4 style={{ color: '#f85149', fontSize: '12px', marginBottom: '4px' }}>
              {hebrewMode ? 'חולשות' : 'Weaknesses'}
            </h4>
            {persona.weaknesses.map((w, i) => (
              <div key={i} style={{ color: '#8b949e', fontSize: '11px', padding: '2px 0' }}>
                ◆ {w}
              </div>
            ))}
          </div>
        </div>

        {/* Personality */}
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ color: '#e6edf3', fontSize: '12px', marginBottom: '6px' }}>
            {hebrewMode ? 'אישיות' : 'Personality'}
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {persona.personality.map((trait, i) => (
              <span
                key={i}
                style={{
                  fontSize: '11px',
                  background: accent + '22',
                  color: accent,
                  padding: '3px 8px',
                  borderRadius: '10px',
                }}
              >
                {trait}
              </span>
            ))}
          </div>
        </div>

        {/* Speaking style */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#e6edf3', fontSize: '12px', marginBottom: '4px' }}>
            {hebrewMode ? 'סגנון דיבור' : 'Speaking Style'}
          </h4>
          <div
            style={{
              color: '#8b949e',
              fontSize: '12px',
              fontStyle: 'italic',
              background: '#161b22',
              padding: '10px',
              borderRadius: '6px',
              borderLeft: `3px solid ${accent}`,
            }}
          >
            "{persona.speakingStyle}"
          </div>
        </div>

        {/* Tags */}
        {persona.tags?.length > 0 && (
          <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {persona.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: '11px',
                  background: '#21262d',
                  color: '#8b949e',
                  padding: '3px 8px',
                  borderRadius: '10px',
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #21262d', paddingTop: '16px' }}>
          <button
            onClick={onTestInSandbox}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              background: '#21262d',
              color: '#e6edf3',
              border: '1px solid #30363d',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            🧪 {hebrewMode ? 'בדיקה בארגז חול' : 'Test in Sandbox'}
          </button>
          {!isInstalled ? (
            <button
              onClick={() => { onInstall(); onClose(); }}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                background: '#238636',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              📥 {hebrewMode ? 'התקן' : 'Install'}
            </button>
          ) : isActive ? (
            <button
              onClick={() => { onDeactivate(); onClose(); }}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                background: '#21262d',
                color: '#f85149',
                border: '1px solid #f85149',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {hebrewMode ? 'בטל הפעלה' : 'Deactivate'}
            </button>
          ) : (
            <>
              <button
                onClick={() => { onActivate(); onClose(); }}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  background: '#238636',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                ⚡ {hebrewMode ? 'הפעל' : 'Activate'}
              </button>
              <button
                onClick={() => { onUninstall(); onClose(); }}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  background: '#21262d',
                  color: '#f85149',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                {hebrewMode ? 'הסר' : 'Uninstall'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PersonaMarketplace({ onClose }: { onClose?: () => void }) {
  const { hebrewMode } = useUIStore();
  const {
    activeTab,
    setActiveTab,
    allPersonas,
    setAllPersonas,
    installedIds,
    activeIds,
    installPersona,
    uninstallPersona,
    activatePersona,
    deactivatePersona,
    selectedPersona,
    setSelectedPersona,
    previewOpen,
    setPreviewOpen,
    filter: _filter,
    setFilter: _setFilter,
    clearFilter: _clearFilter,
  } = usePersonaStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sandboxPersonas, setSandboxPersonas] = useState<AgentPersona[]>([]);

  // Load personas on mount
  useEffect(() => {
    // Combine built-in agent personas with industry personas
    const builtInAsCustom: CustomPersona[] = AGENT_PERSONAS.map((p) => ({
      ...p,
      id: p.name.toLowerCase().replace(/\s+/g, '-'),
      nameHe: (p as any).nameHe || p.name,
      version: '1.0.0',
      author: 'Forge',
      tags: ['default', 'copywriting'],
      description: `${p.role} - Built-in Forge persona`,
      isBuiltIn: true,
      isFavorite: false,
      isPublished: false,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const all = [...builtInAsCustom, ...INDUSTRY_PERSONAS];
    setAllPersonas(all);
  }, [setAllPersonas]);

  // Derived: filtered personas
  const filteredPersonas = useMemo(() => {
    let result = allPersonas;

    // Tab filter
    if (activeTab === 'installed') {
      result = result.filter((p) => installedIds.has(p.id));
    }

    // Category filter
    if (selectedCategory) {
      result = result.filter(
        (p) => (p.industry || 'general').toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Search
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.nameHe || '').toLowerCase().includes(q) ||
          p.role.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.industry || '').toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [allPersonas, activeTab, installedIds, selectedCategory, searchQuery]);

  const categories = useMemo(() => extractCategories(allPersonas), [allPersonas]);

  const handlePreview = useCallback(
    (persona: CustomPersona) => {
      setSelectedPersona(persona);
      setPreviewOpen(true);
    },
    [setSelectedPersona, setPreviewOpen]
  );

  const handleTestInSandbox = useCallback(
    (persona: CustomPersona) => {
      setSandboxPersonas([persona as AgentPersona]);
      setPreviewOpen(false);
      setActiveTab('sandbox');
    },
    [setPreviewOpen, setActiveTab]
  );

  const t = {
    title: hebrewMode ? 'שוק הפרסונות' : 'Persona Marketplace',
    browse: hebrewMode ? 'עיון' : 'Browse',
    installed: hebrewMode ? 'מותקנות' : 'Installed',
    create: hebrewMode ? 'יצירה' : 'Create',
    sandbox: hebrewMode ? 'ארגז חול' : 'Sandbox',
    search: hebrewMode ? 'חיפוש פרסונות...' : 'Search personas...',
    allCategories: hebrewMode ? 'כל הקטגוריות' : 'All Categories',
    noResults: hebrewMode ? 'לא נמצאו פרסונות' : 'No personas found',
    installedCount: hebrewMode ? 'מותקנות' : 'installed',
    activeCount: hebrewMode ? 'פעילות' : 'active',
  };

  const tabs: { id: MarketplaceTab; label: string; icon: string }[] = [
    { id: 'browse', label: t.browse, icon: '🏪' },
    { id: 'installed', label: t.installed, icon: '📦' },
    { id: 'create', label: t.create, icon: '✨' },
    { id: 'sandbox', label: t.sandbox, icon: '🧪' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0d1117',
        zIndex: 900,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        color: '#c9d1d9',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid #21262d',
          background: '#161b22',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>🎭</span>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#e6edf3' }}>
            {t.title}
          </h1>
          <span style={{ fontSize: '12px', color: '#8b949e' }}>
            {installedIds.size} {t.installedCount} · {activeIds.size} {t.activeCount}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: '#21262d',
              border: '1px solid #30363d',
              color: '#8b949e',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            ✕ {hebrewMode ? 'סגור' : 'Close'}
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: '2px',
          padding: '8px 20px',
          borderBottom: '1px solid #21262d',
          background: '#161b22',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              background: activeTab === tab.id ? '#0d1117' : 'transparent',
              color: activeTab === tab.id ? '#e6edf3' : '#8b949e',
              border: activeTab === tab.id ? '1px solid #30363d' : '1px solid transparent',
              borderBottom: activeTab === tab.id ? '1px solid #0d1117' : '1px solid transparent',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 600 : 400,
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {(activeTab === 'browse' || activeTab === 'installed') && (
          <div style={{ display: 'flex', height: '100%' }}>
            {/* Category sidebar (browse only) */}
            {activeTab === 'browse' && (
              <div
                style={{
                  width: '200px',
                  borderRight: '1px solid #21262d',
                  padding: '12px',
                  flexShrink: 0,
                  overflow: 'auto',
                }}
              >
                <button
                  onClick={() => setSelectedCategory(null)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    fontSize: '12px',
                    background: !selectedCategory ? '#21262d' : 'transparent',
                    color: !selectedCategory ? '#e6edf3' : '#8b949e',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginBottom: '2px',
                  }}
                >
                  🌐 {t.allCategories} ({allPersonas.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      fontSize: '12px',
                      background: selectedCategory === cat.id ? '#21262d' : 'transparent',
                      color: selectedCategory === cat.id ? '#e6edf3' : '#8b949e',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      marginBottom: '2px',
                    }}
                  >
                    {cat.icon} {hebrewMode ? cat.labelHe : cat.label} ({cat.count})
                  </button>
                ))}
              </div>
            )}

            {/* Main grid */}
            <div style={{ flex: 1, padding: '16px 20px' }}>
              {/* Search bar */}
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder={t.search}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    maxWidth: '400px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    background: '#161b22',
                    color: '#e6edf3',
                    border: '1px solid #30363d',
                    borderRadius: '6px',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Results count */}
              <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '12px' }}>
                {filteredPersonas.length} persona{filteredPersonas.length !== 1 ? 's' : ''}
                {searchQuery && ` matching "${searchQuery}"`}
                {selectedCategory && ` in ${selectedCategory}`}
              </div>

              {/* Grid */}
              {filteredPersonas.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    color: '#8b949e',
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
                  <div>{t.noResults}</div>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '12px',
                  }}
                >
                  {filteredPersonas.map((persona) => (
                    <PersonaCard
                      key={persona.id}
                      persona={persona}
                      isInstalled={installedIds.has(persona.id)}
                      isActive={activeIds.has(persona.id)}
                      onPreview={() => handlePreview(persona)}
                      onInstall={() => installPersona(persona.id)}
                      onUninstall={() => uninstallPersona(persona.id)}
                      onActivate={() => activatePersona(persona.id)}
                      onDeactivate={() => deactivatePersona(persona.id)}
                      hebrewMode={hebrewMode}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'create' && (
          <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <PersonaCreatorWizard
              isOpen={activeTab === 'create'}
              onClose={() => setActiveTab('browse')}
              onSave={async (persona) => { installPersona(persona.id); setActiveTab('browse'); }}
            />
          </div>
        )}

        {activeTab === 'sandbox' && (
          <div style={{ padding: '20px', height: '100%' }}>
            <PersonaSandbox
              initialPersonas={sandboxPersonas}
              availablePersonas={allPersonas as AgentPersona[]}
              onClose={() => setActiveTab('browse')}
            />
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewOpen && selectedPersona && (
        <PersonaPreview
          persona={selectedPersona}
          isInstalled={installedIds.has(selectedPersona.id)}
          isActive={activeIds.has(selectedPersona.id)}
          onClose={() => setPreviewOpen(false)}
          onInstall={() => installPersona(selectedPersona.id)}
          onUninstall={() => uninstallPersona(selectedPersona.id)}
          onActivate={() => activatePersona(selectedPersona.id)}
          onDeactivate={() => deactivatePersona(selectedPersona.id)}
          onTestInSandbox={() => handleTestInSandbox(selectedPersona)}
          hebrewMode={hebrewMode}
        />
      )}
    </div>
  );
}

export default PersonaMarketplace;
