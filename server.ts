import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { smartParseWeeklyPlan, cleanAndValidatePlanResult } from './src/utils/smartWeeklyPlanParser';
import dbRouter from './server_db';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(dbRouter);

// Materials Persistent Storage (File + Memory cache + Disk PDF uploads + Deletion Tombstones)
const MATERIALS_FILE = path.join(process.cwd(), 'data', 'materials_store.json');
const MATERIALS_DELETED_FILE = path.join(process.cwd(), 'data', 'materials_deleted.json');
const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let inMemoryMaterials: any[] = [];
let deletedMaterialIds: Set<string> = new Set();

try {
  if (fs.existsSync(MATERIALS_DELETED_FILE)) {
    const rawDel = fs.readFileSync(MATERIALS_DELETED_FILE, 'utf-8');
    const parsedDel = JSON.parse(rawDel);
    if (Array.isArray(parsedDel)) {
      deletedMaterialIds = new Set(parsedDel);
    }
  }
} catch (e) {
  console.warn('Could not load deleted materials log:', e);
}

try {
  if (fs.existsSync(MATERIALS_FILE)) {
    const raw = fs.readFileSync(MATERIALS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Filter out any tombstoned items
      inMemoryMaterials = parsed.filter((m) => m && m.id && !deletedMaterialIds.has(m.id));
    }
    console.log(`Loaded ${inMemoryMaterials.length} materials from disk cache.`);
  }
} catch (e) {
  console.warn('Could not load materials from disk:', e);
}

