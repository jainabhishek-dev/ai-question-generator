import { config } from 'dotenv';
config({ path: '.env.local' });
import express from "express";
import cors from "cors";
import { exportPdfRouter } from "../server/exportPdf";
import bodyParser from "body-parser";

const app = express();

// Enhanced CORS configuration
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests

app.use(bodyParser.json({ limit: "10mb" }));

// Manual CORS header middleware for debugging
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).json({});
  }
  next();
});

// Add logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Root route for friendly response
app.get("/", (req, res) => {
  res.json({ message: "Server is running!", timestamp: new Date().toISOString() });
});

// Test route with enhanced response
app.get("/test-cors", (req, res) => {
  console.log("Test CORS endpoint hit");
  res.json({ 
    message: "CORS is working!", 
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
});

// Add the PDF router
app.use(exportPdfRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`PDF export server running on port ${PORT}`);
  console.log(`Test URL: http://localhost:${PORT}/test-cors`);
});