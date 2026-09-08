import { DayInfo, DayOfWeek, GradeSection, GradeSectionOption, PlanTask, StudentProfile, Subject, Timetable } from '../types';
import { TASKS_2A, TASKS_2B, TASKS_2C } from './gradeTasks';

export { TASKS_2A, TASKS_2B, TASKS_2C };

export const GRADE_SECTIONS: GradeSectionOption[] = [
  {
    id: '2A',
    nameAr: 'فصل KG 1A',
    nameEn: 'KG 1 - A',
    badgeColor: 'bg-indigo-600 text-white',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-300',
    lightBg: 'bg-indigo-50',
  },
  {
    id: '2B',
    nameAr: 'فصل KG 1B',
    nameEn: 'KG 1 - B',
    badgeColor: 'bg-purple-600 text-white',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-300',
    lightBg: 'bg-purple-50',
  },
  {
    id: '2C',
    nameAr: 'فصل KG 1C',
    nameEn: 'KG 1 - C',
    badgeColor: 'bg-emerald-600 text-white',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-300',
    lightBg: 'bg-emerald-50',
  },
];

export const DAYS_LIST: DayInfo[] = [
  { key: 'sunday', nameAr: 'الأحد', nameEn: 'Sunday', shortAr: 'أحد', shortEn: 'Su', isSchoolDay: true },
  { key: 'monday', nameAr: 'الإثنين', nameEn: 'Monday', shortAr: 'إثنين', shortEn: 'Mo', isSchoolDay: true },
  { key: 'tuesday', nameAr: 'الثلاثاء', nameEn: 'Tuesday', shortAr: 'ثلاثاء', shortEn: 'Tu', isSchoolDay: true },
  { key: 'wednesday', nameAr: 'الأربعاء', nameEn: 'Wednesday', shortAr: 'أربعاء', shortEn: 'We', isSchoolDay: true },
  { key: 'thursday', nameAr: 'الخميس', nameEn: 'Thursday', shortAr: 'خميس', shortEn: 'Th', isSchoolDay: true },
  { key: 'friday', nameAr: 'الجمعة', nameEn: 'Friday', shortAr: 'جمعة', shortEn: 'Fr', isSchoolDay: false },
  { key: 'saturday', nameAr: 'السبت', nameEn: 'Saturday', shortAr: 'سبت', shortEn: 'Sa', isSchoolDay: false },
];

export const PERIODS_TIMING = [
  { period: 1, time: '7:45 - 8:35', label: 'الحصة 1' },
  { period: 2, time: '8:35 - 9:25', label: 'الحصة 2' },
  { period: 3, time: '9:45 - 10:35', label: 'الحصة 3' },
  { period: 4, time: '10:35 - 11:25', label: 'الحصة 4' },
  { period: 5, time: '11:25 - 12:15', label: 'الحصة 5' },
  { period: 6, time: '12:15 - 13:05', label: 'الحصة 6' },
  { period: 7, time: '13:25 - 14:15', label: 'الحصة 7' },
  { period: 8, time: '14:15 - 15:05', label: 'الحصة 8' },
];

export const DEFAULT_SUBJECTS: Subject[] = [
  {
    id: 'english',
    nameEn: 'English',
    nameAr: 'English',
    code: 'ENG',
    color: {
      bg: 'bg-purple-600',
      text: 'text-purple-700',
      border: 'border-purple-200',
      accent: '#9333ea',
      lightBg: 'bg-purple-50',
    },
    iconName: 'BookOpen',
  },
  {
    id: 'arabic',
    nameEn: 'Arabic',
    nameAr: 'Arabic',
    code: 'ARB',
    color: {
      bg: 'bg-amber-600',
      text: 'text-amber-700',
      border: 'border-amber-200',
      accent: '#d97706',
      lightBg: 'bg-amber-50',
    },
    iconName: 'Feather',
  },
];

const ALLOWED_SUBJECT_IDS = new Set(['arabic', 'english']);
const filterAllowedTasks = (tasks: PlanTask[]) => tasks.filter((task) => ALLOWED_SUBJECT_IDS.has(task.subjectId));
const filterAllowedTimetable = (timetable: Timetable): Timetable =>
  Object.fromEntries(
    Object.entries(timetable).map(([day, slots]) => [
      day,
      slots.filter((slot) => ALLOWED_SUBJECT_IDS.has(slot.subjectId)),
    ]),
  ) as Timetable;

