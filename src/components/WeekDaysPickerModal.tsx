import React, { useState } from 'react';
import { DAYS_LIST } from '../data/defaultData';
import { DayOfWeek, PlanTask, Subject } from '../types';
import { TaskCard } from './TaskCard';
import {
  X,
  Calendar,
  Plus,
  ExternalLink,
  CheckCircle2,
  ListTodo,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';

interface WeekDaysPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDay: DayOfWeek;
  onSelectDay: (day: DayOfWeek) => void;
  tasks: PlanTask[];
  subjects: Subject[];
  onToggleDone: (taskId: string) => void;
  onEditTask: (task: PlanTask) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTaskForDay: (day: DayOfWeek, subjectId?: string) => void;
  onOpenFullWeeklyView: () => void;
  isVisitor?: boolean;
}

export const WeekDaysPickerModal: React.FC<WeekDaysPickerModalProps> = ({
  isOpen,
  onClose,
  selectedDay,
  onSelectDay,
  tasks,
  subjects,
  onToggleDone,
  onEditTask,
  onDeleteTask,
  onAddTaskForDay,
  onOpenFullWeeklyView,
  isVisitor = false,
}) => {
  const [activeDay, setActiveDay] = useState<DayOfWeek>(selectedDay);

  if (!isOpen) return null;

  const subjectMap = new Map<string, Subject>();
  subjects.forEach((s) => subjectMap.set(s.id, s));

  // Get active day metadata
  const activeDayInfo = DAYS_LIST.find((d) => d.key === activeDay) || DAYS_LIST[0];

  // Tasks for the active day (excluding arts and pe)
  const filteredTasks = tasks.filter(
    (t) =>
      t.subjectId !== 'arts' &&
      t.subjectId !== 'pe' &&
      !t.title?.toLowerCase().includes('arts') &&
      !t.title?.toLowerCase().includes('pe') &&
      !t.title?.toLowerCase().includes('physical education') &&
      !t.title?.includes('التربية الفنية') &&
      !t.title?.includes('التربية الرياضية') &&
      !t.title?.includes('الرسم') &&
      !t.title?.includes('اللياقة البدنية') &&
      !t.title?.includes('الزي الرياضي')
  );

  const dayTasks = filteredTasks
    .filter((t) => t.day === activeDay)
    .sort((a, b) => {
      if (a.period !== undefined && b.period !== undefined) {
        return a.period - b.period;
      }
      if (a.period !== undefined) return -1;
      if (b.period !== undefined) return 1;
      return 0;
    });

  const activeTotal = dayTasks.length;
  const activeCompleted = dayTasks.filter((t) => t.isDone).length;

  return (
    <div
      id="week-days-picker-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="week-days-picker-modal-dialog"
        className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-100 my-4 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          id="week-days-picker-header"
          className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Calendar className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 font-sans">
                  أيام الأسبوع والمهام الدراسية
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold font-sans">
                  All Week Days
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans">
                اختر اليوم لمعاينة الواجبات والمهام أو الانتقال السريع إليه
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-open-full-weekly-view-modal"
              type="button"
              onClick={() => {
                onClose();
                onOpenFullWeeklyView();
              }}
              className="text-xs font-bold text-purple-700 hover:text-purple-900 px-3 py-1.5 rounded-xl hover:bg-purple-50 transition-colors flex items-center gap-1 font-sans border border-purple-200"
            >
              <span>عرض الخطة الأسبوعية كاملة</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              id="btn-close-week-days-modal"
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              title="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Week Days Selector Tabs / Pills */}
        <div
          id="week-days-tabs-container"
          className="p-4 sm:p-5 bg-slate-100/70 border-b border-slate-200/80 overflow-x-auto"
        >
          <div className="flex items-center gap-2.5 min-w-max">
            {DAYS_LIST.map((day) => {
              const dayItems = filteredTasks.filter((t) => t.day === day.key);
              const total = dayItems.length;
              const completed = dayItems.filter((t) => t.isDone).length;
              const isSelected = activeDay === day.key;
              const isCurrentDay = selectedDay === day.key;

              return (
                <button
                  key={day.key}
                  id={`tab-weekday-${day.key}`}
                  type="button"
                  onClick={() => setActiveDay(day.key)}
                  className={`px-4 py-3 rounded-2xl flex flex-col items-start gap-1 transition-all duration-150 border text-right min-w-[120px] ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-300 ring-offset-1'
                      : 'bg-white text-slate-700 border-slate-200/90 hover:border-purple-300 hover:bg-purple-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="font-bold text-sm">{day.nameAr}</span>
                    {isCurrentDay && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          isSelected
                            ? 'bg-purple-800 text-purple-100'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        المحدد
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between w-full gap-2 text-xs opacity-85 font-sans">
                    <span className="text-[11px] font-medium">{day.nameEn}</span>
                    <span className="text-[11px] font-bold">
                      {total > 0 ? `${completed}/${total}` : 'لا مهام'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Day Content */}
        <div id="week-day-tasks-section" className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <ListTodo className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-base sm:text-lg text-slate-800 flex items-center gap-2">
                  <span>مهام يوم {activeDayInfo.nameAr}</span>
                  <span className="text-xs text-slate-400 font-sans font-normal">
                    ({activeDayInfo.nameEn})
                  </span>
                </h4>
                <p className="text-xs text-slate-500 font-sans">
                  {activeTotal > 0
                    ? `إجمالي ${activeTotal} مهام (${activeCompleted} مكتمل)`
                    : 'لا توجد مهام مسجلة لهذا اليوم'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isVisitor && (
                <button
                  id="btn-add-task-for-active-day"
                  type="button"
                  onClick={() => onAddTaskForDay(activeDay)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors flex items-center gap-1.5 font-sans"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة مهمة لهذا اليوم</span>
                </button>
              )}
              <button
                id="btn-jump-to-active-day"
                type="button"
                onClick={() => {
                  onSelectDay(activeDay);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors flex items-center gap-1.5 font-sans"
              >
                <span>الانتقال لهذا اليوم</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {dayTasks.length === 0 ? (
            <div
              id="empty-day-tasks-state"
              className="py-12 px-4 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h5 className="font-bold text-slate-800 text-sm mb-1">
                لا توجد مهام مسجلة ليوم {activeDayInfo.nameAr}
              </h5>
              <p className="text-xs text-slate-500 max-w-sm mb-4 font-sans">
                {isVisitor
                  ? 'لا توجد مهام مسجلة لهذا اليوم في خطة الأسبوع المعروضة.'
                  : 'يمكنك إضافة واجب أو درس جديد أو استخدام لصق الخطة الذكية لتعبئة الجدول تلقائياً.'}
              </p>
              {!isVisitor && (
                <button
                  type="button"
                  onClick={() => onAddTaskForDay(activeDay)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors flex items-center gap-1.5 font-sans"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة مهمة الآن</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {dayTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  subject={subjectMap.get(task.subjectId)}
                  onToggleDone={onToggleDone}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  compact
                  isVisitor={isVisitor}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          id="week-days-picker-footer"
          className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-sans"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>يمكنك تحديد المهام كمنجزة مباشرة من هنا بالنقر على زر الإنجاز.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
