import React from 'react';
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  BookOpen,
  AlertTriangle,
  AlertCircle,
  Play,
  Pencil,
  Trash2,
  Plus,
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
  isAdminLiveEdit?: boolean;
  onEditHomework?: (hw: HomeworkEntry) => void;
  onDeleteHomework?: (id: string) => void;
  onAddHomework?: () => void;
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
  currentWeek = 1,
  onToggleHomework,
  isAdminLiveEdit = false,
  onEditHomework,
  onDeleteHomework,
  onAddHomework,
}) => {
  // Only real homework assigned for the selected day - completely filter out any "لا يوجد واجب"
  const dayHomework = homeworkList.filter(
    (h) =>
      h.classId === currentClass &&
      h.assignedDay === selectedDay &&
      (h.block || 1) === currentBlock &&
      (h.week || 1) === currentWeek &&
      Boolean(h.task && h.task.trim()) &&
      !/^لا\s*يوجد/i.test(h.task) &&
      h.task !== '-' &&
      !h.task.includes('لا يوجد واجب')
  );

  // Check if this Block and Week has ANY homework entered for current class
  const hasHomeworkForWeek = homeworkList.some(
    (h) =>
      h.classId === currentClass &&
      (h.block || 1) === currentBlock &&
      (h.week || 1) === currentWeek &&
      Boolean(h.task && h.task.trim()) &&
      !/^لا\s*يوجد/i.test(h.task) &&
      h.task !== '-' &&
      !h.task.includes('لا يوجد واجب')
  );

  // Check if tomorrow (next school day) has any scheduled Quiz or Test in classwork
  // Use strict word boundary so words like "shortest" or "tallest" NEVER match
  const nextDay = NEXT_SCHOOL_DAY[selectedDay];
  const upcomingTestsAndQuizzes = (classworkList || []).filter((cw) => {
    if (cw.classId !== currentClass) return false;
    if (cw.day !== nextDay) return false;
    if ((cw.block || 1) !== currentBlock) return false;
    if ((cw.week || 1) !== currentWeek) return false;
    const text = `${cw.title} ${cw.details || ''}`;
    return (
      /\b(quiz|exam|midterm)\b/i.test(text) ||
      /\btest\b/i.test(text) ||
      /(?:^|\s)(كويز|اختبار|امتحان)(?:\s|$|[،.])/i.test(text)
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

  return (
    <div className="space-y-3.5">
      {/* Top Banner: Header for the selected day */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-900">
              واجبات يوم {ARABIC_DAY_NAMES[selectedDay]} ({selectedDay}) • {currentClass}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 font-black border border-indigo-200">
              Topic {currentBlock} • Week {currentWeek}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            الواجبات المقررة ليوم {ARABIC_DAY_NAMES[selectedDay]} فقط حسب الخطة الأسبوعية المعتمدة.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Admin Live Edit Button */}
          {isAdminLiveEdit && onAddHomework && (
            <button
              type="button"
              onClick={onAddHomework}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ إضافة واجب جديد</span>
            </button>
          )}

          {totalCount > 0 && (
            <div className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
              <span>المكتمل: </span>
              <strong className="text-emerald-700 font-black">{completedCount}</strong>
              <span className="text-slate-400 mx-1">/</span>
              <span>{totalCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Hint Banner for Tomorrow's Tests & Quizzes (only with strict word boundaries) */}
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
        </div>
      )}

      {/* Day Homework List */}
      {dayHomework.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-1">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm sm:text-base font-black text-slate-800">
            لا توجد واجبات مقررة ليوم {ARABIC_DAY_NAMES[selectedDay]}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            اليوم خالٍ من أي واجبات منزلية في الخطة الأسبوعية المعتمدة.
          </p>
          {isAdminLiveEdit && onAddHomework && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onAddHomework}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-transform active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ إضافة واجب لهذا اليوم</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {dayHomework.map((hw) => {
            const theme = getSubjectTheme(hw.subject);
            const isTestOrQuiz =
              hw.priority === 'quiz' ||
              /\b(quiz|exam|midterm)\b/i.test(hw.task) ||
              /\btest\b/i.test(hw.task) ||
              /(?:^|\s)(كويز|اختبار|امتحان)(?:\s|$|[،.])/i.test(hw.task);

            return (
              <div
                key={hw.id}
                className={`rounded-2xl border border-s-4 p-3.5 sm:p-4 transition-all flex items-start justify-between gap-3 shadow-2xs relative ${
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
                    className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors shrink-0 cursor-pointer"
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
                      <div className="pt-1 space-y-1.5">
                        <span className="text-[11px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">
                          🏠 فيديو الواجب المنزلي:
                        </span>
                        <div>
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
                      </div>
                    ) : (
                      <div className="pt-0.5 space-y-1">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-[11px] font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                            الواجب المنزلي:
                          </span>
                          <p
                            className={`text-sm font-black leading-snug ${
                              hw.completed ? 'line-through text-slate-400' : 'text-slate-950'
                            }`}
                          >
                            {hw.task}
                          </p>
                        </div>
                      </div>
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
                        <div className="mt-2 pt-1.5 border-t border-slate-200/50 space-y-1">
                          <span className="text-[11px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">
                            🏠 مصادر الواجب المنزلي:
                          </span>
                          <div className="flex flex-wrap gap-2 pt-1">
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
                                  <span dir="ltr" className="truncate max-w-[280px] sm:max-w-md">{lItem.title || lItem.url}</span>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Right action buttons: Admin Edit/Delete + Done toggle */}
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  {isAdminLiveEdit && (
                    <div className="flex items-center gap-1 bg-white/90 p-1 rounded-xl border border-slate-200 shadow-2xs">
                      {onEditHomework && (
                        <button
                          type="button"
                          onClick={() => onEditHomework(hw)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="تعديل هذا الواجب"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {onDeleteHomework && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('هل أنت متأكد من حذف هذا الواجب نهائياً؟')) {
                              onDeleteHomework(hw.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="حذف هذا الواجب"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Interactive toggle button: Done with celebration */}
                  <button
                    onClick={() => handleToggle(hw.id, hw.completed)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
