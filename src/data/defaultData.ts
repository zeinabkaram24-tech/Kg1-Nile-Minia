import { DayInfo, DayOfWeek, GradeSection, GradeSectionOption, PlanTask, StudentProfile, Subject, Timetable } from '../types';
import { TASKS_2A, TASKS_2B, TASKS_2C } from './gradeTasks';

export { TASKS_2A, TASKS_2B, TASKS_2C };

export const GRADE_SECTIONS: GradeSectionOption[] = [
  {
    id: 'KG1A',
    nameAr: 'فصل KG 1A',
    nameEn: 'KG 1 - A',
    badgeColor: 'bg-indigo-600 text-white',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-300',
    lightBg: 'bg-indigo-50',
  },
  {
    id: 'KG1B',
    nameAr: 'فصل KG 1B',
    nameEn: 'KG 1 - B',
    badgeColor: 'bg-purple-600 text-white',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-300',
    lightBg: 'bg-purple-50',
  },
  {
    id: 'KG1C',
    nameAr: 'فصل KG 1C',
    nameEn: 'KG 1 - C',
    badgeColor: 'bg-emerald-600 text-white',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-300',
    lightBg: 'bg-emerald-50',
  },
  {
    id: 'KG1D',
    nameAr: 'فصل KG 1D',
    nameEn: 'KG 1 - D',
    badgeColor: 'bg-amber-600 text-white',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-300',
    lightBg: 'bg-amber-50',
  },
  {
    id: 'KG1E',
    nameAr: 'فصل KG 1E',
    nameEn: 'KG 1 - E',
    badgeColor: 'bg-rose-600 text-white',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-300',
    lightBg: 'bg-rose-50',
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
  'KG1A': filterAllowedTasks(TASKS_2A),
  'KG1B': filterAllowedTasks(TASKS_2B),
  'KG1C': filterAllowedTasks(TASKS_2C),
  'KG1D': filterAllowedTasks(TASKS_2A),
  'KG1E': filterAllowedTasks(TASKS_2B),
  '1A': filterAllowedTasks(TASKS_2A),
  '1B': filterAllowedTasks(TASKS_2B),
  '1C': filterAllowedTasks(TASKS_2C),
  '1D': filterAllowedTasks(TASKS_2A),
  '1E': filterAllowedTasks(TASKS_2B),
  '2A': filterAllowedTasks(TASKS_2A),
  '2B': filterAllowedTasks(TASKS_2B),
  '2C': filterAllowedTasks(TASKS_2C),
};


export const DEFAULT_STUDENT: StudentProfile = {
  name: 'طالب KG 1',
  grade: 'KG 1',
  section: 'KG1A',
  schoolName: 'Nile Egyptian International Schools',
  branch: 'Minia Branch (فرع المنيا)',
};

const createEmptyTimetable = (): Timetable => ({
  sunday: [],
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
});

export const TIMETABLE_G2A: Timetable = createEmptyTimetable();
export const TIMETABLE_G2B: Timetable = createEmptyTimetable();
export const TIMETABLE_G2C: Timetable = createEmptyTimetable();

export const GRADE_TIMETABLES: Record<GradeSection, Timetable> = {
  'KG1A': filterAllowedTimetable(TIMETABLE_G2A),
  'KG1B': filterAllowedTimetable(TIMETABLE_G2B),
  'KG1C': filterAllowedTimetable(TIMETABLE_G2C),
  'KG1D': filterAllowedTimetable(TIMETABLE_G2A),
  'KG1E': filterAllowedTimetable(TIMETABLE_G2B),
  '1A': filterAllowedTimetable(TIMETABLE_G2A),
  '1B': filterAllowedTimetable(TIMETABLE_G2B),
  '1C': filterAllowedTimetable(TIMETABLE_G2C),
  '1D': filterAllowedTimetable(TIMETABLE_G2A),
  '1E': filterAllowedTimetable(TIMETABLE_G2B),
  '2A': filterAllowedTimetable(TIMETABLE_G2A),
  '2B': filterAllowedTimetable(TIMETABLE_G2B),
  '2C': filterAllowedTimetable(TIMETABLE_G2C),
};

// Default fallback timetable (KG1A)
export const DEFAULT_TIMETABLE: Timetable = GRADE_TIMETABLES['KG1A'];

// Default fallback tasks
export const DEFAULT_TASKS: PlanTask[] = TASKS_2A;
