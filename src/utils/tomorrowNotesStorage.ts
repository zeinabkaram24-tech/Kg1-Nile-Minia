import { ClassId, SchoolDay } from '../types';
import { TomorrowSpecialNote, SPECIAL_TEACHER_NOTES } from '../data/defaultWeeklyPlan';
import { WEEK2_SPECIAL_NOTES } from '../data/week2Plan';
import { supabase, isSupabaseConfigured, unpackHomeworkDetails, appStorage } from '../lib/supabase';

export const WEEK3_SPECIAL_NOTES: TomorrowSpecialNote[] = [];

const LOCAL_CUSTOM_TOMORROW_KEY = 'tomorrow_special_notes_custom_v3';

export function getLocalCustomTomorrowNotes(): TomorrowSpecialNote[] {
  try {
    const raw = appStorage.getItem(LOCAL_CUSTOM_TOMORROW_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveLocalCustomTomorrowNotes(notes: TomorrowSpecialNote[], mode: 'merge' | 'replace' = 'merge') {
  try {
    if (mode === 'replace') {
      appStorage.setItem(LOCAL_CUSTOM_TOMORROW_KEY, JSON.stringify(notes));
      return;
    }
    const current = getLocalCustomTomorrowNotes();
    const map = new Map<string, TomorrowSpecialNote>();
    current.forEach((n) => {
      const key = n.id || `${n.classId || 'ALL'}-${n.targetDay}-${n.subject}-${(n.note || '').slice(0, 30)}`;
      map.set(key, n);
    });
    notes.forEach((n) => {
      const key = n.id || `${n.classId || 'ALL'}-${n.targetDay}-${n.subject}-${(n.note || '').slice(0, 30)}`;
      map.set(key, n);
    });
    appStorage.setItem(LOCAL_CUSTOM_TOMORROW_KEY, JSON.stringify(Array.from(map.values())));
  } catch {}
}

// In-memory fallback cache
const IN_MEMORY_NOTES_CACHE: Record<string, string> = {};
const LISTENERS: Array<() => void> = [];

export function notifyTomorrowNotesListeners() {
  LISTENERS.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.warn('Listener error in tomorrow notes:', e);
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nile-tomorrow-notes-updated'));
  }
}

export function subscribeToTomorrowNotes(callback: () => void): () => void {
  LISTENERS.push(callback);
  return () => {
    const idx = LISTENERS.indexOf(callback);
    if (idx !== -1) LISTENERS.splice(idx, 1);
  };
}

export function isDisallowedMathNote(n: TomorrowSpecialNote): boolean {
  const text = ((n.note || '') + ' ' + (n.arabicNote || '') + ' ' + (n.bagItem || '')).toLowerCase();
  return (
    text.includes('white board') ||
    text.includes('whiteboard') ||
    text.includes('سبورة بيضاء') ||
    text.includes('100 chart') ||
    text.includes('مخطط المائة') ||
    text.includes('مخطط الـ 100') ||
    (text.includes('كشكول الماث') && !n.isQuiz)
  );
}

// Get tomorrow notes for a specific day, class, block, and week
export async function getTomorrowNotesForDay(
  block: number,
  week: number,
  classId: ClassId,
  targetDay: SchoolDay
): Promise<TomorrowSpecialNote[]> {
  const effectiveWeek = targetDay === 'Sunday' && week > 1 ? week - 1 : week;

  // Base official notes for Block/Week or EffectiveWeek from static files
  const baseNotes: TomorrowSpecialNote[] =
    block === 1 && (week === 3 || effectiveWeek === 3)
      ? WEEK3_SPECIAL_NOTES.filter(
          (n) => (n.classId === classId || (n.classId as any) === 'ALL') && n.targetDay === targetDay
        )
      : block === 1 && (week === 2 || effectiveWeek === 2)
      ? WEEK2_SPECIAL_NOTES.filter(
          (n) => (n.classId === classId || (n.classId as any) === 'ALL') && n.targetDay === targetDay
        )
      : block === 1 && (week === 1 || effectiveWeek === 1)
      ? SPECIAL_TEACHER_NOTES.filter(
          (n) => (n.classId === classId || (n.classId as any) === 'ALL') && n.targetDay === targetDay && (n.week === 1 || !n.week)
        )
      : [];

  // Load custom notes from localStorage
  const localCustom = getLocalCustomTomorrowNotes().filter(
    (n) =>
      (n.classId === classId || (n.classId as any) === 'ALL') &&
      n.targetDay === targetDay &&
      (n.block || 1) === block &&
      (n.week || 1) === week
  );

  const deletedIds = await getDeletedTomorrowNoteIds();

  if (!isSupabaseConfigured) {
    const map = new Map<string, TomorrowSpecialNote>();
    baseNotes.forEach((n) => {
      const key = n.id || `${n.targetDay}-${n.subject}-${(n.note || '').slice(0, 30)}`;
      map.set(key, n);
    });
    // Custom notes override base notes
    localCustom.forEach((n) => {
      const key = n.id || `${n.targetDay}-${n.subject}-${(n.note || '').slice(0, 30)}`;
      map.set(key, n);
    });
    const merged = Array.from(map.values());
    const filtered = merged.filter((n) => {
      if (isDisallowedMathNote(n)) return false;
      const key = n.id || `${n.targetDay}-${n.subject}-${(n.note || '').slice(0, 30)}`;
      if (deletedIds.includes(key) || (n.id && deletedIds.includes(n.id))) {
        return false;
      }
      return true;
    });
    return filtered;
  }

  try {
    // 1. Fetch from classwork table
    const { data: cwList, error: cwErr } = await supabase
      .from('classwork')
      .select('*')
      .eq('class_id', classId)
      .eq('block', block)
      .eq('week', week)
      .eq('day', targetDay);

    if (cwErr) console.warn('Error fetching classwork for tomorrow view:', cwErr);

    // 2. Fetch from homework table (due tomorrow)
    const { data: hwList, error: hwErr } = await supabase
      .from('homework')
      .select('*')
      .eq('class_id', classId)
      .eq('block', block)
      .eq('week', week)
      .eq('due_day', targetDay);

    if (hwErr) console.warn('Error fetching homework for tomorrow view:', hwErr);

    const dynamicNotes: TomorrowSpecialNote[] = [];

    // Map classwork to TomorrowSpecialNote
    if (cwList && Array.isArray(cwList)) {
      cwList.forEach((cw: any) => {
        const isQuiz = /quiz|test|اختبار|امتحان|كويز|إملاء|dictation|تسميع|تقييم/.test((cw.title + ' ' + (cw.details || '')).toLowerCase());
        dynamicNotes.push({
          id: cw.id,
          classId: cw.class_id as ClassId,
          targetDay: cw.day as SchoolDay,
          subject: cw.subject,
          note: cw.title,
          arabicNote: cw.details || cw.title,
          bagItem: cw.pages || undefined,
          isQuiz,
          categoryType: isQuiz ? 'quiz' : 'note',
          block: cw.block,
          week: cw.week,
          linkUrl: cw.link_url || undefined,
          linkTitle: cw.link_title || undefined,
        });
      });
    }

    // Map homework to TomorrowSpecialNote
    if (hwList && Array.isArray(hwList)) {
      hwList.forEach((hw: any) => {
        const unpacked = unpackHomeworkDetails(hw.details);
        dynamicNotes.push({
          id: hw.id,
          classId: hw.class_id as ClassId,
          targetDay: hw.due_day as SchoolDay,
          subject: hw.subject,
          note: hw.task,
          arabicNote: unpacked.details || hw.task,
          bagItem: hw.pages || undefined,
          isQuiz: true,
          categoryType: 'quiz',
          block: hw.block,
          week: hw.week,
          pdfUrl: unpacked.pdfUrl || undefined,
          linkUrl: hw.link_url || undefined,
        });
      });
    }

    // 3. Fetch from central planner-data endpoint
    try {
      const res = await fetch('/api/planner-data');
      if (res.ok) {
        const pData = await res.json();
        if (pData && Array.isArray(pData.tomorrowNotes)) {
          pData.tomorrowNotes.forEach((n: any) => {
            if (
              (n.classId === classId || n.classId === 'ALL') &&
              n.targetDay === targetDay &&
              (n.block || 1) === block &&
              (n.week || 1) === week
            ) {
              dynamicNotes.push(n);
            }
          });
        }
      }
    } catch {}

    // Merge base notes, local custom notes, and dynamic notes
    const map = new Map<string, TomorrowSpecialNote>();
    baseNotes.forEach((n) => {
      const key = n.id || `${n.targetDay}-${n.subject}-${(n.note || '').slice(0, 30)}`;
      map.set(key, n);
    });

    localCustom.forEach((n) => {
      if (
        (n.classId === classId || (n.classId as any) === 'ALL') &&
        n.targetDay === targetDay &&
        (n.block || 1) === block &&
        (n.week || 1) === week
      ) {
        const key = n.id || `${n.targetDay}-${n.subject}-${(n.note || '').slice(0, 30)}`;
        map.set(key, { ...n, isCustom: true });
      }
    });

    dynamicNotes.forEach((n) => {
      const key = n.id || `${n.targetDay}-${n.subject}-${(n.note || '').slice(0, 30)}`;
      map.set(key, n);
    });

    const deletedIds = await getDeletedTomorrowNoteIds();
    const merged = Array.from(map.values());
    const filtered = merged.filter((n) => {
      if (isDisallowedMathNote(n)) return false;
      const key = n.id || `${n.targetDay}-${n.subject}-${(n.note || '').slice(0, 30)}`;
      const semKey = getSemanticKey(n);
      if (
        deletedIds.includes(key) ||
        (n.id && deletedIds.includes(n.id)) ||
        (semKey && deletedIds.includes(semKey))
      ) {
        return false;
      }
      return true;
    });

    return filtered;
  } catch (err) {
    console.error('Error loading dynamic tomorrow notes from database tables:', err);
    return baseNotes;
  }
}

export function getDeletedTomorrowNoteIdsSync(): string[] {
  let localList: string[] = [];
  try {
    const raw = appStorage.getItem('nile_deleted_tomorrow_note_ids_v3');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        localList = Array.from(new Set([...localList, ...parsed]));
      }
    }
  } catch {}

  try {
    const cached = IN_MEMORY_NOTES_CACHE['deleted_tomorrow_note_ids'];
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        localList = Array.from(new Set([...localList, ...parsed]));
      }
    }
  } catch {}

  return localList;
}

