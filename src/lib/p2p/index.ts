/**
 * Forge P2P module — phase 2 of the decentralized roadmap.
 *
 * Content-addressed document store replicated across peers via Helia +
 * OrbitDB + libp2p. Every write is a signed envelope; integrity is enforced
 * at read time, not at write time. Fully functional, Result-returning API.
 */

export * from './client';
export * from './errors';
