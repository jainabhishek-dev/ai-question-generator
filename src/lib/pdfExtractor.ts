/**
 * PDF text extraction utility for lesson plan generation
 * This utility provides client-side PDF text extraction
 */

interface PDFExtractionResult {
  success: boolean;
  text?: string;
  error?: string;
  pageCount?: number;
}

/**
 * Extract text from a PDF file on the client side
 * Note: This requires the pdf-parse or similar library to be installed
 * For now, we'll create a placeholder that can be enhanced later
 */
export const extractTextFromPDF = async (file: File): Promise<PDFExtractionResult> => {
  try {
    // Validate file type
    if (file.type !== 'application/pdf') {
      return {
        success: false,
        error: 'Invalid file type. Please upload a PDF file.'
      };
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File size exceeds 10MB limit. Please upload a smaller PDF file.'
      };
    }

    // For now, we'll return a placeholder
    // TODO: Implement actual PDF text extraction using pdf-parse or similar library
    // This will require installing additional dependencies
    
    return {
      success: false,
      error: 'PDF text extraction not yet implemented. Please manually input chapter content in the Additional Notes field.'
    };

    // Future implementation would look like this:
    /*
    const arrayBuffer = await file.arrayBuffer();
    const pdfData = new Uint8Array(arrayBuffer);
    
    // Use pdf-parse or similar library
    const pdf = await pdfscratch(pdfData);
    
    return {
      success: true,
      text: pdf.text,
      pageCount: pdf.numpages
    };
    */

  } catch (error) {
    console.error('PDF extraction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during PDF extraction'
    };
  }
};

/**
 * Validate PDF file before processing
 */
export const validatePDFFile = (file: File): { valid: boolean; error?: string } => {
  // Check file type
  if (file.type !== 'application/pdf') {
    return {
      valid: false,
      error: 'Please upload a PDF file only.'
    };
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size must be less than 10MB.'
    };
  }

  // Check file name
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return {
      valid: false,
      error: 'File must have a .pdf extension.'
    };
  }

  return { valid: true };
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Server-side PDF text extraction (for API routes)
 * This would be used in API routes where we have access to server-side libraries
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const extractTextFromPDFBuffer = async (_buffer: Buffer): Promise<PDFExtractionResult> => {
  try {
    // TODO: Implement server-side PDF text extraction
    // This would use libraries like pdf-parse that work in Node.js environment
    
    return {
      success: false,
      error: 'Server-side PDF extraction not yet implemented'
    };

    // Future implementation:
    /*
    const pdf = await require('pdf-parse')(buffer);
    
    return {
      success: true,
      text: pdf.text,
      pageCount: pdf.numpages
    };
    */

  } catch (error) {
    console.error('Server-side PDF extraction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during PDF extraction'
    };
  }
};

/**
 * Clean and prepare extracted text for AI processing
 */
export const cleanExtractedText = (text: string): string => {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove page numbers and headers/footers (basic patterns)
    .replace(/Page \d+|\d+\s*$|Chapter \d+/gim, '')
    // Remove special characters that might interfere with AI processing
    .replace(/[^\w\s.,!?;:()\-]/g, '')
    // Trim and normalize
    .trim()
    // Limit length to prevent token overflow
    .substring(0, 50000);
};

/**
 * Mock PDF text extraction for development/testing
 */
export const mockPDFExtraction = (filename: string): PDFExtractionResult => {
  const mockTexts: Record<string, string> = {
    'linear-equations.pdf': `
      Linear Equations in One Variable
      
      Learning Objectives:
      1. Understand the concept of variables and constants in algebraic expressions
      2. Solve simple linear equations using addition, subtraction, multiplication, and division
      3. Apply the distributive property to simplify algebraic expressions
      4. Solve multi-step linear equations with variables on both sides
      5. Graph linear equations on a coordinate plane
      6. Interpret the slope and y-intercept of linear equations in real-world contexts
      
      Chapter Content:
      A linear equation in one variable is an equation that can be written in the form ax + b = c,
      where a, b, and c are constants and a ≠ 0. The variable x represents an unknown value that
      we need to find. Linear equations are fundamental to algebra and have many real-world applications.
      
      To solve a linear equation, we use the properties of equality to isolate the variable on one side
      of the equation. The goal is to get the variable by itself, which gives us the solution.
    `,
    'photosynthesis.pdf': `
      Photosynthesis: The Process of Food Production in Plants
      
      Learning Objectives:
      1. Explain the process of photosynthesis in green plants
      2. Identify the raw materials and products of photosynthesis
      3. Describe the role of chlorophyll in photosynthesis
      4. Understand the importance of sunlight in the photosynthetic process
      5. Analyze the factors that affect the rate of photosynthesis
      
      Chapter Content:
      Photosynthesis is the process by which green plants make their own food using sunlight,
      carbon dioxide from air, and water from soil. This process occurs in the chloroplasts
      of plant cells, specifically in the chlorophyll-containing structures.
      
      The equation for photosynthesis is: 6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂
      This shows that carbon dioxide and water, in the presence of light, produce glucose and oxygen.
    `
  };

  const mockText = mockTexts[filename.toLowerCase()] || `
    Sample Chapter Content for ${filename}
    
    Learning Objectives:
    1. Understand the main concepts of this chapter
    2. Apply knowledge to solve problems
    3. Analyze relationships between different concepts
    4. Evaluate the importance of these concepts in real-world scenarios
    
    This is mock content for development and testing purposes.
    In production, actual PDF content would be extracted and processed.
  `;

  return {
    success: true,
    text: mockText.trim(),
    pageCount: 1
  };
};

const pdfExtractor = {
  extractTextFromPDF,
  extractTextFromPDFBuffer,
  validatePDFFile,
  formatFileSize,
  cleanExtractedText,
  mockPDFExtraction,
};

export default pdfExtractor;