import express, { Request, Response } from "express";
// import { supabaseClient } from "../lib/supabaseClient"; // Removed unused import
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ExportPdfDocument } from "./components/ExportPdfDocument";
import puppeteer from "puppeteer";

const router = express.Router();

router.post("/api/export-pdf", async (req: Request, res: Response) => {
  try {
    const { selectedIds, userId, exportType, preferences, accessToken } = req.body;
    // Debug log incoming request data
    console.log('=== EXPORT PDF DEBUG ===');
    console.log('Selected IDs:', selectedIds);
    console.log('User ID:', userId);
    console.log('Access Token:', accessToken?.slice(0, 12) + '...');
    if (!selectedIds || !Array.isArray(selectedIds) || selectedIds.length === 0 || !exportType || !userId || !accessToken) {
      return res.status(400).json({ error: "Invalid request data" });
    }

    // Recreate Supabase client with user's access token for RLS
    // Use dynamic import for createClient
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL ?? '';
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? '';
    // Use anon key for client creation, but pass user's JWT for auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });

    // Query Supabase for raw questions
    // Table name: 'questions' (verify this is correct in your Supabase dashboard)
    const { data, error, status, statusText } = await supabase
      .from("questions")
      .select("*")
      .in("id", selectedIds)
      .eq("user_id", userId);

    if (error) {
      console.error('Supabase query error:', error, 'Status:', status, 'StatusText:', statusText);
      return res.status(403).json({ error: 'Supabase query failed', details: error.message || error, status, statusText });
    }

    if (!data || data.length === 0) {
      console.warn('No questions found for the given IDs and user. Data:', data);
      return res.status(404).json({ error: 'No questions found for the given IDs and user' });
    }

    // Render React SSR HTML
    const html = renderToStaticMarkup(
      React.createElement(ExportPdfDocument, {
        questions: data,
        exportType,
        preferences,
      })
    );

    // ...existing code...

    // Puppeteer PDF generation
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });
    const page = await browser.newPage();

    // Timeout and memory optimization
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");

    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: { top: "40px", bottom: "40px", left: "40px", right: "40px" },
      printBackground: true,
      preferCSSPageSize: true, // Respect CSS page rules
      displayHeaderFooter: false, // Clean output
      timeout: 60000, // 60s timeout
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${exportType}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    let errorMsg = 'Unknown error';
    if (err && typeof err === 'object' && 'message' in err) {
      errorMsg = String((err as { message?: string }).message);
    }
    console.error("PDF export error:", err);
    res.status(500).json({
      error: "Failed to generate PDF",
      details: errorMsg,
    });
  }
});

export const exportPdfRouter = router;