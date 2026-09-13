export type ClassId = 'G2A' | 'G2B' | 'G2C';

export type SchoolDay = 'Saturday' | 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday';

export type SubjectName =
  | 'Mathematics'
  | 'English'
  | 'Arabic'
  | 'Science'
  | 'Social Studies'
  | 'French'
  | 'Religion'
  | 'ICT'
  | 'Arts'
  | 'Music'
  | 'PE';

export interface PeriodSlot {
  period: number; // 1 to 8
  time: string; // e.g., "7:45 - 8:35"
  subject: SubjectName;
  teacher: string;
  notes?: string;
}

export interface BreakSlot {
  name: string;
  time: string;
  type: 'line' | 'breakfast' | 'lunch';
}

export interface DaySchedule {
  day: SchoolDay;
  periods: PeriodSlot[];
}

export interface ClassworkEntry {
  id: string;
  classId: ClassId;
  day: SchoolDay;
  period: number;
  subject: SubjectName;
  title: string;
  details?: string;
  pages?: string;
  completed: boolean;
  block?: number;
  week?: number;
  linkUrl?: string;
  linkTitle?: string;
}

export interface HomeworkEntry {
  id: string;
  classId: ClassId;
  assignedDay: SchoolDay;
  dueDay: SchoolDay;
  subject: SubjectName;
  task: string;
  details?: string;
  pages?: string;
  completed: boolean;
  priority?: 'normal' | 'urgent';
  block?: number;
  week?: number;
  isLinkTask?: boolean;
  linkUrl?: string;
}

export interface TomorrowItem {
  subject: SubjectName;
  period: number;
  time: string;
  teacher: string;
  requiredBagItems: string[];
  dueHomework?: HomeworkEntry[];
  specialNote?: string;
}

export interface ParsedWeeklyPlanResponse {
  classwork: Omit<ClassworkEntry, 'id'>[];
  homework: Omit<HomeworkEntry, 'id'>[];
  tomorrowNotes?: {
    day: SchoolDay;
    note: string;
  }[];
}

export type UserMode = 'guest' | 'student';

export interface MaterialItem {
  id: string;
  fileName: string;
  fileSize: number; // bytes
  fileData: string; // Base64 data URL
  block: number; // 1, 2, 3, 4
  section: string; // 'Main sheet' | 'Week 1' | 'Week 2' | 'Week 3' | 'Week 4'
  classId?: ClassId | 'ALL';
  uploadedAt: string;
}

export interface UserProfile {
  mode: UserMode;
  studentName?: string;
  classId?: ClassId;
}
