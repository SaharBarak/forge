# Epic: Enhanced Export System

## Overview

Expand export capabilities beyond plain Markdown to support professional document formats (PDF, DOCX, HTML) with customizable styling and structure options.

## Problem Statement

Current export is limited to raw Markdown files. Users need:
- **PDF exports** for client presentations and archives
- **DOCX exports** for editing in Word/Google Docs
- **Styled HTML exports** for web publishing
- **Selective exports** (just decisions, just drafts, full transcript)

## Proposed Solution

### Export Formats

1. **Markdown** (existing) - Raw conversation/decisions
2. **PDF** - Styled, branded documents
3. **DOCX** - Editable Word documents
4. **HTML** - Standalone styled HTML pages
5. **JSON** - Machine-readable session data

### Export Content Options

```typescript
interface ExportOptions {
  format: 'md' | 'pdf' | 'docx' | 'html' | 'json';
  
  content: {
    includeTranscript: boolean;      // Full conversation
    includeDecisions: boolean;       // Extracted decisions
    includeProposals: boolean;       // Proposal history
    includeDrafts: boolean;          // Content drafts
    includeSummaries: boolean;       // Phase summaries
    includeMetadata: boolean;        // Session config, timestamps
  };
  
  style: {
    template: 'minimal' | 'professional' | 'branded';
    logo?: string;                   // Path to logo file
    primaryColor?: string;           // Brand color
    fontFamily?: string;             // Custom font
  };
  
  sections: {
    coverPage: boolean;              // Title page with metadata
    tableOfContents: boolean;        // Auto-generated TOC
    appendix: boolean;               // Raw transcript in appendix
  };
}
```

### PDF Generation

Use **Puppeteer** or **jsPDF** for PDF generation:
- Render HTML template with session data
- Apply CSS styling
- Generate PDF from rendered page

### DOCX Generation

Use **docx** npm package:
- Convert structured data to DOCX format
- Support basic formatting (headers, lists, tables)
- Preserve decision highlights

## Affected Components

| Component | Changes |
|-----------|---------|
| `src/lib/export/` | New module with format-specific exporters |
| `src/lib/export/PDFExporter.ts` | PDF generation logic |
| `src/lib/export/DOCXExporter.ts` | Word document generation |
| `src/lib/export/HTMLExporter.ts` | Styled HTML export |
| `src/components/chat/ExportModal.tsx` | Enhanced UI with format/options selection |
| `electron/main.js` | IPC handlers for export operations |
| CLI | `forge export --format pdf --output ./report.pdf` |
| `package.json` | New deps: `puppeteer`, `docx`, `jspdf` |

## Success Criteria

- [ ] PDF export with professional styling
- [ ] DOCX export compatible with Word/Google Docs
- [ ] HTML export as self-contained file
- [ ] Export modal with format and content selection
- [ ] CLI export command with all format options
- [ ] Custom branding (logo, colors) in exports
- [ ] Export size < 5MB for typical sessions

## Implementation Phases

### Phase 1: Export Infrastructure
- Define `ExportOptions` interface
- Create base `Exporter` class
- Refactor existing MD export

### Phase 2: PDF Export
- HTML template system for PDF
- Puppeteer integration
- Basic styling (minimal template)

### Phase 3: DOCX Export
- `docx` package integration
- Structure mapping (decisions → headings, etc.)
- Formatting preservation

### Phase 4: UI Enhancement
- Redesign ExportModal
- Format selection with preview
- Content/section toggles
- Style customization

### Phase 5: CLI & Polish
- CLI export command
- Additional templates (professional, branded)
- Performance optimization

## Estimated Effort

- **Backend (BE)**: 5 days
- **Frontend (FE)**: 3 days
- **QA**: 2 days
- **Total**: ~10 days

## Dependencies

- puppeteer or similar for PDF generation
- docx package for Word exports

## Risks

| Risk | Mitigation |
|------|------------|
| Large bundle size from Puppeteer | Use electron's built-in PDF, or lazy-load |
| Complex DOCX formatting | Limit to essential formatting |
| Cross-platform PDF issues | Test on Mac/Windows/Linux |
