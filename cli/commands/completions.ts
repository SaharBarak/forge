/**
 * Shell Completions Command
 * Generate shell completions for bash, zsh, and fish
 */

import { Command } from 'commander';
import chalk from 'chalk';

export function createCompletionsCommand(): Command {
  const completions = new Command('completions')
    .description('Generate shell completions')
    .argument('<shell>', 'Shell type: bash, zsh, or fish')
    .action((shell: string) => {
      const shellLower = shell.toLowerCase();

      switch (shellLower) {
        case 'bash':
          console.log(generateBashCompletions());
          break;
        case 'zsh':
          console.log(generateZshCompletions());
          break;
        case 'fish':
          console.log(generateFishCompletions());
          break;
        default:
          console.error(chalk.red(`Unknown shell: ${shell}`));
          console.error('Supported shells: bash, zsh, fish');
          console.error('');
          console.error('Installation:');
          console.error('  bash: forge completions bash >> ~/.bashrc');
          console.error('  zsh:  forge completions zsh >> ~/.zshrc');
          console.error('  fish: forge completions fish > ~/.config/fish/completions/forge.fish');
          process.exit(1);
      }
    });

  return completions;
}

function generateBashCompletions(): string {
  return `# Forge CLI bash completions
# Add to ~/.bashrc: source <(forge completions bash)

_forge_completions() {
    local cur prev words cword
    _init_completion || return

    local commands="start briefs agents personas sessions batch watch export completions help"
    local sessions_commands="list ls show delete rm export clean"
    local personas_commands="list generate export import test"
    
    case "\${COMP_CWORD}" in
        1)
            COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
            ;;
        2)
            case "\${prev}" in
                sessions)
                    COMPREPLY=( $(compgen -W "\${sessions_commands}" -- "\${cur}") )
                    ;;
                personas)
                    COMPREPLY=( $(compgen -W "\${personas_commands}" -- "\${cur}") )
                    ;;
                export)
                    COMPREPLY=( $(compgen -W "md json html pdf docx" -- "\${cur}") )
                    ;;
                completions)
                    COMPREPLY=( $(compgen -W "bash zsh fish" -- "\${cur}") )
                    ;;
                start)
                    COMPREPLY=( $(compgen -W "-b --brief -p --project -g --goal -a --agents --personas -l --language --human --no-human -o --output" -- "\${cur}") )
                    ;;
                batch)
                    COMPREPLY=( $(compgen -f -X '!*.md' -- "\${cur}") $(compgen -W "-p --parallel -o --output -a --agents -l --language --json --dry-run --resume --timeout" -- "\${cur}") )
                    ;;
                watch)
                    COMPREPLY=( $(compgen -W "-b --brief -c --context -o --output -d --debounce -a --agents -l --language --json" -- "\${cur}") )
                    ;;
            esac
            ;;
        *)
            case "\${words[1]}" in
                start)
                    case "\${prev}" in
                        -b|--brief)
                            COMPREPLY=( $(compgen -f -X '!*.md' -- "\${cur}") )
                            ;;
                        -l|--language)
                            COMPREPLY=( $(compgen -W "hebrew english mixed" -- "\${cur}") )
                            ;;
                        *)
                            COMPREPLY=( $(compgen -W "-b --brief -p --project -g --goal -a --agents --personas -l --language --human --no-human -o --output" -- "\${cur}") )
                            ;;
                    esac
                    ;;
            esac
            ;;
    esac
}

complete -F _forge_completions forge
`;
}

