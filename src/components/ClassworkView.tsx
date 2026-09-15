import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Edit2,
  Trash2,
  User,
  BookOpen,
  ExternalLink,
  Play,
  Layers,
  Sparkles,
  Clock,
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
  onDeleteClasswork?: (id: string) => void;
}

const ARABIC_DAYS: Record<SchoolDay, string> = {
  Saturday: 'السبت',
  Sunday: 'الأحد',
  Monday: 'الإثنين',
  Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء',
  Thursday: 'الخميس',
};

const ALL_SUBJECTS: SubjectName[] = [
  'Arabic',
  'English',
  'Mathematics',
  'Science',
  'Social Studies',
  'French',
  'Religion',
  'ICT',
  'Arts',
  'Music',
  'PE',
];

const PERIOD_TIMES: Record<number, string> = {
  1: '7:45 - 8:35',
  2: '8:35 - 9:25',
  3: '9:55 - 10:45',
  4: '10:45 - 11:35',
  5: '12:05 - 12:55',
  6: '12:55 - 1:45',
};

interface GroupedPeriodSlot {
  periods: number[];
  periodLabel: string;
  time: string;
  subject: SubjectName;
  teacher: string;
  notes?: string;
}

export const ClassworkView: React.FC<ClassworkViewProps> = ({
  currentClass,
  selectedDay,
  classworkList,
  currentBlock = 1,
  currentWeek = 1,
  timetables,
  onToggleClasswork,
  onSaveClasswork,
  onDeleteClasswork,
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
    (s) => Boolean(s.subject) && s.period <= 6
  );

  // Active weekly plan entries for the selected class, day, block, and week
  const dayClassworkList = classworkList.filter(
    (c) =>
      c.classId === currentClass &&
      c.day === selectedDay &&
      (c.block || 1) === currentBlock &&
      (c.week || 1) === currentWeek &&
      Boolean(c.title && c.title.trim())
  );

  // Group planned entries by subject so we NEVER repeat the box/task for the same subject!
  // "لما بتبقى المادة متكررة الحصص بتاعتها، مبكررش البوكسات أو التاسكس. هو بيبقى تاسك واحد بس"
  const uniquePlannedMap = new Map<string, ClassworkEntry>();
  for (const cw of dayClassworkList) {
    const key = cw.subject.toLowerCase();
    if (!uniquePlannedMap.has(key)) {
      uniquePlannedMap.set(key, cw);
    }
  }

  // Build active display items: strictly ONE box per planned subject
  const activeDisplayItems = Array.from(uniquePlannedMap.values())
    .map((cwEntry) => {
      // Find all matching timetable slots for this subject on the selected day
      const matchingSlots = rawTimetablePeriods.filter(
        (s) => s.subject.toLowerCase() === cwEntry.subject.toLowerCase()
      );

      let periods: number[];
      let periodLabel: string;
      let teacher: string;
      let time: string;

      if (matchingSlots.length > 0) {
        periods = Array.from(new Set<number>(matchingSlots.map((s) => s.period))).sort((a: number, b: number) => a - b);
        // Format as requested: P1, P2, P4 (P with loop on top, no Arabic period words)
        periodLabel = periods.map((p) => `P${p}`).join(', ');

        // Unique teachers across all matching periods
        const teacherNames = Array.from(
          new Set(
            matchingSlots
              .flatMap((s) => (s.teacher || '').split(/[\/,]/))
              .map((t) => t.trim())
              .filter(Boolean)
          )
        );
        teacher = teacherNames.length > 0 ? teacherNames.join(' / ') : 'معلم المادة';

        // Time calculation
        const sortedSlots = [...matchingSlots].sort((a, b) => a.period - b.period);
        const timeSegments: string[] = [];
        let currentGroup: typeof sortedSlots = [];
        for (const s of sortedSlots) {
          if (currentGroup.length === 0) {
            currentGroup.push(s);
          } else {
            const prev = currentGroup[currentGroup.length - 1];
            if (s.period === prev.period + 1) {
              currentGroup.push(s);
            } else {
              const start = currentGroup[0].time.split(' - ')[0];
              const end =
                currentGroup[currentGroup.length - 1].time.split(' - ')[1] ||
                currentGroup[currentGroup.length - 1].time;
              timeSegments.push(`${start} - ${end}`);
              currentGroup = [s];
            }
          }
        }
        if (currentGroup.length > 0) {
          const start = currentGroup[0].time.split(' - ')[0];
          const end =
            currentGroup[currentGroup.length - 1].time.split(' - ')[1] ||
            currentGroup[currentGroup.length - 1].time;
          timeSegments.push(`${start} - ${end}`);
        }
        time = timeSegments.join(' | ');
      } else {
        const p = Math.min(Math.max(cwEntry.period || 1, 1), 6);
        periods = [p];
        periodLabel = `P${p}`;
        teacher = 'معلم المادة';
        time = PERIOD_TIMES[p] || '7:45 - 8:35';
      }

      const slot: GroupedPeriodSlot = {
        periods,
        periodLabel,
        time,
        subject: cwEntry.subject as SubjectName,
        teacher,
        notes: undefined,
      };

      return { slot, cwEntry };
    })
    .sort((a, b) => a.slot.periods[0] - b.slot.periods[0]);

  // Completion statistics for planned lessons
  const completedCount = activeDisplayItems.filter((item) => item.cwEntry.completed).length;
  const totalCount = activeDisplayItems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [formSubject, setFormSubject] = useState<SubjectName>('English');
  const [formPeriod, setFormPeriod] = useState<number>(1);
  const [formTitle, setFormTitle] = useState('');
  const [formPages, setFormPages] = useState('');
  const [formDetails, setFormDetails] = useState('');
  const [formLink, setFormLink] = useState('');

  const openAddModal = () => {
    setModalMode('add');
    setEditingEntryId(null);
    setFormSubject('Arabic');
    setFormPeriod(1);
    setFormTitle('');
    setFormPages('');
    setFormDetails('');
    setFormLink('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: { slot: GroupedPeriodSlot; cwEntry: ClassworkEntry }) => {
    setModalMode('edit');
    setEditingEntryId(item.cwEntry.id);
    setFormSubject(item.cwEntry.subject);
    setFormPeriod(item.slot.periods[0] || 1);
    setFormTitle(item.cwEntry.title);
    setFormPages(item.cwEntry.pages || '');
    setFormDetails(item.cwEntry.details || '');
    const firstLink = item.cwEntry.links?.[0]?.url || item.cwEntry.linkUrl || '';
    setFormLink(firstLink);
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const linksArray = formLink.trim()
      ? [
          {
            url: formLink.trim(),
            title: formLink.trim(),
            type: formLink.includes('youtu') ? ('video' as const) : ('general' as const),
          },
        ]
      : undefined;

    const entryToSave: ClassworkEntry = {
      id:
        editingEntryId ||
        `cw-${currentClass}-${selectedDay}-${formPeriod}-${Date.now()}`,
      classId: currentClass,
      day: selectedDay,
      period: formPeriod,
      subject: formSubject,
      title: formTitle.trim(),
      pages: formPages.trim() || undefined,
      details: formDetails.trim() || undefined,
      links: linksArray,
      linkUrl: formLink.trim() || undefined,
      completed: false,
      block: currentBlock,
      week: currentWeek,
    };

    onSaveClasswork(entryToSave);
    setIsModalOpen(false);
  };

  const handleDeleteEntry = (id: string, subjectTitle: string) => {
    if (window.confirm(`هل أنت متأكد من حذف درس (${subjectTitle}) من الخطة الأسبوعية؟`)) {
      if (onDeleteClasswork) {
        onDeleteClasswork(id);
      }
    }
  };

  // If entire week has no plan entered at all
  if (!hasPlanForWeek) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 text-center shadow-xs space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-1">
          <BookOpen className="w-7 h-7" />
        </div>
        <h3 className="text-base sm:text-lg font-black text-slate-800">
          لا توجد خطة أسبوعية مسجلة لهذا الأسبوع
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          الأسبوع المحدد (Topic {currentBlock} - Week {currentWeek}) فارغ حالياً. يمكنكِ إضافة درس جديد الآن أو استيراد الخطة عبر الزر العلوي.
        </p>
        <div className="pt-2">
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ إضافة أول مادة / درس للخطة</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Saturday Prep Card */}
      {selectedDay === 'Saturday' ? (
        <div
          id="saturday-prep-card"
          className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 max-w-xl mx-auto shadow-sm text-right"
          dir="rtl"
        >
          <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center justify-start gap-2">
            <span className="text-xl">📌</span>
            <span>يُخصص يوم السبت للتجهيز والتحضير الأسبوعي:</span>
          </h3>

          <div className="h-[2.5px] bg-blue-600 rounded-full my-4 sm:my-5" />

          <div className="space-y-3 sm:space-y-3.5">
            <div className="bg-indigo-50/60 border-e-4 border-e-blue-600 rounded-xl p-3.5 sm:p-4 text-slate-800 text-xs sm:text-sm font-bold flex items-center gap-2">
              <span className="text-slate-900 text-base leading-none">•</span>
              <span className="text-blue-600 font-extrabold" dir="ltr">
                (Tomorrow):
              </span>
              <span>لتجهيز حقيبة يوم الأحد.</span>
            </div>

            <div className="bg-indigo-50/60 border-e-4 border-e-blue-600 rounded-xl p-3.5 sm:p-4 text-slate-800 text-xs sm:text-sm font-bold flex items-center gap-2">
              <span className="text-slate-900 text-base leading-none">•</span>
              <span className="text-blue-600 font-extrabold" dir="ltr">
                (Homework):
              </span>
              <span>لتجهيز الاختبارات والكويزات.</span>
            </div>
          </div>
        </div>
      ) : activeDisplayItems.length === 0 ? (
        /* Empty State for days without weekly plan */
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 text-center shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              لا توجد مواد مسجلة في الخطة الأسبوعية ليوم {ARABIC_DAYS[selectedDay]}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              المواد تظهر في الكلاس وورك فقط عند توفر الخطة الأسبوعية الخاصة بها، حتى لو كانت مسجلة في الجدول المدرسي.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة مادة / درس للخطة الآن</span>
            </button>
          </div>
        </div>
      ) : (
        /* List of Planned Lessons Only */
        <div className="space-y-3">
          {/* Header Bar: Status & Add Lesson */}
          <div className="bg-white rounded-2xl border border-slate-200/90 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-900">
                مواد يوم {ARABIC_DAYS[selectedDay]} المعتمدة في الخطة:
              </span>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                {totalCount} {totalCount === 1 ? 'مادة' : 'مواد'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {totalCount > 0 && (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <span>الإنجاز: {completedCount}/{totalCount} ({progressPercent}%)</span>
                  <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                title="إضافة مادة أخرى للخطة"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة مادة</span>
              </button>
            </div>
          </div>

          {/* Planned Lessons Cards */}
          <div className="space-y-2.5">
            {activeDisplayItems.map(({ slot, cwEntry }) => {
              const theme = getSubjectTheme(slot.subject);

              const lessonLinks: { url: string; title: string; type?: string }[] = [];
              if (cwEntry?.links && cwEntry.links.length > 0) {
                lessonLinks.push(...cwEntry.links);
              } else if (cwEntry?.linkUrl) {
                lessonLinks.push({
                  url: cwEntry.linkUrl,
                  title: cwEntry.linkTitle || cwEntry.linkUrl,
                  type: cwEntry.linkUrl.includes('youtu') ? 'video' : 'general',
                });
              }

              const handleToggleLesson = () => {
                if (!cwEntry.completed) {
                  triggerDoneCelebration();
                }
                onToggleClasswork(cwEntry.id);
              };

              return (
                <div
                  key={cwEntry.id}
                  className={`group rounded-2xl border transition-all p-3 sm:p-3.5 space-y-3 shadow-2xs ${
                    cwEntry.completed
                      ? 'border-emerald-300 bg-emerald-50/40 shadow-xs'
                      : `${theme.cwCard} shadow-xs`
                  }`}
                >
                  {/* 3 Equal-Width Boxes in a row: Period, Subject, Teacher */}
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 w-full items-stretch">
                    {/* Box 1: رقم الحصة */}
                    <div
                      className={`${
                        cwEntry.completed ? 'bg-emerald-700 text-white' : theme.cwPeriodBox
                      } font-black py-2 sm:py-2.5 px-2 rounded-xl flex items-center justify-center text-center shadow-2xs transition-colors`}
                    >
                      <span className="text-xs sm:text-sm font-black tracking-wider">{slot.periodLabel}</span>
                    </div>

                    {/* Box 2: اسم المادة */}
                    <div
                      className={`border font-black text-xs sm:text-sm py-2 px-2 rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 text-center truncate transition-colors ${
                        cwEntry.completed
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
                        cwEntry.completed
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
                      cwEntry.completed
                        ? 'bg-white/95 border-emerald-200/80 shadow-2xs'
                        : theme.cwContentBox
                    }`}
                  >
                    <div className="flex-1 min-w-0">
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
                        {lessonLinks.length > 0 && (
                          <div className="pt-2 flex flex-wrap gap-2">
                            {lessonLinks.map((linkItem, lIdx) => {
                              const isVideo = linkItem.type === 'video' || linkItem.url.includes('youtu');
                              return (
                                <a
                                  key={lIdx}
                                  href={linkItem.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all shadow-xs hover:scale-102 active:scale-98 max-w-full ${
                                    isVideo
                                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-700/20'
                                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-700/20'
                                  }`}
                                >
                                  {isVideo ? (
                                    <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                                  ) : (
                                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                  )}
                                  <span dir="ltr" className="truncate max-w-[280px] sm:max-w-md">
                                    {linkItem.url}
                                  </span>
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions (Check completion & Edit & Delete) */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 w-full sm:w-auto justify-end">
                      <button
                        onClick={handleToggleLesson}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          cwEntry.completed
                            ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-2xs'
                        }`}
                      >
                        {cwEntry.completed ? (
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
                        onClick={() => openEditModal({ slot, cwEntry })}
                        className="p-2 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-200"
                        title="تعديل محتوى الدرس"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {onDeleteClasswork && (
                        <button
                          onClick={() => handleDeleteEntry(cwEntry.id, cwEntry.title)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                          title="حذف الدرس من الخطة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Classwork Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 mb-1">
              {modalMode === 'add' ? 'إضافة مادة / درس للخطة الأسبوعية' : 'تعديل درس في الخطة'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              يوم {ARABIC_DAYS[selectedDay]} • {currentClass} • Topic {currentBlock} - Week {currentWeek}
            </p>

            <form onSubmit={handleSaveModal} className="space-y-4">
              {/* Subject Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المادة</label>
                <select
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value as SubjectName)}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold bg-white"
                >
                  {ALL_SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Period Selector (1 to 6) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الحصة (1 - 6)</label>
                <div className="grid grid-cols-6 gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormPeriod(p)}
                      className={`py-2 text-xs font-black rounded-xl border transition-all ${
                        formPeriod === p
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      P{p}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-sans">
                  التوقيت: {PERIOD_TIMES[formPeriod] || ''}
                </div>
              </div>

              {/* Lesson Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان الدرس / المحتوى الدراسي <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: استقبال الأطفال والعودة إلى المدرسة"
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Pages */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  أرقام الصفحات / كتاب المادة (اختياري)
                </label>
                <input
                  type="text"
                  value={formPages}
                  onChange={(e) => setFormPages(e.target.value)}
                  placeholder="مثال: حل ورق العمل ص 3 \ 4 \ 5"
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Details */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات أو تفاصيل إضافية (اختياري)
                </label>
                <textarea
                  rows={2}
                  value={formDetails}
                  onChange={(e) => setFormDetails(e.target.value)}
                  placeholder="أي تعليمات خاصة بالدرس..."
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Video Link */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رابط فيديو أو نشاط تعليمي (YouTube URL)
                </label>
                <input
                  type="url"
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  placeholder="https://youtu.be/..."
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  dir="ltr"
                />
              </div>

              {/* Form buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
                >
                  {modalMode === 'add' ? 'إضافة إلى الخطة' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
