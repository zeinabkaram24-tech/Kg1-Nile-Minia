import React, { useState } from 'react';
import {
  User,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Calendar,
  Sparkles,
  BookOpen,
  Award,
  Clock,
  LogOut,
  AlertCircle,
  CheckSquare
} from 'lucide-react';
import {
  StudentProfile,
  StudentPersonalTask,
  SchoolClass,
  DailyFollowUp
} from '../types';
import { SubjectBadge, getSubjectInfo } from './SubjectBadge';
import { SUBJECTS } from '../data/initialData';

interface StudentSpaceProps {
  studentProfile: StudentProfile | null;
  onUpdateStudentProfile: (p: StudentProfile | null) => void;
  tasks: StudentPersonalTask[];
  onAddTask: (task: Omit<StudentPersonalTask, 'id' | 'createdAt'>) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  dailyFollowUps: DailyFollowUp[];
  completedHwMap: Record<string, boolean>;
  onToggleHwCompletion: (hwId: string) => void;
}

export const StudentSpace: React.FC<StudentSpaceProps> = ({
  studentProfile,
  onUpdateStudentProfile,
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  dailyFollowUps,
  completedHwMap,
  onToggleHwCompletion
}) => {
  // If no profile, show friendly login
  const [nameInput, setNameInput] = useState('');
  const [classInput, setClassInput] = useState<SchoolClass>('KG1A');

  // Task creation form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState<string>('english');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');

  if (!studentProfile) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-md text-center my-8">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4 font-black">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">مساحة الطالب الخاصة</h2>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          سجل دخولك باسمك وفصلك لتتمكن من إضافة تاسكاتك الشخصية ومتابعة تقدم واجباتك المدرسية وحفظها في حسابك.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!nameInput.trim()) return;
            onUpdateStudentProfile({
              name: nameInput.trim(),
              classId: classInput
            });
          }}
          className="space-y-4 text-right"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">اسم الطالب:</label>
            <input
              type="text"
              placeholder="اكتب اسمك الثلاثي أو الثنائي..."
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Class in KG 1:</label>
            <div className="grid grid-cols-5 gap-1.5">
              {(['KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E'] as SchoolClass[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setClassInput(c)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    classInput === c
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Class {c.slice(-1)}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors mt-2 text-sm"
          >
            دخول مساحتي الدراسية
          </button>
        </form>
      </div>
    );
  }

  // Filter student tasks
  const studentTasks = tasks.filter(
    (t) => t.studentName.toLowerCase() === studentProfile.name.toLowerCase()
  );

  const pendingTasks = studentTasks.filter((t) => !t.completed);
  const completedTasks = studentTasks.filter((t) => t.completed);

  const displayedTasks =
    taskFilter === 'pending'
      ? pendingTasks
      : taskFilter === 'completed'
      ? completedTasks
      : studentTasks;

  // Get current class daily homework
  const currentClassFollowUp = dailyFollowUps.find((d) => d.classId === studentProfile.classId) || dailyFollowUps[0];
  const todayHomework = currentClassFollowUp?.homework || [];
  const completedTodayHwCount = todayHomework.filter((h) => completedHwMap[h.id]).length;

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    onAddTask({
      studentName: studentProfile.name,
      classId: studentProfile.classId,
      title: newTaskTitle.trim(),
      subjectId: newTaskSubject,
      completed: false,
      dueDate: newTaskDueDate.trim() || undefined
    });

    setNewTaskTitle('');
    setNewTaskDueDate('');
  };

  return (
    <div className="space-y-6">
      {/* Student Welcome Card */}
      <div className="bg-gradient-to-l from-emerald-800 via-teal-900 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-emerald-700/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-md border-2 border-amber-300">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  أهلاً بك يا بطل: {studentProfile.name} 🌟
                </h2>
                <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-xs px-3 py-1 rounded-full font-bold">
                  Class {studentProfile.classId}
                </span>
              </div>
              <p className="text-emerald-200 text-xs mt-1">
                مدرسة النيل المصرية الدولية فرع المنيا • جريد 2 • حساب الطالب الشخصي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-emerald-950/60 border border-emerald-700/60 px-3 py-2 rounded-xl text-xs text-emerald-200">
              <span className="font-bold text-white ml-1">{completedTasks.length}</span> تاسك منجز
            </div>
            <button
              type="button"
              onClick={() => onUpdateStudentProfile(null)}
              className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
              title="تسجيل الخروج أو تغيير اسم الطالب"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تغيير الطالب</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal Tasks (2 Cols on lg) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Add Personal Task Box */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <h3 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <span>إضافة تاسك أو مهمة دراسية جديدة في حسابك</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              هذه التاسكات خاصة بك وحدك، لا يراها غيرك وتساعدك على تنظيم مذاكرتك ومشاريعك.
            </p>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <input
                  id="student-task-title"
                  type="text"
                  placeholder="اكتب عنوان التاسك (مثال: حفظ سورة الفلق، تجهيز مجسم الساينس، التدريب على مسائل ماث...)"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    المادة المرتبطة:
                  </label>
                  <select
                    value={newTaskSubject}
                    onChange={(e) => setNewTaskSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    موعد الإنجاز المستهدف:
                  </label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  id="add-personal-task-btn"
                  type="submit"
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة التاسك لحسابي</span>
                </button>
              </div>
            </form>
          </div>

          {/* Student Personal Tasks List */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  تاسكاتي وملاحظاتي الخاصة ({studentTasks.length})
                </h3>
                <p className="text-xs text-slate-500">
                  قائمة مهامك الشخصية المسجلة باسم {studentProfile.name}
                </p>
              </div>

              {/* Task filter pills */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTaskFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    taskFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  الكل ({studentTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('pending')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    taskFilter === 'pending' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  متبقية ({pendingTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('completed')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    taskFilter === 'completed' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  مكتملة ({completedTasks.length})
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {displayedTasks.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
                  <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">
                    {taskFilter === 'pending'
                      ? 'رائع! لا توجد تاسكات متبقية، لقد أنجزت كل ما عليك!'
                      : 'لا توجد تاسكات شخصية مسجلة بعد. أضف أول تاسك من النموذج بالأعلى!'}
                  </p>
                </div>
              ) : (
                displayedTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                      task.completed
                        ? 'bg-slate-50/70 border-slate-200 text-slate-400'
                        : 'bg-white border-slate-200 hover:border-emerald-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onToggleTask(task.id)}
                        className={`transition-colors ${
                          task.completed
                            ? 'text-emerald-600'
                            : 'text-slate-400 hover:text-emerald-600'
                        }`}
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-5 h-5 fill-emerald-100" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <div>
                        <p
                          className={`text-xs font-bold leading-snug ${
                            task.completed ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {task.subjectId && (
                            <SubjectBadge subjectId={task.subjectId} size="sm" />
                          )}
                          {task.dueDate && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>الموعد: {task.dueDate}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="حذف التاسك"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Today's Homework for the Student's Class */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-600" />
                <h3 className="font-black text-sm text-slate-900">
                  Homework - Class {studentProfile.classId}
                </h3>
              </div>
              <span className="bg-amber-100 text-amber-900 text-[11px] font-bold px-2 py-0.5 rounded-full">
                {completedTodayHwCount} / {todayHomework.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              يمكنك التأشير على واجباتك المدرسية المكتملة هنا لتحفيز نفسك ومتابعة إنجازك.
            </p>

            <div className="space-y-3">
              {todayHomework.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  لا توجد واجبات مسجلة لفصلك اليوم.
                </p>
              ) : (
                todayHomework.map((hw) => {
                  const isDone = completedHwMap[hw.id];
                  return (
                    <div
                      key={hw.id}
                      onClick={() => onToggleHwCompletion(hw.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isDone
                          ? 'bg-emerald-50/50 border-emerald-300'
                          : 'bg-slate-50 border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <SubjectBadge subjectId={hw.subjectId} size="sm" />
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isDone ? 'تم الحل ✓' : 'مطلوب'}
                        </span>
                      </div>
                      <p
                        className={`text-xs font-semibold leading-relaxed ${
                          isDone ? 'line-through text-slate-400' : 'text-slate-800'
                        }`}
                      >
                        {hw.assignment}
                      </p>
                      {hw.dueDate && (
                        <div className="text-[10px] text-slate-500 mt-1">
                          التسليم: {hw.dueDate}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Motivational Nile Student Card */}
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-amber-950">
            <h4 className="font-extrabold text-xs mb-1 flex items-center gap-1.5">
              <span>🌟 نصيحة اليوم لطلاب النيل:</span>
            </h4>
            <p className="text-xs leading-relaxed text-amber-900">
              «رتّب حقيبتك المدرسية الليلة قبل النوم وفقاً لجدول غد وتجهيزات الغد لتبدأ يومك الدراسي بنشاط وثقة!»
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
