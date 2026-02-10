/**
 * DrawingBoard — Live Visual Consensus Canvas
 * Issue #55 — Renders canvas JSONL elements as visual wireframe blocks.
 *
 * Reads the canvas state and renders sections, text, wireframes, notes,
 * and dividers with status indicators and RTL support.
 */

import { useMemo } from 'react';
import { useUIStore } from '../../stores/uiStore';
import type {
  CanvasElement,
  CanvasSection,
  CanvasText,
  CanvasWireframe,
  CanvasDivider,
  CanvasNote,
  CanvasStatus,
} from '../../canvas/types';

// --- Status helpers ---

const STATUS_LABELS: Record<CanvasStatus, { en: string; he: string; color: string; icon: string }> = {
  proposed: { en: 'Proposed', he: 'הוצע', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', icon: '◯' },
  discussed: { en: 'In Progress', he: 'בדיון', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', icon: '◐' },
  agreed: { en: 'Agreed', he: 'מוסכם', color: 'text-green-400 bg-green-400/10 border-green-400/30', icon: '●' },
};

function StatusBadge({ status, hebrew }: { status?: CanvasStatus; hebrew: boolean }) {
  if (!status) return null;
  const s = STATUS_LABELS[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border ${s.color}`}>
      <span>{s.icon}</span>
      <span>{hebrew ? s.he : s.en}</span>
    </span>
  );
}

// --- Element renderers ---

function SectionBlock({ el, children, hebrew }: { el: CanvasSection; children?: React.ReactNode; hebrew: boolean }) {
  return (
    <div className="border border-dark-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-dark-800/50 border-b border-dark-700">
        <span className="font-semibold text-dark-100 text-sm">{el.label}</span>
        <StatusBadge status={el.status} hebrew={hebrew} />
      </div>
      <div className="p-4 space-y-3">
        {children}
      </div>
    </div>
  );
}

function TextBlock({ el }: { el: CanvasText }) {
  const roleStyles: Record<string, string> = {
    headline: 'text-lg font-bold text-dark-100',
    subtext: 'text-sm text-dark-300',
    cta: 'inline-block px-4 py-2 bg-accent-600 text-white rounded-lg text-sm font-medium',
    body: 'text-sm text-dark-200',
  };
  const style = roleStyles[el.role] ?? 'text-sm text-dark-200';

  if (el.role === 'cta') {
    return (
      <div className="flex justify-center py-1">
        <span className={style}>[ {el.content} ]</span>
      </div>
    );
  }

  return (
    <div className={`${style} ${el.style === 'center' ? 'text-center' : ''}`}>
      {el.content}
    </div>
  );
}

function WireframeBlock({ el, hebrew }: { el: CanvasWireframe; hebrew: boolean }) {
  return (
    <div className="border border-dashed border-dark-600 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-dark-500 font-mono">⬡ {el.layout}</span>
        <StatusBadge status={el.status} hebrew={hebrew} />
      </div>
      <div className={`flex gap-2 ${el.layout === 'center' ? 'justify-center' : ''}`}>
        {el.elements.map((name, i) => (
          <div
            key={i}
            className="flex-1 border border-dark-600 rounded px-3 py-2 text-center text-xs text-dark-400 bg-dark-800/30"
          >
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}

function NoteBlock({ el }: { el: CanvasNote }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-amber-400/5 border border-amber-400/20 rounded-lg">
      <span className="text-amber-400 text-xs mt-0.5">📝</span>
      <div>
        <span className="text-xs text-amber-300 font-medium">{el.author}:</span>
        <span className="text-xs text-dark-300 ms-1">{el.text}</span>
      </div>
    </div>
  );
}

function DividerBlock({ el }: { el: CanvasDivider }) {
  const style = el.style === 'thick' ? 'border-dark-600 border-t-2' : 'border-dark-700 border-t';
  return <hr className={`my-2 ${style}`} />;
}

// --- Canvas tree builder ---

interface CanvasTree {
  roots: CanvasElement[];
  childrenOf: Map<string, CanvasElement[]>;
}

function buildTree(elements: CanvasElement[]): CanvasTree {
  // Last-write-wins for elements with id
  const latestById = new Map<string, CanvasElement>();
  const noIdElements: CanvasElement[] = [];

  for (const el of elements) {
    if ('id' in el && (el as any).id) {
      latestById.set((el as any).id, el);
    } else {
      noIdElements.push(el);
    }
  }

  const all = [...latestById.values(), ...noIdElements];
  const roots: CanvasElement[] = [];
  const childrenOf = new Map<string, CanvasElement[]>();

  for (const el of all) {
    const parent = (el as any).parent as string | undefined;
    if (parent) {
      const list = childrenOf.get(parent) ?? [];
      list.push(el);
      childrenOf.set(parent, list);
    } else {
      roots.push(el);
    }
  }

  return { roots, childrenOf };
}

// --- Recursive renderer ---

function RenderElement({ el, tree, hebrew }: { el: CanvasElement; tree: CanvasTree; hebrew: boolean }) {
  const id = 'id' in el ? (el as any).id as string : undefined;
  const children = id ? tree.childrenOf.get(id) ?? [] : [];

  switch (el.type) {
    case 'section':
      return (
        <SectionBlock el={el as CanvasSection} hebrew={hebrew}>
          {children.map((child, i) => (
            <RenderElement key={i} el={child} tree={tree} hebrew={hebrew} />
          ))}
        </SectionBlock>
      );
    case 'text':
      return <TextBlock el={el as CanvasText} />;
    case 'wireframe':
      return <WireframeBlock el={el as CanvasWireframe} hebrew={hebrew} />;
    case 'note':
      return <NoteBlock el={el as CanvasNote} />;
    case 'divider':
      return <DividerBlock el={el as CanvasDivider} />;
    default:
      return null;
  }
}

// --- Sample canvas data (for demo / when no file loaded) ---

const SAMPLE_CANVAS: CanvasElement[] = [
  { type: 'section', id: 'hero', label: 'Hero Section', width: 80, status: 'agreed' },
  { type: 'text', content: 'Ship faster with AI agents', role: 'headline', parent: 'hero', style: 'center' },
  { type: 'text', content: 'that debate your copy for you', role: 'subtext', parent: 'hero', style: 'center' },
  { type: 'wireframe', id: 'wf-hero', layout: 'center', elements: ['headline', 'subtext', 'cta'], parent: 'hero', status: 'agreed' },
  { type: 'text', content: 'Get Started', role: 'cta', parent: 'hero' },
  { type: 'section', id: 'features', label: 'Features (3-col)', width: 80, status: 'discussed' },
  { type: 'wireframe', id: 'wf-feat', layout: 'grid-3', elements: ['Speed', 'Quality', 'Scale'], parent: 'features', status: 'discussed' },
  { type: 'note', author: 'forge-pm', text: 'CTA copy still under debate', parent: 'hero' },
  { type: 'section', id: 'testimonials', label: 'Testimonials', width: 80, status: 'proposed' },
  { type: 'divider' },
];

// --- Main component ---

export interface DrawingBoardProps {
  /** Canvas elements to render. Falls back to sample data if empty. */
  elements?: CanvasElement[];
}

export function DrawingBoard({ elements }: DrawingBoardProps) {
  const { hebrewMode } = useUIStore();
  const data = elements && elements.length > 0 ? elements : SAMPLE_CANVAS;
  const tree = useMemo(() => buildTree(data), [data]);

  const t = {
    title: hebrewMode ? 'לוח ציור' : 'Drawing Board',
    subtitle: hebrewMode ? 'קנבס קונצנזוס חי' : 'Live Consensus Canvas',
    legend: hebrewMode ? 'מקרא' : 'Legend',
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-800">
        <h2 className="text-lg font-bold text-dark-100">{t.title}</h2>
        <p className="text-xs text-dark-500 mt-0.5">{t.subtitle}</p>
      </div>

      {/* Legend */}
      <div className="px-6 py-2 border-b border-dark-800 flex items-center gap-4">
        <span className="text-xs text-dark-500">{t.legend}:</span>
        {(['proposed', 'discussed', 'agreed'] as CanvasStatus[]).map((s) => (
          <StatusBadge key={s} status={s} hebrew={hebrewMode} />
        ))}
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {tree.roots.map((el, i) => (
          <RenderElement key={i} el={el} tree={tree} hebrew={hebrewMode} />
        ))}
      </div>
    </div>
  );
}
