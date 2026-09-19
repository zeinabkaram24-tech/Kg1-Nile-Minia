import { isSupabaseConfigured } from '../lib/supabase';
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
    priority: (row.priority as 'normal' | 'urgent') || undefined,
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
    priority: entry.priority || null,
    block: entry.block || 1,
    week: entry.week || 1,
    link_url: entry.linkUrl || null,
    link_title: entry.linkTitle || null,
    links: entry.links || [],
  };
}

// ----------------------------------------------------------------------
// Automatic Initial Seeding Mechanism (Delegated to Backend)
// ----------------------------------------------------------------------
export async function seedInitialDataIfNeeded(force = false): Promise<{
  seeded: boolean;
  classworkCount: number;
  homeworkCount: number;
  timetablesCount: number;
  message?: string;
}> {
  try {
    const res = await fetch('/api/db/classwork');
    const json = await res.json();
    
    if (json.success && json.data && json.data.length === 0) {
      // Seed classwork
      await fetch('/api/db/classwork/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify((initialData.classwork as any[]).map((c: any) => mapEntryToClassworkRow(c))),
      });

      // Seed homework
      await fetch('/api/db/homework/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify((initialData.homework as any[]).map((h: any) => mapEntryToHomeworkRow(h))),
      });

      // Seed timetables
      await fetch('/api/db/timetables/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initialData.timetables),
      });

      return {
        seeded: true,
        classworkCount: initialData.classwork.length,
        homeworkCount: initialData.homework.length,
        timetablesCount: Object.keys(initialData.timetables).length,
      };
    }
    return { seeded: false, classworkCount: 0, homeworkCount: 0, timetablesCount: 0 };
  } catch (err: any) {
    console.error('Error in client seeding proxy:', err);
    return { seeded: false, classworkCount: 0, homeworkCount: 0, timetablesCount: 0, message: err.message };
  }
}

// ----------------------------------------------------------------------
// Classwork CRUD operations
// ----------------------------------------------------------------------
export async function supabaseFetchClasswork(classId?: ClassId): Promise<ClassworkEntry[]> {
  try {
    const res = await fetch('/api/db/classwork');
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      const entries = json.data.map(mapClassworkRowToEntry);
      if (classId) {
        return entries.filter((c) => c.classId === classId);
      }
      return entries;
    }
    return [];
  } catch (e) {
    console.error('Fetch classwork backend error:', e);
    return [];
  }
}

export async function supabaseUpsertClasswork(entry: ClassworkEntry): Promise<{ success: boolean; error?: any }> {
  try {
    const row = mapEntryToClassworkRow(entry);
    const res = await fetch('/api/db/classwork/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    const json = await res.json();
    return { success: json.success, error: json.error };
  } catch (e: any) {
    console.error('Upsert classwork backend error:', e);
    return { success: false, error: e.message };
  }
}

export async function supabaseDeleteClasswork(id: string): Promise<{ success: boolean; error?: any }> {
  try {
    const res = await fetch(`/api/db/classwork/${id}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    return { success: json.success, error: json.error };
  } catch (e: any) {
    console.error('Delete classwork backend error:', e);
    return { success: false, error: e.message };
  }
}

export async function supabaseBatchInsertClasswork(entries: ClassworkEntry[]): Promise<{ count: number; error?: any }> {
  try {
    const rows = entries.map(mapEntryToClassworkRow);
    const res = await fetch('/api/db/classwork/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    });
    const json = await res.json();
    return { count: json.success ? rows.length : 0, error: json.error };
  } catch (e: any) {
    console.error('Batch classwork backend error:', e);
    return { count: 0, error: e.message };
  }
}

export async function supabaseClearAllClasswork(): Promise<boolean> {
  try {
    const res = await fetch('/api/db/classwork/clear', {
      method: 'POST',
    });
    const json = await res.json();
    return json.success;
  } catch (e) {
    console.error('Clear classwork backend error:', e);
    return false;
  }
}

// ----------------------------------------------------------------------
// Homework CRUD operations
// ----------------------------------------------------------------------
export async function supabaseFetchHomework(classId?: ClassId): Promise<HomeworkEntry[]> {
  try {
    const res = await fetch('/api/db/homework');
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      const entries = json.data.map(mapHomeworkRowToEntry);
      if (classId) {
        return entries.filter((h) => h.classId === classId);
      }
      return entries;
    }
    return [];
  } catch (e) {
    console.error('Fetch homework backend error:', e);
    return [];
  }
}

export async function supabaseUpsertHomework(entry: HomeworkEntry): Promise<{ success: boolean; error?: any }> {
  try {
    const row = mapEntryToHomeworkRow(entry);
    const res = await fetch('/api/db/homework/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    const json = await res.json();
    return { success: json.success, error: json.error };
  } catch (e: any) {
    console.error('Upsert homework backend error:', e);
    return { success: false, error: e.message };
  }
}

export async function supabaseDeleteHomework(id: string): Promise<{ success: boolean; error?: any }> {
  try {
    const res = await fetch(`/api/db/homework/${id}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    return { success: json.success, error: json.error };
  } catch (e: any) {
    console.error('Delete homework backend error:', e);
    return { success: false, error: e.message };
  }
}

export async function supabaseBatchInsertHomework(entries: HomeworkEntry[]): Promise<{ count: number; error?: any }> {
  try {
    const rows = entries.map(mapEntryToHomeworkRow);
    const res = await fetch('/api/db/homework/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    });
    const json = await res.json();
    return { count: json.success ? rows.length : 0, error: json.error };
  } catch (e: any) {
    console.error('Batch homework backend error:', e);
    return { count: 0, error: e.message };
  }
}

export async function supabaseDeleteClassworkForScope(
  classIds: string[],
  block: number,
  week: number,
  subject?: string
): Promise<boolean> {
  try {
    const res = await fetch('/api/db/classwork/delete-scope', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId: classIds[0], block, week, subject }),
    });
    const json = await res.json();
    return json.success;
  } catch (e) {
    console.error('Delete classwork scope backend error:', e);
    return false;
  }
}

