import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createRequire } from 'module';
const requireFn = typeof require !== 'undefined' ? require : createRequire(import.meta.url);
const pdf = requireFn('pdf-parse');
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { CLASS_TIMETABLES } from './src/data/timetables';
import dbRouter from './server_db';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(dbRouter);
app.use('/materials', express.static(path.join(process.cwd(), 'public', 'materials')));

// Directories for server-side persistence
const DATA_DIR = path.join(process.cwd(), 'data');
const MATERIALS_DIR = path.join(process.cwd(), 'uploads', 'materials');
const MATERIALS_FILE = path.join(DATA_DIR, 'materials.json');
const PLANNER_DATA_FILE = path.join(DATA_DIR, 'planner_data.json');
const SUPABASE_CONFIG_FILE = path.join(DATA_DIR, 'supabase_config.json');

try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(MATERIALS_DIR)) fs.mkdirSync(MATERIALS_DIR, { recursive: true });
} catch (e) {
  console.warn('Could not ensure data/upload directories:', e);
}

function getStoredSupabaseConfig(): { url: string; key: string } | null {
  try {
    if (fs.existsSync(SUPABASE_CONFIG_FILE)) {
      const raw = fs.readFileSync(SUPABASE_CONFIG_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Error reading supabase_config.json:', err);
  }
  return null;
}

function saveStoredSupabaseConfig(config: { url: string; key: string } | null): void {
  try {
    if (config) {
      fs.writeFileSync(SUPABASE_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    } else if (fs.existsSync(SUPABASE_CONFIG_FILE)) {
      fs.unlinkSync(SUPABASE_CONFIG_FILE);
    }
  } catch (err) {
    console.warn('Error saving supabase_config.json:', err);
  }
}

// Helper to read materials from disk
function getStoredMaterials(): any[] {
  try {
    if (fs.existsSync(MATERIALS_FILE)) {
      const raw = fs.readFileSync(MATERIALS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Error reading materials.json:', err);
  }
  return [];
}

function saveStoredMaterials(items: any[]): void {
  try {
    fs.writeFileSync(MATERIALS_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error writing materials.json:', err);
  }
}

// Helper to read planner data
function getStoredPlannerData(): { classwork: any[]; homework: any[]; tomorrowNotes: any[]; deletedTomorrowNoteIds?: string[]; deletedPlannerItemIds?: string[] } {
  try {
    if (fs.existsSync(PLANNER_DATA_FILE)) {
      const raw = fs.readFileSync(PLANNER_DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Error reading planner_data.json:', err);
  }
  return { classwork: [], homework: [], tomorrowNotes: [], deletedTomorrowNoteIds: [], deletedPlannerItemIds: [] };
}

function saveStoredPlannerData(data: { classwork: any[]; homework: any[]; tomorrowNotes: any[]; deletedTomorrowNoteIds?: string[]; deletedPlannerItemIds?: string[] }): void {
  try {
    fs.writeFileSync(PLANNER_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error writing planner_data.json:', err);
  }
}

// Helper to get GoogleGenAI client safely (lazy initialization)
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
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

// Shared Supabase Configuration for cross-device sync
app.get('/api/supabase-config', (req, res) => {
  res.json(getStoredSupabaseConfig() || { url: '', key: '' });
});

app.post('/api/supabase-config', (req, res) => {
  try {
    const { url, key } = req.body;
    saveStoredSupabaseConfig({ url: url || '', key: key || '' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error saving Supabase config' });
  }
});

app.post('/api/supabase-config/clear', (req, res) => {
  try {
    saveStoredSupabaseConfig(null);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error clearing Supabase config' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Materials endpoints (Accessible across Mobile, Laptop & Desktop)
app.get('/api/materials', (req, res) => {
  const list = getStoredMaterials();
  res.json(list);
});

app.post('/api/materials', (req, res) => {
  try {
    const item = req.body;
    if (!item || !item.id) {
      return res.status(400).json({ error: 'Valid material item with id is required' });
    }

    // If fileData (base64) is provided, persist it to disk as well
    if (item.fileData && typeof item.fileData === 'string' && item.fileData.includes(',')) {
      try {
        const base64Data = item.fileData.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const filePath = path.join(MATERIALS_DIR, `${item.id}.pdf`);
        fs.writeFileSync(filePath, buffer);
        item.storageUrl = `/api/materials/${item.id}/file`;
      } catch (fErr) {
        console.warn('Failed to write material file to disk:', fErr);
      }
    }

    const current = getStoredMaterials();
    const existingIndex = current.findIndex((m: any) => m.id === item.id);
    if (existingIndex >= 0) {
      current[existingIndex] = { ...current[existingIndex], ...item };
    } else {
      current.unshift(item);
    }
    saveStoredMaterials(current);
    res.json({ success: true, item });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error saving material' });
  }
});

app.get('/api/materials/:id/file', (req, res) => {
  const { id } = req.params;
  const filePath = path.join(MATERIALS_DIR, `${id}.pdf`);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="material.pdf"');
    const stream = fs.createReadStream(filePath);
    return stream.pipe(res);
  }

  // Check if fileData in materials.json
  const list = getStoredMaterials();
  const found = list.find((m: any) => m.id === id);
  if (found && found.fileData && found.fileData.includes(',')) {
    const base64Data = found.fileData.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="material.pdf"');
    return res.send(buffer);
  }

  res.status(404).json({ error: 'File not found' });
});

app.delete('/api/materials/:id', (req, res) => {
  const { id } = req.params;
  const current = getStoredMaterials().filter((m: any) => m.id !== id);
  saveStoredMaterials(current);
  const filePath = path.join(MATERIALS_DIR, `${id}.pdf`);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch {}
  }
  res.json({ success: true });
});

app.post('/api/materials/clear', (req, res) => {
  try {
    saveStoredMaterials([]);
    if (fs.existsSync(MATERIALS_DIR)) {
      const files = fs.readdirSync(MATERIALS_DIR);
      files.forEach((file) => {
        try { fs.unlinkSync(path.join(MATERIALS_DIR, file)); } catch {}
      });
    }
    const publicMatDir = path.join(process.cwd(), 'public', 'materials');
    if (fs.existsSync(publicMatDir)) {
      const files = fs.readdirSync(publicMatDir);
      files.forEach((file) => {
        try { fs.unlinkSync(path.join(publicMatDir, file)); } catch {}
      });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error clearing materials' });
  }
});

// Planner Data endpoints (Backup & sync across all devices)
app.post('/api/planner-data/clear', (req, res) => {
  try {
    saveStoredPlannerData({
      classwork: [],
      homework: [],
      tomorrowNotes: [],
      deletedTomorrowNoteIds: [],
      deletedPlannerItemIds: [],
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error clearing planner data' });
  }
});
app.get('/api/planner-data', (req, res) => {
  try {
    const data = getStoredPlannerData();
    if (Array.isArray(data.deletedTomorrowNoteIds) && data.deletedTomorrowNoteIds.length > 0) {
      const delSet = new Set(data.deletedTomorrowNoteIds);
      data.tomorrowNotes = (data.tomorrowNotes || []).filter((n: any) => !delSet.has(n.id));
    }
    if (Array.isArray(data.deletedPlannerItemIds) && data.deletedPlannerItemIds.length > 0) {
      const delSet = new Set(data.deletedPlannerItemIds);
      data.classwork = (data.classwork || []).filter((c: any) => !delSet.has(c.id));
      data.homework = (data.homework || []).filter((h: any) => !delSet.has(h.id));
    }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to read planner data' });
  }
});

app.post('/api/planner-data', (req, res) => {
  try {
    const { classwork, homework, tomorrowNotes, mode = 'merge' } = req.body;
    let current = getStoredPlannerData();

    if (mode === 'replace') {
      // If replacing, remove existing items matching the incoming items' (block, week, subject, classId) or (block, week)
      if (Array.isArray(classwork) && classwork.length > 0) {
        const targetKeys = new Set(
          classwork.map((cw: any) => `${cw.block || 1}-${cw.week || 1}-${cw.classId}-${normalizeSubject(cw.subject)}`)
        );
        current.classwork = current.classwork.filter(
          (cw: any) => !targetKeys.has(`${cw.block || 1}-${cw.week || 1}-${cw.classId}-${normalizeSubject(cw.subject)}`)
        );
        const cwMap = new Map<string, any>();
        current.classwork.forEach((cw: any) => { if (cw?.id) cwMap.set(cw.id, cw); });
        classwork.forEach((cw: any) => { if (cw?.id) cwMap.set(cw.id, cw); });
        current.classwork = Array.from(cwMap.values());
      }

      if (Array.isArray(homework) && homework.length > 0) {
        const targetKeys = new Set(
          homework.map((hw: any) => `${hw.block || 1}-${hw.week || 1}-${hw.classId}-${normalizeSubject(hw.subject)}`)
        );
        current.homework = current.homework.filter(
          (hw: any) => !targetKeys.has(`${hw.block || 1}-${hw.week || 1}-${hw.classId}-${normalizeSubject(hw.subject)}`)
        );
        const hwMap = new Map<string, any>();
        current.homework.forEach((hw: any) => { if (hw?.id) hwMap.set(hw.id, hw); });
        homework.forEach((hw: any) => { if (hw?.id) hwMap.set(hw.id, hw); });
        current.homework = Array.from(hwMap.values());
      }

      if (Array.isArray(tomorrowNotes) && tomorrowNotes.length > 0) {
        // When replacing tomorrow notes for a specific block and week
        const incomingBlock = tomorrowNotes[0].block || 1;
        const incomingWeek = tomorrowNotes[0].week || 2;
        const incomingClassId = tomorrowNotes[0].classId || 'G2B';

        current.tomorrowNotes = current.tomorrowNotes.filter(
          (n: any) => !(Number(n.block || 1) === Number(incomingBlock) && Number(n.week || 1) === Number(incomingWeek) && n.classId === incomingClassId)
        );

        const notesMap = new Map<string, any>();
        current.tomorrowNotes.forEach((n: any) => {
          const key = n.id || `${n.classId}-${n.targetDay}-${n.block || 1}-${n.week || 1}-${n.subject}-${n.note.slice(0, 20)}`;
          notesMap.set(key, n);
        });
        tomorrowNotes.forEach((n: any) => {
          const key = n.id || `${n.classId}-${n.targetDay}-${n.block || 1}-${n.week || 1}-${n.subject}-${n.note.slice(0, 20)}`;
          notesMap.set(key, n);
        });
        current.tomorrowNotes = Array.from(notesMap.values());
      }
    } else {
      // Merge mode
      if (Array.isArray(classwork)) {
        const cwMap = new Map<string, any>();
        current.classwork.forEach((cw: any) => cwMap.set(cw.id, cw));
        classwork.forEach((cw: any) => cwMap.set(cw.id, cw));
        current.classwork = Array.from(cwMap.values());
        if (current.deletedPlannerItemIds) {
          const addedIds = new Set(classwork.map((cw: any) => cw.id).filter(Boolean));
          current.deletedPlannerItemIds = current.deletedPlannerItemIds.filter((id: string) => !addedIds.has(id));
        }
      }

      if (Array.isArray(homework)) {
        const hwMap = new Map<string, any>();
        current.homework.forEach((hw: any) => hwMap.set(hw.id, hw));
        homework.forEach((hw: any) => hwMap.set(hw.id, hw));
        current.homework = Array.from(hwMap.values());
        if (current.deletedPlannerItemIds) {
          const addedIds = new Set(homework.map((hw: any) => hw.id).filter(Boolean));
          current.deletedPlannerItemIds = current.deletedPlannerItemIds.filter((id: string) => !addedIds.has(id));
        }
      }

      if (Array.isArray(tomorrowNotes)) {
        const notesMap = new Map<string, any>();
        const getNoteContentKey = (n: any) => {
          const normText = (n.arabicNote || n.note || '').replace(/[🚨📝🎒]/g, '').trim().slice(0, 25);
          return `${n.classId || 'ALL'}-${n.targetDay}-${n.block || 1}-${n.week || 1}-${n.subject}-${normText}`;
        };

        current.tomorrowNotes.forEach((n: any) => {
          const contentKey = getNoteContentKey(n);
          notesMap.set(contentKey, n);
        });
        tomorrowNotes.forEach((n: any) => {
          const contentKey = getNoteContentKey(n);
          // Incoming note takes precedence or updates existing
          notesMap.set(contentKey, n);
        });
        current.tomorrowNotes = Array.from(notesMap.values());
        if (current.deletedTomorrowNoteIds) {
          const addedIds = new Set(tomorrowNotes.map((n: any) => n.id).filter(Boolean));
          current.deletedTomorrowNoteIds = current.deletedTomorrowNoteIds.filter((id: string) => !addedIds.has(id));
        }
      }
    }

    saveStoredPlannerData(current);
    res.json({ success: true, count: { classwork: current.classwork.length, homework: current.homework.length } });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error saving planner data' });
  }
});

app.post('/api/planner-data/delete', (req, res) => {
  try {
    const { id, ids, type } = req.body; // type: 'classwork' | 'homework' | 'tomorrowNotes'
    const targetIds: string[] = Array.isArray(ids) ? ids : id ? [id] : [];
    let current = getStoredPlannerData();
    if (!current.deletedPlannerItemIds) current.deletedPlannerItemIds = [];
    if (!current.deletedTomorrowNoteIds) current.deletedTomorrowNoteIds = [];

    if (type === 'classwork') {
      current.classwork = current.classwork.filter((c: any) => !targetIds.includes(c.id));
      targetIds.forEach((tId) => {
        if (!current.deletedPlannerItemIds.includes(tId)) {
          current.deletedPlannerItemIds.push(tId);
        }
      });
    } else if (type === 'homework') {
      current.homework = current.homework.filter((h: any) => !targetIds.includes(h.id));
      targetIds.forEach((tId) => {
        if (!current.deletedPlannerItemIds.includes(tId)) {
          current.deletedPlannerItemIds.push(tId);
        }
      });
    } else if (type === 'tomorrowNotes') {
      current.tomorrowNotes = current.tomorrowNotes.filter((n: any) => !targetIds.includes(n.id));
      targetIds.forEach((tId) => {
        if (!current.deletedTomorrowNoteIds.includes(tId)) {
          current.deletedTomorrowNoteIds.push(tId);
        }
      });
    }
    saveStoredPlannerData(current);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error deleting planner item' });
  }
});

// Voice-command natural language parser endpoint
app.post('/api/parse-voice-command', async (req, res) => {
  try {
    const { command, itemType, currentClass, currentBlock, currentWeek, selectedDay } = req.body;
    if (!command) {
      return res.status(400).json({ error: 'Command text is required' });
    }

    const ai = getGenAI();
    if (!ai) {
      console.log('No GEMINI_API_KEY set, using smart heuristic fallback.');
      return res.json({
        success: true,
        data: {
          title: command,
          task: command,
          arabicNote: command,
          note: command
        }
      });
    }

    const prompt = `
You are an expert AI Voice Command Parser for a primary school planner.
Parse the following voice command or dictation text: "${command}"
Into a structured JSON object to fill out a task creation/editing form.
The form item type is currently set to: "${itemType}" (can be 'classwork', 'homework', or 'tomorrow').

Current context:
- Default Class ID: "${currentClass || 'G2B'}"
- Default Block: ${currentBlock || 1}
- Default Week: ${currentWeek || 3}
- Default/Selected Day: "${selectedDay || 'Sunday'}"

Valid options to map:
- Subjects: "Arabic", "English", "Mathematics", "Science", "French", "Social Studies", "Religion", "ICT", "Arts", "Music", "PE"
- Class IDs: "G2A", "G2B", "G2C", "ALL"
- Days of the week (must capitalize first letter): "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"
- Blocks: 1, 2, 3, 4
- Weeks: 1, 2, 3, 4

Response format MUST be strictly a JSON block containing only the fields that were specified or can be intelligently inferred from the command:

For all types:
- subject (match closest from valid subjects, translate from Arabic if spoken in Arabic e.g. "ساينس" or "علوم" -> "Science", "رياضيات" or "ماث" -> "Mathematics", "عربي" -> "Arabic", "دين" -> "Religion", "فرنش" or "فرنساوي" -> "French", "دراسات" -> "Social Studies", "رسم" or "ارت" -> "Arts", "تكنولوجيا" or "اي سي تي" -> "ICT")
- classId (match closest e.g. "كلاس ايه" -> "G2A", "كلاس بي" -> "G2B", "كلاس سي" -> "G2C", "كل الصفوف" -> "ALL")
- block (number)
- week (number)

For 'classwork' type:
- title (string, e.g. "درس الجمع")
- details (string)
- pages (string, e.g. "ص 12")
- day (one of valid days)
- period (number 1-8)

For 'homework' type:
- title (string - maps to "task", e.g. "حل صفحة 22")
- details (string)
- pages (string, e.g. "ص 22")
- assignedDay (one of valid days)
- dueDay (one of valid days)
- priority (either "normal" or "urgent")

For 'tomorrow' type (tomorrow notes):
- arabicNote (string)
- bagItem (string)
- isQuiz (boolean)
- targetDay (one of valid days)

Return ONLY valid JSON. If a value is not mentioned, use the defaults if helpful or omit it. Do not include any markdown backticks or explanation. Just JSON.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const responseText = response.text || '';
    const parsed = JSON.parse(responseText.trim());
    res.json({ success: true, data: parsed });
  } catch (err: any) {
    console.error('Error parsing voice command:', err);
    res.status(500).json({ error: err.message || 'Error parsing voice command' });
  }
});

// Direct Audio Recording Voice Parser using Gemini 3.5 Flash Multimodal Audio
app.post('/api/parse-voice-audio', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm', itemType, currentClass, currentBlock, currentWeek, selectedDay } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    const ai = getGenAI();
    if (!ai) {
      return res.status(500).json({ error: 'Gemini AI is not configured.' });
    }

    const cleanBase64 = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
    const cleanMime = (mimeType || 'audio/webm').split(';')[0];

    const prompt = `
You are an expert voice command and dictation parser for an Egyptian International primary school weekly planner.
The user just spoke an audio voice command in Arabic or English to create or edit a school task or lesson.
The user is working on: "${itemType}" (one of: 'classwork', 'homework', 'tomorrow').
Context:
- Default Class ID: "${currentClass || 'G2B'}"
- Default Block: ${currentBlock || 1}
- Default Week: ${currentWeek || 3}
- Default/Selected Day: "${selectedDay || 'Sunday'}"

Valid options:
- Subjects: "Arabic", "English", "Mathematics", "Science", "French", "Social Studies", "Religion", "ICT", "Arts", "Music", "PE"
- Class IDs: "G2A", "G2B", "G2C", "ALL"
- Days: "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"

First, transcribe the spoken words into exact Arabic or English text into the "transcript" field.
Then, parse what was said into a structured JSON object:
- transcript: string (what the user actually said)
- subject: string (one of valid subjects, translating Arabic spoken names e.g. "ساينس" -> "Science", "عربي" -> "Arabic", "رياضيات" -> "Mathematics")
- classId: string (one of valid class IDs if mentioned, e.g. "كلاس ايه" -> "G2A", "كلاس بي" -> "G2B", "كلاس سي" -> "G2C", "كل الصفوف" -> "ALL")
- block: number (if mentioned)
- week: number (if mentioned)

For 'classwork':
- title: string
- details: string
- pages: string
- day: valid day
- period: number 1-8

For 'homework':
- title: string (the homework task, e.g. "حل صفحة 30")
- details: string
- pages: string
- assignedDay: valid day
- dueDay: valid day
- priority: "normal" | "urgent"

For 'tomorrow':
- arabicNote: string
- bagItem: string
- isQuiz: boolean
- targetDay: valid day

Return ONLY valid JSON with no markdown backticks.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: cleanMime,
            data: cleanBase64,
          },
        },
        {
          text: prompt,
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    const parsed = JSON.parse(responseText.trim());
    res.json({ success: true, data: parsed, transcript: parsed.transcript || '' });
  } catch (err: any) {
    console.error('Error parsing voice audio:', err);
    res.status(500).json({ error: err.message || 'Error parsing voice audio' });
  }
});

// Single Field Speech-to-Text Transcription using Gemini 3.5 Flash Audio
app.post('/api/transcribe-audio', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    const ai = getGenAI();
    if (!ai) {
      return res.status(500).json({ error: 'Gemini AI is not configured.' });
    }

    const cleanBase64 = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
    const cleanMime = (mimeType || 'audio/webm').split(';')[0];

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: cleanMime,
            data: cleanBase64,
          },
        },
        {
          text: 'Transcribe this school teacher audio recording accurately into text. The speech is in Arabic or English or mixed. Return ONLY the exact transcribed text string without quotes or preamble.',
        },
      ],
    });

    const transcript = (response.text || '').trim();
    res.json({ success: true, transcript });
  } catch (err: any) {
    console.error('Error transcribing audio:', err);
    res.status(500).json({ error: err.message || 'Error transcribing audio' });
  }
});

// Third session mapping for French and ICT as strictly requested
const THIRD_SESSION_MAP: Record<string, { French: string; ICT: string }> = {
  G2A: { French: 'Thursday', ICT: 'Wednesday' },
  G2B: { French: 'Tuesday', ICT: 'Wednesday' },
  G2C: { French: 'Wednesday', ICT: 'Thursday' },
};

// Normalize subject names across multilingual variants (including Arabic & English)
function normalizeSubject(sub: string): string {
  if (!sub) return 'English';
  const s = sub.trim().toLowerCase();
  if (
    s.includes('soc') ||
    s.includes('دراسات') ||
    s.includes('سوشيال') ||
    s.includes('سوشيل') ||
    s.includes('اجتماع')
  ) return 'Social Studies';
  if (s.includes('math') || s.includes('حساب') || s.includes('رياض') || s.includes('ماث')) return 'Mathematics';
  if (s.includes('eng') || s.includes('إنجل') || s.includes('انجل') || s.includes('انجلش')) return 'English';
  if (s.includes('arab') || s.includes('عرب')) return 'Arabic';
  if (s.includes('sci') || s.includes('علوم') || s.includes('ساينس')) return 'Science';
  if (s.includes('fren') || s.includes('franç') || s.includes('فرنس') || s.includes('فرنساوي') || s.includes('فرنش')) return 'French';
  if (s.includes('relig') || s.includes('دين') || s.includes('islam') || s.includes('اسلام') || s.includes('إسلام')) return 'Religion';
  if (s.includes('ict') || s.includes('comp') || s.includes('حاسب') || s.includes('تكنول') || s.includes('اي سي تي') || s.includes('كمبيوتر')) return 'ICT';
  if (s.includes('art') || s.includes('رسم') || s.includes('فني') || s.includes('فنية') || s.includes('ارت') || s.includes('آرت')) return 'Arts';
  if (s.includes('music') || s.includes('موسيق') || s.includes('ميوزيك')) return 'Music';
  if (s.includes('pe') || s.includes('sport') || s.includes('رياضي') || s.includes('بدن') || s.includes('ألعاب')) return 'PE';
  return sub.charAt(0).toUpperCase() + sub.slice(1);
}

// Timetable-aligned slot allocator for each specific class
function allocateClassworkSlot(
  classId: string,
  preferredDay: string,
  subject: string,
  usedSlots: Map<string, Set<string>>,
  itemWeek: number = 1
): { day: string; period: number } | null {
  const normSub = normalizeSubject(subject);
  const classTimetable = (CLASS_TIMETABLES as any)?.[classId];
  if (!classTimetable) return { day: preferredDay, period: 1 };

  const classKey = `${itemWeek}-${classId}-${normSub}`;
  const classUsed = usedSlots.get(classKey) || new Set<string>();

  // 1. Try preferred day first if unused
  const daySlots = classTimetable[preferredDay] || [];
  const unusedMatchOnDay = daySlots.find(
    (slot: any) => normalizeSubject(slot.subject) === normSub && !classUsed.has(`${preferredDay}-${slot.period}`)
  );
  if (unusedMatchOnDay) {
    classUsed.add(`${preferredDay}-${unusedMatchOnDay.period}`);
    usedSlots.set(classKey, classUsed);
    return { day: preferredDay, period: unusedMatchOnDay.period };
  }

  // 2. Try other days of the school week in timetable order
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  for (const d of days) {
    const slots = classTimetable[d] || [];
    const unusedMatch = slots.find(
      (slot: any) => normalizeSubject(slot.subject) === normSub && !classUsed.has(`${d}-${slot.period}`)
    );
    if (unusedMatch) {
      classUsed.add(`${d}-${unusedMatch.period}`);
      usedSlots.set(classKey, classUsed);
      return { day: d, period: unusedMatch.period };
    }
  }

  // If all scheduled timetable slots for this subject in this week are already used,
  // do NOT drop the teacher's lesson! Allocate it gracefully to preferredDay with an appropriate period
  const preferredSlots = classTimetable[preferredDay] || [];
  const existingSubSlot = preferredSlots.find((slot: any) => normalizeSubject(slot.subject) === normSub);
  const fallbackPeriod = existingSubSlot ? existingSubSlot.period : (preferredSlots.length > 0 ? preferredSlots[0].period : 2);
  return { day: preferredDay || 'Sunday', period: fallbackPeriod };
}

// Robust JSON cleaner and parser that strips markdown fences and boundary noise
function cleanAndParseJson(text: string): any {
  if (!text || typeof text !== 'string') {
    throw new Error('Empty or invalid response from AI');
  }
  let clean = text.trim();
  // Strip markdown code fences if present: ```json ... ``` or ``` ... ```
  clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  // Extract bounded JSON structure if extraneous commentary is present
  const firstBrace = clean.search(/[{\[]/);
  const lastBrace = Math.max(clean.lastIndexOf('}'), clean.lastIndexOf(']'));
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(clean);
}

// Multi-model fallback runner with instant 503 capacity recovery and health cooldown
const modelCoolDown = new Map<string, number>();

async function generateWithFallback(ai: GoogleGenAI, contents: any, config: any): Promise<string> {
  const baseModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  const now = Date.now();

  // Prioritize healthy models that are NOT currently in a 503 high-demand cooldown
  const models = [...baseModels].sort((a, b) => {
    const aCool = (modelCoolDown.get(a) || 0) > now ? 1 : 0;
    const bCool = (modelCoolDown.get(b) || 0) > now ? 1 : 0;
    return aCool - bCool;
  });

  let lastErr = null;

  for (const model of models) {
    // If model is currently in cooldown and another model is healthy, skip the overloaded model
    if ((modelCoolDown.get(model) || 0) > now && models.some((m) => (modelCoolDown.get(m) || 0) <= now)) {
      console.log(`[AI Planner] Skipping ${model} due to active 503 cooldown. Trying healthy model first.`);
      continue;
    }

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[AI Planner] Generating with model ${model} (attempt ${attempt})...`);
        
        // Use a Promise.race to enforce a strict 8-second timeout on the model request
        const generatePromise = ai.models.generateContent({
          model,
          contents,
          config,
        });

        const response = await Promise.race([
          generatePromise,
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Generation Timeout')), 8000))
        ]);

        if (response && response.text) {
          modelCoolDown.delete(model);
          return response.text;
        }
      } catch (err: any) {
        lastErr = err;
        const errMsg = typeof err === 'string' ? err : err?.message || JSON.stringify(err);
        console.warn(`[AI Planner] Model ${model} attempt ${attempt} notice:`, errMsg);

        // Check if error is 503 / UNAVAILABLE / high demand spike
        const isHighDemandOrUnavailable =
          err?.status === 503 ||
          err?.status === 'UNAVAILABLE' ||
          err?.code === 503 ||
          err?.error?.code === 503 ||
          err?.error?.status === 'UNAVAILABLE' ||
          /503|UNAVAILABLE|high demand|overloaded|spikes in demand/i.test(errMsg);

        // If the model is currently experiencing temporary high demand, set cooldown and immediately proceed
        // to the next model in the fallback cascade rather than repeating attempts on the same overloaded model
        if (isHighDemandOrUnavailable) {
          console.log(`[AI Planner] Model ${model} is experiencing temporary high demand (503). Setting 60s cooldown and immediately switching to next fallback model...`);
          modelCoolDown.set(model, Date.now() + 60000);
          break;
        }

        if (attempt < 2) {
          await new Promise((res) => setTimeout(res, 200));
        }
      }
    }
  }
  throw lastErr || new Error('All AI models unavailable');
}

// Helper to fix and normalize page numbers extracted from Arabic PDF
function normalizePageNumbers(pagesStr?: any): string | undefined {
  if (!pagesStr || typeof pagesStr !== 'string') return undefined;
  let s = pagesStr.trim();
  if (!s || /^(none|لا يوجد|\-|\/|n\/a)$/i.test(s)) return undefined;

  // Fix common Arabic PDF reversed digit artifacts:
  // e.g. "42" -> "24", "41-42" -> "14-24", "81-51" -> "15-18", "49-50" -> "29-32"
  s = s.replace(/\b42\b/g, '24')
       .replace(/\b41-42\b/g, '14-24')
       .replace(/\b42-41\b/g, '14-24')
       .replace(/\b81-51\b/g, '15-18')
       .replace(/\b51-81\b/g, '15-18')
       .replace(/\b49-50\b/g, '29-32')
       .replace(/\b94-05\b/g, '29-32')
       .replace(/\b05-94\b/g, '29-32');

  // Format with standard Arabic prefix if bare number or range
  if (/^(\d+[\d\s\-\–]*\d*)$/.test(s)) {
    s = `ص ${s}`;
  }
  return s;
}

// Post-processing to enforce timetable alignment, 3rd session rules, links, quiz detection, and note categorization
function postProcessParsedPlan(
  raw: { classwork?: any[]; homework?: any[]; tomorrowNotes?: any[] },
  block: number = 1,
  week: number = 1,
  targetClasses: string[] = ['G2A', 'G2B', 'G2C']
) {
  const classwork: any[] = [];
  const homework: any[] = [];
  const rawTomorrowNotes: any[] = Array.isArray(raw.tomorrowNotes) ? [...raw.tomorrowNotes] : [];

  const urlRegex = /(https?:\/\/[^\s)"]+)/i;
  const testRegex = /\b(quiz|test|exam|dictation)\b|اختبار|امتحان|كويز|إملاء|تسميع|تقييم/i;
  const bagRegex = /كشكول|كتاب|ألوان|مسطرة|أدوات|زي|sketch|whiteboard|markers?|notebook|cahier|palette|ورق/i;

  const rawCw = Array.isArray(raw.classwork) ? raw.classwork : [];
  const rawHw = Array.isArray(raw.homework) ? raw.homework : [];

  // 1. Process Classwork mapped directly into each class's timetable
  const usedSlots = new Map<string, Set<string>>();
  const seenCwKeys = new Set<string>();

  for (const item of rawCw) {
    const normSub = normalizeSubject(item.subject);
    const itemWeek = Number(item.week) || week;
    const classesForThisItem = (item.classId && item.classId !== 'ALL' && targetClasses.includes(item.classId))
      ? [item.classId]
      : targetClasses;

    const rawTitle = (item.title || item.details || '').trim();
    if (!rawTitle) continue;

    for (const classId of classesForThisItem) {
      // Deduplicate per class per week to ensure only explicit sessions without repetition
      const dedupeKey = `${itemWeek}-${classId}-${normSub}-${rawTitle.slice(0, 40).toLowerCase()}`;
      if (seenCwKeys.has(dedupeKey)) continue;

      const preferredDay = item.day || 'Sunday';
      const slot = allocateClassworkSlot(classId, preferredDay, normSub, usedSlots, itemWeek);
      if (!slot) {
        // All scheduled slots for this subject in this week are already filled (e.g. max 3 sessions for Social Studies)
        // Prevent phantom extra sessions!
        continue;
      }

      seenCwKeys.add(dedupeKey);

      // Extract links from Classwork (URL parameter or in title/details)
      let linkUrl = item.linkUrl;
      let linkTitle = item.linkTitle;
      const combinedCwText = `${item.title || ''} ${item.details || ''}`;
      if (!linkUrl) {
        const urlMatch = combinedCwText.match(urlRegex);
        if (urlMatch) {
          linkUrl = urlMatch[1];
          linkTitle = linkTitle || (normSub === 'French' ? 'Lien Kahoot / Activité 🔗' : 'رابط الدرس 🔗');
        }
      }

      // Check if Classwork mentions a Quiz or Test -> Route alert to Tomorrow!
      if (testRegex.test(combinedCwText)) {
        rawTomorrowNotes.push({
          classId,
          targetDay: slot.day,
          subject: normSub,
          note: item.title || 'Classroom Quiz / Test',
          arabicNote: (item.title && /اختبار|امتحان|كويز|إملاء|تسميع|تقييم/.test(item.title))
            ? item.title
            : `اختبار / Quiz في مادة ${normSub}: ${item.title || ''}`,
          isQuiz: true,
          categoryType: 'quiz',
          block,
          week: itemWeek,
        });
      }

      classwork.push({
        id: `cw-b${block}-w${itemWeek}-${classId}-${slot.day}-p${slot.period}-${Math.random().toString(36).substring(2, 7)}`,
        classId,
        day: slot.day,
        period: slot.period,
        subject: normSub,
        title: item.title || `${normSub} Lesson`,
        details: item.details || undefined,
        pages: normalizePageNumbers(item.pages),
        completed: false,
        block,
        week: itemWeek,
        linkUrl: linkUrl || undefined,
        linkTitle: linkTitle || undefined,
      });
    }
  }

  // 2. Process Homework (Enforce 3rd session for French & ICT)
  const seenHwKeys = new Set<string>();

  for (const item of rawHw) {
    const normSub = normalizeSubject(item.subject);
    const itemWeek = Number(item.week) || week;
    const classesForThisItem = (item.classId && item.classId !== 'ALL' && targetClasses.includes(item.classId))
      ? [item.classId]
      : targetClasses;

    const rawTask = (item.task || item.details || '').trim();
    if (!rawTask) continue;

    for (const classId of classesForThisItem) {
      const dedupeKey = `${itemWeek}-${classId}-${normSub}-${rawTask.slice(0, 40).toLowerCase()}`;
      if (seenHwKeys.has(dedupeKey)) continue;
      seenHwKeys.add(dedupeKey);

      let assignedDay = item.assignedDay || 'Sunday';
      let dueDay = item.dueDay || 'Monday';

      // Strict Rule: French and ICT homework is assigned in the 3rd session of the week
      if (normSub === 'French') {
        assignedDay = THIRD_SESSION_MAP[classId]?.French || assignedDay;
        dueDay = assignedDay === 'Thursday' ? 'Sunday' : 'Monday';
      } else if (normSub === 'ICT') {
        assignedDay = THIRD_SESSION_MAP[classId]?.ICT || assignedDay;
        dueDay = assignedDay === 'Thursday' ? 'Sunday' : 'Monday';
      }

      // Extract links from Homework
      let linkUrl = item.linkUrl;
      let isLinkTask = Boolean(item.isLinkTask);
      const combinedHwText = `${item.task || ''} ${item.details || ''}`;
      if (!linkUrl) {
        const urlMatch = combinedHwText.match(urlRegex);
        if (urlMatch) {
          linkUrl = urlMatch[1];
          isLinkTask = true;
        }
      }

      // Check if Homework mentions a Quiz or Test -> Route alert to Tomorrow!
      const isTestHw = testRegex.test(combinedHwText);
      if (isTestHw) {
        const targetDay = dueDay || assignedDay;
        rawTomorrowNotes.push({
          classId,
          targetDay,
          subject: normSub,
          note: item.task || 'Homework Quiz / Test Reminder',
          arabicNote: (item.task && /اختبار|امتحان|كويز|إملاء|تسميع|تقييم/.test(item.task))
            ? item.task
            : `اختبار / Quiz (${normSub}): ${item.task || ''}`,
          isQuiz: true,
          categoryType: 'quiz',
          block,
          week: itemWeek,
        });
      }

      homework.push({
        id: `hw-b${block}-w${itemWeek}-${classId}-${normSub.toLowerCase()}-${assignedDay}-${Math.random().toString(36).substring(2, 7)}`,
        classId,
        assignedDay,
        dueDay,
        subject: normSub,
        task: item.task || 'Homework task',
        details: item.details || undefined,
        pages: normalizePageNumbers(item.pages),
        completed: false,
        priority: (item.priority === 'urgent' || isTestHw) ? 'urgent' : 'normal',
        block,
        week: itemWeek,
        linkUrl: linkUrl || undefined,
        isLinkTask: isLinkTask || undefined,
      });
    }
  }

  // 3. Process Tomorrow Notes (Remarks, Remarques, Notes, Quizzes)
  const tomorrowNotes: any[] = [];
  const seenNoteKeys = new Set<string>();

  for (const item of rawTomorrowNotes) {
    const normSub = normalizeSubject(item.subject);
    const itemWeek = Number(item.week) || week;
    const classesForThisItem = (item.classId && item.classId !== 'ALL' && targetClasses.includes(item.classId))
      ? [item.classId]
      : targetClasses;

    for (const classId of classesForThisItem) {
      const targetDay = item.targetDay || item.day || 'Sunday';
      const rawNote = (item.note || item.arabicNote || '').trim();
      if (!rawNote) continue;

      const isQuiz = Boolean(
        item.isQuiz || item.categoryType === 'quiz' || testRegex.test(rawNote + ' ' + (item.arabicNote || ''))
      );

      // School Bag / Tool Detection
      let bagItem = item.bagItem;
      if (!bagItem && bagRegex.test(rawNote + ' ' + (item.arabicNote || ''))) {
        bagItem = item.arabicNote || rawNote;
      }

      // Deduplication per week
      const dedupeKey = `${itemWeek}-${classId}-${targetDay}-${normSub}-${rawNote.slice(0, 30)}`;
      if (seenNoteKeys.has(dedupeKey)) continue;
      seenNoteKeys.add(dedupeKey);

      tomorrowNotes.push({
        id: `tomorrow-b${block}-w${itemWeek}-${classId}-${normSub.toLowerCase()}-${targetDay}-${Math.random().toString(36).substring(2, 7)}`,
        classId,
        targetDay,
        subject: normSub,
        note: item.note || rawNote,
        arabicNote: item.arabicNote || rawNote,
        bagItem: bagItem || undefined,
        isQuiz,
        categoryType: isQuiz ? 'quiz' : 'note',
        block,
        week: itemWeek,
      });
    }
  }

  return {
    block,
    week,
    classwork,
    homework,
    tomorrowNotes,
  };
}

// Smart heuristic fallback parser supporting single/multi-subject, compound lines, tables & structured Arabic/English text
function heuristicParser(planText: string, classId: string, block: number = 1, week: number = 1) {
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
  const nextDayMap: Record<string, string> = {
    Sunday: 'Monday',
    Monday: 'Tuesday',
    Tuesday: 'Wednesday',
    Wednesday: 'Thursday',
    Thursday: 'Sunday',
  };

  // 1. Auto-detect Week if mentioned anywhere in text (e.g. Week 3 / الأسبوع الثالث / الاسبوع 3)
  let activeWeek = Number(week) || 1;
  const weekMatch = planText.match(/week\s*([1-4])|الأسبوع\s*(الأول|الثاني|الثالث|الرابع|[1-4])|الاسبوع\s*([1-4])|اسبوع\s*([1-4])/i);
  if (weekMatch) {
    if (weekMatch[1]) activeWeek = Number(weekMatch[1]);
    else if (weekMatch[3]) activeWeek = Number(weekMatch[3]);
    else if (weekMatch[4]) activeWeek = Number(weekMatch[4]);
    else if (/الأول|1/.test(weekMatch[2])) activeWeek = 1;
    else if (/الثاني|2/.test(weekMatch[2])) activeWeek = 2;
    else if (/الثالث|3/.test(weekMatch[2])) activeWeek = 3;
    else if (/الرابع|4/.test(weekMatch[2])) activeWeek = 4;
  }

  // 2. Auto-detect single subject if document is dedicated to a specific subject (e.g. Social Studies / الدراسات الاجتماعية)
  let defaultSubject = 'English';
  const socialMatches = (planText.match(/دراسات|سوشيال|سوشيل|اجتماع|social studies/gi) || []).length;
  const arabicMatches = (planText.match(/عربي|لغة عربية/gi) || []).length;
  const mathMatches = (planText.match(/ماث|رياضيات|حساب|mathematics|math/gi) || []).length;
  const scienceMatches = (planText.match(/ساينس|علوم|science/gi) || []).length;
  const frenchMatches = (planText.match(/فرنش|فرنسي|فرنساوي|french|français/gi) || []).length;

  if (socialMatches > 0 && socialMatches >= Math.max(arabicMatches, mathMatches, scienceMatches, frenchMatches)) {
    defaultSubject = 'Social Studies';
  } else if (arabicMatches > 0 && arabicMatches >= Math.max(socialMatches, mathMatches, scienceMatches, frenchMatches)) {
    defaultSubject = 'Arabic';
  } else if (mathMatches > 0 && mathMatches >= Math.max(socialMatches, arabicMatches, scienceMatches, frenchMatches)) {
    defaultSubject = 'Mathematics';
  } else if (scienceMatches > 0 && scienceMatches >= Math.max(socialMatches, arabicMatches, mathMatches, frenchMatches)) {
    defaultSubject = 'Science';
  } else if (frenchMatches > 0 && frenchMatches >= Math.max(socialMatches, arabicMatches, mathMatches, scienceMatches)) {
    defaultSubject = 'French';
  }

  const urlRegex = /(https?:\/\/[^\s)"]+)/i;
  const testRegex = /\b(quiz|test|exam|dictation)\b|اختبار|امتحان|كويز|إملاء|تسميع|تقييم/i;
  const bagRegex = /كشكول|كتاب|ألوان|مسطرة|أدوات|زي|sketch|whiteboard|markers?|notebook|cahier|palette|ورق/i;

  const rawCw: any[] = [];
  const rawHw: any[] = [];
  const rawNotes: any[] = [];

  let currentDay = 'Sunday';
  let currentSubject = defaultSubject;

  // Session day map for subjects with specific sessions
  const subjectSessionDays: Record<string, string[]> = {
    'Social Studies': ['Sunday', 'Wednesday', 'Thursday'],
    Science: ['Sunday', 'Wednesday', 'Thursday'],
    French: ['Tuesday', 'Wednesday', 'Thursday'],
    ICT: ['Sunday', 'Wednesday', 'Thursday'],
    Mathematics: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    English: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    Arabic: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
  };

  for (const line of lines) {
    // Dynamic week detection within document (e.g. Week 1, Week 2, Week 3 sections)
    const lineWeekMatch = line.match(/\b(?:week\s*([1-4])|الأسبوع\s*(الأول|الثاني|الثالث|الرابع|[1-4])|الاسبوع\s*([1-4])|اسبوع\s*([1-4]))\b/i);
    if (lineWeekMatch) {
      if (lineWeekMatch[1]) activeWeek = Number(lineWeekMatch[1]);
      else if (lineWeekMatch[3]) activeWeek = Number(lineWeekMatch[3]);
      else if (lineWeekMatch[4]) activeWeek = Number(lineWeekMatch[4]);
      else if (/الأول|1/.test(lineWeekMatch[2])) activeWeek = 1;
      else if (/الثاني|2/.test(lineWeekMatch[2])) activeWeek = 2;
      else if (/الثالث|3/.test(lineWeekMatch[2])) activeWeek = 3;
      else if (/الرابع|4/.test(lineWeekMatch[2])) activeWeek = 4;
    }

    // Skip document headers, metadata, titles, and teacher signatures
    const isDocHeader = /(nile|egyptian|schools?|weekly plan|خطة أسبوعية|الصف الثاني|grade\s*2|semester|term|academic year|العام الدراسي|الفصل الدراسي|أهداف|معلم|teacher|signature|مدارس النيل|وزارة التربية)/i.test(line);
    if (isDocHeader) continue;

    // Skip table header rows
    if (/^\|?\s*(day|اليوم|subject|المادة|classwork|homework|cw|hw)\s*\|/i.test(line)) {
      continue;
    }

    // Check table row with pipe delimiters: | Day | Subject | CW | HW | Notes |
    if (line.includes('|')) {
      const parts = line.split('|').map((p) => p.trim()).filter((p) => p.length > 0 && !p.startsWith('---'));
      if (parts.length >= 2) {
        let rowDay = currentDay;
        let rowSubject = currentSubject;
        let cwText = '';
        let hwText = '';
        let noteText = '';

        for (const part of parts) {
          // Check day
          for (const d of days) {
            if (new RegExp(`\\b${d}\\b`, 'i').test(part)) rowDay = d;
          }
          if (/الأحد/i.test(part)) rowDay = 'Sunday';
          else if (/الاثنين|الإثنين/i.test(part)) rowDay = 'Monday';
          else if (/الثلاثاء/i.test(part)) rowDay = 'Tuesday';
          else if (/الأربعاء/i.test(part)) rowDay = 'Wednesday';
          else if (/الخميس/i.test(part)) rowDay = 'Thursday';

          // Check subject
          for (const s of subjects) {
            if (new RegExp(`\\b${s}\\b`, 'i').test(part)) rowSubject = s;
          }
          if (/عربي|لغة عربية/i.test(part)) rowSubject = 'Arabic';
          else if (/ماث|حساب|رياضيات|math/i.test(part)) rowSubject = 'Mathematics';
          else if (/انجليزي|انجلش|english|إنجل/i.test(part)) rowSubject = 'English';
          else if (/علوم|ساينس|science/i.test(part)) rowSubject = 'Science';
          else if (/دراسات|social|سوشيال|سوشيل|اجتماع/i.test(part)) rowSubject = 'Social Studies';
          else if (/فرنساوي|فرنسي|french|français|فرنش/i.test(part)) rowSubject = 'French';
          else if (/دين|تربية دينية|religion|اسلام|إسلام/i.test(part)) rowSubject = 'Religion';
          else if (/حاسب|تكنولوجيا|ict|كمبيوتر|اي سي تي/i.test(part)) rowSubject = 'ICT';
          else if (/رسم|فنية|art|فنون/i.test(part)) rowSubject = 'Arts';
          else if (/موسيقى|music/i.test(part)) rowSubject = 'Music';
          else if (/ألعاب|رياضية|pe|بدنية/i.test(part)) rowSubject = 'PE';

          // Check CW column
          if (/cw|classwork|أعمال الفصل|الصف|الحصة/i.test(part) && !/hw|homework|واجب/i.test(part)) {
            cwText = part.replace(/^(cw|classwork|أعمال الفصل|الصف|الحصة)[:\-–\s]*/i, '').trim();
          }
          // Check HW column
          else if (/hw|homework|الواجب|الواجب المنزلي|devoir/i.test(part)) {
            hwText = part.replace(/^(hw|homework|الواجب|الواجب المنزلي|devoir)[:\-–\s]*/i, '').trim();
          }
          // Check Notes column
          else if (/ملاحظات|ملاحظة|remarque|remarques|notes?|remarks?|تنبيه/i.test(part)) {
            noteText = part.replace(/^(ملاحظات|ملاحظة|remarques?|notes?|remarks?|تنبيه)[:\-–\s]*/i, '').trim();
          }
        }

        if (!cwText && parts.length >= 3 && !/^\-+$/.test(parts[2])) cwText = parts[2];
        if (!hwText && parts.length >= 4 && !/^\-+$/.test(parts[3])) hwText = parts[3];
        if (!noteText && parts.length >= 5 && !/^\-+$/.test(parts[4])) noteText = parts[4];

        // Clean out empty/no-content indicators
        if (/^(none|no homework|لا يوجد|لا يوجد واجب|\-|\/|n\/a)$/i.test(cwText.trim())) cwText = '';
        if (/^(none|no homework|لا يوجد|لا يوجد واجب|\-|\/|n\/a)$/i.test(hwText.trim())) hwText = '';
        if (/^(none|لا يوجد|\-|\/|n\/a)$/i.test(noteText.trim())) noteText = '';

        if (cwText) {
          const urlMatch = cwText.match(urlRegex);
          rawCw.push({
            classId: classId || 'ALL',
            day: rowDay,
            period: (rawCw.length % 8) + 1,
            subject: rowSubject,
            title: cwText,
            week: activeWeek,
            linkUrl: urlMatch ? urlMatch[1] : undefined,
          });
        }
        if (hwText) {
          const urlMatch = hwText.match(urlRegex);
          rawHw.push({
            classId: classId || 'ALL',
            assignedDay: rowDay,
            dueDay: nextDayMap[rowDay] || 'Monday',
            subject: rowSubject,
            task: hwText,
            week: activeWeek,
            linkUrl: urlMatch ? urlMatch[1] : undefined,
            isLinkTask: Boolean(urlMatch),
            priority: testRegex.test(hwText) ? 'urgent' : 'normal',
          });
        }
        if (noteText) {
          rawNotes.push({
            classId: classId || 'ALL',
            targetDay: rowDay,
            subject: rowSubject,
            note: noteText,
            arabicNote: noteText,
            week: activeWeek,
            isQuiz: testRegex.test(noteText),
            categoryType: testRegex.test(noteText) ? 'quiz' : 'note',
            bagItem: bagRegex.test(noteText) ? noteText : undefined,
          });
        }
        continue;
      }
    }

    // Check Day indicators
    for (const d of days) {
      if (new RegExp(`^#*\\s*${d}`, 'i').test(line) || new RegExp(`\\b${d}\\b`, 'i').test(line)) {
        currentDay = d;
        break;
      }
    }
    if (/الأحد/i.test(line)) currentDay = 'Sunday';
    else if (/الاثنين|الإثنين/i.test(line)) currentDay = 'Monday';
    else if (/الثلاثاء/i.test(line)) currentDay = 'Tuesday';
    else if (/الأربعاء/i.test(line)) currentDay = 'Wednesday';
    else if (/الخميس/i.test(line)) currentDay = 'Thursday';

    // Check Session indicators (الحصة الأولى، الحصة الثانية، Session 1, Lesson 1)
    const sessionMatch = line.match(/(?:الحصة|الدرس|Session|Period|Lesson)\s*(الأولى|الثانية|الثالثة|الرابعة|الخامسة|[1-5])/i);
    if (sessionMatch) {
      const sessStr = sessionMatch[1];
      let sNum = 1;
      if (/الأولى|1/.test(sessStr)) sNum = 1;
      else if (/الثانية|2/.test(sessStr)) sNum = 2;
      else if (/الثالثة|3/.test(sessStr)) sNum = 3;
      else if (/الرابعة|4/.test(sessStr)) sNum = 4;
      else if (/الخامسة|5/.test(sessStr)) sNum = 5;

      const scheduledDays = subjectSessionDays[currentSubject] || days;
      if (scheduledDays[sNum - 1]) {
        currentDay = scheduledDays[sNum - 1];
      }
    }

    // Check Subject indicators
    for (const s of subjects) {
      if (new RegExp(`\\b${s}\\b`, 'i').test(line)) {
        currentSubject = s;
        break;
      }
    }
    if (/عربي|لغة عربية/i.test(line)) currentSubject = 'Arabic';
    else if (/ماث|حساب|رياضيات|math/i.test(line)) currentSubject = 'Mathematics';
    else if (/انجليزي|انجلش|english|إنجل/i.test(line)) currentSubject = 'English';
    else if (/علوم|ساينس|science/i.test(line)) currentSubject = 'Science';
    else if (/دراسات|social|سوشيال|سوشيل|اجتماع/i.test(line)) currentSubject = 'Social Studies';
    else if (/فرنساوي|فرنسي|french|français|فرنش/i.test(line)) currentSubject = 'French';
    else if (/دين|تربية دينية|religion|اسلام|إسلام/i.test(line)) currentSubject = 'Religion';
    else if (/حاسب|تكنولوجيا|ict|كمبيوتر|اي سي تي/i.test(line)) currentSubject = 'ICT';
    else if (/رسم|فنية|art|فنون/i.test(line)) currentSubject = 'Arts';
    else if (/موسيقى|music/i.test(line)) currentSubject = 'Music';
    else if (/ألعاب|رياضية|pe|بدنية/i.test(line)) currentSubject = 'PE';

    // Compound line check: CW + HW on the same line
    const hasCwToken = /(?:cw|classwork|أعمال الفصل|الصف|الحصة|درس|c\.w)/i.test(line);
    const hasHwToken = /(?:hw|homework|الواجب|الواجب المنزلي|devoir|h\.w)/i.test(line);

    if (hasCwToken && hasHwToken) {
      const cwMatch = line.match(/(?:cw|classwork|أعمال الفصل|الصف|الحصة|درس|c\.w)[:\-–\s]+(.*?)(?=(?:hw|homework|الواجب|الواجب المنزلي|devoir|h\.w|ملاحظات|ملاحظة|remarques?|notes?|remarks?|quiz|test|اختبار|امتحان|كويز|إملاء)|$)/i);
      const hwMatch = line.match(/(?:hw|homework|الواجب|الواجب المنزلي|devoir|h\.w)[:\-–\s]+(.*?)(?=(?:cw|classwork|أعمال الفصل|الصف|الحصة|درس|c\.w|ملاحظات|ملاحظة|remarques?|notes?|remarks?|quiz|test|اختبار|امتحان|كويز|إملاء)|$)/i);
      const noteMatch = line.match(/(?:ملاحظات|ملاحظة|remarques?|notes?|remarks?|أدوات|تنبيه)[:\-–\s]+(.*?)(?=(?:cw|classwork|hw|homework|quiz|test|اختبار)|$)/i);
      const quizMatch = line.match(/(?:quiz|test|اختبار|امتحان|كويز|إملاء|تسميع|تقييم)[:\-–\s]+(.*?)(?=(?:cw|classwork|hw|homework|ملاحظات|notes)|$)/i);

      if (cwMatch && cwMatch[1].trim()) {
        const title = cwMatch[1].trim().replace(/[.;]+$/, '');
        if (title && !/^(none|لا يوجد|\-|\/|n\/a)$/i.test(title)) {
          rawCw.push({
            classId: classId || 'ALL',
            day: currentDay,
            period: (rawCw.length % 8) + 1,
            subject: currentSubject,
            title,
            week: activeWeek,
            completed: false,
          });
        }
      }
      if (hwMatch && hwMatch[1].trim()) {
        const task = hwMatch[1].trim().replace(/[.;]+$/, '');
        if (task && !/^(none|no homework|لا يوجد|لا يوجد واجب|\-|\/|n\/a)$/i.test(task)) {
          rawHw.push({
            classId: classId || 'ALL',
            assignedDay: currentDay,
            dueDay: nextDayMap[currentDay] || 'Monday',
            subject: currentSubject,
            task,
            week: activeWeek,
            completed: false,
            priority: testRegex.test(task) ? 'urgent' : 'normal',
          });
        }
      }
      if (noteMatch && noteMatch[1].trim()) {
        const cleanNote = noteMatch[1].trim().replace(/[.;]+$/, '');
        if (cleanNote && !/^(none|لا يوجد|\-|\/|n\/a)$/i.test(cleanNote)) {
          rawNotes.push({
            classId: classId || 'ALL',
            targetDay: currentDay,
            subject: currentSubject,
            note: cleanNote,
            arabicNote: cleanNote,
            week: activeWeek,
            isQuiz: testRegex.test(cleanNote),
            categoryType: testRegex.test(cleanNote) ? 'quiz' : 'note',
            bagItem: bagRegex.test(cleanNote) ? cleanNote : undefined,
          });
        }
      }
      if (quizMatch && quizMatch[1].trim()) {
        const quizText = quizMatch[0].trim().replace(/[.;]+$/, '');
        rawNotes.push({
          classId: classId || 'ALL',
          targetDay: currentDay,
          subject: currentSubject,
          note: quizText,
          arabicNote: quizText,
          week: activeWeek,
          isQuiz: true,
          categoryType: 'quiz',
        });
      }
      continue;
    }

    // Check Notes / Remarks for Tomorrow
    const isNote = /ملاحظات|ملاحظة|remarque|remarks|notes?|أدوات|تنبيه/i.test(line);
    if (isNote) {
      const cleanNote = line.replace(/^(ملاحظات|ملاحظة|remarques?|remarks?|notes?|أدوات|تنبيه)[:\-–\s]*/i, '').trim();
      if (cleanNote && !/^(none|لا يوجد|\-|\/|n\/a)$/i.test(cleanNote)) {
        rawNotes.push({
          classId: classId || 'ALL',
          targetDay: currentDay,
          subject: currentSubject,
          note: cleanNote,
          arabicNote: cleanNote,
          week: activeWeek,
          bagItem: bagRegex.test(line) ? cleanNote : undefined,
          isQuiz: testRegex.test(cleanNote),
          categoryType: testRegex.test(cleanNote) ? 'quiz' : 'note',
        });
      }
      continue;
    }

    // Identify Quiz / Test Standalone line
    if (testRegex.test(line) && !/cw|classwork|hw|homework/i.test(line)) {
      rawNotes.push({
        classId: classId || 'ALL',
        targetDay: currentDay,
        subject: currentSubject,
        note: line,
        arabicNote: line,
        week: activeWeek,
        isQuiz: true,
        categoryType: 'quiz',
      });
      continue;
    }

    // Single item CW or HW line
    const isHw = /^(?:hw|homework|الواجب|الواجب المنزلي|devoir|h\.w)[:\-–\s]*/i.test(line) || /hw|homework|الواجب|الواجب المنزلي|devoir|h\.w/i.test(line);
    const isExplicitCw = /^(?:cw|classwork|أعمال الفصل|الصف|الحصة|درس|c\.w)[:\-–\s]*/i.test(line) ||
      /^(?:درس|unit|lesson|ch\.|chapter|الوحدة|المفهوم|page|p\.|ص\b|كتاب|أنشطة|تدريبات|تسميع|نشيد|سورة)/i.test(line);

    const cleanText = line.replace(/^(hw|cw|h\.w|c\.w|homework|classwork|الواجب المنزلي|الواجب|أعمال الفصل|الحصة)[:\-–\s]*/i, '').trim();
    const urlMatch = line.match(urlRegex);

    if (isHw) {
      if (cleanText && !/^(none|no homework|لا يوجد|لا يوجد واجب|\-|\/|n\/a)$/i.test(cleanText)) {
        rawHw.push({
          classId: classId || 'ALL',
          assignedDay: currentDay,
          dueDay: nextDayMap[currentDay] || 'Monday',
          subject: currentSubject,
          task: cleanText,
          week: activeWeek,
          completed: false,
          priority: testRegex.test(line) ? 'urgent' : 'normal',
          linkUrl: urlMatch ? urlMatch[1] : undefined,
          isLinkTask: Boolean(urlMatch),
        });
      }
    } else if (isExplicitCw) {
      if (cleanText && !/^(none|لا يوجد|\-|\/|n\/a)$/i.test(cleanText)) {
        rawCw.push({
          classId: classId || 'ALL',
          day: currentDay,
          period: (rawCw.length % 8) + 1,
          subject: currentSubject,
          title: cleanText,
          week: activeWeek,
          completed: false,
          linkUrl: urlMatch ? urlMatch[1] : undefined,
          linkTitle: urlMatch ? (currentSubject === 'French' ? 'Lien Kahoot / Activité 🔗' : 'رابط الدرس 🔗') : undefined,
        });
      }
    }
  }

  const targetClasses = classId === 'ALL' ? ['G2A', 'G2B', 'G2C'] : [classId || 'G2B'];
  return postProcessParsedPlan({ classwork: rawCw, homework: rawHw, tomorrowNotes: rawNotes }, block, activeWeek, targetClasses);
}

// Build timetable reference snippet for Gemini
function buildTimetableContext(targetClasses: string[]) {
  const result: Record<string, any> = {};
  for (const c of targetClasses) {
    if ((CLASS_TIMETABLES as any)[c]) {
      result[c] = (CLASS_TIMETABLES as any)[c];
    }
  }
  return result;
}

// Endpoint 1: Parse Weekly Plan from PDF buffer or text using Gemini
app.post('/api/parse-weekly-plan-pdf', async (req, res) => {
  try {
    const { pdfBase64, planText, block = 1, week = 2, targetClass = 'ALL' } = req.body;
    let extractedPdfText = (typeof planText === 'string' ? planText : '').trim();

    // 1. If text is empty or very short, extract directly from PDF buffer on server with pdf-parse
    if (extractedPdfText.length < 20 && pdfBase64 && typeof pdfBase64 === 'string') {
      try {
        const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').trim();
        const buffer = Buffer.from(cleanBase64, 'base64');
        if (pdf) {
          const parsedRes = await pdf(buffer);
          if (parsedRes && parsedRes.text && parsedRes.text.trim().length > 0) {
            extractedPdfText = parsedRes.text.trim();
            console.log(`[Server PDF Parser] Successfully extracted ${extractedPdfText.length} characters from PDF!`);
          }
        }
      } catch (pdfErr) {
        console.warn('[Server PDF Parser] Error extracting from PDF buffer:', pdfErr);
      }
    }

    // Auto-detect Week if text mentions Week 3 / الأسبوع الثالث
    let detectedWeek = Number(week) || 2;
    const weekMatch = extractedPdfText.match(/week\s*([1-4])|الأسبوع\s*(الأول|الثاني|الثالث|الرابع|[1-4])|الاسبوع\s*([1-4])/i);
    if (weekMatch) {
      if (weekMatch[1]) detectedWeek = Number(weekMatch[1]);
      else if (weekMatch[3]) detectedWeek = Number(weekMatch[3]);
      else if (/الأول|1/.test(weekMatch[2])) detectedWeek = 1;
      else if (/الثاني|2/.test(weekMatch[2])) detectedWeek = 2;
      else if (/الثالث|3/.test(weekMatch[2])) detectedWeek = 3;
      else if (/الرابع|4/.test(weekMatch[2])) detectedWeek = 4;
    }

    const targetClasses = targetClass === 'ALL' ? ['G2A', 'G2B', 'G2C'] : [targetClass];

    const ai = getGenAI();
    if (!ai) {
      console.log('No GEMINI_API_KEY set, using smart heuristic parser.');
      const parsed = heuristicParser(extractedPdfText, targetClass, Number(block), detectedWeek);
      return res.json(parsed);
    }

    const timetableContext = buildTimetableContext(targetClasses);

    const systemPrompt = `
You are the expert Senior Academic Coordinator for Nile Egyptian International Schools (Grade 2).
You are analyzing an official Nile School Grade 2 Weekly Plan (Block ${block}, Week ${detectedWeek}) for class(es): ${targetClasses.join(', ')}.

The weekly plan is often structured as a table with columns or rows for:
- Day (اليوم): Sunday (الأحد), Monday (الاثنين), Tuesday (الثلاثاء), Wednesday (الأربعاء), Thursday (الخميس)
- Subject (المادة): English, Mathematics, Arabic, Science, Social Studies, French, Religion, ICT, Arts, Music, PE
- Classwork (أعمال الفصل / الصف / الحصة / CW / C.W)
- Homework (الواجب المنزلي / الواجب / HW / H.W / Devoir)
- Notes & Remarks (ملاحظات / Remarque / Notes / تنبيهات)
- Tests & Quizzes (Quiz / Test / اختبار / امتحان / كويز / تقييم / إملاء)
- Links & URLs (روابط / منصات إلكترونية / Kahoot / Wordwall / YouTube / Google Drive / Forms)

MANDATORY PARSING & MAPPING RULES:

1. "classwork" (أعمال الفصل):
   - "الـ Classwork هو هو أعمال الفصل": Map all in-class lessons, page numbers, and practice exercises to "classwork".
   - Match each lesson to the EXACT period slot for that day from the class timetable:
${JSON.stringify(timetableContext, null, 2)}
   - LINKS: If there are ANY links or URLs in the classwork (e.g. Kahoot, Wordwall, YouTube, Drive), extract them into "linkUrl" and set a descriptive "linkTitle" (e.g. "Lien Kahoot / Activité 🔗" or "رابط الدرس 🔗").
   - Format:
     {
       "classId": "${targetClasses[0]}",
       "day": "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday",
       "period": 1 to 8,
       "subject": "Mathematics" | "English" | "Arabic" | "Science" | "Social Studies" | "French" | "Religion" | "ICT" | "Arts" | "Music" | "PE",
       "title": "Short descriptive lesson title",
       "details": "Details or workbook exercises",
       "pages": "Page numbers (e.g. p. 24-26 or ص 47)",
       "linkUrl": "Optional URL if present",
       "linkTitle": "Optional title for link"
     }

2. "homework" (الواجب المنزلي):
   - "الـ Homework هو هو الواجب المنزلي": Map all homework, workbook exercises, and home tasks to "homework".
   - STRICT RULE: For French and ICT, homework is ALWAYS assigned on the 3rd period/session of the week:
     * G2A: French 3rd session is Thursday (period 2). ICT 3rd session is Wednesday (period 3).
     * G2B: French 3rd session is Tuesday (period 7). ICT 3rd session is Wednesday (period 8).
     * G2C: French 3rd session is Wednesday (period 2). ICT 3rd session is Thursday (period 1).
   - For other subjects (Arabic, Math, English, Science, Social Studies, Religion), homework is assigned on the lesson day.
   - LINKS: If there are links or URLs in the homework, extract them into "linkUrl" and set "isLinkTask": true.
   - Format:
     {
       "classId": "${targetClasses[0]}",
       "assignedDay": "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday",
       "dueDay": "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday",
       "subject": "Subject name",
       "task": "Clear homework description",
       "details": "Extra notes or links",
       "pages": "Page numbers",
       "priority": "normal" | "urgent",
       "linkUrl": "Optional URL if present",
       "isLinkTask": true // if link present
     }

3. "tomorrowNotes" (تنبيهات الغد، الملاحظات، الكويزات والاختبارات):
   - STRICT USER REQUIREMENT 1: "ولو في كلمة Quiz أو Test أو اختبار بتنزل في الـ Tomorrow"
     * ANY Quiz, Test, Exam, Short Test, Dictation, اختبار, كويز, امتحان, تسميع, تقييم mentioned in the plan MUST be added to "tomorrowNotes" for the target day so students are alerted immediately!
     * Set "isQuiz": true and "categoryType": "quiz".
   - STRICT USER REQUIREMENT 2: "الملاحظات في العربي والسوشيال بتبقى اسمها ملاحظات، في الفرنش بتبقى اسمها Remarque، في باقي المواد بتبقى اسمها Notes"
     * For Arabic & Social Studies: Notes and instructions must be classified as "ملاحظات".
     * For French: Notes and instructions must be classified as "Remarque".
     * For all other subjects (English, Math, Science, ICT, Arts, PE, Religion): Notes must be classified as "Notes".
   - Supplies & Bag Items: If specific supplies (whiteboard, sketch, sports kit, colors, notebook, كشكول، ألوان، مسطرة) are required, populate "bagItem".
   - Format:
     {
       "classId": "${targetClasses[0]}",
       "targetDay": "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday",
       "subject": "Subject name",
       "note": "Original note text",
       "arabicNote": "Clear Arabic translation or original note",
       "bagItem": "Specific school bag item or tool needed if any",
       "isQuiz": true | false,
       "categoryType": "quiz" | "note"
     }


CRITICAL RULES TO PREVENT DUPLICATION & PHANTOM SESSIONS:
- "الحصص التي لا يذكر لها أي بيانات أو لا يكون لها محتوى في الخطة لا تنزل مطلقاً في الـ Classwork".
- NEVER generate placeholder or filler sessions. Only create a classwork or homework item if the plan explicitly lists real educational content (lesson title, book pages, exercises).
- If a subject has 3 sessions per week (like Social Studies, which is 3 sessions/week = 9 sessions over 3 weeks), output EXACTLY those 3 lessons per week. DO NOT repeat them across every period or produce 21 sessions!
- Multi-Week Documents: If the document contains multiple weeks (e.g. Week 1, Week 2, Week 3), attach the correct "week": 1 | 2 | 3 | 4 to every single object in "classwork", "homework", and "tomorrowNotes".

CRITICAL ARABIC PAGE NUMBERS RULE:
- Arabic PDF extractors often reverse digit order (e.g. extracting "24" as "42", "14-24" as "41-42", "15-18" as "81-51", "29-32" as "49-50" or "94-05").
- Always output CORRECT, un-reversed page numbers and ranges formatted with "ص" or "p." (e.g. "ص 24", "ص 14-24", "ص 15-18", "ص 29-32", or "p. 24-26"). Never output reversed digit artifacts!

Return ONLY valid JSON matching this schema:
{
  "classwork": [...],
  "homework": [...],
  "tomorrowNotes": [...]
}
`;

    const parts: any[] = [];
    // Only pass heavy raw PDF base64 if client-side text extraction didn't produce sufficient text
    if (extractedPdfText.length < 50 && pdfBase64 && typeof pdfBase64 === 'string') {
      const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').trim();
      if (cleanBase64.length > 0) {
        parts.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: cleanBase64,
          },
        });
      }
    }

    const textContent = extractedPdfText ? `Extracted Weekly Plan Text:\n${extractedPdfText}\n\n${systemPrompt}` : systemPrompt;
    parts.push({ text: textContent });

    const contents = { parts };

    let textOutput = '';
    try {
      textOutput = await generateWithFallback(ai, contents, {
        responseMimeType: 'application/json',
      });
    } catch (aiErr: any) {
      console.warn('AI generateWithFallback unavailable, using smart heuristic fallback with extracted text:', aiErr?.message || aiErr);
      const fallback = heuristicParser(extractedPdfText || '', targetClass, Number(block), detectedWeek);
      return res.json({
        success: true,
        fallbackMode: true,
        block: Number(block),
        week: fallback.week || detectedWeek,
        classwork: fallback.classwork,
        homework: fallback.homework,
        tomorrowNotes: fallback.tomorrowNotes,
      });
    }

    try {
      const parsed = cleanAndParseJson(textOutput);
      const finalized = postProcessParsedPlan(parsed, Number(block), detectedWeek, targetClasses);
      return res.json({
        success: true,
        block: Number(block),
        week: finalized.week || detectedWeek,
        classwork: finalized.classwork,
        homework: finalized.homework,
        tomorrowNotes: finalized.tomorrowNotes,
      });
    } catch (parseErr) {
      console.warn('Gemini JSON parse failed, falling back to heuristic:', parseErr);
      const fallback = heuristicParser(extractedPdfText || textOutput, targetClass, Number(block), detectedWeek);
      return res.json({
        success: true,
        fallbackMode: true,
        block: Number(block),
        week: fallback.week || detectedWeek,
        classwork: fallback.classwork,
        homework: fallback.homework,
        tomorrowNotes: fallback.tomorrowNotes,
      });
    }
  } catch (error: any) {
    console.error('Error in /api/parse-weekly-plan-pdf:', error);
    const fallback = heuristicParser(req.body?.planText || '', req.body?.targetClass || 'ALL', Number(req.body?.block || 1), Number(req.body?.week || 2));
    return res.json({
      success: true,
      fallbackMode: true,
      block: Number(req.body?.block || 1),
      week: fallback.week || Number(req.body?.week || 2),
      classwork: fallback.classwork,
      homework: fallback.homework,
      tomorrowNotes: fallback.tomorrowNotes,
    });
  }
});

// Endpoint 2: Existing text-based endpoint (backwards compatible)
app.post('/api/parse-weekly-plan', async (req, res) => {
  try {
    const { planText, classId, block = 1, week = 2 } = req.body;
    if (!planText || typeof planText !== 'string') {
      return res.status(400).json({ error: 'planText is required' });
    }

    // Auto-detect Week if text mentions Week 3 / الأسبوع الثالث
    let detectedWeek = Number(week) || 2;
    const weekMatch = planText.match(/week\s*([1-4])|الأسبوع\s*(الأول|الثاني|الثالث|الرابع|[1-4])|الاسبوع\s*([1-4])|اسبوع\s*([1-4])/i);
    if (weekMatch) {
      if (weekMatch[1]) detectedWeek = Number(weekMatch[1]);
      else if (weekMatch[3]) detectedWeek = Number(weekMatch[3]);
      else if (weekMatch[4]) detectedWeek = Number(weekMatch[4]);
      else if (/الأول|1/.test(weekMatch[2])) detectedWeek = 1;
      else if (/الثاني|2/.test(weekMatch[2])) detectedWeek = 2;
      else if (/الثالث|3/.test(weekMatch[2])) detectedWeek = 3;
      else if (/الرابع|4/.test(weekMatch[2])) detectedWeek = 4;
    }

    const targetClasses = (!classId || classId === 'ALL') ? ['G2A', 'G2B', 'G2C'] : [classId];

    const ai = getGenAI();
    if (!ai) {
      const parsed = heuristicParser(planText, classId, Number(block), detectedWeek);
      return res.json({
        success: true,
        block: Number(block),
        week: parsed.week || detectedWeek,
        classwork: parsed.classwork,
        homework: parsed.homework,
        tomorrowNotes: parsed.tomorrowNotes,
      });
    }

    const timetableContext = buildTimetableContext(targetClasses);

    const prompt = `
You are the official Senior Academic Coordinator for Nile Egyptian International Schools (Grade 2).
Categorize and extract classwork, homework, and tomorrow notes for Nile Grade 2 (Block ${block}, Week ${detectedWeek}, Classes: ${targetClasses.join(', ')}).

The weekly plan is often structured as a table or list with columns or rows for:
- Day (اليوم): Sunday (الأحد), Monday (الاثنين), Tuesday (الثلاثاء), Wednesday (الأربعاء), Thursday (الخميس)
- Subject (المادة): English, Mathematics, Arabic, Science, Social Studies, French, Religion, ICT, Arts, Music, PE
- Classwork (أعمال الفصل / الصف / الحصة / CW / C.W)
- Homework (الواجب المنزلي / الواجب / HW / H.W / Devoir)
- Notes & Remarks (ملاحظات / Remarque / Notes / تنبيهات)
- Tests & Quizzes (Quiz / Test / اختبار / امتحان / كويز / تقييم / إملاء)
- Links & URLs (روابط / منصات إلكترونية / Kahoot / Wordwall / YouTube / Google Drive / Forms)

MANDATORY PARSING & MAPPING RULES:
1. "classwork" (أعمال الفصل):
   - "الـ Classwork هو هو أعمال الفصل": Map all in-class lessons, page numbers, and practice exercises to "classwork".
   - Match lessons to timetable slots:
${JSON.stringify(timetableContext, null, 2)}
   - LINKS: Extract any URLs into "linkUrl" and set a descriptive "linkTitle".
   - Format: { classId, day, period, subject, title, details, pages, linkUrl, linkTitle }

2. "homework" (الواجب المنزلي):
   - "الـ Homework هو هو الواجب المنزلي": Map all homework, workbook exercises, and home tasks to "homework".
   - STRICT RULE: For French and ICT, assign homework on the 3rd period/session of the week:
     * G2A: French Thursday, ICT Wednesday
     * G2B: French Tuesday, ICT Wednesday
     * G2C: French Wednesday, ICT Thursday
   - LINKS: Extract any URLs into "linkUrl" and set "isLinkTask": true.
   - Format: { classId, assignedDay, dueDay, subject, task, details, pages, priority: "normal" | "urgent", linkUrl, isLinkTask }

3. "tomorrowNotes" (تنبيهات الغد، الملاحظات، الكويزات والاختبارات):
   - STRICT USER REQUIREMENT 1: "ولو في كلمة Quiz أو Test أو اختبار بتنزل في الـ Tomorrow"
     * ANY Quiz, Test, Exam, Short Test, Dictation, اختبار, كويز, امتحان, تسميع, تقييم mentioned in the plan MUST be added to "tomorrowNotes" for the target day so students are alerted immediately!
     * Set "isQuiz": true and "categoryType": "quiz".
   - STRICT USER REQUIREMENT 2: "الملاحظات في العربي والسوشيال بتبقى اسمها ملاحظات، في الفرنش بتبقى اسمها Remarque، في باقي المواد بتبقى اسمها Notes"
     * Arabic & Social Studies: Notes must be classified as "ملاحظات".
     * French: Notes must be classified as "Remarque".
     * All other subjects: Notes must be classified as "Notes".
   - Extract required tools or bag items into "bagItem" (e.g. كشكول، ألوان، مسطرة، لوحة بيضاء).
   - Format: { classId, targetDay, subject, note, arabicNote, bagItem, isQuiz, categoryType }

CRITICAL RULES TO PREVENT DUPLICATION & PHANTOM SESSIONS:
- "الحصص التي لا يذكر لها أي بيانات أو لا يكون لها محتوى في الخطة لا تنزل مطلقاً في الـ Classwork".
- NEVER generate placeholder or filler sessions. Only create a classwork or homework item if the plan explicitly lists real educational content.
- If a subject has 3 sessions per week (like Social Studies, which is 3 sessions/week = 9 sessions over 3 weeks), output EXACTLY those 3 lessons per week. DO NOT invent 21 sessions!
- Multi-Week Documents: If the document contains multiple weeks, attach the correct "week": 1 | 2 | 3 | 4 to every object.

Return ONLY JSON:
{
  "classwork": [...],
  "homework": [...],
  "tomorrowNotes": [...]
}

Weekly Plan Text:
${planText}
`;

    let textOutput = '';
    try {
      textOutput = await generateWithFallback(ai, { parts: [{ text: prompt }] }, {
        responseMimeType: 'application/json',
      });
    } catch (aiErr: any) {
      console.warn('AI generateWithFallback unavailable, using smart heuristic fallback:', aiErr?.message || aiErr);
      const fallback = heuristicParser(planText, classId, Number(block), detectedWeek);
      return res.json({
        success: true,
        fallbackMode: true,
        block: Number(block),
        week: fallback.week || detectedWeek,
        classwork: fallback.classwork,
        homework: fallback.homework,
        tomorrowNotes: fallback.tomorrowNotes,
      });
    }

    try {
      const parsed = cleanAndParseJson(textOutput);
      const finalized = postProcessParsedPlan(parsed, Number(block), detectedWeek, targetClasses);
      return res.json({
        success: true,
        block: Number(block),
        week: finalized.week || detectedWeek,
        classwork: finalized.classwork,
        homework: finalized.homework,
        tomorrowNotes: finalized.tomorrowNotes,
      });
    } catch (parseErr) {
      console.warn('Gemini JSON parse failed, falling back to heuristic:', parseErr);
      const fallback = heuristicParser(planText, classId, Number(block), detectedWeek);
      return res.json({
        success: true,
        fallbackMode: true,
        block: Number(block),
        week: fallback.week || detectedWeek,
        classwork: fallback.classwork,
        homework: fallback.homework,
        tomorrowNotes: fallback.tomorrowNotes,
      });
    }
  } catch (error: any) {
    console.error('Error in /api/parse-weekly-plan:', error);
    const fallback = heuristicParser(req.body?.planText || '', req.body?.classId || 'G2B', Number(req.body?.block || 1), Number(req.body?.week || 2));
    return res.json({
      success: true,
      fallbackMode: true,
      block: Number(req.body?.block || 1),
      week: fallback.week || Number(req.body?.week || 2),
      classwork: fallback.classwork,
      homework: fallback.homework,
      tomorrowNotes: fallback.tomorrowNotes,
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
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
