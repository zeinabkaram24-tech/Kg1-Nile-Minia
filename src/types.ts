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
  linkUrl?: string; // Direct clickable link (e.g. video, online platform, explanation, sheet)
  linkTitle?: string; // Optional custom text for the link button (e.g. "اضغط هنا لمشاهدة/سماع الرابط")
  isDone: boolean;
  notes?: string;
  personalNotes?: string; // User Role: Personal student note (stored locally only)
  isPersonalTask?: boolean; // User Role: Custom task added by the student (stored locally only)
  isCarriedOver?: boolean; // Deprecated: Kept for backwards compatibility only
  previousWeekNote?: string; // Deprecated: Kept for backwards compatibility only
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

export type GradeSection = '2A' | '2B' | '2C';

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
  // Daily census strictly starting from 12:00 AM midnight to 12:00 AM next day
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
  id: string; // e.g. "b1-w1", "b1-w2"
  blockNumber: number; // e.g. 1
  weekNumber: number; // e.g. 1
  title: string; // e.g. "خطة الأسبوع الأول (Block 1 - Week 1)"
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
  title: string;
  subjectId: string;
  blockNumber: number; // e.g. 1 for Block 1
  category: 'main_sheets' | 'week1' | 'week2' | 'week3' | 'week4' | 'week5' | string;
  categoryLabel?: string; // e.g. "الشيتات الرئيسية", "ويك 1", "ويك 2"
  itemType: 'sheet' | 'booklet' | 'notes' | 'revision' | 'link';
  fileUrl?: string;
  fileData?: string; // Base64 data URL or embedded file representation
  fileName?: string;
  fileType?: string; // e.g. 'application/pdf'
  fileSize?: string;
  notes?: string;
  pageCount?: number;
  unitTitle?: string;
  contentPreview?: {
    type: 'exercises' | 'topics' | 'reading';
    items: string[];
    sections?: { title: string; points: string[] }[];
  };
  section?: 'all' | GradeSection;
  createdAt: number;
}

// Global Plan Shared Storage (Admin Role -> Global Storage)
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

// User Local Progress & Personal Notes (User Role -> Local Storage)
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

