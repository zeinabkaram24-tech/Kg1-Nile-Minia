import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ClassId, SchoolDay, ClassworkEntry, HomeworkEntry, PeriodSlot, SubjectName, MaterialItem } from '../types';
import initialData from '../data/initialData.json';

// DB row types matching Supabase schema
export interface MaterialRow {
  id: string;
  file_name: string;
  file_size: number;
  file_data: string | null;
  file_url: string | null;
  block: number;
  section: string;
  class_id: string | null;
  title: string | null;
  category: string | null;
  notes: string | null;
  uploaded_at: string;
}
export interface ClassworkRow {
  id: string;
  class_id: string;
  day: string;
  period: number;
  subject: string;
  title: string;
  details: string | null;
  pages: string | null;
  completed: boolean;
  block: number | null;
  week: number | null;
  link_url: string | null;
  link_title: string | null;
  links: any;
  created_at?: string;
}

export interface HomeworkRow {
  id: string;
  class_id: string;
  assigned_day: string;
  due_day: string;
  subject: string;
  task: string;
  details: string | null;
  pages: string | null;
  completed: boolean;
  priority: string | null;
  block: number | null;
  week: number | null;
  link_url: string | null;
  link_title: string | null;
  links: any;
  created_at?: string;
}

export interface TimetableRow {
  class_id: string;
  schedule: Record<SchoolDay, PeriodSlot[]>;
  updated_at?: string;
}

export interface StudentProgressRow {
  student_name: string;
  class_id: string | null;
  completed_classwork_ids: string[];
  completed_homework_ids: string[];
  last_active: number;
  updated_at?: string;
}

// Convert DB row to TypeScript model
function mapClassworkRowToEntry(row: ClassworkRow): ClassworkEntry {
  return {
    id: row.id,
    classId: row.class_id as ClassId,
    day: row.day as SchoolDay,
    period: row.period,
    subject: row.subject as SubjectName,
    title: row.title,
    details: row.details || undefined,
    pages: row.pages || undefined,
    completed: Boolean(row.completed),
    block: row.block || undefined,
    week: row.week || undefined,
    linkUrl: row.link_url || undefined,
    linkTitle: row.link_title || undefined,
    links: Array.isArray(row.links) ? row.links : undefined,
  };
}

function mapEntryToClassworkRow(entry: ClassworkEntry): Partial<ClassworkRow> {
  return {
    id: entry.id,
    class_id: entry.classId,
    day: entry.day,
    period: entry.period,
    subject: entry.subject,
    title: entry.title,
    details: entry.details || null,
    pages: entry.pages || null,
    completed: Boolean(entry.completed),
    block: entry.block || 1,
    week: entry.week || 1,
    link_url: entry.linkUrl || null,
    link_title: entry.linkTitle || null,
    links: entry.links || [],
  };
}

function mapHomeworkRowToEntry(row: HomeworkRow): HomeworkEntry {
  return {
    id: row.id,
    classId: row.class_id as ClassId,
    assignedDay: row.assigned_day as SchoolDay,
    dueDay: row.due_day as SchoolDay,
    subject: row.subject as SubjectName,
    task: row.task,
    details: row.details || undefined,
    pages: row.pages || undefined,
    completed: Boolean(row.completed),
    priority: (row.priority as 'normal' | 'urgent') || 'normal',
    block: row.block || undefined,
    week: row.week || undefined,
    linkUrl: row.link_url || undefined,
    linkTitle: row.link_title || undefined,
    links: Array.isArray(row.links) ? row.links : undefined,
  };
}

function mapEntryToHomeworkRow(entry: HomeworkEntry): Partial<HomeworkRow> {
  return {
    id: entry.id,
    class_id: entry.classId,
    assigned_day: entry.assignedDay,
    due_day: entry.dueDay,
    subject: entry.subject,
    task: entry.task,
    details: entry.details || null,
    pages: entry.pages || null,
    completed: Boolean(entry.completed),
    priority: entry.priority || 'normal',
    block: entry.block || 1,
    week: entry.week || 1,
    link_url: entry.linkUrl || null,
    link_title: entry.linkTitle || null,
    links: entry.links || [],
  };
}

