import React from 'react';
import { Sparkles, BookOpen, Plus, Pencil, Trash2 } from 'lucide-react';
import { ClassId, SchoolDay, PeriodSlot, TomorrowSpecialNote } from '../types';
import {
  CLASS_TIMETABLES,
  NEXT_SCHOOL_DAY,
  SUBJECT_METADATA,
} from '../data/timetables';
import { SubjectIcon } from './SubjectIcon';

interface TomorrowViewProps {
  currentClass: ClassId;
  selectedDay: SchoolDay;
  currentBlock?: number;
  currentWeek?: number;
  timetables?: Record<ClassId, Record<SchoolDay, PeriodSlot[]>>;
  customTomorrowNotes?: TomorrowSpecialNote[];
  isAdminLiveEdit?: boolean;
  onEditTomorrowNote?: (note: TomorrowSpecialNote, index: number) => void;
  onDeleteTomorrowNote?: (index: number) => void;
  onAddTomorrowNote?: () => void;
}

const ARABIC_DAY_NAMES: Record<SchoolDay, string> = {
  Saturday: 'السبت',
  Sunday: 'الأحد',
  Monday: 'الإثنين',
  Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء',
  Thursday: 'الخميس',
};

export const TomorrowView: React.FC<TomorrowViewProps> = ({
  currentClass,
  selectedDay,
  currentBlock = 1,
  currentWeek = 1,
  timetables,
  customTomorrowNotes = [],
  isAdminLiveEdit = false,
  onEditTomorrowNote,
  onDeleteTomorrowNote,
  onAddTomorrowNote,
}) => {
  // Tomorrow's target day based on the active selected day
  const tomorrowDay: SchoolDay = NEXT_SCHOOL_DAY[selectedDay] || 'Sunday';

  // Tomorrow's timetable periods
  const schedule = timetables ? timetables[currentClass] : CLASS_TIMETABLES[currentClass];
  const targetPeriods: PeriodSlot[] = (schedule && schedule[tomorrowDay]) || [];

  // Filter notes from the weekly plan strictly for current class and current block/week
  const allMatchingCustomNotes = customTomorrowNotes.filter(
    (n) =>
      (n.classId === currentClass || (n.classId as string) === 'ALL' || !n.classId) &&
      (n.block !== undefined ? n.block === currentBlock : true) &&
      (n.week !== undefined ? n.week === currentWeek : true)
  );

  // Notes strictly intended for tomorrow (target day)
  const tomorrowNotes = allMatchingCustomNotes.filter(
    (n) => n.targetDay === tomorrowDay || (n.day === tomorrowDay && !n.targetDay)
  );

  // General notes applicable to the whole week / all days
  const generalWeeklyNotes = allMatchingCustomNotes.filter(
    (n) =>
      n.targetDay === 'ALL' ||
      (!n.targetDay && !n.day) ||
      (!['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'].includes(
        (n.targetDay || n.day) as string
      ))
  );

  return (
    <div className="space-y-4">
      {/* Grid of Subject Blocks */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <span className="text-sm font-black text-slate-900">
            جدول حصص الغد — يوم {ARABIC_DAY_NAMES[tomorrowDay]} ({tomorrowDay})
          </span>
          <span className="text-xs text-indigo-900 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
            {currentClass} • {targetPeriods.length} حصص
          </span>
        </div>

        {targetPeriods.length === 0 ? (
          <div className="p-6 text-center text-slate-400">
            <BookOpen className="w-6 h-6 mx-auto mb-1 text-slate-300" />
            <p className="text-xs font-bold">لا توجد حصص مسجلة ليوم {ARABIC_DAY_NAMES[tomorrowDay]}</p>
          </div>
        ) : (
          /* 6 Periods Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {targetPeriods.map((slot) => {
              const meta = SUBJECT_METADATA[slot.subject];
              return (
                <div
                  key={slot.period}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-center shadow-2xs transition-all ${
                    meta?.badgeBg || 'bg-slate-100 text-slate-900 border-slate-300'
                  }`}
                >
                  <SubjectIcon subject={slot.subject} className="w-4 h-4 shrink-0" />
                  <span className="font-black text-xs sm:text-sm truncate">
                    {slot.subject}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Block for Notes Underneath (ملاحظات المعلمين والخطة الأسبوعية فقط إذا وجدت) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs space-y-4">
        {/* Header with Admin button */}
        <div className="flex items-center justify-between pb-1 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2 text-amber-950 font-black text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>ملاحظات وتنبيهات الغد — يوم {ARABIC_DAY_NAMES[tomorrowDay]}</span>
          </div>

          <div className="flex items-center gap-2">
            {isAdminLiveEdit && onAddTomorrowNote && (
              <button
                type="button"
                onClick={onAddTomorrowNote}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-transform active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ إضافة ملاحظة للغد</span>
              </button>
            )}

            {tomorrowNotes.length > 0 && (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {tomorrowNotes.length} ملاحظة
              </span>
            )}
          </div>
        </div>

        {/* Notes Content */}
        {tomorrowNotes.length === 0 ? (
          <div className="py-5 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
            <p className="text-xs text-slate-500 font-bold">
              لا توجد ملاحظات أو طلبات خاصة مسجلة في الخطة الأسبوعية ليوم {ARABIC_DAY_NAMES[tomorrowDay]}.
            </p>
            {isAdminLiveEdit && onAddTomorrowNote && (
              <div>
                <button
                  type="button"
                  onClick={onAddTomorrowNote}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-transform active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ إضافة ملاحظة الآن</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {tomorrowNotes.map((note, idx) => {
              const rawIndex = customTomorrowNotes.indexOf(note);
              return (
                <div
                  key={idx}
                  className="bg-amber-50/60 rounded-xl border border-amber-200/80 p-3 shadow-2xs space-y-1.5 text-xs relative group"
                >
                  <div className="flex items-start justify-between gap-2 text-slate-900">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-950 font-black text-[11px] shrink-0">
                        ملاحظات • {note.subject === 'Social Studies' ? 'الدراسات الاجتماعية' : note.subject || 'العربي'}
                      </span>
                      <span className="font-bold leading-relaxed">{note.arabicNote || note.note}</span>
                    </div>

                    {isAdminLiveEdit && (
                      <div className="flex items-center gap-1 bg-white/90 p-1 rounded-lg border border-amber-200 shrink-0">
                        {onEditTomorrowNote && (
                          <button
                            type="button"
                            onClick={() => onEditTomorrowNote(note, rawIndex !== -1 ? rawIndex : idx)}
                            className="p-1 rounded text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="تعديل الملاحظة"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteTomorrowNote && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) {
                                onDeleteTomorrowNote(rawIndex !== -1 ? rawIndex : idx);
                              }
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="حذف الملاحظة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {note.bagItem && (
                    <div className="text-[11px] text-amber-950 font-semibold bg-white px-2.5 py-1 rounded-lg border border-amber-200/90 inline-block">
                      الأدوات المطلوبة: {note.bagItem}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* General Weekly Notes (if present in plan) */}
        {generalWeeklyNotes.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span>ملاحظات عامة للخطة الأسبوعية:</span>
            </div>
            <div className="space-y-2">
              {generalWeeklyNotes.map((note, idx) => {
                const rawIndex = customTomorrowNotes.indexOf(note);
                return (
                  <div
                    key={idx}
                    className="bg-indigo-50/50 rounded-xl border border-indigo-200/80 p-3 shadow-2xs space-y-1 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2 text-slate-900">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-black text-[11px] shrink-0">
                          ملاحظة عامة
                        </span>
                        <span className="font-bold leading-relaxed">{note.arabicNote || note.note}</span>
                      </div>

                      {isAdminLiveEdit && (
                        <div className="flex items-center gap-1 bg-white/90 p-1 rounded-lg border border-indigo-200 shrink-0">
                          {onEditTomorrowNote && (
                            <button
                              type="button"
                              onClick={() => onEditTomorrowNote(note, rawIndex !== -1 ? rawIndex : idx)}
                              className="p-1 rounded text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="تعديل الملاحظة"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onDeleteTomorrowNote && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) {
                                  onDeleteTomorrowNote(rawIndex !== -1 ? rawIndex : idx);
                                }
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="حذف الملاحظة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
