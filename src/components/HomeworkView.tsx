import React from 'react';
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  BookOpen,
  AlertTriangle,
  AlertCircle,
  Play,
} from 'lucide-react';
import { ClassId, SchoolDay, HomeworkEntry, ClassworkEntry } from '../types';
import { SUBJECT_METADATA } from '../data/timetables';
import { SubjectIcon } from './SubjectIcon';
import { triggerDoneCelebration } from '../utils/celebrate';
import { getSubjectTheme } from '../data/subjectThemes';

interface HomeworkViewProps {
  currentClass: ClassId;
  selectedDay: SchoolDay;
  homeworkList: HomeworkEntry[];
  classworkList?: ClassworkEntry[];
  currentBlock?: number;
  currentWeek?: number;
  onToggleHomework: (id: string) => void;
  onPrint?: () => void;
}

const ARABIC_DAY_NAMES: Record<SchoolDay, string> = {
  Saturday: 'السبت',
  Sunday: 'الأحد',
  Monday: 'الإثنين',
  Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء',
  Thursday: 'الخميس',
};

const NEXT_SCHOOL_DAY: Record<SchoolDay, SchoolDay> = {
  Sunday: 'Monday',
  Monday: 'Tuesday',
  Tuesday: 'Wednesday',
  Wednesday: 'Thursday',
  Thursday: 'Sunday',
  Saturday: 'Sunday',
};

