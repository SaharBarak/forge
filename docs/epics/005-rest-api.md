# Epic: REST API for External Integrations

## Overview

Expose Forge's deliberation engine via a REST API, enabling headless operation, CI/CD integration, and third-party tool connectivity.

## Problem Statement

Forge currently only works as a desktop app. Users need:
- **Headless mode** for server-side deliberation
- **CI/CD integration** for automated content generation pipelines
- **Third-party connectivity** (Zapier, Make, custom tools)
- **Programmatic access** for developers building on Forge

## Proposed Solution

### API Server

Run Forge as an HTTP server (optional mode):
```bash
forge serve --port 3000
```

### Core Endpoints

```
POST   /api/sessions              # Create new session
GET    /api/sessions              # List sessions
GET    /api/sessions/:id          # Get session details
DELETE /api/sessions/:id          # Delete session

POST   /api/sessions/:id/messages # Send message to session
GET    /api/sessions/:id/messages # Get message history
POST   /api/sessions/:id/command  # Execute kernel command

GET    /api/sessions/:id/status   # Get current phase, consensus
GET    /api/sessions/:id/decisions # Get extracted decisions
GET    /api/sessions/:id/drafts   # Get content drafts

POST   /api/sessions/:id/export   # Export session (md/pdf/json)

GET    /api/personas              # List available personas
POST   /api/personas              # Create custom persona

GET    /api/templates             # List session templates
```

### Request/Response Format

```typescript
// Create session
POST /api/sessions
{
  "name": "Landing Page Copy",
  "goal": "Create compelling hero section",
  "mode": "copywriting",
  "methodology": "dialectic",
  "agents": ["ronit", "yossi", "noa"],
  "context": {
    "brand": "...",
    "audience": "..."
  }
}

// Response
{
  "id": "sess_abc123",
  "status": "active",
  "phase": "brainstorm",
  "createdAt": "2026-02-04T10:00:00Z"
}

// Send message
POST /api/sessions/sess_abc123/messages
{
  "content": "Focus on the pain points first",
  "role": "human"
}

// Webhook callback (optional)
{
  "webhookUrl": "https://your-server.com/forge-callback",
  "events": ["phase_change", "decision", "draft_ready"]
}
```

### Authentication

- API key authentication (`X-API-Key` header)
- Keys stored in `~/.forge/api-keys.json`
- Rate limiting per key
- Scoped permissions (read-only, full access)

### Webhooks

Subscribe to session events:
- `session.created`
- `phase.changed`
- `decision.made`
- `draft.ready`
- `session.completed`

## Affected Components

| Component | Changes |
|-----------|---------|
| `src/api/` | New module for HTTP server |
| `src/api/server.ts` | Express/Fastify server setup |
| `src/api/routes/` | Route handlers |
| `src/api/middleware/` | Auth, rate limiting, validation |
| `src/lib/kernel/SessionKernel.ts` | Ensure stateless operation support |
| CLI | `forge serve` command |
| `package.json` | Add express/fastify, API deps |
| `docs/api/` | OpenAPI/Swagger documentation |

## Success Criteria

- [ ] `forge serve` starts HTTP server
- [ ] Full session lifecycle via API
- [ ] API key authentication working
- [ ] Webhook delivery for key events
- [ ] OpenAPI spec published
- [ ] Rate limiting (100 req/min default)
- [ ] Postman/Insomnia collection provided

## Implementation Phases

### Phase 1: Server Infrastructure
- Express/Fastify setup
- Basic routing structure
- Health check endpoint

### Phase 2: Session Endpoints
- CRUD for sessions
- Message handling
- Command execution

### Phase 3: Authentication
- API key generation/management
- Key validation middleware
- Rate limiting

### Phase 4: Webhooks
- Event subscription system
- Webhook delivery with retries
- Signature verification

### Phase 5: Documentation
- OpenAPI spec
- API reference docs
- Example integrations (Zapier, n8n)

## Estimated Effort

- **Backend (BE)**: 6 days
- **Architect**: 2 days
- **QA**: 2 days
- **Total**: ~10 days

## Dependencies

- Express.js or Fastify for HTTP server
- OpenAPI tooling for docs

## Risks

| Risk | Mitigation |
|------|------------|
| Security exposure | API keys, rate limiting, input validation |
| Resource exhaustion | Session limits, timeout policies |
| Breaking changes | API versioning from start (/v1/) |

## Security Considerations

- All endpoints require authentication (except health check)
- API keys are hashed before storage
- Request logging for audit trail
- Input sanitization on all endpoints
- CORS configuration for browser access