function generateZshCompletions(): string {
  return `#compdef forge

# Forge CLI zsh completions
# Add to ~/.zshrc: source <(forge completions zsh)

_forge() {
    local -a commands
    local -a sessions_commands
    local -a personas_commands

    commands=(
        'start:Start a new debate session'
        'briefs:List available briefs'
        'agents:List available agents'
        'personas:Manage custom personas'
        'sessions:Manage saved sessions'
        'batch:Process multiple briefs in batch mode'
        'watch:Watch for file changes'
        'export:Export session'
        'completions:Generate shell completions'
        'help:Show help'
    )

    sessions_commands=(
        'list:List all saved sessions'
        'ls:List all saved sessions'
        'show:Show session details'
        'delete:Delete a saved session'
        'rm:Delete a saved session'
        'export:Export session to file'
        'clean:Delete old sessions'
    )

    personas_commands=(
        'list:List available personas'
        'generate:Generate new personas'
        'export:Export personas to file'
        'import:Import personas from file'
        'test:Test a persona'
    )

    case \$state in
        (command)
            _describe -t commands 'forge commands' commands
            ;;
    esac

    case "\$words[2]" in
        sessions)
            _describe -t commands 'sessions commands' sessions_commands
            ;;
        personas)
            _describe -t commands 'personas commands' personas_commands
            ;;
        completions)
            _values 'shell' bash zsh fish
            ;;
        start)
            _arguments \\
                '-b[Brief file]:brief:_files -g "*.md"' \\
                '--brief[Brief file]:brief:_files -g "*.md"' \\
                '-p[Project name]:project:' \\
                '--project[Project name]:project:' \\
                '-g[Project goal]:goal:' \\
                '--goal[Project goal]:goal:' \\
                '-a[Agent IDs]:agents:' \\
                '--agents[Agent IDs]:agents:' \\
                '--personas[Persona set]:personas:' \\
                '-l[Language]:language:(hebrew english mixed)' \\
                '--language[Language]:language:(hebrew english mixed)' \\
                '--human[Enable human participation]' \\
                '--no-human[Disable human participation]' \\
                '-o[Output directory]:output:_directories'
            ;;
        batch)
            _arguments \\
                '*:brief pattern:_files -g "*.md"' \\
                '-p[Parallel count]:parallel:' \\
                '--parallel[Parallel count]:parallel:' \\
                '-o[Output directory]:output:_directories' \\
                '--output[Output directory]:output:_directories' \\
                '-a[Agent IDs]:agents:' \\
                '--agents[Agent IDs]:agents:' \\
                '-l[Language]:language:(hebrew english mixed)' \\
                '--language[Language]:language:(hebrew english mixed)' \\
                '--json[JSON output]' \\
                '--dry-run[Dry run]' \\
                '--resume[Skip processed]' \\
                '--timeout[Timeout in minutes]:timeout:'
            ;;
        watch)
            _arguments \\
                '-b[Brief file]:brief:_files -g "*.md"' \\
                '--brief[Brief file]:brief:_files -g "*.md"' \\
                '-c[Context directory]:context:_directories' \\
                '--context[Context directory]:context:_directories' \\
                '-o[Output directory]:output:_directories' \\
                '--output[Output directory]:output:_directories' \\
                '-d[Debounce ms]:debounce:' \\
                '--debounce[Debounce ms]:debounce:' \\
                '-a[Agent IDs]:agents:' \\
                '--agents[Agent IDs]:agents:' \\
                '-l[Language]:language:(hebrew english mixed)' \\
                '--language[Language]:language:(hebrew english mixed)' \\
                '--json[JSON output]'
            ;;
    esac
}

_forge "\$@"
`;
}

