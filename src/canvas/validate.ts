/**
 * Canvas element validation
 * Validates elements against the schema rules from issue #56.
 */

import { CanvasElement, STATUS_ORDER, CanvasStatus } from './types';

/** Returns an array of error messages. Empty = valid. */
export function validateElement(element: CanvasElement): string[] {
  const errors: string[] = [];

  if (!element.type) {
    errors.push('Every element MUST have a type field');
    return errors;
  }

  switch (element.type) {
    case 'section':
      if (!element.id) errors.push('section requires id');
      if (!element.label) errors.push('section requires label');
      if (element.width == null) errors.push('section requires width');
      if (element.status && !STATUS_ORDER.includes(element.status)) {
        errors.push(`Invalid status: ${element.status}`);
      }
      break;

    case 'text':
      if (!element.content) errors.push('text requires content');
      if (!element.role) errors.push('text requires role');
      break;

    case 'wireframe':
      if (!element.id) errors.push('wireframe requires id');
      if (!element.layout) errors.push('wireframe requires layout');
      if (!Array.isArray(element.elements)) errors.push('wireframe requires elements array');
      if (element.status && !STATUS_ORDER.includes(element.status)) {
        errors.push(`Invalid status: ${element.status}`);
      }
      break;

    case 'divider':
      // No required fields beyond type
      break;

    case 'note':
      if (!element.author) errors.push('note requires author');
      if (!element.text) errors.push('note requires text');
      break;

    default:
      errors.push(`Unknown element type: ${(element as any).type}`);
  }

  return errors;
}
