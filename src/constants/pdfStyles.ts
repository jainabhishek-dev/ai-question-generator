// Central PDF CSS styles - ONLY for PDF generation, not for web UI
export const PDF_STYLES = `
  @page {
    margin: 0.5in;
    border: 3px solid #000;
  }
  
  body {
    font-family: 'Roboto', 'Times New Roman', serif;
    margin: 0;
    padding: 0;
    line-height: 1.6;
  }
  
  /* PDF content container - only for PDF export */
  .pdf-content {
    padding: 15px;
    position: relative;
    box-sizing: border-box;
    background: #fff;
    min-height: 100vh;
  }
  
  /* PDF watermark - only for PDF export */
  .page-watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-45deg);
    font-size: 80px;
    font-weight: bold;
    color: #e0e0e0;
    opacity: 0.15;
    z-index: 1;
    pointer-events: none;
    white-space: nowrap;
    user-select: none;
  }
  
  /* PDF page break controls */
  .first-page-spacing {
    margin-top: -12px;
  }
  
  .compact-header {
    margin-bottom: 8px;
    padding-bottom: 8px;
  }
  
  .compact-section {
    margin-bottom: 12px;
  }
  
  .question-text {
    page-break-after: avoid;
    break-after: avoid;
  }
  
  .question-options {
    page-break-before: avoid;
    page-break-after: avoid;
    break-before: avoid;
    break-after: avoid;
  }
  
  .answer-section {
    page-break-before: avoid;
    break-before: avoid;
  }
  
  /* PDF table styles - optimized for print */
  table {
    width: auto;
    max-width: calc(100% - 20px);
    border-collapse: collapse;
    margin: 1.5em 0;
    font-size: 1em;
    word-break: break-word;
  }
  
  th, td {
    border: 1px solid #d1d5db;
    padding: 0.5em 1em;
    text-align: left;
  }
  
  th {
    background: #f3f4f6;
    font-weight: 600;
  }
  
  tr:nth-child(even) td {
    background: #f9fafb;
  }
  
  /* PDF print optimizations */
  @media print {
    body {
      padding: 0;
    }
    
    /* Force high contrast for better printing */
    .page-watermark {
      opacity: 0.15 !important;
    }
  }
  
  /* KaTeX for PDF - ensure math renders properly */
  .katex {
    font-size: inherit !important;
    line-height: 1.2;
  }
  
  .katex-display {
    margin: 1em 0;
    text-align: center;
  }
  
  .katex-html {
    line-height: 1.2;
  }
`;

export function generatePdfStyles(): string {
  return PDF_STYLES;
}