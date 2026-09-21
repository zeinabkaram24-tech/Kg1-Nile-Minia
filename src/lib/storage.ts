import {
  ClassTimetable,
  WeeklyPlanItem,
  DailyFollowUp,
  StudentPersonalTask,
  SchoolMaterialFile,
  SchoolClass
} from '../types';
import {
  INITIAL_TIMETABLES,
  INITIAL_WEEKLY_PLANS,
  INITIAL_DAILY_FOLLOW_UPS,
  INITIAL_STUDENT_TASKS,
  INITIAL_MATERIALS
} from '../data/initialData';

const STORAGE_KEYS = {
  TIMETABLES: 'nile_minya_timetables_v3',
  WEEKLY_PLANS: 'nile_minya_weekly_plans_v1',
  DAILY_FOLLOW_UPS: 'nile_minya_daily_follow_ups_v1',
  STUDENT_TASKS: 'nile_minya_student_tasks_v1',
  COMPLETED_HW: 'nile_minya_completed_hw_v1',
  MATERIALS: 'nile_minya_materials_v4',
  CURRENT_BLOCK: 'nile_minya_cur_block',
  CURRENT_WEEK: 'nile_minya_cur_week',
  SELECTED_CLASS: 'nile_minya_cur_class',
  CURRENT_STUDENT: 'nile_minya_cur_student',
  UPLOADED_B1_W1: 'nile_minya_uploaded_b1_w1_v1'
};

const FILE_DB_NAME = 'nile_minya_file_store';
const FILE_STORE_NAME = 'files';
const LARGE_FILE_LIMIT = 180_000;

function openFileDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(FILE_DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(FILE_STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function putStoredFile(id: string, dataUrl: string): Promise<void> {
  const db = await openFileDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(FILE_STORE_NAME, 'readwrite');
    tx.objectStore(FILE_STORE_NAME).put(dataUrl, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  db.close();
}

async function getStoredFile(id: string): Promise<string | undefined> {
  const db = await openFileDb();
  if (!db) return undefined;
  return new Promise((resolve) => {
    const request = db.transaction(FILE_STORE_NAME, 'readonly').objectStore(FILE_STORE_NAME).get(id);
    request.onsuccess = () => { db.close(); resolve(request.result as string | undefined); };
    request.onerror = () => { db.close(); resolve(undefined); };
  });
}

async function persistLargeFiles<T extends { fileDataUrl?: string; id?: string; classId?: string }>(items: T[]): Promise<T[]> {
  return items.map((item) => {
    if (item.fileDataUrl && item.fileDataUrl.length > LARGE_FILE_LIMIT) {
      void putStoredFile(item.id || item.classId || 'unknown', item.fileDataUrl);
      return { ...item, fileDataUrl: undefined };
    }
    return item;
  });
}

export async function hydrateStoredFiles<T extends { fileDataUrl?: string; id?: string; classId?: string }>(items: T[]): Promise<T[]> {
  return Promise.all(items.map(async (item) => {
    if (item.fileDataUrl) return item;
    const fileDataUrl = await getStoredFile(item.id || item.classId || 'unknown');
    return fileDataUrl ? { ...item, fileDataUrl } : item;
  }));
}

export const getStoredTimetables = (): ClassTimetable[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TIMETABLES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load timetables from storage', e);
  }
  return INITIAL_TIMETABLES;
};

export const saveStoredTimetables = (data: ClassTimetable[]): void => {
  try {
    void persistLargeFiles(data).then((safeData) => localStorage.setItem(STORAGE_KEYS.TIMETABLES, JSON.stringify(safeData)));
  } catch (e) {
    console.error('Failed to save timetables to storage', e);
  }
};

export const getStoredWeeklyPlans = (): WeeklyPlanItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WEEKLY_PLANS);
    if (raw) {
      const stored = JSON.parse(raw) as WeeklyPlanItem[];
      if (!localStorage.getItem(STORAGE_KEYS.UPLOADED_B1_W1)) {
        const uploaded = INITIAL_WEEKLY_PLANS.filter((plan) => plan.id.includes('-w1-'));
        const existingIds = new Set(stored.map((plan) => plan.id));
        const merged = [...stored, ...uploaded.filter((plan) => !existingIds.has(plan.id))];
        localStorage.setItem(STORAGE_KEYS.UPLOADED_B1_W1, '1');
        return merged;
      }
      return stored;
    }
    localStorage.setItem(STORAGE_KEYS.UPLOADED_B1_W1, '1');
  } catch (e) {
    console.error('Failed to load weekly plans from storage', e);
  }
  return INITIAL_WEEKLY_PLANS;
};

