import express from 'express';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Supabase server-side configuration (safe from browser exposure)
const SB_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const SB_KEY = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

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

// ----------------------------------------------------
// CLASSWORK CONTROLLERS
// ----------------------------------------------------
router.get('/api/db/classwork', async (req, res) => {
  try {
    let list = readJsonFile<any[]>(FILE_PATHS.classwork, []);
    
    if (supabase) {
      const { data, error } = await supabase.from('classwork').select('*');
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
      const { error } = await supabase.from('classwork').upsert(entry);
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
      const { error } = await supabase.from('classwork').upsert(entries);
      if (error) console.error('Supabase classwork batch sync warning:', error);
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
      const { data, error } = await supabase.from('homework').select('*');
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
      const { error } = await supabase.from('homework').upsert(entry);
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
      const { error } = await supabase.from('homework').upsert(entries);
      if (error) console.error('Supabase homework batch sync warning:', error);
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
      if (!error && data) {
        const parsedMap: Record<string, any> = {};
        for (const row of data) {
          parsedMap[row.class_id] = typeof row.schedule === 'string' ? JSON.parse(row.schedule) : row.schedule;
        }
        map = parsedMap;
        writeJsonFile(FILE_PATHS.timetables, parsedMap);
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
      const rows = Object.entries(timetablesMap).map(([classId, schedule]) => ({
        class_id: classId,
        schedule,
      }));
      const { error } = await supabase.from('timetables').upsert(rows);
      if (error) console.error('Supabase timetables save sync warning:', error);
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
      const { error } = await supabase.from('timetables').upsert({
        class_id: classId,
        schedule,
      });
      if (error) console.error('Supabase timetable class save sync warning:', error);
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
      const { error } = await supabase.from('timetables').delete().neq('class_id', 'placeholder');
      if (error) console.error('Supabase timetables clear sync warning:', error);
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
      const { data, error } = await supabase.from('planner_settings').select('*').eq('id', 'global').maybeSingle();
      if (!error && data) {
        const parsed = {
          currentBlock: Number(data.current_block || 1),
          currentWeek: Number(data.current_week || 2),
          activeTerm: data.active_term || 'Term 1',
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
      // Dynamic column handling is fully operational here
      const row: any = { id: 'global' };
      if (payload.currentBlock !== undefined) row.current_block = payload.currentBlock;
      if (payload.currentWeek !== undefined) row.current_week = payload.currentWeek;
      if (payload.activeTerm !== undefined) row.active_term = payload.activeTerm;

      const { error } = await supabase.from('planner_settings').upsert(row);
      if (error) {
        // If PGRST204 missing columns, handle it
        if (error.code === 'PGRST204') {
          const match = error.message.match(/column '([^']+)'/);
          const colName = match ? match[1] : null;
          if (colName && colName in row) {
            delete row[colName];
            await supabase.from('planner_settings').upsert(row);
          }
        } else {
          console.error('Supabase planner settings save sync warning:', error);
        }
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// TOMORROW SPECIAL NOTES CONTROLLERS
// ----------------------------------------------------
router.get('/api/db/tomorrow-notes', async (req, res) => {
  try {
    let list = readJsonFile<any[]>(FILE_PATHS.tomorrow_notes, []);
    
    if (supabase) {
      const { data, error } = await supabase.from('tomorrow_notes').select('*');
      if (!error && data) {
        const parsed = data.map((row) => ({
          classId: row.class_id,
          targetDay: row.target_day,
          subject: row.subject,
          note: row.note,
          arabicNote: row.arabic_note,
          bagItem: row.bag_item,
          block: row.block,
          week: row.week,
          id: row.id,
        }));
        list = parsed;
        writeJsonFile(FILE_PATHS.tomorrow_notes, parsed);
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
    
    writeJsonFile(FILE_PATHS.tomorrow_notes, notes);

    if (supabase) {
      const rows = notes.map((item) => ({
        id: item.id || `${item.classId}-${item.targetDay}-${item.subject}-${item.week}`,
        class_id: item.classId,
        target_day: item.targetDay,
        subject: item.subject,
        note: item.note,
        arabic_note: item.arabicNote,
        bag_item: item.bagItem,
        block: item.block,
        week: item.week,
      }));
      
      const { error } = await supabase.from('tomorrow_notes').upsert(rows);
      if (error) console.error('Supabase tomorrow notes save sync warning:', error);
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
      
      const { error } = await query;
      if (error) console.error('Supabase tomorrow-notes delete-scope sync warning:', error);
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
    list = list.filter((x) => x.id !== id);
    writeJsonFile(FILE_PATHS.tomorrow_notes, list);

    if (supabase) {
      const { error } = await supabase.from('tomorrow_notes').delete().eq('id', id);
      if (error) console.error('Supabase tomorrow note delete sync warning:', error);
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

export default router;