export const GRADE_TASKS: Record<GradeSection, PlanTask[]> = {
  '2A': filterAllowedTasks(TASKS_2A),
  '2B': filterAllowedTasks(TASKS_2B),
  '2C': filterAllowedTasks(TASKS_2C),
};


export const DEFAULT_STUDENT: StudentProfile = {
  name: 'طالب KG 1',
  grade: 'KG 1',
  section: '2A',
  schoolName: 'Nile Egyptian International Schools',
  branch: 'Minia Branch (فرع المنيا)',
};

// ==========================================
// 1) Timetable for G2A (from IMG-20260906-WA0002.jpg)
// ==========================================
export const TIMETABLE_G2A: Timetable = {
  sunday: [
    { period: 1, timeRange: '7:45 - 8:35', subjectId: 'pe' },
    { period: 2, timeRange: '8:35 - 9:25', subjectId: 'social_studies' },
    { period: 3, timeRange: '9:45 - 10:35', subjectId: 'ict' },
    { period: 4, timeRange: '10:35 - 11:25', subjectId: 'arts' },
    { period: 5, timeRange: '11:25 - 12:15', subjectId: 'english' },
    { period: 6, timeRange: '12:15 - 13:05', subjectId: 'english' },
    { period: 7, timeRange: '13:25 - 14:15', subjectId: 'arabic' },
    { period: 8, timeRange: '14:15 - 15:05', subjectId: 'math' },
  ],
  monday: [
    { period: 1, timeRange: '7:45 - 8:35', subjectId: 'music' },
    { period: 2, timeRange: '8:35 - 9:25', subjectId: 'math' },
    { period: 3, timeRange: '9:45 - 10:35', subjectId: 'pe' },
    { period: 4, timeRange: '10:35 - 11:25', subjectId: 'science' },
    { period: 5, timeRange: '11:25 - 12:15', subjectId: 'arabic' },
    { period: 6, timeRange: '12:15 - 13:05', subjectId: 'arabic' },
    { period: 7, timeRange: '13:25 - 14:15', subjectId: 'ict' },
    { period: 8, timeRange: '14:15 - 15:05', subjectId: 'english' },
  ],
  tuesday: [
    { period: 1, timeRange: '7:45 - 8:35', subjectId: 'english' },
    { period: 2, timeRange: '8:35 - 9:25', subjectId: 'english' },
    { period: 3, timeRange: '9:45 - 10:35', subjectId: 'math' },
    { period: 4, timeRange: '10:35 - 11:25', subjectId: 'math' },
    { period: 5, timeRange: '11:25 - 12:15', subjectId: 'religion' },
    { period: 6, timeRange: '12:15 - 13:05', subjectId: 'french' },
    { period: 7, timeRange: '13:25 - 14:15', subjectId: 'arts' },
    { period: 8, timeRange: '14:15 - 15:05', subjectId: 'arabic' },
  ],
  wednesday: [
    { period: 1, timeRange: '7:45 - 8:35', subjectId: 'math' },
    { period: 2, timeRange: '8:35 - 9:25', subjectId: 'science' },
    { period: 3, timeRange: '9:45 - 10:35', subjectId: 'ict' },
    { period: 4, timeRange: '10:35 - 11:25', subjectId: 'social_studies' },
    { period: 5, timeRange: '11:25 - 12:15', subjectId: 'french' },
    { period: 6, timeRange: '12:15 - 13:05', subjectId: 'arabic' },
    { period: 7, timeRange: '13:25 - 14:15', subjectId: 'english' },
    { period: 8, timeRange: '14:15 - 15:05', subjectId: 'english' },
  ],
  thursday: [
    { period: 1, timeRange: '7:45 - 8:35', subjectId: 'english' },
    { period: 2, timeRange: '8:35 - 9:25', subjectId: 'music' },
    { period: 3, timeRange: '9:45 - 10:35', subjectId: 'religion' },
    { period: 4, timeRange: '10:35 - 11:25', subjectId: 'arabic' },
    { period: 5, timeRange: '11:25 - 12:15', subjectId: 'french' },
    { period: 6, timeRange: '12:15 - 13:05', subjectId: 'math' },
    { period: 7, timeRange: '13:25 - 14:15', subjectId: 'social_studies' },
    { period: 8, timeRange: '14:15 - 15:05', subjectId: 'science' },
  ],
  friday: [],
  saturday: [],
};

