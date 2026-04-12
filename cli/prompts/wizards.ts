/**
 * Configuration wizards using @clack/prompts
 * Handles: project setup, persona selection, agent multiselect
 */

import * as p from '@clack/prompts';
import * as path from 'path';
import * as fs from 'fs/promises';
import chalk from 'chalk';
import { AGENT_PERSONAS, registerCustomPersonas, clearCustomPersonas, generatePersonas } from '../../src/agents/personas';
import { menuBreadcrumbs } from '../lib/menuBreadcrumbs';
import { multilineText } from '../lib/multilineText';
import type { AgentPersona } from '../../src/types';

export interface WizardResult {
  projectName: string;
  goal: string;
  agents: string[];
  language: string;
  personas: AgentPersona[];
  domainSkills?: string;
  personaSetName: string | null;
  enabledTools?: string[];
  // Set when resuming an existing session
  resumeSessionDir?: string;  // full path to existing session directory
  resumeMessages?: any[];     // previously saved messages
  resumePhase?: string;       // last known phase
}

/**
 * Generate personas on-the-fly and save to disk
 */
export async function generatePersonasForGoal(
  cwd: string,
  goal: string,
  projectName: string
): Promise<{ name: string; personas: AgentPersona[]; skills?: string } | null> {
  const s = p.spinner();
  s.start('Generating personas for your project...');

  try {
    const result = await generatePersonas(projectName, goal, 5);
    if (!result) {
      s.stop('Failed to generate personas');
      return null;
    }

    const { personas, expertise: skills } = result;
    const safeName = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
    const personasDir = path.join(cwd, 'personas');
    await fs.mkdir(personasDir, { recursive: true });

    await fs.writeFile(
      path.join(personasDir, `${safeName}.json`),
      JSON.stringify(personas, null, 2)
    );

    if (skills) {
      await fs.writeFile(
        path.join(personasDir, `${safeName}.skills.md`),
        skills
      );
    }

    s.stop(`Generated ${personas.length} personas`);

    const summary = personas.map(pe => `  ${chalk.bold(pe.name)} - ${pe.role}`).join('\n');
    p.note(summary, 'Generated Personas');
    p.log.info(`Saved to: personas/${safeName}.json`);

    return { name: safeName, personas, skills };
  } catch (error) {
    s.stop('Error generating personas');
    p.log.error(`${error}`);
    return null;
  }
}

/**
 * Persona source selection: default, generate, or load from file
 */
export async function selectPersonasFlow(
  cwd: string,
  goal: string,
  projectName: string
): Promise<{ personas: AgentPersona[]; personaSetName: string | null; domainSkills?: string }> {
  // Scan for saved persona sets
  const personasDir = path.join(cwd, 'personas');
  const savedSets: { name: string; personas: AgentPersona[]; description: string }[] = [];

  try {
    const allFiles = await fs.readdir(personasDir);
    const jsonFiles = allFiles.filter(f => f.endsWith('.json') && !f.includes('.skills'));
    for (const file of jsonFiles) {
      const name = path.basename(file, '.json');
      try {
        const content = await fs.readFile(path.join(personasDir, file), 'utf-8');
        const personas = JSON.parse(content) as AgentPersona[];
        savedSets.push({ name, personas, description: personas.map(pe => pe.name).join(', ') });
      } catch { /* skip invalid */ }
    }
  } catch { /* no personas dir */ }

  // Build options
  const options: { value: string; label: string; hint?: string }[] = [
    { value: 'generate', label: 'Generate new personas', hint: 'AI-powered for this project' },
    { value: 'defaults', label: 'Default personas', hint: 'built-in experts' },
  ];
  for (const set of savedSets) {
    options.push({ value: `saved:${set.name}`, label: set.name, hint: set.description });
  }

  const choice = await p.select({
    message: 'Which personas should debate?',
    options,
  });

  if (p.isCancel(choice)) {
    return { personas: AGENT_PERSONAS, personaSetName: null };
  }

  if (choice === 'generate') {
    const result = await generatePersonasForGoal(cwd, goal, projectName);
    if (result) {
      return { personas: result.personas, personaSetName: result.name, domainSkills: result.skills };
    }
    p.log.warn('Generation failed, falling back to defaults');
    return { personas: AGENT_PERSONAS, personaSetName: null };
  }

  if (choice === 'defaults') {
    return { personas: AGENT_PERSONAS, personaSetName: null };
  }

  // Saved set
  const setName = (choice as string).replace('saved:', '');
  const set = savedSets.find(s => s.name === setName);
  if (!set) {
    return { personas: AGENT_PERSONAS, personaSetName: null };
  }

  let domainSkills: string | undefined;
  try {
    domainSkills = await fs.readFile(path.join(personasDir, `${setName}.skills.md`), 'utf-8');
  } catch { /* no skills */ }

  return { personas: set.personas, personaSetName: setName, domainSkills };
}

