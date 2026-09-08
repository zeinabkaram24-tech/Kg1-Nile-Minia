import React, { useState } from 'react';
import { DAYS_LIST, PERIODS_TIMING } from '../data/defaultData';
import { DayOfWeek, GradeSection, PlanTask, StudentProfile, Subject, Timetable } from '../types';
import { TaskCard } from './TaskCard';
import { SubjectIcon } from './SubjectIcon';
import { TomorrowPrepCard } from './TomorrowPrepCard';
import { triggerAllDoneCelebration } from '../utils/celebration';
import {
  CheckCircle2,
  Layers,
  Plus,
  Share2,
  Sparkles,
  Check,
  Calendar,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  FolderArchive,
  FolderOpen,
} from 'lucide-react';
import { VisitorStatsSummary } from '../types';

interface TodayViewProps {
  selectedDay: DayOfWeek;
  onSelectDay: (day: DayOfWeek) => void;
  todayDay: DayOfWeek;
  tasks: PlanTask[];
  subjects: Subject[];
  timetable: Timetable;
  student: StudentProfile;
  selectedSection?: GradeSection;
  onToggleDone: (taskId: string) => void;
  onEditTask: (task: PlanTask) => void;
  onDeleteTask: (taskId: string) => void;
  onSavePersonalNote?: (taskId: string, note: string) => void;
  onAddTaskForDay: (day: DayOfWeek, subjectId?: string) => void;
  onOpenTimetableModal: () => void;
  onOpenWeekDaysModal: () => void;
  onOpenArchiveModal?: () => void;
  onOpenMaterialsModal?: () => void;
  activeBlockNumber?: number;
  activeWeekNumber?: number;
  activePlanTitle?: string;
  isVisitor?: boolean;
}

