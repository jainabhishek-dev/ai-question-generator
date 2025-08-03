import express, { Request, Response } from "express";
import { ExportPdfRequest } from "../types/question";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ExportPdfDocument } from "./components/ExportPdfDocument";
import puppeteer from "puppeteer";

const router = express.Router();

router.post("/api/export-pdf", async (req: Request, res: Response) => {
  try {
    const { questions, exportType, preferences }: ExportPdfRequest = req.body;

    if (!questions || !Array.isArray(questions) || !exportType) {
      return res.status(400).json({ error: "Invalid request data" });
    }

    // Filter selected questions if needed
    let exportQuestions = questions;
    if (preferences?.selectedIds && preferences.selectedIds.length > 0) {
      exportQuestions = questions.filter(q => q.id !== undefined && preferences.selectedIds!.includes(q.id));
    }

    // Render React SSR HTML
    const html = renderToStaticMarkup(
      React.createElement(ExportPdfDocument, {
        questions: exportQuestions,
        exportType,
        preferences,
      })
    );

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
      timeout: 60000, // 60s timeout
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${exportType}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error("PDF export error:", err);
    res.status(500).json({
      error: "Failed to generate PDF",
      details: err.message || "Unknown error",
    });
  }
});

export const exportPdfRouter = router;