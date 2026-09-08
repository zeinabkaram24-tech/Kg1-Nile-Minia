import React, { useState } from 'react';
import { DAYS_LIST } from '../data/defaultData';
import { DayOfWeek, GradeSection, PlanTask, Subject } from '../types';
import { TaskCard } from './TaskCard';
import { SubjectIcon } from './SubjectIcon';
import {
  Filter,
  Plus,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  Calendar,
  Layers,
  Printer,
  FolderArchive,
  FolderOpen,
} from 'lucide-react';

interface WeeklyPlanViewProps {
  tasks: PlanTask[];
  subjects: Subject[];
  weekTitle: string;
  currentSection?: GradeSection;
  isAdmin?: boolean;
  onChangeWeekTitle: (title: string) => void;
  onToggleDone: (taskId: string) => void;
  onEditTask: (task: PlanTask) => void;
  onDeleteTask: (taskId: string) => void;
  onSavePersonalNote?: (taskId: string, note: string) => void;
  onAddTaskForDay: (day: DayOfWeek, subjectId?: string) => void;
  onOpenSmartPaste: () => void;
  onOpenTimetableModal: () => void;
  onOpenArchiveModal?: () => void;
  onOpenMaterialsModal?: () => void;
  activeBlockNumber?: number;
  activeWeekNumber?: number;
  isVisitor?: boolean;
}

