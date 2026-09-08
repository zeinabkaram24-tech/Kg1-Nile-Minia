import { DayInfo, DayOfWeek, GradeSection, GradeSectionOption, PlanTask, StudentProfile, Subject, Timetable } from '../types';
import { GRADE_TASKS, TASKS_2A, TASKS_2B, TASKS_2C } from './gradeTasks';

export { GRADE_TASKS, TASKS_2A, TASKS_2B, TASKS_2C };

export const GRADE_SECTIONS: GradeSectionOption[] = [
  {
    id: '2A',
    nameAr: 'فصل Grade 2A',
    nameEn: 'Grade 2 - A',
    badgeColor: 'bg-indigo-600 text-white',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-300',
    lightBg: 'bg-indigo-50',
  },
  {
    id: '2B',
    nameAr: 'فصل Grade 2B',
    nameEn: 'Grade 2 - B',
    badgeColor: 'bg-purple-600 text-white',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-300',
    lightBg: 'bg-purple-50',
  },
  {
    id: '2C',
    nameAr: 'فصل Grade 2C',
    nameEn: 'Grade 2 - C',
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
    id: 'math',
    nameEn: 'Math',
    nameAr: 'Math',
    code: 'MATH',
    color: {
      bg: 'bg-blue-600',
      text: 'text-blue-700',
      border: 'border-blue-200',
      accent: '#2563eb',
      lightBg: 'bg-blue-50',
    },
    iconName: 'Calculator',
  },
  {
    id: 'science',
    nameEn: 'Science',
    nameAr: 'Science',
    code: 'SCI',
    color: {
      bg: 'bg-emerald-600',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      accent: '#059669',
      lightBg: 'bg-emerald-50',
    },
    iconName: 'Sparkles',
  },
  {
    id: 'french',
    nameEn: 'French',
    nameAr: 'French',
    code: 'FR',
    color: {
      bg: 'bg-rose-600',
      text: 'text-rose-700',
      border: 'border-rose-200',
      accent: '#e11d48',
      lightBg: 'bg-rose-50',
    },
    iconName: 'Globe',
  },
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
  {
    id: 'social_studies',
    nameEn: 'Social Studies',
    nameAr: 'Social Studies',
    code: 'SOC',
    color: {
      bg: 'bg-cyan-600',
      text: 'text-cyan-700',
      border: 'border-cyan-200',
      accent: '#0891b2',
      lightBg: 'bg-cyan-50',
    },
    iconName: 'Compass',
  },
  {
    id: 'religion',
    nameEn: 'Religion',
    nameAr: 'Religion',
    code: 'REL',
    color: {
      bg: 'bg-teal-600',
      text: 'text-teal-700',
      border: 'border-teal-200',
      accent: '#0d9488',
      lightBg: 'bg-teal-50',
    },
    iconName: 'HeartHandshake',
  },
  {
    id: 'ict',
    nameEn: 'ICT',
    nameAr: 'ICT',
    code: 'ICT',
    color: {
      bg: 'bg-indigo-600',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      accent: '#4f46e5',
      lightBg: 'bg-indigo-50',
    },
    iconName: 'Laptop',
  },
  {
    id: 'pe',
    nameEn: 'PE',
    nameAr: 'PE',
    code: 'PE',
    color: {
      bg: 'bg-orange-600',
      text: 'text-orange-700',
      border: 'border-orange-200',
      accent: '#ea580c',
      lightBg: 'bg-orange-50',
    },
    iconName: 'Award',
  },
  {
    id: 'arts',
    nameEn: 'Arts',
    nameAr: 'Arts',
    code: 'ART',
    color: {
      bg: 'bg-pink-600',
      text: 'text-pink-700',
      border: 'border-pink-200',
      accent: '#db2777',
      lightBg: 'bg-pink-50',
    },
    iconName: 'Palette',
  },
  {
    id: 'music',
    nameEn: 'Music',
    nameAr: 'Music',
    code: 'MUS',
    color: {
      bg: 'bg-violet-600',
      text: 'text-violet-700',
      border: 'border-violet-200',
      accent: '#7c3aed',
      lightBg: 'bg-violet-50',
    },
    iconName: 'Sparkles',
  },
];

export const DEFAULT_STUDENT: StudentProfile = {
  name: 'طالب Grade 2',
  grade: 'Grade 2',
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
  '2A': TIMETABLE_G2A,
  '2B': TIMETABLE_G2B,
  '2C': TIMETABLE_G2C,
};

// Default fallback timetable (2A or 2B)
export const DEFAULT_TIMETABLE: Timetable = TIMETABLE_G2A;

// Default fallback tasks
export const DEFAULT_TASKS: PlanTask[] = TASKS_2A;
