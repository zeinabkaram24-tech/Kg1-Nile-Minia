import { ClassId, SchoolDay, SubjectName, PeriodSlot, BreakSlot } from '../types';

export const SCHOOL_NAME = 'Nile Egyptian International School';
export const SCHOOL_BRANCH = 'Menia';
export const SCHOOL_GRADE = 'KG 1';

export const SCHOOL_DAYS: SchoolDay[] = [
  'Saturday',
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
];

export const PERIOD_TIMES: Record<number, string> = {
  1: '7:45 - 8:35',
  2: '8:35 - 9:25',
  3: '9:55 - 10:45',
  4: '10:45 - 11:35',
  5: '12:05 - 12:55',
  6: '12:55 - 1:45',
};

export const BREAK_SLOTS: BreakSlot[] = [
  { name: 'Morning Line & Assembly', time: '7:30 - 7:45', type: 'line' },
  { name: 'Breakfast Break (فطور)', time: '9:25 - 9:55', type: 'breakfast' },
  { name: 'Garden Break (حديقة)', time: '11:35 - 12:05', type: 'lunch' },
];

// Topic & Week date ranges (Day and Month only without year)
export const BLOCK_WEEK_DATES: Record<number, Record<number, string>> = {
  1: {
    1: '13/9 - 17/9',
    2: '20/9 - 24/9',
    3: '27/9 - 1/10',
    4: '4/10 - 8/10',
  },
  2: {
    1: '11/10 - 15/10',
    2: '18/10 - 22/10',
    3: '25/10 - 29/10',
    4: '1/11 - 5/11',
  },
  3: {
    1: '8/11 - 12/11',
    2: '15/11 - 19/11',
    3: '22/11 - 26/11',
    4: '29/11 - 3/12',
  },
  4: {
    1: '6/12 - 10/12',
    2: '13/12 - 17/12',
    3: '20/12 - 24/12',
    4: '27/12 - 31/12',
  },
};

export interface SubjectMeta {
  name: SubjectName;
  arabicName: string;
  iconName: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  standardBagItems: string[];
}

export const SUBJECT_METADATA: Record<SubjectName, SubjectMeta> = {
  Mathematics: {
    name: 'Mathematics',
    arabicName: 'رياضيات',
    iconName: 'Calculator',
    color: '#0284c7', // Sky-600
    badgeBg: 'bg-sky-50 text-sky-950 border-sky-300',
    badgeText: 'text-sky-900',
    borderColor: 'border-sky-400',
    standardBagItems: ['Math Student Book', 'Math Practice Book', 'Grid Notebook', 'Pencil Case (Ruler & Eraser)'],
  },
  English: {
    name: 'English',
    arabicName: 'لغة إنجليزية',
    iconName: 'BookOpen',
    color: '#4f46e5', // Indigo-600
    badgeBg: 'bg-indigo-50 text-indigo-950 border-indigo-300',
    badgeText: 'text-indigo-900',
    borderColor: 'border-indigo-400',
    standardBagItems: ['English Pupil Book', 'Activity Book', 'English Lined Copybook', 'Phonics Booklet'],
  },
  Arabic: {
    name: 'Arabic',
    arabicName: 'لغة عربية',
    iconName: 'Languages',
    color: '#059669', // Emerald-600
    badgeBg: 'bg-emerald-50 text-emerald-950 border-emerald-300',
    badgeText: 'text-emerald-900',
    borderColor: 'border-emerald-400',
    standardBagItems: ['كتاب اللغة العربية', 'كشكول العربي المسطر', 'كراسة الخط'],
  },
  Science: {
    name: 'Science',
    arabicName: 'علوم',
    iconName: 'FlaskConical',
    color: '#0d9488', // Teal-600
    badgeBg: 'bg-teal-50 text-teal-950 border-teal-300',
    badgeText: 'text-teal-900',
    borderColor: 'border-teal-400',
    standardBagItems: ['Science Learner’s Book', 'Science Workbook', 'Science Notebook'],
  },
  'Social Studies': {
    name: 'Social Studies',
    arabicName: 'دراسات اجتماعية',
    iconName: 'Globe',
    color: '#d97706', // Amber-600
    badgeBg: 'bg-amber-50 text-amber-950 border-amber-300',
    badgeText: 'text-amber-900',
    borderColor: 'border-amber-400',
    standardBagItems: ['Social Studies Book', 'Social Studies Notebook', 'Colored Pencils'],
  },
  French: {
    name: 'French',
    arabicName: 'لغة فرنسية',
    iconName: 'Flag',
    color: '#2563eb', // Blue-600
    badgeBg: 'bg-blue-50 text-blue-950 border-blue-300',
    badgeText: 'text-blue-900',
    borderColor: 'border-blue-400',
    standardBagItems: ['French Manuel de cours', 'Cahier d’activités', 'Cahier de classe'],
  },
  Religion: {
    name: 'Religion',
    arabicName: 'تربية دينية',
    iconName: 'Sparkles',
    color: '#7c3aed', // Violet-600
    badgeBg: 'bg-violet-50 text-violet-950 border-violet-300',
    badgeText: 'text-violet-900',
    borderColor: 'border-violet-400',
    standardBagItems: ['كتاب التربية الدينية', 'كشكول الدين'],
  },
  ICT: {
    name: 'ICT',
    arabicName: 'تكنولوجيا المعلومات',
    iconName: 'Laptop',
    color: '#0891b2', // Cyan-600
    badgeBg: 'bg-cyan-50 text-cyan-950 border-cyan-300',
    badgeText: 'text-cyan-900',
    borderColor: 'border-cyan-400',
    standardBagItems: ['ICT Booklet / Notes'],
  },
  Arts: {
    name: 'Arts',
    arabicName: 'تربية فنية',
    iconName: 'Palette',
    color: '#e11d48', // Rose-600
    badgeBg: 'bg-rose-50 text-rose-950 border-rose-300',
    badgeText: 'text-rose-900',
    borderColor: 'border-rose-400',
    standardBagItems: ['Drawing Sketchbook (A4/A3)', 'Watercolor / Wax Crayons', 'Glue Stick & Scissors', 'Art Apron'],
  },
  Art: {
    name: 'Art',
    arabicName: 'تربية فنية',
    iconName: 'Palette',
    color: '#e11d48', // Rose-600
    badgeBg: 'bg-rose-50 text-rose-950 border-rose-300',
    badgeText: 'text-rose-900',
    borderColor: 'border-rose-400',
    standardBagItems: ['Drawing Sketchbook (A4/A3)', 'Watercolor / Wax Crayons', 'Glue Stick & Scissors', 'Art Apron'],
  },
  Music: {
    name: 'Music',
    arabicName: 'تربية موسيقية',
    iconName: 'Music',
    color: '#db2777', // Pink-600
    badgeBg: 'bg-pink-50 text-pink-950 border-pink-300',
    badgeText: 'text-pink-900',
    borderColor: 'border-pink-400',
    standardBagItems: ['Music Notebook / Instrument (if assigned)'],
  },
  PE: {
    name: 'PE',
    arabicName: 'تربية رياضية',
    iconName: 'Dumbbell',
    color: '#16a34a', // Green-600
    badgeBg: 'bg-lime-50 text-lime-950 border-lime-300',
    badgeText: 'text-lime-900',
    borderColor: 'border-lime-400',
    standardBagItems: ['PE School Sportswear Uniform', 'Sneakers / Running Shoes', 'Extra Water Bottle', 'Small Towel'],
  },
};