// ----------------------------------------------------------------------
// Automatic Initial Seeding Mechanism
// ----------------------------------------------------------------------
export async function seedInitialDataIfNeeded(force = false): Promise<{
  seeded: boolean;
  classworkCount: number;
  homeworkCount: number;
  timetablesCount: number;
  message?: string;
}> {
  if (!isSupabaseConfigured) {
    return {
      seeded: false,
      classworkCount: 0,
      homeworkCount: 0,
      timetablesCount: 0,
      message: 'Supabase is not configured yet in environment variables.',
    };
  }

  try {
    // 1. Check if classwork table has records
    const { count: cwCount, error: cwErr } = await supabase
      .from('classwork')
      .select('id', { count: 'exact', head: true });

    if (cwErr) {
      console.warn('Error checking classwork count during seeding check:', cwErr);
    }

    const { count: hwCount, error: hwErr } = await supabase
      .from('homework')
      .select('id', { count: 'exact', head: true });

    if (hwErr) {
      console.warn('Error checking homework count during seeding check:', hwErr);
    }

    const needClasswork = force || !cwCount || cwCount === 0;
    const needHomework = force || !hwCount || hwCount === 0;

    let seededCw = 0;
    let seededHw = 0;
    let seededTt = 0;

    // Seed classwork
    if (needClasswork && Array.isArray(initialData.classwork) && initialData.classwork.length > 0) {
      const rows = initialData.classwork.map((c: any) => mapEntryToClassworkRow(c));
      const { error } = await supabase.from('classwork').upsert(rows, { onConflict: 'id' });
      if (!error) {
        seededCw = rows.length;
      } else {
        console.error('Failed to seed classwork:', error);
      }
    }

    // Seed homework
    if (needHomework && Array.isArray(initialData.homework) && initialData.homework.length > 0) {
      const rows = initialData.homework.map((h: any) => mapEntryToHomeworkRow(h));
      const { error } = await supabase.from('homework').upsert(rows, { onConflict: 'id' });
      if (!error) {
        seededHw = rows.length;
      } else {
        console.error('Failed to seed homework:', error);
      }
    }

    // Seed timetables
    if (initialData.timetables) {
      const timetableRows = Object.entries(initialData.timetables).map(([classId, schedule]) => ({
        class_id: classId,
        schedule,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from('timetables').upsert(timetableRows, { onConflict: 'class_id' });
      if (!error) {
        seededTt = timetableRows.length;
      } else {
        console.error('Failed to seed timetables:', error);
      }
    }

    return {
      seeded: seededCw > 0 || seededHw > 0 || seededTt > 0,
      classworkCount: seededCw,
      homeworkCount: seededHw,
      timetablesCount: seededTt,
    };
  } catch (err: any) {
    console.error('Error running seedInitialDataIfNeeded:', err);
    return {
      seeded: false,
      classworkCount: 0,
      homeworkCount: 0,
      timetablesCount: 0,
      message: err.message,
    };
  }
}

// ----------------------------------------------------------------------
// Classwork CRUD operations
// ----------------------------------------------------------------------
export async function supabaseFetchClasswork(classId?: ClassId): Promise<ClassworkEntry[]> {
  if (!isSupabaseConfigured) return [];
  try {
    let query = supabase.from('classwork').select('*').order('period', { ascending: true });
    if (classId) {
      query = query.eq('class_id', classId);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Supabase fetch classwork error:', error);
      return [];
    }
    return (data || []).map(mapClassworkRowToEntry);
  } catch (e) {
    console.error('Supabase fetch classwork exception:', e);
    return [];
  }
}

export async function supabaseUpsertClasswork(entry: ClassworkEntry): Promise<{ success: boolean; error?: any }> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase not configured' };
  try {
    const row = mapEntryToClassworkRow(entry);
    const { error } = await supabase.from('classwork').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('Supabase upsert classwork error:', error);
      return { success: false, error };
    }
    return { success: true };
  } catch (e: any) {
    console.error('Supabase upsert classwork exception:', e);
    return { success: false, error: e.message };
  }
}

export async function supabaseDeleteClasswork(id: string): Promise<{ success: boolean; error?: any }> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase not configured' };
  try {
    const { error } = await supabase.from('classwork').delete().eq('id', id);
    if (error) {
      console.error('Supabase delete classwork error:', error);
      return { success: false, error };
    }
    return { success: true };
  } catch (e: any) {
    console.error('Supabase delete classwork exception:', e);
    return { success: false, error: e.message };
  }
}

