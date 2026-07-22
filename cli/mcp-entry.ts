import { runMcp } from './commands/mcp';

runMcp().catch((error) => {
  process.stderr.write(
    `forge mcp failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
