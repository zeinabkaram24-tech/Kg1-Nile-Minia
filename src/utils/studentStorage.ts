import { ClassId, UserMode, UserProfile } from '../types';
import {
  saveStudentProgressToDb,
  fetchStudentProgressFromDb,
  fetchKnownStudentsFromDb,
  isSupabaseConfigured,
} from '../lib/supabase';

const PROFILE_KEY = 'nile_planner_active_user_profile_v1';
const KNOWN_STUDENTS_KEY = 'nile_planner_known_students_list_v1';
const PROGRESS_PREFIX = 'nile_student_progress_v2_';

export interface StudentProgressData {
  studentName: string;
  classId?: ClassId;
  completedClassworkIds: string[];
  completedHomeworkIds: string[];
  lastActive: number;
}

// Global in-memory storage to completely eliminate localStorage usage
const IN_MEMORY_STUDENT_STORAGE: Record<string, string> = {};

export function normalizeStudentName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getActiveUserProfile(): UserProfile | null {
  try {
    const raw = IN_MEMORY_STUDENT_STORAGE[PROFILE_KEY];
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading user profile', e);
    return null;
  }
}

export function setActiveUserProfile(profile: UserProfile | null): void {
  try {
    if (!profile) {
      delete IN_MEMORY_STUDENT_STORAGE[PROFILE_KEY];
    } else {
      IN_MEMORY_STUDENT_STORAGE[PROFILE_KEY] = JSON.stringify(profile);
      if (profile.mode === 'student' && profile.studentName) {
        addKnownStudent(profile.studentName, profile.classId);
      }
    }
  } catch (e) {
    console.error('Error saving user profile', e);
  }
}

export function getKnownStudents(): { name: string; classId?: ClassId; lastActive: number }[] {
  try {
    const raw = IN_MEMORY_STUDENT_STORAGE[KNOWN_STUDENTS_KEY];
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function addKnownStudent(name: string, classId?: ClassId): void {
  const cleanName = name.trim();
  if (!cleanName) return;
  try {
    const list = getKnownStudents();
    const existingIdx = list.findIndex(
      (s) => normalizeStudentName(s.name) === normalizeStudentName(cleanName)
    );
    if (existingIdx >= 0) {
      list[existingIdx].lastActive = Date.now();
      if (classId) list[existingIdx].classId = classId;
    } else {
      list.unshift({
        name: cleanName,
        classId,
        lastActive: Date.now(),
      });
    }
    IN_MEMORY_STUDENT_STORAGE[KNOWN_STUDENTS_KEY] = JSON.stringify(list.slice(0, 10));
  } catch (e) {
    console.error('Error adding known student', e);
  }
}

export function removeKnownStudent(name: string): void {
  try {
    const list = getKnownStudents().filter(
      (s) => normalizeStudentName(s.name) !== normalizeStudentName(name)
    );
    IN_MEMORY_STUDENT_STORAGE[KNOWN_STUDENTS_KEY] = JSON.stringify(list);
    delete IN_MEMORY_STUDENT_STORAGE[PROGRESS_PREFIX + normalizeStudentName(name)];
  } catch (e) {
    console.error('Error removing known student', e);
  }
}

export function getStudentProgress(studentName: string): StudentProgressData {
  const norm = normalizeStudentName(studentName);
  try {
    const raw = IN_MEMORY_STUDENT_STORAGE[PROGRESS_PREFIX + norm];
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading student progress', e);
  }

  return {
    studentName: studentName.trim(),
    completedClassworkIds: [],
    completedHomeworkIds: [],
    lastActive: Date.now(),
  };
}

export function saveStudentProgress(
  studentName: string,
  completedClassworkIds: string[],
  completedHomeworkIds: string[],
  classId?: ClassId
): void {
  const cleanName = studentName.trim();
  if (!cleanName) return;
  const norm = normalizeStudentName(cleanName);

  const data: StudentProgressData = {
    studentName: cleanName,
    classId,
    completedClassworkIds,
    completedHomeworkIds,
    lastActive: Date.now(),
  };

  try {
    IN_MEMORY_STUDENT_STORAGE[PROGRESS_PREFIX + norm] = JSON.stringify(data);
    addKnownStudent(cleanName, classId);
    // Sync with Supabase in background
    if (isSupabaseConfigured) {
      saveStudentProgressToDb(cleanName, completedClassworkIds, completedHomeworkIds, classId);
    }
  } catch (e) {
    console.error('Error saving student progress', e);
  }
}

export async function syncStudentProgressFromDb(studentName: string): Promise<StudentProgressData> {
  const local = getStudentProgress(studentName);
  if (!isSupabaseConfigured) return local;

  try {
    const remote = await fetchStudentProgressFromDb(studentName);
    if (remote) {
      saveStudentProgress(
        remote.studentName,
        remote.completedClassworkIds,
        remote.completedHomeworkIds,
        remote.classId
      );
      return remote;
    }
  } catch (e) {
    console.warn('Could not sync student progress from Supabase:', e);
  }
  return local;
}

const GUEST_PROGRESS_KEY = 'nile_planner_guest_progress_v2';

export function getGuestProgress(): { completedClassworkIds: string[]; completedHomeworkIds: string[] } {
  try {
    const raw = IN_MEMORY_STUDENT_STORAGE[GUEST_PROGRESS_KEY];
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        completedClassworkIds: Array.isArray(parsed.completedClassworkIds) ? parsed.completedClassworkIds : [],
        completedHomeworkIds: Array.isArray(parsed.completedHomeworkIds) ? parsed.completedHomeworkIds : [],
      };
    }
  } catch (e) {
    console.error('Error reading guest progress', e);
  }
  return { completedClassworkIds: [], completedHomeworkIds: [] };
}

export function saveGuestProgress(
  completedClassworkIds: string[],
  completedHomeworkIds: string[]
): void {
  try {
    IN_MEMORY_STUDENT_STORAGE[GUEST_PROGRESS_KEY] = JSON.stringify({
      completedClassworkIds,
      completedHomeworkIds,
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.error('Error saving guest progress', e);
  }
}