function generateFishCompletions(): string {
  return `# Forge CLI fish completions
# Save to: ~/.config/fish/completions/forge.fish

# Disable file completion by default
complete -c forge -f

# Main commands
complete -c forge -n __fish_use_subcommand -a start -d 'Start a new debate session'
complete -c forge -n __fish_use_subcommand -a briefs -d 'List available briefs'
complete -c forge -n __fish_use_subcommand -a agents -d 'List available agents'
complete -c forge -n __fish_use_subcommand -a personas -d 'Manage custom personas'
complete -c forge -n __fish_use_subcommand -a sessions -d 'Manage saved sessions'
complete -c forge -n __fish_use_subcommand -a batch -d 'Process multiple briefs in batch mode'
complete -c forge -n __fish_use_subcommand -a watch -d 'Watch for file changes'
complete -c forge -n __fish_use_subcommand -a export -d 'Export session'
complete -c forge -n __fish_use_subcommand -a completions -d 'Generate shell completions'
complete -c forge -n __fish_use_subcommand -a help -d 'Show help'

# sessions subcommands
complete -c forge -n '__fish_seen_subcommand_from sessions' -a list -d 'List all saved sessions'
complete -c forge -n '__fish_seen_subcommand_from sessions' -a ls -d 'List all saved sessions'
complete -c forge -n '__fish_seen_subcommand_from sessions' -a show -d 'Show session details'
complete -c forge -n '__fish_seen_subcommand_from sessions' -a delete -d 'Delete a saved session'
complete -c forge -n '__fish_seen_subcommand_from sessions' -a rm -d 'Delete a saved session'
complete -c forge -n '__fish_seen_subcommand_from sessions' -a export -d 'Export session to file'
complete -c forge -n '__fish_seen_subcommand_from sessions' -a clean -d 'Delete old sessions'

# personas subcommands
complete -c forge -n '__fish_seen_subcommand_from personas' -a list -d 'List available personas'
complete -c forge -n '__fish_seen_subcommand_from personas' -a generate -d 'Generate new personas'
complete -c forge -n '__fish_seen_subcommand_from personas' -a export -d 'Export personas'
complete -c forge -n '__fish_seen_subcommand_from personas' -a import -d 'Import personas'
complete -c forge -n '__fish_seen_subcommand_from personas' -a test -d 'Test a persona'

# completions subcommand
complete -c forge -n '__fish_seen_subcommand_from completions' -a 'bash zsh fish'

# start command options
complete -c forge -n '__fish_seen_subcommand_from start' -s b -l brief -d 'Brief file' -r -F
complete -c forge -n '__fish_seen_subcommand_from start' -s p -l project -d 'Project name' -r
complete -c forge -n '__fish_seen_subcommand_from start' -s g -l goal -d 'Project goal' -r
complete -c forge -n '__fish_seen_subcommand_from start' -s a -l agents -d 'Agent IDs' -r
complete -c forge -n '__fish_seen_subcommand_from start' -l personas -d 'Persona set' -r
complete -c forge -n '__fish_seen_subcommand_from start' -s l -l language -d 'Language' -r -a 'hebrew english mixed'
complete -c forge -n '__fish_seen_subcommand_from start' -l human -d 'Enable human participation'
complete -c forge -n '__fish_seen_subcommand_from start' -l no-human -d 'Disable human participation'
complete -c forge -n '__fish_seen_subcommand_from start' -s o -l output -d 'Output directory' -r -a '(__fish_complete_directories)'

# batch command options
complete -c forge -n '__fish_seen_subcommand_from batch' -s p -l parallel -d 'Parallel count' -r
complete -c forge -n '__fish_seen_subcommand_from batch' -s o -l output -d 'Output directory' -r -a '(__fish_complete_directories)'
complete -c forge -n '__fish_seen_subcommand_from batch' -s a -l agents -d 'Agent IDs' -r
complete -c forge -n '__fish_seen_subcommand_from batch' -s l -l language -d 'Language' -r -a 'hebrew english mixed'
complete -c forge -n '__fish_seen_subcommand_from batch' -l json -d 'JSON output'
complete -c forge -n '__fish_seen_subcommand_from batch' -l dry-run -d 'Show what would be processed'
complete -c forge -n '__fish_seen_subcommand_from batch' -l resume -d 'Skip already processed'
complete -c forge -n '__fish_seen_subcommand_from batch' -l timeout -d 'Timeout per brief in minutes' -r

# watch command options
complete -c forge -n '__fish_seen_subcommand_from watch' -s b -l brief -d 'Brief file' -r -F
complete -c forge -n '__fish_seen_subcommand_from watch' -s c -l context -d 'Context directory' -r -a '(__fish_complete_directories)'
complete -c forge -n '__fish_seen_subcommand_from watch' -s o -l output -d 'Output directory' -r -a '(__fish_complete_directories)'
complete -c forge -n '__fish_seen_subcommand_from watch' -s d -l debounce -d 'Debounce time in ms' -r
complete -c forge -n '__fish_seen_subcommand_from watch' -s a -l agents -d 'Agent IDs' -r
complete -c forge -n '__fish_seen_subcommand_from watch' -s l -l language -d 'Language' -r -a 'hebrew english mixed'
complete -c forge -n '__fish_seen_subcommand_from watch' -l json -d 'JSON output'
`;
}
