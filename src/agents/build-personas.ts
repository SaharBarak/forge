/**
 * Build Agent Personas — Three engineering/design agents with maximally different aesthetics
 *
 * Each agent independently builds a SvelteKit website from the same copy,
 * applying their own creative interpretation of layout, colors, typography, and animations.
 */

import type { BuildAgentPersona } from '../types/build';

export const BUILD_PERSONAS: BuildAgentPersona[] = [
  {
    id: 'architect-mika',
    name: 'Mika',
    designPhilosophy: 'Minimalist & Clean — less is more. Every element must earn its place. Generous whitespace, restrained palette, typographic hierarchy does the heavy lifting.',
    colorPreference: 'Monochrome base (white/off-white backgrounds, near-black text) with a single accent color (electric blue #2563EB or similar). No gradients.',
    layoutStyle: 'Centered single-column, generous whitespace, max-width 720px for text. Hero is just a headline + subheadline + CTA. Sections breathe with 6-8rem vertical padding.',
    typographyApproach: 'System font stack or Inter. Large heading sizes (clamp 2.5rem–4rem), generous line-height (1.6–1.8 for body). All caps for small labels.',
    animationLevel: 'minimal',
    specialties: [
      'Whitespace as a design element',
      'Typographic hierarchy',
      'Single-page scrolling experiences',
      'Micro-interactions on hover only',
    ],
    port: 5173,
    color: 'cyan',
  },
  {
    id: 'architect-dani',
    name: 'Dani',
    designPhilosophy: 'Bold & Expressive — dark backgrounds, vivid neon gradients, strong visual impact. The site should feel like a premium product launch. Maximalist energy.',
    colorPreference: 'Dark theme (#0a0a0a base). Neon gradient accents: magenta→cyan (#ec4899→#06b6d4). Glowing text effects. Gradient borders on cards.',
    layoutStyle: 'Full-bleed sections, asymmetric grid layouts, overlapping elements. Hero takes full viewport with large background gradient mesh. Cards with glassmorphism.',
    typographyApproach: 'Bold sans-serif (Space Grotesk or similar). Extra-large hero text (5rem+). Gradient text for headlines. Tight letter-spacing on headings.',
    animationLevel: 'heavy',
    specialties: [
      'Gradient mesh backgrounds',
      'Glassmorphism cards',
      'Scroll-triggered animations',
      'Animated counters and reveals',
      'Particle or glow effects via CSS',
    ],
    port: 5174,
    color: 'magenta',
  },
  {
    id: 'architect-shai',
    name: 'Shai',
    designPhilosophy: 'Warm Editorial — feels like a beautifully designed magazine. Earthy tones, elegant typography, content-first layout. Approachable and trustworthy.',
    colorPreference: 'Warm palette: cream background (#FFFBF5), terracotta accent (#C2591A), sage green (#6B8F71), charcoal text (#2D2D2D). Subtle texture overlays.',
    layoutStyle: 'Two-column editorial grid, alternating full-width and split sections. Card-based feature blocks with soft shadows. Pull-quotes for emphasis.',
    typographyApproach: 'Serif headings (Playfair Display or similar) paired with clean sans-serif body (Lato). Moderate sizes, elegant spacing. Italic for emphasis.',
    animationLevel: 'moderate',
    specialties: [
      'Editorial grid layouts',
      'Card-based content sections',
      'Testimonial carousels',
      'Subtle fade-in-up on scroll',
      'Warm color harmonies',
    ],
    port: 5175,
    color: 'yellow',
  },
];

export function getBuildPersonaById(id: string): BuildAgentPersona | undefined {
  return BUILD_PERSONAS.find((p) => p.id === id);
}

export function getBuildPersonaByName(name: string): BuildAgentPersona | undefined {
  return BUILD_PERSONAS.find((p) => p.name.toLowerCase() === name.toLowerCase());
}
