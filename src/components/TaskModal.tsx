import React, { useState, useEffect } from 'react';
import { DAYS_LIST } from '../data/defaultData';
import { DayOfWeek, PlanTask, Subject, TaskType } from '../types';
import { SubjectIcon } from './SubjectIcon';
import { X, Check, BookOpen, Sparkles } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<PlanTask, 'id' | 'createdAt'> & { id?: string }) => void;
  editingTask?: PlanTask | null;
  defaultDay?: DayOfWeek;
  defaultSubjectId?: string;
  subjects: Subject[];
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTask,
  defaultDay = 'sunday',
  defaultSubjectId,
  subjects,
}) => {
  const [day, setDay] = useState<DayOfWeek>(defaultDay);
  const [subjectId, setSubjectId] = useState<string>(defaultSubjectId || subjects[0]?.id || 'math');
  const [type, setType] = useState<TaskType>('homework');
  const [title, setTitle] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [pages, setPages] = useState<string>('');
  const [isDone, setIsDone] = useState<boolean>(false);

  useEffect(() => {
    if (editingTask) {
      setDay(editingTask.day);
      setSubjectId(editingTask.subjectId);
      setType(editingTask.type);
      setTitle(editingTask.title);
      setDetails(editingTask.details || '');
      setPages(editingTask.pages || '');
      setIsDone(editingTask.isDone);
    } else {
      setDay(defaultDay);
      setSubjectId(defaultSubjectId || subjects[0]?.id || 'math');
      setType('homework');
      setTitle('');
      setDetails('');
      setPages('');
      setIsDone(false);
    }
  }, [editingTask, defaultDay, defaultSubjectId, subjects, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      ...(editingTask ? { id: editingTask.id } : {}),
      day,
      subjectId,
      type,
      title: title.trim(),
      details: details.trim() || undefined,
      pages: pages.trim() || undefined,
      isDone,
      completedAt: isDone ? (editingTask?.completedAt || Date.now()) : undefined,
    });
    onClose();
  };

  const taskTypes: { value: TaskType; label: string; icon: string }[] = [
    { value: 'classwork', label: 'شرح فصلي (Classwork)', icon: '📖' },
    { value: 'homework', label: 'واجب منزلي (Homework)', icon: '📝' },
    { value: 'study', label: 'مذاكرة وحفظ (Study)', icon: '📚' },
    { value: 'dictation', label: 'إملاء (Dictation)', icon: '✍️' },
    { value: 'quiz', label: 'اختبار / كويز (Quiz)', icon: '🏆' },
    { value: 'supplies', label: 'أدوات مطلوبة (Supplies)', icon: '🎒' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl border border-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-black text-slate-900">
              {editingTask ? 'تعديل خطة المادة / المهمة' : 'إضافة خطة مادة جديدة'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-sans">
              Weekly Plan Task Entry • Grade 2B
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Day selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              اليوم في الأسبوع:
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {DAYS_LIST.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDay(d.key)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
                    day === d.key
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span className="block text-[11px] font-sans opacity-90">{d.shortEn}</span>
                  <span>{d.nameAr}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Subject selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              المادة الدراسية:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
              {subjects.map((sub) => {
                const isSelected = subjectId === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSubjectId(sub.id)}
                    className={`p-2 rounded-xl text-right flex items-center gap-2 border transition-all text-xs font-bold ${
                      isSelected
                        ? `${sub.color.lightBg} ${sub.color.border} ring-2 ring-indigo-500 ${sub.color.text}`
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white ${sub.color.bg} shrink-0`}>
                      <SubjectIcon name={sub.iconName} className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate min-w-0">
                      <div className="truncate font-sans font-bold text-xs">{sub.nameEn || sub.nameAr}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Task Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              نوع المحتوى:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {taskTypes.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    type === t.value
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{t.icon}</span>
                  <span className="truncate">{t.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              عنوان الموضوع أو الدرس: <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: Unit 1: Place value and value / درس الجمع..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-900"
            />
          </div>

          {/* Details */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              التفاصيل / Classwork / الملاحظات:
            </label>
            <textarea
              rows={2}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="مثال: Classwork: Sheet 1 Main - Please bring small whiteboard..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-900"
            />
          </div>

          {/* Page numbers / Homework */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              أرقام الصفحات / Homework:
            </label>
            <input
              type="text"
              value={pages}
              onChange={(e) => setPages(e.target.value)}
              placeholder="مثال: Page 81 / De page 3 à page 7"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-900"
            />
          </div>

          {/* Initial Done Status in English */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block font-sans">
                Task Status
              </span>
              <span className="text-[11px] text-slate-500 font-sans">
                {isDone ? 'Marked as Done' : 'Pending completion'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsDone(!isDone)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold font-sans transition-all flex items-center gap-1.5 ${
                isDone
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {isDone ? <Check className="w-4 h-4" /> : null}
              <span>{isDone ? 'Done' : 'Pending'}</span>
            </button>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
            >
              {editingTask ? 'حفظ التعديلات' : 'إضافة إلى الخطة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
