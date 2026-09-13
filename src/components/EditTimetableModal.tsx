import React, { useState } from 'react';
import {
  X,
  Calendar,
  Plus,
  Trash2,
  Check,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { ClassId, SchoolDay, PeriodSlot, SubjectName } from '../types';
import {
  SCHOOL_DAYS,
  PERIOD_TIMES,
  SUBJECT_METADATA,
} from '../data/timetables';
import {
  updatePeriodSlot,
  deletePeriodSlot,
  clearClassTimetable,
} from '../utils/timetableStorage';

interface EditTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentClass: ClassId;
  timetables: Record<ClassId, Record<SchoolDay, PeriodSlot[]>>;
  onTimetableChange: (updated: Record<ClassId, Record<SchoolDay, PeriodSlot[]>>) => void;
  initialSelectedDay?: SchoolDay;
  initialSelectedPeriod?: number;
}

const AVAILABLE_SUBJECTS: SubjectName[] = [
  'Mathematics',
  'English',
  'Arabic',
  'Science',
  'Social Studies',
  'French',
  'Religion',
  'ICT',
  'Arts',
  'Music',
  'PE',
];

const ARABIC_DAYS: Record<SchoolDay, string> = {
  Saturday: 'السبت',
  Sunday: 'الأحد',
  Monday: 'الإثنين',
  Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء',
  Thursday: 'الخميس',
};

export const EditTimetableModal: React.FC<EditTimetableModalProps> = ({
  isOpen,
  onClose,
  currentClass,
  timetables,
  onTimetableChange,
  initialSelectedDay = 'Sunday',
  initialSelectedPeriod = 1,
}) => {
  const [activeDay, setActiveDay] = useState<SchoolDay>(initialSelectedDay);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(initialSelectedPeriod);
  const [subject, setSubject] = useState<SubjectName>('English');
  const [teacher, setTeacher] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const currentSchedule = timetables[currentClass] || {};
  const currentDaySlots = currentSchedule[activeDay] || [];

  const handleSelectSlot = (pNum: number) => {
    setSelectedPeriod(pNum);
    const existing = currentDaySlots.find((s) => s.period === pNum);
    if (existing) {
      setSubject(existing.subject as SubjectName);
      setTeacher(existing.teacher || '');
      setNotes(existing.notes || '');
    } else {
      setTeacher('');
      setNotes('');
    }
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const time = PERIOD_TIMES[selectedPeriod] || '';
    const newSlot: PeriodSlot = {
      period: selectedPeriod,
      time,
      subject,
      teacher: teacher.trim() || 'معلم المادة',
      notes: notes.trim() || undefined,
    };
    const updated = updatePeriodSlot(currentClass, activeDay, newSlot);
    onTimetableChange(updated);
  };

  const handleDeleteSlot = (pNum: number) => {
    const updated = deletePeriodSlot(currentClass, activeDay, pNum);
    onTimetableChange(updated);
    if (selectedPeriod === pNum) {
      setTeacher('');
      setNotes('');
    }
  };

  const handleClearDay = () => {
    if (confirm(`هل أنتِ متأكدة من مسح جميع حصص يوم ${ARABIC_DAYS[activeDay]} لفصل ${currentClass}؟`)) {
      let updated = timetables;
      for (let p = 1; p <= 8; p++) {
        updated = deletePeriodSlot(currentClass, activeDay, p);
      }
      onTimetableChange(updated);
    }
  };

  const handleClearClass = () => {
    if (confirm(`هل أنتِ متأكدة من مسح جدول فصل ${currentClass} بالكامل للبدء من الصفر؟`)) {
      const updated = clearClassTimetable(currentClass);
      onTimetableChange(updated);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-4 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                إدخال وتعديل جدول الحصص ({currentClass})
              </h3>
              <p className="text-xs text-slate-500">
                أدخلي الحصص وأسماء المعلمين للجدول الجديد
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 py-4 space-y-4 pr-1">
          {/* Day Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {SCHOOL_DAYS.map((day) => {
              const count = (currentSchedule[day] || []).length;
              const isActive = activeDay === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    setActiveDay(day);
                    handleSelectSlot(selectedPeriod);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{ARABIC_DAYS[day]}</span>
                  <span className="text-[10px] opacity-80">({day.slice(0, 3)})</span>
                  {count > 0 && (
                    <span
                      className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                        isActive ? 'bg-indigo-800 text-white' : 'bg-slate-300 text-slate-800'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 8 Periods Grid for selected day */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700">
                حصص يوم {ARABIC_DAYS[activeDay]} (اختاري الحصة لتعديلها):
              </span>
              <button
                type="button"
                onClick={handleClearDay}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                مسح حصص هذا اليوم
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((pNum) => {
                const slot = currentDaySlots.find((s) => s.period === pNum);
                const isCurrent = selectedPeriod === pNum;
                const meta = slot ? SUBJECT_METADATA[slot.subject] : null;

                return (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => handleSelectSlot(pNum)}
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-between min-h-[68px] ${
                      isCurrent
                        ? 'ring-2 ring-indigo-600 border-transparent shadow-xs'
                        : ''
                    } ${
                      slot
                        ? meta?.badgeBg || 'bg-indigo-50 border-indigo-200 text-indigo-900'
                        : 'bg-slate-50 hover:bg-slate-100 border-dashed border-slate-300 text-slate-400'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase text-slate-500">
                      P{pNum}
                    </span>
                    {slot ? (
                      <div className="w-full truncate px-0.5">
                        <span className="text-[11px] font-black block truncate">
                          {slot.subject}
                        </span>
                        <span className="text-[9px] font-semibold block truncate text-slate-600">
                          {slot.teacher}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">+ فارغة</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Period Edit Form */}
          <form
            onSubmit={handleSaveSlot}
            className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-black text-slate-800">
                تعديل الحصة {selectedPeriod} ({PERIOD_TIMES[selectedPeriod]}) — {ARABIC_DAYS[activeDay]}
              </span>
              {currentDaySlots.some((s) => s.period === selectedPeriod) && (
                <button
                  type="button"
                  onClick={() => handleDeleteSlot(selectedPeriod)}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  حذف الحصة
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Subject selection */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  المادة الدراسية:
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as SubjectName)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {AVAILABLE_SUBJECTS.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub} ({SUBJECT_METADATA[sub]?.arabicName || sub})
                    </option>
                  ))}
                </select>
              </div>

              {/* Teacher name */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  اسم المعلم / المعلمة:
                </label>
                <input
                  type="text"
                  value={teacher}
                  onChange={(e) => setTeacher(e.target.value)}
                  placeholder="مثال: أ/ سارة أحمد أو Mr. John"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Notes / Instructions */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                ملاحظات أو أدوات مطلوبة للحصة (اختياري):
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: إحضار كشكول التدريبات أو زي التربية الرياضية"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>حفظ الحصة {selectedPeriod}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClearClass}
            className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            تفريغ جدول {currentClass} بالكامل
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
