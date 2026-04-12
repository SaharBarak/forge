/**
 * multilineText - Multi-line text input for @clack/prompts
 * Enter adds a new line, Ctrl+D submits, Ctrl+C cancels.
 * Styled to match clack prompt aesthetics.
 */

import * as readline from 'readline';
import chalk from 'chalk';

const S_BAR = chalk.gray('│');
const S_STEP_SUBMIT = chalk.green('◇');
const S_STEP_CANCEL = chalk.red('■');
const S_STEP_ACTIVE = chalk.cyan('◆');

export interface MultilineTextOptions {
  message: string;
  placeholder?: string;
  defaultValue?: string;
  validate?: (value: string) => string | undefined;
}

/**
 * Prompt for multi-line text input.
 * - Enter = new line
 * - Ctrl+D = submit
 * - Ctrl+C = cancel
 */
export async function multilineText(opts: MultilineTextOptions): Promise<string | symbol> {
  const { message, placeholder, defaultValue } = opts;

  // Print header
  process.stdout.write(`${S_STEP_ACTIVE}  ${message}\n`);
  process.stdout.write(`${S_BAR}  ${chalk.dim('Enter for new line, Ctrl+D to submit')}\n`);
  if (placeholder) {
    process.stdout.write(`${S_BAR}  ${chalk.dim(placeholder)}\n`);
  }

  const lines: string[] = defaultValue ? defaultValue.split('\n') : [];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${S_BAR}  `,
    terminal: true,
  });

  return new Promise<string | symbol>((resolve) => {
    let cancelled = false;

    rl.prompt();

    rl.on('line', (line: string) => {
      lines.push(line);
      rl.prompt();
    });

    rl.on('close', () => {
      if (cancelled) return;

      const value = lines.join('\n').trim();

      // Validate
      if (opts.validate) {
        const error = opts.validate(value);
        if (error) {
          // Clear and re-prompt
          process.stdout.write(`${S_BAR}  ${chalk.red(error)}\n`);
          // Re-open for more input
          const rl2 = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: `${S_BAR}  `,
            terminal: true,
          });
          lines.length = 0;
          rl2.prompt();
          rl2.on('line', (l: string) => { lines.push(l); rl2.prompt(); });
          rl2.on('close', () => {
            const val2 = lines.join('\n').trim();
            process.stdout.write(`${S_STEP_SUBMIT}  ${message}\n`);
            process.stdout.write(`${S_BAR}  ${chalk.dim(val2.split('\n')[0])}${val2.includes('\n') ? chalk.dim(` (+${val2.split('\n').length - 1} lines)`) : ''}\n`);
            resolve(val2);
          });
          rl2.on('SIGINT', () => { cancelled = true; rl2.close(); resolve(Symbol.for('clack:cancel')); });
          return;
        }
      }

      // Print submit confirmation
      const preview = value.split('\n')[0].slice(0, 60);
      const lineCount = value.split('\n').length;
      process.stdout.write(`${S_STEP_SUBMIT}  ${message}\n`);
      process.stdout.write(`${S_BAR}  ${chalk.dim(preview)}${lineCount > 1 ? chalk.dim(` (+${lineCount - 1} more lines)`) : ''}\n`);

      resolve(value);
    });

    rl.on('SIGINT', () => {
      cancelled = true;
      rl.close();
      process.stdout.write(`${S_STEP_CANCEL}  ${chalk.strikethrough(chalk.dim(message))}\n`);
      resolve(Symbol.for('clack:cancel'));
    });
  });
}
