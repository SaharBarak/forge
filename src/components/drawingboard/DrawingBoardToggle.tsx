/**
 * DrawingBoardToggle — Toggle button for the Drawing Board panel
 * Issue #55
 */

import { useCanvasStore } from '../../stores/canvasStore';

export function DrawingBoardToggle() {
  const panelVisible = useCanvasStore((s) => s.panelVisible);
  const togglePanel = useCanvasStore((s) => s.togglePanel);
  const elementCount = useCanvasStore((s) => s.elements.length);

  return (
    <button
      onClick={togglePanel}
      title={panelVisible ? 'Hide Drawing Board' : 'Show Drawing Board'}
      style={{
        background: panelVisible ? '#1f6feb' : '#21262d',
        border: '1px solid #30363d',
        borderRadius: '4px',
        color: panelVisible ? '#ffffff' : '#8b949e',
        cursor: 'pointer',
        padding: '4px 8px',
        fontSize: '12px',
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'all 0.15s ease',
      }}
    >
      🎨
      {elementCount > 0 && (
        <span style={{
          backgroundColor: '#3fb950',
          color: '#0d1117',
          borderRadius: '8px',
          padding: '0 5px',
          fontSize: '10px',
          fontWeight: 700,
          minWidth: '16px',
          textAlign: 'center',
        }}>
          {elementCount}
        </span>
      )}
    </button>
  );
}

export default DrawingBoardToggle;
