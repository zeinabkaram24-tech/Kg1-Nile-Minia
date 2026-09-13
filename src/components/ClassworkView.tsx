import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Edit2,
  User,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import { ClassId, SchoolDay, ClassworkEntry, SubjectName, PeriodSlot } from '../types';
import { CLASS_TIMETABLES, SUBJECT_METADATA } from '../data/timetables';
import { SubjectIcon } from './SubjectIcon';
import { triggerDoneCelebration } from '../utils/celebrate';
import { getSubjectTheme } from '../data/subjectThemes';

interface ClassworkViewProps {
  currentClass: ClassId;
  selectedDay: SchoolDay;
  classworkList: ClassworkEntry[];
  currentBlock?: number;
  currentWeek?: number;
  timetables?: Record<ClassId, Record<SchoolDay, PeriodSlot[]>>;
  onToggleClasswork: (id: string) => void;
  onSaveClasswork: (entry: ClassworkEntry) => void;
}

export const ClassworkView: React.FC<ClassworkViewProps> = ({
  currentClass,
  selectedDay,
  classworkList,
  currentBlock = 1,
  currentWeek = 2,
  timetables,
  onToggleClasswork,
  onSaveClasswork,
}) => {
  // Check if current class has ANY weekly plan entered for this Block and Week
  const hasPlanForWeek = classworkList.some(
    (c) =>
      c.classId === currentClass &&
      (c.block || 1) === currentBlock &&
      (c.week || 1) === currentWeek
  );

  const schedule = timetables ? timetables[currentClass] : CLASS_TIMETABLES[currentClass];
  const rawTimetablePeriods = ((schedule && schedule[selectedDay]) || []).filter(
    (s) => Boolean(s.subject)
  );

  // Group repeated periods (especially English or Mathematics) so they appear once only
  interface GroupedPeriodSlot {
    periods: number[];
    periodLabel: string;
    arabicPeriodLabel: string;
    time: string;
    subject: SubjectName;
    teacher: string;
    notes?: string;
  }

  const timetablePeriods: GroupedPeriodSlot[] = [];
  for (const slot of rawTimetablePeriods) {
    const last = timetablePeriods[timetablePeriods.length - 1];
    if (last && last.subject === slot.subject && (slot.subject === 'English' || slot.subject === 'Mathematics')) {
      last.periods.push(slot.period);
      const startTime = last.time.split(' - ')[0];
      const endTime = slot.time.split(' - ')[1] || slot.time;
      last.time = `${startTime} - ${endTime}`;
      last.periodLabel = last.periods.map((p) => `P${p}`).join(' & ');
      last.arabicPeriodLabel = last.periods.map((p) => `ب${p}`).join(' وب');
    } else {
      timetablePeriods.push({
        periods: [slot.period],
        periodLabel: `P${slot.period}`,
        arabicPeriodLabel: `ب${slot.period}`,
        time: slot.time,
        subject: slot.subject,
        teacher: slot.teacher,
        notes: slot.notes,
      });
    }
  }

  // Edit modal state
  const [editingPeriod, setEditingPeriod] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [editPages, setEditPages] = useState('');
  const [editSubject, setEditSubject] = useState<SubjectName>('English');

  const openEdit = (slotPeriods: number[], subject: SubjectName, existing?: ClassworkEntry) => {
    setEditingPeriod(slotPeriods[0]);
    setEditSubject(subject);
    setEditTitle(existing ? existing.title : '');
    setEditDetails(existing?.details || '');
    setEditPages(existing?.pages || '');
  };

  const handleSave = () => {
    if (editingPeriod === null) return;
    const currentGroup = timetablePeriods.find((slot) => slot.periods.includes(editingPeriod));
    const targetPeriods = currentGroup ? currentGroup.periods : [editingPeriod];

    const existing = classworkList.find(
      (c) =>
        c.classId === currentClass &&
        c.day === selectedDay &&
        targetPeriods.includes(c.period) &&
        (c.block || 1) === currentBlock &&
        (c.week || 1) === currentWeek
    );

    const newEntry: ClassworkEntry = {
      id: existing ? existing.id : `cw-${currentClass}-${selectedDay}-${editingPeriod}-${Date.now()}`,
      classId: currentClass,
      day: selectedDay,
      period: editingPeriod,
      subject: editSubject,
      title: editTitle.trim() || `${editSubject} Lesson`,
      details: editDetails.trim() || undefined,
      pages: editPages.trim() || undefined,
      completed: existing ? existing.completed : false,
      block: currentBlock,
      week: currentWeek,
    };

    onSaveClasswork(newEntry);
    setEditingPeriod(null);
  };

  // Stats for the day based on grouped cards
  const dayStats = timetablePeriods.map((slot) => {
    return classworkList.find(
      (c) =>
        c.classId === currentClass &&
        c.day === selectedDay &&
        slot.periods.includes(c.period) &&
        (c.block || 1) === currentBlock &&
        (c.week || 1) === currentWeek
    );
  });
  const completedCount = dayStats.filter((c) => c && c.completed).length;
  const totalCount = timetablePeriods.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // If this entire week has no plan entered, render clean empty state
  if (!hasPlanForWeek) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
          <BookOpen className="w-7 h-7" />
        </div>
        <h3 className="text-base sm:text-lg font-black text-slate-800">
          لا توجد خطة أسبوعية مسجلة لهذا الأسبوع
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          الأسبوع المحدد (Topic {currentBlock} - Week {currentWeek}) فارغ حالياً ولم يتم إدخال أو رفع أي خطة دراسية له بعد.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timetable Period Cards or Weekend / Empty Day Message */}
      {timetablePeriods.length === 0 ? (
        selectedDay === 'Saturday' ? (
          <div
            id="saturday-prep-card"
            className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 max-w-xl mx-auto shadow-sm text-right"
            dir="rtl"
          >
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center justify-start gap-2">
              <span className="text-xl">📌</span>
              <span>يُخصص يوم السبت للتجهيز والتحضير الأسبوعي:</span>
            </h3>

            {/* Blue accent divider */}
            <div className="h-[2.5px] bg-blue-600 rounded-full my-4 sm:my-5" />

            <div className="space-y-3 sm:space-y-3.5">
              {/* Item 1: Tomorrow */}
              <div className="bg-indigo-50/60 border-e-4 border-e-blue-600 rounded-xl p-3.5 sm:p-4 text-slate-800 text-xs sm:text-sm font-bold flex items-center gap-2">
                <span className="text-slate-900 text-base leading-none">•</span>
                <span className="text-blue-600 font-extrabold" dir="ltr">
                  (Tomorrow):
                </span>
                <span>لتجهيز حقيبة يوم الأحد.</span>
              </div>

              {/* Item 2: Homework */}
              <div className="bg-indigo-50/60 border-e-4 border-e-blue-600 rounded-xl p-3.5 sm:p-4 text-slate-800 text-xs sm:text-sm font-bold flex items-center gap-2">
                <span className="text-slate-900 text-base leading-none">•</span>
                <span className="text-blue-600 font-extrabold" dir="ltr">
                  (Homework):
                </span>
                <span>لتجهيز الاختبارات والكويزات.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">
              لا توجد حصص مسجلة ليوم {selectedDay} ({currentClass})
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
              يمكنكِ إدخال حصص الجدول الجديد من تبويب "جدول الحصص"، أو استيراد خطة أسبوعية بالضغط على "Smart Plan Classifier".
            </p>
          </div>
        )
      ) : (
        <div className="space-y-2.5">
          {timetablePeriods.map((slot) => {
            const isFrench = slot.subject === 'French';
            const meta = SUBJECT_METADATA[slot.subject];
            const theme = getSubjectTheme(slot.subject);
            const cwEntry = classworkList.find(
              (c) =>
                c.classId === currentClass &&
                c.day === selectedDay &&
                slot.periods.includes(c.period) &&
                (c.block || 1) === currentBlock &&
                (c.week || 1) === currentWeek
            );

            const activeLinkUrl = cwEntry?.linkUrl;
            const activeLinkTitle = cwEntry?.linkTitle || 'رابط الدرس 🔗';

            const handleToggleLesson = () => {
              if (cwEntry) {
                if (!cwEntry.completed) {
                  triggerDoneCelebration();
                }
                onToggleClasswork(cwEntry.id);
              } else {
                triggerDoneCelebration();
                onSaveClasswork({
                  id: `cw-${currentClass}-${selectedDay}-${slot.periods[0]}-${Date.now()}`,
                  classId: currentClass,
                  day: selectedDay,
                  period: slot.periods[0],
                  subject: slot.subject,
                  title: `${slot.subject} Lesson`,
                  completed: true,
                  block: currentBlock,
                  week: currentWeek,
                });
              }
            };

          return (
            <React.Fragment key={slot.periodLabel}>
              {/* Period Card */}
              <div
                className={`group rounded-2xl border transition-all p-3 sm:p-3.5 space-y-3 shadow-2xs ${
                  cwEntry?.completed
                    ? 'border-emerald-300 bg-emerald-50/40 shadow-xs'
                    : `${theme.cwCard} shadow-xs`
                }`}
              >
                {/* 3 Equal-Width Boxes in a row: Period, Subject, Teacher */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 w-full items-stretch">
                  {/* Box 1: رقم الحصة */}
                  <div
                    className={`${
                      cwEntry?.completed ? 'bg-emerald-700 text-white' : theme.cwPeriodBox
                    } font-black py-2 px-2 rounded-xl flex items-center justify-center text-center shadow-2xs transition-colors`}
                  >
                    {slot.periods.length > 1 ? (
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <span className="text-xs sm:text-sm font-black tracking-tight">{slot.periodLabel}</span>
                        <span className="text-[10px] opacity-85 font-bold">{slot.arabicPeriodLabel}</span>
                      </div>
                    ) : (
                      <span className="text-xs sm:text-sm font-black">{slot.periodLabel}</span>
                    )}
                  </div>

                  {/* Box 2: اسم المادة */}
                  <div
                    className={`border font-black text-xs sm:text-sm py-2 px-2 rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 text-center truncate transition-colors ${
                      cwEntry?.completed
                        ? 'bg-white/95 text-emerald-950 border-emerald-300 shadow-2xs'
                        : theme.cwSubjectBox
                    }`}
                  >
                    <SubjectIcon subject={slot.subject} className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="truncate">{slot.subject}</span>
                  </div>

                  {/* Box 3: اسم المدرس */}
                  <div
                    className={`border font-bold text-xs sm:text-sm py-2 px-2 rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 text-center truncate transition-colors ${
                      cwEntry?.completed
                        ? 'bg-white/95 border-emerald-200 text-slate-800 shadow-2xs'
                        : theme.cwTeacherBox
                    }`}
                  >
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{slot.teacher}</span>
                  </div>
                </div>

                {/* Center: Classwork content & actions */}
                <div
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border transition-all ${
                    cwEntry?.completed
                      ? 'bg-white/95 border-emerald-200/80 shadow-2xs'
                      : theme.cwContentBox
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    {cwEntry ? (
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={`text-sm font-black ${
                              cwEntry.completed ? 'text-slate-500 line-through' : 'text-slate-950'
                            }`}
                          >
                            {cwEntry.title}
                          </h4>
                          {cwEntry.pages && (
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold border whitespace-nowrap shrink-0 ${
                                cwEntry.completed
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                  : theme.cwPageBadge
                              }`}
                            >
                              📖 {cwEntry.pages}
                            </span>
                          )}
                        </div>
                        {cwEntry.details && (
                          <p className="text-xs font-semibold text-slate-700 mt-1 leading-relaxed">
                            {cwEntry.details}
                          </p>
                        )}
                        {activeLinkUrl && (
                          <div className="pt-2">
                            <a
                              href={activeLinkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black transition-all shadow-2xs ${
                                isFrench
                                  ? 'bg-purple-600 hover:bg-purple-700 text-white border border-purple-700'
                                  : 'bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100'
                              }`}
                            >
                              <ExternalLink className={`w-3.5 h-3.5 ${isFrench ? 'text-white' : 'text-blue-700'}`} />
                              <span>{activeLinkTitle}</span>
                              {isFrench && <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">Kahoot 🎯</span>}
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5 py-0.5">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="italic font-normal">
                            لا توجد تفاصيل مسجلة لهذه الحصة في الخطة
                          </span>
                          <button
                            onClick={() => openEdit(slot.periods, slot.subject)}
                            className="text-indigo-700 hover:text-indigo-900 font-bold inline-flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            إضافة ملاحظة
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions (Check completion & Edit) */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 w-full sm:w-auto justify-end">
                    <button
                      onClick={handleToggleLesson}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        cwEntry?.completed
                          ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-2xs'
                      }`}
                    >
                      {cwEntry?.completed ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          <span>Done</span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4 text-slate-400" />
                          <span>Mark Done</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => openEdit(slot.periods, slot.subject, cwEntry)}
                      className="p-2 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-200"
                      title="Edit Classwork"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      )}

      {/* Edit Classwork Modal */}
      {editingPeriod !== null && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Edit P{editingPeriod} Classwork
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {selectedDay} • {editSubject} • {currentClass}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lesson Title / Topic
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Chapter 3: Place Value & 2-Digit Addition"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Book Pages / Material References
                </label>
                <input
                  type="text"
                  value={editPages}
                  onChange={(e) => setEditPages(e.target.value)}
                  placeholder="e.g. Student Book p. 24 - 26"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Detailed Instructions / Notes
                </label>
                <textarea
                  rows={3}
                  value={editDetails}
                  onChange={(e) => setEditDetails(e.target.value)}
                  placeholder="e.g. Solve exercises 1 to 4 on board, check mental math strategies..."
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingPeriod(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
              >
                Save Lesson Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
