import { ClassId, SchoolDay, ClassworkEntry, HomeworkEntry } from '../types';

export interface TomorrowSpecialNote {
  classId: ClassId;
  targetDay: SchoolDay; // The day being prepared for
  subject: string;
  note: string;
  arabicNote: string;
  bagItem?: string;
  icon?: string;
  block?: number;
  week?: number;
}

/**
 * Empty by default - all previous teacher notes cleared.
 * Ready for the user to input fresh weekly plans and teacher instructions.
 */
export const SPECIAL_TEACHER_NOTES: TomorrowSpecialNote[] = [];

/**
 * Empty by default - all base homework cleared.
 */
export const WEEK1_BASE_HOMEWORK: HomeworkEntry[] = [];

/**
 * Empty by default - all base classwork cleared.
 */
export const WEEK1_CLASSWORK: ClassworkEntry[] = [];

/**
 * Empty by default - all initial classwork cleared.
 */
export const INITIAL_CLASSWORK: ClassworkEntry[] = [];

/**
 * Empty by default - all initial homework cleared.
 */
export const INITIAL_HOMEWORK: HomeworkEntry[] = [];
