import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// Heuristic fallback parser if no API key is provided or if network fails
function heuristicParser(planText: string, classId: string) {
  const lines = planText.split('\n').map((l) => l.trim()).filter(Boolean);
  const subjects = [
    'Mathematics',
    'English',
    'Arabic',
    'Science',
    'Social Studies',
    'French',
    'Religion',
    'ICT',
    'Arts',
    'Music',
    'PE',
  ];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

  const classwork: any[] = [];
  const homework: any[] = [];
  const tomorrowNotes: any[] = [];

  let currentDay = 'Sunday';
  let currentSubject = 'English';

  const URL_REGEX = /(https?:\/\/[^\s<>"'()]+|www\.[^\s<>"'()]+)/gi;

  for (const line of lines) {
    // Check if line indicates a day
    for (const d of days) {
      if (new RegExp(`^#*\\s*${d}`, 'i').test(line) || new RegExp(`\\b${d}\\b`, 'i').test(line)) {
        currentDay = d;
        break;
      }
    }

    // Check Arabic days
    if (/الأحد/i.test(line)) currentDay = 'Sunday';
    else if (/الاثنين|الإثنين/i.test(line)) currentDay = 'Monday';
    else if (/الثلاثاء/i.test(line)) currentDay = 'Tuesday';
    else if (/الأربعاء|الاربعاء/i.test(line)) currentDay = 'Wednesday';
    else if (/الخميس/i.test(line)) currentDay = 'Thursday';

    // Check subject
    for (const s of subjects) {
      if (new RegExp(`\\b${s}\\b`, 'i').test(line)) {
        currentSubject = s;
        break;
      }
    }
    if (/عربي|لغة عربية/i.test(line)) currentSubject = 'Arabic';
    else if (/ماث|حساب|رياضيات|math/i.test(line)) currentSubject = 'Mathematics';
    else if (/انجليزي|انجلش|english/i.test(line)) currentSubject = 'English';
    else if (/علوم|ساينس|science/i.test(line)) currentSubject = 'Science';
    else if (/دراسات|social/i.test(line)) currentSubject = 'Social Studies';
    else if (/فرنساوي|فرنسي|french/i.test(line)) currentSubject = 'French';
    else if (/دين|تربية دينية|religion/i.test(line)) currentSubject = 'Religion';
    else if (/حاسب|تكنولوجيا|ict/i.test(line)) currentSubject = 'ICT';
    else if (/رسم|فنية|art/i.test(line)) currentSubject = 'Arts';
    else if (/موسيقى|music/i.test(line)) currentSubject = 'Music';
    else if (/ألعاب|رياضية|pe/i.test(line)) currentSubject = 'PE';

    // Extract links in the line
    const rawUrls = line.match(URL_REGEX) || [];
    const links = rawUrls.map((u) => {
      const cleanUrl = u.startsWith('www.') ? `https://${u}` : u;
      const isVideo = /youtube|youtu\.be|vimeo|mp4/i.test(cleanUrl);
      return {
        url: cleanUrl,
        title: isVideo ? 'فيديو الشرح / التدريب' : 'رابط الدرس والمصدر',
        type: isVideo ? 'video' : 'sheet',
      };
    });
    const linkUrl = links.length > 0 ? links[0].url : undefined;

    // Identify Notes / Tomorrow indicators (Arabic & English)
    const isNote = /^(notes?|ملاحظات|ملاحظة|تنبيه|remarque|bring|please\s+bring|إحضار|برجاء|ضرورة)[:\-–\s]*/i.test(line) ||
                   /\b(notes?|ملاحظات|ملاحظة|تنبيه|remarque)\b/i.test(line);

    // Identify Homework indicators
    const isHw = /hw|homework|واجب|h\.w/i.test(line);
    // Identify Classwork indicators
    const isCw = /cw|classwork|صف|حصة|درس|c\.w/i.test(line);

    const cleanText = line
      .replace(/^(hw|cw|h\.w|c\.w|homework|classwork|واجب|حصة|notes?|ملاحظات|ملاحظة|تنبيه|remarque)[:\-–\s]*/i, '')
      .trim();

    if (isNote) {
      tomorrowNotes.push({
        day: currentDay,
        subject: currentSubject,
        note: cleanText || line,
        arabicNote: cleanText || line,
        bagItem: /bring|إحضار|أدوات|كشكول|كتاب|ألوان|sketch/i.test(line) ? cleanText : undefined,
      });
    } else if (isHw) {
      const nextDayMap: Record<string, string> = {
        Sunday: 'Monday',
        Monday: 'Tuesday',
        Tuesday: 'Wednesday',
        Wednesday: 'Thursday',
        Thursday: 'Sunday',
      };
      homework.push({
        classId: classId || 'KG1A',
        assignedDay: currentDay,
        dueDay: nextDayMap[currentDay] || 'Monday',
        subject: currentSubject,
        task: cleanText || line,
        completed: false,
        priority: /urgent|هام|ضروري|quiz|امتحان/i.test(line) ? 'urgent' : 'normal',
        linkUrl,
        links: links.length > 0 ? links : undefined,
      });
    } else if (isCw || cleanText.length > 5) {
      classwork.push({
        classId: classId || 'KG1A',
        day: currentDay,
        period: (classwork.length % 6) + 1,
        subject: currentSubject,
        title: cleanText || line,
        completed: false,
        linkUrl,
        links: links.length > 0 ? links : undefined,
      });
    }
  }

  return { classwork, homework, tomorrowNotes };
}

// API endpoint to parse Weekly Plan using Gemini or fallback
app.post('/api/parse-weekly-plan', async (req, res) => {
  try {
    const { planText, classId } = req.body;
    if (!planText || typeof planText !== 'string') {
      return res.status(400).json({ error: 'planText is required' });
    }

    const ai = getGenAI();
    if (!ai) {
      console.log('No GEMINI_API_KEY set, using smart heuristic parser.');
      const parsed = heuristicParser(planText, classId);
      return res.json(parsed);
    }

    const prompt = `
You are an expert school coordinator assistant for Nile Egyptian International School, KG 1 (${classId || 'KG1A'}).
The user provided their weekly plan text (which can be in English, Arabic, or mixed).
Your job is to categorize and extract:

CRITICAL RULES & LOGIC:
1. "classwork": Array of lessons/activities studied in class for that day and period.
   Each classwork item must have:
   - "classId": "${classId || 'KG1A'}"
   - "day": One of "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"
   - "period": Number (1 to 6)
   - "subject": One of "Mathematics", "English", "Arabic", "Science", "Social Studies", "French", "Religion", "ICT", "Arts", "Music", "PE"
   - "title": Clean descriptive title of the lesson/topic
   - "details": Optional details
   - "pages": Optional page numbers (e.g. "Student Book p. 24-26")
   - "completed": false
   - "linkUrl": Optional first detected URL in the item
   - "links": Optional array of objects { url: string, title: string, type: 'video' | 'sheet' | 'link' }

2. "homework": Array of homework tasks assigned.
   Each homework item must have:
   - "classId": "${classId || 'KG1A'}"
   - "assignedDay": One of "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"
   - "dueDay": One of "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday" (usually next school day)
   - "subject": One of "Mathematics", "English", "Arabic", "Science", "Social Studies", "French", "Religion", "ICT", "Arts", "Music", "PE"
   - "task": The homework description
   - "pages": Page reference if any
   - "completed": false
   - "priority": "normal" or "urgent" (urgent if quiz, exam, dictation, or project)
   - "linkUrl": Optional first detected URL in the task
   - "links": Optional array of objects { url: string, title: string, type: 'video' | 'sheet' | 'link' }

3. "tomorrowNotes": ALL teacher instructions, parent notes, and remarks in Arabic or English:
   - Convert ANY notes column, "Notes:", "ملاحظات:", "تنبيه:", "Remarque:", or "Please bring..." into "tomorrowNotes" items!
   - "day": School day the note belongs to or applies for
   - "subject": The related subject (e.g. "Arabic", "English", "French", "General")
   - "note": Clear text of the instruction/note
   - "arabicNote": Arabic phrasing of the note
   - "bagItem": Optional supplies/bag item to pack (e.g. "كشكول رسم وألوان", "100 chart")

4. CRITICAL PHONICS & LETTER ORTHOGRAPHY RULE:
   - In English phonics and letter lessons, ensure the letter "P" / "p" (sound /p/, heavy P with circle on top) is strictly preserved and never confused with "B" / "b".
   - In Nile Egyptian School KG 1, students learn letter "P" / "p" (البي التقيلة p). Always spell it correctly as Letter P / p.

5. LINKS & URLS PRESERVATION:
   - Any URLs (such as YouTube videos, Google Drive sheets, audio links) must be extracted and preserved with their exact URLs in both classwork and homework.

Return ONLY valid JSON matching this structure without Markdown fences or commentary:
{
  "classwork": [...],
  "homework": [...],
  "tomorrowNotes": [...]
}

User's Weekly Plan Text:
${planText}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const textOutput = response.text || '';
    try {
      const parsed = JSON.parse(textOutput);
      return res.json({
        classwork: parsed.classwork || [],
        homework: parsed.homework || [],
        tomorrowNotes: parsed.tomorrowNotes || [],
      });
    } catch (parseErr) {
      console.warn('Gemini JSON parse failed, falling back to heuristic:', parseErr);
      const fallback = heuristicParser(planText, classId);
      return res.json(fallback);
    }
  } catch (error: any) {
    console.error('Error in /api/parse-weekly-plan:', error);
    // Fall back gracefully instead of crashing
    const fallback = heuristicParser(req.body?.planText || '', req.body?.classId || 'KG1A');
    return res.json(fallback);
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
