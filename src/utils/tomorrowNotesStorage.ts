import { ClassId, SchoolDay } from '../types';
import { TomorrowSpecialNote, SPECIAL_TEACHER_NOTES } from '../data/defaultWeeklyPlan';
import { WEEK2_SPECIAL_NOTES } from '../data/week2Plan';
import { WEEK3_SPECIAL_NOTES } from '../data/week3Plan';
import {
  supabase,
  isSupabaseConfigured,
  unpackHomeworkDetails,
  unpackClassworkDetails,
  packHomeworkDetails,
  packClassworkDetails,
  fetchServerPlannerDataShared,
  invalidateServerPlannerDataCache,
  readGlobalPlannerSettingsRow,
  patchGlobalPlannerSettings,
  withTimeout,
  appStorage,
} from '../lib/supabase';

export { WEEK3_SPECIAL_NOTES };

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
    block === 2 && (week === 1 || effectiveWeek === 1)
      ? SPECIAL_TEACHER_NOTES.filter(
          (n) => (n.classId === classId || (n.classId as any) === 'ALL') && n.targetDay === targetDay && n.block === 2 && (n.week === 1 || !n.week)
        )
      : block === 1 && (week === 3 || effectiveWeek === 3)
      ? WEEK3_SPECIAL_NOTES.filter(
          (n) => (n.classId === classId || (n.classId as any) === 'ALL') && n.targetDay === targetDay
        )
      : block === 1 && (week === 2 || effectiveWeek === 2)
      ? WEEK2_SPECIAL_NOTES.filter(
          (n) => (n.classId === classId || (n.classId as any) === 'ALL') && n.targetDay === targetDay
        )
      : block === 1 && (week === 1 || effectiveWeek === 1)
      ? SPECIAL_TEACHER_NOTES.filter(
          (n) => (n.classId === classId || (n.classId as any) === 'ALL') && n.targetDay === targetDay && (n.week === 1 || !n.week) && (n.block === 1 || !n.block)
        )
      : SPECIAL_TEACHER_NOTES.filter(
          (n) => (n.classId === classId || (n.classId as any) === 'ALL') && n.targetDay === targetDay && n.block === block && (n.week === week || !n.week)
        );

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
    // 1. Fetch from classwork table (include both classId and 'ALL')
    const cwQuery = supabase
      .from('classwork')
      .select('*')
      .in('class_id', [classId, 'ALL'])
      .eq('block', block)
      .eq('week', week)
      .eq('day', targetDay);

    // 2. Fetch from homework table (due tomorrow, include both classId and 'ALL')
    const hwQuery = supabase
      .from('homework')
      .select('*')
      .in('class_id', [classId, 'ALL'])
      .eq('block', block)
      .eq('week', week)
      .eq('due_day', targetDay);

    // 3. Fetch directly from tomorrow_notes table
    const tnQuery = supabase
      .from('tomorrow_notes')
      .select('*')
      .in('class_id', [classId, 'ALL'])
      .eq('block', block)
      .eq('week', week)
      .eq('target_day', targetDay);

    const [cwRes, hwRes, tnRes, pData, globalRow] = await Promise.all([
      withTimeout<any>(cwQuery, 8000, { data: null, error: { message: 'Classwork tomorrow query timeout' } }),
      withTimeout<any>(hwQuery, 8000, { data: null, error: { message: 'Homework tomorrow query timeout' } }),
      withTimeout<any>(tnQuery, 8000, { data: null, error: null }),
      fetchServerPlannerDataShared(),
      readGlobalPlannerSettingsRow(),
    ]);

    const cwList = cwRes?.data;
    if (cwRes?.error) console.warn('Error fetching classwork for tomorrow view:', cwRes.error);

    const hwList = hwRes?.data;
    if (hwRes?.error) console.warn('Error fetching homework for tomorrow view:', hwRes.error);

    const tnList = tnRes?.data;
    if (tnRes?.error) console.warn('Error fetching tomorrow_notes table:', tnRes.error);

    const dynamicNotes: TomorrowSpecialNote[] = [];

    // Map classwork to TomorrowSpecialNote
    if (cwList && Array.isArray(cwList)) {
      cwList.forEach((cw: any) => {
        const unpackedCw = unpackClassworkDetails(cw.details);
        const cleanDetails = unpackedCw.details || '';
        const isQuiz = /quiz|test|اختبار|امتحان|كويز|إملاء|dictation|تسميع|تقييم/.test((cw.title + ' ' + cleanDetails).toLowerCase());
        dynamicNotes.push({
          id: cw.id,
          classId: cw.class_id as ClassId,
          targetDay: cw.day as SchoolDay,
          subject: cw.subject,
          note: cw.title,
          arabicNote: cleanDetails || cw.title,
          bagItem: cw.pages || undefined,
          isQuiz,
          categoryType: isQuiz ? 'quiz' : 'note',
          block: cw.block,
          week: cw.week,
          pdfUrl: cw.pdf_url || unpackedCw.pdfUrl || undefined,
          linkUrl: cw.link_url || undefined,
          linkTitle: cw.link_title || undefined,
          links: Array.isArray(cw.links) && cw.links.length > 0 ? cw.links : unpackedCw.links,
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
          linkTitle: hw.link_title || unpacked.linkTitle || undefined,
          links: Array.isArray(hw.links) && hw.links.length > 0 ? hw.links : unpacked.links,
        });
      });
    }

    // Map rows from tomorrow_notes table
    if (tnList && Array.isArray(tnList)) {
      tnList.forEach((tn: any) => {
        const combined = ((tn.note || '') + ' ' + (tn.arabic_note || '')).toLowerCase();
        const isQuiz = /quiz|test|اختبار|امتحان|كويز|إملاء|dictation|تسميع|تقييم/.test(combined);
        dynamicNotes.push({
          id: tn.id,
          classId: tn.class_id as ClassId,
          targetDay: tn.target_day as SchoolDay,
          subject: tn.subject,
          note: tn.note,
          arabicNote: tn.arabic_note || tn.note,
          bagItem: tn.bag_item || undefined,
          isQuiz,
          categoryType: isQuiz ? 'quiz' : 'note',
          block: tn.block || block,
          week: tn.week || week,
          isCustom: true,
        });
      });
    }

    // 4. Merge notes from central planner-data endpoint
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

    // 5. Merge notes directly from Supabase global planner_settings JSONB
    try {
      const cloudNotes = globalRow?.settings?.tomorrow_special_notes;
      if (Array.isArray(cloudNotes)) {
        cloudNotes.forEach((n: any) => {
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
    } catch (err) {
      console.warn('Could not parse cloud tomorrow special notes:', err);
    }

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
      const globalRow = await readGlobalPlannerSettingsRow();
      const dbList = globalRow?.settings?.deleted_tomorrow_note_ids;
      if (Array.isArray(dbList)) {
        localList = Array.from(new Set([...localList, ...dbList]));
      }
    } catch (e) {
      console.warn('Error fetching deleted tomorrow note ids from Supabase:', e);
    }
  }

  try {
    const serverData = await fetchServerPlannerDataShared();
    if (serverData && Array.isArray(serverData.deletedTomorrowNoteIds)) {
      localList = Array.from(new Set([...localList, ...serverData.deletedTomorrowNoteIds]));
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
  invalidateServerPlannerDataCache();

  try {
    await fetch('/api/planner-data/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: noteId, type: 'tomorrowNotes' }),
    });
  } catch {}

  if (isSupabaseConfigured) {
    try {
      await Promise.all([
        patchGlobalPlannerSettings({ deleted_tomorrow_note_ids: currentList }),
        supabase.from('tomorrow_notes').delete().eq('id', noteId),
      ]);
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
    invalidateServerPlannerDataCache();
    if (isSupabaseConfigured) {
      try {
        await patchGlobalPlannerSettings({ deleted_tomorrow_note_ids: currentList });
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
  invalidateServerPlannerDataCache();

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
      // 1. Read and merge existing cloud + server tomorrow_special_notes so we never wipe notes from other devices/weeks
      const [globalRow, tnRes, serverData, deletedIds] = await Promise.all([
        readGlobalPlannerSettingsRow(),
        withTimeout<any>(supabase.from('tomorrow_notes').select('*'), 5000, { data: null, error: null }),
        fetchServerPlannerDataShared(true),
        getDeletedTomorrowNoteIds(),
      ]);

      const cloudNotes: TomorrowSpecialNote[] = Array.isArray(globalRow?.settings?.tomorrow_special_notes)
        ? globalRow!.settings.tomorrow_special_notes
        : [];
      const tableNotes: TomorrowSpecialNote[] = Array.isArray(tnRes?.data)
        ? tnRes.data.map((tn: any) => ({
            id: tn.id,
            classId: tn.class_id as ClassId,
            targetDay: tn.target_day as SchoolDay,
            subject: tn.subject,
            note: tn.note,
            arabicNote: tn.arabic_note || tn.note,
            bagItem: tn.bag_item || undefined,
            block: tn.block || 1,
            week: tn.week || 1,
            isQuiz: /quiz|test|اختبار|امتحان|كويز|إملاء|dictation|تسميع|تقييم/.test(
              ((tn.note || '') + ' ' + (tn.arabic_note || '')).toLowerCase()
            ),
            isCustom: true,
          }))
        : [];

      const serverNotes: TomorrowSpecialNote[] = Array.isArray(serverData?.tomorrowNotes) ? serverData.tomorrowNotes : [];
      const localNotes = getLocalCustomTomorrowNotes();
      const deletedSet = new Set(deletedIds);

      const getMergeKey = (n: TomorrowSpecialNote) =>
        n.id || `${n.classId || 'ALL'}-${n.targetDay}-${n.block || 1}-${n.week || 1}-${n.subject}-${(n.note || '').slice(0, 30)}`;

      const mergedMap = new Map<string, TomorrowSpecialNote>();
      [...tableNotes, ...cloudNotes, ...serverNotes, ...localNotes].forEach((n) => {
        if (!n) return;
        if (mode === 'replace' && notes.length > 0) {
          const targetClassId = notes[0].classId;
          if (
            Number(n.block || 1) === Number(block) &&
            Number(n.week || 1) === Number(week) &&
            (targetClassId === 'ALL' || n.classId === targetClassId)
          ) {
            return;
          }
        }
        const k = getMergeKey(n);
        mergedMap.set(k, { ...(mergedMap.get(k) || {}), ...n });
      });
      notes.forEach((n) => {
        if (n) mergedMap.set(getMergeKey(n), n);
      });

      const mergedList = Array.from(mergedMap.values()).filter((n) => {
        const key = getMergeKey(n);
        const semKey = getSemanticKey(n);
        return !deletedSet.has(key) && !(n.id && deletedSet.has(n.id)) && !(semKey && deletedSet.has(semKey));
      });

      saveLocalCustomTomorrowNotes(mergedList, 'replace');

      await patchGlobalPlannerSettings({ tomorrow_special_notes: mergedList });

      // Also upsert into tomorrow_notes table directly
      const tnRows = notes.filter((n) => n).map((n) => ({
        id: n.id || `tn-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        class_id: n.classId || 'ALL',
        target_day: n.targetDay,
        subject: n.subject,
        note: n.note || n.arabicNote || '',
        arabic_note: n.arabicNote || n.note || '',
        bag_item: n.bagItem || null,
        block: Number(n.block || block),
        week: Number(n.week || week),
      }));
      if (tnRows.length > 0) {
        const { error: tnUpsertErr } = await supabase.from('tomorrow_notes').upsert(tnRows, { onConflict: 'id' });
        if (tnUpsertErr) {
          console.warn('Supabase tomorrow_notes upsert warning:', tnUpsertErr.message);
        }
      }
    } catch (sbSettingErr) {
      console.warn('Supabase planner_settings tomorrow notes sync error:', sbSettingErr);
    }

    try {
      for (const note of notes) {
        const isQuiz = note.isQuiz || note.categoryType === 'quiz' || /quiz|test|اختبار|امتحان|كويز|إملاء|dictation|تسميع|تقييم/.test((note.note + ' ' + (note.arabicNote || '')).toLowerCase());
        const targetId = note.id || `tomorrow-${isQuiz ? 'hw' : 'cw'}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const targetClasses: ClassId[] =
          (note.classId as any) === 'ALL'
            ? ['KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E', 'G2A', 'G2B', 'G2C']
            : [note.classId as ClassId];

        for (const classId of targetClasses) {
          const rowId = (note.classId as any) === 'ALL' ? `${targetId}-${classId}` : targetId;
          if (isQuiz) {
            const row = {
              id: rowId,
              class_id: classId,
              assigned_day: 'Sunday',
              due_day: note.targetDay,
              subject: note.subject,
              task: note.arabicNote || note.note || '',
              details: packHomeworkDetails(note.bagItem || undefined, note.pdfUrl, note.links, note.linkTitle) || null,
              completed: false,
              priority: 'urgent',
              block: note.block || block,
              week: note.week || week,
              link_url: note.linkUrl || null,
              link_title: note.linkTitle || null,
              links: Array.isArray(note.links) ? note.links : [],
            };

            const { error } = await supabase.from('homework').upsert(row, { onConflict: 'id' });
            if (error) console.warn('Supabase homework mirror warning in saveTomorrowNotes:', error.message);
          } else {
            const row = {
              id: rowId,
              class_id: classId,
              day: note.targetDay,
              period: 1,
              subject: note.subject,
              title: note.note || '',
              details: packClassworkDetails(note.arabicNote || note.note || '', note.pdfUrl, note.links) || null,
              pages: note.bagItem || null,
              completed: false,
              block: note.block || block,
              week: note.week || week,
              link_url: note.linkUrl || null,
              link_title: note.linkTitle || null,
              links: Array.isArray(note.links) ? note.links : [],
            };

            const { error } = await supabase.from('classwork').upsert(row, { onConflict: 'id' });
            if (error) console.warn('Supabase classwork mirror warning in saveTomorrowNotes:', error.message);
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

// Reconcile custom tomorrow notes bidirectionally between /api/planner-data, local cache, tomorrow_notes table, and global planner_settings
export async function syncTomorrowNotesWithCloud(): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const [deletedIds, serverData, globalRow, tnRes] = await Promise.all([
      getDeletedTomorrowNoteIds(),
      fetchServerPlannerDataShared(),
      readGlobalPlannerSettingsRow(),
      withTimeout<any>(supabase.from('tomorrow_notes').select('*'), 6000, { data: null, error: null }),
    ]);

    const deletedSet = new Set(deletedIds);
    const serverNotes: TomorrowSpecialNote[] = Array.isArray(serverData?.tomorrowNotes) ? serverData.tomorrowNotes : [];
    const cloudNotes: TomorrowSpecialNote[] = Array.isArray(globalRow?.settings?.tomorrow_special_notes)
      ? globalRow!.settings.tomorrow_special_notes
      : [];
    const tableNotes: TomorrowSpecialNote[] = Array.isArray(tnRes?.data)
      ? tnRes.data.map((tn: any) => ({
          id: tn.id,
          classId: tn.class_id as ClassId,
          targetDay: tn.target_day as SchoolDay,
          subject: tn.subject,
          note: tn.note,
          arabicNote: tn.arabic_note || tn.note,
          bagItem: tn.bag_item || undefined,
          block: tn.block || 1,
          week: tn.week || 1,
          isQuiz: /quiz|test|اختبار|امتحان|كويز|إملاء|dictation|تسميع|تقييم/.test(
            ((tn.note || '') + ' ' + (tn.arabic_note || '')).toLowerCase()
          ),
          isCustom: true,
        }))
      : [];
    const localNotes = getLocalCustomTomorrowNotes();

    const getKey = (n: TomorrowSpecialNote) =>
      n.id || `${n.classId || 'ALL'}-${n.targetDay}-${n.block || 1}-${n.week || 1}-${n.subject}-${(n.note || '').slice(0, 30)}`;

    const isDeleted = (n: TomorrowSpecialNote) => {
      const key = getKey(n);
      const semKey = getSemanticKey(n);
      return deletedSet.has(key) || Boolean(n.id && deletedSet.has(n.id)) || Boolean(semKey && deletedSet.has(semKey));
    };

    const mergedMap = new Map<string, TomorrowSpecialNote>();
    const addNote = (n: TomorrowSpecialNote) => {
      if (!n || isDeleted(n)) return;
      const k = getKey(n);
      mergedMap.set(k, { ...(mergedMap.get(k) || {}), ...n });
    };
    tableNotes.forEach(addNote);
    localNotes.forEach(addNote);
    serverNotes.forEach(addNote);
    cloudNotes.forEach(addNote);

    const merged = Array.from(mergedMap.values());
    if (merged.length === 0) return;

    saveLocalCustomTomorrowNotes(merged, 'replace');

    const cloudKeys = new Set(cloudNotes.map(getKey));
    const missingInCloudSettings = merged.some((n) => !cloudKeys.has(getKey(n)));
    if (missingInCloudSettings) {
      await patchGlobalPlannerSettings({ tomorrow_special_notes: merged });
    }

    const tableKeys = new Set(tableNotes.map((t) => t.id).filter(Boolean));
    const missingInTable = merged.filter((n) => n.id && !tableKeys.has(n.id));
    if (missingInTable.length > 0) {
      const tnRows = missingInTable.map((n) => ({
        id: n.id!,
        class_id: n.classId || 'ALL',
        target_day: n.targetDay,
        subject: n.subject,
        note: n.note || n.arabicNote || '',
        arabic_note: n.arabicNote || n.note || '',
        bag_item: n.bagItem || null,
        block: Number(n.block || 1),
        week: Number(n.week || 1),
      }));
      await supabase.from('tomorrow_notes').upsert(tnRows, { onConflict: 'id' });
    }

    const serverKeys = new Set(serverNotes.map(getKey));
    const missingOnServer = merged.filter((n) => !serverKeys.has(getKey(n)));
    if (missingOnServer.length > 0) {
      invalidateServerPlannerDataCache();
      fetch('/api/planner-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-skip-cloud-mirror': '1' },
        body: JSON.stringify({ tomorrowNotes: missingOnServer, mode: 'merge' }),
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('Non-fatal syncTomorrowNotesWithCloud notice:', err);
  }
}
