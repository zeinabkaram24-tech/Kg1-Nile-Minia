import {
  SubjectInfo,
  ClassTimetable,
  WeeklyPlanItem,
  DailyFollowUp,
  StudentPersonalTask,
  SchoolMaterialFile
} from '../types';

export const SUBJECTS: SubjectInfo[] = [
  {
    id: 'arabic',
    nameAr: 'اللغة العربية',
    nameEn: 'Arabic',
    color: 'bg-emerald-50 text-emerald-800',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    iconName: 'Feather'
  },
  {
    id: 'english',
    nameAr: 'اللغة الإنجليزية',
    nameEn: 'English',
    color: 'bg-blue-50 text-blue-800',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    iconName: 'BookOpen'
  },
  {
    id: 'pe',
    nameAr: 'التربية الرياضية',
    nameEn: 'PE',
    color: 'bg-lime-50 text-lime-800',
    textColor: 'text-lime-700',
    borderColor: 'border-lime-200',
    iconName: 'Dumbbell'
  },
  {
    id: 'music',
    nameAr: 'التربية الموسيقية',
    nameEn: 'Music',
    color: 'bg-pink-50 text-pink-800',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200',
    iconName: 'Music'
  }
];

export const BLOCKS = [
  { id: 'block1', nameAr: 'توبيك 1', nameEn: 'Topic 1', weeksCount: 4, current: true },
  { id: 'block2', nameAr: 'توبيك 2', nameEn: 'Topic 2', weeksCount: 4, current: false },
  { id: 'block3', nameAr: 'توبيك 3', nameEn: 'Topic 3', weeksCount: 4, current: false },
  { id: 'block4', nameAr: 'توبيك 4', nameEn: 'Topic 4', weeksCount: 4, current: false },
];

export const WEEKS = [
  { id: 'week1', nameAr: 'أسبوع 1', nameEn: 'Week 1', isCurrent: false },
  { id: 'week2', nameAr: 'أسبوع 2', nameEn: 'Week 2', isCurrent: true },
  { id: 'week3', nameAr: 'أسبوع 3', nameEn: 'Week 3', isCurrent: false },
  { id: 'week4', nameAr: 'أسبوع 4', nameEn: 'Week 4', isCurrent: false },
];

export const PERIOD_TIMES = [
  { periodNum: 1, time: '07:45 - 08:35' },
  { periodNum: 2, time: '08:35 - 09:25' },
  { periodNum: 3, time: '09:55 - 10:45' },
  { periodNum: 4, time: '10:45 - 11:35' },
  { periodNum: 5, time: '12:05 - 12:55' },
  { periodNum: 6, time: '12:55 - 13:45' },
];