export const WeeklyPlanView: React.FC<WeeklyPlanViewProps> = ({
  tasks,
  subjects,
  weekTitle,
  currentSection = '2A',
  isAdmin = false,
  onChangeWeekTitle,
  onToggleDone,
  onEditTask,
  onDeleteTask,
  onSavePersonalNote,
  onAddTaskForDay,
  onOpenSmartPaste,
  onOpenTimetableModal,
  onOpenArchiveModal,
  onOpenMaterialsModal,
  activeBlockNumber = 1,
  activeWeekNumber = 1,
  isVisitor = false,
}) => {
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  const subjectMap = new Map<string, Subject>();
  subjects.forEach((s) => subjectMap.set(s.id, s));

  const toggleCollapse = (dayKey: string) => {
    setCollapsedDays((prev) => ({ ...prev, [dayKey]: !prev[dayKey] }));
  };

  // Filter tasks if a subject filter is selected and match section (excluding arts and pe)
  const sectionTasks = tasks
    .filter((t) => !t.section || t.section === currentSection)
    .filter(
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
  const filteredTasks = selectedSubjectFilter === 'all'
    ? sectionTasks
    : sectionTasks.filter((t) => t.subjectId === selectedSubjectFilter);

  const totalTasks = sectionTasks.length;
  const completedTasks = sectionTasks.filter((t) => t.isDone).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* 1. Header with Title and Week Controls */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider font-sans">
                Full Weekly Schedule
              </span>
              <span className="text-xs text-indigo-700 bg-indigo-50 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
                Grade 2 ({currentSection}) • Nile International Schools
              </span>
            </div>

            {/* Week Title (Editable by Admin only) */}
            {isAdmin ? (
              <input
                type="text"
                value={weekTitle}
                onChange={(e) => onChangeWeekTitle(e.target.value)}
                className="text-2xl sm:text-3xl font-black text-slate-900 border-b-2 border-indigo-200 hover:border-indigo-400 focus:border-indigo-600 focus:outline-hidden px-1 py-1 rounded transition-all w-full max-w-xl"
                placeholder="عنوان الخطة الأسبوعية..."
                title="تعديل عنوان الخطة الأسبوعية (صلاحية الأدمن)"
              />
            ) : (
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 py-1">
                {weekTitle}
              </h2>
            )}
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              متابعة جميع المواد (Maths, Science, Français, English, Arabic, etc.)
            </p>
          </div>

          {/* Quick stats & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-2 font-sans">
              <CheckCheck className="w-4 h-4 text-emerald-600" />
              <span>Done: {completedTasks}/{totalTasks} ({completionRate}%)</span>
            </div>

            {/* Archive button in weekly plan */}
            {onOpenArchiveModal && (
              <button
                type="button"
                id="btn-archive-weekly"
                onClick={onOpenArchiveModal}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 transition-colors flex items-center gap-2 shadow-2xs font-sans cursor-pointer"
                title="أرشيف وبلوكات الخطط الأسبوعية (الرجوع لأي أسبوع سابق)"
              >
                <FolderArchive className="w-4 h-4 text-purple-600" />
                <span>أرشيف الأسابيع (B{activeBlockNumber} • W{activeWeekNumber})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenTimetableModal}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors flex items-center gap-1.5 font-sans"
              title={`عرض الجدول الدراسي لفصل ${currentSection}`}
            >
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>الجدول الدراسي ({currentSection})</span>
            </button>
          </div>
        </div>

        {/* Filter by Subject row with Pills */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>تصفية بالمادة:</span>
          </span>

          <button
            type="button"
            onClick={() => setSelectedSubjectFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all font-sans ${
              selectedSubjectFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Subjects ({tasks.length})
          </button>

          {subjects.map((sub) => {
            const count = tasks.filter((t) => t.subjectId === sub.id).length;
            const isSelected = selectedSubjectFilter === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubjectFilter(sub.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                  isSelected
                    ? `${sub.color.bg} text-white font-bold shadow-xs`
                    : `${sub.color.lightBg} ${sub.color.text} border ${sub.color.border} hover:opacity-85`
                }`}
              >
                <SubjectIcon name={sub.iconName} className="w-3.5 h-3.5" />
                <span className="font-sans">{sub.nameEn}</span>
                <span className="opacity-75 text-[11px] font-mono">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Days List */}
      <div className="space-y-6">
        {DAYS_LIST.map((day) => {
          const dayTasks = filteredTasks
            .filter((t) => t.day === day.key)
            .sort((a, b) => {
              if (a.period !== undefined && b.period !== undefined) {
                return a.period - b.period;
              }
              if (a.period !== undefined) return -1;
              if (b.period !== undefined) return 1;
              return 0;
            });
          const totalDayTasks = sectionTasks.filter((t) => t.day === day.key).length;
          const doneDayTasks = sectionTasks.filter((t) => t.day === day.key && t.isDone).length;
          const isCollapsed = collapsedDays[day.key] || false;

          // Only skip weekends if there are no tasks and a filter is active
          if (!day.isSchoolDay && totalDayTasks === 0 && selectedSubjectFilter !== 'all') {
            return null;
          }

          return (
            <div
              key={day.key}
              id={`weekly-day-${day.key}`}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden"
            >
              {/* Day Header */}
              <div className="px-5 sm:px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleCollapse(day.key)}
                    className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors"
                  >
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-black text-slate-900">
                        {day.nameAr}
                      </h3>
                      <span className="text-xs text-slate-500 font-sans font-medium">
                        ({day.nameEn})
                      </span>
                      {day.isSchoolDay ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-sans">
                          School Day
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-sans">
                          Weekend
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Day stats & Add task for this day */}
                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold font-sans ${
                      totalDayTasks > 0 && doneDayTasks === totalDayTasks
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {doneDayTasks}/{totalDayTasks} Done
                  </span>

                  {!isVisitor && (
                    <button
                      type="button"
                      onClick={() => onAddTaskForDay(day.key)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 shadow-2xs font-sans"
                      title={`إضافة مهمة ليوم ${day.nameAr}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Task</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Day Tasks Body */}
              {!isCollapsed && (
                <div className="p-5 sm:p-6">
                  {dayTasks.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-sm flex flex-col items-center justify-center gap-1.5">
                      <span>لا توجد مهام مسجلة ليوم {day.nameAr}.</span>
                      {!isVisitor && (
                        <button
                          type="button"
                          onClick={() => onAddTaskForDay(day.key)}
                          className="text-xs text-indigo-600 hover:underline font-bold mt-1"
                        >
                          + إضافة خطة مادة أو واجب
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {dayTasks.map((task) => {
                        const subj = subjectMap.get(task.subjectId);
                        return (
                          <TaskCard
                            key={task.id}
                            task={task}
                            subject={subj}
                            onToggleDone={onToggleDone}
                            onEdit={onEditTask}
                            onDelete={onDeleteTask}
                            onSavePersonalNote={onSavePersonalNote}
                            compact
                            isVisitor={isVisitor}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