export async function getDeletedTomorrowNoteIds(): Promise<string[]> {
  let localList = getDeletedTomorrowNoteIdsSync();

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('planner_settings')
        .select('value')
        .eq('key', 'deleted_tomorrow_note_ids')
        .maybeSingle();
      if (!error && data && data.value) {
        const dbList = JSON.parse(data.value);
        if (Array.isArray(dbList)) {
          localList = Array.from(new Set([...localList, ...dbList]));
        }
      }
    } catch (e) {
      console.warn('Error fetching deleted tomorrow note ids from Supabase:', e);
    }
  }

  try {
    const res = await fetch('/api/planner-data');
    if (res.ok) {
      const serverData = await res.json();
      if (Array.isArray(serverData.deletedTomorrowNoteIds)) {
        localList = Array.from(new Set([...localList, ...serverData.deletedTomorrowNoteIds]));
      }
    }
  } catch {}

  appStorage.setItem('nile_deleted_tomorrow_note_ids_v3', JSON.stringify(localList));
  IN_MEMORY_NOTES_CACHE['deleted_tomorrow_note_ids'] = JSON.stringify(localList);
  return localList;
}

export async function saveDeletedTomorrowNoteId(noteId: string): Promise<void> {
  if (!noteId) return;
  const currentList = await getDeletedTomorrowNoteIds();
  if (!currentList.includes(noteId)) {
    currentList.push(noteId);
  }
  appStorage.setItem('nile_deleted_tomorrow_note_ids_v3', JSON.stringify(currentList));
  IN_MEMORY_NOTES_CACHE['deleted_tomorrow_note_ids'] = JSON.stringify(currentList);

  try {
    await fetch('/api/planner-data/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: noteId, type: 'tomorrowNotes' }),
    });
  } catch {}

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('planner_settings')
        .upsert({
          key: 'deleted_tomorrow_note_ids',
          value: JSON.stringify(currentList),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });
    } catch (e) {
      console.warn('Error saving deleted tomorrow note id to Supabase:', e);
    }
  }
  notifyTomorrowNotesListeners();
}