// ==========================================
// 2) Timetable for G2B (from IMG-20260906-WA0000.jpg)
// ==========================================
export const TIMETABLE_G2B: Timetable = {
  sunday: [
    { period: 1, timeRange: '7:45 - 8:35', subjectId: 'french' },
    { period: 2, timeRange: '8:35 - 9:25', subjectId: 'math' },
    { period: 3, timeRange: '9:45 - 10:35', subjectId: 'arabic' },
    { period: 4, timeRange: '10:35 - 11:25', subjectId: 'science' },
    { period: 5, timeRange: '11:25 - 12:15', subjectId: 'english' },
    { period: 6, timeRange: '12:15 - 13:05', subjectId: 'english' },
    { period: 7, timeRange: '13:25 - 14:15', subjectId: 'ict' },
    { period: 8, timeRange: '14:15 - 15:05', subjectId: 'music' },
  ],
  monday: [
    { period: 1, timeRange: '7:45 - 8:35', subjectId: 'social_studies' },
    { period: 2, timeRange: '8:35 - 9:25', subjectId: 'pe' },
    { period: 3, timeRange: '9:45 - 10:35', subjectId: 'english' },
    { period: 4, timeRange: '10:35 - 11:25', subjectId: 'english' },
    { period: 5, timeRange: '11:25 - 12:15', subjectId: 'math' },
    { period: 6, timeRange: '12:15 - 13:05', subjectId: 'math' },
    { period: 7, timeRange: '13:25 - 14:15', subjectId: 'arabic' },
    { period: 8, timeRange: '14:15 - 15:05', subjectId: 'arabic' },
  ],
  tuesday: [
    { period: 1, timeRange: '7:45 - 8:35', subjectId: 'math' },
    { period: 2, timeRange: '8:35 - 9:25', subjectId: 'ict' },
    { period: 3, timeRange: '9:45 - 10:35', subjectId: 'arts' },
    { period: 4, timeRange: '10:35 - 11:25', subjectId: 'french' },
    { period: 5, timeRange: '11:25 - 12:15', subjectId: 'religion' },
    { period: 6, timeRange: '12:15 - 13:05', subjectId: 'english' },
    { period: 7, timeRange: '13:25 - 14:15', subjectId: 'music' },
    { period: 8, timeRange: '14:15 - 15:05', subjectId: 'arabic' },
  ],
  wednesday: [
    { period: 1, timeRange: '7:45 - 8:35', subjectId: 'english' },
    { period: 2, timeRange: '8:35 - 9:25', subjectId: 'social_studies' },
    { period: 3, timeRange: '9:45 - 10:35', subjectId: 'pe' },
    { period: 4, timeRange: '10:35 - 11:25', subjectId: 'arabic' },
    { period: 5, timeRange: '11:25 - 12:15', subjectId: 'math' },
    { period: 6, timeRange: '12:15 - 13:05', subjectId: 'french' },
    { period: 7, timeRange: '13:25 - 14:15', subjectId: 'science' },
    { period: 8, timeRange: '14:15 - 15:05', subjectId: 'arts' },
  ],
  thursday: [
    { period: 1, timeRange: '7:45 - 8:35', subjectId: 'arabic' },
    { period: 2, timeRange: '8:35 - 9:25', subjectId: 'social_studies' },
    { period: 3, timeRange: '9:45 - 10:35', subjectId: 'religion' },
    { period: 4, timeRange: '10:35 - 11:25', subjectId: 'math' },
    { period: 5, timeRange: '11:25 - 12:15', subjectId: 'english' },
    { period: 6, timeRange: '12:15 - 13:05', subjectId: 'english' },
    { period: 7, timeRange: '13:25 - 14:15', subjectId: 'science' },
    { period: 8, timeRange: '14:15 - 15:05', subjectId: 'ict' },
  ],
  friday: [],
  saturday: [],
};

