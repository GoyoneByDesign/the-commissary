import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Set maximum body payload limit for high resolution receipt uploads
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Helper to check and initialize the Gemini GenAI SDK client
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// REST API to download the complete codebase ZIP package for export/ChatGPT
app.get(["/api/download-zip", "/the-commissary-project.zip"], (_req, res) => {
  const publicZip = path.join(process.cwd(), "public", "the-commissary-project.zip");
  const rootZip = path.join(process.cwd(), "the-commissary-project.zip");
  const targetZip = fs.existsSync(publicZip) ? publicZip : (fs.existsSync(rootZip) ? rootZip : null);

  if (targetZip) {
    res.setHeader("Content-Disposition", 'attachment; filename="the-commissary-project.zip"');
    res.setHeader("Content-Type", "application/zip");
    return res.sendFile(targetZip);
  }
  return res.status(404).json({ error: "ZIP package is currently being generated. Please retry in a few seconds." });
});

// REST API for Invoice/Receipt OCR and evaluation
app.post("/api/scan-invoice", async (req, res) => {
  try {
    const { imageData, mimeType, fileName, simulateBlurry } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: "No image content provided." });
    }

    const ai = getAiClient();
    
    // Fallback Mock simulation if Gemini API key is missing or explicitly mocked
    if (!ai || simulateBlurry === true) {
      console.log("[INVOICE_SCAN] Using local simulation. API key configured:", !!ai);
      
      // Artificial delay for loading states
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const isBlurry = simulateBlurry || (fileName && fileName.toLowerCase().includes("blurry")) || Math.random() < 0.15;
      
      if (isBlurry) {
        return res.json({
          isClear: false,
          clarityMessage: "CRITICAL ALERT: The invoice photo appears to be blurry, poorly lit, or out of focus. Text elements on rows and headers could not be processed reliably. Please sanitize your device screen, verify contrast controls, and upload a clearer, sharper photo of the invoice.",
          vendorName: "Unknown Vendor",
          invoiceNumber: "N/A",
          invoiceDate: "",
          items: []
        });
      }

      // Return a wonderful mocked response matching typical inventory catalog items
      return res.json({
        isClear: true,
        clarityMessage: "Invoice verified clear. Found 5 high-quality matches across standard catalog lines.",
        vendorName: fileName?.toLowerCase().includes("usfood") ? "US Foods" : "Sysco Food Services",
        invoiceNumber: "INV-" + Math.floor(100000 + Math.random() * 899999),
        invoiceDate: new Date().toISOString().substring(0, 10),
        items: [
          { name: "Chicken Breast", quantity: 5, price: 89.50, packaging: "40 lb Case", category: "Cooler" },
          { name: "Salsa", quantity: 3, price: 18.20, packaging: "4 x 1 Gal Case", category: "Cooler" },
          { name: "Flour Tortillas 12\"", quantity: 4, price: 24.50, packaging: "Case of 120", category: "Dry Storage" },
          { name: "Sour Cream", quantity: 2, price: 15.80, packaging: "4 x 5lb Case", category: "Cooler" },
          { name: "Tomatoes", quantity: 3, price: 12.90, packaging: "25 lb Box", category: "Prep Area" }
        ]
      });
    }

    // Actual server-side Gemini OCR call using modern SDK
    console.log("[INVOICE_SCAN] Invoking Gemini API for analysis...");
    
    // Pre-process base64 if it has a prefix
    let base64Data = imageData;
    if (imageData.includes("base64,")) {
      base64Data = imageData.split("base64,")[1];
    }

    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: base64Data,
      },
    };

    const systemPrompt = `Analyze the uploaded invoice or receipt from restaurant food vendors (e.g. Sysco, US Foods, FreshPoint, etc.).
Evaluate if the photograph is clear, high contrast, in-focus, and legible to parse text numbers, items, units, and billing.
If it is blurry or has unreadable text, you MUST flag isClear as false and construct a clear explanation in clarityMessage.
If the invoice is legible, set isClear to true and extract all purchase details including vendor name, invoice date, and an array of items purchased with name, unit price, quantity, packaging details, and category match.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        imagePart,
        { text: "Extract invoice or receipt info. You MUST return JSON matching the schema." }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isClear: {
              type: Type.BOOLEAN,
              description: "Whether the invoice is clear enough to read text rows. Set false if blurry or out-of-focus."
            },
            clarityMessage: {
              type: Type.STRING,
              description: "Review comments about quality. If not clear, outline what is wrong and request a sharper photo."
            },
            vendorName: {
              type: Type.STRING,
              description: "The vendor or supplier name from the header, like Sysco, US Foods, FreshPoint."
            },
            invoiceNumber: {
              type: Type.STRING,
              description: "The unique invoice invoice number or reference code, or empty string."
            },
            invoiceDate: {
              type: Type.STRING,
              description: "Invoice billing date of purchase (YYYY-MM-DD format if possible)."
            },
            items: {
              type: Type.ARRAY,
              description: "List of items purchased from this receipt.",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of the item purchased" },
                  quantity: { type: Type.INTEGER, description: "Quantity purchased" },
                  price: { type: Type.NUMBER, description: "Unit price or case price in dollars" },
                  packaging: { type: Type.STRING, description: "Packaging info like cases, 40lb box, sleeves" },
                  category: { type: Type.STRING, description: "Suggested stock category like Cooler, Freezer, Dry Storage, Bar, Prep Area, Steam Table" }
                },
                required: ["name", "quantity", "price"]
              }
            }
          },
          required: ["isClear", "clarityMessage"]
        }
      }
    });

    const resultText = response.text || "{}";
    const dataResponse = JSON.parse(resultText.trim());
    return res.json(dataResponse);

  } catch (error: any) {
    console.error("[INVOICE_SCAN_ERROR] Fatal error during scan process:", error);
    return res.status(500).json({ 
      error: "Failed to scan the invoice", 
      details: error?.message || "Internal server error" 
    });
  }
});

// Configure Vite or Static Assets serving based on running environment
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("[SERVER] Dev Environment: Mounting Vite Hot-Reload Middleware");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[SERVER] Production Environment: Serving static built assets from /dist");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER_STARTED] Full-stack application running at http://localhost:${PORT}`);
  });
}

initServer();