/**
 * Agent multiselect from available personas
 * Returns selected agent IDs or 'generate'/'defaults' for re-selection
 */
export async function selectAgentsFlow(
  personas: AgentPersona[]
): Promise<string[] | 'generate' | 'defaults'> {
  const options = personas.map(agent => ({
    value: agent.id,
    label: `${agent.name} (${agent.nameHe})`,
    hint: agent.role,
  }));

  // Add special options at top
  const specialChoice = await p.select({
    message: 'Agent selection',
    options: [
      { value: 'pick', label: 'Pick agents from list' },
      { value: 'all', label: 'Use all agents', hint: `${personas.length} agents` },
      { value: 'generate', label: 'Generate new personas', hint: 'AI-powered' },
      { value: 'defaults', label: 'Switch to default personas' },
    ],
  });

  if (p.isCancel(specialChoice)) {
    return personas.map(a => a.id);
  }

  if (specialChoice === 'generate') return 'generate';
  if (specialChoice === 'defaults') return 'defaults';
  if (specialChoice === 'all') return personas.map(a => a.id);

  // multiselect for picking specific agents
  const selected = await p.multiselect({
    message: 'Select agents for the debate',
    options,
    initialValues: personas.map(a => a.id),
    required: true,
  });

  if (p.isCancel(selected)) {
    return personas.map(a => a.id);
  }

  return selected as string[];
}

/**
 * Full config wizard: project name → goal → personas → agents → language
 * Returns a complete WizardResult ready to start a session.
 */
export async function runConfigWizard(cwd: string): Promise<WizardResult | null> {
  p.intro(chalk.magenta.bold('NEW SESSION'));

  menuBreadcrumbs.push('Project Details');

  const projectNameResult = await p.text({
    message: 'Project name',
    placeholder: 'My Project',
    defaultValue: 'Untitled Project',
  });
  if (p.isCancel(projectNameResult)) { p.cancel('Configuration cancelled'); menuBreadcrumbs.pop(); return null; }
  const projectName = projectNameResult as string;

  const goalResult = await multilineText({
    message: 'Project goal & description',
    placeholder: 'Describe your project goal in detail...',
    defaultValue: 'Create effective content',
  });
  if (typeof goalResult === 'symbol') { p.cancel('Configuration cancelled'); menuBreadcrumbs.pop(); return null; }
  const goal = goalResult as string;

  menuBreadcrumbs.pop();

  // Persona selection with loop for generate/defaults
  let personas = AGENT_PERSONAS;
  let personaSetName: string | null = null;
  let domainSkills: string | undefined;

  menuBreadcrumbs.push('Persona Selection');
  const personaResult = await selectPersonasFlow(cwd, goal, projectName);
  menuBreadcrumbs.pop();
  personas = personaResult.personas;
  personaSetName = personaResult.personaSetName;
  domainSkills = personaResult.domainSkills;

  if (personaSetName) {
    registerCustomPersonas(personas);
  } else {
    clearCustomPersonas();
  }

  // Agent selection with loop for generate/defaults
  menuBreadcrumbs.push('Agent Selection');
  let agents: string[] = [];
  let selecting = true;
  while (selecting) {
    const result = await selectAgentsFlow(personas);
    if (result === 'generate') {
      const generated = await generatePersonasForGoal(cwd, goal, projectName);
      if (generated) {
        personas = generated.personas;
        domainSkills = generated.skills;
        personaSetName = generated.name;
        registerCustomPersonas(personas);
      }
    } else if (result === 'defaults') {
      personas = AGENT_PERSONAS;
      domainSkills = undefined;
      personaSetName = null;
      clearCustomPersonas();
      p.log.info('Using built-in personas');
    } else {
      agents = result;
      selecting = false;
    }
  }
  menuBreadcrumbs.pop();

  // Language
  menuBreadcrumbs.push('Language');
  const language = await p.select({
    message: 'Debate language',
    options: [
      { value: 'english', label: 'English' },
      { value: 'hebrew', label: 'Hebrew (עברית)' },
      { value: 'mixed', label: 'Mixed' },
    ],
  });

  menuBreadcrumbs.pop();
  if (p.isCancel(language)) return null;

  // Tools selection
  menuBreadcrumbs.push('Tools');
  const tools = await p.multiselect({
    message: 'Enable tools for this session?',
    options: [
      { value: 'gemini-image', label: 'Image Generation (Gemini)', hint: 'agents can create images' },
      { value: 'gemini-graph', label: 'Graph Generation (Gemini)', hint: 'agents can create charts' },
    ],
    required: false,
  });

  menuBreadcrumbs.pop();
  const enabledTools = p.isCancel(tools) ? undefined : (tools as string[]);

  p.outro(chalk.green('Configuration complete!'));

  return {
    projectName,
    goal,
    agents,
    language: language as string,
    personas,
    domainSkills,
    personaSetName,
    enabledTools,
  };
}
