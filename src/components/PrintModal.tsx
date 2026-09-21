import React, { useState } from 'react';
import {
  Printer,
  X,
  Calendar,
  Layers,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import {
  SchoolClass,
  DailyFollowUp,
  WeeklyPlanItem,
  ClassTimetable
} from '../types';
import { getSubjectInfo } from './SubjectBadge';
import { BLOCKS, WEEKS, PERIOD_TIMES } from '../data/initialData';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClass: SchoolClass;
  selectedBlock: string;
  selectedWeek: string;
  dailyFollowUps: DailyFollowUp[];
  weeklyPlans: WeeklyPlanItem[];
  timetables: ClassTimetable[];
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  selectedClass,
  selectedBlock,
  selectedWeek,
  dailyFollowUps,
  weeklyPlans,
  timetables
}) => {
  const [printType, setPrintType] = useState<'daily' | 'weekly' | 'timetable'>('daily');

  if (!isOpen) return null;

  const currentDaily =
    dailyFollowUps.find((d) => d.classId === selectedClass) || dailyFollowUps[0];
  const currentTimetable =
    timetables.find((t) => t.classId === selectedClass) || timetables[0];

  const currentPlans = weeklyPlans.filter(
    (p) =>
      p.blockId === selectedBlock &&
      p.weekId === selectedWeek &&
      (p.classId === 'all' || p.classId === selectedClass)
  );

  const blockObj = BLOCKS.find((b) => b.id === selectedBlock);
  const weekObj = WEEKS.find((w) => w.id === selectedWeek);

  const handlePrintTrigger = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 max-h-[95vh] flex flex-col justify-between">
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-sky-700" />
            <h3 className="font-bold text-base text-slate-900">
              معاينة وطباعة التقرير المدرسي الرسمي
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* Report Type Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setPrintType('daily')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  printType === 'daily' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                تقرير المتابعة اليومية
              </button>
              <button
                type="button"
                onClick={() => setPrintType('weekly')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  printType === 'weekly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Weekly Plan
              </button>
              <button
                type="button"
                onClick={() => setPrintType('timetable')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  printType === 'timetable' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                جدول الحصص
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrintTrigger}
              className="flex items-center gap-1.5 bg-sky-700 hover:bg-sky-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة المستند الآن</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE DOCUMENT AREA */}
        <div id="printable-sheet" className="p-6 overflow-y-auto print:p-0">
          {/* Official Document Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-center justify-between">
            <div className="text-right">
              <h1 className="text-xl font-black text-slate-900">
                مدارس النيل المصرية الدولية - فرع المنيا
              </h1>
              <p className="text-xs font-semibold text-slate-700">
                Nile Egyptian Schools - Minya Branch • KG 1
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Class {selectedClass} • العام الدراسي 2026/2027
              </p>
            </div>

            <div className="text-left bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 block">نوع التقرير</span>
              <span className="text-xs font-black text-slate-900">
                {printType === 'daily'
                  ? `متابعة يوم ${currentDaily?.dayNameAr || ''} (${currentDaily?.date || ''})`
                  : printType === 'weekly'
                  ? `${blockObj?.nameAr} - ${weekObj?.nameAr}`
                  : `جدول الحصص الأسبوعي لـ Class ${selectedClass}`}
              </span>
            </div>
          </div>

          {/* 1. DAILY FOLLOW UP PRINT VIEW */}
          {printType === 'daily' && currentDaily && (
            <div className="space-y-6">
              {/* Classwork Table */}
              <div>
                <h3 className="text-sm font-black bg-slate-800 text-white px-3 py-1.5 rounded-md mb-2">
                  1. Classwork
                </h3>
                <table className="w-full border-collapse border border-slate-300 text-xs text-right">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 p-2 w-28">المادة</th>
                      <th className="border border-slate-300 p-2 w-48">عنوان الدرس</th>
                      <th className="border border-slate-300 p-2">تفاصيل ما تم شرحه</th>
                      <th className="border border-slate-300 p-2 w-28">الصفحات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentDaily.classwork?.map((cw) => (
                      <tr key={cw.id}>
                        <td className="border border-slate-300 p-2 font-bold">
                          {getSubjectInfo(cw.subjectId).nameAr}
                        </td>
                        <td className="border border-slate-300 p-2 font-semibold">
                          {cw.lessonTitle}
                        </td>
                        <td className="border border-slate-300 p-2 text-slate-700">
                          {cw.details}
                        </td>
                        <td className="border border-slate-300 p-2 text-slate-500">
                          {cw.pages || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Homework Table */}
              <div>
                <h3 className="text-sm font-black bg-amber-800 text-white px-3 py-1.5 rounded-md mb-2">
                  2. Homework
                </h3>
                <table className="w-full border-collapse border border-slate-300 text-xs text-right">
                  <thead>
                    <tr className="bg-amber-50">
                      <th className="border border-slate-300 p-2 w-28">المادة</th>
                      <th className="border border-slate-300 p-2">الواجب المطلوب</th>
                      <th className="border border-slate-300 p-2 w-28">موعد التسليم</th>
                      <th className="border border-slate-300 p-2 w-24 text-center">حالة الإنجاز</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentDaily.homework?.map((hw) => (
                      <tr key={hw.id}>
                        <td className="border border-slate-300 p-2 font-bold">
                          {getSubjectInfo(hw.subjectId).nameAr}
                        </td>
                        <td className="border border-slate-300 p-2">
                          <div className="font-semibold">{hw.assignment}</div>
                          {hw.instructions && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {hw.instructions}
                            </div>
                          )}
                        </td>
                        <td className="border border-slate-300 p-2 text-slate-700">
                          {hw.dueDate || 'غداً'}
                        </td>
                        <td className="border border-slate-300 p-2 text-center text-slate-400">
                          [ &nbsp; ]
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tomorrow Preparations Table */}
              <div>
                <h3 className="text-sm font-black bg-emerald-800 text-white px-3 py-1.5 rounded-md mb-2">
                  3. تجهيزات ومستلزمات الغد (Tomorrow's Preparations)
                </h3>
                <div className="border border-slate-300 rounded-lg p-3 divide-y divide-slate-200">
                  {currentDaily.tomorrowPreparations?.map((prep) => (
                    <div key={prep.id} className="py-1.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border border-slate-400 rounded-sm inline-block"></span>
                        <span className="font-bold text-slate-900">{prep.item}</span>
                        {prep.subjectId && (
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                            {getSubjectInfo(prep.subjectId).nameAr}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {prep.category === 'clothes' ? 'زي مدرسي' : prep.category === 'tools' ? 'أدوات' : 'كتب وكشاكيل'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. WEEKLY PLAN PRINT VIEW */}
          {printType === 'weekly' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentPlans.map((plan) => (
                  <div key={plan.id} className="border border-slate-300 rounded-xl p-3 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                      <span className="font-black text-slate-900">
                        {getSubjectInfo(plan.subjectId).nameAr}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {getSubjectInfo(plan.subjectId).nameEn}
                      </span>
                    </div>
                    <div className="font-bold text-slate-800 mb-1.5">{plan.unitOrTheme}</div>
                    <div className="mb-2">
                      <span className="font-bold text-[11px] text-slate-600 block">الأهداف:</span>
                      <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                        {plan.learningObjectives?.map((o, idx) => (
                          <li key={idx}>{o}</li>
                        ))}
                      </ul>
                    </div>
                    {plan.resourcesNote && (
                      <div className="text-[11px] text-slate-500">
                        <span className="font-semibold">المصادر:</span> {plan.resourcesNote}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. TIMETABLE PRINT VIEW */}
          {printType === 'timetable' && (
            <div>
              <table className="w-full border-collapse border border-slate-300 text-xs text-center">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="border border-slate-300 p-2">اليوم</th>
                    {PERIOD_TIMES.map((pt) => (
                      <th key={pt.periodNum} className="border border-slate-300 p-1.5">
                        <div>حصة {pt.periodNum}</div>
                        <div className="text-[9px] font-normal">{pt.time}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentTimetable.days.map((day) => (
                    <tr key={day.dayNameAr}>
                      <td className="border border-slate-300 p-2 font-black bg-slate-100">
                        {day.dayNameAr}
                      </td>
                      {day.periods.map((slot) => {
                        const sub = getSubjectInfo(slot.subjectId);
                        return (
                          <td key={slot.id} className="border border-slate-300 p-1.5">
                            <div className="font-bold text-slate-900">{sub.nameEn}</div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Signature & Stamp Footer */}
          <div className="mt-8 pt-6 border-t border-slate-300 grid grid-cols-3 text-center text-xs text-slate-600">
            <div>
              <span className="block font-bold">معلم الفصل</span>
              <span className="block text-slate-400 mt-6">...................</span>
            </div>
            <div>
              <span className="block font-bold">منسق المرحلة الابتدائية</span>
              <span className="block text-slate-400 mt-6">...................</span>
            </div>
            <div>
              <span className="block font-bold">خاتم المدرسة / الإدارة</span>
              <span className="block text-slate-400 mt-6">...................</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions (Hidden in Print) */}
        <div className="pt-4 border-t border-slate-200 flex justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            إغلاق
          </button>
          <button
            type="button"
            onClick={handlePrintTrigger}
            className="px-5 py-2 text-sm bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-xl shadow-xs transition-colors"
          >
            طباعة المستند
          </button>
        </div>
      </div>
    </div>
  );
};