export const saveStoredWeeklyPlans = (data: WeeklyPlanItem[]): void => {
  try {
    void persistLargeFiles(data).then((safeData) => localStorage.setItem(STORAGE_KEYS.WEEKLY_PLANS, JSON.stringify(safeData)));
  } catch (e) {
    console.error('Failed to save weekly plans to storage', e);
  }
};

export const getStoredDailyFollowUps = (): DailyFollowUp[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_FOLLOW_UPS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load daily follow-ups from storage', e);
  }
  return INITIAL_DAILY_FOLLOW_UPS;
};

export const saveStoredDailyFollowUps = (data: DailyFollowUp[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.DAILY_FOLLOW_UPS, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save daily follow-ups to storage', e);
  }
};

export const getStoredStudentTasks = (): StudentPersonalTask[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENT_TASKS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load student tasks from storage', e);
  }
  return INITIAL_STUDENT_TASKS;
};

export const saveStoredStudentTasks = (data: StudentPersonalTask[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENT_TASKS, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save student tasks to storage', e);
  }
};

export const getStoredCompletedHw = (): Record<string, boolean> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPLETED_HW);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load completed homework from storage', e);
  }
  return {};
};

export const saveStoredCompletedHw = (data: Record<string, boolean>): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.COMPLETED_HW, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save completed homework to storage', e);
  }
};

export const getStoredMaterials = (): SchoolMaterialFile[] => {
  try {
    // Purge any old cache keys that had dummy materials for Block 2 & Block 3
    localStorage.removeItem('nile_minya_materials_v1');
    localStorage.removeItem('nile_minya_materials_v2');

    const raw = localStorage.getItem(STORAGE_KEYS.MATERIALS);
    if (raw) {
      const list: SchoolMaterialFile[] = JSON.parse(raw);
      // Strictly remove any unrequested materials (PE, ethics/religion, art)
      // And strictly ensure Block 2, 3, 4 are empty unless user actually uploaded a custom file
      const cleanList = list.filter((m) => {
        if (['pe', 'ethics', 'religion', 'art'].includes(m.subjectId)) return false;
        return true;
      });
      return cleanList;
    }
  } catch (e) {
    console.error('Failed to load materials from storage', e);
  }
  // Default: INITIAL_MATERIALS only has block1 items; blocks 2, 3, 4 are completely empty
  return INITIAL_MATERIALS.filter((m) => m.blockId === 'block1');
};

export const saveStoredMaterials = (data: SchoolMaterialFile[]): void => {
  try {
    void persistLargeFiles(data).then((safeData) => localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(safeData)));
  } catch (e) {
    console.error('Failed to save materials to storage', e);
  }
};

export const exportAllDataToJSON = (): void => {
  const exportPayload = {
    version: '1.0',
    schoolName: 'مدرسة النيل المصرية الدولية - فرع المنيا',
    grade: 'KG 1 (KG1A, KG1B, KG1C, KG1D, KG1E)',
    exportDate: new Date().toISOString(),
    timetables: getStoredTimetables(),
    weeklyPlans: getStoredWeeklyPlans(),
    dailyFollowUps: getStoredDailyFollowUps(),
    studentTasks: getStoredStudentTasks(),
    materials: getStoredMaterials()
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `nile_minya_kg1_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

export const resetAllDataToDefault = (): void => {
  localStorage.removeItem(STORAGE_KEYS.TIMETABLES);
  localStorage.removeItem(STORAGE_KEYS.WEEKLY_PLANS);
  localStorage.removeItem(STORAGE_KEYS.UPLOADED_B1_W1);
  localStorage.removeItem(STORAGE_KEYS.DAILY_FOLLOW_UPS);
  localStorage.removeItem(STORAGE_KEYS.STUDENT_TASKS);
  localStorage.removeItem(STORAGE_KEYS.COMPLETED_HW);
  localStorage.removeItem(STORAGE_KEYS.MATERIALS);
};
