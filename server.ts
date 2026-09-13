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
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Directories for permanent files and materials
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const DATA_DIR = path.join(process.cwd(), 'data');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const MATERIALS_FILE = path.join(DATA_DIR, 'materials.json');

function loadServerMaterials(): any[] {
  if (fs.existsSync(MATERIALS_FILE)) {
    try {
      const content = fs.readFileSync(MATERIALS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn('Could not read materials.json:', e);
    }
  }
  return [];
}

function saveServerMaterials(materials: any[]) {
  try {
    fs.writeFileSync(MATERIALS_FILE, JSON.stringify(materials, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write materials.json:', e);
  }
}

let materialsCache: any[] = loadServerMaterials();

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

  let currentDay = 'Sunday';
  let currentSubject = 'English';

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
    else if (/الأربعاء/i.test(line)) currentDay = 'Wednesday';
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

    // Identify Homework indicators
    const isHw = /hw|homework|واجب|h\.w/i.test(line);
    // Identify Classwork indicators
    const isCw = /cw|classwork|صف|حصة|درس|c\.w/i.test(line);

    const cleanText = line.replace(/^(hw|cw|h\.w|c\.w|homework|classwork|واجب|حصة)[:\-–\s]*/i, '').trim();

    if (isHw) {
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
      });
    } else if (isCw || cleanText.length > 5) {
      classwork.push({
        classId: classId || 'KG1A',
        day: currentDay,
        period: (classwork.length % 8) + 1,
        subject: currentSubject,
        title: cleanText || line,
        completed: false,
      });
    }
  }

  return { classwork, homework };
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
1. "classwork": An array of items studied in class for that day and period.
   Each classwork item must have:
   - "classId": "${classId || 'KG1A'}"
   - "day": One of "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"
   - "period": Number (1 to 8, or estimate 1-8 based on typical school day schedule)
   - "subject": One of "Mathematics", "English", "Arabic", "Science", "Social Studies", "French", "Religion", "ICT", "Arts", "Music", "PE"
   - "title": Short descriptive title of the topic/lesson (e.g. "Chapter 2: Subtraction with regrouping")
   - "details": Optional additional instructions or practice details
   - "pages": Optional page numbers (e.g. "Student Book p. 24-26")
   - "completed": false

2. "homework": An array of homework tasks assigned.
   Each homework item must have:
   - "classId": "${classId || 'KG1A'}"
   - "assignedDay": One of "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"
   - "dueDay": One of "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday" (usually the next school day or next subject period)
   - "subject": One of "Mathematics", "English", "Arabic", "Science", "Social Studies", "French", "Religion", "ICT", "Arts", "Music", "PE"
   - "task": The homework description (e.g. "Workbook p. 14 exercises 1-5")
   - "details": Extra notes or materials needed
   - "pages": Page reference
   - "completed": false
   - "priority": "normal" or "urgent" (urgent if it mentions a quiz, test, spelling bee, project, or due tomorrow)

3. "tomorrowNotes": Optional list of items to pack or special preparations for tomorrow:
   - "day": Day of the week
   - "note": What to pack/bring (e.g. "Bring Art sketch and water colors", "PE sports uniform")

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

// Materials API: Get all materials list
app.get('/api/materials', (req, res) => {
  res.json({ success: true, materials: materialsCache });
});

// Materials API: Save materials list from Admin
app.post('/api/materials/save', (req, res) => {
  try {
    const { materials } = req.body;
    if (Array.isArray(materials)) {
      materialsCache = materials;
      saveServerMaterials(materialsCache);
    }
    res.json({ success: true, count: materialsCache.length });
  } catch (e: any) {
    console.error('Error saving materials:', e);
    res.status(500).json({ error: 'Failed to save materials' });
  }
});

// Materials API: Upload file directly (supports Base64 JSON payload)
app.post('/api/materials/upload', (req, res) => {
  try {
    const { fileName, fileData, fileSize, block, section, classId, title, subjectId } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ error: 'fileName and fileData are required' });
    }

    // Generate safe filename for disk storage
    const safeName = `${Date.now()}_${path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(UPLOADS_DIR, safeName);

    // Write file to uploads directory
    const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const fileUrl = `/api/materials/file/${encodeURIComponent(safeName)}`;
    const downloadUrl = `/api/materials/download/${encodeURIComponent(safeName)}`;

    const newMaterial = {
      id: `mat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fileName: fileName,
      storedFileName: safeName,
      fileSize: fileSize || fs.statSync(filePath).size,
      fileUrl,
      downloadUrl,
      fileData,
      block: Number(block) || 1,
      section: section || 'Main sheet',
      classId: classId || 'ALL',
      title: title || fileName.replace(/\.[^/.]+$/, ''),
      subjectId: subjectId || 'general',
      uploadedAt: new Date().toISOString(),
    };

    // Prepend to materialsCache and save to disk
    materialsCache = [newMaterial, ...materialsCache.filter((m) => m.id !== newMaterial.id)];
    saveServerMaterials(materialsCache);

    res.json({
      success: true,
      fileUrl,
      downloadUrl,
      fileName,
      item: newMaterial,
    });
  } catch (e: any) {
    console.error('Error uploading material file:', e);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Materials API: Stream/view PDF file
app.get('/api/materials/file/:filename', (req, res) => {
  const filename = path.basename(decodeURIComponent(req.params.filename));
  let targetPath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(targetPath)) {
    const found = materialsCache.find((m) => m.storedFileName === filename || m.fileName === filename);
    if (found && found.storedFileName) {
      targetPath = path.join(UPLOADS_DIR, found.storedFileName);
    }
  }

  if (fs.existsSync(targetPath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(targetPath).pipe(res);
  } else {
    // Check if in memory as data URI
    const found = materialsCache.find((m) => m.fileName === filename || m.storedFileName === filename);
    if (found && found.fileData) {
      const base64Data = found.fileData.includes(',') ? found.fileData.split(',')[1] : found.fileData;
      const buffer = Buffer.from(base64Data, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
      return res.send(buffer);
    }
    res.status(404).send('File not found');
  }
});

// Materials API: Download PDF file
app.get('/api/materials/download/:filename', (req, res) => {
  const filename = path.basename(decodeURIComponent(req.params.filename));
  let targetPath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(targetPath)) {
    const found = materialsCache.find((m) => m.storedFileName === filename || m.fileName === filename);
    if (found && found.storedFileName) {
      targetPath = path.join(UPLOADS_DIR, found.storedFileName);
    }
  }

  if (fs.existsSync(targetPath)) {
    res.download(targetPath, filename);
  } else {
    const found = materialsCache.find((m) => m.fileName === filename || m.storedFileName === filename);
    if (found && found.fileData) {
      const base64Data = found.fileData.includes(',') ? found.fileData.split(',')[1] : found.fileData;
      const buffer = Buffer.from(base64Data, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      return res.send(buffer);
    }
    res.status(404).send('File not found');
  }
});

// Materials API: Delete material
app.delete('/api/materials/:id', (req, res) => {
  const id = req.params.id;
  const item = materialsCache.find((m) => m.id === id);
  if (item && item.storedFileName) {
    const filePath = path.join(UPLOADS_DIR, item.storedFileName);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.warn('Could not unlink file:', e);
      }
    }
  }
  materialsCache = materialsCache.filter((m) => m.id !== id);
  saveServerMaterials(materialsCache);
  res.json({ success: true });
});

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
