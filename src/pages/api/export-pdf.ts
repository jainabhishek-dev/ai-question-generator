import type { NextApiRequest, NextApiResponse } from 'next';
import { generatePdf } from '../../server/pdfService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Validate request body
  if (!req.body || Object.keys(req.body).length === 0) {
    res.status(400).json({ error: 'Request body is required' });
    return;
  }

  try {
    // Generate PDF with proper error handling
    const result = await generatePdf(req.body);

    // Validate the result
    if (!result || !result.buffer || !result.filename) {
      throw new Error('Invalid PDF generation result');
    }

    const { buffer, filename } = result;

    // Validate buffer
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new Error('Generated PDF buffer is empty or invalid');
    }

    // Set headers only after successful generation
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.setHeader('Cache-Control', 'no-cache');

    // Send the buffer
    res.status(200).send(buffer);

  } catch (error: unknown) {
    console.error('PDF export error:', error);

    // Only send JSON error if headers haven't been sent
    if (!res.headersSent) {
      res.status(500).json({
        error: typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : 'PDF generation failed',
        timestamp: new Date().toISOString()
      });
    } else {
      // If headers were already sent, we can't send JSON
      res.end();
    }
  }
}