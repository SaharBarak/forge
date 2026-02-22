/**
 * CanvasPane - Live wireframe renderer
 * Recursively renders a WireframeNode tree as a visual site mockup.
 * Supports navbar, sidebar, grids, sections, footer.
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { WireframeNode } from '../lib/wireframe';

export interface CanvasPaneProps {
  wireframe: WireframeNode;
  height?: number;
  width?: number;
}

/** Colors per node type */
const TYPE_COLORS: Record<string, string> = {
  navbar: 'blue',
  footer: 'gray',
  sidebar: 'magenta',
  section: 'white',
  column: 'white',
  component: 'cyan',
  grid: 'white',
  main: 'white',
  page: 'cyan',
};

/** Compact icons per type */
const TYPE_ICONS: Record<string, string> = {
  navbar: '═',
  footer: '─',
  sidebar: '│',
  section: '▪',
  column: '▫',
  component: '·',
};

/** Status indicators */
function statusIcon(status: string): string {
  if (status === 'complete') return '●';
  if (status === 'in_progress') return '◐';
  return '○';
}

function statusColor(status: string): string {
  if (status === 'complete') return 'green';
  if (status === 'in_progress') return 'yellow';
  return 'gray';
}

/**
 * Recursively render a wireframe node.
 * Row-direction nodes render children side-by-side.
 * Column-direction nodes stack children vertically.
 */
function WireframeNodeView({
  node,
  availableWidth,
  depth,
}: {
  node: WireframeNode;
  availableWidth: number;
  depth: number;
}): React.ReactElement {
  const color = TYPE_COLORS[node.type] || 'white';
  const icon = TYPE_ICONS[node.type] || '▪';
  const sColor = statusColor(node.status);

  // Page is just a transparent container
  if (node.type === 'page') {
    return (
      <Box flexDirection="column" width="100%">
        {node.children.map((child) => (
          <WireframeNodeView key={child.id} node={child} availableWidth={availableWidth} depth={depth} />
        ))}
      </Box>
    );
  }

  // Leaf node or node with content — render as a compact block
  if (node.children.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="single" borderColor={sColor} width="100%">
        <Box>
          <Text color={color} bold>{icon} </Text>
          <Text color={sColor}>{truncate(node.label, availableWidth - 6)}</Text>
          <Text dimColor> {statusIcon(node.status)}</Text>
        </Box>
        {node.content && (
          <Text wrap="wrap" dimColor>
            {truncate(node.content, availableWidth * 2)}
          </Text>
        )}
      </Box>
    );
  }

  // Container node with children
  if (node.direction === 'row') {
    // Horizontal layout: children side by side
    // Calculate widths: use widthPercent if set, else distribute evenly
    const totalPercent = node.children.reduce((sum, c) => sum + (c.widthPercent || 0), 0);
    const unsetCount = node.children.filter(c => !c.widthPercent).length;
    const remainingPercent = Math.max(0, 100 - totalPercent);
    const defaultPercent = unsetCount > 0 ? remainingPercent / unsetCount : 0;

    return (
      <Box flexDirection="column" width="100%">
        {/* Row header for non-main containers */}
        {node.type !== 'main' && (
          <Box>
            <Text color={color} bold>{icon} </Text>
            <Text color={color}>{truncate(node.label, availableWidth - 4)}</Text>
          </Box>
        )}
        <Box flexDirection="row" width="100%">
          {node.children.map((child) => {
            const pct = child.widthPercent || defaultPercent;
            const childWidth = Math.max(4, Math.floor((availableWidth * pct) / 100));
            return (
              <WireframeNodeView key={child.id} node={child} availableWidth={childWidth} depth={depth + 1} />
            );
          })}
        </Box>
      </Box>
    );
  }

  // Vertical layout: children stacked
  return (
    <Box flexDirection="column" width="100%">
      {/* Only show label for meaningful containers (not generic "Main") */}
      {node.type !== 'main' && (
        <Box>
          <Text color={color} bold>{icon} </Text>
          <Text color={color}>{truncate(node.label, availableWidth - 4)}</Text>
        </Box>
      )}
      {node.children.map((child) => (
        <WireframeNodeView key={child.id} node={child} availableWidth={availableWidth} depth={depth + 1} />
      ))}
    </Box>
  );
}

function truncate(text: string, max: number): string {
  if (max <= 0) return '';
  // Take first line only
  const firstLine = text.split('\n')[0] || text;
  if (firstLine.length <= max) return firstLine;
  return firstLine.slice(0, max - 1) + '…';
}

export function CanvasPane({
  wireframe,
  height,
  width,
}: CanvasPaneProps): React.ReactElement {
  // Inner width: total - outer double border(2)
  const innerWidth = Math.max(6, (width || 24) - 2);

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      width={width}
      height={height}
    >
      {/* Title */}
      <Box justifyContent="center">
        <Text bold color="cyan"> WIREFRAME </Text>
      </Box>

      {/* Wireframe tree */}
      <WireframeNodeView node={wireframe} availableWidth={innerWidth} depth={0} />
    </Box>
  );
}