export async function removeDeletedTomorrowNoteId(noteId: string): Promise<void> {
  if (!noteId) return;
  let currentList = await getDeletedTomorrowNoteIds();
  if (currentList.includes(noteId)) {
    currentList = currentList.filter((id) => id !== noteId);
    appStorage.setItem('nile_deleted_tomorrow_note_ids_v3', JSON.stringify(currentList));
    IN_MEMORY_NOTES_CACHE['deleted_tomorrow_note_ids'] = JSON.stringify(currentList);
    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('planner_settings')
          .upsert({
            key: 'deleted_tomorrow_note_ids',
            value: JSON.stringify(currentList),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'key' });
      } catch (e) {
        console.warn('Error removing deleted tomorrow note id from Supabase:', e);
      }
    }
  }
}

export async function removeDeletedPlannerItemId(itemId: string): Promise<void> {
  await removeDeletedTomorrowNoteId(itemId);
}

// Save tomorrow notes directly inside classwork or homework table
export async function saveTomorrowNotes(
  block: number,
  week: number,
  notes: TomorrowSpecialNote[],
  mode: 'merge' | 'replace' = 'merge'
): Promise<void> {
  for (const note of notes) {
    if (note.id) {
      await removeDeletedTomorrowNoteId(note.id);
    }
    const semKey = getSemanticKey(note);
    if (semKey) {
      await removeDeletedTomorrowNoteId(semKey);
    }
  }

  saveLocalCustomTomorrowNotes(notes, mode);

  try {
    await fetch('/api/planner-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tomorrowNotes: notes, mode }),
    });
  } catch (err) {
    console.warn('Central server sync error in saveTomorrowNotes:', err);
  }

  if (isSupabaseConfigured) {
    try {
      for (const note of notes) {
        const isQuiz = note.isQuiz || note.categoryType === 'quiz' || /quiz|test|اختبار|امتحان|كويز|إملاء|dictation|تسميع|تقييم/.test((note.note + ' ' + (note.arabicNote || '')).toLowerCase());
        const targetId = note.id || `tomorrow-${isQuiz ? 'hw' : 'cw'}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const targetClasses: ClassId[] =
          (note.classId as any) === 'ALL'
            ? ['G2A', 'G2B', 'G2C']
            : [note.classId as ClassId];

        for (const classId of targetClasses) {
          const rowId = (note.classId as any) === 'ALL' ? `${targetId}-${classId}` : targetId;
          if (isQuiz) {
            // Prepare row for homework table
            const row = {
              id: rowId,
              class_id: classId,
              assigned_day: 'Sunday',
              due_day: note.targetDay,
              subject: note.subject,
              task: note.arabicNote || note.note || '',
              details: note.bagItem || null,
              completed: false,
              priority: 'urgent',
              block: note.block || block,
              week: note.week || week,
              link_url: note.linkUrl || null,
            };

            await supabase.from('homework').upsert(row, { onConflict: 'id' });
          } else {
            // Prepare row for classwork table
            const row = {
              id: rowId,
              class_id: classId,
              day: note.targetDay,
              period: 1,
              subject: note.subject,
              title: note.note || '',
              details: note.arabicNote || note.note || '',
              pages: note.bagItem || null,
              completed: false,
              block: note.block || block,
              week: note.week || week,
              link_url: note.linkUrl || null,
              link_title: note.linkTitle || null,
            };

            await supabase.from('classwork').upsert(row, { onConflict: 'id' });
          }
        }
      }
    } catch (err) {
      console.error('Error saving tomorrow notes as classwork/homework entries in Supabase:', err);
    }
  }

  notifyTomorrowNotesListeners();
}

export function getSemanticKey(n: TomorrowSpecialNote): string {
  const normSubject = (n.subject || '').trim().toLowerCase();
  const text = (n.arabicNote || n.note || '').toLowerCase().replace(/[🚨📝🎒]/g, '').trim();

  // 1. Social studies homework submission
  if (normSubject.includes('social') || normSubject.includes('دراسات')) {
    if (text.includes('واجب') || text.includes('تسليم') || text.includes('شيت')) {
      return `social-hw-submission-${n.targetDay}`;
    }
  }

  // 2. Science booklet submission or tools
  if (normSubject.includes('science') || normSubject.includes('علوم') || normSubject.includes('ساينس')) {
    if (text.includes('بوكلت') || text.includes('بوكليت') || text.includes('تسليم') || text.includes('تجميع') || n.id?.includes('hw-submit')) {
      return `science-booklet-submission-${n.targetDay}`;
    }
    if (text.includes('أدوات') || text.includes('tools') || text.includes('خيط') || text.includes('كروشيه')) {
      return `science-tools-${n.targetDay}`;
    }
  }

  // 3. French Quiz
  if (normSubject.includes('french') || normSubject.includes('فرنش') || normSubject.includes('فرنسي')) {
    if (text.includes('quiz') || text.includes('كويز') || text.includes('اختبار')) {
      return `french-quiz-${n.targetDay}`;
    }
  }

  // 4. Arabic specific tasks
  if (normSubject.includes('arabic') || normSubject.includes('عربي')) {
    if (text.includes('إملاء') || text.includes('dictation')) {
      return `arabic-dictation-${n.targetDay}`;
    }
    if (text.includes('تسميع') || text.includes('آيات') || text.includes('recitation')) {
      return `arabic-recitation-${n.targetDay}`;
    }
    if (text.includes('مهنة أبي') || text.includes('نص استماع')) {
      return `arabic-listening-${n.targetDay}`;
    }
    if (text.includes('المكتبة') || text.includes('مكتبة')) {
      return `arabic-library-${n.targetDay}`;
    }
  }

  // 5. Mathematics tests
  if (normSubject.includes('math') || normSubject.includes('رياضيات')) {
    if (text.includes('test') || text.includes('اختبار') || text.includes('unit 1')) {
      return `math-test-${n.targetDay}`;
    }
  }

  // Default: group by subject and normalized first words
  const cleanWordSeq = text.replace(/[^a-z0-9\u0600-\u06FF]/gi, ' ').split(/\s+/).filter(Boolean).slice(0, 4).join('-');
  return `${normSubject}-${cleanWordSeq || n.id || 'note'}-${n.targetDay}`;
}

