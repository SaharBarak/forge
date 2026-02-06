import { useState, useMemo } from 'react';
import { AgentPersona } from '../../types';
import { useUIStore } from '../../stores/uiStore';

interface PersonaLibraryProps {
  personas: AgentPersona[];
  onSelect?: (persona: AgentPersona) => void;
  onEdit?: (persona: AgentPersona) => void;
  onDuplicate?: (persona: AgentPersona) => void;
  onArchive?: (persona: AgentPersona) => void;
  onDelete?: (persona: AgentPersona) => void;
  onImport?: (personas: AgentPersona[]) => void;
  onExport?: (personas: AgentPersona[]) => void;
  onTestInSandbox?: (persona: AgentPersona) => void;
  selectedIds?: string[];
}

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'role' | 'recent';
type FilterRole = 'all' | 'strategist' | 'creative' | 'analyst' | 'critic' | 'custom';

export function PersonaLibrary({
  personas,
  onSelect,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onImport,
  onExport,
  onTestInSandbox,
  selectedIds = [],
}: PersonaLibraryProps) {
  const { hebrewMode } = useUIStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const t = {
    title: hebrewMode ? 'ספריית פרסונות' : 'Persona Library',
    search: hebrewMode ? 'חיפוש פרסונות...' : 'Search personas...',
    grid: hebrewMode ? 'רשת' : 'Grid',
    list: hebrewMode ? 'רשימה' : 'List',
    sortBy: hebrewMode ? 'מיין לפי' : 'Sort by',
    name: hebrewMode ? 'שם' : 'Name',
    role: hebrewMode ? 'תפקיד' : 'Role',
    recent: hebrewMode ? 'אחרונים' : 'Recent',
    filter: hebrewMode ? 'סנן לפי תפקיד' : 'Filter by role',
    all: hebrewMode ? 'הכל' : 'All',
    strategist: hebrewMode ? 'אסטרטג' : 'Strategist',
    creative: hebrewMode ? 'יצירתי' : 'Creative',
    analyst: hebrewMode ? 'אנליסט' : 'Analyst',
    critic: hebrewMode ? 'מבקר' : 'Critic',
    custom: hebrewMode ? 'מותאם אישית' : 'Custom',
    showArchived: hebrewMode ? 'הצג ארכיון' : 'Show Archived',
    import: hebrewMode ? 'ייבוא' : 'Import',
    export: hebrewMode ? 'ייצוא' : 'Export',
    exportSelected: hebrewMode ? 'ייצוא נבחרים' : 'Export Selected',
    edit: hebrewMode ? 'עריכה' : 'Edit',
    duplicate: hebrewMode ? 'שכפל' : 'Duplicate',
    archive: hebrewMode ? 'ארכיון' : 'Archive',
    delete: hebrewMode ? 'מחק' : 'Delete',
    test: hebrewMode ? 'בדוק בסנדבוקס' : 'Test in Sandbox',
    noResults: hebrewMode ? 'לא נמצאו פרסונות' : 'No personas found',
    personas: hebrewMode ? 'פרסונות' : 'personas',
    selected: hebrewMode ? 'נבחרו' : 'selected',
    importTitle: hebrewMode ? 'ייבוא פרסונות' : 'Import Personas',
    importDesc: hebrewMode ? 'הדבק JSON של פרסונות' : 'Paste persona JSON',
    cancel: hebrewMode ? 'ביטול' : 'Cancel',
    importBtn: hebrewMode ? 'ייבוא' : 'Import',
    invalidJson: hebrewMode ? 'JSON לא תקין' : 'Invalid JSON format',
    age: hebrewMode ? 'גיל' : 'Age',
  };

  // Filter and sort personas
  const filteredPersonas = useMemo(() => {
    let result = [...personas];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.nameHe?.toLowerCase().includes(query) ||
          p.role.toLowerCase().includes(query) ||
          p.personality.some((trait) => trait.toLowerCase().includes(query))
      );
    }

    // Role filter
    if (filterRole !== 'all') {
      result = result.filter((p) => {
        const role = p.role.toLowerCase();
        switch (filterRole) {
          case 'strategist':
            return role.includes('strateg') || role.includes('אסטרטג');
          case 'creative':
            return role.includes('creative') || role.includes('יצירת') || role.includes('copy');
          case 'analyst':
            return role.includes('analyst') || role.includes('data') || role.includes('אנליסט');
          case 'critic':
            return role.includes('critic') || role.includes('devil') || role.includes('מבקר');
          case 'custom':
            return true; // Custom personas have unique roles
          default:
            return true;
        }
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return hebrewMode
            ? (a.nameHe || a.name).localeCompare(b.nameHe || b.name, 'he')
            : a.name.localeCompare(b.name);
        case 'role':
          return a.role.localeCompare(b.role);
        case 'recent':
        default:
          return 0; // Keep original order for recent
      }
    });

    return result;
  }, [personas, searchQuery, filterRole, sortBy, hebrewMode]);

  const handleBulkSelect = (id: string) => {
    const newSelected = new Set(selectedForBulk);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedForBulk(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedForBulk.size === filteredPersonas.length) {
      setSelectedForBulk(new Set());
    } else {
      setSelectedForBulk(new Set(filteredPersonas.map((p) => p.id)));
    }
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importJson);
      const personasToImport = Array.isArray(parsed) ? parsed : [parsed];
      
      // Basic validation
      for (const p of personasToImport) {
        if (!p.name || !p.role) {
          throw new Error('Each persona must have name and role');
        }
      }
      
      onImport?.(personasToImport);
      setShowImportModal(false);
      setImportJson('');
      setImportError(null);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : t.invalidJson);
    }
  };

  const handleExportSelected = () => {
    const selectedPersonas = personas.filter((p) => selectedForBulk.has(p.id));
    onExport?.(selectedPersonas);
  };

  return (
    <div className={`flex flex-col h-full bg-gray-900 ${hebrewMode ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white">{t.title}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {t.import}
          </button>
          {selectedForBulk.size > 0 ? (
            <button
              onClick={handleExportSelected}
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              {t.exportSelected} ({selectedForBulk.size})
            </button>
          ) : (
            <button
              onClick={() => onExport?.(personas)}
              className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {t.export}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-700">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.search}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.grid}
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.list}
          </button>
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="name">{t.sortBy}: {t.name}</option>
          <option value="role">{t.sortBy}: {t.role}</option>
          <option value="recent">{t.sortBy}: {t.recent}</option>
        </select>

        {/* Filter */}
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as FilterRole)}
          className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">{t.filter}: {t.all}</option>
          <option value="strategist">{t.strategist}</option>
          <option value="creative">{t.creative}</option>
          <option value="analyst">{t.analyst}</option>
          <option value="critic">{t.critic}</option>
          <option value="custom">{t.custom}</option>
        </select>

        {/* Show Archived Toggle */}
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded bg-gray-700 border-gray-600"
          />
          {t.showArchived}
        </label>
      </div>

      {/* Bulk Selection Info */}
      {selectedForBulk.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-blue-900/30 border-b border-blue-800">
          <span className="text-sm text-blue-300">
            {selectedForBulk.size} {t.selected}
          </span>
          <button
            onClick={() => setSelectedForBulk(new Set())}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            {t.cancel}
          </button>
        </div>
      )}

      {/* Persona Grid/List */}
      <div className="flex-1 overflow-auto p-4">
        {filteredPersonas.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            {t.noResults}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPersonas.map((persona) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                isSelected={selectedIds.includes(persona.id)}
                isBulkSelected={selectedForBulk.has(persona.id)}
                hebrewMode={hebrewMode}
                t={t}
                onSelect={() => onSelect?.(persona)}
                onEdit={() => onEdit?.(persona)}
                onDuplicate={() => onDuplicate?.(persona)}
                onArchive={() => onArchive?.(persona)}
                onDelete={() => onDelete?.(persona)}
                onTestInSandbox={() => onTestInSandbox?.(persona)}
                onBulkSelect={() => handleBulkSelect(persona.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Select All */}
            <div className="flex items-center gap-2 pb-2 border-b border-gray-700">
              <input
                type="checkbox"
                checked={selectedForBulk.size === filteredPersonas.length}
                onChange={handleSelectAll}
                className="rounded bg-gray-700 border-gray-600"
              />
              <span className="text-sm text-gray-400">
                {filteredPersonas.length} {t.personas}
              </span>
            </div>
            {filteredPersonas.map((persona) => (
              <PersonaListItem
                key={persona.id}
                persona={persona}
                isSelected={selectedIds.includes(persona.id)}
                isBulkSelected={selectedForBulk.has(persona.id)}
                hebrewMode={hebrewMode}
                t={t}
                onSelect={() => onSelect?.(persona)}
                onEdit={() => onEdit?.(persona)}
                onDuplicate={() => onDuplicate?.(persona)}
                onArchive={() => onArchive?.(persona)}
                onDelete={() => onDelete?.(persona)}
                onTestInSandbox={() => onTestInSandbox?.(persona)}
                onBulkSelect={() => handleBulkSelect(persona.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">{t.importTitle}</h3>
            <p className="text-sm text-gray-400 mb-3">{t.importDesc}</p>
            <textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder='[{"name": "...", "role": "...", ...}]'
              className="w-full h-48 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white font-mono text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
            {importError && (
              <p className="text-sm text-red-400 mt-2">{importError}</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportJson('');
                  setImportError(null);
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleImport}
                disabled={!importJson.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {t.importBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Persona Card Component (Grid View)
interface PersonaCardProps {
  persona: AgentPersona;
  isSelected: boolean;
  isBulkSelected: boolean;
  hebrewMode: boolean;
  t: Record<string, string>;
  onSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onTestInSandbox: () => void;
  onBulkSelect: () => void;
}

function PersonaCard({
  persona,
  isSelected,
  isBulkSelected,
  hebrewMode,
  t,
  onSelect,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onTestInSandbox,
  onBulkSelect,
}: PersonaCardProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`relative bg-gray-800 rounded-xl p-4 cursor-pointer transition-all hover:bg-gray-750 ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      } ${isBulkSelected ? 'ring-2 ring-green-500' : ''}`}
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Bulk Select Checkbox */}
      <div
        className="absolute top-2 left-2"
        onClick={(e) => {
          e.stopPropagation();
          onBulkSelect();
        }}
      >
        <input
          type="checkbox"
          checked={isBulkSelected}
          onChange={() => {}}
          className="rounded bg-gray-700 border-gray-600"
        />
      </div>

      {/* Avatar */}
      <div
        className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold"
        style={{ backgroundColor: persona.color + '30', color: persona.color }}
      >
        {persona.avatar || persona.name.charAt(0)}
      </div>

      {/* Name & Role */}
      <h3 className="text-white font-semibold text-center truncate">
        {hebrewMode ? persona.nameHe || persona.name : persona.name}
      </h3>
      <p className="text-gray-400 text-sm text-center truncate">{persona.role}</p>

      {/* Personality Tags */}
      <div className="flex flex-wrap justify-center gap-1 mt-2">
        {persona.personality.slice(0, 3).map((trait, i) => (
          <span
            key={i}
            className="px-2 py-0.5 text-xs rounded-full bg-gray-700 text-gray-300"
          >
            {trait}
          </span>
        ))}
      </div>

      {/* Actions Overlay */}
      {showActions && (
        <div className="absolute inset-0 bg-gray-900/90 rounded-xl flex flex-col items-center justify-center gap-2 p-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTestInSandbox();
            }}
            className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
          >
            {t.test}
          </button>
          <div className="flex gap-2 w-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
            >
              {t.edit}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
            >
              {t.duplicate}
            </button>
          </div>
          <div className="flex gap-2 w-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
              }}
              className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
            >
              {t.archive}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="flex-1 px-3 py-1.5 bg-red-600/50 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
            >
              {t.delete}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Persona List Item Component (List View)
interface PersonaListItemProps {
  persona: AgentPersona;
  isSelected: boolean;
  isBulkSelected: boolean;
  hebrewMode: boolean;
  t: Record<string, string>;
  onSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onTestInSandbox: () => void;
  onBulkSelect: () => void;
}

function PersonaListItem({
  persona,
  isSelected,
  isBulkSelected,
  hebrewMode,
  t,
  onSelect,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onTestInSandbox,
  onBulkSelect,
}: PersonaListItemProps) {
  return (
    <div
      className={`flex items-center gap-4 p-3 bg-gray-800 rounded-lg cursor-pointer transition-all hover:bg-gray-750 ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      } ${isBulkSelected ? 'ring-2 ring-green-500' : ''}`}
      onClick={onSelect}
    >
      {/* Bulk Select */}
      <input
        type="checkbox"
        checked={isBulkSelected}
        onChange={(e) => {
          e.stopPropagation();
          onBulkSelect();
        }}
        onClick={(e) => e.stopPropagation()}
        className="rounded bg-gray-700 border-gray-600"
      />

      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
        style={{ backgroundColor: persona.color + '30', color: persona.color }}
      >
        {persona.avatar || persona.name.charAt(0)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-semibold truncate">
          {hebrewMode ? persona.nameHe || persona.name : persona.name}
        </h3>
        <p className="text-gray-400 text-sm truncate">{persona.role}</p>
      </div>

      {/* Traits */}
      <div className="hidden md:flex gap-1">
        {persona.personality.slice(0, 2).map((trait, i) => (
          <span
            key={i}
            className="px-2 py-0.5 text-xs rounded-full bg-gray-700 text-gray-300"
          >
            {trait}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTestInSandbox();
          }}
          className="p-2 hover:bg-blue-600/50 rounded-lg transition-colors text-blue-400"
          title={t.test}
        >
          🧪
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-2 hover:bg-gray-600 rounded-lg transition-colors text-gray-400"
          title={t.edit}
        >
          ✏️
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="p-2 hover:bg-gray-600 rounded-lg transition-colors text-gray-400"
          title={t.duplicate}
        >
          📋
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onArchive();
          }}
          className="p-2 hover:bg-gray-600 rounded-lg transition-colors text-gray-400"
          title={t.archive}
        >
          📦
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 hover:bg-red-600/50 rounded-lg transition-colors text-red-400"
          title={t.delete}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

export default PersonaLibrary;