export const HomeworkView: React.FC<HomeworkViewProps> = ({
  currentClass,
  selectedDay,
  homeworkList,
  classworkList = [],
  currentBlock = 1,
  currentWeek = 2,
  onToggleHomework,
}) => {
  // Check if this Block and Week has ANY homework entered for current class
  const hasHomeworkForWeek = homeworkList.some(
    (h) =>
      h.classId === currentClass &&
      (h.block || 1) === currentBlock &&
      (h.week || 1) === currentWeek
  );

  // Only homework assigned for the selected day (Arabic, French, Mathematics, Social Studies, English, ICT, Science)
  const dayHomework = homeworkList.filter(
    (h) =>
      h.classId === currentClass &&
      (h.subject === 'Arabic' ||
        h.subject === 'French' ||
        h.subject === 'Mathematics' ||
        h.subject === 'Social Studies' ||
        h.subject === 'English' ||
        h.subject === 'ICT' ||
        h.subject === 'Science') &&
      h.assignedDay === selectedDay &&
      (h.block || 1) === currentBlock &&
      (h.week || 1) === currentWeek
  );

  // Check if tomorrow (next school day) has any scheduled Quiz or Test in classwork
  const nextDay = NEXT_SCHOOL_DAY[selectedDay];
  const upcomingTestsAndQuizzes = (classworkList || []).filter((cw) => {
    if (cw.classId !== currentClass) return false;
    if (cw.day !== nextDay) return false;
    if ((cw.block || 1) !== currentBlock) return false;
    if ((cw.week || 1) !== currentWeek) return false;
    const text = `${cw.title} ${cw.details || ''}`.toLowerCase();
    return (
      text.includes('test') ||
      text.includes('quiz') ||
      text.includes('اختبار') ||
      text.includes('كويز') ||
      text.includes('امتحان') ||
      text.includes('تقييم')
    );
  });

  const handleToggle = (id: string, currentlyCompleted: boolean) => {
    if (!currentlyCompleted) {
      triggerDoneCelebration();
    }
    onToggleHomework(id);
  };

  const completedCount = dayHomework.filter((h) => h.completed).length;
  const totalCount = dayHomework.length;

  // If this entire week has no homework entered, render clean empty state
  if (!hasHomeworkForWeek) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
          <BookOpen className="w-7 h-7" />
        </div>
        <h3 className="text-base sm:text-lg font-black text-slate-800">
          لا توجد واجبات مسجلة لهذا الأسبوع
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          الأسبوع المحدد (Topic {currentBlock} - Week {currentWeek}) فارغ حالياً ولم يتم إدخال أي واجبات له.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* Top Banner: Header for the selected day only */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-900">
              واجبات يوم {ARABIC_DAY_NAMES[selectedDay]} ({selectedDay}) • {currentClass}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 font-black border border-indigo-200">
              الأسبوع {currentWeek}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            الواجبات المقررة ليوم {ARABIC_DAY_NAMES[selectedDay]} فقط حسب الخطة الأسبوعية المعتمدة.
          </p>
        </div>

        {totalCount > 0 && (
          <div className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-auto">
            <span>المكتمل: </span>
            <strong className="text-emerald-700 font-black">{completedCount}</strong>
            <span className="text-slate-400 mx-1">/</span>
            <span>{totalCount}</span>
          </div>
        )}
      </div>

      {/* Dynamic Hint Banner for Tomorrow's Tests & Quizzes */}
      {upcomingTestsAndQuizzes.length > 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-400/80 rounded-2xl p-3.5 sm:p-4 text-amber-950 shadow-2xs space-y-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
            <h4 className="text-sm font-black text-amber-950">
              تنبيه مهم: يوجد اختبار / كويز غداً يوم {ARABIC_DAY_NAMES[nextDay]}!
            </h4>
          </div>
          <div className="space-y-1.5 pt-0.5">
            {upcomingTestsAndQuizzes.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-2 bg-white/95 border border-amber-200 rounded-xl px-3 py-2 text-xs shadow-2xs"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-950 border border-amber-300">
                    {t.subject}
                  </span>
                  <span className="font-black text-slate-900">{t.title}</span>
                </div>
                <span className="text-[11px] font-black text-amber-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 shrink-0">
                  الحصة {t.period}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-900 font-bold">
            يرجى مراجعة الدروس اليوم والاستعداد الجيد للاختبار المقرر غداً.
          </p>
        </div>
      )}

      {/* Selected Day Homework List */}
      {dayHomework.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-2xs space-y-2">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">
            لا توجد واجبات مقررة ليوم {ARABIC_DAY_NAMES[selectedDay]} ({selectedDay})
          </h4>
          <p className="text-xs text-slate-400">
            بحسب الخطة الأسبوعية المعتمدة، لا يوجد واجب منزلي مقرر لهذا اليوم في المواد المسجلة.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {dayHomework.map((hw) => {
            const meta = SUBJECT_METADATA[hw.subject];
            const theme = getSubjectTheme(hw.subject);
            const isTestOrQuiz =
              hw.task.toLowerCase().includes('test') ||
              hw.task.toLowerCase().includes('quiz') ||
              hw.task.includes('اختبار') ||
              hw.task.includes('كويز') ||
              hw.task.includes('امتحان');

            return (
              <div
                key={hw.id}
                className={`rounded-2xl border border-s-4 p-3.5 sm:p-4 transition-all flex items-start justify-between gap-3 shadow-2xs ${
                  hw.completed
                    ? 'border-emerald-300 border-s-emerald-600 bg-emerald-50/30 opacity-85'
                    : isTestOrQuiz
                    ? 'border-amber-300 border-s-amber-600 bg-amber-50/25 shadow-xs'
                    : `${theme.hwCard} ${theme.hwAccentBorder} shadow-xs`
                }`}
              >
                {/* Checkbox and Task Details */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggle(hw.id, hw.completed)}
                    className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors shrink-0"
                    title={hw.completed ? 'Done' : 'Mark as Done'}
                  >
                    {hw.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400 hover:text-emerald-600" />
                    )}
                  </button>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    {/* Badges: Subject with colorful icon & Test Alert (if applicable) */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border transition-colors ${
                          theme.hwSubjectBadge
                        }`}
                      >
                        <SubjectIcon subject={hw.subject} className="w-3.5 h-3.5" />
                        <span>{hw.subject}</span>
                      </span>

                      {isTestOrQuiz && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                          <AlertCircle className="w-3 h-3 text-amber-700" />
                          تنبيه اختبار / كويز
                        </span>
                      )}

                      {hw.pages && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-black bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs">
                          <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                          <span>{hw.pages}</span>
                        </span>
                      )}
                    </div>

                    {/* Task Description */}
                    {hw.task.startsWith('http') ? (
                      <div className="pt-1">
                        <a
                          href={hw.task}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all shadow-xs hover:scale-102 active:scale-98 max-w-full bg-red-600 hover:bg-red-700 text-white shadow-red-700/20"
                        >
                          <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                          <span dir="ltr" className="truncate max-w-[280px] sm:max-w-md">{hw.task}</span>
                        </a>
                      </div>
                    ) : (
                      <p
                        className={`text-sm font-black leading-snug pt-0.5 ${
                          hw.completed ? 'line-through text-slate-400' : 'text-slate-950'
                        }`}
                      >
                        {hw.task}
                      </p>
                    )}

                    {/* Links if available (and not already shown as task) */}
                    {(() => {
                      if (hw.task.startsWith('http')) return null;
                      const hwLinks: { url: string; title: string; type?: string }[] = [];
                      if (hw.links && hw.links.length > 0) {
                        hwLinks.push(...hw.links);
                      } else if (hw.linkUrl) {
                        hwLinks.push({
                          url: hw.linkUrl,
                          title: hw.linkTitle || hw.linkUrl,
                          type: hw.linkUrl.includes('youtu') ? 'video' : 'general',
                        });
                      }

                      if (hwLinks.length === 0) return null;

                      return (
                        <div className="pt-1.5 flex flex-wrap gap-2">
                          {hwLinks.map((lItem, lIdx) => {
                            const isVid = lItem.type === 'video' || lItem.url.includes('youtu');
                            return (
                              <a
                                key={lIdx}
                                href={lItem.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all shadow-xs hover:scale-102 active:scale-98 max-w-full ${
                                  isVid
                                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-700/20'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-700/20'
                                }`}
                              >
                                {isVid ? (
                                  <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                                ) : (
                                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                )}
                                <span dir="ltr" className="truncate max-w-[280px] sm:max-w-md">{lItem.url}</span>
                              </a>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Interactive toggle button: Done with celebration */}
                <button
                  onClick={() => handleToggle(hw.id, hw.completed)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 self-start sm:self-center flex items-center gap-1.5 ${
                    hw.completed
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-slate-100 hover:text-slate-600 border border-emerald-300'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs hover:scale-105 active:scale-95'
                  }`}
                  title={hw.completed ? 'اضغطي للإلغاء' : 'اضغطي للتحديد كـ Done'}
                >
                  {hw.completed ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Done ✓</span>
                    </>
                  ) : (
                    <span>Done</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
