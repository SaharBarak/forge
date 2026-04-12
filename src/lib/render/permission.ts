/**
 * Tool permission system — pub/sub approval protocol.
 *
 * When a destructive tool is about to run, ToolRunner emits a
 * PermissionRequest. The UI renders a blocking approval prompt. User
 * decision flows back as a PermissionResponse, unblocking execution.
 *
 * Inspired by claw-code's permission dialogs but adapted to Forge's
 * event-driven architecture. Uses plain EventEmitter instead of a
 * full pub/sub backbone for simplicity.
 */

import { EventEmitter } from 'events';

export type PermissionLevel = 'always' | 'once' | 'deny';

export interface PermissionRequest {
  readonly id: string;
  readonly toolName: string;
  readonly toolPrompt: string;
  readonly risk: 'safe' | 'write' | 'execute' | 'destructive';
  readonly timestamp: Date;
}

export interface PermissionResponse {
  readonly id: string;
  readonly decision: PermissionLevel;
}

export interface PermissionBroker {
  readonly requestPermission: (req: PermissionRequest) => Promise<PermissionLevel>;
  readonly respond: (res: PermissionResponse) => void;
  readonly onRequest: (
    handler: (req: PermissionRequest, respond: (d: PermissionLevel) => void) => void
  ) => () => void;
}

/**
 * In-memory permission broker. The UI subscribes via `onRequest` to render
 * approval prompts. ToolRunner calls `requestPermission` and awaits the
 * user's decision. Promise resolves when UI calls `respond`.
 */
export const createPermissionBroker = (): PermissionBroker => {
  const emitter = new EventEmitter();
  const pending = new Map<string, (level: PermissionLevel) => void>();
  const autoApproved = new Set<string>(); // tool names with 'always' permission

  const requestPermission = (req: PermissionRequest): Promise<PermissionLevel> => {
    // Auto-approve if user previously said 'always' for this tool name.
    if (autoApproved.has(req.toolName)) {
      return Promise.resolve('always');
    }

    return new Promise<PermissionLevel>((resolve) => {
      pending.set(req.id, (decision: PermissionLevel) => {
        if (decision === 'always') autoApproved.add(req.toolName);
        resolve(decision);
      });
      emitter.emit('request', req);
    });
  };

  const respond = (res: PermissionResponse): void => {
    const handler = pending.get(res.id);
    if (handler) {
      pending.delete(res.id);
      handler(res.decision);
    }
  };

  const onRequest = (
    handler: (req: PermissionRequest, respond: (d: PermissionLevel) => void) => void
  ): (() => void) => {
    const wrapped = (req: PermissionRequest): void => {
      handler(req, (decision) => respond({ id: req.id, decision }));
    };
    emitter.on('request', wrapped);
    return () => emitter.off('request', wrapped);
  };

  return { requestPermission, respond, onRequest };
};

/**
 * Classify a tool by its risk profile. Used to decide whether to prompt.
 * `safe` tools run without prompting.
 */
export const classifyToolRisk = (toolName: string): PermissionRequest['risk'] => {
  // Read-only/generative tools
  if (/^(image|graph|chart|embed|search|fetch)/i.test(toolName)) return 'safe';
  // Writes to session dir
  if (/^(write|save|export)/i.test(toolName)) return 'write';
  // Executes commands
  if (/^(bash|shell|exec|run)/i.test(toolName)) return 'execute';
  // File system modifications outside session
  if (/^(delete|remove|rm|chmod)/i.test(toolName)) return 'destructive';
  return 'safe';
};
