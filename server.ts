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

// Materials Persistent Storage (File + Memory cache)
const MATERIALS_FILE = path.join(process.cwd(), 'data', 'materials_store.json');
let inMemoryMaterials: any[] = [];

try {
  if (fs.existsSync(MATERIALS_FILE)) {
    const raw = fs.readFileSync(MATERIALS_FILE, 'utf-8');
    inMemoryMaterials = JSON.parse(raw);
    console.log(`Loaded ${inMemoryMaterials.length} materials from disk cache.`);
  }
} catch (e) {
  console.warn('Could not load materials from disk:', e);
}

function persistMaterialsToDisk() {
  try {
    const dir = path.dirname(MATERIALS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(MATERIALS_FILE, JSON.stringify(inMemoryMaterials), 'utf-8');
  } catch (e) {
    console.error('Failed to write materials to disk:', e);
  }
}

// Materials API Endpoints (Sync Mobile ⇄ Laptop)
app.get('/api/materials', (req, res) => {
  res.json({ success: true, materials: inMemoryMaterials });
});

app.post('/api/materials/save', (req, res) => {
  try {
    const { materials } = req.body;
    if (Array.isArray(materials)) {
      inMemoryMaterials = materials;
      persistMaterialsToDisk();
      return res.json({ success: true, count: inMemoryMaterials.length });
    }
    res.status(400).json({ success: false, error: 'materials array is required' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/materials/single', (req, res) => {
  try {
    const item = req.body;
    if (!item || !item.id) {
      return res.status(400).json({ success: false, error: 'Valid material item with id is required' });
    }
    const idx = inMemoryMaterials.findIndex((m) => m.id === item.id);
    if (idx >= 0) {
      inMemoryMaterials[idx] = item;
    } else {
      inMemoryMaterials.unshift(item);
    }
    persistMaterialsToDisk();
    res.json({ success: true, material: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/materials/:id', (req, res) => {
  try {
    const { id } = req.params;
    inMemoryMaterials = inMemoryMaterials.filter((m) => m.id !== id);
    persistMaterialsToDisk();
    res.json({ success: true, deletedId: id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/materials/clear', (req, res) => {
  inMemoryMaterials = [];
  persistMaterialsToDisk();
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
        period: (classwork.length % 6) + 1,
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
   - "period": Number (1 to 6, or estimate 1-6 based on typical school day schedule)
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
