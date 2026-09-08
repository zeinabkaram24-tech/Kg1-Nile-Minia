import React, { useState } from 'react';
import { DAYS_LIST } from '../data/defaultData';
import { DayOfWeek, GradeSection, PlanTask, Subject, Timetable } from '../types';
import { SubjectIcon } from './SubjectIcon';
import {
  Sparkles,
  Briefcase,
  CheckCircle2,
  Circle,
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  RotateCcw,
  BookOpen,
  Palette,
} from 'lucide-react';

interface TomorrowPrepCardProps {
  currentDay: DayOfWeek;
  tasks: PlanTask[];
  subjects: Subject[];
  timetable: Timetable;
  section?: GradeSection;
  onSelectDay: (day: DayOfWeek) => void;
}

// Helper to format period numbers into clean Arabic ordinal text (e.g., الحصص السابعة والثامنة)
const PERIOD_ORDINALS_AR: Record<number, string> = {
  1: 'الأولى',
  2: 'الثانية',
  3: 'الثالثة',
  4: 'الرابعة',
  5: 'الخامسة',
  6: 'السادسة',
  7: 'السابعة',
  8: 'الثامنة',
};

function formatPeriodsAr(periods: number[]): string {
  if (!periods || periods.length === 0) return '';
  const sorted = [...periods].sort((a, b) => a - b);
  const words = sorted.map((p) => PERIOD_ORDINALS_AR[p] || `P${p}`);
  if (words.length === 1) {
    return `الحصة ${words[0]}`;
  }
  return `الحصص ${words.join(' و')}`;
}

