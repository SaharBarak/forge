/**
 * Forge connections module — phase 4 of the decentralized roadmap.
 *
 * On-device semantic matching. Every community contribution is embedded via
 * a small sentence-transformer (all-MiniLM-L6-v2, 384 dims) that runs fully
 * local through Transformers.js. Vectors are indexed in an HNSW graph via
 * USearch for sub-millisecond top-k lookup.
 *
 * The goal: when a user publishes an idea, surface other peers who have
 * already written about something semantically adjacent — connecting people
 * with overlapping thinking, not just overlapping tags.
 */

export * from './errors';
export * from './types';
export * from './client';
