import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ExportPdfDocument } from "./components/ExportPdfDocument";
import { QuestionRecord, PdfCustomization } from "../types/question";

interface PdfPreferences {
  formatting?: {
    fontSize?: number;
    questionSpacing?: number;
    pageMargins?: string;
  };
}

type GeneratePdfParams = {
  selectedIds: string[];
  userId: string;
  exportType: "worksheet" | "answer-key" | "unified";
  customization?: PdfCustomization;
  preferences?: PdfPreferences; // Legacy support
  accessToken: string;
};

export async function generatePdf({
  selectedIds,
  userId,
  exportType,
  customization,
  preferences,
  accessToken,
}: GeneratePdfParams): Promise<{ buffer: Buffer; filename: string }> {
  let browser: import('puppeteer').Browser | import('puppeteer-core').Browser | null = null;

  try {
    // Validate input
    if (!selectedIds || !Array.isArray(selectedIds) || selectedIds.length === 0) {
      throw new Error("selectedIds is required and must be a non-empty array.");
    }
    if (!userId) {
      throw new Error("userId is required.");
    }
    if (!exportType || !["worksheet", "answer-key", "unified"].includes(exportType)) {
      throw new Error("exportType must be 'worksheet', 'answer-key', or 'unified'.");
    }
    if (!accessToken) {
      throw new Error("accessToken is required.");
    }

    // Supabase connection
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL ?? '';
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? '';
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase configuration.");
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });

    // Fetch questions
    const { data, error } = await supabase
      .from("questions")
      .select(`
        id, question, question_type, options,
        correct_answer, explanation, difficulty, grade, 
        created_at, user_id, subject, sub_subject, topic, sub_topic, blooms_level, pdf_content, additional_notes
      `)
      .in("id", selectedIds)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) {
      throw new Error(error?.message || 'No questions found');
    }

    // Transform data
    const transformedQuestions: QuestionRecord[] = data.map(q => ({
      id: q.id,
      question: q.question || '',
      question_type: q.question_type || 'multiple-choice',
      options: q.options ?? null,
      correct_answer: q.correct_answer || '',
      explanation: q.explanation ?? '',
      subject: q.subject ?? '',
      sub_subject: q.sub_subject ?? '',
      topic: q.topic ?? '',
      sub_topic: q.sub_topic ?? '',
      grade: q.grade ?? '',
      difficulty: q.difficulty ?? '',
      blooms_level: q.blooms_level ?? '',
      pdf_content: q.pdf_content ?? '',
      additional_notes: q.additional_notes ?? '',
      user_id: q.user_id ?? null,
      created_at: q.created_at ?? '',
    }));

    // Puppeteer setup
    console.log('Setting up Puppeteer...');

    const isVercel = !!process.env.VERCEL_ENV;

    // Define proper launch options type
    interface CustomLaunchOptions {
    headless: boolean;
    args: string[];
    executablePath?: string;
    }

    let launchOptions: CustomLaunchOptions = {
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
        '--disable-web-security',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
    ],
    };
    // (Removed duplicate browser declaration to fix type inference)

    if (isVercel) {
    // Production: Use puppeteer-core + chromium
    const puppeteerCore = await import("puppeteer-core");
    const chromium = (await import("@sparticuz/chromium")).default;
    
    launchOptions = {
        ...launchOptions,
        args: [...launchOptions.args, ...(chromium.args || [])],
        executablePath: await chromium.executablePath(),
    };
    
    browser = await puppeteerCore.launch(launchOptions);
    } else {
    // Development: Use regular puppeteer
    const puppeteer = await import("puppeteer");
    browser = await puppeteer.launch(launchOptions);
    }

    if (!browser) {
    throw new Error('Failed to launch browser');
    }

    console.log('Browser launched successfully');
    const page = await browser.newPage();


    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // Render React component to HTML
    const html = renderToStaticMarkup(
      React.createElement(ExportPdfDocument, {
        questions: transformedQuestions,
        exportType,
        customization,
        preferences: preferences || {
          formatting: {
            fontSize: 14,
            questionSpacing: 24,
          }
        },
      })
    );

    // Robust HTML template
    const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PDF Export</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <style>
    body { font-family: 'Roboto', 'Times New Roman', serif; margin: 0; padding: 40px; line-height: 1.6; }
    @media print { body { margin: 0; } }
    .katex { font-size: inherit !important; }
  </style>
</head>
<body>
  ${html}
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", function() {
      renderMathInElement(document.body, {
        delimiters: [
          {left: "$$", right: "$$", display: true},
          {left: "$", right: "$", display: false},
          {left: "\\\\(", right: "\\\\)", display: false},
          {left: "\\\\[", right: "\\\\]", display: true}
        ]
      });
    });
  </script>
</body>
</html>`;

    // Set content and wait for everything to load
    await page.setContent(fullHtml, {
      waitUntil: ['networkidle0', 'load'],
      timeout: 30000
    });

    // Wait for KaTeX to render mathematics
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate PDF with proper options - no built-in headers/footers
    const margins = customization?.formatting?.margins || { top: 0.7, right: 0.75, bottom: 0.7, left: 0.75 };
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: `${margins.top}in`,
        right: `${margins.right}in`,
        bottom: `${margins.bottom}in`,
        left: `${margins.left}in`
      },
      preferCSSPageSize: true,
      displayHeaderFooter: false, // Disable built-in headers to prevent duplication
      timeout: 30000
    });

    // Validate PDF buffer
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated PDF buffer is empty');
    }

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const template = customization?.template || 'default';
    const typeLabel = exportType === 'unified' ? 'questions' : exportType;
    const filename = `${typeLabel}-${template}-${timestamp}.pdf`;

    return {
      buffer: Buffer.from(pdfBuffer),
      filename
    };

 } catch (error: unknown) {
    // ✅ Fixed: Use 'unknown' instead of 'any'
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('PDF Generation Error:', error);
    throw new Error(`PDF generation failed: ${errorMessage}`);
  } finally {
    // Always cleanup browser
    if (browser) {
      try {
        await browser.close();
        console.log('Browser closed successfully');
      } catch (cleanupError) {
        console.error('Browser cleanup error:', cleanupError);
      }
    }
  }
}