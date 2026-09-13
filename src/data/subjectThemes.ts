import { SubjectName } from '../types';

export interface SubjectColorTheme {
  // Classwork card colors (soft pleasant pastel background & coordinated accents)
  cwCard: string;
  cwPeriodBox: string;
  cwSubjectBox: string;
  cwTeacherBox: string;
  cwContentBox: string;
  cwPageBadge: string;
  cwDoneBadge: string;

  // Homework card colors (organized distinct colors per subject)
  hwCard: string;
  hwBorder: string;
  hwSubjectBadge: string;
  hwTag: string;
  hwPagesBadge: string;
  hwAccentBorder: string;
}

export const SUBJECT_THEMES: Record<SubjectName, SubjectColorTheme> = {
  Arabic: {
    cwCard: 'bg-emerald-50/50 border-emerald-200/90 hover:border-emerald-300 hover:bg-emerald-50/70',
    cwPeriodBox: 'bg-emerald-700 text-white',
    cwSubjectBox: 'bg-white/95 text-emerald-950 border-emerald-300 shadow-2xs',
    cwTeacherBox: 'bg-white/95 border-emerald-200/70 text-slate-800 shadow-2xs',
    cwContentBox: 'bg-white/90 border-emerald-100/90 shadow-2xs',
    cwPageBadge: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    cwDoneBadge: 'bg-emerald-100 text-emerald-950 border-emerald-300',

    hwCard: 'bg-emerald-50/50 border-emerald-200/90 hover:border-emerald-300 hover:bg-emerald-50/70',
    hwBorder: 'border-emerald-200',
    hwSubjectBadge: 'bg-white text-emerald-950 border-emerald-300 shadow-2xs',
    hwTag: 'bg-emerald-100/90 text-emerald-900 border-emerald-300/80',
    hwPagesBadge: 'bg-emerald-50/90 text-emerald-950 border-emerald-200',
    hwAccentBorder: 'border-s-emerald-500',
  },

  Mathematics: {
    cwCard: 'bg-sky-50/50 border-sky-200/90 hover:border-sky-300 hover:bg-sky-50/70',
    cwPeriodBox: 'bg-sky-700 text-white',
    cwSubjectBox: 'bg-white/95 text-sky-950 border-sky-300 shadow-2xs',
    cwTeacherBox: 'bg-white/95 border-sky-200/70 text-slate-800 shadow-2xs',
    cwContentBox: 'bg-white/90 border-sky-100/90 shadow-2xs',
    cwPageBadge: 'bg-sky-50 text-sky-900 border-sky-200',
    cwDoneBadge: 'bg-sky-100 text-sky-950 border-sky-300',

    hwCard: 'bg-sky-50/50 border-sky-200/90 hover:border-sky-300 hover:bg-sky-50/70',
    hwBorder: 'border-sky-200',
    hwSubjectBadge: 'bg-white text-sky-950 border-sky-300 shadow-2xs',
    hwTag: 'bg-sky-100/90 text-sky-900 border-sky-300/80',
    hwPagesBadge: 'bg-sky-50/90 text-sky-950 border-sky-200',
    hwAccentBorder: 'border-s-sky-500',
  },

  French: {
    cwCard: 'bg-indigo-50/50 border-indigo-200/90 hover:border-indigo-300 hover:bg-indigo-50/70',
    cwPeriodBox: 'bg-indigo-700 text-white',
    cwSubjectBox: 'bg-white/95 text-indigo-950 border-indigo-300 shadow-2xs',
    cwTeacherBox: 'bg-white/95 border-indigo-200/70 text-slate-800 shadow-2xs',
    cwContentBox: 'bg-white/90 border-indigo-100/90 shadow-2xs',
    cwPageBadge: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    cwDoneBadge: 'bg-indigo-100 text-indigo-950 border-indigo-300',

    hwCard: 'bg-indigo-50/50 border-indigo-200/90 hover:border-indigo-300 hover:bg-indigo-50/70',
    hwBorder: 'border-indigo-200',
    hwSubjectBadge: 'bg-white text-indigo-950 border-indigo-300 shadow-2xs',
    hwTag: 'bg-indigo-100/90 text-indigo-900 border-indigo-300/80',
    hwPagesBadge: 'bg-indigo-50/90 text-indigo-950 border-indigo-200',
    hwAccentBorder: 'border-s-indigo-500',
  },

  'Social Studies': {
    cwCard: 'bg-amber-50/50 border-amber-200/90 hover:border-amber-300 hover:bg-amber-50/70',
    cwPeriodBox: 'bg-amber-700 text-white',
    cwSubjectBox: 'bg-white/95 text-amber-950 border-amber-300 shadow-2xs',
    cwTeacherBox: 'bg-white/95 border-amber-200/70 text-slate-800 shadow-2xs',
    cwContentBox: 'bg-white/90 border-amber-100/90 shadow-2xs',
    cwPageBadge: 'bg-amber-50 text-amber-900 border-amber-200',
    cwDoneBadge: 'bg-amber-100 text-amber-950 border-amber-300',

    hwCard: 'bg-amber-50/50 border-amber-200/90 hover:border-amber-300 hover:bg-amber-50/70',
    hwBorder: 'border-amber-200',
    hwSubjectBadge: 'bg-white text-amber-950 border-amber-300 shadow-2xs',
    hwTag: 'bg-amber-100/90 text-amber-900 border-amber-300/80',
    hwPagesBadge: 'bg-amber-50/90 text-amber-950 border-amber-200',
    hwAccentBorder: 'border-s-amber-500',
  },

  English: {
    cwCard: 'bg-purple-50/50 border-purple-200/90 hover:border-purple-300 hover:bg-purple-50/70',
    cwPeriodBox: 'bg-purple-700 text-white',
    cwSubjectBox: 'bg-white/95 text-purple-950 border-purple-300 shadow-2xs',
    cwTeacherBox: 'bg-white/95 border-purple-200/70 text-slate-800 shadow-2xs',
    cwContentBox: 'bg-white/90 border-purple-100/90 shadow-2xs',
    cwPageBadge: 'bg-purple-50 text-purple-900 border-purple-200',
    cwDoneBadge: 'bg-purple-100 text-purple-950 border-purple-300',

    hwCard: 'bg-purple-50/50 border-purple-200/90 hover:border-purple-300 hover:bg-purple-50/70',
    hwBorder: 'border-purple-200',
    hwSubjectBadge: 'bg-white text-purple-950 border-purple-300 shadow-2xs',
    hwTag: 'bg-purple-100/90 text-purple-900 border-purple-300/80',
    hwPagesBadge: 'bg-purple-50/90 text-purple-950 border-purple-200',
    hwAccentBorder: 'border-s-purple-500',
  },

  Science: {
    cwCard: 'bg-teal-50/50 border-teal-200/90 hover:border-teal-300 hover:bg-teal-50/70',
    cwPeriodBox: 'bg-teal-700 text-white',
    cwSubjectBox: 'bg-white/95 text-teal-950 border-teal-300 shadow-2xs',
    cwTeacherBox: 'bg-white/95 border-teal-200/70 text-slate-800 shadow-2xs',
    cwContentBox: 'bg-white/90 border-teal-100/90 shadow-2xs',
    cwPageBadge: 'bg-teal-50 text-teal-900 border-teal-200',
    cwDoneBadge: 'bg-teal-100 text-teal-950 border-teal-300',

    hwCard: 'bg-teal-50/50 border-teal-200/90 hover:border-teal-300 hover:bg-teal-50/70',
    hwBorder: 'border-teal-200',
    hwSubjectBadge: 'bg-white text-teal-950 border-teal-300 shadow-2xs',
    hwTag: 'bg-teal-100/90 text-teal-900 border-teal-300/80',
    hwPagesBadge: 'bg-teal-50/90 text-teal-950 border-teal-200',
    hwAccentBorder: 'border-s-teal-500',
  },

  Religion: {
    cwCard: 'bg-violet-50/50 border-violet-200/90 hover:border-violet-300 hover:bg-violet-50/70',
    cwPeriodBox: 'bg-violet-700 text-white',
    cwSubjectBox: 'bg-white/95 text-violet-950 border-violet-300 shadow-2xs',
    cwTeacherBox: 'bg-white/95 border-violet-200/70 text-slate-800 shadow-2xs',
    cwContentBox: 'bg-white/90 border-violet-100/90 shadow-2xs',
    cwPageBadge: 'bg-violet-50 text-violet-900 border-violet-200',
    cwDoneBadge: 'bg-violet-100 text-violet-950 border-violet-300',

    hwCard: 'bg-violet-50/50 border-violet-200/90 hover:border-violet-300 hover:bg-violet-50/70',
    hwBorder: 'border-violet-200',
    hwSubjectBadge: 'bg-white text-violet-950 border-violet-300 shadow-2xs',
    hwTag: 'bg-violet-100/90 text-violet-900 border-violet-300/80',
    hwPagesBadge: 'bg-violet-50/90 text-violet-950 border-violet-200',
    hwAccentBorder: 'border-s-violet-500',
  },

  Arts: {
    cwCard: 'bg-rose-50/50 border-rose-200/90 hover:border-rose-300 hover:bg-rose-50/70',
    cwPeriodBox: 'bg-rose-700 text-white',
    cwSubjectBox: 'bg-white/95 text-rose-950 border-rose-300 shadow-2xs',
    cwTeacherBox: 'bg-white/95 border-rose-200/70 text-slate-800 shadow-2xs',
    cwContentBox: 'bg-white/90 border-rose-100/90 shadow-2xs',
    cwPageBadge: 'bg-rose-50 text-rose-900 border-rose-200',
    cwDoneBadge: 'bg-rose-100 text-rose-950 border-rose-300',

    hwCard: 'bg-rose-50/50 border-rose-200/90 hover:border-rose-300 hover:bg-rose-50/70',
    hwBorder: 'border-rose-200',
    hwSubjectBadge: 'bg-white text-rose-950 border-rose-300 shadow-2xs',
    hwTag: 'bg-rose-100/90 text-rose-900 border-rose-300/80',
    hwPagesBadge: 'bg-rose-50/90 text-rose-950 border-rose-200',
    hwAccentBorder: 'border-s-rose-500',
  },

  Music: {
    cwCard: 'bg-pink-50/50 border-pink-200/90 hover:border-pink-300 hover:bg-pink-50/70',
    cwPeriodBox: 'bg-pink-700 text-white',
    cwSubjectBox: 'bg-white/95 text-pink-950 border-pink-300 shadow-2xs',
    cwTeacherBox: 'bg-white/95 border-pink-200/70 text-slate-800 shadow-2xs',
    cwContentBox: 'bg-white/90 border-pink-100/90 shadow-2xs',
    cwPageBadge: 'bg-pink-50 text-pink-900 border-pink-200',
    cwDoneBadge: 'bg-pink-100 text-pink-950 border-pink-300',

    hwCard: 'bg-pink-50/50 border-pink-200/90 hover:border-pink-300 hover:bg-pink-50/70',
    hwBorder: 'border-pink-200',
    hwSubjectBadge: 'bg-white text-pink-950 border-pink-300 shadow-2xs',
    hwTag: 'bg-pink-100/90 text-pink-900 border-pink-300/80',
    hwPagesBadge: 'bg-pink-50/90 text-pink-950 border-pink-200',
    hwAccentBorder: 'border-s-pink-500',
  },

  PE: {
    cwCard: 'bg-orange-50/50 border-orange-200/90 hover:border-orange-300 hover:bg-orange-50/70',
    cwPeriodBox: 'bg-orange-700 text-white',
    cwSubjectBox: 'bg-white/95 text-orange-950 border-orange-300 shadow-2xs',
    cwTeacherBox: 'bg-white/95 border-orange-200/70 text-slate-800 shadow-2xs',
    cwContentBox: 'bg-white/90 border-orange-100/90 shadow-2xs',
    cwPageBadge: 'bg-orange-50 text-orange-900 border-orange-200',
    cwDoneBadge: 'bg-orange-100 text-orange-950 border-orange-300',

    hwCard: 'bg-orange-50/50 border-orange-200/90 hover:border-orange-300 hover:bg-orange-50/70',
    hwBorder: 'border-orange-200',
    hwSubjectBadge: 'bg-white text-orange-950 border-orange-300 shadow-2xs',
    hwTag: 'bg-orange-100/90 text-orange-900 border-orange-300/80',
    hwPagesBadge: 'bg-orange-50/90 text-orange-950 border-orange-200',
    hwAccentBorder: 'border-s-orange-500',
  },

  ICT: {
    cwCard: 'bg-cyan-50/50 border-cyan-200/90 hover:border-cyan-300 hover:bg-cyan-50/70',
    cwPeriodBox: 'bg-cyan-700 text-white',
    cwSubjectBox: 'bg-white/95 text-cyan-950 border-cyan-300 shadow-2xs',
    cwTeacherBox: 'bg-white/95 border-cyan-200/70 text-slate-800 shadow-2xs',
    cwContentBox: 'bg-white/90 border-cyan-100/90 shadow-2xs',
    cwPageBadge: 'bg-cyan-50 text-cyan-900 border-cyan-200',
    cwDoneBadge: 'bg-cyan-100 text-cyan-950 border-cyan-300',

    hwCard: 'bg-cyan-50/50 border-cyan-200/90 hover:border-cyan-300 hover:bg-cyan-50/70',
    hwBorder: 'border-cyan-200',
    hwSubjectBadge: 'bg-white text-cyan-950 border-cyan-300 shadow-2xs',
    hwTag: 'bg-cyan-100/90 text-cyan-900 border-cyan-300/80',
    hwPagesBadge: 'bg-cyan-50/90 text-cyan-950 border-cyan-200',
    hwAccentBorder: 'border-s-cyan-500',
  },
};

export function getSubjectTheme(subject: SubjectName): SubjectColorTheme {
  return (
    SUBJECT_THEMES[subject] || {
      cwCard: 'bg-slate-50/60 border-slate-200 hover:border-slate-300',
      cwPeriodBox: 'bg-slate-800 text-white',
      cwSubjectBox: 'bg-white text-slate-900 border-slate-300 shadow-2xs',
      cwTeacherBox: 'bg-white border-slate-200 text-slate-800 shadow-2xs',
      cwContentBox: 'bg-white/90 border-slate-200 shadow-2xs',
      cwPageBadge: 'bg-slate-50 text-slate-800 border-slate-200',
      cwDoneBadge: 'bg-slate-100 text-slate-900 border-slate-300',

      hwCard: 'bg-slate-50/60 border-slate-200 hover:border-slate-300',
      hwBorder: 'border-slate-200',
      hwSubjectBadge: 'bg-white text-slate-900 border-slate-300 shadow-2xs',
      hwTag: 'bg-slate-100 text-slate-800 border-slate-200',
      hwPagesBadge: 'bg-slate-50 text-slate-800 border-slate-200',
      hwAccentBorder: 'border-s-slate-400',
    }
  );
}
