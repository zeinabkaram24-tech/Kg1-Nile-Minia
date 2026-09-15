import { ClassId, UserMode, UserProfile } from '../types';
import { supabaseSaveStudentProgress } from '../services/supabaseService';

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

export function normalizeStudentName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getActiveUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
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
      localStorage.removeItem(PROFILE_KEY);
    } else {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
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
    const raw = localStorage.getItem(KNOWN_STUDENTS_KEY);
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
    localStorage.setItem(KNOWN_STUDENTS_KEY, JSON.stringify(list.slice(0, 10)));
  } catch (e) {
    console.error('Error adding known student', e);
  }
}

export function removeKnownStudent(name: string): void {
  try {
    const list = getKnownStudents().filter(
      (s) => normalizeStudentName(s.name) !== normalizeStudentName(name)
    );
    localStorage.setItem(KNOWN_STUDENTS_KEY, JSON.stringify(list));
    localStorage.removeItem(PROGRESS_PREFIX + normalizeStudentName(name));
  } catch (e) {
    console.error('Error removing known student', e);
  }
}

export function getStudentProgress(studentName: string): StudentProgressData {
  const norm = normalizeStudentName(studentName);
  try {
    const raw = localStorage.getItem(PROGRESS_PREFIX + norm);
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
    localStorage.setItem(PROGRESS_PREFIX + norm, JSON.stringify(data));
    addKnownStudent(cleanName, classId);
    supabaseSaveStudentProgress(cleanName, completedClassworkIds, completedHomeworkIds, classId).catch(
      (err) => console.warn('Supabase student progress save warning:', err)
    );
  } catch (e) {
    console.error('Error saving student progress', e);
  }
}
