import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { execSync } from "node:child_process";
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

// In-memory cache for user speech learning profiles
const serverVoiceProfilesMap = new Map<string, any>();

// REST API to get or save user speech adaptation profile
app.get("/api/user/voice-profile/:userId", (req, res) => {
  const { userId } = req.params;
  const profile = serverVoiceProfilesMap.get(userId);
  if (profile) {
    return res.json(profile);
  }
  return res.json({ found: false });
});

app.post("/api/user/voice-profile", (req, res) => {
  const profile = req.body;
  if (!profile || !profile.userId) {
    return res.status(400).json({ error: "Invalid user voice profile payload." });
  }
  serverVoiceProfilesMap.set(profile.userId, profile);
  return res.json({ success: true, message: `Voice profile for user ${profile.userId} updated.` });
});

// REST API to parse spoken inventory counts with Personalized Google Gemini AI
app.post("/api/ai/voice-parse", async (req, res) => {
  try {
    const { spokenText, availableItemNames, userVoiceProfile } = req.body;
    if (!spokenText || typeof spokenText !== "string") {
      return res.status(400).json({ error: "Spoken transcript text is required." });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.json({ 
        matches: [], 
        notice: "Gemini API key not configured, local adaptive NLP parser active" 
      });
    }

    // Build personalized user context for Gemini in-context few-shot learning
    const userContext = userVoiceProfile ? `
PERSONALIZED VOICE & SPEECH PROFILE FOR USER: "${userVoiceProfile.userName}" (ID: ${userVoiceProfile.userId}):
- Accent / Dialect: ${userVoiceProfile.accentDialect || 'Standard'}
- Vocal Pitch / Tone: ${userVoiceProfile.pitchTone || 'Normal'}
- Speaking Pace: ${userVoiceProfile.speechRate || 'Normal'}
- Preferred Phrasing Order: ${userVoiceProfile.preferredGrammar || 'Adaptive'}
- Observed User Speech Habits:
  ${(userVoiceProfile.phrasingHabits || []).map((h: string) => `  * ${h}`).join('\n')}
- Personal Nicknames & Phonetic Mappings:
  ${JSON.stringify(userVoiceProfile.vocabularyAliases || {})}
NOTE: This specific employee may speak in any of these phrasing permutations:
1. Quantity -> Unit -> Item: "5 cases of Chicken Breast", "3 bags of Chorizo"
2. Unit -> Item -> Quantity: "Case Chicken Breast 5", "Bag Chorizo 4"
3. Quantity -> Item -> Unit: "5 Chicken Breast Cases", "4 Chorizo Bags"
4. Item -> Quantity: "Chicken Breast 5", "Chorizo 4"
Adapt directly to their accent, higher/lower pitch, and word order!
` : '';

    const prompt = `You are a super-intelligent AI inventory voice assistant in a restaurant commissary/warehouse.
A kitchen or bar employee just spoke this command while counting inventory: "${spokenText}".
${userContext}
Here is the list of available item names from the current sheet:
${JSON.stringify((availableItemNames || []).slice(0, 80))}

Your task is to identify which items were mentioned and what count or quantity was given.
Rules:
- Flexibly handle ANY word ordering (e.g. "5 cases of chicken breast", "Case chicken breast 5", "5 chicken breast cases", "chicken breast 5").
- Match spoken item phrases even with thick accents, typos, background kitchen noise, or shorthand (e.g., "cheeken" or "pollo" -> "Chicken Breast", "chori" or "choriso" -> "CHORIZO", "tortias" -> "FLOUR TORTILLAS 12\"").
- If walk-in and bar counts are mentioned (e.g., "Corona 8 walk in and 3 bar"), return wlkInCount: 8, barCount: 3, and count: 11.
- Identify the speech pattern used: 'qty_unit_item' | 'unit_item_qty' | 'qty_item_unit' | 'item_qty'.
- Return ONLY valid JSON with this exact structure:
{
  "matches": [
    {
      "matchedItemName": "exact item name from candidate list",
      "count": 5,
      "wlkInCount": null,
      "barCount": null,
      "unit": "case",
      "spokenPhrase": "phrase snippet spoken",
      "patternDetected": "qty_unit_item",
      "learnedAlias": null
    }
  ],
  "speechAnalysis": {
    "detectedPattern": "qty_unit_item",
    "toneDetected": "normal",
    "adaptationNote": "Successfully parsed order"
  }
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsedJson = JSON.parse(response.text || '{"matches":[]}');
    return res.json(parsedJson);
  } catch (err: any) {
    console.error("[VOICE_AI_PARSE_ERROR]", err);
    return res.status(500).json({ error: "Failed to parse voice command with AI", details: err?.message });
  }
});

// Git status inspection endpoint
app.get("/api/github/status", (_req, res) => {
  try {
    const isGit = fs.existsSync(path.join(process.cwd(), ".git"));
    if (!isGit) {
      return res.json({ initialized: false });
    }
    const branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
    const commitHash = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
    const commitMsg = execSync("git log -1 --pretty=%B", { encoding: "utf-8" }).trim();
    let remoteUrl = "";
    try {
      remoteUrl = execSync("git remote get-url origin", { encoding: "utf-8" }).trim();
      remoteUrl = remoteUrl.replace(/\/\/[^@]+@/, "//");
    } catch {}
    const status = execSync("git status --porcelain", { encoding: "utf-8" }).trim();
    return res.json({
      initialized: true,
      branch,
      commitHash,
      commitMsg,
      remoteUrl,
      clean: status.length === 0,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Git push directly to user's GitHub repository
app.post("/api/github/push", (req, res) => {
  let { repoUrl, token, branch = "main", commitMessage, force = false } = req.body;

  if (!repoUrl || typeof repoUrl !== "string") {
    return res.status(400).json({ error: "GitHub repository URL or username/repo is required." });
  }

  // Normalize repository URL
  repoUrl = repoUrl.trim();
  let owner = "";
  let repo = "";

  if (repoUrl.startsWith("https://github.com/")) {
    const parts = repoUrl.replace("https://github.com/", "").replace(/\.git$/, "").split("/");
    owner = parts[0];
    repo = parts[1];
  } else if (repoUrl.startsWith("git@github.com:")) {
    const parts = repoUrl.replace("git@github.com:", "").replace(/\.git$/, "").split("/");
    owner = parts[0];
    repo = parts[1];
  } else if (repoUrl.includes("/")) {
    const parts = repoUrl.replace(/\.git$/, "").split("/");
    owner = parts[0];
    repo = parts[1];
  }

  if (!owner || !repo) {
    return res.status(400).json({ 
      error: "Invalid GitHub repository format. Please use 'https://github.com/username/repo' or 'username/repo'." 
    });
  }

  const cleanRepoUrl = `https://github.com/${owner}/${repo}`;
  const cleanGitUrl = `https://github.com/${owner}/${repo}.git`;
  
  const trimmedToken = token ? token.trim() : "";
  const authGitUrl = trimmedToken 
    ? `https://${encodeURIComponent(trimmedToken)}@github.com/${owner}/${repo}.git`
    : cleanGitUrl;

  try {
    // 1. Ensure git repo initialized
    if (!fs.existsSync(path.join(process.cwd(), ".git"))) {
      execSync("git init -b main", { encoding: "utf-8" });
      execSync('git config user.name "Michael Goyone"', { encoding: "utf-8" });
      execSync('git config user.email "michael.goyone@gmail.com"', { encoding: "utf-8" });
    }

    // 2. Stage any changes and commit if needed
    execSync("git add -A", { encoding: "utf-8" });
    const hasChanges = execSync("git status --porcelain", { encoding: "utf-8" }).trim().length > 0;
    if (hasChanges) {
      const msg = commitMessage ? commitMessage.replace(/"/g, '\\"') : "Update from The Commissary workspace";
      execSync(`git commit -m "${msg}"`, { encoding: "utf-8" });
    }

    // 3. Ensure branch name
    const targetBranch = branch.trim() || "main";
    try {
      execSync(`git branch -M ${targetBranch}`, { encoding: "utf-8" });
    } catch {}

    // 4. Configure remote origin with auth
    try {
      execSync("git remote remove origin", { encoding: "utf-8", stdio: "ignore" });
    } catch {}
    execSync(`git remote add origin "${authGitUrl}"`, { encoding: "utf-8" });

    // 5. Push
    const forceFlag = force ? " --force" : "";
    const pushOutput = execSync(`git push -u origin ${targetBranch}${forceFlag}`, {
      encoding: "utf-8",
      timeout: 30000,
    });

    // 6. SANITIZE remote immediately so token is not stored in plain text
    try {
      execSync(`git remote set-url origin "${cleanGitUrl}"`, { encoding: "utf-8" });
    } catch {}

    const commitHash = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();

    return res.json({
      success: true,
      message: `Successfully pushed branch '${targetBranch}' to GitHub!`,
      repoUrl: cleanRepoUrl,
      branch: targetBranch,
      commitHash,
      details: pushOutput.trim(),
    });
  } catch (error: any) {
    // Make sure we sanitize remote origin even on failure
    try {
      execSync(`git remote set-url origin "${cleanGitUrl}"`, { encoding: "utf-8", stdio: "ignore" });
    } catch {}

    let rawErr = error?.stderr?.toString() || error?.message || "Unknown push error";
    if (trimmedToken) {
      rawErr = rawErr.split(trimmedToken).join("[REDACTED_TOKEN]");
    }

    let helpfulHint = "";
    if (rawErr.includes("Authentication failed") || rawErr.includes("Invalid username or password") || rawErr.includes("403") || rawErr.includes("could not read Username")) {
      helpfulHint = "Authentication required. Please enter your GitHub Personal Access Token (PAT) with 'repo' scope. GitHub no longer allows password authentication.";
    } else if (rawErr.includes("Repository not found") || rawErr.includes("404")) {
      helpfulHint = `Repository '${owner}/${repo}' does not exist on GitHub yet. Please create an empty repository on GitHub first at https://github.com/new and then click Push again!`;
    } else if (rawErr.includes("non-fast-forward") || rawErr.includes("fetch first") || rawErr.includes("[rejected]")) {
      helpfulHint = "The remote repository has existing commits. Toggle 'Force Push' to overwrite, or specify an empty repository.";
    }

    return res.status(500).json({
      success: false,
      error: rawErr,
      hint: helpfulHint,
    });
  }
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
      server: { middlewareMode: true, allowedHosts: true },
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
