import React, { useState } from 'react';
import { DAYS_LIST, PERIODS_TIMING } from '../data/defaultData';
import { DayOfWeek, GradeSection, Subject, Timetable } from '../types';
import { SubjectIcon } from './SubjectIcon';
import { RotateCcw, Plus, Check, Printer, Clock, School, Lock, ShieldCheck } from 'lucide-react';

interface TimetableViewProps {
  timetable: Timetable;
  subjects: Subject[];
  currentSection?: GradeSection;
  isAdmin?: boolean;
  onOpenAdminLogin?: () => void;
  onSelectSection?: (section: GradeSection) => void;
  onUpdateTimetable: (timetable: Timetable) => void;
  onResetTimetable: () => void;
  isVisitor?: boolean;
}

export const TimetableView: React.FC<TimetableViewProps> = ({
  timetable,
  subjects,
  currentSection = '2A',
  isAdmin = false,
  onOpenAdminLogin,
  onSelectSection,
  onUpdateTimetable,
  onResetTimetable,
  isVisitor = false,
}) => {
  const [editingSlot, setEditingSlot] = useState<{ day: DayOfWeek; period: number } | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  const subjectMap = new Map<string, Subject>();
  subjects.forEach((s) => subjectMap.set(s.id, s));

  const schoolDays = DAYS_LIST.filter((d) => d.isSchoolDay);

  const handleOpenEdit = (day: DayOfWeek, period: number, currentSubjId: string) => {
    if (!isAdmin) {
      if (onOpenAdminLogin) {
        onOpenAdminLogin();
      }
      return;
    }
    setEditingSlot({ day, period });
    setSelectedSubjectId(currentSubjId);
  };

  const handleSaveSlot = () => {
    if (!editingSlot) return;
    const { day, period } = editingSlot;
    const currentSlots = timetable[day] ? [...timetable[day]] : [];
    const existingIndex = currentSlots.findIndex((s) => s.period === period);
    const pt = PERIODS_TIMING.find((p) => p.period === period);
    const timeRange = pt ? pt.time : `الحصة ${period}`;

    if (existingIndex >= 0) {
      currentSlots[existingIndex] = {
        ...currentSlots[existingIndex],
        subjectId: selectedSubjectId,
      };
    } else {
      currentSlots.push({
        period,
        timeRange,
        subjectId: selectedSubjectId,
      });
      currentSlots.sort((a, b) => a.period - b.period);
    }

    onUpdateTimetable({
      ...timetable,
      [day]: currentSlots,
    });
    setEditingSlot(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider font-sans">
                Official School Timetable • Grade {currentSection}
              </span>
              {onSelectSection && (
                <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                  {(['2A', '2B', '2C'] as GradeSection[]).map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => onSelectSection(sec)}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                        currentSection === sec
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      فصل {sec}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              الجدول الدراسي الأسبوعي (فصل {currentSection})
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              مدارس النيل المصرية الدولية - فرع المنيا (من الحصة الأولى 7:45 إلى الثامنة 3:05)
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-2"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>طباعة الجدول</span>
            </button>
            {isAdmin ? (
              <button
                type="button"
                onClick={onResetTimetable}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors flex items-center gap-2"
                title="إعادة ضبط الجدول للقيم الأصلية"
              >
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span>استعادة جدول فصل {currentSection} الأصلي</span>
              </button>
            ) : (
              !isVisitor && (
                <button
                  type="button"
                  onClick={onOpenAdminLogin}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors flex items-center gap-1.5"
                  title="تعديل أو استعادة الجدول متاح للأدمن فقط"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>تعديل الجدول (للأدمن فقط)</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Daily Schedule Structure & Breaks info */}
        <div className="mt-5 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs text-indigo-950">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
            <span><strong>طابور الصباح (Line):</strong> 7:30 - 7:45</span>
            <span>•</span>
            <span><strong>إفطار (Breakfast):</strong> 9:25 - 9:45</span>
            <span>•</span>
            <span><strong>غداء (Lunch break):</strong> 13:05 - 13:25</span>
          </div>
          <div className="flex items-center gap-1.5 font-sans">
            {isAdmin ? (
              <span className="text-indigo-800 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>وضع الأدمن نشط: يمكنك النقر على أي حصة لتعديل المادة</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={onOpenAdminLogin}
                className="text-slate-500 hover:text-indigo-600 font-medium flex items-center gap-1"
              >
                <Lock className="w-3 h-3 text-slate-400" />
                <span>عرض الجدول الرسمي (تعديل الحصص مقتصر على الأدمن)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Full Timetable Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 text-xs font-bold border-b border-slate-200">
                <th className="p-4 w-32 border-e border-slate-200">
                  <span className="block font-black text-slate-900 text-sm">اليوم</span>
                  <span className="text-[11px] text-slate-400 font-normal font-sans">Day</span>
                </th>
                {PERIODS_TIMING.map((pt) => (
                  <th key={pt.period} className="p-3 border-e border-slate-200 last:border-e-0">
                    <span className="block font-black text-slate-900 text-sm">{pt.label}</span>
                    <span className="text-[10px] text-slate-500 font-mono block font-normal">{pt.time}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {schoolDays.map((day) => {
                const daySlots = timetable[day.key] || [];
                return (
                  <tr key={day.key} className="hover:bg-slate-50/50 transition-colors">
                    {/* Day Column */}
                    <td className="p-4 bg-slate-50 border-e border-slate-200 text-center font-bold">
                      <div className="text-slate-900 font-black text-base">{day.nameAr}</div>
                      <div className="text-[11px] text-slate-400 font-sans font-medium">{day.nameEn}</div>
                    </td>

                    {/* Periods 1 to 8 */}
                    {PERIODS_TIMING.map((pt) => {
                      const slot = daySlots.find((s) => s.period === pt.period);
                      const subj = slot ? subjectMap.get(slot.subjectId) : undefined;
                      return (
                        <td key={pt.period} className="p-2 text-center align-middle border-e border-slate-100 last:border-e-0">
                          {slot && subj ? (
                            isVisitor ? (
                              <div
                                className={`w-full p-2.5 rounded-2xl border text-center ${subj.color.lightBg} ${subj.color.border}`}
                              >
                                <div className="flex items-center justify-center mb-1">
                                  <SubjectIcon name={subj.iconName} className={`w-4 h-4 ${subj.color.text}`} />
                                </div>
                                <span className={`text-xs font-bold ${subj.color.text} truncate block font-sans`}>
                                  {subj.nameEn || subj.nameAr}
                                </span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(day.key, pt.period, slot.subjectId)}
                                className={`w-full p-2.5 rounded-2xl border transition-all hover:scale-105 hover:shadow-xs text-center group ${subj.color.lightBg} ${subj.color.border}`}
                                title="اضغط لتغيير المادة"
                              >
                                <div className="flex items-center justify-center mb-1">
                                  <SubjectIcon name={subj.iconName} className={`w-4 h-4 ${subj.color.text}`} />
                                </div>
                                <span className={`text-xs font-bold ${subj.color.text} truncate block font-sans`}>
                                  {subj.nameEn || subj.nameAr}
                                </span>
                              </button>
                            )
                          ) : (
                            isVisitor ? (
                              <div className="w-full p-2.5 rounded-2xl border border-dashed border-slate-100 text-slate-300 text-xs font-medium flex items-center justify-center">
                                <span>-</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(day.key, pt.period, subjects[0]?.id || '')}
                                className="w-full p-2.5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-slate-400 hover:text-indigo-600 text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>إضافة</span>
                              </button>
                            )
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Edit Slot Modal */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl border border-slate-100">
            <h3 className="text-xl font-black text-slate-900 mb-1">
              تعديل مادة الحصة {editingSlot.period}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              ليوم{' '}
              <strong className="text-slate-800">
                {DAYS_LIST.find((d) => d.key === editingSlot.day)?.nameAr} (
                {DAYS_LIST.find((d) => d.key === editingSlot.day)?.nameEn})
              </strong>
            </p>

            {/* Subject Choices */}
            <div className="grid grid-cols-2 gap-2.5 max-h-72 overflow-y-auto p-1">
              {subjects.map((sub) => {
                const isSelected = selectedSubjectId === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedSubjectId(sub.id)}
                    className={`p-3 rounded-2xl border text-right transition-all flex items-center gap-2.5 ${
                      isSelected
                        ? `${sub.color.lightBg} ${sub.color.border} ring-2 ring-indigo-500`
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${sub.color.bg} shrink-0`}>
                      <SubjectIcon name={sub.iconName} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 truncate font-sans">{sub.nameEn || sub.nameAr}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveSlot}
                className="px-6 py-2 rounded-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                حفظ الحصة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
