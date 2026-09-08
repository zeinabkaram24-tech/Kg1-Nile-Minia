import React from 'react';
import { DAYS_LIST, PERIODS_TIMING } from '../data/defaultData';
import { GradeSection, Subject, Timetable } from '../types';
import { SubjectIcon } from './SubjectIcon';
import { X, Calendar, Printer, ExternalLink, School } from 'lucide-react';

interface QuickTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  timetable: Timetable;
  subjects: Subject[];
  currentSection?: GradeSection;
  onSelectSection?: (section: GradeSection) => void;
  onOpenFullTimetable?: () => void;
}

export const QuickTimetableModal: React.FC<QuickTimetableModalProps> = ({
  isOpen,
  onClose,
  timetable,
  subjects,
  currentSection = '2A',
  onSelectSection,
  onOpenFullTimetable,
}) => {
  if (!isOpen) return null;

  const subjectMap = new Map<string, Subject>();
  subjects.forEach((s) => subjectMap.set(s.id, s));

  const schoolDays = DAYS_LIST.filter((d) => d.isSchoolDay);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-100 my-4 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-black text-sm shadow-sm">
              {currentSection}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  الجدول الدراسي الأسبوعي (فصل {currentSection})
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold font-sans">
                  Grade 2
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans">
                Nile Egyptian International Schools – Minia Branch
              </p>
            </div>
          </div>

          {/* Section Switcher in Modal */}
          {onSelectSection && (
            <div className="flex items-center bg-slate-200/80 p-1 rounded-xl">
              <span className="text-xs font-bold text-slate-600 px-2 flex items-center gap-1">
                <School className="w-3.5 h-3.5 text-indigo-600" />
                <span>الفصل:</span>
              </span>
              {(['2A', '2B', '2C'] as GradeSection[]).map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => onSelectSection(sec)}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                    currentSection === sec
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors"
              title="طباعة الجدول"
            >
              <Printer className="w-4 h-4" />
            </button>
            {onOpenFullTimetable && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullTimetable();
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-xl hover:bg-indigo-50 transition-colors flex items-center gap-1 font-sans"
              >
                <span>تعديل الجدول</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Schedule Timing Summary Bar */}
        <div className="px-6 py-2 bg-indigo-50/60 border-b border-indigo-100/80 text-[11px] font-sans flex flex-wrap items-center justify-between gap-2 text-indigo-950 font-medium">
          <div className="flex items-center gap-3">
            <span><strong>Line:</strong> 7:30 - 7:45</span>
            <span>•</span>
            <span><strong>Breakfast:</strong> 9:25 - 9:45</span>
            <span>•</span>
            <span><strong>Lunch break:</strong> 13:05 - 13:25</span>
          </div>
          <span className="text-indigo-700 font-bold">8 Periods Daily (الحصص من 1 إلى 8)</span>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto p-4 sm:p-6 flex-1">
          <table className="w-full text-center border-collapse min-w-[780px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-xs font-bold border-b border-slate-200">
                <th className="p-3 w-28 border-e border-slate-200">
                  <span className="block font-black text-slate-900 text-sm">اليوم / الحصة</span>
                  <span className="text-[10px] text-slate-400 font-normal font-sans">Day \ Period</span>
                </th>
                {PERIODS_TIMING.map((p) => (
                  <th key={p.period} className="p-2.5 border-e border-slate-200 last:border-e-0">
                    <span className="block font-black text-slate-900 text-xs sm:text-sm">{p.period}</span>
                    <span className="text-[10px] text-slate-500 font-mono block font-normal">{p.time}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {schoolDays.map((day) => {
                const daySlots = timetable[day.key] || [];
                return (
                  <tr key={day.key} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 bg-slate-50 border-e border-slate-200 font-bold text-center">
                      <div className="text-slate-900 font-black text-sm">{day.nameAr}</div>
                      <div className="text-[11px] text-slate-500 font-sans">{day.nameEn}</div>
                    </td>

                    {PERIODS_TIMING.map((pt) => {
                      const slot = daySlots.find((s) => s.period === pt.period);
                      const subj = slot ? subjectMap.get(slot.subjectId) : undefined;
                      return (
                        <td key={pt.period} className="p-1.5 border-e border-slate-100 last:border-e-0 align-middle">
                          {subj ? (
                            <div
                              className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${subj.color.lightBg} ${subj.color.border}`}
                            >
                              <SubjectIcon name={subj.iconName} className={`w-4 h-4 ${subj.color.text}`} />
                              <span className={`text-xs font-bold ${subj.color.text} leading-tight font-sans`}>
                                {subj.nameEn || subj.nameAr}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs font-mono">—</span>
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

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-right flex items-center justify-between">
          <span className="text-xs text-slate-500 font-sans">
            مطابق لجدول الفصل المدرسي الرسمي لـ G2B
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-full text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
