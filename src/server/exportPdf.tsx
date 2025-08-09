import express, { Request, Response } from "express";
import { generatePdf } from "./pdfService";

const router = express.Router();

router.post("/api/export-pdf", async (req: Request, res: Response) => {
  try {
    const { buffer, filename } = await generatePdf(req.body);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "no-cache",
    });
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const exportPdfRouter = router;