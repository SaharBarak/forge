/**
 * Wireframe data model and parser
 * Supports full page layouts: navbar, sidebar, grids, sections, footer
 * Agents propose structure via [WIREFRAME] blocks in messages
 */

export type WireframeNodeType =
  | 'page' | 'navbar' | 'sidebar' | 'main'
  | 'section' | 'grid' | 'column' | 'footer'
  | 'component';

export interface WireframeNode {
  id: string;
  type: WireframeNodeType;
  label: string;
  direction: 'row' | 'column';
  children: WireframeNode[];
  content?: string;     // draft copy filled in by agents
  status: 'pending' | 'in_progress' | 'complete';
  widthPercent?: number; // relative width within parent row (e.g. 33, 50, 60)
}

/** Create a wireframe node with defaults */
function node(
  type: WireframeNodeType,
  label: string,
  opts?: Partial<Pick<WireframeNode, 'direction' | 'children' | 'widthPercent' | 'content' | 'status'>>
): WireframeNode {
  return {
    id: `${type}-${label.toLowerCase().replace(/\s+/g, '-')}`,
    type,
    label,
    direction: opts?.direction ?? (type === 'navbar' || type === 'grid' || type === 'footer' ? 'row' : 'column'),
    children: opts?.children ?? [],
    content: opts?.content,
    status: opts?.status ?? 'pending',
    widthPercent: opts?.widthPercent,
  };
}

/**
 * Parse a [WIREFRAME] block from an agent message.
 *
 * Format:
 *   [WIREFRAME]
 *   navbar: Logo | Nav Links | CTA Button
 *   hero: Headline + CTA (60%) | Hero Image (40%)
 *   features: Feature 1 (33%) | Feature 2 (33%) | Feature 3 (33%)
 *   sidebar-left: Filters (25%)
 *   social-proof: Testimonials
 *   footer: Company | Links | Newsletter
 *   [/WIREFRAME]
 *
 * Rules:
 *   - Each line is a section
 *   - `|` splits columns within a section (makes it a row/grid)
 *   - `(N%)` sets relative width
 *   - Special prefixes: `navbar:`, `footer:`, `sidebar-left:`, `sidebar-right:`
 */
export function parseWireframe(text: string): WireframeNode | null {
  const match = text.match(/\[WIREFRAME\]([\s\S]*?)\[\/WIREFRAME\]/i);
  if (!match) return null;

  const lines = match[1].trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return null;

  const page = node('page', 'Page');
  const mainChildren: WireframeNode[] = [];
  let sidebarLeft: WireframeNode | null = null;
  let sidebarRight: WireframeNode | null = null;

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) {
      // Line without colon — treat as a simple section name
      mainChildren.push(node('section', line.trim()));
      continue;
    }

    const prefix = line.slice(0, colonIdx).trim().toLowerCase();
    const body = line.slice(colonIdx + 1).trim();
    const columns = body.split('|').map(c => c.trim()).filter(c => c.length > 0);

    if (prefix === 'navbar') {
      const navChildren = columns.map(col => {
        const { label: lbl, width: w } = parseColumnSpec(col);
        return node('component', lbl, { widthPercent: w });
      });
      page.children.push(node('navbar', 'Navbar', { children: navChildren }));
    } else if (prefix === 'footer') {
      const footerChildren = columns.map(col => {
        const { label: lbl, width: w } = parseColumnSpec(col);
        return node('column', lbl, { widthPercent: w });
      });
      page.children.push(node('footer', 'Footer', { children: footerChildren }));
    } else if (prefix === 'sidebar-left' || prefix === 'sidebar') {
      const { label: lbl, width: w } = parseColumnSpec(columns[0] || 'Sidebar');
      sidebarLeft = node('sidebar', lbl, { widthPercent: w || 25 });
    } else if (prefix === 'sidebar-right') {
      const { label: lbl, width: w } = parseColumnSpec(columns[0] || 'Sidebar');
      sidebarRight = node('sidebar', lbl, { widthPercent: w || 25 });
    } else {
      // Regular section
      if (columns.length === 1) {
        mainChildren.push(node('section', columns[0]));
      } else {
        // Grid/row section
        const gridChildren = columns.map(col => {
          const { label: lbl, width: w } = parseColumnSpec(col);
          return node('column', lbl, { widthPercent: w });
        });
        mainChildren.push(node('section', capitalize(prefix), { direction: 'row', children: gridChildren }));
      }
    }
  }

  // Assemble: navbar already added, now build body
  const bodyRow = node('main', 'Body', { direction: 'row' });
  if (sidebarLeft) bodyRow.children.push(sidebarLeft);
  const mainNode = node('main', 'Main', { children: mainChildren });
  bodyRow.children.push(mainNode);
  if (sidebarRight) bodyRow.children.push(sidebarRight);

  // Insert body before footer (footer is last if it exists)
  const footerIdx = page.children.findIndex(c => c.type === 'footer');
  if (footerIdx >= 0) {
    page.children.splice(footerIdx, 0, bodyRow);
  } else {
    page.children.push(bodyRow);
  }

  return page;
}

function parseColumnSpec(spec: string): { label: string; width?: number } {
  const widthMatch = spec.match(/\((\d+)%?\)/);
  const width = widthMatch ? parseInt(widthMatch[1], 10) : undefined;
  const label = spec.replace(/\(\d+%?\)/, '').trim();
  return { label, width };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
}

/**
 * Extract wireframe proposal from a message
 */
export function extractWireframe(messageContent: string): WireframeNode | null {
  return parseWireframe(messageContent);
}

/**
 * Update a section's content in the wireframe tree (mutates)
 */
export function updateSectionContent(
  root: WireframeNode,
  sectionId: string,
  content: string,
  status: WireframeNode['status'] = 'complete'
): boolean {
  if (root.id === sectionId) {
    root.content = content;
    root.status = status;
    return true;
  }
  for (const child of root.children) {
    if (updateSectionContent(child, sectionId, content, status)) return true;
  }
  return false;
}

/**
 * Get all leaf sections from the wireframe (for draft assignment)
 */
export function getLeafSections(root: WireframeNode): WireframeNode[] {
  if (root.children.length === 0 && root.type !== 'page') {
    return [root];
  }
  const leaves: WireframeNode[] = [];
  for (const child of root.children) {
    if (child.type === 'section' && child.children.length === 0) {
      leaves.push(child);
    } else if (child.type === 'section' && child.direction === 'row') {
      // Grid section — collect the columns
      for (const col of child.children) {
        leaves.push(col);
      }
    } else {
      leaves.push(...getLeafSections(child));
    }
  }
  return leaves;
}

/**
 * Default wireframe for when no structure has been proposed yet
 */
export function getDefaultWireframe(): WireframeNode {
  return node('page', 'Page', {
    children: [
      node('navbar', 'Navbar', {
        children: [
          node('component', 'Logo'),
          node('component', 'Navigation'),
          node('component', 'CTA'),
        ],
      }),
      node('main', 'Body', {
        direction: 'row',
        children: [
          node('main', 'Main', {
            children: [
              node('section', 'Hero'),
              node('section', 'Content'),
              node('section', 'Features'),
            ],
          }),
        ],
      }),
      node('footer', 'Footer', {
        children: [
          node('column', 'Info'),
          node('column', 'Links'),
          node('column', 'Contact'),
        ],
      }),
    ],
  });
}