export async function supabaseDeleteHomeworkForScope(
  classIds: string[],
  block: number,
  week: number,
  subject?: string
): Promise<boolean> {
  try {
    const res = await fetch('/api/db/homework/delete-scope', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId: classIds[0], block, week, subject }),
    });
    const json = await res.json();
    return json.success;
  } catch (e) {
    console.error('Delete homework scope backend error:', e);
    return false;
  }
}

export async function supabaseDeleteTomorrowNotesForScope(
  classIds: string[],
  block: number,
  week: number,
  subject?: string
): Promise<boolean> {
  try {
    const res = await fetch('/api/db/tomorrow-notes/delete-scope', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId: classIds[0], block, week, subject }),
    });
    const json = await res.json();
    return json.success;
  } catch (e) {
    console.error('Delete tomorrow notes scope backend error:', e);
    return false;
  }
}

export async function supabaseClearAllHomework(): Promise<boolean> {
  try {
    const res = await fetch('/api/db/homework/clear', {
      method: 'POST',
    });
    const json = await res.json();
    return json.success;
  } catch (e) {
    console.error('Clear homework backend error:', e);
    return false;
  }
}

// ----------------------------------------------------------------------
// Timetables CRUD operations
// ----------------------------------------------------------------------
export async function supabaseFetchTimetables(): Promise<Record<ClassId, Record<SchoolDay, PeriodSlot[]>> | null> {
  try {
    const res = await fetch('/api/db/timetables');
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (e) {
    console.error('Fetch timetables backend error:', e);
    return null;
  }
}

export async function supabaseSaveClassTimetable(
  classId: ClassId,
  schedule: Record<SchoolDay, PeriodSlot[]>
): Promise<boolean> {
  try {
    const res = await fetch('/api/db/timetables/save-class', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId, schedule }),
    });
    const json = await res.json();
    return json.success;
  } catch (e) {
    console.error('Save class timetable backend error:', e);
    return false;
  }
}

export async function supabaseSaveAllTimetables(
  timetables: Record<ClassId, Record<SchoolDay, PeriodSlot[]>>
): Promise<boolean> {
  try {
    const res = await fetch('/api/db/timetables/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(timetables),
    });
    const json = await res.json();
    return json.success;
  } catch (e) {
    console.error('Save all timetables backend error:', e);
    return false;
  }
}

export async function supabaseClearAllTimetables(): Promise<boolean> {
  try {
    const res = await fetch('/api/db/timetables/clear', {
      method: 'POST',
    });
    const json = await res.json();
    return json.success;
  } catch (e) {
    console.error('Clear all timetables backend error:', e);
    return false;
  }
}

// ----------------------------------------------------------------------
// Student Progress CRUD operations
// ----------------------------------------------------------------------
export async function supabaseFetchStudentProgress(
  studentName: string
): Promise<{ completedClassworkIds: string[]; completedHomeworkIds: string[]; classId?: ClassId } | null> {
  try {
    const res = await fetch('/api/db/student-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentName }),
    });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (e) {
    console.error('Fetch student progress backend error:', e);
    return null;
  }
}

export async function supabaseSaveStudentProgress(
  studentName: string,
  completedClassworkIds: string[],
  completedHomeworkIds: string[],
  classId?: ClassId
): Promise<boolean> {
  try {
    const res = await fetch('/api/db/student-progress/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentName, completedClassworkIds, completedHomeworkIds, classId }),
    });
    const json = await res.json();
    return json.success;
  } catch (e) {
    console.error('Save student progress backend error:', e);
    return false;
  }
}

