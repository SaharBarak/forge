/**
 * Singleton stack-based breadcrumb tracker for clack menu navigation
 */

import chalk from 'chalk';

class MenuBreadcrumbs {
  private stack: string[] = ['Main Menu'];

  push(segment: string): void {
    this.stack.push(segment);
  }

  pop(): void {
    if (this.stack.length > 1) {
      this.stack.pop();
    }
  }

  reset(): void {
    this.stack = ['Main Menu'];
  }

  toString(): string {
    if (this.stack.length === 0) return '';
    const segments = this.stack.map((seg, i) => {
      if (i === this.stack.length - 1) {
        return chalk.bold.cyan(seg);
      }
      return chalk.dim(seg);
    });
    return segments.join(chalk.dim(' > '));
  }
}

export const menuBreadcrumbs = new MenuBreadcrumbs();