// ==========================================
// 3) Timetable for G2C (from IMG-20260906-WA0001.jpg)
// ==========================================
export const TIMETABLE_G2C: Timetable = {
  sunday: [
    { period: 1, timeRange: '7:45 - 8:35', subjectId: 'math' },
    { period: 2, timeRange: '8:35 - 9:25', subjectId: 'math' },
    { period: 3, timeRange: '9:45 - 10:35', subjectId: 'french' },
    { period: 4, timeRange: '10:35 - 11:25', subjectId: 'english' },
    { period: 5, timeRange: '11:25 - 12:15', subjectId: 'ict' },
    { period: 6, timeRange: '12:15 - 13:05', subjectId: 'arabic' },
    { period: 7, timeRange: '13:25 - 14:15', subjectId: 'social_studies' },
    { period: 8, timeRange: '14:15 - 15:05', subjectId: 'pe' },
  ],
  monday: [
    { period: 1, timeRange: '7:45 - 8:35', subjectId: 'arabic' },
    { period: 2, timeRange: '8:35 - 9:25', subjectId: 'arabic' },
    { period: 3, timeRange: '9:45 - 10:35', subjectId: 'social_studies' },
    { period: 4, timeRange: '10:35 - 11:25', subjectId: 'english' },
    { period: 5, timeRange: '11:25 - 12:15', subjectId: 'science' },
    { period: 6, timeRange: '12:15 - 13:05', subjectId: 'arts' },
    { period: 7, timeRange: '13:25 - 14:15', subjectId: 'french' },
    { period: 8, timeRange: '14:15 - 15:05', subjectId: 'math' },
  ],
  tuesday: [
    { period: 1, timeRange: '7:45 - 8:35', subjectId: 'pe' },
    { period: 2, timeRange: '8:35 - 9:25', subjectId: 'arabic' },
    { period: 3, timeRange: '9:45 - 10:35', subjectId: 'science' },
    { period: 4, timeRange: '10:35 - 11:25', subjectId: 'math' },
    { period: 5, timeRange: '11:25 - 12:15', subjectId: 'religion' },
    { period: 6, timeRange: '12:15 - 13:05', subjectId: 'ict' },
    { period: 7, timeRange: '13:25 - 14:15', subjectId: 'english' },
    { period: 8, timeRange: '14:15 - 15:05', subjectId: 'english' },
  ],
  wednesday: [
    { period: 1, timeRange: '7:45 - 8:35', subjectId: 'english' },
    { period: 2, timeRange: '8:35 - 9:25', subjectId: 'english' },
    { period: 3, timeRange: '9:45 - 10:35', subjectId: 'french' },
    { period: 4, timeRange: '10:35 - 11:25', subjectId: 'social_studies' },
    { period: 5, timeRange: '11:25 - 12:15', subjectId: 'music' },
    { period: 6, timeRange: '12:15 - 13:05', subjectId: 'arabic' },
    { period: 7, timeRange: '13:25 - 14:15', subjectId: 'math' },
    { period: 8, timeRange: '14:15 - 15:05', subjectId: 'music' },
  ],
  thursday: [
    { period: 1, timeRange: '7:45 - 8:35', subjectId: 'ict' },
    { period: 2, timeRange: '8:35 - 9:25', subjectId: 'science' },
    { period: 3, timeRange: '9:45 - 10:35', subjectId: 'religion' },
    { period: 4, timeRange: '10:35 - 11:25', subjectId: 'english' },
    { period: 5, timeRange: '11:25 - 12:15', subjectId: 'english' },
    { period: 6, timeRange: '12:15 - 13:05', subjectId: 'math' },
    { period: 7, timeRange: '13:25 - 14:15', subjectId: 'arabic' },
    { period: 8, timeRange: '14:15 - 15:05', subjectId: 'arts' },
  ],
  friday: [],
  saturday: [],
};

export const GRADE_TIMETABLES: Record<GradeSection, Timetable> = {
  '2A': filterAllowedTimetable(TIMETABLE_G2A),
  '2B': filterAllowedTimetable(TIMETABLE_G2B),
  '2C': filterAllowedTimetable(TIMETABLE_G2C),
};

// Default fallback timetable (2A or 2B)
export const DEFAULT_TIMETABLE: Timetable = GRADE_TIMETABLES['2A'];

// Default fallback tasks
export const DEFAULT_TASKS: PlanTask[] = TASKS_2A;