function persistDeletedIdsToDisk() {
  try {
    const dir = path.dirname(MATERIALS_DELETED_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(MATERIALS_DELETED_FILE, JSON.stringify(Array.from(deletedMaterialIds)), 'utf-8');
  } catch (e) {
    console.error('Failed to write deleted materials to disk:', e);
  }
}

// Helper to save binary PDF to disk from Base64 Data URL and return public endpoint URL
function savePdfFromItem(item: any): string | null {
  try {
    if (!item || !item.id) return null;
    const filePath = path.join(UPLOADS_DIR, `${item.id}.pdf`);

    // 1. If base64 fileData is provided, write to disk
    if (item.fileData && typeof item.fileData === 'string' && item.fileData.includes(',')) {
      const b64 = item.fileData.split(',')[1];
      const buf = Buffer.from(b64, 'base64');
      fs.writeFileSync(filePath, buf);
      return `/api/materials/pdf/${item.id}`;
    }

    // 2. If file already exists on disk
    if (fs.existsSync(filePath)) {
      return `/api/materials/pdf/${item.id}`;
    }
  } catch (err) {
    console.warn(`Error saving PDF for item ${item?.id}:`, err);
  }
  return null;
}

function persistMaterialsToDisk() {
  try {
    const dir = path.dirname(MATERIALS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Sanitize in-memory items so materials_store.json does not carry huge base64 strings
    const sanitized = inMemoryMaterials
      .filter((m) => m && m.id && !deletedMaterialIds.has(m.id))
      .map((m) => {
        const copy = { ...m };
        if (copy.fileData && copy.fileUrl) {
          delete copy.fileData;
        }
        return copy;
      });
    fs.writeFileSync(MATERIALS_FILE, JSON.stringify(sanitized, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write materials to disk:', e);
  }
}

// Materials API Endpoints (Sync Mobile ⇄ Laptop)

// 1. Get All Materials
app.get('/api/materials', (req, res) => {
  const activeMaterials = inMemoryMaterials.filter((m) => m && m.id && !deletedMaterialIds.has(m.id));
  res.json({
    success: true,
    materials: activeMaterials,
    deletedIds: Array.from(deletedMaterialIds),
  });
});

// 2. Serve PDF file binary directly with correct headers and cache
app.get('/api/materials/pdf/:id', (req, res) => {
  const { id } = req.params;
  if (deletedMaterialIds.has(id)) {
    return res.status(404).json({ success: false, error: 'File has been deleted' });
  }

  const filePath = path.join(UPLOADS_DIR, `${id}.pdf`);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(filePath);
  }

  // Fallback: check in-memory if item has fileData
  const found = inMemoryMaterials.find((m) => m.id === id);
  if (found && found.fileData && typeof found.fileData === 'string' && found.fileData.includes(',')) {
    try {
      const b64 = found.fileData.split(',')[1];
      const buf = Buffer.from(b64, 'base64');
      fs.writeFileSync(filePath, buf);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(buf);
    } catch (e) {
      console.warn('Fallback stream error:', e);
    }
  }

  res.status(404).json({ success: false, error: 'PDF file not found' });
});

// 3. Bidirectional Sync: Accepts client's local materials & deletedIds, merges them, and returns complete clean list
app.post('/api/materials/sync', (req, res) => {
  try {
    const { materials, deletedIds: clientDeletedIds } = req.body;
    let changed = false;

    // A. Merge client deleted IDs (tombstones)
    if (Array.isArray(clientDeletedIds) && clientDeletedIds.length > 0) {
      for (const delId of clientDeletedIds) {
        if (typeof delId === 'string' && delId && !deletedMaterialIds.has(delId)) {
          deletedMaterialIds.add(delId);
          changed = true;
          // Delete file from disk if present
          const filePath = path.join(UPLOADS_DIR, `${delId}.pdf`);
          if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch {}
          }
        }
      }
    }

    // Always remove tombstoned items from in-memory list
    const beforeCount = inMemoryMaterials.length;
    inMemoryMaterials = inMemoryMaterials.filter((m) => m && m.id && !deletedMaterialIds.has(m.id));
    if (inMemoryMaterials.length !== beforeCount) {
      changed = true;
    }

    // B. Merge incoming materials (STRICTLY IGNORING any deleted IDs)
    if (Array.isArray(materials) && materials.length > 0) {
      for (const clientItem of materials) {
        if (!clientItem || !clientItem.id) continue;
        // Never allow a deleted item to resurrect
        if (deletedMaterialIds.has(clientItem.id)) {
          continue;
        }

        const existingIdx = inMemoryMaterials.findIndex((m) => m.id === clientItem.id);
        const pdfUrl = savePdfFromItem(clientItem);
        const cleanItem = { ...clientItem };
        if (pdfUrl) {
          cleanItem.fileUrl = pdfUrl;
        }

        if (existingIdx >= 0) {
          // Merge metadata
          inMemoryMaterials[existingIdx] = {
            ...inMemoryMaterials[existingIdx],
            ...cleanItem,
            fileUrl: cleanItem.fileUrl || inMemoryMaterials[existingIdx].fileUrl,
          };
          changed = true;
        } else {
          inMemoryMaterials.unshift(cleanItem);
          changed = true;
        }
      }
    }

    if (changed) {
      persistMaterialsToDisk();
      persistDeletedIdsToDisk();
    }

    const activeMaterials = inMemoryMaterials.filter((m) => m && m.id && !deletedMaterialIds.has(m.id));
    res.json({
      success: true,
      materials: activeMaterials,
      deletedIds: Array.from(deletedMaterialIds),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Save/Update Single Material (Un-tombstone if re-uploaded intentionally)
app.post('/api/materials/single', (req, res) => {
  try {
    const item = req.body;
    if (!item || !item.id) {
      return res.status(400).json({ success: false, error: 'Valid material item with id is required' });
    }

    // If item was previously marked as deleted, remove from tombstone on explicit new upload
    if (deletedMaterialIds.has(item.id)) {
      deletedMaterialIds.delete(item.id);
      persistDeletedIdsToDisk();
    }

    const pdfUrl = savePdfFromItem(item);
    const cleanItem = { ...item };
    if (pdfUrl) {
      cleanItem.fileUrl = pdfUrl;
    }

    const idx = inMemoryMaterials.findIndex((m) => m.id === item.id);
    if (idx >= 0) {
      inMemoryMaterials[idx] = cleanItem;
    } else {
      inMemoryMaterials.unshift(cleanItem);
    }

    persistMaterialsToDisk();
    res.json({ success: true, material: cleanItem });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Bulk Save
app.post('/api/materials/save', (req, res) => {
  try {
    const { materials } = req.body;
    if (Array.isArray(materials)) {
      for (const m of materials) {
        if (m && m.id) {
          deletedMaterialIds.delete(m.id);
          const pdfUrl = savePdfFromItem(m);
          if (pdfUrl) m.fileUrl = pdfUrl;
        }
      }
      inMemoryMaterials = materials.filter((m) => m && m.id && !deletedMaterialIds.has(m.id));
      persistMaterialsToDisk();
      persistDeletedIdsToDisk();
      return res.json({ success: true, count: inMemoryMaterials.length });
    }
    res.status(400).json({ success: false, error: 'materials array is required' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Delete Material (Permanent Deletion across all devices)
app.delete('/api/materials/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (id) {
      deletedMaterialIds.add(id);
      inMemoryMaterials = inMemoryMaterials.filter((m) => m.id !== id);
      persistMaterialsToDisk();
      persistDeletedIdsToDisk();

      // Remove PDF file from disk
      const filePath = path.join(UPLOADS_DIR, `${id}.pdf`);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {}
      }
    }

    res.json({ success: true, deletedId: id, deletedIds: Array.from(deletedMaterialIds) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Clear All Materials
app.post('/api/materials/clear', (req, res) => {
  for (const m of inMemoryMaterials) {
    if (m && m.id) {
      deletedMaterialIds.add(m.id);
      const filePath = path.join(UPLOADS_DIR, `${m.id}.pdf`);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {}
      }
    }
  }
  inMemoryMaterials = [];
  persistMaterialsToDisk();
  persistDeletedIdsToDisk();

  // Clean uploads directory
  try {
    if (fs.existsSync(UPLOADS_DIR)) {
      const files = fs.readdirSync(UPLOADS_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(UPLOADS_DIR, file));
      }
    }
  } catch (e) {
    console.warn('Error clearing uploads dir:', e);
  }

  res.json({ success: true, message: 'All materials cleared from server' });
});

// Helper to get GoogleGenAI client safely (lazy initialization)
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API endpoint to parse Weekly Plan using Gemini or smart deterministic fallback
app.post('/api/parse-weekly-plan', async (req, res) => {
  try {
    const { planText, classId, subjectHint } = req.body;
    if (!planText || typeof planText !== 'string') {
      return res.status(400).json({ error: 'planText is required' });
    }

    const ai = getGenAI();
    if (!ai) {
      console.log('No GEMINI_API_KEY set, using smart deterministic parser.');
      const parsed = smartParseWeeklyPlan(planText, classId, subjectHint);
      return res.json(parsed);
    }

    const subjectContext = subjectHint && subjectHint !== 'ALL'
      ? `IMPORTANT: The weekly plan is primarily for the subject "${subjectHint}". Unless a row/item explicitly specifies another subject, set "subject" to "${subjectHint}".`
      : '';

    const prompt = `
You are an expert school curriculum table parser for Nile Egyptian International School, KG 1 (${classId || 'KG1A'}).
The user provided a weekly plan table (typically in Arabic).
${subjectContext}

CRITICAL USER MANDATES FOR EXTRACTING COLUMNS:
1. الكلاس وورك (classwork):
   - اقرأ العمود بتاع "الدرس" (أو "اسم الدرس") مع عمود "مصدر الصف" (أو "مصادر التعلم" / "مصادر الصف")، واكتبهما في الكلاس وورك (classwork).
   - "title": اسم الدرس فقط من عمود الدرس (e.g. "التعرف على الروتين اليومي وأنواع الخطوط").
   - "pages": أرقام الصفحات وأوراق العمل من عمود مصدر الصف (e.g. "كتاب التلميذ ص 3", "حل ورقة عمل 4 و 5").
   - "details": أي تفاصيل إضافية من عمود مصدر الصف.
   - "links": روابط فيديوهات الشرح الموجهة للصف من عمود مصدر الصف.
   - لا تضع أبداً محتوى مصدر الصف في الهوم وورك، بل يكتب في الكلاس وورك.

2. الهوم وورك (homework):
   - اقرأ العمود بتاع "الواجب المنزلي" (أو الواجب) وضعه في الهوم وورك (homework).
   - "task": نص الواجب المنزلي من عمود الواجب فقط.
   - إذا كان مكتوباً "لا يوجد واجب" أو "-" أو فارغاً أو لا توجد تفاصيل، فلا تضف أي عنصر في مصفوفة homework لهذا اليوم ومادة هذه الحصة نهائياً.
   - "links": أي روابط واجبات منزلية أو فيديوهات تدريب منزلي.

3. التومورو (tomorrowNotes):
   - لو لقيت أي حاجة تخص كلمة "ملاحظات" أو "ملاحظة" (سواء في عمود "ملاحظات" في الجدول، أو أي سطر يحتوي على كلمة ملاحظات أو ملاحظة في أي مكان في النص)، ضعها فوراً وبشكل كامل في التومورو (tomorrowNotes).
   - "note": نص الملاحظة كاملاً.
   - "arabicNote": نص الملاحظة بالعربي.
   - "targetDay": اليوم التابع للملاحظة في الجدول.

Return ONLY valid JSON matching this schema:
{
  "classwork": [
    {
      "classId": "${classId || 'KG1A'}",
      "day": "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday",
      "period": 1,
      "subject": "Arabic",
      "title": "Clean lesson title (اسم الدرس من عمود الدرس)",
      "pages": "Worksheet or book pages from عمود مصدر الصف",
      "details": "Optional extra resource details from عمود مصدر الصف",
      "completed": false,
      "linkUrl": "Optional first URL",
      "links": [{ "url": "https://...", "title": "فيديو الشرح", "type": "video" }]
    }
  ],
  "homework": [
    {
      "classId": "${classId || 'KG1A'}",
      "assignedDay": "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday",
      "dueDay": "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Sunday",
      "subject": "Arabic",
      "task": "Clean homework task (من عمود الواجب المنزلي)",
      "pages": "Optional page numbers",
      "completed": false,
      "priority": "normal",
      "linkUrl": "Optional first URL",
      "links": [{ "url": "https://...", "title": "رابط الواجب", "type": "video" }]
    }
  ],
  "tomorrowNotes": [
    {
      "classId": "${classId || 'KG1A'}",
      "targetDay": "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday",
      "subject": "Arabic",
      "note": "أي نص يخص كلمة ملاحظات يوضع هنا في التومورو",
      "arabicNote": "نص الملاحظة بالعربي",
      "bagItem": "Optional item to pack"
    }
  ]
}

Weekly Plan Input Text:
${planText}
`;

    let textOutput = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
      textOutput = response.text || '';
    } catch (aiErr: any) {
      console.warn('Gemini generateContent with gemini-3.8-flash error, trying fallback:', aiErr?.message || aiErr);
      try {
        const fallbackResp = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
        textOutput = fallbackResp.text || '';
      } catch (fallbackErr) {
        console.warn('Gemini generateContent fallback error, attempting deterministic parser:', fallbackErr);
      }
    }

    if (textOutput) {
      try {
        const parsed = JSON.parse(textOutput);
        const cleaned = cleanAndValidatePlanResult(
          {
            classwork: parsed.classwork || [],
            homework: parsed.homework || [],
            tomorrowNotes: parsed.tomorrowNotes || [],
          },
          classId || 'KG1A',
          subjectHint || 'Arabic'
        );
        if (cleaned.classwork.length > 0 || cleaned.homework.length > 0) {
          return res.json(cleaned);
        }
      } catch (parseErr) {
        console.warn('Failed to parse Gemini output as JSON:', parseErr);
      }
    }

    // Fallback to smart deterministic parser
    const fallback = smartParseWeeklyPlan(planText, classId || 'KG1A', subjectHint || 'Arabic');
    const cleanedFallback = cleanAndValidatePlanResult(fallback, classId || 'KG1A', subjectHint || 'Arabic');
    return res.json(cleanedFallback);
  } catch (error: any) {
    console.error('Error in /api/parse-weekly-plan:', error);
    const fallback = smartParseWeeklyPlan(req.body?.planText || '', req.body?.classId || 'KG1A', req.body?.subjectHint || 'Arabic');
    const cleanedFallback = cleanAndValidatePlanResult(fallback, req.body?.classId || 'KG1A', req.body?.subjectHint || 'Arabic');
    return res.json(cleanedFallback);
  }
});

// PDF Worker static endpoints for reliable client-side rendering
app.get('/pdf.worker.min.mjs', (req, res) => {
  res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const workerFile = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
  if (fs.existsSync(workerFile)) {
    return res.sendFile(workerFile);
  }
  const publicWorker = path.join(process.cwd(), 'public', 'pdf.worker.min.mjs');
  if (fs.existsSync(publicWorker)) {
    return res.sendFile(publicWorker);
  }
  res.status(404).send('pdf.worker.min.mjs not found');
});

app.get('/pdf.worker.legacy.min.mjs', (req, res) => {
  res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const workerFile = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.mjs');
  if (fs.existsSync(workerFile)) {
    return res.sendFile(workerFile);
  }
  res.status(404).send('pdf.worker.legacy.min.mjs not found');
});

// Serve public directory
const publicDir = path.join(process.cwd(), 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
