import express from 'express';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { CLASS_TIMETABLES } from './src/data/timetables.ts';

dotenv.config();

const router = express.Router();

// Supabase server-side configuration (safe from browser exposure)
let rawSbUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://elcczvazlgxbgnioxfaf.supabase.co').trim();
if (rawSbUrl.endsWith('/rest/v1/')) {
  rawSbUrl = rawSbUrl.substring(0, rawSbUrl.length - 9);
} else if (rawSbUrl.endsWith('/rest/v1')) {
  rawSbUrl = rawSbUrl.substring(0, rawSbUrl.length - 8);
}
const SB_URL = rawSbUrl;
const SB_KEY = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5DUTdClGKYJ_PI4GYRf07g_RFkxguqA').trim();

const isConfigured = Boolean(
  SB_URL &&
  SB_KEY &&
  !SB_URL.includes('placeholder') &&
  (SB_URL.startsWith('http://') || SB_URL.startsWith('https://'))
);

const supabase = isConfigured ? createClient(SB_URL, SB_KEY) : null;

// Paths for persistent local storage files (Shared Container Persistence)
const DB_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const FILE_PATHS = {
  classwork: path.join(DB_DIR, 'classwork.json'),
  homework: path.join(DB_DIR, 'homework.json'),
  timetables: path.join(DB_DIR, 'timetables.json'),
  settings: path.join(DB_DIR, 'settings.json'),
  tomorrow_notes: path.join(DB_DIR, 'tomorrow_notes.json'),
  student_progress: path.join(DB_DIR, 'student_progress.json'),
};

