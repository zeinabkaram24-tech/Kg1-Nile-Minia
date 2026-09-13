import { ClassId, SchoolDay, PeriodSlot } from '../types';
import { CLASS_TIMETABLES, createEmptyWeekSchedule } from '../data/timetables';

const TIMETABLE_STORAGE_KEY = 'nile_planner_custom_timetables_v1';

export function getStoredTimetables(): Record<ClassId, Record<SchoolDay, PeriodSlot[]>> {
  try {
    const raw = localStorage.getItem(TIMETABLE_STORAGE_KEY);
    if (!raw) {
      return {
        G2A: createEmptyWeekSchedule(),
        G2B: createEmptyWeekSchedule(),
        G2C: createEmptyWeekSchedule(),
      };
    }
    const parsed = JSON.parse(raw);
    return {
      G2A: parsed.G2A || createEmptyWeekSchedule(),
      G2B: parsed.G2B || createEmptyWeekSchedule(),
      G2C: parsed.G2C || createEmptyWeekSchedule(),
    };
  } catch (e) {
    console.error('Failed to parse stored timetables:', e);
    return {
      G2A: createEmptyWeekSchedule(),
      G2B: createEmptyWeekSchedule(),
      G2C: createEmptyWeekSchedule(),
    };
  }
}

export function saveAllStoredTimetables(timetables: Record<ClassId, Record<SchoolDay, PeriodSlot[]>>) {
  try {
    localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(timetables));
    window.dispatchEvent(new Event('timetableUpdated'));
  } catch (e) {
    console.error('Failed to save timetables to localStorage:', e);
  }
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
  const empty: Record<ClassId, Record<SchoolDay, PeriodSlot[]>> = {
    G2A: createEmptyWeekSchedule(),
    G2B: createEmptyWeekSchedule(),
    G2C: createEmptyWeekSchedule(),
  };
  window.dispatchEvent(new Event('timetableUpdated'));
  return empty;
}
