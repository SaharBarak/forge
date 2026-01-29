/**
 * Persona generation command
 * Generate debate personas for any domain using AI
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs/promises';
import Anthropic from '@anthropic-ai/sdk';
import type { AgentPersona } from '../../src/types';

const PERSONA_GENERATION_PROMPT = `You are an expert at creating debate personas for multi-agent deliberation systems.

Your task is to generate a set of personas that will engage in productive debate about a specific domain or project. Each persona should:

1. **Represent a distinct stakeholder perspective** - Different roles, backgrounds, or viewpoints that naturally create productive tension
2. **Have complementary blind spots** - What one misses, another catches
3. **Bring unique expertise** - Each persona should have domain knowledge the others lack
4. **Have realistic biases** - Based on their background and role
5. **Create productive conflict** - Their perspectives should naturally clash in ways that lead to better outcomes

## Output Format
Return a JSON object with TWO fields:

### 1. "expertise" field
A markdown string containing domain-specific knowledge ALL personas should have. This should include:
- Key terminology and concepts for the domain
- Best practices and frameworks
- Common pitfalls to avoid
- Decision-making criteria relevant to the domain
- Industry standards or regulations if applicable

### 2. "personas" field
An array of personas. Each persona must have:
- id: lowercase, no spaces (e.g., "skeptical-engineer")
- name: A realistic first name
- nameHe: Hebrew version of the name (transliterate if needed)
- role: Short role description (e.g., "The Risk-Averse Investor")
- age: Realistic age for their role
- background: 2-3 sentence background explaining their perspective
- personality: Array of 4-5 personality traits relevant to debates
- biases: Array of 3-4 biases they bring to discussions
- strengths: Array of 3-4 debate/analysis strengths
- weaknesses: Array of 2 potential blind spots
- speakingStyle: How they communicate in debates
- color: One of: pink, green, purple, orange, blue, cyan, yellow, red
- expertise: Array of 3-5 specific areas THIS persona is expert in (unique to them)

## Example Output Structure
{
  "expertise": "## Domain Expertise\\n\\n### Key Concepts\\n- Concept 1...\\n### Best Practices\\n- Practice 1...",
  "personas": [
    {
      "id": "cautious-analyst",
      "name": "Sarah",
      ...
      "expertise": ["risk assessment", "regulatory compliance", "data analysis"]
    }
  ]
}

## Important
- Create 4-6 personas unless specified otherwise
- Ensure diversity in age, background, and perspective
- Make them feel like real people, not caricatures
- Their conflicts should be productive, not personal
- The shared expertise should be comprehensive enough to inform good debates
- Each persona's individual expertise should be distinct`;

export function createPersonasCommand(): Command {
  const personas = new Command('personas')
    .description('Manage debate personas');

  // Generate subcommand
  personas
    .command('generate')
    .description('Generate new personas for a domain')
    .option('-d, --domain <domain>', 'Domain or topic for the debate')
    .option('-b, --brief <name>', 'Generate from a brief file')
    .option('-c, --count <n>', 'Number of personas to generate', '5')
    .option('-r, --roles <roles>', 'Specific roles to include (comma-separated)')
    .option('-n, --name <name>', 'Name for the persona set', 'custom')
    .option('-o, --output <dir>', 'Output directory', 'personas')
    .action(async (options) => {
      const cwd = process.cwd();

      // Build the generation prompt
      let contextPrompt = '';

      if (options.brief) {
        const briefPath = path.join(cwd, 'briefs', `${options.brief}.md`);
        try {
          const briefContent = await fs.readFile(briefPath, 'utf-8');
          contextPrompt = `## Project Brief\n${briefContent}\n\nGenerate personas that would be valuable stakeholders in debating and creating content/strategy for this project.`;
        } catch {
          console.error(`Brief "${options.brief}" not found`);
          process.exit(1);
        }
      } else if (options.domain) {
        contextPrompt = `## Domain\n${options.domain}\n\nGenerate personas that would be valuable stakeholders in debating decisions and strategy for this domain.`;
      } else {
        console.error('Please specify either --domain or --brief');
        process.exit(1);
      }

      if (options.roles) {
        contextPrompt += `\n\n## Required Roles\nMake sure to include personas for these roles: ${options.roles}`;
      }

      contextPrompt += `\n\n## Number of Personas\nGenerate exactly ${options.count} personas.`;

      console.log('🔥 Generating personas...\n');

      try {
        const client = new Anthropic();

        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: PERSONA_GENERATION_PROMPT,
          messages: [
            {
              role: 'user',
              content: contextPrompt,
            },
          ],
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';

        // Extract JSON from response (could be object or array)
        const jsonMatch = text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          console.error('Failed to parse personas from response');
          console.log('Raw response:', text);
          process.exit(1);
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Handle both old format (array) and new format (object with expertise + personas)
        let personas: AgentPersona[];
        let expertise: string = '';

        if (Array.isArray(parsed)) {
          // Old format - just personas array
          personas = parsed;
        } else {
          // New format - object with expertise and personas
          personas = parsed.personas;
          expertise = parsed.expertise || '';
        }

        // Validate personas
        for (const p of personas) {
          if (!p.id || !p.name || !p.role) {
            console.error('Invalid persona structure:', p);
            process.exit(1);
          }
        }

        // Save to files
        const outputDir = path.join(cwd, options.output);
        await fs.mkdir(outputDir, { recursive: true });

        // Save personas
        const personasFile = path.join(outputDir, `${options.name}.json`);
        await fs.writeFile(personasFile, JSON.stringify(personas, null, 2));

        // Save expertise/skills if present
        if (expertise) {
          const skillsFile = path.join(outputDir, `${options.name}.skills.md`);
          await fs.writeFile(skillsFile, expertise);
          console.log(`📚 Domain expertise saved to: ${skillsFile}`);
        }

        console.log(`✅ Generated ${personas.length} personas:\n`);
        for (const p of personas) {
          console.log(`  • ${p.name} (${p.nameHe}) - ${p.role}`);
          console.log(`    ${p.background.slice(0, 80)}...`);
          if ((p as any).expertise) {
            console.log(`    Expertise: ${(p as any).expertise.slice(0, 3).join(', ')}`);
          }
          console.log('');
        }
        console.log(`📁 Personas saved to: ${personasFile}`);
        console.log(`\nUse with: forge start --personas ${options.name}`);

      } catch (error) {
        console.error('Error generating personas:', error);
        process.exit(1);
      }
    });

  // List subcommand
  personas
    .command('list')
    .description('List available persona sets')
    .option('-d, --dir <dir>', 'Personas directory', 'personas')
    .action(async (options) => {
      const cwd = process.cwd();
      const personasDir = path.join(cwd, options.dir);

      try {
        const files = await fs.readdir(personasDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));

        if (jsonFiles.length === 0) {
          console.log('No persona sets found.');
          console.log('Generate some with: forge personas generate --domain "your domain"');
          return;
        }

        console.log('Available persona sets:\n');
        for (const file of jsonFiles) {
          const name = path.basename(file, '.json');
          const content = await fs.readFile(path.join(personasDir, file), 'utf-8');
          const personas = JSON.parse(content) as AgentPersona[];
          console.log(`  • ${name} (${personas.length} personas)`);
          for (const p of personas) {
            console.log(`    - ${p.name}: ${p.role}`);
          }
          console.log('');
        }
      } catch {
        console.log('No personas directory found.');
        console.log('Generate some with: forge personas generate --domain "your domain"');
      }
    });

  // Show subcommand
  personas
    .command('show <name>')
    .description('Show details of a persona set')
    .option('-d, --dir <dir>', 'Personas directory', 'personas')
    .action(async (name, options) => {
      const cwd = process.cwd();
      const filePath = path.join(cwd, options.dir, `${name}.json`);

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const personas = JSON.parse(content) as AgentPersona[];

        console.log(`\n📋 Persona Set: ${name}\n`);
        console.log('─'.repeat(60));

        for (const p of personas) {
          console.log(`\n### ${p.name} (${p.nameHe}) - ${p.role}`);
          console.log(`Age: ${p.age} | Color: ${p.color}`);
          console.log(`\nBackground:\n${p.background}`);
          console.log(`\nPersonality:`);
          p.personality.forEach(t => console.log(`  • ${t}`));
          console.log(`\nBiases:`);
          p.biases.forEach(b => console.log(`  • ${b}`));
          console.log(`\nStrengths:`);
          p.strengths.forEach(s => console.log(`  • ${s}`));
          console.log(`\nWeaknesses:`);
          p.weaknesses.forEach(w => console.log(`  • ${w}`));
          console.log(`\nSpeaking Style: ${p.speakingStyle}`);
          console.log('\n' + '─'.repeat(60));
        }
      } catch {
        console.error(`Persona set "${name}" not found`);
        process.exit(1);
      }
    });

  return personas;
}
