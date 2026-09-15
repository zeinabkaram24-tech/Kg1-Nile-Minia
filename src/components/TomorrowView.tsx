import React from 'react';
import { Sparkles, BookOpen } from 'lucide-react';
import { ClassId, SchoolDay, PeriodSlot } from '../types';
import {
  CLASS_TIMETABLES,
  NEXT_SCHOOL_DAY,
  SUBJECT_METADATA,
} from '../data/timetables';
import { SPECIAL_TEACHER_NOTES } from '../data/defaultWeeklyPlan';
import { WEEK2_SPECIAL_NOTES } from '../data/week2Plan';
import { SubjectIcon } from './SubjectIcon';

interface TomorrowViewProps {
  currentClass: ClassId;
  selectedDay: SchoolDay;
  currentBlock?: number;
  currentWeek?: number;
  timetables?: Record<ClassId, Record<SchoolDay, PeriodSlot[]>>;
}

const ARABIC_DAY_NAMES: Record<SchoolDay, string> = {
  Saturday: 'السبت',
  Sunday: 'الأحد',
  Monday: 'الإثنين',
  Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء',
  Thursday: 'الخميس',
};

export const TomorrowView: React.FC<TomorrowViewProps> = ({
  currentClass,
  selectedDay,
  currentBlock = 1,
  currentWeek = 1,
  timetables,
}) => {
  // Tomorrow's target day based on the active selected day
  const tomorrowDay: SchoolDay = NEXT_SCHOOL_DAY[selectedDay] || 'Sunday';

  // Tomorrow's timetable periods
  const schedule = timetables ? timetables[currentClass] : CLASS_TIMETABLES[currentClass];
  const targetPeriods: PeriodSlot[] = (schedule && schedule[tomorrowDay]) || [];

  // Notes from weekly plan for tomorrow (only teacher instructions / tools / bag items, strictly excluding homework)
  const isHomeworkNote = (noteText: string, arabicText?: string) => {
    const lower = (noteText + ' ' + (arabicText || '')).toLowerCase();
    return lower.includes('واجب') || lower.includes('homework') || lower.includes('devoir');
  };

  const rawTomorrowNotes =
    currentBlock === 1 && currentWeek === 2
      ? WEEK2_SPECIAL_NOTES.filter(
          (n) => n.classId === currentClass && n.targetDay === tomorrowDay
        )
      : currentBlock === 1 && currentWeek === 1
      ? SPECIAL_TEACHER_NOTES.filter(
          (n) =>
            n.classId === currentClass &&
            n.targetDay === tomorrowDay &&
            (n.week === 1 || !n.week)
        )
      : [];

  const tomorrowNotes = rawTomorrowNotes.filter(
    (n) => !isHomeworkNote(n.note, n.arabicNote)
  );

  return (
    <div className="space-y-4">
      {/* Grid of Subject Blocks */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <span className="text-sm font-black text-slate-900">
            جدول حصص الغد — يوم {ARABIC_DAY_NAMES[tomorrowDay]} ({tomorrowDay})
          </span>
          <span className="text-xs text-indigo-900 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
            {currentClass} • {targetPeriods.length} حصص
          </span>
        </div>

        {targetPeriods.length === 0 ? (
          <div className="p-6 text-center text-slate-400">
            <BookOpen className="w-6 h-6 mx-auto mb-1 text-slate-300" />
            <p className="text-xs font-bold">لا توجد حصص مسجلة ليوم {ARABIC_DAY_NAMES[tomorrowDay]}</p>
          </div>
        ) : (
          /* 6 Periods Grid: 6 columns on desktop/tablet, 2 or 3 columns on mobile */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {targetPeriods.map((slot) => {
              const meta = SUBJECT_METADATA[slot.subject];
              return (
                <div
                  key={slot.period}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-center shadow-2xs transition-all ${
                    meta?.badgeBg || 'bg-slate-100 text-slate-900 border-slate-300'
                  }`}
                >
                  <SubjectIcon subject={slot.subject} className="w-4 h-4 shrink-0" />
                  <span className="font-black text-xs sm:text-sm truncate">
                    {slot.subject}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Block for Notes Underneath (ملاحظات العربي، ريمارك الفرنش، نوتس باقي المواد) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-amber-950 font-black text-xs sm:text-sm pb-1 border-b border-slate-100">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
          <span>الملاحظات ليوم {ARABIC_DAY_NAMES[tomorrowDay]} ({tomorrowDay})</span>
        </div>

        {tomorrowNotes.length === 0 ? (
          <div className="py-4 px-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
            <p className="text-xs text-slate-400 font-semibold">
              لا توجد ملاحظات خاصة مسجلة ليوم {ARABIC_DAY_NAMES[tomorrowDay]} في الخطة الأسبوعية
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {tomorrowNotes.map((note, idx) => (
              <div
                key={idx}
                className="bg-amber-50/50 rounded-xl border border-amber-200/80 p-3 shadow-2xs space-y-1.5 text-xs"
              >
                <div className="flex items-start gap-2 text-slate-900">
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-950 font-black text-[11px] shrink-0">
                    {note.subject === 'French'
                      ? 'Remarque'
                      : note.subject === 'Arabic'
                      ? 'ملاحظات'
                      : 'الملاحظات'}{' '}
                    • {note.subject === 'Social Studies' ? 'الدراسات الاجتماعية' : note.subject}
                  </span>
                  <span className="font-bold leading-relaxed">{note.arabicNote || note.note}</span>
                </div>
                {note.bagItem && (
                  <div className="text-[11px] text-amber-950 font-semibold bg-white px-2.5 py-1 rounded-lg border border-amber-200/90 inline-block">
                    الأدوات المطلوبة: {note.bagItem}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
