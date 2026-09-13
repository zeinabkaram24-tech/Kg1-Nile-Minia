import React from 'react';
import { ClassId, SchoolDay, ClassworkEntry, HomeworkEntry } from '../types';
import {
  CLASS_TIMETABLES,
  NEXT_SCHOOL_DAY,
  SUBJECT_METADATA,
  SCHOOL_NAME,
  SCHOOL_BRANCH,
} from '../data/timetables';
import { SPECIAL_TEACHER_NOTES } from '../data/defaultWeeklyPlan';
import { WEEK2_SPECIAL_NOTES } from '../data/week2Plan';

interface PrintSheetProps {
  currentClass: ClassId;
  selectedDay: SchoolDay;
  classworkList: ClassworkEntry[];
  homeworkList: HomeworkEntry[];
  currentBlock?: number;
  currentWeek?: number;
}

export const PrintSheet: React.FC<PrintSheetProps> = ({
  currentClass,
  selectedDay,
  classworkList,
  homeworkList,
  currentBlock = 1,
  currentWeek = 2,
}) => {
  const tomorrowDay = NEXT_SCHOOL_DAY[selectedDay];
  const tomorrowPeriods = CLASS_TIMETABLES[currentClass][tomorrowDay] || [];
  const todayPeriods = CLASS_TIMETABLES[currentClass][selectedDay] || [];

  const dayClasswork = classworkList.filter(
    (c) =>
      c.classId === currentClass &&
      c.day === selectedDay &&
      (c.block || 1) === currentBlock &&
      (c.week || 1) === currentWeek
  );

  const dueTomorrowHomework = homeworkList.filter(
    (h) =>
      h.classId === currentClass &&
      h.dueDay === tomorrowDay &&
      (h.block || 1) === currentBlock &&
      (h.week || 1) === currentWeek
  );

  const tomorrowSpecial =
    currentBlock === 1 && currentWeek === 2
      ? WEEK2_SPECIAL_NOTES.filter(
          (n) => n.classId === currentClass && n.targetDay === tomorrowDay
        )
      : currentBlock === 1 && currentWeek === 1
      ? SPECIAL_TEACHER_NOTES.filter(
          (n) =>
            n.classId === currentClass &&
            n.targetDay === tomorrowDay &&
            (n.week === 1 || !n.week)
        )
      : [];

  // Bag items for tomorrow
  const tomorrowBagItems = new Set<string>();
  tomorrowPeriods.forEach((p) => {
    const meta = SUBJECT_METADATA[p.subject];
    if (meta) {
      meta.standardBagItems.forEach((item) => tomorrowBagItems.add(item));
    }
  });

  return (
    <div className="hidden print:block p-6 text-black bg-white max-w-4xl mx-auto text-xs">
      {/* Header */}
      <div className="border-b-2 border-black pb-3 mb-4 flex justify-between items-end">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-tight">{SCHOOL_NAME}</h1>
          <p className="text-sm font-semibold text-slate-700">
            {SCHOOL_BRANCH} Branch • KG 1 ({currentClass}) • Daily & Tomorrow Prep
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold">Day: {selectedDay}</div>
          <div className="text-xs text-slate-600">Tomorrow: {tomorrowDay}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Today's Classwork & Periods */}
        <div className="border border-black p-3 rounded">
          <h3 className="font-bold text-sm border-b border-black pb-1 mb-2">
            1. Classwork - {selectedDay} (Today's Lessons)
          </h3>
          <ol className="space-y-1.5 list-decimal pl-4">
            {todayPeriods.map((slot) => {
              const cw = dayClasswork.find((c) => c.period === slot.period);
              return (
                <li key={slot.period} className="leading-tight">
                  <strong>P{slot.period} ({slot.subject}):</strong> {cw ? cw.title : 'Standard Curriculum'}{' '}
                  {cw?.pages && <span className="italic font-normal">[{cw.pages}]</span>}
                  <span className="text-slate-600 text-[10px]"> — {slot.teacher}</span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Homework to Complete & Submit */}
        <div className="border border-black p-3 rounded">
          <h3 className="font-bold text-sm border-b border-black pb-1 mb-2">
            2. Homework & Assignments
          </h3>
          {dueTomorrowHomework.length === 0 ? (
            <p className="text-slate-600 italic">No specific homework due tomorrow.</p>
          ) : (
            <ul className="space-y-2">
              {dueTomorrowHomework.map((hw) => (
                <li key={hw.id} className="leading-tight">
                  <span className="inline-block w-3 h-3 border border-black mr-1.5 align-middle"></span>
                  <strong>{hw.subject}:</strong> {hw.task}{' '}
                  {hw.pages && <span>({hw.pages})</span>}
                  <div className="text-[10px] text-slate-600 pl-5 font-semibold">
                    Due: Tomorrow ({hw.dueDay})
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Tomorrow Bag & Schedule */}
      <div className="border border-black p-3 rounded mb-4">
        <h3 className="font-bold text-sm border-b border-black pb-1 mb-2">
          3. Tomorrow's Bag Checklist ({tomorrowDay})
        </h3>
        <p className="text-[11px] mb-2 font-medium">
          Pack tonight before sleeping! Tomorrow periods: {tomorrowPeriods.map((p) => p.subject).join(', ')}.
        </p>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <div className="font-bold mb-1 underline">Subject Books & Materials:</div>
            <ul className="space-y-1">
              {Array.from(tomorrowBagItems).map((it, idx) => (
                <li key={idx} className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 border border-black shrink-0"></span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="font-bold mb-1 underline">Daily School Essentials:</div>
            <ul className="space-y-1">
              <li className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 border border-black shrink-0"></span>
                <span>Pencil case (pencils, eraser, sharpener, ruler)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 border border-black shrink-0"></span>
                <span>Breakfast box & snack (for 9:25 AM break)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 border border-black shrink-0"></span>
                <span>Water bottle filled</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 border border-black shrink-0"></span>
                <span>School ID / Bus badge</span>
              </li>
            </ul>
          </div>
        </div>

        {tomorrowSpecial.length > 0 && (
          <div className="mt-3 pt-2 border-t border-dashed border-black">
            <div className="font-bold text-amber-900 mb-1">
              ★ Special Teacher Instructions & Materials for Tomorrow:
            </div>
            <ul className="space-y-1 text-[10px]">
              {tomorrowSpecial.map((sn, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="inline-block w-3 h-3 border border-black shrink-0 mt-0.5"></span>
                  <div>
                    <strong>[{sn.subject}]</strong> {sn.note} <span className="text-slate-600">({sn.arabicNote})</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Parent signature */}
      <div className="flex justify-between items-center pt-2 text-[11px] text-slate-700">
        <div>Parent Signature: _______________________</div>
        <div>Nile Egyptian International Schools - Menia Campus</div>
      </div>
    </div>
  );
};
