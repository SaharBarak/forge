/**
 * PermissionDialog — Ink overlay component for tool permission approval.
 *
 * Rendered as a modal inside the Ink App. Subscribes to PermissionBroker
 * requests, presents approval UI, sends user decision back. Supports
 * three decisions: Always / Once / Deny.
 *
 * Inspired by claw-code's blocking approval dialogs.
 */

import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PermissionBroker, PermissionRequest, PermissionLevel } from '../../src/lib/render/permission';

interface PermissionDialogProps {
  readonly broker: PermissionBroker;
}

interface Pending {
  readonly request: PermissionRequest;
  readonly respond: (decision: PermissionLevel) => void;
}

const RISK_COLORS: Readonly<Record<PermissionRequest['risk'], string>> = {
  safe: 'green',
  write: 'yellow',
  execute: 'magenta',
  destructive: 'red',
};

const RISK_LABELS: Readonly<Record<PermissionRequest['risk'], string>> = {
  safe: 'SAFE',
  write: 'WRITES FILES',
  execute: 'EXECUTES COMMANDS',
  destructive: 'DESTRUCTIVE',
};

export function PermissionDialog({ broker }: PermissionDialogProps): React.ReactElement | null {
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    const unsub = broker.onRequest((request, respond) => {
      setPending({ request, respond });
    });
    return () => { unsub(); };
  }, [broker]);

  useInput((input, key) => {
    if (!pending) return;
    const choose = (decision: PermissionLevel): void => {
      pending.respond(decision);
      setPending(null);
    };
    if (input === 'y' || input === '1' || key.return) choose('once');
    else if (input === 'a' || input === '2') choose('always');
    else if (input === 'n' || input === '3' || key.escape) choose('deny');
  });

  if (!pending) return null;

  const { request } = pending;
  const riskColor = RISK_COLORS[request.risk];
  const riskLabel = RISK_LABELS[request.risk];

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={riskColor as 'red'}
      paddingX={2}
      paddingY={1}
    >
      <Text bold color={riskColor as 'red'}>
        ⚠  Tool Permission Request
      </Text>
      <Text> </Text>
      <Text>
        <Text dimColor>Tool: </Text>
        <Text bold>{request.toolName}</Text>
        <Text dimColor>  ·  Risk: </Text>
        <Text color={riskColor as 'red'} bold>{riskLabel}</Text>
      </Text>
      <Text> </Text>
      <Text dimColor>Prompt:</Text>
      <Box paddingLeft={2} flexDirection="column">
        {request.toolPrompt.split('\n').slice(0, 8).map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
        {request.toolPrompt.split('\n').length > 8 && (
          <Text dimColor>… ({request.toolPrompt.split('\n').length - 8} more lines)</Text>
        )}
      </Box>
      <Text> </Text>
      <Text>
        <Text color="green">[y] Once</Text>
        <Text dimColor>  ·  </Text>
        <Text color="yellow">[a] Always</Text>
        <Text dimColor>  ·  </Text>
        <Text color="red">[n] Deny</Text>
      </Text>
    </Box>
  );
}
