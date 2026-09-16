import React from 'react';
import { Calendar } from 'lucide-react';
import { ClassId, SchoolDay, PeriodSlot } from '../types';
import {
  SCHOOL_DAYS,
  PERIOD_TIMES,
  SUBJECT_METADATA,
  SCHOOL_NAME,
  SCHOOL_BRANCH,
} from '../data/timetables';
import { SubjectIcon } from './SubjectIcon';

interface TimetableGridProps {
  currentClass: ClassId;
  onSelectDay: (day: SchoolDay) => void;
  selectedDay: SchoolDay;
  timetables: Record<ClassId, Record<SchoolDay, PeriodSlot[]>>;
  onUpdateTimetable?: (updated: Record<ClassId, Record<SchoolDay, PeriodSlot[]>>) => void;
}

const ARABIC_DAYS: Record<SchoolDay, string> = {
  Saturday: 'السبت',
  Sunday: 'الأحد',
  Monday: 'الإثنين',
  Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء',
  Thursday: 'الخميس',
};

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  currentClass,
  onSelectDay,
  selectedDay,
  timetables,
}) => {
  const schedule: Partial<Record<SchoolDay, PeriodSlot[]>> = timetables[currentClass] || {};

  // Check if current class has any periods entered at all
  const totalPeriodsEntered = Object.values(schedule).reduce(
    (acc: number, slots?: PeriodSlot[]) => acc + (slots ? slots.length : 0),
    0
  );

  // Always show Sunday to Thursday, and show Saturday if it has periods
  const visibleDays = SCHOOL_DAYS.filter(
    (d) => d !== 'Saturday' || (schedule.Saturday && schedule.Saturday.length > 0)
  );

  return (
    <div className="space-y-3">
      {/* Header Info Banner */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
              {currentClass} Timetable
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              جدول الحصص الأسبوعي (6 حصص يومياً)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {SCHOOL_NAME} • {SCHOOL_BRANCH} Campus • ({currentClass})
          </p>
        </div>
      </div>

      {/* Notice when timetable is completely empty */}
      {totalPeriodsEntered === 0 && (
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-indigo-950">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-bold leading-relaxed">
              لا توجد حصص مسجلة لهذا الفصل حالياً. سيتم عرض جدول الحصص فور اعتماده من إدارة المدرسة.
            </span>
          </div>
        </div>
      )}

      {/* Full-width Responsive Timetable Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full table-fixed border-collapse text-xs text-left">
          {/* Table Header with Periods & Times */}
          <thead>
            <tr className="bg-slate-100 text-slate-800 border-b-2 border-slate-300">
              <th className="p-1.5 sm:p-2.5 font-black text-center border-r border-slate-300 w-[13%] sm:w-[13%] bg-slate-200/80 text-slate-900 text-[11px] sm:text-xs">
                اليوم
              </th>
              {[1, 2, 3, 4, 5, 6].map((pNum) => (
                <th
                  key={pNum}
                  className={`p-1 sm:p-2 font-extrabold text-center w-[14.5%] ${
                    pNum === 6 ? '' : 'border-r border-slate-300'
                  }`}
                >
                  <div className="text-slate-900 font-black text-xs sm:text-sm">P{pNum}</div>
                  <div className="text-[9px] sm:text-[11px] text-slate-500 font-semibold hidden md:block">
                    {PERIOD_TIMES[pNum]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {visibleDays.map((day) => {
              const daySlots = schedule[day] || [];
              const isSelected = selectedDay === day;
              const getPeriod = (num: number) => daySlots.find((p) => p.period === num);

              return (
                <tr
                  key={day}
                  className={`transition-colors border-b border-slate-200 ${
                    isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/60'
                  }`}
                >
                  {/* Day Column */}
                  <td
                    onClick={() => onSelectDay(day)}
                    className="p-1 sm:p-1.5 font-black border-r border-slate-300 text-center bg-slate-100/70 cursor-pointer hover:bg-indigo-100/70 transition-colors"
                    title={`اختيار يوم ${ARABIC_DAYS[day]}`}
                  >
                    <div className="text-[10px] sm:text-xs font-black text-slate-950 truncate">
                      {ARABIC_DAYS[day]}
                    </div>
                    <div className="text-[9px] text-slate-500 font-medium truncate">
                      {day}
                    </div>
                    {isSelected && (
                      <span className="text-[8px] sm:text-[9px] font-black text-indigo-800 bg-indigo-100 border border-indigo-200 px-1 py-0.2 rounded-full mt-0.5 inline-block">
                        Active
                      </span>
                    )}
                  </td>

                  {/* 6 Periods */}
                  {[1, 2, 3, 4, 5, 6].map((pNum) => (
                    <SlotCell
                      key={pNum}
                      slot={getPeriod(pNum)}
                      isLast={pNum === 6}
                    />
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface SlotCellProps {
  slot?: {
    period: number;
    subject: any;
    teacher: string;
    notes?: string;
  };
  isLast?: boolean;
}

const SlotCell: React.FC<SlotCellProps> = ({ slot, isLast }) => {
  if (!slot) {
    return (
      <td
        className={`p-0.5 sm:p-1 text-center ${
          isLast ? '' : 'border-r border-slate-300'
        }`}
      >
        <div className="min-h-[50px] sm:min-h-[58px] flex items-center justify-center text-slate-300">
          <span className="text-slate-300 font-mono text-xs">—</span>
        </div>
      </td>
    );
  }

  const meta = SUBJECT_METADATA[slot.subject];

  return (
    <td
      className={`p-0.5 sm:p-1 text-center align-top ${
        isLast ? '' : 'border-r border-slate-300'
      }`}
      title={`${slot.subject} - ${slot.teacher}`}
    >
      <div
        className={`rounded-lg p-1 sm:p-1.5 border shadow-2xs ${
          meta?.badgeBg || 'bg-slate-100 text-slate-950 border-slate-300'
        } flex flex-col items-center justify-between min-h-[50px] sm:min-h-[58px]`}
      >
        <div className="flex flex-col items-center gap-0.5 w-full">
          <SubjectIcon subject={slot.subject} className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
          <span className="font-black text-[9px] sm:text-[11px] leading-tight text-center text-slate-950 block truncate w-full">
            {slot.subject}
          </span>
        </div>

        <div className="mt-0.5 pt-0.5 border-t border-slate-300/60 w-full text-center">
          <span
            className="text-[8px] sm:text-[9.5px] font-bold text-slate-700 block truncate leading-tight"
            title={slot.teacher}
          >
            {slot.teacher}
          </span>
        </div>
      </div>
    </td>
  );
};
