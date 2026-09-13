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
  3: '9:45 - 10:35',
  4: '10:35 - 11:25',
  5: '11:25 - 12:15',
  6: '12:15 - 13:05',
  7: '13:25 - 14:15',
  8: '14:15 - 15:05',
};

export const BREAK_SLOTS: BreakSlot[] = [
  { name: 'Morning Line & Assembly', time: '7:30 - 7:45', type: 'line' },
  { name: 'Breakfast Break', time: '9:25 - 9:45', type: 'breakfast' },
  { name: 'Lunch Break', time: '13:05 - 13:25', type: 'lunch' },
];

// Block & Week date ranges (Day and Month only without year)
export const BLOCK_WEEK_DATES: Record<number, Record<number, string>> = {
  1: {
    1: '6/9 - 10/9',
    2: '13/9 - 17/9',
    3: '20/9 - 24/9',
    4: '27/9 - 1/10',
  },
  2: {
    1: '4/10 - 8/10',
    2: '11/10 - 15/10',
    3: '18/10 - 22/10',
    4: '25/10 - 29/10',
  },
  3: {
    1: '1/11 - 5/11',
    2: '8/11 - 12/11',
    3: '15/11 - 19/11',
    4: '22/11 - 26/11',
  },
  4: {
    1: '29/11 - 3/12',
    2: '6/12 - 10/12',
    3: '13/12 - 17/12',
    4: '20/12 - 24/12',
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

export const CLASS_TIMETABLES: Record<ClassId, Record<SchoolDay, PeriodSlot[]>> = {
  // KG 1 A
  KG1A: {
    Saturday: [],
    Sunday: [
      { period: 1, time: '7:45 - 8:35', subject: 'PE', teacher: 'Kareem Mostafa' },
      { period: 2, time: '8:35 - 9:25', subject: 'Social Studies', teacher: 'Walaa Fayz' },
      { period: 3, time: '9:45 - 10:35', subject: 'ICT', teacher: 'Rana' },
      { period: 4, time: '10:35 - 11:25', subject: 'Arts', teacher: 'Walid Ahmed Fouad' },
      { period: 5, time: '11:25 - 12:15', subject: 'Science', teacher: 'Salma Ahmed' },
      { period: 6, time: '12:15 - 13:05', subject: 'English', teacher: 'Toqa' },
      { period: 7, time: '13:25 - 14:15', subject: 'Arabic', teacher: 'Eman' },
      { period: 8, time: '14:15 - 15:05', subject: 'Mathematics', teacher: 'Maryem Sameer' },
    ],
    Monday: [
      { period: 1, time: '7:45 - 8:35', subject: 'Music', teacher: 'Afronia' },
      { period: 2, time: '8:35 - 9:25', subject: 'Mathematics', teacher: 'Maryem Sameer' },
      { period: 3, time: '9:45 - 10:35', subject: 'English', teacher: 'Toqa' },
      { period: 4, time: '10:35 - 11:25', subject: 'English', teacher: 'Toqa' },
      { period: 5, time: '11:25 - 12:15', subject: 'Arabic', teacher: 'Eman' },
      { period: 6, time: '12:15 - 13:05', subject: 'Arabic', teacher: 'Eman' },
      { period: 7, time: '13:25 - 14:15', subject: 'ICT', teacher: 'Rana' },
      { period: 8, time: '14:15 - 15:05', subject: 'PE', teacher: 'Kareem Mostafa' },
    ],
    Tuesday: [
      { period: 1, time: '7:45 - 8:35', subject: 'English', teacher: 'Toqa' },
      { period: 2, time: '8:35 - 9:25', subject: 'English', teacher: 'Toqa' },
      { period: 3, time: '9:45 - 10:35', subject: 'Mathematics', teacher: 'Maryem Sameer' },
      { period: 4, time: '10:35 - 11:25', subject: 'Mathematics', teacher: 'Maryem Sameer' },
      { period: 5, time: '11:25 - 12:15', subject: 'Religion', teacher: 'Eman / Maryam', notes: 'Islamic: Eman / Christian: Maryam' },
      { period: 6, time: '12:15 - 13:05', subject: 'French', teacher: "Doa'a Fekry" },
      { period: 7, time: '13:25 - 14:15', subject: 'Arts', teacher: 'Walid Ahmed Fouad' },
      { period: 8, time: '14:15 - 15:05', subject: 'Arabic', teacher: 'Eman' },
    ],
    Wednesday: [
      { period: 1, time: '7:45 - 8:35', subject: 'Mathematics', teacher: 'Maryem Sameer' },
      { period: 2, time: '8:35 - 9:25', subject: 'Science', teacher: 'Salma Ahmed' },
      { period: 3, time: '9:45 - 10:35', subject: 'ICT', teacher: 'Rana' },
      { period: 4, time: '10:35 - 11:25', subject: 'Social Studies', teacher: 'Walaa Fayz' },
      { period: 5, time: '11:25 - 12:15', subject: 'French', teacher: "Doa'a Fekry" },
      { period: 6, time: '12:15 - 13:05', subject: 'Arabic', teacher: 'Eman' },
      { period: 7, time: '13:25 - 14:15', subject: 'English', teacher: 'Toqa' },
      { period: 8, time: '14:15 - 15:05', subject: 'English', teacher: 'Toqa' },
    ],
    Thursday: [
      { period: 1, time: '7:45 - 8:35', subject: 'English', teacher: 'Toqa' },
      { period: 2, time: '8:35 - 9:25', subject: 'French', teacher: "Doa'a Fekry" },
      { period: 3, time: '9:45 - 10:35', subject: 'Religion', teacher: 'Eman / Maryam', notes: 'Islamic: Eman / Christian: Maryam' },
      { period: 4, time: '10:35 - 11:25', subject: 'Arabic', teacher: 'Eman' },
      { period: 5, time: '11:25 - 12:15', subject: 'Mathematics', teacher: 'Maryem Sameer' },
      { period: 6, time: '12:15 - 13:05', subject: 'Music', teacher: 'Afronia' },
      { period: 7, time: '13:25 - 14:15', subject: 'Social Studies', teacher: 'Walaa Fayz' },
      { period: 8, time: '14:15 - 15:05', subject: 'Science', teacher: 'Salma Ahmed' },
    ],
  },

  // KG 1 B
  KG1B: {
    Saturday: [],
    Sunday: [
      { period: 1, time: '7:45 - 8:35', subject: 'French', teacher: "Doa'a Fekry" },
      { period: 2, time: '8:35 - 9:25', subject: 'Mathematics', teacher: 'Maryem Sameer' },
      { period: 3, time: '9:45 - 10:35', subject: 'Arabic', teacher: 'Marwa Mamdouh' },
      { period: 4, time: '10:35 - 11:25', subject: 'Science', teacher: 'Salma Ahmed' },
      { period: 5, time: '11:25 - 12:15', subject: 'English', teacher: "Ala'a" },
      { period: 6, time: '12:15 - 13:05', subject: 'English', teacher: "Ala'a" },
      { period: 7, time: '13:25 - 14:15', subject: 'ICT', teacher: 'Mariem' },
      { period: 8, time: '14:15 - 15:05', subject: 'Music', teacher: 'Afronia' },
    ],
    Monday: [
      { period: 1, time: '7:45 - 8:35', subject: 'Social Studies', teacher: 'Manar Hassan' },
      { period: 2, time: '8:35 - 9:25', subject: 'PE', teacher: 'Rana' },
      { period: 3, time: '9:45 - 10:35', subject: 'English', teacher: "Ala'a" },
      { period: 4, time: '10:35 - 11:25', subject: 'English', teacher: "Ala'a" },
      { period: 5, time: '11:25 - 12:15', subject: 'Mathematics', teacher: 'Maryem Sameer' },
      { period: 6, time: '12:15 - 13:05', subject: 'Mathematics', teacher: 'Maryem Sameer' },
      { period: 7, time: '13:25 - 14:15', subject: 'French', teacher: "Doa'a Fekry" },
      { period: 8, time: '14:15 - 15:05', subject: 'Arabic', teacher: 'Marwa Mamdouh' },
    ],
    Tuesday: [
      { period: 1, time: '7:45 - 8:35', subject: 'Mathematics', teacher: 'Maryem Sameer' },
      { period: 2, time: '8:35 - 9:25', subject: 'Arts', teacher: 'Walid Ahmed Fouad' },
      { period: 3, time: '9:45 - 10:35', subject: 'ICT', teacher: 'Mariem' },
      { period: 4, time: '10:35 - 11:25', subject: 'French', teacher: "Doa'a Fekry" },
      { period: 5, time: '11:25 - 12:15', subject: 'Religion', teacher: 'Marwa Mamdouh / Maryam', notes: 'Islamic: Marwa Mamdouh / Christian: Maryam' },
      { period: 6, time: '12:15 - 13:05', subject: 'Arabic', teacher: 'Marwa Mamdouh' },
      { period: 7, time: '13:25 - 14:15', subject: 'Music', teacher: 'Afronia' },
      { period: 8, time: '14:15 - 15:05', subject: 'English', teacher: "Ala'a" },
    ],
    Wednesday: [
      { period: 1, time: '7:45 - 8:35', subject: 'English', teacher: "Ala'a" },
      { period: 2, time: '8:35 - 9:25', subject: 'Social Studies', teacher: 'Manar Hassan' },
      { period: 3, time: '9:45 - 10:35', subject: 'Arabic', teacher: 'Marwa Mamdouh' },
      { period: 4, time: '10:35 - 11:25', subject: 'Arabic', teacher: 'Marwa Mamdouh' },
      { period: 5, time: '11:25 - 12:15', subject: 'Mathematics', teacher: 'Maryem Sameer' },
      { period: 6, time: '12:15 - 13:05', subject: 'PE', teacher: 'Rana' },
      { period: 7, time: '13:25 - 14:15', subject: 'Science', teacher: 'Salma Ahmed' },
      { period: 8, time: '14:15 - 15:05', subject: 'Arts', teacher: 'Walid Ahmed Fouad' },
    ],
    Thursday: [
      { period: 1, time: '7:45 - 8:35', subject: 'Arabic', teacher: 'Marwa Mamdouh' },
      { period: 2, time: '8:35 - 9:25', subject: 'Social Studies', teacher: 'Manar Hassan' },
      { period: 3, time: '9:45 - 10:35', subject: 'Religion', teacher: 'Marwa Mamdouh / Maryam', notes: 'Islamic: Marwa Mamdouh / Christian: Maryam' },
      { period: 4, time: '10:35 - 11:25', subject: 'Mathematics', teacher: 'Maryem Sameer' },
      { period: 5, time: '11:25 - 12:15', subject: 'English', teacher: "Ala'a" },
      { period: 6, time: '12:15 - 13:05', subject: 'English', teacher: "Ala'a" },
      { period: 7, time: '13:25 - 14:15', subject: 'Science', teacher: 'Salma Ahmed' },
      { period: 8, time: '14:15 - 15:05', subject: 'ICT', teacher: 'Mariem' },
    ],
  },

  // KG 1 C
  KG1C: {
    Saturday: [],
    Sunday: [
      { period: 1, time: '7:45 - 8:35', subject: 'English', teacher: 'Mostafa Mohamed' },
      { period: 2, time: '8:35 - 9:25', subject: 'French', teacher: 'Lamiaa' },
      { period: 3, time: '9:45 - 10:35', subject: 'Mathematics', teacher: 'Sandy' },
      { period: 4, time: '10:35 - 11:25', subject: 'Mathematics', teacher: 'Sandy' },
      { period: 5, time: '11:25 - 12:15', subject: 'ICT', teacher: 'Rana' },
      { period: 6, time: '12:15 - 13:05', subject: 'Arabic', teacher: 'Marwa Mamdouh' },
      { period: 7, time: '13:25 - 14:15', subject: 'Social Studies', teacher: 'Manar Hassan' },
      { period: 8, time: '14:15 - 15:05', subject: 'PE', teacher: 'Ahmed Hasanin' },
    ],
    Monday: [
      { period: 1, time: '7:45 - 8:35', subject: 'Arabic', teacher: 'Marwa Mamdouh' },
      { period: 2, time: '8:35 - 9:25', subject: 'Arabic', teacher: 'Marwa Mamdouh' },
      { period: 3, time: '9:45 - 10:35', subject: 'French', teacher: 'Lamiaa' },
      { period: 4, time: '10:35 - 11:25', subject: 'English', teacher: 'Mostafa Mohamed' },
      { period: 5, time: '11:25 - 12:15', subject: 'Science', teacher: 'Salma Ahmed' },
      { period: 6, time: '12:15 - 13:05', subject: 'Social Studies', teacher: 'Manar Hassan' },
      { period: 7, time: '13:25 - 14:15', subject: 'Music', teacher: 'Afronia' },
      { period: 8, time: '14:15 - 15:05', subject: 'Mathematics', teacher: 'Sandy' },
    ],
    Tuesday: [
      { period: 1, time: '7:45 - 8:35', subject: 'PE', teacher: 'Ahmed Hasanin' },
      { period: 2, time: '8:35 - 9:25', subject: 'Arabic', teacher: 'Marwa Mamdouh' },
      { period: 3, time: '9:45 - 10:35', subject: 'Science', teacher: 'Salma Ahmed' },
      { period: 4, time: '10:35 - 11:25', subject: 'Mathematics', teacher: 'Sandy' },
      { period: 5, time: '11:25 - 12:15', subject: 'Religion', teacher: 'Fatema / Maryam', notes: 'Islamic: Fatema / Christian: Maryam' },
      { period: 6, time: '12:15 - 13:05', subject: 'ICT', teacher: 'Rana' },
      { period: 7, time: '13:25 - 14:15', subject: 'English', teacher: 'Mostafa Mohamed' },
      { period: 8, time: '14:15 - 15:05', subject: 'English', teacher: 'Mostafa Mohamed' },
    ],
    Wednesday: [
      { period: 1, time: '7:45 - 8:35', subject: 'Social Studies', teacher: 'Manar Hassan' },
      { period: 2, time: '8:35 - 9:25', subject: 'French', teacher: 'Lamiaa' },
      { period: 3, time: '9:45 - 10:35', subject: 'English', teacher: 'Mostafa Mohamed' },
      { period: 4, time: '10:35 - 11:25', subject: 'English', teacher: 'Mostafa Mohamed' },
      { period: 5, time: '11:25 - 12:15', subject: 'Arts', teacher: 'Walid Ahmed Fouad' },
      { period: 6, time: '12:15 - 13:05', subject: 'Arabic', teacher: 'Marwa Mamdouh' },
      { period: 7, time: '13:25 - 14:15', subject: 'Mathematics', teacher: 'Sandy' },
      { period: 8, time: '14:15 - 15:05', subject: 'Music', teacher: 'Afronia' },
    ],
    Thursday: [
      { period: 1, time: '7:45 - 8:35', subject: 'ICT', teacher: 'Rana' },
      { period: 2, time: '8:35 - 9:25', subject: 'Science', teacher: 'Salma Ahmed' },
      { period: 3, time: '9:45 - 10:35', subject: 'Religion', teacher: 'Fatema / Maryam', notes: 'Islamic: Fatema / Christian: Maryam' },
      { period: 4, time: '10:35 - 11:25', subject: 'English', teacher: 'Mostafa Mohamed' },
      { period: 5, time: '11:25 - 12:15', subject: 'English', teacher: 'Mostafa Mohamed' },
      { period: 6, time: '12:15 - 13:05', subject: 'Mathematics', teacher: 'Sandy' },
      { period: 7, time: '13:25 - 14:15', subject: 'Arabic', teacher: 'Marwa Mamdouh' },
      { period: 8, time: '14:15 - 15:05', subject: 'Arts', teacher: 'Walid Ahmed Fouad' },
    ],
  },

  // KG 1 D
  KG1D: {
    Saturday: [],
    Sunday: [
      { period: 1, time: '7:45 - 8:35', subject: 'Mathematics', teacher: 'Maryem Sameer' },
      { period: 2, time: '8:35 - 9:25', subject: 'English', teacher: 'Toqa' },
      { period: 3, time: '9:45 - 10:35', subject: 'Arabic', teacher: 'Eman' },
      { period: 4, time: '10:35 - 11:25', subject: 'PE', teacher: 'Kareem Mostafa' },
      { period: 5, time: '11:25 - 12:15', subject: 'Social Studies', teacher: 'Walaa Fayz' },
      { period: 6, time: '12:15 - 13:05', subject: 'Science', teacher: 'Salma Ahmed' },
      { period: 7, time: '13:25 - 14:15', subject: 'Arts', teacher: 'Walid Ahmed Fouad' },
      { period: 8, time: '14:15 - 15:05', subject: 'ICT', teacher: 'Rana' },
    ],
    Monday: [
      { period: 1, time: '7:45 - 8:35', subject: 'English', teacher: 'Toqa' },
      { period: 2, time: '8:35 - 9:25', subject: 'English', teacher: 'Toqa' },
      { period: 3, time: '9:45 - 10:35', subject: 'Music', teacher: 'Afronia' },
      { period: 4, time: '10:35 - 11:25', subject: 'Mathematics', teacher: 'Maryem Sameer' },
      { period: 5, time: '11:25 - 12:15', subject: 'PE', teacher: 'Kareem Mostafa' },
      { period: 6, time: '12:15 - 13:05', subject: 'Arabic', teacher: 'Eman' },
      { period: 7, time: '13:25 - 14:15', subject: 'Arabic', teacher: 'Eman' },
      { period: 8, time: '14:15 - 15:05', subject: 'ICT', teacher: 'Rana' },
    ],
    Tuesday: [
      { period: 1, time: '7:45 - 8:35', subject: 'Mathematics', teacher: 'Maryem Sameer' },
      { period: 2, time: '8:35 - 9:25', subject: 'Mathematics', teacher: 'Maryem Sameer' },
      { period: 3, time: '9:45 - 10:35', subject: 'English', teacher: 'Toqa' },
      { period: 4, time: '10:35 - 11:25', subject: 'English', teacher: 'Toqa' },
      { period: 5, time: '11:25 - 12:15', subject: 'French', teacher: "Doa'a Fekry" },
      { period: 6, time: '12:15 - 13:05', subject: 'Religion', teacher: 'Eman / Maryam', notes: 'Islamic: Eman / Christian: Maryam' },
      { period: 7, time: '13:25 - 14:15', subject: 'Arabic', teacher: 'Eman' },
      { period: 8, time: '14:15 - 15:05', subject: 'Arts', teacher: 'Walid Ahmed Fouad' },
    ],
    Wednesday: [
      { period: 1, time: '7:45 - 8:35', subject: 'Science', teacher: 'Salma Ahmed' },
      { period: 2, time: '8:35 - 9:25', subject: 'Mathematics', teacher: 'Maryem Sameer' },
      { period: 3, time: '9:45 - 10:35', subject: 'Social Studies', teacher: 'Walaa Fayz' },
      { period: 4, time: '10:35 - 11:25', subject: 'ICT', teacher: 'Rana' },
      { period: 5, time: '11:25 - 12:15', subject: 'Arabic', teacher: 'Eman' },
      { period: 6, time: '12:15 - 13:05', subject: 'French', teacher: "Doa'a Fekry" },
      { period: 7, time: '13:25 - 14:15', subject: 'English', teacher: 'Toqa' },
      { period: 8, time: '14:15 - 15:05', subject: 'English', teacher: 'Toqa' },
    ],
    Thursday: [
      { period: 1, time: '7:45 - 8:35', subject: 'French', teacher: "Doa'a Fekry" },
      { period: 2, time: '8:35 - 9:25', subject: 'English', teacher: 'Toqa' },
      { period: 3, time: '9:45 - 10:35', subject: 'Arabic', teacher: 'Eman' },
      { period: 4, time: '10:35 - 11:25', subject: 'Religion', teacher: 'Eman / Maryam', notes: 'Islamic: Eman / Christian: Maryam' },
      { period: 5, time: '11:25 - 12:15', subject: 'Music', teacher: 'Afronia' },
      { period: 6, time: '12:15 - 13:05', subject: 'Mathematics', teacher: 'Maryem Sameer' },
      { period: 7, time: '13:25 - 14:15', subject: 'Science', teacher: 'Salma Ahmed' },
      { period: 8, time: '14:15 - 15:05', subject: 'Social Studies', teacher: 'Walaa Fayz' },
    ],
  },

  // KG 1 E
  KG1E: {
    Saturday: [],
    Sunday: [
      { period: 1, time: '7:45 - 8:35', subject: 'Arabic', teacher: 'Marwa Mamdouh' },
      { period: 2, time: '8:35 - 9:25', subject: 'French', teacher: "Doa'a Fekry" },
      { period: 3, time: '9:45 - 10:35', subject: 'English', teacher: "Ala'a" },
      { period: 4, time: '10:35 - 11:25', subject: 'English', teacher: "Ala'a" },
      { period: 5, time: '11:25 - 12:15', subject: 'Mathematics', teacher: 'Maryem Sameer' },
      { period: 6, time: '12:15 - 13:05', subject: 'Science', teacher: 'Salma Ahmed' },
      { period: 7, time: '13:25 - 14:15', subject: 'Music', teacher: 'Afronia' },
      { period: 8, time: '14:15 - 15:05', subject: 'ICT', teacher: 'Mariem' },
    ],
    Monday: [
      { period: 1, time: '7:45 - 8:35', subject: 'English', teacher: "Ala'a" },
      { period: 2, time: '8:35 - 9:25', subject: 'English', teacher: "Ala'a" },
      { period: 3, time: '9:45 - 10:35', subject: 'Social Studies', teacher: 'Manar Hassan' },
      { period: 4, time: '10:35 - 11:25', subject: 'PE', teacher: 'Rana' },
      { period: 5, time: '11:25 - 12:15', subject: 'Arabic', teacher: 'Marwa Mamdouh' },
      { period: 6, time: '12:15 - 13:05', subject: 'French', teacher: "Doa'a Fekry" },
      { period: 7, time: '13:25 - 14:15', subject: 'Mathematics', teacher: 'Maryem Sameer' },
      { period: 8, time: '14:15 - 15:05', subject: 'Mathematics', teacher: 'Maryem Sameer' },
    ],
    Tuesday: [
      { period: 1, time: '7:45 - 8:35', subject: 'Arts', teacher: 'Walid Ahmed Fouad' },
      { period: 2, time: '8:35 - 9:25', subject: 'Mathematics', teacher: 'Maryem Sameer' },
      { period: 3, time: '9:45 - 10:35', subject: 'French', teacher: "Doa'a Fekry" },
      { period: 4, time: '10:35 - 11:25', subject: 'ICT', teacher: 'Mariem' },
      { period: 5, time: '11:25 - 12:15', subject: 'Arabic', teacher: 'Marwa Mamdouh' },
      { period: 6, time: '12:15 - 13:05', subject: 'Religion', teacher: 'Marwa Mamdouh / Maryam', notes: 'Islamic: Marwa Mamdouh / Christian: Maryam' },
      { period: 7, time: '13:25 - 14:15', subject: 'English', teacher: "Ala'a" },
      { period: 8, time: '14:15 - 15:05', subject: 'Music', teacher: 'Afronia' },
    ],
    Wednesday: [
      { period: 1, time: '7:45 - 8:35', subject: 'Social Studies', teacher: 'Manar Hassan' },
      { period: 2, time: '8:35 - 9:25', subject: 'English', teacher: "Ala'a" },
      { period: 3, time: '9:45 - 10:35', subject: 'Mathematics', teacher: 'Maryem Sameer' },
      { period: 4, time: '10:35 - 11:25', subject: 'PE', teacher: 'Rana' },
      { period: 5, time: '11:25 - 12:15', subject: 'Science', teacher: 'Salma Ahmed' },
      { period: 6, time: '12:15 - 13:05', subject: 'Arabic', teacher: 'Marwa Mamdouh' },
      { period: 7, time: '13:25 - 14:15', subject: 'Arabic', teacher: 'Marwa Mamdouh' },
      { period: 8, time: '14:15 - 15:05', subject: 'Arts', teacher: 'Walid Ahmed Fouad' },
    ],
    Thursday: [
      { period: 1, time: '7:45 - 8:35', subject: 'Social Studies', teacher: 'Manar Hassan' },
      { period: 2, time: '8:35 - 9:25', subject: 'Arabic', teacher: 'Marwa Mamdouh' },
      { period: 3, time: '9:45 - 10:35', subject: 'Mathematics', teacher: 'Maryem Sameer' },
      { period: 4, time: '10:35 - 11:25', subject: 'Religion', teacher: 'Marwa Mamdouh / Maryam', notes: 'Islamic: Marwa Mamdouh / Christian: Maryam' },
      { period: 5, time: '11:25 - 12:15', subject: 'ICT', teacher: 'Mariem' },
      { period: 6, time: '12:15 - 13:05', subject: 'Science', teacher: 'Salma Ahmed' },
      { period: 7, time: '13:25 - 14:15', subject: 'English', teacher: "Ala'a" },
      { period: 8, time: '14:15 - 15:05', subject: 'English', teacher: "Ala'a" },
    ],
  },
};

export const NEXT_SCHOOL_DAY: Record<SchoolDay, SchoolDay> = {
  Saturday: 'Sunday',
  Sunday: 'Monday',
  Monday: 'Tuesday',
  Tuesday: 'Wednesday',
  Wednesday: 'Thursday',
  Thursday: 'Sunday',
};
