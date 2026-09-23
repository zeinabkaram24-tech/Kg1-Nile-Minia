import { ClassId, SchoolDay, PeriodSlot } from '../types';
import { CLASS_TIMETABLES, createEmptyWeekSchedule } from '../data/timetables';
import { supabaseSaveAllTimetables, supabaseClearAllTimetables, supabaseFetchTimetables } from '../services/supabaseService';

const TIMETABLE_STORAGE_KEY = 'nile_planner_custom_timetables_v1';

function sanitizeSchedule(schedule?: Record<SchoolDay, PeriodSlot[]>): Record<SchoolDay, PeriodSlot[]> | null {
  if (!schedule) return null;
  const cleaned: Record<SchoolDay, PeriodSlot[]> = createEmptyWeekSchedule();
  for (const day of Object.keys(schedule) as SchoolDay[]) {
    if (Array.isArray(schedule[day])) {
      cleaned[day] = schedule[day].filter((slot) => slot && slot.period >= 1 && slot.period <= 6);
    }
  }
  return cleaned;
}

function hasAnySlots(schedule?: Record<SchoolDay, PeriodSlot[]>): boolean {
  if (!schedule) return false;
  return Object.values(schedule).some((slots) => Array.isArray(slots) && slots.length > 0);
}

export function getStoredTimetables(): Record<ClassId, Record<SchoolDay, PeriodSlot[]>> {
  try {
    const raw = localStorage.getItem(TIMETABLE_STORAGE_KEY);
    if (!raw) {
      return {
        KG1A: CLASS_TIMETABLES.KG1A || createEmptyWeekSchedule(),
        KG1B: CLASS_TIMETABLES.KG1B || createEmptyWeekSchedule(),
        KG1C: CLASS_TIMETABLES.KG1C || createEmptyWeekSchedule(),
        KG1D: CLASS_TIMETABLES.KG1D || createEmptyWeekSchedule(),
        KG1E: CLASS_TIMETABLES.KG1E || createEmptyWeekSchedule(),
        G2A: CLASS_TIMETABLES.G2A || createEmptyWeekSchedule(),
        G2B: CLASS_TIMETABLES.G2B || createEmptyWeekSchedule(),
        G2C: CLASS_TIMETABLES.G2C || createEmptyWeekSchedule(),
      };
    }
    const parsed = JSON.parse(raw);
    const getCleaned = (classId: ClassId) => {
      const sanitized = sanitizeSchedule(parsed[classId]);
      return hasAnySlots(sanitized) ? sanitized! : (CLASS_TIMETABLES[classId] || createEmptyWeekSchedule());
    };

    return {
      KG1A: getCleaned('KG1A'),
      KG1B: getCleaned('KG1B'),
      KG1C: getCleaned('KG1C'),
      KG1D: getCleaned('KG1D'),
      KG1E: getCleaned('KG1E'),
      G2A: getCleaned('G2A'),
      G2B: getCleaned('G2B'),
      G2C: getCleaned('G2C'),
    };
  } catch (e) {
    console.error('Failed to parse stored timetables:', e);
    return CLASS_TIMETABLES;
  }
}

export function saveAllStoredTimetables(timetables: Record<ClassId, Record<SchoolDay, PeriodSlot[]>>) {
  try {
    localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(timetables));
    window.dispatchEvent(new Event('timetableUpdated'));
    // Asynchronously sync to Supabase
    supabaseSaveAllTimetables(timetables).catch((err) => {
      console.warn('Background Supabase timetable save warning:', err);
    });
  } catch (e) {
    console.error('Failed to save timetables to localStorage:', e);
  }
}

export async function syncTimetablesFromCloud(): Promise<Record<ClassId, Record<SchoolDay, PeriodSlot[]>> | null> {
  try {
    const cloudTimetables = await supabaseFetchTimetables();
    if (cloudTimetables && Object.keys(cloudTimetables).length > 0) {
      localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(cloudTimetables));
      window.dispatchEvent(new Event('timetableUpdated'));
      return cloudTimetables;
    }
  } catch (err) {
    console.warn('Failed to sync timetables from cloud:', err);
  }
  return null;
}

export function saveClassTimetable(
  classId: ClassId,
  schedule: Record<SchoolDay, PeriodSlot[]>
): Record<ClassId, Record<SchoolDay, PeriodSlot[]>> {
  const current = getStoredTimetables();
  current[classId] = schedule;
  saveAllStoredTimetables(current);
  return current;
}

export function updatePeriodSlot(
  classId: ClassId,
  day: SchoolDay,
  slot: PeriodSlot
): Record<ClassId, Record<SchoolDay, PeriodSlot[]>> {
  const all = getStoredTimetables();
  const classSchedule = all[classId] || createEmptyWeekSchedule();
  const daySlots = classSchedule[day] ? [...classSchedule[day]] : [];

  const existingIdx = daySlots.findIndex((s) => s.period === slot.period);
  if (existingIdx >= 0) {
    daySlots[existingIdx] = slot;
  } else {
    daySlots.push(slot);
    daySlots.sort((a, b) => a.period - b.period);
  }

  classSchedule[day] = daySlots;
  all[classId] = classSchedule;
  saveAllStoredTimetables(all);
  return all;
}

export function deletePeriodSlot(
  classId: ClassId,
  day: SchoolDay,
  period: number
): Record<ClassId, Record<SchoolDay, PeriodSlot[]>> {
  const all = getStoredTimetables();
  const classSchedule = all[classId] || createEmptyWeekSchedule();
  if (classSchedule[day]) {
    classSchedule[day] = classSchedule[day].filter((s) => s.period !== period);
  }
  all[classId] = classSchedule;
  saveAllStoredTimetables(all);
  return all;
}

export function clearClassTimetable(classId: ClassId): Record<ClassId, Record<SchoolDay, PeriodSlot[]>> {
  const all = getStoredTimetables();
  all[classId] = createEmptyWeekSchedule();
  saveAllStoredTimetables(all);
  return all;
}

export function clearAllStoredTimetables(): Record<ClassId, Record<SchoolDay, PeriodSlot[]>> {
  localStorage.removeItem(TIMETABLE_STORAGE_KEY);
  supabaseClearAllTimetables().catch((err) => console.warn(err));
  const empty: Record<ClassId, Record<SchoolDay, PeriodSlot[]>> = {
    KG1A: createEmptyWeekSchedule(),
    KG1B: createEmptyWeekSchedule(),
    KG1C: createEmptyWeekSchedule(),
    KG1D: createEmptyWeekSchedule(),
    KG1E: createEmptyWeekSchedule(),
    G2A: createEmptyWeekSchedule(),
    G2B: createEmptyWeekSchedule(),
    G2C: createEmptyWeekSchedule(),
  };
  window.dispatchEvent(new Event('timetableUpdated'));
  return empty;
}