export async function supabaseBatchInsertClasswork(entries: ClassworkEntry[]): Promise<{ count: number; error?: any }> {
  if (!isSupabaseConfigured || entries.length === 0) return { count: 0 };
  try {
    const rows = entries.map(mapEntryToClassworkRow);
    const { error } = await supabase.from('classwork').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('Supabase batch insert classwork error:', error);
      return { count: 0, error };
    }
    return { count: rows.length };
  } catch (e: any) {
    console.error('Supabase batch insert classwork exception:', e);
    return { count: 0, error: e.message };
  }
}

export async function supabaseClearAllClasswork(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('classwork').delete().neq('id', '___non_existent___');
    return !error;
  } catch (e) {
    console.error('Failed to clear classwork:', e);
    return false;
  }
}

// ----------------------------------------------------------------------
// Homework CRUD operations
// ----------------------------------------------------------------------
export async function supabaseFetchHomework(classId?: ClassId): Promise<HomeworkEntry[]> {
  if (!isSupabaseConfigured) return [];
  try {
    let query = supabase.from('homework').select('*').order('created_at', { ascending: false });
    if (classId) {
      query = query.eq('class_id', classId);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Supabase fetch homework error:', error);
      return [];
    }
    return (data || []).map(mapHomeworkRowToEntry);
  } catch (e) {
    console.error('Supabase fetch homework exception:', e);
    return [];
  }
}

export async function supabaseUpsertHomework(entry: HomeworkEntry): Promise<{ success: boolean; error?: any }> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase not configured' };
  try {
    const row = mapEntryToHomeworkRow(entry);
    const { error } = await supabase.from('homework').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('Supabase upsert homework error:', error);
      return { success: false, error };
    }
    return { success: true };
  } catch (e: any) {
    console.error('Supabase upsert homework exception:', e);
    return { success: false, error: e.message };
  }
}

export async function supabaseDeleteHomework(id: string): Promise<{ success: boolean; error?: any }> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase not configured' };
  try {
    const { error } = await supabase.from('homework').delete().eq('id', id);
    if (error) {
      console.error('Supabase delete homework error:', error);
      return { success: false, error };
    }
    return { success: true };
  } catch (e: any) {
    console.error('Supabase delete homework exception:', e);
    return { success: false, error: e.message };
  }
}

export async function supabaseBatchInsertHomework(entries: HomeworkEntry[]): Promise<{ count: number; error?: any }> {
  if (!isSupabaseConfigured || entries.length === 0) return { count: 0 };
  try {
    const rows = entries.map(mapEntryToHomeworkRow);
    const { error } = await supabase.from('homework').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('Supabase batch insert homework error:', error);
      return { count: 0, error };
    }
    return { count: rows.length };
  } catch (e: any) {
    console.error('Supabase batch insert homework exception:', e);
    return { count: 0, error: e.message };
  }
}

export async function supabaseClearAllHomework(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('homework').delete().neq('id', '___non_existent___');
    return !error;
  } catch (e) {
    console.error('Failed to clear homework:', e);
    return false;
  }
}

// ----------------------------------------------------------------------
// Timetables CRUD operations
// ----------------------------------------------------------------------
export async function supabaseFetchTimetables(): Promise<Record<ClassId, Record<SchoolDay, PeriodSlot[]>> | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from('timetables').select('*');
    if (error) {
      console.error('Supabase fetch timetables error:', error);
      return null;
    }
    if (!data || data.length === 0) return null;

    const result: any = {};
    for (const row of data as TimetableRow[]) {
      if (row.class_id && row.schedule) {
        result[row.class_id] = row.schedule;
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch (e) {
    console.error('Supabase fetch timetables exception:', e);
    return null;
  }
}

export async function supabaseSaveClassTimetable(
  classId: ClassId,
  schedule: Record<SchoolDay, PeriodSlot[]>
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('timetables').upsert(
      {
        class_id: classId,
        schedule,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'class_id' }
    );
    return !error;
  } catch (e) {
    console.error('Supabase save class timetable exception:', e);
    return false;
  }
}

