/**
 * Breadcrumbs — navigation context header for the TUI session
 */

import React from 'react';
import { Box, Text } from 'ink';

interface BreadcrumbsProps {
  segments: string[];
  phaseColor?: string;
}

export function Breadcrumbs({ segments, phaseColor }: BreadcrumbsProps): React.ReactElement {
  return (
    <Box paddingX={1} marginBottom={1}>
      {segments.map((segment, i) => {
        const isFirst = i === 0;
        const isLast = i === segments.length - 1;
        const color = isLast && phaseColor ? phaseColor : isFirst ? 'cyan' : undefined;

        return (
          <React.Fragment key={i}>
            {i > 0 && <Text dimColor> {'>'} </Text>}
            <Text bold={isFirst || isLast} color={color} dimColor={!isFirst && !isLast}>
              {segment}
            </Text>
          </React.Fragment>
        );
      })}
    </Box>
  );
}
