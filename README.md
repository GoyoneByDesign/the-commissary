# The Commissary - Voice-Enabled Inventory & Warehouse Management System

Designed & Engineered for Enterprise Operations by **GoyoneByDesign**.

---

## 📋 Overview
**The Commissary** is a dual-platform enterprise warehouse and restaurant inventory management system. It provides real-time voice-driven inventory counting with an **Adaptive Voice & Pronunciation Learning Engine**, multi-location tracking, automated invoice OCR scanning, audit logs, and cross-platform Jetpack Compose Android specifications.

---

## ✨ Key Features
1. **Adaptive Voice Accent & Pronunciation Learning Engine**:
   - Understands natural spoken quantity counts (e.g., *"twelve bags of jasmine rice"*, *"three boxes roma tomatoes"*).
   - Dynamic accent calibration: Learns user-specific slang, regional accents, dialects, and pronunciations.
   - Live confidence score, phonetic mapping, and custom speech-to-SKU dictionary.

2. **Dual Platform Simulator**:
   - **Interactive Web Client**: Full operational simulator with multi-role permissions (Super Admin, Manager, Inventory Specialist, Auditor).
   - **Jetpack Compose Android Portal**: Full Kotlin source code preview with Android architecture components.

3. **Multi-Location & Warehouse Partitioning**:
   - Real-time stock counts across multiple commissary locations and storage zones.
   - Par levels, low-stock warnings, reorder suggestions, and discrepancy reporting.

4. **Invoice OCR & Scanning**:
   - Gemini-powered OCR to digitize supplier receipts and invoices directly into inventory records.
   - Auto-detects blurry images and alerts staff to sanitize device lenses.

5. **Audit Logs & Export**:
   - Full immutable log trace for every voice command, manual entry, or role override.
   - Export reports and inventory lists.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or bun

### Installation
```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (optional for AI OCR)
cp .env.example .env
# Add GEMINI_API_KEY if using live Gemini OCR (mock fallbacks are built-in)

# 3. Start development server
npm run dev
```

The application will be live at `http://localhost:3000`.

---

## 📁 Project Structure
```
├── src/
│   ├── components/
│   │   ├── AdminPanels.tsx           # Multi-role administration, users & audit logs
│   │   ├── AndroidFilesViewer.tsx    # Native Jetpack Compose Android source viewer
│   │   ├── AppLogo.tsx               # Official brand SVG logo
│   │   ├── InventoryFormCounting.tsx # Active counting sheet with discrepancy checks
│   │   ├── ReportViewer.tsx          # Exportable inventory analytics & variance charts
│   │   └── VoiceInventoryUI.tsx      # Adaptive Voice & Accent Learning Speech Engine
│   ├── data/
│   │   ├── androidProjectFiles.ts    # Complete Kotlin/Compose source definitions
│   │   └── sampleData.ts             # Default locations, items, forms & roles
│   ├── App.tsx                       # Master layout & simulator controller
│   ├── types.ts                      # TypeScript schemas & role definitions
│   ├── index.css                     # Tailwind CSS v4 styling
│   └── main.tsx                      # Client React entrypoint
├── server.ts                         # Express server with Vite middleware & OCR API
├── index.html                        # Application entry HTML
├── package.json                      # Project dependencies and run scripts
├── tsconfig.json                     # TypeScript configuration
└── vite.config.ts                    # Vite build configuration
```

---

## 🏢 Attribution & Branding
- **App Name**: The Commissary
- **Operations & Systems Design**: GoyoneByDesign