export async function supabaseSaveAllTimetables(
  timetables: Record<ClassId, Record<SchoolDay, PeriodSlot[]>>
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const rows = Object.entries(timetables).map(([classId, schedule]) => ({
      class_id: classId,
      schedule,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('timetables').upsert(rows, { onConflict: 'class_id' });
    return !error;
  } catch (e) {
    console.error('Supabase save all timetables exception:', e);
    return false;
  }
}

export async function supabaseClearAllTimetables(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('timetables').delete().neq('class_id', '___dummy___');
    return !error;
  } catch (e) {
    console.error('Supabase clear timetables exception:', e);
    return false;
  }
}

// ----------------------------------------------------------------------
// Student Progress CRUD operations
// ----------------------------------------------------------------------
export async function supabaseFetchStudentProgress(
  studentName: string
): Promise<{ completedClassworkIds: string[]; completedHomeworkIds: string[]; classId?: ClassId } | null> {
  if (!isSupabaseConfigured || !studentName.trim()) return null;
  try {
    const cleanName = studentName.trim().toLowerCase();
    const { data, error } = await supabase
      .from('student_progress')
      .select('*')
      .eq('student_name', cleanName)
      .maybeSingle();

    if (error || !data) return null;
    return {
      completedClassworkIds: Array.isArray(data.completed_classwork_ids) ? data.completed_classwork_ids : [],
      completedHomeworkIds: Array.isArray(data.completed_homework_ids) ? data.completed_homework_ids : [],
      classId: data.class_id as ClassId,
    };
  } catch (e) {
    console.error('Supabase fetch student progress exception:', e);
    return null;
  }
}

export async function supabaseSaveStudentProgress(
  studentName: string,
  completedCwIds: string[],
  completedHwIds: string[],
  classId?: ClassId
): Promise<boolean> {
  if (!isSupabaseConfigured || !studentName.trim()) return false;
  try {
    const cleanName = studentName.trim().toLowerCase();
    const { error } = await supabase.from('student_progress').upsert(
      {
        student_name: cleanName,
        class_id: classId || null,
        completed_classwork_ids: completedCwIds,
        completed_homework_ids: completedHwIds,
        last_active: Date.now(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_name' }
    );
    return !error;
  } catch (e) {
    console.error('Supabase save student progress exception:', e);
    return false;
  }
}

// ----------------------------------------------------------------------
// Materials CRUD operations (Mobile ⇄ Laptop Real-time Sync)
// ----------------------------------------------------------------------
export async function supabaseFetchMaterials(): Promise<MaterialItem[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch materials warning:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      fileName: row.file_name,
      fileSize: row.file_size,
      fileData: row.file_data || undefined,
      fileUrl: row.file_url || undefined,
      block: row.block,
      section: row.section,
      classId: row.class_id || undefined,
      title: row.title || undefined,
      category: row.category || undefined,
      notes: row.notes || undefined,
      uploadedAt: row.uploaded_at,
    }));
  } catch (e) {
    console.error('Supabase fetch materials exception:', e);
    return [];
  }
}

export async function supabaseUpsertMaterial(item: MaterialItem): Promise<{ success: boolean; error?: any }> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase not configured' };
  try {
    const row = {
      id: item.id,
      file_name: item.fileName || 'document.pdf',
      file_size: typeof item.fileSize === 'number' ? item.fileSize : parseInt(String(item.fileSize || 0), 10) || 0,
      file_data: item.fileData || null,
      file_url: item.fileUrl || null,
      block: item.block || 1,
      section: item.section || 'Main sheets',
      class_id: item.classId || null,
      title: item.title || null,
      category: item.category || null,
      notes: item.notes || null,
      uploaded_at: item.uploadedAt || new Date().toISOString(),
    };
    const { error } = await supabase.from('materials').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase upsert material error:', error);
      return { success: false, error };
    }
    return { success: true };
  } catch (e: any) {
    console.error('Supabase upsert material exception:', e);
    return { success: false, error: e.message };
  }
}

export async function supabaseDeleteMaterial(id: string): Promise<{ success: boolean; error?: any }> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase not configured' };
  try {
    const { error } = await supabase.from('materials').delete().eq('id', id);
    if (error) {
      console.warn('Supabase delete material error:', error);
      return { success: false, error };
    }
    return { success: true };
  } catch (e: any) {
    console.error('Supabase delete material exception:', e);
    return { success: false, error: e.message };
  }
}

export async function supabaseClearAllMaterials(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('materials').delete().neq('id', '___dummy___');
    return !error;
  } catch (e) {
    console.error('Supabase clear all materials exception:', e);
    return false;
  }
}