export const TomorrowPrepCard: React.FC<TomorrowPrepCardProps> = ({
  currentDay,
  tasks,
  subjects,
  timetable,
  section = '2A',
  onSelectDay,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const subjectMap = new Map<string, Subject>();
  subjects.forEach((s) => subjectMap.set(s.id, s));

  // Determine tomorrow & next school day
  const dayCycle: Record<DayOfWeek, { nextDay: DayOfWeek; isWeekendTomorrow: boolean; nextSchoolDay: DayOfWeek }> = {
    sunday: { nextDay: 'monday', isWeekendTomorrow: false, nextSchoolDay: 'monday' },
    monday: { nextDay: 'tuesday', isWeekendTomorrow: false, nextSchoolDay: 'tuesday' },
    tuesday: { nextDay: 'wednesday', isWeekendTomorrow: false, nextSchoolDay: 'wednesday' },
    wednesday: { nextDay: 'thursday', isWeekendTomorrow: false, nextSchoolDay: 'thursday' },
    thursday: { nextDay: 'friday', isWeekendTomorrow: true, nextSchoolDay: 'sunday' },
    friday: { nextDay: 'saturday', isWeekendTomorrow: true, nextSchoolDay: 'sunday' },
    saturday: { nextDay: 'sunday', isWeekendTomorrow: false, nextSchoolDay: 'sunday' },
  };

  const { nextDay, isWeekendTomorrow, nextSchoolDay } = dayCycle[currentDay] || {
    nextDay: 'sunday',
    isWeekendTomorrow: false,
    nextSchoolDay: 'sunday',
  };

  // Target day for school preparations
  const prepTargetDay = isWeekendTomorrow ? nextSchoolDay : nextDay;
  const targetDayInfo = DAYS_LIST.find((d) => d.key === prepTargetDay) || DAYS_LIST[0];

  // Tomorrow's timetable periods for the current class section
  const targetPeriods = timetable[prepTargetDay] || [];

  // Group periods by subject for tomorrow to show exact period slots
  const subjectPeriodsMap = new Map<string, number[]>();
  targetPeriods.forEach((slot) => {
    const existing = subjectPeriodsMap.get(slot.subjectId) || [];
    existing.push(slot.period);
    subjectPeriodsMap.set(slot.subjectId, existing);
  });

  const uniqueSubjectIds = Array.from(subjectPeriodsMap.keys());

  // Tasks scheduled for tomorrow filtered by section
  const targetTasks = tasks.filter(
    (t) => t.day === prepTargetDay && (!t.section || t.section === section)
  );
  const targetQuizzes = targetTasks.filter((t) => t.type === 'quiz' || t.type === 'dictation');

  // Only explicit Weekly Plan notes are shown in the bag section.
  // No generic subject/book placeholder is ever generated.
  const weeklyPlanNotes = targetTasks
    .filter((task) => Boolean(task.notes?.trim()) || task.type === 'supplies')
    .map((task) => ({
      id: task.id,
      subjectId: task.subjectId,
      text: task.notes?.trim() || task.details?.trim() || task.title,
    }));

  return (
    <div
      id="tomorrow-prep-card"
      className="bg-gradient-to-br from-amber-50/90 via-white to-indigo-50/40 rounded-3xl border-2 border-amber-200/90 p-5 sm:p-6 shadow-sm transition-all duration-200 hover:border-amber-300"
    >
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/60">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-900/20 shrink-0">
            <Briefcase className="w-5 h-5 stroke-[2.25]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-sans uppercase tracking-wider">
                Tomorrow's Prep & School Bag
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-sans">
                فصل Grade {section}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {isWeekendTomorrow ? `تحضيرات يوم ${targetDayInfo.nameAr}` : `تحضيرات غداً (${targetDayInfo.nameAr})`}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              تجهيز حقيبة ومطلوبات الغد{' '}
              <span className="text-amber-700 font-sans font-bold">
                ({targetDayInfo.nameEn})
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => onSelectDay(prepTargetDay)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 font-sans"
            title={`الانتقال إلى خطة يوم ${targetDayInfo.nameAr}`}
          >
            <span>خطة {targetDayInfo.shortAr}</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl hover:bg-amber-100 text-amber-800 transition-colors"
            title={isCollapsed ? 'توسيع المربع' : 'طي المربع'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="mt-4 space-y-4">
          {/* Schedule Highlights for Tomorrow */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>حصص جدول يوم {targetDayInfo.nameAr} المقررة في المدرسة (فصل {section}):</span>
              </span>
              <span className="text-slate-500 font-sans font-normal text-[11px]">
                {targetPeriods.length} حصص مقررة
              </span>
            </div>

            {/* Same period-card layout used by Today's schedule */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {targetPeriods.map((slot) => {
                const sub = subjectMap.get(slot.subjectId);
                return (
                  <div
                    key={slot.period}
                    className={`p-2.5 rounded-2xl border flex flex-col justify-between transition-all hover:scale-102 ${
                      sub?.color.lightBg || 'bg-white'
                    } ${sub?.color.border || 'border-slate-200'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-white/80 text-slate-700">
                        P{slot.period}
                      </span>
                      <SubjectIcon name={sub?.iconName || 'BookOpen'} className={`w-3.5 h-3.5 ${sub?.color.text}`} />
                    </div>
                    <div className="font-bold text-xs text-slate-900 truncate font-sans">
                      {sub?.nameEn || slot.subjectId}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {sub?.nameAr}
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono mt-1 pt-1 border-t border-black/5">
                      {slot.timeRange}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Exact notes from the Weekly Plan only. */}
          {weeklyPlanNotes.length > 0 && (
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-amber-200/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ملاحظات ومطلوبات الغد من الـWeekly Plan:</span>
                </span>
                <span className="text-[11px] font-sans text-slate-400">
                  {weeklyPlanNotes.length} ملاحظات
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {weeklyPlanNotes.map((note) => {
                  const subj = subjectMap.get(note.subjectId);
                  return (
                    <div key={note.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-start gap-3">
                      <SubjectIcon name={subj?.iconName || 'BookOpen'} className={`w-3.5 h-3.5 mt-0.5 ${subj?.color.text || 'text-indigo-600'}`} />
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-slate-900">{subj?.nameEn || subj?.nameAr || note.subjectId}</div>
                        <div className="text-[11px] text-slate-700 leading-snug">{note.text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upcoming Quizzes or Dictation notice */}
          {targetQuizzes.length > 0 && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2.5 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <strong>تنبيه اختبار / إملاء غداً في المدرسة:</strong>{' '}
                {targetQuizzes.map((q) => `${q.title}`).join(' ، ')}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