// ----------------------------------------------------------------------
// Materials CRUD operations (Delegated to Backend Sync Server)
// ----------------------------------------------------------------------
export async function supabaseFetchMaterials(): Promise<MaterialItem[]> {
  try {
    const res = await fetch('/api/materials');
    const json = await res.json();
    return json.success ? json.materials : [];
  } catch (e) {
    console.error('Fetch materials backend error:', e);
    return [];
  }
}

export async function supabaseUpsertMaterial(item: MaterialItem): Promise<{ success: boolean; error?: any }> {
  try {
    const copy = { ...item };
    if (copy.fileData && copy.fileUrl) {
      delete copy.fileData;
    }
    const res = await fetch('/api/materials/single', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(copy),
    });
    const json = await res.json();
    return { success: json.success, error: json.error };
  } catch (e: any) {
    console.error('Upsert material backend error:', e);
    return { success: false, error: e.message };
  }
}

export async function supabaseDeleteMaterial(id: string): Promise<{ success: boolean; error?: any }> {
  try {
    const res = await fetch(`/api/materials/${id}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    return { success: json.success, error: json.error };
  } catch (e: any) {
    console.error('Delete material backend error:', e);
    return { success: false, error: e.message };
  }
}

export async function supabaseClearAllMaterials(): Promise<boolean> {
  try {
    const res = await fetch('/api/materials/clear', {
      method: 'POST',
    });
    const json = await res.json();
    return json.success;
  } catch (e) {
    console.error('Clear materials backend error:', e);
    return false;
  }
}

// ----------------------------------------------------------------------
// Supabase Storage Bucket File Upload & Management (Proxied to Backend Disk Storage)
// ----------------------------------------------------------------------
export async function supabaseUploadMaterialFile(
  file: File | Blob,
  originalFileName: string
): Promise<{ success: boolean; publicUrl?: string; filePath?: string; error?: any }> {
  try {
    const id = `mat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const safeFileName = originalFileName.endsWith('.pdf') ? originalFileName : `${originalFileName}.pdf`;

    const res = await fetch('/api/materials/single', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        fileName: safeFileName,
        fileSize: file.size,
        fileData: base64,
        fileUrl: `/api/materials/pdf/${id}`,
        uploadedAt: new Date().toISOString(),
      }),
    });

    const json = await res.json();
    if (json.success) {
      return {
        success: true,
        publicUrl: `/api/materials/pdf/${id}`,
        filePath: `${id}.pdf`,
      };
    }
    return { success: false, error: json.error || 'Failed to save upload' };
  } catch (e: any) {
    console.error('Upload file backend error:', e);
    return { success: false, error: e.message };
  }
}

export async function supabaseDeleteMaterialFile(filePathOrUrl: string): Promise<boolean> {
  try {
    const id = filePathOrUrl.split('/').pop()?.replace('.pdf', '') || '';
    if (id) {
      const res = await fetch(`/api/materials/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      return json.success;
    }
    return false;
  } catch (e) {
    console.error('Delete material file backend error:', e);
    return false;
  }
}

// ----------------------------------------------------------------------
// Planner Settings CRUD operations
// ----------------------------------------------------------------------
export async function supabaseFetchPlannerSettings(): Promise<{
  currentBlock: number;
  currentWeek: number;
  activeTerm?: string;
} | null> {
  try {
    const res = await fetch('/api/db/planner-settings');
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (e) {
    console.error('Fetch planner settings backend error:', e);
    return null;
  }
}

export async function supabaseSavePlannerSettings(settings: {
  currentBlock: number;
  currentWeek: number;
  activeTerm?: string;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/db/planner-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const json = await res.json();
    return json.success;
  } catch (e) {
    console.error('Save settings backend error:', e);
    return false;
  }
}

// ----------------------------------------------------------------------
// Tomorrow Notes CRUD operations
// ----------------------------------------------------------------------
export async function supabaseFetchTomorrowNotes(): Promise<any[]> {
  try {
    const res = await fetch('/api/db/tomorrow-notes');
    const json = await res.json();
    return json.success ? json.data : [];
  } catch (e) {
    console.error('Fetch tomorrow notes backend error:', e);
    return [];
  }
}

export async function supabaseSaveTomorrowNotes(notes: any[]): Promise<boolean> {
  try {
    const res = await fetch('/api/db/tomorrow-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notes),
    });
    const json = await res.json();
    return json.success;
  } catch (e) {
    console.error('Save tomorrow notes backend error:', e);
    return false;
  }
}

export async function supabaseDeleteTomorrowNote(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/db/tomorrow-notes/${id}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    return json.success;
  } catch (e) {
    console.error('Delete tomorrow note backend error:', e);
    return false;
  }
}
