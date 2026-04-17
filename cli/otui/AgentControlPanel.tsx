/** @jsxImportSource @opentui/react */
/**
 * AgentControlPanel — overlay that lets the operator view and control
 * every alive agent in the current deliberation.
 *
 * Toggled by pressing `a` from the main OpenTUI view. Keys while open:
 *   ↑/↓ or j/k  — select agent
 *   ←/→ or h/l  — cycle model within the current provider
 *   p           — cycle provider (e.g. Anthropic → Gemini)
 *   space       — pause/resume the agent
 *   s           — force-speak (agent takes the floor next)
 *   esc / a     — close the panel
 *
 * The panel is a pure rendering surface. All mutations go through the
 * orchestrator's `updateAgentConfig` / `forceSpeak`, which emit EDA
 * events so the parent App re-syncs.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useKeyboard } from '@opentui/react';
import type { EDAOrchestrator } from '../../src/lib/eda/EDAOrchestrator';
import type {
  AgentRuntimeConfig,
  IProvider,
} from '../../src/lib/providers';
import { getAgentById } from '../../src/agents/personas';
import { SkillPicker } from './SkillPicker';

interface AgentControlPanelProps {
  orchestrator: EDAOrchestrator;
  agentIds: ReadonlyArray<string>;
  currentSpeaker: string | null;
  agentStates: ReadonlyMap<string, string>;
  onClose: () => void;
}

interface Row {
  id: string;
  name: string;
  role: string;
  state: string;
  config: AgentRuntimeConfig;
  providerName: string;
  modelLabel: string;
}

const COLOR_ACCENT = '#e879f9';
const COLOR_DIM = '#6b6b76';
const COLOR_TEXT = '#f5e6ff';
const COLOR_CURRENT = '#00e5ff';
const COLOR_PAUSED = '#fb923c';
const COLOR_OK = '#4ade80';

const cycle = <T,>(arr: ReadonlyArray<T>, current: T, predicate: (x: T) => boolean): T => {
  if (arr.length === 0) return current;
  const idx = arr.findIndex(predicate);
  return arr[(idx + 1) % arr.length];
};

export function AgentControlPanel({
  orchestrator,
  agentIds,
  currentSpeaker,
  agentStates,
  onClose,
}: AgentControlPanelProps): React.ReactElement {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [, forceTick] = useState(0);
  // agentId whose skill picker is open — null when on the main panel.
  const [skillPickerFor, setSkillPickerFor] = useState<string | null>(null);

  const providers = orchestrator.getProviders();
  const availableProviders = useMemo<ReadonlyArray<IProvider>>(
    () => providers?.listAvailable() ?? [],
    [providers]
  );

  // Re-render on orchestrator config mutations.
  useEffect(() => {
    const off = orchestrator.on((e) => {
      if (e.type === 'agent_config_change' || e.type === 'floor_status') {
        forceTick((t) => t + 1);
      }
    });
    return () => {
      off();
    };
  }, [orchestrator]);

  const rows: ReadonlyArray<Row> = useMemo(() => {
    return agentIds.map((id) => {
      const persona = getAgentById(id);
      const config = orchestrator.getAgentConfig(id);
      const provider = providers?.tryGet(config.providerId);
      const model = provider?.listModels().find((m) => m.id === config.modelId);
      return {
        id,
        name: persona?.name ?? id,
        role: persona?.role ?? '—',
        state: agentStates.get(id) ?? 'listening',
        config,
        providerName: provider?.name ?? config.providerId,
        modelLabel: model?.label ?? config.modelId,
      };
    });
  }, [agentIds, agentStates, orchestrator, providers]);

  const clampedIdx = rows.length > 0 ? Math.min(selectedIdx, rows.length - 1) : 0;
  const selected = rows[clampedIdx];

  useKeyboard((event) => {
    // When the SkillPicker is mounted, it owns keyboard input.
    if (skillPickerFor !== null) return;
    const name = event.name ?? '';
    const key = name.toLowerCase();

    if (key === 'escape' || key === 'a') {
      onClose();
      return;
    }
    if (rows.length === 0) return;

    if (key === 'up' || key === 'k') {
      setSelectedIdx((i) => (i - 1 + rows.length) % rows.length);
      return;
    }
    if (key === 'down' || key === 'j') {
      setSelectedIdx((i) => (i + 1) % rows.length);
      return;
    }

    if (!selected) return;

    if (key === 'left' || key === 'h' || key === 'right' || key === 'l') {
      const provider = providers?.tryGet(selected.config.providerId);
      if (!provider) return;
      const models = provider.listModels();
      if (models.length === 0) return;
      const idx = Math.max(0, models.findIndex((m) => m.id === selected.config.modelId));
      const delta = key === 'left' || key === 'h' ? -1 : 1;
      const next = models[(idx + delta + models.length) % models.length];
      orchestrator.updateAgentConfig(selected.id, { modelId: next.id });
      return;
    }

    if (key === 'p') {
      if (availableProviders.length < 2) return;
      const next = cycle<IProvider>(
        availableProviders,
        availableProviders[0],
        (p) => p.id === selected.config.providerId
      );
      orchestrator.updateAgentConfig(selected.id, {
        providerId: next.id,
        modelId: next.defaultModelId(),
      });
      return;
    }

    if (key === 'space') {
      orchestrator.updateAgentConfig(selected.id, {
        paused: !selected.config.paused,
      });
      return;
    }

    if (key === 's') {
      // Fire-and-forget; result lands in the bus.
      void orchestrator.forceSpeak(selected.id, 'operator force-speak');
      return;
    }

    if (key === 'k') {
      setSkillPickerFor(selected.id);
    }
  });

  if (skillPickerFor !== null) {
    return (
      <SkillPicker
        orchestrator={orchestrator}
        agentId={skillPickerFor}
        onClose={() => setSkillPickerFor(null)}
      />
    );
  }

  return (
    <box
      border
      borderColor={COLOR_ACCENT}
      padding={1}
      flexDirection="column"
      width="100%"
      height="100%"
    >
      <box flexDirection="row" justifyContent="space-between">
        <box flexDirection="row">
          <text fg={COLOR_ACCENT}>AGENT CONTROL</text>
          <text fg={COLOR_DIM}> · {rows.length} alive</text>
        </box>
        <text fg={COLOR_DIM}>
          ↑↓ select · ←→ model · p provider · k skills · space pause · s speak · esc close
        </text>
      </box>

      {availableProviders.length === 0 ? (
        <box marginTop={1}>
          <text fg={COLOR_PAUSED}>
            No providers available. Set ANTHROPIC_API_KEY or GEMINI_API_KEY.
          </text>
        </box>
      ) : null}

      <box marginTop={1} flexDirection="column">
        {rows.map((row, idx) => {
          const isSelected = idx === clampedIdx;
          const isSpeaking = row.id === currentSpeaker;
          const border = isSelected ? COLOR_ACCENT : isSpeaking ? COLOR_CURRENT : '#2a2a32';
          const nameColor = row.config.paused ? COLOR_PAUSED : COLOR_TEXT;
          const stateColor = isSpeaking ? COLOR_CURRENT : COLOR_DIM;
          const statusLabel = row.config.paused
            ? 'PAUSED'
            : isSpeaking
            ? 'SPEAKING'
            : row.state.toUpperCase();

          return (
            <box
              key={row.id}
              border
              borderColor={border}
              padding={1}
              marginTop={idx === 0 ? 0 : 1}
              flexDirection="column"
            >
              <box flexDirection="row" justifyContent="space-between">
                <box flexDirection="row">
                  <text fg={nameColor}>
                    {isSelected ? '▸ ' : '  '}
                    {row.name}
                  </text>
                  <text fg={COLOR_DIM}> · </text>
                  <text fg={COLOR_DIM}>{row.role.slice(0, 40)}</text>
                </box>
                <text fg={stateColor}>{statusLabel}</text>
              </box>

              <box flexDirection="row" marginTop={1}>
                <text fg={COLOR_DIM}>provider </text>
                <text fg={COLOR_OK}>{row.providerName}</text>
                <text fg={COLOR_DIM}>  ·  model </text>
                <text fg={COLOR_CURRENT}>{row.modelLabel}</text>
              </box>

              {row.config.systemSuffix ? (
                <box flexDirection="row" marginTop={1}>
                  <text fg={COLOR_DIM}>directive </text>
                  <text fg={COLOR_TEXT}>{row.config.systemSuffix.slice(0, 80)}</text>
                </box>
              ) : null}
            </box>
          );
        })}
      </box>
    </box>
  );
}
