/**
 * DrawingBoard — Live Visual Consensus Canvas
 * Issue #55: Shared Drawing Board
 *
 * Renders the canvas state as ASCII box-drawing wireframes in a side panel.
 * Shows sections, text blocks, wireframes, notes, and dividers with
 * consensus status indicators.
 */

import { useMemo } from 'react';
import {
  useCanvasStore,
  selectSections,
} from '../../stores/canvasStore';
import type {
  CanvasElement,
  CanvasSection,
  CanvasText,
  CanvasWireframe,
  CanvasNote,
  CanvasDivider,
  CanvasStatus,
} from '../../canvas/types';

// --- Status badges ---
const STATUS_BADGE: Record<CanvasStatus, { label: string; color: string }> = {
  proposed: { label: 'draft', color: '#8b949e' },
  discussed: { label: 'wip', color: '#d29922' },
  agreed: { label: 'ok', color: '#3fb950' },
};

function StatusBadge({ status }: { status?: CanvasStatus }) {
  if (!status) return null;
  const badge = STATUS_BADGE[status];
  return (
    <span style={{ color: badge.color, fontWeight: 600 }}>
      [{badge.label}]
    </span>
  );
}

// --- Element Renderers ---

function SectionRenderer({ section, children }: { section: CanvasSection; children: CanvasElement[] }) {
  const textChildren = children.filter((c): c is CanvasText => c.type === 'text');
  const wireframeChildren = children.filter((c): c is CanvasWireframe => c.type === 'wireframe');
  const noteChildren = children.filter((c): c is CanvasNote => c.type === 'note');

  return (
    <div className="canvas-section" style={{
      border: '1px solid #30363d',
      borderRadius: '4px',
      marginBottom: '8px',
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: '12px',
      backgroundColor: '#0d1117',
    }}>
      {/* Section header */}
      <div style={{
        padding: '4px 8px',
        borderBottom: '1px solid #30363d',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#161b22',
      }}>
        <span style={{ color: '#58a6ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {section.label}
        </span>
        <StatusBadge status={section.status} />
      </div>

      {/* Section content */}
      <div style={{ padding: '6px 8px' }}>
        {textChildren.map((text, i) => (
          <TextRenderer key={i} text={text} />
        ))}
        {wireframeChildren.map((wf, i) => (
          <WireframeRenderer key={`wf-${i}`} wireframe={wf} />
        ))}
        {noteChildren.map((note, i) => (
          <NoteRenderer key={`note-${i}`} note={note} />
        ))}
        {textChildren.length === 0 && wireframeChildren.length === 0 && noteChildren.length === 0 && (
          <span style={{ color: '#484f58', fontStyle: 'italic' }}>empty section</span>
        )}
      </div>
    </div>
  );
}

function TextRenderer({ text }: { text: CanvasText }) {
  const roleStyles: Record<string, React.CSSProperties> = {
    headline: { color: '#f0f6fc', fontSize: '14px', fontWeight: 700 },
    subtext: { color: '#c9d1d9', fontSize: '12px' },
    cta: { color: '#58a6ff', fontWeight: 600, textDecoration: 'underline' },
    body: { color: '#c9d1d9', fontSize: '12px' },
  };

  const style = roleStyles[text.role] ?? roleStyles.body;

  return (
    <div style={{
      padding: '2px 4px',
      ...style,
    }}>
      {text.role === 'cta' ? `[ ${text.content} ]` : text.content}
    </div>
  );
}

function WireframeRenderer({ wireframe }: { wireframe: CanvasWireframe }) {
  return (
    <div style={{
      border: '1px dashed #30363d',
      borderRadius: '2px',
      padding: '4px 8px',
      margin: '4px 0',
      color: '#8b949e',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
        <span style={{ fontSize: '10px', textTransform: 'uppercase' }}>
          layout: {wireframe.layout}
        </span>
        <StatusBadge status={wireframe.status} />
      </div>
      <div style={{
        display: 'flex',
        gap: '4px',
        flexWrap: 'wrap',
      }}>
        {wireframe.elements.map((el, i) => (
          <span key={i} style={{
            border: '1px solid #30363d',
            padding: '1px 6px',
            borderRadius: '2px',
            fontSize: '11px',
            color: '#c9d1d9',
          }}>
            {el}
          </span>
        ))}
      </div>
    </div>
  );
}

function NoteRenderer({ note }: { note: CanvasNote }) {
  return (
    <div style={{
      padding: '2px 4px',
      margin: '2px 0',
      color: '#d29922',
      fontSize: '11px',
      fontStyle: 'italic',
    }}>
      💬 <strong>{note.author}</strong>: {note.text}
    </div>
  );
}

function DividerRenderer({ divider }: { divider: CanvasDivider }) {
  const char = divider.style === 'double' ? '═' : '─';
  return (
    <div style={{
      color: '#30363d',
      textAlign: 'center',
      padding: '2px 0',
      fontSize: '12px',
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      letterSpacing: '2px',
    }}>
      {char.repeat(30)}
    </div>
  );
}

// --- Orphan element renderer (no parent) ---
function OrphanElementRenderer({ element }: { element: CanvasElement }) {
  switch (element.type) {
    case 'text':
      return <TextRenderer text={element} />;
    case 'wireframe':
      return <WireframeRenderer wireframe={element} />;
    case 'note':
      return <NoteRenderer note={element} />;
    case 'divider':
      return <DividerRenderer divider={element} />;
    default:
      return null;
  }
}

// --- Main DrawingBoard ---

export function DrawingBoard() {
  const elements = useCanvasStore((s) => s.elements);
  const panelVisible = useCanvasStore((s) => s.panelVisible);
  const lastUpdated = useCanvasStore((s) => s.lastUpdated);
  const sections = useCanvasStore(selectSections);

  // Build parent → children map
  const childrenMap = useMemo(() => {
    const map = new Map<string, CanvasElement[]>();
    for (const el of elements) {
      const parent = (el as any).parent;
      if (parent) {
        const existing = map.get(parent) ?? [];
        existing.push(el);
        map.set(parent, existing);
      }
    }
    return map;
  }, [elements]);

  // Orphan elements (no parent, not sections)
  const orphans = useMemo(
    () => elements.filter((e) => e.type !== 'section' && !('parent' in e && (e as any).parent)),
    [elements],
  );

  if (!panelVisible) return null;

  return (
    <div
      className="drawing-board-panel"
      style={{
        width: '320px',
        minWidth: '280px',
        maxWidth: '400px',
        height: '100%',
        backgroundColor: '#0d1117',
        borderLeft: '1px solid #30363d',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid #30363d',
        backgroundColor: '#161b22',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ color: '#58a6ff', fontWeight: 700, fontSize: '13px' }}>
          🎨 Drawing Board
        </span>
        <span style={{ color: '#484f58', fontSize: '10px' }}>
          {elements.length} elements
        </span>
      </div>

      {/* Canvas content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px',
      }}>
        {elements.length === 0 ? (
          <div style={{
            color: '#484f58',
            textAlign: 'center',
            padding: '32px 16px',
            fontSize: '12px',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🖼️</div>
            Canvas is empty.<br />
            Agents will draw here as they reach consensus.
          </div>
        ) : (
          <>
            {/* Render sections with their children */}
            {sections.map((section) => (
              <SectionRenderer
                key={section.id}
                section={section}
                children={childrenMap.get(section.id) ?? []}
              />
            ))}

            {/* Render orphan elements */}
            {orphans.map((el, i) => (
              <OrphanElementRenderer key={`orphan-${i}`} element={el} />
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      {lastUpdated && (
        <div style={{
          padding: '4px 12px',
          borderTop: '1px solid #30363d',
          color: '#484f58',
          fontSize: '10px',
          textAlign: 'right',
        }}>
          Updated: {new Date(lastUpdated).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

export default DrawingBoard;
