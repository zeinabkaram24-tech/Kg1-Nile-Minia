import React from 'react';
import { DAYS_LIST, PERIODS_TIMING } from '../data/defaultData';
import { GradeSection, Subject, Timetable } from '../types';
import { SubjectIcon } from './SubjectIcon';
import { Printer, Clock } from 'lucide-react';

interface TimetableViewProps {
  timetable: Timetable;
  subjects: Subject[];
  currentSection?: GradeSection;
  isAdmin?: boolean;
  onOpenAdminLogin?: () => void;
  onSelectSection?: (section: GradeSection) => void;
  onUpdateTimetable?: (timetable: Timetable) => void;
  onResetTimetable?: () => void;
  isVisitor?: boolean;
}

export const TimetableView: React.FC<TimetableViewProps> = ({
  timetable,
  subjects,
  currentSection = 'KG1A',
  onSelectSection,
}) => {
  const subjectMap = new Map<string, Subject>();
  subjects.forEach((s) => subjectMap.set(s.id, s));

  const schoolDays = DAYS_LIST.filter((d) => d.isSchoolDay);

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider font-sans">
                Official School Timetable • KG 1 ({currentSection})
              </span>
              {onSelectSection && (
                <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                  {(['KG1A', 'KG1B', 'KG1C', 'KG1D', 'KG1E'] as GradeSection[]).map((sec) => (
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
                      فصل {sec.replace('KG1', 'KG 1 ')}
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
              className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>طباعة الجدول</span>
            </button>
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
            <span className="font-bold text-indigo-700">8 Periods Daily</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">40 min each</span>
          </div>
        </div>
      </div>

      {/* 2. Responsive Table Grid */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-xs">
                <th className="p-4 text-center font-bold border-e border-slate-800 w-28">
                  اليوم / الحصة
                </th>
                {PERIODS_TIMING.map((pt) => (
                  <th key={pt.period} className="p-3 text-center border-e border-slate-800 last:border-e-0 min-w-[110px]">
                    <div className="font-black text-sm font-sans">Period {pt.period}</div>
                    <div className="text-[10px] text-slate-300 font-mono mt-0.5">{pt.time}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
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
                            <div className="w-full p-2.5 rounded-2xl border border-dashed border-slate-100 text-slate-300 text-xs font-medium flex items-center justify-center">
                              <span>-</span>
                            </div>
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
    </div>
  );
};
