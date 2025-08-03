import express from "express";
import exportPdfRouter from "./exportPdf";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json({ limit: "10mb" }));

app.use(exportPdfRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`PDF export server running on port ${PORT}`);
});
