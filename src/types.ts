export type ClassId = 'KG1A' | 'KG1B' | 'KG1C' | 'KG1D' | 'KG1E';

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

export interface UserProfile {
  mode: UserMode;
  studentName?: string;
  classId?: ClassId;
}

// Extended types supporting weekly planner archive, materials, and student progress
export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export type UserRole = 'admin' | 'student' | 'visitor';

export type TaskType = 'homework' | 'classwork' | 'study' | 'dictation' | 'quiz' | 'supplies' | 'general';

export interface Subject {
  id: string;
  nameEn: string;
  nameAr: string;
  code: string;
  color: {
    bg: string;
    text: string;
    border: string;
    accent: string;
    lightBg: string;
  };
  iconName: string;
}

export interface PlanTask {
  id: string;
  day: DayOfWeek;
  subjectId: string;
  section?: GradeSection;
  period?: number;
  type: TaskType;
  title: string;
  details?: string;
  pages?: string;
  linkUrl?: string;
  linkTitle?: string;
  isDone: boolean;
  notes?: string;
  personalNotes?: string;
  isPersonalTask?: boolean;
  isCarriedOver?: boolean;
  previousWeekNote?: string;
  createdAt: number;
  completedAt?: number;
}

export interface TimetableSlot {
  period: number;
  timeRange: string;
  subjectId: string;
  room?: string;
}

export type Timetable = Record<DayOfWeek, TimetableSlot[]>;

export type GradeSection = 'KG1A' | 'KG1B' | 'KG1C' | 'KG1D' | 'KG1E' | '1A' | '1B' | '1C' | '1D' | '1E' | '2A' | '2B' | '2C';

export interface GradeSectionOption {
  id: GradeSection;
  nameAr: string;
  nameEn: string;
  badgeColor: string;
  textColor: string;
  borderColor: string;
  lightBg: string;
}

export interface StudentProfile {
  name: string;
  grade: string;
  section: GradeSection;
  schoolName: string;
  branch: string;
}

export interface DayInfo {
  key: DayOfWeek;
  nameAr: string;
  nameEn: string;
  shortAr: string;
  shortEn: string;
  isSchoolDay: boolean;
}

export interface UploadedPlanFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: number;
  subjectId?: string;
  weekName?: string;
  previewUrl?: string;
  extractedTaskCount?: number;
}

export interface VisitorItem {
  id: string;
  name: string;
  loginType: 'student' | 'visitor' | 'admin';
  studentGrade?: string;
  section?: GradeSection | string;
  firstSeenAt: number;
  lastSeenAt: number;
  visitCount: number;
  dailyVisits?: Record<string, number>;
  device?: string;
  email?: string;
  userAgent?: string;
}

export interface VisitorStatsSummary {
  totalUsers: number;
  totalStudentsNamed: number;
  totalVisitorsGuest: number;
  totalVisits: number;
  todayDateString?: string;
  todayDateLabel?: string;
  todayTotalUsers: number;
  todayStudentsNamed: number;
  todayVisitorsGuest: number;
  todayVisits: number;
  lastUpdated: number;
  sectionCounts?: {
    '2A': number;
    '2B': number;
    '2C': number;
    other: number;
  };
  todaySectionCounts?: {
    '2A': number;
    '2B': number;
    '2C': number;
    other: number;
  };
}

export interface WeeklyPlanArchiveEntry {
  id: string;
  blockNumber: number;
  weekNumber: number;
  title: string;
  createdAt: number;
  startDate?: string;
  endDate?: string;
  tasksBySection: Record<GradeSection, PlanTask[]>;
  uploadedFiles?: UploadedPlanFile[];
  isCurrent: boolean;
  notes?: string;
}

export interface MaterialItem {
  id: string;
  fileName?: string;
  fileSize?: number | string;
  fileData?: string;
  block?: number;
  section?: string;
  classId?: ClassId | 'ALL';
  uploadedAt?: string;

  title?: string;
  subjectId?: string;
  blockNumber?: number;
  category?: 'main_sheets' | 'week1' | 'week2' | 'week3' | 'week4' | 'week5' | string;
  categoryLabel?: string;
  itemType?: 'sheet' | 'booklet' | 'notes' | 'revision' | 'link';
  fileUrl?: string;
  fileType?: string;
  notes?: string;
  pageCount?: number;
  unitTitle?: string;
  contentPreview?: {
    type: 'exercises' | 'topics' | 'reading';
    items: string[];
    sections?: { title: string; points: string[] }[];
  };
  createdAt?: number;
}

export interface GlobalPlanData {
  activePlanId: string;
  weekTitle: string;
  activeBlockNumber: number;
  activeWeekNumber: number;
  tasksBySection: Record<GradeSection, PlanTask[]>;
  archive: WeeklyPlanArchiveEntry[];
  uploadedFiles: UploadedPlanFile[];
  lastUpdated: number;
  updatedBy?: string;
}

export interface UserTaskProgressItem {
  isDone: boolean;
  completedAt?: number;
  personalNotes?: string;
  updatedAt?: number;
}

export interface UserPersonalState {
  userId: string;
  studentName?: string;
  section?: GradeSection;
  taskProgress: Record<string, UserTaskProgressItem>;
  personalTasks?: PlanTask[];
  lastUpdated?: number;
}
