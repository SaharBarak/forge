/**
 * Forge rendering module — terminal-native ANSI rendering pipeline.
 *
 * Three layers of terminal UI enhancement:
 *
 * Level 1 (Rendering Pipeline):
 *   theme.ts      — semantic color tokens
 *   markdown.ts   — marked-based markdown → ANSI (zero Node deps)
 *   spinner.ts    — braille dot animation
 *   borders.ts    — box drawing, separators, banners
 *   progress.ts   — fractional block bars, sparklines
 *
 * Level 2 (Enhanced Shell):
 *   phase.ts      — phase transition banners, progress
 *
 * Level 3 (Deliberation UX):
 *   consensus.ts  — thermometers, stance badges, debate intensity
 */

export * from './theme';
export * from './markdown';
export * from './spinner';
export * from './borders';
export * from './progress';
export * from './phase';
export * from './consensus';
export * from './tool-call';
export * from './diff';
export * from './permission';
