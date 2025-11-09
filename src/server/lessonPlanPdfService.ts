import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LessonPlanPdfDocument } from "./components/LessonPlanPdfDocument";
import { LessonPlan } from "../types/lessonPlan";

type GenerateLessonPlanPdfParams = {
  lessonPlan: LessonPlan;
  userId?: string;
  accessToken?: string;
};

export async function generateLessonPlanPdf({
  lessonPlan,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userId: _userId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  accessToken: _accessToken,
}: GenerateLessonPlanPdfParams): Promise<{ buffer: Buffer; filename: string }> {
  
  try {
    console.log('🔄 Starting lesson plan PDF generation...');
    
    // Render the lesson plan to HTML
    const htmlContent = renderToStaticMarkup(
      React.createElement(LessonPlanPdfDocument, {
        lessonPlan
      })
    );

    console.log('✅ Lesson plan HTML rendered successfully');

    // Import Puppeteer dynamically for serverless compatibility
    const puppeteer = await import('puppeteer');
    
    console.log('🚀 Launching Puppeteer browser...');
    
    // Launch browser with optimized settings for serverless
    const browser = await puppeteer.default.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // Important for serverless
        '--disable-gpu'
      ]
    });

    console.log('📄 Creating new page...');
    const page = await browser.newPage();

    // Set content with complete HTML structure
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Lesson Plan</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
          }
          h1, h2, h3, h4, h5, h6 {
            color: #2563eb;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
          }
          .section {
            margin-bottom: 2em;
            padding: 1em;
            border-left: 4px solid #2563eb;
            background-color: #f8fafc;
          }
          .section-title {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 0.5em;
            color: #1e40af;
          }
          .metadata {
            background-color: #e0f2fe;
            padding: 1em;
            border-radius: 8px;
            margin-bottom: 2em;
          }
          .metadata-item {
            display: inline-block;
            margin-right: 2em;
            margin-bottom: 0.5em;
          }
          .metadata-label {
            font-weight: bold;
            color: #0f172a;
          }
          ul, ol {
            margin-left: 1.5em;
          }
          li {
            margin-bottom: 0.5em;
          }
          @media print {
            body { padding: 0; }
            .container { max-width: none; }
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    await page.setContent(fullHtml, { 
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000 
    });

    console.log('📋 Generating PDF...');

    // Generate PDF with optimized settings
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>', // Empty header
      footerTemplate: `
        <div style="width: 100%; font-size: 10px; text-align: center; color: #666;">
          Generated on ${new Date().toLocaleDateString()} • Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `
    });

    console.log('🧹 Cleaning up browser...');
    await browser.close();

    // Generate filename
    const sanitizedTitle = lessonPlan.learningObjective
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    
    const filename = `lesson_plan_${sanitizedTitle}_${Date.now()}.pdf`;
    
    console.log(`✅ Lesson plan PDF generated successfully: ${filename}`);
    console.log(`📊 PDF size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

    return {
      buffer: Buffer.from(pdfBuffer),
      filename
    };

  } catch (error) {
    console.error('❌ Lesson plan PDF generation failed:', error);
    throw new Error(`Lesson plan PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}