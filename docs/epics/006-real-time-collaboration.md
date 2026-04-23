# Epic: Real-Time Collaboration

## Overview

Enable multiple humans to participate in the same deliberation session simultaneously, with live presence indicators and synchronized state.

## Problem Statement

Currently, Forge supports only one human participant per session. Teams need:
- **Collaborative deliberation** with multiple stakeholders
- **Live presence** to see who's watching/participating
- **Synchronized state** so everyone sees the same conversation
- **Role-based participation** (moderator, observer, contributor)

## Proposed Solution

### WebSocket Infrastructure

```typescript
interface CollaborationSession {
  sessionId: string;
  hostId: string;
  participants: Participant[];
  state: 'lobby' | 'active' | 'paused' | 'ended';
}

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  role: 'host' | 'moderator' | 'contributor' | 'observer';
  status: 'active' | 'idle' | 'typing';
  joinedAt: Date;
}
```

### Features

1. **Session Sharing**
   - Generate shareable session link
   - Join via link or session code
   - Password protection (optional)

2. **Presence Indicators**
   - Avatars in header showing participants
   - Typing indicators
   - Active/idle status

3. **Role-Based Permissions**
   | Role | Can Message | Can Command | Can Export | Can Invite |
   |------|-------------|-------------|------------|------------|
   | Host | ✅ | ✅ | ✅ | ✅ |
   | Moderator | ✅ | ✅ | ✅ | ✅ |
   | Contributor | ✅ | ❌ | ❌ | ❌ |
   | Observer | ❌ | ❌ | ❌ | ❌ |

4. **Synchronized Actions**
   - Messages broadcast to all participants
   - Phase changes reflect everywhere
   - Consensus includes all human votes

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Client A   │     │  Client B   │     │  Client C   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────▼──────┐
                    │  WebSocket  │
                    │   Server    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Session   │
                    │   Kernel    │
                    └─────────────┘
```

## Affected Components

| Component | Changes |
|-----------|---------|
| `src/lib/collaboration/` | New module for real-time sync |
| `src/lib/collaboration/WebSocketServer.ts` | Socket.io or ws server |
| `src/lib/collaboration/SessionSync.ts` | State synchronization |
| `src/components/collaboration/` | Presence UI, invite modal |
| `electron/main.js` | WebSocket server integration |
| `src/lib/kernel/SessionKernel.ts` | Multi-participant support |

## Success Criteria

- [ ] Generate and share session links
- [ ] Multiple users join same session
- [ ] Presence indicators show all participants
- [ ] Messages sync in real-time (<100ms)
- [ ] Role-based permissions enforced
- [ ] Graceful handling of disconnects

## Estimated Effort

- **Backend (BE)**: 5 days
- **Frontend (FE)**: 4 days
- **Architect**: 2 days
- **QA**: 3 days
- **Total**: ~14 days

## Dependencies

- WebSocket library (socket.io or ws)
- May require signaling server for P2P (future)

## Risks

| Risk | Mitigation |
|------|------------|
| State conflicts | Server-authoritative state |
| Network latency | Optimistic updates, reconciliation |
| Security | Session tokens, permission checks |
