/**
 * Forge auth module — keyless did:key identity with optional public
 * attestations as evidence.
 *
 * Phase 1 of the decentralized identity roadmap. Zero API keys, zero OAuth
 * clients, zero walled gardens. Users can sign up in one click with just a
 * cryptographic identity, then optionally bind public Mastodon / GitHub /
 * Bluesky profiles as behavioral evidence for Sybil resistance.
 */

export * from './did';
export * from './attestations';
export * from './vc';
export * from './session';
