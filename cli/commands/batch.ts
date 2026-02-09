/**
 * Batch Processing Command
 * Run multiple briefs in parallel or sequence
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs/promises';
import { glob } from 'glob';
import { v4 as uuid } from 'uuid';
import { CLIAgentRunner } from '../adapters/CLIAgentRunner';
import { FileSystemAdapter } from '../adapters/FileSystemAdapter';
import { SessionPersistence } from '../adapters/SessionPersistence';
import { EDAOrchestrator } from '../../src/lib/eda/EDAOrchestrator';
import { getDefaultMethodology } from '../../src/methodologies';
import { AGENT_PERSONAS } from '../../src/agents/personas';
import type { Session, SessionConfig } from '../../src/types';

interface BatchResult {
  brief: string;
  status: 'success' | 'error' | 'skipped';
  sessionId?: string;
  outputDir?: string;
  error?: string;
  duration?: number;
}

interface BatchOptions {
  parallel?: number;
  output?: string;
  agents?: string;
  language?: string;
  json?: boolean;
  dryRun?: boolean;
  resume?: boolean;
  timeout?: number;
}

export function createBatchCommand(): Command {
  const batch = new Command('batch')
    .description('Process multiple briefs in batch mode')
    .argument('<pattern>', 'Glob pattern for brief files (e.g., "./briefs/*.md")')
    .option('-p, --parallel <count>', 'Number of parallel sessions', '1')
    .option('-o, --output <dir>', 'Output directory', 'output/batch')
    .option('-a, --agents <ids>', 'Comma-separated agent IDs')
    .option('-l, --language <lang>', 'Language: hebrew, english, mixed', 'hebrew')
    .option('--json', 'Output results as JSON')
    .option('--dry-run', 'Show what would be processed without running')
    .option('--resume', 'Skip already processed briefs')
    .option('--timeout <minutes>', 'Timeout per brief in minutes', '30')
    .action(async (pattern: string, options: BatchOptions) => {
      const exitCode = await runBatch(pattern, options);
      process.exit(exitCode);
    });

  return batch;
}

async function runBatch(pattern: string, options: BatchOptions): Promise<number> {
  const cwd = process.cwd();
  const parallel = parseInt(options.parallel || '1', 10);
  const outputDir = path.resolve(cwd, options.output || 'output/batch');
  const timeout = parseInt(options.timeout || '30', 10) * 60 * 1000; // Convert to ms

  // Find matching briefs
  const briefPaths = await glob(pattern, { cwd, absolute: true });
  
  if (briefPaths.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ error: 'No briefs found matching pattern', pattern }, null, 2));
    } else {
      console.error(`No briefs found matching pattern: ${pattern}`);
    }
    return 1;
  }

  // Sort for consistent ordering
  briefPaths.sort();

  if (!options.json) {
    console.log(`\n🔥 Forge Batch Processing`);
    console.log(`   Briefs: ${briefPaths.length}`);
    console.log(`   Parallel: ${parallel}`);
    console.log(`   Output: ${outputDir}`);
    console.log('');
  }

  // Dry run - just show what would be processed
  if (options.dryRun) {
    const dryRunResults = briefPaths.map(p => ({
      brief: path.relative(cwd, p),
      wouldProcess: true,
    }));
    
    if (options.json) {
      console.log(JSON.stringify({ dryRun: true, briefs: dryRunResults }, null, 2));
    } else {
      console.log('Would process:');
      dryRunResults.forEach(r => console.log(`  • ${r.brief}`));
    }
    return 0;
  }

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Check for already processed (resume mode)
  let toProcess = briefPaths;
  if (options.resume) {
    const processed = await getProcessedBriefs(outputDir);
    toProcess = briefPaths.filter(p => !processed.has(path.basename(p, '.md')));
    
    if (!options.json && toProcess.length < briefPaths.length) {
      console.log(`Skipping ${briefPaths.length - toProcess.length} already processed briefs.`);
    }
  }

  if (toProcess.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ message: 'All briefs already processed', count: 0 }, null, 2));
    } else {
      console.log('All briefs already processed.');
    }
    return 0;
  }

  // Parse agent IDs
  let enabledAgents: string[] = AGENT_PERSONAS.map(a => a.id);
  if (options.agents) {
    enabledAgents = options.agents.split(',').map(id => id.trim());
  }

  // Process in batches
  const results: BatchResult[] = [];
  const startTime = Date.now();

  for (let i = 0; i < toProcess.length; i += parallel) {
    const batch = toProcess.slice(i, i + parallel);
    
    if (!options.json) {
      console.log(`\nProcessing batch ${Math.floor(i / parallel) + 1}/${Math.ceil(toProcess.length / parallel)}...`);
    }

    const batchResults = await Promise.all(
      batch.map(briefPath => processBrief(briefPath, {
        cwd,
        outputDir,
        enabledAgents,
        language: options.language || 'hebrew',
        timeout,
        json: options.json,
      }))
    );

    results.push(...batchResults);
  }

  const endTime = Date.now();
  const totalDuration = (endTime - startTime) / 1000;

  // Summary
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'error').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  if (options.json) {
    console.log(JSON.stringify({
      summary: {
        total: results.length,
        successful,
        failed,
        skipped,
        durationSeconds: totalDuration,
      },
      results,
    }, null, 2));
  } else {
    console.log('\n' + '═'.repeat(50));
    console.log('BATCH COMPLETE');
    console.log('═'.repeat(50));
    console.log(`Total: ${results.length} briefs`);
    console.log(`Success: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Duration: ${totalDuration.toFixed(1)}s`);
    console.log(`Output: ${outputDir}`);
  }

  // Return appropriate exit code
  return failed > 0 ? 1 : 0;
}

async function processBrief(briefPath: string, opts: {
  cwd: string;
  outputDir: string;
  enabledAgents: string[];
  language: string;
  timeout: number;
  json?: boolean;
}): Promise<BatchResult> {
  const briefName = path.basename(briefPath, '.md');
  const startTime = Date.now();

  if (!opts.json) {
    console.log(`  📄 ${briefName}...`);
  }

  try {
    const fsAdapter = new FileSystemAdapter(opts.cwd);
    const agentRunner = new CLIAgentRunner();

    // Read brief content
    const briefContent = await fs.readFile(briefPath, 'utf-8');
    
    // Extract project name from brief
    const titleMatch = briefContent.match(/^#\s+(.+)$/m);
    const projectName = titleMatch ? titleMatch[1] : briefName;
    const goal = `Create content for ${projectName}`;

    // Create session config
    const config: SessionConfig = {
      id: uuid(),
      projectName,
      goal,
      enabledAgents: opts.enabledAgents,
      humanParticipation: false, // Batch mode = no human
      maxRounds: 5, // Shorter for batch
      consensusThreshold: 0.6,
      methodology: getDefaultMethodology(),
      contextDir: path.join(opts.cwd, 'context'),
      outputDir: opts.outputDir,
      language: opts.language,
    };

    // Create session
    const session: Session = {
      id: config.id,
      config,
      messages: [],
      currentPhase: 'initialization',
      currentRound: 0,
      decisions: [],
      drafts: [],
      startedAt: new Date(),
      status: 'running',
    };

    // Create persistence with brief-specific subdirectory
    const persistence = new SessionPersistence(fsAdapter, {
      outputDir: path.join(opts.outputDir, briefName),
    });
    await persistence.initSession(session);

    // Create orchestrator
    const orchestrator = new EDAOrchestrator(
      session,
      undefined,
      undefined,
      {
        agentRunner,
        fileSystem: fsAdapter,
      }
    );

    // Save on updates
    orchestrator.on((event) => {
      if (event.type === 'agent_message') {
        persistence.updateSession(orchestrator.getSession());
      }
    });

    // Run with timeout
    const runPromise = runSession(orchestrator, briefContent);
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), opts.timeout);
    });

    await Promise.race([runPromise, timeoutPromise]);

    // Save final state
    await persistence.saveFull();

    const duration = (Date.now() - startTime) / 1000;

    if (!opts.json) {
      console.log(`  ✅ ${briefName} (${duration.toFixed(1)}s)`);
    }

    return {
      brief: briefName,
      status: 'success',
      sessionId: session.id,
      outputDir: persistence.getSessionDir(),
      duration,
    };

  } catch (error: any) {
    const duration = (Date.now() - startTime) / 1000;

    if (!opts.json) {
      console.log(`  ❌ ${briefName}: ${error.message}`);
    }

    return {
      brief: briefName,
      status: 'error',
      error: error.message,
      duration,
    };
  }
}

async function runSession(orchestrator: EDAOrchestrator, briefContent: string): Promise<void> {
  // Start orchestrator
  orchestrator.start();

  // Add brief as initial context
  await orchestrator.addHumanMessage(`Here is the brief:\n\n${briefContent}`);

  // Wait for completion or max rounds
  return new Promise((resolve) => {
    let checkCount = 0;
    const maxChecks = 60; // 5 minutes max (5s intervals)

    const checkInterval = setInterval(() => {
      const session = orchestrator.getSession();
      checkCount++;

      // Check if done
      if (
        session.status === 'completed' ||
        session.currentPhase === 'completed' ||
        checkCount >= maxChecks
      ) {
        clearInterval(checkInterval);
        orchestrator.stop();
        resolve();
      }
    }, 5000);
  });
}

async function getProcessedBriefs(outputDir: string): Promise<Set<string>> {
  const processed = new Set<string>();
  
  try {
    const entries = await fs.readdir(outputDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        // Check if session.json exists
        try {
          await fs.access(path.join(outputDir, entry.name, 'session.json'));
          processed.add(entry.name);
        } catch {
          // Not fully processed
        }
      }
    }
  } catch {
    // Output dir doesn't exist yet
  }

  return processed;
}