const DEFAULT_DAYS = [
  {
    day: 'Sunday',
    dayNameAr: 'الأحد',
    dayNameEn: 'Sunday',
    periods: [
      { period: 1, periodNum: 1, time: '07:45 - 08:35', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 2, periodNum: 2, time: '08:35 - 09:25', subject: 'Music', subjectId: 'music', teacher: 'Sara Khalifa' },
      { period: 3, periodNum: 3, time: '09:55 - 10:45', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 4, periodNum: 4, time: '10:45 - 11:35', subject: 'Arabic', subjectId: 'arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
      { period: 5, periodNum: 5, time: '12:05 - 12:55', subject: 'Arabic', subjectId: 'arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
      { period: 6, periodNum: 6, time: '12:55 - 13:45', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
    ]
  },
  {
    day: 'Monday',
    dayNameAr: 'الإثنين',
    dayNameEn: 'Monday',
    periods: [
      { period: 1, periodNum: 1, time: '07:45 - 08:35', subject: 'Arabic', subjectId: 'arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
      { period: 2, periodNum: 2, time: '08:35 - 09:25', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 3, periodNum: 3, time: '09:55 - 10:45', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 4, periodNum: 4, time: '10:45 - 11:35', subject: 'Music', subjectId: 'music', teacher: 'Sara Khalifa' },
      { period: 5, periodNum: 5, time: '12:05 - 12:55', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 6, periodNum: 6, time: '12:55 - 13:45', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
    ]
  },
  {
    day: 'Tuesday',
    dayNameAr: 'الثلاثاء',
    dayNameEn: 'Tuesday',
    periods: [
      { period: 1, periodNum: 1, time: '07:45 - 08:35', subject: 'Arabic', subjectId: 'arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
      { period: 2, periodNum: 2, time: '08:35 - 09:25', subject: 'Art', subjectId: 'art', teacher: 'Nourhan Mahmoud Sary' },
      { period: 3, periodNum: 3, time: '09:55 - 10:45', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 4, periodNum: 4, time: '10:45 - 11:35', subject: 'Arabic', subjectId: 'arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
      { period: 5, periodNum: 5, time: '12:05 - 12:55', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 6, periodNum: 6, time: '12:55 - 13:45', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
    ]
  },
  {
    day: 'Wednesday',
    dayNameAr: 'الأربعاء',
    dayNameEn: 'Wednesday',
    periods: [
      { period: 1, periodNum: 1, time: '07:45 - 08:35', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 2, periodNum: 2, time: '08:35 - 09:25', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 3, periodNum: 3, time: '09:55 - 10:45', subject: 'PE', subjectId: 'pe', teacher: 'Shreen Emad' },
      { period: 4, periodNum: 4, time: '10:45 - 11:35', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 5, periodNum: 5, time: '12:05 - 12:55', subject: 'Arabic', subjectId: 'arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
      { period: 6, periodNum: 6, time: '12:55 - 13:45', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
    ]
  },
  {
    day: 'Thursday',
    dayNameAr: 'الخميس',
    dayNameEn: 'Thursday',
    periods: [
      { period: 1, periodNum: 1, time: '07:45 - 08:35', subject: 'Arabic', subjectId: 'arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
      { period: 2, periodNum: 2, time: '08:35 - 09:25', subject: 'Art', subjectId: 'art', teacher: 'Nourhan Mahmoud Sary' },
      { period: 3, periodNum: 3, time: '09:55 - 10:45', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 4, periodNum: 4, time: '10:45 - 11:35', subject: 'Arabic', subjectId: 'arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
      { period: 5, periodNum: 5, time: '12:05 - 12:55', subject: 'PE', subjectId: 'pe', teacher: 'Shreen Emad' },
      { period: 6, periodNum: 6, time: '12:55 - 13:45', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
    ]
  }
];

const DEFAULT_DAYS_1C = [
  {
    day: 'Sunday',
    dayNameAr: 'الأحد',
    dayNameEn: 'Sunday',
    periods: [
      { period: 1, periodNum: 1, time: '07:45 - 08:35', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 2, periodNum: 2, time: '08:35 - 09:25', subject: 'Arabic', subjectId: 'arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
      { period: 3, periodNum: 3, time: '09:55 - 10:45', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 4, periodNum: 4, time: '10:45 - 11:35', subject: 'Music', subjectId: 'music', teacher: 'Sara Khalifa' },
      { period: 5, periodNum: 5, time: '12:05 - 12:55', subject: 'Art', subjectId: 'art', teacher: 'Nourhan Mahmoud Sary' },
      { period: 6, periodNum: 6, time: '12:55 - 13:45', subject: 'Arabic', subjectId: 'arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
    ]
  },
  {
    day: 'Monday',
    dayNameAr: 'الإثنين',
    dayNameEn: 'Monday',
    periods: [
      { period: 1, periodNum: 1, time: '07:45 - 08:35', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 2, periodNum: 2, time: '08:35 - 09:25', subject: 'Arabic', subjectId: 'arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
      { period: 3, periodNum: 3, time: '09:55 - 10:45', subject: 'Arabic', subjectId: 'arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
      { period: 4, periodNum: 4, time: '10:45 - 11:35', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 5, periodNum: 5, time: '12:05 - 12:55', subject: 'Music', subjectId: 'music', teacher: 'Sara Khalifa' },
      { period: 6, periodNum: 6, time: '12:55 - 13:45', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
    ]
  },
  {
    day: 'Tuesday',
    dayNameAr: 'الثلاثاء',
    dayNameEn: 'Tuesday',
    periods: [
      { period: 1, periodNum: 1, time: '07:45 - 08:35', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 2, periodNum: 2, time: '08:35 - 09:25', subject: 'Arabic', subjectId: 'arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
      { period: 3, periodNum: 3, time: '09:55 - 10:45', subject: 'PE', subjectId: 'pe', teacher: 'Shreen Emad' },
      { period: 4, periodNum: 4, time: '10:45 - 11:35', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 5, periodNum: 5, time: '12:05 - 12:55', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 6, periodNum: 6, time: '12:55 - 13:45', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
    ]
  },
  {
    day: 'Wednesday',
    dayNameAr: 'الأربعاء',
    dayNameEn: 'Wednesday',
    periods: [
      { period: 1, periodNum: 1, time: '07:45 - 08:35', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 2, periodNum: 2, time: '08:35 - 09:25', subject: 'Arabic', subjectId: 'arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
      { period: 3, periodNum: 3, time: '09:55 - 10:45', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 4, periodNum: 4, time: '10:45 - 11:35', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 5, periodNum: 5, time: '12:05 - 12:55', subject: 'Arabic', subjectId: 'arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
      { period: 6, periodNum: 6, time: '12:55 - 13:45', subject: 'Art', subjectId: 'art', teacher: 'Nourhan Mahmoud Sary' },
    ]
  },
  {
    day: 'Thursday',
    dayNameAr: 'الخميس',
    dayNameEn: 'Thursday',
    periods: [
      { period: 1, periodNum: 1, time: '07:45 - 08:35', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 2, periodNum: 2, time: '08:35 - 09:25', subject: 'PE', subjectId: 'pe', teacher: 'Shreen Emad' },
      { period: 3, periodNum: 3, time: '09:55 - 10:45', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 4, periodNum: 4, time: '10:45 - 11:35', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 5, periodNum: 5, time: '12:05 - 12:55', subject: 'English', subjectId: 'english', teacher: 'Naglaa Mohamed / Rawan Wael' },
      { period: 6, periodNum: 6, time: '12:55 - 13:45', subject: 'Arabic', subjectId: 'arabic', teacher: 'Mai Gamal / Hager M. Khalf' },
    ]
  }
];

export const INITIAL_TIMETABLES: ClassTimetable[] = [
  { classId: 'KG1A', days: DEFAULT_DAYS },
  { classId: 'KG1B', days: [] },
  { classId: 'KG1C', days: DEFAULT_DAYS_1C },
  { classId: 'KG1D', days: [] },
  { classId: 'KG1E', days: [] },
];


export const INITIAL_WEEKLY_PLANS: WeeklyPlanItem[] = [];

export const INITIAL_DAILY_FOLLOW_UPS: DailyFollowUp[] = [];

export const INITIAL_STUDENT_TASKS: StudentPersonalTask[] = [];

export const INITIAL_MATERIALS: SchoolMaterialFile[] = [];
