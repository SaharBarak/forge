/**
 * PersonaMarketplace Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PersonaMarketplace } from '../PersonaMarketplace';

// Mock dependencies
vi.mock('../../../stores/uiStore', () => ({
  useUIStore: () => ({ hebrewMode: false }),
}));

vi.mock('../../../agents/personas', () => ({
  AGENT_PERSONAS: [
    {
      id: 'test-1',
      name: 'Test Persona',
      role: 'Test Role',
      age: 30,
      background: 'Test background',
      personality: ['trait1', 'trait2'],
      biases: ['bias1'],
      strengths: ['strength1'],
      weaknesses: ['weakness1'],
      speakingStyle: 'Direct',
      color: 'blue',
    },
  ],
}));

vi.mock('../../../lib/personas/industry-personas', () => ({
  INDUSTRY_PERSONAS: [
    {
      id: 'industry-healthcare',
      name: 'Dr. Sarah',
      nameHe: 'ד"ר שרה',
      role: 'Healthcare Expert',
      age: 48,
      background: 'Medical professional',
      personality: ['precise', 'empathetic'],
      biases: ['evidence-based'],
      strengths: ['medical accuracy'],
      weaknesses: ['overly cautious'],
      speakingStyle: 'Clinical and precise',
      color: 'green',
      version: '1.0.0',
      author: 'Forge',
      industry: 'healthcare',
      tags: ['healthcare', 'compliance'],
      description: 'Healthcare persona',
      isBuiltIn: true,
      isFavorite: false,
      isPublished: false,
      usageCount: 0,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ],
}));

vi.mock('../PersonaCreatorWizard', () => ({
  PersonaCreatorWizard: () => <div data-testid="creator-wizard">Creator Wizard</div>,
}));

vi.mock('../PersonaSandbox', () => ({
  PersonaSandbox: () => <div data-testid="sandbox">Sandbox</div>,
}));

describe('PersonaMarketplace', () => {
  const mockClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the marketplace with title', () => {
    render(<PersonaMarketplace onClose={mockClose} />);
    expect(screen.getByText('Persona Marketplace')).toBeTruthy();
  });

  it('shows tab navigation', () => {
    render(<PersonaMarketplace onClose={mockClose} />);
    expect(screen.getByText(/Browse/)).toBeTruthy();
    expect(screen.getByText(/Installed/)).toBeTruthy();
    expect(screen.getByText(/Create/)).toBeTruthy();
    expect(screen.getByText(/Sandbox/)).toBeTruthy();
  });

  it('displays persona cards in browse view', () => {
    render(<PersonaMarketplace onClose={mockClose} />);
    expect(screen.getByText('Test Persona')).toBeTruthy();
    expect(screen.getByText('Dr. Sarah')).toBeTruthy();
  });

  it('filters personas by search query', () => {
    render(<PersonaMarketplace onClose={mockClose} />);
    const searchInput = screen.getByPlaceholderText('Search personas...');
    fireEvent.change(searchInput, { target: { value: 'Sarah' } });
    expect(screen.getByText('Dr. Sarah')).toBeTruthy();
    expect(screen.queryByText('Test Persona')).toBeFalsy();
  });

  it('shows close button that calls onClose', () => {
    render(<PersonaMarketplace onClose={mockClose} />);
    const closeBtn = screen.getByText(/Close/);
    fireEvent.click(closeBtn);
    expect(mockClose).toHaveBeenCalled();
  });

  it('switches to Create tab', () => {
    render(<PersonaMarketplace onClose={mockClose} />);
    fireEvent.click(screen.getByText(/Create/));
    expect(screen.getByTestId('creator-wizard')).toBeTruthy();
  });

  it('shows install button for non-installed personas', () => {
    render(<PersonaMarketplace onClose={mockClose} />);
    const installButtons = screen.getAllByText('Install');
    expect(installButtons.length).toBeGreaterThan(0);
  });
});