// Generic read/write helpers
function readJsonFile<T>(filePath: string, defaultVal: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    }
  } catch (err) {
    console.error(`Error reading database file: ${filePath}`, err);
  }
  return defaultVal;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing database file: ${filePath}`, err);
  }
}

// Shared helpers for Supabase schema safety & pagination (>1000 rows)
async function fetchAllFromSupabasePaginated(table: string, selectCols = '*'): Promise<{ data: any[] | null; error: any }> {
  if (!supabase) return { data: null, error: null };
  const pageSize = 1000;
  const maxPages = 25;
  const allRows: any[] = [];
  for (let page = 0; page < maxPages; page++) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase.from(table).select(selectCols).range(from, to);
    if (error) {
      if (page === 0) return { data: null, error };
      break;
    }
    const batch = Array.isArray(data) ? data : [];
    allRows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return { data: allRows, error: null };
}

function packDetailsMetaForDb(
  details: any,
  meta: { pdfUrl?: string; links?: any[]; linkTitle?: string }
): string | null {
  let base = typeof details === 'string' ? details : '';
  base = base
    .replace(/\|\|LINKS_JSON:\[[\s\S]*?\](?=\|\||$)/g, '')
    .replace(/\|\|LINK_TITLE:[\s\S]*?(?=\|\||$)/g, '')
    .replace(/\|\|PDF_URL:[\s\S]*?(?=\|\||$)/g, '')
    .trim();
  let res = base;
  if (meta.pdfUrl && String(meta.pdfUrl).trim()) {
    res += ` ||PDF_URL:${String(meta.pdfUrl).trim()}`;
  }
  if (meta.linkTitle && String(meta.linkTitle).trim()) {
    res += ` ||LINK_TITLE:${String(meta.linkTitle).trim()}`;
  }
  if (Array.isArray(meta.links) && meta.links.length > 0) {
    res += ` ||LINKS_JSON:${JSON.stringify(meta.links)}`;
  }
  return res.trim() || null;
}

function sanitizeClassworkRowForDb(entry: any) {
  return {
    id: entry.id,
    class_id: entry.class_id ?? entry.classId,
    day: entry.day,
    period: Number(entry.period ?? 1),
    subject: entry.subject,
    title: entry.title,
    details: packDetailsMetaForDb(entry.details, {
      pdfUrl: entry.pdf_url ?? entry.pdfUrl,
      links: Array.isArray(entry.links) ? entry.links : undefined,
    }),
    pages: entry.pages ?? null,
    completed: Boolean(entry.completed),
    block: Number(entry.block ?? 1),
    week: Number(entry.week ?? 1),
    link_url: entry.link_url ?? entry.linkUrl ?? null,
    link_title: entry.link_title ?? entry.linkTitle ?? null,
    links: Array.isArray(entry.links) ? entry.links : [],
  };
}

function sanitizeHomeworkRowForDb(entry: any) {
  return {
    id: entry.id,
    class_id: entry.class_id ?? entry.classId,
    assigned_day: entry.assigned_day ?? entry.assignedDay,
    due_day: entry.due_day ?? entry.dueDay,
    subject: entry.subject,
    task: entry.task,
    details: packDetailsMetaForDb(entry.details, {
      pdfUrl: entry.pdf_url ?? entry.pdfUrl,
      links: Array.isArray(entry.links) ? entry.links : undefined,
      linkTitle: entry.link_title ?? entry.linkTitle,
    }),
    pages: entry.pages ?? null,
    completed: Boolean(entry.completed),
    priority: entry.priority || 'normal',
    block: Number(entry.block ?? 1),
    week: Number(entry.week ?? 1),
    link_url: entry.link_url ?? entry.linkUrl ?? null,
    link_title: entry.link_title ?? entry.linkTitle ?? null,
    links: Array.isArray(entry.links) ? entry.links : [],
  };
}

async function readGlobalSettingsRow() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('planner_settings')
    .select('id, current_block, current_week, active_term, settings')
    .eq('id', 'global')
    .maybeSingle();
  if (error || !data) return null;
  return {
    ...data,
    settings: data.settings && typeof data.settings === 'object' ? data.settings : {},
  };
}

async function patchGlobalSettings(
  settingsPatch: Record<string, any>,
  topLevel?: { current_block?: number; current_week?: number; active_term?: string }
) {
  if (!supabase) return;
  const existing = await readGlobalSettingsRow();
  const row = {
    id: 'global',
    current_block: topLevel?.current_block ?? existing?.current_block ?? 1,
    current_week: topLevel?.current_week ?? existing?.current_week ?? 2,
    active_term: topLevel?.active_term ?? existing?.active_term ?? 'Term 2',
    settings: {
      ...(existing?.settings || {}),
      ...settingsPatch,
    },
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('planner_settings').upsert(row, { onConflict: 'id' });
  if (error) console.error('Supabase global planner_settings upsert warning:', error.message);
}

// ----------------------------------------------------
// CLASSWORK CONTROLLERS
// ----------------------------------------------------
router.get('/api/db/classwork', async (req, res) => {
  try {
    let list = readJsonFile<any[]>(FILE_PATHS.classwork, []);
    
    if (supabase) {
      const { data, error } = await fetchAllFromSupabasePaginated('classwork', '*');
      if (!error && data) {
        list = data;
        writeJsonFile(FILE_PATHS.classwork, data);
      }
    }
    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/db/classwork/upsert', async (req, res) => {
  try {
    const entry = req.body;
    let list = readJsonFile<any[]>(FILE_PATHS.classwork, []);
    
    // Update or insert locally
    const idx = list.findIndex((x) => x.id === entry.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...entry };
    } else {
      list.push(entry);
    }
    writeJsonFile(FILE_PATHS.classwork, list);

    if (supabase) {
      const row = sanitizeClassworkRowForDb(entry);
      const { error } = await supabase.from('classwork').upsert(row, { onConflict: 'id' });
      if (error) console.error('Supabase classwork upsert sync warning:', error);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/db/classwork/batch', async (req, res) => {
  try {
    const entries = req.body;
    if (!Array.isArray(entries)) {
      return res.status(400).json({ success: false, error: 'Expected an array of entries' });
    }
    
    let list = readJsonFile<any[]>(FILE_PATHS.classwork, []);
    for (const entry of entries) {
      const idx = list.findIndex((x) => x.id === entry.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...entry };
      } else {
        list.push(entry);
      }
    }
    writeJsonFile(FILE_PATHS.classwork, list);

    if (supabase) {
      const rows = entries.map(sanitizeClassworkRowForDb);
      for (let i = 0; i < rows.length; i += 50) {
        const chunk = rows.slice(i, i + 50);
        const { error } = await supabase.from('classwork').upsert(chunk, { onConflict: 'id' });
        if (error) console.error('Supabase classwork batch sync warning:', error);
      }
    }
    res.json({ success: true, count: entries.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/api/db/classwork/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let list = readJsonFile<any[]>(FILE_PATHS.classwork, []);
    list = list.filter((x) => x.id !== id);
    writeJsonFile(FILE_PATHS.classwork, list);

    if (supabase) {
      const { error } = await supabase.from('classwork').delete().eq('id', id);
      if (error) console.error('Supabase classwork delete sync warning:', error);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/db/classwork/delete-scope', async (req, res) => {
  try {
    const { classId, block, week, subject, day } = req.body;
    let list = readJsonFile<any[]>(FILE_PATHS.classwork, []);
    
    list = list.filter((item) => {
      const match =
        item.class_id === classId &&
        Number(item.block) === Number(block) &&
        Number(item.week) === Number(week) &&
        (subject ? item.subject === subject : true) &&
        (day ? item.day === day : true);
      return !match;
    });
    writeJsonFile(FILE_PATHS.classwork, list);

    if (supabase) {
      let query = supabase.from('classwork').delete()
        .eq('class_id', classId)
        .eq('block', block)
        .eq('week', week);
      
      if (subject) query = query.eq('subject', subject);
      if (day) query = query.eq('day', day);
      
      const { error } = await query;
      if (error) console.error('Supabase classwork delete-scope sync warning:', error);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/db/classwork/clear', async (req, res) => {
  try {
    writeJsonFile(FILE_PATHS.classwork, []);
    if (supabase) {
      const { error } = await supabase.from('classwork').delete().neq('id', 'placeholder');
      if (error) console.error('Supabase classwork clear sync warning:', error);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// HOMEWORK CONTROLLERS
// ----------------------------------------------------
router.get('/api/db/homework', async (req, res) => {
  try {
    let list = readJsonFile<any[]>(FILE_PATHS.homework, []);
    
    if (supabase) {
      const { data, error } = await fetchAllFromSupabasePaginated('homework', '*');
      if (!error && data) {
        list = data;
        writeJsonFile(FILE_PATHS.homework, data);
      }
    }
    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/db/homework/upsert', async (req, res) => {
  try {
    const entry = req.body;
    let list = readJsonFile<any[]>(FILE_PATHS.homework, []);
    
    const idx = list.findIndex((x) => x.id === entry.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...entry };
    } else {
      list.push(entry);
    }
    writeJsonFile(FILE_PATHS.homework, list);

    if (supabase) {
      const row = sanitizeHomeworkRowForDb(entry);
      const { error } = await supabase.from('homework').upsert(row, { onConflict: 'id' });
      if (error) console.error('Supabase homework upsert sync warning:', error);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/db/homework/batch', async (req, res) => {
  try {
    const entries = req.body;
    if (!Array.isArray(entries)) {
      return res.status(400).json({ success: false, error: 'Expected an array of entries' });
    }
    
    let list = readJsonFile<any[]>(FILE_PATHS.homework, []);
    for (const entry of entries) {
      const idx = list.findIndex((x) => x.id === entry.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...entry };
      } else {
        list.push(entry);
      }
    }
    writeJsonFile(FILE_PATHS.homework, list);

    if (supabase) {
      const rows = entries.map(sanitizeHomeworkRowForDb);
      for (let i = 0; i < rows.length; i += 50) {
        const chunk = rows.slice(i, i + 50);
        const { error } = await supabase.from('homework').upsert(chunk, { onConflict: 'id' });
        if (error) console.error('Supabase homework batch sync warning:', error);
      }
    }
    res.json({ success: true, count: entries.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/api/db/homework/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let list = readJsonFile<any[]>(FILE_PATHS.homework, []);
    list = list.filter((x) => x.id !== id);
    writeJsonFile(FILE_PATHS.homework, list);

    if (supabase) {
      const { error } = await supabase.from('homework').delete().eq('id', id);
      if (error) console.error('Supabase homework delete sync warning:', error);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/db/homework/delete-scope', async (req, res) => {
  try {
    const { classId, block, week, subject, day } = req.body;
    let list = readJsonFile<any[]>(FILE_PATHS.homework, []);
    
    list = list.filter((item) => {
      const match =
        item.class_id === classId &&
        Number(item.block) === Number(block) &&
        Number(item.week) === Number(week) &&
        (subject ? item.subject === subject : true) &&
        (day ? item.assigned_day === day : true);
      return !match;
    });
    writeJsonFile(FILE_PATHS.homework, list);

    if (supabase) {
      let query = supabase.from('homework').delete()
        .eq('class_id', classId)
        .eq('block', block)
        .eq('week', week);
      
      if (subject) query = query.eq('subject', subject);
      if (day) query = query.eq('assigned_day', day);
      
      const { error } = await query;
      if (error) console.error('Supabase homework delete-scope sync warning:', error);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/db/homework/clear', async (req, res) => {
  try {
    writeJsonFile(FILE_PATHS.homework, []);
    if (supabase) {
      const { error } = await supabase.from('homework').delete().neq('id', 'placeholder');
      if (error) console.error('Supabase homework clear sync warning:', error);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// TIMETABLES CONTROLLERS
// ----------------------------------------------------
router.get('/api/db/timetables', async (req, res) => {
  try {
    let map = readJsonFile<Record<string, any>>(FILE_PATHS.timetables, {});

    if (supabase) {
      const { data, error } = await supabase.from('timetables').select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        const parsedMap: Record<string, any> = {};
        for (const row of data) {
          if (row.class_id && row.schedule) {
            parsedMap[row.class_id] = typeof row.schedule === 'string' ? JSON.parse(row.schedule) : row.schedule;
          }
        }
        if (Object.keys(parsedMap).length > 0) {
          map = parsedMap;
          writeJsonFile(FILE_PATHS.timetables, parsedMap);
        }
      } else {
        const globalRow = await readGlobalSettingsRow();
        const customTt = globalRow?.settings?.custom_timetables;
        if (customTt && typeof customTt === 'object' && Object.keys(customTt).length > 0) {
          map = customTt;
          writeJsonFile(FILE_PATHS.timetables, customTt);
        }
      }
    }

    // Server-side final guarantee: ensure all classes with baseline schedules have slots
    let finalNeedsHeal = false;
    for (const [classId, schedule] of Object.entries(CLASS_TIMETABLES)) {
      const hasBaselineSlots = schedule && Object.values(schedule).some(slots => Array.isArray(slots) && slots.length > 0);
      if (hasBaselineSlots) {
        const currentClassSchedule = map[classId];
        const currentHasSlots = currentClassSchedule && Object.values(currentClassSchedule).some((slots: any) => Array.isArray(slots) && slots.length > 0);
        if (!currentHasSlots) {
          map[classId] = schedule;
          finalNeedsHeal = true;
        }
      }
    }

    if (finalNeedsHeal) {
      writeJsonFile(FILE_PATHS.timetables, map);
      if (supabase) {
        try {
          const nowIso = new Date().toISOString();
          const rows = Object.entries(map).map(([classId, schedule]) => ({
            class_id: classId,
            schedule,
            updated_at: nowIso,
          }));
          await supabase.from('timetables').upsert(rows, { onConflict: 'class_id' });
          await patchGlobalSettings({ custom_timetables: map });
        } catch {}
      }
    }

    res.json({ success: true, data: map });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/db/timetables/save', async (req, res) => {
  try {
    const timetablesMap = req.body;
    writeJsonFile(FILE_PATHS.timetables, timetablesMap);

    if (supabase) {
      try {
        const nowIso = new Date().toISOString();
        const rows = Object.entries(timetablesMap).map(([classId, schedule]) => ({
          class_id: classId,
          schedule,
          updated_at: nowIso,
        }));
        if (rows.length > 0) {
          const { error } = await supabase.from('timetables').upsert(rows, { onConflict: 'class_id' });
          if (error) console.warn('Supabase timetables table save warning:', error.message);
        }
        await patchGlobalSettings({ custom_timetables: timetablesMap });
      } catch (sbErr) {
        console.warn('Supabase timetables save sync warning:', sbErr);
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/db/timetables/save-class', async (req, res) => {
  try {
    const { classId, schedule } = req.body;
    const map = readJsonFile<Record<string, any>>(FILE_PATHS.timetables, {});
    map[classId] = schedule;
    writeJsonFile(FILE_PATHS.timetables, map);

    if (supabase) {
      try {
        await supabase.from('timetables').upsert({
          class_id: classId,
          schedule,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'class_id' });
        await patchGlobalSettings({ custom_timetables: map });
      } catch {}
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/db/timetables/clear', async (req, res) => {
  try {
    writeJsonFile(FILE_PATHS.timetables, {});
    if (supabase) {
      try {
        await supabase.from('timetables').delete().neq('class_id', '___non_existent___');
        await patchGlobalSettings({ custom_timetables: {} });
      } catch {}
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// PLANNER SETTINGS CONTROLLERS
// ----------------------------------------------------
router.get('/api/db/planner-settings', async (req, res) => {
  try {
    let settings = readJsonFile<any>(FILE_PATHS.settings, { currentBlock: 1, currentWeek: 2 });

    if (supabase) {
      const globalRow = await readGlobalSettingsRow();
      if (globalRow) {
        const parsed = {
          currentBlock: Number(globalRow.current_block || settings.currentBlock || 1),
          currentWeek: Number(globalRow.current_week || settings.currentWeek || 2),
          activeTerm: globalRow.active_term || settings.activeTerm || 'Term 2',
        };
        settings = parsed;
        writeJsonFile(FILE_PATHS.settings, parsed);
      }
    }
    res.json({ success: true, data: settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/db/planner-settings', async (req, res) => {
  try {
    const payload = req.body;
    const current = readJsonFile<any>(FILE_PATHS.settings, { currentBlock: 1, currentWeek: 2 });
    const merged = { ...current, ...payload };
    writeJsonFile(FILE_PATHS.settings, merged);

    if (supabase) {
      await patchGlobalSettings({}, {
        current_block: payload.currentBlock !== undefined ? Number(payload.currentBlock) : undefined,
        current_week: payload.currentWeek !== undefined ? Number(payload.currentWeek) : undefined,
        active_term: payload.activeTerm !== undefined ? String(payload.activeTerm) : undefined,
      });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// TOMORROW SPECIAL NOTES CONTROLLERS (tomorrow_notes table + planner_settings.settings.tomorrow_special_notes)
// ----------------------------------------------------
function mapDbTomorrowNoteRow(tn: any) {
  const combined = ((tn.note || '') + ' ' + (tn.arabic_note || '')).toLowerCase();
  const isQuiz = /quiz|test|اختبار|امتحان|كويز|إملاء|dictation|تسميع|تقييم/.test(combined);
  return {
    id: tn.id,
    classId: tn.class_id,
    targetDay: tn.target_day,
    subject: tn.subject,
    note: tn.note,
    arabicNote: tn.arabic_note || tn.note,
    bagItem: tn.bag_item || undefined,
    block: tn.block || 1,
    week: tn.week || 1,
    isQuiz,
    categoryType: isQuiz ? 'quiz' : 'note',
    isCustom: true,
  };
}

router.get('/api/db/tomorrow-notes', async (req, res) => {
  try {
    let list = readJsonFile<any[]>(FILE_PATHS.tomorrow_notes, []);

    if (supabase) {
      const [tnRes, globalRow] = await Promise.all([
        fetchAllFromSupabasePaginated('tomorrow_notes', '*'),
        readGlobalSettingsRow(),
      ]);
      const tableNotes = Array.isArray(tnRes?.data) ? tnRes.data.map(mapDbTomorrowNoteRow) : [];
      const jsonNotes = Array.isArray(globalRow?.settings?.tomorrow_special_notes)
        ? globalRow!.settings.tomorrow_special_notes
        : [];

      const map = new Map<string, any>();
      const getKey = (n: any) =>
        n.id || `${n.classId || 'ALL'}-${n.targetDay}-${n.block || 1}-${n.week || 1}-${n.subject}-${(n.note || '').slice(0, 30)}`;
      [...tableNotes, ...jsonNotes].forEach((n) => {
        if (!n) return;
        const k = getKey(n);
        map.set(k, { ...(map.get(k) || {}), ...n });
      });
      if (map.size > 0) {
        list = Array.from(map.values());
        writeJsonFile(FILE_PATHS.tomorrow_notes, list);
      }
    }
    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/db/tomorrow-notes', async (req, res) => {
  try {
    const notes = req.body;
    if (!Array.isArray(notes)) {
      return res.status(400).json({ success: false, error: 'Expected an array' });
    }

    let existing = readJsonFile<any[]>(FILE_PATHS.tomorrow_notes, []);
    if (supabase) {
      try {
        const globalRow = await readGlobalSettingsRow();
        if (Array.isArray(globalRow?.settings?.tomorrow_special_notes)) {
          existing = globalRow!.settings.tomorrow_special_notes;
        }
      } catch {}
    }

    const noteMap = new Map<string, any>();
    const getKey = (n: any) =>
      n.id || `${n.classId || 'ALL'}-${n.targetDay}-${n.block || 1}-${n.week || 1}-${n.subject}-${(n.note || '').slice(0, 30)}`;
    existing.forEach((n) => { if (n) noteMap.set(getKey(n), n); });
    notes.forEach((n) => { if (n) noteMap.set(getKey(n), n); });
    const merged = Array.from(noteMap.values());

    writeJsonFile(FILE_PATHS.tomorrow_notes, merged);

    if (supabase) {
      const tnRows = notes
        .filter((n) => n && n.targetDay && n.subject)
        .map((n) => ({
          id: n.id || `tn-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          class_id: n.classId || 'ALL',
          target_day: n.targetDay,
          subject: n.subject,
          note: n.note || n.arabicNote || '',
          arabic_note: n.arabicNote || n.note || '',
          bag_item: n.bagItem ?? null,
          block: Number(n.block ?? 1),
          week: Number(n.week ?? 1),
        }));
      if (tnRows.length > 0) {
        const { error: tnErr } = await supabase.from('tomorrow_notes').upsert(tnRows, { onConflict: 'id' });
        if (tnErr) console.error('Supabase tomorrow_notes table save warning:', tnErr.message);
      }
      await patchGlobalSettings({ tomorrow_special_notes: merged });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/db/tomorrow-notes/delete-scope', async (req, res) => {
  try {
    const { classId, block, week, subject, day } = req.body;
    let list = readJsonFile<any[]>(FILE_PATHS.tomorrow_notes, []);
    if (supabase) {
      try {
        const globalRow = await readGlobalSettingsRow();
        if (Array.isArray(globalRow?.settings?.tomorrow_special_notes)) {
          list = globalRow!.settings.tomorrow_special_notes;
        }
      } catch {}
    }

    list = list.filter((item) => {
      const match =
        item.classId === classId &&
        Number(item.block) === Number(block) &&
        Number(item.week) === Number(week) &&
        (subject ? item.subject === subject : true) &&
        (day ? item.targetDay === day : true);
      return !match;
    });
    writeJsonFile(FILE_PATHS.tomorrow_notes, list);

    if (supabase) {
      let query = supabase.from('tomorrow_notes').delete()
        .eq('class_id', classId)
        .eq('block', block)
        .eq('week', week);
      if (subject) query = query.eq('subject', subject);
      if (day) query = query.eq('target_day', day);
      await query;
      await patchGlobalSettings({ tomorrow_special_notes: list });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/api/db/tomorrow-notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let list = readJsonFile<any[]>(FILE_PATHS.tomorrow_notes, []);
    if (supabase) {
      try {
        const globalRow = await readGlobalSettingsRow();
        if (Array.isArray(globalRow?.settings?.tomorrow_special_notes)) {
          list = globalRow!.settings.tomorrow_special_notes;
        }
      } catch {}
    }
    list = list.filter((x) => x.id !== id);
    writeJsonFile(FILE_PATHS.tomorrow_notes, list);

    if (supabase) {
      await supabase.from('tomorrow_notes').delete().eq('id', id);
      await patchGlobalSettings({ tomorrow_special_notes: list });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// STUDENT PROGRESS CONTROLLERS
// ----------------------------------------------------
router.post('/api/db/student-progress', async (req, res) => {
  try {
    const { studentName, classId } = req.body;
    let progress = null;
    
    if (supabase) {
      const { data, error } = await supabase.from('student_progress')
        .select('*')
        .eq('student_name', studentName.trim().toLowerCase())
        .maybeSingle();
      
      if (!error && data) {
        progress = {
          studentName: data.student_name,
          classId: data.class_id,
          completedClassworkIds: data.completed_classwork_ids || [],
          completedHomeworkIds: data.completed_homework_ids || [],
          lastActive: data.last_active || Date.now(),
        };
      }
    }
    
    if (!progress) {
      const list = readJsonFile<any[]>(FILE_PATHS.student_progress, []);
      const found = list.find((x) => x.studentName.trim().toLowerCase() === studentName.trim().toLowerCase());
      progress = found || null;
    }
    
    res.json({ success: true, data: progress });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/db/student-progress/save', async (req, res) => {
  try {
    const { studentName, classId, completedClassworkIds, completedHomeworkIds } = req.body;
    const item = {
      studentName: studentName.trim(),
      classId,
      completedClassworkIds,
      completedHomeworkIds,
      lastActive: Date.now(),
    };

    // Save locally
    let list = readJsonFile<any[]>(FILE_PATHS.student_progress, []);
    const idx = list.findIndex((x) => x.studentName.trim().toLowerCase() === studentName.trim().toLowerCase());
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    writeJsonFile(FILE_PATHS.student_progress, list);

    if (supabase) {
      const { error } = await supabase.from('student_progress').upsert({
        student_name: studentName.trim().toLowerCase(),
        class_id: classId,
        completed_classwork_ids: completedClassworkIds,
        completed_homework_ids: completedHomeworkIds,
        last_active: Date.now(),
      });
      if (error) console.error('Supabase student progress save sync warning:', error);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/db/status', (req, res) => {
  res.json({
    success: true,
    configured: isConfigured,
    provider: isConfigured ? 'supabase' : 'local_json',
    url: SB_URL ? `${SB_URL.substring(0, 20)}...` : null,
  });
});

export default router;
