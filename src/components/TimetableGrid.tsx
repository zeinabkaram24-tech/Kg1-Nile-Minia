import React from 'react';
import { CalendarDays } from 'lucide-react';
import { ClassId, SchoolDay } from '../types';
import {
  CLASS_TIMETABLES,
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
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  currentClass,
  onSelectDay,
  selectedDay,
}) => {
  const schedule = CLASS_TIMETABLES[currentClass];

  return (
    <div className="space-y-3">
      {/* Header Info Banner */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
              {currentClass} Timetable
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              جدول الحصص الأسبوعي (8 حصص)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {SCHOOL_NAME} • {SCHOOL_BRANCH} Campus • KG 1 ({currentClass})
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
          <CalendarDays className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>اضغطي على أي يوم للانتقال إليه</span>
        </div>
      </div>

      {/* Full-width Responsive Timetable Table (No horizontal scrolling, no lunch column) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full table-fixed border-collapse text-xs text-left">
          {/* Table Header with Periods & Times (Without Lunch) */}
          <thead>
            <tr className="bg-slate-100 text-slate-800 border-b-2 border-slate-300">
              <th className="p-1 sm:p-2 font-black text-center border-r border-slate-300 w-[10%] bg-slate-200/80 text-slate-900 text-[11px] sm:text-xs">
                اليوم
              </th>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((pNum) => (
                <th
                  key={pNum}
                  className={`p-1 sm:p-1.5 font-extrabold text-center w-[11.25%] ${
                    pNum === 8 ? '' : 'border-r border-slate-300'
                  }`}
                >
                  <div className="text-slate-900 font-black text-[10px] sm:text-xs">P{pNum}</div>
                  <div className="text-[8.5px] sm:text-[10px] text-slate-500 font-semibold hidden md:block">
                    {PERIOD_TIMES[pNum]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {SCHOOL_DAYS.filter((d) => (schedule[d] || []).length > 0).map((day) => {
              const daySlots = schedule[day] || [];
              const isSelected = selectedDay === day;
              const getPeriod = (num: number) => daySlots.find((p) => p.period === num);

              return (
                <tr
                  key={day}
                  onClick={() => onSelectDay(day)}
                  className={`cursor-pointer transition-colors border-b border-slate-200 ${
                    isSelected
                      ? 'bg-indigo-50/70 hover:bg-indigo-50/90'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* Day Column */}
                  <td className="p-1 sm:p-1.5 font-black border-r border-slate-300 text-center bg-slate-100/70">
                    <div className="text-[10px] sm:text-xs font-black text-slate-950 truncate">
                      {day}
                    </div>
                    {isSelected && (
                      <span className="text-[8px] sm:text-[9px] font-black text-indigo-800 bg-indigo-100 border border-indigo-200 px-1 py-0.2 rounded-full mt-0.5 inline-block">
                        Active
                      </span>
                    )}
                  </td>

                  {/* 8 Periods directly side-by-side without lunch column */}
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((pNum) => (
                    <SlotCell
                      key={pNum}
                      slot={getPeriod(pNum)}
                      isLast={pNum === 8}
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
        className={`p-0.5 sm:p-1 text-center text-slate-300 font-bold ${
          isLast ? '' : 'border-r border-slate-300'
        }`}
      >
        -
      </td>
    );
  }

  const meta = SUBJECT_METADATA[slot.subject];

  return (
    <td
      className={`p-0.5 sm:p-1 text-center align-top ${
        isLast ? '' : 'border-r border-slate-300'
      } transition-all`}
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
