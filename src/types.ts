export type ClassId = 'KG1A' | 'KG1B' | 'KG1C' | 'KG1D' | 'KG1E' | 'A' | 'B' | 'C' | 'D' | 'E' | 'all' | 'ALL' | string;
export type SchoolClass = ClassId;
export type UserRole = 'admin' | 'teacher' | 'student' | 'guest';

export type SchoolDay = 'Saturday' | 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | string;

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
  | 'PE'
  | 'Math'
  | 'arabic'
  | 'math'
  | 'science'
  | 'social'
  | 'french'
  | 'ict'
  | 'art'
  | 'music'
  | 'pe'
  | 'ethics'
  | 'dictation'
  | string;

export interface PeriodSlot {
  id?: string;
  period?: number; // 1 to 8
  periodNum?: number;
  time?: string; // e.g., "7:45 - 8:35"
  subject?: SubjectName;
  subjectId?: string;
  teacher?: string;
  room?: string;
  notes?: string;
  dayNameAr?: string;
  dayNameEn?: string;
}

export interface BreakSlot {
  name: string;
  time: string;
  type: 'line' | 'breakfast' | 'lunch';
}

export interface DaySchedule {
  day?: SchoolDay;
  dayNameAr?: string;
  dayNameEn?: string;
  periods: PeriodSlot[];
}

export interface ClassworkEntry {
  id: string;
  classId?: ClassId;
  day?: SchoolDay;
  period?: number;
  subject?: SubjectName;
  subjectId?: string;
  title?: string;
  lessonTitle?: string;
  details?: string;
  pages?: string;
  completed?: boolean;
  block?: number;
  week?: number;
  linkUrl?: string;
  linkTitle?: string;
  links?: { title: string; url: string }[];
  pdfUrl?: string;
  [key: string]: any;
}

export interface HomeworkEntry {
  id: string;
  classId?: ClassId;
  assignedDay?: SchoolDay;
  dueDay?: SchoolDay;
  dueDate?: string;
  subject?: SubjectName;
  subjectId?: string;
  task?: string;
  assignment?: string;
  details?: string;
  pages?: string;
  completed?: boolean;
  priority?: 'normal' | 'urgent';
  block?: number;
  week?: number;
  isLinkTask?: boolean;
  linkUrl?: string;
  linkTitle?: string;
  links?: { title: string; url: string }[];
  pdfUrl?: string;
  [key: string]: any;
}

export interface TomorrowSpecialNote {
  id?: string;
  classId?: ClassId;
  targetDay?: SchoolDay; // The day being prepared for
  subject?: string;
  note?: string;
  arabicNote?: string;
  bagItem?: string;
  icon?: string;
  block?: number;
  week?: number;
  isQuiz?: boolean;
  categoryType?: 'note' | 'quiz';
  linkUrl?: string;
  linkTitle?: string;
  links?: { title: string; url: string }[];
  pdfUrl?: string;
  linkedIds?: string[];
  isCustom?: boolean;
  [key: string]: any;
}

export interface TomorrowItem {
  id?: string;
  item?: string;
  subject?: SubjectName;
  subjectId?: string;
  period?: number;
  time?: string;
  teacher?: string;
  requiredBagItems?: string[];
  dueHomework?: HomeworkEntry[];
  specialNote?: string;
  [key: string]: any;
}

export interface ParsedWeeklyPlanResponse {
  classwork: Omit<ClassworkEntry, 'id'>[];
  homework: Omit<HomeworkEntry, 'id'>[];
  tomorrowNotes?: TomorrowSpecialNote[];
}

export type UserMode = 'guest' | 'student';

export interface MaterialItem {
  id: string;
  title?: string;
  fileName: string;
  fileSize?: number | string; // bytes or string
  fileData?: string; // Base64 data URL
  fileDataUrl?: string;
  storageUrl?: string; // Public Supabase cloud storage URL or direct link URL
  linkUrl?: string; // External web link or video link
  type?: 'pdf' | 'link' | string; // 'pdf' by default, or 'link'
  fileType?: string;
  materialKind?: string;
  description?: string;
  previewSummary?: string;
  block?: number | string; // 1, 2, 3, 4
  blockId?: string;
  weekId?: string;
  section?: string; // 'Main sheet' | 'Week 1' | 'Week 2' | 'Week 3' | 'Week 4'
  classId?: ClassId | 'ALL' | string;
  subjectId?: string;
  uploadedAt?: string;
  uploadDate?: string;
  uploadedBy?: string;
}

export interface UserProfile {
  mode: UserMode;
  studentName?: string;
  classId?: ClassId;
}

export interface DailyFollowUp {
  id?: string;
  date?: string;
  classId?: ClassId;
  [key: string]: any;
}

export interface ClassworkRecord extends ClassworkEntry {}
export interface HomeworkRecord extends HomeworkEntry {}
export interface TomorrowPreparationItem extends TomorrowItem {}

export interface ClassTimetable {
  classId?: ClassId | string;
  days?: DaySchedule[] | any[];
  [day: string]: any;
}

export interface WeeklyPlanItem {
  id?: string;
  block?: number;
  week?: number;
  classId?: ClassId;
  subject?: SubjectName;
  [key: string]: any;
}

export interface SchoolMaterialFile extends MaterialItem {}

export interface StudentProfile {
  id?: string;
  name?: string;
  studentName?: string;
  classId?: ClassId;
  [key: string]: any;
}

export interface StudentPersonalTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  [key: string]: any;
}

export interface SubjectInfo {
  id: SubjectName;
  name?: string;
  nameEn?: string;
  nameAr?: string;
  arabicName?: string;
  icon?: string;
  color?: string;
  textColor?: string;
  borderColor?: string;
  iconName?: string;
  [key: string]: any;
}