const BASE_SCHEDULE_KG1A: Record<SchoolDay, PeriodSlot[]> = {
  Saturday: [],
  Sunday: [
    { period: 1, time: '7:45 - 8:35', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 2, time: '8:35 - 9:25', subject: 'Music', teacher: 'Sara Khalifa' },
    { period: 3, time: '9:55 - 10:45', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 4, time: '10:45 - 11:35', subject: 'Arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
    { period: 5, time: '12:05 - 12:55', subject: 'Arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
    { period: 6, time: '12:55 - 1:45', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
  ],
  Monday: [
    { period: 1, time: '7:45 - 8:35', subject: 'Arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
    { period: 2, time: '8:35 - 9:25', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 3, time: '9:55 - 10:45', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 4, time: '10:45 - 11:35', subject: 'Music', teacher: 'Sara Khalifa' },
    { period: 5, time: '12:05 - 12:55', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 6, time: '12:55 - 1:45', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
  ],
  Tuesday: [
    { period: 1, time: '7:45 - 8:35', subject: 'Arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
    { period: 2, time: '8:35 - 9:25', subject: 'Art', teacher: 'Nourhan Mahmoud Sary' },
    { period: 3, time: '9:55 - 10:45', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 4, time: '10:45 - 11:35', subject: 'Arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
    { period: 5, time: '12:05 - 12:55', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 6, time: '12:55 - 1:45', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
  ],
  Wednesday: [
    { period: 1, time: '7:45 - 8:35', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 2, time: '8:35 - 9:25', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 3, time: '9:55 - 10:45', subject: 'PE', teacher: 'Shreen Emad' },
    { period: 4, time: '10:45 - 11:35', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 5, time: '12:05 - 12:55', subject: 'Arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
    { period: 6, time: '12:55 - 1:45', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
  ],
  Thursday: [
    { period: 1, time: '7:45 - 8:35', subject: 'Arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
    { period: 2, time: '8:35 - 9:25', subject: 'Art', teacher: 'Nourhan Mahmoud Sary' },
    { period: 3, time: '9:55 - 10:45', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 4, time: '10:45 - 11:35', subject: 'Arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
    { period: 5, time: '12:05 - 12:55', subject: 'PE', teacher: 'Shreen Emad' },
    { period: 6, time: '12:55 - 1:45', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
  ],
};

const BASE_SCHEDULE_KG1C: Record<SchoolDay, PeriodSlot[]> = {
  Saturday: [],
  Sunday: [
    { period: 1, time: '7:45 - 8:35', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 2, time: '8:35 - 9:25', subject: 'Arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
    { period: 3, time: '9:55 - 10:45', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 4, time: '10:45 - 11:35', subject: 'Music', teacher: 'Sara Khalifa' },
    { period: 5, time: '12:05 - 12:55', subject: 'Art', teacher: 'Nourhan Mahmoud Sary' },
    { period: 6, time: '12:55 - 1:45', subject: 'Arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
  ],
  Monday: [
    { period: 1, time: '7:45 - 8:35', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 2, time: '8:35 - 9:25', subject: 'Arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
    { period: 3, time: '9:55 - 10:45', subject: 'Arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
    { period: 4, time: '10:45 - 11:35', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 5, time: '12:05 - 12:55', subject: 'Music', teacher: 'Sara Khalifa' },
    { period: 6, time: '12:55 - 1:45', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
  ],
  Tuesday: [
    { period: 1, time: '7:45 - 8:35', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 2, time: '8:35 - 9:25', subject: 'Arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
    { period: 3, time: '9:55 - 10:45', subject: 'PE', teacher: 'Shreen Emad' },
    { period: 4, time: '10:45 - 11:35', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 5, time: '12:05 - 12:55', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 6, time: '12:55 - 1:45', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
  ],
  Wednesday: [
    { period: 1, time: '7:45 - 8:35', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 2, time: '8:35 - 9:25', subject: 'Arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
    { period: 3, time: '9:55 - 10:45', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 4, time: '10:45 - 11:35', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 5, time: '12:05 - 12:55', subject: 'Arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
    { period: 6, time: '12:55 - 1:45', subject: 'Art', teacher: 'Nourhan Mahmoud Sary' },
  ],
  Thursday: [
    { period: 1, time: '7:45 - 8:35', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 2, time: '8:35 - 9:25', subject: 'PE', teacher: 'Shreen Emad' },
    { period: 3, time: '9:55 - 10:45', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 4, time: '10:45 - 11:35', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 5, time: '12:05 - 12:55', subject: 'English', teacher: 'Naglaa Mohamed / Rawan Wael' },
    { period: 6, time: '12:55 - 1:45', subject: 'Arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
  ],
};

export function createEmptyWeekSchedule(): Record<SchoolDay, PeriodSlot[]> {
  return {
    Saturday: [],
    Sunday: [],
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
  };
}

const EMPTY_SCHEDULE: Record<SchoolDay, PeriodSlot[]> = createEmptyWeekSchedule();

const RAW_CLASS_TIMETABLES: Record<string, Record<SchoolDay, PeriodSlot[]>> = {
  KG1A: BASE_SCHEDULE_KG1A,
  KG1B: EMPTY_SCHEDULE,
  KG1C: BASE_SCHEDULE_KG1C,
  KG1D: EMPTY_SCHEDULE,
  KG1E: EMPTY_SCHEDULE,

  // Aliases for compatibility
  'A': BASE_SCHEDULE_KG1A,
  'B': EMPTY_SCHEDULE,
  'C': BASE_SCHEDULE_KG1C,
  'D': EMPTY_SCHEDULE,
  'E': EMPTY_SCHEDULE,
};

export const CLASS_TIMETABLES: Record<string, Record<SchoolDay, PeriodSlot[]>> = new Proxy(
  RAW_CLASS_TIMETABLES,
  {
    get(target, prop: string) {
      if (typeof prop === 'string' && target[prop]) {
        return target[prop];
      }
      if (prop === 'KG1A' || prop === 'A') {
        return BASE_SCHEDULE_KG1A;
      }
      if (prop === 'KG1C' || prop === 'C') {
        return BASE_SCHEDULE_KG1C;
      }
      return EMPTY_SCHEDULE;
    },
  }
);

export const NEXT_SCHOOL_DAY: Record<SchoolDay, SchoolDay> = {
  Saturday: 'Sunday',
  Sunday: 'Monday',
  Monday: 'Tuesday',
  Tuesday: 'Wednesday',
  Wednesday: 'Thursday',
  Thursday: 'Sunday',
};

export function hasClassTimetable(classId?: string): boolean {
  if (!classId) return false;
  const clean = classId.replace(/^KG1/i, '').toUpperCase();
  const raw = RAW_CLASS_TIMETABLES[classId] || RAW_CLASS_TIMETABLES[clean] || CLASS_TIMETABLES[classId];
  if (!raw) return false;
  return Object.values(raw).some((slots) => Array.isArray(slots) && slots.length > 0);
}
