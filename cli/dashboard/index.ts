/**
 * Dashboard entry point — creates the blessed screen, layout, controller,
 * and returns a Promise that resolves when the dashboard exits.
 */

import type { DashboardOptions } from './types';
import { createScreen, scheduleRender } from './screen';
import { createLayout } from './layout';
import { DashboardController } from './DashboardController';

/**
 * Create and run the blessed dashboard.
 * Returns a Promise that resolves when the user exits (Ctrl+C, /quit).
 */
export async function createDashboard(options: DashboardOptions): Promise<void> {
  const { orchestrator, persistence, session, toolRunner, onExit } = options;

  // Create blessed screen
  const screen = createScreen();

  // Create grid layout with all widgets
  const widgets = createLayout(screen);

  // Create controller — wires events → state → widgets
  const controller = new DashboardController(
    screen,
    widgets,
    orchestrator,
    persistence,
    session,
    toolRunner,
    onExit,
  );

  // Return a promise that resolves when the screen is destroyed
  return new Promise<void>((resolve) => {
    screen.on('destroy', () => {
      controller.destroy();
      resolve();
    });

    // Start the controller (subscribes to orchestrator, renders initial state)
    controller.start().catch((err) => {
      screen.destroy();
      console.error('Dashboard error:', err);
      resolve();
    });
  });
}
