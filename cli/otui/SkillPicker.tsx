/** @jsxImportSource @opentui/react */
/**
 * SkillPicker — overlay that lets the operator browse the skill
 * catalog and toggle which skills apply to a specific agent. Reached
 * from AgentControlPanel by pressing `k` on a selected agent.
 *
 * Keys:
 *   ↑/↓ or j     — select skill (vim-k is not aliased, it closes instead)
 *   space/enter  — toggle the selected skill applied/removed for the agent
 *   esc / k      — close back to AgentControlPanel
 *
 * The orchestrator stores overrides in-memory and the ClaudeCodeAgent
 * resolves them on every query, so toggles apply to the very next
 * agent response.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useKeyboard } from '@opentui/react';
import type { EDAOrchestrator } from '../../src/lib/eda/EDAOrchestrator';
import type { SkillCatalogEntry } from '../../src/lib/skills';
import { getAgentById } from '../../src/agents/personas';

interface SkillPickerProps {
  orchestrator: EDAOrchestrator;
  agentId: string;
  onClose: () => void;
}

const COLOR_ACCENT = '#ffbf00';
const COLOR_DIM = '#6b6b76';
const COLOR_TEXT = '#f5e6ff';
const COLOR_ON = '#4ade80';
const COLOR_OFF = '#6b6b76';
const COLOR_CURRENT = '#00e5ff';

const SOURCE_LABEL: Record<string, string> = {
  project: 'project',
  user: 'user',
  plugin: 'plugin',
  hook: 'skills.sh',
};

export function SkillPicker({
  orchestrator,
  agentId,
  onClose,
}: SkillPickerProps): React.ReactElement {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [, forceTick] = useState(0);

  const catalog = orchestrator.getSkillCatalog();
  const entries: ReadonlyArray<SkillCatalogEntry> = useMemo(
    () => catalog?.entries ?? [],
    [catalog]
  );

  useEffect(() => {
    const off = orchestrator.on((e) => {
      if (e.type === 'agent_skills_change') forceTick((t) => t + 1);
    });
    return () => {
      off();
    };
  }, [orchestrator]);

  const applied = new Set(orchestrator.getAgentSkillIds(agentId));
  const persona = getAgentById(agentId);

  useKeyboard((event) => {
    const key = (event.name ?? '').toLowerCase();

    if (key === 'escape' || key === 'k') {
      onClose();
      return;
    }
    if (entries.length === 0) return;

    if (key === 'up') {
      setSelectedIdx((i) => (i - 1 + entries.length) % entries.length);
      return;
    }
    if (key === 'down' || key === 'j') {
      setSelectedIdx((i) => (i + 1) % entries.length);
      return;
    }

    if (key === 'space' || key === 'return' || key === 'enter') {
      const skill = entries[selectedIdx];
      if (skill) orchestrator.toggleAgentSkill(agentId, skill.id);
    }
  });

  const clampedIdx = entries.length > 0 ? Math.min(selectedIdx, entries.length - 1) : 0;
  const selected = entries[clampedIdx];

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
          <text fg={COLOR_ACCENT}>SKILL PICKER</text>
          <text fg={COLOR_DIM}> · agent </text>
          <text fg={COLOR_CURRENT}>{persona?.name ?? agentId}</text>
          <text fg={COLOR_DIM}> · {applied.size}/{entries.length} applied</text>
        </box>
        <text fg={COLOR_DIM}>↑↓ select · space toggle · esc back</text>
      </box>

      {entries.length === 0 ? (
        <box marginTop={2}>
          <text fg={COLOR_DIM}>
            No skills discovered. Add a file to skills/ or `~/.claude/skills/forge/`,
          </text>
          <text fg={COLOR_DIM}>or have skills.sh list emit a JSON catalog.</text>
        </box>
      ) : null}

      <box marginTop={1} flexDirection="row" flexGrow={1}>
        {/* Left column: skill list */}
        <box flexDirection="column" width={44} flexShrink={0}>
          {entries.map((entry, idx) => {
            const isSelected = idx === clampedIdx;
            const isApplied = applied.has(entry.id);
            const border = isSelected ? COLOR_ACCENT : '#2a2a32';
            const check = isApplied ? '✓' : '○';
            const checkColor = isApplied ? COLOR_ON : COLOR_OFF;

            return (
              <box
                key={entry.id}
                border
                borderColor={border}
                padding={1}
                marginTop={idx === 0 ? 0 : 1}
                flexDirection="column"
              >
                <box flexDirection="row">
                  <text fg={checkColor}>{check} </text>
                  <text fg={isSelected ? COLOR_TEXT : COLOR_TEXT}>
                    {entry.label.slice(0, 34)}
                  </text>
                </box>
                <box flexDirection="row">
                  <text fg={COLOR_DIM}>{SOURCE_LABEL[entry.source] ?? entry.source}</text>
                  <text fg={COLOR_DIM}>  ·  </text>
                  <text fg={COLOR_DIM}>{entry.id.slice(0, 30)}</text>
                </box>
              </box>
            );
          })}
        </box>

        {/* Right column: preview */}
        <box flexDirection="column" flexGrow={1} marginLeft={1}>
          {selected ? (
            <box border borderColor="#2a2a32" padding={1} flexDirection="column" flexGrow={1}>
              <text fg={COLOR_ACCENT}>{selected.label}</text>
              <text fg={COLOR_DIM}>{selected.path}</text>
              <box marginTop={1}>
                <text fg={COLOR_TEXT}>{selected.summary || '(no summary)'}</text>
              </box>
              <box marginTop={1} flexDirection="column">
                <text fg={COLOR_DIM}>── content preview ──</text>
                {selected.content.slice(0, 600).split('\n').slice(0, 18).map((line, i) => (
                  <text key={i} fg={COLOR_TEXT}>
                    {line.length > 60 ? line.slice(0, 60) + '…' : line}
                  </text>
                ))}
              </box>
            </box>
          ) : null}
        </box>
      </box>
    </box>
  );
}