export const TodayView: React.FC<TodayViewProps> = ({
  selectedDay,
  onSelectDay,
  todayDay,
  tasks,
  subjects,
  timetable,
  student,
  selectedSection = '2A',
  onToggleDone,
  onEditTask,
  onDeleteTask,
  onSavePersonalNote,
  onAddTaskForDay,
  onOpenTimetableModal,
  onOpenWeekDaysModal,
  onOpenArchiveModal,
  onOpenMaterialsModal,
  activeBlockNumber = 1,
  activeWeekNumber = 1,
  activePlanTitle,
  isVisitor = false,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [copiedText, setCopiedText] = useState(false);

  // Current day metadata
  const currentDayInfo = DAYS_LIST.find((d) => d.key === selectedDay) || DAYS_LIST[0];

  // Tasks for the selected day filtered by class section and sorted by timetable period
  // (Arts & PE classes are excluded from tasks as requested)
  const dayTasks = tasks
    .filter((t) => t.day === selectedDay && (!t.section || t.section === selectedSection))
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
    )
    .sort((a, b) => {
      if (a.period !== undefined && b.period !== undefined) {
        return a.period - b.period;
      }
      if (a.period !== undefined) return -1;
      if (b.period !== undefined) return 1;
      return 0;
    });

  // Filtered tasks (English states)
  const filteredTasks = dayTasks.filter((t) => {
    if (filter === 'pending') return !t.isDone;
    if (filter === 'completed') return t.isDone;
    return true;
  });

  // Calculate statistics
  const totalCount = dayTasks.length;
  const completedCount = dayTasks.filter((t) => t.isDone).length;
  const pendingCount = totalCount - completedCount;
  const percentCompleted = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Timetable periods for this day (from image: 8 periods)
  const dayPeriods = timetable[selectedDay] || [];

  // Group tasks by subject
  const subjectMap = new Map<string, Subject>();
  subjects.forEach((s) => subjectMap.set(s.id, s));

  // Handle Mark All Done
  const handleMarkAllDone = () => {
    dayTasks.forEach((t) => {
      if (!t.isDone) {
        onToggleDone(t.id);
      }
    });
    triggerAllDoneCelebration();
  };

  // Switch to next or previous day
  const currentIndex = DAYS_LIST.findIndex((d) => d.key === selectedDay);
  const handlePrevDay = () => {
    const nextIdx = (currentIndex - 1 + DAYS_LIST.length) % DAYS_LIST.length;
    onSelectDay(DAYS_LIST[nextIdx].key);
  };
  const handleNextDay = () => {
    const nextIdx = (currentIndex + 1) % DAYS_LIST.length;
    onSelectDay(DAYS_LIST[nextIdx].key);
  };

  // Copy WhatsApp summary
  const handleCopyWhatsApp = () => {
    const lines = [
      `📅 خطة يوم ${currentDayInfo.nameAr} (${currentDayInfo.nameEn}) - فصل ${student.grade}`,
      `📌 مدرسة النيل المصرية الدولية - فرع المنيا`,
      `📊 نسبة الإنجاز: ${percentCompleted}% (Done: ${completedCount}/${totalCount})`,
      '--------------------------------',
    ];

    // List periods of the day
    if (dayPeriods.length > 0) {
      lines.push('🕒 جدول الحصص اليومي:');
      dayPeriods.forEach((p) => {
        const s = subjectMap.get(p.subjectId);
        lines.push(`• الحصة ${p.period} (${p.timeRange}): ${s?.nameEn || ''} - ${s?.nameAr || ''}`);
      });
      lines.push('--------------------------------');
    }

    // List tasks
    lines.push('📝 المهام والواجبات المقررة:');
    if (dayTasks.length === 0) {
      lines.push('لا توجد مهام مسجلة اليوم.');
    } else {
      dayTasks.forEach((t) => {
        const s = subjectMap.get(t.subjectId);
        const statusIcon = t.isDone ? '✅ [Done]' : '⭕ [Pending]';
        lines.push(`${statusIcon} ${s?.nameEn || ''}: ${t.title}${t.details ? ` - ${t.details}` : ''}${t.pages ? ` (${t.pages})` : ''}`);
      });
    }

    lines.push('--------------------------------');
    lines.push(`Weekly Plan Tracker - Grade 2 (${selectedSection})`);

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP ACTION BUTTONS BAR - PROMINENT REQUESTED ICONS & STUDYING WEEKLY PLAN */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 p-4 sm:p-5 rounded-3xl text-white shadow-md flex flex-wrap items-center justify-between gap-4 border border-indigo-800/40">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 border border-indigo-400/40 flex items-center justify-center text-white font-black text-lg shadow-sm">
            {selectedSection}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-indigo-300 text-xs font-bold uppercase tracking-wider font-sans block">
                Nile Egyptian International Schools • Grade 2
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-[10px] font-bold border border-indigo-400/30 font-sans">
                فصل {selectedSection}
              </span>
            </div>
            <h1 className="text-white font-black text-xl sm:text-2xl tracking-tight font-sans">
              Studying Weekly Plan
            </h1>
          </div>
        </div>

        {/* Action Buttons: Timetable, Weekdays Planner, and Archive */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Requested Icon 1: Timetable Button */}
          <button
            type="button"
            id="btn-open-timetable-modal"
            onClick={onOpenTimetableModal}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-white text-indigo-950 hover:bg-indigo-50 shadow-sm transition-all duration-150 flex items-center gap-2 font-sans active:scale-95 cursor-pointer"
            title={`عرض الجدول الدراسي لفصل ${selectedSection}`}
          >
            <Calendar className="w-4 h-4 text-indigo-600 stroke-[2.5]" />
            <span className="font-bold">عرض الجدول ({selectedSection})</span>
          </button>

          {/* Requested Icon 2: All Days of Week & Weekly Plan Button */}
          <button
            type="button"
            id="btn-open-weekdays-modal"
            onClick={onOpenWeekDaysModal}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-sm transition-all duration-150 flex items-center gap-2 font-sans active:scale-95 cursor-pointer"
            title="عرض كل أيام الأسبوع والمخطط الكامل"
          >
            <ListTodo className="w-4 h-4 text-purple-200 stroke-[2.5]" />
            <span className="font-bold">أيام الأسبوع والمخطط</span>
          </button>

          {/* Requested Feature: Archive & Memory of Weeks Button */}
          {onOpenArchiveModal && (
            <button
              type="button"
              id="btn-archive-header"
              onClick={onOpenArchiveModal}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-purple-950/70 hover:bg-purple-900 text-purple-200 border border-purple-700/60 shadow-xs transition-all duration-150 flex items-center gap-2 font-sans active:scale-95 cursor-pointer"
              title="الرجوع لذاكرة وأرشيف الأسابيع والبلوكات السابقة"
            >
              <FolderArchive className="w-4 h-4 text-purple-400 stroke-[2.2]" />
              <span className="font-bold">أرشيف الأسابيع (B{activeBlockNumber} • W{activeWeekNumber})</span>
            </button>
          )}

          {/* Requested Feature: Today's Progress Button in this exact box */}
          <button
            type="button"
            id="btn-today-progress-box"
            onClick={() => {
              const el = document.getElementById('today-tasks-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-150 flex items-center gap-2 font-sans active:scale-95 cursor-pointer shadow-sm ${
              percentCompleted === 100 && totalCount > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-emerald-700 hover:bg-emerald-600 text-white'
            }`}
            title={`إنجاز اليوم: ${completedCount} من أصل ${totalCount} (${percentCompleted}%)`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-200 stroke-[2.5]" />
            <span className="font-bold font-sans">
              إنجاز اليوم ({percentCompleted}%)
            </span>
          </button>
        </div>
      </div>

      {/* 2. DAY HEADER WITH DAY SWITCHER & QUICK ICONS */}
      <header className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between md:items-center gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-sans">
              Daily View • {student.grade}
            </span>
            {currentDayInfo.isSchoolDay ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-sans">
                School Day
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-sans">
                Weekend
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors"
              title="اليوم السابق"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Clickable Day Title that opens Weekdays Planner Modal as requested */}
            <button
              type="button"
              onClick={onOpenWeekDaysModal}
              className="text-right group flex items-baseline gap-2.5"
              title="اضغط هنا لعرض كل أيام الأسبوع والمخطط"
            >
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                يوم {currentDayInfo.nameAr}
              </h2>
              <span className="text-indigo-600 text-lg sm:text-xl font-bold font-sans">
                {currentDayInfo.nameEn}
              </span>
            </button>

            <button
              type="button"
              onClick={handleNextDay}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors"
              title="اليوم التالي"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          <p className="text-slate-500 mt-1 font-medium text-xs sm:text-sm">
            {percentCompleted === 100 && totalCount > 0
              ? '🎉 All Done! تم إنجاز جميع مهام اليوم بنجاح!'
              : totalCount > 0
              ? `إنجاز ${completedCount} من أصل ${totalCount} مهمة (${percentCompleted}%)`
              : 'لا توجد مهام مسجلة لهذا اليوم. اضغط + لإضافة خطة المادة'}
          </p>
        </div>

        {/* Days Circle Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none select-none">
          {DAYS_LIST.map((day) => {
            const isSelected = selectedDay === day.key;
            const isRealToday = todayDay === day.key;
            const tasksForDay = tasks.filter((t) => t.day === day.key);
            const isDayAllDone = tasksForDay.length > 0 && tasksForDay.every((t) => t.isDone);

            return (
              <button
                key={day.key}
                type="button"
                id={`select-day-${day.key}`}
                onClick={() => onSelectDay(day.key)}
                className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border-2 flex flex-col items-center justify-center font-bold text-xs sm:text-sm transition-all duration-150 ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm scale-105 ring-2 ring-indigo-200'
                    : isDayAllDone
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 bg-white'
                }`}
                title={`${day.nameAr} (${day.nameEn})`}
              >
                <span className="font-sans font-black text-xs">{day.shortEn}</span>
                <span className="text-[10px] font-medium leading-none">{day.shortAr}</span>
                {isRealToday && (
                  <span
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white"
                    title="اليوم الحالي"
                  />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* 3. TODAY'S 8 PERIODS STRIP (From uploaded timetable G2B) */}
      {dayPeriods.length > 0 && (
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800">
                  حصص يوم {currentDayInfo.nameAr} وفقاً لجدول فصل Grade {selectedSection} المدرسي:
                </span>
                <span className="text-[11px] text-slate-400 font-sans block">
                  (8 حصص - من 7:45 ص إلى 3:05 م)
                </span>
              </div>
            </div>
          </div>

          {/* Periods Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {dayPeriods.map((slot) => {
              const subj = subjectMap.get(slot.subjectId);
              return (
                <div
                  key={slot.period}
                  className={`p-2.5 rounded-2xl border flex flex-col justify-between transition-all hover:scale-102 ${
                    subj?.color.lightBg || 'bg-slate-50'
                  } ${subj?.color.border || 'border-slate-200'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-white/80 text-slate-700">
                      P{slot.period}
                    </span>
                    <SubjectIcon name={subj?.iconName || 'BookOpen'} className={`w-3.5 h-3.5 ${subj?.color.text}`} />
                  </div>
                  <div className="font-bold text-xs text-slate-900 truncate font-sans">
                    {subj?.nameEn || slot.subjectId}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {subj?.nameAr}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono mt-1 pt-1 border-t border-black/5">
                    {slot.timeRange}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. CONTROLS & FILTER BAR (English Done & Pending tags) */}
      <div id="today-tasks-section" className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        {/* Filter Pills with English words */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-semibold font-sans">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              filter === 'all'
                ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              filter === 'pending'
                ? 'bg-amber-500 text-white font-bold shadow-2xs'
                : 'text-slate-600 hover:text-amber-700'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('completed')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              filter === 'completed'
                ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Done ({completedCount})
          </button>
        </div>

        {/* Actions (WhatsApp & Mark All Done) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyWhatsApp}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-700 bg-slate-100 hover:bg-indigo-50 border border-slate-200 transition-colors flex items-center gap-1.5"
            title="نسخ ملخص اليوم للواتساب"
          >
            {copiedText ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">تم النسخ!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span>مشاركة ملخص اليوم</span>
              </>
            )}
          </button>

          {pendingCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllDone}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1.5 font-sans"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mark All Done</span>
            </button>
          )}

          {!isVisitor && (
            <button
              type="button"
              onClick={() => onAddTaskForDay(selectedDay)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 shadow-xs font-sans"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Task</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. TASKS LIST (المطلوب من المواد يومياً) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTasks.map((task) => {
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
              isVisitor={isVisitor}
            />
          );
        })}

        {/* Card for "+ Add Task / Classwork / Homework" */}
        {!isVisitor && (
          <div
            id="btn-add-task-today-grid"
            onClick={() => onAddTaskForDay(selectedDay)}
            className="bg-slate-50 hover:bg-indigo-50/60 border-2 border-dashed border-slate-300 hover:border-indigo-400 p-6 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-150 group text-center min-h-[110px]"
            title="إضافة مهمة جديدة لخطة اليوم"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-slate-800 group-hover:text-indigo-700 font-bold text-sm">
              إضافة خطة مادة / واجب ليوم {currentDayInfo.nameAr}
            </span>
            <span className="text-slate-400 text-xs mt-0.5 font-sans">
              Add Weekly Plan Task
            </span>
          </div>
        )}
      </div>

      {/* Empty State message if filter returned empty */}
      {filteredTasks.length === 0 && totalCount > 0 && (
        <div className="text-center py-8 px-4 bg-white rounded-3xl border border-slate-200">
          <p className="text-slate-600 text-sm font-medium">
            {filter === 'completed'
              ? 'لا توجد مهام منجزة بعد (No completed tasks yet).'
              : 'رائع! لا توجد مهام متبقية، جميع المهام تم إنجازها (All Done)!'}
          </p>
        </div>
      )}

      {/* 6. TOMORROW'S PREPARATION & SCHOOL BAG REMINDER (تحضيرات وتجهيزات غداً تحت المطلوب من المواد) */}
      <TomorrowPrepCard
        currentDay={selectedDay}
        tasks={tasks}
        subjects={subjects}
        timetable={timetable}
        section={selectedSection}
        onSelectDay={onSelectDay}
      />
    </div>
  );
};
